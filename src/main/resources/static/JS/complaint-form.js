// Check authentication
function checkAuth() {
    let user = JSON.parse(localStorage.getItem('memberUser'));
    if (!user || user.role !== 'MEMBER') {
        window.location.href = '/login';
        return false;
    }
    return true;
}

if (!checkAuth()) {
    console.error('Not authenticated - redirecting to login');
}

const currentUser = JSON.parse(localStorage.getItem('memberUser'));
let globalGymId = '';

document.addEventListener('DOMContentLoaded', () => {
    // Attempt to prefill inputs
    if (currentUser) {
        if (currentUser.name) document.getElementById('memberName').value = currentUser.name;
        if (currentUser.email) document.getElementById('memberEmail').value = currentUser.email;
        
        // Priority: 1. membershipId (GYM-XXX) 2. memberNo 3. backup id
        globalGymId = currentUser.membershipId || currentUser.memberNo || currentUser.id || 'M-UNKNOWN';

        if (globalGymId !== "M-UNKNOWN") {
            document.getElementById('formMemberId').value = globalGymId;
            fetchMyComplaints();
        } else {
            document.getElementById('myComplaintsList').innerHTML = '<div style="text-align:center; padding: 30px; color: #f59e0b;"><p>Member ID not found. Unable to load history.</p></div>';
        }
    }

    const descInput = document.getElementById('description');
    const charCount = document.getElementById('charCount');
    const descErr = document.getElementById('descErr');

    // Real-time character count
    descInput.addEventListener('input', () => {
        const len = descInput.value.length;
        charCount.textContent = `${len} / 500`;
        if (len > 0 && len < 20) {
            charCount.style.color = '#ef4444';
        } else {
            charCount.style.color = 'rgba(255,255,255,0.4)';
            descErr.style.display = 'none';
            descInput.classList.remove('invalid');
        }
    });

    // Submit complaint
    document.getElementById('complaintForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const descText = descInput.value.trim();
        if (descText.length < 20) {
            descErr.style.display = 'block';
            descInput.classList.add('invalid');
            descInput.focus();
            return;
        }

        const btn = document.getElementById('btnSubmit');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        btn.disabled = true;

        const complaint = {
            memberName: document.getElementById('memberName').value,
            memberEmail: document.getElementById('memberEmail').value,
            memberId: document.getElementById('formMemberId').value,
            category: document.getElementById('category').value,
            priority: document.getElementById('priority').value,
            description: descText
        };

        const fileInput = document.getElementById('photoFile');
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                complaint.photoBase64 = evt.target.result;
                sendComplaint(complaint, btn);
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            sendComplaint(complaint, btn);
        }
    });

    function sendComplaint(complaint, btn) {
        fetch('/api/complaints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(complaint)
        })
        .then(r => {
            if (!r.ok) throw new Error("Failed to submit");
            return r.json();
        })
        .then(data => {
            showUIAlert('Success', 'Your complaint has been received securely.', true);
            document.getElementById('category').value = '';
            document.getElementById('priority').value = '';
            document.getElementById('photoFile').value = '';
            descInput.value = '';
            charCount.textContent = '0 / 500';
            
            // Re-fetch since a new one was added
            fetchMyComplaints();
        })
        .catch(err => {
            console.error(err);
            showUIAlert('Error', 'Failed to submit complaint. Is the server running?', false);
        })
        .finally(() => {
            btn.innerHTML = '<i class="fas fa-shield-alt"></i> Submit Complaint';
            btn.disabled = false;
        });
    }
});

let currentComplaints = [];

function fetchMyComplaints() {
    const email = currentUser && currentUser.email;
    if (!email) return;

    fetch('/api/complaints/my?email=' + encodeURIComponent(email))
        .then(r => r.json())
        .then(data => {
            currentComplaints = data;
            const list = document.getElementById('myComplaintsList');
            if (data.length === 0) {
                list.innerHTML = '<div style="text-align:center; padding: 30px; color: rgba(255,255,255,0.4);"><i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 12px; color: rgba(16, 185, 129, 0.4);"></i><p>No complaints found.</p></div>';
            } else {
                list.innerHTML = data.map(c => `
                    <div class="complaint-item" id="comp-${c.id}">
                        <div class="complaint-header">
                            <div>
                                <div class="complaint-cat">
                                    <span style="color:#94a3b8; font-size: 0.9em; margin-right: 6px;">#${c.ticketId || c.id.substring(0,6)}</span>
                                    <i class="fas fa-tag" style="color:#f59e0b;"></i> ${c.category}
                                    ${c.priority ? `<span style="font-size:0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius:4px; margin-left: 6px;">Priority: ${c.priority}</span>` : ''}
                                </div>
                                <div class="complaint-date">${new Date(c.submittedAt).toLocaleDateString()} &bull; <span class="status-badge status-${c.status.toLowerCase().replace(' ', '-')}">${c.status}</span></div>
                            </div>
                            <div>
                                ${c.status === 'Pending' ? `<button onclick="openEditModal('${c.id}')" class="btn-delete" style="background: rgba(56,189,248,0.12); border-color: rgba(56,189,248,0.3); color: #38bdf8; margin-right: 8px;" title="Edit complaint"><i class="fas fa-edit"></i></button>` : ''}
                                <button onclick="deleteComplaint('${c.id}')" class="btn-delete" title="Delete complaint"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                        <div class="complaint-desc">
                            ${c.description}
                            ${c.photoBase64 ? `<div style="margin-top: 12px; border: 1px solid rgba(255,255,255,0.1); padding: 5px; border-radius: 6px; display: inline-block; background: rgba(0,0,0,0.2);"><img src="${c.photoBase64}" style="max-height: 120px; border-radius: 4px; cursor: pointer; display: block;" onclick="window.open().document.write('<style>body{margin:0;display:flex;justify-content:center;align-items:center;background:#000;height:100vh;}img{max-width:100%;max-height:100vh;object-fit:contain;}</style><img src=\\'${c.photoBase64}\\'/>')" title="Click to enlarge image" /></div>` : ''}
                        </div>
                        
                        <button onclick="toggleConversation('${c.id}')" id="toggleBtn-${c.id}" style="margin-top: 10px; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; border-radius: 4px; padding: 6px 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s;"><i class="fas fa-comments"></i> View Conversation</button>

                        <div id="convArea-${c.id}" style="display: none; transition: all 0.3s ease-in-out;">
                            <div class="conversation-thread" style="margin-top: 16px; display: flex; flex-direction: column; gap: 10px;">
                            ${c.adminReply && (!c.messages || c.messages.length === 0) ? `
                                <div class="admin-reply">
                                    <div class="admin-reply-label"><i class="fas fa-user-shield"></i> Royal Gym Admin</div>
                                    <div style="color: #f0f9ff; font-size: 0.9rem;">${c.adminReply}</div>
                                </div>
                            ` : ''}
                            
                            ${c.messages && c.messages.length > 0 ? c.messages.map(m => {
                                const isMember = m.senderRole === 'MEMBER';
                                const blockClass = isMember ? 'member-reply-block' : 'admin-reply';
                                const labelClass = isMember ? 'member-reply-label' : 'admin-reply-label';
                                const icon = isMember ? 'fa-user' : 'fa-user-shield';
                                const label = isMember ? 'You' : 'Royal Gym Admin';
                                const dateStr = m.timestamp ? new Date(m.timestamp).toLocaleString() : '';
                                return `<div class="${blockClass}">
                                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                       <div class="${labelClass}"><i class="fas ${icon}"></i> ${label}</div>
                                       <div class="reply-date-text">${dateStr}</div>
                                    </div>
                                    <div class="admin-reply-text" style="font-size: 0.9rem; line-height:1.5;">${m.message}</div>
                                </div>`;
                            }).join('') : ''}
                            </div>
                            
                            <div style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
                                ${c.status !== 'Resolved' ? `
                                    <div style="display:flex; gap: 10px; margin-bottom: 10px;">
                                        <textarea id="reply-${c.id}" class="form-control" rows="2" placeholder="Write a reply..."></textarea>
                                    </div>
                                    <div style="display:flex; justify-content: flex-end; gap: 10px;">
                                        <button onclick="sendMemberReply('${c.id}')" class="btn-action-sm" style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; border-radius: 4px; padding: 6px 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer;"><i class="fas fa-paper-plane"></i> Reply</button>
                                        <button onclick="resolveComplaint('${c.id}')" class="btn-action-sm" style="color: #10b981; border-color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: 4px; padding: 6px 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer;"><i class="fas fa-check-circle"></i> Mark as Resolved</button>
                                    </div>
                                ` : `
                                    <div style="display:flex; gap: 10px; margin-bottom: 10px;">
                                        <textarea id="reply-${c.id}" class="form-control" rows="2" placeholder="Write a reply to reopen..."></textarea>
                                    </div>
                                    <div style="display:flex; justify-content: flex-end; gap: 10px;">
                                        <button onclick="sendMemberReply('${c.id}')" class="btn-action-sm" style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); color: #38bdf8; border-radius: 4px; padding: 6px 12px; font-size: 0.85rem; font-weight: 600; cursor: pointer;"><i class="fas fa-paper-plane"></i> Reply</button>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('myComplaintsList').innerHTML = '<p style="color: #ef4444;">Failed to fetch complaints.</p>';
        });
}

function deleteComplaint(id) {
    showUIConfirm('Delete Complaint', 'Are you sure you want to delete this complaint? This cannot be undone.', true, function(confirmed) {
        if (!confirmed) return;
        
        // Optimistically remove
        const el = document.getElementById('comp-' + id);
        if(el) el.style.opacity = '0.5';

        fetch('/api/complaints/' + id, { method: 'DELETE' })
        .then(r => {
            if(r.ok) {
                if(el) el.remove();
                // Count remaining
                const items = document.querySelectorAll('.complaint-item');
                if(items.length === 0) {
                    document.getElementById('myComplaintsList').innerHTML = '<div style="text-align:center; padding: 30px; color: rgba(255,255,255,0.4);"><i class="fas fa-trash-restore" style="font-size: 2rem; margin-bottom: 12px; color: rgba(255,255,255, 0.2);"></i><p>No complaints found.</p></div>';
                }
            } else {
                throw new Error("Deletion failed");
            }
        })
        .catch(err => {
            if(el) el.style.opacity = '1';
            showUIAlert('Error', 'Failed to delete the complaint.', false);
        });
    });
}

function sendMemberReply(id) {
    const replyInput = document.getElementById('reply-' + id);
    if (!replyInput) return;
    const msg = replyInput.value.trim();
    if (!msg) {
        showUIAlert('Hold On', 'Please write a reply first.', false);
        return;
    }

    fetch('/api/complaints/' + id + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderRole: 'MEMBER', messageText: msg })
    })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
        fetchMyComplaints(); // Refresh UI
    })
    .catch(() => showUIAlert('Error', 'Failed to send reply.', false));
}

function resolveComplaint(id) {
    showUIConfirm('Resolve Complaint', 'Are you sure you want to mark this complaint as resolved?', true, function(confirmed) {
        if (!confirmed) return;
        
        fetch('/api/complaints/' + id + '/resolve', { method: 'PUT' })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
            fetchMyComplaints();
            showUIAlert('Success', 'Complaint resolved.', true);
        })
        .catch(() => showUIAlert('Error', 'Failed to resolve complaint.', false));
    });
}

function toggleConversation(id) {
    const convArea = document.getElementById('convArea-' + id);
    const toggleBtn = document.getElementById('toggleBtn-' + id);
    if (!convArea || !toggleBtn) return;
    
    if (convArea.style.display === 'none') {
        convArea.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Conversation';
    } else {
        convArea.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-comments"></i> View Conversation';
    }
}

// Edit Modal Logic
function openEditModal(id) {
    const comp = currentComplaints.find(c => c.id === id);
    if (!comp) return;

    document.getElementById('editComplaintId').value = comp.id;
    document.getElementById('editCategory').value = comp.category || '';
    document.getElementById('editPriority').value = comp.priority || '';
    document.getElementById('editDescription').value = comp.description || '';
    document.getElementById('editPhotoFile').value = ''; // Reset file input

    const modal = document.getElementById('editComplaintModal');
    modal.style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editComplaintModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('editComplaintForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const btn = document.getElementById('btnEditSubmit');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            btn.disabled = true;

            const id = document.getElementById('editComplaintId').value;
            const updatedComplaint = {
                category: document.getElementById('editCategory').value,
                priority: document.getElementById('editPriority').value,
                description: document.getElementById('editDescription').value
            };

            const fileInput = document.getElementById('editPhotoFile');
            if (fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    updatedComplaint.photoBase64 = evt.target.result;
                    sendEditComplaint(id, updatedComplaint, btn);
                };
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                sendEditComplaint(id, updatedComplaint, btn);
            }
        });
    }
});

function sendEditComplaint(id, complaintData, btn) {
    fetch('/api/complaints/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaintData)
    })
    .then(r => {
        if (!r.ok) throw new Error("Failed to update");
        return r.json();
    })
    .then(data => {
        showUIAlert('Success', 'Complaint updated successfully.', true);
        closeEditModal();
        fetchMyComplaints();
    })
    .catch(err => {
        console.error(err);
        showUIAlert('Error', 'Failed to update complaint.', false);
    })
    .finally(() => {
        btn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        btn.disabled = false;
    });
}
