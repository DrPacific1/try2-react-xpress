import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoginUrl, resolveOrg } from '../api';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const resolved = await resolveOrg(email);
      const hint = resolved.login_hint || email;
      const orgs = resolved.orgs || [];

      let query = `?login_hint=${encodeURIComponent(hint)}`;
      if (orgs.length === 1) {
        query += `&organization=${orgs[0].org_id}`;
      }

      const url = await getLoginUrl(query);
      window.location.href = url;
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <button className="login-back" onClick={() => navigate('/')}>
          &larr; Back
        </button>
        <h1 className="login-title">Log in</h1>
        <p className="login-subtitle">Enter your email to continue</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="email"
            className="login-input"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            disabled={loading}
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Continuing...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
