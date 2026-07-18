const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      mobile: '9000000001',
      password: 'admin123'
    });
    console.log('Login succeeded:', res.data);
  } catch (err) {
    console.error('Login failed:', err.response ? err.response.data : err.message);
  }
}

test();
