import { useState, useEffect } from 'react';
import { getAccessToken } from '../../api';

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function TokenSection({ title, description, token }) {
  const [copied, setCopied] = useState(false);
  const decoded = token ? decodeJWT(token) : null;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="card">
      <h3 className="card-title">{title}</h3>
      <p className="card-subtitle">{description}</p>

      {decoded && (
        <div className="code-block">
          <button
            className={`btn-copy ${copied ? 'copied' : ''}`}
            onClick={() => copyToClipboard(JSON.stringify(decoded, null, 2))}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <pre style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: '13px', color: '#000000', lineHeight: '1.8' }}>
            {JSON.stringify(decoded, null, 2)}
          </pre>
        </div>
      )}

      {token && !decoded && (
        <div className="note-callout">
          This token is opaque (not a JWT) and cannot be decoded on the client.
        </div>
      )}

      {!token && (
        <div className="note-callout">No token available.</div>
      )}
    </div>
  );
}

export default function DebugTab({ user }) {
  const [accessToken, setAccessToken] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAccessToken()
      .then((data) => {
        setAccessToken(data.accessToken || null);
        setIdToken(data.idToken || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="tab-panel">
        <div className="card">
          <p className="card-subtitle">Loading tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <TokenSection
        title="ID Token"
        description="Contains identity claims about the authenticated user (name, email, sub, etc.)."
        token={idToken}
      />

      <TokenSection
        title="Access Token"
        description="Used to call APIs on behalf of the user. May be a JWT or an opaque token depending on your Auth0 API configuration."
        token={accessToken}
      />

      <div className="card">
        <h3 className="card-title">User Info (from /userinfo)</h3>
        <p className="card-subtitle">User profile data fetched from Auth0's userinfo endpoint during login.</p>
        <div className="code-block">
          <pre style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", fontSize: '13px', color: '#000000', lineHeight: '1.8' }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
