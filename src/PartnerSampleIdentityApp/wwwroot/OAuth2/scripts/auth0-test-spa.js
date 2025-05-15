/**
 * Tests the connection to Auth0 for SPA applications
 * @param {string} domain - Auth0 domain
 * @param {string} clientId - Auth0 client ID
 * @returns {Promise<Object>} Test result
 */
async function testAuth0Connection(domain, clientId) {
    try {
        if (!domain || !clientId) {
            return {
                success: false,
                error: 'Missing configuration',
                message: 'Auth0 domain and client ID are required'
            };
        }

        // Verify domain format
        if (!domain.includes('.') || !domain.match(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
            return {
                success: false,
                error: 'Invalid domain',
                message: `The domain "${domain}" doesn't appear to be a valid Auth0 domain`
            };
        }

        // Test the connection by calling the .well-known configuration endpoint
        const wellKnownEndpoint = `https://${domain}/.well-known/openid-configuration`;
        
        try {
            const response = await fetch(wellKnownEndpoint);
            const data = await response.json();
            
            if (response.ok && data.issuer) {
                // We got a valid response from the .well-known endpoint, domain exists
                // Now check if the client ID is registered by trying to initiate an auth flow
                const authUrl = data.authorization_endpoint;
                const testUrl = new URL(authUrl);
                testUrl.searchParams.set('client_id', clientId);
                testUrl.searchParams.set('response_type', 'code');
                testUrl.searchParams.set('redirect_uri', window.location.origin);
                testUrl.searchParams.set('prompt', 'none');
                testUrl.searchParams.set('scope', 'openid');
                
                try {
                    const authResponse = await fetch(testUrl, {
                        method: 'HEAD'  // Just check if the URL is valid, don't actually initiate auth
                    });
                    
                    // If we get a 4xx error, the client ID is invalid
                    // If we get a redirect or success, the client ID is valid
                    if (authResponse.status >= 400 && authResponse.status < 500) {
                        return {
                            success: false,
                            error: 'Invalid client ID',
                            message: 'The client ID does not appear to be registered with this domain',
                            details: {
                                domain: domain,
                                issuer: data.issuer
                            }
                        };
                    }
                    
                    return {
                        success: true,
                        message: 'Connection to Auth0 successful. Domain and client ID are valid.',
                        details: {
                            domain: domain,
                            issuer: data.issuer,
                            authorizationEndpoint: data.authorization_endpoint,
                            tokenEndpoint: data.token_endpoint
                        }
                    };
                } catch (authError) {
                    // If we get here, assume the client ID is valid but there was a CORS error
                    return {
                        success: true,
                        message: 'Auth0 domain is valid. Unable to fully verify client ID due to CORS restrictions.',
                        details: {
                            domain: domain,
                            issuer: data.issuer
                        }
                    };
                }
            } else {
                return {
                    success: false,
                    error: 'Invalid domain',
                    message: 'The domain does not appear to be a valid Auth0 domain'
                };
            }
        } catch (fetchError) {
            // Handle network errors
            return {
                success: false,
                error: 'Network error',
                message: `Could not connect to Auth0 domain "${domain}". Check that the domain is correct and your internet connection is working.`,
                details: {
                    error: fetchError.message
                }
            };
        }
    } catch (error) {
        return {
            success: false,
            error: 'Test failed',
            message: error.message || 'An unknown error occurred while testing the connection'
        };
    }
}

export { testAuth0Connection };
