# HTML Templates System Documentation

This document explains how the HTML templates system works in the Partner Sample Identity App project. The system extracts HTML from JavaScript files into separate template files for better maintainability and separation of concerns.

## Overview

HTML templates are stored in the `/OAuth2/templates/` directory and loaded dynamically using the `template-loader.js` utility. This approach improves code organization, making it easier to update the UI without changing the core application logic.

## Template Files Structure

Templates are stored in the following directory:
```
/wwwroot/OAuth2/templates/
```

Each template is an HTML fragment file with a `.html` extension.

## How Templates Work

1. The application uses the `loadTemplate` or `loadTemplateSync` functions from `template-loader.js`
2. Template variables can be included in templates using the `{{variableName}}` syntax
3. The loader replaces these variables with actual values provided when the template is loaded
4. If template loading fails, fallback inline HTML is used to ensure the application continues to function

## Available Templates

| Template Name | Description |
|---------------|-------------|
| auth-error.html | Generic authentication error display |
| auth-error-help.html | Help content for authentication errors |
| config-error.html | Configuration error display |
| connection-error.html | Auth0 connection test failure |
| connection-error-help.html | Help for Auth0 connection issues |
| connection-success.html | Auth0 connection test success |
| credentials-auth-result.html | Authentication result container |
| credentials-cleared.html | Message shown after credentials clearing |
| environment-selector.html | Environment dropdown selector UI |
| grant-type-help.html | Help for grant-type related errors |
| loading.html | Loading spinner and message |
| login-required-help.html | Help for login required errors |
| no-auth-yet.html | Default message when no authentication is performed |
| silent-auth-error.html | Silent authentication error |
| silent-auth-failed.html | Silent authentication failure |
| silent-auth-success.html | Silent authentication success |
| testing-connection.html | Testing connection display |
| token-troubleshooting.html | Help for token-related issues |
| validation-error.html | Form validation error |

## Using Templates

To use templates in JavaScript code:

```javascript
// Import the template loader
import { loadTemplate, loadTemplateSync } from './template-loader.js';

// Async loading with variables
loadTemplate('template-name', { variable1: 'value1', variable2: 'value2' })
    .then(html => {
        document.getElementById('container').innerHTML = html;
    })
    .catch(err => {
        console.error('Error loading template:', err);
        // Fallback to inline HTML if needed
    });

// Synchronous loading (less preferred, but available)
const html = loadTemplateSync('template-name', { variable1: 'value1' });
document.getElementById('container').innerHTML = html;
```

## Error Handling

The template system includes built-in error handling. If a template fails to load:
1. The error is logged to the console
2. Code can provide fallback inline HTML
3. The application continues to function without disruption

## Testing Templates

A test page is available at `/OAuth2/template-test.html` that demonstrates loading various templates and allows for manual testing of the template system.
