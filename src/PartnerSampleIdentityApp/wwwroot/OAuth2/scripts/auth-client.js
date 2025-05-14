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

/**
 * Performs authentication with username and password
 * Note: This uses Resource Owner Password Grant which is not recommended for most applications
 * @param {string} username - User's email or username
 * @param {string} password - User's password
 * @returns {Promise<Object>} Authentication result
 */
export async function loginWithCredentials(username, password) {
    try {
        // Use the existing SPA client if available
        if (!spaClient) {
            throw new Error('Auth0 client is not initialized. Call initializeClients first.');
        }

        // Make the login request
        // Note: This requires that your Auth0 application has the
        // "Password" grant type enabled, which is discouraged for security reasons
        const options = {
            realm: 'Username-Password-Authentication', // Or your specific connection name
            username,
            password
        };

        const result = await spaClient.loginWithCredentials(options);
        return { success: true, result };
    } catch (error) {
        console.error('Credential login error:', error);
        return {
            success: false,
            error: error.error || 'login_failed',
            errorDescription: error.error_description || 'Login with credentials failed'
        };
    }
}

export function updateClients(newSpaClient, newWebClient) {
    if (newSpaClient) spaClient = newSpaClient;
    if (newWebClient) webClient = newWebClient;
}
