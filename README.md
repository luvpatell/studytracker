# StudyTrack — Intelligent Study Tracking & Personalized Assessment

StudyTrack is a complete, modern, responsive, multi-user web application designed to help students track study progress based on their own subjects and syllabus, maintain a daily study history, identify completed vs. remaining topics, and automatically generate personalized question papers strictly from studied topics.

---

## 🌟 The StudyTrack Philosophy

StudyTrack is built around an authentic continuous learning loop:

```
  USER CREATES SYLLABUS
           ↓
      USER STUDIES
           ↓
USER UPDATES COMPLETED TOPICS
           ↓
 SYSTEM TRACKS PROGRESS
           ↓
 SYSTEM STORES STUDY HISTORY
           ↓
 USER GENERATES WEEKLY PAPER
           ↓
PAPER USES ONLY STUDIED TOPICS
           ↓
  USER RECORDS TEST RESULT
           ↓
SYSTEM IDENTIFIES REVISION TOPICS
           ↓
      USER REVISES
           ↓
       NEXT TEST
```

**Study → Track → Test → Analyze → Revise → Repeat**

---

## 🚀 Key Features

### 1. Multi-User Authentication & Data Separation
- **Sign Up & Login**: Secure password hashing with bcrypt (10 rounds) and JWT token authentication.
- **Forgot / Reset Password**: Reset flow with temporary verification codes.
- **Strict Data Isolation**: Every subject, unit, topic, study log, paper, test result, and revision item is keyed to the user ID. User A can never see or modify User B's records.

### 2. User-Defined Curriculum & Syllabus Explorer
- **Zero hard-coded syllabus**: Students can add custom subjects (e.g. VLSI Design, Mobile Communication, AI/ML, Operating Systems).
- **Units & Modules**: Hierarchical unit chapters.
- **Bulk Topic Import**: Type or paste syllabus lines directly from curriculum PDFs or textbooks.
- **Sample Syllabus Loader**: One-click onboarding button to load a standard multi-subject syllabus (VLSI, Mobile Comm, AI/ML, IoT) for testing.

### 3. Student Dashboard
- Real-time overall syllabus completion percentage gauge.
- Subject-wise progress cards with percentage bars and topic ratios.
- Quick summary counts: Active Subjects, Completed Topics, Remaining Topics, Revision Topics, Total Study Time.
- Recent study activity feed and recent test score feed.

### 4. Daily Study Tracking & Study History
- **Log Daily Study**: Date picker, Subject select → Unit select → Topic select cascade, duration (mins), status (`Not Started`, `In Progress`, `Completed`, `Revision`), and personal notes.
- Automatic syllabus completion recalculation whenever a topic is marked completed.
- **Study History Table**: Multi-parameter filters (by Subject, Status, Date range, and keyword search).

### 5. Weekly Study Review
- 7-day retrospective analytics compared with the previous week.
- Total study time difference trend (`+Xm` or `-Xm`).
- Topics completed during the week.
- Topics flagged for revision during the week.
- Subject-wise time and session breakdown table.

### 6. Personalized Question Paper Generator (CORE FEATURE)
- **Strict Rule 9 Enforcement**: When "Completed Topics Only" is selected, only topics marked as `completed` are eligible for question generation. Topics not completed are strictly excluded.
- **Customizable Exam Parameters**:
  - Total marks (20, 30, 50, 100)
  - Number of questions (5, 8, 12, 16)
  - Difficulty level (Easy, Medium, Hard, Mixed)
  - Question types: MCQ (4-option grid), Very Short Answer, Short Answer, Conceptual, Descriptive, Numerical, Application-based
- **Academic Exam Formatting**:
  - University/academic style layout with instructions, Section A, Section B, Section C.
  - Question marks, topic indicators, and time allowed calculation.
  - Printable / Save PDF layout via `@media print`.
  - Toggle Solutions / Marking Rubric.
  - 1-click **Regenerate Paper** option.

### 7. Test Results & Weak Topic Revision System
- Record test marks obtained, total marks, percentage, and reflections.
- **Flag Weak Topics**: Identify questions/topics where marks were lost.
- **Revision Queue**: Flagged topics enter the Revision Queue.
- **Mark Revised**: Once revised, 1-click marks the topic resolved and updates syllabus status to `Completed`.
- **Targeted Revision Test Generator**: Creates a personalized exam containing questions solely from active revision topics.

### 8. Progress Analytics
- Daily Study Time bar chart (last 14 days).
- Test Score Trajectory chart with percentage markers.
- Subject-wise completion progress bars.

---

## 💻 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (`better-sqlite3`) with WAL mode, foreign keys, and indexes
- **Security**: `bcryptjs` for password hashing, `jsonwebtoken` for secure JWT sessions, parameter-bound prepared statements (SQL injection immune)
- **Frontend**: Responsive Single-Page Application (HTML5, CSS3, Modern ES6 JavaScript)
- **Styling**: Custom CSS design system with Dark / Light themes, mobile drawer navigation, print stylesheets for formal exam papers

---

## 🏃 Running the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Integration Tests
```bash
npm test
```

### 3. Start the Server
```bash
npm start
```

Access the application in your browser:
**`http://localhost:3000`**
