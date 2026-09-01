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
        if(data.accessToken) {
            localStorage.setItem('authToken', data.accessToken);
            localStorage.setItem('userId', data.userId);
            window.location.href = 'dashboard.html';
        } else {
            alert(data.error || 'Login failed.');
        }
    })
    .catch(err => {
        console.error('Login request failed:', err);
        alert('Server unreachable. Please try again.');
    });
});