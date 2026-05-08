// Change Password – full validation, eye-toggle & live strength meter
(function() {
    /* ── Auth ── */
    function getCurrentUser() {
        let u;
        try { u = JSON.parse(localStorage.getItem('memberUser')); } catch (e) {}
        if (!u || u.role !== 'MEMBER') {
            window.location.href = '/login';
            return null;
        }
        return u;
    }

    var currentUser = getCurrentUser();
    if (!currentUser) return;

    /* ── Eye-toggle helper ── */
    window.togglePwField = function(fieldId, icon) {
        var input = document.getElementById(fieldId);
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
        }
    };

    /* ── Live strength meter for new password ── */
    document.getElementById('newPassword').addEventListener('input', function() {
        var p = this.value;
        var s = 0;
        if (p.length >= 6)            s += 25;
        if (/[a-z]/.test(p))          s += 20;
        if (/[A-Z]/.test(p))          s += 25;
        if (/\d/.test(p))             s += 15;
        if (/[^A-Za-z0-9]/.test(p))   s += 15;
        var txt  = s < 35 ? '🔴 Weak' : s < 60 ? '🟠 Fair' : s < 85 ? '🟡 Good' : '🟢 Strong';
        var col  = s < 35 ? '#f87171' : s < 60 ? '#fb923c' : s < 85 ? '#facc15' : '#4ade80';
        var el = document.getElementById('pwStrength');
        if (el) { el.textContent = p ? txt : ''; el.style.color = col; }
    });

    /* ── Error helpers ── */
    function showError(id, msg) {
        var el = document.getElementById(id);
        if (el) { el.textContent = msg; el.style.display = 'block'; }
    }
    function clearErrors() {
        document.querySelectorAll('.error-message').forEach(function(el) {
            el.style.display = 'none';
            el.textContent = '';
        });
    }

    /* ── Submit ── */
    document.getElementById('changePasswordForm').addEventListener('submit', function(e) {
        e.preventDefault();
        clearErrors();

        var currentPassword = document.getElementById('currentPassword').value;
        var newPassword     = document.getElementById('newPassword').value;
        var confirmPassword = document.getElementById('confirmPassword').value;
        var valid = true;

        // Current password – just check it's not empty
        if (!currentPassword) {
            showError('currentPasswordError', 'Current password is required');
            valid = false;
        }

        // New password – 6 chars minimum + at least one uppercase letter
        if (!newPassword) {
            showError('newPasswordError', 'New password is required');
            valid = false;
        } else if (newPassword.length < 6) {
            showError('newPasswordError', 'Password must be at least 6 characters');
            valid = false;
        } else if (!/[A-Z]/.test(newPassword)) {
            showError('newPasswordError', 'Password must contain at least one uppercase letter');
            valid = false;
        }

        // Confirm match
        if (valid && newPassword !== confirmPassword) {
            showError('confirmPasswordError', 'Passwords do not match');
            valid = false;
        }

        if (!valid) return;

        fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: currentUser.id,
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        })
        .then(function(r) {
            return r.json().then(function(d) { return { ok: r.ok, data: d }; });
        })
        .then(function(result) {
            if (result.ok) {
                showUIAlert('Success', 'Password changed successfully!', true, function() {
                    window.location.href = '/member-dashboard';
                });
            } else {
                showError('currentPasswordError', result.data.error || 'Failed to change password. Check your current password.');
            }
        })
        .catch(function() {
            showError('currentPasswordError', 'Request failed. Is the backend running?');
        });
    });

    window.goBack = function() { window.location.href = '/member-dashboard'; };

    window.logout = function() {
        showUIConfirm('Logout', 'Are you sure you want to logout?', false, function(confirmed) {
            if (confirmed) {
                localStorage.removeItem('memberUser');
                window.location.href = '/login';
            }
        });
    };

    /* ── Live keystroke bindings ── */
    function attachLiveValidations() {
        var curr = document.getElementById('currentPassword');
        var neu = document.getElementById('newPassword');
        var conf = document.getElementById('confirmPassword');

        if (curr) {
            curr.addEventListener('input', function() {
                var v = this.value;
                var err = document.getElementById('currentPasswordError');
                if (!v) { 
                    this.parentElement.style.borderColor = '#ef4444'; 
                    if(err){ err.textContent = 'Current password is required'; err.style.display = 'block'; } 
                } else { 
                    this.parentElement.style.borderColor = '#10b981'; 
                    if(err) err.style.display = 'none'; 
                }
            });
        }
        
        if (neu) {
            neu.addEventListener('input', function() {
                var v = this.value;
                var err = document.getElementById('newPasswordError');
                if (!v) {
                    this.parentElement.style.borderColor = 'rgba(255,255,255,0.14)';
                    if(err) err.style.display = 'none';
                } else if (v.length < 6 || !/[A-Z]/.test(v)) {
                    this.parentElement.style.borderColor = '#ef4444';
                    if(err){ err.textContent = v.length < 6 ? 'Password must be at least 6 characters' : 'Password must contain at least one uppercase letter'; err.style.display = 'block'; }
                } else {
                    this.parentElement.style.borderColor = '#10b981';
                    if(err) err.style.display = 'none';
                }
                if (conf && conf.value) conf.dispatchEvent(new Event('input'));
            });
        }

        if (conf) {
            conf.addEventListener('input', function() {
                var v = this.value;
                var err = document.getElementById('confirmPasswordError');
                if (!v) {
                    this.parentElement.style.borderColor = 'rgba(255,255,255,0.14)';
                    if(err) err.style.display = 'none';
                } else if (v !== neu.value) {
                    this.parentElement.style.borderColor = '#ef4444';
                    if(err){ err.textContent = 'Passwords do not match.'; err.style.display = 'block'; }
                } else {
                    this.parentElement.style.borderColor = '#10b981';
                    if(err) err.style.display = 'none';
                }
            });
        }
    }
    
    document.addEventListener('DOMContentLoaded', attachLiveValidations);
})();
