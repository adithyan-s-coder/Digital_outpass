"""
Smart Outpass Management System
Main Flask Application Entry Point
"""

from backend.config import app, init_db
from backend.routes.auth import auth_bp
from backend.routes.student import student_bp
from backend.routes.staff import staff_bp
from backend.routes.hod import hod_bp
from backend.routes.security import security_bp
from backend.routes.admin import admin_bp
from flask import send_from_directory, request
import os
import gzip
import threading

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(student_bp)
app.register_blueprint(staff_bp)
app.register_blueprint(hod_bp)
app.register_blueprint(security_bp)
app.register_blueprint(admin_bp)

# Compress JSON/HTML/CSS/JS responses and set smart cache headers for fast loading
COMPRESSIBLE_MIMETYPES = {
    'application/json', 'text/html', 'text/css', 'text/javascript',
    'application/javascript', 'image/svg+xml', 'text/plain'
}

@app.after_request
def optimize_response(response):
    try:
        # Cache uploaded profile photos and static images/fonts at browser + Vercel Edge CDN
        path = request.path
        if path.startswith('/uploads/') or path.startswith('/assets/'):
            response.headers['Cache-Control'] = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'
        elif path.endswith(('.css', '.js', '.png', '.ico', '.json')) and not path.startswith('/api/'):
            response.headers['Cache-Control'] = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'

        # Apply lightweight Gzip compression for text/JSON payloads > 500 bytes
        if (
            response.status_code == 200
            and not response.direct_passthrough
            and 'gzip' in request.headers.get('Accept-Encoding', '').lower()
            and 'Content-Encoding' not in response.headers
            and response.mimetype in COMPRESSIBLE_MIMETYPES
        ):
            data = response.get_data()
            if len(data) > 500:
                compressed = gzip.compress(data, compresslevel=5)
                response.set_data(compressed)
                response.headers['Content-Encoding'] = 'gzip'
                response.headers['Content-Length'] = len(compressed)
                response.headers['Vary'] = 'Accept-Encoding'
    except Exception:
        pass
    return response

# Skip background startup DDL/scheduler threads on Vercel serverless functions to prevent cold-start contention
if not os.environ.get('VERCEL'):
    def _startup_init():
        import time
        time.sleep(1.5)
        with app.app_context():
            init_db(force=False)
            try:
                from backend.services.scheduler import start_daily_scheduler
                start_daily_scheduler(app)
            except Exception as e:
                print(f"[WARN] Failed to start daily report scheduler: {e}")

    threading.Thread(target=_startup_init, daemon=True).start()


# Manual Database Initialization Route (Use only if needed)
@app.route('/api/admin/init-db', methods=['POST'])
def manual_init_db():
    """Manually trigger database initialization"""
    # Simple secret check for security (optional)
    if os.environ.get("ADMIN_KEY") and os.environ.get("ADMIN_KEY") != os.environ.get("SECRET_KEY"):
         return {'error': 'Unauthorized'}, 401
         
    success = init_db(force=True)
    if success:
        return {'message': 'Database initialized successfully'}, 200
    else:
        return {'error': 'Database initialization failed'}, 500

# Serve frontend files
@app.route('/')
def index():
    """Serve the main frontend page"""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files"""
    return send_from_directory(app.static_folder, path)

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    """
    Serve uploaded files from local disk cache or MySQL uploaded_files table.
    If an older pre-fix upload was wiped by an ephemeral cloud container, returns a crisp SVG initial avatar.
    """
    from flask import Response
    from backend.config import get_uploaded_file, get_db_connection

    file_bytes, mime_type = get_uploaded_file(filename)
    if file_bytes:
        return Response(
            file_bytes,
            mimetype=mime_type or 'image/jpeg',
            headers={'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400'}
        )

    # Graceful SVG avatar fallback when an older container-local file was lost before DB persistence
    initials = "U"
    try:
        basename = os.path.basename(filename)
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT full_name, username FROM users WHERE profile_image LIKE %s LIMIT 1",
                (f"%{basename}",)
            )
            row = cursor.fetchone()
            cursor.close()
            conn.close()
            if row:
                name = (row.get('full_name') or row.get('username') or 'U').strip()
                parts = [p for p in name.split() if p]
                if len(parts) >= 2:
                    initials = (parts[0][0] + parts[-1][0]).upper()
                elif parts:
                    initials = parts[0][:2].upper()
        if initials == "U":
            # Derive from filename pattern e.g. staff_username_photo.jpg
            stem = os.path.splitext(basename)[0]
            tokens = [t for t in stem.split('_') if t and t.lower() not in ('student', 'staff', 'hod', 'security', 'admin', 'captured', 'id', 'profile')]
            if tokens:
                initials = tokens[0][:2].upper()
    except Exception:
        pass

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <defs>
            <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#059669"/>
                <stop offset="100%" stop-color="#0d9488"/>
            </linearGradient>
        </defs>
        <rect width="200" height="200" rx="24" fill="url(#g)"/>
        <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
              fill="#ffffff" font-family="Outfit, Inter, sans-serif" font-weight="700" font-size="76">{initials}</text>
    </svg>'''
    return Response(
        svg,
        mimetype='image/svg+xml',
        headers={'Cache-Control': 'no-cache, max-age=0'}
    )

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return {'error': 'Resource not found'}, 404

@app.errorhandler(500)
def internal_error(error):
    return {'error': 'Internal server error'}, 500

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return {'status': 'ok', 'message': 'Smart Outpass System API is running'}, 200

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000)),
        debug=False,
        threaded=True
    )