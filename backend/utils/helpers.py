"""
Utility functions for Smart Outpass Management System
Includes authentication, QR code generation, validation, etc.
"""

import hashlib
import secrets
try:
    import qrcode
except ImportError:
    qrcode = None
import io
import base64
from datetime import datetime, timedelta
from functools import wraps
import os
from flask import session, jsonify, request

def get_ist_now():
    """Get current time in IST (+05:30)"""
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

def hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, password_hash):
    """Verify password against hash"""
    return hash_password(password) == password_hash

def generate_qr_code(data):
    """
    Generate QR code and return base64 encoded image
    Args:
        data: String data to encode in QR code
    Returns:
        Base64 encoded QR code image
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_base64}"

def generate_unique_qr_token(outpass_id):
    """
    Generate unique QR code token for outpass
    Format: QR-{outpass_id}-{timestamp}-{random}
    """
    timestamp = int(get_ist_now().timestamp())
    random_str = secrets.token_hex(8)
    return f"QR-{outpass_id:08d}-{timestamp}-{random_str}"

def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required', 'logged_in': False}), 401
        return f(*args, **kwargs)
    return decorated_function

def role_required(*allowed_roles):
    """Decorator to require specific role(s) for routes"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': 'Authentication required'}), 401
            
            if 'role' not in session or session['role'] not in allowed_roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def format_datetime(dt):
    """Format datetime object to string"""
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    return dt.strftime('%Y-%m-%d %H:%M:%S')

def format_date(dt):
    """Format date object to string"""
    if dt is None:
        return None
    if isinstance(dt, str):
        return dt
    return dt.strftime('%Y-%m-%d')

def format_time(t):
    """Format time object to string"""
    if t is None:
        return None
    if isinstance(t, str):
        return t
    if isinstance(t, timedelta):
        total_seconds = int(t.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    return t.strftime('%H:%M:%S')

def validate_outpass_timing(out_date, out_time, expected_return_time):
    """
    Validate outpass date and time
    Returns: (is_valid, error_message)
    """
    try:
        # Parse date and time
        out_datetime = datetime.strptime(f"{out_date} {out_time}", "%Y-%m-%d %H:%M:%S")
        
        # Check if date is not in the past
        if out_datetime.date() < datetime.now().date():
            return False, "Outpass date cannot be in the past"
        
        # Check if date is not too far in future (e.g., 30 days)
        if out_datetime.date() > (datetime.now().date() + timedelta(days=30)):
            return False, "Outpass date cannot be more than 30 days in future"
        
        # Parse return time
        out_time_obj = datetime.strptime(out_time, "%H:%M:%S").time()
        return_time_obj = datetime.strptime(expected_return_time, "%H:%M:%S").time()
        
        # Check if return time is after out time (same day)
        if return_time_obj <= out_time_obj:
            return False, "Return time must be after departure time"
        
        return True, None
        
    except ValueError as e:
        return False, f"Invalid date/time format: {str(e)}"

def log_action(conn, outpass_id, action_by, action_type, remarks=None, ip_address=None):
    """
    Log an action in outpass_logs table
    Args:
        conn: Database connection
        outpass_id: ID of the outpass
        action_by: User ID who performed the action
        action_type: Type of action (created, approved, rejected, etc.)
        remarks: Optional remarks
        ip_address: Optional IP address
    """
    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO outpass_logs (outpass_id, action_by, action_type, remarks, ip_address)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (outpass_id, action_by, action_type, remarks, ip_address))
        conn.commit()
        cursor.close()
        return True
    except Exception as e:
        print(f"Error logging action: {e}")
        return False

def get_client_ip():
    """Get client IP address from request"""
    if request.environ.get('HTTP_X_FORWARDED_FOR'):
        return request.environ['HTTP_X_FORWARDED_FOR'].split(',')[0]
    else:
        return request.environ.get('REMOTE_ADDR', 'Unknown')

def send_notification(user_email, subject, message):
    """
    Send notification to user (email/SMS)
    This is a placeholder - implement actual email/SMS service
    """
    # TODO: Implement actual notification service (SMTP, SMS API, etc.)
    print(f"📧 Notification to {user_email}")
    print(f"Subject: {subject}")
    print(f"Message: {message}")
    return True

def send_sms_notification(phone, message):
    """
    Send SMS notification to mobile number using Twilio
    """
    try:
        from twilio.rest import Client
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        from_number = os.environ.get('TWILIO_PHONE_NUMBER')

        if not all([account_sid, auth_token, from_number]):
            print("⚠️ Twilio credentials missing in environment. Falling back to simulation.")
            print(f"📱 Simulated SMS to {phone}")
            print(f"Message: {message}")
            return False

        client = Client(account_sid, auth_token)
        
        # Ensure phone number is in E.164 format (starts with +)
        # Assuming user provides 10 digits, we might need to add country code (+91 for India)
        formatted_phone = phone if phone.startswith('+') else f"+91{phone}"

        message = client.messages.create(
            body=message,
            from_=from_number,
            to=formatted_phone
        )
        print(f"✅ SMS sent successfully! SID: {message.sid}")
        return True
    except Exception as e:
        print(f"❌ Error sending SMS via Twilio: {e}")
        # Fallback to simulation for visibility
        print(f"📱 Simulated SMS to {phone}")
        print(f"Message: {message}")
        return False

def is_qr_valid(qr_code, qr_expires_at, is_qr_used):
    """
    Check if QR code is valid for scanning
    Args:
        qr_code: QR code string
        qr_expires_at: Expiry datetime
        is_qr_used: Boolean indicating if already used
    Returns:
        (is_valid, error_message)
    """
    if not qr_code:
        return False, "QR code not generated"
    
    if is_qr_used:
        return False, "QR code already used"
    
    if qr_expires_at and get_ist_now() > qr_expires_at:
        return False, "QR code expired"
    
    return True, None

def calculate_duration(start_time, end_time):
    """Calculate duration between two datetime objects"""
    if not start_time or not end_time:
        return None
    
    duration = end_time - start_time
    hours = duration.total_seconds() / 3600
    return round(hours, 2)

def check_is_late(out_date, expected_return_time, actual_entry_time):
    """
    Check if entry is late
    Args:
        out_date: Date object or string
        expected_return_time: Time object, timedelta, or string
        actual_entry_time: Datetime object
    Returns:
        Boolean: True if late, False otherwise
    """
    if not actual_entry_time or not expected_return_time:
        return False
        
    try:
        # Normalize out_date
        if isinstance(out_date, str):
            out_date = datetime.strptime(out_date, '%Y-%m-%d').date()
        elif hasattr(out_date, 'date'):
            out_date = out_date.date()
            
        # Normalize expected_return_time to a datetime on out_date
        if isinstance(expected_return_time, timedelta):
            total_seconds = int(expected_return_time.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            expected_dt = datetime.combine(out_date, datetime.min.time().replace(hour=hours % 24, minute=minutes))
        elif isinstance(expected_return_time, str):
            # Handle HH:MM:SS or HH:MM
            t_parts = expected_return_time.split(':')
            h, m = int(t_parts[0]), int(t_parts[1])
            expected_dt = datetime.combine(out_date, datetime.min.time().replace(hour=h, minute=m))
        elif hasattr(expected_return_time, 'hour'):
            expected_dt = datetime.combine(out_date, expected_return_time)
        else:
            return False
            
        # Special case: '23:59:00' often means "Not Returning Today" in this system
        if expected_dt.time().hour == 23 and expected_dt.time().minute == 59:
            return False
            
        return actual_entry_time > expected_dt
        
    except Exception as e:
        print(f"Error checking late status: {e}")
        return False