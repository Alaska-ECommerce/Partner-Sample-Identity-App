using System.Xml;

namespace PartnerSampleIdentityApp
{
    /// <summary>Extensions for <see cref="XmlDocument"/>.</summary>
    public static class XmlExtensions
    {
        /// <summary>Converts a string representing XML to an <see cref="XmlDocument"/> with a <see cref="XmlNamespaceManager"/>.</summary>
        /// <param name="xmlString">The XML string to convert.</param>
        /// <param name="namespaceManager">The <see cref="XmlNamespaceManager"/>.</param>
        /// <returns>An <see cref="XmlDocument"/> representing the XML string.</returns>
        public static XmlDocument ToXmlDocument(this string xmlString, out XmlNamespaceManager namespaceManager)
        {
            var xmlDoc = new XmlDocument();
            xmlDoc.LoadXml(xmlString);
            namespaceManager = new XmlNamespaceManager(xmlDoc.NameTable);
            namespaceManager.AddNamespace("saml", "urn:oasis:names:tc:SAML:2.0:assertion");
            namespaceManager.AddNamespace("xenc", "http://www.w3.org/2001/04/xmlenc#");
            namespaceManager.AddNamespace("ds", "http://www.w3.org/2000/09/xmldsig#");
            namespaceManager.AddNamespace("e", "http://www.w3.org/2001/04/xmlenc#");
            return xmlDoc;
        }
    }
}
