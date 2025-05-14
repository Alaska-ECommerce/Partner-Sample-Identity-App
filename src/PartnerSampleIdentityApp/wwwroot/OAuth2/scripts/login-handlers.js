// login-handlers.js
import { showError } from './auth-ui.js';
import { getClients, updateClients } from './auth-client.js';

export async function login() {
    // get type from local storage
    const type = localStorage.getItem('selectedAuthType');

switch (type)
{
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

export async function logout() {
    const type = localStorage.getItem('selectedAuthType');
const domain = document.getElementById('oauthDomain').value;
const returnTo = window.location.origin + window.location.pathname;
const { spaClient, webClient } = getClients();

try
{
    if (type === 'spa' && spaClient)
    {
        await spaClient.logout({
        logoutParams:
            {
                returnTo,
                    client_id: document.getElementById('oauthClientId').value
                }
        });
    }
    else if (type === 'regular' && webClient)
    {
        // Use Auth0's v2 logout endpoint directly
        window.location.href = `https://${domain}/v2/logout?client_id=${document.getElementById('oauthClientId').value}&returnTo=${encodeURIComponent(returnTo)}`;
        }
}
catch (error)
{
    console.error('Logout error:', error);
    showError('Failed to logout. Please try again.');
}
}

export async function loginToAlaskaAir() {
    // get type from local storage
    const type = localStorage.getItem('selectedAuthType');

// Implement your Alaska Air specific login logic here
console.log(`Initiating Alaska Air login for ${ type}`);
    // This is a placeholder - implement actual logic based on your requirements
}

export async function selectAuthType(type) {
    // Store the selected auth type
    localStorage.setItem('selectedAuthType', type);

// Update the selector
const selector = document.getElementById('authTypeSelector');
if (selector)
{
    selector.value = type;
}
}
