import { loadComponents } from './component-loader.js';
import { setEventListeners } from './event-handlers.js';
import { loadTestCredentials } from './test-helpers.js';

// Define all components to load
const components = [
    {
        containerSelector: '#user-info-container',
        componentPath: '/OAuth2/components/user-info.html'
    },
    {
        containerSelector: '#auth-config-container',
        componentPath: '/OAuth2/components/auth-config.html'
    },
    {
        containerSelector: '#alaska-air-container',
        componentPath: '/OAuth2/components/alaska-air-login.html'
    },
    {
        containerSelector: '#credentials-auth-container',
        componentPath: '/OAuth2/components/credentials-auth.html'
    },
    {
        containerSelector: '#silent-auth-container',
        componentPath: '/OAuth2/components/silent-auth.html'
    }
];

// When DOM is loaded, initialize the app
document.addEventListener('DOMContentLoaded', async function () {
    try {
        console.log('Loading Auth0 components...');

        // Load all components
        await loadComponents(components);

        console.log('Components loaded successfully');

        // Initialize event listeners once all components are loaded
        setEventListeners();
        
        // Load test credentials if enabled (for development only)
        loadTestCredentials();

        // The direct event listener for the credentials login button has been removed
        // to prevent duplicate login attempts, as it's already handled in event-handlers.js

        // Dispatch custom event so other scripts know components are ready
        document.dispatchEvent(new CustomEvent('componentsLoaded'));

    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.getElementById('error-message').innerHTML = `
            <div class="error-message">
                <h4>Application Error</h4>
                <p>Failed to initialize the application: ${error.message}</p>
            </div>
        `;
    }
});