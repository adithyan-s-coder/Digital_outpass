// Smart Outpass Management System - Main App JavaScript

// Global app configuration and utilities
var app = window.app = {
    API_BASE: '/api',
    currentUser: () => currentUser,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatTime: formatTime,
    formatYear: formatYear,
    getStatusBadge: getStatusBadge,
    showQRModal: showQRModal
};

// Current user data
let currentUser = null;

// Camera state
let cameraStream = null;
let capturedPhotoBlob = null;

// Immediate fail-safe: Hide splash if something goes catastrophically wrong with script execution
setTimeout(() => {
    if (typeof hideSplash === 'function') hideSplash();
}, 12000);

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded - Initializing App');
    
    try {
        // Check if user is already logged in
        checkSession();

        // Event listeners
        const listeners = [
            { id: 'loginForm', event: 'submit', handler: handleLogin },
            { id: 'logoutBtn', event: 'click', handler: handleLogout },
            { id: 'showRegister', event: 'click', handler: showRegisterPage },
            { id: 'showLoginTop', event: 'click', handler: showLoginPage },
            { id: 'registerForm', event: 'submit', handler: handleRegister }
        ];

        listeners.forEach(l => {
            const el = document.getElementById(l.id);
            if (el) {
                el.addEventListener(l.event, l.handler);
            }
        });
    } catch (err) {
        console.error('Initialization Error:', err);
        if (typeof hideSplash === 'function') hideSplash();
    }

    // Handle password visibility toggles
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('password-toggle')) {
            const wrapper = e.target.closest('.password-wrapper');
            if (wrapper) {
                const input = wrapper.querySelector('input');
                if (input) {
                    if (input.type === 'password') {
                        input.type = 'text';
                        e.target.classList.remove('ph-eye-slash');
                        e.target.classList.add('ph-eye');
                    } else {
                        input.type = 'password';
                        e.target.classList.remove('ph-eye');
                        e.target.classList.add('ph-eye-slash');
                    }
                }
            }
        }
    });

    if (document.getElementById('registerForm')) {
        loadDepartments();

        // Role change listener
        const regRole = document.getElementById('regRole');
        if (regRole) {
            regRole.addEventListener('change', function () {
                const role = this.value;
                const regNoGroup = document.getElementById('regNoGroup');
                const parentNameGroup = document.getElementById('parentNameGroup');
                const regNoInput = document.getElementById('regNoInput');
                const parentNameInput = document.getElementById('parentNameInput');
                const parentMobileGroup = document.getElementById('parentMobileGroup');
                const parentMobileInput = document.getElementById('parentMobileInput');
                const regHeroText = document.getElementById('regHeroText');
                const profileLabel = document.getElementById('profile_label');
                const profileHint = document.getElementById('profile_hint');
                const deptGroup = document.getElementById('deptGroup');
                const emailGroup = document.getElementById('emailGroup');
                const regEmail = document.getElementById('regEmail');
                const regDept = document.getElementById('regDept');
                const yearGroup = document.getElementById('yearGroup');
                const regYear = document.getElementById('regYear');

                const roleLabels = {
                    'student': 'Student',
                    'staff': 'Staff',
                    'hod': 'HOD',
                    'security': 'Security',
                    'admin': 'Admin'
                };
                const currentLabel = roleLabels[role] || 'User';

                if (role === 'student') {
                    if (profileLabel) profileLabel.textContent = 'Student ID Card Photo';
                    if (profileHint) profileHint.textContent = 'Please upload a clear image of your official college ID card.';
                } else {
                    if (profileLabel) profileLabel.textContent = `${currentLabel} Photo`;
                    if (profileHint) profileHint.textContent = 'Image format: JPG, PNG. Max size: 2MB.';
                }

                if (regHeroText) regHeroText.textContent = `Register your ${role} profile to access institutional portal services.`;

                // Reset visibility
                if (deptGroup) deptGroup.style.display = 'block';
                if (emailGroup) emailGroup.style.display = 'block';
                if (regEmail) regEmail.required = true;
                if (regDept) regDept.required = true;

                if (role === 'security' || role === 'admin') {
                    if (deptGroup) deptGroup.style.display = 'none';
                    if (regDept) regDept.required = false;
                }

                if (role === 'security') {
                    if (emailGroup) emailGroup.style.display = 'none';
                    if (regEmail) regEmail.required = false;
                }

                if (role === 'student' || role === 'staff') {
                    if (regNoGroup) regNoGroup.style.display = role === 'student' ? 'block' : 'none';
                    if (yearGroup) yearGroup.style.display = 'block';
                    if (parentNameGroup) parentNameGroup.style.display = role === 'student' ? 'block' : 'none';
                    if (parentMobileGroup) parentMobileGroup.style.display = role === 'student' ? 'block' : 'none';
                    if (regNoInput) regNoInput.required = role === 'student';
                    if (regYear) regYear.required = true;
                    if (parentNameInput) parentNameInput.required = role === 'student';
                    if (parentMobileInput) parentMobileInput.required = role === 'student';

                    const profileImgInput = document.getElementById('reg_profile_image');
                    if (profileImgInput) profileImgInput.required = true;
                } else {
                    if (regNoGroup) regNoGroup.style.display = 'none';
                    if (yearGroup) yearGroup.style.display = 'none';
                    if (parentNameGroup) parentNameGroup.style.display = 'none';
                    if (parentMobileGroup) parentMobileGroup.style.display = 'none';
                    if (regNoInput) regNoInput.required = false;
                    if (regYear) regYear.required = false;
                    if (parentNameInput) parentNameInput.required = false;
                    if (parentMobileInput) parentMobileInput.required = false;

                    const profileImgInput = document.getElementById('reg_profile_image');
                    if (profileImgInput) profileImgInput.required = false;
                }
            });

            // Trigger change event to initialize visibility and requirements for default role (student)
            regRole.dispatchEvent(new Event('change'));
        }

        // Name capitalization listener
        const regName = document.querySelector('input[name="full_name"]');
        if (regName) {
            regName.addEventListener('input', function () {
                const words = this.value.split(' ');
                this.value = words.map(word => {
                    if (word.length > 0) {
                        return word.charAt(0).toUpperCase() + word.slice(1);
                    }
                    return '';
                }).join(' ');
            });
        }
    }

    // Navigation handling
    document.querySelectorAll('.nav-link').forEach(item => {
        item.addEventListener('click', handleNavigation);
    });

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebarNav = document.getElementById('sidebarNav');
    if (mobileMenuToggle && sidebarNav) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebarNav.classList.toggle('show');
        });
    }

    // Modal close
    const qrModal = document.getElementById('qrModal');
    if (qrModal) {
        const closeBtn = qrModal.querySelector('.close');
        if (closeBtn) closeBtn.onclick = () => qrModal.classList.remove('show');
    }
    window.onclick = (e) => {
        if (qrModal && e.target == qrModal) qrModal.classList.remove('show');
    };

    // Close mobile menu when nav link clicked
    document.addEventListener('click', function (e) {
        if (e.target.closest('.nav-link') && window.innerWidth < 1024) {
            sidebarNav.classList.remove('show');
        }
    });

    // Camera Integration Listeners
    const openCamBtn = document.getElementById('openCameraButton');
    if (openCamBtn) openCamBtn.addEventListener('click', launchCamera);

    const closeCamBtn = document.getElementById('closeCameraModal');
    if (closeCamBtn) closeCamBtn.addEventListener('click', closeCamera);

    const captureBtn = document.getElementById('capturePhotoBtn');
    if (captureBtn) captureBtn.addEventListener('click', takeIDPhoto);

    const removePhotoBtn = document.getElementById('removeCapturedPhoto');
    if (removePhotoBtn) removePhotoBtn.addEventListener('click', removeCapturedPhoto);

    const regProfileImgInput = document.getElementById('reg_profile_image');
    if (regProfileImgInput) {
        regProfileImgInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                removeCapturedPhoto();
            }
        });
    }

    // Global Error Guard (Safety)
    window.addEventListener('error', function() {
        hideSplash();
    });
});

// Camera System Functions
async function launchCamera() {
    const video = document.getElementById('cameraVideo');
    const modal = document.getElementById('cameraModal');
    const status = document.getElementById('cameraStatus');
    
    if (status) status.style.display = 'flex';
    if (modal) modal.classList.add('show');
    
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', // Environmental camera for capturing ID cards
                width: { ideal: 1280 }, 
                height: { ideal: 720 } 
            } 
        });
        if (video) video.srcObject = cameraStream;
        if (status) status.style.display = 'none';
    } catch (err) {
        console.error('Camera Access Error:', err);
        alert('Could not access camera. Please grant permissions or use a modern browser.');
        closeCamera();
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    const video = document.getElementById('cameraVideo');
    if (video) video.srcObject = null;
}

function closeCamera() {
    stopCamera();
    const modal = document.getElementById('cameraModal');
    if (modal) modal.classList.remove('show');
}

function takeIDPhoto() {
    const video = document.getElementById('cameraVideo');
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
        capturedPhotoBlob = blob;
        const url = URL.createObjectURL(blob);
        const preview = document.getElementById('capturedImagePreview');
        const container = document.getElementById('capturePreviewContainer');
        const fileInput = document.getElementById('reg_profile_image');
        
        if (preview) preview.src = url;
        if (container) container.style.display = 'block';
        if (fileInput) fileInput.value = ''; 
        
        closeCamera();
    }, 'image/jpeg', 0.9);
}

function removeCapturedPhoto() {
    capturedPhotoBlob = null;
    const container = document.getElementById('capturePreviewContainer');
    const preview = document.getElementById('capturedImagePreview');
    if (container) container.style.display = 'none';
    if (preview) preview.src = '';
}

// Hide the loading splash
function hideSplash() {
    const splash = document.getElementById('appLoadingSplash');
    if (splash && !splash.classList.contains('hidden')) {
        splash.classList.add('hidden');
        // Delay the actual removal to allow for transition
        setTimeout(() => { 
            if (splash) splash.style.display = 'none'; 
        }, 600);
    }
}

// Update splash status text
function setSplashStatus(text) {
    const el = document.getElementById('splashStatus');
    if (el) el.textContent = text;
}

// Check if user is already logged in
async function checkSession() {
    try {
        setSplashStatus('Establishing connection...');
        // 15-second timeout handles Render free-tier cold starts
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${app.API_BASE}/auth/session`, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        setSplashStatus('Synchronizing workspace...');
        const data = await response.json();

        if (data.logged_in) {
            currentUser = data.user;
            hideSplash();
            showDashboard();
        } else {
            hideSplash();
            showLoginPage();
        }
    } catch (error) {
        console.error('Session check error:', error);
        hideSplash();
        showLoginPage();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const loginBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = loginBtn.innerHTML;
    const errorEl = document.getElementById('loginError');
    const successEl = document.getElementById('loginSuccess');

    // Reset messages
    hideError(errorEl);
    hideSuccess(successEl);

    // Set loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Processing...';

    try {
        const response = await fetch(`${app.API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess(successEl, 'Login successful! Entering workspace...');
            currentUser = data.user;
            setTimeout(() => {
                showDashboard();
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalBtnText;
            }, 1500);
        } else {
            showError(errorEl, data.message);
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalBtnText;
        }
    } catch (error) {
        showError(errorEl, 'Login failed. Please try again.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = originalBtnText;
    }
}

// Handle logout
async function handleLogout(e) {
    e.preventDefault();

    try {
        await fetch(`${app.API_BASE}/auth/logout`, { method: 'POST' });
        currentUser = null;
        localStorage.removeItem('currentModule');
        showLoginPage();
    } catch (error) {
        console.error('Logout error:', error);
        showLoginPage();
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const regBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = regBtn.innerHTML;
    const errorEl = document.getElementById('registerError');
    const successEl = document.getElementById('registerSuccess');

    // Reset messages
    hideError(errorEl);
    hideSuccess(successEl);

    // Basic validation
    const email = formData.get('email');
    const role = formData.get('role');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirm_password');

    // Email check (skip for security as they don't provide it)
    if (role !== 'security') {
        if (!email || !email.includes('@') || !email.includes('.')) {
            showError(errorEl, 'Please enter a valid email address');
            return;
        }
    }

    // Full name formatting (Title Case)
    let fullName = formData.get('full_name');
    if (fullName) {
        fullName = fullName.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        formData.set('full_name', fullName);
    }

    const phone = formData.get('phone');
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
        showError(errorEl, 'Student phone number must be exactly 10 digits');
        return;
    }

    if (role === 'student') {
        const parentMobile = formData.get('parent_mobile');
        if (!parentMobile || parentMobile.length !== 10 || !/^\d+$/.test(parentMobile)) {
            showError(errorEl, 'Parent mobile number must be exactly 10 digits');
            return;
        }
    }

    if (password !== confirmPassword) {
        showError(errorEl, 'Passwords do not match');
        return;
    }

    if (role === 'student') {
        let profileImg = formData.get('profile_image');

        if (capturedPhotoBlob) {
            profileImg = new File([capturedPhotoBlob], 'captured_id.jpg', { type: 'image/jpeg' });
            formData.set('profile_image', profileImg);
        }

        if (!profileImg || profileImg.size === 0) {
            showError(errorEl, 'Institutional ID Card photo is mandatory for students');
            return;
        }
    }

    if (password.length < 8) {
        showError(errorEl, 'Password must be at least 8 characters');
        return;
    }

    // Set loading state
    regBtn.disabled = true;
    regBtn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Creating Profile...';

    try {
        const response = await fetch(`${app.API_BASE}/auth/register`, {
            method: 'POST',
            body: formData
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Registration result:', result);

        if (result.success) {
            showSuccess(successEl, 'Registration successful! Returning to login...');
            setTimeout(() => {
                hideSuccess(successEl);
                showLoginPage();
                regBtn.disabled = false;
                regBtn.innerHTML = originalBtnText;
            }, 2000);
        } else {
            showError(errorEl, result.message);
            regBtn.disabled = false;
            regBtn.innerHTML = originalBtnText;
        }
    } catch (error) {
        showError(errorEl, 'Registration failed. Please try again.');
        regBtn.disabled = false;
        regBtn.innerHTML = originalBtnText;
    }
}

// Load departments for registration
async function loadDepartments() {
    try {
        const response = await fetch(`${app.API_BASE}/admin/departments`);
        const data = await response.json();

        if (data.success) {
            const select = document.getElementById('regDept');
            select.innerHTML = '<option value="">Select Department</option>';
            data.departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.dept_id;
                option.textContent = dept.dept_name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

// Show dashboard based on user role
function showDashboard() {
    try {
        // Redirect UI: Hide login/register and show dashboard
        hidePage('loginPage');
        hidePage('registerPage');
        showPage('dashboardPage');

        if (!currentUser) {
            console.error('No current user data available for dashboard');
            showLoginPage();
            return;
        }

        // Update Sidebar User Info
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        if (userName) userName.textContent = currentUser.full_name || currentUser.username;
        if (userRole) userRole.textContent = currentUser.role.toUpperCase();

        // Show appropriate menu
        const menus = ['studentMenu', 'staffMenu', 'hodMenu', 'securityMenu', 'adminMenu'];
        menus.forEach(menuId => {
            const menu = document.getElementById(menuId);
            if (menu) menu.style.display = 'none';
        });

        const activeMenuId = `${currentUser.role}Menu`;
        const activeMenu = document.getElementById(activeMenuId);
        if (activeMenu) activeMenu.style.display = 'block';

        // Update avatar
        const userAvatar = document.getElementById('userAvatar');
        if (userAvatar) {
            if (currentUser.profile_image) {
                userAvatar.style.backgroundImage = `url(/uploads/${currentUser.profile_image})`;
                userAvatar.style.backgroundSize = 'cover';
                userAvatar.style.backgroundPosition = 'center';
                userAvatar.textContent = '';
            } else {
                userAvatar.style.backgroundImage = 'none';
                userAvatar.style.background = '#e2e8f0';
                userAvatar.textContent = '👤';
            }
        }

        // Load default module or restore previous one
        const savedModule = localStorage.getItem('currentModule');
        let moduleToLoad = `${currentUser.role}-dashboard`;

        if (savedModule) {
            const rolePrefix = currentUser.role;
            const commonModules = ['apply-outpass', 'my-outpasses', 'my-history', 'pending-requests', 'my-students', 'hod-approvals', 'dept-statistics', 'all-outpasses', 'scan-qr', 'students-out', 'recent-activity', 'manage-users', 'manage-departments', 'system-reports'];

            if (savedModule.startsWith(rolePrefix) || commonModules.includes(savedModule)) {
                moduleToLoad = savedModule;
            }
        }

        loadModule(moduleToLoad);
    } catch (error) {
        console.error('Critical Dashboard Error:', error);
        showLoginPage();
    }
}

// Navigation handler
function handleNavigation(e) {
    e.preventDefault();
    const module = e.currentTarget.getAttribute('data-module');
    loadModule(module);
}

// Load module content
function loadModule(module) {
    const content = document.getElementById('moduleContent');

    // Save current module to localStorage for persistence on refresh
    localStorage.setItem('currentModule', module);

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-module') === module) {
            link.classList.add('active');
        }
    });

    // Show loading
    content.innerHTML = '<div class="loading">Establishing secure connection...</div>';

    // Call appropriate function based on module
    switch (module) {
        // Student modules
        case 'student-dashboard':
            loadStudentDashboard();
            break;
        case 'apply-outpass':
            loadApplyOutpass();
            break;
        case 'my-outpasses':
            loadMyOutpasses();
            break;
        case 'my-history':
            loadMyHistory();
            break;

        // Staff modules
        case 'staff-dashboard':
            loadStaffDashboard();
            break;
        case 'pending-requests':
            loadPendingRequests();
            break;
        case 'my-students':
            loadMyStudents();
            break;

        // HOD modules
        case 'hod-dashboard':
            loadHODDashboard();
            break;
        case 'hod-approvals':
            loadHODApprovals();
            break;
        case 'dept-statistics':
            loadDeptStatistics();
            break;
        case 'all-outpasses':
            loadAllOutpasses();
            break;

        // Security modules
        case 'security-dashboard':
            loadSecurityDashboard();
            break;
        case 'scan-qr':
            loadScanQR();
            break;
        case 'students-out':
            loadStudentsOut();
            break;
        case 'recent-activity':
            loadRecentActivity();
            break;

        // Admin modules
        case 'admin-dashboard':
            loadAdminDashboard();
            break;
        case 'manage-users':
            loadManageUsers();
            break;
        case 'manage-departments':
            loadManageDepartments();
            break;
        case 'system-reports':
            loadSystemReports();
            break;

        default:
            content.innerHTML = '<div class="card"><p>Module not found</p></div>';
    }
}

// Utility functions
function showPage(pageId) {
    document.getElementById(pageId).classList.add('active');
}

function hidePage(pageId) {
    document.getElementById(pageId).classList.remove('active');
}

function showLoginPage() {
    hidePage('registerPage');
    hidePage('dashboardPage');
    showPage('loginPage');
    document.getElementById('loginForm').reset();
    hideError(document.getElementById('loginError'));
    hideSuccess(document.getElementById('loginSuccess'));
    removeCapturedPhoto();
}

function showRegisterPage() {
    hidePage('loginPage');
    showPage('registerPage');
    document.getElementById('registerForm').reset();
    hideError(document.getElementById('registerError'));
    hideSuccess(document.getElementById('registerSuccess'));
    removeCapturedPhoto();
    const regRole = document.getElementById('regRole');
    if (regRole) {
        regRole.dispatchEvent(new Event('change'));
    }
}

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

function hideError(element) {
    element.classList.remove('show');
}

function showSuccess(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

function hideSuccess(element) {
    element.classList.remove('show');
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN');
}

function formatTime(timeString) {
    if (!timeString) return '-';
    const date = new Date('2000-01-01T' + timeString);
    return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatYear(year) {
    if (!year) return 'N/A';
    const map = { '1': '1st Yr', '2': '2nd Yr', '3': '3rd Yr', '4': '4th Yr' };
    return map[year.toString()] || `${year} Yr`;
}

function getStatusBadge(status) {
    if (!status) return '';
    const badges = {
        'pending': 'badge-pending',
        'approved': 'badge-approved',
        'rejected': 'badge-rejected',
        'used': 'badge-used',
        'cancelled': 'badge-rejected',
        'expired': 'badge-rejected'
    };
    const badgeClass = badges[status.toLowerCase()] || '';
    return `<span class="status-badge ${badgeClass}">${status.toUpperCase()}</span>`;
}

function showQRModal(qrCode, qrBase64) {
    const modal = document.getElementById('qrModal');
    const display = document.getElementById('qrCodeDisplay');

    display.innerHTML = `
        <div id="printableOutpass" class="text-center">
            <div class="qr-container">
                <img src="${qrBase64}" alt="QR Code">
            </div>
            <div class="mb-8">
                <p style="font-size: 1.125rem; font-weight: 800; color: var(--primary); margin-bottom: 0.25rem;">DIGITAL OUTPASS</p>
                <code style="font-size: 0.875rem; background: #f1f5f9; padding: 0.25rem 0.75rem; border-radius: 0.375rem;">${qrCode}</code>
                <p style="font-size: 0.7rem; color: #64748b; margin-top: 0.75rem;">Authorized by Institutional Security Systems</p>
            </div>
        </div>
        <div style="display: flex; gap: 0.75rem; justify-content: center;" class="no-print">
            <button onclick="printQR()" class="btn-modern btn-modern-primary" style="width: auto; border-radius: 2rem;">
                <i class="ph ph-printer"></i> Print Outpass
            </button>
            <button onclick="document.getElementById('qrModal').classList.remove('show')" class="btn-modern" style="width: auto; border-radius: 2rem; background: #f1f5f9; color: var(--text-main);">
                <i class="ph ph-x"></i> Close
            </button>
        </div>
    `;

    modal.classList.add('show');
}

function printQR() {
    window.print();
}

// Global exposure for onclick handlers
window.printQR = printQR;
window.printHistory = () => { window.print(); };