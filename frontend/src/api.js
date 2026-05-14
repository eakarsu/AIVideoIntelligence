const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('vigilance_token');
}

function headers(json = true) {
  const h = { Authorization: `Bearer ${getToken()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  localStorage.setItem('vigilance_token', data.token);
  return data;
}

export function logout() {
  localStorage.removeItem('vigilance_token');
}

export function isAuthenticated() {
  return !!getToken();
}

export async function fetchDashboard() {
  const res = await fetch(`${API_BASE}/dashboard/stats`, { headers: headers(false) });
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function fetchList(table, search = '') {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${API_BASE}/${table}${params}`, { headers: headers(false) });
  if (!res.ok) throw new Error('Failed to fetch list');
  return res.json();
}

export async function fetchOne(table, id) {
  const res = await fetch(`${API_BASE}/${table}/${id}`, { headers: headers(false) });
  if (!res.ok) throw new Error('Failed to fetch record');
  return res.json();
}

export async function createRecord(table, data) {
  const res = await fetch(`${API_BASE}/${table}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create');
  return res.json();
}

export async function updateRecord(table, id, data) {
  const res = await fetch(`${API_BASE}/${table}/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
}

export async function deleteRecord(table, id) {
  const res = await fetch(`${API_BASE}/${table}/${id}`, {
    method: 'DELETE',
    headers: headers(false),
  });
  if (!res.ok) throw new Error('Failed to delete');
  return res.json();
}

export async function callAI(endpoint, body) {
  const res = await fetch(`${API_BASE}/ai/${endpoint}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI request failed');
  return data;
}

// Apply pass 5 — backlog integrations (NEEDS-CREDS surface 503 + missing).
export async function threatIntelLookup(ioc_type, value) {
  const res = await fetch(`${API_BASE}/threat-intel/lookup`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ ioc_type, value }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error || 'Threat-intel failed') + (data.missing ? ` (missing: ${data.missing})` : ''));
  return data;
}

export async function siemForward(event, sourcetype) {
  const res = await fetch(`${API_BASE}/siem/forward`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ event, sourcetype }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error || 'SIEM forward failed') + (data.missing ? ` (missing: ${data.missing})` : ''));
  return data;
}

export async function fetchAuditTrail(limit = 100) {
  const res = await fetch(`${API_BASE}/audit-trail/compliance?limit=${limit}`, { headers: headers(false) });
  if (!res.ok) throw new Error('Failed to fetch audit trail');
  return res.json();
}

export async function logAuditTrail(entry) {
  const res = await fetch(`${API_BASE}/audit-trail/log`, { method: 'POST', headers: headers(), body: JSON.stringify(entry) });
  if (!res.ok) throw new Error('Failed to log audit entry');
  return res.json();
}
