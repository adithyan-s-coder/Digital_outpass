// Staff/Advisor Module JavaScript

// Load staff dashboard
async function loadStaffDashboard() {
    try {
        const response = await fetch(`${app.API_BASE}/staff/dashboard-stats`);
        const data = await response.json();

        if (data.success) {
            const stats = data.stats;
            document.getElementById('moduleContent').innerHTML = `
                <div class="mb-8" style="animation: fadeIn 0.4s ease-out;">
                    <h2 class="login-title" style="font-size: 2.25rem;">Staff Dashboard</h2>
                    <p style="color: var(--text-muted); font-size: 1rem;">Manage your student's outpass requests and approvals.</p>
                </div>
                
                <div class="stats-grid">
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);"><i class="ph ph-bell-ringing"></i></div>
                        <div>
                            <div class="stat-value">${stats.pending_requests || 0}</div>
                            <div class="stat-label">Pending Requests</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon"><i class="ph ph-users-three"></i></div>
                        <div>
                            <div class="stat-value">${stats.total_students || 0}</div>
                            <div class="stat-label">My Students</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);"><i class="ph ph-calendar-check"></i></div>
                        <div>
                            <div class="stat-value">${stats.processed_this_month || 0}</div>
                            <div class="stat-label">Processed (Month)</div>
                        </div>
                    </div>
                </div>
                
                <div class="glass-panel" style="background: white; border: none;">
                    <div class="mb-4">
                        <h3 style="font-size: 1.25rem; font-weight: 600;">Action Center</h3>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Quick access to management tools.</p>
                    </div>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button onclick="loadModule('pending-requests')" class="btn-modern btn-modern-primary" style="width: auto;">
                            <i class="ph ph-timer"></i> View Pending Requests
                        </button>
                        <button onclick="loadModule('my-students')" class="btn-modern" style="background: #f1f5f9; color: var(--text-main); width: auto;">
                            <i class="ph ph-users-four"></i> My Students
                        </button>
                        <button onclick="openAIReportModal()" class="btn-modern" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; width: auto; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                            <i class="ph ph-sparkle"></i> AI Outpass Report
                        </button>
                    </div>
                </div>
            `;
        } else {
            document.getElementById('moduleContent').innerHTML = `<div class="card"><p>${data.message || 'Error loading dashboard'}</p></div>`;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('moduleContent').innerHTML = `<div class="card"><p style="color: var(--danger);">Error: ${error.message || 'Failed to load staff stats'}</p></div>`;
    }
}

// Load pending requests
async function loadPendingRequests() {
    try {
        const response = await fetch(`${app.API_BASE}/staff/pending-requests`);
        const data = await response.json();

        if (data.success) {
            let html = `
                <div class="mb-8" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <h2 class="login-title" style="font-size: 1.75rem;">Pending Requests</h2>
                    <button onclick="loadModule('staff-dashboard')" class="btn-modern" style="width: auto; background: #f1f5f9; color: var(--text-main);">
                        <i class="ph ph-arrow-left"></i> Back
                    </button>
                </div>
                
                <div class="table-wrapper">
                    <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Student</th>
                                <th>Dept</th>
                                <th>Reg No</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Reason</th>
                                <th>Parent Contact</th>
                                <th style="text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            if (data.requests.length === 0) {
                html += `<tr><td colspan="7" style="text-align: center; padding: 20px;">No pending requests.</td></tr>`;
            } else {
                data.requests.forEach(req => {
                    const parentInfo = req.parent_name
                        ? `<span style="font-weight:600;font-size:0.85rem;">${req.parent_name}</span><br>
                           ${req.parent_mobile
                            ? `<a href="tel:${req.parent_mobile}" style="color:var(--primary);font-size:0.8rem;font-weight:500;"><i class="ph ph-phone"></i> ${req.parent_mobile}</a>`
                            : '<span style="color:#94a3b8;font-size:0.8rem;">No mobile</span>'}`
                        : '<span style="color:#94a3b8;font-size:0.8rem;">N/A</span>';

                    html += `
                        <tr>
                            <td style="font-weight: 600;">${req.student_name}</td>
                            <td style="color: var(--secondary); font-size: 13px; font-weight: 600;">
                                ${app.formatYear(req.academic_year)} - ${req.dept_name}
                            </td>
                            <td>${req.registration_no}</td>
                            <td>${app.formatDate(req.out_date)}</td>
                            <td>${app.formatTime(req.out_time)}</td>
                            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${req.reason}</td>
                            <td>${parentInfo}</td>
                            <td>
                                <div style="display: flex; justify-content: flex-end;">
                                    <button onclick="reviewRequest(${req.outpass_id})" class="btn-modern btn-modern-primary" style="padding: 6px 16px; font-size: 13px;">Review</button>
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
                    <h3 style="margin-bottom: 0.5rem;">Failed to load requests</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading pending requests'}</p>
                    <button onclick="loadPendingRequests()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading pending requests:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="card" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load requests</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching pending requests.'}</p>
                <button onclick="loadPendingRequests()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}

// Review request
async function reviewRequest(outpassId) {
    try {
        const response = await fetch(`${app.API_BASE}/staff/pending-requests`);
        const data = await response.json();
        const op = data.requests.find(r => r.outpass_id === outpassId);

        if (op) {
            const parentPhone = op.parent_mobile || '';
            const callLink = parentPhone
                ? `<a href="tel:${parentPhone}" style="display:inline-flex;align-items:center;gap:0.4rem;background:#16a34a;color:#fff;padding:0.5rem 1.2rem;border-radius:2rem;font-weight:700;font-size:1rem;text-decoration:none;box-shadow:0 2px 8px rgba(22,163,74,0.25);transition:opacity 0.2s;" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1"><i class="ph ph-phone-call"></i> Call ${parentPhone}</a>`
                : `<span style="color:#94a3b8;font-size:0.875rem;">No parent mobile on file</span>`;

            document.getElementById('moduleContent').innerHTML = `
                <div class="glass-panel" style="max-width: 620px; margin: 0 auto; border: none;">

                    <!-- Back button -->
                    <button onclick="loadModule('pending-requests')" class="btn-modern" style="width:auto;background:#f1f5f9;color:var(--text-main);margin-bottom:1.25rem;">
                        <i class="ph ph-arrow-left"></i> Back
                    </button>

                    <!-- Student info header -->
                    <div style="display:flex;gap:1.5rem;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;justify-content:center;text-align:center;">
                        <div style="width:90px;height:90px;border-radius:50%;background:#f1f5f9;overflow:hidden;display:flex;align-items:center;justify-content:center;border:2px solid var(--primary);flex-shrink:0;">
                            ${op.profile_image
                    ? `<img src="/uploads/${op.profile_image}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
                    : '<i class="ph ph-user" style="font-size:2.5rem;color:#cbd5e1;"></i>'}
                        </div>
                        <div style="flex:1;min-width:200px;">
                            <h2 class="login-title" style="font-size:1.4rem;margin-bottom:0.25rem;">Review Request</h2>
                            <p style="font-size:1.1rem;font-weight:700;color:var(--primary);margin-bottom:0.2rem;">${op.student_name}</p>
                            <p style="font-size:0.85rem;color:var(--text-muted);">${op.registration_no} &nbsp;|&nbsp; ${op.dept_name}</p>
                        </div>
                    </div>

                    <!-- ⚠️ Parent Call Reminder Banner -->
                    <div style="background:linear-gradient(135deg,#fff7ed,#ffedd5);border:1.5px solid #f97316;border-radius:0.85rem;padding:1.1rem 1.3rem;margin-bottom:1.5rem;">
                        <p style="font-weight:700;font-size:0.95rem;color:#9a3412;margin-bottom:0.5rem;">
                            <i class="ph ph-phone-call" style="font-size:1.1rem;vertical-align:middle;"></i>
                            &nbsp;Call Parent Before Approving
                        </p>
                        <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.75rem;">
                            <span style="font-size:0.875rem;color:#7c2d12;font-weight:600;">
                                <i class="ph ph-user-circle"></i> ${op.parent_name || 'Parent Name N/A'}
                            </span>
                        </div>
                        ${callLink}
                        <p style="font-size:0.78rem;color:#c2410c;margin-top:0.6rem;margin-bottom:0;">
                            Please call the parent, inform them about the outpass, then approve below.
                        </p>
                    </div>

                    <!-- Outpass details -->
                    <div style="background:#f8fafc;padding:1.1rem;border-radius:0.75rem;margin-bottom:1.25rem;">
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1rem;">
                            <div>
                                <p style="font-size:0.675rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:0.2rem;">Out Date</p>
                                <p style="font-weight:600;">${app.formatDate(op.out_date)}</p>
                            </div>
                            <div>
                                <p style="font-size:0.675rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:0.2rem;">Out Time</p>
                                <p style="font-weight:600;">${app.formatTime(op.out_time)}</p>
                            </div>
                            ${op.expected_return_time === '23:59:00' ? '' : `<div>
                                <p style="font-size:0.675rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:0.2rem;">Return Time</p>
                                <p style="font-weight:600;">${app.formatTime(op.expected_return_time)}</p>
                            </div>`}
                            <div>
                                <p style="font-size:0.675rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:0.2rem;">Reason</p>
                                <p style="font-weight:600;">${op.reason}</p>
                            </div>
                            ${op.destination ? `<div>
                                <p style="font-size:0.675rem;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:0.2rem;">Destination</p>
                                <p style="font-weight:600;">${op.destination}</p>
                            </div>` : ''}
                        </div>
                    </div>

                    <!-- Remarks + Action buttons -->
                    <div style="background: #f0fdf4; border: 1.5px solid #16a34a; border-radius: 0.85rem; padding: 1.1rem; margin-bottom: 1.5rem;">
                        <label style="display:flex; align-items:flex-start; gap:0.75rem; cursor:pointer; margin:0;">
                            <input type="checkbox" id="parentCallConfirm" style="margin-top:0.15rem; width:1.25rem; height:1.25rem; accent-color:#16a34a; flex-shrink:0;">
                            <div>
                                <span style="font-size:0.95rem; font-weight:700; color:#166534; display:block; margin-bottom:0.15rem;">I confirm parental notification</span>
                                <span style="font-size:0.8rem; color:#14532d; font-weight:500;">By checking this box, I verify that I have spoken to the student's parent/guardian and approve this request.</span>
                            </div>
                        </label>
                    </div>

                    <div class="form-group">
                        <label>Advisor Remarks (optional)</label>
                        <textarea id="remarks" rows="3" placeholder="Enter any remarks after speaking with parent..."></textarea>
                    </div>
                    <div style="display:flex;gap:0.75rem;margin-top:0.75rem;flex-wrap:wrap;">
                        <button onclick="approveStaffRequest(${outpassId})" class="btn-modern btn-modern-primary" style="flex:1;min-width:130px;">
                            <i class="ph ph-check-circle"></i> Approve &amp; Forward to HOD
                        </button>
                        <button onclick="rejectStaffRequest(${outpassId})" class="btn-modern" style="flex:1;background:#fee2e2;color:#991b1b;min-width:130px;">
                            <i class="ph ph-x-circle"></i> Reject
                        </button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function approveStaffRequest(outpassId) {
    const parentCallConfirm = document.getElementById('parentCallConfirm');
    if (parentCallConfirm && !parentCallConfirm.checked) {
        alert("Action Required: Please confirm you have called the parent by checking the verification box.");
        return;
    }

    const remarks = document.getElementById('remarks').value || 'Approved';
    try {
        const response = await fetch(`${app.API_BASE}/staff/approve-request/${outpassId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remarks, parent_called: true })
        });
        const data = await response.json();
        alert(data.message);
        loadModule('pending-requests');
    } catch (error) {
        alert('Error approving request');
    }
}

async function rejectStaffRequest(outpassId) {
    const remarks = document.getElementById('remarks').value;
    if (!remarks) {
        alert('Please provide remarks');
        return;
    }
    try {
        const response = await fetch(`${app.API_BASE}/staff/reject-request/${outpassId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ remarks })
        });
        const data = await response.json();
        alert(data.message);
        loadModule('pending-requests');
    } catch (error) {
        alert('Error rejecting request');
    }
}

async function loadMyStudents() {
    try {
        const response = await fetch(`${app.API_BASE}/staff/my-students`);
        const data = await response.json();

        if (data.success) {
            let html = `
                <div class="mb-8" style="display: flex; justify-content: space-between; align-items: center;">
                    <h2 class="login-title" style="font-size: 1.75rem;">My Students</h2>
                    <button onclick="openAIReportModal()" class="btn-modern" style="width: auto; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                        <i class="ph ph-sparkle"></i> AI Outpass Report
                    </button>
                </div>
                <div class="table-wrapper">
                    <div class="table-responsive">
                    <table class="modern-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Dept</th>
                                <th>Reg No</th>
                                <th>Email</th>
                                <th>Total Outpasses</th>
                                <th style="text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            data.students.forEach(s => {
                html += `
                    <tr>
                        <td>${s.full_name}</td>
                        <td style="color: var(--secondary); font-size: 13px; font-weight: 600;">
                            ${app.formatYear(s.academic_year)} - ${s.dept_name || 'N/A'}
                        </td>
                        <td>${s.registration_no}</td>
                        <td>${s.email}</td>
                        <td>${s.total_outpasses || 0}</td>
                        <td><button onclick="viewStudentHistory(${s.user_id})" class="btn btn-sm btn-primary">History</button></td>
                    </tr>
                `;
            });

            html += `</tbody></table></div></div>`;
            document.getElementById('moduleContent').innerHTML = html;
        } else {
            document.getElementById('moduleContent').innerHTML = `
                <div class="card" style="padding: 2.5rem; text-align: center;">
                    <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Failed to load students</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading students'}</p>
                    <button onclick="loadMyStudents()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading students:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="card" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load students</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching students.'}</p>
                <button onclick="loadMyStudents()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}

async function viewStudentHistory(studentId) {
    try {
        const response = await fetch(`${app.API_BASE}/staff/student-history/${studentId}`);
        const data = await response.json();

        if (data.success) {
            let html = `
                <div class="mb-4">
                    <h2 class="login-title" style="font-size: 1.5rem;">${data.student.full_name} - History</h2>
                </div>
                <div class="table-wrapper">
                    <div class="table-responsive">
                    <table class="modern-table">
                        <thead><tr><th>Dept</th><th>Date</th><th>Reason</th><th>Status</th></tr></thead>
                        <tbody>`;

            data.history.forEach(h => {
                html += `<tr><td style="color: var(--secondary); font-size: 13px; font-weight: 600;">${app.formatYear(data.student.academic_year)} - ${data.student.dept_name}</td><td>${app.formatDate(h.out_date)}</td><td>${h.reason}</td><td>${app.getStatusBadge(h.final_status)}</td></tr>`;
            });

            html += `</tbody></table></div></div>`;
            document.getElementById('moduleContent').innerHTML = html;
        }
    } catch (error) {
        console.error('Error:', error);
    }
}