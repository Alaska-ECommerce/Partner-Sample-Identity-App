using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Rhyous.EasyXml;
using System.Security;
using System.Text;

namespace ExampleSamlConsumer.Controllers
{
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
        public IActionResult Consume([FromForm] string samlResponse)
        {
            var decodedResponseXml = Encoding.UTF8.GetString(Convert.FromBase64String(samlResponse));
            var xml = new Xml(decodedResponseXml);            
            _httpContextAccessor.HttpContext!.Request.Query.TryGetValue("Partner", out StringValues partner);
            var html = string.Format(HtmlForXml, partner, SecurityElement.Escape(xml.PrettyXml));
            return Content(html, "text/html", Encoding.UTF8);
        }

        private const string HtmlForXml = @"
<!DOCTYPE html>
<html lang=""en"">
<head>
<meta charset=""UTF-8"">
<meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
<title>Display XML</title>
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
<h1>Partner: {0}</h1>
<h2>SAML Token</h2>

<!-- The XML content -->
<pre class=""xml-box"">
{1}
</pre>

</body>
</html>";
    }
}