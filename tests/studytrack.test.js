const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Set test database path before loading db
const TEST_DB = path.join(__dirname, '..', 'data', 'test_studytrack.db');
if (fs.existsSync(TEST_DB)) {
  fs.unlinkSync(TEST_DB);
}
process.env.DB_PATH = TEST_DB;

const db = require('../server/db');
const app = require('../server/index');

let server;
let port;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  db.close();
  if (fs.existsSync(TEST_DB)) {
    try { fs.unlinkSync(TEST_DB); } catch (e) {}
  }
});

describe('StudyTrack Full System Verification', () => {
  let userAToken = '';
  let userBToken = '';
  let subjectId = null;
  let unitId = null;
  let topic1Id = null;
  let topic2Id = null;
  let topic3Id = null;

  test('1. Auth: User registration & password hashing', async () => {
    // Register User A
    const resA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'alice',
        email: 'alice@example.com',
        password: 'password123',
        full_name: 'Alice Student'
      })
    });
    assert.strictEqual(resA.status, 201);
    const dataA = await resA.json();
    assert.ok(dataA.token);
    assert.strictEqual(dataA.user.username, 'alice');
    userAToken = dataA.token;

    // Verify password is NOT plain text in database
    const dbUser = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('alice');
    assert.notStrictEqual(dbUser.password_hash, 'password123');
    assert.ok(dbUser.password_hash.startsWith('$2')); // bcrypt prefix

    // Register User B
    const resB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'bob',
        email: 'bob@example.com',
        password: 'password456',
        full_name: 'Bob Learner'
      })
    });
    assert.strictEqual(resB.status, 201);
    const dataB = await resB.json();
    userBToken = dataB.token;
  });

  test('2. Auth: User login & /me endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'alice@example.com',
        password: 'password123'
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.user.username, 'alice');

    // Test /me with token
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();
    assert.strictEqual(meData.user.email, 'alice@example.com');
  });

  test('3. Subjects & Syllabus: Create Subject, Unit, and Topics', async () => {
    // Create Subject (VLSI)
    const subRes = await fetch(`${baseUrl}/api/subjects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        name: 'VLSI Design',
        code: 'EC801',
        color: '#4f46e5'
      })
    });
    assert.strictEqual(subRes.status, 201);
    const sub = await subRes.json();
    subjectId = sub.id;

    // Create Unit 1
    const unitRes = await fetch(`${baseUrl}/api/subjects/${subjectId}/units`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        title: 'Unit 1: MOS Theory',
        unit_number: 1
      })
    });
    assert.strictEqual(unitRes.status, 201);
    const unit = await unitRes.json();
    unitId = unit.id;

    // Bulk Add 3 Topics
    const topicsRes = await fetch(`${baseUrl}/api/subjects/units/${unitId}/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        titles: ['MOSFET Operation', 'Channel Formation', 'GAA FET']
      })
    });
    assert.strictEqual(topicsRes.status, 201);
    const topics = await topicsRes.json();
    assert.strictEqual(topics.length, 3);
    topic1Id = topics[0].id; // MOSFET Operation
    topic2Id = topics[1].id; // Channel Formation
    topic3Id = topics[2].id; // GAA FET
  });

  test('4. Multi-Tenant Isolation: User B cannot view or modify User A subjects', async () => {
    // User B tries to fetch Alice's subject detail
    const getRes = await fetch(`${baseUrl}/api/subjects/${subjectId}`, {
      headers: { 'Authorization': `Bearer ${userBToken}` }
    });
    assert.strictEqual(getRes.status, 404);

    // User B list subjects - must be empty
    const listRes = await fetch(`${baseUrl}/api/subjects`, {
      headers: { 'Authorization': `Bearer ${userBToken}` }
    });
    assert.strictEqual(listRes.status, 200);
    const list = await listRes.json();
    assert.strictEqual(list.length, 0);

    // User B tries to update Alice's subject
    const putRes = await fetch(`${baseUrl}/api/subjects/${subjectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userBToken}`
      },
      body: JSON.stringify({ name: 'Hacked Name' })
    });
    assert.strictEqual(putRes.status, 404);
  });

  test('5. Automatic Progress Calculation & Daily Study Tracking', async () => {
    // Log study for Topic 1 (MOSFET Operation) -> Status 'Completed'
    const logRes = await fetch(`${baseUrl}/api/study-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        subject_id: subjectId,
        unit_id: unitId,
        topic_id: topic1Id,
        study_date: '2026-09-29',
        duration_minutes: 80,
        status: 'Completed',
        note: 'Mastered saturation equations'
      })
    });
    assert.strictEqual(logRes.status, 201);

    // Log study for Topic 2 (Channel Formation) -> Status 'Completed'
    await fetch(`${baseUrl}/api/study-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        subject_id: subjectId,
        unit_id: unitId,
        topic_id: topic2Id,
        study_date: '2026-09-29',
        duration_minutes: 45,
        status: 'Completed',
        note: 'Pinch-off region explored'
      })
    });

    // Check Subject progress: 3 topics total, 2 completed -> 67%
    const subRes = await fetch(`${baseUrl}/api/subjects/${subjectId}`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    const sub = await subRes.json();
    assert.strictEqual(sub.total_topics, 3);
    assert.strictEqual(sub.completed_topics, 2);
    assert.strictEqual(sub.progress_percentage, 67);

    // Check Dashboard summary
    const dashRes = await fetch(`${baseUrl}/api/analytics/dashboard`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    const dash = await dashRes.json();
    assert.strictEqual(dash.overall.total_topics, 3);
    assert.strictEqual(dash.overall.completed_topics, 2);
    assert.strictEqual(dash.overall.remaining_topics, 1);
    assert.strictEqual(dash.overall.total_study_minutes, 125);
  });

  test('6. Personalized Paper Generator: Strict Rule 9 Enforcement', async () => {
    // Topic 3 (GAA FET) is NOT completed.
    // Try generating a paper with completed_only = true.
    const genRes = await fetch(`${baseUrl}/api/papers/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        subject_id: subjectId,
        completed_only: true,
        total_marks: 30,
        num_questions: 6,
        difficulty: 'Medium',
        question_types: ['mcq', 'short', 'descriptive']
      })
    });

    assert.strictEqual(genRes.status, 201);
    const genData = await genRes.json();
    assert.ok(genData.paper_id);
    assert.ok(genData.paper.sections.length > 0);

    // Strictly verify GAA FET (uncompleted) is NOT anywhere in testedTopics or questions!
    assert.strictEqual(genData.paper.testedTopics.includes('GAA FET'), false);
    for (const q of genData.paper.allQuestions) {
      assert.notStrictEqual(q.topic, 'GAA FET');
    }

    // Now test that if user asks ONLY for GAA FET with completed_only = true, it gets rejected!
    const rejectRes = await fetch(`${baseUrl}/api/papers/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        subject_id: subjectId,
        completed_only: true,
        topic_ids: [topic3Id] // GAA FET is NOT completed
      })
    });
    assert.strictEqual(rejectRes.status, 400);
    const rejectData = await rejectRes.json();
    assert.ok(rejectData.error.includes('No completed topics'));
  });

  test('7. Tests, Results & Revision System Workflow', async () => {
    // Record test result where student struggled with Topic 2 (Channel Formation)
    const testRes = await fetch(`${baseUrl}/api/tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAToken}`
      },
      body: JSON.stringify({
        subject_id: subjectId,
        test_name: 'VLSI Assessment 1',
        test_date: '2026-09-29',
        total_marks: 30,
        marks_obtained: 23,
        remarks: 'Need to review pinch-off equations',
        topics_tested: ['MOSFET Operation', 'Channel Formation'],
        weak_topic_ids: [topic2Id] // Flagged for revision
      })
    });

    assert.strictEqual(testRes.status, 201);
    const testData = await testRes.json();
    assert.strictEqual(testData.percentage, 76.7);

    // Verify Topic 2 is now in revision list
    const revRes = await fetch(`${baseUrl}/api/revision`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    const revList = await revRes.json();
    assert.strictEqual(revList.length, 1);
    assert.strictEqual(revList[0].topic_title, 'Channel Formation');
    assert.strictEqual(revList[0].is_resolved, 0);

    const revisionItemId = revList[0].id;

    // Student revises and marks resolved
    const resolveRes = await fetch(`${baseUrl}/api/revision/${revisionItemId}/resolve`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    assert.strictEqual(resolveRes.status, 200);

    // Verify active revision list is now empty
    const revActiveRes = await fetch(`${baseUrl}/api/revision?status=active`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    const activeList = await revActiveRes.json();
    assert.strictEqual(activeList.length, 0);
  });

  test('8. Weekly Study Review endpoint', async () => {
    const weekRes = await fetch(`${baseUrl}/api/analytics/weekly-review`, {
      headers: { 'Authorization': `Bearer ${userAToken}` }
    });
    assert.strictEqual(weekRes.status, 200);
    const weekData = await weekRes.json();
    assert.strictEqual(weekData.current_week.total_sessions, 2);
    assert.strictEqual(weekData.current_week.total_study_minutes, 125);
    assert.ok(weekData.subject_breakdown.length > 0);
  });
});
