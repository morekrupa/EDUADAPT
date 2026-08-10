function handleAdminSignup(e) {
    e.preventDefault();
    localStorage.setItem('eduadapt_admin_seeded', 'true');
    alert("SUCCESS: Admin initialized! Teacher registrations are now unlocked.");
    window.location.href = 'login-admin.html';
}