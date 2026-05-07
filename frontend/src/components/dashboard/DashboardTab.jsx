export default function DashboardTab({ user }) {
  const firstName = user.name ? user.name.split(' ')[0] : 'User';

  return (
    <div className="tab-panel">
      <div className="card">
        <h2 className="card-title">Your Dashboard</h2>
        <p className="card-subtitle">
          Welcome back, {firstName}. You're signed in as {user.email}.
        </p>
      </div>
    </div>
  );
}
