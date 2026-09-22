"""
AI-Powered Outpass Report Service
Calculates verified statistical metrics from database records and interfaces with AI models for administrative synthesis.
"""

import os
import json
import requests
from datetime import datetime, timedelta
from collections import Counter

def get_ist_now():
    """Get current time in IST (+05:30)"""
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

def check_is_late(out_date, expected_return_time, actual_entry_time):
    """Check if entry is late beyond scheduled in_time"""
    if not actual_entry_time or not expected_return_time:
        return False
    try:
        if isinstance(out_date, str):
            out_date = datetime.strptime(out_date, '%Y-%m-%d').date()
        elif hasattr(out_date, 'date'):
            out_date = out_date.date()
            
        if isinstance(expected_return_time, timedelta):
            total_seconds = int(expected_return_time.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            expected_dt = datetime.combine(out_date, datetime.min.time().replace(hour=hours % 24, minute=minutes))
        elif isinstance(expected_return_time, str):
            t_parts = expected_return_time.split(':')
            h, m = int(t_parts[0]), int(t_parts[1])
            expected_dt = datetime.combine(out_date, datetime.min.time().replace(hour=h, minute=m))
        elif hasattr(expected_return_time, 'hour'):
            expected_dt = datetime.combine(out_date, expected_return_time)
        else:
            return False
            
        if expected_dt.time().hour == 23 and expected_dt.time().minute == 59:
            return False
            
        return actual_entry_time > expected_dt
    except Exception:
        return False

def calculate_outpass_stats(records):
    """
    Computes reliable, factual statistics from a list of outpass record dictionaries.
    All figures are derived directly from the database; the AI never invents numerical data.
    """
    total = len(records)
    if total == 0:
        return {
            'total_requests': 0,
            'approved': 0,
            'rejected': 0,
            'pending': 0,
            'cancelled_expired': 0,
            'currently_outside': 0,
            'total_returned': 0,
            'late_returns': 0,
            'punctual_returns': 0,
            'avg_approval_time_minutes': None,
            'avg_return_delay_minutes': None,
            'top_reasons': [],
            'peak_departure_hours': 'None recorded',
            'year_breakdown': {},
            'dept_breakdown': {}
        }

    approved = 0
    rejected = 0
    pending = 0
    cancelled_expired = 0
    currently_outside = 0
    total_returned = 0
    late_returns = 0
    punctual_returns = 0
    
    approval_durations = []
    late_delays = []
    reasons = []
    departure_hours = []
    year_counter = Counter()
    dept_counter = Counter()

    for r in records:
        status = (r.get('final_status') or 'pending').lower()
        if status in ('approved', 'used'):
            approved += 1
        elif status == 'rejected':
            rejected += 1
        elif status == 'pending':
            pending += 1
        elif status == 'expired':
            cancelled_expired += 1

        # Movement tracking
        exit_time = r.get('actual_exit_time')
        entry_time = r.get('actual_entry_time')

        if exit_time and not entry_time:
            currently_outside += 1
        elif entry_time:
            total_returned += 1
            exp_t = r.get('expected_return_time') or r.get('in_time')
            is_late = check_is_late(r.get('out_date'), exp_t, entry_time)
            if is_late:
                late_returns += 1
                # Calculate return delay in minutes if possible
                try:
                    out_date = r.get('out_date')
                    if isinstance(out_date, str):
                        out_date = datetime.strptime(out_date, '%Y-%m-%d').date()
                    elif hasattr(out_date, 'date'):
                        out_date = out_date.date()
                    if isinstance(exp_t, timedelta):
                        tot = int(exp_t.total_seconds())
                        exp_dt = datetime.combine(out_date, datetime.min.time().replace(hour=(tot // 3600) % 24, minute=(tot % 3600) // 60))
                    elif isinstance(exp_t, str):
                        pts = exp_t.split(':')
                        exp_dt = datetime.combine(out_date, datetime.min.time().replace(hour=int(pts[0]), minute=int(pts[1])))
                    elif hasattr(exp_t, 'hour'):
                        exp_dt = datetime.combine(out_date, exp_t)
                    else:
                        exp_dt = None

                    if exp_dt and entry_time > exp_dt:
                        delay_min = (entry_time - exp_dt).total_seconds() / 60
                        if 0 < delay_min < 1440: # within 24h
                            late_delays.append(delay_min)
                except Exception:
                    pass
            else:
                punctual_returns += 1

        # Approval time calculation
        created_at = r.get('created_at')
        action_time = r.get('advisor_action_time') or r.get('hod_action_time')
        if created_at and action_time and action_time >= created_at:
            dur_minutes = (action_time - created_at).total_seconds() / 60
            if dur_minutes >= 0:
                approval_durations.append(dur_minutes)

        # Reasons
        reason_str = (r.get('reason') or '').strip()
        if reason_str:
            reasons.append(reason_str)

        # Peak hours analysis (from actual exit time or scheduled out_time)
        time_for_hour = exit_time or r.get('out_time')
        if time_for_hour:
            try:
                if hasattr(time_for_hour, 'hour'):
                    departure_hours.append(time_for_hour.hour)
                elif isinstance(time_for_hour, timedelta):
                    departure_hours.append(int(time_for_hour.total_seconds() // 3600) % 24)
                elif isinstance(time_for_hour, str):
                    h = int(time_for_hour.split(':')[0])
                    departure_hours.append(h)
            except Exception:
                pass

        # Year and Department breakdowns
        y = r.get('academic_year')
        if y:
            year_counter[f"Year {y}"] += 1
        elif r.get('year'):
            year_counter[f"Year {r['year']}"] += 1
        
        dept = r.get('dept_name') or r.get('dept_code')
        if dept:
            dept_counter[dept] += 1

    # Aggregate averages
    avg_approval_time = round(sum(approval_durations) / len(approval_durations), 1) if approval_durations else None
    avg_return_delay = round(sum(late_delays) / len(late_delays), 1) if late_delays else None

    # Top reasons (limit to 5)
    top_reasons_list = [{'reason': reason, 'count': count} for reason, count in Counter(reasons).most_common(5)]

    # Peak departure window
    if departure_hours:
        hour_counts = Counter(departure_hours)
        peak_hour, _ = hour_counts.most_common(1)[0]
        start_ampm = "AM" if peak_hour < 12 else "PM"
        end_hour = (peak_hour + 2) % 24
        end_ampm = "AM" if end_hour < 12 else "PM"
        
        disp_start = peak_hour if 1 <= peak_hour <= 12 else (peak_hour - 12 if peak_hour > 12 else 12)
        disp_end = end_hour if 1 <= end_hour <= 12 else (end_hour - 12 if end_hour > 12 else 12)
        peak_window = f"{disp_start}:00 {start_ampm} - {disp_end}:00 {end_ampm}"
    else:
        peak_window = "No specific peak window"

    return {
        'total_requests': total,
        'approved': approved,
        'rejected': rejected,
        'pending': pending,
        'cancelled_expired': cancelled_expired,
        'currently_outside': currently_outside,
        'total_returned': total_returned,
        'late_returns': late_returns,
        'punctual_returns': punctual_returns,
        'avg_approval_time_minutes': avg_approval_time,
        'avg_return_delay_minutes': avg_return_delay,
        'top_reasons': top_reasons_list,
        'peak_departure_hours': peak_window,
        'year_breakdown': dict(year_counter),
        'dept_breakdown': dict(dept_counter)
    }


def generate_deterministic_insights(stats):
    """
    Generates structured factual insights from database statistics.
    Used for clean baseline reporting and fallback when the external AI is unreachable.
    """
    insights = []
    
    total = stats.get('total_requests', 0)
    if total == 0:
        return [
            "No outpass records found for the chosen date period.",
            "All campus residents remained accounted for on campus during this timeframe."
        ]

    # 1. Approval and resolution rate
    approved = stats.get('approved', 0)
    app_rate = round((approved / total) * 100) if total > 0 else 0
    insights.append(f"Approval efficiency: {app_rate}% of requests ({approved} of {total}) were granted.")

    # 2. Late returns & movement tracking
    late = stats.get('late_returns', 0)
    outside = stats.get('currently_outside', 0)
    if outside > 0:
        insights.append(f"Active departures: {outside} student(s) currently outside campus grounds.")
    if late > 0:
        delay_msg = f" (average delay: {stats['avg_return_delay_minutes']} mins)" if stats.get('avg_return_delay_minutes') else ""
        insights.append(f"Late return alert: {late} student(s) returned after permitted gate hours{delay_msg}.")
    else:
        insights.append("Punctuality: 100% of returning students reported back within permitted hours.")

    # 3. Peak hours
    if stats.get('peak_departure_hours'):
        insights.append(f"Peak departure window: {stats['peak_departure_hours']}.")

    # 4. Top reasons
    if stats.get('top_reasons'):
        top_r = stats['top_reasons'][0]
        insights.append(f"Primary departure reason: '{top_r['reason']}' ({top_r['count']} requests).")

    # 5. Average approval speed
    if stats.get('avg_approval_time_minutes') is not None:
        mins = stats['avg_approval_time_minutes']
        time_text = f"{int(mins)} minutes" if mins < 60 else f"{round(mins / 60, 1)} hours"
        insights.append(f"Average administrative turnaround: {time_text} from student submission to authorization.")

    return insights


def generate_ai_summary(stats, period_label, scope_label):
    """
    Sends verified statistics to the configured AI model for an administrative summary.
    Falls back gracefully if the API key is missing or the external service times out.
    """
    api_key = os.environ.get("AI_API_KEY") or os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY")
    fallback_insights = generate_deterministic_insights(stats)

    # Empty data handling
    if stats.get('total_requests', 0) == 0:
        return {
            'ai_summary': f"During the period '{period_label}', no outpass applications were logged for {scope_label}. All institutional safety and attendance parameters remained within expected baselines.",
            'key_insights': fallback_insights,
            'source': 'system'
        }

    # If no AI API key is configured, provide graceful deterministic summary
    if not api_key:
        summary_text = (
            f"AI summary is temporarily unavailable (no AI_API_KEY configured). "
            f"The report statistics are fully available: A total of {stats['total_requests']} requests were recorded "
            f"for {scope_label} during {period_label}. {stats['approved']} were approved ({round((stats['approved']/stats['total_requests'])*100)}%), "
            f"{stats['rejected']} rejected, and {stats['pending']} remain pending. "
            f"{stats['late_returns']} return(s) exceeded permitted hours."
        )
        return {
            'ai_summary': summary_text,
            'key_insights': fallback_insights,
            'source': 'fallback'
        }

    # Construct prompt with verified data only
    prompt = f"""You are an institutional administrator analyzing verified student outpass records for {scope_label} over the period: {period_label}.

VERIFIED DATABASE STATISTICS (DO NOT ALTER OR INVENT ANY NUMBERS):
- Total Requests: {stats['total_requests']}
- Approved Requests: {stats['approved']}
- Rejected Requests: {stats['rejected']}
- Pending Requests: {stats['pending']}
- Expired/Cancelled: {stats['cancelled_expired']}
- Currently Outside Campus: {stats['currently_outside']}
- Total Returned Students: {stats['total_returned']}
- Late Returns: {stats['late_returns']}
- Punctual Returns: {stats['punctual_returns']}
- Average Approval Time: {stats['avg_approval_time_minutes']} minutes
- Average Return Delay: {stats['avg_return_delay_minutes']} minutes
- Peak Departure Window: {stats['peak_departure_hours']}
- Top Reasons: {json.dumps(stats['top_reasons'])}
- Year Breakdown: {json.dumps(stats['year_breakdown'])}
- Department Breakdown: {json.dumps(stats['dept_breakdown'])}

INSTRUCTIONS:
1. Write a professional, concise executive administrative summary (2-3 paragraphs). Highlight overall volume, approval efficiency, exit/entry compliance, and any late return concerns.
2. Provide 3 to 5 bulleted key insights.
3. You must NOT make disciplinary actions, approve/reject passes, or invent any numerical values. Only synthesize the provided statistics.
4. Output your response in valid JSON with this exact structure:
{{
  "summary": "...",
  "key_insights": [
    "Insight 1...",
    "Insight 2...",
    "Insight 3..."
  ]
}}
"""

    try:
        # Check if Google Gemini API key or standard endpoint
        if os.environ.get("OPENAI_API_KEY") and not (os.environ.get("AI_API_KEY") or os.environ.get("GEMINI_API_KEY")):
            # OpenAI format
            headers = {
                "Authorization": f"Bearer {os.environ.get('OPENAI_API_KEY')}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": os.environ.get("AI_MODEL", "gpt-4o-mini"),
                "messages": [
                    {"role": "system", "content": "You are a professional educational institution data analyst."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2
            }
            resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=8)
            resp.raise_for_status()
            content = resp.json()['choices'][0]['message']['content']
        else:
            # Google Gemini format (v1beta)
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "parts": [{"text": prompt}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 1000
                }
            }
            resp = requests.post(gemini_url, json=payload, timeout=8)
            resp.raise_for_status()
            data = resp.json()
            content = data['candidates'][0]['content']['parts'][0]['text']

        # Parse JSON from content (strip markdown backticks if present)
        cleaned_content = content.strip()
        if cleaned_content.startswith('```json'):
            cleaned_content = cleaned_content[7:]
        elif cleaned_content.startswith('```'):
            cleaned_content = cleaned_content[3:]
        if cleaned_content.endswith('```'):
            cleaned_content = cleaned_content[:-3]
        cleaned_content = cleaned_content.strip()

        parsed = json.loads(cleaned_content)
        summary = parsed.get('summary', '').strip()
        insights = parsed.get('key_insights', [])

        if not summary:
            raise ValueError("Empty summary returned by AI")

        return {
            'ai_summary': summary,
            'key_insights': insights if insights else fallback_insights,
            'source': 'ai'
        }

    except Exception as e:
        print(f"[WARN] AI report generation fallback: {e}")
        return {
            'ai_summary': f"AI summary is temporarily unavailable. The report statistics are still available. (Analyzed {stats['total_requests']} requests for {period_label} with {stats['approved']} approvals and {stats['late_returns']} late returns).",
            'key_insights': fallback_insights,
            'source': 'fallback'
        }


def get_date_range(period, custom_start=None, custom_end=None):
    """
    Computes (start_date, end_date, period_label) based on period keyword or custom dates.
    Returns strings in 'YYYY-MM-DD' format and a human-readable period label.
    """
    now = get_ist_now().date()
    period = (period or 'today').lower().strip()

    if period == 'today':
        return now.strftime('%Y-%m-%d'), now.strftime('%Y-%m-%d'), f"Today ({now.strftime('%d %b %Y')})"
    elif period == 'yesterday':
        yest = now - timedelta(days=1)
        return yest.strftime('%Y-%m-%d'), yest.strftime('%Y-%m-%d'), f"Yesterday ({yest.strftime('%d %b %Y')})"
    elif period == 'this_week':
        # Start of current week (Monday)
        start_week = now - timedelta(days=now.weekday())
        return start_week.strftime('%Y-%m-%d'), now.strftime('%Y-%m-%d'), f"This Week ({start_week.strftime('%d %b')} - {now.strftime('%d %b %Y')})"
    elif period == 'this_month':
        start_month = now.replace(day=1)
        return start_month.strftime('%Y-%m-%d'), now.strftime('%Y-%m-%d'), f"This Month ({now.strftime('%B %Y')})"
    elif period == 'custom':
        s = custom_start or now.strftime('%Y-%m-%d')
        e = custom_end or now.strftime('%Y-%m-%d')
        return s, e, f"Custom Range ({s} to {e})"
    else:
        return now.strftime('%Y-%m-%d'), now.strftime('%Y-%m-%d'), f"Today ({now.strftime('%d %b %Y')})"
