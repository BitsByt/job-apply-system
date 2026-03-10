import { useState } from "react";
import axios from "axios";

const BASE = "https://job-apply-system-backend-7i1m.onrender.com";

export default function Auth({ onLogin, isDark }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const t = {
    bg:        isDark ? 'radial-gradient(ellipse at top, #0a1f3c 0%, #050d1a 60%)' : 'radial-gradient(ellipse at top, #d0eaf7 0%, #eef6fb 60%)',
    card:      isDark ? 'rgba(8,15,31,0.95)' : 'rgba(255,255,255,0.95)',
    border:    isDark ? 'rgba(0,180,216,0.15)' : 'rgba(0,150,200,0.2)',
    primary:   isDark ? '#00b4d8' : '#0077b6',
    text:      isDark ? '#caf0f8' : '#0d2035',
    muted:     isDark ? '#4a7fa5' : '#4a7a9b',
    inputBg:   isDark ? 'rgba(0,180,216,0.05)' : 'rgba(240,248,255,0.9)',
    h1:        isDark ? '#00e5ff' : '#0077b6',
    error:     '#f87171',
    success:   '#10b981',
  };

  async function handleSubmit() {
    if (!email || !password) return setMessage("Please fill in all fields.");
    setLoading(true);
    setMessage("");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await axios.post(`${BASE}${endpoint}`, { email, password });

      if (mode === "register") {
        setMessage("Account created! Please log in.");
        setMode("login");
        setPassword("");
      } else {
        onLogin(data.token, data.user ?? { email });
      }
    } catch (err) {
      setMessage(err.response?.data?.message || err.response?.data?.error || "Something went wrong.");
    }
    setLoading(false);
  }

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    background: t.inputBg,
    border: `1px solid ${t.border}`,
    borderRadius: '10px',
    color: t.text,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };

  const btnStyle = {
    width: '100%',
    padding: '12px',
    background: `linear-gradient(135deg, ${t.primary}, #00f5d4)`,
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '15px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'opacity 0.2s',
    marginTop: '8px',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundImage: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>

        {/* Logo / title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', color: t.h1, margin: '0 0 6px 0', letterSpacing: '1px' }}>
            Just Apply Smart
          </h1>
          <p style={{ color: t.muted, fontSize: '14px', margin: 0 }}>
            {mode === "login" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '20px', padding: '32px', backdropFilter: 'blur(10px)' }}>

          {/* Mode toggle */}
          <div style={{ display: 'flex', marginBottom: '24px', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${t.border}` }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setMessage(""); }} style={{
                flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                background: mode === m ? `linear-gradient(135deg, ${t.primary}, #00f5d4)` : 'transparent',
                color: mode === m ? '#fff' : t.muted,
                fontWeight: 'bold', fontSize: '14px', transition: 'all 0.2s',
              }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
            />
          </div>

          {message && (
            <p style={{ color: message.includes("created") ? t.success : t.error, fontSize: '13px', margin: '12px 0 0 0', textAlign: 'center' }}>
              {message}
            </p>
          )}

          <button onClick={handleSubmit} disabled={loading} style={btnStyle}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: t.muted, fontSize: '12px', marginTop: '20px' }}>
          Built with React + Node.js · Powered by Groq AI
        </p>
      </div>
    </div>
  );
}