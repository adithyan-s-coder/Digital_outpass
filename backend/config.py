"""
Smart Outpass Management System - Backend Configuration
Cleaned & Error-Free Version
"""

import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
import mysql.connector
from datetime import timedelta

# Load environment variables
load_dotenv()

# Base directory setup
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

app = Flask(__name__, static_folder=os.path.join(BASE_DIR, 'frontend'), static_url_path='')
CORS(app)

# Security Config
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-123')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=2)

# ================= DATABASE CONNECTION =================

try:
    import certifi
    DEFAULT_CA_PATH = certifi.where()
except ImportError:
    DEFAULT_CA_PATH = None

def get_db_connection_params():
    """Extract database connection parameters from URL or discrete environment variables."""
    import urllib.parse

    db_url = os.environ.get("DATABASE_URL") or os.environ.get("MYSQL_URL")

    db_host = os.environ.get("DB_HOST", "localhost")
    db_user = os.environ.get("DB_USER", "root")
    db_password = os.environ.get("DB_PASSWORD", "")
    db_name = os.environ.get("DB_NAME", "outpass_db")
    db_port = os.environ.get("DB_PORT", "3306")

    # If DATABASE_URL / MYSQL_URL is provided, extract parameters
    if db_url:
        parsed = urllib.parse.urlparse(db_url)
        if parsed.hostname:
            db_host = parsed.hostname
        if parsed.username:
            db_user = urllib.parse.unquote(parsed.username)
        if parsed.password:
            db_password = urllib.parse.unquote(parsed.password)
        if parsed.port:
            db_port = parsed.port
        if parsed.path and parsed.path.strip('/'):
            # Strip query string or extra segments if any
            clean_path = parsed.path.strip('/').split('/')[0]
            if clean_path:
                db_name = clean_path

    try:
        db_port = int(db_port)
    except (ValueError, TypeError):
        db_port = 3306

    return {
        'host': db_host,
        'user': db_user,
        'password': db_password,
        'database': db_name,
        'port': db_port
    }


def get_db_connection():
    """Establishes and returns a connection to MySQL / TiDB / Cloud Database."""
    params = get_db_connection_params()
    is_local = params['host'] in ('localhost', '127.0.0.1')

    # SSL Configuration
    # For cloud databases like TiDB Cloud / Aiven, SSL is required
    ssl_disabled_env = os.environ.get("DB_SSL_DISABLED", "").strip().lower()
    if ssl_disabled_env in ("true", "1", "yes"):
        ssl_disabled = True
    elif ssl_disabled_env in ("false", "0", "no"):
        ssl_disabled = False
    else:
        # Default: disable SSL on localhost, enable for remote cloud databases
        ssl_disabled = is_local

    ca_path = os.environ.get("DB_SSL_CA") or DEFAULT_CA_PATH

    conn_configs = []
    if not ssl_disabled:
        # 1. Try with verified CA bundle (standard for TiDB Cloud / Aiven)
        cfg_ssl_ca = {
            'host': params['host'],
            'user': params['user'],
            'password': params['password'],
            'database': params['database'],
            'port': params['port'],
            'autocommit': True,
            'connection_timeout': 15,
            'ssl_disabled': False
        }
        if ca_path and os.path.exists(ca_path):
            cfg_ssl_ca['ssl_ca'] = ca_path
            cfg_ssl_ca['ssl_verify_cert'] = True
        conn_configs.append(cfg_ssl_ca)

        # 2. Fallback without strict cert verification (in case cloud provider uses custom CA)
        cfg_ssl_fallback = {
            'host': params['host'],
            'user': params['user'],
            'password': params['password'],
            'database': params['database'],
            'port': params['port'],
            'autocommit': True,
            'connection_timeout': 15,
            'ssl_disabled': False,
            'ssl_verify_cert': False
        }
        conn_configs.append(cfg_ssl_fallback)

    # 3. Fallback without SSL (for localhost or non-SSL databases)
    conn_configs.append({
        'host': params['host'],
        'user': params['user'],
        'password': params['password'],
        'database': params['database'],
        'port': params['port'],
        'autocommit': True,
        'connection_timeout': 15,
        'ssl_disabled': True
    })

    conn = None
    last_err = None
    for config in conn_configs:
        try:
            conn = mysql.connector.connect(**config)
            if conn.is_connected():
                break
        except Exception as err:
            last_err = err
            conn = None

    if not conn or not conn.is_connected():
        print(f"[ERROR] Database connection failed to {params['user']}@{params['host']}:{params['port']}/{params['database']}: {last_err}")
        return None

    # Set session timezone to IST (+05:30) safely
    try:
        cursor = conn.cursor()
        cursor.execute("SET time_zone = '+05:30'")
        cursor.close()
    except Exception as tz_err:
        print(f"[INFO] Timezone set skipped: {tz_err}")

    return conn


# ================= INIT DB FUNCTION =================

def init_db():
    """Initializes schema and sample data safely."""
    conn = get_db_connection()
    if not conn:
        print("[ERROR] Cannot initialize DB: Connection failed")
        return False

    schema_path = os.path.join(BASE_DIR, 'database', 'schema.sql')
    sample_path = os.path.join(BASE_DIR, 'database', 'sample_data.sql')

    try:
        cursor = conn.cursor()
        
        # Execute Schema
        if os.path.exists(schema_path):
            with open(schema_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Split by semicolon but ignore empty statements
                statements = [s.strip() for s in content.split(';') if s.strip()]
                for statement in statements:
                    try:
                        cursor.execute(statement)
                    except mysql.connector.Error as err:
                        if err.errno in [1060, 1061]: # Duplicate column/key
                            pass # Silently ignore duplicates
                        else:
                            print(f"[WARN] Schema statement failed: {err.msg}")
            print("[OK] Database schema verified/initialized")

        # Migration: Add academic_year to users if missing
        try:
            cursor.execute("SHOW COLUMNS FROM users LIKE 'academic_year'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE users ADD COLUMN academic_year INT AFTER registration_no")
                print("[OK] Migration: Added academic_year column to users table")
        except Exception as mig_err:
            print(f"[WARN] academic_year migration skipped: {mig_err}")

        # Migration: Add movement logs to outpasses if missing
        try:
            cursor.execute("SHOW COLUMNS FROM outpasses LIKE 'actual_exit_time'")
            if not cursor.fetchone():
                cursor.execute("ALTER TABLE outpasses ADD COLUMN actual_exit_time TIMESTAMP NULL AFTER is_qr_used")
                cursor.execute("ALTER TABLE outpasses ADD COLUMN actual_entry_time TIMESTAMP NULL AFTER actual_exit_time")
                cursor.execute("ALTER TABLE outpasses ADD COLUMN exit_security_id INT AFTER actual_entry_time")
                cursor.execute("ALTER TABLE outpasses ADD COLUMN entry_security_id INT AFTER exit_security_id")
                print("[OK] Migration: Added movement columns to outpasses table")
        except Exception as mig_err:
            print(f"[WARN] outpasses movement migration skipped: {mig_err}")
        
        # Execute Sample Data Only if no users exist (to prevent duplicates on every restart)
        try:
            cursor.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
        except:
            user_count = 0
        
        if user_count == 0 and os.path.exists(sample_path):
            with open(sample_path, 'r', encoding='utf-8') as f:
                content = f.read()
                statements = [s.strip() for s in content.split(';') if s.strip()]
                for statement in statements:
                    try:
                        cursor.execute(statement)
                    except mysql.connector.Error as err:
                        print(f"[WARN] Sample data statement failed: {err.msg}")
            print("[OK] Sample data loaded (first time setup)")
        else:
            print("[INFO] Skipping sample data (database already contains data)")

        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[ERROR] Error during DB init: {e}")
        if conn:
            conn.close()
        return False

# File Handling
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'pdf'}

def allowed_image_file(filename):
    """Specifically for student profile photos (no PDFs)"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}