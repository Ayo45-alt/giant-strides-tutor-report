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

  function buildReceiptEmailHtml(data) {
    const esc = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const assignmentHtml = (data.assignment_given === 'Yes' && data.assignment_details) 
      ? '<div style="font-size: 13px; font-weight: 700; color: #1B4DF5; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 16px; margin-bottom: 6px;">Assignment Details</div><div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 14px; line-height: 1.5; color: #2d3748; white-space: pre-wrap;">' + esc(data.assignment_details) + '</div>'
      : '';

    const feedbackHtml = data.other_feedback 
      ? '<div style="font-size: 13px; font-weight: 700; color: #1B4DF5; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 16px; margin-bottom: 6px;">Other Feedback / Remarks</div><div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 14px; line-height: 1.5; color: #2d3748; white-space: pre-wrap;">' + esc(data.other_feedback) + '</div>'
      : '';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f7fa; margin: 0; padding: 20px; color: #2d3748;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    <div style="background: #1B4DF5; color: #ffffff; padding: 24px 30px; border-bottom: 4px solid #F2A900;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Giant Strides Online School</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Official Daily Lesson Report Receipt</p>
    </div>
    
    <div style="padding: 28px 30px;">
      <div style="font-size: 15px; margin-bottom: 18px;">
        Hello <strong>${esc(data.tutor_name)}</strong>,
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 7px 0; color: #718096; font-weight: 600;">Student Name</td>
            <td style="padding: 7px 0; text-align: right; font-weight: 600; color: #1a202c;">${esc(data.student_name)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 7px 0; color: #718096; font-weight: 600;">Date of Class</td>
            <td style="padding: 7px 0; text-align: right; color: #1a202c;">${esc(data.class_date)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 7px 0; color: #718096; font-weight: 600;">Subject / Skill</td>
            <td style="padding: 7px 0; text-align: right; color: #1a202c;">${esc(data.subject)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 7px 0; color: #718096; font-weight: 600;">Topic Covered</td>
            <td style="padding: 7px 0; text-align: right; color: #1a202c;">${esc(data.topic)}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #718096; font-weight: 600;">Assignment Given</td>
            <td style="padding: 7px 0; text-align: right; font-weight: 600; color: ${data.assignment_given === 'Yes' ? '#276749' : '#4a5568'};">
              ${esc(data.assignment_given)}
            </td>
          </tr>
        </table>
      </div>

      ${assignmentHtml}

      <div style="font-size: 13px; font-weight: 700; color: #1B4DF5; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 16px; margin-bottom: 6px;">Learner Observation</div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 14px; line-height: 1.5; color: #2d3748; white-space: pre-wrap;">${esc(data.learner_observation)}</div>

      ${feedbackHtml}
    </div>

    <div style="background: #f8fafc; padding: 16px 30px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #e2e8f0;">
      This is an automated receipt from Giant Strides Online School.<br>
      &copy; 2026 Giant Strides Online School. All Rights Reserved.
    </div>
  </div>
</body>
</html>
    `;
  }

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

      // If email copy requested and tutor email is available, dispatch email via Google Webhook
      if (emailCopyCheckbox && emailCopyCheckbox.checked && selectedTutorEmail && window.MAILER_WEBHOOK_URL) {
        try {
          const emailSubjectLine = `Lesson Report Receipt — ${student_name || 'Class'} (${class_date || 'Today'})`;
          const htmlBody = buildReceiptEmailHtml({
            tutor_name,
            student_name,
            class_date,
            subject,
            topic,
            assignment_given,
            assignment_details,
            learner_observation,
            other_feedback
          });

          // Asynchronously dispatch email copy via Google Webhook (non-blocking)
          fetch(window.MAILER_WEBHOOK_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: selectedTutorEmail,
              subject: emailSubjectLine,
              htmlBody
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
