"""
Daily Department Outpass Report Service
Generates and dispatches daily departmental outpass reports to HOD email addresses via SMTP (Gmail).
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from backend.config import get_db_connection

def get_ist_now():
    """Get current time in IST (+05:30)"""
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

def format_time_str(t):
    """Format time object or string for display"""
    if t is None:
        return "N/A"
    if isinstance(t, str):
        return t
    if isinstance(t, timedelta):
        tot = int(t.total_seconds())
        return f"{(tot // 3600) % 24:02d}:{(tot % 3600) // 60:02d}"
    if hasattr(t, 'strftime'):
        return t.strftime('%I:%M %p')
    return str(t)

def generate_department_daily_report(dept_id, target_date=None):
    """
    Fetches daily outpass data for a department and builds HTML and Text report.
    Args:
        dept_id: ID of the department
        target_date: YYYY-MM-DD string or date object (defaults to today in IST)
    Returns:
        dict with subject, html_content, text_content, stats, and recipient info
    """
    if not target_date:
        target_date = get_ist_now().strftime('%Y-%m-%d')
    elif hasattr(target_date, 'strftime'):
        target_date = target_date.strftime('%Y-%m-%d')

    conn = get_db_connection()
    if not conn:
        raise Exception("Database connection failed")

    cursor = conn.cursor(dictionary=True)

    # 1. Fetch Department and HOD Info
    cursor.execute("""
        SELECT d.dept_name, d.dept_code, u.full_name as hod_name, u.email as hod_email
        FROM departments d
        LEFT JOIN users u ON u.dept_id = d.dept_id AND u.role = 'hod' AND u.is_active = TRUE
        WHERE d.dept_id = %s
        LIMIT 1
    """, (dept_id,))
    dept_info = cursor.fetchone()

    if not dept_info:
        cursor.close()
        conn.close()
        raise Exception(f"Department ID {dept_id} not found")

    dept_name = dept_info['dept_name']
    hod_name = dept_info['hod_name'] or "HOD"
    hod_email = dept_info['hod_email']

    # 2. Fetch all outpasses for target date in this department
    cursor.execute("""
        SELECT 
            o.outpass_id,
            o.out_date,
            o.out_time,
            o.expected_return_time,
            o.actual_exit_time,
            o.actual_entry_time,
            o.reason,
            o.destination,
            o.final_status,
            o.hod_status,
            s.full_name as student_name,
            s.registration_no,
            s.academic_year,
            s.phone as student_phone,
            a.full_name as advisor_name
        FROM outpasses o
        JOIN users s ON o.student_id = s.user_id
        LEFT JOIN users a ON o.advisor_id = a.user_id
        WHERE s.dept_id = %s AND o.out_date = %s
        ORDER BY o.out_time ASC
    """, (dept_id, target_date))

    outpasses = cursor.fetchall()
    cursor.close()
    conn.close()

    # Calculate statistics
    total_count = len(outpasses)
    approved_count = sum(1 for op in outpasses if op['final_status'] in ('approved', 'used'))
    pending_count = sum(1 for op in outpasses if op['final_status'] == 'pending')
    rejected_count = sum(1 for op in outpasses if op['final_status'] == 'rejected')
    currently_outside = sum(1 for op in outpasses if op.get('actual_exit_time') and not op.get('actual_entry_time'))

    date_formatted = datetime.strptime(target_date, '%Y-%m-%d').strftime('%d %B %Y')
    subject = f"📢 Daily Outpass Report ({date_formatted}) - Dept of {dept_name}"

    # Build HTML Email Content
    rows_html = ""
    if not outpasses:
        rows_html = """
        <tr>
            <td colspan="6" style="text-align: center; padding: 24px; color: #64748b; font-style: italic;">
                No student outpass records recorded for today.
            </td>
        </tr>
        """
    else:
        for idx, op in enumerate(outpasses, 1):
            status = op['final_status']
            if status in ('approved', 'used'):
                if op.get('actual_exit_time') and not op.get('actual_entry_time'):
                    status_badge = '<span style="background: #fef3c7; color: #d97706; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">OUTSIDE CAMPUS</span>'
                elif op.get('actual_entry_time'):
                    status_badge = '<span style="background: #e0e7ff; color: #4338ca; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">RETURNED</span>'
                else:
                    status_badge = '<span style="background: #dcfce7; color: #15803d; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">APPROVED</span>'
            elif status == 'pending':
                status_badge = '<span style="background: #fef3c7; color: #b45309; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">PENDING</span>'
            else:
                status_badge = '<span style="background: #fee2e2; color: #b91c1c; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">REJECTED</span>'

            row_bg = "#ffffff" if idx % 2 != 0 else "#f8fafc"
            exit_t = format_time_str(op['actual_exit_time'].strftime('%H:%M') if op.get('actual_exit_time') else op['out_time'])

            rows_html += f"""
            <tr style="background: {row_bg}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 16px; font-size: 13px; color: #1e293b; font-weight: 600;">
                    {op['student_name']}<br>
                    <span style="font-size: 11px; color: #64748b; font-weight: normal; font-family: monospace;">{op['registration_no'] or 'N/A'}</span>
                </td>
                <td style="padding: 12px 16px; font-size: 13px; color: #334155;">
                    Year {op['academic_year'] or 'N/A'}
                </td>
                <td style="padding: 12px 16px; font-size: 13px; color: #334155;">
                    {op['reason'] or 'Personal Work'}
                    {f'<br><span style="font-size: 11px; color: #64748b;">📍 {op["destination"]}</span>' if op.get('destination') else ''}
                </td>
                <td style="padding: 12px 16px; font-size: 13px; color: #334155;">
                    {exit_t}
                </td>
                <td style="padding: 12px 16px; font-size: 13px; color: #334155;">
                    {format_time_str(op['expected_return_time'])}
                </td>
                <td style="padding: 12px 16px; text-align: center;">
                    {status_badge}
                </td>
            </tr>
            """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Daily Outpass Report</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
        <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 28px; color: #ffffff;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #38bdf8; margin-bottom: 8px;">
                    Smart Outpass Management System
                </div>
                <h1 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 800; color: #ffffff;">
                    Daily Outpass Report: {dept_name}
                </h1>
                <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                    Report Date: <strong>{date_formatted}</strong> | Sent automatically at 04:10 PM IST
                </p>
            </div>

            <!-- Greeting -->
            <div style="padding: 24px 28px 16px 28px;">
                <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.5;">
                    Respected <strong>{hod_name}</strong>,<br>
                    Here is the daily summary report of all student outpasses for the Department of <strong>{dept_name}</strong> for today.
                </p>
            </div>

            <!-- Summary Cards -->
            <div style="padding: 0 28px 24px 28px;">
                <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    <tr>
                        <td width="25%" style="padding: 4px;">
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
                                <div style="font-size: 22px; font-weight: 800; color: #0f172a;">{total_count}</div>
                                <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px;">Total Passes</div>
                            </div>
                        </td>
                        <td width="25%" style="padding: 4px;">
                            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; text-align: center;">
                                <div style="font-size: 22px; font-weight: 800; color: #166534;">{approved_count}</div>
                                <div style="font-size: 11px; color: #15803d; font-weight: 600; text-transform: uppercase; margin-top: 2px;">Approved</div>
                            </div>
                        </td>
                        <td width="25%" style="padding: 4px;">
                            <div style="background: #fffbe6; border: 1px solid #ffe58f; border-radius: 12px; padding: 14px; text-align: center;">
                                <div style="font-size: 22px; font-weight: 800; color: #d97706;">{currently_outside}</div>
                                <div style="font-size: 11px; color: #b45309; font-weight: 600; text-transform: uppercase; margin-top: 2px;">Now Outside</div>
                            </div>
                        </td>
                        <td width="25%" style="padding: 4px;">
                            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px; text-align: center;">
                                <div style="font-size: 22px; font-weight: 800; color: #991b1b;">{pending_count}</div>
                                <div style="font-size: 11px; color: #b91c1c; font-weight: 600; text-transform: uppercase; margin-top: 2px;">Pending</div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Outpass Table -->
            <div style="padding: 0 28px 28px 28px;">
                <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">
                    Student Outpass Details ({date_formatted})
                </h3>
                <div style="border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f1f5f9; text-align: left;">
                                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Student</th>
                                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Year</th>
                                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Reason</th>
                                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Out Time</th>
                                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase;">Return Time</th>
                                <th style="padding: 12px 16px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows_html}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
                <p style="margin: 0 0 4px 0;">
                    This is an automated daily report sent to HOD at 04:10 PM following college end time (04:05 PM).
                </p>
                <p style="margin: 0;">
                    Smart Outpass System &copy; {datetime.now().year} | Department of {dept_name}
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    # Plain text version fallback
    text_content = f"""
    Smart Outpass System - Daily Outpass Report
    Department: {dept_name}
    Date: {date_formatted}
    HOD: {hod_name}

    SUMMARY STATISTICS:
    - Total Outpass Requests: {total_count}
    - Approved: {approved_count}
    - Currently Outside Campus: {currently_outside}
    - Pending: {pending_count}

    DETAILS:
    """ + "\n".join([
        f"- {op['student_name']} ({op['registration_no']}): {op['reason']} | Out: {format_time_str(op['out_time'])} | Return: {format_time_str(op['expected_return_time'])} | Status: {op['final_status']}"
        for op in outpasses
    ])

    return {
        'subject': subject,
        'html_content': html_content,
        'text_content': text_content,
        'dept_name': dept_name,
        'hod_name': hod_name,
        'hod_email': hod_email,
        'stats': {
            'total': total_count,
            'approved': approved_count,
            'pending': pending_count,
            'currently_outside': currently_outside
        }
    }


def send_email_via_smtp(to_email, subject, html_content, text_content=None):
    """
    Sends an email using configured SMTP settings (Gmail or standard SMTP).
    Falls back gracefully to logging simulation if SMTP is not configured.
    """
    smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    smtp_user = os.environ.get("SMTP_USER") or os.environ.get("SMTP_EMAIL") or os.environ.get("GMAIL_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD") or os.environ.get("GMAIL_APP_PASSWORD")
    sender_name = os.environ.get("SMTP_FROM_NAME", "Smart Outpass System")

    if not to_email:
        print("⚠️ Email dispatch skipped: Target email address is empty.")
        return False, "Recipient email address is missing"

    if not smtp_user or not smtp_password:
        print(f"⚠️ SMTP credentials missing in environment. Simulating daily report email to {to_email}:")
        print(f"   Subject: {subject}")
        return True, "Simulated email sending (SMTP_EMAIL / SMTP_PASSWORD not configured)"

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{sender_name} <{smtp_user}>"
        msg['To'] = to_email

        if text_content:
            msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))

        # Connect to SMTP server (TLS)
        server = smtplib.SMTP(smtp_server, smtp_port, timeout=10)
        server.ehlo()
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, [to_email], msg.as_string())
        server.quit()

        print(f"✅ Daily HOD Outpass Report email successfully delivered to {to_email} via SMTP")
        return True, "Email sent successfully"

    except Exception as e:
        print(f"❌ Error sending daily report email to {to_email}: {e}")
        return False, str(e)


def dispatch_daily_hod_reports(target_date=None):
    """
    Finds all active departments with HOD email addresses and dispatches the daily report email.
    """
    if not target_date:
        target_date = get_ist_now().strftime('%Y-%m-%d')

    conn = get_db_connection()
    if not conn:
        return {'success': False, 'message': 'Database connection failed'}

    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT d.dept_id, d.dept_name, u.email as hod_email, u.full_name as hod_name
        FROM departments d
        JOIN users u ON u.dept_id = d.dept_id
        WHERE u.role = 'hod' AND u.is_active = TRUE
    """)
    hod_list = cursor.fetchall()
    cursor.close()
    conn.close()

    results = []
    sent_count = 0

    for hod in hod_list:
        try:
            report = generate_department_daily_report(hod['dept_id'], target_date)
            email_target = hod['hod_email']
            
            success, msg = send_email_via_smtp(
                to_email=email_target,
                subject=report['subject'],
                html_content=report['html_content'],
                text_content=report['text_content']
            )

            if success:
                sent_count += 1

            results.append({
                'dept_id': hod['dept_id'],
                'dept_name': hod['dept_name'],
                'hod_name': hod['hod_name'],
                'hod_email': email_target,
                'status': 'sent' if success else 'failed',
                'details': msg
            })
        except Exception as e:
            print(f"Failed to dispatch daily report for dept {hod['dept_name']}: {e}")
            results.append({
                'dept_id': hod['dept_id'],
                'dept_name': hod['dept_name'],
                'status': 'failed',
                'details': str(e)
            })

    return {
        'success': True,
        'target_date': target_date,
        'total_departments': len(hod_list),
        'sent_count': sent_count,
        'results': results
    }
