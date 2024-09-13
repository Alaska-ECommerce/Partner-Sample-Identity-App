// --- AUTH0 ACTIONS TEMPLATE https://github.com/auth0/opensource-marketplace/blob/main/templates/add-country-POST_LOGIN ---
/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
    let namespace = event.secrets.ID_TOKEN_NAMESPACE || '';
    if (namespace && !namespace.endsWith('/')) {
        namespace += '/';
    }

/* event.request looks like:

{
  "asn": "7922",
  "body": {},
  "geoip": {
    "cityName": "Olympia",
    "continentCode": "NA",
    "countryCode": "US",
    "countryCode3": "USA",
    "countryName": "United States",
    "latitude": 46.9961,
    "longitude": -122.7381,
    "subdivisionCode": "WA",
    "subdivisionName": "Washington",
    "timeZone": "America/Los_Angeles"
  },
  "hostname": "alaska-poc.cic-demo-platform.auth0app.com",
  "ip": "71.197.255.63",
  "method": "GET",
  "query": {
    "auth0Client": "eyJuYW1lIjoiYXV0aDAtc3BhLWpzIiwidmVyc2lvbiI6IjEuMTMuNiJ9",
    "client_id": "DPHf8btcMeuYWFVSWnZIh0Q41gryQmQG",
    "code_challenge": "OB1Tlk0dbVWTnEFPzPyPo1CvuTvlkaqyIBZRAhlsBJo",
    "code_challenge_method": "S256",
    "nonce": "VjNmeEJrNlZHcnFkbk44Vk94NURSa3ByRUpIeXZfSHVmc0JYMUVYX0JORQ==",
    "protocol": "oauth2",
    "redirect_uri": "https://localhost:7271/OAuth2/Auth0-OAuth2.html",
    "response_mode": "query",
    "response_type": "code",
    "scope": "openid profile email",
    "state": "NkJKaTUzNzN5N1k1cFBVM0VxTS1aS0JnSGZvaUNoOFRrZjR4NEozMC1URw=="
  },
  "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
}

event.user looks like:
{
    "app_metadata": {},
    "created_at": "2024-09-13T18:05:24.976Z",
    "email_verified": false,
    "firstName": "Cass",
    "identities": [
      {
        "connection": "AsCom",
        "isSocial": false,
        "provider": "auth0",
        "userId": "{55419178-CBE4-46CC-9FAD-8EB52754A7F7}",
        "user_id": "{55419178-CBE4-46CC-9FAD-8EB52754A7F7}"
      }
    ],
    "lastName": "Tester",
    "mileagePlanNumber": "313266645",
    "multifactor": [],
    "name": "casstester",
    "nickname": "casstester",
    "otherCookieData": "{\"AS_NAME\":{\"REMEMBERME\":\"False\",\"SU\":\"FALSE\",\"UID\":\"casstester\",\"FN\":\"Cass\",\"LN\":\"Tester\",\"SF\":\"\",\"MP\":\"313266645\",\"TS\":\"\",\"BM\":\"0\",\"NN\":\"\"},\"AS_ACNT\":{\"AS_ACNT\":\"\",\"TYPE\":\"P\",\"ID\":\"{55419178-CBE4-46CC-9FAD-8EB52754A7F7}\"}}",
    "picture": "https://cdn.auth0.com/avatars/ca.png",
    "realUsername": "casstester",
    "updated_at": "2024-09-13T18:21:25.227Z",
    "user_id": "auth0|{55419178-CBE4-46CC-9FAD-8EB52754A7F7}",
    "user_metadata": {},
    "username": "casstester"
  }

*/

    [
        'firstName',
        'lastName',
        'mileagePlanNumber',
        'realUsername',
        'user_id',
        'otherCookieData'
    ].forEach(customClaim => {
        if (event.user[customClaim]) {
            api.idToken.setCustomClaim(
                namespace + customClaim,
                event.user[customClaim]
            );
        }
    });
    
};

/**
 * Handler that will be invoked when this action is resuming after an external redirect. If your
 * onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
// exports.onContinuePostLogin = async (event, api) => {
// };
