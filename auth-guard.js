/**
 * EduAdapt - Flexible Role Guardrails
 */
function checkRoleAccess(requiredRole) {
    const currentUser = JSON.parse(localStorage.getItem('eduadapt_current_user') || '{}');

    // Only protect the main student application dashboard routes
    if (requiredRole === 'student_dashboard' && currentUser.role !== 'student') {
        alert("ACCESS DENIED: Please login as a Student first.");
        window.location.href = 'login-student.html';
        return false;
    }

    return true;
}