// Check authentication
function checkAuth() {
    var raw = localStorage.getItem('adminUser');
    var user = null;
    if (raw) {
        try {
            user = JSON.parse(raw);
        } catch (e) {}
    }
    if (!user || user.role !== 'ADMIN') {
        console.warn('Auth check failed. Dashboard will remain empty as requested.');
        return false;
    }
    try { window.currentUser = user; } catch (e) {}
    return true;
}

if (!checkAuth()) {
    throw new Error('Not authenticated - Stopping script to avoid null errors');
}

function loadData() {
    loadStats();
    loadMembers();
    loadDeletionRequests();
    loadPendingPaymentCount();
}

function loadStats() {
    fetch('/api/auth/members')
        .then(function (r) { return r.json(); })
        .then(function (members) {
            var total = members.length;
            var active = members.filter(function(m){ return (m.packageStatus||'').toUpperCase() === 'ACTIVE'; }).length;
            document.getElementById('totalMembers').textContent = total;
            var h1 = document.getElementById('heroTotalMembers'); if(h1) h1.textContent = total;
            var h2 = document.getElementById('heroActiveMembers'); if(h2) h2.textContent = active;
        })
        .catch(function () {
            document.getElementById('totalMembers').textContent = '0';
        });

    fetch('/api/trainers')
        .then(function (r) { return r.json(); })
        .then(function (trainers) {
            document.getElementById('totalTrainers').textContent = trainers.length || '0';
        })
        .catch(function () {
            document.getElementById('totalTrainers').textContent = '0';
        });

    fetch('/api/payment/all')
        .then(function(r){ return r.json(); })
        .then(function(payments){
            var pending = payments.filter(function(p){ return p.status === 'PENDING'; }).length;
            var h3 = document.getElementById('heroPendingPayments'); if(h3) h3.textContent = pending;
        })
        .catch(function(){});
    fetch('/api/auth/deletion-requests')
        .then(function (r) { return r.json(); })
        .then(function (requests) {
            document.getElementById('pendingRequests').textContent = requests.length;
        })
        .catch(function () {
            document.getElementById('pendingRequests').textContent = '0';
        });
}

function loadDeletionRequests() {
    fetch('/api/auth/deletion-requests')
        .then(function (r) { return r.json(); })
        .then(function (requests) {
            // Update bell badge
            var badge = document.getElementById('notificationCount');
            if (badge) {
                var count = requests && requests.length ? requests.length : 0;
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        })
        .catch(function () { });
}

// Load and populate the deletion requests dropdown
function loadDeletionDropdown() {
    var dropdownBody = document.getElementById('deletionBellBody');
    if (!dropdownBody) return;

    fetch('/api/auth/deletion-requests')
        .then(function (r) { return r.json(); })
        .then(function (requests) {
            if (!requests || requests.length === 0) {
                dropdownBody.innerHTML = '<div class="empty-notif" style="text-align:center;padding:16px;">No deletion requests.</div>';
                return;
            }

            dropdownBody.innerHTML = '';
            requests.slice(0, 6).forEach(function(u) {
                var item = document.createElement('div');
                item.className = 'deletion-bell-item';
                item.style.cssText = 'padding:10px;border-bottom:1px solid rgba(255,255,255,0.1);';
                item.innerHTML =
                    '<div class="nm" style="font-weight:600;margin-bottom:4px;">' + (u.name || 'Unknown') + '</div>' +
                    '<div class="em" style="font-size:0.8rem;margin-bottom:8px;">' + (u.email || '—') + '</div>' +
                    '<div style="display:flex;gap:6px;">' +
                    '  <button style="flex:1;padding:6px;background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3);border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;" onclick="approveDeletionFromDropdown(\'' + u.id + '\')">✓ Approve</button>' +
                    '  <button style="flex:1;padding:6px;background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);border-radius:6px;cursor:pointer;font-size:0.75rem;font-weight:600;" onclick="denyDeletionFromDropdown(\'' + u.id + '\')">✕ Deny</button>' +
                    '</div>';
                dropdownBody.appendChild(item);
            });
            if (requests.length > 6) {
                dropdownBody.insertAdjacentHTML('beforeend',
                    '<div class="empty-notif" style="text-align:center;font-size:0.85rem;padding:8px;">+' + (requests.length - 6) + ' more</div>');
            }
        })
        .catch(function () {
            dropdownBody.innerHTML = '<div style="text-align:center;color:#ef4444;padding:16px;">Failed to load requests</div>';
        });
}

// Open deletion requests dropdown
function toggleDeletionDropdown(event) {
    if (event) event.stopPropagation();
    var dropdown = document.getElementById('deletionBellDropdown');
    if (!dropdown) return;
    var isOpen = dropdown.style.display === 'block';
    if (!isOpen) {
        loadDeletionDropdown();
    }
    dropdown.style.display = isOpen ? 'none' : 'block';
}

// Close deletion dropdown
function closeDeletionDropdown() {
    var dropdown = document.getElementById('deletionBellDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

function loadMembers() {
    var filter = (document.getElementById('memberStatusFilter') || {}).value || 'all';
    var search = ((document.getElementById('memberSearch') || {}).value || '').toLowerCase().trim();
    fetch('/api/auth/members')
        .then(function (r) { return r.json(); })
        .then(function (members) {
            // Apply status filter
            var filtered = members.filter(function (m) {
                var status = (m.packageStatus || '').toUpperCase();
                if (filter === 'active')  return status === 'ACTIVE';
                if (filter === 'paid')    return status === 'PAID';
                if (filter === 'pending') return status === 'PENDING';
                return true;
            });
            // Apply search filter
            if (search) {
                filtered = filtered.filter(function(m) {
                    return (m.email || '').toLowerCase().includes(search);
                });
            }

            var tbody = document.getElementById('membersTableBody');
            tbody.innerHTML = '';
            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:rgba(255,255,255,0.35);padding:28px;">No members found for this filter.</td></tr>';
                return;
            }
            filtered.forEach(function (m, index) {
                var row = document.createElement('tr');
                var pkg = m.membershipPackage ? (m.membershipPackage.charAt(0).toUpperCase() + m.membershipPackage.slice(1)) : 'None';
                var status = (m.packageStatus || 'PENDING').toLowerCase();
                var actDate = m.membershipActivationDate ? new Date(m.membershipActivationDate).toLocaleDateString() : 'N/A';
                var memberIdDisplay = m.membershipId || 'Not assigned';
                
                // Expiring soon logic
                var expireBadge = '';
                if (status === 'active' && m.membershipActivationDate && m.membershipPackage) {
                    var planDays = { monthly: 30, quarterly: 91, annually: 365 };
                    var totalDays = planDays[m.membershipPackage.toLowerCase()] || 30;
                    var activated = new Date(m.membershipActivationDate);
                    var elapsed = Math.floor((new Date() - activated) / (1000 * 60 * 60 * 24));
                    var remaining = Math.max(0, totalDays - elapsed);
                    if (remaining <= 7) {
                        expireBadge = '<span style="display:inline-block;margin-left:8px;background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);padding:2px 8px;border-radius:12px;font-size:0.65rem;font-weight:700;"><i class="fas fa-exclamation-triangle"></i> ' + remaining + ' days left</span>';
                    }
                }

                row.innerHTML =
                    '<td>' + memberIdDisplay + '</td>' +
                    '<td>' + (m.name || '-') + '</td>' +
                    '<td>' + (m.email || '-') + '</td>' +
                    '<td>' + pkg + '</td>' +
                    '<td><span class="status-badge ' + status + '">' + (m.packageStatus || 'PENDING') + '</span>' + expireBadge + '</td>' +
                    '<td>' + actDate + '</td>' +
                    '<td><button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteMember(\'' + m.id + '\',\'' + (m.email || '').replace(/'/g, "\\'") + '\')">Delete</button></td>';
                
                // Entire row opens the detail drawer
                row.style.cursor = 'pointer';
                (function(member) {
                    row.addEventListener('click', function() { openMemberDrawer(member); });
                })(m);

                tbody.appendChild(row);
            });
        })
        .catch(function () {
            var tbody = document.getElementById('membersTableBody');
            tbody.innerHTML = '<tr><td colspan="7">Failed to load members. Is the backend running?</td></tr>';
        });
}

// ===== PAYMENT MANAGEMENT =====

/**
 * Loads pending count and updates the notification badge on the Payments tab.
 */
function loadPendingPaymentCount() {
    fetch('/api/payments/pending-count')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            var badge = document.getElementById('paymentBadge');
            if (data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        })
        .catch(function () { });
}

/**
 * Loads the payments table. Called when Payments tab is opened or Refresh clicked.
 */
function loadPayments() {
    var filter = document.getElementById('paymentStatusFilter').value;
    var url = filter === 'all' ? '/api/payments/all' : '/api/payments/pending';
    var tbody = document.getElementById('paymentsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:rgba(255,255,255,0.35);">Loading...</td></tr>';

    fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (records) {
            tbody.innerHTML = '';
            if (records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:rgba(255,255,255,0.35);padding:32px;">No payment records found.</td></tr>';
                return;
            }
            var pkgNames = { monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' };
            records.forEach(function (rec) {
                var statusClass = rec.status === 'VALIDATED' ? 'status-validated' :
                    rec.status === 'REJECTED' ? 'status-rejected' : 'status-pending';
                var actions = '';
                if (rec.status === 'PENDING_VALIDATION') {
                    actions =
                        '<button class="btn-sm-success" onclick="validatePayment(\'' + rec.id + '\')">✅ Validate</button> ' +
                        '<button class="btn-sm-danger"  onclick="rejectPayment(\'' + rec.id + '\')">❌ Reject</button>';
                } else {
                    actions = '<span style="color:rgba(255,255,255,0.3);font-size:0.82rem;">' + (rec.adminNote || '—') + '</span>';
                }
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td>' + (rec.userName || '—') + '</td>' +
                    '<td style="font-size:0.82rem;">' + (rec.userEmail || '—') + '</td>' +
                    '<td>' + (pkgNames[rec.packageType] || rec.packageType || '—') + '</td>' +
                    '<td>Rs. ' + (rec.amount ? rec.amount.toLocaleString() : '—') + '</td>' +
                    '<td style="font-size:0.8rem;">' + (rec.submittedAt ? new Date(rec.submittedAt).toLocaleString() : '—') + '</td>' +
                    '<td><span class="status-pill ' + statusClass + '">' + rec.status + '</span></td>' +
                    '<td style="white-space:nowrap;">' + actions + '</td>';
                tbody.appendChild(tr);
            });
        })
        .catch(function () {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#ef4444;">Failed to load payments. Is the backend running?</td></tr>';
        });
}

function validatePayment(id) {
    showUIConfirm('Validate Payment', 'The member\'s package will become <b>ACTIVE</b> immediately.<br><br>Proceed with validation?', false, (confirmed) => {
        if (!confirmed) return;
        
        // Use prompt for the optional note since it's an admin flow, but the main confirmation is now sleek
        var note = prompt('Optional note (leave blank for default):', '') || 'Payment validated by admin';
        fetch('/api/payments/validate/' + id, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminNote: note })
        })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
            .then(function (result) {
                if (result.ok) {
                    showUIAlert('✅ Success', 'Payment validated! Member is now ACTIVE.', true);
                    loadPayments();
                    loadPendingPaymentCount();
                    loadMembers();
                } else {
                    showUIAlert('Error', result.data.error || 'Unknown error', false);
                }
            })
            .catch(function () { showUIAlert('Error', 'Request failed.', false); });
    });
}

function rejectPayment(id) {
    var note = prompt('Reason for rejection (shown to member):', 'Payment could not be verified');
    if (note === null) return; // cancelled
    fetch('/api/payments/reject/' + id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: note || 'Payment rejected by admin' })
    })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (result) {
            if (result.ok) {
                alert('❌ Payment rejected.');
                loadPayments();
                loadPendingPaymentCount();
            } else {
                alert('Error: ' + (result.data.error || 'Unknown error'));
            }
        })
        .catch(function () { alert('Request failed.'); });
}

// ===== UI MODAL CONTROLS =====
let uiConfirmCallback = null;

function showUIConfirm(title, messageHtml, isDanger, callback) {
    uiConfirmCallback = callback;
    document.getElementById('uiConfirmTitle').textContent = title;
    document.getElementById('uiConfirmMessage').innerHTML = messageHtml;
    
    const iconBox = document.getElementById('uiConfirmIcon');
    const actionBtn = document.getElementById('uiConfirmActionBtn');
    const box = document.getElementById('uiConfirmBox');
    
    if (isDanger) {
        iconBox.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        iconBox.style.color = '#ef4444';
        iconBox.style.background = 'rgba(239,68,68,0.15)';
        actionBtn.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
        actionBtn.textContent = 'Permanently Delete';
        box.style.borderColor = 'rgba(239,68,68,0.4)';
    } else {
        iconBox.innerHTML = '<i class="fas fa-question-circle"></i>';
        iconBox.style.color = '#38bdf8';
        iconBox.style.background = 'rgba(56,189,248,0.15)';
        actionBtn.style.background = 'linear-gradient(135deg, #0ea5e9, #0284c7)';
        actionBtn.textContent = 'Confirm Action';
        box.style.borderColor = 'rgba(56,189,248,0.4)';
    }
    
    const modal = document.getElementById('uiConfirmModal');
    modal.style.display = 'flex';
    setTimeout(() => box.style.transform = 'scale(1)', 10);
}

function closeUiConfirm(confirmed) {
    document.getElementById('uiConfirmBox').style.transform = 'scale(0.95)';
    setTimeout(() => {
        document.getElementById('uiConfirmModal').style.display = 'none';
        if (uiConfirmCallback) uiConfirmCallback(confirmed);
        uiConfirmCallback = null;
    }, 200);
}

// ===== EXISTING FUNCTIONS =====

// Trainers section will be wired up after team merge

function deleteMember(id, email) {
    const msg = `This will permanently delete:<br><br>
                 <span style="color:#ef4444;"><i class="fas fa-times"></i> Member account (<b>${email || 'User'}</b>)</span><br>
                 <span style="color:#ef4444;"><i class="fas fa-times"></i> Associated membership</span><br><br>
                 All data will be removed. This cannot be undone!`;
                 
    showUIConfirm('⚠️ PERMANENT DELETION', msg, true, (confirmed) => {
        if (!confirmed) return;
        
        fetch('/api/auth/members/' + id, { method: 'DELETE' })
            .then(function (r) {
                if (r.ok) {
                    return r.json().then(function(data) {
                        loadData();
                        // Also replace the success alert!
                        showUIConfirm('✅ Success', `Member deleted permanently.<br><br>Audit Log ID:<br><span style="color:#38bdf8;">${data.auditLogId}</span>`, false, null);
                        document.getElementById('uiCancelBtn').style.display = 'none';
                        document.getElementById('uiConfirmActionBtn').textContent = 'OK';
                    });
                } else {
                    alert('Delete failed.');
                }
            })
            .catch(function () { alert('Request failed.'); });
    });
}

function approveDeletionRequest(id) {
    const msg = `Approve deletion block for this account request:<br><br>
                 <span style="color:#ef4444;"><i class="fas fa-times"></i> Member account</span><br>
                 <span style="color:#ef4444;"><i class="fas fa-times"></i> Associated membership</span><br><br>
                 All data will be permanently removed.`;
                 
    showUIConfirm('⚠️ PERMANENT DELETION', msg, true, (confirmed) => {
        if (!confirmed) return;

        fetch('/api/auth/approve-delete/' + id, { method: 'POST' })
            .then(function (r) {
                if (r.ok) {
                    return r.json().then(function(data) {
                        loadData();
                        closeDeletionDropdown();
                    });
                }
            });
    });
}

// Dropdown action: approve deletion
function approveDeletionFromDropdown(id) {
    showUIConfirm('⚠️ PERMANENT DELETION', 'Approve deletion? This will permanently delete the account.', true, (confirmed) => {
        if (!confirmed) return;
        fetch('/api/auth/approve-delete/' + id, { method: 'POST' })
            .then(function (r) {
                if (r.ok) {
                    loadData();
                    loadDeletionDropdown();
                    closeDeletionDropdown();
                    showUIAlert('✅ Success', 'Account permanently deleted.', true);
                } else {
                    showUIAlert('Error', 'Failed to approve deletion.', false);
                }
            })
            .catch(function () { showUIAlert('Error', 'Request failed.', false); });
    });
}

// Dropdown action: deny deletion
function denyDeletionFromDropdown(id) {
    showUIConfirm('Deny Request', 'Deny this deletion request?', false, (confirmed) => {
        if(!confirmed) return;
        fetch('/api/auth/deny-delete/' + id, { method: 'POST' })
            .then(function (r) {
                if (r.ok) {
                    loadData();
                    loadDeletionDropdown();
                    closeDeletionDropdown();
                    showUIAlert('Denied', 'Deletion request denied.', true);
                } else {
                    showUIAlert('Error', 'Failed to deny deletion.', false);
                }
            })
            .catch(function () { showUIAlert('Error', 'Request failed.', false); });
    });
}

// Expose logout on window so inline onclick handlers work even if execution context differs
window.logout = function() {
    showUIConfirm('Logout', 'Are you sure you want to securely log out?', false, (confirmed) => {
        if (confirmed) {
            try { localStorage.removeItem('adminUser'); } catch (e) { /* ignore */ }
            window.location.href = '/login';
        }
    });
}

document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        document.querySelectorAll('.tab-pane').forEach(function (p) { p.classList.remove('active'); });
        this.classList.add('active');
        var tabId = this.getAttribute('data-tab');
        var pane = document.getElementById(tabId);
        if (pane) pane.classList.add('active');
        // Auto-load payments when Payments tab is clicked
        if (tabId === 'payments') loadPayments();
    });
});

// NOTE: initial loadData() is invoked below after we hook loadStats so the chart gets rendered on first load

// Close dropdown on outside click
document.addEventListener('click', function (e) {
    var dropdown = document.getElementById('deletionBellDropdown');
    if (!dropdown) return;
    var bellBtn = document.querySelector('.icon-button[onclick*="toggleDeletionDropdown"]');
    var clickedInside = dropdown.contains(e.target);
    if (clickedInside) return;
    if (bellBtn && bellBtn.contains(e.target)) return;
    if (dropdown.style.display === 'block') dropdown.style.display = 'none';
});

//  NEW ADMIN FEATURES 

// 1. Export CSV
function exportTableToCSV(filename) {
    var csv = [];
    var rows = document.querySelectorAll("#membersTableBody tr");
    if (rows.length === 0 || (rows.length === 1 && rows[0].innerText.includes("No members found"))) {
        alert("No data to export!");
        return;
    }
    // Headers
    csv.push("Member ID,Name,Email,Membership,Status,Activation");
    
    for (var i = 0; i < rows.length; i++) {
        var cols = rows[i].querySelectorAll("td");
        if (cols.length < 6) continue;
        var rowData = [];
        for (var j = 0; j < 6; j++) { // Skip the Actions column (index 6)
            var text = cols[j].innerText.replace(/"/g, '""');
            // Clean up the status text to remove "Expiring Soon" from the export
            if (j === 4) text = text.replace('Expiring Soon', '').trim();
            rowData.push('"' + text + '"');
        }
        csv.push(rowData.join(","));
    }

    var csvFile = new Blob([csv.join("\n")], { type: "text/csv" });
    var downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// 2. Auto-refresh
var autoRefreshInterval = null;
function toggleAutoRefresh() {
    var toggle = document.getElementById('autoRefreshToggle');
    if (toggle && toggle.checked) {
        // Refresh every 15 seconds
        autoRefreshInterval = setInterval(function() {
            loadData();
        }, 15000);
        // Do an immediate flush just to kick it off
        loadData();
    } else {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }
}

//  Member Detail Drawer 
function openMemberDrawer(m) {
    // Personal details
    document.getElementById('drName').textContent    = m.name  || '';
    document.getElementById('drEmail').textContent   = m.email || '';
    document.getElementById('drPhone').textContent   = m.phone || m.phoneNumber || '';
    document.getElementById('drGender').textContent  = m.gender || '';
    document.getElementById('drAge').textContent     = m.age    || '';
    document.getElementById('drCity').textContent    = m.city   || '';
    document.getElementById('drAddress').textContent = m.address || '';

    // Status pill
    var pill = document.getElementById('drStatusPill');
    var st = (m.packageStatus || 'PENDING').toUpperCase();
    if (st === 'ACTIVE') {
        pill.textContent = ' Active Member';
        pill.style.cssText = 'font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:20px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.4);color:#34d399;';
    } else if (st === 'PAID') {
        pill.textContent = ' Payment Verified';
        pill.style.cssText = 'font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:20px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.4);color:#38bdf8;';
    } else {
        pill.textContent = ' Pending';
        pill.style.cssText = 'font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:20px;background:rgba(148,163,184,0.1);border:1px solid rgba(148,163,184,0.3);color:#94a3b8;';
    }

    // Membership section
    var noMem = document.getElementById('drNoMembership');
    var memCard = document.getElementById('drMemCard');
    if (!m.membershipPackage && st !== 'ACTIVE') {
        noMem.style.display = 'block';
        memCard.style.display = 'none';
    } else {
        noMem.style.display = 'none';
        memCard.style.display = 'block';
        var pkg = m.membershipPackage ? (m.membershipPackage.charAt(0).toUpperCase() + m.membershipPackage.slice(1)) : '';
        document.getElementById('drMemId').textContent   = m.membershipId || '';
        document.getElementById('drPackage').textContent = pkg + ' Membership';
        var actDate = m.membershipActivationDate ? new Date(m.membershipActivationDate) : null;
        document.getElementById('drActivated').textContent = actDate ? actDate.toLocaleDateString() : '';

        // Progress
        var planDays = { monthly: 30, quarterly: 91, annually: 365 };
        var totalDays = planDays[(m.membershipPackage || '').toLowerCase()] || 30;
        if (actDate) {
            var elapsed   = Math.floor((new Date() - actDate) / (1000 * 60 * 60 * 24));
            var remaining = Math.max(0, totalDays - elapsed);
            var pct       = Math.min(100, Math.round((elapsed / totalDays) * 100));
            document.getElementById('drDaysLeft').textContent      = remaining + ' days';
            document.getElementById('drProgressFill').style.width  = pct + '%';
            document.getElementById('drProgStart').textContent     = 'Start: ' + actDate.toLocaleDateString();
            document.getElementById('drProgEnd').textContent       = remaining + ' days left (' + (100 - pct) + '%)';
        } else {
            document.getElementById('drDaysLeft').textContent = '';
            document.getElementById('drProgressFill').style.width = '0%';
        }
    }

    // Open
    document.getElementById('drSendMsgBtn').onclick = function() {
        var queryObj = new URLSearchParams();
        queryObj.set('target', 'SINGLE_MEMBER');
        queryObj.set('id', m.membershipId || '');
        window.location.href = '/admin-notifications?' + queryObj.toString();
    };

    document.getElementById('memberDrawer').classList.add('open');
    document.getElementById('drawerOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeMemberDrawer() {
    document.getElementById('memberDrawer').classList.remove('open');
    document.getElementById('drawerOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

//  Plan Distribution Donut Chart 
var planDonutInstance = null;

function renderPlanDonut(monthly, quarterly, annually, none) {
    var total = monthly + quarterly + annually + none;
    var el = document.getElementById('donutCenterNum');
    if (el) el.textContent = total;
    var lg1 = document.getElementById('lgMonthly');   if(lg1) lg1.textContent = monthly;
    var lg2 = document.getElementById('lgQuarterly'); if(lg2) lg2.textContent = quarterly;
    var lg3 = document.getElementById('lgAnnually');  if(lg3) lg3.textContent = annually;
    var lg4 = document.getElementById('lgNone');      if(lg4) lg4.textContent = none;

    var canvas = document.getElementById('planDonutChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var data = (total === 0)
        ? { vals: [1], colors: ['rgba(255,255,255,0.08)'], labels: ['No Data'] }
        : {
            vals:   [monthly, quarterly, annually, none].filter(function(v){ return v > 0; }),
            colors: ['#38bdf8','#f59e0b','#34d399','rgba(255,255,255,0.15)'].filter(function(_,i){
                return [monthly, quarterly, annually, none][i] > 0;
            }),
            labels: ['Monthly','Quarterly','Annually','No Package'].filter(function(_,i){
                return [monthly, quarterly, annually, none][i] > 0;
            })
          };

    if (planDonutInstance) { planDonutInstance.destroy(); }
    planDonutInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data:            data.vals,
                backgroundColor: data.colors,
                borderWidth:     2,
                borderColor:     'rgba(12,18,38,0.9)',
                hoverBorderWidth:3,
                hoverBorderColor:'rgba(245,158,11,0.6)'
            }]
        },
        options: {
            cutout:   '72%',
            plugins:  { legend: { display: false }, tooltip: { enabled: true } },
            animation: { animateRotate: true, duration: 700 }
        }
    });
}

// Configure Growth Target Base Value
var MONTHLY_GROWTH_TARGET_GOAL = 50;

function renderMonthlyGrowth(members) {
    if (!members) return;
    
    var now = new Date();
    var currentMonth = now.getMonth();
    var currentYear = now.getFullYear();
    
    var lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    var lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    var currentMonthCount = 0;
    var lastMonthCount = 0;

    members.forEach(function(m) {
        if (!m.membershipActivationDate) return;
        var date = new Date(m.membershipActivationDate);
        if (isNaN(date.getTime())) return;
        
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            currentMonthCount++;
        } else if (date.getMonth() === lastMonth && date.getFullYear() === lastYear) {
            lastMonthCount++;
        }
    });

    // Update UI for current month
    var progressPct = Math.min(100, Math.round((currentMonthCount / MONTHLY_GROWTH_TARGET_GOAL) * 100));
    
    var curEl = document.getElementById('growthCurrentMonth');
    if (curEl) curEl.textContent = currentMonthCount;
    
    var tarEl = document.getElementById('growthTargetValue');
    if (tarEl) tarEl.textContent = MONTHLY_GROWTH_TARGET_GOAL;

    var pctTxt = document.getElementById('growthPercentText');
    if (pctTxt) pctTxt.textContent = progressPct + '%';

    var bar = document.getElementById('growthProgressBar');
    if (bar) {
        // slight delay so the transition triggers
        setTimeout(() => bar.style.width = progressPct + '%', 100);
    }

    // Calculate pace vs last month
    var badge = document.getElementById('growthPaceBadge');
    var paceTxt = document.getElementById('growthPaceText');
    
    if (lastMonthCount === 0) {
        if (badge) { badge.innerHTML = '<i class="fas fa-arrow-up"></i> N/A'; badge.style.color = '#10b981'; badge.style.background = 'rgba(16,185,129,0.15)'; }
        if (paceTxt) paceTxt.textContent = 'No baseline data for last month.';
    } else {
        var diff = currentMonthCount - lastMonthCount;
        var pctDiff = Math.abs(Math.round((diff / lastMonthCount) * 100));
        
        if (diff >= 0) {
            if (badge) {
                badge.innerHTML = '<i class="fas fa-arrow-up"></i> ' + pctDiff + '%';
                badge.style.color = '#10b981'; 
                badge.style.background = 'rgba(16,185,129,0.15)';
            }
            if (paceTxt) paceTxt.textContent = "ahead of last month's pace. Keep pushing!";
        } else {
            if (badge) {
                badge.innerHTML = '<i class="fas fa-arrow-down"></i> ' + pctDiff + '%';
                badge.style.color = '#ef4444'; 
                badge.style.background = 'rgba(239,68,68,0.15)';
            }
            if (paceTxt) paceTxt.textContent = "behind last month's pace. Time to hustle!";
        }
    }
}

// Hook into loadStats to populate the chart and growth metrics
var _origLoadStats = loadStats;
loadStats = function() {
    _origLoadStats();
    fetch('/api/auth/members')
        .then(function(r){ return r.json(); })
        .then(function(members){
            var monthly=0, quarterly=0, annually=0, none=0;
            members.forEach(function(m){
                var pkg = (m.membershipPackage || '').toLowerCase();
                if      (pkg === 'monthly')   monthly++;
                else if (pkg === 'quarterly') quarterly++;
                else if (pkg === 'annually')  annually++;
                else                          none++;
            });
            renderPlanDonut(monthly, quarterly, annually, none);
            renderMonthlyGrowth(members);
        }).catch(function(){
            renderPlanDonut(0,0,0,0);
            renderMonthlyGrowth([]);
        });
};

// Run the initial load after hooking into loadStats so the chart renders on first load
loadData();

