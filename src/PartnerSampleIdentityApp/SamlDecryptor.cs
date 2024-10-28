using System.Text;
using System.Xml;
using System.Security.Cryptography;
using PartnerSampleIdentityApp;

namespace Session.Crypto;

/// <inheritdoc />
public class SamlDecryptor
{
    private readonly string _privateKeyPem;

    /// <summary>Creates a new instance of <see cref="SamlDecryptor"/>.</summary>
    /// <param name="privateKeyPem">The PEM-formatted private key string</param>
    public SamlDecryptor(string privateKeyPem)
    {
        _privateKeyPem = privateKeyPem;
    }

    /// <inheritdoc />
    public async Task<string> DecryptSamlAsync(string encryptedSaml)
    {
        var xmlDoc = encryptedSaml.ToXmlDocument(out var namespaceManager);

        var encryptedAesKey = xmlDoc.SelectSingleNode(
            "//saml:EncryptedAssertion/xenc:EncryptedData/ds:KeyInfo/xenc:EncryptedKey/e:CipherData/e:CipherValue",
            namespaceManager)?.InnerText;

        if (encryptedAesKey == null)
        {
            throw new ArgumentException("SAML response is missing EncryptedKey.");
        }

        // Decrypt the AES key using RSA
        var decryptedAesKey = await DecryptRsaAsync(encryptedAesKey);
        var b64AesKey = Convert.ToBase64String(decryptedAesKey);

        var encryptedAssertion = xmlDoc.SelectSingleNode(
            "//saml:EncryptedAssertion/xenc:EncryptedData/xenc:CipherData/xenc:CipherValue",
            namespaceManager)?.InnerText;

        if (encryptedAssertion == null)
        {
            throw new ArgumentException("SAML response is missing encrypted data.");
        }

        // Decrypt the assertion using AES
        var decryptedAssertion = DecryptAes(encryptedAssertion, b64AesKey);

        var fullEncryptedAssertionElement = xmlDoc.SelectSingleNode("//saml:EncryptedAssertion", namespaceManager);
        var decryptedAssertionFragment = xmlDoc.CreateDocumentFragment();
        decryptedAssertionFragment.InnerXml = decryptedAssertion;
        fullEncryptedAssertionElement!.ParentNode!.ReplaceChild(decryptedAssertionFragment, fullEncryptedAssertionElement);

        return xmlDoc.OuterXml;
    }

    private async Task<byte[]> DecryptRsaAsync(string encryptedBase64String)
    {
        using var rsa = RSA.Create();

        // Remove PEM headers and whitespace
        var privateKeyBase64 = _privateKeyPem
            .Replace("-----BEGIN PRIVATE KEY-----", "")
            .Replace("-----END PRIVATE KEY-----", "")
            .Replace("-----BEGIN RSA PRIVATE KEY-----", "")
            .Replace("-----END RSA PRIVATE KEY-----", "")
            .Replace("\n", "")
            .Replace("\r", "")
            .Trim();

        // Import the private key
        var privateKeyBytes = Convert.FromBase64String(privateKeyBase64);

        try
        {
            // Try PKCS#8 format first
            rsa.ImportPkcs8PrivateKey(privateKeyBytes, out _);
        }
        catch
        {
            // Fall back to PKCS#1 format
            rsa.ImportRSAPrivateKey(privateKeyBytes, out _);
        }

        // Decrypt the data
        var encryptedData = Convert.FromBase64String(encryptedBase64String);
        return rsa.Decrypt(encryptedData, RSAEncryptionPadding.OaepSHA1);
    }

    private string DecryptAes(string encryptedData, string key)
    {
        using var aes = Aes.Create();
        aes.Key = Convert.FromBase64String(key);
        aes.Mode = CipherMode.CBC;
        aes.Padding = PaddingMode.PKCS7;

        var encryptedBytes = Convert.FromBase64String(encryptedData);

        // Extract IV from the beginning of the encrypted data (first 16 bytes)
        var iv = new byte[16];
        Array.Copy(encryptedBytes, 0, iv, 0, 16);
        aes.IV = iv;

        // Actual encrypted data starts after the IV
        var actualEncryptedBytes = new byte[encryptedBytes.Length - 16];
        Array.Copy(encryptedBytes, 16, actualEncryptedBytes, 0, actualEncryptedBytes.Length);

        using var decryptor = aes.CreateDecryptor();
        using var msDecrypt = new MemoryStream(actualEncryptedBytes);
        using var csDecrypt = new CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read);
        using var srDecrypt = new StreamReader(csDecrypt);

        return srDecrypt.ReadToEnd();
    }
}