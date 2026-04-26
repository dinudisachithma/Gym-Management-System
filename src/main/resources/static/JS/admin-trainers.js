// --- Constants and Global State ---
let allTrainers = [];
let allClasses = [];
let allMembers = [];

document.addEventListener("DOMContentLoaded", () => {
    // Check if admin is logged in
    const rawUser = localStorage.getItem('adminUser');
    let currentUser = null;
    if (rawUser) {
        try { currentUser = JSON.parse(rawUser); } catch(e) {}
    }
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
        console.warn('Auth check failed. Halting script to avoid data errors.');
        return;
    }

    loadTrainers();
    loadClasses();
    loadMembersForStats();

    // Close modals when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('open');
            }
        });
    });
});

function logout() {
    localStorage.removeItem('adminUser');
    window.location.href = '/login';
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    
    if (tabId === 'trainerPane') {
        document.getElementById('tabTrainerBtn').classList.add('active');
        loadTrainers();
    } else {
        document.getElementById('tabClassBtn').classList.add('active');
        loadClasses();
    }
}

// ------ TRAINERS ------
async function loadTrainers() {
    try {
        const res = await fetch('/api/trainers');
        if (!res.ok) throw new Error("Failed to fetch trainers");
        allTrainers = await res.json();
        
        document.getElementById('totalTrainersBox').textContent = allTrainers.length;
        renderTrainers(allTrainers);
        
        // Update trainers dropdown in Add Class modal
        const clsTrainer = document.getElementById('clsTrainer');
        if (clsTrainer) {
            clsTrainer.innerHTML = '<option value="">Select a Trainer</option>';
            allTrainers.forEach(t => {
                clsTrainer.innerHTML += `<option value="${t.id}">${t.name} (${t.specialization})</option>`;
            });
        }
    } catch (e) {
        console.error(e);
    }
}

function renderTrainers(trainers) {
    const tbody = document.getElementById('trainerTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (trainers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">No trainers found.</td></tr>`;
        return;
    }

    trainers.forEach((t, index) => {
        // Find assigned classes for this trainer
        const assigned = allClasses.filter(c => c.trainerId === t.id).length;
        const trainerIdDisplay = t.membershipId || '-';
        
        const tr = document.createElement('tr');
        tr.onclick = (e) => {
            // Prevent drawer if clicking a button
            if (e.target.closest('button')) return;
            openTrainerDrawer(t.id);
        };
        tr.innerHTML = `
            <td><span class="t-primary fw-bold">${trainerIdDisplay}</span></td>
            <td>${t.name}</td>
            <td><span class="t-secondary" style="font-size:0.85rem">${t.email}</span></td>
            <td><span style="background:rgba(56,189,248,0.1);color:#38bdf8;padding:3px 8px;border-radius:12px;font-size:0.75rem">${t.specialization}</span></td>
            <td>${t.age}</td>
            <td>${t.phone || '-'}</td>
            <td><span class="fw-bold">${assigned}</span></td>
            <td>
                <button class="action-btn btn-delete" title="Delete" onclick="deleteTrainer('${t.id}')">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

let currentTrainerDrawerId = null;

function openTrainerDrawer(id) {
    currentTrainerDrawerId = id;
    const t = allTrainers.find(x => x.id === id);
    if (!t) return;
    
    document.getElementById('drName').textContent = t.name;
    document.getElementById('drIdPill').textContent = t.membershipId || 'No ID';
    
    document.getElementById('drSpecialization').textContent = t.specialization || '-';
    
    // Rich class listing
    const assigned = allClasses.filter(c => c.trainerId === t.id);
    if (assigned.length === 0) {
        document.getElementById('drClasses').innerHTML = '<span style="color:rgba(255,255,255,0.4);font-size:0.85rem;">No classes assigned.</span>';
    } else {
        document.getElementById('drClasses').innerHTML = assigned.map(c => 
            `<span style="background:rgba(168,85,247,0.15); border:1px solid rgba(168,85,247,0.3); color:#d8b4fe; padding:4px 10px; border-radius:6px; font-size:0.8rem;"><i class="fas fa-clock"></i> ${c.className} (${c.classTime})</span>`
        ).join('');
    }
    
    document.getElementById('drEmail').textContent = t.email;
    document.getElementById('drPhone').textContent = t.phone || '-';
    document.getElementById('drAge').textContent = t.age ? t.age + ' yrs' : '-';
    document.getElementById('drCity').textContent = t.city || '-';
    document.getElementById('drAddress').textContent = t.address || '-';

    // ── Landing page photo preview (admin-controlled) ──
    const preview = document.getElementById('drLandingPhotoPreview');
    const removeBtn = document.getElementById('btnRemoveLandingPhoto');
    document.getElementById('landingPhotoInput').value = ''; // reset file input
    if (t.landingPagePhoto) {
        preview.innerHTML = `<img src="${t.landingPagePhoto}" style="width:100%; height:100%; object-fit:cover;">`;
        removeBtn.style.display = 'flex';
    } else {
        const initials = (t.name || 'T').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        preview.innerHTML = `<span style="font-size:1.4rem; font-weight:800; color:#f59e0b;">${initials}</span>`;
        removeBtn.style.display = 'none';
    }
    
    // Fetch and display approved ratings
    const drRatingsContainer = document.getElementById('drRatingsContainer');
    drRatingsContainer.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching approved feedback...';
    
    fetch('/api/feedback/trainer/' + t.id)
        .then(res => res.json())
        .then(feedbacks => {
            if (!feedbacks || feedbacks.length === 0) {
                drRatingsContainer.innerHTML = '<i style="color:rgba(255,255,255,0.4)">No approved public feedback yet.</i>';
                return;
            }
            
            const avg = (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1);
            let starsHtml = '';
            const roundedAvg = Math.round(avg);
            for(let i=1; i<=5; i++) {
                starsHtml += i <= roundedAvg 
                    ? '<i class="fas fa-star" style="color:#f59e0b;"></i>' 
                    : '<i class="far fa-star" style="color:rgba(255,255,255,0.2);"></i>';
            }
            
            let html = `
              <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px; background:rgba(245,158,11,0.05); padding:12px; border-radius:10px; border:1px solid rgba(245,158,11,0.2);">
                <div style="font-size:2rem; font-weight:700; color:#f59e0b; line-height:1;">${avg}</div>
                <div>
                  <div style="font-size:1.1rem; letter-spacing:2px;">${starsHtml}</div>
                  <div style="font-size:0.75rem; color:rgba(255,255,255,0.5);">${feedbacks.length} Approved Review(s)</div>
                </div>
              </div>
              <div style="max-height:180px; overflow-y:auto; padding-right:8px; display:flex; flex-direction:column; gap:10px;">
            `;
            
            feedbacks.forEach(f => {
                let rStars = '';
                for(let i=1; i<=5; i++) {
                    rStars += i <= f.rating 
                        ? '<i class="fas fa-star" style="color:#f59e0b; font-size:0.7rem;"></i>' 
                        : '<i class="far fa-star" style="color:rgba(255,255,255,0.2); font-size:0.7rem;"></i>';
                }
                const name = f.anonymous ? 'Anonymous Member' : (f.memberName || 'Member');
                html += `
                  <div style="background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                      <span style="font-weight:600; color:#f0f9ff; font-size:0.85rem;">${name}</span>
                      <span>${rStars}</span>
                    </div>
                    <div style="font-size:0.8rem; color:#94a3b8; line-height:1.4;">"${f.comment || '<i>No comment</i>'}"</div>
                  </div>
                `;
            });
            html += `</div>`; // close scrollable div
            drRatingsContainer.innerHTML = html;
        })
        .catch(e => {
            console.error(e);
            drRatingsContainer.innerHTML = '<span style="color:#ef4444;">Failed to load ratings.</span>';
        });
    
    // Check if the trainer has changed their password natively
    const btnPass = document.getElementById('btnResetPass');
    if (t.passwordChanged) {
        btnPass.style.opacity = '0.5';
        btnPass.style.cursor = 'not-allowed';
        btnPass.onclick = () => showUIAlert("Password Protected", "Cannot generate a new password: this trainer has already safely logged in and set their own secure password.", false);
    } else {
        btnPass.style.opacity = '1';
        btnPass.style.cursor = 'pointer';
        btnPass.onclick = resetTrainerPassword;
    }
    
    document.getElementById('drOverlay').classList.add('open');
    document.getElementById('trDrawer').classList.add('open');
}

function closeTrainerDrawer() {
    currentTrainerDrawerId = null;
    document.getElementById('drOverlay').classList.remove('open');
    document.getElementById('trDrawer').classList.remove('open');
}

async function resetTrainerPassword() {
    if (!currentTrainerDrawerId) return;
    
    showUIConfirm('Reset Password', 'Are you sure you want to generate a new temporary password for this trainer?', false, async (confirmed) => {
        if (!confirmed) return;
        
        const btn = document.getElementById('btnResetPass');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;
        
        try {
            const res = await fetch('/api/trainers/' + currentTrainerDrawerId + '/reset-password', { method: 'POST' });
            const data = await res.json();
            btn.innerHTML = '<i class="fas fa-key"></i> Generate New Password';
            btn.disabled = false;
            
            if (res.ok) {
                showUIAlert('✅ Password Reset', `Temporary Password:<br><span style="color:#38bdf8;font-size:1.2rem;font-weight:bold;">${data.temporaryPassword}</span><br><br>They must use this new password to login next time.`, true);
            } else {
                showUIAlert('Error', data.error || "Failed to reset password", false);
            }
        } catch (e) {
            console.error(e);
            btn.innerHTML = '<i class="fas fa-key"></i> Generate New Password';
            btn.disabled = false;
            showUIAlert('Error', 'Server error', false);
        }
    });
}

function openTrainerMessageModal() {
    if (!currentTrainerDrawerId) return;
    window.location.href = '/admin-notifications?target=SINGLE_TRAINER&id=' + encodeURIComponent(currentTrainerDrawerId);
}

function filterTrainers() {
    const q = document.getElementById('trainerSearch').value.toLowerCase();
    const filtered = allTrainers.filter(t => 
        (t.name && t.name.toLowerCase().includes(q)) || 
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.specialization && t.specialization.toLowerCase().includes(q))
    );
    renderTrainers(filtered);
}

async function handleTrainerSubmit(e) {
    e.preventDefault();
    document.querySelectorAll('.validation-error').forEach(el => el.style.display = 'none');
    
    const name = document.getElementById('trName').value.trim();
    const email = document.getElementById('trEmail').value.trim();
    const specialization = document.getElementById('trSpecialization').value.trim();
    const age = parseInt(document.getElementById('trAge').value);
    const phone = document.getElementById('trPhone').value.trim();
    const city = document.getElementById('trCity').value.trim();
    const address = document.getElementById('trAddress').value.trim();
    
    let valid = true;
    if (name.length < 5) { document.getElementById('trNameErr').style.display = 'block'; valid = false; }
    if (age < 18 || age > 60) { document.getElementById('trAgeErr').style.display = 'block'; valid = false; }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) { document.getElementById('trPhoneErr').style.display = 'block'; valid = false; }
    
    if (!valid) return;
    
    const payload = { name, email, specialization, age, phone, city, address };
    const btn = document.querySelector('#trainerForm .btn-submit');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/trainers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Create Trainer Account';
        btn.disabled = false;

        if (!res.ok) {
            showUIAlert("Error", data.error || "Failed to add trainer", false);
            return;
        }
        
        // Show simpler success alert now that password is set auto
        showUIAlert("Success!", `Trainer Account Created.<br><br>The trainer can now log in using the email ${email} and the auto-generated temporary password:<br><br><span style="color:#38bdf8;font-size:1.2rem;font-weight:bold;">${data.temporaryPassword}</span>`, true);
        
        document.getElementById('trainerForm').reset();
        loadTrainers();
    } catch (err) {
        console.error(err);
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Create Trainer Account';
        btn.disabled = false;
        showUIAlert("Error", "Server error", false);
    }
}

async function deleteTrainer(id) {
    showUIConfirm('⚠️ Delete Trainer', 'Are you sure you want to completely remove this trainer?', true, async (confirmed) => {
        if(!confirmed) return;
        try {
            const res = await fetch('/api/trainers/' + id, { method: 'DELETE' });
            if (res.ok) {
                showUIAlert('✅ Success', 'Trainer deleted successfully.', true);
                loadTrainers();
            } else {
                const d = await res.json();
                showUIAlert('Error', d.error || "Failed to delete", false);
            }
        } catch (e) {
            console.error(e);
        }
    });
}

// ------ CLASSES ------
async function loadClasses() {
    try {
        const res = await fetch('/api/classes');
        if (!res.ok) throw new Error("Failed to fetch classes");
        allClasses = await res.json();
        
        document.getElementById('totalClassesBox').textContent = allClasses.length;
        renderClasses();
    } catch (e) {
        console.error(e);
    }
}

function renderClasses() {
    const tbody = document.getElementById('classTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (allClasses.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">No classes scheduled.</td></tr>`;
        return;
    }

    allClasses.forEach(c => {
        const currentCap = c.memberIds ? c.memberIds.length : 0;
        const maxCap = c.maxCapacity || 0;
        const capText = `${currentCap} / ${maxCap}`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="fw-bold">${c.classTime}</span></td>
            <td><span class="t-primary fw-bold">${c.className}</span></td>
            <td>${c.classDate}</td>
            <td>${capText}</td>
            <td>${c.trainerName || '-'}</td>
            <td>
                <button class="action-btn btn-assign" onclick="openAssignModal('${c.id}', '${c.className}', ${maxCap}, ${currentCap})">
                    <i class="fas fa-users-cog"></i> Assign
                </button>
            </td>
            <td>
                <button class="action-btn" style="background:rgba(56,189,248,0.15);color:#38bdf8;border:none;" title="Edit" onclick="openClassModal('${c.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn btn-delete" title="Delete" onclick="deleteClass('${c.id}')" style="margin-left: 5px;">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openClassModal(classId = null) {
    document.getElementById('classModal').classList.add('open');
    const form = document.getElementById('classForm');
    form.reset();
    document.getElementById('clsDayErr').style.display = 'none';

    if (classId) {
        document.getElementById('classModalTitle').textContent = 'Edit Class';
        document.getElementById('classSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Save Changes';
        document.getElementById('clsId').value = classId;
        
        const c = allClasses.find(cls => cls.id === classId);
        if (c) {
            document.getElementById('clsName').value = c.className || '';
            document.getElementById('clsCapacity').value = c.maxCapacity || 20;
            if (c.trainerId) document.getElementById('clsTrainer').value = c.trainerId;
            
            // Check days
            if (c.classDate) {
                const days = c.classDate.split(',').map(d => d.trim());
                document.querySelectorAll('.day-selector input[type="checkbox"]').forEach(chk => {
                    chk.checked = days.includes(chk.value);
                });
            }
            
            // Time string like "4:30 PM - 5:30 PM", best effort to parse back into format '16:30'
            if (c.classTime) {
                const parts = c.classTime.split('-');
                if (parts.length === 2) {
                    document.getElementById('clsStartTime').value = parseTime12to24(parts[0].trim());
                    document.getElementById('clsEndTime').value = parseTime12to24(parts[1].trim());
                }
            }
        }
    } else {
        document.getElementById('classModalTitle').textContent = 'Add New Class';
        document.getElementById('classSubmitBtn').innerHTML = 'Add Class';
        document.getElementById('clsId').value = '';
    }
}

// Helper: "4:30 PM" -> "16:30"
function parseTime12to24(t12) {
    const match = t12.match(/(\d+):(\d+)\s?(AM|PM)/i);
    if (!match) return "";
    let h = parseInt(match[1]);
    const m = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
}

function closeClassModal() {
    document.getElementById('classModal').classList.remove('open');
}

async function handleClassSubmit(e) {
    e.preventDefault();
    
    const className = document.getElementById('clsName').value.trim();
    const trainerId = document.getElementById('clsTrainer').value;
    const trainerSelect = document.getElementById('clsTrainer');
    const trainerName = trainerSelect.options[trainerSelect.selectedIndex].text.split(' (')[0];
    const maxCapacity = parseInt(document.getElementById('clsCapacity').value);
    
    const classId = document.getElementById('clsId').value;
    const isEdit = classId && classId.trim().length > 0;
    
    // Days logic
    const daysArr = [];
    document.querySelectorAll('.day-selector input[type="checkbox"]:checked').forEach(c => daysArr.push(c.value));
    if (daysArr.length === 0) {
        document.getElementById('clsDayErr').style.display = 'block';
        return;
    }
    const classDate = daysArr.join(', ');
    
    // Time logic
    const sTime = document.getElementById('clsStartTime').value;
    const eTime = document.getElementById('clsEndTime').value;
    
    if (!sTime || !eTime) {
        showUIAlert("Hold On", "Please provide both start and end times.", false);
        return;
    }
    if (sTime >= eTime) {
        showUIAlert("Invalid Time", "The start time must be before the end time.", false);
        return;
    }

    const classTime = formatTimeRange(sTime, eTime);
    
    const payload = { className, classDate, classTime, trainerId, trainerName, maxCapacity };
    if (!isEdit) {
        payload.memberIds = [];
    }
    
    const url = isEdit ? '/api/classes/' + classId : '/api/classes';
    const method = isEdit ? 'PUT' : 'POST';
    
    document.getElementById('classSubmitBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    document.getElementById('classSubmitBtn').disabled = true;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (!res.ok) {
            showUIAlert("Error", data.error || "Failed to save class", false);
            document.getElementById('classSubmitBtn').innerHTML = isEdit ? 'Save Changes' : 'Add Class';
            document.getElementById('classSubmitBtn').disabled = false;
            return;
        }
        
        document.getElementById('classSubmitBtn').innerHTML = isEdit ? 'Save Changes' : 'Add Class';
        document.getElementById('classSubmitBtn').disabled = false;
        closeClassModal();
        loadClasses();
    } catch (err) {
        console.error(err);
        showUIAlert("Error", "Server error saving class", false);
        document.getElementById('classSubmitBtn').innerHTML = isEdit ? 'Save Changes' : 'Add Class';
        document.getElementById('classSubmitBtn').disabled = false;
    }
}

async function deleteClass(id) {
    showUIConfirm('⚠️ Delete Class', 'Are you sure you want to delete this class?', true, async (confirmed) => {
        if(!confirmed) return;
        try {
            const res = await fetch('/api/classes/' + id, { method: 'DELETE' });
            if (res.ok) {
                showUIAlert('✅ Success', 'Class deleted successfully.', true);
                loadClasses();
            } else {
                const d = await res.json();
                showUIAlert('Error', d.error || "Failed to delete", false);
            }
        } catch (e) {
            console.error(e);
        }
    });
}

// Format "16:00" to "4:00 PM"
function formatTime12(time24) {
    if (!time24) return "";
    let [h, m] = time24.split(':');
    h = parseInt(h);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

function formatTimeRange(s24, e24) {
    if (!s24 || !e24) return "";
    return formatTime12(s24) + ' - ' + formatTime12(e24);
}

// ------ ASSIGN MEMBERS ------
async function loadMembersForStats() {
    try {
        const res = await fetch('/api/auth/members');
        if (!res.ok) return;
        const members = await res.json();
        // filter out admin and trainer roles, and ensure they have a membership package
        allMembers = members.filter(m => m.role !== 'ADMIN' && m.role !== 'TRAINER' && m.membershipPackage);
        // If sorting alphabetically by name
        allMembers.sort((a,b) => (a.name || "").localeCompare(b.name || ""));
    } catch (e) {
        console.error(e);
    }
}

let currentAssignClassId = null;

function openAssignModal(classId, className, maxCap, currentCap) {
    currentAssignClassId = classId;
    document.getElementById('assignClassName').textContent = className;
    document.getElementById('assignClassId').value = classId;
    document.getElementById('assignErrorMsg').style.display = 'none';
    document.getElementById('assignSearchInput').value = "";
    
    document.getElementById('assignModal').classList.add('open');
    renderAssignList();
}

function closeAssignModal() {
    document.getElementById('assignModal').classList.remove('open');
    currentAssignClassId = null;
    loadClasses(); // Refresh counts in main table
}

function filterAssignMembers() {
    renderAssignList();
}

function renderAssignList() {
    const list = document.getElementById('assignMemberListContainer');
    list.innerHTML = '';
    
    const cls = allClasses.find(c => c.id === currentAssignClassId);
    if (!cls) return;
    
    const q = document.getElementById('assignSearchInput').value.toLowerCase();
    
    const filteredMembers = allMembers.filter(m => 
        (m.name && m.name.toLowerCase().includes(q)) || 
        (m.email && m.email.toLowerCase().includes(q))
    );
    
    if (filteredMembers.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 20px; color:rgba(255,255,255,0.4);">No members found.</div>';
        return;
    }
    
    filteredMembers.forEach(m => {
        const isAssigned = cls.memberIds && cls.memberIds.includes(m.id);
        
        const row = document.createElement('div');
        row.className = 'assign-member-item';
        
        let targetId = m.id;
        
        row.innerHTML = `
            <div>
                <div class="t-primary fw-bold" style="font-size:0.95rem;">${m.name}</div>
                <div class="t-secondary" style="font-size:0.8rem;">${m.email}</div>
            </div>
            <div>
                ${isAssigned 
                    ? `<button class="btn-assign-toggle remove" onclick="toggleMemberAssignment('${targetId}', false)"><i class="fas fa-check"></i> Assigned</button>`
                    : `<button class="btn-assign-toggle add" onclick="toggleMemberAssignment('${targetId}', true)"><i class="fas fa-plus"></i> Assign</button>`
                }
            </div>
        `;
        list.appendChild(row);
    });
}

async function toggleMemberAssignment(memberId, isAdding) {
    try {
        const endpoint = isAdding 
            ? `/api/classes/${currentAssignClassId}/assign/${memberId}` 
            : `/api/classes/${currentAssignClassId}/remove/${memberId}`;
            
        const method = isAdding ? 'POST' : 'DELETE';
        
        const res = await fetch(endpoint, { method: method });
        const data = await res.json();
        
        if (!res.ok) {
            showAssignError(data.error || "Action failed");
            return;
        }
        
        // Update local state
        const clsIndex = allClasses.findIndex(c => c.id === currentAssignClassId);
        if (clsIndex !== -1) {
            allClasses[clsIndex] = data.fitnessClass || data;
        }
        
        // Refresh UI instantly
        renderAssignList();
        
    } catch (e) {
        console.error(e);
        showAssignError("Server error");
    }
}

function showAssignError(msg) {
    const err = document.getElementById('assignErrorMsg');
    err.textContent = msg;
    err.style.display = 'block';
    setTimeout(() => { err.style.display = 'none'; }, 3000);
}

// --- LIVE VALIDATION START ---
document.addEventListener("DOMContentLoaded", () => {
    // Add live validation listeners

    const trName = document.getElementById('trName');
    if(trName) trName.addEventListener('input', function() {
        document.getElementById('trNameErr').style.display = (this.value.trim().length >= 5) ? 'none' : 'block';
    });
    
    const trAge = document.getElementById('trAge');
    if(trAge) trAge.addEventListener('input', function() {
        const v = parseInt(this.value);
        document.getElementById('trAgeErr').style.display = (v >= 18 && v <= 60) ? 'none' : 'block';
    });
    
    const trPhone = document.getElementById('trPhone');
    if(trPhone) trPhone.addEventListener('input', function() {
        document.getElementById('trPhoneErr').style.display = (/^[0-9]{10}$/.test(this.value.trim())) ? 'none' : 'block';
    });
});
// --- LIVE VALIDATION END ---

// --- Landing Page Photo Upload ---
async function uploadLandingPhoto() {
    const input = document.getElementById('landingPhotoInput');
    if (!input.files || !input.files[0] || !currentTrainerDrawerId) return;

    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
        showUIAlert('File Too Large', 'Please select an image smaller than 2 MB.', false);
        return;
    }

    const btn = document.getElementById('btnUploadLandingPhoto');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result;
        try {
            const res = await fetch(`/api/trainers/${currentTrainerDrawerId}/landing-photo`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ landingPagePhoto: base64 })
            });
            const data = await res.json();
            btn.innerHTML = '<i class="fas fa-upload"></i> Upload Photo';
            btn.disabled = false;

            if (res.ok) {
                const idx = allTrainers.findIndex(t => t.id === currentTrainerDrawerId);
                if (idx !== -1) allTrainers[idx].landingPagePhoto = base64;

                const preview = document.getElementById('drLandingPhotoPreview');
                preview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
                document.getElementById('btnRemoveLandingPhoto').style.display = 'flex';
                showUIAlert('✅ Photo Updated', 'The landing page photo has been updated. It will appear on the public landing page.', true);
            } else {
                showUIAlert('Error', data.error || 'Failed to update photo', false);
            }
        } catch (err) {
            console.error(err);
            btn.innerHTML = '<i class="fas fa-upload"></i> Upload Photo';
            btn.disabled = false;
            showUIAlert('Error', 'Server error uploading photo', false);
        }
    };
    reader.readAsDataURL(file);
}

async function removeLandingPhoto() {
    if (!currentTrainerDrawerId) return;
    showUIConfirm('Remove Landing Photo', 'Are you sure you want to remove this trainer\'s landing page photo?', true, async (confirmed) => {
        if (!confirmed) return;
        try {
            const res = await fetch(`/api/trainers/${currentTrainerDrawerId}/landing-photo`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ landingPagePhoto: null })
            });
            if (res.ok) {
                const idx = allTrainers.findIndex(t => t.id === currentTrainerDrawerId);
                if (idx !== -1) allTrainers[idx].landingPagePhoto = null;

                const t = allTrainers.find(x => x.id === currentTrainerDrawerId);
                const initials = (t?.name || 'T').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const preview = document.getElementById('drLandingPhotoPreview');
                preview.innerHTML = `<span style="font-size:1.4rem; font-weight:800; color:#f59e0b;">${initials}</span>`;
                document.getElementById('btnRemoveLandingPhoto').style.display = 'none';
                showUIAlert('✅ Photo Removed', 'Landing page photo removed. An initials avatar will appear on the landing page.', true);
            }
        } catch(e) {
            console.error(e);
            showUIAlert('Error', 'Server error', false);
        }
    });
}
