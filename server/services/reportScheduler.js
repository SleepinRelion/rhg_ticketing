import db from '../config/database.js';
import { getMailTransporter, SMTP_FROM } from '../config/email.js';
import { buildEmailTemplate } from './emailService.js';
import { toCSV } from '../utils/csvExport.js';
import logger from '../config/logger.js';

export async function runWeeklyReports() {
  try {
    logger.info('[ReportScheduler] Running weekly automated reports...');
    
    // Calculate last week date range
    const now = new Date();
    const dateTo = new Date(now);
    const dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const dateFromStr = dateFrom.toISOString().split('T')[0];
    const dateToStr = dateTo.toISOString().split('T')[0];

    // Fetch data (ticket summary)
    const summaryData = await db('tickets')
      .select('status', 'priority', db.raw('count(*) as count'))
      .where('created_at', '>=', dateFromStr)
      .where('created_at', '<=', dateToStr)
      .whereNull('deleted_at')
      .groupBy('status', 'priority')
      .orderBy('status');

    if (summaryData.length === 0) {
      logger.info('[ReportScheduler] No tickets created last week. Skipping report.');
      return;
    }

    const csvContent = toCSV(summaryData);
    
    // Find all Managers and Admins
    const managers = await db('users')
      .whereIn('role', ['admin', 'manager'])
      .where('is_active', true)
      .whereNotNull('email');

    if (managers.length === 0) return;

    const transporter = getMailTransporter();

    for (const manager of managers) {
      const subject = `Weekly Ticket Summary (${dateFromStr} to ${dateToStr})`;
      const body = `Hello ${manager.full_name},\n\nPlease find attached the weekly ticket summary report for your hotel operations.\n\nTotal Ticket Groups: ${summaryData.length}`;

      await transporter.sendMail({
        from: `"${process.env.APP_NAME || 'Hotel Operations'}" <${SMTP_FROM}>`,
        to: manager.email,
        subject: `[Hotel Ops] ${subject}`,
        html: buildEmailTemplate({
          title: subject,
          content: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        }),
        text: body,
        attachments: [
          {
            filename: `Weekly_Report_${dateToStr}.csv`,
            content: csvContent
          }
        ]
      });
    }

    logger.info(`[ReportScheduler] Sent weekly reports to ${managers.length} managers.`);
  } catch (error) {
    logger.error(`[ReportScheduler] Failed to run weekly reports: ${error.message}`);
  }
}
