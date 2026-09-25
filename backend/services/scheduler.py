"""
Background Daily Outpass Report Scheduler
Runs a background worker thread that automatically triggers daily HOD outpass report emails
every day at 4:10 PM IST (16:10), right after college ends at 4:05 PM.
"""

import time
import threading
from datetime import datetime, timedelta
from backend.services.daily_report_service import dispatch_daily_hod_reports

_scheduler_thread = None
_scheduler_running = False
_last_sent_date = None

def get_ist_now():
    """Get current time in IST (+05:30)"""
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

def _scheduler_loop(app=None):
    global _last_sent_date, _scheduler_running

    print("⏰ Daily HOD Report Scheduler initialized (Target: 4:10 PM IST daily)")

    while _scheduler_running:
        try:
            now = get_ist_now()
            current_date_str = now.strftime('%Y-%m-%d')
            hour = now.hour
            minute = now.minute

            # Target time: 4:10 PM IST (16:10)
            # Check window between 16:10 and 16:15 IST
            if hour == 16 and (10 <= minute <= 15):
                if _last_sent_date != current_date_str:
                    print(f"🚀 [AUTO-SCHEDULER] 4:10 PM IST reached! Dispatching Daily Outpass Reports to HODs...")
                    
                    if app:
                        with app.app_context():
                            res = dispatch_daily_hod_reports(current_date_str)
                    else:
                        res = dispatch_daily_hod_reports(current_date_str)

                    _last_sent_date = current_date_str
                    print(f"✅ [AUTO-SCHEDULER] Daily reports sent: {res.get('sent_count', 0)} of {res.get('total_departments', 0)} departments.")

        except Exception as e:
            print(f"❌ [AUTO-SCHEDULER] Error in daily scheduler loop: {e}")

        # Sleep for 30 seconds before checking time again
        time.sleep(30)

def start_daily_scheduler(app=None):
    """
    Start the background thread scheduler for 4:10 PM daily HOD outpass report dispatch.
    """
    global _scheduler_thread, _scheduler_running
    if _scheduler_running:
        return

    _scheduler_running = True
    _scheduler_thread = threading.Thread(target=_scheduler_loop, args=(app,), daemon=True)
    _scheduler_thread.start()
    print("▶️ Started background 4:10 PM IST Daily Outpass Report Scheduler worker thread.")

def stop_daily_scheduler():
    global _scheduler_running
    _scheduler_running = False
