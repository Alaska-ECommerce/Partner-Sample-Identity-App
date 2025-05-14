// auth-client.js
let spaClient = null;
let webClient = null;
const currentUrl = new URL(window.location.href);
const initRedirectUri = currentUrl.origin + currentUrl.pathname;

export async function initializeClients(domain, clientId) {
    try {
        // Initialize SPA client
        spaClient = await auth0.createAuth0Client({
            domain,
            clientId,
            authorizationParams: {
                redirect_uri: initRedirectUri
            }
        });

        // Initialize regular web auth client
        webClient = new Auth0WebAuth({
            domain,
            clientID: clientId,
            redirectUri: initRedirectUri,
            responseType: 'token id_token',
            scope: 'openid profile email'
        });

        return { spaClient, webClient };
    } catch (error) {
        console.error('Client initialization error:', error);
        throw error;
    }
}

export function getRedirectUri() {
    return initRedirectUri;
}

export function getClients() {
    return { spaClient, webClient };
}

export function updateClients(newSpaClient, newWebClient) {
    if (newSpaClient) spaClient = newSpaClient;
    if (newWebClient) webClient = newWebClient;
}
