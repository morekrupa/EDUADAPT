function initTheme() {
    const savedTheme = localStorage.getItem('eduadapt_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeButtonText(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('eduadapt_theme', target);
    updateThemeButtonText(target);
}

function updateThemeButtonText(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
        btn.innerText = theme === 'dark' ? '☀️ LIGHT' : '🌙 DARK';
    }
}

document.addEventListener('DOMContentLoaded', initTheme);