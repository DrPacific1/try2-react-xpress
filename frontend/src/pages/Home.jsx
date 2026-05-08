import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getLoginUrl, getSignupUrl, getMe } from '../api';
import './Home.css';

const AUTH0_DOMAIN = 'b2b-dreams-work.us.auth0.com';
const AUTH0_CLIENT_ID = '3wNsX9PlI56X2miFABdoNjOoFvilNudG';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const action = searchParams.get('action');

    if (action === 'login') {
      const invitation = searchParams.get('invitation');
      const organization = searchParams.get('organization');

      if (invitation) {
        const params = new URLSearchParams({
          client_id: AUTH0_CLIENT_ID,
          response_type: 'code',
          scope: 'openid profile email read:me:connected_accounts create:me:connected_accounts delete:me:connected_accounts',
          redirect_uri: 'https://localhost:3000/callback',
          audience: `https://${AUTH0_DOMAIN}/me/`,
          response_mode: 'query',
          invitation,
          organization,
        });
        window.location.href = `https://${AUTH0_DOMAIN}/authorize?${params}`;
        return;
      }

      const qs = new URLSearchParams();
      if (organization) qs.set('organization', organization);
      const suffix = qs.toString() ? `?${qs}` : '';
      getLoginUrl(suffix).then((url) => { window.location.href = url; });
      return;
    }
    if (action === 'signup') {
      getSignupUrl().then((url) => { window.location.href = url; });
      return;
    }

    getMe().then((data) => {
      if (data.isAuthenticated) {
        const returnTo = sessionStorage.getItem('returnTo');
        sessionStorage.removeItem('returnTo');
        navigate(returnTo || '/dashboard');
      }
    });
  }, [navigate, searchParams]);

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">B2B Dreams</div>
        <div className="navbar-actions">
          <button className="btn-signup-nav" onClick={() => { sessionStorage.setItem('returnTo', '/register-business'); navigate('/login'); }}>Sign-up Your Business</button>
          <button className="btn-login-nav" onClick={handleLogin}>Log In</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-headline">Authentication made simple</h1>
            <p className="hero-subtitle">
              Secure, reliable identity infrastructure for your applications.
              Get started in minutes with enterprise-grade authentication.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => { sessionStorage.setItem('returnTo', '/register-business'); navigate('/login'); }}>Sign-up Your Business</button>
              <button className="btn-secondary" onClick={handleLogin}>Log In</button>
            </div>
            <div className="features-bar">
              <div className="feature-item">
                <span className="feature-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Universal Login
              </div>
              <div className="feature-item">
                <span className="feature-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Single Sign-On
              </div>
              <div className="feature-item">
                <span className="feature-icon">
                  <svg fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Multi-Factor Auth
              </div>
            </div>
          </div>
          <div className="hero-video">
            <iframe
              src="https://www.youtube.com/embed/M9z8MeQicz4?mute=1&rel=0"
              title="Auth0 Explainer Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              frameBorder="0"
            ></iframe>
          </div>
        </div>
      </section>

      {/* AI Agents Section */}
      <section className="dark-section">
        <div className="dark-section-inner">
          <div className="dark-section-text">
            <h2 className="dark-section-title">Secure your AI Agents</h2>
            <div className="dark-section-block">
              <div className="dark-section-label">Authenticate the User</div>
              <p className="dark-section-desc">
                Verify identity before your agent takes action. Connect to any identity provider and enforce MFA — so only the right people trigger your AI.
              </p>
            </div>
            <div className="dark-section-block">
              <div className="dark-section-label">Control the Tools</div>
              <p className="dark-section-desc">
                Define exactly which APIs and services your agent can access. Set granular permissions per user, per session, per action.
              </p>
            </div>
            <div className="dark-section-block">
              <div className="dark-section-label">Limit the Knowledge</div>
              <p className="dark-section-desc">
                Restrict what data your agent can see based on who's asking. Fine-grained authorization ensures your RAG pipeline only returns what's permitted.
              </p>
            </div>
            <div className="dark-section-capabilities">
              <div className="dark-section-capabilities-title">Capabilities</div>
              <div className="dark-section-capabilities-grid">
                <span className="dark-section-capability">Token Vault</span>
                <span className="dark-section-capability">User Authentication</span>
                <span className="dark-section-capability">Async Authorization</span>
                <span className="dark-section-capability">FGA for RAG</span>
              </div>
            </div>
            <button className="dark-section-cta">Learn more</button>
          </div>
          <div className="dark-section-visual">
            <div className="visual-card">
              <div className="visual-card-header">
                <span className="visual-card-dot"></span>
                <span className="visual-card-label">AI Agent</span>
              </div>
              <div className="visual-chat">
                <div className="visual-chat-bubble user">Book me a flight to NYC next Tuesday</div>
                <div className="visual-chat-bubble assistant">I'll need to verify your identity before accessing travel APIs...</div>
              </div>
              <div className="visual-card-status">
                <span className="visual-card-status-icon">●</span>
                <span className="visual-card-status-text">Identity verified — accessing permitted tools</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Section */}
      <section className="dark-section">
        <div className="dark-section-inner">
          <div className="dark-section-text">
            <h2 className="dark-section-title">Unlock enterprise deals</h2>
            <div className="dark-section-block">
              <div className="dark-section-label">Build with Robust APIs & SDKs</div>
              <p className="dark-section-desc">
                Ship identity features fast with libraries for every stack. Our APIs and SDKs handle the complexity so your team can focus on your product.
              </p>
            </div>
            <div className="dark-section-block">
              <div className="dark-section-label">Deploy Enterprise Features</div>
              <p className="dark-section-desc">
                SSO, SCIM provisioning, directory sync, and audit logs — everything your enterprise buyers expect, ready out of the box.
              </p>
            </div>
            <div className="dark-section-block">
              <div className="dark-section-label">Speed Up Sales</div>
              <p className="dark-section-desc">
                Close deals faster by meeting enterprise security requirements on day one. No more months-long compliance sprints blocking revenue.
              </p>
            </div>
            <div className="dark-section-capabilities">
              <div className="dark-section-capabilities-title">Capabilities</div>
              <div className="dark-section-capabilities-grid">
                <span className="dark-section-capability">Multi-tenancy</span>
                <span className="dark-section-capability">Fine-Grained Authorization</span>
                <span className="dark-section-capability">Enterprise Connections</span>
                <span className="dark-section-capability">Express Configuration</span>
                <span className="dark-section-capability">Delegated Admin</span>
                <span className="dark-section-capability">Universal Logout</span>
              </div>
            </div>
            <button className="dark-section-cta">Get started for free</button>
          </div>
          <div className="dark-section-visual">
            <div className="visual-card">
              <div className="visual-card-header">
                <span className="visual-card-dot"></span>
                <span className="visual-card-label">Enterprise SSO</span>
              </div>
              <div className="visual-card-code">
                <pre>{`{
  "connection": "okta-corp",
  "strategy": "samlp",
  "provisioning": "scim",
  "status": "active"
}`}</pre>
              </div>
              <div className="visual-card-status">
                <span className="visual-card-status-icon">●</span>
                <span className="visual-card-status-text">SSO configured — 2,400 users synced</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B2C Section */}
      <section className="dark-section">
        <div className="dark-section-inner">
          <div className="dark-section-text">
            <h2 className="dark-section-title">More signups. Less friction.</h2>
            <div className="dark-section-block">
              <div className="dark-section-label">Orchestrate Tailored Journeys</div>
              <p className="dark-section-desc">
                Design custom signup and login flows for every audience. Progressive profiling, social connections, and branded experiences that convert.
              </p>
            </div>
            <div className="dark-section-block">
              <div className="dark-section-label">Protect with Ease</div>
              <p className="dark-section-desc">
                Stop bots and credential stuffing without annoying real users. Adaptive MFA and anomaly detection protect your funnel silently.
              </p>
            </div>
            <div className="dark-section-block">
              <div className="dark-section-label">Connect Experiences</div>
              <p className="dark-section-desc">
                Unify identity across web, mobile, and IoT. Single sign-on gives your users one seamless experience everywhere.
              </p>
            </div>
            <div className="dark-section-capabilities">
              <div className="dark-section-capabilities-title">Capabilities</div>
              <div className="dark-section-capabilities-grid">
                <span className="dark-section-capability">Passwordless</span>
                <span className="dark-section-capability">Embedded Login</span>
                <span className="dark-section-capability">User Authentication</span>
                <span className="dark-section-capability">Multi-Factor Authentication</span>
                <span className="dark-section-capability">Single Sign-On</span>
                <span className="dark-section-capability">Bot Detection</span>
              </div>
            </div>
            <button className="dark-section-cta">Learn more</button>
          </div>
          <div className="dark-section-visual">
            <div className="visual-card">
              <div className="visual-card-header">
                <span className="visual-card-dot"></span>
                <span className="visual-card-label">Signup Flow</span>
              </div>
              <div className="visual-card-code">
                <pre>{`{
  "flow": "progressive",
  "social": ["google", "github"],
  "passwordless": true,
  "bot_detection": "enabled"
}`}</pre>
              </div>
              <div className="visual-card-status">
                <span className="visual-card-status-icon">●</span>
                <span className="visual-card-status-text">Conversion rate +34% this month</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
