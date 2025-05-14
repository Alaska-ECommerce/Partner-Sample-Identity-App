// login-handlers.js
import { showError } from './auth-ui.js';
import { getClients, updateClients } from './auth-client.js';

export async function login() {
    // get type from local storage
    const type = localStorage.getItem('selectedAuthType');

    switch (type) {
        case 'spa':
            await spaLogin();
            break;
        case 'regular':
            await regularLogin();
            break;
        case 'credentials':
            await credentialsLogin();
            break;
        default:
            showError('Invalid auth type selected');
            break;
    }
}

export async function spaLogin() {
    try {
        const domain = document.getElementById('oauthDomain').value;
        const clientId = document.getElementById('oauthClientId').value;
        const redirectUri = document.getElementById('oauthRedirectUrl').value;
        const appState = document.getElementById('appState').value;

        const spaClient = await auth0.createAuth0Client({
            domain,
            clientId,
            authorizationParams: {
                redirect_uri: redirectUri
            }
        });

        updateClients(spaClient, null);

        await spaClient.loginWithRedirect({
            appState: appState || undefined
        });
    } catch (error) {
        console.error('SPA login error:', error);
        showError('Failed to initialize login. Please check your configuration.');
    }
}

export async function regularLogin() {
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
        webClient.authorize();
    } catch (error) {
        console.error('Regular login error:', error);
        showError('Failed to initialize login. Please check your configuration.');
    }
}

/**
 * Performs silent authentication using the prompt=none parameter
 * @returns {Promise<Object>} Authentication result or error
 */
export async function silentAuth() {
    try {
        const type = localStorage.getItem('selectedAuthType');
        const domain = document.getElementById('oauthDomain').value;
        const clientId = document.getElementById('oauthClientId').value;
        const redirectUri = document.getElementById('oauthRedirectUrl').value;

        if (type === 'spa') {
            // For SPAs, use Auth0 SPA SDK's getTokenSilently method
            const spaClient = await auth0.createAuth0Client({
                domain,
                clientId,
                authorizationParams: {
                    redirect_uri: redirectUri
                }
            });

            updateClients(spaClient, null);

            try {
                // Try to get a token silently - this will succeed only if the user has a valid SSO session
                const token = await spaClient.getTokenSilently({
                    authorizationParams: {
                        // Add options as needed
                        scope: 'openid profile email'
                    }
                });

                // Get the user info
                const user = await spaClient.getUser();
                displaySilentAuthResult({ success: true, user, token });
                return { success: true, user, token };
            } catch (error) {
                // If we get here, the user needs to log in interactively
                displaySilentAuthResult({
                    success: false,
                    error: error.error || 'login_required',
                    errorDescription: error.error_description || 'Silent authentication failed'
                });
                return { success: false, error };
            }
        } else if (type === 'regular') {
            // For regular web apps, use Auth0 WebAuth checkSession method
            const webClient = new Auth0WebAuth({
                domain,
                clientID: clientId,
                redirectUri,
                responseType: 'token id_token',
                scope: 'openid profile email'
            });

            updateClients(null, webClient);

            return new Promise((resolve, reject) => {
                webClient.checkSession({}, (err, authResult) => {
                    if (err) {
                        console.error('Silent auth error:', err);
                        displaySilentAuthResult({
                            success: false,
                            error: err.error || 'login_required',
                            errorDescription: err.error_description || 'Silent authentication failed'
                        });
                        resolve({ success: false, error: err });
                    } else {
                        if (authResult && authResult.accessToken) {
                            // Get user info
                            webClient.client.userInfo(authResult.accessToken, (err, user) => {
                                if (err) {
                                    console.error('Error getting user info:', err);
                                    displaySilentAuthResult({ success: false, error: 'user_info_error' });
                                    resolve({ success: false, error: err });
                                } else {
                                    displaySilentAuthResult({ success: true, user, token: authResult });
                                    resolve({ success: true, user, token: authResult });
                                }
                            });
                        } else {
                            displaySilentAuthResult({ success: false, error: 'no_token_received' });
                            resolve({ success: false, error: { error: 'no_token_received' } });
                        }
                    }
                });
            });
        } else {
            throw new Error('Invalid auth type for silent authentication');
        }
    } catch (error) {
        console.error('Silent auth setup error:', error);
        showError('Failed to set up silent authentication');
        return { success: false, error };
    }
}

/**
 * Displays the result of a silent authentication attempt
 * @param {Object} result - The authentication result 
 */
function displaySilentAuthResult(result) {
    try {
        // Create or update the silent auth result display
        let resultElement = document.getElementById('silentAuthResult');
        if (!resultElement) {
            resultElement = document.createElement('div');
            resultElement.id = 'silentAuthResult';
            const returnedAppStateDiv = document.getElementById('returnedAppState-div');
            returnedAppStateDiv.parentNode.insertBefore(resultElement, returnedAppStateDiv.nextSibling);
        }

        if (result.success) {
            resultElement.innerHTML = `
                <div class="success-message">
                    <h4>Silent Authentication Successful</h4>
                    <p>User is authenticated without interaction</p>
                    <pre>${JSON.stringify(result.user, null, 2)}</pre>
                </div>
            `;
            document.getElementById('content-jwt').textContent = JSON.stringify(result.user, null, 2);

            // Update app state if available
            if (document.getElementById('returnedAppState')) {
                document.getElementById('returnedAppState').value =
                    typeof result.token === 'string' ? result.token : JSON.stringify(result.token);
            }
        } else {
            resultElement.innerHTML = `
                <div class="error-message">
                    <h4>Silent Authentication Failed</h4>
                    <p>Error: ${result.error}</p>
                    <p>${result.errorDescription || ''}</p>
                    <p>The user needs to log in interactively.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error displaying silent auth result:', error);
    }
}

/**
 * Sets up periodic polling for session status
 * @param {number} interval - The interval in milliseconds (minimum recommended: 900000 - 15 minutes)
 */
export function setupSessionPolling(interval = 900000) { // Default 15 minutes
    if (interval < 900000) {
        console.warn('Warning: Polling interval less than 15 minutes may cause rate limiting');
    }

    // Clear any existing interval
    if (window.sessionPollingInterval) {
        clearInterval(window.sessionPollingInterval);
    }

    // Set up new polling interval
    window.sessionPollingInterval = setInterval(async () => {
        console.log('Checking session status...');
        const result = await silentAuth();

        // If session is invalid and user was previously logged in, log them out
        if (!result.success && localStorage.getItem('isLoggedIn') === 'true') {
            console.log('Session expired, logging out');
            localStorage.removeItem('isLoggedIn');
            // Optional: auto logout
            // logout();
        } else if (result.success) {
            localStorage.setItem('isLoggedIn', 'true');
        }
    }, interval);

    // Return a function to stop polling
    return () => {
        if (window.sessionPollingInterval) {
            clearInterval(window.sessionPollingInterval);
            window.sessionPollingInterval = null;
        }
    };
}

export async function logout() {
    const type = localStorage.getItem('selectedAuthType');
    const domain = document.getElementById('oauthDomain').value;
    const returnTo = window.location.origin + window.location.pathname;
    const { spaClient, webClient } = getClients();

    try {
        // Clear logged in state
        localStorage.removeItem('isLoggedIn');

        if (type === 'spa' && spaClient) {
            await spaClient.logout({
                logoutParams: {
                    returnTo,
                    client_id: document.getElementById('oauthClientId').value
                }
            });
        } else if (type === 'regular' && webClient) {
            // Use Auth0's v2 logout endpoint directly
            window.location.href = `https://${domain}/v2/logout?client_id=${document.getElementById('oauthClientId').value}&returnTo=${encodeURIComponent(returnTo)}`;
        }
    } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout. Please try again.');
    }
}

export async function loginToAlaskaAir() {
    // get type from local storage
    const type = localStorage.getItem('selectedAuthType');

    // Implement your Alaska Air specific login logic here
    console.log(`Initiating Alaska Air login for ${type}`);
    // This is a placeholder - implement actual logic based on your requirements
}

export async function selectAuthType(type) {
    // Store the selected auth type
    localStorage.setItem('selectedAuthType', type);

    // Update the selector
    const selector = document.getElementById('authTypeSelector');
    if (selector) {
        selector.value = type;
    }
}

/**
 * Saves credential fields to localStorage
 */
function saveCredentialFields() {
    // Get values from form
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const clientSecret = document.getElementById('clientSecret').value;

    // Store values in localStorage (consider if this is appropriate for your security requirements)
    if (username) localStorage.setItem('auth_username', username);
    if (password) localStorage.setItem('auth_password', password);
    if (clientSecret) localStorage.setItem('auth_clientSecret', clientSecret);
}

/**
 * Restores credential fields from localStorage
 */
export function restoreCredentialFields() {
    // Get stored values
    const username = localStorage.getItem('auth_username');
    const password = localStorage.getItem('auth_password');
    const clientSecret = localStorage.getItem('auth_clientSecret');

    // Set form field values if they exist in localStorage
    const usernameField = document.getElementById('username');
    const passwordField = document.getElementById('password');
    const clientSecretField = document.getElementById('clientSecret');

    if (usernameField && username) usernameField.value = username;
    if (passwordField && password) passwordField.value = password;
    if (clientSecretField && clientSecret) clientSecretField.value = clientSecret;
}


/**
 * Performs login using username and password
 * @returns {Promise<void>} 
 */
export async function credentialsLogin() {
    try {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const clientSecret = document.getElementById('clientSecret').value; // Get client secret from form

        // Save credential fields to localStorage
        saveCredentialFields();

        if (!username || !password) {
            showError('Username and password are required');
            return;
        }

        if (!clientSecret) {
            showError('Client secret is required for Resource Owner Password Grant');
            return;
        }

        // Show loading state
        const loginButton = document.getElementById('credentialsLoginButton');
        const originalButtonText = loginButton.textContent;
        loginButton.disabled = true;
        loginButton.textContent = 'Authenticating...';

        try {
            const result = await loginWithCredentials(username, password, clientSecret);

            if (result.success) {
                // Display user information
                const user = result.result?.user || result.result;
                document.getElementById('content-jwt').textContent = JSON.stringify(user, null, 2);

                // Create a success message
                let resultElement = document.getElementById('credentialsAuthResult');
                if (!resultElement) {
                    resultElement = document.createElement('div');
                    resultElement.id = 'credentialsAuthResult';
                    const credentialsSection = document.getElementById('credentials-section') ||
                        document.getElementById('silentAuth-div');
                    credentialsSection.parentNode.insertBefore(resultElement, credentialsSection.nextSibling);
                }

                resultElement.innerHTML = `
                    <div class="success-message">
                        <h4>Credential Authentication Successful</h4>
                        <p>Successfully authenticated with username/password</p>
                        <pre>${JSON.stringify(user, null, 2)}</pre>
                    </div>
                `;

                // Set logged in state
                localStorage.setItem('isLoggedIn', 'true');

                // Update app state if available
                if (document.getElementById('returnedAppState')) {
                    document.getElementById('returnedAppState').value =
                        typeof result.token === 'string' ? result.token : JSON.stringify(result.result);
                }
            } else {
                showError(`Login failed: ${result.errorDescription || result.error || 'Unknown error'}`);
            }
        } finally {
            // Restore button state
            loginButton.disabled = false;
            loginButton.textContent = originalButtonText;
        }
    } catch (error) {
        console.error('Credential login error:', error);
        showError('Failed to authenticate with credentials. Please check your username and password.');
    }
}

/**
 * Performs authentication with username and password
 * Note: This uses Resource Owner Password Grant which is not recommended for most applications
 * @param {string} username - User's email or username
 * @param {string} password - User's password
 * @param {string} clientSecret - The client secret for Resource Owner Password Grant
 * @returns {Promise<Object>} Authentication result
 */
export async function loginWithCredentials(username, password, clientSecret) {
    try {
        const domain = document.getElementById('oauthDomain').value;
        const clientId = document.getElementById('oauthClientId').value;

        // For Auth0 SPA SDK v2+, we need to use /oauth/token endpoint directly
        // This is not the recommended approach but is required for username/password flow
        const url = `https://${domain}/oauth/token`;

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                grant_type: 'password',
                username,
                password,
                client_id: clientId,
                client_secret: clientSecret, // Include client secret
                scope: 'openid profile email',
                // Optionally include an audience if needed for your API access
                // audience: `https://${domain}/api/v2/`
                //audience: clientId
            })
        };

        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            console.error('Auth0 authentication error details:', data);
            throw new Error(data.error_description || data.error || 'Authentication failed');
        }

        // Now get the user info
        const userInfoResponse = await fetch(`https://${domain}/userinfo`, {
            headers: {
                'Authorization': `Bearer ${data.access_token}`
            }
        });

        if (!userInfoResponse.ok) {
            const errorData = await userInfoResponse.json();
            console.error('User info error details:', errorData);
            throw new Error('Failed to get user information');
        }

        const user = await userInfoResponse.json();
        return {
            success: true,
            result: {
                user,
                token: data
            }
        };
    } catch (error) {
        console.error('Credential login error:', error);
        return {
            success: false,
            error: error.message || 'login_failed',
            errorDescription: error.message || 'Login with credentials failed'
        };
    }
}

