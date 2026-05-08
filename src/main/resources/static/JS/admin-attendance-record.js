function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
}

function formatTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function renderAttendanceRows(records) {
    var tbody = document.getElementById("attendanceTableBody");
    tbody.innerHTML = "";

    if (!records || records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:rgba(255,255,255,0.45);padding:26px;">No attendance records yet.</td></tr>';
        return;
    }

    records.forEach(function (rec, idx) {
        var active = (rec.status || "").toUpperCase() === "ACTIVE";
        var statusHtml = active
            ? '<span class="status-chip status-active"><i class="fas fa-circle"></i> Active</span>'
            : '<span class="status-chip status-out"><i class="fas fa-circle-check"></i> Checked Out</span>';

        var actionsHtml =
            '<div class="table-action-wrap">' +
            '<button class="mini-btn out-btn" onclick="checkOutMember(\'' + rec.id + '\')" ' + (active ? "" : "disabled") + '><i class="fas fa-right-from-bracket"></i> Out</button>' +
            '<button class="mini-btn delete-btn" onclick="deleteAttendanceRecord(\'' + rec.id + '\')" title="Delete record"><i class="fas fa-trash"></i></button>' +
            "</div>";

        var row = document.createElement("tr");
        row.innerHTML =
            "<td>" + (idx + 1) + "</td>" +
            "<td>" + (rec.membershipId || "-") + "</td>" +
            "<td>" + (rec.memberName || "-") + "</td>" +
            "<td>" + formatDate(rec.checkInTime || rec.attendanceDate) + "</td>" +
            "<td>" + formatTime(rec.checkInTime) + "</td>" +
            "<td>" + formatTime(rec.checkOutTime) + "</td>" +
            "<td>" + statusHtml + "</td>" +
            "<td>" + actionsHtml + "</td>";
        tbody.appendChild(row);
    });
}

/** 
 * Frontend filter for the attendance table.
 * Searches by Membership ID or Email.
 */
function filterAttendanceTable() {
    var query = (document.getElementById("attendanceSearchInput").value || "").toLowerCase().trim();
    if (!window.activeAttendanceRecords) return;

    if (!query) {
        renderAttendanceRows(window.activeAttendanceRecords);
        return;
    }

    var filtered = window.activeAttendanceRecords.filter(function (rec) {
        var mId = (rec.membershipId || "").toLowerCase();
        var email = (rec.memberEmail || "").toLowerCase();
        var name = (rec.memberName || "").toLowerCase();
        
        return mId.includes(query) || email.includes(query) || name.includes(query);
    });

    renderAttendanceRows(filtered);
}

function loadSummary() {
    fetch("/api/attendance/summary", { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (summary) {
            var today = summary.todayCheckIns || 0;
            var total = summary.totalRecords || 0;
            document.getElementById("todayCheckIns").textContent = today;
            document.getElementById("totalAttendanceRecords").textContent = total;
            // Sync hero banner pills
            var heroToday = document.getElementById("heroTodayCheckIns");
            var heroTotal = document.getElementById("heroTotalRecords");
            if (heroToday) heroToday.textContent = today;
            if (heroTotal) heroTotal.textContent = total;
        })
        .catch(function () {
            document.getElementById("todayCheckIns").textContent = "0";
            document.getElementById("totalAttendanceRecords").textContent = "0";
        });
}

function loadBellCount() {
    // Attendance page doesn't manage the message UI via bell.
    var badge = document.getElementById("attendanceBellCount");
    if (badge) badge.style.display = "none";
}

function showAttendanceNotifications() {
    window.location.href = "/admin-dashboard";
}

function loadRecords() {
    fetch("/api/attendance", { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (records) {
            window.activeAttendanceRecords = records || [];
            renderAttendanceRows(records);
        })
        .catch(function () {
            var tbody = document.getElementById("attendanceTableBody");
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#fca5a5;padding:24px;">Failed to load attendance records.</td></tr>';
        });
}

function loadAttendanceData() {
    loadSummary();
    loadRecords();
    loadBellCount();
}

function checkInMember() {
    var input = document.getElementById("memberIdInput");
    var memberId = (input.value || "").trim();
    if (!memberId) {
        if(window.showUIAlert) showUIAlert("Notice", "Please enter a member ID.", false);
        else alert("Please enter a member ID.");
        input.focus();
        return;
    }

    if (window.activeAttendanceRecords) {
        var duplicate = window.activeAttendanceRecords.find(function(r) {
            return String(r.membershipId).toLowerCase() === String(memberId).toLowerCase() && (r.status || "").toUpperCase() === "ACTIVE";
        });
        if (duplicate) {
            if(window.showUIAlert) showUIAlert("Check-In Blocked", "Member " + memberId + " is already checked in. Please check them out first.", false);
            else alert("Member " + memberId + " is already checked in. Please check them out first.");
            return;
        }
    }

    fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: memberId })
    })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (result) {
            if (!result.ok) {
                if(window.showUIAlert) showUIAlert("Error", "Check-in failed: " + (result.data.error || "Unknown error"), false);
                else alert("Check-in failed: " + (result.data.error || "Unknown error"));
                return;
            }
            if(window.showUIAlert) showUIAlert("Success", "Check-in added successfully.", true);
            else alert("Check-in added successfully.");
            input.value = "";
            loadAttendanceData();
        })
        .catch(function () {
            if(window.showUIAlert) showUIAlert("Error", "Request failed.", false);
            else alert("Request failed.");
        });
}

function checkOutMember(recordId) {
    fetch("/api/attendance/check-out/" + recordId, {
        method: "POST"
    })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (result) {
            if (!result.ok) {
                if(window.showUIAlert) showUIAlert("Error", "Check-out failed: " + (result.data.error || "Unknown error"), false);
                else alert("Check-out failed: " + (result.data.error || "Unknown error"));
                return;
            }
            loadAttendanceData();
        })
        .catch(function () {
            if(window.showUIAlert) showUIAlert("Error", "Request failed.", false);
            else alert("Request failed.");
        });
}

function deleteAttendanceRecord(recordId) {
    if(window.showUIConfirm) {
        showUIConfirm("Delete Record", "Are you sure you want to delete this attendance record?", true, function(confirmed) {
            if (!confirmed) return;
            executeDelete(recordId);
        });
    } else {
        if (!confirm("Delete this attendance record?")) return;
        executeDelete(recordId);
    }
}

function executeDelete(recordId) {
    fetch("/api/attendance/" + recordId, {
        method: "DELETE"
    })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (result) {
            if (!result.ok) {
                if(window.showUIAlert) showUIAlert("Error", "Delete failed: " + (result.data.error || "Unknown error"), false);
                else alert("Delete failed: " + (result.data.error || "Unknown error"));
                return;
            }
            loadAttendanceData();
        })
        .catch(function () {
            if(window.showUIAlert) showUIAlert("Error", "Request failed.", false);
            else alert("Request failed.");
        });
}

window.addEventListener("load", function () {
    loadAttendanceData();
});
