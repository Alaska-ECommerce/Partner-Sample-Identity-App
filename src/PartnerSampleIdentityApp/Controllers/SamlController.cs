using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace ExampleSamlConsumer.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class SamlController : Controller
    {
        [HttpPost("Consume")]
        public IActionResult Consume([FromForm]string samlResponse)
        {
            var decodedResponse = Encoding.UTF8.GetString(Convert.FromBase64String(samlResponse));
            // Specify the content type as 'application/xml'
            return Content(decodedResponse, "application/xml", Encoding.UTF8);
        }
    }

}
