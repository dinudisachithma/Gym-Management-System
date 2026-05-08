// Check authentication
function checkAuth() {
    let user = JSON.parse(localStorage.getItem('memberUser'));
    if (!user || (user.role && user.role !== 'MEMBER')) {
        console.warn('Auth missing. Redirecting to login...');
        return false;
    }
    return true;
}

// Guard: redirect if not authenticated
if (!checkAuth()) {
    console.error('Not authenticated - redirecting to login');
    window.location.href = '/login';
}


// Load user data - safe to do this now since we've verified auth above
const currentUser = JSON.parse(localStorage.getItem('memberUser'));
if (!currentUser) {
    console.error('Failed to parse currentUser - redirecting to login');
    window.location.href = '/login';
}

document.getElementById('userName').textContent = (currentUser && currentUser.email ? currentUser.email.split('@')[0] : 'Member');

// Load personal details (from API if we have id, else localStorage)
function loadPersonalDetails() {
    function setProfile(name, email, gender, age, city, phone, address, membership, packageStatus, activationDate, membershipId) {
        console.log('Loading profile:', { name, email, gender, age, city, phone, address });
        document.getElementById('profileName').textContent = name || 'Not set';
        document.getElementById('profileEmail').textContent = email || 'Not set';
        document.getElementById('profileGender').textContent = gender || 'Not set';
        document.getElementById('profileAge').textContent = age != null ? age : 'Not set';
        document.getElementById('profileCity').textContent = city || 'Not set';
        document.getElementById('profilePhone').textContent = phone || 'Not set';
        document.getElementById('profileAddress').textContent = address || 'Not set';
        var hasMembership = membership && packageStatus === 'ACTIVE';
        var isPaid = packageStatus === 'PAID';

        // ── Render profile avatar (photo or letter) ──
        renderMemberAvatar(currentUser.profilePhoto || null, name);
        // If we have an ID, try loading the actual photo from API
        if (currentUser && currentUser.id && currentUser.id !== '123') {
            fetch('/api/auth/members/' + currentUser.id)
                .then(function(r){ return r.ok ? r.json() : null; })
                .then(function(u){
                    if (u && u.profilePhoto) {
                        currentUser.profilePhoto = u.profilePhoto;
                        localStorage.setItem('memberUser', JSON.stringify(currentUser));
                        renderMemberAvatar(u.profilePhoto, u.name);
                    }
                })
                .catch(function(){});
        }
        if (hasMembership) {
            document.getElementById('membershipDisplay').innerHTML =
                '<div class="membership-active"><div class="membership-status">' +
                '<span class="status-badge active">Active</span>' +
                (membershipId ? '<span style="margin-left:10px;background:linear-gradient(135deg,rgba(245,158,11,0.2),rgba(217,119,6,0.15));border:1px solid rgba(245,158,11,0.5);color:#f59e0b;padding:4px 14px;border-radius:6px;font-size:0.82rem;font-weight:700;">' + membershipId + '</span>' : '') +
                '<h4>' + formatPackageName(membership) + ' Membership</h4>' +
                '<p>Activated on ' + (activationDate ? new Date(activationDate).toLocaleDateString() : 'N/A') + '</p></div>' +
                '<div id="memberProgressWrap"></div></div>';
            document.getElementById('packagesSection').style.display = 'none';
        } else if (isPaid) {
            document.getElementById('membershipDisplay').innerHTML =
                '<div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.35);border-radius:10px;padding:20px 24px;">' +
                '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
                '<span style="background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.5);color:#38bdf8;padding:4px 14px;border-radius:20px;font-size:0.82rem;font-weight:600;">✅ Payment Verified</span>' +
                '</div>' +
                '<p style="color:rgba(255,255,255,0.65);font-size:0.93rem;margin:0;">Your payment has been verified by the admin. Your <strong style="color:#fff;">' + formatPackageName(membership) + '</strong> membership package is being set up. It will appear here once activated.</p>' +
                '</div>';
            document.getElementById('packagesSection').style.display = 'none';
        } else {
            // Check if there is a pending payment before showing package cards
            checkPaymentStatus();
            document.getElementById('onboardingTracker').style.display = 'block';
        }
        
        // Hide onboarding if already active/paid
        if (hasMembership || isPaid) {
            var trk = document.getElementById('onboardingTracker');
            if (trk) trk.style.display = 'none';
        }
        
        // Update hero banner and quick stats
        updateHeroAndStats(name, packageStatus, membership, membershipId, activationDate);
    }

    if (currentUser.id && currentUser.id !== '123' && currentUser.id !== '999') {
        console.log('Fetching from API for user ID:', currentUser.id);
        fetch('/api/auth/members/' + currentUser.id)
            .then(function (r) { 
                console.log('API response status:', r.status);
                return r.ok ? r.json() : Promise.reject('API error: ' + r.status);
            })
            .then(function (user) {
                console.log('User data from API:', user);
                setProfile(user.name, user.email, user.gender, user.age, user.city, user.phone, user.address,
                    user.membershipPackage, user.packageStatus,
                    user.membershipActivationDate ? user.membershipActivationDate.toString() : null,
                    user.membershipId || null);
                window.currentMembershipId = user.membershipId || null;
            })
            .catch(function (err) {
                console.warn('API fetch failed, falling back to localStorage:', err);
                loadFromLocal();
            });
        // DO NOT call loadFromLocal here - it's called in the catch block if needed
        return;
    }

    function loadFromLocal() {
        console.log('Loading from localStorage...');
        var members = JSON.parse(localStorage.getItem('registeredMembers')) || [];
        console.log('Registered members:', members);
        var currentMember = members.find(function (member) { return member.email === currentUser.email; });
        console.log('Current member:', currentMember);
        if (currentMember) {
            setProfile(currentMember.fullName, currentMember.email, currentMember.gender, currentMember.age,
                currentMember.city, currentMember.phone, currentMember.address,
                currentMember.membership, currentMember.status, currentMember.activationDate);
        } else {
            console.log('No member found in localStorage, using API data from currentUser');
            // Load whatever we have from the logged-in user object
            setProfile(currentUser.name || 'Not set', currentUser.email || 'Not set', 'Not set', 'Not set', 'Not set', 'Not set', 'Not set', null, 'PENDING', null);
            checkPaymentStatus();
        }
    }

    // If no ID was provided, try to load from localStorage
    loadFromLocal();
}

/**
 * Checks if this member has a payment awaiting admin validation.
 * If yes → shows "Payment Under Review" badge instead of package cards.
 */
function checkPaymentStatus() {
    var email = currentUser && currentUser.email;
    if (!email || currentUser.id === '123' || currentUser.id === '999') {
        showPackageCards();
        updateOnboardingTracker('PENDING');
        return;
    }
    fetch('/api/payments/my-status?email=' + encodeURIComponent(email))
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (data) {
            if (data.status === 'PENDING_VALIDATION') {
                showPendingBadge(data.packageType, data.submittedAt);
                updateOnboardingTracker('PENDING_VALIDATION');
            } else if (data.status === 'REJECTED') {
                showRejectedBanner(data.adminNote);
                updateOnboardingTracker('PENDING');
            } else {
                showPackageCards();
                updateOnboardingTracker('PENDING');
            }
        })
        .catch(function () {
            showPackageCards();
            updateOnboardingTracker('PENDING');
        });
}

function updateOnboardingTracker(status) {
    var tracker = document.getElementById('onboardingTracker');
    if (!tracker) return;
    var line = document.getElementById('trackerLine');
    var s2Circ = document.getElementById('step2Circle');
    var s2Txt = document.getElementById('step2Text');
    var s3Circ = document.getElementById('step3Circle');
    var s3Txt = document.getElementById('step3Text');
    
    if (status === 'PENDING') {
        line.style.width = '25%';
        s2Circ.style.background = 'rgba(20,35,70,1)';
        s2Circ.style.borderColor = '#38bdf8';
        s2Circ.style.color = '#38bdf8';
        s2Circ.style.boxShadow = '0 0 15px rgba(56,189,248,0.3)';
        s2Circ.innerHTML = '<i class="fas fa-credit-card"></i>';
        s2Txt.style.color = '#f0f9ff';
        s2Txt.style.fontWeight = '700';
    } else if (status === 'PENDING_VALIDATION') {
        line.style.width = '100%';
        s2Circ.style.background = '#10b981';
        s2Circ.style.borderColor = '#10b981';
        s2Circ.style.color = '#fff';
        s2Circ.style.boxShadow = '0 0 15px rgba(16,185,129,0.4)';
        s2Circ.innerHTML = '<i class="fas fa-check"></i>';
        s2Txt.style.color = '#10b981';
        
        s3Circ.style.background = 'rgba(20,35,70,1)';
        s3Circ.style.borderColor = '#f59e0b';
        s3Circ.style.color = '#f59e0b';
        s3Circ.style.boxShadow = '0 0 15px rgba(245,158,11,0.3)';
        s3Circ.innerHTML = '<i class="fas fa-hourglass-half"></i>';
        s3Txt.style.color = '#f59e0b';
        s3Txt.style.fontWeight = '700';
        s3Txt.innerText = 'Admin Reviewing';
    }
}

function showPendingBadge(packageType, submittedAt) {
    document.getElementById('membershipDisplay').innerHTML =
        '<div style="background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.35);border-radius:10px;padding:20px 24px;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">' +
        '<span style="background:rgba(234,179,8,0.2);border:1px solid rgba(234,179,8,0.5);color:#eab308;padding:4px 14px;border-radius:20px;font-size:0.82rem;font-weight:600;">⏳ Payment Under Review</span>' +
        '</div>' +
        '<p style="color:rgba(255,255,255,0.65);font-size:0.93rem;margin:0;">Your <strong style="color:#fff;">' + formatPackageName(packageType) + '</strong> membership payment has been securely received and is awaiting admin validation. You will be notified once it\'s approved.</p>' +
        (submittedAt ? '<p style="color:rgba(255,255,255,0.35);font-size:0.8rem;margin-top:8px;">Submitted: ' + new Date(submittedAt).toLocaleString() + '</p>' : '') +
        '</div>';
    document.getElementById('packagesSection').style.display = 'none';
}

function showRejectedBanner(adminNote) {
    // Show rejection notice as informational banner above the packages
    document.getElementById('membershipDisplay').innerHTML =
        '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:16px 24px;margin-bottom:4px;">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">' +
        '<span style="background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#ef4444;padding:4px 14px;border-radius:20px;font-size:0.82rem;font-weight:600;">❌ Previous Payment Rejected</span>' +
        '</div>' +
        '<p style="color:rgba(255,255,255,0.6);font-size:0.9rem;margin:0;">Your previous payment was not validated.' +
        (adminNote ? ' Reason: <em>' + adminNote + '</em>' : '') +
        ' Please choose a package below to submit a new payment request.</p>' +
        '</div>';
    // Still show the package cards so member can try again
    document.getElementById('packagesSection').style.display = 'grid';
}

function showPackageCards() {
    document.getElementById('membershipDisplay').innerHTML =
        '<div class="no-membership"><i class="fas fa-info-circle"></i>' +
        '<p>No membership activated yet. Please choose and activate a package below.</p></div>';
    document.getElementById('packagesSection').style.display = 'grid';
}

function formatPackageName(type) {
    const names = { 'monthly': 'Monthly', 'quarterly': 'Quarterly', 'annually': 'Annually' };
    return names[type] || (type ? type.charAt(0).toUpperCase() + type.slice(1) : '');
}

// Load data on page load
loadPersonalDetails();
setTimeout(loadMemberClasses, 400); // Fetch classes slightly after details

function loadMemberClasses() {
    var id = currentUser.id; // Backend saves the MongoDB _id for assignments
    if (!id || id === '123' || id === '999') {
        document.getElementById('myClassesDisplay').innerHTML = '<div class="no-membership"><i class="fas fa-info-circle"></i><p>Log in to view your scheduled classes.</p></div>';
        return;
    }
    
    fetch('/api/classes/member/' + id)
        .then(function(r) { return r.ok ? r.json() : []; })
        .then(function(classes) {
            var container = document.getElementById('myClassesDisplay');
            if (!container) return;
            if (!classes || classes.length === 0) {
                container.innerHTML = '<div class="no-membership"><i class="fas fa-calendar-times"></i><p>You have not been assigned to any classes yet.</p></div>';
                return;
            }
            
            var html = '<div style="display:flex; flex-direction:column; gap:12px;">';
            classes.forEach(function(c) {
                var clsDate = c.classDate || 'TBD';
                var clsTime = c.classTime || 'TBD';
                var tName = c.trainerName || 'Instructor';
                html += 
                '<div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; display:flex; justify-content:space-between; align-items:center;">' +
                    '<div>' +
                        '<div style="color:#f0f9ff; font-weight:700; font-size:1.05rem; margin-bottom:6px;">' + (c.className || 'Workout Class') + '</div>' +
                        '<div style="color:rgba(255,255,255,0.6); font-size:0.85rem; display:flex; gap:12px; align-items:center;">' +
                            '<span><i class="far fa-calendar-alt" style="color:#38bdf8;"></i> ' + clsDate + '</span>' +
                            '<span><i class="far fa-clock" style="color:#f59e0b;"></i> ' + clsTime + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div style="text-align:right;">' +
                        '<div style="font-size:0.75rem; text-transform:uppercase; color:rgba(255,255,255,0.4); font-weight:700; margin-bottom:4px;">Trainer</div>' +
                        '<div style="color:#34d399; font-weight:600; font-size:0.9rem;">' + tName + '</div>' +
                    '</div>' +
                '</div>';
            });
            html += '</div>';
            container.innerHTML = html;
        })
        .catch(function(err) {
            var container = document.getElementById('myClassesDisplay');
            if (container) {
                container.innerHTML = '<div class="no-membership"><i class="fas fa-exclamation-triangle"></i><p>Unable to load classes at the moment.</p></div>';
            }
        });
}

// Logout function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('memberUser');
        localStorage.removeItem('currentUserDetails');
        window.location.href = '/login';
    }
}

/**
 * Activate: redirect to the payment portal page.
 * The portal (payment.html) handles card entry, validation,
 * submission to /api/payments/submit, and the success/cancel pages.
 */
function redirectToPayment(packageType, amount) {
    var email = (currentUser && currentUser.email) || '';
    if (!email) {
        showUIAlert('Error', 'Could not find your email. Please log in again.', false);
        setTimeout(function() { window.location.href = '/login'; }, 2000);
        return;
    }
    // Redirect to the dedicated payment portal with query params
    window.location.href = '/payment'
        + '?package=' + encodeURIComponent(packageType)
        + '&amount=' + encodeURIComponent(amount)
        + '&email=' + encodeURIComponent(email);
}

// Request delete account – notifies admin; admin can Approve to delete the account
function requestDeleteAccount() {
    showUIConfirm('Confirm Account Deletion', 'Are you sure you want to request account deletion?<br>This request will be sent to the admin for manual approval.', true, function(confirmed) {
        if (confirmed) {
            sendDeleteRequest(currentUser.id, currentUser.email);
        }
    });
}

function sendDeleteRequest(id, email) {
    if (id) {
        fetch('/api/auth/members/' + id + '/request-delete', { method: 'POST' })
            .then(function (r) {
                if (r.ok) {
                    showUIAlert('Success', 'Account deletion request submitted. Admin will review your request.', true);
                } else {
                    return r.json().then(function (d) { showUIAlert('Error', d.error || 'Request failed', false); });
                }
            })
            .catch(function () { showUIAlert('Error', 'Request failed. Is the backend running?', false); });
    } else {
        fetch('/api/auth/request-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        })
            .then(function (r) {
                if (r.ok) {
                    showUIAlert('Success', 'Account deletion request submitted. Admin will review your request.', true);
                } else {
                    return r.json().then(function (d) { showUIAlert('Error', d.error || 'Request failed', false); });
                }
            })
            .catch(function () { showUIAlert('Error', 'Request failed. Is the backend running?', false); });
    }
}

// Complaints gateway (opens complaint form - built by other team)
function submitComplaint() {
    showUIAlert('Notice', 'Complaints gateway: Will redirect to complaints form. (Handled by complaints module)', true);
    // window.location.href = 'complaints.html'; // When complaints page exists
}

// ==========================================
// AVATAR HELPERS
// ==========================================
function getAvatarColor(name) {
    var palette = ['#7c3aed','#2563eb','#0891b2','#059669','#d97706','#dc2626','#db2777','#4f46e5'];
    if (!name) return palette[0];
    return palette[name.charCodeAt(0) % palette.length];
}

function makeAvatarEl(photo, name, size) {
    size = size || 36;
    if (photo) {
        return '<img src="' + photo + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;object-fit:cover;border:2px solid rgba(245,158,11,0.5);flex-shrink:0;" alt="">';
    }
    var letter = (name || '?')[0].toUpperCase();
    var bg = getAvatarColor(name);
    return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + bg + ';display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:' + Math.round(size * 0.42) + 'px;flex-shrink:0;border:2px solid rgba(245,158,11,0.5);">' + letter + '</div>';
}

function renderMemberAvatar(photo, name) {
    var wrap = document.getElementById('heroAvatarEl');
    if (!wrap) return;
    if (photo) {
        wrap.outerHTML = '<img id="heroAvatarEl" class="avatar-img" src="' + photo + '" alt="Profile" onclick="viewFullProfilePhoto()">';
    } else {
        var letter = (name || '?')[0].toUpperCase();
        var bg = getAvatarColor(name);
        wrap.style.background = bg;
        wrap.textContent = letter;
        wrap.style.fontSize = '1.45rem';
    }
}

function handleAvatarUpload(event) {
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
            // Resize to max 300x300 on canvas
            var MAX = 300;
            var canvas = document.createElement('canvas');
            var scale = Math.min(MAX / img.width, MAX / img.height, 1);
            canvas.width  = Math.round(img.width  * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            var base64 = canvas.toDataURL('image/jpeg', 0.82);

            // Update UI immediately
            var heroEl = document.getElementById('heroAvatarEl');
            if (heroEl) {
                // Replace letter div with img
                var newImg = document.createElement('img');
                newImg.id = 'heroAvatarEl';
                newImg.className = 'avatar-img';
                newImg.src = base64;
                newImg.alt = 'Profile';
                newImg.onclick = viewFullProfilePhoto;
                heroEl.parentNode.replaceChild(newImg, heroEl);
            }

            // Save to backend
            if (currentUser && currentUser.id) {
                fetch('/api/auth/members/' + currentUser.id)
                    .then(function(r){ return r.ok ? r.json() : {}; })
                    .then(function(u){
                        u.profilePhoto = base64;
                        return fetch('/api/auth/members/' + currentUser.id, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(u)
                        });
                    })
                    .then(function(r){
                        if (r.ok) {
                            currentUser.profilePhoto = base64;
                            localStorage.setItem('memberUser', JSON.stringify(currentUser));
                            showUIAlert('Photo Updated', 'Profile photo saved!', true);
                        } else {
                            showUIAlert('Error', 'Could not save photo. Try again.', false);
                        }
                    })
                    .catch(function(){ showUIAlert('Error', 'Could not save photo. Try again.', false); });
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    event.target.value = '';
}

function viewFullProfilePhoto() {
    var photoSrc = '';
    
    // First check currentUser memory, then check hero element for base64 if just uploaded
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

// Report gateway (opens reports - built by other team)
function openReport() {
    showUIAlert('Notice', 'Report gateway: Will redirect to reports. (Handled by reports module)', true);
    // window.location.href = 'reports.html'; // When reports page exists
}

//  Hero banner + quick stats (purely UI, no logic change) 
function updateHeroAndStats(name, packageStatus, membership, membershipId, activationDate) {
    var heroName = document.getElementById('heroName');
    if (heroName && name && name !== 'Not set') {
        heroName.textContent = 'Welcome back, ' + name.split(' ')[0] + '! ';
    }
    var pill = document.getElementById('heroPill');
    if (pill) {
        if (packageStatus === 'ACTIVE') {
            pill.textContent = ' Active Member';
            pill.className = 'hero-membership-pill pill-active';
        } else if (packageStatus === 'PAID') {
            pill.textContent = ' Payment Verified';
            pill.className = 'hero-membership-pill pill-paid';
        } else {
            pill.textContent = ' Pending';
            pill.className = 'hero-membership-pill pill-pending';
        }
    }
    var planEl = document.getElementById('statPlan');
    if (planEl) planEl.textContent = membership ? formatPackageName(membership) : '';
    var idEl = document.getElementById('statMemberId');
    if (idEl) idEl.textContent = membershipId || '';
    var daysEl = document.getElementById('statDaysLeft');
    if (daysEl && activationDate && membership) {
        var planDays = { monthly: 30, quarterly: 91, annually: 365 };
        var key = (membership || '').toLowerCase();
        var totalDays = planDays[key] || 30;
        var activated = new Date(activationDate);
        var now = new Date();
        var elapsed = Math.floor((now - activated) / (1000 * 60 * 60 * 24));
        var remaining = Math.max(0, totalDays - elapsed);
        daysEl.textContent = remaining;
        var pct = Math.min(100, Math.round((elapsed / totalDays) * 100));
        var progressWrap = document.getElementById('memberProgressWrap');
        if (progressWrap) {
            progressWrap.innerHTML =
                '<div class="progress-wrap">' +
                '<div class="progress-label">' +
                '<span>Start: ' + activated.toLocaleDateString() + '</span>' +
                '<span>' + remaining + ' days left (' + (100 - pct) + '%)</span>' +
                '</div>' +
                '<div class="progress-bar-track">' +
                '<div class="progress-bar-fill" style="width:' + pct + '%;"></div>' +
                '</div></div>';
        }
    } else if (daysEl) {
        daysEl.textContent = '';
    }
}

// --- Notifications Dropdown Logic ---
function toggleNotificationDropdown(e) {
    if(e) e.stopPropagation();
    var dd = document.getElementById('notificationDropdown');
    if (dd.style.display === 'none' || dd.style.display === '') {
        dd.style.display = 'block';
        loadMemberNotifications();
    } else {
        dd.style.display = 'none';
    }
}

document.addEventListener('click', function(e) {
    var dd = document.getElementById('notificationDropdown');
    var btn = document.querySelector('.notifications .icon-button');
    if (dd && dd.style.display === 'block') {
        if (!dd.contains(e.target) && (!btn || !btn.contains(e.target))) {
            dd.style.display = 'none';
        }
    }
});

function loadMemberNotifications() {
    var id = window.currentMembershipId || currentUser.id;
    if (!id) return;

    fetch('/api/notifications/member-feed?memberId=' + encodeURIComponent(id))
        .then(function(r) { return r.ok ? r.json() : []; })
        .then(function(notifications) {
            updateNotificationUI(notifications);
        })
        .catch(function(err) {
            console.error('Failed to load notifications', err);
        });
}

function updateNotificationUI(notifications) {
    var unreadCount = notifications.filter(function(n) { return n.status === 'UNREAD'; }).length;
    var badge = document.getElementById('notificationCount');
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    var body = document.getElementById('notificationBody');
    if (!body) return;

    if (notifications.length === 0) {
        body.innerHTML = '<div style="text-align:center; padding: 20px; color: rgba(255,255,255,0.5);">No notifications.</div>';
        return;
    }

    var html = '';
    notifications.forEach(function(n) {
        var isUnread = n.status === 'UNREAD';
        var typeKey = (n.type || 'INFO').toUpperCase();
        var dateStr = n.createdAt ? new Date(n.createdAt).toLocaleString() : '';

        // Color palette per type
        var typeColors = {
            'INFO':    { bg: 'rgba(56,189,248,0.18)',   border: '#38bdf8',   text: '#38bdf8',   icon: 'fa-info-circle' },
            'ALERT':   { bg: 'rgba(245,158,11,0.18)',   border: '#f59e0b',   text: '#f59e0b',   icon: 'fa-exclamation-triangle' },
            'WARNING': { bg: 'rgba(245,158,11,0.18)',   border: '#f59e0b',   text: '#f59e0b',   icon: 'fa-exclamation-triangle' },
            'DANGER':  { bg: 'rgba(239,68,68,0.18)',    border: '#ef4444',   text: '#f87171',   icon: 'fa-times-circle' },
            'ERROR':   { bg: 'rgba(239,68,68,0.18)',    border: '#ef4444',   text: '#f87171',   icon: 'fa-times-circle' },
            'SUCCESS': { bg: 'rgba(16,185,129,0.18)',   border: '#10b981',   text: '#34d399',   icon: 'fa-check-circle' },
            'NOTICE':  { bg: 'rgba(168,85,247,0.18)',   border: '#a855f7',   text: '#c084fc',   icon: 'fa-bell' }
        };
        var tc = typeColors[typeKey] || typeColors['INFO'];

        var cardBorderColor = isUnread ? tc.border : 'rgba(255,255,255,0.1)';
        var cardBg = isUnread ? tc.bg.replace('0.18', '0.08') : 'rgba(255,255,255,0.03)';
        var msgBorderColor = tc.border + '66';

        html += '<div class="deletion-bell-item notif-type-' + typeKey.toLowerCase() + '" style="border-left:3px solid ' + cardBorderColor + '; background:' + cardBg + '; transition:all 0.2s; margin-bottom:8px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:flex-start;">' +
                '<div class="nm" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">' +
                (n.title || 'Notification') +
                '<span style="display:inline-flex; align-items:center; gap:4px; background:' + tc.bg + '; border:1px solid ' + tc.border + '; color:' + tc.text + '; padding:3px 8px; border-radius:20px; font-size:0.62rem; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap;">' +
                '<i class="fas ' + tc.icon + '"></i> ' + (n.type || 'INFO') + '</span>' +
                '</div>' +
                (isUnread ? '<span style="font-size:0.6rem; background:' + tc.border + '; color:#0c1222; font-weight:800; padding:2px 8px; border-radius:10px; white-space:nowrap; flex-shrink:0;">NEW</span>' : '') +
                '</div>' +
                '<div class="em" style="margin:6px 0 4px; border-left:2px solid ' + msgBorderColor + '; padding-left:8px; margin-left:2px;">' + (n.message || '') + '</div>' +
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">' +
                '<div class="date-str" style="font-size:0.72rem;">' + dateStr + '</div>' +
                '<div style="display:flex; gap:6px;">' +
                (isUnread ? '<button onclick="event.stopPropagation(); readSpecificNotification(\'' + n.id + '\', this.closest(\'.deletion-bell-item\'))" style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:6px; color:#34d399; cursor:pointer; font-size:0.75rem; padding:4px 8px; transition:all 0.2s;"><i class="fas fa-check"></i> Read</button>' : '') +
                '<button onclick="event.stopPropagation(); deleteSpecificNotification(\'' + n.id + '\')" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); border-radius:6px; color:#f87171; cursor:pointer; font-size:0.75rem; padding:4px 8px; transition:all 0.2s;"><i class="fas fa-trash-alt"></i> Dismiss</button>' +
                '</div></div></div>';
    });
    body.innerHTML = html;
}


function readSpecificNotification(id, el) {
    if (el) {
        el.style.borderLeftColor = 'transparent';
        el.style.opacity = '0.7';
        var badgeLabel = el.querySelector('span[style*="NEW"]');
        if (badgeLabel) badgeLabel.style.display = 'none';
    }
    fetch('/api/notifications/' + encodeURIComponent(id) + '/read', { method: 'POST' })
        .then(function() {
            setTimeout(loadMemberNotifications, 500);
        });
}

function deleteSpecificNotification(id) {
    if (!confirm("Are you sure you want to dismiss this notification?")) return;
    fetch('/api/notifications/' + encodeURIComponent(id), { method: 'DELETE' })
        .then(function(res) {
            if (res.ok) {
                setTimeout(loadMemberNotifications, 200);
            } else {
                showUIAlert('Error', 'Failed to dismiss notification', false);
            }
        })
        .catch(function(e) {
            console.error("Error deleting notification", e);
        });
}
function markAllNotificationsRead() {
    var dd = document.getElementById('notificationDropdown');
    if (dd) dd.style.display = 'none';
}

//  Rotating motivational quotes 
(function initQuote() {
    var quotes = [
        '<strong>"The only bad workout</strong> is the one that didn\'t happen."',
        '<strong>"Push yourself</strong> because no one else is going to do it for you."',
        '<strong>"Your body can stand almost anything.</strong> It\'s your mind you have to convince."',
        '<strong>"Success starts with self-discipline.</strong> Train hard, stay consistent."',
        '<strong>"Strive for progress,</strong> not perfection."',
        '<strong>"Every rep counts.</strong> Every day matters. Keep going."',
        '<strong>"Iron is the best antidepressant.</strong> Earn it today."'
    ];
    var el = document.getElementById('quoteText');
    if (el) {
        var today = new Date().getDay();
        el.innerHTML = quotes[today % quotes.length];
    }
})();

// Initialize notifications on load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadMemberNotifications, 600);
    
    // Close modals on outside click (with smooth animation)
    document.querySelectorAll('.modal-overlay').forEach(function(modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                var mc = modal.querySelector('.modal-content');
                modal.classList.add('closing');
                if (mc) mc.classList.add('closing');
                setTimeout(function() {
                    modal.classList.remove('open', 'closing');
                    if (mc) mc.classList.remove('closing');
                }, 300);
            }
        });
    });
});

// ------ MODALS: EDIT DETAILS & CHANGE PASSWORD ------

function openEditModal() {
    // Pre-fill fields from displayed profile
    document.getElementById('editEmail').value = document.getElementById('profileEmail').textContent === 'Not set' ? (currentUser.email || '') : document.getElementById('profileEmail').textContent;
    document.getElementById('editName').value = document.getElementById('profileName').textContent === 'Not set' ? '' : document.getElementById('profileName').textContent;
    document.getElementById('editAge').value = document.getElementById('profileAge').textContent === 'Not set' ? '' : document.getElementById('profileAge').textContent;
    document.getElementById('editPhone').value = document.getElementById('profilePhone').textContent === 'Not set' ? '' : document.getElementById('profilePhone').textContent;
    document.getElementById('editCity').value = document.getElementById('profileCity').textContent === 'Not set' ? '' : document.getElementById('profileCity').textContent;
    document.getElementById('editAddress').value = document.getElementById('profileAddress').textContent === 'Not set' ? '' : document.getElementById('profileAddress').textContent;

    var overlay = document.getElementById('editModal');
    overlay.classList.remove('closing');
    var mc = overlay.querySelector('.modal-content');
    if (mc) mc.classList.remove('closing');
    overlay.classList.add('open');
}

function closeEditModal() {
    var overlay = document.getElementById('editModal');
    var mc = overlay.querySelector('.modal-content');
    overlay.classList.add('closing');
    if (mc) mc.classList.add('closing');
    setTimeout(function() {
        overlay.classList.remove('open', 'closing');
        if (mc) mc.classList.remove('closing');
    }, 300);
}

function handleEditSubmit(e) {
    e.preventDefault();
    
    // Manual validation check to trigger red borders if invalid
    let valid = true;
    ['editName','editAge','editPhone','editCity','editAddress'].forEach(id => {
        let el = document.getElementById(id);
        if(el) { el.dispatchEvent(new Event('input')); }
    });
    // check if any are red
    ['editName','editAge','editPhone','editCity','editAddress'].forEach(id => {
        let el = document.getElementById(id);
        if(el && el.style.borderColor === 'rgb(239, 68, 68)') valid = false;
        if(el && el.style.borderColor === '#ef4444') valid = false;
    });
    if(!valid) return;
    
    var btn = document.getElementById('btnSaveEdit');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;
    
    var updatedData = {
        name: document.getElementById('editName').value.trim(),
        age: parseInt(document.getElementById('editAge').value),
        phone: document.getElementById('editPhone').value.trim(),
        city: document.getElementById('editCity').value.trim(),
        address: document.getElementById('editAddress').value.trim()
    };

    fetch('/api/auth/members/' + currentUser.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    })
    .then(function(res) {
        if (!res.ok) throw new Error("Failed to update profile");
        return res.json();
    })
    .then(function(d) {
        // Update localStorage
        currentUser.name = updatedData.name;
        localStorage.setItem('memberUser', JSON.stringify(currentUser));
        
        // Refresh UI
        document.getElementById('profileName').textContent = updatedData.name;
        document.getElementById('profileAge').textContent = updatedData.age;
        document.getElementById('profilePhone').textContent = updatedData.phone;
        document.getElementById('profileCity').textContent = updatedData.city;
        document.getElementById('profileAddress').textContent = updatedData.address;
        
        var heroName = document.getElementById('heroName');
        if (heroName) heroName.textContent = 'Welcome back, ' + updatedData.name.split(' ')[0] + '! ';
        
        showUIAlert("Success", "Profile updated successfully!", true);
        closeEditModal();
    })
    .catch(function(err) {
        console.error(err);
        showUIAlert("Error", "Server error connecting to backend.", false);
    })
    .finally(function() {
        btn.innerHTML = 'Save Changes';
        btn.disabled = false;
    });
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

function handlePassSubmit(e) {
    e.preventDefault();
    var currentPass = document.getElementById('currentPass').value;
    var newPass = document.getElementById('newPass').value;
    var confirmPass = document.getElementById('confirmPass').value;
    
    var matchErr = document.getElementById('matchErr');
    var srvErr = document.getElementById('passServerErr');
    matchErr.style.display = 'none';
    srvErr.style.display = 'none';
    
    let valid = true;
    ['currentPass','newPass','confirmPass'].forEach(id => {
        let el = document.getElementById(id);
        if(el) { el.dispatchEvent(new Event('input')); }
        if(el && el.style.borderColor === 'rgb(239, 68, 68)') valid = false;
        if(el && el.style.borderColor === '#ef4444') valid = false;
    });

    if (newPass !== confirmPass) {
        matchErr.style.display = 'block';
        valid = false;
    }
    
    if(!valid) return;
    
    var btn = document.getElementById('btnSavePass');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    btn.disabled = true;
    
    fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, currentPassword: currentPass, newPassword: newPass })
    })
    .then(function(res) {
        return res.json().then(function(data) {
            if (res.ok) {
                showUIAlert("Success", "Password updated securely!", true);
                closePassModal();
            } else {
                srvErr.textContent = data.error || "Incorrect current password";
                srvErr.style.display = 'block';
                document.getElementById('currentPass').style.borderColor = '#ef4444';
            }
        });
    })
    .catch(function(err) {
        console.error(err);
        srvErr.textContent = "Server error occurred.";
        srvErr.style.display = 'block';
    })
    .finally(function() {
        btn.innerHTML = 'Update Password';
        btn.disabled = false;
    });
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
// FEEDBACK MODAL
// ==========================================
var _trainersCache = null;

function openFeedbackModal() {
    document.getElementById('feedbackModal').classList.add('open');
    document.getElementById('feedbackForm').reset();
    // Reset to GYM target
    setFeedbackTarget('GYM');
    // Preload trainers in the background
    loadTrainersForFeedback();
}

function closeFeedbackModal() {
    document.getElementById('feedbackModal').classList.remove('open');
}

function setFeedbackTarget(target) {
    document.getElementById('fbTargetType').value = target;
    document.getElementById('fbTrainerId').value = '';
    var gymBtn     = document.getElementById('fbBtnGym');
    var trainerBtn = document.getElementById('fbBtnTrainer');
    var picker     = document.getElementById('fbTrainerPickerWrap');
    if (target === 'GYM') {
        gymBtn.classList.add('active');
        trainerBtn.classList.remove('active');
        picker.classList.remove('visible');
    } else {
        trainerBtn.classList.add('active');
        gymBtn.classList.remove('active');
        picker.classList.add('visible');
        loadTrainersForFeedback();
    }
}

function onTrainerSelectChange() {
    var sel = document.getElementById('fbTrainerSelect');
    document.getElementById('fbTrainerId').value = sel.value;
}

function loadTrainersForFeedback() {
    var sel = document.getElementById('fbTrainerSelect');
    if (!sel) return;
    if (_trainersCache) {
        populateTrainerSelect(_trainersCache);
        return;
    }
    fetch('/api/trainers')
        .then(function(r){ return r.ok ? r.json() : []; })
        .then(function(trainers){
            _trainersCache = trainers;
            populateTrainerSelect(trainers);
        })
        .catch(function(){
            sel.innerHTML = '<option value="">— Could not load trainers —</option>';
        });
}

function populateTrainerSelect(trainers) {
    var sel = document.getElementById('fbTrainerSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select a Trainer —</option>';
    trainers.forEach(function(t){
        var opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = t.name + (t.specialization ? ' (' + t.specialization + ')' : '');
        sel.appendChild(opt);
    });
    // Re-apply current selection
    var current = document.getElementById('fbTrainerId').value;
    if (current) sel.value = current;
}

function submitFeedback(event) {
    event.preventDefault();

    // Validate trainer is selected when target is TRAINER
    var targetType = document.getElementById('fbTargetType').value;
    var trainerId  = document.getElementById('fbTrainerId').value;
    if (targetType === 'TRAINER' && !trainerId) {
        showUIAlert('Select Trainer', 'Please choose a trainer from the dropdown.', false);
        return;
    }

    // Validate comment: optional but if typed must be >= 20 chars
    var commentVal = document.getElementById('fbComment').value.trim();
    var commentErr = document.getElementById('fbCommentErr');
    var commentTA  = document.getElementById('fbComment');
    if (commentVal.length > 0 && commentVal.length < 20) {
        if (commentErr) commentErr.style.display = 'block';
        if (commentTA)  commentTA.style.borderColor = '#ef4444';
        commentTA.focus();
        return;
    } else {
        if (commentErr) commentErr.style.display = 'none';
        if (commentTA)  commentTA.style.borderColor = 'rgba(255,255,255,0.15)';
    }

    var btn = event.target.querySelector('button[type="submit"]');
    var ogText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;

    // Find trainer name for denormalization
    var trainerName = '';
    if (targetType === 'TRAINER' && _trainersCache) {
        var t = _trainersCache.find(function(x){ return x.id === trainerId; });
        if (t) trainerName = t.name;
    }

    // Get the member's current profile photo (if loaded in DOM)
    var heroImg = document.getElementById('heroAvatarEl');
    var memberPhoto = (heroImg && heroImg.tagName === 'IMG') ? heroImg.src : null;

    var payload = {
        memberId: currentUser.id,
        memberName: document.getElementById('profileName').textContent,
        memberProfilePhoto: memberPhoto,
        targetType: targetType,
        trainerId: trainerId || null,
        trainerName: trainerName || null,
        rating: parseInt(document.getElementById('fbRating').value),
        comment: document.getElementById('fbComment').value,
        anonymous: document.getElementById('fbAnonymous').checked
    };

    fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(function(res) {
        if(!res.ok) throw new Error('Failed to submit feedback');
        return res.json();
    })
    .then(function() {
        showUIAlert('Thank You!', 'Your feedback has been submitted. It helps us improve Royal Gym.', true);
        closeFeedbackModal();
    })
    .catch(function(err) {
        console.error(err);
        showUIAlert('Error', 'An error occurred submitting feedback. Please try again later.', false);
    })
    .finally(function() {
        btn.innerHTML = ogText;
        btn.disabled = false;
    });
}

// ==========================================
// BMI CALCULATOR MODAL
// ==========================================
window.openBmiModal = function() {
    document.getElementById('bmiModal').classList.add('open');
    document.getElementById('bmiForm').reset();
    var unitSelect = document.getElementById('bmiUnits');
    if (unitSelect) unitSelect.value = 'imperial';
    if (window.toggleBmiUnits) window.toggleBmiUnits();
    if (window.clearBmiResult) window.clearBmiResult();
};

window.closeBmiModal = function() {
    document.getElementById('bmiModal').classList.remove('open');
};

window.toggleBmiUnits = function() {
    var unit = document.getElementById('bmiUnits').value;
    var htCm = document.getElementById('bmiHeightCm');
    var htImp = document.getElementById('bmiHeightImperial');
    var wtKg = document.getElementById('bmiWeightKg');
    var wtLbs = document.getElementById('bmiWeightLbs');
    var htLbl = document.getElementById('bmiHeightLabel');
    var wtLbl = document.getElementById('bmiWeightLabel');
    var htFt = document.getElementById('bmiHeightFt');
    var htIn = document.getElementById('bmiHeightIn');

    if (unit === 'metric') {
        htCm.style.display = 'block'; htCm.required = true;
        htImp.style.display = 'none'; htFt.required = false; htIn.required = false;
        wtKg.style.display = 'block'; wtKg.required = true;
        wtLbs.style.display = 'none'; wtLbs.required = false;
        htLbl.textContent = 'Height (cm)';
        wtLbl.textContent = 'Weight (kg)';
    } else {
        htCm.style.display = 'none'; htCm.required = false;
        htImp.style.display = 'flex'; htFt.required = true; htIn.required = true;
        wtKg.style.display = 'none'; wtKg.required = false;
        wtLbs.style.display = 'block'; wtLbs.required = true;
        htLbl.textContent = 'Height (ft / in)';
        wtLbl.textContent = 'Weight (lbs)';
    }
};

window.clearBmiResult = function() {
    var title = document.getElementById('bmiResultTitle');
    if (title) title.style.opacity = '0.3';
    var val = document.getElementById('bmiValue');
    if (val) val.textContent = '--';
    var catText = document.getElementById('bmiCategoryText');
    if (catText) {
        catText.textContent = '(--)';
        catText.style.color = 'rgba(255,255,255,0.4)';
    }
    var marker = document.getElementById('bmiMarker');
    if (marker) {
        marker.classList.remove('show');
        marker.style.left = '0%';
    }
};

window.clearBmiForm = function() {
    document.getElementById('bmiForm').reset();
    window.clearBmiResult();
    window.toggleBmiUnits(); // resets to currently selected dropdown unit
};

window.calculateBMI = function(event) {
    if (event) event.preventDefault();
    
    var unit = document.getElementById('bmiUnits').value;
    var weight, heightM;

    if (unit === 'metric') {
        weight = parseFloat(document.getElementById('bmiWeightKg').value);
        var cm = parseFloat(document.getElementById('bmiHeightCm').value);
        heightM = cm / 100;
    } else {
        weight = parseFloat(document.getElementById('bmiWeightLbs').value) * 0.453592;
        var ft = parseFloat(document.getElementById('bmiHeightFt').value);
        var ins = parseFloat(document.getElementById('bmiHeightIn').value) || 0;
        var totalInches = (ft * 12) + ins;
        heightM = totalInches * 0.0254;
    }

    if (isNaN(weight) || isNaN(heightM) || heightM === 0) return;

    var bmi = weight / (heightM * heightM);
    var roundedBmi = bmi.toFixed(1);
    
    var category = '';
    var col = '';
    var pct = 0; 
    
    if (bmi < 18.5) {
        category = 'Underweight';
        col = '#fcd34d'; 
        var range = Math.max(10, bmi) - 10;
        pct = (range / 8.5) * 25;
    } else if (bmi < 25) {
        category = 'Normal';
        col = '#34d399'; 
        var range = bmi - 18.5;
        pct = 25 + (range / 6.5) * 25;
    } else if (bmi < 30) {
        category = 'Overweight';
        col = '#fb923c'; 
        var range = bmi - 25;
        pct = 50 + (range / 5) * 25;
    } else {
        category = 'Obesity';
        col = '#f87171'; 
        var range = Math.min(45, bmi) - 30;
        pct = 75 + (range / 15) * 25;
    }

    pct = Math.max(2, Math.min(98, pct)); // clamp marker indicator

    document.getElementById('bmiResultTitle').style.opacity = '1';
    document.getElementById('bmiValue').textContent = roundedBmi;
    
    var catEl = document.getElementById('bmiCategoryText');
    catEl.textContent = '(' + category + ')';
    catEl.style.color = col;
    
    var marker = document.getElementById('bmiMarker');
    marker.classList.add('show');
    marker.style.borderBottomColor = col;
    marker.style.left = pct + '%';
};

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
