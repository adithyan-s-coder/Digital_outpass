// Security Module JavaScript

async function loadSecurityDashboard() {
    try {
        const response = await fetch(`${app.API_BASE}/security/dashboard-stats`);
        const data = await response.json();

        if (data.success) {
            const stats = data.stats;
            document.getElementById('moduleContent').innerHTML = `
                <div class="mb-8" style="animation: fadeIn 0.4s ease-out;">
                    <h2 class="login-title" style="font-size: 2.25rem;">Security Command</h2>
                    <p style="color: var(--text-muted); font-size: 1rem;">Real-time monitoring and gate control.</p>
                </div>
                
                <div class="stats-grid">
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);"><i class="ph ph-map-pin"></i></div>
                        <div>
                            <div class="stat-value">${stats.students_currently_out || 0}</div>
                            <div class="stat-label">Currently Outside</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(255, 149, 0, 0.1); color: #ff9500;"><i class="ph ph-clock-countdown"></i></div>
                        <div>
                            <div class="stat-value">${stats.overdue_count || 0}</div>
                            <div class="stat-label">Overdue Returns</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);"><i class="ph ph-arrow-square-out"></i></div>
                        <div>
                            <div class="stat-value">${stats.exits_today || 0}</div>
                            <div class="stat-label">Exits Today</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(79, 70, 229, 0.1); color: var(--primary);"><i class="ph ph-arrow-square-in"></i></div>
                        <div>
                            <div class="stat-value">${stats.entries_today || 0}</div>
                            <div class="stat-label">Entries Today</div>
                        </div>
                    </div>
                </div>
                
                <div class="glass-panel" style="background: white; border: none;">
                    <div class="mb-4">
                        <h3 style="font-size: 1.25rem; font-weight: 600;">Gate Controls</h3>
                    </div>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button onclick="loadModule('scan-qr')" class="btn-modern btn-modern-primary" style="width: auto; padding: 1rem 2rem;">
                            <i class="ph ph-qr-code" style="font-size: 1.5rem;"></i> Scan Pass
                        </button>
                        <button onclick="loadModule('students-out')" class="btn-modern" style="background: #f1f5f9; color: var(--text-main); width: auto; padding: 1rem 2rem;">
                            <i class="ph ph-users-four"></i> Track Outs
                        </button>
                    </div>
                </div>
            `;
        } else {
            document.getElementById('moduleContent').innerHTML = `<div class="card"><p>${data.message || 'Error loading dashboard'}</p></div>`;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadScanQR() {
    document.getElementById('moduleContent').innerHTML = `
        <div class="glass-panel" style="background: white; border: none; max-width: 600px; margin: 0 auto; text-align: center;">
            <div class="mb-8">
                <h2 class="login-title" style="font-size: 1.75rem; margin-bottom: 0.5rem;">Scan Outpass</h2>
                <p style="color: var(--text-muted); font-size: 1rem;">Point camera at QR or enter code manually.</p>
            </div>
            
            <div style="max-width: 100%;">
                <!-- Camera Scanner -->
                <div id="scannerSection" class="mb-8">
                    <div style="display: flex; justify-content: center; gap: 0.75rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
                        <button onclick="startScanner()" class="btn-modern btn-modern-primary" id="startScanBtn" style="width: auto;">
                            <i class="ph ph-camera"></i> Activate Camera
                        </button>
                        <button onclick="stopScanner()" class="btn-modern" id="stopScanBtn" style="display: none; background: #fee2e2; color: var(--danger); width: auto;">
                            <i class="ph ph-stop"></i> Stop Scanner
                        </button>
                    </div>
                    <div id="qr-reader" style="width: 100%; display: none; border-radius: 0.75rem; overflow: hidden; border: 2px solid var(--primary);"></div>
                </div>
                
                <!-- Manual Entry Option -->
                <div style="padding-top: 2rem; border-top: 1px solid #f1f5f9;">
                    <h3 style="font-size: 1rem; margin-bottom: 1rem; color: var(--text-muted);">Manual Verification</h3>
                    <div class="form-group" style="text-align: left;">
                        <input type="text" id="qrInput" class="form-control" 
                               placeholder="Paste or type QR token here..." style="font-family: monospace; text-align: center; font-size: 1rem; letter-spacing: 0.05rem;">
                    </div>
                    
                    <button onclick="verifyQRCode()" class="btn-modern btn-modern-primary" style="width: 100%; margin-top: 1rem;">
                        Verify Outpass
                    </button>
                </div>
                
                <div id="qrResult" style="margin-top: 2rem;"></div>
            </div>
        </div>
    `;

    // Auto-submit on Enter key
    setTimeout(() => {
        const qrInput = document.getElementById('qrInput');
        if (qrInput) {
            qrInput.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') {
                    verifyQRCode();
                }
            });
        }
    }, 100);
}

let html5QrCode = null;

async function startScanner() {
    const readerDiv = document.getElementById('qr-reader');
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');

    readerDiv.style.display = 'block';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';

    html5QrCode = new Html5Qrcode("qr-reader");

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
            // Priority: Try to find a back camera, otherwise use the first one
            let cameraId = cameras[0].id;
            const backCamera = cameras.find(c =>
                c.label.toLowerCase().includes('back') ||
                c.label.toLowerCase().includes('rear') ||
                c.label.toLowerCase().includes('environment')
            );
            if (backCamera) cameraId = backCamera.id;

            console.log('Starting camera with ID:', cameraId);

            try {
                await html5QrCode.start(
                    cameraId,
                    config,
                    (decodedText) => {
                        document.getElementById('qrInput').value = decodedText;
                        stopScanner();
                        verifyQRCodeFromScan(decodedText);
                    },
                    (errorMessage) => { }
                );
            } catch (innerErr) {
                console.warn('Manual ID start failed, trying generic start:', innerErr);
                // Last ditch effort: Let the library choose
                await html5QrCode.start(
                    { facingMode: "user" }, // Use "user" as a fallback for laptops
                    config,
                    (decodedText) => {
                        document.getElementById('qrInput').value = decodedText;
                        stopScanner();
                        verifyQRCodeFromScan(decodedText);
                    },
                    (errorMessage) => { }
                );
            }
        } else {
            throw new Error('No cameras found on this device.');
        }
    } catch (err) {
        console.error('Final Scanner failure:', err);
        alert('CAMERA ACCESS ERROR\n\n1. Check if another app (Zoom, Teams, etc.) is using your camera.\n2. Ensure you have clicked "Allow" in the browser popup.\n3. Try refreshing the page (F5).\n\nDetails: ' + err.message);
        readerDiv.style.display = 'none';
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
    }
}

async function stopScanner() {
    if (html5QrCode) {
        try {
            await html5QrCode.stop();
            html5QrCode = null;
        } catch (err) {
            console.error('Error stopping scanner:', err);
        }
    }

    const readerDiv = document.getElementById('qr-reader');
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');

    if (readerDiv) readerDiv.style.display = 'none';
    if (startBtn) startBtn.style.display = 'inline-block';
    if (stopBtn) stopBtn.style.display = 'none';
}

async function verifyQRCodeFromScan(qrCode) {
    const resultDiv = document.getElementById('qrResult');

    if (!qrCode) {
        resultDiv.innerHTML = '<div class="error-message show">Please scan a QR code</div>';
        return;
    }

    resultDiv.innerHTML = '<div class="loading">Verifying...</div>';

    try {
        const response = await fetch(`${app.API_BASE}/security/verify-qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_code: qrCode })
        });

        const data = await response.json();

        if (data.valid) {
            const isReturning = data.is_returning;
            resultDiv.innerHTML = `
                <div class="success-message show" style="padding: 24px; border-radius: 12px; border: none; background: ${isReturning ? '#fff7ed' : '#ecfdf5'}; color: ${isReturning ? '#9a3412' : '#065f46'};">
                    <div style="font-size: 48px; margin-bottom: 16px;">${isReturning ? '🏠' : '✓'}</div>
                    <h3 style="margin-bottom: 20px;">${isReturning ? 'Returning Student' : 'Valid Outpass'}</h3>
                    
                    <div class="scan-profile-container">
                        ${data.student.profile_image ?
                    `<img src="/uploads/${data.student.profile_image}" class="scan-profile-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.student.name)}&background=random'">` :
                    `<div class="scan-profile-placeholder"><i class="ph ph-user"></i></div>`
                }
                    </div>

                    <div style="text-align: left; background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin-bottom: 8px;"><strong>Student:</strong> ${data.student.name}</p>
                        <p style="margin-bottom: 8px;"><strong>Reg No:</strong> ${data.student.registration_no}</p>
                        <p style="margin-bottom: 8px;"><strong>Year:</strong> ${app.formatYear(data.student.academic_year)}</p>
                        <p style="margin-bottom: 8px;"><strong>Dept:</strong> ${data.student.department}</p>
                        ${isReturning ? `<p style="margin-bottom: 8px;"><strong>Reason:</strong> ${data.outpass.reason || '-'}</p>` : `<p style="margin-bottom: 8px;"><strong>Reason:</strong> ${data.outpass.reason || '-'}</p>`}
                        ${isReturning && data.outpass.expected_return_time ? `<p style="margin-bottom: 0; color: var(--danger);"><strong>Exp. Return:</strong> ${data.outpass.expected_return_time}</p>` : ''}
                    </div>
                    
                    ${isReturning ? `
                        <button onclick="recordEntryManual(${data.outpass.outpass_id})" class="btn-modern" style="width: 100%; background: var(--primary); color: white;">
                            Confirm Entry
                        </button>
                    ` : `
                        <button onclick="recordExit('${qrCode}')" class="btn-modern btn-modern-primary" style="width: 100%;">
                            Confirm Exit
                        </button>
                    `}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="error-message show">
                    <h3>✗ Invalid QR Code</h3>
                    <p>${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error-message show">Error verifying QR code.</div>`;
    }
}

async function verifyQRCode() {
    const qrCode = document.getElementById('qrInput').value.trim();
    const resultDiv = document.getElementById('qrResult');

    if (!qrCode) {
        resultDiv.innerHTML = '<div class="error-message show">Please enter a QR code</div>';
        return;
    }

    verifyQRCodeFromScan(qrCode);
}

async function recordExit(qrCode) {
    try {
        const response = await fetch(`${app.API_BASE}/security/scan-qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_code: qrCode })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('qrResult').innerHTML = `
                <div class="success-message show" style="padding: 32px; border-radius: 12px; background: #ecfdf5;">
                    <div style="font-size: 48px; color: var(--success); margin-bottom: 16px;">✓</div>
                    <h3 style="margin-bottom: 8px; color: #065f46;">Record Updated</h3>
                    
                    <div class="scan-profile-container" style="width: 80px; height: 80px;">
                         ${data.student.profile_image ?
                    `<img src="/uploads/${data.student.profile_image}" class="scan-profile-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(data.student.name)}&background=random'">` :
                    `<div class="scan-profile-placeholder"><i class="ph ph-user"></i></div>`
                }
                    </div>

                    <p style="color: #065f46; margin-bottom: 24px;">Exit recorded for ${data.student.name}</p>
                    <button onclick="loadModule('scan-qr')" class="btn-modern btn-modern-primary">
                        Scan Next Pass
                    </button>
                </div>
            `;
            document.getElementById('qrInput').value = '';
        } else {
            document.getElementById('qrResult').innerHTML = `<div class="error-message show">${data.message}</div>`;
        }
    } catch (error) {
        alert('Error recording exit');
    }
}

async function loadStudentsOut() {
    try {
        const response = await fetch(`${app.API_BASE}/security/students-out`);
        const data = await response.json();

        if (data.success) {
            let html = `
                <div class="mb-8" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 class="login-title" style="font-size: 1.75rem;">Students Currently Out</h2>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">${data.count} students outside campus.</p>
                    </div>
                    <button onclick="loadModule('security-dashboard')" class="btn-modern" style="width: auto; background: #f1f5f9; color: var(--text-main);"><i class="ph ph-arrow-left"></i> Back</button>
                </div>
                
                <div class="table-wrapper">
                    <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Department</th>
                                <th>Exit Time</th>
                                <th>Exp. Return</th>
                                <th>Reason</th>
                                <th style="text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.students_out.length === 0) {
                html += `<tr><td colspan="6" style="text-align: center; padding: 48px; color: var(--text-muted);">No students are currently outside campus.</td></tr>`;
            } else {
                data.students_out.forEach(student => {
                    html += `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${student.student_name}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">${student.registration_no}</div>
                            </td>
                            <td>
                <div style="font-weight: 600; color: var(--secondary); font-size: 13px;">${app.formatYear(student.academic_year)}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${student.dept_name}</div>
            </td>
                            <td>${app.formatDateTime(student.actual_exit_time)}</td>
                            <td>
                                <div style="color: ${student.is_late ? 'var(--danger)' : 'var(--warning)'}; font-weight: 600;">
                                    ${student.expected_return_time === '23:59:00' ? 'Not Returning Today' : app.formatTime(student.expected_return_time)}
                                    ${student.is_late ? ' <span class="badge-rejected" style="font-size: 10px; padding: 2px 6px;">LATE</span>' : ''}
                                </div>
                            </td>
                            <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${student.reason || '-'}</td>
                             <td>
                                <div style="display: flex; justify-content: flex-end;">
                                    ${student.expected_return_time === '23:59:00' ? '' : `
                                    <button onclick="recordEntryManual(${student.outpass_id})" 
                                            class="btn-modern" style="background: ${student.is_late ? 'var(--danger)' : 'var(--success)'}; color: white; width: auto; padding: 6px 16px; border-radius: 8px;">
                                        Mark Entry
                                    </button>
                                    `}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }

            html += `</tbody></table></div></div>`;
            document.getElementById('moduleContent').innerHTML = html;
        } else {
            document.getElementById('moduleContent').innerHTML = `
                <div class="card">
                    <p style="color: var(--danger); font-weight: 600;">Error: ${data.message || 'Failed to fetch students'}</p>
                    <button onclick="loadModule('security-dashboard')" class="btn-modern" style="margin-top: 1rem; width: auto;">Go to Dashboard</button>
                </div>`;
        }
    } catch (error) {
        console.error('Error fetching students:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="card">
                <p style="color: var(--danger); font-weight: 600;">Critical Error: Failed to connect to server</p>
                <p style="font-size: 12px; color: var(--text-muted);">${error.message}</p>
                <button onclick="loadModule('students-out')" class="btn-modern" style="margin-top: 1rem; width: auto;">Retry</button>
            </div>`;
    }
}

async function recordEntryManual(outpassId) {
    if (!confirm('Record entry for this student?')) return;

    try {
        const response = await fetch(`${app.API_BASE}/security/record-entry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outpass_id: outpassId })
        });

        const data = await response.json();
        
        if (data.success) {
            if (data.is_late) {
               alert('Entry recorded successfully (LATE) ⏰');
            } else {
               alert(data.message);
            }
            loadModule('students-out');
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert('Error recording entry');
    }
}

async function loadRecentActivity() {
    try {
        const response = await fetch(`${app.API_BASE}/security/recent-activity?limit=50`);
        const data = await response.json();

        if (data.success) {
            let html = `
                <div class="mb-8" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <h2 class="login-title" style="font-size: 1.75rem;">Recent Activity</h2>
                    <button onclick="loadModule('security-dashboard')" class="btn-modern" style="width: auto; background: #f1f5f9; color: var(--text-main);"><i class="ph ph-arrow-left"></i> Dashboard</button>
                </div>
                
                <div class="table-wrapper">
                    <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Student Identity</th>
                                <th>Department</th>
                                <th>Exit Recorded</th>
                                <th>Return Recorded</th>
                                <th>Purpose</th>
                                <th style="text-align: right;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.activities.length === 0) {
                html += `<tr><td colspan="6" style="text-align: center; padding: 48px; color: var(--text-muted);">No recorded activity today.</td></tr>`;
            } else {
                data.activities.forEach(activity => {
                    const status = activity.actual_entry_time ? 'Returned' : 'Out';
                    html += `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${activity.student_name}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">${activity.registration_no}</div>
                            </td>
                            <td>
                <div style="font-weight: 600; color: var(--secondary); font-size: 13px;">${app.formatYear(activity.academic_year)}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${activity.dept_name}</div>
            </td>
                            <td>${app.formatDateTime(activity.actual_exit_time)}</td>
                            <td>${activity.actual_entry_time ? app.formatDateTime(activity.actual_entry_time) : '<span style="color: var(--danger);">Still Out</span>'}</td>
                            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${activity.reason}</td>
                            <td>
                                <div style="display: flex; justify-content: flex-end;">
                                    <span class="status-badge ${status === 'Returned' ? 'badge-approved' : 'badge-pending'}">
                                        ${status}
                                    </span>
                                    ${activity.is_late ? ' <span class="badge-rejected" style="font-size: 10px; padding: 2px 6px; margin-left: 4px;">LATE ⏰</span>' : ''}
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }

            html += `</tbody></table></div></div>`;
            document.getElementById('moduleContent').innerHTML = html;
        } else {
            document.getElementById('moduleContent').innerHTML = `
                <div class="card" style="padding: 2.5rem; text-align: center;">
                    <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Failed to load activity</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading activity'}</p>
                    <button onclick="loadRecentActivity()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading recent activity:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="card" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load activity</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching traffic logs.'}</p>
                <button onclick="loadRecentActivity()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}