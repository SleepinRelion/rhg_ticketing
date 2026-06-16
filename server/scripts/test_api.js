import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const data = JSON.parse(body);
    const token = data.token;
    
    if (!token) {
      console.log('Login failed', body);
      return;
    }
    
    const chartReq = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/dashboard/charts',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }, res2 => {
      let b = '';
      res2.on('data', d => b += d);
      res2.on('end', () => {
        console.log('Status:', res2.statusCode);
        console.log('Response:', b.slice(0, 500));
      });
    });
    chartReq.end();
  });
});

req.write(JSON.stringify({
  email: 'admin@hotel.com',
  password: 'admin123'
}));
req.end();
