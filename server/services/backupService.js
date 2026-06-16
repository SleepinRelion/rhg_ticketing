import cron from 'node-cron';
import db from '../config/database.js';
import { getMailTransporter, SMTP_FROM } from '../config/email.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import logger from '../config/logger.js';

const execAsync = promisify(exec);

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
      const dbUrl = process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
      
      await execAsync(`pg_dump "${dbUrl}" | gzip > "${backupFilePath}"`);
      logger.info(`[BackupService] pg_dump completed: ${backupFileName}`);
      
      const transporter = getMailTransporter();
      const mailOptions = {
        from: SMTP_FROM,
        to: recipients.join(', '),
        subject: `Hotel Ticketing System - ${label} Backup (${new Date().toISOString().split('T')[0]})`,
        text: `Attached is the latest automated database backup for the Hotel Ticketing System.\n\nDate: ${new Date().toISOString()}\nType: ${label}\n\nNote: This is a compressed pg_dump file (.sql.gz). Keep it safe.`,
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

      const recipients = JSON.parse(schedule.recipients);
      if (!recipients || recipients.length === 0) continue;

      const job = cron.schedule(cronExp, async () => {
        logger.info(`[BackupService] Running scheduled ${schedule.frequency} backup...`);
        try {
          await runBackup(recipients, schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1));
          await db('backup_schedules').where('id', schedule.id).update({ last_run_at: new Date(), updated_at: new Date() });
        } catch (err) {
          logger.error(`[BackupService] Scheduled backup failed: ${err.message}`, { error: err });
        }
      });
      
      scheduledJobs.push(job);
    }
    
    logger.info(`[BackupService] Initialized ${scheduledJobs.length} backup schedules.`);
  } catch (err) {
    logger.error(`[BackupService] Failed to initialize cron jobs: ${err.message}`, { error: err });
  }
}
