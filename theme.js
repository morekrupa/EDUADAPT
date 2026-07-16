// Automatically fires on script assessment to prevent flashing layout colors across downstream pages
(function seedThemeInstance() {
    const activeSelection = localStorage.getItem('eduadapt_theme') || 'light';
    document.documentElement.setAttribute('data-theme', activeSelection);
})();

function toggleTheme() {
    const baseNode = document.documentElement;
    const currentInstance = baseNode.getAttribute('data-theme');
    const targetState = currentInstance === 'dark' ? 'light' : 'dark';
    
    baseNode.setAttribute('data-theme', targetState);
    localStorage.setItem('eduadapt_theme', targetState);
    renderLabelState(targetState);
}

function renderLabelState(state) {
    // Finds the button on the active page and flips the visual label state
    const interactiveTarget = document.getElementById('theme-toggle-btn');
    if (interactiveTarget) {
        interactiveTarget.innerText = state === 'dark' ? '☀️ Light' : '🌙 Dark';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    renderLabelState(document.documentElement.getAttribute('data-theme') || 'light');
});