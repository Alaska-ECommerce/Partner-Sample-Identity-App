// main.js
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
import { login, logout, loginToAlaskaAir, selectAuthType } from './login-handlers.js';
import { handleSpaAuthResponse, handleRegularAuthResponse } from './response-handlers.js';

// Setup global handlers
window.handleEnvironmentChange = (newEnv) => {
    handleEnvironmentChange(newEnv, setEnvironment, getDomain, getClientId, getType, getCurrentEnvironment);
};
window.login = login;
window.logout = logout;
window.loginToAlaskaAir = loginToAlaskaAir;
window.selectAuthType = selectAuthType;

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
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the application. Please refresh the page.');
    }
};
