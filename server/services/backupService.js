import cron from 'node-cron';
import db from '../config/database.js';
import { getMailTransporter, SMTP_FROM } from '../config/email.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import logger from '../config/logger.js';
import { buildEmailTemplate } from './emailService.js';

export async function runBackup(recipients, label = 'Manual') {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `hotel_tickets_backup_${label.toLowerCase()}_${dateStr}.sql.gz`;
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFilePath = path.join(backupDir, backupFileName);
  
  try {
    if (!fs.existsSync(backupDir)){
      fs.mkdirSync(backupDir, { recursive: true });
    }

    if (db.client.config.client === 'pg') {
      logger.info(`[BackupService] Starting pg_dump for ${label}...`);
      await new Promise((resolve, reject) => {
        const pgDump = spawn('pg_dump', [
          '-h', process.env.DB_HOST || '127.0.0.1',
          '-p', process.env.DB_PORT || '5432',
          '-U', process.env.DB_USER,
          process.env.DB_NAME
        ], {
          env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
        });
        const gzip = spawn('gzip');
        const writeStream = fs.createWriteStream(backupFilePath);

        pgDump.stdout.pipe(gzip.stdin);
        gzip.stdout.pipe(writeStream);

        let errorLogged = false;
        const handleError = (err) => {
          if (!errorLogged) {
            errorLogged = true;
            reject(err);
          }
        };

        pgDump.stderr.on('data', (data) => {
          logger.warn(`[pg_dump] ${data.toString().trim()}`);
        });

        pgDump.on('error', handleError);
        gzip.on('error', handleError);
        writeStream.on('error', handleError);

        writeStream.on('finish', resolve);
        
        pgDump.on('close', (code) => {
          if (code !== 0) handleError(new Error(`pg_dump exited with code ${code}`));
          gzip.stdin.end();
        });
      });
      logger.info(`[BackupService] pg_dump completed: ${backupFileName}`);
      
      const transporter = getMailTransporter();
      const subjectText = `Hotel Ticketing System - ${label} Backup (${new Date().toISOString().split('T')[0]})`;
      const mailOptions = {
        from: SMTP_FROM,
        to: recipients.join(', '),
        subject: subjectText,
        text: `Attached is the latest automated database backup for the Hotel Ticketing System.\n\nDate: ${new Date().toISOString()}\nType: ${label}\n\nNote: This is a compressed pg_dump file (.sql.gz). Keep it safe.`,
        html: buildEmailTemplate({
          title: `Database Backup: ${label}`,
          content: `<p style="margin-top: 0;">Attached is the latest automated database backup.</p>
                    <ul style="color: #475569; padding-left: 20px;">
                      <li><strong>Type:</strong> ${label}</li>
                      <li><strong>Date:</strong> ${new Date().toISOString()}</li>
                    </ul>
                    <p style="margin-bottom: 0;"><strong>Note:</strong> This is a compressed PostgreSQL dump file (<code>.sql.gz</code>). Please store it securely.</p>`,
        }),
        attachments: [
          {
            filename: backupFileName,
            path: backupFilePath
          }
        ]
      };
      
      await transporter.sendMail(mailOptions);
      logger.info(`[BackupService] Successfully sent ${label} backup to ${recipients.join(', ')}`);
    } else {
       logger.warn(`[BackupService] pg_dump is only supported for PostgreSQL. Skipping full backup.`);
    }
  } catch (err) {
    logger.error(`[BackupService] Failed to run backup: ${err.message}`);
    throw err;
  }
}

// Scheduled Jobs
let scheduledJobs = [];

export async function initializeCronJobs() {
  // Clear existing jobs
  scheduledJobs.forEach(job => job.stop());
  scheduledJobs = [];

  try {
    const schedules = await db('backup_schedules').where('is_active', true);
    
    for (const schedule of schedules) {
      let cronExp = '';
      switch(schedule.frequency) {
        case 'daily': cronExp = '0 2 * * *'; break; // 2 AM daily
        case 'weekly': cronExp = '0 2 * * 0'; break; // 2 AM Sunday
        case 'monthly': cronExp = '0 2 1 * *'; break; // 2 AM 1st of month
        case 'quarterly': cronExp = '0 2 1 */3 *'; break; // 2 AM 1st of every 3rd month
        case 'yearly': cronExp = '0 2 1 1 *'; break; // 2 AM Jan 1st
        default: continue;
      }

      let recipients = [];
      try {
        recipients = typeof schedule.recipients === 'string' ? JSON.parse(schedule.recipients) : schedule.recipients;
      } catch (err) {
        logger.error(`[BackupService] Failed to parse recipients for schedule ${schedule.id}: ${err.message}`);
        continue;
      }
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) continue;

      const job = cron.schedule(cronExp, async () => {
        logger.info(`[BackupService] Running scheduled ${schedule.frequency} backup...`);
        try {
          await runBackup(recipients, schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1));
          await db('backup_schedules').where('id', schedule.id).update({ last_run_at: new Date(), updated_at: new Date() });
        } catch (err) {
          logger.error(`[BackupService] Scheduled backup failed: ${err.message}`, { error: err });
        }
      }, {
        timezone: process.env.APP_TIMEZONE || 'UTC'
      });
      
      scheduledJobs.push(job);
    }
    
    logger.info(`[BackupService] Initialized ${scheduledJobs.length} backup schedules.`);
  } catch (err) {
    logger.error(`[BackupService] Failed to initialize cron jobs: ${err.message}`, { error: err });
  }
}
