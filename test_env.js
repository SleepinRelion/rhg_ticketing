import jwt from 'jsonwebtoken';
import db from './server/config/database.js';
import authConfig from './server/config/auth.js';

async function run() {
  const user = await db('users').where({ role: 'admin' }).first();
  const token = jwt.sign({ userId: user.id, role: user.role }, authConfig.jwtSecret, { expiresIn: '15m' });
  
  const res = await fetch('http://localhost:3001/api/settings/env', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
  process.exit(0);
}

run();
