import { useState, useEffect } from 'react';
import { getConnectedAccounts, getLinkAccountUrl, unlinkAccount } from '../../api';

export default function MyAccountTab({ user }) {
  const [accounts, setAccounts] = useState([]);
  const [identities, setIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unlinking, setUnlinking] = useState(null);

  const fetchAccounts = () => {
    setLoading(true);
    getConnectedAccounts()
      .then((data) => {
        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        setIdentities(Array.isArray(data.identities) ? data.identities : []);
        setError(null);
      })
      .catch(() => setError('Failed to fetch connected accounts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleLink = async () => {
    const url = await getLinkAccountUrl();
    window.location.href = url;
  };

  const handleUnlink = async (account) => {
    const [provider, userId] = account.id.split('|');
    setUnlinking(account.id);
    try {
      await unlinkAccount(provider, userId);
      fetchAccounts();
    } catch {
      setError('Failed to unlink account');
    } finally {
      setUnlinking(null);
    }
  };

  return (
    <div className="tab-panel">
      <div className="card">
        <h3 className="card-title">Profile</h3>
        <div className="profile-card">
          {user.picture && (
            <img className="profile-avatar" src={user.picture} alt="" />
          )}
          <div className="profile-info">
            <h3>{user.name}</h3>
            <p>{user.email}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Connected Accounts</h3>
        <p className="card-subtitle">
          Link external identity providers to your account. This lets you sign in with multiple methods while keeping a single profile.
        </p>

        {loading && (
          <p className="card-subtitle">Loading connected accounts...</p>
        )}

        {!loading && accounts.length === 0 && !error && (
          <div className="note-callout" style={{ marginBottom: '16px' }}>
            No connected accounts yet. Link a social provider to enable single sign-on across multiple accounts.
          </div>
        )}

        {!loading && accounts.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {accounts.map((account) => (
              <div key={account.id} className="mfa-option selected" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="mfa-option-title">
                      {account.provider === 'google-oauth2' ? 'Google' : account.provider || 'Unknown Provider'}
                    </div>
                    <div className="mfa-option-desc">
                      {account.email || account.name || 'Connected'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="status-badge active">Linked</span>
                    <button
                      className="btn-verify"
                      style={{ background: '#dc3545', fontSize: '12px', padding: '6px 12px' }}
                      onClick={() => handleUnlink(account)}
                      disabled={unlinking === account.id}
                    >
                      {unlinking === account.id ? 'Delinking...' : 'Delink'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn-verify" onClick={handleLink}>
          Connect Google Account
        </button>

        {error && (
          <div className="note-callout" style={{ marginTop: '16px' }}>
            {error}
          </div>
        )}
      </div>

      {!loading && identities.length > 0 && (
        <div className="card">
          <h3 className="card-title">User Identities Log</h3>
          <p className="card-subtitle">
            This shows the merged identity providers on this user profile. The first entry is the <strong>primary account</strong> and any subsequent entries are <strong>secondary (linked) accounts</strong>.
          </p>
          <div style={{
            background: '#1a1a2e',
            borderRadius: '8px',
            padding: '16px',
            overflowX: 'auto',
          }}>
            {identities.map((identity, index) => (
              <div key={`${identity.provider}-${identity.user_id}`} style={{ marginBottom: index < identities.length - 1 ? '12px' : 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}>
                  <span style={{
                    background: index === 0 ? '#4905b5' : '#0d6efd',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}>
                    {index === 0 ? 'PRIMARY' : 'SECONDARY'}
                  </span>
                  <span style={{ color: '#a0a0b0', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
                    {identity.connection}
                  </span>
                </div>
                <pre style={{
                  margin: 0,
                  padding: '12px',
                  background: '#0f0f1a',
                  borderRadius: '6px',
                  border: '1px solid #2a2a3e',
                  color: '#e0e0e0',
                  fontSize: '12px',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {JSON.stringify(identity, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
