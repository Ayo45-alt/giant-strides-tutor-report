document.addEventListener('DOMContentLoaded', () => {
  // Initialize Supabase client
  const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  // DOM Elements
  const loginWrapper = document.getElementById('loginWrapper');
  const dashboardWrapper = document.getElementById('dashboardWrapper');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const loginErrorBanner = document.getElementById('loginErrorBanner');
  const logoutBtn = document.getElementById('logoutBtn');
  
  // Navigation tabs
  const sidebarTabs = document.querySelectorAll('.sidebar-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Tab 1: Reports elements
  const filterTutor = document.getElementById('filterTutor');
  const filterMonth = document.getElementById('filterMonth');
  const searchBtn = document.getElementById('searchBtn');
  const reportOutputArea = document.getElementById('reportOutputArea');
  const reportsEmptyState = document.getElementById('reportsEmptyState');
  
  // KPI Metrics
  const kpiTotalClasses = document.getElementById('kpiTotalClasses');
  const kpiUniqueStudents = document.getElementById('kpiUniqueStudents');
  const kpiAssignmentRate = document.getElementById('kpiAssignmentRate');
  
  // Dynamic student tally breakdown
  const studentTallyContainer = document.getElementById('studentTallyContainer');
  const reportsTableBody = document.getElementById('reportsTableBody');
  
  // Print preview headers
  const printTutorName = document.getElementById('printTutorName');
  const printMonth = document.getElementById('printMonth');
  const printExportDate = document.getElementById('printExportDate');
  const printTotalClasses = document.getElementById('printTotalClasses');

  // Exports buttons
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const downloadExcelBtn = document.getElementById('downloadExcelBtn');
  const exportAllMonth = document.getElementById('exportAllMonth');
  const exportAllExcelBtn = document.getElementById('exportAllExcelBtn');

  // Tab 2: Attendance elements
  const attendanceDate = document.getElementById('attendanceDate');
  const checkAttendanceBtn = document.getElementById('checkAttendanceBtn');
  const attendanceResults = document.getElementById('attendanceResults');
  const countSubmitted = document.getElementById('countSubmitted');
  const countMissing = document.getElementById('countMissing');
  const listSubmitted = document.getElementById('listSubmitted');
  const listMissing = document.getElementById('listMissing');

  // Tab 3: Tutor Management elements
  const tutorListContainer = document.getElementById('tutorListContainer');
  const tutorListSpinner = document.getElementById('tutorListSpinner');
  const tutorCountNumber = document.getElementById('tutorCountNumber');
  
  // Subtabs & forms
  const subtabSingleBtn = document.getElementById('subtabSingleBtn');
  const subtabBulkBtn = document.getElementById('subtabBulkBtn');
  const singleTutorView = document.getElementById('singleTutorView');
  const bulkTutorView = document.getElementById('bulkTutorView');
  
  const addTutorForm = document.getElementById('addTutorForm');
  const newTutorName = document.getElementById('newTutorName');
  const newTutorEmail = document.getElementById('newTutorEmail');

  const bulkTutorInput = document.getElementById('bulkTutorInput');
  const bulkPreviewContainer = document.getElementById('bulkPreviewContainer');
  const bulkPreviewList = document.getElementById('bulkPreviewList');
  const bulkValidCount = document.getElementById('bulkValidCount');
  const bulkBadgeCount = document.getElementById('bulkBadgeCount');
  const bulkExistingWarning = document.getElementById('bulkExistingWarning');
  const bulkStatusBanner = document.getElementById('bulkStatusBanner');
  const btnProcessBulk = document.getElementById('btnProcessBulk');
  const btnClearBulk = document.getElementById('btnClearBulk');

  // Detail Modal Elements
  const detailModalOverlay = document.getElementById('detailModalOverlay');
  const closeDetailBtn = document.getElementById('closeDetailBtn');
  const detailTutor = document.getElementById('detailTutor');
  const detailStudent = document.getElementById('detailStudent');
  const detailDate = document.getElementById('detailDate');
  const detailClassType = document.getElementById('detailClassType');
  const detailMakeupForGroup = document.getElementById('detailMakeupForGroup');
  const detailMakeupFor = document.getElementById('detailMakeupFor');
  const detailSubject = document.getElementById('detailSubject');
  const detailTopic = document.getElementById('detailTopic');
  const detailAssignment = document.getElementById('detailAssignment');
  const detailObservation = document.getElementById('detailObservation');
  const detailFeedback = document.getElementById('detailFeedback');

  let currentFetchedReports = [];
  let currentTutorFilter = "";
  let currentMonthFilter = "";
  let existingTutorsList = [];

  // -------------------------------------------------------------
  // AUTHENTICATION LOGIC (Supabase Auth Integration)
  // -------------------------------------------------------------

  async function checkAuth() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (user) {
        showDashboard();
      } else {
        showLogin();
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      showLogin();
    }
  }

  function showDashboard() {
    loginWrapper.style.display = 'none';
    dashboardWrapper.style.display = 'grid';
    logoutBtn.style.display = 'inline-block';
    
    // Load initial directories
    loadTutorDropdowns();
    initializeDates();
    loadTutorsDirectory();
  }

  function showLogin() {
    loginWrapper.style.display = 'block';
    dashboardWrapper.style.display = 'none';
    logoutBtn.style.display = 'none';
  }

  // Handle Login submission via Supabase Email Auth
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;

    loginErrorBanner.style.display = 'none';

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }

      showDashboard();
      adminLoginForm.reset();
    } catch (err) {
      loginErrorBanner.textContent = err.message || 'Authentication failed. Please check your credentials.';
      loginErrorBanner.style.display = 'block';
    }
  });

  // Handle Logout via Supabase
  logoutBtn.addEventListener('click', async () => {
    try {
      await supabase.auth.signOut();
      showLogin();
    } catch (err) {
      console.error('Logout error:', err);
    }
  });

  // -------------------------------------------------------------
  // SIDEBAR TABS NAVIGATION
  // -------------------------------------------------------------
  sidebarTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sidebarTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      tabContents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
      });

      const targetId = tab.getAttribute('data-target');
      const targetContent = document.getElementById(targetId);
      targetContent.style.display = 'block';
      targetContent.classList.add('active');
    });
  });

  // -------------------------------------------------------------
  // INITIALIZERS
  // -------------------------------------------------------------
  function initializeDates() {
    const now = new Date();
    const currentMonthString = now.toISOString().slice(0, 7);
    filterMonth.value = currentMonthString;
    exportAllMonth.value = currentMonthString;

    const todayString = now.toISOString().split('T')[0];
    attendanceDate.value = todayString;
    attendanceDate.max = todayString;
  }

  // Fetch and populate tutor dropdown selections from Supabase
  async function loadTutorDropdowns() {
    try {
      const { data: tutors, error } = await supabase
        .from('tutors')
        .select('name')
        .order('name', { ascending: true });

      if (error) throw error;

      const previousValue = filterTutor.value;

      filterTutor.innerHTML = '<option value="" disabled selected>Choose a tutor...</option>';
      tutors.forEach(tutor => {
        const option = document.createElement('option');
        option.value = tutor.name;
        option.textContent = tutor.name;
        filterTutor.appendChild(option);
      });

      if (previousValue) {
        filterTutor.value = previousValue;
      }
    } catch (err) {
      console.error('Error populating tutor dropdown:', err.message);
    }
  }

  // -------------------------------------------------------------
  // TAB 1: REPORTS SEARCH & METRICS CALCULATIONS (Supabase Query)
  // -------------------------------------------------------------
  searchBtn.addEventListener('click', async () => {
    const tutorName = filterTutor.value;
    const month = filterMonth.value;

    if (!tutorName || !month) {
      alert('Please select both a Tutor Name and Report Month.');
      return;
    }

    currentTutorFilter = tutorName;
    currentMonthFilter = month;

    try {
      searchBtn.disabled = true;
      searchBtn.textContent = 'Searching...';

      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .eq('tutor_name', tutorName)
        .like('class_date', `${month}%`)
        .order('class_date', { ascending: false });

      if (error) throw error;
      currentFetchedReports = reports || [];

      if (currentFetchedReports.length === 0) {
        reportOutputArea.style.display = 'none';
        reportsEmptyState.style.display = 'block';
        reportsEmptyState.innerHTML = `
          <h3>No Reports Found</h3>
          <p style="margin-top: 0.5rem;">There are no submitted class reports for <strong>${escapeHTML(tutorName)}</strong> in <strong>${formatMonthLabel(month)}</strong>.</p>
        `;
        return;
      }

      // Hide empty state, show results
      reportsEmptyState.style.display = 'none';
      reportOutputArea.style.display = 'block';

      // Perform calculations & render
      renderDashboardReports(currentFetchedReports, tutorName, month);

    } catch (err) {
      alert(err.message);
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Search';
    }
  });

  function renderClassTypeBadge(classType, makeupDate, makeupMonth) {
    const type = classType || 'Regular Class';
    if (type === 'Make-up Class') {
      let targetLabel = '';
      if (makeupDate) {
        targetLabel = formatDateLabel(makeupDate);
      } else if (makeupMonth) {
        targetLabel = formatMonthLabel(makeupMonth);
      } else {
        targetLabel = 'Make-up';
      }
      return `<span class="tag tag-makeup" title="Make-up for ${targetLabel}">Make-up (${targetLabel})</span>`;
    } else if (type === 'Extra/Assessment Class') {
      return `<span class="tag tag-extra">Extra / Assessment</span>`;
    } else {
      return `<span class="tag tag-regular">Regular Class</span>`;
    }
  }

  function getMakeupForLabel(report) {
    if (report.class_type !== 'Make-up Class') return '';
    if (report.makeup_date) {
      const formattedDate = formatDateLabel(report.makeup_date);
      const monthPart = formatMonthLabel(report.makeup_date.slice(0, 7));
      return `${formattedDate} (${monthPart})`;
    }
    if (report.makeup_month) {
      return formatMonthLabel(report.makeup_month);
    }
    return 'Make-up';
  }

  function renderDashboardReports(reports, tutorName, month) {
    // 1. KPI Summaries
    const totalClassesCount = reports.length;
    kpiTotalClasses.textContent = totalClassesCount;

    const uniqueStudents = [...new Set(reports.map(r => r.student_name))];
    kpiUniqueStudents.textContent = uniqueStudents.length;

    const assignmentCount = reports.filter(r => r.assignment_given === 'Yes').length;
    const assignmentRate = totalClassesCount > 0 ? Math.round((assignmentCount / totalClassesCount) * 100) : 0;
    kpiAssignmentRate.textContent = `${assignmentRate}%`;

    // 2. Student Lesson Breakdown Tally (distinguishing regular vs make-up)
    const studentTally = {};
    reports.forEach(r => {
      const student = r.student_name;
      if (!studentTally[student]) {
        studentTally[student] = {
          total: 0,
          regular: 0,
          makeup: 0,
          makeupLabels: [],
          extra: 0
        };
      }
      studentTally[student].total += 1;
      const type = r.class_type || 'Regular Class';
      if (type === 'Regular Class') {
        studentTally[student].regular += 1;
      } else if (type === 'Make-up Class') {
        studentTally[student].makeup += 1;
        const label = getMakeupForLabel(r);
        if (label) studentTally[student].makeupLabels.push(label);
      } else if (type === 'Extra/Assessment Class') {
        studentTally[student].extra += 1;
      }
    });

    // Populate screen summary cards
    studentTallyContainer.innerHTML = '';
    const sortedStudents = Object.keys(studentTally).sort();
    
    sortedStudents.forEach(student => {
      const data = studentTally[student];
      const tallyItem = document.createElement('div');
      tallyItem.className = 'student-summary-item';
      tallyItem.style.cssText = 'display: flex; flex-direction: column; align-items: flex-start; gap: 0.45rem; padding: 0.85rem 1rem;';
      
      let subBadges = [];
      if (data.regular > 0) {
        subBadges.push(`<span class="tag tag-regular">${data.regular} Regular</span>`);
      }
      if (data.makeup > 0) {
        const distinctMissed = [...new Set(data.makeupLabels)].join(', ') || 'Make-up';
        subBadges.push(`<span class="tag tag-makeup">${data.makeup} Make-up (for ${distinctMissed})</span>`);
      }
      if (data.extra > 0) {
        subBadges.push(`<span class="tag tag-extra">${data.extra} Extra/Assessment</span>`);
      }

      tallyItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <span class="student-summary-name" style="font-weight: 600; color: var(--text-main); font-size: 0.95rem;">${escapeHTML(student)}</span>
          <span class="student-summary-count">${data.total} Class${data.total > 1 ? 'es' : ''}</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 0.35rem; width: 100%;">
          ${subBadges.join('')}
        </div>
      `;
      studentTallyContainer.appendChild(tallyItem);
    });

    // 3. Populate Main Detailed Table
    reportsTableBody.innerHTML = '';
    reports.forEach(report => {
      const row = document.createElement('tr');
      const tagClass = report.assignment_given === 'Yes' ? 'tag tag-yes' : 'tag tag-no';
      
      row.innerHTML = `
        <td style="font-weight: 500;">${formatDateLabel(report.class_date)}</td>
        <td style="font-weight: 600; color: var(--primary);">${escapeHTML(report.student_name)}</td>
        <td>${renderClassTypeBadge(report.class_type, report.makeup_date, report.makeup_month)}</td>
        <td>${escapeHTML(report.subject)}</td>
        <td>${escapeHTML(report.topic)}</td>
        <td style="text-align: center;">
          <span class="${tagClass}">${report.assignment_given}</span>
        </td>
        <td class="no-print" style="text-align: center;">
          <button class="btn btn-outline btn-view-report" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.85rem;" data-id="${report.id}">
            View
          </button>
        </td>
      `;
      
      row.querySelector('.btn-view-report').addEventListener('click', () => {
        openDetailModal(report);
      });

      reportsTableBody.appendChild(row);
    });

    // 4. Update Print Header placeholders
    printTutorName.textContent = tutorName;
    printMonth.textContent = formatMonthLabel(month);
    printExportDate.textContent = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    printTotalClasses.textContent = totalClassesCount;
  }

  // -------------------------------------------------------------
  // DETAIL MODAL OVERLAY TRIGGER
  // -------------------------------------------------------------
  function openDetailModal(report) {
    detailTutor.textContent = report.tutor_name;
    detailStudent.textContent = report.student_name;
    detailDate.textContent = formatDateLabel(report.class_date);
    
    const classType = report.class_type || 'Regular Class';
    detailClassType.textContent = classType;
    
    if (classType === 'Make-up Class' && (report.makeup_date || report.makeup_month)) {
      detailMakeupForGroup.style.display = 'block';
      detailMakeupFor.textContent = getMakeupForLabel(report);
    } else {
      detailMakeupForGroup.style.display = 'none';
    }

    detailSubject.textContent = report.subject;
    detailTopic.textContent = report.topic;
    
    if (report.assignment_given === 'Yes') {
      detailAssignment.textContent = report.assignment_details || 'N/A';
    } else {
      detailAssignment.textContent = 'No assignment was given for this lesson.';
    }

    detailObservation.textContent = report.learner_observation;
    detailFeedback.textContent = report.other_feedback || 'No extra feedback provided.';

    detailModalOverlay.classList.add('show');
  }

  closeDetailBtn.addEventListener('click', () => {
    detailModalOverlay.classList.remove('show');
  });

  detailModalOverlay.addEventListener('click', (e) => {
    if (e.target === detailModalOverlay) {
      detailModalOverlay.classList.remove('show');
    }
  });

  // -------------------------------------------------------------
  // DOWNLOAD PDF (BROWSER PRINT INTEGRATION)
  // -------------------------------------------------------------
  downloadPdfBtn.addEventListener('click', () => {
    window.print();
  });

  // -------------------------------------------------------------
  // DOWNLOAD EXCEL - SINGLE TUTOR REPORT
  // -------------------------------------------------------------
  downloadExcelBtn.addEventListener('click', () => {
    if (currentFetchedReports.length === 0) return;

    const tutor = currentTutorFilter;
    const month = currentMonthFilter;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // 1. Sheet 1: INVOICE SUMMARY
    const summaryData = [];
    summaryData.push(['GIANT STRIDES ONLINE SCHOOL']);
    summaryData.push(['TUTOR LESSON INVOICE SUMMARY']);
    summaryData.push([]);
    summaryData.push(['Tutor Name:', tutor]);
    summaryData.push(['Report Month:', formatMonthLabel(month)]);
    summaryData.push(['Total Classes Held:', currentFetchedReports.length]);
    summaryData.push([]);
    summaryData.push(['Student Name', 'Regular Classes', 'Make-up Classes', 'Extra/Assessment Classes', 'Total Classes', 'Make-up Class Details']);

    // Tally classes per student
    const studentTally = {};
    currentFetchedReports.forEach(r => {
      const student = r.student_name;
      if (!studentTally[student]) {
        studentTally[student] = { total: 0, regular: 0, makeup: 0, makeupLabels: [], extra: 0 };
      }
      studentTally[student].total += 1;
      const type = r.class_type || 'Regular Class';
      if (type === 'Regular Class') studentTally[student].regular += 1;
      else if (type === 'Make-up Class') {
        studentTally[student].makeup += 1;
        const label = getMakeupForLabel(r);
        if (label) studentTally[student].makeupLabels.push(label);
      } else if (type === 'Extra/Assessment Class') studentTally[student].extra += 1;
    });

    Object.keys(studentTally).sort().forEach(student => {
      const d = studentTally[student];
      const makeupNotes = [...new Set(d.makeupLabels)].join(', ') || '';
      summaryData.push([student, d.regular, d.makeup, d.extra, d.total, makeupNotes]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Invoice Summary');

    // 2. Sheet 2: DETAILED RECORDS
    const detailedData = [
      ['Date of Class', 'Student Name', 'Class Type', 'Make-up For', 'Subject / Skill', 'Topic Covered', 'Assignment Given', 'Assignment Details', 'Learner Observation', 'Other Feedback']
    ];

    const cronoReports = [...currentFetchedReports].sort((a,b) => a.class_date.localeCompare(b.class_date));

    cronoReports.forEach(r => {
      detailedData.push([
        r.class_date,
        r.student_name,
        r.class_type || 'Regular Class',
        getMakeupForLabel(r),
        r.subject,
        r.topic,
        r.assignment_given,
        r.assignment_details || '',
        r.learner_observation,
        r.other_feedback || ''
      ]);
    });

    const wsDetails = XLSX.utils.aoa_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Lesson Records');

    // Save File
    const sanitizedTutor = tutor.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    XLSX.writeFile(wb, `gs_invoice_${sanitizedTutor}_${month}.xlsx`);
  });

  // -------------------------------------------------------------
  // EXPORT ALL TUTORS FOR MONTH AT ONCE (Supabase Master Pull)
  // -------------------------------------------------------------
  exportAllExcelBtn.addEventListener('click', async () => {
    const month = exportAllMonth.value;
    if (!month) {
      alert('Please select a month to export.');
      return;
    }

    try {
      exportAllExcelBtn.disabled = true;
      exportAllExcelBtn.textContent = 'Exporting...';

      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .like('class_date', `${month}%`)
        .order('tutor_name', { ascending: true })
        .order('class_date', { ascending: false });

      if (error) throw error;

      if (!reports || reports.length === 0) {
        alert(`No lesson reports found in the system for ${formatMonthLabel(month)}.`);
        return;
      }

      const wb = XLSX.utils.book_new();

      // 1. Sheet 1: INVOICE SUMMARIES INDEX
      // Group lessons by Tutor -> Student -> Breakdown
      const tutorStudentTally = {};
      reports.forEach(r => {
        const t = r.tutor_name;
        const s = r.student_name;
        if (!tutorStudentTally[t]) tutorStudentTally[t] = {};
        if (!tutorStudentTally[t][s]) {
          tutorStudentTally[t][s] = { total: 0, regular: 0, makeup: 0, makeupLabels: [], extra: 0 };
        }
        tutorStudentTally[t][s].total += 1;
        const type = r.class_type || 'Regular Class';
        if (type === 'Regular Class') tutorStudentTally[t][s].regular += 1;
        else if (type === 'Make-up Class') {
          tutorStudentTally[t][s].makeup += 1;
          const label = getMakeupForLabel(r);
          if (label) tutorStudentTally[t][s].makeupLabels.push(label);
        } else if (type === 'Extra/Assessment Class') tutorStudentTally[t][s].extra += 1;
      });

      const summaryData = [
        ['GIANT STRIDES ONLINE SCHOOL'],
        [`MASTER TUTOR INVOICES INDEX - ${formatMonthLabel(month)}`],
        [],
        ['Tutor Name', 'Student Name', 'Regular Classes', 'Make-up Classes', 'Extra/Assessment Classes', 'Total Classes', 'Make-up Details']
      ];

      Object.keys(tutorStudentTally).sort().forEach(tutor => {
        const students = tutorStudentTally[tutor];
        Object.keys(students).sort().forEach(student => {
          const d = students[student];
          const makeupNotes = [...new Set(d.makeupLabels)].join(', ') || '';
          summaryData.push([tutor, student, d.regular, d.makeup, d.extra, d.total, makeupNotes]);
        });
      });

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'All Invoices Index');

      // 2. Sheet 2: FULL DATA SHEET
      const detailedData = [
        ['Tutor Name', 'Date of Class', 'Student Name', 'Class Type', 'Make-up For', 'Subject / Skill', 'Topic Covered', 'Assignment Given', 'Assignment Details', 'Learner Observation', 'Other Feedback']
      ];

      reports.forEach(r => {
        detailedData.push([
          r.tutor_name,
          r.class_date,
          r.student_name,
          r.class_type || 'Regular Class',
          getMakeupForLabel(r),
          r.subject,
          r.topic,
          r.assignment_given,
          r.assignment_details || '',
          r.learner_observation,
          r.other_feedback || ''
        ]);
      });

      const wsDetails = XLSX.utils.aoa_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(wb, wsDetails, 'All Lesson Records');

      XLSX.writeFile(wb, `gs_master_report_${month}.xlsx`);

    } catch (err) {
      alert(err.message);
    } finally {
      exportAllExcelBtn.disabled = false;
      exportAllExcelBtn.textContent = 'Export Master Excel';
    }
  });

  // -------------------------------------------------------------
  // TAB 2: DAILY CHECKLIST SUBMISSIONS
  // -------------------------------------------------------------
  checkAttendanceBtn.addEventListener('click', loadChecklist);

  async function loadChecklist() {
    const date = attendanceDate.value;
    if (!date) {
      alert('Please select a date.');
      return;
    }

    try {
      checkAttendanceBtn.disabled = true;
      checkAttendanceBtn.textContent = 'Checking...';

      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('tutor_name')
        .eq('class_date', date);

      if (reportsError) throw reportsError;
      const submittedTutors = reports.map(r => r.tutor_name);

      const { data: tutors, error: tutorsError } = await supabase
        .from('tutors')
        .select('name')
        .order('name', { ascending: true });

      if (tutorsError) throw tutorsError;

      const submittedSet = new Set(submittedTutors.map(name => name.toLowerCase()));
      const submittedList = tutors.filter(t => submittedSet.has(t.name.toLowerCase())).map(t => t.name);
      const notSubmittedList = tutors.filter(t => !submittedSet.has(t.name.toLowerCase())).map(t => t.name);

      attendanceResults.style.display = 'grid';

      listSubmitted.innerHTML = '';
      countSubmitted.textContent = submittedList.length;
      if (submittedList.length === 0) {
        listSubmitted.innerHTML = '<li class="attendance-item text-muted">No reports submitted today.</li>';
      } else {
        submittedList.forEach(tutor => {
          const li = document.createElement('li');
          li.className = 'attendance-item submitted';
          li.textContent = tutor;
          listSubmitted.appendChild(li);
        });
      }

      listMissing.innerHTML = '';
      countMissing.textContent = notSubmittedList.length;
      if (notSubmittedList.length === 0) {
        listMissing.innerHTML = '<li class="attendance-item text-muted">All active tutors have submitted reports.</li>';
      } else {
        notSubmittedList.forEach(tutor => {
          const li = document.createElement('li');
          li.className = 'attendance-item missing';
          li.textContent = tutor;
          listMissing.appendChild(li);
        });
      }

    } catch (err) {
      alert(err.message);
    } finally {
      checkAttendanceBtn.disabled = false;
      checkAttendanceBtn.textContent = 'Check Date';
    }
  }

  // -------------------------------------------------------------
  // TAB 3: TUTORS DIRECTORY DATABASE CONTROL (Supabase CRUD & Bulk)
  // -------------------------------------------------------------
  
  // Subtab switching
  subtabSingleBtn.addEventListener('click', () => {
    subtabSingleBtn.classList.add('active');
    subtabBulkBtn.classList.remove('active');
    singleTutorView.style.display = 'block';
    bulkTutorView.style.display = 'none';
  });

  subtabBulkBtn.addEventListener('click', () => {
    subtabBulkBtn.classList.add('active');
    subtabSingleBtn.classList.remove('active');
    singleTutorView.style.display = 'none';
    bulkTutorView.style.display = 'block';
    bulkTutorInput.focus();
  });

  // Bulk input parser supporting text, Excel tabs, CSV, and Markdown tables
  function parseBulkInput(text) {
    if (!text || !text.trim()) return [];
    
    const lines = text.split(/\r?\n/);
    const existingNames = new Set(existingTutorsList.map(t => t.name.toLowerCase().trim()));
    const seenInBatch = new Set();
    const parsed = [];

    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;

    lines.forEach(line => {
      let trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Ignore markdown table divider lines (e.g. |---|---|) or pure punctuation lines
      if (/^\|?[\s\-:|]+\|?$/.test(trimmedLine)) return;
      if (/^\|?\s*#?\s*\|\s*name\s*\|\s*email\s*\|?$/i.test(trimmedLine)) return;

      let name = '';
      let email = '';

      const emailMatch = trimmedLine.match(emailRegex);
      if (emailMatch) {
        email = emailMatch[1].trim();
        // Remove email, then clean up delimiters including pipes |, quotes, brackets
        name = trimmedLine.replace(emailMatch[0], '')
          .replace(/[|<>()[\]{},:;\-–\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        if (trimmedLine.includes('|')) {
          const parts = trimmedLine.split('|').map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
            name = parts[1];
            if (parts.length >= 3 && parts[2].includes('@')) email = parts[2];
          } else {
            name = parts[0] || '';
            if (parts.length > 1 && parts[1].includes('@')) email = parts[1];
          }
        } else if (trimmedLine.includes('\t')) {
          const parts = trimmedLine.split('\t').map(p => p.trim()).filter(Boolean);
          name = parts[0] || '';
          if (parts.length > 1 && parts[1].includes('@')) email = parts[1];
        } else if (trimmedLine.includes(',')) {
          const parts = trimmedLine.split(',').map(p => p.trim()).filter(Boolean);
          name = parts[0] || '';
          if (parts.length > 1 && parts[1].includes('@')) email = parts[1];
        } else if (trimmedLine.includes(' - ')) {
          const parts = trimmedLine.split(' - ').map(p => p.trim()).filter(Boolean);
          name = parts[0] || '';
          if (parts.length > 1 && parts[1].includes('@')) email = parts[1];
        } else {
          name = trimmedLine;
        }
      }

      // Strip leading numbers e.g. "1.", "1 -", "1 ", or "#"
      name = name.replace(/^#?\s*\d+[\.\)\-\:\s]+\s*/, '')
        .replace(/[|]/g, '')
        .trim();

      // Skip header keywords if pasted
      if (/^(name|tutor|tutor name|email|#)$/i.test(name)) return;

      if (name.length > 0) {
        const lowerName = name.toLowerCase();
        const isDuplicateInBatch = seenInBatch.has(lowerName);
        const isAlreadyRegistered = existingNames.has(lowerName);
        
        seenInBatch.add(lowerName);

        parsed.push({
          name,
          email: email || null,
          isAlreadyRegistered,
          isDuplicateInBatch
        });
      }
    });

    return parsed;
  }

  function updateBulkPreview() {
    const text = bulkTutorInput.value;
    const parsed = parseBulkInput(text);

    if (parsed.length === 0) {
      bulkPreviewContainer.style.display = 'none';
      bulkBadgeCount.style.display = 'none';
      return;
    }

    bulkPreviewContainer.style.display = 'block';
    bulkBadgeCount.style.display = 'inline-block';
    bulkBadgeCount.textContent = `${parsed.length} Detected`;

    const newTutors = parsed.filter(p => !p.isAlreadyRegistered && !p.isDuplicateInBatch);
    const hasDuplicates = parsed.some(p => p.isAlreadyRegistered || p.isDuplicateInBatch);

    bulkValidCount.textContent = newTutors.length;
    bulkExistingWarning.style.display = hasDuplicates ? 'inline' : 'none';

    bulkPreviewList.innerHTML = '';
    parsed.slice(0, 50).forEach(item => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid var(--border)';
      
      let statusBadge = '';
      if (item.isAlreadyRegistered) {
        statusBadge = '<span class="tag tag-no" style="font-size: 0.72rem;">Already Registered</span>';
      } else if (item.isDuplicateInBatch) {
        statusBadge = '<span class="tag tag-no" style="font-size: 0.72rem;">Duplicate in List</span>';
      } else {
        statusBadge = '<span class="tag tag-yes" style="font-size: 0.72rem;">Ready to Add</span>';
      }

      tr.innerHTML = `
        <td style="padding: 0.35rem 0.5rem; font-weight: 500;">${escapeHTML(item.name)}</td>
        <td style="padding: 0.35rem 0.5rem; color: var(--text-muted);">${item.email ? escapeHTML(item.email) : '<span style="font-style:italic;color:#a0aec0;">No email</span>'}</td>
        <td style="padding: 0.35rem 0.5rem; text-align: right;">${statusBadge}</td>
      `;
      bulkPreviewList.appendChild(tr);
    });

    if (parsed.length > 50) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="3" style="padding: 0.4rem; text-align: center; color: var(--text-muted); font-style: italic;">...and ${parsed.length - 50} more</td>`;
      bulkPreviewList.appendChild(tr);
    }
  }

  bulkTutorInput.addEventListener('input', updateBulkPreview);

  btnClearBulk.addEventListener('click', () => {
    bulkTutorInput.value = '';
    bulkPreviewContainer.style.display = 'none';
    bulkBadgeCount.style.display = 'none';
    bulkStatusBanner.style.display = 'none';
  });

  btnProcessBulk.addEventListener('click', async () => {
    const text = bulkTutorInput.value;
    const parsed = parseBulkInput(text);

    if (parsed.length === 0) {
      alert('Please paste at least one tutor name into the box.');
      return;
    }

    const toInsert = parsed
      .filter(p => !p.isAlreadyRegistered && !p.isDuplicateInBatch)
      .map(p => ({
        name: p.name,
        ...(p.email ? { email: p.email } : {})
      }));

    if (toInsert.length === 0) {
      bulkStatusBanner.style.display = 'block';
      bulkStatusBanner.style.backgroundColor = '#fff5f5';
      bulkStatusBanner.style.color = '#9b2c2c';
      bulkStatusBanner.style.border = '1px solid #fed7d7';
      bulkStatusBanner.textContent = 'All tutors in your list are already registered in the directory.';
      return;
    }

    try {
      btnProcessBulk.disabled = true;
      btnProcessBulk.textContent = 'Importing...';

      const { data, error } = await supabase
        .from('tutors')
        .insert(toInsert);

      if (error) throw error;

      bulkStatusBanner.style.display = 'block';
      bulkStatusBanner.style.backgroundColor = '#ebfaf0';
      bulkStatusBanner.style.color = '#276749';
      bulkStatusBanner.style.border = '1px solid #c6f6d5';
      bulkStatusBanner.innerHTML = `<strong>Success!</strong> Successfully added ${toInsert.length} new tutor${toInsert.length > 1 ? 's' : ''} to the directory.`;

      bulkTutorInput.value = '';
      bulkPreviewContainer.style.display = 'none';
      bulkBadgeCount.style.display = 'none';

      await loadTutorsDirectory();
      await loadTutorDropdowns();

    } catch (err) {
      bulkStatusBanner.style.display = 'block';
      bulkStatusBanner.style.backgroundColor = '#fff5f5';
      bulkStatusBanner.style.color = '#9b2c2c';
      bulkStatusBanner.style.border = '1px solid #fed7d7';
      bulkStatusBanner.textContent = `Import failed: ${err.message}`;
    } finally {
      btnProcessBulk.disabled = false;
      btnProcessBulk.textContent = 'Import All Tutors';
    }
  });

  async function loadTutorsDirectory() {
    tutorListSpinner.style.display = 'block';
    tutorListContainer.innerHTML = '';

    try {
      const { data: tutors, error } = await supabase
        .from('tutors')
        .select('id, name, email')
        .order('name', { ascending: true });

      if (error) throw error;

      existingTutorsList = tutors || [];

      if (tutorCountNumber) {
        tutorCountNumber.textContent = existingTutorsList.length;
      }

      if (existingTutorsList.length === 0) {
        tutorListContainer.innerHTML = '<p style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No tutors registered. Add tutors on the right.</p>';
        return;
      }

      existingTutorsList.forEach(tutor => {
        const item = document.createElement('div');
        item.className = 'tutor-list-item';
        item.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 0.15rem;">
            <span style="font-weight: 500; color: var(--text-main);">${escapeHTML(tutor.name)}</span>
            ${tutor.email ? `<span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(tutor.email)}</span>` : '<span style="font-size: 0.75rem; color: #cbd5e0; font-style: italic;">No email</span>'}
          </div>
          <button class="btn-delete" title="Delete Tutor" data-id="${tutor.id}" data-name="${escapeHTML(tutor.name)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        `;

        item.querySelector('.btn-delete').addEventListener('click', async (e) => {
          const tutorId = e.currentTarget.getAttribute('data-id');
          const name = e.currentTarget.getAttribute('data-name');
          
          if (confirm(`Are you sure you want to remove "${name}" from the active directory?\n\nNote: This will not delete their past submitted reports, but their name will no longer appear in selection checklists.`)) {
            try {
              const { error: deleteError } = await supabase
                .from('tutors')
                .delete()
                .eq('id', tutorId);

              if (deleteError) throw deleteError;
              
              await loadTutorsDirectory();
              await loadTutorDropdowns();
            } catch (err) {
              alert(err.message);
            }
          }
        });

        tutorListContainer.appendChild(item);
      });

    } catch (err) {
      if (tutorCountNumber) tutorCountNumber.textContent = '0';
      tutorListContainer.innerHTML = `<p style="padding: 1.5rem; text-align: center; color: var(--danger);">${err.message}</p>`;
    } finally {
      tutorListSpinner.style.display = 'none';
    }
  }

  // Add single tutor form handler
  addTutorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newTutorName.value.trim();
    const email = newTutorEmail ? newTutorEmail.value.trim() : '';

    const payload = { name };
    if (email) payload.email = email;

    try {
      const { data, error } = await supabase
        .from('tutors')
        .insert([payload]);

      if (error) {
        if (error.code === '23505' || error.message.includes('unique')) {
          throw new Error('Tutor already exists.');
        }
        throw error;
      }

      newTutorName.value = '';
      if (newTutorEmail) newTutorEmail.value = '';
      await loadTutorsDirectory();
      await loadTutorDropdowns();

    } catch (err) {
      alert(err.message);
    }
  });

  // -------------------------------------------------------------
  // HELPER UTILITIES
  // -------------------------------------------------------------
  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMonthLabel(monthString) {
    if (!monthString) return '-';
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function formatDateLabel(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  // Initial Auth check
  checkAuth();
});
