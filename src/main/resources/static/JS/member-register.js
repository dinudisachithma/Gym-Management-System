function togglePw(id) {
    const pw = document.getElementById(id);
    const wrap = pw.closest('.input-wrap');
    const icon = wrap.querySelector('.pwtoggle');
    if (pw.type === 'password') {
        pw.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        pw.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

document.getElementById('password').addEventListener('input', function () {
    const p = this.value;
    let s = 0;
    if (p.length >= 6) s += 25;
    if (/[a-z]/.test(p)) s += 20;
    if (/[A-Z]/.test(p)) s += 25;
    if (/\d/.test(p)) s += 15;
    if (/[^A-Za-z0-9]/.test(p)) s += 15;
    const txt = s < 35 ? '🔴 Weak' : s < 60 ? '🟠 Fair' : s < 85 ? '🟡 Good' : '🟢 Strong';
    const el = document.getElementById('pwStrength');
    el.textContent = p ? txt : '';
    el.style.color = s < 35 ? '#f87171' : s < 60 ? '#fb923c' : s < 85 ? '#facc15' : '#4ade80';
});

function showErr(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = 'block';
}

function clearErrs() {
    document.querySelectorAll('.error-message').forEach(e => {
        e.style.display = 'none';
        e.textContent = '';
    });
}

function setupLiveValidations() {
    const fields = [
        { id: 'fullName', errId: 'fullNameError', validate: v => v && v.trim().length >= 2, errMsg: 'Name required (min 2 chars)' },
        { id: 'email', errId: 'emailError', validate: v => v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), errMsg: 'Valid email required' },
        { id: 'age', errId: 'ageError', validate: v => v && parseInt(v) >= 18, errMsg: 'Must be 18 or older' },
        { id: 'city', errId: 'cityError', validate: v => v && v.trim().length >= 2, errMsg: 'Valid city required' },
        { id: 'phone', errId: 'phoneError', validate: v => v && /^\d{10}$/.test(v.trim()), errMsg: '10-digit phone number required' },
        { id: 'address', errId: 'addressError', validate: v => v && v.trim().length >= 5, errMsg: 'Valid address required' }
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) {
            el.addEventListener('input', () => {
                const val = el.value;
                if (!val) {
                    el.style.borderColor = 'rgba(255,255,255,0.1)';
                    document.getElementById(f.errId).style.display = 'none';
                } else if (f.validate(val)) {
                    el.style.borderColor = '#10b981'; // Green
                    document.getElementById(f.errId).style.display = 'none';
                } else {
                    el.style.borderColor = '#ef4444'; // Red
                    showErr(f.errId, f.errMsg);
                }
            });
        }
    });

    const pw = document.getElementById('password');
    const cpw = document.getElementById('confirmPassword');
    
    if (pw) {
        pw.addEventListener('input', () => {
            const v = pw.value;
            if (!v) {
                pw.style.borderColor = 'rgba(255,255,255,0.1)';
                document.getElementById('passwordError').style.display = 'none';
                return;
            }
            if (v.length < 6 || !/[A-Z]/.test(v)) {
                pw.style.borderColor = '#ef4444';
                showErr('passwordError', v.length < 6 ? 'Password must be at least 6 characters' : 'Must contain at least one uppercase letter');
            } else {
                pw.style.borderColor = '#10b981';
                document.getElementById('passwordError').style.display = 'none';
            }
            if (cpw && cpw.value) cpw.dispatchEvent(new Event('input'));
        });
    }

    if (cpw) {
        cpw.addEventListener('input', () => {
            const v = cpw.value;
            if (!v) {
                cpw.style.borderColor = 'rgba(255,255,255,0.1)';
                document.getElementById('confirmPasswordError').style.display = 'none';
                return;
            }
            if (v !== pw.value) {
                cpw.style.borderColor = '#ef4444';
                showErr('confirmPasswordError', 'Passwords must match');
            } else {
                cpw.style.borderColor = '#10b981';
                document.getElementById('confirmPasswordError').style.display = 'none';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', setupLiveValidations);


document.getElementById('registerForm').addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrs();

    const d = {
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        gender: document.getElementById('gender').value,
        age: document.getElementById('age').value,
        city: document.getElementById('city').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value
    };

    let ok = true;
    
    // We update the border colors for any empty/invalid fields when they submit without typing
    function markErr(inputID, errID, msg) {
        showErr(errID, msg);
        document.getElementById(inputID).style.borderColor = '#ef4444';
        ok = false;
    }

    if (!d.fullName || d.fullName.length < 2) { markErr('fullName', 'fullNameError', 'Name required (min 2 chars)'); }
    if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { markErr('email', 'emailError', 'Valid email required'); }
    if (!d.gender) { markErr('gender', 'genderError', 'Select gender'); }
    if (!d.age || d.age < 18) { markErr('age', 'ageError', 'Must be 18 or older'); }
    if (!d.city || d.city.length < 2) { markErr('city', 'cityError', 'Valid city'); }
    if (!d.phone || !/^\d{10}$/.test(d.phone)) { markErr('phone', 'phoneError', '10-digit phone number required'); }
    if (!d.address || d.address.length < 5) { markErr('address', 'addressError', 'Valid address'); }
    if (!d.password || d.password.length < 6) { markErr('password', 'passwordError', 'Password must be at least 6 characters'); }
    else if (!/[A-Z]/.test(d.password)) { markErr('password', 'passwordError', 'Password must contain at least one uppercase letter'); }
    if (d.password !== d.confirmPassword) { markErr('confirmPassword', 'confirmPasswordError', 'Passwords must match'); }

    if (!ok) return;

    const payload = {
        fullName: d.fullName,
        email: d.email,
        gender: d.gender,
        age: parseInt(d.age, 10),
        city: d.city,
        phone: d.phone,
        address: d.address,
        password: d.password
    };

    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (result) {
            if (result.ok && result.data.user) {
                var u = result.data.user;
                localStorage.setItem('memberUser', JSON.stringify({
                    id: u.id,
                    email: u.email,
                    role: 'MEMBER',
                    name: u.name
                }));
                var members = JSON.parse(localStorage.getItem('registeredMembers') || '[]');
                members.push({
                    fullName: u.name,
                    email: u.email,
                    gender: u.gender,
                    age: u.age,
                    city: u.city,
                    phone: u.phone,
                    address: u.address || '',
                    status: u.packageStatus || 'PENDING',
                    membership: u.membershipPackage || null
                });
                localStorage.setItem('registeredMembers', JSON.stringify(members));
                
                showUIAlert('✅ Account Created', 'Your account has been created successfully and is currently <b>pending activation</b>. You will be redirected to the login page.', true);
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1000);
            } else {
                showUIAlert('Error', result.data.error || 'Registration failed', false);
            }
        })
        .catch(function () {
            showUIAlert('Error', 'Registration failed. Is the backend running?', false);
        });
});