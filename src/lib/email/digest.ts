import nodemailer from "nodemailer";

export interface DigestJob {
  jobTitle: string;
  companyName: string;
  location?: string | null;
  salaryFormatted?: string | null;
  matchScore: number;
  matchExplanation: string;
  applicationUrl: string;
}

export async function sendJobDigestEmail(options: {
  jobs: DigestJob[];
  totalScanned: number;
  newJobsCount: number;
}): Promise<{ sent: boolean; message: string }> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.DIGEST_RECIPIENT || process.env.SMTP_TO;

  if (!host || !user || !pass || !to) {
    return {
      sent: false,
      message: "SMTP configuration not provided in environment variables; email skipped.",
    };
  }

  if (options.jobs.length === 0) {
    return {
      sent: false,
      message: "No new high affinity jobs found; digest email not needed.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const jobRowsHtml = options.jobs
      .slice(0, 15)
      .map(
        (j) => `
        <div style="border-bottom: 1px solid #e2e8f0; padding: 14px 0;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <strong style="font-size: 16px; color: #1e293b;">${escapeHtml(j.jobTitle)}</strong>
            <span style="background: #ecfdf5; color: #059669; font-weight: bold; font-size: 12px; padding: 3px 8px; border-radius: 6px;">
              ${j.matchScore}% Match
            </span>
          </div>
          <div style="color: #6366f1; font-weight: 600; font-size: 13px; margin-top: 2px;">
            ${escapeHtml(j.companyName)}
          </div>
          <div style="color: #64748b; font-size: 12px; margin-top: 4px;">
            📍 ${escapeHtml(j.location || "Remote")} &nbsp;|&nbsp; 💰 ${escapeHtml(j.salaryFormatted || "Not disclosed")}
          </div>
          <div style="background: #f8fafc; border-left: 3px solid #6366f1; padding: 8px; font-size: 12px; color: #334155; margin-top: 8px; font-style: italic;">
            "${escapeHtml(j.matchExplanation)}"
          </div>
          <div style="margin-top: 8px;">
            <a href="${escapeHtml(j.applicationUrl)}" style="background: #6366f1; color: #ffffff; text-decoration: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; display: inline-block;">
              Direct Apply →
            </a>
          </div>
        </div>
      `
      )
      .join("");

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #0f172a; padding: 20px;">
        <div style="background: #0f172a; color: #ffffff; padding: 20px; border-radius: 12px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Huntly Daily Digest</h1>
          <p style="margin: 6px 0 0; font-size: 13px; color: #94a3b8;">
            ${options.jobs.length} new high affinity opportunities matching your profile
          </p>
        </div>

        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 16px;">
          <p style="font-size: 13px; color: #64748b; margin-top: 0;">
            Synchronized ${options.totalScanned} startup ATS boards. Here are the top matched positions:
          </p>
          ${jobRowsHtml}
        </div>

        <div style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 20px;">
          Huntly • Personal AI Job Discovery Platform
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Huntly Job Alert" <${user}>`,
      to,
      subject: `🎯 Huntly: ${options.jobs.length} New Matches Found (${options.jobs[0]?.companyName} & more)`,
      html,
    });

    return { sent: true, message: `Digest sent successfully to ${to}` };
  } catch (error) {
    return {
      sent: false,
      message: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

