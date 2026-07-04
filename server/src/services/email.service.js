import { sendEmail } from '../config/email.js';

const emailStyles = `
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f4f7f9; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 40px 30px; }
    .body p { color: #374151; line-height: 1.6; font-size: 15px; margin: 0 0 16px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; margin: 8px 0; }
    .footer { background: #f9fafb; padding: 24px 30px; text-align: center; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .token-box { background: #f3f4f6; border-radius: 8px; padding: 16px 24px; text-align: center; font-family: monospace; font-size: 22px; letter-spacing: 4px; color: #1f2937; font-weight: 700; margin: 16px 0; }
    .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 16px 0; }
  </style>
`;

const logoHtml = `
  <div class="header">
    <h1>🤝 SEVASETU</h1>
    <p>Connecting Hearts, Changing Lives</p>
  </div>
`;

export const sendVerificationEmail = async (user, verificationToken) => {
  const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email — SEVASETU',
    html: `
      <!DOCTYPE html><html><head>${emailStyles}</head>
      <body><div class="container">
        ${logoHtml}
        <div class="body">
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Welcome to <strong>SEVASETU</strong>! You're one step away from making a real difference.</p>
          <p>Please verify your email address by clicking the button below:</p>
          <div style="text-align:center; margin: 30px 0;">
            <a href="${verifyUrl}" class="btn">✅ Verify Email Address</a>
          </div>
          <hr class="divider">
          <p style="font-size:13px; color:#6b7280;">Or copy and paste this link in your browser:<br>
            <a href="${verifyUrl}" style="color:#4f46e5; word-break:break-all;">${verifyUrl}</a>
          </p>
          <div class="alert-box"><strong>⚠️ This link expires in 24 hours.</strong></div>
          <p>If you didn't create a SEVASETU account, please ignore this email.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} SEVASETU. All rights reserved.</p></div>
      </div></body></html>
    `,
  });
};

export const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: 'Reset Your Password — SEVASETU',
    html: `
      <!DOCTYPE html><html><head>${emailStyles}</head>
      <body><div class="container">
        ${logoHtml}
        <div class="body">
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>We received a request to reset your SEVASETU account password.</p>
          <div style="text-align:center; margin: 30px 0;">
            <a href="${resetUrl}" class="btn">🔑 Reset Password</a>
          </div>
          <hr class="divider">
          <p style="font-size:13px; color:#6b7280;">Or copy and paste this link:<br>
            <a href="${resetUrl}" style="color:#4f46e5; word-break:break-all;">${resetUrl}</a>
          </p>
          <div class="alert-box"><strong>⚠️ This link expires in 1 hour.</strong></div>
          <p>If you didn't request a password reset, your account is safe — please ignore this email.</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} SEVASETU. All rights reserved.</p></div>
      </div></body></html>
    `,
  });
};

export const sendDonationApprovedEmail = async (donor, donation) => {
  await sendEmail({
    to: donor.email,
    subject: `✅ Your Donation "${donation.title}" Has Been Approved — SEVASETU`,
    html: `
      <!DOCTYPE html><html><head>${emailStyles}</head>
      <body><div class="container">
        ${logoHtml}
        <div class="body">
          <p>Hi <strong>${donor.name}</strong>,</p>
          <div class="success-box">
            <strong>🎉 Great news!</strong> Your donation has been approved and is now live on the platform.
          </div>
          <p><strong>Donation:</strong> ${donation.title}</p>
          <p><strong>Category:</strong> ${donation.category}</p>
          <p><strong>Quantity:</strong> ${donation.quantity.value} ${donation.quantity.unit}</p>
          <p>Receivers can now browse and request your donation. We'll notify you when a match is found.</p>
          <div style="text-align:center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/donor/donations" class="btn">View My Donations</a>
          </div>
          <p>Thank you for your generosity! Together we're making a difference. 🙏</p>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} SEVASETU. All rights reserved.</p></div>
      </div></body></html>
    `,
  });
};

export const sendMatchFoundEmail = async (donor, receiver, donation, match) => {
  // Notify donor
  await sendEmail({
    to: donor.email,
    subject: `🤝 Match Found for "${donation.title}" — SEVASETU`,
    html: `
      <!DOCTYPE html><html><head>${emailStyles}</head>
      <body><div class="container">
        ${logoHtml}
        <div class="body">
          <p>Hi <strong>${donor.name}</strong>,</p>
          <div class="success-box">
            <strong>🎯 Match Found!</strong> Your donation has been matched with a receiver.
          </div>
          <p><strong>Donation:</strong> ${donation.title}</p>
          <p><strong>Receiver:</strong> ${receiver.name}</p>
          <p><strong>Match Score:</strong> ${Math.round(match.score)}%</p>
          <p>Please coordinate the pickup/delivery. You can contact the receiver through the platform.</p>
          <div style="text-align:center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/donor/donations" class="btn">View Match Details</a>
          </div>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} SEVASETU. All rights reserved.</p></div>
      </div></body></html>
    `,
  });

  // Notify receiver
  await sendEmail({
    to: receiver.email,
    subject: `🎉 Your Request Has Been Matched — SEVASETU`,
    html: `
      <!DOCTYPE html><html><head>${emailStyles}</head>
      <body><div class="container">
        ${logoHtml}
        <div class="body">
          <p>Hi <strong>${receiver.name}</strong>,</p>
          <div class="success-box">
            <strong>🎉 Your request has been matched!</strong>
          </div>
          <p><strong>Item:</strong> ${donation.title}</p>
          <p><strong>Donor:</strong> ${donor.name}</p>
          <p>Please coordinate with the donor for pickup/delivery. The donor will contact you through the platform.</p>
          <div style="text-align:center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/receiver/requests" class="btn">View My Requests</a>
          </div>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} SEVASETU. All rights reserved.</p></div>
      </div></body></html>
    `,
  });
};

export const sendWelcomeEmail = async (user) => {
  const dashboardUrl = `${process.env.CLIENT_URL}/${user.role}/dashboard`;
  await sendEmail({
    to: user.email,
    subject: `Welcome to SEVASETU, ${user.name.split(' ')[0]}! 🎉`,
    html: `
      <!DOCTYPE html><html><head>${emailStyles}</head>
      <body><div class="container">
        ${logoHtml}
        <div class="body">
          <p>Hi <strong>${user.name}</strong>,</p>
          <div class="success-box">
            <strong>🎊 Your email has been verified! Welcome aboard.</strong>
          </div>
          <p>You've joined thousands of people making a real difference through SEVASETU.</p>
          <p>As a <strong>${user.role}</strong>, you can now:</p>
          ${user.role === 'donor' ? `
            <ul>
              <li>📦 Post donation items</li>
              <li>🤝 Get matched with receivers</li>
              <li>📊 Track your impact</li>
            </ul>
          ` : user.role === 'receiver' ? `
            <ul>
              <li>🔍 Browse available donations</li>
              <li>📋 Submit requests</li>
              <li>🏠 Receive items for your community</li>
            </ul>
          ` : ''}
          <div style="text-align:center; margin: 30px 0;">
            <a href="${dashboardUrl}" class="btn">Go to My Dashboard →</a>
          </div>
        </div>
        <div class="footer"><p>© ${new Date().getFullYear()} SEVASETU. All rights reserved.</p></div>
      </div></body></html>
    `,
  });
};
