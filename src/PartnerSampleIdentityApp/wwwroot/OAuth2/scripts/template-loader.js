// template-loader.js

/**
 * Loads an HTML template from the server and replaces template variables
 * @param {string} templateName - The name of the template file without extension
 * @param {Object} variables - Key-value pairs to replace in the template
 * @returns {Promise<string>} The processed template HTML
 */
export async function loadTemplate(templateName, variables = {}) {
    try {
        const response = await fetch(`/OAuth2/templates/${templateName}.html`);
        
        if (!response.ok) {
            console.error(`Failed to load template: ${templateName}`);
            return '';
        }
        
        let templateHtml = await response.text();
        
        // Replace template variables (format: {{variableName}})
        Object.keys(variables).forEach(key => {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            templateHtml = templateHtml.replace(placeholder, variables[key]);
        });
        
        return templateHtml;
    } catch (error) {
        console.error(`Error loading template ${templateName}:`, error);
        return '';
    }
}

/**
 * Synchronously loads a template (for non-async contexts)
 * @param {string} templateName - The name of the template file without extension
 * @param {Object} variables - Key-value pairs to replace in the template
 * @returns {string} The processed template HTML or empty string on failure
 */
export function loadTemplateSync(templateName, variables = {}) {
    let templateHtml = '';
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                templateHtml = xhr.responseText;
                
                // Replace template variables
                Object.keys(variables).forEach(key => {
                    const placeholder = new RegExp(`{{${key}}}`, 'g');
                    templateHtml = templateHtml.replace(placeholder, variables[key]);
                });
            } else {
                console.error(`Failed to load template: ${templateName}`);
            }
        }
    };
    
    // Use synchronous request (not ideal but needed for sync function)
    xhr.open('GET', `/OAuth2/templates/${templateName}.html`, false);
    xhr.send();
    
    return templateHtml;
}
