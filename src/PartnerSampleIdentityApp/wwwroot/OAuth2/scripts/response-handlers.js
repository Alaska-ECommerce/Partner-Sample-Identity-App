// response-handlers.js
import { showError, displayUserDetails } from './auth-ui.js';
import { updateClients } from './auth-client.js';

export async function handleSpaAuthResponse() {
    try {
        const domain = document.getElementById('oauthDomain').value;
        const clientId = document.getElementById('oauthClientId').value;
        const redirectUri = document.getElementById('oauthRedirectUrl').value;

        const spaClient = await auth0.createAuth0Client({
            domain,
            clientId,
            authorizationParams: {
                redirect_uri: redirectUri
            }
        });

        updateClients(spaClient, null);

        // Handle the authentication response
        await spaClient.handleRedirectCallback();

        // Get the user info
        const user = await spaClient.getUser();

        // Display user details
        displayUserDetails(user);

        // Get and display the returned app state if any
        const appState = await spaClient.getTokenSilently();
        document.getElementById('returnedAppState').value = appState;
    } catch (error) {
        console.error('Error handling SPA auth response:', error);
        showError('Failed to process authentication response');
    }
}

export function handleRegularAuthResponse() {
    try {
        const domain = document.getElementById('oauthDomain').value;
        const clientId = document.getElementById('oauthClientId').value;
        const redirectUri = document.getElementById('oauthRedirectUrl').value;

        const webClient = new Auth0WebAuth({
            domain,
            clientID: clientId,
            redirectUri,
            responseType: 'token id_token',
            scope: 'openid profile email'
        });

        updateClients(null, webClient);

        webClient.parseHash((err, authResult) => {
            if (err) {
                console.error('Error parsing hash:', err);
                showError(err.error_description);
                return;
            }
            if (authResult && authResult.accessToken) {
                // Display the auth result
                document.getElementById('returnedAppState').value = JSON.stringify(authResult);

                // Get user info
                webClient.client.userInfo(authResult.accessToken, (err, user) => {
                    if (err) {
                        console.error('Error getting user info:', err);
                        showError('Failed to get user information');
                        return;
                    }
                    displayUserDetails(user);
                });
            }
        });
    } catch (error) {
        console.error('Error handling regular auth response:', error);
        showError('Failed to process authentication response');
    }
}
