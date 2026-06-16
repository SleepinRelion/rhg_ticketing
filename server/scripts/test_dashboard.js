import db from '../config/database.js';
import { generateToken } from '../middleware/auth.js';
import http from 'http';

async function test() {
  try {
    const user = await db('users').first();
    if (!user) {
      console.log('No user found');
      process.exit(1);
    }
    
    // Fake req for buildTicketVisibilityQuery if needed
    // But let's just make an HTTP request to our server on 3005
    const token = generateToken(user);
    
    console.log(`Testing charts with user ${user.email}...`);
    const req = http.request({
      hostname: 'localhost',
      port: 3005,
      path: '/api/dashboard/charts',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        console.log('Charts Status:', res.statusCode);
        console.log('Charts Response:', body.slice(0, 500));
        process.exit(0);
      });
    });
    req.on('error', e => {
      console.error('Request error:', e);
      process.exit(1);
    });
    req.end();
  } catch (err) {
    console.error('Test script error:', err);
    process.exit(1);
  }
}

test();
