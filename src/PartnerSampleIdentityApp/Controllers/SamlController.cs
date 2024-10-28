using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using PartnerSampleIdentityApp;
using Rhyous.EasyXml;
using Session.Crypto;
using System.Security;
using System.Text;
using System.Xml;

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
        var issuer = GetIssuer(plainTextSaml).Substring(4);
        var clientId = GetValue(plainTextSaml, "clientID");
        if (!string.IsNullOrEmpty(relayState) && relayState != "/")
        {
            return Redirect(relayState);
        }
        else
        {

            _httpContextAccessor.HttpContext!.Request.Query.TryGetValue("Partner", out StringValues partner);
            var html = string.Format(HtmlForXml, issuer, clientId, partner, SecurityElement.Escape(xml.PrettyXml), relayState);
            return Content(html, "text/html", Encoding.UTF8);
        }
    }

    private const string HtmlForXml = @"
<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Display XML</title>
<link rel=""stylesheet"" href=""/css/Styles.css"" />
    <script type=""text/javascript"">
        const logout = () => {{
            let postLogoutRedirectUrl = encodeURIComponent('https://localhost:7271/SAML/OktaSaml.html?logout=true');
            let redirectUrl = `https://{0}/oidc/logout?client_id={1}&post_logout_redirect_uri=${{postLogoutRedirectUrl}}`
            window.location.href = redirectUrl;
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
      <h1>Partner: {2}</h1>
    </div>
  </div>
<h2>SAML Response</h2>
<!-- The SAML Response XML content -->
<pre class=""text-box"">
{3}
</pre>
<!-- The Relay State -->
<h2>Relay State</h2>
<pre class=""text-box"">
{4}
</pre>
<p><button type=""button"" onclick=""logout();"">Logout</button></p>
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

    public string? GetIssuer(string samlToken)
    {
        var xmlDoc = new XmlDocument();
        xmlDoc.LoadXml(samlToken);
        // Create a namespace manager to handle the namespaces in the SAML token.
        var nsmgr = new XmlNamespaceManager(xmlDoc.NameTable);
        nsmgr.AddNamespace("saml", "urn:oasis:names:tc:SAML:2.0:assertion");
        nsmgr.AddNamespace("samlp", "urn:oasis:names:tc:SAML:2.0:protocol");

        // XPath query to find the Attribute node for loginState
        var loginStateNode = xmlDoc.SelectSingleNode($"//saml:Issuer", nsmgr);

        return loginStateNode?.InnerText;
    }
}
