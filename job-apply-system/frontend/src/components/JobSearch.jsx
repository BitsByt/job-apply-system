import { useState } from "react";
import axios from "axios";
import CoverLetter from "./CoverLetter";
import ResumeGenerator from "./ResumeGenerator";

const FILTERS = ["Full-time", "Part-time", "Remote", "Fresh Grad", "Internship"];

function JobSearch({
  isDark,
  title, setTitle,
  location, setLocation,
  activeFilters, setActiveFilters,
  jobs, setJobs,
  searched, setSearched,
  message, setMessage,
  selectedJob, setSelectedJob,
  selectedResumeJob, setSelectedResumeJob,
  onSaveResume,
}) {
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState("Global (JSearch)");

  const textPrimary = isDark ? '#caf0f8' : '#0d2035';
  const textMuted   = isDark ? '#4a7fa5' : '#4a7a9b';
  const accent      = isDark ? '#00b4d8' : '#0077b6';
  const cardBg      = isDark ? 'rgba(0,180,216,0.04)' : 'rgba(255,255,255,0.85)';
  const cardBorder  = isDark ? 'rgba(0,180,216,0.1)'  : 'rgba(0,150,200,0.2)';
  const emptyHint   = isDark ? '#1e3a5f' : '#6a9ab0';

  const inputStyle = {
    padding: '11px 14px', borderRadius: '8px',
    border: isDark ? '1px solid rgba(0,180,216,0.15)' : '1px solid rgba(0,150,200,0.25)',
    background: isDark ? 'rgba(0,180,216,0.05)' : 'rgba(255,255,255,0.9)',
    color: textPrimary, fontSize: '14px', flex: 1, outline: 'none',
    transition: 'background 0.3s, color 0.3s',
  };

  async function handleSearch() {
    if (!title) return setMessage("Please enter a job title.");
    if (source === 'Global (JSearch)' && !location) return setMessage("Please enter a location.");
    setLoading(true);
    setMessage("");
    setSearched(true);

    try {
      let response;
      if (source === 'Cavite Jobs') {
        response = await axios.get(
          "https://job-apply-system-backend-7i1m.onrender.com/cavitejobs",
          {
            params: { keyword: title },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
      } else {
        const query = activeFilters.length > 0 ? `${title} ${activeFilters.join(' ')}` : title;
        response = await axios.get(
          "https://job-apply-system-backend-7i1m.onrender.com/jobs",
          {
            params: { title: query, location },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
      }
      setJobs(response.data);
      if (response.data.length === 0) setMessage("No jobs found. Try a different search.");
    } catch {
      setMessage("Search failed. Is the backend running?");
    }
    setLoading(false);
  }

  async function handleApply(job) {
    try {
      await axios.post(
        "https://job-apply-system-backend-7i1m.onrender.com/applications",
        { jobTitle: job.job_title, companyName: job.employer_name, jobLink: job.job_apply_link },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert("Application saved to tracker!");
    } catch {
      alert("Failed to save application.");
    }
  }

  function toggleCoverLetter(job) {
    setSelectedJob(selectedJob?.job_id === job.job_id ? null : job);
    setSelectedResumeJob(null);
  }

  function toggleResume(job) {
    setSelectedResumeJob(selectedResumeJob?.job_id === job.job_id ? null : job);
    setSelectedJob(null);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: accent }}>🔍 Search Jobs</h2>
        <p style={{ margin: 0, color: textMuted, fontSize: '13px' }}>Search across thousands of live job listings.</p>
      </div>

      {/* Source Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
        <span style={{ color: textMuted, fontSize: '12px' }}>Source:</span>
        {['Global (JSearch)', 'Cavite Jobs'].map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: `1px solid ${source === s ? '#00f5d4' : 'rgba(0,180,216,0.2)'}`,
              background: source === s ? 'rgba(0,245,212,0.15)' : 'transparent',
              color: source === s ? '#00f5d4' : textMuted,
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: source === s ? 'bold' : 'normal',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <input
          style={inputStyle}
          placeholder="Job Title (e.g. Web Developer)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        {source === 'Global (JSearch)' && (
          <input
            style={{ ...inputStyle, flex: '0 0 200px' }}
            placeholder="Location (e.g. Manila)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        )}
        <button onClick={handleSearch} style={{
          padding: '11px 28px',
          background: 'linear-gradient(135deg, #00b4d8, #00f5d4)',
          color: '#050d1a', border: 'none', borderRadius: '8px',
          cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
          boxShadow: '0 0 20px rgba(0,180,216,0.3)',
        }}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button key={f}
            onClick={() => setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
            style={{
              padding: '6px 14px', borderRadius: '20px',
              border: `1px solid ${activeFilters.includes(f) ? accent : cardBorder}`,
              background: activeFilters.includes(f)
                ? (isDark ? 'rgba(0,180,216,0.15)' : 'rgba(0,150,200,0.1)')
                : 'transparent',
              color: activeFilters.includes(f) ? accent : textMuted,
              fontSize: '12px', cursor: 'pointer',
              fontWeight: activeFilters.includes(f) ? 'bold' : 'normal',
              transition: 'all 0.2s',
            }}
          >{f}</button>
        ))}
      </div>

      {message && <p style={{ color: textMuted, marginBottom: '16px' }}>{message}</p>}

      {/* Empty State */}
      {!searched && jobs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          <p style={{ color: textMuted, fontSize: '14px', margin: '0 0 8px 0' }}>Enter a job title to find listings</p>
          <p style={{ color: emptyHint, fontSize: '12px', margin: 0 }}>Results are pulled live from job boards across the web</p>
        </div>
      )}

      {/* Job Cards */}
      <div>
        {jobs.map((job) => (
          <div key={job.job_id} style={{
            background: cardBg, borderRadius: '12px', padding: '18px',
            marginBottom: '12px', border: `1px solid ${cardBorder}`,
            transition: 'background 0.3s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: textPrimary }}>{job.job_title}</h3>
                <p style={{ margin: '0 0 4px 0', color: accent, fontSize: '13px' }}>{job.employer_name}</p>
                <p style={{ margin: 0, color: textMuted, fontSize: '12px' }}>
                  📍 {job.job_city || 'Remote'}, {job.job_country}
                  {job.salary && <span style={{ marginLeft: '10px', color: '#00f5d4' }}>💰 {job.salary}</span>}
                </p>
              </div>
              <span style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '11px',
                background: isDark ? 'rgba(0,180,216,0.1)' : 'rgba(0,150,200,0.1)',
                color: accent, border: `1px solid ${cardBorder}`, whiteSpace: 'nowrap',
              }}>
                {job.job_employment_type || 'Full-time'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <a href={job.job_apply_link} target="_blank" rel="noreferrer" style={{
                padding: '7px 16px',
                background: 'linear-gradient(135deg, #00b4d8, #00f5d4)',
                color: '#050d1a', borderRadius: '6px',
                textDecoration: 'none', fontSize: '12px', fontWeight: 'bold',
              }}>Apply Here ↗</a>

              <button onClick={() => toggleCoverLetter(job)} style={{
                padding: '7px 16px',
                background: selectedJob?.job_id === job.job_id
                  ? (isDark ? 'rgba(0,180,216,0.2)' : 'rgba(0,150,200,0.2)')
                  : (isDark ? 'rgba(0,180,216,0.08)' : 'rgba(0,150,200,0.08)'),
                color: accent, border: `1px solid ${cardBorder}`,
                borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
              }}>✍️ Cover Letter</button>

              <button onClick={() => toggleResume(job)} style={{
                padding: '7px 16px',
                background: selectedResumeJob?.job_id === job.job_id
                  ? (isDark ? 'rgba(0,245,212,0.15)' : 'rgba(0,119,182,0.15)')
                  : (isDark ? 'rgba(0,245,212,0.06)' : 'rgba(0,119,182,0.06)'),
                color: isDark ? '#00f5d4' : '#0077b6',
                border: `1px solid ${isDark ? 'rgba(0,245,212,0.2)' : 'rgba(0,119,182,0.2)'}`,
                borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
              }}>📄 Resume</button>

              <button onClick={() => handleApply(job)} style={{
                padding: '7px 16px', background: 'transparent',
                color: textMuted, border: `1px solid ${cardBorder}`,
                borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
              }}>📋 Mark Applied</button>
            </div>

            {/* Cover Letter inline */}
            {selectedJob?.job_id === job.job_id && (
              <div style={{ marginTop: '16px', borderTop: `1px solid ${cardBorder}`, paddingTop: '16px' }}>
                <CoverLetter jobTitle={job.job_title} companyName={job.employer_name} isDark={isDark} />
              </div>
            )}

            {/* Resume Generator inline */}
            {selectedResumeJob?.job_id === job.job_id && (
              <div style={{ marginTop: '16px', borderTop: `1px solid ${cardBorder}`, paddingTop: '16px' }}>
                <ResumeGenerator
                  jobTitle={job.job_title}
                  companyName={job.employer_name}
                  isDark={isDark}
                  onSave={onSaveResume}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default JobSearch;