// Global State
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    // Safely parse localStorage
    try {
        const userStr = localStorage.getItem('trainerUser');
        if (userStr) currentUser = JSON.parse(userStr);
    } catch (e) {}
    
    // Strict login enforcing (Redirect removed as requested)
    if (!currentUser || currentUser.role !== 'TRAINER') {
        console.warn("No active trainer session found. The dashboard remain empty as requested.");
        return;
    }
    
    document.getElementById('heroName').textContent = currentUser.name || "Trainer";
    
    // Close modals on outside click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('open');
            }
        });
    });
    
    loadProfile();
    loadSchedule();
});

function logout() {
    localStorage.removeItem('trainerUser');
    window.location.href = '/login';
}

async function loadProfile() {
    try {
        const res = await fetch('/api/trainers/' + currentUser.id);
        if (!res.ok) throw new Error("Failed to fetch profile");
        
        const profile = await res.json();
        
        document.getElementById('profName').textContent = profile.name;
        document.getElementById('profEmail').textContent = profile.email;
        document.getElementById('profAge').textContent = profile.age || '-';
        document.getElementById('profPhone').textContent = profile.phone || '-';
        document.getElementById('profCity').textContent = profile.city || '-';
        document.getElementById('profAddress').textContent = profile.address || '-';
        
        document.getElementById('profSpecialization').innerHTML = 
            profile.specialization ? `<span style="background:rgba(16,185,129,0.1);color:#10b981;padding:4px 10px;border-radius:12px;font-size:0.85rem">${profile.specialization}</span>` : '-';
            
        document.getElementById('statSpecial').textContent = profile.specialization || 'N/A';
        if (profile.specialization && profile.specialization.length > 12) {
             document.getElementById('statSpecial').style.fontSize = '1.1rem';
        }

        // Render avatar
        if (profile.profilePhoto) {
            currentUser.profilePhoto = profile.profilePhoto;
            localStorage.setItem('trainerUser', JSON.stringify(currentUser));
            const wrap = document.getElementById('heroAvatarEl');
            if (wrap) {
                const newImg = document.createElement('img');
                newImg.id = 'heroAvatarEl';
                newImg.className = 'avatar-img';
                newImg.src = profile.profilePhoto;
                newImg.alt = 'Profile';
                newImg.onclick = viewFullProfilePhoto;
                wrap.parentNode.replaceChild(newImg, wrap);
            }
        }

    } catch (e) {
        console.error(e);
    }
}

async function loadSchedule() {
    if (currentUser.id === 'DEMO_ID') {
        // Render empty or mock schedule
        document.getElementById('statClasses').textContent = "0";
        document.getElementById('statStudents').textContent = "0";
        renderSchedule([]);
        return;
    }

    try {
        const res = await fetch('/api/classes/trainer/' + currentUser.id);
        if (!res.ok) throw new Error("Failed to fetch classes");
        
        const classes = await res.json();
        
        document.getElementById('statClasses').textContent = classes.length;
        
        let totalStudents = 0;
        classes.forEach(c => {
             totalStudents += c.memberIds ? c.memberIds.length : 0;
        });
        document.getElementById('statStudents').textContent = totalStudents;
        
        renderSchedule(classes);
    } catch (e) {
        console.error(e);
    }
}

function renderSchedule(classes) {
    const tbody = document.getElementById('scheduleTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (classes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">No upcoming classes found.</td></tr>`;
        return;
    }

    classes.forEach(c => {
        const tr = document.createElement('tr');
        const capText = `${c.memberIds ? c.memberIds.length : 0} Members`;
        
        tr.innerHTML = `
            <td><strong>${c.classTime}</strong></td>
            <td><span style="color:#f0f9ff;font-weight:600">${c.className}</span></td>
            <td>${c.classDate}</td>
            <td><span style="background:rgba(56,189,248,0.1);color:#38bdf8;padding:4px 10px;border-radius:12px;font-size:0.85rem">${capText}</span></td>
        `;
        tbody.appendChild(tr);
    });
}



// ------ MODALS: EDIT DETAILS & CHANGE PASSWORD ------

function openEditModal() {
    // Pre-fill
    document.getElementById('editName').value = document.getElementById('profName').textContent;
    document.getElementById('editAge').value = document.getElementById('profAge').textContent === '-' ? '' : document.getElementById('profAge').textContent;
    document.getElementById('editPhone').value = document.getElementById('profPhone').textContent === '-' ? '' : document.getElementById('profPhone').textContent;
    document.getElementById('editCity').value = document.getElementById('profCity').textContent === '-' ? '' : document.getElementById('profCity').textContent;
    document.getElementById('editAddress').value = document.getElementById('profAddress').textContent === '-' ? '' : document.getElementById('profAddress').textContent;
    
    document.getElementById('editModal').classList.add('open');
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('open');
}

async function handleEditSubmit(e) {
    e.preventDefault();
    
    // Manual validation check to trigger red borders if invalid
    let valid = true;
    ['editName','editAge','editPhone','editCity','editAddress'].forEach(id => {
        let el = document.getElementById(id);
        if(el) { el.dispatchEvent(new Event('input')); }
    });
    ['editName','editAge','editPhone','editCity','editAddress'].forEach(id => {
        let el = document.getElementById(id);
        if(el && el.style.borderColor === 'rgb(239, 68, 68)') valid = false;
        if(el && el.style.borderColor === '#ef4444') valid = false;
    });
    if(!valid) return;
    
    const name = document.getElementById('editName').value.trim();
    const age = parseInt(document.getElementById('editAge').value);
    const phone = document.getElementById('editPhone').value.trim();
    const city = document.getElementById('editCity').value.trim();
    const address = document.getElementById('editAddress').value.trim();

    const btn = document.getElementById('btnSaveEdit');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;
    
    try {
        const payload = { ...currentUser, name, age, phone, city, address };
        const res = await fetch('/api/trainers/' + currentUser.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Update local state and UI
            currentUser.name = name;
            localStorage.setItem('trainerUser', JSON.stringify(currentUser));
            document.getElementById('heroName').textContent = name;
            loadProfile(); // Refresh
            showUIAlert("Success!", "Profile updated successfully!", true);
            closeEditModal();
        } else {
            showUIAlert("Error", data.error || "Failed to update profile", false);
        }
    } catch (err) {
        console.error(err);
        showUIAlert("Error", "Server error connecting to backend.", false);
    } finally {
        btn.innerHTML = 'Save Changes';
        btn.disabled = false;
    }
}

function openPassModal() {
    document.getElementById('passForm').reset();
    document.getElementById('matchErr').style.display = 'none';
    document.getElementById('passServerErr').style.display = 'none';
    document.getElementById('passModal').classList.add('open');
}

function closePassModal() {
    document.getElementById('passModal').classList.remove('open');
}

async function handlePassSubmit(e) {
    e.preventDefault();
    const currentPass = document.getElementById('currentPass').value;
    const newPass = document.getElementById('newPass').value;
    const confirmPass = document.getElementById('confirmPass').value;
    
    const matchErr = document.getElementById('matchErr');
    const srvErr = document.getElementById('passServerErr');
    matchErr.style.display = 'none';
    srvErr.style.display = 'none';
    
    let valid = true;
    ['currentPass','newPass','confirmPass'].forEach(id => {
        let el = document.getElementById(id);
        if(el) { el.dispatchEvent(new Event('input')); }
        if(el && el.style.borderColor === 'rgb(239, 68, 68)') valid = false;
        if(el && el.style.borderColor === '#ef4444') valid = false;
    });
    if(!valid) return;
    
    if (newPass.length < 6 || !/[A-Z]/.test(newPass)) {
        srvErr.textContent = "New password must be at least 6 characters and contain 1 uppercase letter.";
        srvErr.style.display = 'block';
        return;
    }
    
    if (newPass !== confirmPass) {
        matchErr.style.display = 'block';
        return;
    }
    
    if (currentUser.id === 'DEMO_ID') {
        showUIAlert("Demo Profile", "Success! Password changed (Simulated for Demo Profile)", true);
        closePassModal();
        return;
    }
    
    const btn = document.getElementById('btnSavePass');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    btn.disabled = true;
    
    try {
        const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentUser.id, currentPassword: currentPass, newPassword: newPass })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showUIAlert("Success!", "Password updated securely!", true);
            closePassModal();
        } else {
            srvErr.textContent = data.error || "Incorrect current password";
            srvErr.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        srvErr.textContent = "Server error occurred.";
        srvErr.style.display = 'block';
    } finally {
        btn.innerHTML = 'Update Password';
        btn.disabled = false;
    }
}

function togglePasswordVisibility(inputId, iconElement) {
    var input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
        iconElement.style.color = '#38bdf8';
    } else {
        input.type = 'password';
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
        iconElement.style.color = 'rgba(255,255,255,0.4)';
    }
}

// ==========================================
// LIVE VALIDATION FOR DASHBOARD MODALS
// ==========================================
(function attachDashValidations() {
    // 1. Edit Profile Modal
    const editFields = [
        { id: 'editName', validate: v => v && /^[A-Za-z\s]+$/.test(v) && v.trim().length >= 4 },
        { id: 'editAge', validate: v => v && parseInt(v) >= 18 && parseInt(v) <= 100 },
        { id: 'editPhone', validate: v => v && /^[0-9+\-\s()]+$/.test(v.trim()) && v.trim().length >= 10 },
        { id: 'editCity', validate: v => v && /^[A-Za-z\s]+$/.test(v) && v.trim().length >= 2 },
        { id: 'editAddress', validate: v => v && v.trim().length >= 5 }
    ];

    editFields.forEach(f => {
        const el = document.getElementById(f.id);
        const errEl = document.getElementById(f.id.replace('edit', 'err'));
        if(el) {
            el.addEventListener('input', () => {
                const val = el.value;
                if(f.validate(val)) {
                    el.style.borderColor = '#10b981';
                    if(errEl) errEl.style.display = 'none';
                } else {
                    el.style.borderColor = '#ef4444'; 
                    if(errEl) errEl.style.display = 'block';
                }
            });
        }
    });

    // 2. Change Password Modal
    const passFields = [
        { id: 'currentPass', validate: v => v && v.length > 0 },
        { id: 'newPass', validate: v => v && v.length >= 6 && /[A-Z]/.test(v) },
        { id: 'confirmPass', validate: v => v && v === document.getElementById('newPass').value }
    ];

    passFields.forEach(f => {
        const el = document.getElementById(f.id);
        if(el) {
            el.addEventListener('input', () => {
                const val = el.value;
                if(!val) {
                    el.style.borderColor = 'rgba(255,255,255,0.14)';
                } else if(f.validate(val)) {
                    el.style.borderColor = '#10b981';
                } else {
                    el.style.borderColor = '#ef4444';
                }
                
                // If it's the newPass, also trigger confrimPass check
                if(f.id === 'newPass') {
                    const confirmEl = document.getElementById('confirmPass');
                    if(confirmEl && confirmEl.value) confirmEl.dispatchEvent(new Event('input'));
                }
            });
        }
    });

    // 3. Password Strength
    const np = document.getElementById('newPass');
    if(np) {
        np.addEventListener('input', function() {
            var p = this.value;
            var s = 0;
            if (p.length >= 6) s += 25;
            if (/[a-z]/.test(p)) s += 20;
            if (/[A-Z]/.test(p)) s += 25;
            if (/\d/.test(p)) s += 15;
            if (/[^A-Za-z0-9]/.test(p)) s += 15;
            var txt = s < 35 ? '🔴 Weak' : s < 60 ? '🟠 Fair' : s < 85 ? '🟡 Good' : '🟢 Strong';
            var col = s < 35 ? '#f87171' : s < 60 ? '#fb923c' : s < 85 ? '#facc15' : '#4ade80';
            var el = document.getElementById('dashPwStrength');
            if(el) { el.textContent = p ? txt : ''; el.style.color = col; }
        });
    }
})();

// ==========================================
// AVATAR UPLOAD AND VIEW
// ==========================================
function handleAvatarUpload(event) {
    if (currentUser.id === 'DEMO_ID') {
        showUIAlert('Demo', 'Cannot change photo for demo profile', true);
        return;
    }
    
    var file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        showUIAlert('File Too Large', 'Please choose an image under 5 MB.', false);
        return;
    }
    
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            var MAX = 300;
            var canvas = document.createElement('canvas');
            var scale = Math.min(MAX / img.width, MAX / img.height, 1);
            canvas.width  = Math.round(img.width  * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            var base64 = canvas.toDataURL('image/jpeg', 0.82);

            var heroEl = document.getElementById('heroAvatarEl');
            if (heroEl) {
                var newImg = document.createElement('img');
                newImg.id = 'heroAvatarEl';
                newImg.className = 'avatar-img';
                newImg.src = base64;
                newImg.alt = 'Profile';
                newImg.onclick = viewFullProfilePhoto;
                heroEl.parentNode.replaceChild(newImg, heroEl);
            }

            if (currentUser && currentUser.id) {
                fetch('/api/trainers/' + currentUser.id)
                    .then(r => r.ok ? r.json() : {})
                    .then(u => {
                        u.profilePhoto = base64;
                        return fetch('/api/trainers/' + currentUser.id, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(u)
                        });
                    })
                    .then(r => { 
                        if(r.ok) {
                            currentUser.profilePhoto = base64;
                            localStorage.setItem('trainerUser', JSON.stringify(currentUser));
                            showUIAlert('Photo Updated', 'Profile photo saved securely!', true); 
                        } else {
                            showUIAlert('Error', 'Failed to save photo to database.', false);
                        }
                    })
                    .catch(() => showUIAlert('Error', 'Server error while saving photo.', false));
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function viewFullProfilePhoto() {
    var photoSrc = '';
    if (currentUser && currentUser.profilePhoto) {
        photoSrc = currentUser.profilePhoto;
    } else {
        var heroEl = document.getElementById('heroAvatarEl');
        if (heroEl && heroEl.tagName.toLowerCase() === 'img') {
            photoSrc = heroEl.src;
        } else {
            showUIAlert('Notice', 'No profile photo uploaded.', true);
            return;
        }
    }
    document.getElementById('fullSizePhoto').src = photoSrc;
    document.getElementById('photoViewModal').classList.add('open');
}

function closePhotoViewModal() {
    document.getElementById('photoViewModal').classList.remove('open');
}
