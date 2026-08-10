function handleStudentLogin(e) {
    if (e) e.preventDefault();
    let studentData = JSON.parse(localStorage.getItem('eduadapt_student_data') || 'null');
    if (!studentData) {
        studentData = { name: "Ritika Joshi", className: "Class 12", email: "student@student.mes.ac.in", role: "student", xp: 1850 };
        localStorage.setItem('eduadapt_student_data', JSON.stringify(studentData));
    }
    localStorage.setItem('eduadapt_current_user', JSON.stringify(studentData));
    window.location.href = 'dashboard.html';
}

function handleGoogleLogin() {
    handleStudentLogin(null);
}