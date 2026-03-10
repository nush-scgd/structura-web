import { sendEnrollmentEmails } from "../src/lib/email";

export default async function handler(req: any, res: any) {

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    const {
      studentName,
      studentEmail,
      courseTitle,
      sessionLabel,
      enrollmentId
    } = req.body;

    await sendEnrollmentEmails({
      studentName,
      studentEmail,
      courseTitle,
      sessionLabel,
      enrollmentId
    });

    return res.status(200).json({ success: true });

  } catch (error) {

    console.error("Email sending failed:", error);

    return res.status(500).json({
      error: "Email failed"
    });

  }

}
