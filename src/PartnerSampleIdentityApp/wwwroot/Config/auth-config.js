// auth-config.js

const AUTH_CONFIG = {
    prod: {
        domain: "auth0.alaskaair.com",
        clientId: "YdmrhDsA5Q4yQwWUE9oIn5DAFKQajVF2"
    },
    qa: {
        domain: "auth0-qa.alaskaair.com",
        clientId: "lWDO5HbEAi4ghqg4xK4Q5dOoSRwuYkUC"
    },
    test: {
        domain: "auth0-test.alaskaair.com",
        clientId: "MvnAHImPPNtD4aB5dYRLFnSMQKzkdhFl"
    }
};

let currentEnv = 'test';

const getEnvironments = () => Object.keys(AUTH_CONFIG);

const getCurrentConfig = () => AUTH_CONFIG[currentEnv];

const getCurrentEnvironment = () => currentEnv;

const setEnvironment = (env) => {
    if (AUTH_CONFIG[env]) {
        currentEnv = env;
        return getCurrentConfig();
    }
    throw new Error(`Invalid environment: ${env}`);
};

const getClientId = () => getCurrentConfig().clientId;

const getDomain = () => getCurrentConfig().domain;

const getActionUrl = (type = 'oauth') => {
    const domain = getDomain();
    const clientId = getClientId();

    if (type === 'saml') {
        return `https://${domain}/samlp/${clientId}`;
    }
    return `https://${domain}`;
};

export {
    AUTH_CONFIG,
    getCurrentConfig,
    getCurrentEnvironment,
    setEnvironment,
    getClientId,
    getDomain,
    getActionUrl,
    getEnvironments
};