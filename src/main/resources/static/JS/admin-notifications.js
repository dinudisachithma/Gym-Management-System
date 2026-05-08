var allMembersCache = [];
var allTrainersCache = [];

function setActiveFilterButton(filter) {
    document.querySelectorAll('.filter-btn').forEach(function (b) {
        b.classList.toggle('active', (b.getAttribute('data-filter') || '') === filter);
    });
}

function formatDateTime(value) {
    if (!value) return '-';
    var d = new Date(value);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString();
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderNotificationFeed(items) {
    var feed = document.getElementById('notifFeed');
    if (!feed) return;

    feed.innerHTML = '';

    if (!items || items.length === 0) {
        feed.innerHTML = '<div class="notif-item" style="text-align:center;color:rgba(255,255,255,0.45);padding:28px;">No notifications found.</div>';
        return;
    }

    items.forEach(function (n) {
        var status = (n.status || 'UNREAD').toUpperCase();
        var isUnread = status === 'UNREAD';

        var statusClass = isUnread ? 'notif-status-unread' : 'notif-status-read';
        var statusLabel = isUnread ? 'UNREAD' : 'READ';

        var memberId = n.memberId || '-';
        var memberName = n.memberName ? (' (' + n.memberName + ')') : '';

        var statusPill = '<span class="notif-status-pill ' + statusClass + '">' + statusLabel + '</span>';

        var isForAdmin = (n.targetGroup === 'ADMIN');
        var actionsHtml = '';
        if (isForAdmin) {
            if (isUnread) {
                actionsHtml += '<button class="notif-action-btn notif-action-read" onclick="markNotificationRead(\'' + n.id + '\')"><i class="fas fa-check"></i> Mark as Read</button>';
            } else {
                actionsHtml += '<button class="notif-action-btn notif-action-read" disabled style="opacity:0.5;cursor:not-allowed;"><i class="fas fa-check"></i> Read</button>';
            }
        }
        actionsHtml += ' <button class="notif-action-btn notif-action-delete" onclick="deleteNotification(\'' + n.id + '\')"><i class="fas fa-trash"></i> Delete</button>';

        var typeClass = 'notif-item-' + escapeHtml((n.type || 'info').toLowerCase());
        
        var itemHtml =
            '<div class="notif-item ' + typeClass + '">' +
            '  <div class="notif-item-top">' +
            '    <div>' +
            '      <div class="notif-item-title">' + escapeHtml(n.title) + 
            '        <span class="notif-tag tag-' + escapeHtml((n.type || 'info').toLowerCase()) + '">' + escapeHtml(n.type || 'INFO') + '</span>' +
            '      </div>' +
            '      <div class="notif-item-meta">' +
            '        <span><b>Member ID:</b> ' + escapeHtml(memberId) + escapeHtml(memberName) + '</span>' +
            '        <span><b>Target:</b> ' + escapeHtml(n.targetGroup || '-') + '</span>' +
            '        <span><b>Sent by:</b> ' + escapeHtml(n.senderName || '-') + '</span>' +
            '      </div>' +
            '    </div>' +
            '    ' + statusPill +
            '  </div>' +
            '  <div class="notif-message">' + escapeHtml(n.message) + '</div>' +
            '  <div class="notif-item-footer">' +
            '    <div class="notif-date"><i class="fas fa-clock"></i> ' + escapeHtml(formatDateTime(n.createdAt)) + '</div>' +
            '    <div class="notif-actions">' + actionsHtml + '</div>' +
            '  </div>' +
            '</div>';

        feed.insertAdjacentHTML('beforeend', itemHtml);
    });
}

function loadNotificationFeed(filter) {
    setActiveFilterButton(filter);
    fetch('/api/notifications/feed?filter=' + encodeURIComponent(filter))
        .then(function (r) { return r.json(); })
        .then(function (items) {
            // Sort items by createdAt descending (newest first)
            if (items && items.length > 0) {
                items.sort(function(a, b) {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                });
            }
            renderNotificationFeed(items);
        })
        .catch(function () {
            renderNotificationFeed([]);
        });
}

function loadMembersForSingle(autoSelectId) {
    var select = document.getElementById('notifMemberSelect');
    if (!select) return;

    fetch('/api/auth/members')
        .then(function (r) { return r.json(); })
        .then(function (members) {
            allMembersCache = members || [];
            select.innerHTML = '<option value="">Select member...</option>';
            (allMembersCache || [])
                .filter(function (m) { return m.membershipId; })
                .forEach(function (m) {
                    var mid = m.membershipId;
                    var name = m.name || '';
                    var label = mid + (name ? (' - ' + name) : '');
                    var opt = document.createElement('option');
                    opt.value = mid;
                    opt.textContent = label;
                    select.appendChild(opt);
                });
            if (autoSelectId) {
                select.value = autoSelectId;
            }
            onSingleMemberChanged();
        })
        .catch(function () {
            select.innerHTML = '<option value="">Failed to load members</option>';
        });
}

function loadTrainersForSingle(autoSelectId) {
    var select = document.getElementById('notifTrainerSelect');
    if (!select) return;

    fetch('/api/trainers')
        .then(function (r) { return r.json(); })
        .then(function (trainers) {
            allTrainersCache = trainers || [];
            if (allTrainersCache.length === 0) {
                select.innerHTML = '<option value="">No trainers available yet...</option>';
            } else {
                select.innerHTML = '<option value="">Select trainer...</option>';
                allTrainersCache.forEach(function (m) {
                    var label = m.id + ' - ' + m.name;
                    var opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = label;
                    select.appendChild(opt);
                });
            }
            if (autoSelectId) {
                select.value = autoSelectId;
            }
            onSingleTrainerChanged();
        })
        .catch(function () {
            select.innerHTML = '<option value="">Failed to load trainers</option>';
        });
}

function onTargetScopeChange(autoSelectId) {
    var scope = document.getElementById('notifTargetScope').value;
    var memWrap = document.getElementById('singleMemberWrap');
    var trWrap = document.getElementById('singleTrainerWrap');
    
    if (memWrap) memWrap.style.display = (scope === 'SINGLE_MEMBER') ? 'block' : 'none';
    if (trWrap) trWrap.style.display = (scope === 'SINGLE_TRAINER') ? 'block' : 'none';

    if (scope === 'SINGLE_MEMBER') {
        if (allMembersCache.length === 0) loadMembersForSingle(autoSelectId);
        else onSingleMemberChanged();
    } else if (scope === 'SINGLE_TRAINER') {
        if (allTrainersCache.length === 0) loadTrainersForSingle(autoSelectId);
        else onSingleTrainerChanged();
    }
}

function onSingleMemberChanged() {
    var select = document.getElementById('notifMemberSelect');
    var meta = document.getElementById('notifSingleMeta');
    if (!select || !meta) return;

    var mid = select.value;
    if (!mid) {
        meta.style.display = 'none';
        return;
    }

    var member = (allMembersCache || []).find(function (m) { return m.membershipId === mid; });
    var nameEl = document.getElementById('notifMemberNameDisplay');
    var emailEl = document.getElementById('notifMemberEmailDisplay');
    if (nameEl) nameEl.value = member && member.name ? member.name : '';
    if (emailEl) emailEl.value = member && member.email ? member.email : '';
    meta.style.display = 'block';
}

function onSingleTrainerChanged() {
    var select = document.getElementById('notifTrainerSelect');
    var meta = document.getElementById('notifTrainerSingleMeta');
    if (!select || !meta) return;

    var tid = select.value;
    if (!tid) {
        meta.style.display = 'none';
        return;
    }

    var trainer = (allTrainersCache || []).find(function (t) { return t.id === tid; });
    var nameEl = document.getElementById('notifTrainerNameDisplay');
    var emailEl = document.getElementById('notifTrainerEmailDisplay');
    if (nameEl) nameEl.value = trainer && trainer.name ? trainer.name : '';
    if (emailEl) emailEl.value = trainer && trainer.email ? trainer.email : '';
    meta.style.display = 'block';
}

function sendNotification() {
    var title = document.getElementById('notifTitle').value.trim();
    var message = document.getElementById('notifMessage').value.trim();
    var type = document.getElementById('notifType').value;
    var senderName = document.getElementById('notifSenderName').value.trim();
    var targetScope = document.getElementById('notifTargetScope').value;
    var memberId = '';
    
    if (targetScope === 'SINGLE_MEMBER') {
        memberId = document.getElementById('notifMemberSelect') ? document.getElementById('notifMemberSelect').value : '';
        if (!memberId) { showUIAlert('Hold On', 'Please select a member.', false); return; }
    } else if (targetScope === 'SINGLE_TRAINER') {
        memberId = document.getElementById('notifTrainerSelect') ? document.getElementById('notifTrainerSelect').value : '';
        if (!memberId) { showUIAlert('Hold On', 'Please select a trainer.', false); return; }
    }

    if (!type || !targetScope) {
        showUIAlert('Hold On', 'Please select a notification type and target.', false);
        return;
    }

    var valid = true;
    if (title.length < 3) {
        var el = document.getElementById('notifTitle');
        if(el) { el.style.borderColor = '#ef4444'; el.dispatchEvent(new Event('input')); }
        valid = false;
    }
    if (message.length < 12) {
        var el = document.getElementById('notifMessage');
        if(el) { el.style.borderColor = '#ef4444'; el.dispatchEvent(new Event('input')); }
        valid = false;
    }
    if (senderName.length < 2) {
        var el = document.getElementById('notifSenderName');
        if(el) { el.style.borderColor = '#ef4444'; el.dispatchEvent(new Event('input')); }
        valid = false;
    }

    if (!valid) return;

    fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: title,
            message: message,
            type: type,
            senderName: senderName,
            targetScope: targetScope,
            memberId: memberId
        })
    })
        .then(function (r) { return r.json(); })
        .then(function (result) {
            // Reset UI
            document.getElementById('notifMessage').value = '';
            document.getElementById('notifTitle').style.borderColor = 'rgba(255,255,255,0.14)';
            document.getElementById('notifMessage').style.borderColor = 'rgba(255,255,255,0.14)';
            document.getElementById('notifSenderName').style.borderColor = 'rgba(255,255,255,0.14)';
            
            // clear error spans
            ['notifTitleError', 'notifMessageError', 'notifSenderNameError'].forEach(id => {
               var err = document.getElementById(id);
               if(err) err.style.display = 'none';
            });

            loadNotificationFeed('all');
            showUIAlert('Delivered', 'Notification sent successfully!', true);
        })
        .catch(function (e) {
            showUIAlert('Error', 'Failed to send notification.', false);
        });
}

function markNotificationRead(id) {
    fetch('/api/notifications/' + encodeURIComponent(id) + '/read', { method: 'POST' })
        .then(function () {
            loadNotificationFeed('all');
        })
        .catch(function () {
            showUIAlert('Error', 'Failed to mark read.', false);
        });
}

function deleteNotification(id) {
    showUIConfirm('Delete Notification', 'Are you sure you want to delete this notification?', true, function(confirmed) {
        if (!confirmed) return;
        fetch('/api/notifications/' + encodeURIComponent(id), { method: 'DELETE' })
            .then(function () {
                loadNotificationFeed('all');
            })
            .catch(function () {
                showUIAlert('Error', 'Failed to delete notification.', false);
            });
    });
}

function attachLiveValidations() {
    const fields = [
        { id: 'notifTitle', errMsg: 'Title required (min 3 chars)', validate: v => v && v.trim().length >= 3 },
        { id: 'notifMessage', errMsg: 'Message required (min 12 chars)', validate: v => v && v.trim().length >= 12 },
        { id: 'notifSenderName', errMsg: 'Sender name required', validate: v => v && v.trim().length >= 2 }
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) {
            let errDiv = document.createElement('div');
            errDiv.id = f.id + 'Error';
            errDiv.style.color = '#f87171';
            errDiv.style.fontSize = '0.82rem';
            errDiv.style.marginTop = '5px';
            errDiv.style.display = 'none';
            el.parentNode.insertBefore(errDiv, el.nextSibling);

            el.addEventListener('input', () => {
                const val = el.value;
                if (!val) {
                    el.style.borderColor = 'rgba(255,255,255,0.14)';
                    errDiv.style.display = 'none';
                } else if (f.validate(val)) {
                    el.style.borderColor = '#10b981'; // Green
                    errDiv.style.display = 'none';
                } else {
                    el.style.borderColor = '#ef4444'; // Red
                    errDiv.textContent = f.errMsg;
                    errDiv.style.display = 'block';
                }
            });
        }
    });
}

window.addEventListener('load', function () {
    attachLiveValidations();
    loadNotificationFeed('all');

    // Parse URL params for pre-filling Target and ID
    var urlParams = new URLSearchParams(window.location.search);
    var targetParam = urlParams.get('target');
    var idParam = urlParams.get('id');

    if (idParam) {
        // Came from a direct action, lock in the target and hide the redundant dropdown
        var scopeTarget = document.getElementById('notifTargetScope');
        if (scopeTarget) {
            scopeTarget.value = targetParam;
            scopeTarget.disabled = true;
        }

        if (targetParam === 'SINGLE_MEMBER') {
            var mSelect = document.getElementById('notifMemberSelect');
            var mLabel = document.querySelector('label[for="notifMemberSelect"]');
            if (mSelect) mSelect.style.display = 'none';
            if (mLabel) mLabel.style.display = 'none';
        } else if (targetParam === 'SINGLE_TRAINER') {
            var tSelect = document.getElementById('notifTrainerSelect');
            var tLabel = document.querySelector('label[for="notifTrainerSelect"]');
            if (tSelect) tSelect.style.display = 'none';
            if (tLabel) tLabel.style.display = 'none';
        }
    } else {
        if (targetParam === 'SINGLE_MEMBER' || targetParam === 'SINGLE_TRAINER') {
            var scopeTarget = document.getElementById('notifTargetScope');
            if (scopeTarget) scopeTarget.value = targetParam;
        }
    }
    
    onTargetScopeChange(idParam);
});

