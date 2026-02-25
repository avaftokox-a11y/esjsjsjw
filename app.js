// app.js - wszystkie funkcje i zabezpieczenia

// ==================== KONFIGURACJA ====================
const BIN_ID = '699b66ea43b1c97be9947e2f';
const API_KEY = '$2a$10$RjWg9.uyQvQcCa9ZYTAMhuEuljziWE3FW8Fr462VCzkw3zCjntw1C';
const ADMIN_PASS = 'ltcadmin2024';
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1475854232069476393/87gga4miy3_n9If6-Pr1nxeI4QnSB8HJaIm37g6Q5ErtGAcBatsaHSNdOJ6WxoVoMTtV';

// ==================== DANE GLOBALNE ====================
let files = [];
let keys = [];
let users = [];
let coupons = [];
let currentUser = null;
let isAdmin = false;
let selectedDays = 30;
let uploadedFile = null;
let userIP = 'nieznane';
let dataLoaded = false;

// ==================== ZABEZPIECZENIA DEVTOOLS ====================
(function() {
    'use strict';

    // Blokada klawiszy
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') || 
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.key === 'U') ||
            (e.ctrlKey && e.shiftKey && e.key === 'C') ||
            (e.ctrlKey && e.key === 'R') ||
            e.key === 'F5') {
            
            e.preventDefault();
            e.stopPropagation();
            logDevTools('Próba użycia devtools');
            return false;
        }
    }, true);

    // Blokada prawego przycisku
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        logDevTools('Próba użycia prawego przycisku');
        return false;
    }, true);

    // Detekcja debuggera
    setInterval(function() {
        const start = performance.now();
        debugger;
        const end = performance.now();
        
        if (end - start > 100) {
            lockPage('Wykryto debugger');
        }
    }, 2000);

    // Detekcja rozmiaru okna
    let devToolsOpen = false;
    setInterval(function() {
        const widthThreshold = window.outerWidth - window.innerWidth > 160;
        const heightThreshold = window.outerHeight - window.innerHeight > 160;
        
        if (widthThreshold || heightThreshold) {
            if (!devToolsOpen) {
                devToolsOpen = true;
                lockPage('Wykryto narzędzia deweloperskie');
            }
        } else {
            devToolsOpen = false;
        }
    }, 500);

    // Blokada zaznaczania
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
    });

    // Blokada kopiowania
    document.addEventListener('copy', function(e) {
        e.preventDefault();
        logDevTools('Próba kopiowania');
    });

    // Blokada przeciągania
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
    });

    // Ochrona przed clickjacking
    if (window.top !== window.self) {
        window.top.location = window.self.location;
    }

    // Funkcja blokady strony
    function lockPage(reason) {
        document.body.innerHTML = `
            <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:#0a0c12; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:monospace; padding:20px; text-align:center; z-index:999999">
                <div style="font-size:48px; margin-bottom:20px;">🚫</div>
                <div style="font-size:24px; margin-bottom:10px;">DOSTĘP ZABLOKOWANY</div>
                <div style="color:#ff6b6b; margin-bottom:20px;">${reason}</div>
                <button onclick="location.reload()" style="padding:12px 30px; background:#3b82f6; border:none; color:#fff; border-radius:8px; cursor:pointer;">odśwież stronę</button>
            </div>
        `;
        
        fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                content: `🚨 DEVTOOLS WYKRYTE! ${reason} IP: ${userIP}` 
            })
        });
    }

    function logDevTools(message) {
        console.warn('⚠️', message);
        fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                content: `⚠️ ${message} IP: ${userIP}` 
            })
        });
    }

    window.security = { lockPage, logDevTools };
})();

// ==================== POMOCNICZE ====================
function escape(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#039;';
        return m;
    });
}

function showToast(msg, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== LOGOWANIE/REJESTRACJA ====================
function switchTab(tab) {
    document.querySelectorAll('.login-tab').forEach(b => b.classList.remove('active'));
    if (tab === 'login') {
        document.querySelectorAll('.login-tab')[0].classList.add('active');
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
    } else {
        document.querySelectorAll('.login-tab')[1].classList.add('active');
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
    }
}

async function userRegister() {
    let name = escape(document.getElementById('registerName').value).trim();
    let email = escape(document.getElementById('registerEmail').value).trim().toLowerCase();
    let pass = document.getElementById('registerPassword').value;

    if (!name || !email || !pass) return showToast('wypełnij pola', 'error');
    if (!email.includes('@')) return showToast('zły email', 'error');
    if (pass.length < 6) return showToast('hasło za krótkie', 'error');
    if (users.find(u => u.email === email)) return showToast('email istnieje', 'error');

    users.push({
        name, email,
        password: btoa(pass),
        role: 'user',
        ip: userIP,
        license: null,
        downloads: 0,
        registered: new Date().toISOString().split('T')[0],
        lastLogin: null
    });

    await saveData();
    showToast('zarejestrowano', 'success');
    switchTab('login');
}

async function userLogin() {
    let email = escape(document.getElementById('loginEmail').value).trim().toLowerCase();
    let pass = document.getElementById('loginPassword').value;
    let user = users.find(u => u.email === email && atob(u.password) === pass);

    if (!user) return showToast('złe dane', 'error');

    user.ip = userIP;
    user.lastLogin = new Date().toISOString();
    currentUser = user;

    // Przełącz na panel
    document.querySelector('.app').classList.add('panel-mode');
    document.querySelector('.login-card').style.display = 'none';
    showUserPanel();
    await saveData();
}

// ==================== PANEL UŻYTKOWNIKA ====================
function showUserPanel() {
    let main = document.querySelector('.app');
    
    let panelHTML = `
        <div class="panel-grid">
            <div class="sidebar">
                <div class="avatar">👤</div>
                <div class="user-name">${escape(currentUser.name)}</div>
                <div class="user-email">${escape(currentUser.email)}</div>

                <div class="license-box" id="licenseBox">
                    <input type="text" id="licenseKeyInput" placeholder="klucz licencji">
                    <button onclick="activateLicense()" style="width:100%">aktywuj</button>
                </div>

                <div class="stats" id="userStats" style="display:none">
                    <div class="stat-row">
                        <span>klucz</span>
                        <span id="userLicenseKey">••••••••</span>
                    </div>
                    <div class="stat-row">
                        <span>status</span>
                        <span id="userLicenseStatus">aktywna</span>
                    </div>
                    <div class="stat-row">
                        <span>ważny do</span>
                        <span id="userLicenseExpiry">-</span>
                    </div>
                    <div class="stat-row">
                        <span>pobrań</span>
                        <span id="userDownloads">0</span>
                    </div>
                </div>

                <button class="small danger" onclick="userLogout()" style="width:100%; margin-top:20px">wyloguj</button>
            </div>

            <div class="main-panel" id="userMain" style="display:none">
                <h3>pliki</h3>
                <div class="files-grid" id="filesGrid"></div>
            </div>

            <div class="main-panel" id="noLicense">
                <h3>pliki</h3>
                <div style="text-align:center; padding:60px 20px; color:#94a3b8">
                    <p>wpisz klucz licencji</p>
                </div>
            </div>
        </div>
        <div class="footer">
            <div>ltc leaks // 2026</div>
            <div>${escape(currentUser.name)}</div>
        </div>
    `;

    main.innerHTML = panelHTML;
}

function userLogout() {
    currentUser = null;
    location.reload();
}

// ==================== BAZA DANYCH ====================
async function loadData() {
    try {
        let res = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
            headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': false }
        });
        if (!res.ok) throw new Error('błąd');
        let data = await res.json();
        
        files = data.files || [];
        keys = data.licenses || [];
        users = data.users || [];
        coupons = data.coupons || [];
        dataLoaded = true;
        
        if (currentUser) {
            let u = users.find(u => u.email === currentUser.email);
            if (u) currentUser = u;
        }
    } catch (e) {
        console.log('błąd ładowania');
    }
}

async function saveData() {
    if (!dataLoaded) return;
    try {
        await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
            body: JSON.stringify({ files, licenses: keys, users, coupons })
        });
    } catch (e) {}
}

// ==================== START ====================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setInterval(loadData, 30000);
    
    // Pobierz IP
    fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => userIP = d.ip)
        .catch(() => {});
});
