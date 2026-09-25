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
from flask import send_from_directory
import os

# Register blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(student_bp)
app.register_blueprint(staff_bp)
app.register_blueprint(hod_bp)
app.register_blueprint(security_bp)
app.register_blueprint(admin_bp)

# Initialize database on startup and start daily 4:10 PM HOD report scheduler
with app.app_context():
    init_db()
    try:
        from backend.services.scheduler import start_daily_scheduler
        start_daily_scheduler(app)
    except Exception as e:
        print(f"[WARN] Failed to start daily report scheduler: {e}")


# Manual Database Initialization Route (Use only if needed)
@app.route('/api/admin/init-db', methods=['POST'])
def manual_init_db():
    """Manually trigger database initialization"""
    # Simple secret check for security (optional)
    if os.environ.get("ADMIN_KEY") and os.environ.get("ADMIN_KEY") != os.environ.get("SECRET_KEY"):
         return {'error': 'Unauthorized'}, 401
         
    success = init_db()
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
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

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
        debug=False
    )