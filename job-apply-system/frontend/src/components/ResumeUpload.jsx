import { useState } from "react";
import axios from "axios";

function ResumeGenerator({ jobTitle, companyName, isDark, onSave }) {
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);

  const accent      = isDark ? '#00b4d8' : '#0077b6';
  const textMuted   = isDark ? '#4a7fa5' : '#4a7a9b';
  const textPrimary = isDark ? '#caf0f8' : '#0d2035';
  const boxBg       = isDark ? 'rgba(0,180,216,0.04)' : 'rgba(255,255,255,0.9)';
  const boxBorder   = isDark ? 'rgba(0,180,216,0.15)' : 'rgba(0,150,200,0.2)';

  async function handleGenerate() {
    setLoading(true);
    setMessage("");
    try {
      const response = await axios.post("https://job-apply-system-backend-7i1m.onrender.com/generate-resume", { jobTitle, companyName });
      setResume(response.data.resume);
    } catch {
      setMessage("Failed to generate resume.");
    }
    setLoading(false);
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
        const map = { 'á':'a','à':'a','ä':'a','é':'e','è':'e',
                      'á':'a','à':'a','ä':'a','â':'a','ã':'a',
                      'é':'e','è':'e','ë':'e','ê':'e',
                      'í':'i','ì':'i','ï':'i','î':'i',
                      'ó':'o','ò':'o','ö':'o','ô':'o',
                      'ú':'u','ù':'u','ü':'u','û':'u',
                      'ñ':'n','ç':'c',
                      'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','Ñ':'N' };
        return map[c] || '';
      });
  }

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      await loadGaramond(doc);

      const ml = 19;   // left margin
      const mr = 19;   // right margin
      const pageW = doc.internal.pageSize.getWidth();   // 210
      const pageH = doc.internal.pageSize.getHeight();  // 297
      const contentW = pageW - ml - mr;
      const BLACK  = [15, 15, 15];
      const GRAY   = [100, 100, 100];
      const ACCENT = [30, 80, 140];    // deep navy blue for headers & name
      const LIGHT  = [180, 180, 180];  // light rule line
      let y = 16;

      const safePage = () => { if (y > pageH - 18) { doc.addPage(); y = 16; } };

      // ── Parse AI resume text into structured sections ──
      const lines = sanitizeForPDF(resume).split('\n').map(l => l.trimEnd());
      const sections = {};
      let curSection = 'HEADER';
      sections[curSection] = [];
      const SECTION_KEYS = ['CONTACT','SUMMARY','SKILLS','EXPERIENCE','EDUCATION','PROJECTS','CERTIFICATIONS','AWARDS','LANGUAGES'];
      for (const line of lines) {
        const up = line.trim().toUpperCase();
        if (SECTION_KEYS.includes(up)) { curSection = up; sections[curSection] = []; }
        else sections[curSection].push(line);
      }

      // ── Extract name & contact ──
      const headerLines = [...(sections['HEADER'] || []), ...(sections['CONTACT'] || [])].filter(l => l.trim());
      const name = headerLines[0] || '';
      const contactLines = headerLines.slice(1);

      // ── NAME ──
      doc.setFont('EBGaramond', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(...ACCENT);
      doc.text(sanitizeForPDF(name), pageW / 2, y, { align: 'center' });
      y += 8;

      // ── Thin accent rule under name ──
      doc.setDrawColor(...ACCENT);
      doc.setLineWidth(0.6);
      doc.line(ml + 10, y, pageW - mr - 10, y);
      y += 4;

      // ── CONTACT LINE ──
      const contactStr = contactLines.join('  |  ');
      doc.setFont('EBGaramond', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      const contactWrapped = doc.splitTextToSize(sanitizeForPDF(contactStr), contentW);
      contactWrapped.forEach(cl => { doc.text(cl, pageW / 2, y, { align: 'center' }); y += 5; });
      y += 3;

      // ── Section header: left accent bar + bold label + light full rule ──
      function sectionHeader(title) {
        safePage();
        y += 3;
        // Accent left bar
        doc.setFillColor(...ACCENT);
        doc.rect(ml, y - 4, 2.5, 5.5, 'F');
        // Title text
        doc.setFont('EBGaramond', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...ACCENT);
        doc.text(title.toUpperCase(), ml + 5, y);
        y += 1.5;
        // Light full-width rule
        doc.setDrawColor(...LIGHT);
        doc.setLineWidth(0.3);
        doc.line(ml, y, pageW - mr, y);
        y += 4;
      }

      // ── Render section body lines ──
      function renderLines(rawLines) {
        for (const line of rawLines) {
          const t = line.trim();
          if (!t) { y += 1.5; continue; }

          const isBullet = t.startsWith('-') || t.startsWith('*') || t.startsWith('•');
          const text = isBullet ? t.replace(/^[-*•]\s*/, '') : t;
          const bulletIndent = ml + 5;
          const availW = isBullet ? contentW - 5 : contentW;

          const dateMatch = text.match(/^(.+?)\s{2,}(.{4,35})$/);

          if (dateMatch && /\d{4}/.test(dateMatch[2])) {
            safePage();
            const leftText = dateMatch[1].trim();
            const rightText = dateMatch[2].trim();
            const isRole = /intern|developer|engineer|analyst|manager|designer|associate|nurse|officer|assistant|coordinator/i.test(leftText);
            // Left: bold company or italic role
            doc.setFont('EBGaramond', isRole ? 'italic' : 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(...BLACK);
            doc.text(sanitizeForPDF(leftText), ml, y);
            // Right: date in gray
            doc.setFont('EBGaramond', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...GRAY);
            doc.text(sanitizeForPDF(rightText), pageW - mr, y, { align: 'right' });
            y += 5;
          } else if (isBullet) {
            safePage();
            doc.setFont('EBGaramond', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(...BLACK);
            // Small filled circle bullet
            doc.setFillColor(...ACCENT);
            doc.circle(ml + 1.5, y - 1.2, 0.9, 'F');
            const wrapped = doc.splitTextToSize(sanitizeForPDF(text), availW);
            wrapped.forEach((wl, i) => {
              safePage();
              doc.text(wl, bulletIndent, y);
              if (i < wrapped.length - 1) y += 5;
            });
            y += 5;
          } else {
            safePage();
            doc.setFont('EBGaramond', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(...BLACK);
            const wrapped = doc.splitTextToSize(sanitizeForPDF(text), availW);
            wrapped.forEach((wl, i) => {
              safePage();
              doc.text(wl, ml, y);
              if (i < wrapped.length - 1) y += 5;
            });
            y += 5;
          }
        }
      }

      // ── Render each section in order ──
      const ORDER = ['SUMMARY','EDUCATION','WORK EXPERIENCE','EXPERIENCE','SKILLS','CERTIFICATIONS','PROJECTS','AWARDS','LANGUAGES'];
      const rendered = new Set(['HEADER','CONTACT']);

      for (const sec of ORDER) {
        if (sections[sec] && sections[sec].some(l => l.trim())) {
          sectionHeader(sec === 'WORK EXPERIENCE' ? 'WORK EXPERIENCE' : sec);
          renderLines(sections[sec]);
          rendered.add(sec);
        }
      }

      // Any leftover sections
      for (const [sec, secLines] of Object.entries(sections)) {
        if (!rendered.has(sec) && secLines.some(l => l.trim())) {
          sectionHeader(sec);
          renderLines(secLines);
        }
      }

      doc.save(`${sanitizeForPDF(jobTitle)} CV.pdf`);
    } catch (err) {
      console.error(err);
      setMessage("Failed to export PDF.");
    }
    setDownloading(false);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function loadGaramond(doc) {
    // Use Google Fonts CSS v1 API — returns TTF urls which jsPDF can embed
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
        if (!match) { console.warn('No TTF URL found for', v.label, css); continue; }
        const ttfUrl = match[1].replace(/['"]/g, '');
        const fontRes = await fetch(ttfUrl);
        const buf = await fontRes.arrayBuffer();
        // Convert to base64 in chunks to avoid call stack overflow on large fonts
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
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <button
          onClick={handleGenerate}
          style={{
            padding: '8px 20px',
            background: isDark ? 'rgba(0,245,212,0.1)' : 'rgba(0,119,182,0.1)',
            color: isDark ? '#00f5d4' : '#0077b6',
            border: `1px solid ${isDark ? 'rgba(0,245,212,0.3)' : 'rgba(0,119,182,0.3)'}`,
            borderRadius: '8px', cursor: 'pointer',
            fontWeight: 'bold', fontSize: '13px',
            transition: 'all 0.2s',
          }}
        >
          {loading ? "Generating..." : "📄 Generate Resume"}
        </button>

        {resume && !saved && (
          <button
            onClick={() => { onSave(jobTitle, companyName, resume); setSaved(true); }}
            style={{
              padding: '8px 20px',
              background: 'rgba(16,185,129,0.1)',
              color: '#10b981',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: '8px', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '13px',
            }}
          >
            💾 Save to Resume Tab
          </button>
        )}
        {saved && (
          <span style={{ fontSize: '13px', color: '#10b981', padding: '8px 4px' }}>✅ Saved to Resume tab</span>
        )}
        {resume && (
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            style={{
              padding: '8px 20px',
              background: isDark ? 'rgba(0,180,216,0.08)' : 'rgba(0,150,200,0.1)',
              color: accent,
              border: `1px solid ${boxBorder}`,
              borderRadius: '8px', cursor: downloading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold', fontSize: '13px',
              opacity: downloading ? 0.6 : 1, transition: 'all 0.2s',
            }}
          >
            {downloading ? "Preparing..." : "⬇️ Download PDF"}
          </button>
        )}
      </div>

      {message && <p style={{ color: textMuted, fontSize: '13px', margin: '0 0 8px 0' }}>{message}</p>}

      {resume && (
        <div style={{
          background: boxBg, border: `1px solid ${boxBorder}`,
          borderRadius: '10px', padding: '16px', marginTop: '4px',
          whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.7,
          color: textPrimary, maxHeight: '320px', overflowY: 'auto',
          transition: 'background 0.3s, color 0.3s',
        }}>
          {resume}
        </div>
      )}
    </div>
  );
}

export default ResumeGenerator;