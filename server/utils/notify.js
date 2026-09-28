const db = require('../db/connection');

let transporter = null;

// Initialize email transport only if SMTP is configured
if (process.env.SMTP_HOST) {
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('Email notifications enabled');
  } catch {
    console.log('nodemailer not installed, email notifications disabled');
  }
}

function createNotification(userId, groupId, type, message) {
  db.prepare(
    'INSERT INTO notifications (user_id, group_id, type, message) VALUES (?, ?, ?, ?)'
  ).run(userId, groupId, type, message);
}

function notifyGroupMembers(groupId, excludeUserId, type, message) {
  const members = db.prepare(
    'SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?'
  ).all(groupId, excludeUserId);

  for (const m of members) {
    createNotification(m.user_id, groupId, type, message);
  }

  // Send emails if configured
  if (transporter) {
    const users = db.prepare(
      'SELECT u.email, u.name FROM users u JOIN group_members gm ON gm.user_id = u.id WHERE gm.group_id = ? AND u.id != ?'
    ).all(groupId, excludeUserId);

    for (const user of users) {
      sendEmail(user.email, 'Splitkar: ' + type.replace(/_/g, ' '), message).catch(() => {});
    }
  }
}

async function sendEmail(to, subject, text) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Splitkar <noreply@splitkar.app>',
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error('Email send failed:', err.message);
  }
}

module.exports = { createNotification, notifyGroupMembers };
