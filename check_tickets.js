import db from './server/config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function check() {
  const tickets = await db('tickets').orderBy('id', 'desc').limit(5);
  console.log(tickets.map(t => ({ id: t.id, title: t.title, hotel_id: t.hotel_id })));
  process.exit(0);
}
check();
