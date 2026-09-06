import { connect } from 'cloudflare:sockets';

const GMAIL_USER = 'giantstridesonlineschool1@gmail.com';
const GMAIL_PASS = 'xqiwalqjnnwynehv';

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const data = await context.request.json();
    const {
      to,
      tutor_name,
      student_name,
      class_date,
      subject,
      topic,
      assignment_given,
      assignment_details,
      learner_observation,
      other_feedback
    } = data;

    if (!to || !to.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid recipient email required' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const subjectLine = `Lesson Report Receipt — ${student_name || 'Class'} (${class_date || 'Today'})`;

    const assignmentHtml = (assignment_given === 'Yes' && assignment_details) 
      ? `<div style="font-size: 13px; font-weight: 700; color: #1B4DF5; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 16px; margin-bottom: 6px;">Assignment Details</div><div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 14px; line-height: 1.5; color: #2d3748; white-space: pre-wrap;">` + escapeHtml(assignment_details) + `</div>`
      : '';

    const feedbackHtml = other_feedback 
      ? `<div style="font-size: 13px; font-weight: 700; color: #1B4DF5; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 16px; margin-bottom: 6px;">Other Feedback / Remarks</div><div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 14px; line-height: 1.5; color: #2d3748; white-space: pre-wrap;">` + escapeHtml(other_feedback) + `</div>`
      : '';

    const htmlBody = `
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
      <div style="font-size: 15px; margin-bottom: 20px;">
        Hello <strong>${escapeHtml(tutor_name)}</strong>,<br>
        Here is a copy of the daily lesson report you just submitted for your personal records and monthly invoice reconciliation.
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 7px 0; color: #718096; font-weight: 600;">Student Name</td>
            <td style="padding: 7px 0; text-align: right; font-weight: 600; color: #1a202c;">${escapeHtml(student_name)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 7px 0; color: #718096; font-weight: 600;">Date of Class</td>
            <td style="padding: 7px 0; text-align: right; color: #1a202c;">${escapeHtml(class_date)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 7px 0; color: #718096; font-weight: 600;">Subject / Skill</td>
            <td style="padding: 7px 0; text-align: right; color: #1a202c;">${escapeHtml(subject)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #edf2f7;">
            <td style="padding: 7px 0; color: #718096; font-weight: 600;">Topic Covered</td>
            <td style="padding: 7px 0; text-align: right; color: #1a202c;">${escapeHtml(topic)}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #718096; font-weight: 600;">Assignment Given</td>
            <td style="padding: 7px 0; text-align: right; font-weight: 600; color: ${assignment_given === 'Yes' ? '#276749' : '#4a5568'};">
              ${escapeHtml(assignment_given)}
            </td>
          </tr>
        </table>
      </div>

      ${assignmentHtml}

      <div style="font-size: 13px; font-weight: 700; color: #1B4DF5; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 16px; margin-bottom: 6px;">Learner Observation</div>
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; font-size: 14px; line-height: 1.5; color: #2d3748; white-space: pre-wrap;">${escapeHtml(learner_observation)}</div>

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

    // Send email via SMTP
    await sendSmtpEmail({
      user: GMAIL_USER,
      pass: GMAIL_PASS,
      to,
      subject: subjectLine,
      htmlBody
    });

    return new Response(JSON.stringify({ success: true, message: 'Email copy sent successfully' }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (err) {
    console.error('SMTP error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Failed to send email' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendSmtpEmail({ user, pass, to, subject, htmlBody }) {
  const socket = connect({ hostname: 'smtp.gmail.com', port: 465 }, { secureTransport: 'on' });
  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  async function readReply() {
    let reply = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      reply += decoder.decode(value);
      const lines = reply.trim().split('\n');
      const last = lines[lines.length - 1];
      if (/^\d{3}\s/.test(last.trim())) {
        return reply;
      }
    }
    return reply;
  }

  async function sendCmd(cmd) {
    await writer.write(encoder.encode(cmd + '\r\n'));
    return await readReply();
  }

  try {
    await readReply();
    await sendCmd('EHLO localhost');
    await sendCmd('AUTH LOGIN');
    await sendCmd(btoa(user));
    await sendCmd(btoa(pass));
    await sendCmd(`MAIL FROM:<${user}>`);
    await sendCmd(`RCPT TO:<${to}>`);
    await sendCmd('DATA');

    const mime = [
      `From: "Giant Strides Online School" <${user}>`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlBody,
      '.'
    ].join('\r\n');

    await sendCmd(mime);
    await sendCmd('QUIT');
  } finally {
    try {
      reader.releaseLock();
      writer.releaseLock();
      socket.close();
    } catch (e) {
    }
  }

  return true;
}
