import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrganization } from '../api';

export default function RegisterBusiness() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: '', address: '', abn: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await createOrganization({
        companyName: form.companyName,
        address: form.address,
        abn: form.abn,
      });
      if (result.error) {
        setError(result.error);
      } else {
        navigate('/dashboard');
      }
    } catch {
      setError('Failed to register business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">B2B Dreams</div>
        <div className="navbar-actions">
          <button className="btn-login-nav" onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </nav>

      <section className="hero" style={{ minHeight: 'auto', padding: '60px 20px' }}>
        <div className="hero-content" style={{ maxWidth: '500px' }}>
          <h1 className="hero-headline" style={{ fontSize: '2rem' }}>Register Your Business</h1>
          <p className="hero-subtitle" style={{ fontSize: '1rem', marginBottom: '32px' }}>
            Create an organization to manage your team, invite members, and configure access controls.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="card" style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#a0a0b0', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#1a1a2e',
                    border: '1px solid #2a2a3e',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Acme Corporation"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#a0a0b0', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                  Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#1a1a2e',
                    border: '1px solid #2a2a3e',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="123 Business St, Sydney NSW 2000"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#a0a0b0', fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                  ABN (Australian Business Number)
                </label>
                <input
                  type="text"
                  value={form.abn}
                  onChange={(e) => setForm({ ...form, abn: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#1a1a2e',
                    border: '1px solid #2a2a3e',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  placeholder="51 824 753 556"
                />
              </div>

              {error && (
                <div className="note-callout" style={{ marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Creating Organization...' : 'Register Business'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
