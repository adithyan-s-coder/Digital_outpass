"""
Staff/Advisor Routes
Handles advisor operations: view pending requests, approve/reject, view history
"""

from flask import Blueprint, request, jsonify, session
from backend.config import get_db_connection
from backend.utils.helpers import (
    role_required, format_datetime, format_date, format_time,
    log_action, get_client_ip, generate_unique_qr_token, generate_qr_code, get_ist_now
)
from datetime import datetime, timedelta
from backend.services.ai_report import calculate_outpass_stats, generate_ai_summary, get_date_range

staff_bp = Blueprint('staff', __name__, url_prefix='/api/staff')

@staff_bp.route('/pending-requests', methods=['GET'])
@role_required('staff', 'hod')
def get_pending_requests():
    """Get all pending outpass requests for advisor"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Get pending requests assigned to this advisor
        query = """
            SELECT 
                o.*,
                s.full_name as student_name,
                s.registration_no,
                s.academic_year,
                s.email as student_email,
                s.phone as student_phone,
                s.parent_name,
                s.parent_mobile,
                s.profile_image,
                d.dept_name,
                d.dept_code
            FROM outpasses o
            JOIN users s ON o.student_id = s.user_id
            LEFT JOIN departments d ON s.dept_id = d.dept_id
            WHERE o.advisor_id = %s 
            AND o.advisor_status = 'pending'
            ORDER BY o.created_at ASC
        """
        
        cursor.execute(query, (session['user_id'],))
        requests = cursor.fetchall()
        
        # Format datetime fields
        for req in requests:
            req['out_date'] = format_date(req['out_date'])
            req['out_time'] = format_time(req['out_time'])
            req['expected_return_time'] = format_time(req['expected_return_time'])
            req['created_at'] = format_datetime(req['created_at'])
            # Normalize profile image path
            if req.get('profile_image'):
                img = req['profile_image']
                # Ensure we only have the relative path from 'uploads/'
                req['profile_image'] = img.replace('uploads/', '', 1).lstrip('/')
            else:
                req['profile_image'] = None

        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'requests': requests
        }), 200
        
    except Exception as e:
        print(f"Get pending requests error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch pending requests'}), 500

@staff_bp.route('/approve-request/<int:outpass_id>', methods=['POST'])
@role_required('staff')
def approve_request(outpass_id):
    """
    Approve an outpass request (advisor level)
    Request body: {remarks}
    """
    try:
        data = request.get_json()
        remarks = data.get('remarks', 'Approved by advisor')
        parent_called = data.get('parent_called', False)
        
        if not parent_called:
            return jsonify({'success': False, 'message': 'Parent confirmation is required before approval'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Verify this advisor owns this request
        cursor.execute("""
            SELECT * FROM outpasses 
            WHERE outpass_id = %s AND advisor_id = %s
        """, (outpass_id, session['user_id']))
        
        outpass = cursor.fetchone()
        
        if not outpass:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Outpass not found or unauthorized'}), 404
        
        if outpass['advisor_status'] != 'pending':
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Request already processed'}), 400
        
        # Update outpass - advisor approval
        cursor.execute("""
            UPDATE outpasses 
            SET advisor_status = 'approved',
                advisor_remarks = %s,
                advisor_action_time = NOW(),
                hod_status = 'pending'
            WHERE outpass_id = %s
        """, (remarks, outpass_id))
        
        conn.commit()
        
        # Log action
        log_action(conn, outpass_id, session['user_id'], 'advisor_approved', 
                  remarks, get_client_ip())
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Request approved and forwarded to HOD'
        }), 200
        
    except Exception as e:
        print(f"Approve request error: {e}")
        return jsonify({'success': False, 'message': 'Failed to approve request'}), 500

@staff_bp.route('/reject-request/<int:outpass_id>', methods=['POST'])
@role_required('staff')
def reject_request(outpass_id):
    """
    Reject an outpass request (advisor level)
    Request body: {remarks}
    """
    try:
        data = request.get_json()
        remarks = data.get('remarks', 'Rejected by advisor')
        
        if not remarks or remarks.strip() == '':
            return jsonify({'success': False, 'message': 'Remarks required for rejection'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Verify this advisor owns this request
        cursor.execute("""
            SELECT * FROM outpasses 
            WHERE outpass_id = %s AND advisor_id = %s
        """, (outpass_id, session['user_id']))
        
        outpass = cursor.fetchone()
        
        if not outpass:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Outpass not found or unauthorized'}), 404
        
        if outpass['advisor_status'] != 'pending':
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Request already processed'}), 400
        
        # Update outpass - advisor rejection
        cursor.execute("""
            UPDATE outpasses 
            SET advisor_status = 'rejected',
                advisor_remarks = %s,
                advisor_action_time = NOW(),
                final_status = 'rejected'
            WHERE outpass_id = %s
        """, (remarks, outpass_id))
        
        conn.commit()
        
        # Log action
        log_action(conn, outpass_id, session['user_id'], 'advisor_rejected', 
                  remarks, get_client_ip())
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Request rejected'
        }), 200
        
    except Exception as e:
        print(f"Reject request error: {e}")
        return jsonify({'success': False, 'message': 'Failed to reject request'}), 500

@staff_bp.route('/student-history/<int:student_id>', methods=['GET'])
@role_required('staff', 'hod')
def get_student_history(student_id):
    """Get outpass history for a specific student"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Verify student belongs to advisor's advisees or same department
        cursor.execute("""
            SELECT u.*, d.dept_name FROM users u 
            LEFT JOIN departments d ON u.dept_id = d.dept_id
            LEFT JOIN users staff ON staff.user_id = %s
            WHERE u.user_id = %s 
              AND u.role = 'student'
              AND (u.advisor_id = %s OR u.dept_id = staff.dept_id)
        """, (session['user_id'], student_id, session['user_id']))
        
        student = cursor.fetchone()
        
        if not student:
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Student not found or unauthorized'}), 404
        
        # Get outpass history
        cursor.execute("""
            SELECT 
                o.*,
                a.full_name as advisor_name,
                h.full_name as hod_name
            FROM outpasses o
            LEFT JOIN users a ON o.advisor_id = a.user_id
            LEFT JOIN users h ON o.hod_id = h.user_id
            WHERE o.student_id = %s
            ORDER BY o.created_at DESC
        """, (student_id,))
        
        history = cursor.fetchall()
        
        # Format dates
        for item in history:
            item['out_date'] = format_date(item['out_date'])
            item['out_time'] = format_time(item['out_time'])
            item['expected_return_time'] = format_time(item['expected_return_time'])
            item['created_at'] = format_datetime(item['created_at'])
            item['advisor_action_time'] = format_datetime(item['advisor_action_time'])
            item['hod_action_time'] = format_datetime(item['hod_action_time'])
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'student': {
                'user_id': student['user_id'],
                'full_name': student['full_name'],
                'registration_no': student['registration_no'],
                'email': student['email'],
                'academic_year': student.get('academic_year'),
                'dept_name': student.get('dept_name', 'N/A'),
                'profile_image': student['profile_image'].replace('uploads/', '', 1).lstrip('/') if student.get('profile_image') else None
            },
            'history': history
        }), 200
        
    except Exception as e:
        print(f"Get student history error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch student history'}), 500

@staff_bp.route('/my-students', methods=['GET'])
@role_required('staff', 'hod')
def get_my_students():
    """Get list of students assigned to this advisor (or in advisor's department & academic year)"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        uid = session['user_id']

        # Get staff advisor's department and academic year
        cursor.execute("SELECT dept_id, academic_year FROM users WHERE user_id = %s", (uid,))
        staff_info = cursor.fetchone() or {}
        dept_id = staff_info.get('dept_id')
        academic_year = staff_info.get('academic_year')

        # Auto-assign unassigned students in the same department & academic year to this staff advisor
        if dept_id:
            try:
                if academic_year:
                    cursor.execute("""
                        UPDATE users
                        SET advisor_id = %s
                        WHERE role = 'student' AND advisor_id IS NULL
                          AND dept_id = %s AND academic_year = %s
                    """, (uid, dept_id, academic_year))
                else:
                    cursor.execute("""
                        UPDATE users
                        SET advisor_id = %s
                        WHERE role = 'student' AND advisor_id IS NULL
                          AND dept_id = %s
                    """, (uid, dept_id))
                if cursor.rowcount > 0:
                    conn.commit()
            except Exception:
                pass

        # Use scalar subqueries for outpass counts to avoid ONLY_FULL_GROUP_BY errors on MySQL 8 / TiDB
        cursor.execute("""
            SELECT 
                u.user_id,
                u.full_name,
                u.registration_no,
                u.email,
                u.phone,
                u.academic_year,
                u.parent_mobile,
                u.profile_image,
                d.dept_name,
                (SELECT COUNT(*) FROM outpasses o WHERE o.student_id = u.user_id) as total_outpasses,
                (SELECT COUNT(*) FROM outpasses o WHERE o.student_id = u.user_id AND o.final_status = 'pending') as pending_count
            FROM users u
            LEFT JOIN departments d ON u.dept_id = d.dept_id
            WHERE u.role = 'student'
              AND u.is_active = TRUE
              AND (
                  u.advisor_id = %s
                  OR (%s IS NOT NULL AND u.dept_id = %s AND (%s IS NULL OR u.academic_year = %s))
              )
            ORDER BY u.full_name
        """, (uid, dept_id, dept_id, academic_year, academic_year))
        
        students = cursor.fetchall()
        for s in students:
            s['total_outpasses'] = int(s.get('total_outpasses') or 0)
            s['pending_count'] = int(s.get('pending_count') or 0)
            if s.get('profile_image'):
                s['profile_image'] = s['profile_image'].replace('uploads/', '', 1).lstrip('/')
        
        return jsonify({
            'success': True,
            'students': students
        }), 200
        
    except Exception as e:
        print(f"Get students error: {e}")
        return jsonify({'success': False, 'message': f'Failed to fetch students: {str(e)}'}), 500
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

@staff_bp.route('/dashboard-stats', methods=['GET'])
@role_required('staff')
def get_staff_stats():
    """Get dashboard statistics for staff"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        uid = session['user_id']

        cursor.execute("SELECT dept_id, academic_year FROM users WHERE user_id = %s", (uid,))
        staff_info = cursor.fetchone() or {}
        dept_id = staff_info.get('dept_id')
        academic_year = staff_info.get('academic_year')
        
        cursor.execute("""
            SELECT
                (SELECT COUNT(*) FROM outpasses WHERE advisor_id = %s AND advisor_status = 'pending') as pending_count,
                (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_active = TRUE
                 AND (advisor_id = %s OR (%s IS NOT NULL AND dept_id = %s AND (%s IS NULL OR academic_year = %s)))) as student_count,
                (SELECT COUNT(*) FROM outpasses WHERE advisor_id = %s AND advisor_status != 'pending'
                 AND MONTH(advisor_action_time) = MONTH(CURRENT_DATE())
                 AND YEAR(advisor_action_time) = YEAR(CURRENT_DATE())) as processed_count
        """, (uid, uid, dept_id, dept_id, academic_year, academic_year, uid))
        
        row = cursor.fetchone() or {}
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'stats': {
                'pending_requests': int(row.get('pending_count') or 0),
                'total_students': int(row.get('student_count') or 0),
                'processed_this_month': int(row.get('processed_count') or 0)
            }
        }), 200
        
    except Exception as e:
        print(f"Get stats error: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch statistics'}), 500

@staff_bp.route('/ai-report', methods=['POST'])
@role_required('staff', 'hod')
def get_ai_report():
    """Generate AI-powered statistical outpass report for advisor's students"""
    try:
        data = request.get_json(silent=True) or {}
        period = data.get('period', 'today')
        custom_start = data.get('start_date')
        custom_end = data.get('end_date')

        start_date, end_date, period_label = get_date_range(period, custom_start, custom_end)

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = conn.cursor(dictionary=True)

        # Get staff member's info
        cursor.execute("SELECT full_name FROM users WHERE user_id = %s", (session['user_id'],))
        staff_user = cursor.fetchone()
        staff_name = staff_user['full_name'] if staff_user else 'Advisor'

        # Fetch outpass records for this advisor's students within the selected date range
        query = """
            SELECT 
                o.*,
                s.full_name as student_name,
                s.registration_no,
                s.academic_year,
                d.dept_name
            FROM outpasses o
            JOIN users s ON o.student_id = s.user_id
            LEFT JOIN departments d ON s.dept_id = d.dept_id
            WHERE o.advisor_id = %s
              AND o.out_date BETWEEN %s AND %s
            ORDER BY o.out_date DESC, o.out_time DESC
        """
        cursor.execute(query, (session['user_id'], start_date, end_date))
        records = cursor.fetchall()

        cursor.close()
        conn.close()

        # Calculate real statistical metrics
        stats = calculate_outpass_stats(records)

        # Generate AI summary and key insights with deterministic fallback
        scope_label = f"Advisor: {staff_name}"
        ai_result = generate_ai_summary(stats, period_label, scope_label)

        return jsonify({
            'success': True,
            'period': period,
            'period_label': period_label,
            'start_date': start_date,
            'end_date': end_date,
            'scope': scope_label,
            'generated_at': get_ist_now().strftime('%d %b %Y, %I:%M %p'),
            'stats': stats,
            'report': ai_result
        }), 200

    except Exception as e:
        print(f"Generate staff AI report error: {e}")
        return jsonify({'success': False, 'message': 'Failed to generate AI report'}), 500