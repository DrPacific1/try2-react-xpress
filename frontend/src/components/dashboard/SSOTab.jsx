import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyOrganization,
  getOrgSSOConnections,
  createSSOTicket,
  removeOrgSSOConnection,
} from '../../api';

const STRATEGY_LABELS = {
  samlp: 'SAML',
  oidc: 'OpenID Connect',
  okta: 'Okta Workforce',
  waad: 'Microsoft Entra ID',
  'google-apps': 'Google Workspace',
  adfs: 'AD FS',
  pingfederate: 'PingFederate',
};

export default function SSOTab({ user }) {
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [generatingTicket, setGeneratingTicket] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const orgData = await getMyOrganization();
      if (orgData && orgData.org_id) {
        setOrg(orgData);
        const ssoData = await getOrgSSOConnections();
        setConnections(Array.isArray(ssoData) ? ssoData : []);
      } else {
        setOrg(null);
      }
    } catch {
      setError('Failed to load SSO data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSetupSSO = async (connectionId) => {
    clearMessages();
    setGeneratingTicket(true);
    try {
      const result = await createSSOTicket(connectionId);
      if (result.error) {
        setError(result.error);
      } else if (result.ticket) {
        window.open(result.ticket, '_blank');
        setSuccess('SSO setup wizard opened in a new tab. Complete the configuration there, then refresh this page.');
      }
    } catch {
      setError('Failed to generate SSO setup link');
    } finally {
      setGeneratingTicket(false);
    }
  };

  const handleRemoveConnection = async (connectionId, name) => {
    if (!confirm(`Remove SSO connection "${name}"? Members using this connection will need to authenticate differently.`)) return;
    clearMessages();
    try {
      const result = await removeOrgSSOConnection(connectionId);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`SSO connection "${name}" removed successfully`);
        fetchAll();
      }
    } catch {
      setError('Failed to remove SSO connection');
    }
  };

  if (loading) {
    return (
      <div className="tab-panel">
        <div className="card">
          <p className="card-subtitle">Loading SSO configuration...</p>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="tab-panel">
        <div className="card">
          <h3 className="card-title">No Organization</h3>
          <p className="card-subtitle">
            You are not a member of any organization yet. Register your business to create one.
          </p>
          <button className="btn-primary" onClick={() => navigate('/register-business')} style={{ marginTop: '16px' }}>
            Register Your Business
          </button>
        </div>
      </div>
    );
  }

  if (!org.isAdmin) {
    return (
      <div className="tab-panel">
        <div className="card">
          <h3 className="card-title">Access Restricted</h3>
          <p className="card-subtitle">
            Only organization administrators can manage SSO connections.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      {error && (
        <div className="note-callout" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="note-callout" style={{ marginBottom: '16px', borderColor: '#28a745' }}>
          {success}
        </div>
      )}

      {/* SSO Overview */}
      <div className="card">
        <h3 className="card-title">Enterprise SSO</h3>
        <p className="card-subtitle">
          Configure single sign-on for your organization. Members will be able to authenticate using your company's identity provider (Okta, Microsoft Entra ID, Google Workspace, SAML, etc.).
        </p>
      </div>

      {/* Current Connections */}
      <div className="card">
        <h3 className="card-title">SSO Connections</h3>
        <p className="card-subtitle">
          {connections.length === 0
            ? 'No enterprise SSO connections configured for this organization.'
            : `${connections.length} enterprise connection${connections.length !== 1 ? 's' : ''} configured.`}
        </p>

        {connections.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            {connections.map((conn) => {
              const strategy = conn.connection?.strategy || 'unknown';
              const name = conn.connection?.display_name || conn.connection?.name || conn.connection_id;
              return (
                <div key={conn.connection_id} className="mfa-option selected" style={{ cursor: 'default', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div className="mfa-option-title">{name}</div>
                      <div className="mfa-option-desc" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
                        <span className="status-badge active" style={{ fontSize: '10px', padding: '2px 8px' }}>
                          {STRATEGY_LABELS[strategy] || strategy}
                        </span>
                        {conn.assign_membership_on_login && (
                          <span style={{ color: '#a0a0b0', fontSize: '12px' }}>
                            Auto-assigns membership on login
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn-verify"
                        style={{ fontSize: '11px', padding: '5px 12px' }}
                        onClick={() => handleSetupSSO(conn.connection_id)}
                        disabled={generatingTicket}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-verify"
                        style={{ fontSize: '11px', padding: '5px 12px', background: '#dc3545' }}
                        onClick={() => handleRemoveConnection(conn.connection_id, name)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Set Up New SSO */}
      <div className="card">
        <h3 className="card-title">Set Up SSO</h3>
        <p className="card-subtitle">
          Launch the guided setup wizard to configure a new enterprise SSO connection. Auth0's self-service assistant will walk you through connecting your identity provider — no engineering support required.
        </p>
        <div style={{ marginTop: '16px' }}>
          <button
            className="btn-primary"
            onClick={() => handleSetupSSO(null)}
            disabled={generatingTicket}
          >
            {generatingTicket ? 'Generating Setup Link...' : 'Set Up Enterprise SSO'}
          </button>
        </div>
        <div className="note-callout" style={{ marginTop: '16px' }}>
          <strong>Supported Identity Providers:</strong> Okta, Microsoft Entra ID (Azure AD), Google Workspace, SAML 2.0, OpenID Connect, AD FS, PingFederate
        </div>
      </div>
    </div>
  );
}
