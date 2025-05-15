/**
 * Tests the connection to Auth0 to validate configuration
 * @param {string} domain - Auth0 domain
 * @param {string} clientId - Auth0 client ID
 * @param {string} clientSecret - Auth0 client secret
 * @returns {Promise<Object>} Test result
 */
async function testAuth0Connection(domain, clientId, clientSecret) {
    try {
        if (!domain || !clientId || !clientSecret) {
            return {
                success: false,
                error: 'Missing configuration',
                message: 'Auth0 domain, client ID and client secret are all required'
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

        // Test the connection by making a call to the Auth0 tenant info endpoint
        const url = `https://${domain}/api/v2/tenants/settings`;
        
        try {
            // First try to get a management token
            const tokenUrl = `https://${domain}/oauth/token`;
            const tokenResponse = await fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: clientId,
                    client_secret: clientSecret,
                    audience: `https://${domain}/api/v2/`,
                    grant_type: 'client_credentials'
                })
            });
            
            const tokenData = await tokenResponse.json();
            
            if (tokenResponse.ok && tokenData.access_token) {
                // We got a token, which confirms the client ID and secret are valid
                return {
                    success: true,
                    message: 'Connection to Auth0 successful. Client ID and secret are valid.',
                    details: {
                        domain: domain,
                        clientId: clientId,
                        tokenType: tokenData.token_type,
                        expiresIn: tokenData.expires_in
                    }
                };
            } else {
                // There was an error, but the server responded, so the domain is valid
                return {
                    success: false,
                    error: tokenData.error || 'Invalid credentials',
                    message: tokenData.error_description || 'Client ID or secret may be incorrect, but domain is valid',
                    details: {
                        domain: domain,
                        status: tokenResponse.status,
                        errorCode: tokenData.error
                    }
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
