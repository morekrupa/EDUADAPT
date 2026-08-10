document.addEventListener('DOMContentLoaded', () => {
    if (!checkRoleAccess('student_dashboard')) return;
    const user = JSON.parse(localStorage.getItem('eduadapt_current_user') || '{}');
    document.getElementById('welcome-msg').innerText = `WELCOME HERO: ${user.name || 'STUDENT'}!`;
    document.getElementById('class-tag').innerText = `ASSIGNED TRACK: ${user.className || 'CLASS 10'}`;
});

function logout() {
    localStorage.removeItem('eduadapt_current_user');
    window.location.href = 'index.html';
}