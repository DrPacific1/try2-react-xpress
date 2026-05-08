# Demo Reference Guide

> Quick-lookup for demo prep — users, orgs, credentials, and capabilities.

---

## Demo Users

| User | Auth Method | Organizations | Role | Demo Purpose |
|------|-------------|---------------|------|--------------|
| `hemanth@atko.email` | Password | Xero + MYOB | Admin | Multi-org, admin console, SSO config, org switching |
| `joan@atko.email` | Password | MYOB only | Member | Single-org branded login (skips Auth0 picker) |
| `hemanth.thirthaprasad@okta.com` | Google OAuth2 | _(linked identity)_ | — | Account linking demo (secondary identity) |
| `hemanth.thirthaprasad+kallum.simon@okta.com` | Okta Enterprise SSO | MYOB | — | JIT provisioning via Home Realm Discovery |

> Passwords for database users are set in the Auth0 tenant (Username-Password connection). Reset from Auth0 Dashboard > User Management if needed.

---

## Organizations

| Org | Org ID | SSO Profile ID | Branding |
|-----|--------|----------------|----------|
| Xero | `org_15tS6qZ4OSVbjSle` | `ssp_oKJZXmAsvSDRmp4utJJHgR` | Xero blue |
| MYOB | `org_O71kNAAGxeWbbqSg` | `ssp_55NdDVQDQEH62ZRmkB45aV` | MYOB purple |

---

## Auth0 Tenant Config

| Setting | Value |
|---------|-------|
| Domain | `b2b-dreams-work.us.auth0.com` |
| Callback URL | `https://localhost:3000/callback` |
| Audience | `https://b2b-dreams-work.us.auth0.com/me/` |
| Frontend | `https://localhost:3000` |
| Backend | `https://localhost:5000` |

---

## Demoable Capabilities

| # | Capability | What to Show | User to Use |
|---|-----------|--------------|-------------|
| 1 | **Smart Login / Org Branding** | Single-org user gets org-branded login page (no picker) | `joan@atko.email` |
| 2 | **Multi-Org Access + Org Picker** | Multi-org user sees Auth0's native org picker | `hemanth@atko.email` |
| 3 | **Org Switching** | Switch between Xero/MYOB from dashboard dropdown | `hemanth@atko.email` |
| 4 | **Account Linking** | Link Google identity to password account, unified profile | `hemanth@atko.email` + Google flow |
| 5 | **MFA Enrollment** | Self-service factor enrollment (TOTP, SMS, WebAuthn, Passkeys) | `hemanth@atko.email` |
| 6 | **Self-Service Admin** | Invite members, assign roles, remove users from org | `hemanth@atko.email` (admin) |
| 7 | **Business Registration** | New org creation + auto-admin assignment | Any new user (sign up flow) |
| 8 | **Self-Service SSO Config** | Auth0 wizard for enterprise IdP setup (Okta, Azure AD, etc.) | `hemanth@atko.email` (admin, SSO tab) |
| 9 | **Home Realm Discovery (HRD)** | @okta.com domain auto-routes to Okta IdP — no password prompt | `hemanth.thirthaprasad+kallum.simon@okta.com` |
| 10 | **JIT Provisioning** | First-time SSO user gets auto-provisioned into MYOB org | Any new @okta.com user |
| 11 | **Token/Session Deep Dive** | Decode ID token showing `org_id`, `sub`, OIDC claims | Any authenticated user (Debug tab) |

---

## Login Flow Routing

The app resolves org membership **before** redirecting to Auth0:

| Scenario | Example | Behavior |
|----------|---------|----------|
| **1 org** | `joan@atko.email` (MYOB only) | Redirects with `organization` param → Auth0 shows MYOB-branded login, no picker |
| **Multiple orgs** | `hemanth@atko.email` (Xero + MYOB) | Redirects with `login_hint` only → Auth0 shows native org picker |
| **0 orgs / unknown** | `newuser@random.com` | Redirects with `login_hint` only → Auth0 universal login / signup |
| **Enterprise SSO domain** | `*@okta.com` | Resolves to MYOB → branded page → HRD kicks in → redirects to Okta |

---

## Startup

```bash
# Terminal 1 — Backend
cd backend && npx dotenvx run -- node server.js

# Terminal 2 — Frontend
cd frontend && npm run dev
```

App runs at https://localhost:3000
