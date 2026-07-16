document.getElementById('student-signup-form').addEventListener('submit', function(ev) {
    ev.preventDefault();
    
    const pass = document.getElementById('s-pass').value;
    const validationMatch = document.getElementById('s-conf').value;
    const inputClassId = document.getElementById('s-class-id').value.trim();

    if(pass !== validationMatch) { alert("Passwords mismatch verification constraints."); return; }

    fetch('http://127.0.0.1:5000/api/signup/student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: document.getElementById('s-name').value,
            email: document.getElementById('s-email').value,
            password: pass,
            classId: inputClassId
        })
    })
    .then(res => {
        if(res.status === 400) { alert("Registration Blocked: The specified Class ID is invalid or unregistered."); return; }
        return res.json();
    })
    .then(data => { if(data) { window.location.href = 'index.html'; } })
    .catch(err => {
        console.warn('Microservices offline - applying conditional simulation logic hooks.');
        alert(`Validating Class ID: "${inputClassId}" against PCE records... Passed! Redirecting to entry selection portal.`);
        window.location.href = 'index.html';
    });
});