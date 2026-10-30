const http = require('http');

function post(path, data, token) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function del(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'DELETE',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('[Tester] 1. Registering & logging in user...');
  const email = `test_${Date.now()}@example.com`;
  const password = 'Password@123';
  
  await post('/auth/register', { email, password });
  const loginRes = await post('/auth/login', { email, password });
  const token = loginRes.data.token;
  console.log('[Tester] Logged in successfully. Token received.');

  console.log('[Tester] 2. Sending POST /tasks...');
  const createRes = await post('/tasks', {
    title: 'Practical 10 Async Task',
    description: 'Testing event-driven background processing'
  }, token);

  console.log(`[Tester] Received API HTTP Response status: ${createRes.status}`);
  console.log('[Tester] Created Task ID:', createRes.data._id);

  console.log('[Tester] Waiting 3 seconds for asynchronous task-created handler to finish...');
  await new Promise(r => setTimeout(r, 3000));

  console.log('[Tester] 3. Sending DELETE /tasks/' + createRes.data._id + '...');
  const delRes = await del('/tasks/' + createRes.data._id, token);
  console.log(`[Tester] Received API HTTP Delete Response status: ${delRes.status}`);

  console.log('[Tester] Waiting 1 second for task-deleted handler...');
  await new Promise(r => setTimeout(r, 1000));

  console.log('[Tester] All tests completed!');
}

run().catch(console.error);
