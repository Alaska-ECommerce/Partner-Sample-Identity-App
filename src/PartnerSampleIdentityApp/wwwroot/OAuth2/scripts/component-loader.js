/**
 * Component loader utility
 * Dynamically loads HTML components into specified containers
 */
export async function loadComponent(containerSelector, componentPath) {
    try {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error(`Container not found: ${containerSelector}`);
            return;
        }

        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Failed to load component: ${response.statusText}`);
        }

        const html = await response.text();
        container.innerHTML = html;

        return container;
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
        return null;
    }
}

/**
 * Loads multiple components at once
 * @param {Array} components - Array of objects with containerSelector and componentPath
 * @returns {Promise<Array>} - Array of loaded containers
 */
export async function loadComponents(components) {
    const promises = components.map(comp =>
        loadComponent(comp.containerSelector, comp.componentPath)
    );
    return Promise.all(promises);
}