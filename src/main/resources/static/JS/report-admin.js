let currentReports = [];
let currentlyViewingReport = null;
let churnRiskChart = null;

// Store stats in memory so PDF always has real data regardless of active tab
let _attStats = { avgDaily: '—', peakHour: '—', totalVisits: '—' };
let _memStats = { planUsers: '—', active: '—', expired: '—', newSignups: '—' };
let _churnStats = { rate: 'N/A', atRisk: '—', total: '—' };

document.addEventListener('DOMContentLoaded', async function() {
    setupTabs();
    await loadDashboardStats();
    await loadAttendanceStats();
    await loadChurnStats();
    loadChurnPredictions();  // Load live churn predictions
    loadReports();
    setupValidations();
});

function setupValidations() {
    const title = document.getElementById('rTitle');
    const start = document.getElementById('rStart');
    const end = document.getElementById('rEnd');
    const notes = document.getElementById('rNotes');
    
    if (notes) {
        notes.addEventListener('input', function() {
            const count = this.value.length;
            const counter = document.getElementById('rNotesCount');
            if(counter) counter.textContent = count;
        });
    }

    if (title) title.addEventListener('input', validateTitle);
    if (start) start.addEventListener('change', validateDates);
    if (end) end.addEventListener('change', validateDates);
}

function validateTitle() {
    const title = document.getElementById('rTitle');
    const err = document.getElementById('rTitleError');
    if (!title || !err) return false;
    
    const val = title.value.trim();
    if (val.length === 0) {
        title.style.borderColor = '#ef4444';
        err.textContent = 'Report title is required.';
        err.style.display = 'block';
        return false;
    }
    
    if (val.length < 3) {
        title.style.borderColor = '#ef4444';
        err.textContent = 'Title must be at least 3 characters long.';
        err.style.display = 'block';
        return false;
    }
    
    const regex = /^[a-zA-Z0-9\s\-_\!\.]+$/;
    if (!regex.test(val)) {
        title.style.borderColor = '#ef4444';
        err.textContent = 'Only alphanumeric characters and basic punctuation (-, _, !, .) allowed.';
        err.style.display = 'block';
        return false;
    }
    
    title.style.borderColor = '#10b981';
    err.style.display = 'none';
    return true;
}

function validateDates() {
    const start = document.getElementById('rStart');
    const end = document.getElementById('rEnd');
    const err = document.getElementById('rDateError');
    if (!start || !end || !err) return false;
    
    if (!start.value || !end.value) {
        err.textContent = 'Both start and end dates are required.';
        err.style.display = 'block';
        if (!start.value) start.style.borderColor = '#ef4444';
        if (!end.value) end.style.borderColor = '#ef4444';
        return false;
    }
    
    const dStart = new Date(start.value);
    const dEnd = new Date(end.value);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    let isValid = true;
    let errMsg = '';
    
    if (dStart > today || dEnd > today) {
        isValid = false;
        errMsg = 'Dates cannot be in the future.';
    } else if (dStart > dEnd) {
        isValid = false;
        errMsg = 'End date cannot be before start date.';
    } else {
        const diffDays = Math.ceil(Math.abs(dEnd - dStart) / (1000 * 60 * 60 * 24));
        if (diffDays > 365) {
            isValid = false;
            errMsg = 'Report date range cannot exceed 1 year (365 days).';
        }
    }
    
    if (!isValid) {
        start.style.borderColor = '#ef4444';
        end.style.borderColor = '#ef4444';
        err.textContent = errMsg;
        err.style.display = 'block';
        return false;
    }
    
    start.style.borderColor = '#10b981';
    end.style.borderColor = '#10b981';
    err.style.display = 'none';
    return true;
}


function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            let paneId = this.getAttribute('data-tab');
            if (!paneId) return;
            const pane = document.getElementById(paneId);
            if (!pane) return;
            pane.classList.add('active');
        });
    });
}

function loadDashboardStats() {
    return fetch('/api/auth/members')
        .then(response => response.json())
        .then(members => {
            const total   = members.length;
            const active  = members.filter(m => (m.packageStatus || '').toUpperCase() === 'ACTIVE').length;
            const expired = members.filter(m => (m.packageStatus || '').toUpperCase() === 'EXPIRED').length;

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const newSignups = members.filter(m => m.joinDate && new Date(m.joinDate) >= thirtyDaysAgo).length;

            // Store in memory for PDF generation
            _memStats.planUsers  = total;
            _memStats.active     = active;
            _memStats.expired    = expired;
            _memStats.newSignups = newSignups;

            document.getElementById('dashTotalMembers').textContent  = total;
            document.getElementById('dashActiveMembers').textContent  = active;
            document.getElementById('memPlanUsers').textContent       = total;
            document.getElementById('memActivePackages').textContent  = active;
            document.getElementById('memExpiredPackages').textContent = expired;
            const memNewSignupsEl = document.getElementById('memNewSignups');
            if (memNewSignupsEl) memNewSignupsEl.textContent = newSignups;

            renderCharts(members);
        })
        .catch(err => console.error('Failed to load stats', err));
}

function renderCharts(members) {
    // Active vs Expired Chart - Real Data for Current Period
    const active = members.filter(m => (m.packageStatus || '').toUpperCase() === 'ACTIVE').length;
    const expired = members.filter(m => (m.packageStatus || '').toUpperCase() === 'EXPIRED').length;
    const currentMonth = new Date().toLocaleString('default', { month: 'short' });

    const isLight = document.body.classList.contains('light-mode');
    const labelColor = isLight ? '#1e293b' : '#f0f9ff';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';

    const activeCtx = document.getElementById('memActiveChart').getContext('2d');
    new Chart(activeCtx, {
        type: 'bar',
        data: {
            labels: ['Active Members', 'Expired Packages'],
            datasets: [{
                data: [active, expired],
                backgroundColor: ['#38bdf8', '#ef4444'],
                borderRadius: 4,
                maxBarThickness: 60
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: gridColor }, ticks: { stepSize: 1, color: labelColor } },
                x: { grid: { display: false }, ticks: { color: labelColor } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Plan Distribution Chart - Real Data Only
    let monthly=0, quarterly=0, annually=0, none=0;
    members.forEach(m => {
        let pkg = (m.membershipPackage || '').toLowerCase();
        if (pkg === 'monthly') monthly++;
        else if (pkg === 'quarterly') quarterly++;
        else if (pkg === 'annually') annually++;
        else none++;
    });

    const planCtx = document.getElementById('memPlanChart').getContext('2d');
    new Chart(planCtx, {
        type: 'doughnut',
        data: {
            labels: ['Monthly', 'Quarterly', 'Annual'],
            datasets: [{
                data: [monthly, quarterly, annually],
                backgroundColor: ['#38bdf8', '#34d399', '#c084fc'],
                borderWidth: 1, borderColor: isLight ? 'rgba(255,255,255,0.8)' : 'rgba(14,20,42,0.9)'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '65%',
            plugins: { legend: { position: 'bottom', labels: { color: labelColor, font: { weight: '600' } } } }
        }
    });
}

function loadAttendanceStats() {
    return fetch('/api/reports/stats/attendance')
        .then(res => res.json())
        .then(stats => {
            // Store in memory for PDF generation
            _attStats.avgDaily    = stats.avgDaily   || 0;
            _attStats.peakHour    = stats.peakHour   || 'N/A';
            _attStats.totalVisits = stats.totalVisits || 0;

            document.getElementById('attAvgDaily').textContent = _attStats.avgDaily;
            document.getElementById('attPeakHour').textContent = _attStats.peakHour;
            document.getElementById('attTotalVisits').textContent = _attStats.totalVisits;
            document.getElementById('dashTodayAttendance').textContent = stats.todayVisits || 0;
            
            // Weekly Footfall Chart
            const footfallCtx = document.getElementById('attendanceFootfallChart');
            if(footfallCtx) {
                new Chart(footfallCtx.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                        datasets: [{
                            label: 'Visits',
                            data: stats.weeklyFootfall || [0,0,0,0,0,0,0],
                            backgroundColor: '#34d399',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true, grid: { color: document.body.classList.contains('light-mode') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' }, ticks: { stepSize: 1, color: document.body.classList.contains('light-mode') ? '#000000' : '#ffffff' } },
                            x: { grid: { display: false }, ticks: { color: document.body.classList.contains('light-mode') ? '#000000' : '#ffffff' } }
                        },
                        plugins: { legend: { display: false } }
                    }
                });
            }

            // Peak Hours Heatmap Table
            const tbody = document.getElementById('attendanceHeatmapBody');
            if(tbody && stats.heatmap) {
                tbody.innerHTML = '';
                const isLight = document.body.classList.contains('light-mode');
                
                let maxVal = 0;
                for(const days of Object.values(stats.heatmap)) {
                    for(const val of days) {
                        if(val > maxVal) maxVal = val;
                    }
                }

                const formatCell = val => {
                    let bg = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';
                    let fg = 'transparent';
                    
                    if (val > 0) {
                        if (maxVal > 0 && val >= maxVal * 0.7) {
                            bg = '#38bdf8'; 
                            fg = isLight ? '#000000' : '#ffffff';
                        } else if (maxVal > 0 && val >= maxVal * 0.3) {
                            bg = isLight ? 'rgba(56,189,248,0.5)' : 'rgba(56,189,248,0.5)'; 
                            fg = isLight ? '#000000' : '#ffffff';
                        } else {
                            bg = isLight ? 'rgba(56,189,248,0.2)' : 'rgba(56,189,248,0.2)'; 
                            fg = isLight ? '#000000' : '#ffffff';
                        }
                    }
                    
                    return `<td style="padding:10px;"><div style="background:${bg}; padding:8px; border-radius:6px; font-weight:600; font-size:0.85rem; color:${fg};">${val}</div></td>`;
                };

                for(const [hour, days] of Object.entries(stats.heatmap)) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td class="heatmap-axis-text" style="font-size:0.85rem; padding:10px; text-align:left;">${hour}</td>` + 
                                   days.map(formatCell).join('');
                    tbody.appendChild(tr);
                }
            }
        })
        .catch(err => console.error(err));
}

function loadChurnStats() {
    return fetch('/api/reports/stats/churn')
        .then(res => res.json())
        .then(stats => {
            // Store in memory for PDF / Modal generation
            _churnStats.rate   = stats.churnRate || 'N/A';
            _churnStats.atRisk = stats.atRiskMembers || 0;
            _churnStats.total  = stats.totalChurned || 0;

            let lowRiskStr = (stats.lowRiskMembers == null) ? '0' : String(stats.lowRiskMembers);
            let mediumRiskStr = (stats.mediumRiskMembers == null) ? '0' : String(stats.mediumRiskMembers);
            let highRiskStr = (stats.highRiskMembers == null) ? '0' : String(stats.highRiskMembers);

            // Update stat cards
            const lowVal = document.getElementById('churnLowRiskValue');
            if (lowVal) lowVal.textContent = lowRiskStr;
            const medVal = document.getElementById('churnMediumRiskValue');
            if (medVal) medVal.textContent = mediumRiskStr;
            const highVal = document.getElementById('churnHighRiskValue');
            if (highVal) highVal.textContent = highRiskStr;

        })
        .catch(err => console.error(err));
}

function loadChurnPredictions() {
    fetch('/api/churn/predictions')
        .then(res => res.json())
        .then(predictions => {
            renderChurnPredictions(predictions);
        })
        .catch(err => {
            console.error('Failed to load churn predictions', err);
            const container = document.getElementById('churnPredictionsContainer');
            container.innerHTML = '<p style="color: rgba(255,255,255,0.4); text-align: center; padding: 20px;">Unable to load churn predictions. ML service may be unavailable.</p>';
        });
}

function renderChurnPredictions(predictions) {
    const container = document.getElementById('churnPredictionsContainer');
    
    if (!predictions || predictions.length === 0) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.4); text-align: center; padding: 20px;">No members found for churn analysis.</p>';
        return;
    }

    const lowCount = predictions.filter(p => p.riskLevel === 'Low').length;
    const mediumCount = predictions.filter(p => p.riskLevel === 'Medium').length;
    const highCount = predictions.filter(p => p.riskLevel === 'High').length;
    const avgProbability = predictions.reduce((sum, p) => sum + (p.probability || 0), 0) / Math.max(predictions.length, 1);

    const html = `
        <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div>
                <h4 style="margin: 0; color: #f0f9ff; font-size: 1.1rem;">Live Churn Risk Analysis</h4>
                <p style="margin: 6px 0 0; color: #94a3b8; font-size: 0.92rem;">Real-time member churn risk counts and probability distribution.</p>
            </div>
            <button class="btn btn-primary" onclick="loadChurnPredictions()" style="font-size: 0.8rem; padding: 6px 12px; white-space: nowrap;">
                <i class="fas fa-sync-alt"></i> Refresh
            </button>
        </div>
        <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 20px;">
            <canvas id="churnRiskChart" style="width: 100%; min-height: 320px;"></canvas>
        </div>
    `;

    container.innerHTML = html;

    const chartCtx = document.getElementById('churnRiskChart');
    if (!chartCtx) return;

    if (churnRiskChart) {
        churnRiskChart.destroy();
        churnRiskChart = null;
    }

    churnRiskChart = new Chart(chartCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Low', 'Medium', 'High'],
            datasets: [{
                label: 'Member Count',
                data: [lowCount, mediumCount, highCount],
                backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                borderRadius: 12,
                maxBarThickness: 48
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#cbd5e1' }, grid: { display: false } },
                y: { beginAtZero: true, ticks: { color: '#cbd5e1', stepSize: 1 }, grid: { color: 'rgba(148,163,184,0.16)' } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label}: ${context.parsed.y}`
                    }
                }
            }
        }
    });
}

function viewMemberDetails(memberId) {
    // TODO: Implement member details view
    showUIAlert("Info", "Member details view coming soon!", false);
}

function sendRetentionOffer(memberId) {
    // TODO: Implement retention offer sending
    showUIAlert("Success", "Retention offer sent to member!", true);
}

function loadReports() {
    fetch('/api/reports')
        .then(res => res.json())
        .then(reports => {
            currentReports = reports;
            reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            renderReportList(reports, 'allRecentReportsContainer');
            renderReportList(reports.filter(r => r.reportType === 'MEMBERSHIP'), 'membershipReportsContainer');
            renderReportList(reports.filter(r => r.reportType === 'ATTENDANCE'), 'attendanceReportsContainer');
            renderReportList(reports.filter(r => r.reportType === 'CHURN'), 'churnReportsContainer');
        })
        .catch(err => console.error('Failed to load reports', err));
}

function renderReportList(list, containerId) {
    const container = document.getElementById(containerId);
    if (!list || list.length === 0) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.4); text-align: center; padding: 20px;">No reports found.</p>';
        return;
    }
    
    container.innerHTML = '';
    list.forEach(report => {
        let tagClass = 'tag-membership';
        if (report.reportType === 'ATTENDANCE') tagClass = 'tag-attendance';
        else if (report.reportType === 'CHURN') tagClass = 'tag-churn';

        const html = `
            <div class="report-list-item">
                <div class="report-item-left">
                    <div class="report-item-icon"><i class="fas fa-file-alt"></i></div>
                    <div>
                        <div class="report-item-title">${report.title}</div>
                        <div class="report-item-date">${report.startDate} → ${report.endDate}</div>
                    </div>
                </div>
                <div class="report-item-right">
                    <span class="report-tag ${tagClass}" style="margin-right: 16px;">${report.reportType}</span>
                    <div class="report-item-actions">
                        <i class="fas fa-eye report-action-icon" onclick="viewReport('${report.id}')" title="View details"></i>
                        <i class="fas fa-pencil-alt report-action-icon" onclick="editReport('${report.id}')" title="Edit"></i>
                        <i class="fas fa-download report-action-icon" onclick="downloadReportPDF('${report.id}')" title="Download PDF"></i>
                        <i class="fas fa-trash report-action-icon delete" onclick="deleteReport('${report.id}')" title="Delete"></i>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// === GENERATE / EDIT Flow ===
function openGenerateReportModal() {
    document.getElementById('reportForm').reset();
    document.getElementById('rId').value = '';
    
    // Reset Validation visual states
    document.getElementById('rTitle').style.borderColor = 'rgba(255,255,255,0.1)';
    document.getElementById('rStart').style.borderColor = 'rgba(255,255,255,0.1)';
    document.getElementById('rEnd').style.borderColor = 'rgba(255,255,255,0.1)';
    const err1 = document.getElementById('rTitleError'); if(err1) err1.style.display='none';
    const err2 = document.getElementById('rDateError'); if(err2) err2.style.display='none';
    const count = document.getElementById('rNotesCount'); if(count) count.textContent='0';
    
    document.getElementById('generateModalTitle').textContent = 'Generate New Report';
    
    // Show everything instantly
    document.getElementById('reportTypeSelector').style.display = 'block';
    document.getElementById('reportForm').style.display = 'block';
    document.getElementById('btnSaveReport').style.display = 'inline-block';
    document.getElementById('btnSaveReport').textContent = 'Generate Report';
    
    document.getElementById('generateReportModal').classList.add('show');
    setTimeout(() => document.getElementById('generateReportModalContent').classList.add('show'), 10);
    
    // Default select Membership
    selectReportType('MEMBERSHIP');
}

function selectReportType(type) {
    document.getElementById('rType').value = type;
    document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
    const tabItem = document.getElementById('tc-' + type.toLowerCase());
    if(tabItem) tabItem.classList.add('selected');
    
    // Update description
    const desc = document.getElementById('rTypeDesc');
    if(type === 'MEMBERSHIP') desc.textContent = 'Active packages, expirations, new signups';
    else if(type === 'ATTENDANCE') desc.textContent = 'Daily footfall, peak hours, total visits';
    else if(type === 'CHURN') desc.textContent = 'Churn rate, at-risk members, cancellations';
    
    // Toggle Membership specific fields
    const filtersGroup = document.getElementById('membershipFiltersGroup');
    if (filtersGroup) {
        filtersGroup.style.display = (type === 'MEMBERSHIP') ? 'flex' : 'none';
        filtersGroup.style.gap = '20px';
    }
}

function editReport(id) {
    const r = currentReports.find(x => x.id === id);
    if(!r) return;
    
    openGenerateReportModal();
    document.getElementById('generateModalTitle').textContent = 'Edit Report';
    
    document.getElementById('reportTypeSelector').style.display = 'none';
    document.getElementById('reportForm').style.display = 'block';
    
    document.getElementById('rId').value = r.id;
    document.getElementById('rTitle').value = r.title;
    document.getElementById('rStart').value = r.startDate;
    document.getElementById('rEnd').value = r.endDate;
    
    const filtersGroup = document.getElementById('membershipFiltersGroup');
    if (r.reportType === 'MEMBERSHIP') {
        if(filtersGroup) { filtersGroup.style.display = 'flex'; filtersGroup.style.gap = '20px'; }
        document.getElementById('rPlan').value = r.planType;
        document.getElementById('rStatus').value = r.status;
    } else {
        if(filtersGroup) filtersGroup.style.display = 'none';
    }
    
    document.getElementById('rNotes').value = r.notes;
    
    document.getElementById('btnSaveReport').style.display = 'inline-block';
    document.getElementById('btnSaveReport').textContent = 'Save Changes';
}

function closeGenerateReportModal() {
    document.getElementById('generateReportModalContent').classList.remove('show');
    setTimeout(() => document.getElementById('generateReportModal').classList.remove('show'), 300);
}

function saveReport() {
    const id = document.getElementById('rId').value;
    const type = document.getElementById('rType').value || 'MEMBERSHIP';
    
    const payload = {
        title: document.getElementById('rTitle').value,
        reportType: type,
        startDate: document.getElementById('rStart').value,
        endDate: document.getElementById('rEnd').value,
        planType: document.getElementById('rPlan').value,
        status: document.getElementById('rStatus').value,
        notes: document.getElementById('rNotes').value
    };

    const isTitleValid = validateTitle();
    const areDatesValid = validateDates();
    
    if (!isTitleValid || !areDatesValid) {
        showUIAlert("Validation Error", "Please correct the highlighted errors before generating the report.", false);
        return;
    }

    if(!payload.title || !payload.startDate || !payload.endDate) {
        showUIAlert("Validation Error", "Title and both dates are required.", false);
        return;
    }

    const url = id ? '/api/reports/' + id : '/api/reports';
    const method = id ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(res => {
        if(res.ok) {
            closeGenerateReportModal();
            loadReports();
            showUIAlert("Success", "Report generated and saved successfully.", true);
        } else {
            showUIAlert("Error", "Failed to save report.", false);
        }
    }).catch(err => showUIAlert("Network Error", "Could not connect to the server.", false));
}

function deleteReport(id) {
    showUIConfirm('Delete Report', 'Are you sure you want to delete this report? This cannot be undone.', true, function(confirmed) {
        if(!confirmed) return;
        fetch('/api/reports/' + id, { method: 'DELETE' }).then(res => {
            if(res.ok) {
                loadReports();
                showUIAlert("Success", "Report deleted successfully.", true);
            } else {
                showUIAlert("Error", "Failed to delete report.", false);
            }
        });
    });
}

// === VIEW & PDF Flow ===

// Generate a clean, high-contrast HTML string for both Preview and PDF export
function getReportHTML(r) {
    const dateStr = new Date(r.createdAt || new Date()).toLocaleString();
    let dataFields = '';
    
    // Ensure we have stats even if fetch failed
    const m = _memStats || { planUsers: 0, active: 0, expired: 0, newSignups: 0 };
    const a = _attStats || { avgDaily: 0, peakHour: 'N/A', totalVisits: 0 };
    const c = _churnStats || { rate: 'N/A', atRisk: 0, total: 0 };

    const rType = (r.reportType || '').toUpperCase();
    
    if (rType === 'MEMBERSHIP') {
        dataFields = `
            <tr><th colspan="2" style="padding: 16px 0 8px; color: #0284c7; font-size: 1.1rem; border-bottom: 2px solid #e2e8f0; text-align: left;">Report Data Metrics</th></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left; border-bottom: 1px solid #f1f5f9;">Plan Filter:</th><td style="color:#0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${r.planType || 'All'}</td></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left; border-bottom: 1px solid #f1f5f9;">Status Filter:</th><td style="color:#0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${r.status || 'All'}</td></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left; border-bottom: 1px solid #f1f5f9;">Total Members:</th><td style="color:#0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${m.planUsers}</td></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left; border-bottom: 1px solid #f1f5f9;">Active Members:</th><td style="color:#0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${m.active}</td></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left; border-bottom: 1px solid #f1f5f9;">Expired Members:</th><td style="color:#0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${m.expired}</td></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left;">New Signups (30 days):</th><td style="color:#0f172a; font-weight: 600;">${m.newSignups}</td></tr>
        `;
    } else if (rType === 'ATTENDANCE') {
        dataFields = `
            <tr><th colspan="2" style="padding: 16px 0 8px; color: #059669; font-size: 1.1rem; border-bottom: 2 solid #e2e8f0; text-align: left;">Report Data Metrics</th></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left; border-bottom: 1px solid #f1f5f9;">Avg. Daily Attendance:</th><td style="color:#0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${a.avgDaily}</td></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left; border-bottom: 1px solid #f1f5f9;">Peak Hour:</th><td style="color:#0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${a.peakHour}</td></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left;">Total Visits (All Time):</th><td style="color:#0f172a; font-weight: 600;">${a.totalVisits}</td></tr>
        `;
    } else if (rType === 'CHURN') {
        dataFields = `
            <tr><th colspan="2" style="padding: 16px 0 8px; color: #dc2626; font-size: 1.1rem; border-bottom: 2px solid #e2e8f0; text-align: left;">Report Data Metrics</th></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left; border-bottom: 1px solid #f1f5f9;">Churn Rate:</th><td style="color:#0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${c.rate || 'N/A'}</td></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left; border-bottom: 1px solid #f1f5f9;">At-Risk Members:</th><td style="color:#0f172a; font-weight: 600; border-bottom: 1px solid #f1f5f9;">${c.atRisk || 0}</td></tr>
            <tr><th style="padding: 10px 0; color: #475569; text-align: left;">Total Churned:</th><td style="color:#0f172a; font-weight: 600;">${c.total || 0}</td></tr>
        `;
    }

    return `
        <div style="background-color: #ffffff; padding: 50px 60px; color: #1e293b; font-family: Arial, sans-serif; box-sizing: border-box; width: 100%; border: 1px solid #e2e8f0; border-radius: 4px;">
            <!-- Header -->
            <div style="text-align:center; padding-bottom: 25px; border-bottom: 5px solid #0c4a6e; margin-bottom: 40px; position: relative;">
                <h2 style="margin: 0; color: #0c4a6e; font-size: 30px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Royal Gym</h2>
                <div style="margin-top: 5px; height: 1px; background: rgba(0,0,0,0.1); width: 60px; display: inline-block;"></div>
                <h3 style="margin: 12px 0 0; color: #475569; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">${r.title || 'Official Report'}</h3>
            </div>
            
            <!-- Metadata Table -->
            <table style="width: 100%; text-align: left; font-size: 15px; margin-bottom: 40px; border-collapse: collapse;">
                <tr><th colspan="2" style="padding: 0 0 12px; color: #d97706; font-size: 1.2rem; border-bottom: 3px solid #fcd34d; text-align: left; text-transform: uppercase; letter-spacing: 1px;">General Information</th></tr>
                <tr><th style="padding: 15px 0 10px; color: #475569; width: 35%; border-bottom: 1px solid #f1f5f9;">Report ID:</th><td style="padding: 15px 0 10px; font-weight:800; color: #0c4a6e; border-bottom: 1px solid #f1f5f9;">#${(r.id || 'XXXXXX').substring(0, 8).toUpperCase()}</td></tr>
                <tr><th style="padding: 10px 0; color: #475569; border-bottom: 1px solid #f1f5f9;">Date Range:</th><td style="padding: 10px 0; color: #0f172a; font-weight: 500; border-bottom: 1px solid #f1f5f9;">${r.startDate || 'N/A'} &rarr; ${r.endDate || 'N/A'}</td></tr>
                <tr><th style="padding: 10px 0; color: #475569; border-bottom: 1px solid #f1f5f9;">Generated On:</th><td style="padding: 10px 0; color: #0f172a; font-weight: 500; border-bottom: 1px solid #f1f5f9;">${dateStr}</td></tr>
                <tr><th style="padding: 10px 0 20px; color: #475569; vertical-align: top;">System Notes:</th><td style="padding: 10px 0 20px; color: #1e293b; white-space: pre-wrap; font-style: italic;">${r.notes || 'No additional notes provided.'}</td></tr>
                
                ${dataFields}
            </table>
            
            <!-- Footer -->
            <div style="margin-top: 60px; text-align: center; border-top: 2px solid #f1f5f9; padding-top: 30px;">
                <p style="font-size: 13px; color: #94a3b8; font-style: italic; margin: 0;">Official Confidential System Report.</p>
                <p style="font-size: 11px; color: #cbd5e1; margin-top: 5px; text-transform: uppercase;">Generated via Royal Gym Admin Dashboard Platform</p>
            </div>
        </div>
    `;
}

function viewReport(id) {
    currentlyViewingReport = currentReports.find(r => r.id === id);
    if(!currentlyViewingReport) return;

    const body = document.getElementById('reportDetailsBody');
    body.innerHTML = getReportHTML(currentlyViewingReport);
    
    document.getElementById('viewReportModal').classList.add('show');
    setTimeout(() => {
        document.getElementById('viewReportModalContent').classList.add('show');
    }, 10);
}

function closeViewReportModal() {
    document.getElementById('viewReportModalContent').classList.remove('show');
    setTimeout(() => {
        document.getElementById('viewReportModal').classList.remove('show');
        currentlyViewingReport = null;
    }, 300);
}

// THE V4 BULLETPROOF DOWNLOAD LOGIC
function downloadReportPDF(id) {
    if(!id) return;
    const r = currentReports.find(x => x.id === id);
    if(!r) return;

    // 1. Prepare UI
    const overlay = document.getElementById('pdfExportOverlay');
    const stage = document.getElementById('pdfExportStage');
    const stageContainer = document.getElementById('pdfExportStageContainer');
    const fallback = document.getElementById('exportFallback');
    
    overlay.style.display = 'flex';
    fallback.style.display = 'none';
    
    // 2. Populate and Reveal to Browser (for painting)
    stage.innerHTML = getReportHTML(r);
    stageContainer.style.visibility = 'visible';

    // 3. Wait for Paint Cycle Sync (Crucial Fix for Blank Pages)
    // requestAnimationFrame ensures the browser has recalculated styles and layout
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Buffer to ensure any heavy images/fonts are ready
            setTimeout(() => {
                const opt = {
                    margin:       [10, 10, 10, 10],
                    filename:     `RoyalGym_Report_${(r.title || 'Export').replace(/\s+/g, '_')}.pdf`,
                    image:        { type: 'jpeg', quality: 1.0 },
                    html2canvas:  { 
                        scale: 2, // Reduced scale for better compatibility
                        useCORS: true, 
                        backgroundColor: '#ffffff',
                        logging: false, // Disabled logging
                        letterRendering: false, // Disabled for compatibility
                        scrollY: 0,
                        scrollX: 0
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true }
                };

                // Show fallback button if it takes too long
                const fallbackTimer = setTimeout(() => {
                    fallback.style.display = 'block';
                }, 5000);

                // 4. Capture and Save
                html2pdf().set(opt).from(stage).save().then(() => {
                    clearTimeout(fallbackTimer);
                    successCleanup();
                    showUIAlert("PDF Success", "Your high-resolution report is ready.", true);
                }).catch(err => {
                    console.error("PDF Catch:", err);
                    clearTimeout(fallbackTimer);
                    fallback.style.display = 'block';
                    showUIAlert("Export Issue", "Automatic capture failed. Please use the 'Try Printing' button.", false);
                });
            }, 1500); // Increased buffer time
        });
    });

    function successCleanup() {
        overlay.style.display = 'none';
        stageContainer.style.visibility = 'hidden';
        stage.innerHTML = '';
    }
}

// 5. Fail-Safe: Direct Browser Print (Works 100% of the time as Save-as-PDF)
function directPrintReport() {
    if(!currentlyViewingReport) return;
    
    const printWindow = window.open('', '_blank');
    const html = getReportHTML(currentlyViewingReport);
    
    printWindow.document.write(`
        <html>
            <head>
                <title>Print Report | Royal Gym</title>
                <style>
                    body { margin: 0; padding: 0; background: white; }
                    @page { size: A4; margin: 15mm; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>${html}</body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Trigger print dialog
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
        document.getElementById('pdfExportOverlay').style.display = 'none';
    }, 500);
}

// Legacy bridge for modal buttons
function exportReportPDF() {
    if(currentlyViewingReport) {
        downloadReportPDF(currentlyViewingReport.id);
    }
}
