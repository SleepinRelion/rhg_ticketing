import xlsx from 'xlsx';
import db from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateTicketNumber } from '../utils/ticketNumber.js';

/**
 * Generates a stable fingerprint for a legacy import row.
 * Used to detect re-imports of the same data and skip duplicates.
 */
function makeFingerprint(hotelId, dateStr, title, agentUsername) {
  const raw = `${hotelId}|${dateStr}|${(title || '').substring(0, 80).toLowerCase().trim()}|${agentUsername || ''}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Normalizes Excel serial date to JS Date
 */
function excelDateToJSDate(serial) {
  if (typeof serial === 'string') {
    const parsed = new Date(serial);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

/**
 * Parses time spent from string (e.g. "30 mins", "1h") to minutes
 */
function parseTimeSpent(timeStr) {
  if (!timeStr) return 0;
  timeStr = timeStr.toString().toLowerCase();
  let minutes = 0;
  if (timeStr.includes('h')) {
    const parts = timeStr.split('h');
    minutes += parseInt(parts[0]) * 60;
    if (parts[1] && parts[1].includes('m')) {
      minutes += parseInt(parts[1].replace(/[^0-9]/g, '')) || 0;
    }
  } else if (timeStr.includes('m')) {
    minutes += parseInt(timeStr.replace(/[^0-9]/g, '')) || 0;
  } else {
    minutes += parseInt(timeStr) || 0;
  }
  return minutes;
}

/**
 * Auto-categorize tickets based on issue description using known database categories
 */
function guessCategoryId(issueText) {
  if (!issueText) return null;
  const text = issueText.toString().toLowerCase();
  if (text.includes('printer') || text.includes('paper') || text.includes('toner')) return 8; // Printer Issue
  if (text.includes('pc ') || text.includes('laptop') || text.includes('boot') || text.includes('mouse') || text.includes('keyboard')) return 9; // Workstation Issue
  if (text.includes('wi-fi') || text.includes('wifi') || text.includes('internet') || text.includes('network')) return 11; // Guest Wi-Fi
  if (text.includes('pos') || text.includes('terminal')) return 13; // POS Terminal Down
  if (text.includes('tv') || text.includes('casting')) return 14; // In-Room TV
  if (text.includes('pms') || text.includes('opera') || text.includes('software')) return 10; // PMS Software
  if (text.includes('server') || text.includes('infrastructure')) return 6; // Servers & Infrastructure
  if (text.includes('phone') || text.includes('pbx') || text.includes('call')) return 4; // Telephony (PBX)
  return null;
}

export async function processImportedFiles(files, adminUserId) {
  const results = {
    totalFiles: files.length,
    processedRows: 0,
    createdTickets: 0,
    skippedDuplicates: 0,
    createdUsers: 0,
    errors: [],
  };

  const defaultPassword = await bcrypt.hash('welcome123', 10);

  let othersCategory = await db('categories').where('name', 'Others').first();
  if (!othersCategory) {
    const [insertedId] = await db('categories').insert({
      name: 'Others',
      description: 'Uncategorized imported tickets',
      created_at: new Date()
    }).returning('id');
    othersCategory = { id: typeof insertedId === 'object' ? insertedId.id : insertedId };
  }

  for (const file of files) {
    try {
      const workbook = xlsx.readFile(file.path);
      
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        if (!data || data.length === 0) continue;

        const titleRow = data[0][0] || '';
        let globalHotelId = null;

        if (titleRow.includes('MRUZG')) globalHotelId = 3; // Azuri
        else if (titleRow.includes('MRUZL')) globalHotelId = 2; // Poste Lafayette
        else if (titleRow.includes('MRUIA')) globalHotelId = 1; // Crystal Beach

        // Try to parse date from filename if missing in rows (e.g. Daily Intervention Report 02-May-26.xlsx)
        let defaultDate = new Date();
        const dateMatch = file.originalname.match(/(\d{2}-[a-zA-Z]{3}-\d{2})/);
        if (dateMatch) {
          defaultDate = new Date(dateMatch[1]);
        }

        // Cache agent lookups within this file to avoid repeat queries
        const agentCache = new Map();

        // Start transaction per sheet
      await db.transaction(async (trx) => {
        // Find header row index
        let headerRowIdx = -1;
        let formatType = null;
        for (let i = 0; i < Math.min(15, data.length); i++) {
          if (data[i]) {
            if (data[i][1] === 'Issue Encountered') {
              headerRowIdx = i;
              formatType = 'standard';
              break;
            } else if (data[i][0] === 'Hotel Name' && data[i][2] === 'Description') {
              headerRowIdx = i;
              formatType = 'tv_activity';
              break;
            }
          }
        }

        if (headerRowIdx === -1) {
          throw new Error('Could not find recognizable header row');
        }

        if (formatType === 'standard' && !globalHotelId) {
          throw new Error(`Could not determine hotel from title '${titleRow}'`);
        }

        // Initialize ticket numbering sequence
        const year = new Date().getFullYear();
        const prefix = `TKT-${year}-`;
        const lastTicket = await trx('tickets')
          .where('ticket_number', 'like', `${prefix}%`)
          .orderByRaw('CAST(REPLACE(ticket_number, ?, "") AS INTEGER) DESC', [prefix])
          .first();
        let lastNum = 0;
        if (lastTicket) {
          lastNum = parseInt(lastTicket.ticket_number.replace(prefix, ''), 10);
        }

        for (let i = headerRowIdx + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length < 2) continue; // Empty or summary row
          if (row[0] === 'SUMMARY' || (typeof row[0] === 'string' && row[0].includes('Total Interventions:'))) break; // Stop at summary block

          let dateVal, issue, action, timeStr, statusStr, agentName, rowHotelId;

          if (formatType === 'standard') {
            rowHotelId = globalHotelId;
            dateVal = row[0];
            issue = row[1];
            action = row[2];
            timeStr = row[3];
            statusStr = row[4];
            agentName = row[5];
          } else if (formatType === 'tv_activity') {
            const hotelCode = typeof row[0] === 'string' ? row[0].trim() : '';
            if (hotelCode === 'MRUZG') rowHotelId = 3;
            else if (hotelCode === 'MRUZL') rowHotelId = 2;
            else if (hotelCode === 'MRUIA') rowHotelId = 1;
            else continue; // Skip invalid hotel codes

            dateVal = row[1];
            issue = 'Hotel TV Track Activity';
            action = row[2]; // Description
            timeStr = row[4];
            statusStr = 'completed';
            agentName = null;
          }

          if (!issue && !action) continue; // Skip truly empty lines

          results.processedRows++;

          let recordDate = defaultDate;
          if (dateVal) {
            if (typeof dateVal === 'number') recordDate = excelDateToJSDate(dateVal);
            else {
              const parsed = new Date(dateVal);
              if (!isNaN(parsed.getTime())) recordDate = parsed;
            }
          }

          let agentId = null;
          if (agentName) {
            let username = agentName.trim().toLowerCase().replace(/\s+/g, '.');
            username = username.replace(/[^a-z0-9.]/g, '').substring(0, 50);
            const agentEmail = `${username}@legacy-import.com`;

            // Check in-memory cache first (same file, same transaction)
            if (agentCache.has(username)) {
              agentId = agentCache.get(username);
            } else {
              // Look up by username first
              let agent = await trx('users')
                .where('username', username)
                .orWhere('email', agentEmail)
                .first();

              if (!agent) {
                // Use a savepoint so a duplicate-key error doesn't abort the whole transaction.
                // PostgreSQL requires this — a failed statement inside a transaction marks
                // the entire transaction as aborted unless you roll back to a savepoint first.
                const sp = `sp_user_${username.replace(/[^a-z0-9]/g, '_')}`;
                try {
                  await trx.raw(`SAVEPOINT "${sp}"`);
                  await trx('users').insert({
                    full_name:        agentName.trim(),
                    username,
                    email:            agentEmail,
                    password_hash:    defaultPassword,
                    role:             'technician',
                    primary_hotel_id: rowHotelId,
                    is_active:        true,
                    created_at:       new Date(),
                  });
                  await trx.raw(`RELEASE SAVEPOINT "${sp}"`);
                  results.createdUsers++;
                } catch (insertErr) {
                  // 23505 = unique_violation (PostgreSQL error code)
                  if (insertErr.code === '23505' || (insertErr.message && insertErr.message.includes('unique constraint'))) {
                    await trx.raw(`ROLLBACK TO SAVEPOINT "${sp}"`);
                  } else {
                    throw insertErr;
                  }
                }

                // Re-fetch regardless of whether insert succeeded or was skipped
                agent = await trx('users')
                  .where('username', username)
                  .orWhere('email', agentEmail)
                  .first();
              }

              if (agent) {
                agentId = agent.id;
                agentCache.set(username, agentId);

                // Ensure hotel access — same savepoint pattern
                if (rowHotelId) {
                  const hasAccess = await trx('user_hotels')
                    .where({ user_id: agentId, hotel_id: rowHotelId })
                    .first();
                  if (!hasAccess) {
                    const sp2 = `sp_uh_${agentId}_${rowHotelId}`;
                    try {
                      await trx.raw(`SAVEPOINT "${sp2}"`);
                      await trx('user_hotels').insert({ user_id: agentId, hotel_id: rowHotelId });
                      await trx.raw(`RELEASE SAVEPOINT "${sp2}"`);
                    } catch (uhErr) {
                      if (uhErr.code === '23505' || (uhErr.message && uhErr.message.includes('unique constraint'))) {
                        await trx.raw(`ROLLBACK TO SAVEPOINT "${sp2}"`);
                      } else {
                        throw uhErr;
                      }
                    }
                  }
                }
              }
            }
          }


          // Map status
          let ticketStatus = 'closed';
          if (statusStr) {
            const s = statusStr.toLowerCase();
            if (s.includes('pending') || s.includes('progress')) ticketStatus = 'in_progress';
            else if (s.includes('resolved') || s.includes('completed')) ticketStatus = 'closed';
          }

          // Create ticket (idempotent via fingerprint)
          const categoryId = guessCategoryId(issue) || othersCategory.id;
          let ticketTitle = issue ? issue.toString() : (action ? action.toString() : 'Imported Intervention');

          // Build a stable fingerprint for this row so re-importing the same files
          // does not create duplicate tickets.
          const agentUsername = agentName ? agentName.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '').substring(0, 50) : '';
          const fingerprint = makeFingerprint(
            rowHotelId,
            recordDate.toISOString().substring(0, 10),
            ticketTitle,
            agentUsername
          );

          const existingTicket = await trx('tickets').where('import_fingerprint', fingerprint).first();
          if (existingTicket) {
            results.skippedDuplicates++;
            continue;
          }

          lastNum++;
          const ticketNumber = `${prefix}${String(lastNum).padStart(4, '0')}`;

          const [insertedTicketId] = await trx('tickets').insert({
            ticket_number: ticketNumber,
            title: ticketTitle.substring(0, 255),
            description: action ? action.toString() : null,
            status: ticketStatus,
            priority: 'medium',
            category_id: categoryId,
            department: 'maintenance',
            hotel_id: rowHotelId,
            created_by: agentId || adminUserId,
            created_at: recordDate.toISOString(),
            updated_at: recordDate.toISOString(),
            resolved_at: ticketStatus === 'closed' ? recordDate.toISOString() : null,
            import_fingerprint: fingerprint,
          }).returning('id');

          const tId = typeof insertedTicketId === 'object' ? insertedTicketId.id : insertedTicketId;

          if (agentId) {
            await trx('ticket_assignees').insert({
              ticket_id: tId,
              user_id: agentId,
              assigned_by: adminUserId,
              assigned_at: recordDate
            }).onConflict(['ticket_id', 'user_id']).ignore();

            const minutes = parseTimeSpent(timeStr);
            if (minutes > 0 || action) {
              await trx('interventions').insert({
                ticket_id: tId,
                technician_id: agentId,
                duration_minutes: minutes || 0,
                description: action ? action.toString() : 'Legacy imported intervention',
                created_at: recordDate
              });
            }
          }

          results.createdTickets++;
        }
      });
      } // end sheet loop
    } catch (err) {
      results.errors.push(`File ${file.originalname}: ${err.message}`);
    }
  }

  return results;
}
