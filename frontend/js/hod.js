// HOD Module JavaScript

async function loadHODDashboard() {
    try {
        const response = await fetch(`${app.API_BASE}/hod/department-statistics`);
        const data = await response.json();

        if (data.success) {
            const stats = data.statistics;
            document.getElementById('moduleContent').innerHTML = `
                <div class="mb-8" style="animation: fadeIn 0.4s ease-out;">
                    <h2 class="login-title" style="font-size: 2.25rem;">HOD Command Center</h2>
                    <p style="color: var(--text-muted); font-size: 1rem;">Monitor and manage departmental outpass operations from one central panel.</p>
                </div>
                
                <div class="stats-grid">
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(5, 150, 105, 0.1); color: var(--primary);"><i class="ph ph-users-four"></i></div>
                        <div>
                            <div class="stat-value">${stats.total_students || 0}</div>
                            <div class="stat-label">Total Enrollment</div>
                        </div>
                    </div>
                    <div class="modern-card" style="cursor: pointer;" onclick="loadModule('hod-approvals')">
                        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);"><i class="ph ph-notification"></i></div>
                        <div>
                            <div class="stat-value">${stats.pending_hod_approval || 0}</div>
                            <div class="stat-label">Final Approvals</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);"><i class="ph ph-chart-line-up"></i></div>
                        <div>
                            <div class="stat-value">${(stats.outpasses && stats.outpasses.approved) || 0}</div>
                            <div class="stat-label">Total Approved</div>
                        </div>
                    </div>
                </div>
                
                <div class="glass-panel" style="background: white; border: none; display: flex; flex-direction: column; gap: 2.5rem; align-items: flex-start; max-width: 100%;">
                    <div>
                        <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-main);">Quick Operations</h3>
                        <p style="color: var(--text-muted); margin-bottom: 2rem; line-height: 1.6;">Access critical reports, audit student history, and approve pending requests with streamlined workflows.</p>
                        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                            <button onclick="loadModule('hod-approvals')" class="btn-modern btn-modern-primary" style="width: auto;">
                                <i class="ph ph-shield-check"></i> Manage Approvals
                            </button>
                            <button onclick="loadModule('dept-statistics')" class="btn-modern" style="background: #f1f5f9; color: var(--text-main); width: auto;">
                                <i class="ph ph-presentation"></i> Detailed Reports
                            </button>
                            <button onclick="openAIReportModal()" class="btn-modern" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; width: auto; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                                <i class="ph ph-sparkle"></i> AI Department Report
                            </button>
                        </div>
                    </div>
                    <div style="width: 100%; background: #f8fafc; border-radius: 1.25rem; padding: 2rem; border: 1px solid #f1f5f9; text-align: center;">
                        <i class="ph ph-chart-donut" style="font-size: 5rem; color: var(--primary); opacity: 0.8; margin-bottom: 1rem;"></i>
                        <h4 style="font-weight: 700;">Insight Generator</h4>
                        <p style="font-size: 0.8125rem; color: var(--text-muted);">Data visualization for the current academic semester is active.</p>
                    </div>
                </div>
            `;
        } else {
            document.getElementById('moduleContent').innerHTML = `<div class="glass-panel"><p style="color: var(--error);">${data.message || 'Error loading dashboard'}</p></div>`;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadHODApprovals() {
    try {
        const response = await fetch(`${app.API_BASE}/hod/pending-approvals`);
        const data = await response.json();

        if (data.success) {
            let html = `
                <div class="mb-8" style="display: flex; justify-content: space-between; align-items: flex-end; animation: fadeIn 0.4s ease-out; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 class="login-title" style="font-size: 2rem;">Final Decision Queue</h2>
                        <p style="color: var(--text-muted); font-size: 1rem;">Review and finalize outpass requests for your department.</p>
                    </div>
                    <button onclick="loadModule('hod-dashboard')" class="btn-modern" style="width: auto; background: #f1f5f9; color: var(--text-main);"><i class="ph ph-caret-left"></i> Back to Deck</button>
                </div>
                
                <div class="table-wrapper" style="box-shadow: var(--shadow-lg);">
                    <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Student Profiles</th>
                                <th>Department</th>
                                <th>Departure Date</th>
                                <th>Reasoning</th>
                                <th>Verified Advisor</th>
                                <th style="text-align: right;">Authorization</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.requests.length === 0) {
                html += `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 80px; color: var(--text-muted);">
                            <i class="ph ph-checks" style="font-size: 64px; opacity: 0.1; display: block; margin: 0 auto 16px;"></i>
                            All caught up! No pending final approvals.
                        </td>
                    </tr>
                `;
            } else {
                data.requests.forEach(req => {
                    html += `
                        <tr style="transition: background 0.2s linear;">
                            <td>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(5, 150, 105, 0.05); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700;">
                                        ${req.student_name.charAt(0)}
                                    </div>
                                    <div>
                                        <div style="font-weight: 700; color: var(--text-main);">${req.student_name}</div>
                                        <div style="font-size: 11px; color: var(--text-muted); font-family: monospace;">${req.registration_no}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div style="font-weight: 600; color: var(--secondary); font-size: 14px;">
                                    ${app.formatYear(req.academic_year)} - ${req.dept_name}
                                </div>
                            </td>
                            <td>
                                <div style="font-weight: 600; color: var(--text-main);">${app.formatDate(req.out_date)}</div>
                                <div style="font-size: 12px; color: var(--text-muted);">${app.formatTime(req.out_time)}</div>
                            </td>
                            <td title="${req.reason}">
                                <div style="max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-muted); font-size: 14px;">
                                    ${req.reason}
                                </div>
                            </td>
                            <td>
                                <div style="font-size: 14px; display: flex; align-items: center; gap: 6px; color: var(--secondary); font-weight: 600;">
                                    <i class="ph ph-fingerprint" style="color: var(--primary);"></i>
                                    ${req.advisor_name}
                                </div>
                            </td>
                            <td style="text-align: right;">
                                <button onclick="reviewHODRequest(${req.outpass_id})" class="btn-modern btn-modern-primary" style="padding: 8px 18px; font-size: 13px;">Review & Approve</button>
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
                    <h3 style="margin-bottom: 0.5rem;">Failed to load approvals</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading pending approvals'}</p>
                    <button onclick="loadHODApprovals()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading approvals:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="glass-panel" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load approvals</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching pending approvals.'}</p>
                <button onclick="loadHODApprovals()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}

async function reviewHODRequest(outpassId) {
    try {
        const response = await fetch(`${app.API_BASE}/hod/pending-approvals`);
        const data = await response.json();
        const op = data.requests.find(r => r.outpass_id === outpassId);

        if (op) {
            document.getElementById('moduleContent').innerHTML = `
                <div class="glass-panel" style="max-width: 850px; margin: 0 auto; border: none;">
                    <div style="display: flex; gap: 40px; align-items: start; margin-bottom: 40px; border-bottom: 1px solid #f1f5f9; padding-bottom: 32px;">
                        <div style="width: 160px; height: 160px; border-radius: 24px; background: #f8fafc; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 3px solid #f1f5f9; box-shadow: var(--shadow-md);">
                            ${op.profile_image ? `<img src="/uploads/${op.profile_image}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'">` : '<i class="ph ph-user-circle" style="font-size: 80px; color: #cbd5e1;"></i>'}
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                                <h2 style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; color: var(--text-main);">Verification Center</h2>
                                <span class="status-badge badge-pending">Final Audit</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                                <div>
                                    <h3 style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 800;">Student Info</h3>
                                    <p style="font-size: 20px; font-weight: 700; color: var(--text-main);">${op.student_name}</p>
                                     <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px; font-weight: 500;">
                                        ID: <span style="color: var(--secondary);">${op.registration_no}</span> | ${op.dept_name}
                                    </p>
                                    <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px; font-weight: 500;">
                                        <i class="ph ph-users"></i> Parent: <span style="color: var(--text-main);">${op.parent_name || 'N/A'}</span> 
                                        ${op.parent_mobile ? `| <span style="color: var(--primary);"><i class="ph ph-phone"></i> ${op.parent_mobile}</span>` : ''}
                                    </p>
                                    <p style="color: var(--success); font-size: 13px; margin-top: 8px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; background: rgba(16, 185, 129, 0.1); padding: 4px 10px; border-radius: 6px;">
                                        <i class="ph ph-phone-call"></i> Parent Contact Verified by Staff
                                    </p>
                                </div>
                                <div>
                                    <h3 style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 800;">Schedule</h3>
                                    <p style="font-weight: 700; font-size: 18px; color: var(--text-main);"><i class="ph ph-calendar-blank" style="color: var(--primary);"></i> ${app.formatDate(op.out_date)}</p>
                                    <p style="font-weight: 600; color: var(--secondary); font-size: 14px;">${app.formatTime(op.out_time)}${op.expected_return_time === '23:59:00' ? '' : ' — ' + app.formatTime(op.expected_return_time)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 2rem; margin-bottom: 2.5rem;">
                        <div style="background: #f8fafc; padding: 1.75rem; border-radius: 1.25rem; border: 1px solid #f1f5f9;">
                            <h4 style="margin-bottom: 1rem; color: var(--primary); font-size: 0.9375rem; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="ph ph-warning-circle"></i> Declared Reason
                            </h4>
                            <p style="line-height: 1.8; color: var(--text-main); font-weight: 500; font-size: 0.9375rem;">${op.reason}</p>
                        </div>
                        <div style="background: rgba(16, 185, 129, 0.04); padding: 1.75rem; border-radius: 1.25rem; border: 1px solid rgba(16, 185, 129, 0.1);">
                            <h4 style="margin-bottom: 0.75rem; font-size: 0.9375rem; font-weight: 800; text-transform: uppercase; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="ph ph-seal-check" style="color: var(--success);"></i> Advisor Insight
                            </h4>
                            <div style="font-weight: 700; color: var(--success); font-size: 0.875rem; margin-bottom: 0.5rem;">Authorized Recommendation</div>
                            <p style="font-size: 0.875rem; color: #374151; font-style: italic; background: white; padding: 0.75rem; border-radius: 0.75rem; margin-bottom: 0.75rem; border: 1px dashed #d1fae5;">
                                "${op.advisor_remarks || 'The request aligns with institutional protocols.'}"
                            </p>
                            <div style="font-size: 0.6875rem; color: var(--text-muted); font-weight: 600;">Digitally Signed at ${app.formatDateTime(op.advisor_action_time)}</div>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 40px;">
                        <label style="font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em;">HOD Final Remarks</label>
                        <textarea id="hodRemarks" rows="3" placeholder="Add optional remarks for the student..." style="border-radius: 16px; padding: 16px; background: #f8fafc; border-color: #e2e8f0; font-family: inherit; font-size: 15px;"></textarea>
                    </div>

                    <div style="display: flex; gap: 1.25rem; flex-wrap: wrap;">
                        <button onclick="approveHODFinal(${op.outpass_id})" class="btn-modern btn-modern-primary" style="flex: 2; min-width: 250px;">
                            <i class="ph ph-check-circle" style="font-size: 1.375rem;"></i> Approve & Generate QR
                        </button>
                        <button onclick="rejectHODFinal(${op.outpass_id})" class="btn-modern" style="flex: 1; background: #fee2e2; color: #991b1b; min-width: 120px;">Reject</button>
                        <button onclick="loadModule('hod-approvals')" class="btn-modern" style="flex: 0.8; background: #f1f5f9; color: var(--text-muted); min-width: 100px;">Cancel</button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function approveHODFinal(outpassId) {
    const remarks = document.getElementById('hodRemarks').value || 'Approved by HOD';

    if (!confirm('Approve this outpass? A secure QR code will be generated for the student.')) return;

    try {
        const response = await fetch(`${app.API_BASE}/hod/approve-final/${outpassId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remarks })
        });
        const data = await response.json();
        alert(data.message);
        loadModule('hod-approvals');
    } catch (error) {
        alert('Error communicating with authority server.');
    }
}

async function rejectHODFinal(outpassId) {
    const remarks = document.getElementById('hodRemarks').value;

    if (!remarks) {
        alert('Please provide formal remarks for rejection.');
        return;
    }

    if (!confirm('Reject this outpass request? This action is final.')) return;

    try {
        const response = await fetch(`${app.API_BASE}/hod/reject-final/${outpassId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remarks })
        });
        const data = await response.json();
        alert(data.message);
        loadModule('hod-approvals');
    } catch (error) {
        alert('Error communicating with authority server.');
    }
}

async function loadDeptStatistics() {
    try {
        const response = await fetch(`${app.API_BASE}/hod/department-statistics`);
        const data = await response.json();

        if (data.success) {
            const stats = data.statistics;
            let html = `
                <div style="margin-bottom: 40px; animation: fadeIn 0.4s ease-out;">
                    <h2 style="font-size: 36px; font-weight: 700; color: var(--text-main); letter-spacing: -0.02em;">Department Analytics</h2>
                    <p style="color: var(--text-muted);">Real-time monitoring of departmental outpass metrics.</p>
                </div>
                
                <div class="stats-grid">
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(5, 150, 105, 0.1); color: var(--primary);"><i class="ph ph-users-three"></i></div>
                        <div>
                            <div class="stat-value">${stats.total_students}</div>
                            <div class="stat-label">Enrollment</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(51, 65, 85, 0.1); color: var(--secondary);"><i class="ph ph-clipboard-text"></i></div>
                        <div>
                            <div class="stat-value">${stats.outpasses.total || 0}</div>
                            <div class="stat-label">Total Volume</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);"><i class="ph ph-check-circle"></i></div>
                        <div>
                            <div class="stat-value">${stats.outpasses.approved || 0}</div>
                            <div class="stat-label">Success Rate</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--error);"><i class="ph ph-x-circle"></i></div>
                        <div>
                            <div class="stat-value">${stats.outpasses.rejected || 0}</div>
                            <div class="stat-label">Rejections</div>
                        </div>
                    </div>
                </div>

                <div class="glass-panel" style="background: white; border: none; padding: 48px; box-shadow: var(--shadow-lg); margin-top: 32px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
                        <i class="ph ph-chart-pie-slice" style="font-size: 28px; color: var(--primary);"></i>
                        <h3 style="font-size: 24px; font-weight: 700; color: var(--text-main);">Top Reasons for Departure</h3>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px;">
                        ${stats.top_reasons && stats.top_reasons.length > 0 ? stats.top_reasons.map(r => `
                            <div style="background: #f8fafc; padding: 32px; border-radius: 20px; border: 1px solid #f1f5f9; transition: transform 0.3s;" 
                                 onmouseover="this.style.transform='translateY(-8px) scale(1.02)'" onmouseout="this.style.transform='translateY(0) scale(1)'">
                                <div style="color: var(--primary); font-weight: 800; font-size: 40px; margin-bottom: 8px;">${r.count}</div>
                                <div style="color: var(--text-main); font-weight: 700; font-size: 15px; border-top: 2px solid #e2e8f0; padding-top: 16px;">${r.reason}</div>
                            </div>
                        `).join('') : '<p style="color: var(--text-muted); padding: 20px;">No comprehensive data recorded yet.</p>'}
                    </div>
                </div>
            `;
            document.getElementById('moduleContent').innerHTML = html;
        } else {
            document.getElementById('moduleContent').innerHTML = `
                <div class="glass-panel" style="padding: 2.5rem; text-align: center;">
                    <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Failed to load statistics</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading statistics'}</p>
                    <button onclick="loadDeptStatistics()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="glass-panel" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load statistics</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching department analytics.'}</p>
                <button onclick="loadDeptStatistics()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}

async function loadAllOutpasses() {
    try {
        const response = await fetch(`${app.API_BASE}/hod/all-outpasses`);
        const data = await response.json();

        if (data.success) {
            let html = `
                <div style="margin-bottom: 40px; display: flex; justify-content: space-between; align-items: flex-end; animation: fadeIn 0.4s ease-out;">
                    <div>
                        <h2 style="font-size: 32px; font-weight: 700; letter-spacing: -0.02em;">Departmental Audit Registry</h2>
                        <p style="color: var(--text-muted);">Historical tracking of all departmental outpass transactions.</p>
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <button onclick="openAIReportModal()" class="btn-modern" style="width: auto; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                            <i class="ph ph-sparkle"></i> AI Department Report
                        </button>
                        <div style="background: var(--primary-gradient); padding: 10px 20px; border-radius: 40px; color: white; font-size: 14px; font-weight: 700; box-shadow: var(--shadow-md);">
                            ${data.outpasses.length} Synchronized Records
                        </div>
                    </div>
                </div>
                
                <div class="table-wrapper">
                    <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Student Identity</th>
                                <th>Department</th>
                                <th>Schedule Info</th>
                                <th>Departure Intent</th>
                                <th>Verification Status</th>
                                <th>Handled By</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.outpasses.length === 0) {
                html += `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 80px; color: var(--text-muted);">
                            <i class="ph ph-folder-not-found" style="font-size: 64px; opacity: 0.1; display: block; margin: 0 auto 16px;"></i>
                            No departmental audit records found.
                        </td>
                    </tr>
                `;
            } else {
                data.outpasses.forEach(op => {
                    html += `
                        <tr style="cursor: pointer; transition: background 0.2s;" onclick="reviewHODRequest(${op.outpass_id})">
                            <td>
                                <div style="display: flex; align-items: center; gap: 14px;">
                                    <div style="width: 44px; height: 44px; border-radius: 12px; background: #eef2ff; color: var(--primary); display: flex; align-items: center; justify-content: center;">
                                        <i class="ph ph-student-bold" style="font-size: 20px;"></i>
                                    </div>
                                    <div>
                                        <div style="font-weight: 700; color: var(--text-main); font-size: 15px;">${op.student_name}</div>
                                        <div style="font-size: 12px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-weight: 600;">#${op.registration_no}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div style="font-weight: 600; color: var(--secondary); font-size: 14px;">
                                    ${app.formatYear(op.academic_year)} - ${op.dept_name}
                                </div>
                            </td>
                            <td>
                                <div style="font-weight: 800; color: var(--text-main); font-size: 14px;">${app.formatDate(op.out_date)}</div>
                                <div style="font-size: 12px; color: var(--text-muted); font-weight: 600;">${app.formatTime(op.out_time)}</div>
                            </td>
                            <td>
                                <div style="max-width: 200px; font-size: 14px; color: var(--text-main); font-weight: 500; line-height: 1.4;">
                                    ${op.reason}
                                </div>
                            </td>
                            <td>${app.getStatusBadge(op.final_status)}</td>
                            <td>
                                <div style="font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px; color: var(--secondary);">
                                    <i class="ph ph-identification-badge" style="font-size: 18px; color: var(--primary);"></i>
                                    ${op.advisor_name || 'System Managed'}
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
                    <h3 style="margin-bottom: 0.5rem;">Failed to load records</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading records'}</p>
                    <button onclick="loadAllOutpasses()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading all outpasses:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="glass-panel" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load records</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching audit records.'}</p>
                <button onclick="loadAllOutpasses()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}