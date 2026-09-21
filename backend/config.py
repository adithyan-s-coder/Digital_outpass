"""
Smart Outpass Management System - Backend Configuration
Cleaned & Error-Free Version
"""

import os
from dotenv import load_dotenv
from flask import Flask, g, has_request_context
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

# ================= DATABASE CONNECTION & POOLING =================

import threading
from mysql.connector import pooling

try:
    import certifi
    DEFAULT_CA_PATH = certifi.where()
except ImportError:
    DEFAULT_CA_PATH = None

_db_pool = None
_pool_lock = threading.Lock()
_working_config = None

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


def find_working_config(params):
    """Probes candidate connection configurations once and caches the working one."""
    global _working_config
    if _working_config is not None:
        return _working_config

    is_local = params['host'] in ('localhost', '127.0.0.1')

    ssl_disabled_env = os.environ.get("DB_SSL_DISABLED", "").strip().lower()
    if ssl_disabled_env in ("true", "1", "yes"):
        ssl_disabled = True
    elif ssl_disabled_env in ("false", "0", "no"):
        ssl_disabled = False
    else:
        ssl_disabled = is_local

    ca_path = os.environ.get("DB_SSL_CA") or DEFAULT_CA_PATH

    conn_configs = []
    if not ssl_disabled:
        # 1. Cloud SSL with ssl_verify_cert=False (instant connection for TiDB Cloud Serverless / Aiven)
        conn_configs.append({
            'host': params['host'],
            'user': params['user'],
            'password': params['password'],
            'database': params['database'],
            'port': params['port'],
            'autocommit': True,
            'connection_timeout': 5,
            'ssl_disabled': False,
            'ssl_verify_cert': False
        })

        # 2. Standard SSL with trusted CA bundle if explicitly provided
        if ca_path and os.path.exists(ca_path):
            conn_configs.append({
                'host': params['host'],
                'user': params['user'],
                'password': params['password'],
                'database': params['database'],
                'port': params['port'],
                'autocommit': True,
                'connection_timeout': 5,
                'ssl_disabled': False,
                'ssl_ca': ca_path,
                'ssl_verify_cert': True
            })

    # 3. Fallback without SSL (for localhost or non-SSL databases)
    conn_configs.append({
        'host': params['host'],
        'user': params['user'],
        'password': params['password'],
        'database': params['database'],
        'port': params['port'],
        'autocommit': True,
        'connection_timeout': 5,
        'ssl_disabled': True
    })

    last_err = None
    for config in conn_configs:
        try:
            test_conn = mysql.connector.connect(**config)
            if test_conn.is_connected():
                try:
                    c = test_conn.cursor()
                    c.execute("SET time_zone = '+05:30'")
                    c.close()
                except Exception:
                    pass
                test_conn.close()
                _working_config = dict(config)
                print(f"[OK] Database connection verified (ssl_disabled={config.get('ssl_disabled', False)})")
                return _working_config
        except Exception as err:
            last_err = err

    print(f"[ERROR] Database probe failed for {params['user']}@{params['host']}:{params['port']}/{params['database']}: {last_err}")
    return None


def get_db_pool():
    """Initializes or retrieves the persistent connection pool."""
    global _db_pool, _working_config
    if _db_pool is not None:
        return _db_pool

    with _pool_lock:
        if _db_pool is not None:
            return _db_pool

        params = get_db_connection_params()
        working_cfg = find_working_config(params)
        if not working_cfg:
            return None

        try:
            pool_config = dict(working_cfg)
            pool_config['pool_name'] = "outpass_pool"
            pool_config['pool_size'] = 10
            # TiDB does not support COM_RESET_CONNECTION; must be False for seamless pooling
            pool_config['pool_reset_session'] = False
            _db_pool = pooling.MySQLConnectionPool(**pool_config)
            print("[OK] Initialized persistent MySQL connection pool (size=10, reset_session=False)")
            return _db_pool
        except Exception as e:
            print(f"[WARN] Connection pool initialization failed, will use direct connections: {e}")
            return None


def _create_raw_connection():
    """Internal helper to acquire a connection from pool or direct connect."""
    pool = get_db_pool()
    if pool:
        try:
            conn = pool.get_connection()
            if conn:
                try:
                    conn.ping(reconnect=True, attempts=2, delay=0.5)
                except Exception:
                    try:
                        conn.close()
                    except Exception:
                        pass
                    conn = None
            if conn and conn.is_connected():
                return conn
        except Exception as pool_err:
            print(f"[WARN] Pool checkout warning: {pool_err}")

    # Fallback to direct connection using cached working config
    cfg = _working_config
    if not cfg:
        params = get_db_connection_params()
        cfg = find_working_config(params)

    if cfg:
        try:
            conn = mysql.connector.connect(**cfg)
            if conn.is_connected():
                return conn
        except Exception as dir_err:
            print(f"[ERROR] Direct database connection failed: {dir_err}")

    return None


def get_db_connection():
    """Returns an active database connection from persistent pool (or direct fallback)."""
    conn = _create_raw_connection()
    if conn and has_request_context():
        g.db_conn = conn
    return conn


@app.teardown_appcontext
def close_db_connection(exception=None):
    """Guarantees returned connections are closed/released at end of request."""
    if has_request_context():
        conn = g.pop('db_conn', None)
        if conn is not None:
            try:
                if conn.is_connected():
                    conn.close()
            except Exception:
                pass


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