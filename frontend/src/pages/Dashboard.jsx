import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, logout } from '../api';
import DashboardTab from '../components/dashboard/DashboardTab';
import MFASetupTab from '../components/dashboard/MFASetupTab';
import DebugTab from '../components/dashboard/DebugTab';
import MyAccountTab from '../components/dashboard/MyAccountTab';
import AdminConsoleTab from '../components/dashboard/AdminConsoleTab';
import './Dashboard.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'mfa', label: 'MFA Setup' },
  { id: 'debug', label: 'Debug' },
  { id: 'account', label: 'My Account/API' },
  { id: 'admin', label: 'Admin Console' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMe().then((data) => {
      if (!data.isAuthenticated) {
        navigate('/');
      } else {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, [navigate]);

  const handleLogout = async () => {
    const data = await logout();
    if (data.logoutUrl) {
      window.location.href = data.logoutUrl;
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  if (!user) return null;

  const firstName = user.name ? user.name.split(' ')[0] : 'User';

  return (
    <div className="dashboard-container">
      <nav className="tab-navigation">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="dashboard-header">
        <h1 className="dashboard-welcome">Welcome {firstName}</h1>
        <div className="header-actions">
          <button className="btn-profile">
            {user.picture && <img src={user.picture} alt="" />}
            Profile
          </button>
          <button className="btn-signout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="tab-content">
        {activeTab === 'dashboard' && <DashboardTab user={user} />}
        {activeTab === 'mfa' && <MFASetupTab user={user} />}
        {activeTab === 'debug' && <DebugTab user={user} />}
        {activeTab === 'account' && <MyAccountTab user={user} />}
        {activeTab === 'admin' && <AdminConsoleTab user={user} />}
      </div>
    </div>
  );
}
