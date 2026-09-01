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
  const addTutorForm = document.getElementById('addTutorForm');
  const newTutorName = document.getElementById('newTutorName');

  // Detail Modal Elements
  const detailModalOverlay = document.getElementById('detailModalOverlay');
  const closeDetailBtn = document.getElementById('closeDetailBtn');
  const detailTutor = document.getElementById('detailTutor');
  const detailStudent = document.getElementById('detailStudent');
  const detailDate = document.getElementById('detailDate');
  const detailSubject = document.getElementById('detailSubject');
  const detailTopic = document.getElementById('detailTopic');
  const detailAssignment = document.getElementById('detailAssignment');
  const detailObservation = document.getElementById('detailObservation');
  const detailFeedback = document.getElementById('detailFeedback');

  let currentFetchedReports = [];
  let currentTutorFilter = "";
  let currentMonthFilter = "";

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
      // Remove active from all tabs
      sidebarTabs.forEach(t => t.classList.remove('active'));
      // Add active to current
      tab.classList.add('active');

      // Hide all content areas
      tabContents.forEach(content => {
        content.style.display = 'none';
        content.classList.remove('active');
      });

      // Show target content
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
    // Set default month in filters to current month (YYYY-MM)
    const now = new Date();
    const currentMonthString = now.toISOString().slice(0, 7);
    filterMonth.value = currentMonthString;
    exportAllMonth.value = currentMonthString;

    // Set default date in checklist to today
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

      // Remember selection
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
      // Show loading state
      searchBtn.disabled = true;
      searchBtn.textContent = 'Searching...';

      // Query reports for tutor and month prefix in Supabase
      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .eq('tutor_name', tutorName)
        .like('class_date', `${month}%`)
        .order('class_date', { ascending: false });

      if (error) throw error;
      currentFetchedReports = reports;

      if (reports.length === 0) {
        reportOutputArea.style.display = 'none';
        reportsEmptyState.style.display = 'block';
        reportsEmptyState.innerHTML = `
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3>No Reports Found</h3>
          <p style="margin-top: 0.5rem;">There are no submitted class reports for <strong>${tutorName}</strong> in <strong>${formatMonthLabel(month)}</strong>.</p>
        `;
        return;
      }

      // Hide empty state, show results
      reportsEmptyState.style.display = 'none';
      reportOutputArea.style.display = 'block';

      // Perform calculations
      renderDashboardReports(reports, tutorName, month);

    } catch (err) {
      alert(err.message);
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Search';
    }
  });

  function renderDashboardReports(reports, tutorName, month) {
    // 1. KPI Summaries
    const totalClassesCount = reports.length;
    kpiTotalClasses.textContent = totalClassesCount;

    const uniqueStudents = [...new Set(reports.map(r => r.student_name))];
    kpiUniqueStudents.textContent = uniqueStudents.length;

    const assignmentCount = reports.filter(r => r.assignment_given === 'Yes').length;
    const assignmentRate = totalClassesCount > 0 ? Math.round((assignmentCount / totalClassesCount) * 100) : 0;
    kpiAssignmentRate.textContent = `${assignmentRate}%`;

    // 2. Student Lesson Breakdown Tally
    const studentTally = {};
    reports.forEach(r => {
      const student = r.student_name;
      studentTally[student] = (studentTally[student] || 0) + 1;
    });

    // Populate screen summary cards
    studentTallyContainer.innerHTML = '';

    // Sort students alphabetically
    const sortedStudents = Object.keys(studentTally).sort();
    
    sortedStudents.forEach(student => {
      const count = studentTally[student];
      
      // Screen & Print Layout item (Cards print beautifully too!)
      const tallyItem = document.createElement('div');
      tallyItem.className = 'student-summary-item';
      tallyItem.innerHTML = `
        <span class="student-summary-name">${escapeHTML(student)}</span>
        <span class="student-summary-count">${count} Class${count > 1 ? 'es' : ''}</span>
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
      
      // Detail View Modal button trigger
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

    // Create a new workbook
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
    summaryData.push(['Student Name', 'Total Classes Held']);

    // Tally classes per student
    const studentTally = {};
    currentFetchedReports.forEach(r => {
      studentTally[r.student_name] = (studentTally[r.student_name] || 0) + 1;
    });

    Object.keys(studentTally).sort().forEach(student => {
      summaryData.push([student, studentTally[student]]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Invoice Summary');

    // 2. Sheet 2: DETAILED RECORDS
    const detailedData = [
      ['Date', 'Student Name', 'Subject / Skill', 'Topic Covered', 'Assignment Given', 'Assignment Details', 'Learner Observation', 'Other Feedback']
    ];

    // Sort chronologically (oldest first for records)
    const cronoReports = [...currentFetchedReports].sort((a,b) => a.class_date.localeCompare(b.class_date));

    cronoReports.forEach(r => {
      detailedData.push([
        r.class_date,
        r.student_name,
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

      // Pull all reports for the month from Supabase
      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .like('class_date', `${month}%`)
        .order('tutor_name', { ascending: true })
        .order('class_date', { ascending: false });

      if (error) throw error;

      if (reports.length === 0) {
        alert(`No lesson reports found in the system for ${formatMonthLabel(month)}.`);
        return;
      }

      // Create workbook
      const wb = XLSX.utils.book_new();

      // 1. Sheet 1: INVOICE SUMMARIES INDEX
      // Group lessons by Tutor -> Student -> Count
      const tutorStudentTally = {};
      reports.forEach(r => {
        const t = r.tutor_name;
        const s = r.student_name;
        if (!tutorStudentTally[t]) tutorStudentTally[t] = {};
        tutorStudentTally[t][s] = (tutorStudentTally[t][s] || 0) + 1;
      });

      const summaryData = [
        ['GIANT STRIDES ONLINE SCHOOL'],
        [`MASTER TUTOR INVOICES INDEX - ${formatMonthLabel(month)}`],
        [],
        ['Tutor Name', 'Student Name', 'Total Classes Held']
      ];

      Object.keys(tutorStudentTally).sort().forEach(tutor => {
        const students = tutorStudentTally[tutor];
        Object.keys(students).sort().forEach(student => {
          summaryData.push([tutor, student, students[student]]);
        });
      });

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'All Invoices Index');

      // 2. Sheet 2: FULL DATA SHEET
      const detailedData = [
        ['Tutor Name', 'Date', 'Student Name', 'Subject / Skill', 'Topic Covered', 'Assignment Given', 'Assignment Details', 'Learner Observation', 'Other Feedback']
      ];

      reports.forEach(r => {
        detailedData.push([
          r.tutor_name,
          r.class_date,
          r.student_name,
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

      // Download
      XLSX.writeFile(wb, `gs_master_report_${month}.xlsx`);

    } catch (err) {
      alert(err.message);
    } finally {
      exportAllExcelBtn.disabled = false;
      exportAllExcelBtn.textContent = 'Export All (Excel)';
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

      // 1. Fetch submitted tutor names for this date from Supabase
      const { data: reports, error: reportsError } = await supabase
        .from('reports')
        .select('tutor_name')
        .eq('class_date', date);

      if (reportsError) throw reportsError;
      const submittedTutors = reports.map(r => r.tutor_name);

      // 2. Fetch all active tutors
      const { data: tutors, error: tutorsError } = await supabase
        .from('tutors')
        .select('name')
        .order('name', { ascending: true });

      if (tutorsError) throw tutorsError;

      // 3. Process lists case-insensitively
      const submittedSet = new Set(submittedTutors.map(name => name.toLowerCase()));
      const submittedList = tutors.filter(t => submittedSet.has(t.name.toLowerCase())).map(t => t.name);
      const notSubmittedList = tutors.filter(t => !submittedSet.has(t.name.toLowerCase())).map(t => t.name);

      // Show results layout
      attendanceResults.style.display = 'grid';

      // Populate Submitted list
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

      // Populate Missing list
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
  // TAB 3: TUTORS DIRECTORY DATABASE CONTROL (Supabase CRUD)
  // -------------------------------------------------------------
  async function loadTutorsDirectory() {
    tutorListSpinner.style.display = 'block';
    tutorListContainer.innerHTML = '';

    try {
      const { data: tutors, error } = await supabase
        .from('tutors')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;

      if (tutorCountNumber) {
        tutorCountNumber.textContent = tutors ? tutors.length : 0;
      }

      if (!tutors || tutors.length === 0) {
        tutorListContainer.innerHTML = '<p style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No tutors registered. Add a tutor on the right.</p>';
        return;
      }

      tutors.forEach(tutor => {
        const item = document.createElement('div');
        item.className = 'tutor-list-item';
        item.innerHTML = `
          <span style="font-weight: 500; color: var(--text-main);">${escapeHTML(tutor.name)}</span>
          <button class="btn-delete" title="Delete Tutor" data-id="${tutor.id}" data-name="${escapeHTML(tutor.name)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        `;

        // Register Delete event
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
              
              // Refresh lists
              loadTutorsDirectory();
              loadTutorDropdowns();
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

  // Add new tutor form handler
  addTutorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newTutorName.value.trim();

    try {
      const { data, error } = await supabase
        .from('tutors')
        .insert([{ name }]);

      if (error) {
        if (error.code === '23505' || error.message.includes('unique')) {
          throw new Error('Tutor already exists.');
        }
        throw error;
      }

      newTutorName.value = '';
      // Refresh directory and dropdowns
      loadTutorsDirectory();
      loadTutorDropdowns();

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
