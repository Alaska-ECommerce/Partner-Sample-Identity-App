// login-handlers.js
import { showError } from './auth-ui.js';
import { getClients, updateClients } from './auth-client.js';

/**
 * Gets OAuth configuration values from the form
 * @returns {Object} Auth configuration object
 */
function getAuthConfig() {
    return {
        domain: document.getElementById('oauthDomain').value,
        clientId: document.getElementById('oauthClientId').value,
        redirectUri: document.getElementById('oauthRedirectUrl').value
    };
}

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
        default:
            showError('Invalid auth type selected');
            break;
    }
}

export async function spaLogin() {
    try {
        const config = getAuthConfig();
        const appState = document.getElementById('appState').value;

        const spaClient = await createSpaClient(config);
        await spaClient.loginWithRedirect({
            appState: appState || undefined
        });
    } catch (error) {
        console.error('SPA login error:', error);
        showError('Failed to initialize login. Please check your configuration.');
    }
}

/**
 * Creates and initializes an Auth0 SPA client
 * @param {Object} config - Auth configuration
 * @returns {Object} Initialized SPA client
 */
async function createSpaClient(config) {
    const { domain, clientId, redirectUri } = config;
    
    const spaClient = await auth0.createAuth0Client({
        domain,
        clientId,
        authorizationParams: {
            redirect_uri: redirectUri
        }
    });
    
    updateClients(spaClient, null);
    return spaClient;
}

export async function regularLogin() {
    try {
        const { domain, clientId, redirectUri } = getAuthConfig();
        const webClient = createWebClient(domain, clientId, redirectUri);
        webClient.authorize();
    } catch (error) {
        console.error('Regular login error:', error);
        showError('Failed to initialize login. Please check your configuration.');
    }
}

/**
 * Creates an Auth0 Web Auth client
 * @param {string} domain - Auth0 domain
 * @param {string} clientId - Auth0 client ID
 * @param {string} redirectUri - Redirect URI
 * @returns {Object} Web Auth client
 */
function createWebClient(domain, clientId, redirectUri) {
    const webClient = new Auth0WebAuth({
        domain,
        clientID: clientId,
        redirectUri,
        responseType: 'token id_token',
        scope: 'openid profile email'
    });
    
    updateClients(null, webClient);
    return webClient;
}

/**
 * Performs silent authentication using the prompt=none parameter
 * @returns {Promise<Object>} Authentication result or error
 */
export async function silentAuth() {
    try {
        console.log('Starting silent authentication process...');
        
        const type = localStorage.getItem('selectedAuthType') || 'spa';
        const config = getAuthConfig();
        
        // Check if we have valid configuration
        if (!config.domain || !config.clientId) {
            console.warn('Missing required authentication configuration');
            showError('Missing required authentication configuration. Please provide domain and client ID.');
            return { 
                success: false, 
                error: 'invalid_configuration',
                errorDescription: 'Missing required authentication configuration'
            };
        }
        
        console.log(`Auth configuration: Domain: ${config.domain}, Client ID: ${config.clientId.substring(0, 5)}..., Auth Type: ${type}`);
        
        // First try with stored access token from credentials login
        console.log('Checking for stored access token...');
        const storedTokenResult = await tryStoredTokenAuth(config.domain);
        
        if (storedTokenResult && storedTokenResult.success) {
            console.log('Silent authentication successful using stored token');
            return storedTokenResult;
        }
        
        // If stored token authentication failed, proceed with type-specific auth
        console.log(`Stored token not available or invalid. Trying ${type} authentication...`);
        
        if (type === 'spa') {
            return await performSpaSilentAuth(config);
        } else if (type === 'regular') {
            return await performRegularSilentAuth(config);
        } else {
            return handleUnsupportedAuthType(type);
        }
    } catch (error) {
        console.error('Silent auth setup error:', error);
        showError('Failed to set up silent authentication');
        return { 
            success: false, 
            error: error.message || 'silent_auth_error', 
            errorDescription: 'Error during silent authentication setup'
        };
    }
}

/**
 * Attempts to authenticate using a stored token
 * @param {string} domain - Auth0 domain
 * @returns {Promise<Object|null>} Authentication result or null if failed
 */
async function tryStoredTokenAuth(domain) {
    const storedToken = localStorage.getItem('auth_access_token');
    
    if (!storedToken) {
        console.log('No stored access token found for silent authentication');
        return null;
    }
    
    try {
        console.log('Found stored token from credentials login, using it for silent authentication');
        
        // Add proper error handling with timeout
        const userInfoResponse = await Promise.race([
            fetch(`https://${domain}/userinfo`, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`
                }
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('User info request timeout')), 10000)
            )
        ]);

        if (userInfoResponse.ok) {
            const user = await userInfoResponse.json();
            console.log('Successfully retrieved user info with stored token:', user.name || user.email || 'authenticated user');
            
            // Create a complete result object
            const result = {
                success: true,
                user,
                token: { 
                    access_token: storedToken,
                    token_type: 'Bearer'
                }
            };
            
            // Make sure we update the login state
            localStorage.setItem('isLoggedIn', 'true');
            
            // Display the result
            displaySilentAuthResult(result);
            return result;
        } else {
            // Token is invalid or expired
            console.warn('Stored token is invalid or expired. Status:', userInfoResponse.status);
            localStorage.removeItem('auth_access_token');
            return null;
        }
    } catch (tokenError) {
        console.error('Error using stored token for silent auth:', tokenError);
        // Clean up the invalid token
        localStorage.removeItem('auth_access_token');
        return null;
    }
}

/**
 * Performs silent authentication for SPA applications
 * @param {Object} config - Auth configuration
 * @returns {Promise<Object>} Authentication result
 */
async function performSpaSilentAuth(config) {
    const { domain, clientId, redirectUri } = config;
    
    const spaClient = await auth0.createAuth0Client({
        domain,
        clientId,
        authorizationParams: {
            redirect_uri: redirectUri
        },
        cacheLocation: 'localStorage' // Explicitly set cache location
    });

    updateClients(spaClient, null);

    try {
        // Try to get a token silently - this will succeed only if the user has a valid SSO session
        const token = await spaClient.getTokenSilently({
            authorizationParams: {
                scope: 'openid profile email'
            },
            timeoutInSeconds: 10 // Add timeout to avoid hanging
        });

        // Get the user info
        const user = await spaClient.getUser();
        const result = { success: true, user, token };
        displaySilentAuthResult(result);
        return result;
    } catch (error) {
        // If we get here, the user needs to log in interactively
        const result = {
            success: false,
            error: error.error || 'login_required',
            errorDescription: error.error_description || 'Silent authentication failed'
        };
        displaySilentAuthResult(result);
        return { success: false, error };
    }
}

/**
 * Performs silent authentication for regular web applications
 * @param {Object} config - Auth configuration
 * @returns {Promise<Object>} Authentication result
 */
async function performRegularSilentAuth(config) {
    const { domain, clientId, redirectUri } = config;
    
    const webClient = new Auth0WebAuth({
        domain,
        clientID: clientId,
        redirectUri,
        responseType: 'token id_token',
        scope: 'openid profile email'
    });

    updateClients(null, webClient);

    return new Promise((resolve) => {
        webClient.checkSession({}, (err, authResult) => {
            if (err) {
                const result = handleRegularAuthError(err);
                resolve(result);
            } else if (authResult && authResult.accessToken) {
                handleRegularAuthSuccess(webClient, authResult, resolve);
            } else {
                const result = { 
                    success: false, 
                    error: { error: 'no_token_received' } 
                };
                displaySilentAuthResult({ success: false, error: 'no_token_received' });
                resolve(result);
            }
        });
    });
}

/**
 * Handles error during regular web auth silent authentication
 * @param {Error} err - Authentication error
 * @returns {Object} Error result
 */
function handleRegularAuthError(err) {
    console.error('Silent auth error:', err);
    const result = {
        success: false,
        error: err.error || 'login_required',
        errorDescription: err.error_description || 'Silent authentication failed'
    };
    displaySilentAuthResult(result);
    return { success: false, error: err };
}

/**
 * Handles successful regular web auth silent authentication
 * @param {Object} webClient - Auth0 web client
 * @param {Object} authResult - Authentication result
 * @param {Function} resolve - Promise resolve function
 */
function handleRegularAuthSuccess(webClient, authResult, resolve) {
    webClient.client.userInfo(authResult.accessToken, (err, user) => {
        if (err) {
            console.error('Error getting user info:', err);
            displaySilentAuthResult({ success: false, error: 'user_info_error' });
            resolve({ success: false, error: err });
        } else {
            const result = { success: true, user, token: authResult };
            displaySilentAuthResult(result);
            resolve(result);
        }
    });
}

/**
 * Handles unsupported authentication types
 * @param {string} type - Authentication type
 * @returns {Object} Error result
 */
function handleUnsupportedAuthType(type) {
    console.warn(`Silent authentication not supported for auth type: ${type}`);
    const result = {
        success: false,
        error: 'unsupported_auth_type',
        errorDescription: `Silent authentication is only supported for 'spa' and 'regular' auth types`
    };
    displaySilentAuthResult(result);
    return { success: false, error: { error: 'unsupported_auth_type' } };
}

/**
 * Displays the result of a silent authentication attempt
 * @param {Object} result - The authentication result 
 */
function displaySilentAuthResult(result) {
    try {
        const resultElement = getOrCreateResultElement();
        
        if (result.success) {
            displaySuccessfulAuth(resultElement, result);
        } else {
            displayFailedAuth(resultElement, result);
        }
    } catch (error) {
        console.error('Error displaying silent auth result:', error);
    }
}

/**
 * Gets or creates the silent auth result display element
 * @returns {HTMLElement} The result element
 */
function getOrCreateResultElement() {
    let resultElement = document.getElementById('silentAuthResult');
    if (!resultElement) {
        resultElement = document.createElement('div');
        resultElement.id = 'silentAuthResult';
        const returnedAppStateDiv = document.getElementById('returnedAppState-div');
        returnedAppStateDiv.parentNode.insertBefore(resultElement, returnedAppStateDiv.nextSibling);
    }
    return resultElement;
}

/**
 * Displays successful authentication result
 * @param {HTMLElement} resultElement - Element to update
 * @param {Object} result - Authentication result
 */
function displaySuccessfulAuth(resultElement, result) {
    // Determine the authentication method used
    let authMethod = "standard";
    if (result.token && result.token.access_token && 
        localStorage.getItem('auth_access_token') === result.token.access_token) {
        authMethod = "stored token from credential login";
    }
    
    // Format user data for display, protecting sensitive information
    const displayUser = { ...result.user };
    if (displayUser.email) {
        // Mask part of the email for privacy in UI
        const [name, domain] = displayUser.email.split('@');
        if (name && domain) {
            const maskedName = name.length > 2 
                ? name.substring(0, 2) + '*'.repeat(name.length - 2)
                : name;
            displayUser.email = `${maskedName}@${domain}`;
        }
    }
    
    resultElement.innerHTML = `
        <div class="success-message">
            <h4>Silent Authentication Successful</h4>
            <p>User is authenticated without interaction using ${authMethod}</p>
            <pre>${JSON.stringify(displayUser, null, 2)}</pre>
        </div>
    `;
    
    // Update UI elements with user info
    updateContentJwt(result.user);
    
    // Update app state with token info
    updateAppState(result.token);
    
    // Ensure logged in state is set
    localStorage.setItem('isLoggedIn', 'true');
    
    console.log('Silent authentication successful for user:', 
        result.user.name || result.user.email || 'authenticated user');
}

/**
 * Updates content JWT element with user info
 * @param {Object} user - User information
 */
function updateContentJwt(user) {
    const contentJwt = document.getElementById('content-jwt');
    if (contentJwt) {
        contentJwt.textContent = JSON.stringify(user, null, 2);
        contentJwt.className = 'result-display json-result';
        contentJwt.style.textAlign = 'left';
        contentJwt.style.whiteSpace = 'pre';
    }
}

/**
 * Updates app state with token info
 * @param {Object|string} token - Authentication token
 */
function updateAppState(token) {
    const appStateElement = document.getElementById('returnedAppState');
    if (appStateElement) {
        appStateElement.value = typeof token === 'string' ? token : JSON.stringify(token);
    }
}

/**
 * Displays failed authentication result
 * @param {HTMLElement} resultElement - Element to update
 * @param {Object} result - Error result
 */
function displayFailedAuth(resultElement, result) {
    // Get additional context about the authentication environment
    const authType = localStorage.getItem('selectedAuthType') || 'unknown';
    const hasStoredToken = !!localStorage.getItem('auth_access_token');
    const wasLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const domain = document.getElementById('oauthDomain')?.value || 'not set';
    
    console.log('Silent auth failed:', result.error, 
        'Auth Type:', authType, 
        'Has Stored Token:', hasStoredToken,
        'Was Logged In:', wasLoggedIn);
    
    // Check for common error cases and provide helpful context
    let additionalHelp = '';
    
    if (hasStoredToken) {
        additionalHelp += `
            <div class="troubleshooting-tips">
                <p><strong>Troubleshooting:</strong></p>
                <p>A stored token was found but could not be used for authentication.</p>
                <p>This likely means the token has expired or is invalid.</p>
                <button id="clearTokenButton" style="margin-top:10px">Clear Stored Token</button>
            </div>
        `;
    }
    
    if (result.error === 'login_required') {
        additionalHelp += `
            <div class="troubleshooting-tips">
                <p>This error typically means you don't have an active session.</p>
                <p>Try logging in using username/password first.</p>
            </div>
        `;
    }
    
    resultElement.innerHTML = `
        <div class="error-message">
            <h4>Silent Authentication Failed</h4>
            <p>Error: ${result.error}</p>
            <p>${result.errorDescription || ''}</p>
            <p>The user needs to log in interactively.</p>
            ${additionalHelp}
        </div>
    `;
    
    // Add event listener to clear token button if it exists
    const clearTokenButton = document.getElementById('clearTokenButton');
    if (clearTokenButton) {
        clearTokenButton.addEventListener('click', () => {
            localStorage.removeItem('auth_access_token');
            localStorage.removeItem('auth_token_expires_at');
            localStorage.removeItem('isLoggedIn');
            alert('Stored token cleared successfully');
            clearTokenButton.disabled = true;
            clearTokenButton.textContent = 'Token Cleared';
        });
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
 * Validates Auth0 configuration parameters
 * @returns {Object} Validation result with success flag and error message if applicable
 */
function validateAuth0Config() {
    const domain = document.getElementById('oauthDomain').value;
    const clientId = document.getElementById('oauthClientId').value;
    
    if (!domain || !domain.includes('.')) {
        return { 
            isValid: false, 
            error: 'Invalid Auth0 domain. Please provide a valid domain (e.g., your-tenant.auth0.com)' 
        };
    }
    
    if (!clientId) {
        return {
            isValid: false,
            error: 'Client ID is required. Please provide a valid Auth0 Client ID'
        };
    }
    
    return { isValid: true };
}

/**
 * Validates credential inputs
 * @param {string} username - Username or email
 * @param {string} password - Password
 * @param {string} clientSecret - Client secret
 * @returns {Object} Validation result
 */
function validateCredentialInputs(username, password, clientSecret) {
    if (!username || !password) {
        showError('Username and password are required');
        return { isValid: false, error: 'Username and password are required' };
    }

    if (!clientSecret) {
        showError('Client secret is required for Resource Owner Password Grant');
        return { isValid: false, error: 'Client secret is required' };
    }
    
    return { isValid: true };
}

/**
 * Shows or updates the credentials auth result UI
 * @param {Object} result - Authentication result
 */
function updateCredentialsAuthUI(result) {
    if (result.success) {
        displaySuccessfulCredentialsAuth(result);
    } else {
        displayFailedCredentialsAuth(result);
    }
}

/**
 * Displays successful credentials authentication
 * @param {Object} result - Authentication result
 */
function displaySuccessfulCredentialsAuth(result) {
    // Store the access token for silent auth if available
    if (result.success && result.result?.token?.access_token) {
        // Save the token and log its presence (not the actual token)
        localStorage.setItem('auth_access_token', result.result.token.access_token);
        console.log('Access token stored for silent authentication: Token length =', 
            result.result.token.access_token.length);
        
        // Also store token expiration time if available
        if (result.result.token.expires_in) {
            const expiresAt = Date.now() + (result.result.token.expires_in * 1000);
            localStorage.setItem('auth_token_expires_at', expiresAt.toString());
            console.log('Token expiration stored:', new Date(expiresAt).toISOString());
        }
    } else {
        console.warn('No access token available in authentication result');
    }

    // Display user information and token response
    const user = result.result?.user || result.result;
    const token = result.result?.token || {};
    
    // Update content-jwt element
    updateContentJwt(user);
    
    // Display formatted result
    const formattedJson = JSON.stringify({ user, token }, null, 2);
    const resultElement = getOrCreateCredentialsResultElement();
    
    if (resultElement) {
        resultElement.textContent = formattedJson;
        resultElement.className = 'result-display json-result';
        resultElement.style.textAlign = 'left';
        resultElement.style.whiteSpace = 'pre';
    }

    // Set logged in state
    localStorage.setItem('isLoggedIn', 'true');

    // Update app state if available
    updateAppStateFromCredentials(result);
    
    // Update auth type in case it's needed for silent auth
    const currentType = localStorage.getItem('selectedAuthType');
    if (!currentType) {
        localStorage.setItem('selectedAuthType', 'spa'); // Default to SPA for credentials login
    }
}

/**
 * Gets or creates the credentials auth result element
 * @returns {HTMLElement} The result element
 */
function getOrCreateCredentialsResultElement() {
    let resultElement = document.getElementById('credentialsAuthResult');
    if (!resultElement) {
        const existingContainer = document.querySelector('#credentials-section .result-container');

        if (existingContainer) {
            resultElement = document.createElement('pre');
            resultElement.id = 'credentialsAuthResult';
            resultElement.className = 'result-display json-result';
            existingContainer.appendChild(resultElement);
        } else {
            const newContainer = document.createElement('div');
            newContainer.className = 'result-container';
            newContainer.innerHTML = `
                <h4>Authentication Result</h4>
                <pre id="credentialsAuthResult" class="result-display json-result"></pre>
            `;

            const credentialsSection = document.getElementById('credentials-section');
            if (credentialsSection) {
                credentialsSection.appendChild(newContainer);
                resultElement = newContainer.querySelector('#credentialsAuthResult');
            }
        }
    }
    return resultElement;
}

/**
 * Updates app state with credentials result
 * @param {Object} result - Authentication result
 */
function updateAppStateFromCredentials(result) {
    if (document.getElementById('returnedAppState')) {
        document.getElementById('returnedAppState').value =
            typeof result.token === 'string' ? result.token : JSON.stringify(result.result);
    }
}

/**
 * Displays failed credentials authentication
 * @param {Object} result - Error result
 */
function displayFailedCredentialsAuth(result) {
    const errorMessage = result.errorDescription || result.error || 'Unknown error';
    console.error('Login failed:', errorMessage);
    showError(`Login failed: ${errorMessage}`);

    // Update result area with the error
    const resultElement = document.getElementById('credentialsAuthResult');
    if (!resultElement) return;
    
    resultElement.innerHTML = `
        <div class="error-message">
            <h4>Authentication Error</h4>
            <p>${errorMessage}</p>
        </div>
    `;
    
    addCredentialErrorHints(resultElement, errorMessage);
}

/**
 * Adds helpful hints to credential error messages
 * @param {HTMLElement} resultElement - Result element to update
 * @param {string} errorMessage - Error message
 */
function addCredentialErrorHints(resultElement, errorMessage) {
    // Add hint for credential errors
    if (errorMessage.includes('password') || 
        errorMessage.includes('credentials') || 
        errorMessage.includes('unauthorized') || 
        errorMessage.includes('invalid') ||
        errorMessage.toLowerCase().includes('wrong')) {
        
        resultElement.innerHTML += `
        <div class="error-help">
            <p><strong>Possible causes:</strong></p>
            <ul>
                <li>Incorrect username or password</li>
                <li>Invalid client secret</li>
                <li>Resource Owner Password Grant not enabled for this Auth0 application</li>
                <li>User doesn't exist in the Auth0 database</li>
            </ul>
        </div>`;
    }
    
    // Add hint for grant_type issues
    if (errorMessage.includes('grant_type') || 
        errorMessage.includes('not enabled') || 
        errorMessage.includes('not allowed')) {
        
        resultElement.innerHTML += `
        <div class="error-help">
            <p><strong>Resource Owner Password Grant Not Enabled</strong></p>
            <p>You need to enable the "Resource Owner Password Flow" for your Auth0 application:</p>
            <ol>
                <li>Log into your Auth0 dashboard</li>
                <li>Go to "Applications" > your application</li>
                <li>Go to "Settings" tab</li>
                <li>Scroll down to "Advanced Settings"</li>
                <li>Go to "Grant Types" tab</li>
                <li>Check "Password" option</li>
                <li>Click "Save Changes"</li>
            </ol>
        </div>`;
    }
}

/**
 * Updates UI state when starting credential login
 * @returns {Object} UI elements and original state
 */
function showCredentialLoginLoading() {
    const loginButton = document.getElementById('credentialsLoginButton');
    const originalButtonText = loginButton.textContent;
    
    // Update button state
    loginButton.disabled = true;
    loginButton.textContent = 'Authenticating...';
    
    // Show loading spinner
    const resultElement = document.getElementById('credentialsAuthResult');
    if (resultElement) {
        resultElement.innerHTML = `
        <div class="loading-container">
            <div class="loader"></div>
            <div class="loading-text">Authenticating with Auth0...</div>
        </div>
        `;
    }
    
    return { loginButton, originalButtonText };
}

/**
 * Performs login using username and password
 */
export async function credentialsLogin() {
    try {
        console.log('Starting credentials login...');
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const clientSecret = document.getElementById('clientSecret').value;
        
        console.log(`Username provided: ${username ? 'Yes' : 'No'}, Password provided: ${password ? 'Yes' : 'No'}, Client Secret provided: ${clientSecret ? 'Yes' : 'No'}`);

        // Validate configuration
        const configValidation = validateAuth0Config();
        if (!configValidation.isValid) {
            showError(configValidation.error);
            const resultElement = document.getElementById('credentialsAuthResult');
            if (resultElement) {
                resultElement.innerHTML = `
                <div class="error-message">
                    <h4>Configuration Error</h4>
                    <p>${configValidation.error}</p>
                </div>`;
            }
            return;
        }

        // Save credentials to localStorage
        saveCredentialFields();
        
        // Validate inputs
        const inputValidation = validateCredentialInputs(username, password, clientSecret);
        if (!inputValidation.isValid) {
            return;
        }

        // Show loading state
        const { loginButton, originalButtonText } = showCredentialLoginLoading();
        
        try {
            // Perform login
            const result = await loginWithCredentials(username, password, clientSecret);
            updateCredentialsAuthUI(result);
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
        const { domain, clientId } = getAuthConfig();
        console.log(`Auth0 Domain: ${domain}, Client ID: ${clientId}`);

        // Get tokens from Auth0
        const tokenResult = await getTokensWithCredentials(
            domain, clientId, username, password, clientSecret
        );
        
        if (!tokenResult.success) {
            return tokenResult;
        }
        
        // Get user info using the access token
        const userResult = await getUserInfoWithToken(domain, tokenResult.data.access_token);
        
        if (!userResult.success) {
            return userResult;
        }
        
        return {
            success: true,
            result: {
                user: userResult.user,
                token: tokenResult.data
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

/**
 * Gets tokens from Auth0 using credentials
 * @param {string} domain - Auth0 domain
 * @param {string} clientId - Auth0 client ID
 * @param {string} username - Username or email
 * @param {string} password - Password
 * @param {string} clientSecret - Client secret
 * @returns {Promise<Object>} Token result
 */
async function getTokensWithCredentials(domain, clientId, username, password, clientSecret) {
    const url = `https://${domain}/oauth/token`;
    console.log(`Attempting to authenticate with ${url}`);

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
            client_secret: clientSecret,
            scope: 'openid profile email'
        })
    };
    
    console.log('Sending authentication request...');
    
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            console.error('Auth0 authentication error details:', data);
            const errorMsg = data.error_description || data.error || 'Authentication failed';
            console.error('Authentication error message:', errorMsg);
            return {
                success: false,
                error: data.error || 'auth_error',
                errorDescription: errorMsg
            };
        }
        
        console.log('Authentication successful, received tokens');
        return { success: true, data };
    } catch (fetchError) {
        console.error('Network error during authentication:', fetchError);
        return {
            success: false,
            error: 'network_error',
            errorDescription: `Network error: ${fetchError.message}. This might be due to CORS restrictions, network connectivity, or an invalid domain.`
        };
    }
}

/**
 * Gets user information using an access token
 * @param {string} domain - Auth0 domain
 * @param {string} accessToken - Access token
 * @returns {Promise<Object>} User info result
 */
async function getUserInfoWithToken(domain, accessToken) {
    try {
        const userInfoResponse = await fetch(`https://${domain}/userinfo`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!userInfoResponse.ok) {
            const errorData = await userInfoResponse.json();
            console.error('User info error details:', errorData);
            return {
                success: false,
                error: 'user_info_error',
                errorDescription: 'Failed to get user information'
            };
        }

        const user = await userInfoResponse.json();
        return { success: true, user };
    } catch (error) {
        console.error('Error getting user info:', error);
        return {
            success: false,
            error: 'user_info_error',
            errorDescription: error.message || 'Failed to get user information'
        };
    }
}

