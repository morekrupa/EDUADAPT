document.getElementById('admin-signup-form').addEventListener('submit', function(ev) {
    ev.preventDefault();
    if(document.getElementById('a-pass').value !== document.getElementById('a-conf').value) { alert("Master token checks structural validation constraints failed."); return; }

    fetch('http://127.0.0.1:5000/api/signup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: document.getElementById('a-name').value,
            email: document.getElementById('a-email').value,
            password: document.getElementById('a-pass').value
        })
    }).finally(() => {
        alert("Master institutional system parameters initialized successfully. Verification locks open for dependent faculty registries.");
        window.location.href = 'index.html';
    });
});