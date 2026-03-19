/* eslint-disable */
import { useState, useEffect } from "react";
import axios from "axios";
import ProfileForm from "./components/ProfileForm";
import ResumeUpload from "./components/ResumeUpload";
import JobSearch from "./components/JobSearch";
import ApplicationTracker from "./components/ApplicationTracker";
import Auth from "./components/Auth";

const darkTheme = {
  bgGradient: 'radial-gradient(ellipse at top, #0a1f3c 0%, #050d1a 60%)',
  gridColor: 'rgba(0,180,216,0.03)',
  card: 'rgba(8,15,31,0.95)',
  cardBorder: 'rgba(0,180,216,0.15)',
  cardShadow: '0 0 60px rgba(0,180,216,0.05), 0 0 120px rgba(0,245,212,0.03)',
  badgeBg: 'rgba(0,180,216,0.08)',
  badgeBorder: 'rgba(0,180,216,0.2)',
  primary: '#00b4d8',
  text: '#caf0f8',
  muted: '#4a7fa5',
  navInactive: 'rgba(0,180,216,0.05)',
  navBorder: 'rgba(0,180,216,0.15)',
  navGradient: 'linear-gradient(135deg, #00b4d8, #00f5d4)',
  h1Color: '#00e5ff',
  toggleTrack: '#1a3a4a',
  toggleBorder: 'rgba(0,180,216,0.35)',
  toggleThumb: '#00b4d8',
  toggleShadow: '0 0 6px rgba(0,180,216,0.6)',
};

const lightTheme = {
  bgGradient: 'radial-gradient(ellipse at top, #d0eaf7 0%, #eef6fb 60%)',
  gridColor: 'rgba(0,130,180,0.04)',
  card: 'rgba(255,255,255,0.95)',
  cardBorder: 'rgba(0,150,200,0.2)',
  cardShadow: '0 4px 40px rgba(0,130,180,0.08)',
  badgeBg: 'rgba(0,150,200,0.08)',
  badgeBorder: 'rgba(0,150,200,0.25)',
  primary: '#0088aa',
  text: '#0d2035',
  muted: '#4a7a9b',
  navInactive: 'rgba(0,150,200,0.06)',
  navBorder: 'rgba(0,150,200,0.2)',
  navGradient: 'linear-gradient(135deg, #0077b6, #00b4d8)',
  h1Color: '#0077b6',
  toggleTrack: '#d4eaf7',
  toggleBorder: 'rgba(245,166,35,0.5)',
  toggleThumb: '#f5a623',
  toggleShadow: '0 0 8px rgba(245,166,35,0.7)',
};

function App() {
  const [page, setPage] = useState("profile");
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem("jas_token");
    if (savedToken) axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
    return savedToken || null;
  });

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("jas_user")) || null; }
    catch { return null; }
  });

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      axios.defaults.headers.common["Authorization"] = "";
    }
  }, [token]);

  function handleLogin(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("jas_token", newToken);
    localStorage.setItem("jas_user", JSON.stringify(newUser));
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
  }

  async function handleLogout() {
    try {
      await axios.post("https://job-apply-system-backend-7i1m.onrender.com/auth/logout");
    } catch (_) {}
    setToken(null);
    setUser(null);
    localStorage.removeItem("jas_token");
    localStorage.removeItem("jas_user");
    axios.defaults.headers.common["Authorization"] = "";
    setProfileForm({
      fullName: "", email: "", phone: "", location: "",
      linkedin: "", portfolio: "", skills: "", languages: "",
      certifications: "", summary: "", experience: "",
      education: "", projects: "", awards: "",
    });
    setJobs([]);
    setPage("profile");
  }

  const [profileForm, setProfileForm] = useState({
    fullName: "", email: "", phone: "", location: "",
    linkedin: "", portfolio: "", skills: "", languages: "",
    certifications: "", summary: "", experience: "",
    education: "", projects: "", awards: "",
  });
  const [profileMessage, setProfileMessage] = useState("");

  const [jobTitle, setJobTitle] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [activeFilters, setActiveFilters] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [jobSearched, setJobSearched] = useState(false);
  const [jobMessage, setJobMessage] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedResumeJob, setSelectedResumeJob] = useState(null);

  if (!token) {
    return <Auth onLogin={handleLogin} isDark={isDark} />;
  }

  function renderPage() {
    if (page === "profile") return (
      <ProfileForm
        isDark={isDark}
        form={profileForm} setForm={setProfileForm}
        message={profileMessage} setMessage={setProfileMessage}
      />
    );
    if (page === "resume") return <ResumeUpload isDark={isDark} />;
    if (page === "jobs") return (
      <JobSearch
        isDark={isDark}
        title={jobTitle} setTitle={setJobTitle}
        location={jobLocation} setLocation={setJobLocation}
        activeFilters={activeFilters} setActiveFilters={setActiveFilters}
        jobs={jobs} setJobs={setJobs}
        searched={jobSearched} setSearched={setJobSearched}
        message={jobMessage} setMessage={setJobMessage}
        selectedJob={selectedJob} setSelectedJob={setSelectedJob}
        selectedResumeJob={selectedResumeJob} setSelectedResumeJob={setSelectedResumeJob}
      />
    );
    if (page === "tracker") return <ApplicationTracker isDark={isDark} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: t.bgGradient,
      color: t.text,
      fontFamily: "'Segoe UI', sans-serif",
      transition: 'background 0.3s, color 0.3s',
    }}>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `linear-gradient(${t.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${t.gridColor} 1px, transparent 1px)`,
        backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '880px', margin: '0 auto', padding: '48px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: t.muted }}>{user?.email}</span>
            <button onClick={handleLogout} style={{
              padding: '5px 14px',
              background: 'rgba(248,113,113,0.1)',
              color: '#f87171',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: '8px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 'bold',
            }}>Sign Out</button>
          </div>

          <button onClick={() => setIsDark(p => !p)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px'
          }}>
            <div style={{
              position: 'relative', width: '48px', height: '26px',
              borderRadius: '999px', background: t.toggleTrack,
              border: `1.5px solid ${t.toggleBorder}`,
              transition: 'background 0.3s, border-color 0.3s', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', top: '2px', left: isDark ? '2px' : '22px',
                width: '18px', height: '18px', borderRadius: '50%',
                background: t.toggleThumb, boxShadow: t.toggleShadow,
                transition: 'left 0.3s cubic-bezier(0.34,1.56,0.64,1), background 0.3s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
              }}>
                {isDark ? '🌙' : '☀️'}
              </div>
            </div>
            <span style={{ fontSize: '13px', color: t.muted, fontWeight: 500 }}>
              {isDark ? 'Dark' : 'Light'}
            </span>
          </button>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-block', background: t.badgeBg,
            border: `1px solid ${t.badgeBorder}`, borderRadius: '100px',
            padding: '6px 18px', fontSize: '12px', color: t.primary,
            marginBottom: '16px', letterSpacing: '2px', textTransform: 'uppercase',
          }}>
            Your Job Hunt, Automated
          </div>
          <h1 style={{ fontSize: '2.8rem', margin: '0 0 10px 0', color: t.h1Color, letterSpacing: '1px', lineHeight: 1.2 }}>
            Just Apply Smart
          </h1>
          <p style={{ color: t.muted, margin: 0, fontSize: '15px' }}>
            Search jobs · Generate cover letters & resumes · Track applications
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[
            { key: 'profile', label: '👤 Profile' },
            { key: 'resume', label: '📄 Resume' },
            { key: 'jobs', label: '🔍 Jobs' },
            { key: 'tracker', label: '📋 Tracker' },
          ].map((p) => (
            <button key={p.key} onClick={() => setPage(p.key)} style={{
              padding: '10px 24px', cursor: 'pointer',
              background: page === p.key ? t.navGradient : t.navInactive,
              color: page === p.key ? '#fff' : t.muted,
              border: `1px solid ${page === p.key ? 'transparent' : t.navBorder}`,
              borderRadius: '10px', fontWeight: 'bold', fontSize: '14px',
              boxShadow: page === p.key ? '0 0 20px rgba(0,180,216,0.3)' : 'none',
              transition: 'all 0.2s',
            }}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={{
          background: t.card, borderRadius: '20px', padding: '32px',
          border: `1px solid ${t.cardBorder}`, boxShadow: t.cardShadow,
          backdropFilter: 'blur(10px)',
        }}>
          {renderPage()}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', color: t.muted, fontSize: '12px' }}>
          Built with React + Node.js · Powered by Groq AI · Built by Elijah Ethanli D. Escondo
        </p>
      </div>
    </div>
  );
}

export default App;