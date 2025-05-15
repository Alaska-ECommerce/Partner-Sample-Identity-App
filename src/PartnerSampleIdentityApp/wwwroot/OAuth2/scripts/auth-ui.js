// auth-ui.js
import { selectAuthType } from './login-handlers.js';
import { loadTemplate, loadTemplateSync } from './template-loader.js';

export function initializeStateManagement(getCurrentEnvironment, getEnvironments, setEnvironment, getDomain, getClientId, getType) {
    // Create environment selector
    const stateSelector = document.createElement('div');
    stateSelector.className = 'environment-selector';
    let currentEnv = getCurrentEnvironment();
    
    // Create environment options HTML
    const envOptionsHtml = getEnvironments().map(env =>
        `<option value="${env}" ${env === currentEnv ? 'selected' : ''}>${env.toUpperCase()}</option>`
    ).join('');
    
    // Try to load template
    loadTemplate('environment-selector', { envOptions: envOptionsHtml })
        .then(html => {
            stateSelector.innerHTML = html;
        })
        .catch(err => {
            console.error('Error loading environment selector template:', err);
            stateSelector.innerHTML = `
                <label for="envSelector">Environment:</label>
                <select id="envSelector" onchange="window.handleEnvironmentChange(this.value)">
                    ${envOptionsHtml}
                </select>
            `;
        });

    // Insert before the first form
    const firstForm = document.querySelector('form');
    firstForm.parentNode.insertBefore(stateSelector, firstForm);

    // Trigger environment change to set initial values
    window.handleEnvironmentChange(currentEnv);
}

export function handleEnvironmentChange(newEnv, setEnvironment, getDomain, getClientId, getType, getCurrentEnvironment) {
    try {
        setEnvironment(newEnv);
        // Update form fields with new environment values
        document.querySelectorAll('[id$="oauthDomain"]').forEach(el =>
            el.value = getDomain());
        document.querySelectorAll('[id$="oauthClientId"]').forEach(el =>
            el.value = getClientId());
        let type = getType();
        selectAuthType(type);
    } catch (error) {
        console.error('Error changing environment:', error);
        if (getCurrentEnvironment) {
            document.getElementById('envSelector').value = getCurrentEnvironment();
        }
    }
}

export function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

export function displayUserDetails(user) {
    try {
        const contentJwt = document.getElementById('content-jwt');
        if (contentJwt) {
            contentJwt.textContent = JSON.stringify(user, null, 2);
            contentJwt.className = 'result-display json-result';
            contentJwt.style.textAlign = 'left';
            contentJwt.style.whiteSpace = 'pre';
        }
    } catch (error) {
        console.error('Error displaying user details:', error);
        showError('Failed to display user information');
    }
}
