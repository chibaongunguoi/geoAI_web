const axios = require('axios');

(async () => {
  try {
    const loginRes = await axios.post('http://localhost:4000/auth/login', {
      identifier: 'user123',
      password: 'user123'
    });
    
    const cookie = loginRes.headers['set-cookie'];
    
    const meRes = await axios.get('http://localhost:4000/auth/me', {
      headers: { Cookie: cookie }
    });
    console.log(JSON.stringify(meRes.data, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
})();
