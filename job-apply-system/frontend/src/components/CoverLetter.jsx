import { useState } from "react";
import axios from "axios";

function CoverLetter({ jobTitle, companyName, isDark }) {
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(false);

  const accent      = isDark ? '#00b4d8' : '#0077b6';
  const textMuted   = isDark ? '#4a7fa5' : '#4a7a9b';
  const textPrimary = isDark ? '#caf0f8' : '#0d2035';
  const boxBg       = isDark ? 'rgba(0,180,216,0.04)' : 'rgba(255,255,255,0.9)';
  const boxBorder   = isDark ? 'rgba(0,180,216,0.15)' : 'rgba(0,150,200,0.2)';
  const editBg      = isDark ? 'rgba(0,180,216,0.07)' : 'rgba(240,248,255,0.95)';

  async function handleGenerate() {
    if (!jobTitle || !companyName) return setMessage("No job selected.");
    setLoading(true);
    setMessage("");
    setEditing(false);
    try {
      const response = await axios.post("https://job-apply-system-backend-7i1m.onrender.com/cover-letter", { jobTitle, companyName });
      setLetter(response.data.letter);
    } catch {
      setMessage("Failed to generate cover letter.");
    }
    setLoading(false);
  }

  function sanitizeText(text) {
    return text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\u2014/g, '--')
      .replace(/\u2013/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/[^\x00-\x7F]/g, (c) => {
        const map = {
          'á':'a','à':'a','ä':'a','â':'a','ã':'a',
          'é':'e','è':'e','ë':'e','ê':'e',
          'í':'i','ì':'i','ï':'i','î':'i',
          'ó':'o','ò':'o','ö':'o','ô':'o',
          'ú':'u','ù':'u','ü':'u','û':'u',
          'ñ':'n','ç':'c',
          'Á':'A','É':'E','Í':'I','Ó':'O','Ú':'U','Ñ':'N'
        };
        return map[c] || '';
      });
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

  async function handleDownloadPDF() {
    setDownloading(true);
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      await loadGaramond(doc);

      const ml = 19;
      const mr = 19;
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const contentW = pageW - ml - mr;
      const BLACK  = [15, 15, 15];
      const GRAY   = [100, 100, 100];
      const ACCENT = [30, 80, 140];
      const LIGHT  = [180, 180, 180];
      let y = 16;

      const safePage = () => { if (y > pageH - 18) { doc.addPage(); y = 16; } };

      // ── Candidate name: pull from letter first line if it starts with a name,
      //    otherwise leave blank — the letter body will carry the identity
      // ── Header: Job Title centered as the document title ──
     doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(...ACCENT);
      doc.text(sanitizeText(jobTitle), pageW / 2, y, { align: 'center' });
      y += 7;

      // Subtitle: company name
     doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(...GRAY);
      doc.text(`Cover Letter  —  ${sanitizeText(companyName)}`, pageW / 2, y, { align: 'center' });
      y += 6;

      // Accent rule under header (matching resume style)
      doc.setDrawColor(...ACCENT);
      doc.setLineWidth(0.6);
      doc.line(ml + 10, y, pageW - mr - 10, y);
      y += 10;

      // ── Section label ──
      // Left accent bar
      doc.setFillColor(...ACCENT);
      doc.rect(ml, y - 4, 2.5, 5.5, 'F');
     doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...ACCENT);
      doc.text('COVER LETTER', ml + 5, y);
      y += 1.5;
      // Light rule
      doc.setDrawColor(...LIGHT);
      doc.setLineWidth(0.3);
      doc.line(ml, y, pageW - mr, y);
      y += 7;

      // ── Body paragraphs ──
     doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      doc.setTextColor(...BLACK);

      const paragraphs = sanitizeText(letter).split('\n');
      for (const para of paragraphs) {
        const t = para.trim();
        if (!t) { y += 4; continue; }
        const wrapped = doc.splitTextToSize(t, contentW);
        for (const line of wrapped) {
          safePage();
          doc.text(line, ml, y);
          y += 6;
        }
        y += 2; // extra spacing between paragraphs
      }

      doc.save(`${sanitizeText(jobTitle)} Cover Letter.pdf`);
    } catch (err) {
      console.error(err);
      setMessage("Failed to generate PDF.");
    }
    setDownloading(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <button
          onClick={handleGenerate}
          style={{
            padding: '8px 20px',
            background: 'linear-gradient(135deg, #00b4d8, #00f5d4)',
            color: '#050d1a',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            boxShadow: '0 0 16px rgba(0,180,216,0.3)',
          }}
        >
          {loading ? "Generating..." : "✍️ Generate Cover Letter"}
        </button>

        {letter && (
          <button
            onClick={() => setEditing(e => !e)}
            style={{
              padding: '8px 20px',
              background: editing
                ? (isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.1)')
                : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
              color: editing ? '#f59e0b' : textMuted,
              border: `1px solid ${editing ? 'rgba(251,191,36,0.4)' : boxBorder}`,
              borderRadius: '8px', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '13px',
              transition: 'all 0.2s',
            }}
          >
            {editing ? "👁 View" : "✏️ Edit"}
          </button>
        )}

        {letter && (
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            style={{
              padding: '8px 20px',
              background: isDark ? 'rgba(0,180,216,0.08)' : 'rgba(0,150,200,0.1)',
              color: accent,
              border: `1px solid ${boxBorder}`,
              borderRadius: '8px',
              cursor: downloading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              opacity: downloading ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {downloading ? "Preparing..." : "⬇️ Download PDF"}
          </button>
        )}
      </div>

      {message && <p style={{ color: textMuted, fontSize: '13px', margin: '0 0 8px 0' }}>{message}</p>}

      {letter && (
        editing ? (
          <div style={{ position: 'relative' }}>
            <textarea
              value={letter}
              onChange={e => setLetter(e.target.value)}
              style={{
                width: '100%',
                minHeight: '380px',
                background: editBg,
                border: `1.5px solid ${isDark ? 'rgba(251,191,36,0.35)' : 'rgba(251,191,36,0.5)'}`,
                borderRadius: '10px',
                padding: '16px',
                fontSize: '13px',
                lineHeight: 1.7,
                color: textPrimary,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'background 0.3s, color 0.3s',
              }}
            />
            <span style={{
              position: 'absolute', bottom: '10px', right: '14px',
              fontSize: '11px', color: textMuted, pointerEvents: 'none',
            }}>
              editing — changes apply to PDF download
            </span>
          </div>
        ) : (
          <div style={{
            background: boxBg,
            border: `1px solid ${boxBorder}`,
            borderRadius: '10px',
            padding: '16px',
            marginTop: '4px',
            whiteSpace: 'pre-wrap',
            fontSize: '13px',
            lineHeight: 1.7,
            color: textPrimary,
            maxHeight: '320px',
            overflowY: 'auto',
            transition: 'background 0.3s, color 0.3s',
          }}>
            {letter}
          </div>
        )
      )}
    </div>
  );
}

export default CoverLetter;