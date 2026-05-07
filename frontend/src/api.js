const API_BASE = '';

export async function getLoginUrl(queryString = '') {
  const res = await fetch(`${API_BASE}/api/auth/login-url${queryString}`, { credentials: 'include' });
  const data = await res.json();
  return data.loginUrl;
}

export async function getSignupUrl() {
  const res = await fetch(`${API_BASE}/api/auth/signup-url`, { credentials: 'include' });
  const data = await res.json();
  return data.signupUrl;
}

export async function getMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
  return res.json();
}

export async function logout() {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return res.json();
}

export async function getAccessToken() {
  const res = await fetch(`${API_BASE}/api/auth/token`, { credentials: 'include' });
  return res.json();
}

export async function getMFAEnrollUrl() {
  const res = await fetch(`${API_BASE}/api/auth/mfa-enroll`, { credentials: 'include' });
  const data = await res.json();
  return data.enrollUrl;
}

export async function getMFAStatus() {
  const res = await fetch(`${API_BASE}/api/auth/mfa-status`, { credentials: 'include' });
  return res.json();
}

export async function getConnectedAccounts() {
  const res = await fetch(`${API_BASE}/api/auth/connected-accounts`, { credentials: 'include' });
  return res.json();
}

export async function getLinkAccountUrl() {
  const res = await fetch(`${API_BASE}/api/auth/link-account`, { credentials: 'include' });
  const data = await res.json();
  return data.linkUrl;
}

export async function unlinkAccount(provider, userId) {
  const res = await fetch(`${API_BASE}/api/auth/connected-accounts/${provider}/${userId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

// Organization APIs

export async function createOrganization(data) {
  const res = await fetch(`${API_BASE}/api/org/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getMyOrganization() {
  const res = await fetch(`${API_BASE}/api/org/me`, { credentials: 'include' });
  return res.json();
}

export async function getOrgMembers() {
  const res = await fetch(`${API_BASE}/api/org/members`, { credentials: 'include' });
  return res.json();
}

export async function inviteOrgMember(email, role) {
  const res = await fetch(`${API_BASE}/api/org/members/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, role: role || undefined }),
  });
  return res.json();
}

export async function getOrgInvitations() {
  const res = await fetch(`${API_BASE}/api/org/invitations`, { credentials: 'include' });
  return res.json();
}

export async function deleteOrgInvitation(invitationId) {
  const res = await fetch(`${API_BASE}/api/org/invitations/${encodeURIComponent(invitationId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

export async function removeOrgMember(userId) {
  const res = await fetch(`${API_BASE}/api/org/members/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return res.json();
}

export async function addMemberRole(userId, roles) {
  const res = await fetch(`${API_BASE}/api/org/members/${encodeURIComponent(userId)}/roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ roles }),
  });
  return res.json();
}

export async function removeMemberRole(userId, roles) {
  const res = await fetch(`${API_BASE}/api/org/members/${encodeURIComponent(userId)}/roles`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ roles }),
  });
  return res.json();
}

export async function getAvailableRoles() {
  const res = await fetch(`${API_BASE}/api/org/roles`, { credentials: 'include' });
  return res.json();
}
