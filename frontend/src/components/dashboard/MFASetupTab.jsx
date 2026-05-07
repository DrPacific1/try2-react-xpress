import { useState, useEffect } from 'react';
import { getMFAEnrollUrl, getMFAStatus } from '../../api';

const FACTOR_LABELS = {
  totp: 'Authenticator App (TOTP)',
  sms: 'SMS',
  email: 'Email',
  'push-notification': 'Push Notification',
  'phone': 'Phone',
  'webauthn-roaming': 'Security Key (WebAuthn)',
  'webauthn-platform': 'Passkey (Platform)',
};

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MFASetupTab() {
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState(false);
  const [factors, setFactors] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMFAStatus()
      .then((data) => {
        setEnrolled(data.enrolled);
        setFactors(data.factors || []);
        if (data.error) setError(data.error);
      })
      .catch(() => setError('Failed to fetch MFA status'))
      .finally(() => setLoading(false));
  }, []);

  const handleEnroll = async () => {
    const url = await getMFAEnrollUrl();
    window.location.href = url;
  };

  if (loading) {
    return (
      <div className="tab-panel">
        <div className="card">
          <p className="card-subtitle">Checking MFA status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      <div className="card">
        <h3 className="card-title">Multi-Factor Authentication</h3>
        <p className="card-subtitle">
          Add an extra layer of security to your account by requiring a second form of verification on every login.
        </p>

        <div className="toggle-container">
          <div
            className={`toggle-switch ${enrolled ? 'active' : ''}`}
            onClick={!enrolled ? handleEnroll : undefined}
            style={{ cursor: enrolled ? 'default' : 'pointer' }}
          />
          <span className="toggle-label">
            {enrolled ? 'MFA Enabled' : 'MFA Disabled'}
          </span>
        </div>

        {!enrolled && (
          <div style={{ marginTop: '16px' }}>
            <p className="card-subtitle">
              Click the toggle to begin MFA enrollment. You'll be redirected to the Auth0 Universal Login page where you can set up your preferred authentication method.
            </p>
            <button className="btn-verify" onClick={handleEnroll}>
              Set Up MFA
            </button>
          </div>
        )}

        {enrolled && (
          <div style={{ marginTop: '24px' }}>
            <h4 className="card-title" style={{ fontSize: '14px', marginBottom: '12px' }}>
              Enrolled Factors
            </h4>
            {factors.map((factor, i) => (
              <div key={factor.id || i} className="mfa-option selected" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div className="mfa-option-title">
                      {FACTOR_LABELS[factor.type] || factor.type || 'Unknown Method'}
                    </div>
                    <div className="mfa-option-desc">
                      Enrolled {formatDate(factor.created_at)}
                    </div>
                  </div>
                  <span className="status-badge active">Active</span>
                </div>
              </div>
            ))}

            <p className="card-subtitle" style={{ marginTop: '16px' }}>
              MFA was set up via Auth0 Universal Login. Your enrolled method(s) will be required on every login.
            </p>

            <button className="btn-verify" onClick={handleEnroll} style={{ marginTop: '12px' }}>
              Add Another Factor
            </button>
          </div>
        )}

        {error && (
          <div className="note-callout" style={{ marginTop: '16px' }}>
            {error}. Ensure the app is authorized for the Auth0 Management API with <code>read:users</code> scope.
          </div>
        )}
      </div>
    </div>
  );
}
