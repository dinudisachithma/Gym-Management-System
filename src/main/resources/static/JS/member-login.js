
function togglePw() {
    const pw = document.getElementById('password');
    const icon = document.querySelector('.pwtoggle');
    if (pw.type === 'password') {
        pw.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        pw.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    document.getElementById('emailError').style.display = 'none';
    document.getElementById('passwordError').style.display = 'none';
    document.getElementById('loginErrorBanner').style.display = 'none';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    let isValid = true;

    if (!email) {
        document.getElementById('emailError').textContent = 'Email is required';
        document.getElementById('emailError').style.display = 'block';
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('emailError').textContent = 'Invalid email';
        document.getElementById('emailError').style.display = 'block';
        isValid = false;
    }

    if (!password) {
        document.getElementById('passwordError').textContent = 'Password is required';
        document.getElementById('passwordError').style.display = 'block';
        isValid = false;
    }

    if (!isValid) return;

    const btn = this.querySelector('button[type="submit"]');



    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    btn.disabled = true;
    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
    })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (result) {
            if (result.ok && result.data.user) {
                var u = result.data.user;
                var sessionData = {
                    id: u.id,
                    email: u.email,
                    role: u.role || 'MEMBER',
                    name: u.name
                };
                
                // Save explicitly to role-specific storage to support concurrent multi-role browser sessions
                if (u.role === 'ADMIN') {
                    localStorage.setItem('adminUser', JSON.stringify(sessionData));
                    window.location.href = '/admin-dashboard';
                } else if (u.role === 'TRAINER') {
                    localStorage.setItem('trainerUser', JSON.stringify(sessionData));
                    window.location.href = '/trainer-dashboard';
                } else {
                    localStorage.setItem('memberUser', JSON.stringify(sessionData));
                    window.location.href = '/member-dashboard';
                }
            } else {
                // Login failed – show server error. Do NOT fall back to localStorage
                // (localStorage users have no `id`, which breaks edit/delete API calls)
                btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right:8px;"></i> Sign In';
                btn.disabled = false;
                document.getElementById('loginErrorText').textContent = result.data.error || 'Invalid email or password';
                document.getElementById('loginErrorBanner').style.display = 'flex';
            }
        })
        .catch(function () {
            btn.innerHTML = '<i class="fas fa-sign-in-alt" style="margin-right:8px;"></i> Sign In';
            btn.disabled = false;
            document.getElementById('loginErrorText').textContent = 'Server connection failed. Is the backend running?';
            document.getElementById('loginErrorBanner').style.display = 'flex';
        });
});