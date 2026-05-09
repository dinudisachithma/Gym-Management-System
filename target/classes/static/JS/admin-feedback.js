let allFeedback = [];

document.addEventListener('DOMContentLoaded', function() {
    loadFeedback();
});

function loadFeedback() {
    fetch('/api/feedback')
        .then(res => res.json())
        .then(data => {
            allFeedback = data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            renderFeedback();
        })
        .catch(err => {
            document.getElementById('feedbackTableBody').innerHTML = '<tr><td colspan="7" style="text-align:center; color:#ef4444;">Error loading data: ' + err.message + '</td></tr>';
        });
}

function renderFeedback() {
    const filter = document.getElementById('statusFilter').value;
    const tbody = document.getElementById('feedbackTableBody');
    tbody.innerHTML = '';
    
    let filtered = allFeedback;
    if (filter === 'PENDING') {
        filtered = allFeedback.filter(f => !f.approved); // Maps to isApproved
    } else if (filter === 'APPROVED') {
        filtered = allFeedback.filter(f => f.approved);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">No feedback records found.</td></tr>';
        return;
    }
    
    filtered.forEach(f => {
        const dateStr = new Date(f.createdAt).toLocaleDateString();
        
        // Target Logic
        let targetText = f.targetType === 'GYM' ? '<span style="color:#38bdf8;"><i class="fas fa-dumbbell"></i> Gym</span>' : 
                         `<span style="color:#c084fc;"><i class="fas fa-user-tie"></i> Trainer ID: ${(f.trainerId ? f.trainerId.substring(f.trainerId.length-5).toUpperCase() : 'N/A')}</span>`;
                         
        // Member Logic (anonymized if needed)
        let avatarHtml = `<div style="width:32px; height:32px; border-radius:50%; background:rgba(56,189,248,0.2); color:#38bdf8; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px; flex-shrink:0;">${(f.memberName || '?').charAt(0).toUpperCase()}</div>`;
        if (f.memberProfilePhoto && !f.anonymous) {
            avatarHtml = `<img src="${f.memberProfilePhoto}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; box-shadow:0 0 5px rgba(56,189,248,0.3); flex-shrink:0;">`;
        }

        let memberText = f.anonymous ? 
            `<div style="display:flex; align-items:center; gap:10px;"><div style="width:32px; height:32px; border-radius:50%; background:rgba(148,163,184,0.2); color:#94a3b8; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;"><i class="fas fa-ghost"></i></div><div><span style="color:#94a3b8;"><i>Anonymous</i></span><br><small style="font-size:0.7rem;">(${f.memberName})</small></div></div>` : 
            `<div style="display:flex; align-items:center; gap:10px;">${avatarHtml}<div>${f.memberName}</div></div>`;
        
        // Star Rating Logic
        let stars = '';
        for(let i=1; i<=5; i++) {
            if(i <= f.rating) stars += '<i class="fas fa-star" style="color:#f59e0b;font-size:0.8rem;"></i>';
            else stars += '<i class="far fa-star" style="color:#475569;font-size:0.8rem;"></i>';
        }
        
        // Status Logic
        let statusBadge = f.approved ? 
            '<span style="background:rgba(34,197,94,0.15);color:#22c55e;padding:4px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;">APPROVED</span>' : 
            '<span style="background:rgba(234,179,8,0.15);color:#eab308;padding:4px 8px;border-radius:12px;font-size:0.7rem;font-weight:700;">PENDING</span>';
            
        // Actions Logic
        let actions = '';
        if (!f.approved) {
            actions += `<button onclick="approveFeedback('${f.id}')" style="background:none;border:none;color:#22c55e;cursor:pointer;margin-right:10px;" title="Approve & Publish"><i class="fas fa-check-circle fa-lg"></i></button>`;
        }
        actions += `<button onclick="deleteFeedback('${f.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer;" title="Delete"><i class="fas fa-trash fa-lg"></i></button>`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${memberText}</td>
            <td>${targetText}</td>
            <td>${stars}</td>
            <td style="max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${f.comment}">${f.comment || '<i>No comment</i>'}</td>
            <td>${statusBadge}</td>
            <td>${actions}</td>
        `;
        tbody.appendChild(tr);
    });
}

function approveFeedback(id) {
    showUIConfirm('Approve Feedback', 'Are you sure you want to approve and publish this review?', false, function(confirmed) {
        if(!confirmed) return;
        
        fetch('/api/feedback/' + id + '/approve', { method: 'PUT' })
        .then(res => {
            if(res.ok) loadFeedback();
            else showUIAlert('Error', 'Failed to approve feedback.', false);
        })
        .catch(err => showUIAlert('Network Error', 'Network error while approving feedback.', false));
    });
}

function deleteFeedback(id) {
    showUIConfirm('Delete Feedback', 'Are you sure you want to completely delete this feedback?', true, function(confirmed) {
        if(!confirmed) return;
        
        fetch('/api/feedback/' + id, { method: 'DELETE' })
        .then(res => {
            if(res.ok) loadFeedback();
            else showUIAlert('Error', 'Failed to delete feedback.', false);
        })
        .catch(err => showUIAlert('Network Error', 'Network error while deleting feedback.', false));
    });
}
