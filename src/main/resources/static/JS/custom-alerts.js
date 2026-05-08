// === GLOBAL CUSTOM UI ALERTS & CONFIRMS ===
// Injects a beautiful, consistent Modal into any page that includes this script

document.addEventListener("DOMContentLoaded", function () {
    const modalHTML = `
      <div id="uiConfirmModal" style="position:fixed;inset:0;background:rgba(10,16,32,0.85);backdrop-filter:blur(6px);z-index:99999;display:none;align-items:center;justify-content:center;opacity:0;transition:opacity 0.2s ease;">
        <div style="background:linear-gradient(160deg, rgba(20,30,55,1), rgba(12,18,35,1));border:1px solid rgba(56,189,248,0.3);border-radius:16px;box-shadow:0 15px 50px rgba(0,0,0,0.6);width:90%;max-width:420px;text-align:center;padding:32px;transform:scale(0.95);transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);" id="uiConfirmBox">
          <div id="uiConfirmIcon" style="width:70px;height:70px;border-radius:50%;background:rgba(56,189,248,0.15);color:#38bdf8;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 24px;">
            <i class="fas fa-question-circle"></i>
          </div>
          <h3 id="uiConfirmTitle" style="color:#f0f9ff;font-size:1.3rem;font-weight:700;margin-bottom:12px;letter-spacing:-0.02em;">Are you sure?</h3>
          <div id="uiConfirmMessage" style="color:#94a3b8;font-size:0.95rem;margin-bottom:28px;line-height:1.6;"></div>
          <div style="display:flex;gap:14px;" id="uiConfirmButtons">
            <button id="uiCancelBtn" onclick="closeUiConfirm(false)" style="flex:1;padding:12px 20px;border-radius:10px;background:rgba(255,255,255,0.05);color:#e2e8f0;border:1px solid rgba(255,255,255,0.1);font-weight:600;font-size:0.95rem;cursor:pointer;transition:all 0.2s;">Cancel</button>
            <button id="uiConfirmActionBtn" onclick="closeUiConfirm(true)" style="flex:1;padding:12px 20px;border-radius:10px;background:linear-gradient(135deg, #0ea5e9, #0284c7);color:#fff;border:none;font-weight:600;font-size:0.95rem;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 15px rgba(2,132,199,0.3);">Confirm</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
});

let uiConfirmCallback = null;

window.showUIConfirm = function(title, messageHtml, isDanger, callback) {
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
        actionBtn.style.boxShadow = '0 4px 15px rgba(220,38,38,0.3)';
        actionBtn.textContent = 'Yes, Proceed';
        box.style.borderColor = 'rgba(239,68,68,0.4)';
    } else {
        iconBox.innerHTML = '<i class="fas fa-question-circle"></i>';
        iconBox.style.color = '#38bdf8';
        iconBox.style.background = 'rgba(56,189,248,0.15)';
        actionBtn.style.background = 'linear-gradient(135deg, #0ea5e9, #0284c7)';
        actionBtn.style.boxShadow = '0 4px 15px rgba(2,132,199,0.3)';
        actionBtn.textContent = 'Confirm';
        box.style.borderColor = 'rgba(56,189,248,0.4)';
    }
    
    document.getElementById('uiCancelBtn').style.display = 'block';
    openModalAnim();
};

window.showUIAlert = function(title, messageHtml, isSuccess, callback) {
    uiConfirmCallback = callback || null;
    document.getElementById('uiConfirmTitle').textContent = title;
    document.getElementById('uiConfirmMessage').innerHTML = messageHtml;
    
    const iconBox = document.getElementById('uiConfirmIcon');
    const actionBtn = document.getElementById('uiConfirmActionBtn');
    const box = document.getElementById('uiConfirmBox');
    
    if (isSuccess) {
        iconBox.innerHTML = '<i class="fas fa-check-circle"></i>';
        iconBox.style.color = '#10b981';
        iconBox.style.background = 'rgba(16,185,129,0.15)';
        actionBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        actionBtn.style.boxShadow = '0 4px 15px rgba(16,185,129,0.3)';
        box.style.borderColor = 'rgba(16,185,129,0.4)';
    } else {
        iconBox.innerHTML = '<i class="fas fa-info-circle"></i>';
        iconBox.style.color = '#f59e0b';
        iconBox.style.background = 'rgba(245,158,11,0.15)';
        actionBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        actionBtn.style.boxShadow = '0 4px 15px rgba(245,158,11,0.3)';
        box.style.borderColor = 'rgba(245,158,11,0.4)';
    }
    
    document.getElementById('uiCancelBtn').style.display = 'none';
    actionBtn.textContent = 'OK';
    
    openModalAnim();
};

function openModalAnim() {
    const modal = document.getElementById('uiConfirmModal');
    const box = document.getElementById('uiConfirmBox');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.style.opacity = '1';
        box.style.transform = 'scale(1)';
    }, 10);
}

window.closeUiConfirm = function(confirmed) {
    const modal = document.getElementById('uiConfirmModal');
    const box = document.getElementById('uiConfirmBox');
    
    modal.style.opacity = '0';
    box.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        modal.style.display = 'none';
        if (uiConfirmCallback) {
            const cb = uiConfirmCallback;
            uiConfirmCallback = null;
            cb(confirmed);
        }
    }, 200);
};

// === GLOBAL THEME LOGIC ===
document.addEventListener("DOMContentLoaded", function () {
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
    }
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn && document.body.classList.contains('light-mode')) {
        themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
        themeBtn.style.color = '#fcd34d';
        themeBtn.style.background = 'rgba(245,158,11,0.15)';
        if (themeBtn.style.borderColor) themeBtn.style.borderColor = 'rgba(245,158,11,0.4)';
    }
});

window.toggleTheme = function() {
    const body = document.body;
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    document.querySelectorAll('#themeToggleBtn').forEach(btn => {
        if (isLight) {
            btn.innerHTML = '<i class="fas fa-sun"></i>';
            btn.style.color = '#fcd34d';
            btn.style.background = 'rgba(245,158,11,0.15)';
            if (btn.style.borderColor) btn.style.borderColor = 'rgba(245,158,11,0.4)';
        } else {
            btn.innerHTML = '<i class="fas fa-moon"></i>';
            btn.style.color = '#a5b4fc';
            btn.style.background = 'rgba(255, 255, 255, 0.05)';
            if (btn.style.borderColor) btn.style.borderColor = 'rgba(255,255,255,0.08)';
        }
    });
};

window.toggleFocusMode = function() {
    const body = document.body;
    body.classList.toggle('focus-mode');
    
    document.querySelectorAll('#focusModeBtn').forEach(btn => {
        if (body.classList.contains('focus-mode')) {
            btn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i>';
            btn.style.background = 'rgba(56,189,248,0.15)';
            if (btn.style.borderColor) btn.style.borderColor = 'rgba(56,189,248,0.4)';
        } else {
            btn.innerHTML = '<i class="fas fa-expand-arrows-alt"></i>';
            btn.style.background = 'transparent';
            if (btn.style.borderColor) btn.style.borderColor = 'transparent';
        }
    });
};
