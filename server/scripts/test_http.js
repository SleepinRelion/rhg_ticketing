import db from '../config/database.js';
import jwt from 'jsonwebtoken';
import http from 'http';

async function test() {
  const user = await db('users').where({ role: 'admin' }).first();
  const token = jwt.sign(
    { userId: user.id, role: user.role, activeHotelId: user.activeHotelId },
    process.env.JWT_SECRET || 'dev-secret-change-in-production-abc123def456ghi789',
    { expiresIn: '1h' }
  );
  
  console.log('Token:', token);

  const reqStats = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/dashboard/stats',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('Stats Response:', res.statusCode, body.slice(0, 500)));
  });
  reqStats.end();

  const reqCharts = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/dashboard/charts',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  }, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('Charts Response:', res.statusCode, body.slice(0, 500)));
  });
  reqCharts.end();
}

test();
