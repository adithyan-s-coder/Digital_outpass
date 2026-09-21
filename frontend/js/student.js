// Student Module JavaScript

// Load student dashboard
async function loadStudentDashboard() {
    try {
        const response = await fetch(`${app.API_BASE}/student/dashboard-stats`);
        const data = await response.json();

        if (data.success) {
            const stats = data.stats;
            document.getElementById('moduleContent').innerHTML = `
                <div class="mb-8" style="animation: fadeIn 0.4s ease-out;">
                    <h2 class="login-title" style="font-size: 2.25rem;">Student Hub</h2>
                    <p style="color: var(--text-muted); font-size: 1rem;">Welcome back! Monitor your active outpasses and request new ones here.</p>
                </div>
                
                <div class="stats-grid mb-8">
                    <div class="modern-card">
                        <div class="stat-icon"><i class="ph ph-files"></i></div>
                        <div>
                            <div class="stat-value">${stats.total || 0}</div>
                            <div class="stat-label">Total Requests</div>
                        </div>
                    </div>
                    <div class="modern-card" style="cursor: pointer;" onclick="loadModule('my-outpasses')">
                        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);"><i class="ph ph-hourglass-high"></i></div>
                        <div>
                            <div class="stat-value">${stats.pending || 0}</div>
                            <div class="stat-label">Awaiting Approval</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);"><i class="ph ph-check-circle"></i></div>
                        <div>
                            <div class="stat-value">${stats.approved || 0}</div>
                            <div class="stat-label">Approved Passes</div>
                        </div>
                    </div>
                </div>
                
                <div class="glass-panel" style="background: white; border: none; display: flex; flex-direction: column; gap: 2.5rem; align-items: flex-start; max-width: 100%;">
                    <div style="flex: 1;">
                        <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--text-main); margin-bottom: 1rem;">Quick Access</h3>
                        <p style="color: var(--text-muted); margin-bottom: 2rem; line-height: 1.6;">Easily apply for new outpasses or check the status of your current requests in the history tab.</p>
                        <div style="display: flex; gap: 1.25rem; flex-wrap: wrap;">
                            <button onclick="loadModule('apply-outpass')" class="btn-modern btn-modern-primary" style="width: auto;">
                                <i class="ph ph-plus-square"></i> New Application
                            </button>
                            <button onclick="loadModule('my-outpasses')" class="btn-modern" style="background: #f1f5f9; color: var(--text-main); width: auto;">
                                <i class="ph ph-clock-counter-clockwise"></i> Request History
                            </button>
                        </div>
                    </div>
                    <div style="width: 100%; text-align: center; background: #f8fafc; border-radius: 1.25rem; padding: 2rem; border: 1px solid #f1f5f9;">
                        <i class="ph ph-shield-check" style="font-size: 4.5rem; color: var(--primary); margin-bottom: 1rem; opacity: 0.8;"></i>
                        <h4 style="font-weight: 700; color: var(--text-main);">Safe Campus</h4>
                        <p style="font-size: 0.8125rem; color: var(--text-muted);">Ensure you have a valid outpass before reaching the security gate.</p>
                    </div>
                </div>
            `;
        } else {
            document.getElementById('moduleContent').innerHTML = `<div class="glass-panel"><p style="color: var(--error);">${data.message || 'Error loading dashboard'}</p></div>`;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('moduleContent').innerHTML = '<div class="glass-panel"><p style="color: var(--error);">Error loading dashboard</p></div>';
    }
}

// Load apply outpass form
function loadApplyOutpass() {
    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateStr = maxDate.toISOString().split('T')[0];

    document.getElementById('moduleContent').innerHTML = `
        <div class="glass-panel" style="background: white; border: none; max-width: 850px; margin: 0 auto; animation: fadeIn 0.4s ease-out;">
            <div class="mb-8" style="border-bottom: 2px solid #f1f5f9; padding-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h2 class="login-title">Request Authorization</h2>
                    <p style="color: var(--text-muted); font-size: 0.9375rem;">Please provide accurate details for your outpass generation.</p>
                </div>
                <i class="ph ph-signature" style="font-size: 3rem; color: var(--primary); opacity: 0.2;"></i>
            </div>
            
            <form id="applyOutpassForm" style="display: flex; flex-direction: column; gap: 1.5rem;">
                <div class="form-group" style="grid-column: span 2;">
                    <label style="font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Type of Outpass</label>
                    <div style="display: flex; gap: 1rem; margin-top: 0.25rem;">
                        <label style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="outpass_type" value="same_day" checked onchange="document.getElementById('estimated_return_group').style.display='block';">
                            <span style="font-weight: 600;">Return Today</span>
                        </label>
                        <label style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                            <input type="radio" name="outpass_type" value="overnight" onchange="document.getElementById('estimated_return_group').style.display='none';">
                            <span style="font-weight: 600;">Not returning today</span>
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label style="font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Date of Departure</label>
                    <input type="date" name="out_date" id="out_date" min="${today}" max="${maxDateStr}" required style="border-radius: 12px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
                </div>
                
                <div class="form-group">
                    <label style="font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Departure Time</label>
                    <div style="display: flex; gap: 8px;">
                        <select name="out_hour" required style="flex: 1; border-radius: 12px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; appearance: none; -webkit-appearance: none;">
                            <option value="">HH</option>
                            ${Array.from({ length: 12 }, (_, i) => i + 1).map(h => `<option value="${h.toString().padStart(2, '0')}">${h.toString().padStart(2, '0')}</option>`).join('')}
                        </select>
                        <span style="display: flex; align-items: center; font-weight: bold;">:</span>
                        <input type="number" name="out_minute" min="0" max="59" placeholder="MM" required 
                            oninput="if(this.value < 0) this.value = 0; if(this.value > 59) this.value = 59;"
                            style="flex: 1; border-radius: 12px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
                        <select name="out_ampm" required style="flex: 1; border-radius: 12px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group" id="estimated_return_group">
                    <label style="font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Estimated Return</label>
                    <div style="display: flex; gap: 8px;">
                        <select name="return_hour" style="flex: 1; border-radius: 12px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; appearance: none; -webkit-appearance: none;">
                            <option value="">HH</option>
                            ${Array.from({ length: 12 }, (_, i) => i + 1).map(h => `<option value="${h.toString().padStart(2, '0')}">${h.toString().padStart(2, '0')}</option>`).join('')}
                        </select>
                        <span style="display: flex; align-items: center; font-weight: bold;">:</span>
                        <input type="number" name="return_minute" min="0" max="59" placeholder="MM" 
                            oninput="if(this.value < 0) this.value = 0; if(this.value > 59) this.value = 59;"
                            style="flex: 1; border-radius: 12px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
                        <select name="return_ampm" style="flex: 1; border-radius: 12px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group" style="grid-column: span 2;">
                    <label style="font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Reason for Outpass</label>
                    <textarea name="reason" rows="3" placeholder="Explain your requirement clearly (e.g. Personal emergency, Official visit)..." required style="width: 100%; border-radius: 16px; border: 1px solid #e2e8f0; padding: 18px; background: #f8fafc; font-family: inherit; font-size: 15px;"></textarea>
                </div>
                
                <div class="form-group" style="grid-column: span 2;">
                    <label style="font-weight: 700; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">Destination Address <span style="font-weight: 400; opacity: 0.6;">(Optional)</span></label>
                    <input type="text" name="destination" placeholder="Enter specific location or city..." style="border-radius: 12px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0;">
                </div>
                
                <div style="display: flex; gap: 1.25rem; margin-top: 1rem; flex-wrap: wrap;">
                    <button type="submit" class="btn-modern btn-modern-primary" style="flex: 2; min-width: 200px;">
                        <i class="ph ph-paper-plane-tilt"></i> Dispatch Request
                    </button>
                    <button type="button" onclick="loadModule('student-dashboard')" class="btn-modern" style="flex: 1; background: #f1f5f9; color: var(--text-main); min-width: 120px;">Discard</button>
                </div>
                
                <div id="applyError" class="error-message" style="grid-column: span 2;"></div>
                <div id="applySuccess" class="success-message" style="grid-column: span 2;"></div>
            </form>
        </div>
    `;

    document.getElementById('applyOutpassForm').addEventListener('submit', handleApplyOutpass);
}

// Handle apply outpass submission
async function handleApplyOutpass(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });

    const outMin = parseInt(data.out_minute, 10);
    if (outMin < 0 || outMin > 59) {
        showError(document.getElementById('applyError'), 'Minutes must be between 00 and 59');
        return;
    }

    // Parse 12-hour to 24-hour for Departure Time
    let outHour = parseInt(data.out_hour, 10);
    if (data.out_ampm === 'PM' && outHour < 12) outHour += 12;
    if (data.out_ampm === 'AM' && outHour === 12) outHour = 0;

    // Pad minute to 2 digits
    const outMinute = data.out_minute.toString().padStart(2, '0');
    data.out_time = `${outHour.toString().padStart(2, '0')}:${outMinute}:00`;

    if (data.outpass_type === 'same_day') {
        const returnMin = parseInt(data.return_minute, 10);
        if (!data.return_hour || !data.return_minute || returnMin < 0 || returnMin > 59) {
            showError(document.getElementById('applyError'), 'Valid return time is required for single day passes');
            return;
        }

        // Parse 12-hour to 24-hour for Expected Return Time
        let returnHour = parseInt(data.return_hour, 10);
        if (data.return_ampm === 'PM' && returnHour < 12) returnHour += 12;
        if (data.return_ampm === 'AM' && returnHour === 12) returnHour = 0;

        // Pad minute to 2 digits
        const returnMinute = data.return_minute.toString().padStart(2, '0');
        data.expected_return_time = `${returnHour.toString().padStart(2, '0')}:${returnMinute}:00`;
    } else {
        data.expected_return_time = "23:59:00";
    }

    // Remove temporary individual fields from payload
    delete data.outpass_type;
    delete data.out_hour; delete data.out_minute; delete data.out_ampm;
    delete data.return_hour; delete data.return_minute; delete data.return_ampm;

    const errorEl = document.getElementById('applyError');
    const successEl = document.getElementById('applySuccess');

    try {
        const response = await fetch(`${app.API_BASE}/student/apply-outpass`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            successEl.textContent = result.message;
            successEl.classList.add('show');
            errorEl.classList.remove('show');
            e.target.reset();

            setTimeout(() => {
                loadModule('my-outpasses');
            }, 2000);
        } else {
            errorEl.textContent = result.message;
            errorEl.classList.add('show');
            successEl.classList.remove('show');
        }
    } catch (error) {
        errorEl.textContent = 'Network error. Please verify your connection.';
        errorEl.classList.add('show');
        successEl.classList.remove('show');
    }
}

// Load my outpasses
async function loadMyOutpasses() {
    try {
        const response = await fetch(`${app.API_BASE}/student/my-outpasses`);
        const data = await response.json();

        if (data.success) {
            let html = `
                <div class="mb-8" style="display: flex; justify-content: space-between; align-items: flex-end; animation: fadeIn 0.4s ease-out; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 class="login-title" style="font-size: 2.25rem;">Outpass Registry</h2>
                        <p style="color: var(--text-muted); font-size: 1rem;">Track your authorization process and active permits.</p>
                    </div>
                    <button onclick="loadModule('apply-outpass')" class="btn-modern btn-modern-primary" style="width: auto; border-radius: 2rem;">
                        <i class="ph ph-plus-circle"></i> New Requirement
                    </button>
                </div>
                
                <div class="table-wrapper">
                    <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Schedule</th>
                                <th>Reasoning & Identity</th>
                                <th>Advisor Status</th>
                                <th>Final Authority</th>
                                <th style="text-align: right;">Operations</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.outpasses.length === 0) {
                html += `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 80px; color: var(--text-muted);">
                            <i class="ph ph-folder-open" style="font-size: 64px; opacity: 0.1; display: block; margin: 0 auto 16px;"></i>
                            Digital archive is empty. Start by applying for an outpass.
                        </td>
                    </tr>
                `;
            } else {
                data.outpasses.forEach(outpass => {
                    html += `
                        <tr style="cursor: pointer; transition: background 0.2s;" onclick="viewOutpassDetails(${outpass.outpass_id})">
                            <td>
                                <div style="font-weight: 800; color: var(--text-main); font-size: 15px;">${app.formatDate(outpass.out_date)}</div>
                                <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">DEP: ${app.formatTime(outpass.out_time)}</div>
                            </td>
                            <td>
                                <div style="font-weight: 700; color: var(--secondary); font-size: 14px;">${outpass.reason}</div>
                                <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">UUID: #${outpass.outpass_id}</div>
                            </td>
                            <td>${app.getStatusBadge(outpass.advisor_status)}</td>
                            <td>${app.getStatusBadge(outpass.final_status)}</td>
                            <td>
                                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                    ${outpass.final_status === 'approved' && outpass.qr_code ?
                            `<button onclick="event.stopPropagation(); showQRCode(${outpass.outpass_id})" 
                                                 class="btn-modern btn-modern-primary" style="padding: 6px 14px; font-size: 12px; border-radius: 8px;"><i class="ph ph-qr-code"></i></button>` : ''}
                                    ${outpass.final_status === 'pending' ?
                            `<button onclick="event.stopPropagation(); cancelOutpass(${outpass.outpass_id})" 
                                                 class="btn-modern" style="padding: 6px 14px; font-size: 12px; background: rgba(239, 68, 68, 0.08); color: var(--error); border-radius: 8px;"><i class="ph ph-trash"></i></button>` :
                            `<button onclick="event.stopPropagation(); deleteOutpass(${outpass.outpass_id})" 
                                                 class="btn-modern" style="padding: 6px 14px; font-size: 12px; background: #f1f5f9; color: var(--text-muted); border-radius: 8px;"><i class="ph ph-archive"></i></button>`}
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
                <div class="glass-panel" style="padding: 2.5rem; text-align: center;">
                    <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Failed to load outpasses</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading records'}</p>
                    <button onclick="loadMyOutpasses()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading outpasses:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="glass-panel" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load outpasses</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching your records.'}</p>
                <button onclick="loadMyOutpasses()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}

// View outpass details
async function viewOutpassDetails(outpassId) {
    try {
        const response = await fetch(`${app.API_BASE}/student/outpass/${outpassId}`);
        const data = await response.json();

        if (data.success) {
            const op = data.outpass;
            const logs = data.logs;

            let html = `
                <div class="glass-panel" style="max-width: 850px; margin: 0 auto; border: none; animation: fadeIn 0.4s ease-out;">
                    <div class="mb-8" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                        <div>
                            <span class="status-badge ${app.getStatusBadge(op.final_status).includes('approved') ? 'badge-approved' : 'badge-pending'}" style="margin-bottom: 1rem;">
                                ${op.final_status.toUpperCase()} PERMIT
                            </span>
                            <h2 class="login-title" style="font-size: 2rem;">Outpass Specification</h2>
                            <p style="color: var(--text-muted); font-size: 0.875rem; font-family: monospace;">Registry Identifier: ${op.outpass_id}</p>
                        </div>
                        <button onclick="loadModule('my-outpasses')" class="btn-modern" style="width: auto; background: #f1f5f9; color: var(--text-main);">
                            <i class="ph ph-caret-left"></i> Return
                        </button>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 2rem; margin-bottom: 2.5rem;">
                        <div style="background: #f8fafc; border-radius: 1.25rem; padding: 2rem; border: 1px solid #f1f5f9;">
                            <h3 style="font-size: 1.125rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--secondary); display: flex; align-items: center; gap: 0.5rem;">
                                <i class="ph ph-info" style="color: var(--primary);"></i> Core Information
                            </h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem;">
                                <div>
                                    <div style="font-size: 0.6875rem; text-transform: uppercase; color: var(--text-muted); font-weight: 800; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Effective Date</div>
                                    <div style="font-weight: 700; color: var(--text-main);">${app.formatDate(op.out_date)}</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.6875rem; text-transform: uppercase; color: var(--text-muted); font-weight: 800; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Authorization</div>
                                    <div style="font-weight: 700; color: var(--primary);">${op.advisor_name}</div>
                                </div>
                                <div>
                                    <div style="font-size: 0.6875rem; text-transform: uppercase; color: var(--text-muted); font-weight: 800; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Departure</div>
                                    <div style="font-weight: 700; color: var(--text-main);">${app.formatTime(op.out_time)}</div>
                                </div>
                                ${op.expected_return_time === '23:59:00' ? '' : `<div>
                                    <div style="font-size: 0.6875rem; text-transform: uppercase; color: var(--text-muted); font-weight: 800; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Expected Return</div>
                                    <div style="font-weight: 700; color: var(--text-main);">${app.formatTime(op.expected_return_time)}</div>
                                </div>`}
                            </div>
                            <div style="margin-top: 1.5rem; border-top: 1px solid #e2e8f0; padding-top: 1.5rem;">
                                <div style="font-size: 0.6875rem; text-transform: uppercase; color: var(--text-muted); font-weight: 800; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Declared Objective</div>
                                <p style="font-size: 0.875rem; font-weight: 600; line-height: 1.6; color: var(--secondary);">${op.reason}</p>
                            </div>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 24px;">
                            ${op.qr_code && op.final_status === 'approved' ? `
                                <div style="background: white; border: 2px solid #f1f5f9; border-radius: 20px; padding: 32px; text-align: center; box-shadow: var(--shadow-md);">
                                    <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Gate Authorization</h3>
                                    <button onclick="showQRCode(${op.outpass_id})" class="btn-modern btn-modern-primary" style="width: 100%; padding: 16px; border-radius: 12px;">
                                        <i class="ph ph-qr-code"></i> Display QR Token
                                    </button>
                                    <p style="font-size: 11px; color: var(--text-muted); margin-top: 12px; font-weight: 600;">Show this token to the gate security officer.</p>
                                </div>
                            ` : op.final_status === 'used' ? `
                                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 20px; padding: 32px; text-align: center;">
                                    <i class="ph ph-check-circle" style="font-size: 40px; color: var(--success); margin-bottom: 12px;"></i>
                                    <h3 style="font-size: 16px; font-weight: 700; color: var(--success);">Authorization Used</h3>
                                    <p style="font-size: 13px; color: #166534; margin-top: 8px;">Token was verified and logged by security on exit.</p>
                                </div>
                            ` : `
                                <div style="background: rgba(245, 158, 11, 0.05); border: 1px dashed #fcd34d; border-radius: 20px; padding: 32px; text-align: center;">
                                    <i class="ph ph-warning-diamond" style="font-size: 40px; color: var(--warning); margin-bottom: 12px;"></i>
                                    <h3 style="font-size: 16px; font-weight: 700; color: var(--warning);">Status: ${op.final_status.toUpperCase()}</h3>
                                    <p style="font-size: 13px; color: #92400e; margin-top: 8px;">QR Token is unavailable, used, or not yet generated.</p>
                                </div>
                            `}
                            
                            <div style="background: #f8fafc; border-radius: 1.25rem; padding: 1.5rem; border: 1px solid #f1f5f9;">
                                <h3 style="font-size: 0.875rem; font-weight: 800; text-transform: uppercase; margin-bottom: 1rem; color: var(--text-muted);">Verification Trail</h3>
                                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: white; border-radius: 0.625rem; border: 1px solid #eef2ff;">
                                        <span style="font-size: 0.8125rem; font-weight: 600;">Advisor</span>
                                        ${app.getStatusBadge(op.advisor_status)}
                                    </div>
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: white; border-radius: 0.625rem; border: 1px solid #eef2ff;">
                                        <span style="font-size: 0.8125rem; font-weight: 600;">Office of HOD</span>
                                        ${app.getStatusBadge(op.hod_status)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('moduleContent').innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading details:', error);
    }
}

// Show QR code
async function showQRCode(outpassId) {
    try {
        const response = await fetch(`${app.API_BASE}/student/outpass/${outpassId}`);
        const data = await response.json();

        if (data.success && data.outpass.qr_code) {
            const qrBase64 = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data.outpass.qr_code)}`;
            app.showQRModal(data.outpass.qr_code, qrBase64);
        }
    } catch (error) {
        console.error('Error showing QR code:', error);
    }
}

// Cancel outpass
async function cancelOutpass(outpassId) {
    if (!confirm('Abort the authorization request for this outpass?')) return;

    try {
        const response = await fetch(`${app.API_BASE}/student/cancel-outpass/${outpassId}`, { method: 'POST' });
        const data = await response.json();
        alert(data.message);
        loadMyOutpasses();
    } catch (error) {
        console.error('Error cancelling outpass:', error);
    }
}

// Delete outpass
async function deleteOutpass(outpassId) {
    if (!confirm('Archiving this record will remove it from your active view. Proceed?')) return;

    try {
        const response = await fetch(`${app.API_BASE}/student/delete-outpass/${outpassId}`, { method: 'DELETE' });
        const data = await response.json();
        alert(data.message);
        loadMyOutpasses();
    } catch (error) {
        console.error('Error deleting outpass:', error);
    }
}

// Load history
async function loadMyHistory() {
    loadMyOutpasses();
}