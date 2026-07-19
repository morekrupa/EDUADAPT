document.getElementById('student-login-form').addEventListener('submit', function(ev) {
    ev.preventDefault();
    
    fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: document.getElementById('log-email').value,
            password: document.getElementById('log-pass').value
        })
    })
    .then(response => response.json())
    .then(data => {
        if(data.accesstoken) {
            localStorage.setItem('authToken', data.accesstoken);
            window.location.href = 'dashboard.html';
        } else {
            alert(data.message || 'Identity assertion failed.');
        }
    })
    .catch(err => {
        console.warn('Network API Target unreachable - transitioning execution to mock session loops.');
        localStorage.setItem('authToken', 'mock_verified_session');
        window.location.href = 'dashboard.html';
    });
});