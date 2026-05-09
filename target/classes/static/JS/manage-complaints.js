let allComplaints = [];

function checkAuth() {
    let user = JSON.parse(localStorage.getItem('adminUser'));
    if (!user || user.role !== 'ADMIN') {
        window.location.href = '/login';
        return false;
    }
    return true;
}

if (!checkAuth()) {
    console.error('Not authenticated as admin - redirecting');
}

document.addEventListener('DOMContentLoaded', () => {
    loadComplaints();

    // Filter logic
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            renderComplaints();
        });
    });

    const priorityFilter = document.getElementById('priorityFilter');
    if (priorityFilter) {
        priorityFilter.addEventListener('change', () => {
            renderComplaints();
        });
    }

    // Reply form logic
    document.getElementById('replyForm').addEventListener('submit', handleReplySubmit);
});

function loadComplaints() {
    fetch('/api/complaints/all')
        .then(r => r.json())
        .then(data => {
            allComplaints = data.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
            renderComplaints();
        })
        .catch(err => {
            console.error('Failed to load complaints', err);
            document.getElementById('complaintsTableBody').innerHTML = '<tr><td colspan="5" style="color:#ef4444; text-align:center;">Error loading complaints.</td></tr>';
        });
}

function renderComplaints() {
    const tbody = document.getElementById('complaintsTableBody');
    
    const activeStatusBtn = document.querySelector('.filter-btn.active');
    const statusFilter = activeStatusBtn ? activeStatusBtn.dataset.filter : 'all';
    
    const prioritySelect = document.getElementById('priorityFilter');
    const priorityFilterDesc = prioritySelect ? prioritySelect.value : 'all';

    let filtered = allComplaints;
    
    // Update Hero Stats
    const totalCount = allComplaints.length;
    const pendingCount = allComplaints.filter(c => c.status === 'Pending').length;
    const resolvedCount = allComplaints.filter(c => c.status === 'Resolved').length;

    const hTotal = document.getElementById('heroTotalComplaints');
    const hPending = document.getElementById('heroPendingComplaints');
    const hResolved = document.getElementById('heroResolvedComplaints');

    if(hTotal) hTotal.textContent = totalCount;
    if(hPending) hPending.textContent = pendingCount;
    if(hResolved) hResolved.textContent = resolvedCount;
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(c => c.status === statusFilter);
    }
    if (priorityFilterDesc !== 'all') {
        filtered = filtered.filter(c => c.priority === priorityFilterDesc);
    }
    
    document.getElementById('txtCount').textContent = filtered.length;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding: 40px; color: rgba(255,255,255,0.4);">
                    <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 12px; color: rgba(16, 185, 129, 0.4);"></i>
                    <p>No complaints found for this filter.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = filtered.map(c => {
        const statusClass = c.status.toLowerCase().replace(' ', '-');
        const submitted = new Date(c.submittedAt).toLocaleDateString();
        const displayTicketId = c.ticketId ? `#${c.ticketId}` : `#TKT-${c.id.substring(c.id.length - 6).toUpperCase()}`;
        
        let actionBtn = '';
        if (c.status === 'Resolved') {
            actionBtn = `<button class="btn-action-sm btn-resolved" onclick="openReplyModal('${c.id}')"><i class="fas fa-eye"></i> View</button>`;
        } else {
            actionBtn = `<button class="btn-action-sm" onclick="openReplyModal('${c.id}')"><i class="fas fa-reply"></i> View / Reply</button>`;
        }

        let priorityHtml = '';
        if (c.priority === 'High') priorityHtml = `<span class="priority-tag priority-high">[HIGH]</span>`;
        else if (c.priority === 'Medium') priorityHtml = `<span class="priority-tag priority-medium">[MED]</span>`;
        else if (c.priority === 'Low') priorityHtml = `<span class="priority-tag priority-low">[LOW]</span>`;

        let bgClass = '';
        if(c.status === 'Pending') bgClass = 'bg-pending';
        else if(c.status === 'In Progress') bgClass = 'bg-progress';
        else if(c.status === 'Replied') bgClass = 'bg-replied';
        else if(c.status === 'Resolved') bgClass = 'bg-resolved';

        return `
        <tr class="${bgClass}">
            <td class="cell-date">
                <div class="ticket-id">${displayTicketId}</div>
                <div class="ticket-date">${submitted}</div>
            </td>
            <td>
                <div class="member-name">${c.memberName}</div>
                <div class="member-id">Member: ${c.memberId || c.memberEmail || 'Unknown'}</div>
            </td>
            <td>
                <span class="category-tag"><i class="fas fa-tag" style="font-size: 0.8rem; margin-right: 4px;"></i>${c.category}</span>
                ${priorityHtml}
            </td>
            <td><span class="status-pill sp-${statusClass}">${c.status}</span></td>
            <td style="text-align:right;">${actionBtn}</td>
        </tr>
        `;
    }).join('');
}

function openReplyModal(id) {
    const c = allComplaints.find(comp => comp.id === id);
    if (!c) return;

    document.getElementById('complaintId').value = id;
    
    let attachImg = '';
    if (c.photoBase64) {
        attachImg = `<div style="margin-top:20px; text-align:center;"><img src="${c.photoBase64}" style="max-width:100%; max-height: 250px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);"></div>`;
    }

    document.getElementById('cmpCat').innerHTML = '<i class="fas fa-tag"></i> ' + c.category + (c.priority ? ` - Priority: ${c.priority}` : '');
    document.getElementById('cmpDesc').innerHTML = c.description + attachImg;
    
    const thread = document.getElementById('conversationThread');
    let threadHtml = '';
    
    if (c.adminReply && (!c.messages || c.messages.length === 0)) {
        threadHtml += `<div class="thread-block thread-admin">
            <div class="thread-sender-name">ADMIN</div>
            <div class="thread-message-text">${c.adminReply}</div>
        </div>`;
    }
    
    if (c.messages && c.messages.length > 0) {
        threadHtml += c.messages.map(m => {
            const isMember = m.senderRole === 'MEMBER';
            const threadClass = isMember ? 'thread-member' : 'thread-admin';
            const dateStr = m.timestamp ? new Date(m.timestamp).toLocaleString() : '';
            return `<div class="thread-block ${threadClass}">
                <div class="thread-header">
                   <div class="thread-sender-name">${m.senderRole}</div>
                   <div class="thread-date-text">${dateStr}</div>
                </div>
                <div class="thread-message-text">${m.message}</div>
            </div>`;
        }).join('');
    }
    
    if (!threadHtml) {
        threadHtml = '<div style="color: rgba(255,255,255,0.4); font-size: 0.85rem; text-align: center; padding: 10px;">No replies yet...</div>';
    }
    if(thread) thread.innerHTML = threadHtml;
    
    const replyInput = document.getElementById('replyMessage');
    replyInput.value = '';

    // If it's pending, mark as in progress automatically
    if (c.status === 'Pending') {
        fetch(`/api/complaints/${id}/view`, { method: 'PUT' })
        .then(r => r.json())
        .then(updated => {
            const idx = allComplaints.findIndex(comp => comp.id === updated.id);
            if (idx !== -1) {
                allComplaints[idx] = updated;
                renderComplaints();
            }
        }).catch(e => console.error("Could not mark as viewed", e));
    }

    document.getElementById('replyModal').classList.add('open');
}

function closeReplyModal() {
    document.getElementById('replyModal').classList.remove('open');
}

function handleReplySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('complaintId').value;
    const reply = document.getElementById('replyMessage').value.trim();
    
    if(!reply) {
        showUIAlert('Hold On', 'Please enter a reply.', false);
        return;
    }

    const btn = document.getElementById('btnSubmitReply');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    fetch(`/api/complaints/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderRole: 'ADMIN', messageText: reply })
    })
    .then(r => {
        if (!r.ok) throw new Error("Update failed");
        return r.json();
    })
    .then(updated => {
        const idx = allComplaints.findIndex(c => c.id === updated.id);
        if (idx !== -1) {
            allComplaints[idx] = updated;
            renderComplaints();
        }
        closeReplyModal();
        showUIAlert('Success', 'Reply sent successfully.', true);
    })
    .catch(err => {
        console.error(err);
        showUIAlert('Error', 'Failed to update complaint.', false);
    })
    .finally(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

function logout() {
    showUIConfirm('Logout', 'Are you sure you want to logout?', false, function(confirmed) {
        if (confirmed) {
            localStorage.removeItem('adminUser');
            window.location.href = '/login';
        }
    });
}
