"""
Admin Routes
Handles admin operations: user management, reports, system monitoring
"""

from flask import Blueprint, request, jsonify, session
from backend.config import get_db_connection
from backend.utils.helpers import (
    role_required, hash_password, format_datetime, format_date, get_ist_now
)
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/users', methods=['GET'])
@role_required('admin')
def get_all_users():
    """Get all users with optional role filter"""
    conn = None
    cursor = None
    try:
        role_filter = request.args.get('role')
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT 
                u.user_id,
                u.username,
                u.email,
                u.full_name,
                u.role,
                u.registration_no,
                u.academic_year,
                u.phone,
                u.is_active,
                u.created_at,
                d.dept_name,
                d.dept_code,
                a.full_name as advisor_name
            FROM users u
            LEFT JOIN departments d ON u.dept_id = d.dept_id
            LEFT JOIN users a ON u.advisor_id = a.user_id
        """
        
        params = []
        if role_filter:
            query += " WHERE u.role = %s"
            params.append(role_filter)
        
        query += " ORDER BY u.created_at DESC"
        
        cursor.execute(query, params)
        users = cursor.fetchall()
        
        # Format dates and safeguard fields
        for user in users:
            user['created_at'] = format_datetime(user['created_at'])
            if not user.get('full_name'):
                user['full_name'] = user.get('username') or 'User'
        
        return jsonify({
            'success': True,
            'users': users
        }), 200
        
    except Exception as e:
        print(f"Get users error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch users'}), 500
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn and conn.is_connected():
            try:
                conn.close()
            except Exception:
                pass

@admin_bp.route('/add-user', methods=['POST'])
@role_required('admin')
def add_user():
    """
    Add new user
    Request body: {username, email, password, full_name, role, dept_id, registration_no, phone, advisor_id}
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['username', 'email', 'password', 'full_name', 'role']
        for field in required:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required'}), 400
        
        # Hash password
        password_hash = hash_password(data['password'])
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        try:
            query = """
                INSERT INTO users 
                (username, email, password_hash, full_name, role, dept_id, 
                 registration_no, academic_year, phone, advisor_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            cursor.execute(query, (
                data['username'],
                data['email'],
                password_hash,
                data['full_name'],
                data['role'],
                data.get('dept_id'),
                data.get('registration_no'),
                data.get('academic_year'),
                data.get('phone'),
                data.get('advisor_id')
            ))
            
            user_id = cursor.lastrowid
            conn.commit()
            
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'User added successfully',
                'user_id': user_id
            }), 201
            
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            
            if 'Duplicate entry' in str(e):
                return jsonify({'success': False, 'message': 'Username or email already exists'}), 400
            raise e
            
    except Exception as e:
        print(f"Add user error: {e}")
        return jsonify({'success': False, 'message': 'Failed to add user'}), 500

@admin_bp.route('/update-user/<int:user_id>', methods=['PUT'])
@role_required('admin')
def update_user(user_id):
    """
    Update user details
    Request body: {full_name, email, phone, dept_id, advisor_id, is_active}
    """
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Build update query dynamically
        updates = []
        params = []
        
        if 'full_name' in data:
            updates.append("full_name = %s")
            params.append(data['full_name'])
        if 'email' in data:
            updates.append("email = %s")
            params.append(data['email'])
        if 'phone' in data:
            updates.append("phone = %s")
            params.append(data['phone'])
        if 'dept_id' in data:
            updates.append("dept_id = %s")
            params.append(data['dept_id'])
        if 'advisor_id' in data:
            updates.append("advisor_id = %s")
            params.append(data['advisor_id'])
        if 'academic_year' in data:
            updates.append("academic_year = %s")
            params.append(data['academic_year'])
        if 'is_active' in data:
            updates.append("is_active = %s")
            params.append(data['is_active'])
        
        if not updates:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'No fields to update'}), 400
        
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE user_id = %s"
        
        cursor.execute(query, params)
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'User updated successfully'
        }), 200
        
    except Exception as e:
        print(f"Update user error: {e}")
        return jsonify({'success': False, 'message': 'Failed to update user'}), 500

@admin_bp.route('/delete-user/<int:user_id>', methods=['DELETE'])
@role_required('admin')
def delete_user(user_id):
    """Deactivate a user (soft delete)"""
    try:
        if user_id == session['user_id']:
            return jsonify({'success': False, 'message': 'Cannot delete your own account'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute("UPDATE users SET is_active = FALSE WHERE user_id = %s", (user_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'User deactivated successfully'
        }), 200
        
    except Exception as e:
        print(f"Delete user error: {e}")
        return jsonify({'success': False, 'message': 'Failed to delete user'}), 500

@admin_bp.route('/hard-delete-user/<int:user_id>', methods=['DELETE'])
@role_required('admin')
def hard_delete_user(user_id):
    """Permanently delete a user and all associated records"""
    try:
        if user_id == session['user_id']:
            return jsonify({'success': False, 'message': 'Cannot delete your own account'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # 1. Delete logs where this user performed an action
        cursor.execute("DELETE FROM outpass_logs WHERE action_by = %s", (user_id,))
        
        # 2. Delete logs for any outpasses associated with this user
        outpass_ids_query = """
            SELECT outpass_id FROM outpasses 
            WHERE student_id = %s OR advisor_id = %s OR hod_id = %s 
            OR exit_security_id = %s OR entry_security_id = %s
        """
        user_params = (user_id, user_id, user_id, user_id, user_id)
        cursor.execute(outpass_ids_query, user_params)
        outpass_ids = [row[0] for row in cursor.fetchall()]
        
        if outpass_ids:
            placeholders = ','.join(['%s'] * len(outpass_ids))
            cursor.execute(f"DELETE FROM outpass_logs WHERE outpass_id IN ({placeholders})", outpass_ids)
            
            # 3. Delete the outpasses themselves
            cursor.execute(f"DELETE FROM outpasses WHERE outpass_id IN ({placeholders})", outpass_ids)
        
        # 4. Remove this user as advisor from other users
        cursor.execute("UPDATE users SET advisor_id = NULL WHERE advisor_id = %s", (user_id,))
        
        # 5. Finally, delete the user
        cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'User permanently deleted'
        }), 200
        
    except Exception as e:
        print(f"Hard delete user error: {e}")
        return jsonify({'success': False, 'message': 'Failed to permanently delete user'}), 500

@admin_bp.route('/reset-password/<int:user_id>', methods=['POST'])
@role_required('admin')
def reset_user_password(user_id):
    """
    Reset user password
    Request body: {new_password}
    """
    try:
        data = request.get_json()
        new_password = data.get('new_password')
        
        if not new_password or len(new_password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        
        password_hash = hash_password(new_password)
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute("UPDATE users SET password_hash = %s WHERE user_id = %s", 
                      (password_hash, user_id))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        }), 200
        
    except Exception as e:
        print(f"Reset password error: {e}")
        return jsonify({'success': False, 'message': 'Failed to reset password'}), 500

@admin_bp.route('/departments', methods=['GET'])
def get_departments():
    """Get all departments"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                d.*,
                COUNT(DISTINCT u.user_id) as student_count,
                COUNT(DISTINCT s.user_id) as staff_count
            FROM departments d
            LEFT JOIN users u ON d.dept_id = u.dept_id AND u.role = 'student' AND u.is_active = TRUE
            LEFT JOIN users s ON d.dept_id = s.dept_id AND s.role = 'staff' AND s.is_active = TRUE
            GROUP BY d.dept_id
        """)
        
        departments = cursor.fetchall()
        
        for dept in departments:
            dept['created_at'] = format_datetime(dept['created_at'])
        
        return jsonify({
            'success': True,
            'departments': departments
        }), 200
        
    except Exception as e:
        print(f"Get departments error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch departments'}), 500
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn and conn.is_connected():
            try:
                conn.close()
            except Exception:
                pass

@admin_bp.route('/add-department', methods=['POST'])
@role_required('admin')
def add_department():
    """
    Add new department
    Request body: {dept_name, dept_code}
    """
    try:
        data = request.get_json()
        
        if not data.get('dept_name') or not data.get('dept_code'):
            return jsonify({'success': False, 'message': 'Department name and code required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO departments (dept_name, dept_code)
                VALUES (%s, %s)
            """, (data['dept_name'], data['dept_code']))
            
            dept_id = cursor.lastrowid
            conn.commit()
            
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Department added successfully',
                'dept_id': dept_id
            }), 201
            
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            
            if 'Duplicate entry' in str(e):
                return jsonify({'success': False, 'message': 'Department code already exists'}), 400
            raise e
            
    except Exception as e:
        print(f"Add department error: {e}")
        return jsonify({'success': False, 'message': 'Failed to add department'}), 500

@admin_bp.route('/update-department/<int:dept_id>', methods=['PUT'])
@role_required('admin')
def update_department(dept_id):
    """
    Update department details
    Request body: {dept_name, dept_code}
    """
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if 'dept_name' in data:
            updates.append("dept_name = %s")
            params.append(data['dept_name'])
        if 'dept_code' in data:
            updates.append("dept_code = %s")
            params.append(data['dept_code'])
            
        if not updates:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'No fields to update'}), 400
            
        params.append(dept_id)
        query = f"UPDATE departments SET {', '.join(updates)} WHERE dept_id = %s"
        
        try:
            cursor.execute(query, params)
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Department updated successfully'
            }), 200
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            if 'Duplicate entry' in str(e):
                return jsonify({'success': False, 'message': 'Department code already exists'}), 400
            raise e
            
    except Exception as e:
        print(f"Update department error: {e}")
        return jsonify({'success': False, 'message': 'Failed to update department'}), 500

@admin_bp.route('/delete-department/<int:dept_id>', methods=['DELETE'])
@role_required('admin')
def delete_department(dept_id):
    """Delete a department"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Check if department has users
        cursor.execute("SELECT COUNT(*) FROM users WHERE dept_id = %s", (dept_id,))
        count = cursor.fetchone()[0]
        
        if count > 0:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Cannot delete department with assigned users'}), 400
        
        cursor.execute("DELETE FROM departments WHERE dept_id = %s", (dept_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Department deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"Delete department error: {e}")
        return jsonify({'success': False, 'message': 'Failed to delete department'}), 500

@admin_bp.route('/assign-advisor', methods=['POST'])
@role_required('admin')
def assign_advisor():
    """
    Assign advisor to student(s)
    Request body: {student_ids: [id1, id2, ...], advisor_id}
    """
    try:
        data = request.get_json()
        student_ids = data.get('student_ids', [])
        advisor_id = data.get('advisor_id')
        
        if not student_ids or not advisor_id:
            return jsonify({'success': False, 'message': 'Student IDs and advisor ID required'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        # Verify advisor exists and is staff
        cursor.execute("SELECT role FROM users WHERE user_id = %s", (advisor_id,))
        advisor = cursor.fetchone()
        
        if not advisor or advisor[0] not in ['staff', 'hod']:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Invalid advisor'}), 400
        
        # Update students
        placeholders = ','.join(['%s'] * len(student_ids))
        query = f"UPDATE users SET advisor_id = %s WHERE user_id IN ({placeholders}) AND role = 'student'"
        cursor.execute(query, [advisor_id] + student_ids)
        
        conn.commit()
        affected = cursor.rowcount
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'Advisor assigned to {affected} student(s)'
        }), 200
        
    except Exception as e:
        print(f"Assign advisor error: {e}")
        return jsonify({'success': False, 'message': 'Failed to assign advisor'}), 500

@admin_bp.route('/system-report', methods=['GET'])
@role_required('admin')
def get_system_report():
    """Get comprehensive system statistics and report"""
    conn = None
    cursor = None
    try:
        from_date = request.args.get('from_date', (get_ist_now() - timedelta(days=30)).strftime('%Y-%m-%d'))
        to_date = request.args.get('to_date', get_ist_now().strftime('%Y-%m-%d'))
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # User statistics
        cursor.execute("""
            SELECT 
                role,
                COUNT(*) as count,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_count
            FROM users
            GROUP BY role
        """)
        user_stats = cursor.fetchall()
        
        # Outpass statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN final_status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN final_status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN final_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                SUM(CASE WHEN final_status = 'used' THEN 1 ELSE 0 END) as used
            FROM outpasses
            WHERE created_at BETWEEN %s AND %s
        """, (from_date, to_date))
        outpass_stats = cursor.fetchone()
        if not outpass_stats:
            outpass_stats = {'total': 0, 'pending': 0, 'approved': 0, 'rejected': 0, 'used': 0}
        else:
            for k in ['total', 'pending', 'approved', 'rejected', 'used']:
                if outpass_stats.get(k) is None:
                    outpass_stats[k] = 0
        
        # Department-wise statistics
        cursor.execute("""
            SELECT 
                d.dept_name,
                COUNT(o.outpass_id) as total_outpasses,
                SUM(CASE WHEN o.final_status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN o.final_status = 'rejected' THEN 1 ELSE 0 END) as rejected
            FROM departments d
            LEFT JOIN users s ON d.dept_id = s.dept_id
            LEFT JOIN outpasses o ON s.user_id = o.student_id
            WHERE o.created_at BETWEEN %s AND %s OR o.created_at IS NULL
            GROUP BY d.dept_id
        """, (from_date, to_date))
        dept_stats = cursor.fetchall()
        
        # Top reasons
        cursor.execute("""
            SELECT reason, COUNT(*) as count
            FROM outpasses
            WHERE created_at BETWEEN %s AND %s
            GROUP BY reason
            ORDER BY count DESC
            LIMIT 10
        """, (from_date, to_date))
        top_reasons = cursor.fetchall()
        
        # Misuse attempts (expired QR, reused QR, etc.)
        cursor.execute("""
            SELECT COUNT(*) as misuse_count
            FROM outpass_logs
            WHERE action_type IN ('expired', 'reused')
            AND created_at BETWEEN %s AND %s
        """, (from_date, to_date))
        misuse = cursor.fetchone()
        misuse_count = misuse['misuse_count'] if (misuse and misuse.get('misuse_count') is not None) else 0
        
        return jsonify({
            'success': True,
            'report': {
                'period': {'from': from_date, 'to': to_date},
                'users': user_stats,
                'outpasses': outpass_stats,
                'departments': dept_stats,
                'top_reasons': top_reasons,
                'misuse_attempts': misuse_count
            }
        }), 200
        
    except Exception as e:
        print(f"Get system report error: {e}")
        return jsonify({'success': False, 'message': 'Failed to generate report'}), 500
    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass
        if conn and conn.is_connected():
            try:
                conn.close()
            except Exception:
                pass

@admin_bp.route('/export-report', methods=['GET'])
@role_required('admin')
def export_report():
    """Export system report as CSV"""
    try:
        from_date = request.args.get('from_date', (get_ist_now() - timedelta(days=30)).strftime('%Y-%m-%d'))
        to_date = request.args.get('to_date', get_ist_now().strftime('%Y-%m-%d'))
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("""
            SELECT 
                o.outpass_id,
                s.registration_no,
                s.full_name as student_name,
                d.dept_name,
                o.out_date,
                o.out_time,
                o.expected_return_time,
                o.reason,
                o.destination,
                o.advisor_status,
                o.hod_status,
                o.final_status,
                o.created_at,
                o.actual_exit_time,
                o.actual_entry_time
            FROM outpasses o
            JOIN users s ON o.student_id = s.user_id
            LEFT JOIN departments d ON s.dept_id = d.dept_id
            WHERE o.created_at BETWEEN %s AND %s
            ORDER BY o.created_at DESC
        """, (from_date, to_date))
        
        outpasses = cursor.fetchall()
        
        # Format dates
        for op in outpasses:
            op['out_date'] = format_date(op['out_date'])
            op['created_at'] = format_datetime(op['created_at'])
            op['actual_exit_time'] = format_datetime(op['actual_exit_time'])
            op['actual_entry_time'] = format_datetime(op['actual_entry_time'])
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'data': outpasses
        }), 200
        
    except Exception as e:
        print(f"Export report error: {e}")
        return jsonify({'success': False, 'message': 'Failed to export report'}), 500