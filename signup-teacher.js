document.addEventListener('DOMContentLoaded', () => checkRoleAccess('teacher'));

function handleTeacherSignup(e) {
    if (e) e.preventDefault();
    
    // Save teacher state to unlock dependent flows if needed
    localStorage.setItem('eduadapt_teacher_seeded', 'true');
    alert("SUCCESS: Faculty profile registered! Redirecting to Teacher Login.");
    window.location.href = 'login-teacher.html';
}

function handleTeacherGoogleSignup() {
    localStorage.setItem('eduadapt_teacher_seeded', 'true');
    alert("SUCCESS: Authenticated via Google! Teacher account created.");
    window.location.href = 'login-teacher.html';
}