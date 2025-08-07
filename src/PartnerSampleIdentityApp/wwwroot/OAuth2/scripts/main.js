// main.js update
import {
    getCurrentConfig,
    setEnvironment,
    getClientId,
    getDomain,
    getType,
    getCurrentEnvironment,
    getEnvironments,
    getAudience
} from '/Config/auth-config.js';

import { initializeClients, getRedirectUri } from './auth-client.js';
import { initializeStateManagement, handleEnvironmentChange, showError } from './auth-ui.js';
import { login, logout, loginToAlaskaAir, selectAuthType, silentAuth, setupSessionPolling, credentialsLogin, restoreCredentialFields } from './login-handlers.js';
import { handleSpaAuthResponse, handleRegularAuthResponse } from './response-handlers.js';

// Setup global handlers
window.handleEnvironmentChange = (newEnv) => {
    handleEnvironmentChange(newEnv, setEnvironment, getDomain, getClientId, getType, getCurrentEnvironment, getAudience);
};
window.login = login;
window.logout = logout;
window.loginToAlaskaAir = loginToAlaskaAir;
window.selectAuthType = selectAuthType;
window.silentAuth = silentAuth; // Expose silent auth
window.setupSessionPolling = setupSessionPolling; // Expose session polling
window.loginWithCredentials = credentialsLogin; // Expose credentials login (legacy name)
window.credentialsLogin = credentialsLogin; // Expose credentials login with correct name
window.restoreCredentialFields = restoreCredentialFields; // Expose restore credentials

// Listen for components loaded event and then initialize the auth functionality
document.addEventListener('componentsLoaded', async () => {
    try {
        // Get initial config
        const config = getCurrentConfig();

        // Initialize state management
        initializeStateManagement(getCurrentEnvironment, getEnvironments, setEnvironment, getDomain, getClientId, getType, getAudience);

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
        document.querySelectorAll('[id$="audience"]').forEach(el =>
            el.value = getAudience());
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
            
            // Restore credential fields from localStorage
            restoreCredentialFields();
        }

        // Dispatch an event when the module is loaded and functions are exposed
        console.log('Dispatching auth0FunctionsLoaded event with credentialsLogin:', !!credentialsLogin);
        document.dispatchEvent(new CustomEvent('auth0FunctionsLoaded', {
            detail: {
                selectAuthType,
                login,
                logout,
                silentAuth,
                setupSessionPolling,
                loginToAlaskaAir,
                credentialsLogin, // Make sure this is included
                loginWithCredentials: credentialsLogin, // Add alias for backward compatibility
                restoreCredentialFields
            }
        }));

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page.');
    }
});

// Fall back to the original initialization if components loaded event doesn't fire
window.onload = async () => {
    // Only run this initialization if components haven't been loaded yet
    if (!document.querySelector('.auth-section')) {
        console.warn('Component loading may have failed, falling back to direct initialization');

        const event = new CustomEvent('componentsLoaded');
        document.dispatchEvent(event);
    }
};