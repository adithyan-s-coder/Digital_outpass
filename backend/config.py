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

import time
import threading
from collections import deque

try:
    import certifi
    DEFAULT_CA_PATH = certifi.where()
except ImportError:
    DEFAULT_CA_PATH = None

_pool_lock = threading.Lock()
_working_config = None
_idle_connections = deque()
_MAX_IDLE_CONNECTIONS = 5
_conn_last_used = {}
_PING_INTERVAL_SECONDS = 45.0


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


def _open_new_connection():
    """Opens a single MySQL connection, probing and caching the working SSL config on first call."""
    global _working_config

    if _working_config is not None:
        conn = mysql.connector.connect(**_working_config)
        try:
            c = conn.cursor()
            c.execute("SET time_zone = '+05:30'")
            c.close()
        except Exception:
            pass
        _conn_last_used[id(conn)] = time.monotonic()
        return conn

    params = get_db_connection_params()
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
            conn = mysql.connector.connect(**config)
            if conn.is_connected():
                try:
                    c = conn.cursor()
                    c.execute("SET time_zone = '+05:30'")
                    c.close()
                except Exception:
                    pass
                _working_config = dict(config)
                _conn_last_used[id(conn)] = time.monotonic()
                print(f"[OK] Database connection established (ssl_disabled={config.get('ssl_disabled', False)})")
                # Reuse this open connection directly instead of closing & opening 10 more!
                return conn
        except Exception as err:
            last_err = err

    print(f"[ERROR] Database connection failed for {params['user']}@{params['host']}:{params['port']}/{params['database']}: {last_err}")
    return None


def _checkout_connection():
    """Checks out a warm connection from the lazy pool or opens a single new one on demand."""
    now = time.monotonic()
    while True:
        with _pool_lock:
            if not _idle_connections:
                break
            conn = _idle_connections.pop()

        try:
            conn_id = id(conn)
            last_used = _conn_last_used.get(conn_id, 0.0)
            if (now - last_used) > _PING_INTERVAL_SECONDS:
                conn.ping(reconnect=True, attempts=1, delay=0.1)
            if conn.is_connected():
                _conn_last_used[conn_id] = now
                return conn
        except Exception:
            try:
                conn.close()
            except Exception:
                pass

    try:
        return _open_new_connection()
    except Exception as e:
        print(f"[ERROR] Failed to open database connection: {e}")
        return None


class _PooledConnectionProxy:
    """Lightweight proxy so conn.close() in route handlers returns the connection to the lazy pool."""
    __slots__ = ('_conn', '_returned')

    def __init__(self, conn):
        self._conn = conn
        self._returned = False

    def cursor(self, *args, **kwargs):
        return self._conn.cursor(*args, **kwargs)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def is_connected(self):
        return self._conn is not None and self._conn.is_connected()

    def ping(self, *args, **kwargs):
        return self._conn.ping(*args, **kwargs)

    def close(self):
        if self._returned or self._conn is None:
            return
        self._returned = True
        raw = self._conn
        try:
            if raw.is_connected():
                _conn_last_used[id(raw)] = time.monotonic()
                with _pool_lock:
                    if len(_idle_connections) < _MAX_IDLE_CONNECTIONS:
                        _idle_connections.append(raw)
                        return
            raw.close()
        except Exception:
            try:
                raw.close()
            except Exception:
                pass


def get_db_connection():
    """Returns an active database connection from the lazy pool."""
    if has_request_context():
        existing = getattr(g, 'db_conn', None)
        if existing is not None and not existing._returned:
            try:
                if existing.is_connected():
                    return existing
            except Exception:
                pass
    raw_conn = _checkout_connection()
    if not raw_conn:
        return None
    proxy = _PooledConnectionProxy(raw_conn)
    if has_request_context():
        g.db_conn = proxy
    return proxy


@app.teardown_appcontext
def close_db_connection(exception=None):
    """Guarantees checked-out connections are returned to the lazy pool at end of request."""
    if has_request_context():
        conn = g.pop('db_conn', None)
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass


# ================= INIT DB FUNCTION =================

def init_db(force=False):
    """Initializes schema and sample data safely, with a fast-path check if already initialized."""
    conn = get_db_connection()
    if not conn:
        print("[ERROR] Cannot initialize DB: Connection failed")
        return False

    schema_path = os.path.join(BASE_DIR, 'database', 'schema.sql')
    sample_path = os.path.join(BASE_DIR, 'database', 'sample_data.sql')

    try:
        cursor = conn.cursor()

        # Fast-path check: If tables, migrated columns, and users already exist, skip 15+ DDL round-trips
        if not force:
            try:
                cursor.execute("SELECT COUNT(*) FROM users")
                existing_users = cursor.fetchone()[0]
                cursor.execute("SELECT academic_year FROM users LIMIT 1")
                cursor.fetchall()
                cursor.execute("SELECT actual_exit_time FROM outpasses LIMIT 1")
                cursor.fetchall()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS uploaded_files (
                        file_path VARCHAR(255) PRIMARY KEY,
                        mime_type VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
                        file_data MEDIUMBLOB NOT NULL,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                    )
                """)
                if existing_users > 0:
                    cursor.close()
                    conn.close()
                    sync_local_uploads_to_db()
                    print("[OK] Database schema already initialized (fast-path verified)")
                    return True
            except Exception:
                # Schema or columns missing, proceed with full initialization
                pass
        
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

        # Ensure uploaded_files table exists for cloud profile photo persistence
        try:
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS uploaded_files (
                    file_path VARCHAR(255) PRIMARY KEY,
                    mime_type VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
                    file_data MEDIUMBLOB NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            """)
        except Exception as uf_err:
            print(f"[WARN] uploaded_files table creation skipped: {uf_err}")

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
        sync_local_uploads_to_db()
        return True
    except Exception as e:
        print(f"[ERROR] Error during DB init: {e}")
        if conn:
            conn.close()
        return False

# File Handling (supports read-only serverless filesystems like Vercel via /tmp/uploads + MySQL persistence)
DEFAULT_UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
if os.environ.get('VERCEL'):
    UPLOAD_FOLDER = '/tmp/uploads'
else:
    UPLOAD_FOLDER = DEFAULT_UPLOAD_FOLDER

try:
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
except OSError:
    import tempfile
    UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), 'uploads')
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DEFAULT_UPLOAD_FOLDER'] = DEFAULT_UPLOAD_FOLDER

_uploaded_files_table_ready = False

def ensure_uploaded_files_table(conn=None):
    """Ensures the uploaded_files table exists in MySQL."""
    global _uploaded_files_table_ready
    if _uploaded_files_table_ready:
        return True
    own_conn = False
    if conn is None:
        conn = get_db_connection()
        own_conn = True
    if not conn:
        return False
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS uploaded_files (
                file_path VARCHAR(255) PRIMARY KEY,
                mime_type VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
                file_data MEDIUMBLOB NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        cursor.close()
        _uploaded_files_table_ready = True
        return True
    except Exception as e:
        print(f"[WARN] ensure_uploaded_files_table error: {e}")
        return False
    finally:
        if own_conn and conn:
            conn.close()


def save_uploaded_file(rel_path, raw_bytes, mime_type='image/jpeg'):
    """
    Saves an uploaded file both to local disk cache AND to MySQL uploaded_files table
    so profile photos persist across Render container restarts, Vercel functions, and all devices.
    """
    clean_path = rel_path.replace('\\', '/').lstrip('/')
    # 1. Save to local disk cache
    try:
        disk_path = os.path.join(app.config['UPLOAD_FOLDER'], *clean_path.split('/'))
        os.makedirs(os.path.dirname(disk_path), exist_ok=True)
        with open(disk_path, 'wb') as f:
            f.write(raw_bytes)
    except Exception as disk_err:
        print(f"[WARN] Disk cache write failed for {clean_path}: {disk_err}")

    # 2. Save to MySQL uploaded_files table
    conn = get_db_connection()
    if conn:
        try:
            ensure_uploaded_files_table(conn)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO uploaded_files (file_path, mime_type, file_data)
                VALUES (%s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    mime_type = VALUES(mime_type),
                    file_data = VALUES(file_data)
            """, (clean_path, mime_type, raw_bytes))
            conn.commit()
            cursor.close()
        except Exception as db_err:
            print(f"[WARN] DB file persist failed for {clean_path}: {db_err}")
        finally:
            conn.close()


def get_uploaded_file(rel_path):
    """
    Retrieves file bytes & mime_type from local disk cache or MySQL uploaded_files table.
    Automatically restores MySQL-backed files to local disk cache for 0ms repeat access.
    """
    clean_path = rel_path.replace('\\', '/').lstrip('/')
    ext = os.path.splitext(clean_path)[1].lower()
    default_mime = 'image/png' if ext == '.png' else ('application/pdf' if ext == '.pdf' else 'image/jpeg')

    # 1. Check local disk cache first
    for base_folder in (app.config.get('UPLOAD_FOLDER'), app.config.get('DEFAULT_UPLOAD_FOLDER')):
        if not base_folder:
            continue
        candidate = os.path.join(base_folder, *clean_path.split('/'))
        if os.path.isfile(candidate):
            try:
                with open(candidate, 'rb') as f:
                    return f.read(), default_mime
            except Exception:
                pass

    # 2. Fetch from MySQL uploaded_files table if wiped from ephemeral disk
    conn = get_db_connection()
    if conn:
        try:
            ensure_uploaded_files_table(conn)
            cursor = conn.cursor()
            basename = os.path.basename(clean_path)
            cursor.execute("""
                SELECT file_data, mime_type
                FROM uploaded_files
                WHERE file_path = %s OR file_path = %s OR file_path LIKE %s
                LIMIT 1
            """, (clean_path, f"profiles/{basename}", f"%/{basename}"))
            row = cursor.fetchone()
            cursor.close()
            if row and row[0]:
                file_bytes = bytes(row[0]) if not isinstance(row[0], bytes) else row[0]
                mime_type = row[1] or default_mime
                # Restore to local disk cache for fast future hits
                try:
                    disk_path = os.path.join(app.config['UPLOAD_FOLDER'], *clean_path.split('/'))
                    os.makedirs(os.path.dirname(disk_path), exist_ok=True)
                    with open(disk_path, 'wb') as f:
                        f.write(file_bytes)
                except Exception:
                    pass
                return file_bytes, mime_type
        except Exception as db_err:
            print(f"[WARN] DB file lookup failed for {clean_path}: {db_err}")
        finally:
            conn.close()

    return None, None


def sync_local_uploads_to_db():
    """Syncs any existing files in local uploads/ folder into MySQL uploaded_files table."""
    try:
        for base_folder in (app.config.get('DEFAULT_UPLOAD_FOLDER'), app.config.get('UPLOAD_FOLDER')):
            if not base_folder or not os.path.isdir(base_folder):
                continue
            for root, _, files in os.walk(base_folder):
                for fname in files:
                    if not allowed_file(fname):
                        continue
                    full_path = os.path.join(root, fname)
                    rel_path = os.path.relpath(full_path, base_folder).replace('\\', '/')
                    try:
                        with open(full_path, 'rb') as f:
                            raw = f.read()
                        if raw:
                            ext = os.path.splitext(fname)[1].lower()
                            mime = 'image/png' if ext == '.png' else 'image/jpeg'
                            save_uploaded_file(rel_path, raw, mime)
                    except Exception:
                        pass
    except Exception as e:
        print(f"[WARN] sync_local_uploads_to_db skipped: {e}")


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg', 'pdf'}

def allowed_image_file(filename):
    """Specifically for student profile photos (no PDFs)"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'png', 'jpg', 'jpeg'}