import { useState, useEffect } from "react";
import axios from "axios";

const BASE = "https://job-apply-system-backend-7i1m.onrender.com";

function ResumeUpload({ isDark }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [existing, setExisting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [savedResumes, setSavedResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);

  const accent      = isDark ? '#00b4d8' : '#0077b6';
  const textMuted   = isDark ? '#4a7fa5' : '#4a7a9b';
  const textPrimary = isDark ? '#caf0f8' : '#0d2035';
  const cardBg      = isDark ? 'rgba(0,180,216,0.04)' : 'rgba(255,255,255,0.85)';
  const cardBorder  = isDark ? 'rgba(0,180,216,0.1)'  : 'rgba(0,150,200,0.2)';
  const uploadBg    = isDark ? '#0d1f35' : '#f0f8fc';
  const uploadBorder = isDark ? '#0e2a4a' : '#b0d4e8';

  // Load uploaded resume status + saved AI resumes on mount
  useEffect(() => {
    axios.get(`${BASE}/resume`).then((res) => {
      setExisting(res.data.exists);
      if (res.data.exists) setPreviewUrl(`${BASE}/resume/file`);
    }).catch(() => {});

    axios.get(`${BASE}/saved-resumes`).then((res) => {
      setSavedResumes(res.data);
    }).catch(() => {}).finally(() => setLoadingResumes(false));
  }, []);

  function handleFileChange(e) { setFile(e.target.files[0]); }

  async function handleUpload() {
    if (!file) return setMessage("Please select a file first.");
    const formData = new FormData();
    formData.append("resume", file);
    try {
      const response = await axios.post(`${BASE}/resume`, formData);
      setMessage(response.data.message);
      setExisting(true);
      setPreviewUrl(`${BASE}/resume/file`);
    } catch {
      setMessage("Upload failed. Is the backend running?");
    }
  }

  async function handleDeleteResume(id) {
    try {
      await axios.delete(`${BASE}/saved-resumes/${id}`);
      setSavedResumes(prev => prev.filter(r => r.id !== id));
    } catch {
      // silent fail
    }
  }

  function sanitizeForPDF(text) {
    return text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2014/g, '--')
      .replace(/\u2013/g, '-')
      .replace(/\u2022/g, '*')
      .replace(/\u2026/g, '...')
      .replace(/[^\x00-\x7F]/g, (c) => {
        const map = {
          'á':'a','à':'a','ä':'a','â':'a','ã':'a',
          'é':'e','è':'e','ë':'e','ê':'e',
          'í':'i','ì':'i','ï':'i','î':'i',
          'ó':'o','ò':'o','ö':'o','ô':'o',
          'ú':'u','ù':'u','ü':'u','û':'u',
          'ñ':'n','ç':'c',
          'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','Ñ':'N',
        };
        return map[c] || '';
      });
  }

  async function handleDownloadPDF(r) {
    setDownloading(r.id);
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      await loadGaramond(doc);

      const ml = 19, mr = 19;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const contentW = pageW - ml - mr;
      const BLACK  = [15, 15, 15];
      const GRAY   = [100, 100, 100];
      const ACCENT = [30, 80, 140];
      const LIGHT  = [180, 180, 180];
      let y = 16;

      const safePage = () => { if (y > pageH - 18) { doc.addPage(); y = 16; } };

      const lines = sanitizeForPDF(r.content).split('\n').map(l => l.trimEnd());
      const sections = {};
      let curSection = 'HEADER';
      sections[curSection] = [];
      const SECTION_KEYS = ['CONTACT','SUMMARY','SKILLS','EXPERIENCE','EDUCATION','PROJECTS','CERTIFICATIONS','AWARDS','LANGUAGES'];
      for (const line of lines) {
        const up = line.trim().toUpperCase();
        if (SECTION_KEYS.includes(up)) { curSection = up; sections[curSection] = []; }
        else sections[curSection].push(line);
      }

      const headerLines = [...(sections['HEADER'] || []), ...(sections['CONTACT'] || [])].filter(l => l.trim());
      const name = headerLines[0] || '';
      const contactStr = headerLines.slice(1).join('  |  ');

     doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(...ACCENT);
      doc.text(sanitizeForPDF(name), pageW / 2, y, { align: 'center' });
      y += 8;

      doc.setDrawColor(...ACCENT);
      doc.setLineWidth(0.6);
      doc.line(ml + 10, y, pageW - mr - 10, y);
      y += 4;

     doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      doc.splitTextToSize(sanitizeForPDF(contactStr), contentW).forEach(cl => {
        doc.text(cl, pageW / 2, y, { align: 'center' }); y += 5;
      });
      y += 3;

      function sectionHeader(title) {
        safePage();
        y += 3;
        doc.setFillColor(...ACCENT);
        doc.rect(ml, y - 4, 2.5, 5.5, 'F');
       doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...ACCENT);
        doc.text(title.toUpperCase(), ml + 5, y);
        y += 1.5;
        doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3);
        doc.line(ml, y, pageW - mr, y); y += 4;
      }

      function renderLines(rawLines) {
        for (const line of rawLines) {
          const t = line.trim();
          if (!t) { y += 1.5; continue; }
          const isBullet = t.startsWith('-') || t.startsWith('*') || t.startsWith('\u2022');
          const text = isBullet ? t.replace(/^[-*\u2022]\s*/, '') : t;
          const availW = contentW - (isBullet ? 5 : 0);
          const dateMatch = text.match(/^(.+?)\s{2,}(.{4,35})$/);
          if (dateMatch && /\d{4}/.test(dateMatch[2])) {
            safePage();
            const isRole = /intern|developer|engineer|analyst|manager|designer|associate|nurse|officer|assistant|coordinator/i.test(dateMatch[1]);
           doc.setFont('helvetica', isRole ? 'italic' : 'bold'); doc.setFontSize(9.5); doc.setTextColor(...BLACK);
            doc.text(sanitizeForPDF(dateMatch[1].trim()), ml, y);
           doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
            doc.text(sanitizeForPDF(dateMatch[2].trim()), pageW - mr, y, { align: 'right' });
            y += 5;
          } else if (isBullet) {
            safePage();
           doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...BLACK);
            doc.setFillColor(...ACCENT);
            doc.circle(ml + 1.5, y - 1.2, 0.9, 'F');
            const wrapped = doc.splitTextToSize(sanitizeForPDF(text), availW);
            wrapped.forEach((wl, i) => { safePage(); doc.text(wl, ml + 5, y); if (i < wrapped.length - 1) y += 5; });
            y += 5;
          } else {
            safePage();
           doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...BLACK);
            const wrapped = doc.splitTextToSize(sanitizeForPDF(text), availW);
            wrapped.forEach((wl, i) => { safePage(); doc.text(wl, ml, y); if (i < wrapped.length - 1) y += 5; });
            y += 5;
          }
        }
      }

      const ORDER = ['SUMMARY','EDUCATION','EXPERIENCE','SKILLS','CERTIFICATIONS','PROJECTS','AWARDS','LANGUAGES'];
      const rendered = new Set(['HEADER','CONTACT']);
      for (const sec of ORDER) {
        if (sections[sec]?.some(l => l.trim())) { sectionHeader(sec); renderLines(sections[sec]); rendered.add(sec); }
      }
      for (const [sec, secLines] of Object.entries(sections)) {
        if (!rendered.has(sec) && secLines.some(l => l.trim())) { sectionHeader(sec); renderLines(secLines); }
      }

      doc.save(`${sanitizeForPDF(r.jobTitle)} CV.pdf`);
    } catch (err) { console.error(err); }
    setDownloading(null);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function loadGaramond(doc) {
    const variants = [
      { query: 'EB+Garamond:regular', label: 'normal' },
      { query: 'EB+Garamond:700',     label: 'bold'   },
      { query: 'EB+Garamond:italic',  label: 'italic' },
    ];
    for (const v of variants) {
      try {
        const cssRes = await fetch(`https://fonts.googleapis.com/css?family=${v.query}`);
        const css = await cssRes.text();
        const match = css.match(/url\(([^)]+\.ttf)\)/);
        if (!match) continue;
        const ttfUrl = match[1].replace(/['"]/g, '');
        const fontRes = await fetch(ttfUrl);
        const buf = await fontRes.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let b64 = '';
        for (let i = 0; i < bytes.length; i += 1024) {
          b64 += String.fromCharCode(...bytes.subarray(i, i + 1024));
        }
        b64 = btoa(b64);
        const filename = `EBGaramond-${v.label}.ttf`;
        doc.addFileToVFS(filename, b64);
        doc.addFont(filename, 'EBGaramond', v.label);
      } catch(e) { console.warn('Font load failed for', v.label, e); }
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: accent }}>📄 Resume</h2>
        <p style={{ margin: 0, color: textMuted, fontSize: '13px' }}>Upload your base resume and view all AI-generated resumes here.</p>
      </div>

      {/* Upload Section */}
      <div style={{
        background: uploadBg, border: `2px dashed ${uploadBorder}`,
        borderRadius: '12px', padding: '24px', textAlign: 'center', marginBottom: '28px',
      }}>
        {existing && <p style={{ color: '#34d399', marginBottom: '12px', fontSize: '13px' }}>✅ Resume already uploaded</p>}
        <p style={{ color: textMuted, marginBottom: '14px', fontSize: '13px' }}>Upload your resume in PDF format</p>
        <input type="file" accept=".pdf" onChange={handleFileChange}
          style={{ color: textPrimary, marginBottom: '14px', fontSize: '13px' }} />
        <br />
        <button
          onClick={handleUpload}
          style={{
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #00b4d8, #00f5d4)',
            color: '#050d1a', border: 'none', borderRadius: '8px',
            cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
          }}
        >
          Upload Resume
        </button>
        {message && <p style={{ marginTop: '10px', color: '#34d399', fontSize: '13px' }}>{message}</p>}
      </div>

      {previewUrl && (
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '13px', color: accent }}>📎 Uploaded Resume Preview</h3>
          <iframe src={previewUrl} width="100%" height="400px"
            style={{ borderRadius: '8px', border: `1px solid ${cardBorder}` }}
            title="Resume Preview" />
        </div>
      )}

      {/* Saved AI Resumes */}
      <div>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '1rem', color: accent }}>
          🤖 AI-Generated Resumes{' '}
          {savedResumes.length > 0 && (
            <span style={{ color: textMuted, fontWeight: 'normal', fontSize: '12px' }}>
              ({savedResumes.length} saved)
            </span>
          )}
        </h3>

        {loadingResumes ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: textMuted, fontSize: '13px' }}>
            Loading...
          </div>
        ) : savedResumes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: textMuted, fontSize: '13px' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📭</div>
            No AI resumes yet — generate one from the Jobs tab
          </div>
        ) : (
          savedResumes.map((r) => (
            <div key={r.id} style={{
              background: cardBg, border: `1px solid ${cardBorder}`,
              borderRadius: '12px', marginBottom: '10px', overflow: 'hidden',
              transition: 'background 0.3s',
            }}>
              <div
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 18px', cursor: 'pointer',
                }}
              >
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: '14px', color: textPrimary }}>{r.jobTitle}</span>
                  <span style={{ color: accent, fontSize: '12px', marginLeft: '10px' }}>{r.companyName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: textMuted, fontSize: '11px' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span style={{ color: textMuted, fontSize: '12px' }}>{expandedId === r.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedId === r.id && (
                <div style={{ borderTop: `1px solid ${cardBorder}`, padding: '16px 18px' }}>
                  <div style={{
                    whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.7,
                    color: textPrimary, maxHeight: '360px', overflowY: 'auto',
                    marginBottom: '14px',
                  }}>
                    {r.content}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDownloadPDF(r)}
                      disabled={downloading === r.id}
                      style={{
                        padding: '7px 16px',
                        background: isDark ? 'rgba(0,180,216,0.08)' : 'rgba(0,150,200,0.1)',
                        color: accent, border: `1px solid ${cardBorder}`,
                        borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
                        opacity: downloading === r.id ? 0.6 : 1,
                      }}
                    >
                      {downloading === r.id ? 'Preparing...' : '⬇️ Download PDF'}
                    </button>
                    <button
                      onClick={() => handleDeleteResume(r.id)}
                      style={{
                        padding: '7px 16px',
                        background: 'rgba(239,68,68,0.08)',
                        color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ResumeUpload;