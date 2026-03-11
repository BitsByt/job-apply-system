import { useState, useEffect } from "react";
import axios from "axios";

const BASE = "https://job-apply-system-backend-7i1m.onrender.com";

const EMPTY_FORM = {
  fullName: "", email: "", phone: "", location: "",
  linkedin: "", portfolio: "", skills: "", languages: "",
  certifications: "", summary: "", experience: "",
  education: "", projects: "", awards: "",
};

const SLOT_LABELS = ["Profile 1", "Profile 2", "Profile 3"];

function ProfileForm({ isDark, form, setForm, message, setMessage }) {
  const [activeSlot, setActiveSlot] = useState(1); // 1-indexed to match DB
  const [slots, setSlots] = useState({ 1: null, 2: null, 3: null });
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [slotMsg, setSlotMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Load all slots from backend on mount
  useEffect(() => {
    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const { data } = await axios.get(`${BASE}/profile`);
        setSlots({ 1: data["1"] || null, 2: data["2"] || null, 3: data["3"] || null });
        // Auto-load slot 1 if it exists
        if (data[1]) setForm(cleanForm(data[1]));
      } catch {
        // silent fail
      }
      setLoadingSlots(false);
    }
    fetchSlots();
  }, []);

  function cleanForm(row) {
    return {
      fullName:       row.fullName       || "",
      email:          row.email          || "",
      phone:          row.phone          || "",
      location:       row.location       || "",
      linkedin:       row.linkedin       || "",
      portfolio:      row.portfolio      || "",
      skills:         row.skills         || "",
      languages:      row.languages      || "",
      certifications: row.certifications || "",
      summary:        row.summary        || "",
      experience:     row.experience     || "",
      education:      row.education      || "",
      projects:       row.projects       || "",
      awards:         row.awards         || "",
    };
  }

  function handleSelectSlot(slotNum) {
    setActiveSlot(slotNum);
    if (slots[slotNum]) {
      setForm(cleanForm(slots[slotNum]));
      setSlotMsg(`Loaded ${SLOT_LABELS[slotNum - 1]}`);
    } else {
      setForm({ ...EMPTY_FORM });
      setSlotMsg(`${SLOT_LABELS[slotNum - 1]} is empty`);
    }
    setMessage("");
    setTimeout(() => setSlotMsg(""), 2000);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await axios.post(`${BASE}/profile`, { ...form, slot: activeSlot });
      // Update local slot cache
      setSlots(prev => ({ ...prev, [activeSlot]: { ...form, slot: activeSlot } }));
      setMessage(response.data.message || "Profile saved!");
    } catch {
      setMessage("Something went wrong. Is the backend running?");
    }
    setSaving(false);
  }

  const accent = isDark ? '#00b4d8' : '#0077b6';
  const muted  = isDark ? '#4a7fa5' : '#4a7a9b';

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '8px',
    border: isDark ? '1px solid rgba(0,180,216,0.15)' : '1px solid rgba(0,150,200,0.25)',
    background: isDark ? 'rgba(0,180,216,0.05)' : 'rgba(255,255,255,0.9)',
    color: isDark ? '#caf0f8' : '#0d2035',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'background 0.3s, color 0.3s, border-color 0.3s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    color: muted,
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '6px',
  };

  const fieldStyle = { marginBottom: '16px' };

  const sectionLabel = (text) => (
    <div style={{
      fontSize: '11px', fontWeight: 'bold', color: accent,
      textTransform: 'uppercase', letterSpacing: '1.5px',
      marginBottom: '14px', marginTop: '8px',
      borderBottom: `1px solid ${isDark ? 'rgba(0,180,216,0.1)' : 'rgba(0,150,200,0.15)'}`,
      paddingBottom: '6px',
    }}>{text}</div>
  );

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: accent }}>👤 Your Profile</h2>
        <p style={{ margin: 0, color: muted, fontSize: '13px' }}>This info will be used to generate your cover letters and tailored resumes.</p>
      </div>

      {/* Profile Slots */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '20px',
        padding: '12px 14px',
        background: isDark ? 'rgba(0,180,216,0.04)' : 'rgba(0,150,200,0.05)',
        border: `1px solid ${isDark ? 'rgba(0,180,216,0.12)' : 'rgba(0,150,200,0.18)'}`,
        borderRadius: '12px',
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: '12px', color: muted, marginRight: '4px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Profiles:
        </span>

        {loadingSlots ? (
          <span style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Loading...</span>
        ) : (
          SLOT_LABELS.map((label, i) => {
            const slotNum = i + 1;
            const filled = !!slots[slotNum];
            const isActive = activeSlot === slotNum;
            return (
              <button
                key={slotNum}
                onClick={() => handleSelectSlot(slotNum)}
                title={filled ? `Load ${label}` : `${label} (empty)`}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: isActive
                    ? `1.5px solid ${accent}`
                    : `1px solid ${isDark ? 'rgba(0,180,216,0.2)' : 'rgba(0,150,200,0.25)'}`,
                  background: isActive
                    ? (isDark ? 'rgba(0,180,216,0.15)' : 'rgba(0,150,200,0.12)')
                    : 'transparent',
                  color: isActive ? accent : muted,
                  fontWeight: isActive ? 'bold' : 'normal',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {label}
                {filled && (
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: isActive ? accent : (isDark ? 'rgba(0,180,216,0.5)' : 'rgba(0,150,200,0.5)'),
                    display: 'inline-block',
                  }} />
                )}
              </button>
            );
          })
        )}

        {slotMsg && (
          <span style={{ fontSize: '12px', color: accent, marginLeft: '8px', fontStyle: 'italic' }}>
            {slotMsg}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Left Column */}
        <div>
          {sectionLabel('Basic Info')}
          <div style={fieldStyle}>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} name="fullName" placeholder="e.g. Juan dela Cruz" value={form.fullName} onChange={handleChange} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} name="email" placeholder="e.g. juan@gmail.com" value={form.email} onChange={handleChange} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Phone</label>
            <input style={inputStyle} name="phone" placeholder="e.g. 09xx xxx xxxx" value={form.phone} onChange={handleChange} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Location</label>
            <input style={inputStyle} name="location" placeholder="e.g. Cavite, Philippines" value={form.location} onChange={handleChange} />
          </div>

          {sectionLabel('Online Presence')}
          <div style={fieldStyle}>
            <label style={labelStyle}>LinkedIn</label>
            <input style={inputStyle} name="linkedin" placeholder="e.g. linkedin.com/in/yourname" value={form.linkedin || ''} onChange={handleChange} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>GitHub / Portfolio</label>
            <input style={inputStyle} name="portfolio" placeholder="e.g. github.com/yourname" value={form.portfolio || ''} onChange={handleChange} />
          </div>

          {sectionLabel('Skills & Languages')}
          <div style={fieldStyle}>
            <label style={labelStyle}>Technical Skills</label>
            <input style={inputStyle} name="skills" placeholder="e.g. React, Node.js, Python, SQL" value={form.skills} onChange={handleChange} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Languages</label>
            <input style={inputStyle} name="languages" placeholder="e.g. English (fluent), Filipino (native)" value={form.languages || ''} onChange={handleChange} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Certifications</label>
            <input style={inputStyle} name="certifications" placeholder="e.g. AWS Cloud Practitioner, Google UX" value={form.certifications || ''} onChange={handleChange} />
          </div>
        </div>

        {/* Right Column */}
        <div>
          {sectionLabel('Background')}
          <div style={fieldStyle}>
            <label style={labelStyle}>Career Summary / Objective</label>
            <textarea
              style={{ ...inputStyle, height: '90px', resize: 'vertical' }}
              name="summary"
              placeholder="e.g. Motivated fresh graduate seeking a frontend developer role..."
              value={form.summary || ''}
              onChange={handleChange}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Work Experience</label>
            <textarea
              style={{ ...inputStyle, height: '130px', resize: 'vertical' }}
              name="experience"
              placeholder="e.g. Junior Web Developer at XYZ Company (2023–2024)&#10;- Built responsive web apps&#10;- Worked with REST APIs"
              value={form.experience}
              onChange={handleChange}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Education</label>
            <textarea
              style={{ ...inputStyle, height: '80px', resize: 'vertical' }}
              name="education"
              placeholder="e.g. BS Information Technology&#10;Mapua University, 2025"
              value={form.education}
              onChange={handleChange}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Projects</label>
            <textarea
              style={{ ...inputStyle, height: '90px', resize: 'vertical' }}
              name="projects"
              placeholder="e.g. Job Apply System — Full-stack app with AI cover letter generation (React, Node.js, Groq)"
              value={form.projects || ''}
              onChange={handleChange}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Awards / Achievements</label>
            <textarea
              style={{ ...inputStyle, height: '70px', resize: 'vertical' }}
              name="awards"
              placeholder="e.g. Dean's Lister 2023, Best Capstone Project Award"
              value={form.awards || ''}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      {/* Tip Box */}
      <div style={{
        background: isDark ? 'rgba(0,180,216,0.05)' : 'rgba(0,150,200,0.06)',
        border: isDark ? '1px solid rgba(0,180,216,0.1)' : '1px solid rgba(0,150,200,0.2)',
        borderRadius: '10px', padding: '14px 18px',
        marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: '18px' }}>💡</span>
        <div>
          <p style={{ margin: '0 0 4px 0', color: accent, fontSize: '13px', fontWeight: 'bold' }}>Pro Tip</p>
          <p style={{ margin: 0, color: muted, fontSize: '12px' }}>
            Use multiple profiles for different job types — e.g. one for frontend roles, one for full-stack.
            Click a slot to load it, edit your details, then hit Save. Profiles sync across all your devices.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            padding: '12px 32px',
            background: 'linear-gradient(135deg, #00b4d8, #00f5d4)',
            color: '#050d1a', border: 'none', borderRadius: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 'bold', fontSize: '14px',
            opacity: saving ? 0.7 : 1,
            boxShadow: '0 0 20px rgba(0,180,216,0.3)',
            transition: 'opacity 0.2s',
          }}
        >
          {saving ? "Saving..." : `Save Profile (${SLOT_LABELS[activeSlot - 1]})`}
        </button>
        {message && (
          <span style={{ color: isDark ? '#00f5d4' : '#007a8a', fontSize: '14px' }}>✅ {message}</span>
        )}
      </div>
    </div>
  );
}

export default ProfileForm;