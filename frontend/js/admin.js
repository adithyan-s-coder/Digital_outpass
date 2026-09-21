// Admin Module JavaScript

async function loadAdminDashboard() {
    try {
        const response = await fetch(`${app.API_BASE}/admin/system-report`);
        const data = await response.json();

        if (data.success) {
            const report = data.report || {};
            const outpasses = report.outpasses || {};
            document.getElementById('moduleContent').innerHTML = `
                <div class="mb-8" style="animation: fadeIn 0.4s ease-out;">
                    <h2 class="login-title" style="font-size: 2.25rem;">Admin Central</h2>
                    <p style="color: var(--text-muted); font-size: 1rem;">System-wide oversight and configuration management.</p>
                </div>
                
                <div class="stats-grid">
                    <div class="modern-card">
                        <div class="stat-icon"><i class="ph ph-shield-check"></i></div>
                        <div>
                            <div class="stat-value">${outpasses.total || 0}</div>
                            <div class="stat-label">Total Logs</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(245, 158, 11, 0.1); color: var(--warning);"><i class="ph ph-warning-circle"></i></div>
                        <div>
                            <div class="stat-value">${outpasses.pending || 0}</div>
                            <div class="stat-label">System Pending</div>
                        </div>
                    </div>
                    <div class="modern-card">
                        <div class="stat-icon" style="background: rgba(239, 68, 68, 0.1); color: var(--danger);"><i class="ph ph-seal-warning"></i></div>
                        <div>
                            <div class="stat-value">${report.misuse_attempts || 0}</div>
                            <div class="stat-label">Flagged Issues</div>
                        </div>
                    </div>
                </div>
                
                <div class="glass-panel" style="background: white; border: none;">
                    <div class="mb-4">
                        <h3 style="font-size: 1.25rem; font-weight: 600;">System Controls</h3>
                    </div>
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button onclick="loadModule('manage-users')" class="btn-modern btn-modern-primary" style="width: auto;">
                            <i class="ph ph-user-list"></i> Manage Staff & Students
                        </button>
                        <button onclick="loadModule('manage-departments')" class="btn-modern" style="background: #f1f5f9; color: var(--text-main); width: auto;">
                            <i class="ph ph-buildings"></i> Departments
                        </button>
                        <button onclick="loadModule('system-reports')" class="btn-modern" style="background: #f1f5f9; color: var(--text-main); width: auto;">
                            <i class="ph ph-file-pdf"></i> Audit Reports
                        </button>
                    </div>
                </div>
            `;
        } else {
            document.getElementById('moduleContent').innerHTML = `
                <div class="card" style="padding: 2.5rem; text-align: center;">
                    <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Failed to load dashboard</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading dashboard'}</p>
                    <button onclick="loadAdminDashboard()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="card" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load dashboard</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching dashboard statistics.'}</p>
                <button onclick="loadAdminDashboard()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}

async function loadManageUsers() {
    try {
        const response = await fetch(`${app.API_BASE}/admin/users`);
        const data = await response.json();

        if (data.success) {
            let html = `
                <div class="mb-8" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 class="login-title" style="font-size: 1.75rem;">User Management</h2>
                        <p style="color: var(--text-muted); font-size: 1rem;">Control institution-wide access.</p>
                    </div>
                    <button onclick="showAddUserForm()" class="btn-modern btn-modern-primary" style="width: auto;">
                        <i class="ph ph-user-plus"></i> Add New User
                    </button>
                </div>
                
                <div class="glass-panel" style="background: white; border: none; display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
                    <div style="flex: 1; min-width: 250px; position: relative;">
                        <i class="ph ph-magnifying-glass" style="position: absolute; left: 0.75rem; top: 0.75rem; color: var(--text-muted);"></i>
                        <input type="text" placeholder="Search users by name or email..." style="width: 100%; padding: 0.625rem 0.625rem 0.625rem 2.5rem; border-radius: 0.5rem; border: 1px solid #e2e8f0;" onkeyup="searchUsers(this.value)">
                    </div>
                    <div>
                        <select id="roleFilter" onchange="filterUsersByRole(this.value)" style="padding: 0.625rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; min-width: 150px; width: 100%;">
                            <option value="">All Roles</option>
                            <option value="student">Students</option>
                            <option value="staff">Staff</option>
                            <option value="hod">HODs</option>
                            <option value="security">Security</option>
                            <option value="admin">Admins</option>
                        </select>
                    </div>
                </div>
                
                <div class="table-wrapper">
                    <div class="table-responsive">
                    <table class="modern-table" id="usersTable">
                        <thead>
                            <tr>
                                <th>Identity</th>
                                <th>Name</th>
                                <th>Role</th>
                                <th>Dept/Year</th>
                                <th>Username/Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            data.users.forEach(user => {
                const roleColors = {
                    'admin': 'rgba(239, 68, 68, 0.1); color: var(--danger);',
                    'hod': 'rgba(79, 70, 229, 0.1); color: var(--primary);',
                    'staff': 'rgba(245, 158, 11, 0.1); color: var(--warning);',
                    'student': 'rgba(16, 185, 129, 0.1); color: var(--success);',
                    'security': 'rgba(100, 116, 139, 0.1); color: var(--text-muted);'
                };

                const deptYear = user.role === 'student' ?
                    `${user.dept_code || 'N/A'}${user.academic_year ? ` (Yr ${user.academic_year})` : ''}` :
                    (user.dept_code || '-');

                const displayName = (user.full_name || user.username || 'User').trim();
                const initial = displayName.charAt(0).toUpperCase();

                html += `
                    <tr data-role="${user.role}">
                        <td>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="width: 36px; height: 36px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 700; color: var(--primary);">
                                    ${initial}
                                </div>
                                <div>
                                    <div style="font-weight: 600;">${displayName}</div>
                                    <div style="font-size: 12px; color: var(--text-muted);">${user.registration_no || ''}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="status-badge" style="background: ${roleColors[user.role] || ''};">${user.role.toUpperCase()}</span>
                        </td>
                        <td>
                            <div style="font-weight: 500;">${deptYear}</div>
                        </td>
                        <td>
                            <div style="font-size: 13px;">@${user.username}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">${user.email}</div>
                        </td>
                        <td>
                            <span class="status-badge ${user.is_active ? 'badge-approved' : 'badge-rejected'}">
                                ${user.is_active ? 'Active' : 'Locked'}
                            </span>
                        </td>
                        <td>
                            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                <button onclick="editUser(${user.user_id})" class="btn-modern" style="padding: 6px; aspect-ratio: 1; border-radius: 6px;" title="Edit Profile"><i class="ph ph-pencil-simple"></i></button>
                                <button onclick="resetUserPassword(${user.user_id})" class="btn-modern" style="padding: 6px; aspect-ratio: 1; border-radius: 6px; background: #f1f5f9; color: var(--text-main);" title="Reset Password"><i class="ph ph-key"></i></button>
                                ${user.is_active ?
                        `<button onclick="deactivateUser(${user.user_id})" class="btn-modern" style="padding: 6px; aspect-ratio: 1; border-radius: 6px; background: #fee2e2; color: var(--danger);" title="Lock Account"><i class="ph ph-lock"></i></button>` :
                        `<button onclick="activateUser(${user.user_id})" class="btn-modern" style="padding: 6px; aspect-ratio: 1; border-radius: 6px; background: #d1fae5; color: var(--success);" title="Unlock Account"><i class="ph ph-lock-open"></i></button>`
                    }
                                <button onclick="hardDeleteUser(${user.user_id})" class="btn-modern" style="padding: 6px; aspect-ratio: 1; border-radius: 6px; background: #fee2e2; color: var(--danger);" title="Permanent Delete"><i class="ph ph-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div></div>`;
            document.getElementById('moduleContent').innerHTML = html;
        } else {
            document.getElementById('moduleContent').innerHTML = `
                <div class="card" style="padding: 2.5rem; text-align: center;">
                    <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Failed to load users</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading users'}</p>
                    <button onclick="loadManageUsers()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="card" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load users</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching users.'}</p>
                <button onclick="loadManageUsers()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}

function filterUsersByRole(role) {
    const rows = document.querySelectorAll('#usersTable tbody tr');
    rows.forEach(row => {
        if (!role || row.getAttribute('data-role') === role) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function showAddUserForm() {
    loadDepartmentsForForm().then(deptOptions => {
        document.getElementById('moduleContent').innerHTML = `
            <div class="card">
                <h2>Add New User</h2>
                <form id="addUserForm">
                    <div class="form-group">
                        <label>Username *</label>
                        <input type="text" name="username" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-group">
                        <label>Password *</label>
                        <input type="password" name="password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Full Name *</label>
                        <input type="text" name="full_name" required>
                    </div>
                    <div class="form-group">
                        <label>Role *</label>
                        <select name="role" required onchange="toggleStudentFields(this.value)">
                            <option value="">Select Role</option>
                            <option value="student">Student</option>
                            <option value="staff">Staff</option>
                            <option value="hod">HOD</option>
                            <option value="security">Security</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Department</label>
                        <select name="dept_id">
                            <option value="">None</option>
                            ${deptOptions}
                        </select>
                    </div>
                    <div class="form-group" id="regNoField" style="display: none;">
                        <label>Registration Number</label>
                        <input type="text" name="registration_no">
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" name="phone">
                    </div>
                    <button type="submit" class="btn btn-primary">Add User</button>
                    <button type="button" onclick="loadModule('manage-users')" class="btn btn-secondary">Cancel</button>
                </form>
            </div>
        `;

        document.getElementById('addUserForm').addEventListener('submit', handleAddUser);
    });
}

function toggleStudentFields(role) {
    document.getElementById('regNoField').style.display = role === 'student' ? 'block' : 'none';
}

async function loadDepartmentsForForm() {
    try {
        const response = await fetch(`${app.API_BASE}/admin/departments`);
        const data = await response.json();

        if (data.success) {
            return data.departments.map(dept =>
                `<option value="${dept.dept_id}">${dept.dept_name} (${dept.dept_code})</option>`
            ).join('');
        }
    } catch (error) {
        return '';
    }
}

async function handleAddUser(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${app.API_BASE}/admin/add-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        alert(result.message);

        if (result.success) {
            loadModule('manage-users');
        }
    } catch (error) {
        alert('Error adding user');
    }
}

async function resetUserPassword(userId) {
    const newPassword = prompt('Enter new password (min 6 characters):');

    if (!newPassword || newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    try {
        const response = await fetch(`${app.API_BASE}/admin/reset-password/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ new_password: newPassword })
        });

        const data = await response.json();
        alert(data.message);
    } catch (error) {
        alert('Error resetting password');
    }
}

async function deactivateUser(userId) {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
        const response = await fetch(`${app.API_BASE}/admin/delete-user/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        alert(data.message);

        if (data.success) {
            loadModule('manage-users');
        }
    } catch (error) {
        alert('Error deactivating user');
    }
}

async function activateUser(userId) {
    if (!confirm('Are you sure you want to activate this user?')) return;

    try {
        const response = await fetch(`${app.API_BASE}/admin/update-user/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: true })
        });

        const data = await response.json();
        alert(data.message);

        if (data.success) {
            loadModule('manage-users');
        }
    } catch (error) {
        alert('Error activating user');
    }
}

async function hardDeleteUser(userId) {
    if (!confirm('PERMANENT DELETE: Are you sure? This will remove all outpass history for this user.')) return;
    if (!confirm('FINAL WARNING: This action cannot be undone. Proceed?')) return;

    try {
        const response = await fetch(`${app.API_BASE}/admin/hard-delete-user/${userId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        alert(data.message);

        if (data.success) {
            loadModule('manage-users');
        }
    } catch (error) {
        alert('Error performing permanent delete');
    }
}


async function editUser(userId) {
    try {
        const [usersRes, deptsRes] = await Promise.all([
            fetch(`${app.API_BASE}/admin/users`),
            fetch(`${app.API_BASE}/admin/departments`)
        ]);

        const usersData = await usersRes.json();
        const deptsData = await deptsRes.json();

        const user = usersData.users.find(u => u.user_id == userId);
        if (!user) return alert('User not found');

        const deptOptions = deptsData.departments.map(d =>
            `<option value="${d.dept_id}" ${d.dept_id == user.dept_id ? 'selected' : ''}>${d.dept_name}</option>`
        ).join('');

        const staffUsers = usersData.users.filter(u => u.role === 'staff' || u.role === 'hod');
        const advisorOptions = staffUsers.map(s =>
            `<option value="${s.user_id}" ${s.user_id == user.advisor_id ? 'selected' : ''}>${s.full_name} (${s.role.toUpperCase()})</option>`
        ).join('');

        document.getElementById('moduleContent').innerHTML = `
            <div class="card">
                <h2>Edit User: ${user.username}</h2>
                <form id="editUserForm">
                    <input type="hidden" name="user_id" value="${user.user_id}">
                    <div class="form-group">
                        <label>Full Name *</label>
                        <input type="text" name="full_name" value="${user.full_name}" required>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" value="${user.email}" required>
                    </div>
                    <div class="form-group">
                        <label>Phone</label>
                        <input type="tel" name="phone" value="${user.phone || ''}">
                    </div>
                    <div class="form-group">
                        <label>Department</label>
                        <select name="dept_id">
                            <option value="">None</option>
                            ${deptOptions}
                        </select>
                    </div>
                    ${user.role === 'student' ? `
                    <div class="form-group">
                        <label>Class Tutor (Advisor)</label>
                        <select name="advisor_id">
                            <option value="">None</option>
                            ${advisorOptions}
                        </select>
                    </div>
                    ` : ''}
                    <div class="form-group">
                        <label>Status</label>
                        <select name="is_active">
                            <option value="1" ${user.is_active ? 'selected' : ''}>Active</option>
                            <option value="0" ${!user.is_active ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">Update User</button>
                    <button type="button" onclick="loadModule('manage-users')" class="btn btn-secondary">Cancel</button>
                </form>
            </div>
        `;

        document.getElementById('editUserForm').addEventListener('submit', handleUpdateUser);
    } catch (error) {
        console.error('Error loading edit form:', error);
        alert('Error loading user data');
    }
}

async function handleUpdateUser(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const userId = data.user_id;
    delete data.user_id;

    // Convert is_active to boolean
    data.is_active = data.is_active === "1";
    // Handle empty dept/advisor
    if (!data.dept_id) data.dept_id = null;
    if (data.advisor_id === "") data.advisor_id = null;

    try {
        const response = await fetch(`${app.API_BASE}/admin/update-user/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        alert(result.message);

        if (result.success) {
            loadModule('manage-users');
        }
    } catch (error) {
        alert('Error updating user');
    }
}

async function loadManageDepartments() {
    try {
        const response = await fetch(`${app.API_BASE}/admin/departments`);
        const data = await response.json();

        if (data.success) {
            let html = `
                <div class="mb-8" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 class="login-title" style="font-size: 1.75rem;">Department Management</h2>
                        <p style="color: var(--text-muted); font-size: 1rem;">Manage academic divisions.</p>
                    </div>
                    <button onclick="showAddDeptForm()" class="btn-modern btn-modern-primary" style="width: auto;">
                        <i class="ph ph-plus-circle"></i> Add Dept
                    </button>
                </div>
                
                <div class="glass-panel" style="background: white; border: none; margin-bottom: 1.5rem;">
                    <div style="position: relative;">
                        <i class="ph ph-magnifying-glass" style="position: absolute; left: 0.75rem; top: 0.75rem; color: var(--text-muted);"></i>
                        <input type="text" placeholder="Search departments..." style="width: 100%; padding: 0.625rem 0.625rem 0.625rem 2.5rem; border-radius: 0.5rem; border: 1px solid #e2e8f0;" onkeyup="searchDepartments(this.value)">
                    </div>
                </div>
                
                <div class="table-wrapper">
                    <div class="table-responsive">
                    <table class="modern-table" id="deptsTable">
                        <thead>
                            <tr>
                                <th>Department Name</th>
                                <th>System Code</th>
                                <th>Student Population</th>
                                <th>Faculty Count</th>
                                <th>Registered On</th>
                                <th style="text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            data.departments.forEach(dept => {
                html += `
                    <tr>
                        <td style="font-weight: 600;">${dept.dept_name}</td>
                        <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${dept.dept_code}</code></td>
                        <td>${dept.student_count || 0} Students</td>
                        <td>${dept.staff_count || 0} Staff</td>
                        <td style="color: var(--text-muted); font-size: 13px;">${app.formatDateTime(dept.created_at)}</td>
                        <td>
                            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                <button onclick="editDepartment(${dept.dept_id})" class="btn-modern" style="padding: 6px 12px; background: rgba(79, 70, 229, 0.05); color: var(--primary);">Edit</button>
                                <button onclick="deleteDepartment(${dept.dept_id})" class="btn-modern" style="padding: 6px 12px; background: #fee2e2; color: var(--danger);">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div></div>`;
            document.getElementById('moduleContent').innerHTML = html;
        } else {
            document.getElementById('moduleContent').innerHTML = `
                <div class="card" style="padding: 2.5rem; text-align: center;">
                    <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Failed to load departments</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading departments'}</p>
                    <button onclick="loadManageDepartments()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading departments:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="card" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load departments</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching departments.'}</p>
                <button onclick="loadManageDepartments()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}

function showAddDeptForm() {
    document.getElementById('moduleContent').innerHTML = `
        <div class="card">
            <h2>Add New Department</h2>
            <form id="addDeptForm">
                <div class="form-group">
                    <label>Department Name *</label>
                    <input type="text" name="dept_name" required>
                </div>
                <div class="form-group">
                    <label>Department Code *</label>
                    <input type="text" name="dept_code" required>
                </div>
                <button type="submit" class="btn btn-primary">Add Department</button>
                <button type="button" onclick="loadModule('manage-departments')" class="btn btn-secondary">Cancel</button>
            </form>
        </div>
    `;

    document.getElementById('addDeptForm').addEventListener('submit', handleAddDept);
}

async function handleAddDept(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch(`${app.API_BASE}/admin/add-department`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        alert(result.message);

        if (result.success) {
            loadModule('manage-departments');
        }
    } catch (error) {
        alert('Error adding department');
    }
}

async function editDepartment(deptId) {
    try {
        const response = await fetch(`${app.API_BASE}/admin/departments`);
        const data = await response.json();

        const dept = data.departments.find(d => d.dept_id == deptId);
        if (!dept) return alert('Department not found');

        document.getElementById('moduleContent').innerHTML = `
            <div class="card">
                <h2>Edit Department</h2>
                <form id="editDeptForm">
                    <input type="hidden" name="dept_id" value="${dept.dept_id}">
                    <div class="form-group">
                        <label>Department Name *</label>
                        <input type="text" name="dept_name" value="${dept.dept_name}" required>
                    </div>
                    <div class="form-group">
                        <label>Department Code *</label>
                        <input type="text" name="dept_code" value="${dept.dept_code}" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Update Department</button>
                    <button type="button" onclick="loadModule('manage-departments')" class="btn btn-secondary">Cancel</button>
                </form>
            </div>
        `;

        document.getElementById('editDeptForm').addEventListener('submit', handleUpdateDept);
    } catch (error) {
        alert('Error loading department data');
    }
}

async function handleUpdateDept(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const deptId = data.dept_id;
    delete data.dept_id;

    try {
        const response = await fetch(`${app.API_BASE}/admin/update-department/${deptId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        alert(result.message);

        if (result.success) {
            loadModule('manage-departments');
        }
    } catch (error) {
        alert('Error updating department');
    }
}

async function loadSystemReports() {
    try {
        const response = await fetch(`${app.API_BASE}/admin/system-report`);
        const data = await response.json();

        if (data.success) {
            const report = data.report || {};
            const period = report.period || {};
            const outpasses = report.outpasses || {};
            const users = report.users || [];
            let html = `
                <div class="mb-8" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h2 class="login-title" style="font-size: 2rem;">System Audit Report</h2>
                        <p style="color: var(--text-muted); font-size: 0.875rem;">Period: ${period.from ? app.formatDate(period.from) : 'Recent'} — ${period.to ? app.formatDate(period.to) : 'Present'}</p>
                    </div>
                    <button onclick="exportReport()" class="btn-modern btn-modern-primary" style="width: auto;">
                        <i class="ph ph-download-simple"></i> Export CSV
                    </button>
                </div>
                
                <div class="stats-grid mb-8" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
                    <div class="glass-panel" style="background: white; border: none;">
                        <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1.25rem;">User Distribution</h3>
                        <div class="table-wrapper">
                            <div class="table-responsive">
                            <table class="modern-table">
                                <thead><tr><th>Role</th><th>Total</th><th>Active</th></tr></thead>
                                <tbody>
            `;

            users.forEach(u => {
                html += `<tr><td style="font-weight: 600; text-transform: capitalize;">${u.role}</td><td>${u.count} Users</td><td><span class="status-badge badge-approved">${u.active_count} Active</span></td></tr>`;
            });

            html += `
                                </tbody>
                            </table>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 1rem;">
                        <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.25rem;">Outpass Summary</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem;">
                            <div class="modern-card" style="padding: 16px;">
                                <div class="stat-value" style="font-size: 24px;">${outpasses.total || 0}</div>
                                <div class="stat-label">Total Applications</div>
                            </div>
                            <div class="modern-card" style="padding: 16px; border-left: 4px solid var(--warning);">
                                <div class="stat-value" style="font-size: 24px; color: var(--warning);">${outpasses.pending || 0}</div>
                                <div class="stat-label">Waiting for Review</div>
                            </div>
                            <div class="modern-card" style="padding: 16px; border-left: 4px solid var(--success);">
                                <div class="stat-value" style="font-size: 24px; color: var(--success);">${outpasses.approved || 0}</div>
                                <div class="stat-label">Approved & Issued</div>
                            </div>
                            <div class="modern-card" style="padding: 16px; border-left: 4px solid var(--danger);">
                                <div class="stat-value" style="font-size: 24px; color: var(--danger);">${outpasses.rejected || 0}</div>
                                <div class="stat-label">Total Rejections</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.getElementById('moduleContent').innerHTML = html;
        } else {
            document.getElementById('moduleContent').innerHTML = `
                <div class="card" style="padding: 2.5rem; text-align: center;">
                    <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Failed to load reports</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${data.message || 'Error loading reports'}</p>
                    <button onclick="loadSystemReports()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                        <i class="ph ph-arrow-clockwise"></i> Try Again
                    </button>
                </div>`;
        }
    } catch (error) {
        console.error('Error loading reports:', error);
        document.getElementById('moduleContent').innerHTML = `
            <div class="card" style="padding: 2.5rem; text-align: center;">
                <i class="ph ph-warning-circle" style="font-size: 3rem; color: var(--danger); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">Failed to load reports</h3>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">${error.message || 'Network error occurred while fetching reports.'}</p>
                <button onclick="loadSystemReports()" class="btn-modern btn-modern-primary" style="margin: 0 auto; width: auto;">
                    <i class="ph ph-arrow-clockwise"></i> Try Again
                </button>
            </div>`;
    }
}

async function exportReport() {
    try {
        const response = await fetch(`${app.API_BASE}/admin/export-report`);
        const data = await response.json();

        if (data.success) {
            if (!data.data || data.data.length === 0) {
                alert('No data found for the selected period');
                return;
            }
            // Convert to CSV
            const csv = convertToCSV(data.data);
            downloadCSV(csv, 'outpass_report.csv');
        } else {
            alert('Error: ' + (data.message || 'Failed to export report'));
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Error exporting report');
    }
}

function convertToCSV(arr) {
    if (!arr || arr.length === 0) return '';

    // Get headers from first object
    const headers = Object.keys(arr[0]).join(',');

    // Map rows - handle potential commas in values by quoting them
    const rows = arr.map(obj => {
        return Object.values(obj).map(val => {
            const strValue = val === null ? '' : String(val);
            // Escape quotes and wrap in quotes if contains comma, newline or quote
            if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        }).join(',');
    });

    return [headers, ...rows].join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}

function searchDepartments(query) {
    const rows = document.querySelectorAll('#deptsTable tbody tr');
    const q = query.toLowerCase();
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
}

async function deleteDepartment(deptId) {
    if (!confirm('Are you sure you want to delete this department? This cannot be undone if no users are assigned.')) return;

    try {
        const response = await fetch(`${app.API_BASE}/admin/delete-department/${deptId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        alert(data.message);

        if (data.success) {
            loadModule('manage-departments');
        }
    } catch (error) {
        alert('Error deleting department');
    }
}

function searchUsers(query) {
    const rows = document.querySelectorAll('#usersTable tbody tr');
    const q = query.toLowerCase();
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
}