# Prince AI Student Support Chatbot & Portal

An AI-powered Student Support Web Application built with Python Flask, SQLite, and Google Gemini AI, featuring a premium glassmorphic dark-theme UI, voice controls, speech synthesis, and an interactive academic tracking dashboard.

## 🚀 Live Demo
The application is hosted and running 24/7 on PythonAnywhere:
👉 **[http://utsaw.pythonanywhere.com](http://utsaw.pythonanywhere.com)**

---

## 🌟 Key Features

### 1. AI Student Support Assistant
*   **Contextual AI Responses:** Powered by Google Gemini (`gemini-3.5-flash`), the bot accesses real-time student details, class attendance, syllabus, exam schedules, and grades to answer personal academic queries.
*   **Self-Healing Offline Fallback:** If the API key is unavailable or request limits are reached, the system automatically defaults to a keyword-matching query parser.
*   **Voice Control & Speech Synthesis:**
    *   **Speech-to-Text:** Integrated browser microphone input using the Web Speech API.
    *   **Text-to-Speech:** Narrates bot replies out loud, automatically filtering markdown formatting.
*   **Chat History & Export:** Caches the past 50 conversation logs per student and supports downloading transcripts as `.txt` files.

### 2. Interactive Student Dashboard
*   **Attendance Tracker:** Circular progress ring that dynamically calculates and warns if attendance falls below the mandatory 75% threshold, telling the student how many consecutive classes they need to attend to recover.
*   **Academic Profile & Grades:** Shows current subjects, credits, and grades.
*   **GPA Simulator:** Allows students to project and estimate their semester SGPA by simulating prospective letter grades.
*   **Tuition Statements:** View account balance payments, receipts, and print transaction invoices.
*   **Assignment Checklists:** Track pending homework assignments and toggle completion status.

### 3. Administrative Console
*   **Student Profile Control:** Edit student names, branches, roll numbers, attendance percentages, and tuition balances.
*   **Notice Board Manager:** Post and manage live announcements.
*   **Exam Scheduler:** Manage date, time, and room allocations.
*   **Syllabus Manager:** Create and update branches' curricula and learning resources.
*   **FAQ Manager:** Configure answers to common campus inquiries.

---

## 🛠️ Tech Stack
*   **Backend:** Python 3.10+, Flask 3.0.3, SQLite3
*   **AI Integration:** Google Generative AI API (`google-generativeai`)
*   **Frontend:** HTML5, JavaScript (ES6+), CSS3 (Custom Glassmorphism, Google Fonts, FontAwesome)
*   **Voice Features:** Browser Web Speech API (`SpeechRecognition` & `SpeechSynthesis`)

---

## ⚙️ Installation & Setup (Local Environment)

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/princekumar457/ai-chatbot.git
    cd ai-chatbot
    ```

2.  **Set up Virtual Environment:**
    ```bash
    python -m venv .venv
    # Activate on Windows:
    .venv\Scripts\activate
    # Activate on Mac/Linux:
    source .venv/bin/activate
    ```

3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables:**
    Create a `.env` file in the project root:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    FLASK_SECRET_KEY=your_flask_secret_key
    ```

5.  **Initialize Database & Run App:**
    ```bash
    python app.py
    ```
    Open `http://127.0.0.1:5000` in your web browser.

---

## 🔑 Demo Access Credentials
*   **Student Account:** Username: `student` | Password: `student123`
*   **Admin Account:** Username: `admin` | Password: `admin123`
