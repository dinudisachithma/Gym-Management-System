// Edit Profile – load from API or localStorage, save to API or localStorage, redirect to member-dashboard
(function() {
    function getCurrentUser() {
        let u;
        try { u = JSON.parse(localStorage.getItem('memberUser')); } catch (e) {}
        if (!u || u.role !== 'MEMBER') {
            u = { role: 'MEMBER', email: 'testmember@royal.com', name: 'Test Member', id: '123' };
            localStorage.setItem('memberUser', JSON.stringify(u));
        }
        return u;
    }

    var currentUser = getCurrentUser();

    function loadUserData() {
        if (currentUser.id && currentUser.id !== '123' && currentUser.id !== '999') {
            fetch('/api/auth/members/' + currentUser.id)
                .then(function(r) {
                    if (!r.ok) throw new Error('Failed to load');
                    return r.json();
                })
                .then(function(user) {
                    document.getElementById('fullName').value = user.name || '';
                    document.getElementById('email').value = user.email || '';
                    document.getElementById('gender').value = user.gender || '';
                    document.getElementById('age').value = user.age || '';
                    document.getElementById('city').value = user.city || '';
                    document.getElementById('phone').value = user.phone || '';
                    document.getElementById('address').value = user.address || '';
                })
                .catch(function() {
                    showUIAlert('Notice', 'Could not load profile. Using local data.', false);
                    loadFromLocal();
                });
        } else {
            loadFromLocal();
        }
    }

    function loadFromLocal() {
        var members = JSON.parse(localStorage.getItem('registeredMembers') || '[]');
        var m = members.find(function(member) { return member.email === currentUser.email; });
        if (m) {
            document.getElementById('fullName').value = m.fullName || '';
            document.getElementById('email').value = m.email || '';
            document.getElementById('gender').value = m.gender || '';
            document.getElementById('age').value = m.age || '';
            document.getElementById('city').value = m.city || '';
            document.getElementById('phone').value = m.phone || '';
            document.getElementById('address').value = m.address || '';
        } else {
            document.getElementById('fullName').value = currentUser.name || '';
            document.getElementById('email').value = currentUser.email || '';
            document.getElementById('gender').value = '';
            document.getElementById('age').value = '';
            document.getElementById('city').value = '';
            document.getElementById('phone').value = '';
            document.getElementById('address').value = '';
        }
    }

    document.getElementById('editProfileForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var name = document.getElementById('fullName').value.trim();
        var email = document.getElementById('email').value.trim();
        var gender = document.getElementById('gender').value;
        var ageAttr = document.getElementById('age').value;
        var age = parseInt(ageAttr, 10);
        var city = document.getElementById('city').value.trim();
        var phone = document.getElementById('phone').value.trim();
        var address = document.getElementById('address').value.trim();

        var valid = true;
        if (name.length < 2) { document.getElementById('fullName').dispatchEvent(new Event('input')); valid = false; }
        if (isNaN(age) || age < 18) { document.getElementById('age').dispatchEvent(new Event('input')); valid = false; }
        if (city.length < 2) { document.getElementById('city').dispatchEvent(new Event('input')); valid = false; }
        if (!/^[0-9+\-\s()]+$/.test(phone) || phone.length < 10) { document.getElementById('phone').dispatchEvent(new Event('input')); valid = false; }
        if (address.length < 5) { document.getElementById('address').dispatchEvent(new Event('input')); valid = false; }

        if (!valid) return;

        if (currentUser.id && currentUser.id !== '123' && currentUser.id !== '999') {
            fetch('/api/auth/members/' + currentUser.id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    gender: gender,
                    age: age,
                    city: city,
                    phone: phone,
                    address: address
                })
            })
                .then(function(r) {
                    if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || 'Save failed'); });
                    return r.json();
                })
                .then(function() {
                    if (email !== currentUser.email) {
                        currentUser.email = email;
                        localStorage.setItem('memberUser', JSON.stringify(currentUser));
                    }
                    showUIAlert('Success', 'Profile updated successfully!', true, () => {
                        window.location.href = '/member-dashboard';
                    });
                })
                .catch(function(err) {
                    showUIAlert('Error', err.message || 'Failed to save.', false);
                });
        } else {
            var members = JSON.parse(localStorage.getItem('registeredMembers') || '[]');
            var idx = members.findIndex(function(m) { return m.email === currentUser.email; });
            if (idx !== -1) {
                members[idx].fullName = name;
                members[idx].email = email;
                members[idx].gender = gender;
                members[idx].age = age;
                members[idx].city = city;
                members[idx].phone = phone;
                members[idx].address = address;
                localStorage.setItem('registeredMembers', JSON.stringify(members));
                if (email !== currentUser.email) {
                    currentUser.email = email;
                    localStorage.setItem('memberUser', JSON.stringify(currentUser));
                }
            }
            showUIAlert('Success', 'Profile updated successfully!', true, () => {
                window.location.href = '/member-dashboard';
            });
        }
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

    loadUserData();
    
    // Live validation
    function attachLiveValidations() {
        const fields = [
            { id: 'fullName', errMsg: 'Name required (min 2 chars)', validate: v => v && v.trim().length >= 2 },
            { id: 'email', errMsg: 'Valid email required', validate: v => v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
            { id: 'age', errMsg: 'Must be 18 or older', validate: v => v && parseInt(v) >= 18 },
            { id: 'city', errMsg: 'Valid city required', validate: v => v && v.trim().length >= 2 },
            { id: 'phone', errMsg: 'Valid phone required', validate: v => v && /^[0-9+\-\s()]+$/.test(v.trim()) && v.trim().length >= 10 },
            { id: 'address', errMsg: 'Valid address required', validate: v => v && v.trim().length >= 5 }
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
                // Insert after the input wrapper if it exists, otherwise straight after
                if(el.parentElement.classList.contains('input-wrap')) {
                    el.parentElement.parentElement.appendChild(errDiv);
                } else {
                    el.parentNode.insertBefore(errDiv, el.nextSibling);
                }

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
    attachLiveValidations();
})();
