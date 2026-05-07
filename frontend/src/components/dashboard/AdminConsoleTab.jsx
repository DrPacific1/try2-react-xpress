import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyOrganization,
  getOrgMembers,
  inviteOrgMember,
  getOrgInvitations,
  deleteOrgInvitation,
  removeOrgMember,
  addMemberRole,
  removeMemberRole,
  getAvailableRoles,
} from '../../api';

export default function AdminConsoleTab({ user }) {
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const orgData = await getMyOrganization();
      if (orgData && orgData.org_id) {
        setOrg(orgData);
        const [membersData, invitationsData, rolesData] = await Promise.all([
          getOrgMembers(),
          getOrgInvitations(),
          getAvailableRoles(),
        ]);
        setMembers(Array.isArray(membersData) ? membersData : []);
        setInvitations(Array.isArray(invitationsData) ? invitationsData : []);
        setRoles(Array.isArray(rolesData) ? rolesData : []);
      } else {
        setOrg(null);
      }
    } catch {
      setError('Failed to load organization data');
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

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    clearMessages();
    try {
      const result = await inviteOrgMember(inviteEmail.trim(), inviteRole || undefined);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Invitation sent to ${inviteEmail}${inviteRole ? ` with role: ${inviteRole}` : ''}`);
        setInviteEmail('');
        setInviteRole('');
        fetchAll();
      }
    } catch {
      setError('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteInvitation = async (invitationId, email) => {
    if (!confirm(`Revoke invitation to ${email}?`)) return;
    clearMessages();
    try {
      const result = await deleteOrgInvitation(invitationId);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(`Invitation to ${email} revoked`);
        fetchAll();
      }
    } catch {
      setError('Failed to revoke invitation');
    }
  };

  const handleRemoveMember = async (userId, name) => {
    if (!confirm(`Remove ${name} from the organization?`)) return;
    clearMessages();
    try {
      await removeOrgMember(userId);
      setSuccess(`${name} has been removed from the organization`);
      fetchAll();
    } catch {
      setError('Failed to remove member');
    }
  };

  const handleAddRole = async (userId, roleId, roleName) => {
    clearMessages();
    try {
      await addMemberRole(userId, [roleId]);
      setSuccess(`Added "${roleName}" role`);
      fetchAll();
    } catch {
      setError('Failed to add role');
    }
  };

  const handleRemoveRole = async (userId, roleId, roleName) => {
    clearMessages();
    try {
      await removeMemberRole(userId, [roleId]);
      setSuccess(`Removed "${roleName}" role`);
      fetchAll();
    } catch {
      setError('Failed to remove role');
    }
  };

  if (loading) {
    return (
      <div className="tab-panel">
        <div className="card">
          <p className="card-subtitle">Loading organization data...</p>
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
            You are not a member of any organization yet. Register your business to create one and start managing your team.
          </p>
          <button className="btn-primary" onClick={() => navigate('/register-business')} style={{ marginTop: '16px' }}>
            Register Your Business
          </button>
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

      {/* Organization Info */}
      <div className="card">
        <h3 className="card-title">Organization</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
          <div>
            <div style={{ color: '#a0a0b0', fontSize: '12px', marginBottom: '4px' }}>Name</div>
            <div style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: 500 }}>{org.display_name || org.name}</div>
          </div>
          <div>
            <div style={{ color: '#a0a0b0', fontSize: '12px', marginBottom: '4px' }}>Organization ID</div>
            <div style={{ color: '#e0e0e0', fontSize: '12px', fontFamily: 'monospace' }}>{org.org_id}</div>
          </div>
          {org.metadata?.address && (
            <div>
              <div style={{ color: '#a0a0b0', fontSize: '12px', marginBottom: '4px' }}>Address</div>
              <div style={{ color: '#e0e0e0', fontSize: '14px' }}>{org.metadata.address}</div>
            </div>
          )}
          {org.metadata?.abn && (
            <div>
              <div style={{ color: '#a0a0b0', fontSize: '12px', marginBottom: '4px' }}>ABN</div>
              <div style={{ color: '#e0e0e0', fontSize: '14px' }}>{org.metadata.abn}</div>
            </div>
          )}
        </div>
        {org.isAdmin && (
          <span className="status-badge active" style={{ marginTop: '12px', display: 'inline-block' }}>Admin</span>
        )}
      </div>

      {/* Invite Members */}
      {org.isAdmin && (
        <div className="card">
          <h3 className="card-title">Invite Members</h3>
          <p className="card-subtitle">
            Send an invitation email to add new members to your organization. Optionally assign a role that will be granted when they accept.
          </p>
          <form onSubmit={handleInvite} style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  background: '#1a1a2e',
                  border: '1px solid #2a2a3e',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{
                  padding: '10px 14px',
                  background: '#1a1a2e',
                  border: '1px solid #2a2a3e',
                  borderRadius: '8px',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  outline: 'none',
                  minWidth: '140px',
                }}
              >
                <option value="">No role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-verify" disabled={inviting}>
              {inviting ? 'Sending Invitation...' : 'Send Invitation'}
            </button>
          </form>
        </div>
      )}

      {/* Pending Invitations */}
      {org.isAdmin && (
        <div className="card">
          <h3 className="card-title">Pending Invitations</h3>
          <p className="card-subtitle">
            Invitations that have been sent but not yet accepted. You can revoke them at any time.
          </p>

          {invitations.length === 0 ? (
            <div className="note-callout" style={{ marginTop: '12px' }}>
              No pending invitations.
            </div>
          ) : (
            <div style={{ marginTop: '12px' }}>
              {invitations.map((inv) => (
                <div key={inv.id} className="mfa-option" style={{ cursor: 'default', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div className="mfa-option-title">{inv.invitee?.email || 'Unknown'}</div>
                      <div className="mfa-option-desc" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
                        <span>Invited by {inv.inviter?.name || 'admin'}</span>
                        {inv.roles && inv.roles.length > 0 && (
                          <span style={{ color: '#8b8bf0' }}>
                            Role: {inv.roles.map(r => r.name || r.id).join(', ')}
                          </span>
                        )}
                        {inv.created_at && (
                          <span style={{ color: '#666' }}>
                            {new Date(inv.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="status-badge" style={{ background: '#ffc107', color: '#000' }}>Pending</span>
                      <button
                        className="btn-verify"
                        style={{ fontSize: '11px', padding: '5px 10px', background: '#dc3545' }}
                        onClick={() => handleDeleteInvitation(inv.id, inv.invitee?.email)}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Organization Members */}
      <div className="card">
        <h3 className="card-title">Organization Members</h3>
        <p className="card-subtitle">
          {members.length} member{members.length !== 1 ? 's' : ''} enrolled in this organization.
        </p>

        {members.length === 0 ? (
          <div className="note-callout" style={{ marginTop: '12px' }}>No members found.</div>
        ) : (
          <div style={{ marginTop: '12px' }}>
            {members.map((member) => {
              const memberRoles = member.roles || [];
              const isCurrentUser = member.user_id === user.sub;

              return (
                <div key={member.user_id} className="mfa-option selected" style={{ cursor: 'default', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    {/* Member Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      {member.picture ? (
                        <img
                          src={member.picture}
                          alt=""
                          style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#2a2a3e',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#a0a0b0',
                          fontSize: '16px',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}>
                          {(member.name || member.email || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="mfa-option-title">
                          {member.name || member.email}
                          {isCurrentUser && <span style={{ color: '#a0a0b0', fontSize: '11px', marginLeft: '6px' }}>(you)</span>}
                        </div>
                        <div className="mfa-option-desc">{member.email}</div>
                        {memberRoles.length > 0 && (
                          <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {memberRoles.map((role) => (
                              <span
                                key={role.id}
                                className="status-badge active"
                                style={{ fontSize: '10px', padding: '2px 8px' }}
                              >
                                {role.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {org.isAdmin && !isCurrentUser && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', flexShrink: 0 }}>
                        {/* Role management */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {roles.map((role) => {
                            const hasRole = memberRoles.some((r) => r.id === role.id);
                            return (
                              <button
                                key={role.id}
                                className="btn-verify"
                                style={{
                                  fontSize: '10px',
                                  padding: '4px 8px',
                                  background: hasRole ? '#dc3545' : '#0d6efd',
                                }}
                                onClick={() =>
                                  hasRole
                                    ? handleRemoveRole(member.user_id, role.id, role.name)
                                    : handleAddRole(member.user_id, role.id, role.name)
                                }
                              >
                                {hasRole ? `Remove ${role.name}` : `Assign ${role.name}`}
                              </button>
                            );
                          })}
                        </div>
                        {/* Remove from org */}
                        <button
                          className="btn-verify"
                          style={{ fontSize: '10px', padding: '4px 10px', background: '#dc3545' }}
                          onClick={() => handleRemoveMember(member.user_id, member.name || member.email)}
                        >
                          Remove from Organization
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
