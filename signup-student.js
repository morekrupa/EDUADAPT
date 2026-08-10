document.addEventListener('DOMContentLoaded', () => checkRoleAccess('student'));

function handleStudentSignup(e) {
    if (e) e.preventDefault();
    
    const studentData = {
        name: document.getElementById('s-name').value || "Ritika Joshi",
        className: document.getElementById('s-class').value || "Class 12",
        email: document.getElementById('s-email').value || "student@student.mes.ac.in",
        role: 'student',
        xp: 100
    };
    
    localStorage.setItem('eduadapt_student_data', JSON.stringify(studentData));
    alert("SUCCESS: Account registered! Please sign in with your credentials.");
    window.location.href = 'login-student.html';
}

function handleStudentGoogleSignup() {
    const studentData = {
        name: "Ritika Joshi (Google)",
        className: "Class 12",
        email: "student.google@student.mes.ac.in",
        role: 'student',
        xp: 100
    };
    
    localStorage.setItem('eduadapt_student_data', JSON.stringify(studentData));
    localStorage.setItem('eduadapt_current_user', JSON.stringify(studentData));
    alert("SUCCESS: Google Account Linked! Jump into the Hero Arena.");
    window.location.href = 'dashboard.html';
}