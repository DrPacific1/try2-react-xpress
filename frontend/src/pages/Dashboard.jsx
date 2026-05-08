import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe, logout, getMyOrganizations, getLoginUrl, getMyOrganization } from '../api';
import DashboardTab from '../components/dashboard/DashboardTab';
import MFASetupTab from '../components/dashboard/MFASetupTab';
import DebugTab from '../components/dashboard/DebugTab';
import MyAccountTab from '../components/dashboard/MyAccountTab';
import AdminConsoleTab from '../components/dashboard/AdminConsoleTab';
import SSOTab from '../components/dashboard/SSOTab';
import './Dashboard.css';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'mfa', label: 'MFA Setup' },
  { id: 'debug', label: 'Debug' },
  { id: 'account', label: 'Account Linking' },
  { id: 'admin', label: 'Admin Console', adminOnly: true },
  { id: 'sso', label: 'SSO', adminOnly: true },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getMe().then((data) => {
      if (!data.isAuthenticated) {
        navigate('/');
      } else {
        setUser(data.user);
        if (data.user.org_id) {
          setCurrentOrgId(data.user.org_id);
        }
        getMyOrganizations().then(setOrganizations);
        getMyOrganization().then((orgData) => {
          if (orgData && orgData.isAdmin) setIsAdmin(true);
        });
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

  const handleSwitchOrg = async (orgId) => {
    setOrgDropdownOpen(false);
    const url = await getLoginUrl(`?organization=${orgId}`);
    window.location.href = url;
  };

  if (loading) {
    return <div className="dashboard-loading">Loading...</div>;
  }

  if (!user) return null;

  const firstName = user.name ? user.name.split(' ')[0] : 'User';

  return (
    <div className="dashboard-container">
      <nav className="tab-navigation">
        {TABS.filter((tab) => !tab.adminOnly || isAdmin).map((tab) => (
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
          {organizations.length > 0 && (
            <div className="org-switcher">
              <button
                className="btn-org-switcher"
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              >
                {organizations.find(o => o.id === currentOrgId)?.display_name || 'Select Org'}
                <span className="org-switcher-arrow">&#9662;</span>
              </button>
              {orgDropdownOpen && (
                <div className="org-dropdown">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      className={`org-dropdown-item ${org.id === currentOrgId ? 'active' : ''}`}
                      onClick={() => handleSwitchOrg(org.id)}
                    >
                      {org.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
        {activeTab === 'sso' && <SSOTab user={user} />}
      </div>
    </div>
  );
}
