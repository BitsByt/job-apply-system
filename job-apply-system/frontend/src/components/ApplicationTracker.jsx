import { useState, useEffect } from "react";
import axios from "axios";

const statusColors = {
  Pending: '#f59e0b',
  Interview: '#3b82f6',
  Rejected: '#ef4444',
  Accepted: '#10b981'
};

const statusIcons = {
  Pending: '⏳',
  Interview: '🗓️',
  Rejected: '❌',
  Accepted: '🎉'
};

function ApplicationTracker({ isDark }) {
  const [applications, setApplications] = useState([]);

  const textPrimary = isDark ? '#caf0f8' : '#0d2035';
  const textMuted   = isDark ? '#4a7fa5' : '#4a7a9b';
  const accent      = isDark ? '#00b4d8' : '#0077b6';
  const cardBg      = isDark ? 'rgba(0,180,216,0.04)' : 'rgba(255,255,255,0.8)';
  const cardBorder  = isDark ? 'rgba(0,180,216,0.1)'  : 'rgba(0,150,200,0.2)';
  const selectBg    = isDark ? '#0a1628' : '#f0f8fc';
  const emptyHint   = isDark ? '#1e3a5f' : '#6a9ab0';

  useEffect(() => {
    axios.get("http://localhost:3000/applications")
      .then((res) => setApplications(res.data))
      .catch(() => console.error("Failed to fetch applications."));
  }, []);

  async function fetchApplications() {
    try {
      const response = await axios.get("http://localhost:3000/applications");
      setApplications(response.data);
    } catch {
      console.error("Failed to fetch applications.");
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await axios.patch(`http://localhost:3000/applications/${id}`, { status });
      fetchApplications();
    } catch {
      console.error("Failed to update status.");
    }
  }

  async function handleDelete(id) {
    try {
      await axios.delete(`http://localhost:3000/applications/${id}`);
      fetchApplications();
    } catch {
      console.error("Failed to delete application.");
    }
  }

  const counts = {
    Total: applications.length,
    Pending: applications.filter(a => a.status === 'Pending').length,
    Interview: applications.filter(a => a.status === 'Interview').length,
    Accepted: applications.filter(a => a.status === 'Accepted').length,
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: accent }}>📋 Application Tracker</h2>
        <p style={{ margin: 0, color: textMuted, fontSize: '13px' }}>Track every job you've applied to.</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Applied', value: counts.Total, color: accent, icon: '📨' },
          { label: 'Pending', value: counts.Pending, color: '#f59e0b', icon: '⏳' },
          { label: 'Interviews', value: counts.Interview, color: '#3b82f6', icon: '🗓️' },
          { label: 'Accepted', value: counts.Accepted, color: '#10b981', icon: '🎉' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: cardBg,
            border: `1px solid ${stat.color}33`,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
            transition: 'background 0.3s',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: textMuted, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {applications.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <p style={{ color: textMuted, fontSize: '14px', margin: '0 0 8px 0' }}>No applications yet</p>
          <p style={{ color: emptyHint, fontSize: '12px', margin: 0 }}>Go to the Jobs tab and click Mark Applied on a listing</p>
        </div>
      )}

      {/* Application Cards */}
      {applications.map((app) => (
        <div key={app.id} style={{
          background: cardBg,
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '10px',
          border: `1px solid ${cardBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          transition: 'background 0.3s',
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 3px 0', fontSize: '14px', color: textPrimary }}>{app.jobTitle}</h3>
            <p style={{ margin: '0 0 3px 0', color: accent, fontSize: '12px' }}>{app.companyName}</p>
            <p style={{ margin: 0, color: textMuted, fontSize: '11px' }}>Applied: {app.appliedAt}</p>
            <a href={app.jobLink} target="_blank" rel="noreferrer"
              style={{ color: textMuted, fontSize: '11px', textDecoration: 'underline' }}>
              View Job ↗
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
              background: statusColors[app.status] + '22', color: statusColors[app.status],
              border: `1px solid ${statusColors[app.status]}44`,
            }}>
              {statusIcons[app.status]} {app.status}
            </span>
            <select
              value={app.status}
              onChange={(e) => handleStatusChange(app.id, e.target.value)}
              style={{
                padding: '5px 10px', borderRadius: '6px',
                background: selectBg, color: textPrimary,
                border: `1px solid ${cardBorder}`,
                cursor: 'pointer', fontSize: '12px',
              }}
            >
              <option>Pending</option>
              <option>Interview</option>
              <option>Rejected</option>
              <option>Accepted</option>
            </select>
            <button
              onClick={() => handleDelete(app.id)}
              style={{
                padding: '5px 12px', background: 'rgba(239,68,68,0.1)',
                color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ApplicationTracker;