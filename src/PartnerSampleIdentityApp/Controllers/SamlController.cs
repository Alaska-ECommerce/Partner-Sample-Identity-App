using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using PartnerSampleIdentityApp;
using Rhyous.EasyXml;
using Session.Crypto;
using System.Security;
using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace ExampleSamlConsumer.Controllers;

[ApiController]
[Route("[controller]")]
public class SamlController : ControllerBase
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SamlController(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    [HttpPost("Consume")]
    public IActionResult Consume([FromForm] string samlResponse, [FromForm] string? relayState = null)
    {
        if (string.IsNullOrWhiteSpace(samlResponse))
            return BadRequest("No SAML response found.");

        //Decoded SAML response CAN be encrypted
        //Check for encrypted SAML response and decrypt if necessary
        var decodedResponseXml = Encoding.UTF8.GetString(Convert.FromBase64String(samlResponse));
        var plainTextSaml = string.Empty;
        if (decodedResponseXml.Contains("xenc:CipherValue"))
        {
            var samlDecryptor = new SamlDecryptor(Data.PrivateKey);
            var decryptedXml = samlDecryptor.DecryptSamlAsync(decodedResponseXml).Result;
            plainTextSaml = decryptedXml;
        }
        else
        {
            plainTextSaml = decodedResponseXml;
        }

        var xml = new Xml(plainTextSaml);
        if (string.IsNullOrWhiteSpace(relayState))
            relayState = GetValue(plainTextSaml, "RelayState") ?? "/";
        if (!string.IsNullOrEmpty(relayState) && relayState.StartsWith("https://"))
        {
            return Redirect(relayState);
        }
        else
        {

            _httpContextAccessor.HttpContext!.Request.Query.TryGetValue("Partner", out StringValues partner);
            var uniqueId = Guid.NewGuid().ToString();
            var issuer = GetIssuer(plainTextSaml)!.Substring(4);
            var clientId = GetValue(plainTextSaml, "clientID");
            var nameID = GetNameID(plainTextSaml);
            var sessionIndex = GetSessionIndex(plainTextSaml);
            var html = string.Format(HtmlForLoginXml, uniqueId, issuer, clientId, nameID, sessionIndex, partner, SecurityElement.Escape(xml.PrettyXml), relayState);
            return Content(html, "text/html", Encoding.UTF8);
        }
    }

    [HttpPost("Logout")]
    public async Task<IActionResult> Post([FromForm] string samlResponse)
    {
        var decodedResponseXml = Encoding.UTF8.GetString(Convert.FromBase64String(samlResponse));

        var xml = new Xml(decodedResponseXml);
        var html = string.Format(HtmlForLogoutXml, SecurityElement.Escape(xml.PrettyXml));
        return Content(html, "text/html", Encoding.UTF8);
    }

    private const string HtmlForLoginXml = @"
<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Display XML</title>
<link rel=""stylesheet"" href=""/css/Styles.css"" />
<script src=""/scripts/logout.js""></script>
<script type=""text/javascript"">
        const logout = () => {{
            // {0} is the uniqueId
            // {1} is the issuer or domain
            // {2} is the clientId
            // {3} is the nameID
            // {4} is the sessionIndex
            sendLogoutPost('{0}', '{1}', '{2}', '{3}', '{4}');
        }};
    </script>
<style>
    .text-box {{
        border: 1px solid #888; /* Gray border */
        background-color: #f9f9f9; /* Light gray background */
        padding: 10px; /* Some padding around the content */
        margin: 20px 0; /* Some margin at the top and bottom */
        font-family: monospace; /* Monospace font for better readability */
        overflow: auto; /* Add scroll bars when content overflows */
        max-height: 400px; /* Set a max height to ensure the box is not too tall */
    }}
</style>
</head>
<body>
  <div class=""flex-container"">
    <div class=""left"">
      <a href=""/"">Home</a>
      <a href=""/SAML/OktaSaml.html"">Saml Login</a>
      <a href=""/OAuth2/Auth0-OAuth2.html"">OAuth2 Login</a>
    </div>
    <div class=""centered-div"">
      <h1>Partner: {5}</h1>
    </div>
  </div>
<h2>SAML Response</h2>
<!-- The SAML Response XML content -->
<pre class=""text-box"">
{6}
</pre>
<!-- The Relay State -->
<h2>Relay State</h2>
<pre class=""text-box"">
{7}
</pre>
<p><button type=""button"" onclick=""logout();"">Logout</button></p>
</body>
</html>";

    private const string HtmlForLogoutXml = @"
<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Display XML</title>
<link rel=""stylesheet"" href=""/css/Styles.css"" />
<style>
    .text-box {{
        border: 1px solid #888; /* Gray border */
        background-color: #f9f9f9; /* Light gray background */
        padding: 10px; /* Some padding around the content */
        margin: 20px 0; /* Some margin at the top and bottom */
        font-family: monospace; /* Monospace font for better readability */
        overflow: auto; /* Add scroll bars when content overflows */
        max-height: 400px; /* Set a max height to ensure the box is not too tall */
    }}
</style>
</head>
<body>
  <div class=""flex-container"">
    <div class=""left"">
      <a href=""/"">Home</a>
      <a href=""/SAML/OktaSaml.html"">Saml Login</a>
      <a href=""/OAuth2/Auth0-OAuth2.html"">OAuth2 Login</a>
    </div>
    <div class=""centered-div"">
      <h1>You are logged out!</h1>
    </div>
  </div>
<h2>SAML Logout Response</h2>
<!-- The SAML Logout Response XML content -->
<pre class=""text-box"">
{0}
</pre>
</body>
</html>";

    /// <summary>Extracts the value of an attribute from a SAML token.</summary>
    /// <param name="samlToken">The SAML token as a string.</param>
    /// <param name="attributeName">The attribute name to get the value from.</param>
    /// <returns>The value of the attribute, or null if not found.</returns>
    public string? GetValue(string samlToken, string attributeName)
    {
        var xmlDoc = new XmlDocument();
        xmlDoc.LoadXml(samlToken);
        // Create a namespace manager to handle the namespaces in the SAML token.
        var nsmgr = new XmlNamespaceManager(xmlDoc.NameTable);
        nsmgr.AddNamespace("saml", "urn:oasis:names:tc:SAML:2.0:assertion");
        nsmgr.AddNamespace("samlp", "urn:oasis:names:tc:SAML:2.0:protocol");

        // XPath query to find the Attribute node for loginState
        var loginStateNode = xmlDoc.SelectSingleNode($"//saml:Attribute[@Name='{attributeName}']/saml:AttributeValue", nsmgr);

        return loginStateNode?.InnerText;
    }

    ///<inheritdoc/>
    public XmlNode GetSingleNode(string saml, string xpath)
    {
        var xmlDoc = new XmlDocument();
        xmlDoc.LoadXml(saml);

        // Add the necessary namespaces to the XmlNamespaceManager to handle the prefixed namespace in the XML.
        var nsmgr = new XmlNamespaceManager(xmlDoc.NameTable);
        nsmgr.AddNamespace("samlp", "urn:oasis:names:tc:SAML:2.0:protocol");
        nsmgr.AddNamespace("saml", "urn:oasis:names:tc:SAML:2.0:assertion");

        return xmlDoc.SelectSingleNode(xpath, nsmgr)!;
    }

    public string? GetIssuer(string samlToken)
    {
        var node = GetSingleNode(samlToken, "//saml:Issuer");
        return node.InnerText;
    }

    public string? GetNameID(string samlToken)
    {
        var node = GetSingleNode(samlToken, "//saml:Assertion/saml:Subject/saml:NameID");
        return node.InnerText;
    }

    public string GetSessionIndex(string samlToken)
    {
        var node = GetSingleNode(samlToken, "//saml:Assertion/saml:AuthnStatement/@SessionIndex");
        return node.Value!;
    }
}
