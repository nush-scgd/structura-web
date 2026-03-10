import { Resend } from "resend";

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "academy@structurahair.co.za";
const ADMIN_EMAIL = process.env.RESEND_ADMIN_EMAIL || "structurahair@outlook.com";

export async function sendEnrollmentEmails({
  studentName,
  studentEmail,
  courseTitle,
  sessionLabel,
  enrollmentId,
}: {
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  sessionLabel?: string;
  enrollmentId: string;
}) {
  const sessionText = sessionLabel
    ? `<p><strong>Selected intake:</strong> ${sessionLabel}</p>`
    : "";

  // 1️⃣ Student confirmation email
  try {
    await resend.emails.send({
      from: `Structura Academy <${FROM_EMAIL}>`,
      to: [studentEmail],
      subject: `Enrollment request received — ${courseTitle}`,
      html: `
        <p>Hello ${studentName},</p>

        <p>Thank you for your interest in the <strong>Structura Hair Academy</strong>.</p>

        <p>We have received your request to enroll in:</p>

        <p><strong>${courseTitle}</strong></p>

        ${sessionText}

        <p>To secure your place, payment will be required via EFT once your invoice is issued.</p>

        <p>Your enrollment reference is:</p>

        <p><strong>${enrollmentId}</strong></p>

        <p>An invoice with payment details will be sent shortly.</p>

        <p>If you have any questions, simply reply to this email.</p>

        <p>Warm regards,<br/>Structura Hair Academy</p>
      `,
    });
  } catch (err) {
    console.error("Student email failed:", err);
  }

  // 2️⃣ Admin notification email
  try {
    await resend.emails.send({
      from: `Structura Academy <${FROM_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject: "New Academy Enrollment Request",
      html: `
        <p>A new academy enrollment request has been submitted.</p>

        <p><strong>Student:</strong> ${studentName}</p>
        <p><strong>Email:</strong> ${studentEmail}</p>
        <p><strong>Course:</strong> ${courseTitle}</p>
        ${sessionText}

        <p><strong>Enrollment ID:</strong> ${enrollmentId}</p>

        <p>You can manage this enrollment from the admin dashboard.</p>
      `,
    });
  } catch (err) {
    console.error("Admin email failed:", err);
  }

  return { success: true };
}