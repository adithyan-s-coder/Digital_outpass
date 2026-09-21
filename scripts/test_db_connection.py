import os
import sys

# Add parent directory to path so backend module can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.config import get_db_connection, get_db_connection_params

params = get_db_connection_params()
masked_pw = '********' if params['password'] else '(empty)'

print("=" * 55)
print("  Smart Outpass System - Database Connection Test")
print("=" * 55)
print(f"Host:     {params['host']}")
print(f"Port:     {params['port']}")
print(f"User:     {params['user']}")
print(f"Database: {params['database']}")
print(f"Password: {masked_pw}")
print("-" * 55)

conn = get_db_connection()
if conn and conn.is_connected():
    print("\n[SUCCESS] Connected to database successfully!")
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT VERSION(), DATABASE();")
        version, current_db = cursor.fetchone()
        print(f"[INFO] Server Version: {version}")
        print(f"[INFO] Current Database: {current_db}")

        cursor.execute("SHOW TABLES;")
        tables = [t[0] for t in cursor.fetchall()]
        print(f"[INFO] Existing Tables ({len(tables)}): {', '.join(tables) if tables else 'None (Empty Database)'}")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"[WARN] Error running query: {e}")
        if conn:
            conn.close()
else:
    print("\n[FAILED] Could not establish connection to the database.")
    print("Please verify:")
    print(" 1. Host, port, username, and password in your environment / .env file.")
    print(" 2. Cloud database status (ensure your TiDB Cloud / Aiven cluster is active).")
    print(" 3. If on Render, verify Environment Variables in the Render Dashboard.")

