"""
Authentication Routes
Handles login, logout, session management, and user registration
"""

from flask import Blueprint, request, jsonify, session
from backend.config import get_db_connection
from backend.utils.helpers import hash_password, verify_password, get_client_ip
from werkzeug.utils import secure_filename
import os

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    User login endpoint
    Request body: {username, password}
    Response: {success, user_data, message}
    """
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'}), 400
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Find user by username or email (join department and advisor in a single query)
        query = """
            SELECT u.*, d.dept_name, d.dept_code, adv.full_name AS advisor_name
            FROM users u
            LEFT JOIN departments d ON u.dept_id = d.dept_id
            LEFT JOIN users adv ON u.advisor_id = adv.user_id
            WHERE (u.username = %s OR u.email = %s) AND u.is_active = TRUE
        """
        cursor.execute(query, (username, username))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()

        if not user:
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        # Verify password
        if not verify_password(password, user['password_hash']):
            return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
        
        # Clean profile image path
        profile_img = user.get('profile_image')
        if profile_img:
            profile_img = profile_img.replace('uploads/', '', 1).lstrip('/')

        # Prepare response data (exclude password hash)
        user_data = {
            'user_id': user['user_id'],
            'username': user['username'],
            'email': user['email'],
            'full_name': user['full_name'],
            'role': user['role'],
            'dept_name': user.get('dept_name'),
            'dept_code': user.get('dept_code'),
            'registration_no': user.get('registration_no'),
            'academic_year': user.get('academic_year'),
            'phone': user.get('phone'),
            'parent_name': user.get('parent_name'),
            'parent_mobile': user.get('parent_mobile'),
            'profile_image': profile_img,
            'advisor_name': user.get('advisor_name')
        }

        # Create session
        import time
        session.permanent = False
        session['user_id'] = user['user_id']
        session['username'] = user['username']
        session['role'] = user['role']
        session['full_name'] = user['full_name']
        session['dept_id'] = user['dept_id']
        session['email'] = user['email']
        session['profile_image'] = profile_img
        session['user_data'] = user_data
        session['last_verified'] = time.time()
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user_data
        }), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'success': False, 'message': 'Server error during login'}), 500

@auth_bp.route('/session', methods=['GET'])
def check_session():
    """Check if user session is active and return user data"""
    try:
        if 'user_id' not in session:
            return jsonify({'logged_in': False}), 200

        import time
        now = time.time()
        # Fast-path: return cached session user_data if verified within last 120 seconds (0 DB queries)
        if session.get('user_data') and (now - session.get('last_verified', 0)) < 120:
            return jsonify({
                'logged_in': True,
                'user': session['user_data']
            }), 200
        
        conn = get_db_connection()
        if not conn:
            # If DB temporarily unreachable but session has user_data, keep session alive smoothly
            if session.get('user_data'):
                return jsonify({'logged_in': True, 'user': session['user_data']}), 200
            return jsonify({'logged_in': False, 'error': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Fetch latest user data + advisor in a single query
        query = """
            SELECT u.*, d.dept_name, d.dept_code, adv.full_name AS advisor_name
            FROM users u
            LEFT JOIN departments d ON u.dept_id = d.dept_id
            LEFT JOIN users adv ON u.advisor_id = adv.user_id
            WHERE u.user_id = %s AND u.is_active = TRUE
        """
        cursor.execute(query, (session['user_id'],))
        user = cursor.fetchone()
        
        cursor.close()
        conn.close()

        if not user:
            session.clear() # Clear invalid session
            return jsonify({'logged_in': False}), 200
        
        profile_img = user.get('profile_image')
        if profile_img:
            profile_img = profile_img.replace('uploads/', '', 1).lstrip('/')

        user_data = {
            'user_id': user['user_id'],
            'username': user['username'],
            'email': user['email'],
            'full_name': user['full_name'],
            'role': user['role'],
            'dept_name': user.get('dept_name'),
            'dept_code': user.get('dept_code'),
            'registration_no': user.get('registration_no'),
            'academic_year': user.get('academic_year'),
            'phone': user.get('phone'),
            'parent_name': user.get('parent_name'),
            'parent_mobile': user.get('parent_mobile'),
            'profile_image': profile_img,
            'advisor_name': user.get('advisor_name')
        }

        session['dept_id'] = user['dept_id']
        session['user_data'] = user_data
        session['last_verified'] = now
        
        return jsonify({
            'logged_in': True,
            'user': user_data
        }), 200
        
    except Exception as e:
        print(f"Session check error: {e}")
        return jsonify({'logged_in': False, 'error': 'Server error'}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """User logout endpoint"""
    try:
        session.clear()
        return jsonify({'success': True, 'message': 'Logged out successfully'}), 200
    except Exception as e:
        print(f"Logout error: {e}")
        return jsonify({'success': False, 'message': 'Error during logout'}), 500

def analyze_id_card(image_file):
    """
    Analyzes the uploaded image to ensure it's a valid, readable photo.
    Heuristic-based check to replace manual confirmation.
    """
    try:
        from PIL import Image
        import io
        
        # Read the file into memory to avoid closing the stream
        img_data = image_file.read()
        image_file.seek(0) # Reset pointer for later saving
        
        img = Image.open(io.BytesIO(img_data))
        img.verify() # Basic format verification
        
        # Detailed check
        img = Image.open(io.BytesIO(img_data))
        width, height = img.size
        
        # Requirement: At least 300x200 for legibility
        if width < 300 or height < 200:
            return False, "Image resolution too low for validation. Please upload a clearer ID card photo."
            
        return True, None
    except Exception as e:
        return False, f"Automated verification failed: Invalid image format ({str(e)})"

@auth_bp.route('/departments', methods=['GET'])
def get_departments():
    """Fetch all departments for the registration dropdown"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT dept_id, dept_name, dept_code FROM departments ORDER BY dept_name")
        departments = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'success': True, 
            'departments': departments
        }), 200
    except Exception as e:
        print(f"Error fetching departments: {e}")
        return jsonify({'success': False, 'message': 'Failed to load departments'}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Student self-registration endpoint
    Handles multipart/form-data for profile photo upload
    """
    from backend.config import allowed_image_file  # Import here to avoid circular dependency
    try:
        # Get data from multipart/form-data
        data = request.form.to_dict()
        profile_file = request.files.get('profile_image')
        role = data.get('role', 'student')

        # Strict ID Card validation for students
        if role == 'student':
            if not profile_file or profile_file.filename == '':
                return jsonify({'success': False, 'message': 'Institutional ID Card photo is mandatory for students'}), 400
            
            if not allowed_image_file(profile_file.filename):
                return jsonify({'success': False, 'message': 'Only image files (JPG, PNG) are allowed for Student ID Cards'}), 400
            
            # Automated Analysis
            is_valid_id, error_msg = analyze_id_card(profile_file)
            if not is_valid_id:
                return jsonify({'success': False, 'message': error_msg}), 400
        
        # Validate required fields based on role
        required_fields = ['username', 'password', 'full_name', 'phone']
        
        # Email and Dept are required for all but Security/Admin
        if role != 'security' and role != 'admin':
            required_fields.extend(['email', 'dept_id'])
            
        # Admin still needs email
        if role == 'admin':
            required_fields.append('email')
            
        if role == 'student':
            required_fields.extend(['registration_no', 'parent_name', 'parent_mobile', 'academic_year'])
            
        if role == 'staff':
            required_fields.append('academic_year')
            
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field} is required for {role}'}), 400

        # Phone validation (restore variable for DB)
        phone = data.get('phone', '').strip()
        if not phone.isdigit() or len(phone) != 10:
            return jsonify({'success': False, 'message': 'Student phone number must be exactly 10 digits'}), 400

        # Parent Mobile validation (if student)
        parent_mobile = data.get('parent_mobile', '').strip() or None
        if role == 'student' and parent_mobile:
            if not parent_mobile.isdigit() or len(parent_mobile) != 10:
                return jsonify({'success': False, 'message': 'Parent mobile number must be exactly 10 digits'}), 400

        # Handle Security-specific defaults (Email is NOT NULL in DB)
        email = data.get('email', '').strip()
        if role == 'security' and not email:
            email = f"security_{data['username']}@vetias.ac.in"
            
        # Validate email format (except for our generated placeholder if needed)
        if '@' not in email or '.' not in email:
            return jsonify({'success': False, 'message': 'Invalid email format'}), 400
            
        # Format Full Name (Title Case)
        full_name = data.get('full_name', '').strip().title()
        
        # Hash password
        password_hash = hash_password(data['password'])
        
        # Handle profile image upload (compress, resize & persist to MySQL + disk cache)
        profile_image_path = None
        if profile_file and profile_file.filename:
            from backend.config import app, allowed_file, save_uploaded_file
            if allowed_file(profile_file.filename):
                identifier = data.get('registration_no') or data['username']
                base_name = os.path.splitext(secure_filename(profile_file.filename))[0]
                filename = secure_filename(f"{role}_{identifier}_{base_name}.jpg")
                profile_image_path = f"profiles/{filename}"
                try:
                    from PIL import Image
                    import io
                    profile_file.seek(0)
                    img = Image.open(profile_file)
                    if img.mode in ('RGBA', 'P'):
                        img = img.convert('RGB')
                    img.thumbnail((800, 800), Image.Resampling.LANCZOS)
                    buf = io.BytesIO()
                    img.save(buf, format='JPEG', quality=82, optimize=True)
                    img_bytes = buf.getvalue()
                except Exception:
                    profile_file.seek(0)
                    img_bytes = profile_file.read()
                save_uploaded_file(profile_image_path, img_bytes, 'image/jpeg')
        
        # Get database connection
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor()
        
        try:
            # Insert new user
            query = """
                INSERT INTO users (username, email, password_hash, full_name, role, 
                                 registration_no, phone, dept_id, academic_year, parent_name, parent_mobile, profile_image)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            # Sanitize optional fields: convert empty strings to None (stored as NULL in DB)
            reg_no = data.get('registration_no', '').strip() or None
            p_name = data.get('parent_name', '').strip() or None

            cursor.execute(query, (
                data['username'],
                email,
                password_hash,
                full_name,
                role,
                reg_no,
                phone,
                data.get('dept_id') or None,
                data.get('academic_year') or None,
                p_name,
                parent_mobile,
                profile_image_path
            ))
            
            conn.commit()
            user_id = cursor.lastrowid
            
            cursor.close()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Registration successful! Please login.',
                'user_id': user_id
            }), 201
            
        except Exception as e:
            conn.rollback()
            cursor.close()
            conn.close()
            
            # Check for duplicate entry
            if 'Duplicate entry' in str(e):
                return jsonify({'success': False, 'message': 'Username, email, or registration number already exists'}), 400
            
            raise e
            
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({'success': False, 'message': f'Registration failed: {str(e)}'}), 500


@auth_bp.route('/profile-image', methods=['POST'])
def update_profile_image():
    """
    Upload or update profile photo for the currently logged-in user (all roles).
    Persists image in MySQL uploaded_files table so it is visible across all devices & cloud restarts.
    """
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Not logged in'}), 401

        profile_file = request.files.get('profile_image')
        if not profile_file or not profile_file.filename:
            return jsonify({'success': False, 'message': 'Please select an image file'}), 400

        from backend.config import allowed_image_file, save_uploaded_file
        if not allowed_image_file(profile_file.filename):
            return jsonify({'success': False, 'message': 'Only JPG and PNG images are allowed'}), 400

        import time, io
        from PIL import Image

        user_id = session['user_id']
        role = session.get('role', 'user')
        username = session.get('username', str(user_id))
        ts = int(time.time())
        filename = secure_filename(f"{role}_{username}_{ts}.jpg")
        profile_image_path = f"profiles/{filename}"

        try:
            profile_file.seek(0)
            img = Image.open(profile_file)
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            img.thumbnail((800, 800), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=82, optimize=True)
            img_bytes = buf.getvalue()
        except Exception:
            profile_file.seek(0)
            img_bytes = profile_file.read()

        save_uploaded_file(profile_image_path, img_bytes, 'image/jpeg')

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET profile_image = %s WHERE user_id = %s",
            (profile_image_path, user_id)
        )
        conn.commit()
        cursor.close()
        conn.close()

        session['profile_image'] = profile_image_path
        if session.get('user_data'):
            user_data = dict(session['user_data'])
            user_data['profile_image'] = profile_image_path
            session['user_data'] = user_data

        return jsonify({
            'success': True,
            'message': 'Profile photo updated across all devices!',
            'profile_image': profile_image_path
        }), 200
    except Exception as e:
        print(f"Profile photo update error: {e}")
        return jsonify({'success': False, 'message': 'Failed to update profile photo'}), 500

@auth_bp.route('/change-password', methods=['POST'])
def change_password():
    """
    Change user password
    Request body: {current_password, new_password}
    """
    try:
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
        
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'success': False, 'message': 'Both passwords required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'success': False, 'message': 'New password must be at least 6 characters'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500
        
        cursor = conn.cursor(dictionary=True)
        
        # Verify current password
        cursor.execute("SELECT password_hash FROM users WHERE user_id = %s", (session['user_id'],))
        user = cursor.fetchone()
        
        if not user or not verify_password(current_password, user['password_hash']):
            cursor.close()
            conn.close()
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 401
        
        # Update password
        new_hash = hash_password(new_password)
        cursor.execute("UPDATE users SET password_hash = %s WHERE user_id = %s", 
                      (new_hash, session['user_id']))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Password changed successfully'}), 200
        
    except Exception as e:
        print(f"Change password error: {e}")
        return jsonify({'success': False, 'message': 'Failed to change password'}), 500