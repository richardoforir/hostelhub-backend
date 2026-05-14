const axios = require('axios');

async function testLogin() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    console.log('Login success:', res.data);
  } catch (err) {
    console.error('Login error:', err.response ? err.response.data : err.message);
  }
}

testLogin();
