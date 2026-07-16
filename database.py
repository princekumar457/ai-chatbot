import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_FILE = 'college.db'

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db_exists = os.path.exists(DB_FILE)
    conn = get_db()
    cursor = conn.cursor()

    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('student', 'admin')),
        full_name TEXT NOT NULL,
        roll_number TEXT UNIQUE,
        course TEXT,
        semester TEXT,
        attendance_pct REAL DEFAULT 0.0,
        fees_due REAL DEFAULT 0.0,
        fees_paid REAL DEFAULT 0.0
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS notices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        date_posted DATETIME DEFAULT CURRENT_TIMESTAMP,
        category TEXT NOT NULL CHECK(category IN ('Exam', 'Academic', 'Fee', 'General'))
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS syllabus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course TEXT NOT NULL,
        semester TEXT NOT NULL,
        subject TEXT NOT NULL,
        topics TEXT NOT NULL,
        resources TEXT
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject TEXT NOT NULL,
        exam_date TEXT NOT NULL,
        time TEXT NOT NULL,
        room TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Submitted')),
        FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS faqs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT NOT NULL
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        marks INTEGER NOT NULL,
        grade TEXT NOT NULL,
        credits INTEGER NOT NULL,
        FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    conn.commit()

    # Check if we need to seed the database (if users table is empty)
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        print("Seeding database with default records...")
        
        # Insert admin user
        admin_pass = generate_password_hash("admin123")
        cursor.execute('''
            INSERT INTO users (username, password, role, full_name)
            VALUES (?, ?, ?, ?)
        ''', ("admin", admin_pass, "admin", "System Administrator"))

        # Insert student users
        stud_pass = generate_password_hash("student123")
        cursor.execute('''
            INSERT INTO users (username, password, role, full_name, roll_number, course, semester, attendance_pct, fees_due, fees_paid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ("student", stud_pass, "student", "Rohan Sharma", "CS2023001", "Computer Science", "Semester 5", 82.5, 12500.0, 35000.0))

        alice_pass = generate_password_hash("alice123")
        cursor.execute('''
            INSERT INTO users (username, password, role, full_name, roll_number, course, semester, attendance_pct, fees_due, fees_paid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', ("alice", alice_pass, "student", "Alice Smith", "CS2023002", "Information Technology", "Semester 5", 68.0, 15000.0, 30000.0))

        # Seed notices
        notices = [
            ("Fee Submission Deadline", "All students are requested to clear their Semester 5 tuition fees before July 30, 2026, to avoid late payment penalties.", "Fee"),
            ("Mid-Term Exam Schedule Released", "The mid-term exams for Semester 5 will commence from August 10, 2026. Please check the Exam Schedule section for detailed timings.", "Exam"),
            ("Workshop on Artificial Intelligence", "A guest lecture and hands-on workshop on Generative AI will be organized in Seminar Hall 1 on July 22, 2026, at 10:00 AM.", "Academic"),
            ("Library Timings Extended", "The central library will now remain open until 8:00 PM on weekdays to help students prepare for upcoming examinations.", "General")
        ]
        cursor.executemany('''
            INSERT INTO notices (title, content, category)
            VALUES (?, ?, ?)
        ''', notices)

        # Seed syllabus
        syllabuses = [
            ("Computer Science", "Semester 5", "Database Management Systems", "Introduction to DBMS, Entity-Relationship Model, Relational Algebra, SQL queries, Normalization (1NF, 2NF, 3NF, BCNF), Transaction Processing, Concurrency Control, and Recovery.", "Standard Textbook: Korth & Sudarshan; Online Course: NPTEL DBMS"),
            ("Computer Science", "Semester 5", "Software Engineering", "Software Development Life Cycle (SDLC) Models, Requirements Engineering, UML diagrams, System Design, Testing Methodologies (Black-box, White-box), Agile Scrum, and DevOps fundamentals.", "Standard Textbook: Roger Pressman; GitHub Projects Guide"),
            ("Computer Science", "Semester 5", "Artificial Intelligence", "Introduction to AI, State Space Search, Heuristic Search (A*, AO*), Adversarial Search (Minimax, Alpha-Beta Pruning), Knowledge Representation, Machine Learning basics, and Neural Networks.", "Standard Textbook: Russell & Norvig; Google AI Documentation"),
            ("Information Technology", "Semester 5", "Computer Networks", "OSI Model vs TCP/IP Suite, Physical Layer encoding, Data Link Layer protocols (Ethernet, ARP), Network Layer (IP addressing, routing algorithms), Transport Layer (TCP/UDP, congestion control), and Application Layer (DNS, HTTP).", "Standard Textbook: Tanenbaum; Cisco Networking Guide"),
            ("Information Technology", "Semester 5", "Web Technologies", "Advanced HTML5 & CSS3, Responsive Design, JavaScript basics, DOM manipulation, asynchronous AJAX, introduction to Node.js & Express framework, RESTful APIs, and basic SQL/NoSQL databases.", "Standard Textbook: Deitel & Deitel; MDN Web Docs")
        ]
        cursor.executemany('''
            INSERT INTO syllabus (course, semester, subject, topics, resources)
            VALUES (?, ?, ?, ?, ?)
        ''', syllabuses)

        # Seed exams
        exams = [
            ("Database Management Systems", "2026-08-10", "10:00 AM - 01:00 PM", "Lab Block Room 302"),
            ("Software Engineering", "2026-08-12", "10:00 AM - 01:00 PM", "Main Block Room 101"),
            ("Artificial Intelligence", "2026-08-14", "10:00 AM - 01:00 PM", "Main Block Room 102"),
            ("Computer Networks", "2026-08-10", "02:00 PM - 05:00 PM", "Lab Block Room 204"),
            ("Web Technologies", "2026-08-13", "10:00 AM - 01:00 PM", "Lab Block Room 305")
        ]
        cursor.executemany('''
            INSERT INTO exams (subject, exam_date, time, room)
            VALUES (?, ?, ?, ?)
        ''', exams)

        # Seed FAQs
        faqs = [
            ("How do I calculate my attendance requirement?", "Students are required to maintain a minimum of 75% attendance in each subject to be eligible to sit for the end-semester examinations.", "Academic"),
            ("What is the fee payment procedure?", "Fees can be paid online via the college portal through Net Banking, UPI, or Debit/Credit Cards. Alternatively, you can pay via Demand Draft at the accounts desk.", "Fee"),
            ("How can I apply for a duplicate ID card?", "Fill out the ID Card replacement form at the admin office, pay a fee of $10 at the accounts desk, and submit the receipt along with a passport-sized photograph.", "General"),
            ("What is the format of the mid-term exams?", "Mid-term exams are out of 50 marks. They consist of a mix of objective (multiple choice) and subjective (short/long answer) questions.", "Exam"),
            ("Are there any placement preparation classes?", "Yes, the training and placement cell runs aptitude, coding, and soft skills training sessions every Saturday for final year and pre-final year students.", "General")
        ]
        cursor.executemany('''
            INSERT INTO faqs (question, answer, category)
            VALUES (?, ?, ?)
        ''', faqs)

        # Seed assignments (for student with id 2 (Rohan, who is student) and id 3 (Alice, who is alice))
        assignments = [
            (2, "SQL Queries & Schema Design", "Create a schema for a library management system and write complex SQL queries for join, aggregation, and subqueries.", "2026-07-24", "Pending"),
            (2, "SRS Document Design", "Write a complete Software Requirements Specification (SRS) document for a Hospital Management System based on IEEE standards.", "2026-07-28", "Pending"),
            (2, "Minimax Algorithm Implementation", "Write a Python script to implement the Minimax search algorithm with Alpha-Beta pruning for a Tic-Tac-Toe game.", "2026-08-02", "Submitted"),
            (3, "Subnetting and Routing Tables", "Resolve IP subnetting problems and construct routing tables for the given network topology diagram.", "2026-07-25", "Pending"),
            (3, "Portfolio Website using HTML/CSS/JS", "Build a fully responsive developer portfolio website displaying project details and contact form.", "2026-07-30", "Submitted")
        ]
        cursor.executemany('''
            INSERT INTO assignments (student_id, title, description, due_date, status)
            VALUES (?, ?, ?, ?, ?)
        ''', assignments)

        # Seed grades
        grades = [
            (2, "Database Management Systems", 85, "A+", 4),
            (2, "Software Engineering", 78, "A", 3),
            (2, "Artificial Intelligence", 92, "O", 4),
            (3, "Computer Networks", 72, "B+", 4),
            (3, "Web Technologies", 88, "A+", 3)
        ]
        cursor.executemany('''
            INSERT INTO grades (student_id, subject, marks, grade, credits)
            VALUES (?, ?, ?, ?, ?)
        ''', grades)

        conn.commit()
        print("Database seeded successfully!")

    conn.close()

if __name__ == '__main__':
    init_db()
