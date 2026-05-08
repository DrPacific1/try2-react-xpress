require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// ============================================
// ROUTES
// ============================================

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

// 2. Get login URL (for frontend to redirect to)
app.get('/api/auth/login-url', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.AUTH0_CLIENT_ID,
    response_type: 'code',
    scope: 'openid profile email read:me:connected_accounts create:me:connected_accounts delete:me:connected_accounts',
    redirect_uri: process.env.AUTH0_CALLBACK_URL,
    audience: process.env.AUTH0_AUDIENCE,
    response_mode: 'query',
    prompt: 'login',
  });
  if (req.query.invitation) params.set('invitation', req.query.invitation);
  if (req.query.organization) params.set('organization', req.query.organization);
  if (req.query.login_hint) params.set('login_hint', req.query.login_hint);

  const authorizeUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?${params}`;
  res.json({ loginUrl: authorizeUrl });
});

// 3. Get signup URL (for frontend to redirect to)
app.get('/api/auth/signup-url', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.AUTH0_CLIENT_ID,
    response_type: 'code',
    scope: 'openid profile email read:me:connected_accounts create:me:connected_accounts delete:me:connected_accounts',
    redirect_uri: process.env.AUTH0_CALLBACK_URL,
    audience: process.env.AUTH0_AUDIENCE,
    screen_hint: 'signup',
    response_mode: 'query',
  });
  const authorizeUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?${params}`;
  res.json({ signupUrl: authorizeUrl });
});

// 4. Callback route (Auth0 redirects here after login)
app.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=${error}&error_description=${error_description}`);
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.AUTH0_CALLBACK_URL,
      }
    );

    const { access_token, id_token } = tokenResponse.data;

    // Get user info using access token
    const userResponse = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const user = userResponse.data;

    const decoded = jwt.decode(id_token);
    console.log('Callback org_id from token:', decoded?.org_id);

    req.session.user = user;
    req.session.accessToken = access_token;
    req.session.idToken = id_token;
    if (decoded && decoded.org_id) {
      req.session.orgId = decoded.org_id;
    }
    console.log('Session orgId after callback:', req.session.orgId);

    // Redirect back to frontend
    res.redirect(`${process.env.FRONTEND_URL}/`);
  } catch (error) {
    console.error('Error exchanging code:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=token_exchange_failed`);
  }
});

// 5. Get current user (check if logged in)
app.get('/api/auth/me', (req, res) => {
  if (req.session.user) {
    res.json({
      user: { ...req.session.user, org_id: req.session.orgId || null },
      isAuthenticated: true,
    });
  } else {
    res.json({
      user: null,
      isAuthenticated: false,
    });
  }
});

// 6. Logout route
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    const logoutUrl = `https://${process.env.AUTH0_DOMAIN}/v2/logout?` +
      `client_id=${process.env.AUTH0_CLIENT_ID}&returnTo=${encodeURIComponent(process.env.FRONTEND_URL)}`;
    res.json({ message: 'Logged out successfully', logoutUrl });
  });
});

// 7. Get tokens (access token + ID token)
app.get('/api/auth/token', (req, res) => {
  if (req.session.accessToken) {
    res.json({
      accessToken: req.session.accessToken,
      idToken: req.session.idToken || null,
    });
  } else {
    res.status(401).json({ error: 'No access token' });
  }
});

// 8. MFA enrollment URL (redirects to Auth0 Universal Login with MFA required)
app.get('/api/auth/mfa-enroll', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.AUTH0_CLIENT_ID,
    response_type: 'code',
    scope: 'openid profile email read:me:connected_accounts create:me:connected_accounts delete:me:connected_accounts',
    redirect_uri: process.env.AUTH0_CALLBACK_URL,
    audience: process.env.AUTH0_AUDIENCE,
    response_mode: 'query',
    acr_values: 'http://schemas.openid.net/psbr/mfa',
    prompt: 'login',
  });
  const enrollUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?${params}`;
  res.json({ enrollUrl });
});

// 9. MFA status (check enrolled factors via Auth0 Management API)
app.get('/api/auth/mfa-status', async (req, res) => {
  if (!req.session.user) {
    return res.json({ enrolled: false, factors: [] });
  }

  try {
    const tokenResponse = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials',
      }
    );

    const managementToken = tokenResponse.data.access_token;
    const userId = req.session.user.sub;

    const enrollResponse = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}/authentication-methods`,
      { headers: { Authorization: `Bearer ${managementToken}` } }
    );

    const methods = enrollResponse.data;
    res.json({
      enrolled: Array.isArray(methods) && methods.length > 0,
      factors: Array.isArray(methods) ? methods : [],
    });
  } catch (error) {
    console.error('MFA status error:', error.response?.data || error.message);
    res.json({ enrolled: false, factors: [], error: 'Could not fetch MFA status' });
  }
});

// 10. Get connected accounts (via Management API - list user identities)
app.get('/api/auth/connected-accounts', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const tokenResponse = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials',
      }
    );
    const managementToken = tokenResponse.data.access_token;
    const userId = req.session.user.sub;

    const userResponse = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${managementToken}` } }
    );

    const identities = userResponse.data.identities || [];
    const linkedAccounts = identities
      .filter((id, index) => index > 0 || id.provider !== identities[0]?.provider)
      .filter((id) => id.isSocial)
      .map((id) => ({
        id: `${id.provider}|${id.user_id}`,
        provider: id.provider,
        connection: id.connection,
        email: id.profileData?.email || null,
        name: id.profileData?.name || null,
        picture: id.profileData?.picture || null,
      }));

    console.log('Connected accounts:', JSON.stringify(linkedAccounts));
    res.json({ accounts: linkedAccounts, identities });
  } catch (error) {
    console.error('Connected accounts error:', error.response?.status, error.response?.data || error.message);
    res.json([]);
  }
});

// 11. Get link account URL (secondary login for Google)
app.get('/api/auth/link-account', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const state = Buffer.from(JSON.stringify({ action: 'link' })).toString('base64');
  const params = new URLSearchParams({
    client_id: process.env.AUTH0_CLIENT_ID,
    response_type: 'code',
    scope: 'openid profile email',
    redirect_uri: `https://localhost:${PORT}/link-callback`,
    connection: 'google-oauth2',
    state: state,
  });
  const linkUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?${params}`;
  res.json({ linkUrl });
});

// 12. Link callback (receives secondary auth code, links via Management API)
app.get('/link-callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error('Link callback error:', error, error_description);
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=${error}`);
  }

  if (!code || !req.session.user) {
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=link_failed`);
  }

  try {
    const tokenResponse = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `https://localhost:${PORT}/link-callback`,
      }
    );

    const { id_token } = tokenResponse.data;
    console.log('Secondary id_token obtained:', id_token ? 'yes' : 'no');

    const mgmtTokenResponse = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials',
      }
    );
    const managementToken = mgmtTokenResponse.data.access_token;
    const primaryUserId = req.session.user.sub;

    await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(primaryUserId)}/identities`,
      { link_with: id_token },
      {
        headers: {
          Authorization: `Bearer ${managementToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Account linked successfully for user:', primaryUserId);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('Link account error:', error.response?.status, error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=link_failed`);
  }
});

// 13. Unlink a connected account (via Management API)
// Expects id in format "provider|user_id" (e.g. "google-oauth2|123456")
app.delete('/api/auth/connected-accounts/:provider/:userId', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const mgmtTokenResponse = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        grant_type: 'client_credentials',
      }
    );
    const managementToken = mgmtTokenResponse.data.access_token;
    const primaryUserId = req.session.user.sub;
    const { provider, userId } = req.params;

    await axios.delete(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(primaryUserId)}/identities/${provider}/${userId}`,
      { headers: { Authorization: `Bearer ${managementToken}` } }
    );

    console.log('Account unlinked:', provider, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Unlink error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to unlink account' });
  }
});

// ============================================
// ORGANIZATIONS
// ============================================

async function getManagementToken() {
  const res = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
    client_id: process.env.AUTH0_CLIENT_ID,
    client_secret: process.env.AUTH0_CLIENT_SECRET,
    audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
    grant_type: 'client_credentials',
  });
  return res.data.access_token;
}

// Resolve organization(s) from email — uses actual org memberships
app.post('/api/auth/resolve-org', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const domain = email.split('@')[1];
  if (!domain) return res.status(400).json({ error: 'Invalid email' });

  try {
    const token = await getManagementToken();
    let primaryEmail = email;
    let matchedOrgs = [];

    let users = [];
    const primaryRes = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users-by-email`,
      { headers: { Authorization: `Bearer ${token}` }, params: { email } }
    );
    users = primaryRes.data || [];

    if (users.length === 0) {
      const searchRes = await axios.get(
        `https://${process.env.AUTH0_DOMAIN}/api/v2/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { q: `identities.profileData.email:"${email}"`, search_engine: 'v3' }
        }
      );
      users = searchRes.data || [];
    }

    if (users.length > 0) {
      const user = users[0];
      primaryEmail = user.email || email;

      const orgsRes = await axios.get(
        `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(user.user_id)}/organizations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const userOrgs = Array.isArray(orgsRes.data) ? orgsRes.data : (orgsRes.data.organizations || []);
      matchedOrgs = userOrgs.map(o => ({ org_id: o.id, org_name: o.display_name }));
    } else {
      const orgsResponse = await axios.get(
        `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations`,
        { headers: { Authorization: `Bearer ${token}` }, params: { per_page: 100 } }
      );
      const allOrgs = Array.isArray(orgsResponse.data) ? orgsResponse.data : (orgsResponse.data.organizations || []);
      for (const org of allOrgs) {
        if (org.metadata?.domain === domain) {
          matchedOrgs.push({ org_id: org.id, org_name: org.display_name });
        }
      }
    }

    res.json({ orgs: matchedOrgs, login_hint: primaryEmail });
  } catch (error) {
    console.error('Resolve org error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to resolve organization' });
  }
});

// 14. Create organization
app.post('/api/org/create', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { companyName, address, abn } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required' });
  }

  try {
    const token = await getManagementToken();
    const orgName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 50);

    const orgResponse = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations`,
      {
        name: orgName,
        display_name: companyName,
        metadata: { address: address || '', abn: abn || '' },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const org = orgResponse.data;
    const userId = req.session.user.sub;

    await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${org.id}/members`,
      { members: [userId] },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const rolesResponse = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/roles`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const adminRole = rolesResponse.data.find(r => r.name.toLowerCase().includes('admin'));

    if (adminRole) {
      await axios.post(
        `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${org.id}/members/${encodeURIComponent(userId)}/roles`,
        { roles: [adminRole.id] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }

    req.session.orgId = org.id;
    console.log('Organization created:', org.id, companyName);
    res.json({ org_id: org.id, name: org.name, display_name: org.display_name });
  } catch (error) {
    console.error('Create org error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.message || 'Failed to create organization' });
  }
});

// 14b. List all organizations the user belongs to
app.get('/api/org/list', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const token = await getManagementToken();
    const userId = req.session.user.sub;

    const response = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}/organizations`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(response.data || []);
  } catch (error) {
    console.error('List orgs error:', error.response?.status, error.response?.data || error.message);
    res.json([]);
  }
});

// 15. Get current user's organization
app.get('/api/org/me', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const token = await getManagementToken();
    const userId = req.session.user.sub;

    const orgsResponse = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}/organizations`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const orgs = orgsResponse.data;
    console.log('GET /api/org/me - session.orgId:', req.session.orgId, 'orgs:', orgs.map(o => o.id));
    if (orgs.length === 0) {
      return res.json(null);
    }

    let org = orgs[0];
    if (req.session.orgId) {
      const match = orgs.find(o => o.id === req.session.orgId);
      if (match) org = match;
    }
    console.log('GET /api/org/me - returning org:', org.id, org.name);
    req.session.orgId = org.id;

    let roles = [];
    let isAdmin = false;
    try {
      const memberRolesResponse = await axios.get(
        `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${org.id}/members/${encodeURIComponent(userId)}/roles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      roles = memberRolesResponse.data || [];
      isAdmin = roles.some(r => r.name && r.name.toLowerCase().includes('admin'));
    } catch (roleErr) {
      console.error('Failed to get member roles:', roleErr.response?.status, roleErr.response?.data || roleErr.message);
    }

    res.json({
      org_id: org.id,
      name: org.name,
      display_name: org.display_name,
      metadata: org.metadata || {},
      isAdmin,
    });
  } catch (error) {
    console.error('Get org error:', error.response?.status, error.response?.data || error.message);
    res.json(null);
  }
});

// 16. Get organization members
app.get('/api/org/members', async (req, res) => {
  if (!req.session.user || !req.session.orgId) {
    return res.status(401).json({ error: 'Not authenticated or no organization' });
  }

  try {
    const token = await getManagementToken();
    const orgId = req.session.orgId;

    const membersResponse = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/members`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const members = membersResponse.data.members || membersResponse.data || [];

    const membersWithRoles = await Promise.all(
      members.map(async (member) => {
        try {
          const rolesRes = await axios.get(
            `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/members/${encodeURIComponent(member.user_id)}/roles`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          return { ...member, roles: rolesRes.data || [] };
        } catch {
          return { ...member, roles: [] };
        }
      })
    );

    res.json(membersWithRoles);
  } catch (error) {
    console.error('Get members error:', error.response?.status, error.response?.data || error.message);
    res.json([]);
  }
});

// 17. Invite a member by email
app.post('/api/org/members/invite', async (req, res) => {
  if (!req.session.user || !req.session.orgId) {
    return res.status(401).json({ error: 'Not authenticated or no organization' });
  }

  const { email, role } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const token = await getManagementToken();
    const orgId = req.session.orgId;

    let roles = [];
    if (role) {
      const rolesResponse = await axios.get(
        `https://${process.env.AUTH0_DOMAIN}/api/v2/roles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const foundRole = rolesResponse.data.find(r => r.name.toLowerCase() === role.toLowerCase());
      if (foundRole) roles = [foundRole.id];
    }

    // Get the organization's enabled connections to find a database connection
    const connectionsResponse = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/enabled_connections`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const connections = connectionsResponse.data || [];
    const dbConnection = connections.find(c => c.connection?.strategy === 'auth0') || connections[0];
    if (!dbConnection) {
      return res.status(400).json({ error: 'No enabled connection found for this organization. Enable a connection in Auth0 dashboard.' });
    }

    const inviteResponse = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/invitations`,
      {
        inviter: { name: req.session.user.name || 'Admin' },
        invitee: { email },
        client_id: process.env.AUTH0_CLIENT_ID,
        connection_id: dbConnection.connection_id || dbConnection.connection?.id,
        roles,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('Invitation sent to:', email);
    res.json(inviteResponse.data);
  } catch (error) {
    console.error('Invite error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.message || 'Failed to send invitation' });
  }
});

// 18. Get pending invitations
app.get('/api/org/invitations', async (req, res) => {
  if (!req.session.user || !req.session.orgId) {
    return res.status(401).json({ error: 'Not authenticated or no organization' });
  }

  try {
    const token = await getManagementToken();
    const orgId = req.session.orgId;

    const response = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/invitations`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json(response.data || []);
  } catch (error) {
    console.error('Get invitations error:', error.response?.status, error.response?.data || error.message);
    res.json([]);
  }
});

// 18b. Delete/revoke an invitation
app.delete('/api/org/invitations/:invitationId', async (req, res) => {
  if (!req.session.user || !req.session.orgId) {
    return res.status(401).json({ error: 'Not authenticated or no organization' });
  }

  try {
    const token = await getManagementToken();
    const orgId = req.session.orgId;

    await axios.delete(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/invitations/${req.params.invitationId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('Invitation deleted:', req.params.invitationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete invitation error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to delete invitation' });
  }
});

// 19. Remove a member
app.delete('/api/org/members/:userId', async (req, res) => {
  if (!req.session.user || !req.session.orgId) {
    return res.status(401).json({ error: 'Not authenticated or no organization' });
  }

  try {
    const token = await getManagementToken();
    const orgId = req.session.orgId;

    await axios.delete(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/members`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { members: [req.params.userId] },
      }
    );

    console.log('Member removed:', req.params.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// 20. Add role to member
app.post('/api/org/members/:userId/roles', async (req, res) => {
  if (!req.session.user || !req.session.orgId) {
    return res.status(401).json({ error: 'Not authenticated or no organization' });
  }

  const { roles } = req.body;
  if (!roles || !roles.length) {
    return res.status(400).json({ error: 'Roles are required' });
  }

  try {
    const token = await getManagementToken();
    const orgId = req.session.orgId;

    await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/members/${encodeURIComponent(req.params.userId)}/roles`,
      { roles },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Add role error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to add role' });
  }
});

// 21. Remove role from member
app.delete('/api/org/members/:userId/roles', async (req, res) => {
  if (!req.session.user || !req.session.orgId) {
    return res.status(401).json({ error: 'Not authenticated or no organization' });
  }

  const { roles } = req.body;
  if (!roles || !roles.length) {
    return res.status(400).json({ error: 'Roles are required' });
  }

  try {
    const token = await getManagementToken();
    const orgId = req.session.orgId;

    await axios.delete(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/members/${encodeURIComponent(req.params.userId)}/roles`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { roles },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Remove role error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

// 22. Get available roles
app.get('/api/org/roles', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const token = await getManagementToken();
    const response = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/roles`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    res.json(response.data || []);
  } catch (error) {
    console.error('Get roles error:', error.response?.status, error.response?.data || error.message);
    res.json([]);
  }
});

// ============================================
// SSO SELF-SERVICE ENDPOINTS
// ============================================

const ENTERPRISE_STRATEGIES = ['samlp', 'oidc', 'okta', 'waad', 'google-apps', 'adfs', 'pingfederate'];

// 23. Get enterprise SSO connections for current org
app.get('/api/org/sso/connections', async (req, res) => {
  if (!req.session.user || !req.session.orgId) {
    return res.status(401).json({ error: 'Not authenticated or no organization' });
  }

  try {
    const token = await getManagementToken();
    const orgId = req.session.orgId;

    const response = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/enabled_connections`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const connections = response.data || [];
    const enterpriseConnections = connections.filter(
      c => ENTERPRISE_STRATEGIES.includes(c.connection?.strategy)
    );

    res.json(enterpriseConnections);
  } catch (error) {
    console.error('Get SSO connections error:', error.response?.status, error.response?.data || error.message);
    res.json([]);
  }
});

// 24. Generate self-service SSO ticket
app.post('/api/org/sso/ticket', async (req, res) => {
  if (!req.session.user || !req.session.orgId) {
    return res.status(401).json({ error: 'Not authenticated or no organization' });
  }

  const orgId = req.session.orgId;
  const profileMap = {
    'org_15tS6qZ4OSVbjSle': process.env.AUTH0_SS_PROFILE_ID_XERO,
    'org_O71kNAAGxeWbbqSg': process.env.AUTH0_SS_PROFILE_ID_MYOB,
  };
  const profileId = profileMap[orgId] || process.env.AUTH0_SS_PROFILE_ID_XERO;
  if (!profileId) {
    return res.status(500).json({ error: 'Self-service profile not configured for this organization' });
  }

  try {
    const token = await getManagementToken();
    const { connection_id } = req.body;

    const ticketBody = {
      enabled_organizations: [{
        organization_id: orgId,
        assign_membership_on_login: true,
      }],
      enabled_clients: [process.env.AUTH0_CLIENT_ID],
    };

    if (connection_id) {
      ticketBody.connection_id = connection_id;
    } else {
      ticketBody.connection_config = {
        name: `${orgId.replace('org_', '')}-sso`,
      };
    }

    const response = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/self-service-profiles/${profileId}/sso-ticket`,
      ticketBody,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    res.json({ ticket: response.data.ticket });
  } catch (error) {
    console.error('Create SSO ticket error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.message || 'Failed to generate SSO setup link' });
  }
});

// 25. Remove enterprise connection from org
app.delete('/api/org/sso/connections/:connectionId', async (req, res) => {
  if (!req.session.user || !req.session.orgId) {
    return res.status(401).json({ error: 'Not authenticated or no organization' });
  }

  try {
    const token = await getManagementToken();
    const orgId = req.session.orgId;

    await axios.delete(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/organizations/${orgId}/enabled_connections/${req.params.connectionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('SSO connection removed:', req.params.connectionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove SSO connection error:', error.response?.status, error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to remove SSO connection' });
  }
});

// ============================================
// START SERVER
// ============================================

if (process.env.NODE_ENV === 'production') {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT} (production)`);
    console.log(`Auth0 Domain: ${process.env.AUTH0_DOMAIN}`);
  });
} else {
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
  };

  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`✅ Backend running on https://localhost:${PORT}`);
    console.log(`Auth0 Domain: ${process.env.AUTH0_DOMAIN}`);
  });
}