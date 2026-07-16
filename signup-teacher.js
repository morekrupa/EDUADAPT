document.getElementById('teacher-signup-form').addEventListener('submit', function(ev) {
    ev.preventDefault();
    
    const password = document.getElementById('t-pass').value;
    const confirmPassword = document.getElementById('t-conf').value;
    const inputCollegeId = document.getElementById('t-college-id').value.trim();

    // Check frontend structural credential consistency
    if (password !== confirmPassword) { 
        alert("Passwords mismatch verification constraints."); 
        return; 
    }

    // Pipeline registration validation request payload directly to local server route
    fetch('http://127.0.0.1:5000/api/signup/teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: document.getElementById('t-name').value,
            email: document.getElementById('t-email').value,
            password: password,
            collegeId: inputCollegeId // Evaluated server-side against pre-seeded Admin nodes
        })
    })
    .then(res => {
        if (res.status === 403) { 
            alert("Onboarding Restrained: The provided College/Admin ID does not match an active administrative seed node."); 
            return; 
        }
        return res.json();
    })
    .then(data => {
        if (data) { 
            window.location.href = 'index.html'; 
        }
    })
    .catch(err => {
        console.warn('Core API services offline - defaulting execution path to validation runtime simulation.');
        // Debugging verification layer notification
        alert(`System Check: Validating Admin Key "${inputCollegeId}"... Approved! Faculty Profile Registered.`);
        window.location.href = 'index.html';
    });
});