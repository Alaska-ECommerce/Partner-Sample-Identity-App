// IssueInstant: 2023-10-12T08:00:00Z

const generateSamlLogoutRequest = (uniqueId, instant, dest, issuer, nameID, sessionIndex) => {
    return `<?xml version="1.0" encoding="utf-8"?>
<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" 
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" 
    ID="${uniqueId}" 
    Version="2.0" 
    IssueInstant="${instant}" 
    Destination="${dest}">
    <saml:Issuer>https://${issuer}</saml:Issuer>
    <saml:NameID Format="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">${nameID}</saml:NameID>
    <samlp:SessionIndex>${sessionIndex}</samlp:SessionIndex>
</samlp:LogoutRequest>`;
}

const sendLogoutPost = (uniqueId, issuer, clientId, nameID, sessionIndex) =>  {
    let actionUrl = `https://${issuer}/samlp/${clientId}/logout`
    var instant = new Date().toISOString().split('.')[0] + 'Z';
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = actionUrl;

    var requestInput = document.createElement('input')
    requestInput.type = 'hidden';
    requestInput.name = 'SAMLRequest';
    var request = generateSamlLogoutRequest(uniqueId, instant, actionUrl, issuer, nameID, sessionIndex);
    var base64Request = btoa(request);
    requestInput.value = base64Request;
    form.appendChild(requestInput);
    document.body.appendChild(form);
    form.submit();
}