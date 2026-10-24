import { io as ClientSocket, Socket } from 'socket.io-client';
import { UserRole, HttpHeader, RealtimeEvent, SeedApiKey } from '../src/common/enums';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, message: string): void {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function request(path: string, options: RequestInit = {}): Promise<{ status: number; body: any; headers: Headers }> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  let body: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    const text = await res.text();
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: res.status, body, headers: res.headers };
}

async function runStage3Verification() {
  console.log('============================================================');
  console.log('[STAGE-3 TEST] Commencing Real-Time Updates & RBAC Verification');
  console.log(`[STAGE-3 TEST] Target URL: ${BASE_URL}`);
  console.log('============================================================\n');

  // --------------------------------------------------------------------------
  // 1. Health check & Server Connectivity
  // --------------------------------------------------------------------------
  console.log('[TEST GROUP 1] Server & Socket.io Handshake');
  const healthRes = await request('/health');
  assert(healthRes.status === 200, 'Server health check returns HTTP 200 OK');

  // Connect Socket.io client
  const socket: Socket = ClientSocket(BASE_URL, {
    transports: ['websocket', 'polling'],
    timeout: 5000,
  });

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      assert(socket.connected, `Socket.io client connected with ID: ${socket.id}`);
      resolve();
    });
    socket.on('connect_error', (err) => {
      reject(new Error(`Socket connection failed: ${err.message}`));
    });
  });

  // --------------------------------------------------------------------------
  // 2. Credentialed Authentication: Register, Password Login, and Role Security
  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Credentialed Authentication & Database Role Verification');

  // 2a. Account Registration (Role is assigned by system to CONTRIBUTOR)
  const uniqueUsername = `agent_${Date.now()}`;
  const registerRes = await request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: uniqueUsername,
      password: 'SecurePassword@123',
    }),
  });
  assert(registerRes.status === 201, 'POST /api/v1/auth/register returns HTTP 201 Created');
  assert(registerRes.body.user.role === UserRole.CONTRIBUTOR, 'Registered user receives system-assigned CONTRIBUTOR role');
  assert(typeof registerRes.body.token === 'string', 'Registration issues valid Bearer JWT');

  // 2b. Duplicate Username Rejection
  const duplicateRegisterRes = await request('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      username: uniqueUsername,
      password: 'SecurePassword@123',
    }),
  });
  assert(duplicateRegisterRes.status === 409, 'Duplicate username registration returns HTTP 409 Conflict');

  // 2c. Login with Incorrect Password Rejection
  const invalidPasswordRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'IncorrectPassword!',
    }),
  });
  assert(invalidPasswordRes.status === 401, 'Login with incorrect password returns HTTP 401 Unauthorized');

  // 2d. Login as Admin with Valid Credentials (Database role ADMIN)
  const adminLoginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'Admin@123',
    }),
  });
  assert(adminLoginRes.status === 200, 'Admin login with valid password returns HTTP 200 OK');
  assert(adminLoginRes.body.user.role === UserRole.ADMIN, 'Admin role is verified from database record as ADMIN');
  const adminJwt = adminLoginRes.body.token;

  // 2e. Login as Contributor with Valid Credentials (Database role CONTRIBUTOR)
  const contribLoginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'contributor',
      password: 'Contributor@123',
    }),
  });
  assert(contribLoginRes.status === 200, 'Contributor login returns HTTP 200 OK');
  assert(contribLoginRes.body.user.role === UserRole.CONTRIBUTOR, 'Contributor role is verified from database as CONTRIBUTOR');
  const contributorJwt = contribLoginRes.body.token;

  // 2f. Login as Viewer with Valid Credentials (Database role VIEWER)
  const viewerLoginRes = await request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'viewer',
      password: 'Viewer@123',
    }),
  });
  assert(viewerLoginRes.status === 200, 'Viewer login returns HTTP 200 OK');
  assert(viewerLoginRes.body.user.role === UserRole.VIEWER, 'Viewer role is verified from database as VIEWER');
  const viewerJwt = viewerLoginRes.body.token;

  // 2g. Verify /api/v1/auth/me with Bearer JWT
  const meJwtRes = await request('/api/v1/auth/me', {
    headers: { [HttpHeader.AUTHORIZATION]: `Bearer ${adminJwt}` },
  });
  assert(meJwtRes.status === 200, 'GET /api/v1/auth/me returns HTTP 200');
  assert(meJwtRes.body.data.user.role === UserRole.ADMIN, 'Identity profile fetched from DB has role ADMIN');

  // 2h. Database API Key Authentication (Machine-to-Machine)
  const apiKeyMeRes = await request('/api/v1/auth/me', {
    headers: { [HttpHeader.X_API_KEY]: SeedApiKey.ADMIN },
  });
  assert(apiKeyMeRes.status === 200, 'GET /api/v1/auth/me with X-API-Key returns HTTP 200');
  assert(apiKeyMeRes.body.data.user.role === UserRole.ADMIN, 'API Key authenticates admin identity via database record');

  // 2i. Invalidation on Invalid Bearer Token
  const meInvalidRes = await request('/api/v1/auth/me', {
    headers: { [HttpHeader.AUTHORIZATION]: 'Bearer invalid.bogus.token' },
  });
  assert(meInvalidRes.status === 401, 'GET /api/v1/auth/me with invalid token returns HTTP 401 Unauthorized');

  // 2j. Logout acknowledgment
  const logoutRes = await request('/api/v1/auth/logout', { method: 'POST' });
  assert(logoutRes.status === 200, 'POST /api/v1/auth/logout returns HTTP 200 OK');

  // --------------------------------------------------------------------------
  // 3. RBAC Enforcement & Elimination of Client Role Claiming
  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] RBAC Permission Matrix & Client-Forging Rejection');

  // 3a. Unauthenticated POST /disasters rejected
  const unauthCreateRes = await request('/api/v1/disasters', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Unauthenticated Flood Incident',
      description: 'Attempting to create disaster without credentials.',
    }),
  });
  assert(unauthCreateRes.status === 401, 'Unauthenticated POST /disasters returns HTTP 401 Unauthorized');

  // 3b. Client attempting to self-claim role via 'x-user-role' header is REJECTED
  const fakeRoleCreateRes = await request('/api/v1/disasters', {
    method: 'POST',
    headers: { [HttpHeader.X_USER_ROLE]: 'admin' },
    body: JSON.stringify({
      title: 'Forged Role Disaster Attempt',
      description: 'Client attempting to self-claim admin role without token.',
    }),
  });
  assert(fakeRoleCreateRes.status === 401, 'Client self-claiming role via header is rejected with HTTP 401 (no token)');

  // 3c. VIEWER token attempting POST /disasters is FORBIDDEN
  const viewerCreateRes = await request('/api/v1/disasters', {
    method: 'POST',
    headers: { [HttpHeader.AUTHORIZATION]: `Bearer ${viewerJwt}` },
    body: JSON.stringify({
      title: 'Viewer Flood Test',
      description: 'Flooding in Queens, NY',
    }),
  });
  assert(viewerCreateRes.status === 403, 'Authenticated VIEWER attempting POST /disasters returns HTTP 403 Forbidden');

  // 3d. Unauthenticated GET /disasters allowed (Public read)
  const publicGetRes = await request('/api/v1/disasters');
  assert(publicGetRes.status === 200, 'Unauthenticated GET /disasters returns HTTP 200 OK (Public read)');

  // --------------------------------------------------------------------------
  // 4. Real-Time Event Dispatch via Socket.io
  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Real-Time Socket.io Event Verification');

  // Setup event listeners for real-time checks
  let createdEventPromise = new Promise<any>((resolve) => {
    socket.once(RealtimeEvent.DISASTER_CREATED, (data) => {
      resolve(data);
    });
  });

  // 4a. Authenticated CONTRIBUTOR creates disaster incident -> triggers disaster_created broadcast
  const createRes = await request('/api/v1/disasters', {
    method: 'POST',
    headers: { [HttpHeader.AUTHORIZATION]: `Bearer ${contributorJwt}` },
    body: JSON.stringify({
      title: 'Stage 3 Real-time Wildfire Incident',
      description: 'Rapid spreading brushfire near San Francisco, California requiring live alerts.',
      tags: ['wildfire', 'stage3', 'evacuation'],
      status: 'ACTIVE',
    }),
  });
  assert(createRes.status === 201, 'Contributor POST /disasters returns HTTP 201 Created');
  const createdDisaster = createRes.body.data;
  assert(createdDisaster.id !== undefined, 'Created disaster has valid ID');
  assert(createdDisaster.createdBy === 'contributor', 'Incident createdBy attributed to authenticated user');

  // Wait for Socket.io event with timeout
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Socket.io event timeout')), 4000));
  const createdEvent: any = await Promise.race([createdEventPromise, timeoutPromise]);
  assert(createdEvent.event === RealtimeEvent.DISASTER_CREATED, 'Socket received RealtimeEvent.DISASTER_CREATED');
  assert(createdEvent.data.id === createdDisaster.id, 'Socket event data ID matches created disaster');
  assert(createdEvent.data.title === createdDisaster.title, 'Socket event data title matches created disaster');
  assert(typeof createdEvent.timestamp === 'string', 'Socket event contains ISO timestamp');

  // 4b. Authenticated CONTRIBUTOR updates disaster incident -> triggers disaster_updated broadcast
  let updatedEventPromise = new Promise<any>((resolve) => {
    socket.once(RealtimeEvent.DISASTER_UPDATED, (data) => {
      resolve(data);
    });
  });

  const updateRes = await request(`/api/v1/disasters/${createdDisaster.id}`, {
    method: 'PATCH',
    headers: { [HttpHeader.AUTHORIZATION]: `Bearer ${contributorJwt}` },
    body: JSON.stringify({
      status: 'CONTAINED',
      tags: ['wildfire', 'stage3', 'contained'],
    }),
  });
  assert(updateRes.status === 200, 'Contributor PATCH /disasters/:id returns HTTP 200 OK');
  assert(updateRes.body.data.status === 'CONTAINED', 'Disaster status updated to CONTAINED');

  const updatedEvent: any = await Promise.race([updatedEventPromise, timeoutPromise]);
  assert(updatedEvent.event === RealtimeEvent.DISASTER_UPDATED, 'Socket received RealtimeEvent.DISASTER_UPDATED');
  assert(updatedEvent.data.id === createdDisaster.id, 'Socket event ID matches updated disaster');
  assert(updatedEvent.data.status === 'CONTAINED', 'Socket event status reflects CONTAINED');

  // --------------------------------------------------------------------------
  // 5. RBAC Deletion Restrictions (ADMIN vs CONTRIBUTOR)
  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Deletion RBAC Restrictions (FR-005, FR-017)');

  // 5a. Authenticated CONTRIBUTOR attempts DELETE -> 403 Forbidden
  const contribDeleteRes = await request(`/api/v1/disasters/${createdDisaster.id}`, {
    method: 'DELETE',
    headers: { [HttpHeader.AUTHORIZATION]: `Bearer ${contributorJwt}` },
  });
  assert(contribDeleteRes.status === 403, 'Contributor DELETE /disasters/:id returns HTTP 403 Forbidden');

  // 5b. Authenticated VIEWER attempts DELETE -> 403 Forbidden
  const viewerDeleteRes = await request(`/api/v1/disasters/${createdDisaster.id}`, {
    method: 'DELETE',
    headers: { [HttpHeader.AUTHORIZATION]: `Bearer ${viewerJwt}` },
  });
  assert(viewerDeleteRes.status === 403, 'Viewer DELETE /disasters/:id returns HTTP 403 Forbidden');

  // 5c. Authenticated ADMIN attempts DELETE -> 204 No Content
  const adminDeleteRes = await request(`/api/v1/disasters/${createdDisaster.id}`, {
    method: 'DELETE',
    headers: { [HttpHeader.AUTHORIZATION]: `Bearer ${adminJwt}` },
  });
  assert(adminDeleteRes.status === 204, 'Admin DELETE /disasters/:id returns HTTP 204 No Content');

  // Verify disaster is indeed gone
  const getDeletedRes = await request(`/api/v1/disasters/${createdDisaster.id}`);
  assert(getDeletedRes.status === 404, 'GET /disasters/:id for deleted incident returns HTTP 404 Not Found');

  // --------------------------------------------------------------------------
  // 6. Resources Mutation RBAC Check
  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 6] Emergency Resources RBAC');

  // Unauthenticated resource creation rejected
  const unauthResCreate = await request('/api/v1/resources', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Mobile Aid Station Alpha',
      type: 'HOSPITAL',
      location: {
        name: 'Downtown Medical Outpost',
        latitude: 40.7128,
        longitude: -74.006,
      },
      capacity: 50,
      status: 'AVAILABLE',
    }),
  });
  assert(unauthResCreate.status === 401, 'Unauthenticated POST /resources returns HTTP 401 Unauthorized');

  // Contributor resource creation allowed
  const contribResCreate = await request('/api/v1/resources', {
    method: 'POST',
    headers: { [HttpHeader.AUTHORIZATION]: `Bearer ${contributorJwt}` },
    body: JSON.stringify({
      name: 'Mobile Aid Station Alpha',
      type: 'HOSPITAL',
      location: {
        name: 'Downtown Medical Outpost',
        latitude: 40.7128,
        longitude: -74.006,
      },
      capacity: 50,
      status: 'AVAILABLE',
    }),
  });
  assert(contribResCreate.status === 201, 'Contributor POST /resources returns HTTP 201 Created');
  assert(contribResCreate.body.data.name === 'Mobile Aid Station Alpha', 'Resource name matches input');

  // Close socket connection cleanly
  socket.disconnect();

  console.log('\n============================================================');
  console.log(`[STAGE-3 TEST RESULT] All ${passedAssertions}/${totalAssertions} assertions passed successfully.`);
  console.log('============================================================\n');
}

runStage3Verification().catch((err) => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
