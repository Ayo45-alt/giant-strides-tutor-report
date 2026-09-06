document.addEventListener('DOMContentLoaded', () => {
  // Initialize Supabase client
  const supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

  const form = document.getElementById('tutorReportForm');
  
  // Custom select elements
  const tutorSelectWrapper = document.getElementById('tutorSelectWrapper');
  const tutorSelectTrigger = document.getElementById('tutorSelectTrigger');
  const tutorInput = document.getElementById('tutorInput');
  const tutorDropdown = document.getElementById('tutorDropdown');
  const tutorSearchInput = document.getElementById('tutorSearchInput');
  const tutorDropdownClose = document.getElementById('tutorDropdownClose');
  const tutorList = document.getElementById('tutorList');

  const classDateInput = document.getElementById('classDate');
  const assignmentYes = document.getElementById('assignmentYes');
  const assignmentNo = document.getElementById('assignmentNo');
  const assignmentDetailsGroup = document.getElementById('assignmentDetailsGroup');
  const assignmentDetails = document.getElementById('assignmentDetails');
  const submitBtn = document.getElementById('submitBtn');
  const emailCopyCheckbox = document.getElementById('emailCopyCheckbox');
  const emailTargetNotice = document.getElementById('emailTargetNotice');
  const tutorTargetEmail = document.getElementById('tutorTargetEmail');

  let validTutors = []; // Cache list of registered tutors for validation
  let tutorsList = [];  // Cache of tutors directory with emails
  let selectedTutorEmail = '';

  function updateSelectedTutor(name) {
    tutorInput.value = name;
    const matched = tutorsList.find(t => t.name.toLowerCase().trim() === name.toLowerCase().trim());
    selectedTutorEmail = (matched && matched.email) ? matched.email.trim() : '';
    updateEmailNotice();
  }

  function updateEmailNotice() {
    if (emailCopyCheckbox && emailCopyCheckbox.checked) {
      if (selectedTutorEmail) {
        tutorTargetEmail.textContent = selectedTutorEmail;
        emailTargetNotice.style.display = 'block';
      } else {
        emailTargetNotice.style.display = 'none';
      }
    } else {
      if (emailTargetNotice) emailTargetNotice.style.display = 'none';
    }
  }

  if (emailCopyCheckbox) {
    emailCopyCheckbox.addEventListener('change', updateEmailNotice);
  }

  // Set default class date to today
  const today = new Date().toISOString().split('T')[0];
  classDateInput.value = today;
  classDateInput.max = today; // Prevent future entries
  classDateInput.min = '2026-01-01'; // Prevent ancient entries (1846!)

  // Fetch tutors list from Supabase for custom select box
  async function loadTutors() {
    try {
      const { data: tutors, error } = await supabase
        .from('tutors')
        .select('name, email')
        .order('name', { ascending: true });

      if (error) throw error;
      
      tutorsList = tutors;
      // Store clean lowercase list for verification
      validTutors = tutors.map(t => t.name.toLowerCase().trim());
      
      // Populate custom list items
      renderTutorsList(tutorsList);

      // Pre-populate input if tutor has previously saved name
      const lastSelectedTutor = localStorage.getItem('lastSelectedTutor');
      if (lastSelectedTutor) {
        updateSelectedTutor(lastSelectedTutor);
      }

    } catch (err) {
      console.error('Error loading tutors list from Supabase:', err.message);
    }
  }

  // Render items inside the custom scrollable select panel
  function renderTutorsList(list) {
    tutorList.innerHTML = '';
    
    if (list.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'custom-select-item no-results';
      emptyItem.textContent = 'No matching tutors found';
      tutorList.appendChild(emptyItem);
      return;
    }

    list.forEach(tutor => {
      const item = document.createElement('div');
      item.className = 'custom-select-item';
      item.textContent = tutor.name;
      
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        updateSelectedTutor(tutor.name);
        tutorSelectWrapper.classList.remove('open');
        
        // Reset validation border highlights
        tutorInput.style.borderColor = 'var(--border)';
        tutorInput.style.boxShadow = 'none';
      });

      tutorList.appendChild(item);
    });
  }

  // Open custom select panel
  tutorSelectTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    tutorSelectWrapper.classList.add('open');
    tutorSearchInput.value = ''; // Reset search text
    renderTutorsList(tutorsList); // Show full tutor list
    
    // Auto-focus search input inside overlay
    setTimeout(() => {
      tutorSearchInput.focus();
    }, 100);
  });

  // Filter dropdown items as they type inside search input
  tutorSearchInput.addEventListener('input', () => {
    const term = tutorSearchInput.value.toLowerCase().trim();
    const filtered = tutorsList.filter(t => t.name.toLowerCase().includes(term));
    renderTutorsList(filtered);
  });

  // Close custom select panel via cancel button
  tutorDropdownClose.addEventListener('click', (e) => {
    e.stopPropagation();
    tutorSelectWrapper.classList.remove('open');
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!tutorSelectWrapper.contains(e.target)) {
      tutorSelectWrapper.classList.remove('open');
    }
  });

  // Handle Assignment Details visibility toggle
  function toggleAssignmentDetails() {
    if (assignmentYes.checked) {
      assignmentDetailsGroup.classList.add('show');
      assignmentDetails.required = true;
    } else {
      assignmentDetailsGroup.classList.remove('show');
      assignmentDetails.required = false;
      assignmentDetails.value = '';
    }
  }

  assignmentYes.addEventListener('change', toggleAssignmentDetails);
  assignmentNo.addEventListener('change', toggleAssignmentDetails);

  // Form Client-side validation style utility
  function validateField(inputElement) {
    if (!inputElement.required) return true;
    
    // For radio buttons check group
    if (inputElement.type === 'radio') {
      const name = inputElement.name;
      const checked = form.querySelector(`input[name="${name}"]:checked`);
      return !!checked;
    }

    const isValid = inputElement.value.trim() !== '';
    if (!isValid) {
      inputElement.style.borderColor = 'var(--danger)';
      inputElement.style.boxShadow = '0 0 0 3px rgba(229, 62, 98, 0.15)';
    } else {
      inputElement.style.borderColor = 'var(--border)';
      inputElement.style.boxShadow = 'none';
    }
    return isValid;
  }

  // Reset custom styling on input focus
  form.querySelectorAll('input, textarea').forEach(el => {
    el.addEventListener('input', () => {
      el.style.borderColor = 'var(--border)';
      el.style.boxShadow = 'none';
    });
  });

  // Handle Form Submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset styles
    let isFormValid = true;
    const requiredInputs = form.querySelectorAll('[required]');
    
    requiredInputs.forEach(input => {
      // If conditional assignment details is hidden, skip it
      if (input.id === 'assignmentDetails' && !assignmentYes.checked) return;

      if (!validateField(input)) {
        isFormValid = false;
      }
    });

    if (!isFormValid) {
      alert('Please fill out all required fields marked with *');
      return;
    }

    const tutor_name = tutorInput.value.trim();

    // Enforce that the entered name exists in the active tutors list
    if (validTutors.length > 0 && !validTutors.includes(tutor_name.toLowerCase())) {
      alert('Your name is not registered in the Giant Strides tutor directory.\n\nPlease contact the administrator to register your account before submitting reports!');
      tutorInput.style.borderColor = 'var(--danger)';
      tutorInput.style.boxShadow = '0 0 0 3px rgba(229, 62, 98, 0.15)';
      return;
    }

    const student_name = document.getElementById('studentName').value.trim();
    const class_date = classDateInput.value;
    const subject = document.getElementById('subject').value.trim();
    const topic = document.getElementById('topic').value.trim();
    const assignment_given = form.querySelector('input[name="assignmentGiven"]:checked').value;
    const assignment_details = assignmentDetails.value.trim();
    const learner_observation = document.getElementById('learnerObservation').value.trim();
    const other_feedback = document.getElementById('otherFeedback').value.trim();

    const payload = {
      tutor_name,
      student_name,
      class_date,
      subject,
      topic,
      assignment_given,
      assignment_details: assignment_details || '',
      learner_observation,
      other_feedback: other_feedback || ''
    };

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Report...';

    try {
      // Write data directly to Supabase cloud table 'reports'
      const { data, error } = await supabase
        .from('reports')
        .insert([payload]);

      if (error) {
        throw new Error(error.message || 'Failed to submit report. Please try again.');
      }

      // Save tutor name in localStorage to auto-select on return
      localStorage.setItem('lastSelectedTutor', tutor_name);

      // If email copy requested and tutor email is available, dispatch email
      if (emailCopyCheckbox && emailCopyCheckbox.checked && selectedTutorEmail) {
        try {
          // Asynchronously dispatch email copy (non-blocking)
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: selectedTutorEmail,
              tutor_name,
              student_name,
              class_date,
              subject,
              topic,
              assignment_given,
              assignment_details: assignment_details || '',
              learner_observation,
              other_feedback: other_feedback || ''
            })
          }).catch(emailErr => {
            console.warn('Email dispatch notice (report was safely saved):', emailErr);
          });
        } catch (e) {
          console.warn('Email trigger error:', e);
        }
      }

      // Redirect to success page
      window.location.href = 'success.html';

    } catch (err) {
      alert(err.message);
    } finally {
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Daily Report';
    }
  });

  // Initial load
  loadTutors();
});
