const db = require('./db');

async function runTests() {
  console.log('--- Starting Database Manager Test ---');
  
  try {
    await db.init();
    console.log('Database initialized successfully.');
    console.log('Database Engine Type:', db.dbType());

    // 1. Test getTutors
    const tutors = await db.getTutors();
    console.log(`Tutors fetched: ${tutors.length} tutors.`);
    console.log('First 3 tutors:', tutors.slice(0, 3).map(t => t.name));

    // 2. Test addTutor
    const newTutor = await db.addTutor('Test Tutor ' + Date.now());
    console.log('Added Tutor:', newTutor);

    // 3. Test deleteTutor
    const delResult = await db.deleteTutor(newTutor.id);
    console.log('Deleted Tutor changes:', delResult.changes);

    // 4. Test addReport
    const reportData = {
      tutor_name: 'Sarah Jenkins',
      student_name: 'Billy Kid',
      class_date: '2026-08-21',
      subject: 'Maths',
      topic: 'Addition',
      assignment_given: 'Yes',
      assignment_details: 'Practice 10 sums',
      learner_observation: 'Billy did exceptionally well today.',
      other_feedback: 'No issues.'
    };

    const addReportResult = await db.addReport(reportData);
    console.log('Added Report ID:', addReportResult.id);

    // 5. Test getReports
    const fetchedReports = await db.getReports({ tutorName: 'Sarah Jenkins', month: '2026-08' });
    console.log(`Reports found for Sarah Jenkins in 2026-08: ${fetchedReports.length}`);
    console.log('Report sample:', fetchedReports[0]);

    // 6. Test submission status
    const status = await db.getSubmissionStatus('2026-08-21');
    console.log('Submission status for 2026-08-21:');
    console.log(`Submitted count: ${status.submitted.length}`);
    console.log(`Missing count: ${status.notSubmitted.length}`);
    console.log('First 3 missing:', status.notSubmitted.slice(0, 3));

    console.log('--- Database Manager Test Passed! ---');
  } catch (err) {
    console.error('--- Database Manager Test Failed! ---', err);
  }
}

runTests();
