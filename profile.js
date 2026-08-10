document.addEventListener('DOMContentLoaded', () => {
    if (!checkRoleAccess('student_dashboard')) return;
    const user = JSON.parse(localStorage.getItem('eduadapt_current_user') || '{}');
    document.getElementById('p-name').value = user.name || '';
    document.getElementById('p-class').value = user.className || 'Class 10';
    document.getElementById('p-email').value = user.email || '';
});

function saveProfile(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('eduadapt_current_user') || '{}');
    user.name = document.getElementById('p-name').value;
    user.className = document.getElementById('p-class').value;
    
    localStorage.setItem('eduadapt_current_user', JSON.stringify(user));
    alert("SUCCESS: Profile updated!");
}