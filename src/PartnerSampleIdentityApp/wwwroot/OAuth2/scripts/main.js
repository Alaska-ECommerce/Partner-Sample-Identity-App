// main.js update
import {
    getCurrentConfig,
    setEnvironment,
    getClientId,
    getDomain,
    getType,
    getCurrentEnvironment,
    getEnvironments
} from '/Config/auth-config.js';

import { initializeClients, getRedirectUri } from './auth-client.js';
import { initializeStateManagement, handleEnvironmentChange, showError } from './auth-ui.js';
import { login, logout, loginToAlaskaAir, selectAuthType, silentAuth, setupSessionPolling, credentialsLogin, loginWithCredentials, restoreCredentialFields } from './login-handlers.js';
import { handleSpaAuthResponse, handleRegularAuthResponse } from './response-handlers.js';

// Setup global handlers
window.handleEnvironmentChange = (newEnv) => {
    handleEnvironmentChange(newEnv, setEnvironment, getDomain, getClientId, getType, getCurrentEnvironment);
};
window.login = login;
window.logout = logout;
window.loginToAlaskaAir = loginToAlaskaAir;
window.selectAuthType = selectAuthType;
window.silentAuth = silentAuth; // Expose silent auth
window.setupSessionPolling = setupSessionPolling; // Expose session polling
window.loginWithCredentials = credentialsLogin; // Expose credentials login

// Initialize the application
window.onload = async () => {
    try {
        // Get initial config
        const config = getCurrentConfig();

        // Initialize state management
        initializeStateManagement(getCurrentEnvironment, getEnvironments, setEnvironment, getDomain, getClientId, getType);

        const domain = getDomain();
        const clientId = getClientId();
        const initRedirectUri = getRedirectUri();

        // Initialize clients
        await initializeClients(domain, clientId);

        // Set form field values from auth-config
        document.querySelectorAll('[id$="oauthDomain"]').forEach(el =>
            el.value = getDomain());
        document.querySelectorAll('[id$="oauthClientId"]').forEach(el =>
            el.value = getClientId());
        document.querySelectorAll('[id$="oauthRedirectUrl"]').forEach(el =>
            el.value = initRedirectUri);

        // Get stored auth type or default to the one from config
        const storedAuthType = localStorage.getItem('selectedAuthType') || getType();

        if (window.location.hash && window.location.hash.includes('access_token')) {
            await selectAuthType('regular');
            // Handle regular web auth response
            handleRegularAuthResponse();
        } else if (window.location.search.includes("code=")) {
            await selectAuthType('spa');
            // Handle SPA auth response
            await handleSpaAuthResponse();
        } else {
            await selectAuthType(storedAuthType);

            // Show/hide credential form based on selected auth type
            const authTypeSelector = document.getElementById('authTypeSelector');
            if (authTypeSelector && authTypeSelector.value === 'credentials') {
                const credentialsSection = document.getElementById('credentials-section');
                const loginButton = document.getElementById('loginButton');
                if (credentialsSection) credentialsSection.style.display = 'block';
                if (loginButton) loginButton.style.display = 'none';
            }

            // Restore credential fields from localStorage
            restoreCredentialFields();
        }

        // Setup input change listeners for credential fields
        setupCredentialFieldListeners();

        // Dispatch an event when the module is loaded and functions are exposed
        document.dispatchEvent(new CustomEvent('auth0FunctionsLoaded', {
            detail: {
                selectAuthType,
                login,
                logout,
                silentAuth,
                loginWithCredentials,
                credentialsLogin,
                setupSessionPolling,
                loginToAlaskaAir,
                restoreCredentialFields
            }
        }));

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page.');
    }
};

/**
 * Sets up event listeners for credential fields to save values on change
 */
function setupCredentialFieldListeners() {
    const fields = ['username', 'password', 'clientSecret'];

    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('change', function () {
                // Save the changed value to localStorage
                if (this.value) {
                    localStorage.setItem(`auth_${fieldId}`, this.value);
                }
            });
        }
    });
}
