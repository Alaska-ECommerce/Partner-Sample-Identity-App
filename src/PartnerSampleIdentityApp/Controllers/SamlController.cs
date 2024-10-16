﻿using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Rhyous.EasyXml;
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
        var decodedResponseXml = Encoding.UTF8.GetString(Convert.FromBase64String(samlResponse));
        var xml = new Xml(decodedResponseXml);
        if (string.IsNullOrWhiteSpace(relayState))
            relayState = GetValue(decodedResponseXml, "RelayState") ?? "/";
        var issuer = GetIssuer(decodedResponseXml).Substring(4);
        var clientId = GetValue(decodedResponseXml, "clientID");
        if (!string.IsNullOrEmpty(relayState) && relayState != "/")
        {
            // Normally the relay state would NOT be a Url, it would be some other value
            // that the app would use to determine where to redirect.
            var html = string.Format(InstantRedirectHtml, relayState);
            return Content(html, "text/html", Encoding.UTF8);
        }
        else
        {

            _httpContextAccessor.HttpContext!.Request.Query.TryGetValue("Partner", out StringValues partner);
            var html = string.Format(HtmlForXml, issuer, clientId, partner, SecurityElement.Escape(xml.PrettyXml));
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
    .xml-box {{
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
<h1>Partner: {2}</h1>
<h2>SAML Token</h2>

<!-- The XML content -->
<pre class=""xml-box"">
{3}
</pre>
<p><button type=""button"" onclick=""logout();"">Logout</button></p>
</body>
</html>";

    private const string InstantRedirectHtml = @"<!DOCTYPE html>
<html>
<head>
    <meta http-equiv=""refresh"" content=""0; url={0}"" />
    <title>Page Redirection</title>
</head>
<body>
    <!-- Note: don't rely solely on JavaScript for redirection, as users might have it disabled. -->
    <p>If you are not redirected automatically, <a href='{0}'>click here</a>.</p>
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
