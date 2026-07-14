import nodemailer from 'nodemailer';

// ─── Dev Mode Email Check ────────────────────────────────────────────────────
// If no real email credentials are configured, log to console instead of
// trying to connect to SMTP and crashing the request.
const isEmailConfigured = () => {
  const user = process.env.EMAIL_USER || '';
  const pass = process.env.EMAIL_PASS || '';
  return (
    user.length > 0 &&
    !user.includes('your_gmail') &&
    pass.length > 0 &&
    !pass.includes('your_gmail')
  );
};

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });
};

export const sendEmail = async ({ to, subject, html, text }) => {
  // ── Development fallback: print to console when no real credentials exist
  if (process.env.NODE_ENV !== 'production' && !isEmailConfigured()) {
    console.log('\n' + '─'.repeat(60));
    console.log('📧  DEV EMAIL (not sent — no SMTP credentials configured)');
    console.log(`To      : ${to}`);
    console.log(`Subject : ${subject}`);
    // Extract any links from the HTML so devs can click them
    const links = [...(html || '').matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    if (links.length) {
      console.log('Links   :');
      links.forEach(l => console.log('  ', l));
    }
    console.log('─'.repeat(60) + '\n');
    return { messageId: 'dev-console-only' };
  }

  // ── Production / real SMTP send
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`❌ Email send failed: ${error.message}`);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

export default createTransporter;
