// ====== SYSTEM DATA & INITIALIZATION ======
const DEMO_USERS = {
    'citizen@smartwaste.com': { name: 'Demo Citizen', role: 'citizen', password: '123456', points: 150 },
    'admin@smartwaste.com': { name: 'System Admin', role: 'admin', password: 'admin123', points: 0 }
};

const DEFAULT_COMPLAINTS = [
    { id: 'SW-2026-001', type: 'Overflowing Bin', location: 'Sector 12 Market', date: '2026-09-28', priority: 'High', status: 'Pending', citizen: 'Demo Citizen' },
    { id: 'SW-2026-002', type: 'Illegal Dumping', location: 'Ring Road', date: '2026-09-29', priority: 'High', status: 'Resolved', citizen: 'Aman K.' },
    { id: 'SW-2026-003', type: 'Garbage on Road', location: 'College Avenue', date: '2026-09-30', priority: 'Medium', status: 'Pending', citizen: 'Priya S.' }
];

// System Reset Logic agar pehle ka data kharab ho
if (!localStorage.getItem('sw_system_init_final')) {
    localStorage.removeItem('sw_complaints'); 
    localStorage.setItem('sw_complaints', JSON.stringify(DEFAULT_COMPLAINTS));
    localStorage.setItem('sw_system_init_final', 'true'); 
}

let currentUser = JSON.parse(sessionStorage.getItem('sw_user')) || null;
let complaints = JSON.parse(localStorage.getItem('sw_complaints')) || [];
let pickups = JSON.parse(localStorage.getItem('sw_pickups')) || [];
let feedbacks = JSON.parse(localStorage.getItem('sw_feedbacks')) || [];
let chartsInstances = [];
let mapInstance = null;

// ====== APP INITIALIZATION ======
document.addEventListener('DOMContentLoaded', () => {
    updateNav();
    if (currentUser) {
        document.getElementById('landing-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'flex';
        renderSidebar();
        showView(currentUser.role === 'admin' ? 'view-admin-dashboard' : 'view-citizen-dashboard');
    } else {
        showView('view-landing');
    }

    document.getElementById('hamburger').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    const pd = document.getElementById('pickup-date'); if (pd) pd.min = new Date().toISOString().split('T')[0];
    // Event Listeners
    if(document.getElementById('auth-form')) document.getElementById('auth-form').addEventListener('submit', handleAuth);
    if(document.getElementById('report-form')) document.getElementById('report-form').addEventListener('submit', handleReportSubmit);
    if(document.getElementById('report-photo')) document.getElementById('report-photo').addEventListener('change', handleImageUpload);
    if(document.getElementById('pickup-form')) document.getElementById('pickup-form').addEventListener('submit', handlePickupSubmit);
    if(document.getElementById('feedback-form')) document.getElementById('feedback-form').addEventListener('submit', handleFeedbackSubmit);
});

// ====== NAVIGATION & VIEWS ======
function showView(viewId) {
    syncData();
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active-view'));
    document.getElementById(viewId).classList.add('active-view');
    
    if (viewId === 'view-citizen-dashboard') loadCitizenDashboard();
    if (viewId === 'view-admin-dashboard') loadAdminDashboard();
    if (viewId === 'view-admin-database') loadAdminDatabase();
    if (viewId === 'view-admin-feedback') loadAdminFeedback();
    if (viewId === 'view-eco') loadEcoPoints();
    if (viewId === 'view-hotspots') setTimeout(initMap, 100);
    if (viewId === 'view-citizen-dashboard' || viewId === 'view-admin-dashboard') renderPickupTables();
    const sb = document.getElementById('sidebar'); if (sb) sb.classList.remove('open');
    document.querySelectorAll('.sidebar li').forEach(li => li.classList.toggle('active', (li.getAttribute('onclick') || '').includes(`'${viewId}'`)));
    afterView(viewId);
}

function updateNav() {
    const navContainer = document.getElementById('nav-links-container');
    if (currentUser) {
        navContainer.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="logout()"><i class="fa-solid fa-power-off"></i> Logout</button>`;
    } else {
        navContainer.innerHTML = `<button class="btn btn-outline btn-sm" onclick="showAuth('login')">Login to Portal</button>`;
    }
}

function renderSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (currentUser.role === 'citizen') {
        sidebar.innerHTML = `
            <ul>
                <li onclick="showView('view-citizen-dashboard')"><i class="fa-solid fa-border-all"></i> My Dashboard</li>
                <li onclick="showView('view-report')"><i class="fa-solid fa-camera-retro"></i> New Report</li>
                <li onclick="showView('view-pickup')"><i class="fa-solid fa-truck"></i> Request Pickup</li>
                <li onclick="showView('view-track')"><i class="fa-solid fa-magnifying-glass-location"></i> Track Status</li>
                <li onclick="showView('view-eco')"><i class="fa-solid fa-leaf"></i> Eco & Awareness</li>
                <li onclick="showView('view-feedback')"><i class="fa-solid fa-comment-dots"></i> App Feedback</li>
            </ul>
        `;
    } else {
        sidebar.innerHTML = `
            <ul>
                <li onclick="showView('view-admin-dashboard')"><i class="fa-solid fa-chart-line"></i> Command Center</li>
                <li onclick="showView('view-hotspots')"><i class="fa-solid fa-map-location"></i> Map Hotspots</li>
                <li onclick="showView('view-admin-feedback')"><i class="fa-solid fa-star"></i> View Feedbacks</li>
                <li onclick="showView('view-admin-announce')"><i class="fa-solid fa-bullhorn"></i> Awareness Broadcasts</li>
                <li onclick="showView('view-admin-database')"><i class="fa-solid fa-database"></i> System Database</li>
                <li onclick="showView('view-admin-route')"><i class="fa-solid fa-route"></i> Route Strategy</li>
                <li onclick="showView('view-admin-bins')"><i class="fa-solid fa-trash-can-arrow-up"></i> Smart Bins (IoT)</li>
                <li onclick="showView('view-future')"><i class="fa-solid fa-rocket"></i> Future Scope</li>
            </ul>
        `;
    }
}

// ====== AUTHENTICATION ======
let isLoginMode = true;
function showAuth(mode) {
    document.getElementById('landing-container').style.display = 'block';
    document.getElementById('app-container').style.display = 'none';
    showView('view-auth');
    isLoginMode = mode === 'login';
    document.getElementById('auth-title').innerText = isLoginMode ? 'System Login' : 'Create Account';
    document.getElementById('name-group').style.display = isLoginMode ? 'none' : 'block';
    document.getElementById('role-group').style.display = isLoginMode ? 'none' : 'block';
    document.getElementById('auth-btn').innerText = isLoginMode ? 'Access Dashboard' : 'Register';
    document.getElementById('auth-switch-text').innerHTML = isLoginMode ? 
        `New user? <a href="#" onclick="showAuth('register')">Create Account</a>` : 
        `Already have account? <a href="#" onclick="showAuth('login')">Login</a>`;
}

function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (isLoginMode) {
        const acct = getUsers()[email];
        if (acct && acct.password === password) {
            currentUser = {...acct};
            currentUser.email = email;
            loginSuccess();
        } else {
            showToast('Invalid credentials. Check demo accounts below.', 'error');
        }
    } else {
        const name = document.getElementById('auth-name').value;
        const role = document.getElementById('auth-role').value;
        if (getUsers()[email]) { showToast('Email already registered. Please login.', 'error'); return; }
        currentUser = { name, role, email, password, points: 0 };
        loginSuccess();
    }
}

function loginSuccess() {
    saveUser();
    document.getElementById('landing-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    updateNav();
    renderSidebar();
    showView(currentUser.role === 'admin' ? 'view-admin-dashboard' : 'view-citizen-dashboard');
    showToast(`Welcome to Dashboard, ${currentUser.name}`, 'success');
}

function logout() {
    sessionStorage.removeItem('sw_user');
    currentUser = null;
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('landing-container').style.display = 'block';
    updateNav();
    showView('view-landing');
}

// ====== LOCATION HANDLER ======
function getLocation() {
    if (navigator.geolocation) {
        showToast('Requesting GPS location...', 'success');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const la = pos.coords.latitude.toFixed(4), lo = pos.coords.longitude.toFixed(4), inp = document.getElementById('report-location');
                inp.value = `${la}, ${lo}`;
                fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${la}&lon=${lo}`).then(r => r.json()).then(d => { if (d.display_name) inp.value = `${d.display_name.split(',').slice(0, 3).join(',').trim()} (${la}, ${lo})`; }).catch(() => {});
                showToast('GPS coordinates fetched successfully.', 'success');
            },
            (error) => {
                showToast('Location permission denied! Please type location manually in the box.', 'error');
            }
        );
    } else {
        showToast('Geolocation is not supported by your browser.', 'error');
    }
}

// ====== CITIZEN FUNCTIONS ======
function loadCitizenDashboard() {
    complaints = JSON.parse(localStorage.getItem('sw_complaints')) || [];
    document.getElementById('welcome-message').innerText = `Welcome back, ${currentUser.name}`;
    const myComplaints = complaints.filter(c => c.citizen === currentUser.name);
    
    if(document.getElementById('c-stat-total')){
        document.getElementById('c-stat-total').innerText = myComplaints.length;
        document.getElementById('c-stat-pending').innerText = myComplaints.filter(c => c.status !== 'Resolved').length;
        document.getElementById('c-stat-resolved').innerText = myComplaints.filter(c => c.status === 'Resolved').length;
        document.getElementById('c-stat-points').innerText = currentUser.points || 0;
    }

    const tbody = document.querySelector('#citizen-complaints-table tbody');
    if(tbody){
        tbody.innerHTML = '';
        myComplaints.slice().reverse().forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td>${c.id}</td>
                    <td><b>${c.type}</b></td>
                    <td>${esc(c.location)}</td>
                    <td>${c.date}</td>
                    <td><span class="badge ${bcls(c.status)}">${c.status}</span></td>
                </tr>
            `;
        });
    }
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('photo-preview').src = e.target.result;
            document.getElementById('photo-preview').style.display = 'block';
            simulateAIAnalysis(); 
        }
        reader.readAsDataURL(file);
    }
}

function simulateAIAnalysis() {
    const aiPanel = document.getElementById('ai-analysis-panel');
    const scanningBar = document.querySelector('.scanning-bar');
    const aiResults = document.getElementById('ai-results');
    
    aiPanel.style.display = 'block';
    scanningBar.style.display = 'block';
    aiResults.style.display = 'none';

    setTimeout(() => {
        scanningBar.style.display = 'none';
        aiResults.style.display = 'block';
        const type = document.getElementById('report-type').value;
        let severity = type.includes('Dumping') || type.includes('Overflowing') ? 'High' : 'Medium';
        window.lastSeverity = severity;
        document.getElementById('ai-confidence').innerText = (Math.random() * 10 + 85).toFixed(1) + '%';
        const sevBadge = document.getElementById('ai-severity');
        sevBadge.innerText = severity;
        sevBadge.className = `badge ${severity.toLowerCase()}`;
    }, 1500);
}

function handleReportSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('report-type').value;
    const location = document.getElementById('report-location').value;
    let priority = window.lastSeverity || (type.includes('Dumping') ? 'High' : 'Medium');

    const newComplaint = {
        id: `SW-2026-${Math.floor(Math.random() * 900 + 100)}`,
        type, location, priority,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        citizen: currentUser.name
    };

    complaints.push(newComplaint);
    localStorage.setItem('sw_complaints', JSON.stringify(complaints));
    currentUser.points += 10;
    saveUser();

    showToast('Report submitted! +10 Eco Points', 'success');
    window.lastSeverity = null;
    e.target.reset();
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('ai-analysis-panel').style.display = 'none';
    showView('view-citizen-dashboard');
}

// Pickup Request
function handlePickupSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('pickup-type').value;
    const date = document.getElementById('pickup-date').value;
    const address = document.getElementById('pickup-address').value;

    const newPickup = {
        id: `PK-${Math.floor(Math.random() * 9000 + 1000)}`,
        type, date, address,
        status: 'Scheduled',
        citizen: currentUser.name
    };

    pickups.push(newPickup);
    localStorage.setItem('sw_pickups', JSON.stringify(pickups));
    showToast(`Pickup scheduled! ID: ${newPickup.id}`, 'success');
    e.target.reset();
    showView('view-citizen-dashboard');
}

// Feedback
function handleFeedbackSubmit(e) {
    e.preventDefault();
    const rating = document.getElementById('feedback-rating').value;
    const desc = document.getElementById('feedback-desc').value;

    feedbacks.push({
        citizen: currentUser.name,
        rating: rating,
        comments: desc,
        date: new Date().toISOString().split('T')[0]
    });

    localStorage.setItem('sw_feedbacks', JSON.stringify(feedbacks));
    showToast('Thank you for your feedback!', 'success');
    e.target.reset();
    showView('view-citizen-dashboard');
}

function trackComplaint() {
    const id = document.getElementById('track-id').value.trim().toUpperCase();
    complaints = JSON.parse(localStorage.getItem('sw_complaints')) || [];
    pickups = JSON.parse(localStorage.getItem('sw_pickups')) || [];
    let record = complaints.find(c => c.id === id), isPickup = false;
    if (!record) { record = pickups.find(p => p.id === id); isPickup = true; }
    if (!record) { showToast('ID not found', 'error'); return; }
    document.getElementById('tracking-result').style.display = 'block';
    document.getElementById('track-title').innerText = `Status for ${record.id}`;
    const step = (on, icon, t, txt) => `<div class="timeline-item ${on ? 'active' : ''}"><div class="timeline-dot"><i class="fa-solid ${icon}"></i></div><h4>${t}</h4><p>${txt}</p></div>`;
    let html;
    if (isPickup) {
        const done = record.status === 'Completed';
        html = step(true, 'fa-truck', 'Pickup Scheduled', `${record.date} at ${esc(record.address)}`) + step(done, 'fa-check', 'Completed', done ? 'Waste collected' : 'Waiting for collection day');
    } else {
        const st = record.status;
        html = step(true, 'fa-file-signature', 'Reported', `${record.date} by ${esc(record.citizen)}`)
             + step(st !== 'Pending', 'fa-person-digging', 'In Progress', st === 'Pending' ? 'Waiting for team assignment' : 'Team assigned')
             + step(st === 'Resolved', 'fa-check', 'Resolved', st === 'Resolved' ? 'Issue fixed by Admin' : 'Not resolved yet');
    }
    document.getElementById('tracking-timeline').innerHTML = html;
}

// ====== DYNAMIC QUIZ LOGIC ======
const quizQuestions = [
    { q: "Kele ka chilka (Banana peel) kahan daalna chahiye?", options: ["Wet Waste (Geela Kachra)", "Dry Waste (Sookha Kachra)", "Hazardous Waste"], ans: 0 },
    { q: "Plastic ki paani ki botal kisme jayegi?", options: ["Wet Waste", "Recyclable / Dry Waste", "E-Waste"], ans: 1 },
    { q: "Purana mobile phone ya remote ki battery kahan fekna chahiye?", options: ["Wet Waste", "Dry Waste", "E-Waste / Hazardous"], ans: 2 },
    { q: "Dawai ki expired strip ya syringe kahan jayegi?", options: ["Wet Waste", "Biomedical / Hazardous", "Dry Waste"], ans: 1 },
    { q: "Gili aur sookhi waste ko alag rakhne ko kya kehte hain?", options: ["Segregation", "Incineration", "Dumping"], ans: 0 }
];
let currentQ = 0;

function renderQuiz() {
    const container = document.getElementById('quiz-container');
    if(!container) return;
    if(currentQ >= quizQuestions.length) {
        container.innerHTML = `<div class="text-center"><h4>Aapne saare questions poore kar liye! 🎉</h4><button class="btn btn-primary mt-2" onclick="currentQ=0; renderQuiz()">Restart Quiz</button></div>`;
        return;
    }
    const qData = quizQuestions[currentQ];
    let html = `<p class="quiz-question">Q${currentQ + 1}: ${qData.q}</p><div class="quiz-options-grid">`;
    qData.options.forEach((opt, idx) => {
        html += `<button class="btn btn-outline" onclick="handleQuizAnswer(${idx})">${opt}</button>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function handleQuizAnswer(selectedIdx) {
    if(selectedIdx === quizQuestions[currentQ].ans) {
        showToast('Sahi Jawab! +5 Eco Points', 'success');
        currentUser.points = (currentUser.points || 0) + 5;
        saveUser();
        if(document.getElementById('eco-total')) document.getElementById('eco-total').innerText = currentUser.points;
    } else {
        showToast('Galat Jawab! Koi baat nahi, aage badhein.', 'error');
    }
    currentQ++;
    setTimeout(renderQuiz, 800);
}

function loadEcoPoints() {
    if(document.getElementById('eco-total')) document.getElementById('eco-total').innerText = currentUser.points || 0;
    const list = document.getElementById('leaderboard-list');
    if(list) {
        list.innerHTML = `
            <li><span>1. ${currentUser.name}</span> <span>${currentUser.points || 0} pts</span></li>
            <li><span>2. Rahul M.</span> <span>420 pts</span></li>
            <li><span>3. Priya S.</span> <span>390 pts</span></li>
            <li><span>4. Aman K.</span> <span>310 pts</span></li>
        `;
    }
    renderQuiz();
}

// ====== ADMIN DATABASE & GRID FUNCTIONS ======
function loadAdminDashboard() {
    if(document.getElementById('a-stat-total')){
        document.getElementById('a-stat-total').innerText = complaints.length;
        document.getElementById('a-stat-pending').innerText = complaints.filter(c => c.status !== 'Resolved').length;
    }

    const tbody = document.querySelector('#admin-complaints-table tbody');
    if(tbody){
        tbody.innerHTML = '';
        const pendingList = complaints.filter(c => c.status !== 'Resolved').slice().reverse();
        if(pendingList.length === 0) tbody.innerHTML = '<tr><td colspan="5" class="text-center">No pending tasks! Good job.</td></tr>';
        
        pendingList.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td><b>${c.id}</b></td>
                    <td>${c.type}<br><small class="text-light"><i class="fa-solid fa-location-dot"></i> ${esc(c.location)}</small></td>
                    <td><span class="badge ${c.priority.toLowerCase()}">${c.priority}</span></td>
                    <td><span class="badge ${bcls(c.status)}">${c.status}</span></td>
                    <td>${c.status === 'Pending' ? `<button class="btn btn-secondary btn-sm" onclick="startComplaint('${c.id}')"><i class="fa-solid fa-play"></i> Start</button>` : ''} <button class="btn btn-primary btn-sm" onclick="resolveComplaint('${c.id}')"><i class="fa-solid fa-check"></i> Resolve</button></td>
                </tr>
            `;
        });
    }

    // Delay drawing charts so the grey boxes have time to become visible first
    setTimeout(renderCharts, 200); 
}

function loadAdminDatabase() {
    const tbody = document.querySelector('#admin-db-table tbody');
    if(tbody){
        tbody.innerHTML = '';
        complaints.slice().reverse().forEach(c => {
            const isPending = c.status !== 'Resolved';
            tbody.innerHTML += `
                <tr>
                    <td><span style="font-family: monospace; color: var(--primary);">${c.id}</span></td>
                    <td>${c.type}</td>
                    <td><i class="fa-solid fa-user"></i> ${esc(c.citizen)}</td>
                    <td>${c.date}</td>
                    <td><span class="badge ${bcls(c.status)}">${c.status}</span></td>
                    <td>
                        ${isPending ? `<button class="btn btn-primary btn-sm" onclick="resolveComplaint('${c.id}'); loadAdminDatabase();"><i class="fa-solid fa-check"></i></button>` : `<i class="fa-solid fa-shield-check text-success" style="color:var(--success);"></i> Fixed`}
                        <button class="btn btn-outline btn-sm text-danger" style="border-color: var(--danger); margin-left: 5px;" onclick="deleteRecord('${c.id}')"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    }
}

function loadAdminFeedback() {
    const tbody = document.querySelector('#admin-feedback-table tbody');
    if(tbody){
        tbody.innerHTML = '';
        if(feedbacks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No feedback received yet.</td></tr>';
            return;
        }
        feedbacks.slice().reverse().forEach(f => {
            tbody.innerHTML += `
                <tr>
                    <td><b>${esc(f.citizen)}</b></td>
                    <td>${'⭐'.repeat(f.rating)}</td>
                    <td>${esc(f.comments)}</td>
                    <td>${f.date}</td>
                </tr>
            `;
        });
    }
}

// ====== CHARTS RENDER LOGIC ======
function renderCharts() {
    const statusEl = document.getElementById('chart-status');
    const typeEl = document.getElementById('chart-type');
    if (!statusEl || !typeEl) return;

    chartsInstances.forEach(c => c.destroy());
    chartsInstances = [];

    const pendingCount = complaints.filter(c => c.status === 'Pending').length;
    const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

    chartsInstances.push(new Chart(statusEl.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Resolved'],
            datasets: [{ data: [pendingCount, resolvedCount], backgroundColor: ['#f59e0b', '#10b981'], borderWidth: 0 }]
        },
        options: { plugins: { legend: { position: 'bottom' } }, responsive: true, maintainAspectRatio: false }
    }));

    chartsInstances.push(new Chart(typeEl.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Overflowing Bin','Garbage on Road','Illegal Dumping','Missed Collection'],
            datasets: [{ label: 'Reports', data: ['Overflowing Bin','Garbage on Road','Illegal Dumping','Missed Collection'].map(t => complaints.filter(c => c.type === t).length),
                backgroundColor: '#3b82f6', borderRadius: 6
            }]
        },
        options: { plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: false }
    }));
}

function resolveComplaint(id) {
    const idx = complaints.findIndex(c => c.id === id);
    if(idx > -1) {
        complaints[idx].status = 'Resolved';
        localStorage.setItem('sw_complaints', JSON.stringify(complaints));
        showToast(`Task ${id} marked as Resolved!`, 'success');
        if(document.getElementById('view-admin-dashboard').classList.contains('active-view')) loadAdminDashboard();
    }
}

function deleteRecord(id) {
    if(confirm(`Are you sure you want to permanently delete record ${id}?`)) {
        complaints = complaints.filter(c => c.id !== id);
        localStorage.setItem('sw_complaints', JSON.stringify(complaints));
        showToast('Record deleted.', 'success');
        loadAdminDatabase();
    }
}

function factoryReset() {
    if(confirm("DANGER: Reset entire database?")) {
        localStorage.removeItem('sw_system_init_final'); localStorage.removeItem('sw_pickups'); localStorage.removeItem('sw_feedbacks'); localStorage.removeItem('sw_notifs'); localStorage.removeItem('sw_announcements'); localStorage.removeItem('sw_bins'); localStorage.removeItem('sw_geo'); localStorage.removeItem('sw_routes');
        location.reload(); 
    }
}

// ====== NAYA EXCEL (CSV) EXPORT FUNCTION ======
function exportDatabaseCSV() {
    if (complaints.length === 0) {
        showToast('Database is empty. Nothing to export.', 'error');
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Record ID,Issue Type,Location,Priority,Status,Reported By,Date\n";

    complaints.forEach(function(row) {
        let cleanLocation = `"${row.location.replace(/"/g, '""')}"`;
        let rowData = `${row.id},${row.type},${cleanLocation},${row.priority},${row.status},${row.citizen},${row.date}`;
        csvContent += rowData + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", encodedUri);
    downloadAnchorNode.setAttribute("download", "SmartWaste_Database_" + new Date().toISOString().split('T')[0] + ".csv");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    showToast('Database Excel (.csv) downloaded successfully!', 'success');
}

// ====== MAP INIT ======
function initMap() {
    if (mapInstance) mapInstance.remove();
    const mapEl = document.getElementById('map');
    if(!mapEl) return;
    
    mapInstance = L.map('map').setView([26.4499, 80.3319], 12); 
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);

    const KNOWN = {'sector 12 market':[26.45,80.33],'ring road':[26.46,80.31],'college avenue':[26.43,80.35]};
    const groups = {};
    complaints.filter(c => c.status !== 'Resolved').forEach(c => (groups[c.location] = groups[c.location] || []).push(c));
    Object.entries(groups).forEach(([loc, list]) => {
        const ll = geo(loc);
        const n = list.length, color = n >= 3 ? 'red' : n === 2 ? 'orange' : 'blue';
        L.circleMarker(ll, { radius: 8 + n * 4, fillColor: color, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.8 })
            .addTo(mapInstance).bindPopup(`<b>${esc(loc)}</b><br>${n} open report(s)`);
    });
    resolveGeo(Object.keys(groups), () => { if (document.getElementById('view-hotspots').classList.contains('active-view')) initMap(); });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = type === 'success' ? `<i class="fa-solid fa-circle-check" style="color:var(--success);font-size:1.2rem;"></i> ${message}` : `<i class="fa-solid fa-circle-exclamation" style="color:var(--danger);font-size:1.2rem;"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ====== HELPERS (added) ======
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function bcls(s) { return String(s).toLowerCase().replace(/\s+/g, '-'); }
function getUsers() { return { ...DEMO_USERS, ...JSON.parse(localStorage.getItem('sw_users') || '{}') }; }
function saveUser() {
    sessionStorage.setItem("sw_user", JSON.stringify(currentUser));
    if (currentUser && currentUser.email) {
        const u = JSON.parse(localStorage.getItem('sw_users') || '{}');
        u[currentUser.email] = { ...(u[currentUser.email] || DEMO_USERS[currentUser.email] || {}), ...currentUser };
        localStorage.setItem('sw_users', JSON.stringify(u));
    }
}
function startComplaint(id) {
    const c = complaints.find(x => x.id === id);
    if (c) { c.status = 'In Progress'; localStorage.setItem('sw_complaints', JSON.stringify(complaints)); showToast(`${id} is now In Progress`, 'success'); loadAdminDashboard(); }
}
function advancePickup(id) {
    const p = pickups.find(x => x.id === id);
    if (p) { p.status = 'Completed'; localStorage.setItem('sw_pickups', JSON.stringify(pickups)); showToast(`Pickup ${id} marked collected`, 'success'); renderPickupTables(); }
}
function renderPickupTables() {
    pickups = JSON.parse(localStorage.getItem('sw_pickups')) || [];
    const stat = document.getElementById('a-stat-pickups'); if (stat) stat.innerText = pickups.length;
    const at = document.querySelector('#admin-pickups-table tbody');
    if (at) at.innerHTML = pickups.length ? pickups.slice().reverse().map(p => `<tr><td><b>${p.id}</b></td><td>${esc(p.type)}<br><small class="text-light">${esc(p.address)}</small></td><td>${p.date}</td><td><span class="badge ${bcls(p.status)}">${p.status}</span></td><td>${p.status === 'Completed' ? '—' : `<button class="btn btn-primary btn-sm" onclick="advancePickup('${p.id}')">Mark Collected</button>`}</td></tr>`).join('') : '<tr><td colspan="5" class="text-center">No pickup requests yet.</td></tr>';
    const ct = document.querySelector('#citizen-pickups-table tbody');
    if (ct && currentUser) { const mine = pickups.filter(p => p.citizen === currentUser.name);
        ct.innerHTML = mine.length ? mine.slice().reverse().map(p => `<tr><td>${p.id}</td><td>${esc(p.type)}</td><td>${p.date}</td><td><span class="badge ${bcls(p.status)}">${p.status}</span></td></tr>`).join('') : '<tr><td colspan="4" class="text-center">No pickups yet.</td></tr>'; }
}

// =====================================================================
// ADMIN <-> CITIZEN CONNECT LAYER + AWARENESS (added)
// Data is shared through localStorage; login sessions are per-tab
// (sessionStorage), so Citizen and Admin can be open side by side.
// =====================================================================
const jget = (k, d) => { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); };
const jset = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const today = () => new Date().toISOString().split('T')[0];
const val = id => document.getElementById(id).value.trim();
const citizens = () => Object.values(getUsers()).filter(u => u.role === 'citizen');

function syncData() { complaints = jget('sw_complaints', []); pickups = jget('sw_pickups', []); feedbacks = jget('sw_feedbacks', []); }

// ---- Notifications (to: 'admin' or a citizen's name) ----
function notify(to, msg) { const n = jget('sw_notifs', []); n.push({ to, msg, date: today(), read: false }); jset('sw_notifs', n); renderBell(); }
function myNotifs() { if (!currentUser) return []; const to = currentUser.role === 'admin' ? 'admin' : currentUser.name; return jget('sw_notifs', []).filter(n => n.to === to); }
function renderBell() {
    const w = document.getElementById('bell-wrap'); if (!w) return;
    if (!currentUser) { w.innerHTML = ''; return; }
    const list = myNotifs(), unread = list.filter(n => !n.read).length;
    w.innerHTML = `<button class="btn btn-secondary btn-sm" onclick="toggleBell()"><i class="fa-solid fa-bell"></i>${unread ? `<span class="bell-count">${unread}</span>` : ''}</button>
        <div class="bell-panel" id="bell-panel" style="display:none">${list.length ? list.slice().reverse().slice(0, 8).map(n => `<div class="bell-item ${n.read ? '' : 'unread'}">${esc(n.msg)}<small>${n.date}</small></div>`).join('') : '<div class="bell-item">No notifications yet</div>'}</div>`;
}
function toggleBell() {
    const p = document.getElementById('bell-panel'), open = p.style.display === 'none';
    p.style.display = open ? 'block' : 'none';
    if (open) {
        const to = currentUser.role === 'admin' ? 'admin' : currentUser.name;
        jset('sw_notifs', jget('sw_notifs', []).map(n => n.to === to ? { ...n, read: true } : n));
        const c = document.querySelector('.bell-count'); if (c) c.remove();
    } else renderBell();
}
function addPoints(name, pts) {
    const e = Object.keys(getUsers()).find(k => getUsers()[k].name === name); if (!e) return;
    const u = jget('sw_users', {}); const cur = u[e] || getUsers()[e];
    u[e] = { ...cur, points: (cur.points || 0) + pts }; jset('sw_users', u);
}

// ---- Admin actions now notify the citizen ----
const _resolve = resolveComplaint, _start = startComplaint, _adv = advancePickup, _del = deleteRecord;
resolveComplaint = function (id) {
    syncData(); const c = complaints.find(x => x.id === id), was = c && c.status; _resolve(id);
    if (c && was !== 'Resolved') { notify(c.citizen, `✅ Your report ${id} (${c.type}) is resolved. +20 Eco Points!`); addPoints(c.citizen, 20); }
};
startComplaint = function (id) {
    syncData(); const c = complaints.find(x => x.id === id); _start(id);
    if (c) notify(c.citizen, `🛠 A team is now working on your report ${id}.`);
};
advancePickup = function (id) {
    syncData(); const p = pickups.find(x => x.id === id); _adv(id);
    if (p) { notify(p.citizen, `🚛 Your pickup ${id} has been collected. +15 Eco Points!`); addPoints(p.citizen, 15); }
};
deleteRecord = function (id) { syncData(); _del(id); };

// ---- Citizen actions now notify the admin ----
const _rep = handleReportSubmit, _pick = handlePickupSubmit, _fb = handleFeedbackSubmit;
handleReportSubmit = function (e) {
    syncData(); const n = complaints.length; _rep(e);
    if (complaints.length > n) { const c = complaints[complaints.length - 1]; notify('admin', `🆕 ${c.priority} priority report ${c.id}: ${c.type} at ${c.location} (${c.citizen})`); }
};
handlePickupSubmit = function (e) {
    syncData(); const n = pickups.length; _pick(e);
    if (pickups.length > n) { const p = pickups[pickups.length - 1]; notify('admin', `🚚 New pickup request ${p.id}: ${p.type} on ${p.date} (${p.citizen})`); }
};
handleFeedbackSubmit = function (e) {
    syncData(); const n = feedbacks.length; _fb(e);
    if (feedbacks.length > n) notify('admin', `⭐ New ${feedbacks[feedbacks.length - 1].rating}-star feedback from ${currentUser.name}`);
};

// ---- Announcements / awareness broadcasts ----
const DEFAULT_ANN = [
    { id: 'A1', title: 'Segregate at source', cat: 'Campaign', body: 'Use the green bin for wet waste and the blue bin for dry waste. Mixed waste may not be collected.', date: '2026-10-01' },
    { id: 'A2', title: 'E-waste drive this Sunday', cat: 'Alert', body: 'Hand over old phones, chargers and batteries at your ward office, or book a pickup from this app.', date: '2026-10-01' }
];
const getAnn = () => jget('sw_announcements', DEFAULT_ANN);
function renderAnnouncements(id, limit = 99, admin = false) {
    const el = document.getElementById(id); if (!el) return;
    const a = getAnn().slice().reverse().slice(0, limit);
    el.innerHTML = a.length ? a.map(x => `<div class="ann-item ann-${bcls(x.cat)}"><div class="ann-top"><span class="badge">${esc(x.cat)}</span><small>${x.date}</small>${admin ? `<button class="btn btn-outline btn-sm text-danger" onclick="deleteAnn('${x.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}</div><h4>${esc(x.title)}</h4><p>${esc(x.body)}</p></div>`).join('') : '<p class="text-light">No announcements yet.</p>';
}
function publishAnn(e) {
    e.preventDefault();
    const x = { id: 'A' + Date.now(), title: val('ann-title'), cat: val('ann-cat'), body: val('ann-body'), date: today() };
    jset('sw_announcements', [...getAnn(), x]);
    citizens().forEach(u => notify(u.name, `📢 ${x.title}`));
    e.target.reset(); renderAnnouncements('ann-admin', 99, true); showToast('Broadcast sent to all citizens', 'success');
}
function deleteAnn(id) { jset('sw_announcements', getAnn().filter(a => a.id !== id)); renderAnnouncements('ann-admin', 99, true); }

// ---- Extra awareness content for citizens ----
const TIPS = ['Carry a cloth bag: one bag saves hundreds of plastic bags in a lifetime.', 'Rinse and dry plastic and glass before putting them in the dry bin.', 'Never mix used batteries with household waste; they leak toxic metals.', 'Compost kitchen scraps at home: it cuts household waste by almost half.', 'Wrap broken glass in newspaper and label it before disposal to protect sanitation workers.', 'Say no to single-use cutlery and straws when ordering food.', 'Donate old clothes and furniture instead of throwing them away.'];
const FACTS = [['Banana peel', '2–5 weeks'], ['Paper', '2–5 months'], ['Cotton cloth', '1–5 months'], ['Tin can', '~50 years'], ['Plastic bottle', '~450 years'], ['Glass bottle', '1,000+ years']];
function renderAwareness() {
    const el = document.getElementById('awareness-extra'); if (!el) return;
    const pledged = currentUser && currentUser.pledged;
    el.innerHTML = `
    <div class="card mt-2 tip-card"><h3><i class="fa-solid fa-lightbulb"></i> Tip of the Day</h3><p>${TIPS[new Date().getDate() % TIPS.length]}</p></div>
    <div class="card mt-2"><h3><i class="fa-solid fa-hourglass-half"></i> How long does waste last? <small class="text-light">(approximate)</small></h3>
        <div class="facts-grid mt-1">${FACTS.map(f => `<div class="fact"><b>${f[0]}</b><span>${f[1]}</span></div>`).join('')}</div></div>
    <div class="grid-2 mt-2">
        <div class="card dd-do"><h3><i class="fa-solid fa-circle-check"></i> Do</h3><ul><li>Keep wet and dry waste separate</li><li>Hand waste to the collection van on time</li><li>Report overflowing bins using this app</li><li>Book a pickup for e-waste and bulk items</li></ul></div>
        <div class="card dd-dont"><h3><i class="fa-solid fa-circle-xmark"></i> Don't</h3><ul><li>Throw garbage on roads or in drains</li><li>Burn plastic or leaves</li><li>Mix medical waste with household waste</li><li>Dump construction debris in public places</li></ul></div>
    </div>
    <div class="card mt-2 text-center"><h3><i class="fa-solid fa-hand-holding-heart"></i> Clean City Pledge</h3>
        <p class="text-light">I will segregate my waste and keep my city clean.</p>
        <button class="btn btn-primary mt-1" ${pledged ? 'disabled' : ''} onclick="takePledge()">${pledged ? '✔ Pledge taken' : 'Take the Pledge (+10 pts)'}</button></div>`;
}
function takePledge() {
    if (currentUser.pledged) return;
    currentUser.pledged = true; currentUser.points = (currentUser.points || 0) + 10; saveUser();
    notify('admin', `🌱 ${currentUser.name} took the Clean City Pledge`);
    showToast('Pledge taken! +10 Eco Points', 'success'); loadEcoPoints(); renderAwareness();
}

// ---- More quiz questions (with a short explanation after each answer) ----
quizQuestions.push(
    { q: 'Green dustbin mein kya daalna chahiye?', options: ['Geela kachra (food, peels)', 'Plastic', 'Batteries'], ans: 0, exp: 'Green bin = wet/organic waste, which can be composted.' },
    { q: 'Pizza box par bahut tel laga hai. Kahan jayega?', options: ['Dry waste', 'Wet waste', 'Recycling bin'], ans: 1, exp: 'Oily or food-soiled paper cannot be recycled, so treat it as wet waste.' },
    { q: 'CFL bulb toot jaaye to kya karein?', options: ['Wet bin mein', 'Hazardous waste collection mein', 'Naali mein'], ans: 1, exp: 'CFL bulbs contain mercury and need hazardous waste handling.' },
    { q: 'Open mein plastic jalane se kya hota hai?', options: ['Kuch nahi', 'Zehreeli gas nikalti hai', 'Khaad banti hai'], ans: 1, exp: 'Burning plastic releases toxic fumes such as dioxins.' },
    { q: 'Kachra kam karne ka sabse accha tareeka kaun sa hai?', options: ['Recycle', 'Reduce & Reuse', 'Jalana'], ans: 1, exp: 'Reduce comes first: waste never created needs no disposal.' }
);
const _qa = handleQuizAnswer;
handleQuizAnswer = function (i) { const q = quizQuestions[currentQ]; _qa(i); if (q && q.exp) setTimeout(() => showToast('💡 ' + q.exp, 'success'), 400); };

// ---- Real leaderboard (replaces the fake names) ----
const _eco = loadEcoPoints;
loadEcoPoints = function () {
    _eco();
    const list = document.getElementById('leaderboard-list'); if (!list) return;
    const top = citizens().sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5);
    list.innerHTML = top.map((u, i) => `<li><span>${i + 1}. ${esc(u.name)}${u.name === currentUser.name ? ' (You)' : ''}</span><span>${u.points || 0} pts</span></li>`).join('');
};

// ---- Admin engagement stats ----
function renderEngagement() {
    const el = document.getElementById('admin-engagement'); if (!el) return;
    const c = citizens();
    const stat = (cls, ic, t, v) => `<div class="stat-card"><div class="icon-bg ${cls}"><i class="fa-solid ${ic}"></i></div><div class="stat-info"><h3>${t}</h3><p>${v}</p></div></div>`;
    el.innerHTML = stat('blue', 'fa-users', 'Citizens', c.length) + stat('green', 'fa-leaf', 'Eco Points Earned', c.reduce((s, u) => s + (u.points || 0), 0))
        + stat('purple', 'fa-hand-holding-heart', 'Pledges Taken', c.filter(u => u.pledged).length) + stat('orange', 'fa-bullhorn', 'Active Broadcasts', getAnn().length);
}

function afterView(id) {
    renderBell();
    if (id === 'view-citizen-dashboard') renderAnnouncements('ann-dashboard', 2);
    if (id === 'view-eco') { renderAnnouncements('ann-eco'); renderAwareness(); }
    if (id === 'view-admin-announce') renderAnnouncements('ann-admin', 99, true);
    if (id === 'view-admin-dashboard') renderEngagement();
}

// ---- Live sync between tabs (admin tab <-> citizen tab) ----
window.addEventListener('storage', e => {
    if (!currentUser || !e.key || !e.key.startsWith('sw_') || e.key === 'sw_user') return;
    const u = getUsers()[currentUser.email]; if (u) currentUser.points = u.points || 0;
    if (e.key === 'sw_notifs') { const l = myNotifs(), last = l[l.length - 1]; if (last && !last.read) showToast(last.msg, 'success'); }
    const v = document.querySelector('.view.active-view');
    if (v && ['view-citizen-dashboard', 'view-admin-dashboard', 'view-admin-database', 'view-admin-feedback', 'view-admin-announce', 'view-eco'].includes(v.id)) showView(v.id);
    renderBell();
});

// =====================================================================
// ROUTE STRATEGY + SMART BINS (ESP32 + Ultrasonic simulation) (added)
// =====================================================================
const DEPOT = [26.4499, 80.3319], BIN_H = 100, DEAD = 5, TCOL = ['#3b82f6', '#ef4444', '#8b5cf6'];
const geoCache = jget('sw_geo', {}); let geoBusy = false;
const KN = { 'sector 12 market': [26.45, 80.33], 'ring road': [26.46, 80.31], 'college avenue': [26.43, 80.35] };
function geo(loc) {
    const m = String(loc).match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/); if (m) return [+m[1], +m[2]];
    const k = String(loc).toLowerCase(); if (KN[k]) return KN[k]; if (geoCache[loc]) return geoCache[loc];
    let h = 0; for (const ch of loc) h = (h * 31 + ch.charCodeAt(0)) % 1000;
    return [26.4499 + (h % 100 - 50) / 1500, 80.3319 + (Math.floor(h / 10) % 100 - 50) / 1500];
}
async function resolveGeo(locs, cb) {
    const todo = [...new Set(locs)].filter(l => l && !/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/.test(l) && !KN[l.toLowerCase()] && !(l in geoCache));
    if (!todo.length || geoBusy) return; geoBusy = true; let n = 0;
    try {
        for (const l of todo) {
            const q = /kanpur/i.test(l) ? l : l + ', Kanpur, Uttar Pradesh';
            const r = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=' + encodeURIComponent(q))).json();
            geoCache[l] = r[0] ? [+r[0].lat, +r[0].lon] : false; if (r[0]) n++;
            jset('sw_geo', geoCache); await new Promise(res => setTimeout(res, 1100));
        }
    } catch (e) { /* offline: retry next time */ }
    geoBusy = false; if (n && cb) cb();
}
const km = (a, b) => { const r = x => x * Math.PI / 180, dl = r(b[0] - a[0]), dn = r(b[1] - a[1]); const x = Math.sin(dl / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dn / 2) ** 2; return 2 * 6371 * Math.asin(Math.sqrt(x)) * 1.3; };
const pathKm = p => { let s = 0, c = DEPOT; p.forEach(x => { s += km(c, x.ll); c = x.ll; }); return s + km(c, DEPOT); };

const DEF_BINS = [
    { id: 'B1', name: 'Sector 12 Market Bin', ll: [26.4510, 80.3340], d: 22 }, { id: 'B2', name: 'Ring Road Bin', ll: [26.4600, 80.3100], d: 8 },
    { id: 'B3', name: 'College Avenue Bin', ll: [26.4300, 80.3500], d: 70 }, { id: 'B4', name: 'Railway Station Bin', ll: [26.4540, 80.3500], d: 14 },
    { id: 'B5', name: 'Civil Lines Bin', ll: [26.4720, 80.3420], d: 90 }, { id: 'B6', name: 'Kakadeo Bin', ll: [26.4780, 80.2900], d: 45 }
];
const getBins = () => jget('sw_bins', DEF_BINS), setBins = b => jset('sw_bins', b);
const fillOf = d => Math.max(0, Math.min(100, Math.round((BIN_H - d) / (BIN_H - DEAD) * 100)));
const binBadge = f => f >= 90 ? '<span class="badge high">Critical</span>' : f >= 70 ? '<span class="badge medium">Collect Soon</span>' : '<span class="badge low">OK</span>';
const binCol = f => f >= 90 ? 'var(--danger)' : f >= 70 ? 'var(--warning)' : 'var(--primary)';

function collectStops() {
    syncData(); const P = { High: 3, Medium: 2, Low: 1 }, s = [];
    complaints.filter(c => c.status !== 'Resolved').forEach(c => s.push({ id: c.id, label: `${c.type} – ${c.location}`, ll: geo(c.location), pri: P[c.priority] || 2, kind: 'Report', who: c.citizen, loc: c.location }));
    pickups.filter(p => p.status !== 'Completed').forEach(p => s.push({ id: p.id, label: `${p.type} – ${p.address}`, ll: geo(p.address), pri: 2, kind: 'Pickup', who: p.citizen, loc: p.address }));
    getBins().forEach(b => { const f = fillOf(b.d); if (f >= 70) s.push({ id: b.id, label: `${b.name} (${f}% full)`, ll: b.ll, pri: f >= 90 ? 3 : 2, kind: 'Smart Bin', fill: f }); });
    return s;
}
function nn(list, start, w) {
    const r = [], l = list.slice(); let c = start;
    while (l.length) {
        let bi = 0, bd = 1e9;
        l.forEach((x, i) => { const d = km(c, x.ll) / (w ? 1 + x.pri * 0.6 + (x.fill || 0) / 100 : 1); if (d < bd) { bd = d; bi = i; } });
        c = l[bi].ll; r.push(l.splice(bi, 1)[0]);
    }
    return r;
}
function twoOpt(r) {
    let imp = true;
    while (imp) { imp = false; for (let i = 0; i < r.length - 1; i++) for (let j = i + 1; j < r.length; j++) { const n = r.slice(0, i).concat(r.slice(i, j + 1).reverse(), r.slice(j + 1)); if (pathKm(n) < pathKm(r) - 1e-6) { r = n; imp = true; } } }
    return r;
}
function orderStops(list, s) {
    if (s === 'priority') { const o = []; [3, 2, 1].forEach(p => o.push(...nn(list.filter(x => x.pri === p), o.length ? o[o.length - 1].ll : DEPOT))); return o; }
    if (s === 'fill') { const b = list.filter(x => x.kind === 'Smart Bin').sort((a, c) => c.fill - a.fill); return b.concat(nn(list.filter(x => x.kind !== 'Smart Bin'), b.length ? b[b.length - 1].ll : DEPOT)); }
    if (s === 'hybrid') return nn(list, DEPOT, true);
    return twoOpt(nn(list, DEPOT));
}
function splitTrucks(list, k) {
    if (k < 2) return [list];
    const a = x => Math.atan2(x.ll[0] - DEPOT[0], x.ll[1] - DEPOT[1]), s = list.slice().sort((p, q) => a(p) - a(q)), n = Math.ceil(s.length / k);
    return Array.from({ length: k }, (_, i) => s.slice(i * n, (i + 1) * n)).filter(g => g.length);
}
const hhmm = m => { m = Math.round(m); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

let routeMap = null, lastPlan = null;
function generateRoute() {
    const out = document.getElementById('route-result'); if (!out) return;
    const stops = collectStops();
    if (!stops.length) { out.innerHTML = '<div class="card mt-2 text-center">Koi open report, pickup ya full bin nahi hai. Sab clean! 🎉</div>'; lastPlan = null; return drawRoute([]); }
    const strat = val('route-strategy'), k = +val('route-trucks'), groups = splitTrucks(stops, k);
    const base = groups.reduce((s, g) => s + pathKm(g), 0);
    let tot = 0, time = 0;
    const plans = groups.map((g, i) => {
        let c = DEPOT, t = 0, dist = 0;
        const rows = orderStops(g, strat).map((x, j) => { const d = km(c, x.ll); dist += d; t += d / 25 * 60 + 4; c = x.ll; return { ...x, n: j + 1, eta: 540 + t }; });
        const back = km(c, DEPOT); dist += back; tot += dist; time = Math.max(time, t + back / 25 * 60);
        return { truck: i + 1, rows, dist };
    });
    lastPlan = plans;
    const saved = Math.max(0, base - tot), pct = base ? Math.round(saved / base * 100) : 0;
    const st = (cl, ic, t, v) => `<div class="stat-card"><div class="icon-bg ${cl}"><i class="fa-solid ${ic}"></i></div><div class="stat-info"><h3>${t}</h3><p>${v}</p></div></div>`;
    out.innerHTML = `<div class="stats-grid mt-2">${st('blue', 'fa-location-dot', 'Stops', stops.length)}${st('orange', 'fa-road', 'Total Distance', tot.toFixed(1) + ' km')}${st('purple', 'fa-clock', 'Shift Time', Math.round(time) + ' min')}${st('green', 'fa-leaf', 'Distance Saved', pct + '%')}${st('green', 'fa-gas-pump', 'Fuel Saved', (saved * 0.35).toFixed(1) + ' L')}${st('red', 'fa-cloud', 'CO₂ Saved', (saved * 0.35 * 2.68).toFixed(1) + ' kg')}</div>`
        + plans.map(p => `<div class="card mt-2"><h3><span class="tdot" style="background:${TCOL[p.truck - 1]}"></span> Truck T${p.truck} <small class="text-light">· ${p.rows.length} stops · ${p.dist.toFixed(1)} km · start 09:00</small></h3><div class="table-responsive"><table class="premium-table"><thead><tr><th>#</th><th>Stop</th><th>Type</th><th>Priority</th><th>ETA</th></tr></thead><tbody>${p.rows.map(r => `<tr><td><b>${r.n}</b></td><td>${esc(r.label)}</td><td>${r.kind}</td><td><span class="badge ${['', 'low', 'medium', 'high'][r.pri]}">${['', 'Low', 'Medium', 'High'][r.pri]}</span></td><td>${hhmm(r.eta)}</td></tr>`).join('')}</tbody></table></div></div>`).join('');
    drawRoute(plans);
}
function drawRoute(plans) {
    const el = document.getElementById('route-map'); if (!el) return;
    if (routeMap) routeMap.remove();
    routeMap = L.map('route-map').setView(DEPOT, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(routeMap);
    L.marker(DEPOT, { icon: L.divIcon({ className: '', html: '<div class="mk depot"><i class="fa-solid fa-warehouse"></i></div>', iconSize: [30, 30] }) }).addTo(routeMap).bindPopup('<b>Depot</b> (Nagar Nigam)');
    plans.forEach(p => {
        const col = TCOL[p.truck - 1];
        L.polyline([DEPOT, ...p.rows.map(r => r.ll), DEPOT], { color: col, weight: 4, opacity: .8, dashArray: '8 6' }).addTo(routeMap);
        p.rows.forEach(r => L.marker(r.ll, { icon: L.divIcon({ className: '', html: `<div class="mk" style="background:${col}">${r.n}</div>`, iconSize: [28, 28] }) }).addTo(routeMap).bindPopup(`<b>T${p.truck} · Stop ${r.n}</b><br>${esc(r.label)}<br>ETA ${hhmm(r.eta)}`));
    });
}
function assignRoute() {
    if (!lastPlan) { showToast('Pehle route generate karein.', 'error'); return; }
    syncData(); let n = 0;
    lastPlan.forEach(p => p.rows.forEach(r => {
        if (r.kind === 'Report') { const c = complaints.find(x => x.id === r.id); if (c && c.status === 'Pending') c.status = 'In Progress'; }
        if (r.kind !== 'Smart Bin') { notify(r.who, `🚛 Truck T${p.truck} aapke ${r.id} ke liye route par hai. ETA ~ ${hhmm(r.eta)}`); n++; }
    }));
    jset('sw_complaints', complaints);
    jset('sw_routes', { date: today(), trucks: lastPlan.map(p => ({ truck: p.truck, stops: p.rows.map(r => r.id), km: +p.dist.toFixed(1) })) });
    showToast(`Route assign ho gaya. ${n} citizen(s) ko ETA notification gayi.`, 'success');
}

// ---- Smart bins (virtual ESP32 + HC-SR04) ----
let binTimer = null;
function setBinD(b, d) { const p = fillOf(b.d); b.d = d; const f = fillOf(d); if (p < 80 && f >= 80) { notify('admin', `🗑 ${b.id} ${b.name} is ${f}% full. Collection schedule karein.`); showToast(`${b.id} is ${f}% full!`, 'error'); } }
function renderBins() {
    const el = document.getElementById('bins-body'); if (!el) return;
    el.innerHTML = getBins().map(b => { const f = fillOf(b.d); return `<tr><td><b>${b.id}</b></td><td>${esc(b.name)}</td><td><input type="range" min="${DEAD}" max="${BIN_H}" value="${b.d}" oninput="setBinDist('${b.id}',this.value)"> <small id="bd-${b.id}">${b.d} cm</small></td><td style="min-width:150px"><div class="fillbar"><i id="bf-${b.id}" style="width:${f}%;background:${binCol(f)}"></i></div><small id="bp-${b.id}">${f}%</small></td><td id="bs-${b.id}">${binBadge(f)}</td></tr>`; }).join('');
}
function setBinDist(id, v) {
    const bins = getBins(), b = bins.find(x => x.id === id); if (!b) return;
    setBinD(b, +v); setBins(bins);
    const f = fillOf(b.d), $ = i => document.getElementById(i + '-' + id);
    $('bd').innerText = b.d + ' cm'; $('bp').innerText = f + '%'; $('bs').innerHTML = binBadge(f);
    const bar = $('bf'); bar.style.width = f + '%'; bar.style.background = binCol(f);
}
function toggleSim(btn) {
    if (binTimer) { clearInterval(binTimer); binTimer = null; btn.innerHTML = '<i class="fa-solid fa-satellite-dish"></i> Start Live Sensor Feed'; return; }
    btn.innerHTML = '<i class="fa-solid fa-stop"></i> Stop Live Feed';
    binTimer = setInterval(() => { const bins = getBins(); bins.forEach(b => setBinD(b, b.d <= DEAD + 3 ? 95 : Math.max(DEAD, Math.round(b.d - Math.random() * 7)))); setBins(bins); renderBins(); }, 2500);
}
function resetBins() { setBins(DEF_BINS); renderBins(); showToast('Bins reset ho gaye.', 'success'); }

const _av = afterView;
afterView = function (id) {
    _av(id); clearInterval(binTimer); binTimer = null;
    if (id === 'view-admin-route') setTimeout(generateRoute, 150);
    if (id === 'view-admin-bins') renderBins();
    if (id === 'view-future') document.getElementById('future-cta').innerHTML = currentUser && currentUser.role === 'admin'
        ? '<h3>Demo dekhein</h3><p class="text-light">Virtual smart bins aur route planner abhi chalakar dekhein.</p><button class="btn btn-primary mt-1" onclick="showView(\'view-admin-bins\')"><i class="fa-solid fa-satellite-dish"></i> Smart Bin Simulator</button>'
        : '<h3>Aapka kachra, smart tareeke se</h3><p class="text-light">Aane wale samay mein bins khud batayenge ki wo kab bharenge.</p>';
};

const _gr = generateRoute;
generateRoute = function () {
    _gr();
    resolveGeo(collectStops().map(x => x.loc), () => { if (document.getElementById('view-admin-route').classList.contains('active-view')) _gr(); });
};
