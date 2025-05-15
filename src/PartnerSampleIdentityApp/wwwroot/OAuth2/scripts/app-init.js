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

        // Add direct event listener for credentials login button as a failsafe
        const credentialsLoginButton = document.getElementById('credentialsLoginButton');
        if (credentialsLoginButton) {
            console.log('Setting up direct event handler for credentialsLoginButton');
            credentialsLoginButton.addEventListener('click', async function() {
                console.log('Direct credentials login button handler triggered');
                
                // Try multiple approaches to call the login function
                if (typeof window.credentialsLogin === 'function') {
                    console.log('Using window.credentialsLogin from direct handler');
                    window.credentialsLogin();
                    return;
                }
                
                // If window function not available, try importing directly
                try {
                    // Use dynamic import with error handling
                    const loginHandlersModule = await import('./login-handlers.js').catch(err => {
                        console.error('Failed to import login-handlers.js:', err);
                        return null;
                    });
                    
                    if (loginHandlersModule && typeof loginHandlersModule.credentialsLogin === 'function') {
                        console.log('Calling credentialsLogin directly from imported module');
                        loginHandlersModule.credentialsLogin();
                    } else {
                        console.error('credentialsLogin not found in module');
                        
                        // Final fallback: try to get the function from the auth0FunctionsLoaded event
                        document.addEventListener('auth0FunctionsLoaded', function(event) {
                            if (event.detail && typeof event.detail.credentialsLogin === 'function') {
                                console.log('Using credentialsLogin from auth0FunctionsLoaded event');
                                event.detail.credentialsLogin();
                            }
                        }, { once: true });
                    }
                } catch (error) {
                    console.error('Error in credential login handler:', error);
                }
            });
        } else {
            console.warn('Credentials login button not found in DOM yet');
        }

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