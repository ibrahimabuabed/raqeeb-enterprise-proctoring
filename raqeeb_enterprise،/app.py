from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import sqlite3
import json
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = "raqeeb_enterprise_vscode_secret_2026"
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "proctor_enterprise.db")

# بنك الأسئلة على السيرفر فقط (يضم أسئلة اختيارية MCQ وأسئلة كتابية مقالية Essay)
QUESTIONS_BANK = [
    {
        "id": 1,
        "type": "mcq",
        "q": "أي من البروتوكولات التالية يعمل في طبقة النقل (Transport Layer) ويضمن موثوقية وصول البيانات؟",
        "options": ["بروتوكول UDP", "بروتوكول TCP", "بروتوكول IP", "بروتوكول ICMP"],
        "correct": 1,
        "points": 20
    },
    {
        "id": 2,
        "type": "mcq",
        "q": "في هندسة البرمجيات (OOP)، ما المفهوم الذي يعزل البيانات الداخلية للكائن ويمنع الوصول المباشر إليها؟",
        "options": ["الوراثة (Inheritance)", "التغليف (Encapsulation)", "تعدد الأشكال (Polymorphism)", "التركيب (Composition)"],
        "correct": 1,
        "points": 20
    },
    {
        "id": 3,
        "type": "essay",
        "q": "سؤال كتابي (مقالي): اشرح باختصار كيف تساهم الحوسبة الطرفية (Edge Computing) في معالجة البيانات محلياً وتقليل الاعتماد على سرعة الإنترنت.",
        "keywords": ["محلي", "المتصفح", "الإنترنت", "البيانات", "السيرفر", "سرعة", "جهاز"],
        "points": 20
    },
    {
        "id": 4,
        "type": "mcq",
        "q": "أي من الثغرات الأمنية التالية تحدث نتيجة دمج مدخلات المستخدم مباشرة في استعلامات قاعدة البيانات دون تنقية؟",
        "options": ["Cross-Site Scripting (XSS)", "SQL Injection (SQLi)", "Cross-Site Request Forgery", "Buffer Overflow"],
        "correct": 1,
        "points": 20
    },
    {
        "id": 5,
        "type": "essay",
        "q": "سؤال كتابي (مقالي): وضح الفرق الجوهري بين التحقق من المدخلات في جهة العميل (Client-Side) وجهة الخادم (Server-Side) من منظور أمن المعلومات.",
        "keywords": ["العميل", "الخادم", "السيرفر", "تجاوز", "حماية", "أمان", "تعديل", "DOM"],
        "points": 20
    }
]

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS students (
                    student_id TEXT PRIMARY KEY,
                    name TEXT,
                    department TEXT
                )""")
    c.execute("""CREATE TABLE IF NOT EXISTS exam_submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id TEXT,
                    student_name TEXT,
                    score_text TEXT,
                    suspicion_score REAL,
                    exam_mode TEXT,
                    device_type TEXT,
                    written_answers TEXT,
                    audit_log TEXT,
                    indicators_100 TEXT,
                    heatmap_data TEXT,
                    timestamp TEXT
                )""")
    # إدراج طلاب افتراضيين للتجربة
    c.execute("INSERT OR IGNORE INTO students VALUES ('120257796', 'إبراهيم عامر أبو عابد', 'هندسة الحاسوب')")
    c.execute("INSERT OR IGNORE INTO students VALUES ('120250001', 'محمود هشام المدلل', 'هندسة البرمجيات')")
    conn.commit()
    conn.close()

init_db()

# ---------------------------------------------------------
# مسارات بوابة الطالب (Student Portal Routes)
# ---------------------------------------------------------
@app.route('/')
def student_portal():
    return render_template('student.html')

@app.route('/api/auth_student', methods=['POST'])
def auth_student():
    data = request.get_json()
    sid = data.get('student_id', '').strip()
    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT name, department FROM students WHERE student_id = ?", (sid,)).fetchone()
    conn.close()
    if row:
        # إرسال الأسئلة بدون الإجابات النموذجية نهائياً لحماية الـ DOM
        safe_questions = [{
            "id": q["id"],
            "type": q["type"],
            "q": q["q"],
            "options": q.get("options", []),
            "points": q["points"]
        } for q in QUESTIONS_BANK]
        return jsonify({
            "status": "authorized",
            "name": row[0],
            "department": row[1],
            "questions": safe_questions
        })
    return jsonify({"status": "denied", "message": "الرقم الجامعي غير مدرج في كشوفات الاختبار المعتمدة."}), 403

@app.route('/api/heartbeat', methods=['POST'])
def heartbeat():
    return jsonify({"status": "ok", "ts": datetime.now().strftime("%H:%M:%S")})

@app.route('/api/submit_exam', methods=['POST'])
def submit_exam():
    payload = request.get_json()
    sid = payload.get('student_id', 'Unknown')
    answers = payload.get('answers', {})
    suspicion = min(100.0, round(float(payload.get('suspicion_score', 0)), 1))
    exam_mode = payload.get('exam_mode', 'Standard')
    device_type = payload.get('device_type', 'Desktop')
    audit_log = json.dumps(payload.get('audit_log', []), ensure_ascii=False)
    indicators_100 = json.dumps(payload.get('indicators_100', {}), ensure_ascii=False)
    heatmap_data = json.dumps(payload.get('heatmap_data', []))

    conn = sqlite3.connect(DB_PATH)
    st_row = conn.execute("SELECT name FROM students WHERE student_id = ?", (sid,)).fetchone()
    st_name = st_row[0] if st_row else "طالب مسجل"

    # التصحيح الآمن داخل السيرفر (MCQ + تحليل الكلمات المفتاحية للأسئلة الكتابية)
    total_points = 0
    max_points = sum(q["points"] for q in QUESTIONS_BANK)
    written_Archive = []

    for q in QUESTIONS_BANK:
        qid_str = str(q["id"])
        ans_val = answers.get(qid_str)
        if q["type"] == "mcq":
            if ans_val is not None and int(ans_val) == q["correct"]:
                total_points += q["points"]
        elif q["type"] == "essay":
            text_ans = str(ans_val or "").strip()
            matched_kw = sum(1 for kw in q["keywords"] if kw in text_ans)
            # منح العلامة إذا كتب إجابة وافية تحتوي على الكلمات المفتاحية
            earned = q["points"] if (len(text_ans) >= 25 and matched_kw >= 2) else (10 if len(text_ans) >= 10 else 0)
            total_points += earned
            written_Archive.append({
                "question": q["q"],
                "answer": text_ans if text_ans else "(لم تتم الإجابة)",
                "earned": f"{earned} / {q['points']}"
            })

    score_text = f"{total_points} / {max_points}"
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn.execute("""INSERT INTO exam_submissions 
                    (student_id, student_name, score_text, suspicion_score, exam_mode, device_type, written_answers, audit_log, indicators_100, heatmap_data, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                 (sid, st_name, score_text, suspicion, exam_mode, device_type,
                  json.dumps(written_Archive, ensure_ascii=False), audit_log, indicators_100, heatmap_data, timestamp))
    conn.commit()
    conn.close()

    return jsonify({"status": "submitted", "reference_id": f"RAQ-{int(datetime.now().timestamp())}"})

# ---------------------------------------------------------
# مسارات لوحة تحكم الدكتور المستقلة (Admin SOC Routes)
# ---------------------------------------------------------
@app.route('/admin', methods=['GET', 'POST'])
def admin_portal():
    error = None
    if request.method == 'POST':
        action = request.form.get('action')
        if action == 'login':
            if request.form.get('password') == 'admin123':
                session['admin_auth'] = True
                return redirect(url_for('admin_portal'))
            else:
                error = "كلمة المرور الإدارية غير صحيحة."
        elif action == 'add_student' and session.get('admin_auth'):
            nid = request.form.get('student_id', '').strip()
            nname = request.form.get('student_name', '').strip()
            ndept = request.form.get('department', 'كلية الهندسة').strip()
            if nid and nname:
                conn = sqlite3.connect(DB_PATH)
                conn.execute("INSERT OR REPLACE INTO students VALUES (?, ?, ?)", (nid, nname, ndept))
                conn.commit()
                conn.close()
            return redirect(url_for('admin_portal'))
        elif action == 'clear_all' and session.get('admin_auth'):
            conn = sqlite3.connect(DB_PATH)
            conn.execute("DELETE FROM exam_submissions")
            conn.commit()
            conn.close()
            return redirect(url_for('admin_portal'))

    if not session.get('admin_auth'):
        return render_template('admin.html', logged_in=False, error=error)

    conn = sqlite3.connect(DB_PATH)
    submissions = conn.execute("""SELECT id, student_id, student_name, score_text, suspicion_score, exam_mode,
                                         device_type, written_answers, audit_log, indicators_100, heatmap_data, timestamp
                                  FROM exam_submissions ORDER BY id DESC""").fetchall()
    students = conn.execute("SELECT student_id, name, department FROM students ORDER BY student_id").fetchall()
    conn.close()

    return render_template('admin.html', logged_in=True, submissions=submissions, students=students)

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_auth', None)
    return redirect(url_for('admin_portal'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)