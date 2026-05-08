/* =============================================================
   PT Module – pt-script.js
   Payment Tracking / Membership Management frontend logic.
   Belongs to team member's feature.
   ============================================================= */

var ptEditingId = null; // tracks which record is being edited

var PT_PACKAGE_PRICES = {
    'Monthly': 3500,
    'Quarterly': 9500,
    'Annually': 32000
};

// ── Toast helper ──
function ptToast(msg, type) {
    type = type || 'success';
    var t = document.getElementById('ptToast');
    t.textContent = msg;
    t.className = 'pt-toast ' + type + ' show';
    setTimeout(function () { t.classList.remove('show'); }, 3000);
}

// ── Load payment verification requests ──
function ptLoadPayments() {
    var filter = (document.getElementById('ptPayFilter') || {}).value || 'pending';
    var url = filter === 'all' ? '/api/payments/all' : '/api/payments/pending';
    var tbody = document.getElementById('ptPayBody');
    tbody.innerHTML = '<tr><td colspan="7" class="pt-empty"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (records) {
            tbody.innerHTML = '';
            if (!records.length) {
                tbody.innerHTML = '<tr><td colspan="7" class="pt-empty"><i class="fas fa-inbox"></i>No payment requests found.</td></tr>';
                return;
            }
            var pkgMap = { monthly: 'Monthly', quarterly: 'Quarterly', annually: 'Annually' };
            records.forEach(function (rec) {
                var planMapped = pkgMap[rec.packageType] || rec.packageType || 'Monthly';
                var actions = '';
                if (rec.status === 'PENDING_VALIDATION') {
                    actions =
                        '<button class="pt-btn-validate" onclick="ptValidate(\'' + rec.id + '\',\'' +
                            (rec.userName || '').replace(/'/g, "\\'") + '\',\'' +
                            planMapped + '\',\'' + (rec.amount || 0) + '\')"><i class="fas fa-check"></i> Validate</button> ' +
                        '<button class="pt-btn-reject" onclick="ptReject(\'' + rec.id + '\')"><i class="fas fa-times"></i> Reject</button>';
                } else if (rec.status === 'VALIDATED') {
                    // Validated: no button needed, form was already pre-filled
                    actions = '<span style="color:rgba(34,197,94,0.7);font-size:0.8rem;"><i class="fas fa-check-circle" style="margin-right:4px;"></i>Validated</span>';
                } else {
                    // REJECTED — show note in actions
                    actions = '<span style="color:rgba(239,68,68,0.75);font-size:0.8rem;"><i class="fas fa-ban" style="margin-right:4px;"></i>' + (rec.adminNote || 'Rejected') + '</span>';
                }
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td>' + (rec.userName || '—') + '</td>' +
                    '<td>' + (rec.userEmail || '—') + '</td>' +
                    '<td>' + (pkgMap[rec.packageType] || rec.packageType || '—') + '</td>' +
                    '<td>Rs. ' + (rec.amount ? rec.amount.toLocaleString() : '—') + '</td>' +
                    '<td>' + (rec.submittedAt ? new Date(rec.submittedAt).toLocaleString() : '—') + '</td>' +
                    '<td>' + actions + '</td>';
                tbody.appendChild(tr);
            });
        })
        .catch(function () {
            tbody.innerHTML = '<tr><td colspan="7" class="pt-empty" style="color:#f87171;"><i class="fas fa-exclamation-circle"></i> Failed to load. Is the backend running?</td></tr>';
        });
}

function ptValidate(id, memberName, planType, amount) {
    showUIConfirm('Validate Payment', 'Validate this payment for <strong style="color:#f0f9ff">' + (memberName || 'this member') + '</strong>?', false, function(confirmed) {
        if (!confirmed) return;
        fetch('/api/payments/validate/' + id, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminNote: 'Payment validated by admin' })
        })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
            .then(function (res) {
                if (res.ok) {
                    ptToast('✅ Payment verified! Membership form filled — set the dates and save.', 'success');
                    var filterEl = document.getElementById('ptPayFilter');
                    if (filterEl) filterEl.value = 'pending';
                    ptLoadPayments();
                    ptPrefillForm(memberName, planType, amount);
                }
                else ptToast('Error: ' + (res.data.error || 'Unknown'), 'error');
            })
            .catch(function () { ptToast('Request failed.', 'error'); });
    });
}

// ── Pre-fill form from payment record ──
function ptPrefillForm(memberName, planType, amount) {
    ptResetForm();
    document.getElementById('ptName').value   = memberName || '';
    document.getElementById('ptPlan').value   = planType   || 'Monthly';
    document.getElementById('ptAmount').value = amount     || '';
    document.getElementById('ptStatus').value = 'active';  // auto-select Active on validate
    ptAutoEndDate();
    document.getElementById('ptFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    ptToast('Form pre-filled — set the dates and click Save!', 'info');
}

function ptReject(id) {
    var note = prompt('Reason for rejection:', 'Payment could not be verified');
    if (note === null) return;
    fetch('/api/payments/reject/' + id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNote: note || 'Rejected by admin' })
    })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
            if (res.ok) { ptToast('Payment rejected.', 'info'); ptLoadPayments(); }
            else ptToast('Error: ' + (res.data.error || 'Unknown'), 'error');
        })
        .catch(function () { ptToast('Request failed.', 'error'); });
}

// ── Load memberships table ──
function ptLoadMemberships() {
    var tbody = document.getElementById('ptMemberBody');
    tbody.innerHTML = '<tr><td colspan="9" class="pt-empty"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';

    fetch('/api/pt/memberships')
        .then(function (r) { return r.json(); })
        .then(function (list) {
            tbody.innerHTML = '';
            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="8" class="pt-empty"><i class="fas fa-clipboard-list"></i>No memberships yet. Use the form above to create one.</td></tr>';
                return;
            }
            list.forEach(function (m) {
                var statusClass = m.paymentStatus === 'active' ? 'pt-badge-active' : 'pt-badge-pending';
                var statusLabel = m.paymentStatus === 'active' ? 'Active' : 'Pending';
                
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td><span class="pt-id-chip">' + m.memberId + '</span></td>' +
                    '<td>' + (m.memberName || '—') + '</td>' +
                    '<td>' + (m.planType || '—') + '</td>' +
                    '<td>' + (m.startDate || '—') + '</td>' +
                    '<td>' + (m.endDate || '—') + '</td>' +
                    '<td>Rs. ' + (m.amount ? m.amount.toLocaleString() : '0') + '</td>' +
                    '<td><span class="pt-badge ' + statusClass + '">' + statusLabel + '</span></td>' +
                    '<td>' +
                        '<div class="pt-actions">' +
                            '<button class="pt-btn-edit" onclick="ptEdit(\'' + m.id + '\')"><i class="fas fa-pen"></i> Edit</button>' +
                            '<button class="pt-btn-del"  onclick="ptDelete(\'' + m.id + '\')"><i class="fas fa-trash"></i> Delete</button>' +
                            '<button class="pt-btn-pay"  onclick="ptTogglePayment(\'' + m.id + '\',\'' + m.paymentStatus + '\')"><i class="fas fa-sync-alt"></i> Update Status</button>' +
                        '</div>' +
                    '</td>';
                tbody.appendChild(tr);
            });
        })
        .catch(function () {
            tbody.innerHTML = '<tr><td colspan="8" class="pt-empty" style="color:#f87171;"><i class="fas fa-exclamation-circle"></i> Failed to load memberships.</td></tr>';
        });
}

// ── Real-Time Visual Validation ──
function ptValidateFields() {
    var valid = true;
    var name = document.getElementById('ptName');
    var start = document.getElementById('ptStart');
    var end = document.getElementById('ptEnd');
    var amt = document.getElementById('ptAmount');
    var defaultBorder = 'rgba(255,255,255,0.15)';
    var errorBorder = '#ef4444';
    
    // Name validation
    if (!name.value.trim()) { name.style.borderColor = errorBorder; valid = false; }
    else { name.style.borderColor = defaultBorder; }
    
    // Date Logic
    var today = new Date();
    today.setHours(0,0,0,0);
    var startD = new Date(start.value);
    var endD = new Date(end.value);
    
    if (start.value && !isNaN(startD)) {
        if (!ptEditingId && startD < today) { start.style.borderColor = errorBorder; valid = false; }
        else { start.style.borderColor = defaultBorder; }
    } else {
        start.style.borderColor = errorBorder; valid = false;
    }
    
    if (end.value && !isNaN(endD)) {
        if (start.value && !isNaN(startD) && endD <= startD) {
            end.style.borderColor = errorBorder; valid = false;
        } else {
            end.style.borderColor = defaultBorder;
        }
    } else {
        end.style.borderColor = errorBorder; valid = false;
    }
    
    // Amount Logic
    if (!amt.value || parseFloat(amt.value) < 0) {
        amt.style.borderColor = errorBorder; valid = false;
    } else {
        amt.style.borderColor = defaultBorder;
    }
    
    return valid;
}

document.getElementById('ptName').addEventListener('input', ptValidateFields);
document.getElementById('ptStart').addEventListener('change', ptValidateFields);
document.getElementById('ptEnd').addEventListener('change', ptValidateFields);
document.getElementById('ptAmount').addEventListener('input', ptValidateFields);

// ── Form submit (create or update) ──
document.getElementById('ptForm').addEventListener('submit', function (e) {
    e.preventDefault();
    ptValidateFields();

    // ── VALIDATION ──
    var memberName = document.getElementById('ptName').value.trim();
    var planType   = document.getElementById('ptPlan').value.trim();
    var startDate  = document.getElementById('ptStart').value.trim();
    var endDate    = document.getElementById('ptEnd').value.trim();
    var amount     = document.getElementById('ptAmount').value.trim();
    var status     = document.getElementById('ptStatus').value.trim();

    // Check member name
    if (!memberName) {
        ptToast('❌ Member name is required.', 'error');
        document.getElementById('ptName').focus();
        return;
    }

    // Check plan type
    if (!planType) {
        ptToast('❌ Plan type is required.', 'error');
        document.getElementById('ptPlan').focus();
        return;
    }

    // Check start date
    if (!startDate) {
        ptToast('❌ Start date is required.', 'error');
        document.getElementById('ptStart').focus();
        return;
    }

    // Validate start date format
    var startDateObj = new Date(startDate);
    if (isNaN(startDateObj.getTime())) {
        ptToast('❌ Invalid start date format.', 'error');
        document.getElementById('ptStart').focus();
        return;
    }

    var today = new Date();
    today.setHours(0,0,0,0);
    // Ensure start date is not in the past (unless editing an existing past membership)
    if (!ptEditingId && startDateObj < today) {
        ptToast('❌ Start date cannot be in the past.', 'error');
        document.getElementById('ptStart').focus();
        return;
    }

    // Check end date
    if (!endDate) {
        ptToast('❌ End date is required.', 'error');
        document.getElementById('ptEnd').focus();
        return;
    }

    // Validate end date format
    var endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
        ptToast('❌ Invalid end date format.', 'error');
        document.getElementById('ptEnd').focus();
        return;
    }

    // Check that end date is strictly after start date
    if (endDateObj <= startDateObj) {
        ptToast('❌ End date must be after the start date.', 'error');
        document.getElementById('ptEnd').focus();
        return;
    }

    // Check amount
    if (!amount) {
        ptToast('❌ Amount is required.', 'error');
        document.getElementById('ptAmount').focus();
        return;
    }

    // Validate amount is a positive number
    var amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        ptToast('❌ Amount must be a positive number.', 'error');
        document.getElementById('ptAmount').focus();
        return;
    }

    // Check payment status
    if (!status) {
        ptToast('❌ Payment status is required.', 'error');
        document.getElementById('ptStatus').focus();
        return;
    }

    // ── All validations passed ──
    var data = {
        memberName:    memberName,
        planType:      planType,
        startDate:     startDate,
        endDate:       endDate,
        amount:        amountNum,
        paymentStatus: status
    };

    var url    = ptEditingId ? '/api/pt/memberships/' + ptEditingId : '/api/pt/memberships';
    var method = ptEditingId ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(function (r) { return r.json(); })
        .then(function (saved) {
            if (saved.error) { ptToast('Error: ' + saved.error, 'error'); return; }
            ptToast(ptEditingId ? '✅ Membership updated!' : '✅ Membership created! ID: ' + saved.memberId, 'success');
            ptResetForm();
            ptLoadMemberships();
        })
        .catch(function () { ptToast('Save failed.', 'error'); });
});

// ── Edit: prefill form ──
function ptEdit(id) {
    fetch('/api/pt/memberships')
        .then(function (r) { return r.json(); })
        .then(function (list) {
            var m = list.find(function (x) { return x.id === id; });
            if (!m) return;
            document.getElementById('ptName').value   = m.memberName || '';
            document.getElementById('ptPlan').value   = m.planType   || 'Monthly';
            document.getElementById('ptStart').value  = m.startDate  || '';
            document.getElementById('ptEnd').value    = m.endDate    || '';
            document.getElementById('ptAmount').value = m.amount     || '';
            document.getElementById('ptStatus').value = m.paymentStatus || 'pending';
            ptEditingId = id;
            document.getElementById('ptEditBanner').classList.add('visible');
            document.getElementById('ptCancelBtn').classList.add('visible');
            document.getElementById('ptSaveBtn').innerHTML = '<i class="fas fa-save"></i> Update';
            document.getElementById('ptFormCard').scrollIntoView({ behavior: 'smooth' });
        });
}

// ── Delete ──
function ptDelete(id) {
    showUIConfirm('Confirm Deletion', 'Are you sure you want to delete this membership record?<br>This action cannot be undone.', true, function(confirmed) {
        if (!confirmed) return;
        fetch('/api/pt/memberships/' + id, { method: 'DELETE' })
            .then(function (r) {
                if (r.ok) { ptToast('Deleted successfully.', 'info'); ptLoadMemberships(); }
                else ptToast('Delete failed.', 'error');
            })
            .catch(function () { ptToast('Request failed.', 'error'); });
    });
}

// ── Toggle payment status ──
function ptTogglePayment(id, current) {
    var next = current === 'active' ? 'pending' : 'active';
    showUIConfirm('Change Payment Status', 'Change the member\\\'s payment status to <strong style="color:#f0f9ff">"' + next + '"</strong>?', false, function(confirmed) {
        if (!confirmed) return;
        fetch('/api/pt/memberships/' + id + '/payment', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentStatus: next })
        })
            .then(function (r) { return r.json(); })
            .then(function () { ptToast('Status updated to ' + next + '.', 'success'); ptLoadMemberships(); })
            .catch(function () { ptToast('Update failed.', 'error'); });
    });
}

// ── Reset form ──
function ptResetForm() {
    document.getElementById('ptForm').reset();
    ptEditingId = null;
    document.getElementById('ptEditBanner').classList.remove('visible');
    document.getElementById('ptCancelBtn').classList.remove('visible');
    document.getElementById('ptSaveBtn').innerHTML = '<i class="fas fa-save"></i> Save';
    ptAutoAmount();
}

// ── Auto-fill amount based on plan type ──
function ptAutoAmount() {
    var plan = document.getElementById('ptPlan').value;
    if (PT_PACKAGE_PRICES[plan]) {
        document.getElementById('ptAmount').value = PT_PACKAGE_PRICES[plan];
    }
}

// ── Auto-fill end date based on plan type + start date ──
function ptAutoEndDate() {
    var start = document.getElementById('ptStart').value;
    var plan  = document.getElementById('ptPlan').value;
    if (!start || !plan) return;

    var d = new Date(start);
    if (isNaN(d.getTime())) return;

    if (plan === 'Monthly')    d.setMonth(d.getMonth() + 1);
    else if (plan === 'Quarterly') d.setMonth(d.getMonth() + 3);
    else if (plan === 'Annually')  d.setFullYear(d.getFullYear() + 1);

    // Format as YYYY-MM-DD
    var yyyy = d.getFullYear();
    var mm   = String(d.getMonth() + 1).padStart(2, '0');
    var dd   = String(d.getDate()).padStart(2, '0');
    document.getElementById('ptEnd').value = yyyy + '-' + mm + '-' + dd;
}

// ── Init ──
window.addEventListener('load', function () {
    ptLoadPayments();
    ptLoadMemberships();

    // Set minimum date to today for start date input
    var todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('ptStart').setAttribute('min', todayStr);

    document.getElementById('ptStart').addEventListener('change', function() {
        // Automatically ensure end date cannot be before start date
        document.getElementById('ptEnd').setAttribute('min', this.value);
        ptAutoEndDate();
    });
    document.getElementById('ptPlan').addEventListener('change', function() {
        ptAutoEndDate();
        ptAutoAmount();
    });

    // Enforce fixed package prices
    document.getElementById('ptAmount').readOnly = true;
    ptAutoAmount();
});
