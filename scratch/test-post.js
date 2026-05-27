const http = require('http');

const loginData = JSON.stringify({ identifier: 'user123', password: 'user123' });
const reqLogin = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const cookies = res.headers['set-cookie'];
    console.log('Login status:', res.statusCode);
    
    // Call /api/reports
    const reportData = JSON.stringify({
      reason: 'Test',
      message: 'Test msg',
      latitude: 16.0,
      longitude: 108.0
    });

    const reqReport = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/reports',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': reportData.length,
        'Cookie': cookies ? cookies.join('; ') : ''
      }
    }, res2 => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => console.log('Report Status:', res2.statusCode, 'Body:', body2));
    });
    reqReport.write(reportData);
    reqReport.end();
  });
});

reqLogin.write(loginData);
reqLogin.end();
