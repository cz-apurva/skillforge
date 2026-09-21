const test = require('node:test');
const assert = require('node:assert');
 const http = require('http');

process.env.USE_MEMORY_DB = 'true';
process.env.PORT = '0';

const app = require('../src/app');

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('Authentication & RBAC Token Flow API Tests', async (t) => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  let studentToken;
  let teacherToken;
  let adminToken;
  let resetToken;

  await t.test('1. POST /login - Rejects invalid password', async () => {
    const res = await request('POST', '/login', {
      email: 'teacher@skillforge.ai',
      password: 'WrongPassword!',
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
  });

  await t.test('2. POST /login - Successfully authenticates Teacher and returns JWT with role', async () => {
    const res = await request('POST', '/login', {
      email: 'teacher@skillforge.ai',
      password: 'Password123!',
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.data.role, 'TEACHER');
    assert.strictEqual(res.body.data.email, 'teacher@skillforge.ai');
    teacherToken = res.body.token;
  });

  await t.test('3. POST /login - Successfully authenticates Student and returns JWT with role', async () => {
    const res = await request('POST', '/login', {
      email: 'student@skillforge.ai',
      password: 'Password123!',
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.role, 'STUDENT');
    studentToken = res.body.token;
  });

  await t.test('4. POST /login - Successfully authenticates Admin and returns JWT with role', async () => {
    const res = await request('POST', '/login', {
      email: 'admin@skillforge.ai',
      password: 'Password123!',
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.role, 'ADMIN');
    adminToken = res.body.token;
  });

  await t.test('5. GET /me - Returns authenticated user details from JWT Bearer token', async () => {
    const res = await request('GET', '/me', null, {
      Authorization: `Bearer ${teacherToken}`,
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.role, 'TEACHER');
    assert.strictEqual(res.body.data.email, 'teacher@skillforge.ai');
  });

  await t.test('6. POST /forgot-password - Generates secure reset token', async () => {
    const res = await request('POST', '/forgot-password', {
      email: 'student@skillforge.ai',
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.reset_token);
    resetToken = res.body.reset_token;
  });

  await t.test('7. POST /reset-password - Resets password with bcrypt hashing and enables new login', async () => {
    const resetRes = await request('POST', '/reset-password', {
      token: resetToken,
      newPassword: 'BrandNewPassword2026!',
    });

    assert.strictEqual(resetRes.statusCode, 200);
    assert.strictEqual(resetRes.body.success, true);

    // Old password must now fail
    const oldLoginRes = await request('POST', '/login', {
      email: 'student@skillforge.ai',
      password: 'Password123!',
    });
    assert.strictEqual(oldLoginRes.statusCode, 401);

    // New password must succeed
    const newLoginRes = await request('POST', '/login', {
      email: 'student@skillforge.ai',
      password: 'BrandNewPassword2026!',
    });
    assert.strictEqual(newLoginRes.statusCode, 200);
    assert.strictEqual(newLoginRes.body.success, true);
    assert.strictEqual(newLoginRes.body.data.role, 'STUDENT');
  });
});
