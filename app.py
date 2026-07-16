import os
import sqlite3
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from werkzeug.security import check_password_hash, generate_password_hash
from dotenv import load_dotenv
import google.generativeai as genai
from database import get_db, init_db

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "student-support-secret-key-12345")

# Initialize database
init_db()

# Configure Gemini AI
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    try:
        genai.configure(api_key=api_key)
        # Using the standard gemini-3.5-flash model
        model = genai.GenerativeModel('gemini-3.5-flash')
        print("Gemini API configured successfully.")
    except Exception as e:
        print(f"Error configuring Gemini: {e}")
        model = None
else:
    print("Warning: GEMINI_API_KEY not found in environment. Chatbot will run in Demo Mode.")
    model = None

gemini_error_status = None

# Helper to verify login and roles
def login_required(role=None):
    def decorator(f):
        from functools import wraps
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return redirect(url_for('login'))
            if role and session.get('role') != role:
                flash("Unauthorized access.", "danger")
                return redirect(url_for('login'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# --- Page Routes ---

@app.route('/')
def index():
    if 'user_id' in session:
        if session['role'] == 'admin':
            return redirect(url_for('admin_dashboard'))
        return redirect(url_for('student_dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        conn.close()
        
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            session['full_name'] = user['full_name']
            
            if user['role'] == 'admin':
                return redirect(url_for('admin_dashboard'))
            return redirect(url_for('student_dashboard'))
        
        flash("Invalid username or password.", "danger")
    return render_template('login.html')

@app.route('/register', methods=['POST'])
def register():
    username = request.form.get('username')
    password = request.form.get('password')
    full_name = request.form.get('full_name')
    roll_number = request.form.get('roll_number')
    course = request.form.get('course')
    semester = request.form.get('semester')
    
    if not username or not password or not full_name:
        flash("Username, password, and full name are required.", "danger")
        return redirect(url_for('login'))
        
    hashed_password = generate_password_hash(password)
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (username, password, role, full_name, roll_number, course, semester, attendance_pct, fees_due, fees_paid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (username, hashed_password, 'student', full_name, roll_number, course, semester, 0.0, 45000.0, 0.0))
        conn.commit()
        flash("Registration successful. Please log in.", "success")
    except sqlite3.IntegrityError:
        flash("Username or Roll Number already exists.", "danger")
    finally:
        conn.close()
        
    return redirect(url_for('login'))

@app.route('/logout')
def logout():
    session.clear()
    flash("Successfully logged out.", "success")
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required('student')
def student_dashboard():
    return render_template('dashboard.html', username=session.get('username'), full_name=session.get('full_name'))

@app.route('/admin')
@login_required('admin')
def admin_dashboard():
    return render_template('admin.html', username=session.get('username'), full_name=session.get('full_name'))

# --- Student API Endpoints ---

@app.route('/api/student/profile')
@login_required('student')
def api_student_profile():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (session['user_id'],))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return jsonify({
            'full_name': user['full_name'],
            'roll_number': user['roll_number'],
            'course': user['course'],
            'semester': user['semester'],
            'attendance_pct': user['attendance_pct'],
            'fees_due': user['fees_due'],
            'fees_paid': user['fees_paid']
        })
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/student/notices')
@login_required('student')
def api_student_notices():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notices ORDER BY date_posted DESC LIMIT 10")
    notices = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(notices)

@app.route('/api/student/exams')
@login_required('student')
def api_student_exams():
    conn = get_db()
    cursor = conn.cursor()
    # Check current student's course to match syllabus subjects
    cursor.execute("SELECT course FROM users WHERE id = ?", (session['user_id'],))
    user_course = cursor.fetchone()['course']
    
    # Get subjects in their course/semester syllabus to filter exams, or show all
    cursor.execute("SELECT subject FROM syllabus WHERE course = ?", (user_course,))
    subjects = [row['subject'] for row in cursor.fetchall()]
    
    if subjects:
        placeholders = ','.join('?' for _ in subjects)
        cursor.execute(f"SELECT * FROM exams WHERE subject IN ({placeholders}) ORDER BY exam_date ASC", subjects)
    else:
        cursor.execute("SELECT * FROM exams ORDER BY exam_date ASC")
        
    exams = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(exams)

@app.route('/api/student/syllabus')
@login_required('student')
def api_student_syllabus():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT course, semester FROM users WHERE id = ?", (session['user_id'],))
    user = cursor.fetchone()
    
    cursor.execute("SELECT * FROM syllabus WHERE course = ? AND semester = ?", (user['course'], user['semester']))
    syllabus = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(syllabus)

@app.route('/api/student/assignments')
@login_required('student')
def api_student_assignments():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM assignments WHERE student_id = ? ORDER BY due_date ASC", (session['user_id'],))
    assignments = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(assignments)

@app.route('/api/student/assignments/toggle', methods=['POST'])
@login_required('student')
def api_student_assignments_toggle():
    data = request.json
    assignment_id = data.get('id')
    new_status = data.get('status') # 'Pending' or 'Submitted'
    
    if new_status not in ('Pending', 'Submitted'):
        return jsonify({'error': 'Invalid status'}), 400
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE assignments SET status = ? WHERE id = ? AND student_id = ?", (new_status, assignment_id, session['user_id']))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    
    return jsonify({'success': success})

@app.route('/api/student/grades')
@login_required('student')
def api_student_grades():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM grades WHERE student_id = ?", (session['user_id'],))
    grades = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(grades)

@app.route('/api/student/faqs')
@login_required('student')
def api_student_faqs():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM faqs ORDER BY category")
    faqs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(faqs)

@app.route('/api/student/chat/history')
@login_required('student')
def api_student_chat_history():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chat_history WHERE user_id = ? ORDER BY timestamp ASC LIMIT 50", (session['user_id'],))
    history = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(history)

@app.route('/api/student/chat/clear', methods=['POST'])
@login_required('student')
def api_student_chat_clear():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_history WHERE user_id = ?", (session['user_id'],))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# --- AI Chatbot Core Route ---

@app.route('/api/student/chat', methods=['POST'])
@login_required('student')
def api_student_chat():
    global model, gemini_error_status
    user_message = request.json.get('message', '').strip()
    if not user_message:
        return jsonify({'error': 'Empty message'}), 400
        
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Fetch Student Details
    cursor.execute("SELECT * FROM users WHERE id = ?", (session['user_id'],))
    student = cursor.fetchone()
    
    # 2. Fetch notices
    cursor.execute("SELECT title, content, category, date_posted FROM notices ORDER BY date_posted DESC LIMIT 5")
    notices_list = cursor.fetchall()
    notices_str = "; ".join([f"[{n['category']}] {n['title']}: {n['content']} (posted {n['date_posted']})" for n in notices_list])
    
    # 3. Fetch exams matching course
    cursor.execute("SELECT subject, exam_date, time, room FROM exams ORDER BY exam_date ASC")
    exams_list = cursor.fetchall()
    exams_str = "; ".join([f"{e['subject']} on {e['exam_date']} at {e['time']} in {e['room']}" for e in exams_list])
    
    # 4. Fetch assignments
    cursor.execute("SELECT title, description, due_date, status FROM assignments WHERE student_id = ?", (session['user_id'],))
    assign_list = cursor.fetchall()
    assign_str = "; ".join([f"'{a['title']}' ({a['description']}) due {a['due_date']} - Status: {a['status']}" for a in assign_list])
    
    # 5. Fetch FAQs
    cursor.execute("SELECT question, answer FROM faqs LIMIT 10")
    faqs_list = cursor.fetchall()
    faqs_str = "; ".join([f"Q: {f['question']} A: {f['answer']}" for f in faqs_list])
    
    # 6. Fetch Syllabus
    cursor.execute("SELECT subject, topics FROM syllabus WHERE course = ? AND semester = ?", (student['course'], student['semester']))
    syllabus_list = cursor.fetchall()
    syllabus_str = "; ".join([f"Subject: {s['subject']}, Topics: {s['topics']}" for s in syllabus_list])

    # 7. Fetch Grades
    cursor.execute("SELECT subject, marks, grade, credits FROM grades WHERE student_id = ?", (session['user_id'],))
    grades_list = cursor.fetchall()
    grades_str = "; ".join([f"{g['subject']}: Marks {g['marks']}, Grade {g['grade']}, Credits {g['credits']}" for g in grades_list])

    # Assemble Context
    context = f"""
    You are the official AI Student Support Chatbot for the college campus.
    Here is the official college system data for the logged-in student:
    - **Current Student**: {student['full_name']}
    - **Roll Number**: {student['roll_number']}
    - **Course/Branch**: {student['course']}
    - **Semester**: {student['semester']}
    - **Attendance Percentage**: {student['attendance_pct']}% (Note: Minimum required is 75%)
    - **Fee Status**: Paid: ${student['fees_paid']}, Outstanding Balance Due: ${student['fees_due']}
    - **Academic Grades / Results**: {grades_str if grades_str else "No grades registered yet."}
    
    **Latest College Notices**: {notices_str if notices_str else "No current notices."}
    **Upcoming Exam Schedule**: {exams_str if exams_str else "No exams scheduled."}
    **Student's Assignments**: {assign_str if assign_str else "No assignments active."}
    **Course Syllabus**: {syllabus_str if syllabus_str else "Syllabus not found."}
    **General FAQs**: {faqs_str}
    
    Instructions:
    1. Respond friendly, professionally, and keep answers relatively concise.
    2. Address the student by their name, {student['full_name']}, when appropriate.
    3. Always prioritize answering college-specific queries using the provided system data.
    4. If they ask about attendance, syllabus, exam dates, notice board, assignments, fees, or grades/results/CGPA, query the context data first.
    5. If a query is academic or technical (e.g., "explain normal forms in databases", "write a quicksort program"), explain it using your general knowledge since you are an educational tutor as well.
    6. If the student asks for details not found in the context and it's not a general knowledge question, politely tell them to visit the Admin Panel or contact college administration.
    7. CRITICAL: You MUST prefix every response with the exact phrase "Welcome to the Prince AI Student Chatbot: " at the very beginning of your response.
    """

    bot_response = ""
    
    # AI Generation
    if model:
        try:
            # We can pass chat history if we want, but for simplicity we inject the system instruction + context as a prompt
            # Check previous 5 messages from chat history for continuity
            cursor.execute("SELECT message, response FROM chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 5", (session['user_id'],))
            history_rows = cursor.fetchall()[::-1] # reverse to chronological
            
            chat_context = []
            for row in history_rows:
                chat_context.append(f"User: {row['message']}")
                chat_context.append(f"Bot: {row['response']}")
            
            history_str = "\n".join(chat_context)
            
            prompt = f"{context}\n\nChat History:\n{history_str}\n\nUser: {user_message}\nBot:"
            response = model.generate_content(prompt)
            bot_response = response.text
        except Exception as e:
            print(f"Gemini API Error: {e}")
            if "quota" in str(e).lower() or "429" in str(e):
                gemini_error_status = "quota_exceeded"
            elif "api_key_invalid" in str(e).lower() or "api key" in str(e).lower() or "not found" in str(e).lower():
                gemini_error_status = "invalid_key"
            else:
                gemini_error_status = "network_error"
            bot_response = "Error communicating with AI. Running local query search instead..."
            model = None # Trigger fallback

    # Fallback/Demo Mock Response Engine
    if not model or "Error communicating with AI" in bot_response:
        msg_lower = user_message.lower()
        if "attendance" in msg_lower or "percent" in msg_lower or "present" in msg_lower:
            status_comment = "which is safe and above the 75% bar. Keep attending your classes!" if student['attendance_pct'] >= 75 else "which is below the mandatory 75%. Please attend classes regularly to avoid being debarred!"
            bot_response = f"Hello {student['full_name']}, your attendance stands at **{student['attendance_pct']}%**, {status_comment}"
        elif "exam" in msg_lower or "schedule" in msg_lower or "test" in msg_lower or "date" in msg_lower:
            bot_response = f"Sure! Based on your enrolled course, here is the upcoming schedule:\n\n"
            for exam in exams_list:
                bot_response += f"• **{exam['subject']}**: {exam['exam_date']} ({exam['time']}) - Room {exam['room']}\n"
        elif "fee" in msg_lower or "due" in msg_lower or "payment" in msg_lower or "balance" in msg_lower:
            bot_response = f"Hello {student['full_name']}. Your outstanding balance is **${student['fees_due']}**. You have paid **${student['fees_paid']}** so far. The deadline to clear fees is July 30, 2026."
        elif "assignment" in msg_lower or "homework" in msg_lower or "task" in msg_lower:
            bot_response = f"Here is the list of your assignments:\n\n"
            for assign in assign_list:
                status_icon = "✅ Submitted" if assign['status'] == 'Submitted' else "⚠️ Pending"
                bot_response += f"• **{assign['title']}** - Due: {assign['due_date']} ({status_icon})\n"
        elif "syllabus" in msg_lower or "subject" in msg_lower or "topic" in msg_lower:
            bot_response = f"Here is the syllabus information for **{student['course']} - {student['semester']}**:\n\n"
            for s in syllabus_list:
                bot_response += f"• **{s['subject']}**:\n  _Topics_: {s['topics']}\n\n"
        elif "notice" in msg_lower or "announcement" in msg_lower or "alert" in msg_lower:
            bot_response = "Here are the latest college notices:\n\n"
            for n in notices_list:
                bot_response += f"🔔 **[{n['category']}] {n['title']}**\n   {n['content']}\n\n"
        elif "faq" in msg_lower or "help" in msg_lower:
            bot_response = "Here are some quick answers from the FAQ list:\n\n"
            for f in faqs_list[:3]:
                bot_response += f"**Q: {f['question']}**\n**A:** {f['answer']}\n\n"
        elif any(kw in msg_lower for kw in ["grade", "result", "cgpa", "marks"]):
            bot_response = f"Sure {student['full_name']}, here is your current mark sheet:\n\n"
            total_points = 0
            total_credits = 0
            gp = {"O": 10, "A+": 9, "A": 8, "B+": 7, "B": 6, "C": 5, "F": 0}
            for g in grades_list:
                bot_response += f"• **{g['subject']}**: Marks: {g['marks']}, Grade: {g['grade']} (Credits: {g['credits']})\n"
                points = gp.get(g['grade'], 8)
                total_points += points * g['credits']
                total_credits += g['credits']
            cgpa = round(total_points / total_credits, 2) if total_credits > 0 else 0.0
            bot_response += f"\n**Current CGPA (SGPA)**: {cgpa} / 10.0"
        elif any(greeting in msg_lower for greeting in ["hi", "hello", "hey", "greetings"]):
            bot_response = f"Hello {student['full_name']}! I am your AI Student Support Assistant. How can I help you today? You can ask me about your exams, fees, assignments, attendance, or syllabus."
        else:
            if gemini_error_status == "quota_exceeded":
                bot_response = f"I am running in **Offline Mode** because the daily Google Gemini Free Tier request limit (20 requests/day) has been exceeded for this API key. I can still answer specific college queries containing keywords like 'attendance', 'exams', 'fees', 'notices', or 'assignments'. To resume live AI generation, please wait for the daily quota reset or use a billing-enabled key."
            elif gemini_error_status == "invalid_key":
                bot_response = f"I am running in **Offline Mode** because the provided `GEMINI_API_KEY` was rejected by Google servers. Please check your key configuration in the `.env` file."
            elif gemini_error_status == "network_error":
                bot_response = f"I am running in **Offline Mode** due to a network connection timeout or temporary API outage. I can still assist you with offline queries!"
            else:
                bot_response = f"I am running in **Demo Mode** (no Gemini API Key configured). I can answer specific queries containing keywords like 'attendance', 'exams', 'fees', 'notices', or 'assignments'. To search or explain any topic with AI, please supply a `GEMINI_API_KEY`."

    # Force prefix formatting as requested
    prefix = "Welcome to the Prince AI Student Chatbot: "
    if bot_response.startswith("Welcome to the Prince AI Student Chatbot"):
        if not bot_response.startswith(prefix):
            bot_response = bot_response.replace("Welcome to the Prince AI Student Chatbot", prefix, 1)
    else:
        bot_response = prefix + bot_response

    # Save to Chat History
    cursor.execute('''
        INSERT INTO chat_history (user_id, message, response)
        VALUES (?, ?, ?)
    ''', (session['user_id'], user_message, bot_response))
    conn.commit()
    conn.close()
    
    return jsonify({'response': bot_response})

# --- Admin API Endpoints ---

@app.route('/api/admin/dashboard')
@login_required('admin')
def api_admin_dashboard():
    conn = get_db()
    cursor = conn.cursor()
    
    # Students
    cursor.execute("SELECT id, username, full_name, roll_number, course, semester, attendance_pct, fees_due, fees_paid FROM users WHERE role = 'student'")
    students = [dict(row) for row in cursor.fetchall()]
    
    # Notices
    cursor.execute("SELECT * FROM notices ORDER BY date_posted DESC")
    notices = [dict(row) for row in cursor.fetchall()]
    
    # FAQs
    cursor.execute("SELECT * FROM faqs ORDER BY id DESC")
    faqs = [dict(row) for row in cursor.fetchall()]
    
    # Exams
    cursor.execute("SELECT * FROM exams ORDER BY exam_date ASC")
    exams = [dict(row) for row in cursor.fetchall()]
    
    # Syllabus
    cursor.execute("SELECT * FROM syllabus ORDER BY course, semester")
    syllabus = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return jsonify({
        'students': students,
        'notices': notices,
        'faqs': faqs,
        'exams': exams,
        'syllabus': syllabus
    })

@app.route('/api/admin/student/update', methods=['POST'])
@login_required('admin')
def api_admin_student_update():
    data = request.json
    student_id = data.get('id')
    full_name = data.get('full_name')
    roll_number = data.get('roll_number')
    course = data.get('course')
    semester = data.get('semester')
    attendance_pct = data.get('attendance_pct')
    fees_due = data.get('fees_due')
    fees_paid = data.get('fees_paid')
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE users 
        SET full_name = ?, roll_number = ?, course = ?, semester = ?, attendance_pct = ?, fees_due = ?, fees_paid = ?
        WHERE id = ? AND role = 'student'
    ''', (full_name, roll_number, course, semester, attendance_pct, fees_due, fees_paid, student_id))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    
    return jsonify({'success': success})

@app.route('/api/admin/notices/add', methods=['POST'])
@login_required('admin')
def api_admin_notices_add():
    data = request.json
    title = data.get('title')
    content = data.get('content')
    category = data.get('category')
    
    if not title or not content or category not in ('Exam', 'Academic', 'Fee', 'General'):
        return jsonify({'error': 'Invalid request parameters'}), 400
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO notices (title, content, category)
        VALUES (?, ?, ?)
    ''', (title, content, category))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/admin/notices/delete', methods=['POST'])
@login_required('admin')
def api_admin_notices_delete():
    data = request.json
    notice_id = data.get('id')
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notices WHERE id = ?", (notice_id,))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return jsonify({'success': success})

@app.route('/api/admin/faqs/add', methods=['POST'])
@login_required('admin')
def api_admin_faqs_add():
    data = request.json
    faq_id = data.get('id')
    question = data.get('question')
    answer = data.get('answer')
    category = data.get('category')
    
    if not question or not answer or not category:
        return jsonify({'error': 'Missing question, answer, or category'}), 400
        
    conn = get_db()
    cursor = conn.cursor()
    if faq_id:
        cursor.execute('''
            UPDATE faqs SET question = ?, answer = ?, category = ? WHERE id = ?
        ''', (question, answer, category, faq_id))
    else:
        cursor.execute('''
            INSERT INTO faqs (question, answer, category) VALUES (?, ?, ?)
        ''', (question, answer, category))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/admin/faqs/delete', methods=['POST'])
@login_required('admin')
def api_admin_faqs_delete():
    data = request.json
    faq_id = data.get('id')
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM faqs WHERE id = ?", (faq_id,))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return jsonify({'success': success})

@app.route('/api/admin/exams/add', methods=['POST'])
@login_required('admin')
def api_admin_exams_add():
    data = request.json
    subject = data.get('subject')
    exam_date = data.get('exam_date')
    time = data.get('time')
    room = data.get('room')
    
    if not subject or not exam_date or not time or not room:
        return jsonify({'error': 'All fields are required'}), 400
        
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO exams (subject, exam_date, time, room)
        VALUES (?, ?, ?, ?)
    ''', (subject, exam_date, time, room))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/admin/exams/delete', methods=['POST'])
@login_required('admin')
def api_admin_exams_delete():
    data = request.json
    exam_id = data.get('id')
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM exams WHERE id = ?", (exam_id,))
    conn.commit()
    success = cursor.rowcount > 0
    conn.close()
    return jsonify({'success': success})

@app.route('/api/admin/syllabus/add', methods=['POST'])
@login_required('admin')
def api_admin_syllabus_add():
    data = request.json
    syllabus_id = data.get('id')
    course = data.get('course')
    semester = data.get('semester')
    subject = data.get('subject')
    topics = data.get('topics')
    resources = data.get('resources')
    
    if not course or not semester or not subject or not topics:
        return jsonify({'error': 'Course, semester, subject, and topics are required'}), 400
        
    conn = get_db()
    cursor = conn.cursor()
    if syllabus_id:
        cursor.execute('''
            UPDATE syllabus SET course = ?, semester = ?, subject = ?, topics = ?, resources = ?
            WHERE id = ?
        ''', (course, semester, subject, topics, resources, syllabus_id))
    else:
        cursor.execute('''
            INSERT INTO syllabus (course, semester, subject, topics, resources)
            VALUES (?, ?, ?, ?, ?)
        ''', (course, semester, subject, topics, resources))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
