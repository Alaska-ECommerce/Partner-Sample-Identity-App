import { loadTemplate, loadTemplateSync } from './template-loader.js';

/**
 * Sets up all event listeners for the components
 */
export function setEventListeners() {
    // Wait for auth0 module functions to be available
    document.addEventListener('auth0FunctionsLoaded', function (event) {
        // Get the functions from the event detail
        const { selectAuthType, login, logout, silentAuth, setupSessionPolling,
            loginToAlaskaAir, credentialsLogin, restoreCredentialFields } = event.detail;

        // Initialize auth type selector
        const selector = document.getElementById('authTypeSelector');
        if (selector) {
            const storedType = localStorage.getItem('selectedAuthType') || 'spa';
            selector.value = storedType;

            // Update UI initially based on stored selection
            updateAuthTypeUI(storedType);

            // Add change event listener
            selector.addEventListener('change', function () {
                const selectedValue = this.value;

                // Store the selection and update the UI
                if (selectAuthType) {
                    selectAuthType(selectedValue);
                } else {
                    localStorage.setItem('selectedAuthType', selectedValue);
                }

                updateAuthTypeUI(selectedValue);
            });
        }

        // Set up credential field listeners
        ['username', 'password', 'clientSecret'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', function () {
                    localStorage.setItem(`auth_${id}`, this.value);
                });
            }
        });

        // Set up button click handlers
        setupButtonHandlers({
            login,
            logout,
            silentAuth,
            credentialsLogin, // Fix: use correct function name
            setupSessionPolling,
            loginToAlaskaAir
        });
    });

    // Add direct event listener for silentAuthButton as a fallback
    setupSilentAuthFallback();
}

/**
 * Sets up button click handlers
 */
function setupButtonHandlers(handlers) {
    console.log('Setting up button handlers with:', Object.keys(handlers).join(', '));
    const { login, logout, silentAuth, setupSessionPolling, loginToAlaskaAir, credentialsLogin, loginWithCredentials } = handlers;
    
    // Store credentialsLogin function globally to ensure it's accessible
    if (credentialsLogin) {
        console.log('Found credentialsLogin in handlers, exposing globally');
        window.credentialsLogin = credentialsLogin;
    } else if (loginWithCredentials) {
        console.log('Using loginWithCredentials as fallback');
        window.credentialsLogin = loginWithCredentials;
    }

    // Login button
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', function () {
            if (login) login();
        });
    }

    // Logout button
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function () {
            if (logout) logout();
        });
    }

    // Silent Auth button
    const silentAuthButton = document.getElementById('silentAuthButton');
    if (silentAuthButton) {
        silentAuthButton.addEventListener('click', function () {
            console.log('Silent Auth button clicked');
            
            if (silentAuth) {
                try {
                    console.log('Initiating silent authentication...');
                    silentAuth();
                } catch (error) {
                    console.error('Error during silent authentication:', error);                    const resultElement = document.getElementById('silentAuthResult');
                    if (resultElement) {
                        loadTemplate('silent-auth-error', { errorMessage: error.message || 'Unknown error' })
                            .then(html => {
                                resultElement.innerHTML = html;
                            })
                            .catch(err => {
                                console.error('Error loading silent auth error template:', err);
                                resultElement.innerHTML = `
                                    <div class="error-message">
                                        <h4>Silent Authentication Error</h4>
                                        <p>Error: ${error.message || 'Unknown error'}</p>
                                    </div>
                                `;
                            });
                    }
                }
            } else {
                console.error('silentAuth function is not available');
                alert('Silent Authentication function is not available. Please check the console for errors.');
            }
        });
    }    // Flag to prevent multiple simultaneous login attempts
    let credentialsLoginInProgress = false;

    // Credentials Login button
    const credentialsLoginButton = document.getElementById('credentialsLoginButton');
    if (credentialsLoginButton) {
        credentialsLoginButton.addEventListener('click', function() {            // Prevent multiple simultaneous login attempts
            if (credentialsLoginInProgress) {
                console.log('Login already in progress, ignoring click');
                return;
            }
            
            // Get form values
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const clientSecret = document.getElementById('clientSecret').value;
            
            console.log('Credentials login button clicked!');
            
            // Basic validation first
            if (!username || !password || !clientSecret) {
                console.log('Validation failed: missing required fields');
                const resultElement = document.getElementById('credentialsAuthResult');
                if (resultElement) {
                    loadTemplate('validation-error', { errorMessage: 'Please provide all required fields: username, password, and client secret.' })
                        .then(html => {
                            resultElement.innerHTML = html;
                        })
                        .catch(err => {
                            console.error('Error loading validation error template:', err);
                            resultElement.innerHTML = `
                            <div class="error-message">
                                <h4>Validation Error</h4>
                                <p>Username, password, and client secret are all required.</p>
                            </div>`;
                        });
                }
                return;
            }
            
            // Mark login as in progress
            credentialsLoginInProgress = true;
            credentialsLoginButton.disabled = true;
            credentialsLoginButton.textContent = 'Authenticating...';
            
            // Show loading state in the result area
            const resultElement = document.getElementById('credentialsAuthResult');
            if (resultElement) {
                loadTemplate('loading')
                    .then(html => {
                        resultElement.innerHTML = html;
                    })
                    .catch(err => {
                        console.error('Error loading loading template:', err);
                        resultElement.innerHTML = `
                        <div class="loading-container">
                            <div class="loader"></div>
                            <div class="loading-text">Authenticating with Auth0...</div>
                        </div>`;
                    });
            }
            
            // Find and execute the appropriate login function
            setTimeout(() => {
                try {
                    console.log('Attempting to call credentialsLogin function...');
                    
                    // Use a single login function reference to avoid multiple calls
                    let loginFunction = null;
                    
                    // Find the appropriate login function
                    if (typeof window.credentialsLogin === 'function') {
                        console.log('Using window.credentialsLogin');
                        loginFunction = window.credentialsLogin;
                    } 
                    else if (typeof credentialsLogin === 'function') {
                        console.log('Using local credentialsLogin reference');
                        loginFunction = credentialsLogin;
                    } 
                    else if (typeof window.loginWithCredentials === 'function') {
                        console.log('Using window.loginWithCredentials');
                        loginFunction = window.loginWithCredentials;
                    }
                    
                    // Execute the function only if one was found
                    if (loginFunction) {
                        loginFunction()
                            .finally(() => {
                                // Reset login state
                                credentialsLoginInProgress = false;
                                credentialsLoginButton.disabled = false;
                                credentialsLoginButton.textContent = 'Login';
                            });
                    } else {
                        console.error('ERROR: NO CREDENTIALS LOGIN FUNCTION AVAILABLE');
                        if (resultElement) {
                            resultElement.innerHTML = `
                            <div class="error-message">
                                <h4>Error</h4>
                                <p>Credentials login function not available. Check console for details.</p>
                            </div>`;
                        }
                        // Reset login state
                        credentialsLoginInProgress = false;
                        credentialsLoginButton.disabled = false;
                        credentialsLoginButton.textContent = 'Login';
                    }
                } catch (error) {
                    console.error('Error executing credentials login:', error);
                    // Reset login state
                    credentialsLoginInProgress = false;
                    credentialsLoginButton.disabled = false;
                    credentialsLoginButton.textContent = 'Login';
                }
            }, 10); // Small delay to ensure UI updates first
        });
    }
      // Test connection button
    const credentialsTestButton = document.getElementById('credentialsTestButton');
    if (credentialsTestButton) {
        credentialsTestButton.addEventListener('click', async function() {
            // Get connection details
            const domain = document.getElementById('oauthDomain').value;
            const clientId = document.getElementById('oauthClientId').value;
            
            // Show testing indicator
            const resultElement = document.getElementById('credentialsAuthResult');
            if (resultElement) {
                loadTemplate('testing-connection')
                    .then(html => {
                        resultElement.innerHTML = html;
                    })
                    .catch(err => {
                        console.error('Error loading testing connection template:', err);
                        resultElement.innerHTML = `
                        <div class="loading-container">
                            <div class="loader"></div>
                            <div class="loading-text">Testing connection to Auth0...</div>
                        </div>
                        `;
                    });
            }
            
            try {                // Import the test function for SPA
                const { testAuth0Connection } = await import('./auth0-test-spa.js');
                
                // Run the test (without client secret)
                const testResult = await testAuth0Connection(domain, clientId);
                
                // Display result
                if (resultElement) {
                    if (testResult.success) {
                        loadTemplate('connection-success', {
                            domain: testResult.details.domain,
                            clientId: `${clientId.substring(0, 3)}...${clientId.substring(clientId.length - 3)}`,
                            region: testResult.details.region || 'US'
                        })
                        .then(html => {
                            resultElement.innerHTML = html;
                        })
                        .catch(err => {
                            console.error('Error loading connection success template:', err);
                            resultElement.innerHTML = `
                            <div class="success-message">
                                <h4>Connection Successful</h4>
                                <p>${testResult.message}</p>
                                <div class="details">
                                    <p><strong>Domain:</strong> ${testResult.details.domain}</p>
                                    <p><strong>Client ID:</strong> ${clientId.substring(0, 3)}...${clientId.substring(clientId.length - 3)}</p>
                                    <p><strong>Status:</strong> Valid configuration</p>
                                </div>
                            </div>
                            `;
                        });
                    } else {
                        // Load connection error template
                        loadTemplate('connection-error', {
                            errorMessage: testResult.message + 
                                (testResult.error ? ` (Error: ${testResult.error})` : '')
                        })
                        .then(html => {
                            resultElement.innerHTML = html;
                            // Add help content
                            return loadTemplate('connection-error-help');
                        })
                        .then(helpHtml => {
                            resultElement.innerHTML += helpHtml;
                        })
                        .catch(err => {
                            console.error('Error loading connection error template:', err);
                            resultElement.innerHTML = `
                            <div class="error-message">
                                <h4>Connection Test Failed</h4>
                                <p>${testResult.message}</p>
                                ${testResult.error ? `<p><strong>Error:</strong> ${testResult.error}</p>` : ''}
                            </div>
                            <div class="error-help">
                                <p>Verify your Auth0 configuration:</p>
                                <ul>
                                    <li>Check the Auth0 domain - it should look like 'your-tenant.auth0.com'</li>
                                    <li>Verify your client ID is correct</li>
                                    <li>Ensure the client secret is correct</li>
                                    <li>Make sure your internet connection is working</li>
                                </ul>
                            </div>
                            `;
                        });
                    }
                }
            } catch (error) {
                console.error('Test connection error:', error);                if (resultElement) {
                    loadTemplate('connection-error', { 
                        errorMessage: error.message || 'Unexpected error occurred during connection test'
                    })
                    .then(html => {
                        resultElement.innerHTML = html;
                        // Add help content
                        return loadTemplate('connection-error-help');
                    })
                    .then(helpHtml => {
                        resultElement.innerHTML += helpHtml;
                    })                    .catch(err => {
                        console.error('Error loading connection error template:', err);
                        // Try using loadTemplateSync as a fallback
                        try {
                            // Re-attempt with the same template but using sync method
                            const fallbackHtml = loadTemplateSync('connection-error', {
                                errorMessage: `An error occurred while testing the connection: ${error.message}`
                            });
                            resultElement.innerHTML = fallbackHtml;
                        } catch (templateErr) {
                            console.error('Failed to load template synchronously:', templateErr);
                            // Last resort fallback if template loading fails completely
                            resultElement.innerHTML = '<div class="error-message"><h4>Test Failed</h4><p>Connection test failed</p></div>';
                        }
                    });
                }
            }
        });
    }
    
    // Clear credentials button
    const credentialsClearButton = document.getElementById('credentialsClearButton');
    if (credentialsClearButton) {
        credentialsClearButton.addEventListener('click', function() {
            // Clear form fields
            const usernameField = document.getElementById('username');
            const passwordField = document.getElementById('password');
            const clientSecretField = document.getElementById('clientSecret');
            
            if (usernameField) usernameField.value = '';
            if (passwordField) passwordField.value = '';
            if (clientSecretField) clientSecretField.value = '';
            
            // Clear localStorage values
            localStorage.removeItem('auth_username');
            localStorage.removeItem('auth_password');
            localStorage.removeItem('auth_clientSecret');
              // Clear result area
            const resultElement = document.getElementById('credentialsAuthResult');
            if (resultElement) {
                loadTemplate('credentials-cleared')
                    .then(html => {
                        resultElement.innerHTML = html;
                        // Reset after 2 seconds
                        setTimeout(() => {
                            loadTemplate('no-auth-yet')
                                .then(resetHtml => {
                                    resultElement.innerHTML = resetHtml;
                                })
                                .catch(err => {
                                    console.error('Error loading no-auth template:', err);
                                    resultElement.innerHTML = '<p>No authentication performed yet</p>';
                                });
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Error loading credentials-cleared template:', err);
                        resultElement.innerHTML = '<p>Credentials cleared</p>';
                    });
            }
        });
    }

    // Alaska Air Login button
    const alaskaAirButton = document.getElementById('loginToAlaskaAirButton');
    if (alaskaAirButton) {
        alaskaAirButton.addEventListener('click', function () {
            if (loginToAlaskaAir) loginToAlaskaAir();
        });
    }

    // Session polling buttons
    const startPollingButton = document.getElementById('startPollingButton');
    if (startPollingButton) {
        startPollingButton.addEventListener('click', function () {
            if (setupSessionPolling) {
                const interval = document.getElementById('pollingInterval').value;
                setupSessionPolling(interval);
            }
        });
    }

    const stopPollingButton = document.getElementById('stopPollingButton');
    if (stopPollingButton) {
        stopPollingButton.addEventListener('click', function () {
            if (window.sessionPollingInterval) {
                clearInterval(window.sessionPollingInterval);
                window.sessionPollingInterval = null;
                alert('Polling stopped');
            }
        });
    }
}

/**
 * Sets up a fallback for silent auth in case the main handler fails
 */
function setupSilentAuthFallback() {
    const silentAuthButton = document.getElementById('silentAuthButton');
    if (silentAuthButton) {
        silentAuthButton.addEventListener('click', function () {
            if (typeof window.silentAuth === 'function') {
                console.log('Using global silentAuth function');
                window.silentAuth();
            } else {
                console.log('Waiting for silentAuth function to be available...');
                // Check if the function becomes available within a short time
                setTimeout(function () {
                    if (typeof window.silentAuth === 'function') {
                        window.silentAuth();
                    } else {
                        console.error('Silent Auth function not available after waiting');
                        const resultElement = document.getElementById('silentAuthResult');
                        if (resultElement) {
                            resultElement.innerHTML = `
                                <div class="error-message">
                                    <h4>Silent Authentication Error</h4>
                                    <p>Silent Authentication function is not available.</p>
                                    <p>Please ensure you're logged in first.</p>
                                </div>
                            `;
                        }
                    }
                }, 500);
            }
        });
    }
}

/**
 * Helper function to update UI based on auth type selection
 */
function updateAuthTypeUI(authType) {
    const loginButton = document.getElementById('loginButton');
    
    // Always show credentials section regardless of auth type
    const credentialsSection = document.getElementById('credentials-section');
    if (credentialsSection) credentialsSection.style.display = 'block';
    
    // Always show login button
    if (loginButton) loginButton.style.display = 'inline-block';
}