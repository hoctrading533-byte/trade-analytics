// fetch is available natively in Node 18+
async function run() {
  try {
    // Assuming user logged in, we need a token. We can't easily get it without logging in.
    // Let's generate a token directly using the same secret.
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ sub: '9238b830-51a1-4447-9cb8-759c116fed99', role: 'admin' }, 'dinhvantam21052007@admi', { expiresIn: '7d' });
    
    console.log("Fetching API...");
    const res = await fetch('http://localhost:4000/api/mt5/accounts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
