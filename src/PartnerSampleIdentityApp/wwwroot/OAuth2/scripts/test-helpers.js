// Test credentials helper for development
// You can use this to pre-fill credentials for testing

// Set this to true to enable test mode
const USE_TEST_CREDENTIALS = false;

// Configure your test credentials here
const TEST_CREDENTIALS = {
    domain: '', // e.g., 'your-tenant.auth0.com'
    clientId: '', // Your Auth0 client ID
    clientSecret: '', // Your Auth0 client secret
    username: '', // Test username
    password: '' // Test password
};

// Function to load test credentials into form fields
function loadTestCredentials() {
    if (USE_TEST_CREDENTIALS) {
        console.log('Loading test credentials...');
        
        // Fill domain and client ID
        if (TEST_CREDENTIALS.domain) {
            const domainField = document.getElementById('oauthDomain');
            if (domainField) domainField.value = TEST_CREDENTIALS.domain;
        }
        
        if (TEST_CREDENTIALS.clientId) {
            const clientIdField = document.getElementById('oauthClientId');
            if (clientIdField) clientIdField.value = TEST_CREDENTIALS.clientId;
        }
        
        // Fill credentials
        if (TEST_CREDENTIALS.username) {
            const usernameField = document.getElementById('username');
            if (usernameField) usernameField.value = TEST_CREDENTIALS.username;
        }
        
        if (TEST_CREDENTIALS.password) {
            const passwordField = document.getElementById('password');
            if (passwordField) passwordField.value = TEST_CREDENTIALS.password;
        }
        
        if (TEST_CREDENTIALS.clientSecret) {
            const clientSecretField = document.getElementById('clientSecret');
            if (clientSecretField) clientSecretField.value = TEST_CREDENTIALS.clientSecret;
        }
    }
}

export { loadTestCredentials };
