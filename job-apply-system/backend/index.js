const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, supabase } = require('./middleware/auth');

// Create uploads folder if it doesn't exist
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `resume_${req.user?.id || 'tmp'}` + path.extname(file.originalname))
});

const upload = multer({ storage });
const app = express();
app.use(cors());
app.use(express.json());

const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.get('/', (req, res) => {
  res.json({ message: 'Just Apply Smart API is running' });
});

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return res.status(400).json({ message: error.message });
  res.json({ message: 'Registered successfully!', session: data.session, user: data.user });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ message: error.message });
  res.json({ session: data.session, user: data.user });
});

app.post('/auth/logout', requireAuth, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  await supabase.auth.admin.signOut(token);
  res.json({ message: 'Logged out successfully' });
});

// ─── Profile ────────────────────────────────────────────────────────────────

app.post('/profile', requireAuth, async (req, res) => {
  const {
    slot = 1,
    fullName, email, phone, location,
    linkedin, portfolio, skills, languages,
    certifications, summary, experience,
    education, projects, awards
  } = req.body;

  const userId = req.user.id;

  await pool.query(`
    INSERT INTO profile (
      user_id, slot, "fullName", email, phone, location,
      linkedin, portfolio, skills, languages,
      certifications, summary, experience,
      education, projects, awards
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
    ON CONFLICT (user_id, slot) DO UPDATE SET
      "fullName"=$3, email=$4, phone=$5, location=$6,
      linkedin=$7, portfolio=$8, skills=$9, languages=$10,
      certifications=$11, summary=$12, experience=$13,
      education=$14, projects=$15, awards=$16
  `, [
    userId, slot, fullName, email, phone, location,
    linkedin, portfolio, skills, languages,
    certifications, summary, experience,
    education, projects, awards
  ]);

  res.json({ message: 'Profile saved!' });
});

app.get('/profile', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM profile WHERE user_id = $1 ORDER BY slot ASC`,
    [req.user.id]
  );
  const slots = {};
  rows.forEach(row => { slots[row.slot] = row; });
  res.json(slots);
});

// ─── Resume Upload ───────────────────────────────────────────────────────────

app.post('/resume', requireAuth, (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err) return res.status(400).json({ message: 'Upload failed' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    res.json({ message: 'Resume uploaded!', filename: req.file.filename });
  });
});

app.get('/resume/file', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', `resume_${req.user.id}.pdf`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ message: 'No resume found' });
  }
});

app.get('/resume', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', `resume_${req.user.id}.pdf`);
  res.json({ exists: fs.existsSync(filePath) });
});

// ─── Saved Resumes ───────────────────────────────────────────────────────────

app.post('/saved-resumes', requireAuth, async (req, res) => {
  const { jobTitle, companyName, content } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO saved_resumes (user_id, "jobTitle", "companyName", content)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [req.user.id, jobTitle, companyName, content]
  );
  res.json(rows[0]);
});

app.get('/saved-resumes', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM saved_resumes WHERE user_id = $1 ORDER BY "createdAt" DESC`,
    [req.user.id]
  );
  res.json(rows);
});

app.delete('/saved-resumes/:id', requireAuth, async (req, res) => {
  await pool.query(
    `DELETE FROM saved_resumes WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Deleted' });
});

// ─── Jobs ────────────────────────────────────────────────────────────────────

app.get('/jobs', requireAuth, async (req, res) => {
  const { title, location } = req.query;
  try {
    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(title + ' in ' + location)}&num_pages=1`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      }
    );
    const data = await response.json();
    res.json(data.data || []);
  } catch {
    res.status(500).json({ message: 'Job search failed' });
  }
});

// ─── Cover Letter ────────────────────────────────────────────────────────────

app.post('/cover-letter', requireAuth, async (req, res) => {
  const { jobTitle, companyName } = req.body;
  const { rows } = await pool.query(
    `SELECT * FROM profile WHERE user_id = $1 LIMIT 1`,
    [req.user.id]
  );
  const profile = rows[0];
  if (!profile) return res.status(400).json({ message: 'No profile found. Please save your profile first.' });

  const prompt = `
You are an expert career coach writing a cover letter for a real job application. Write in a natural, confident, human tone — not stiff or overly formal.

CANDIDATE:
- Name: ${profile.fullName}
- Skills: ${profile.skills}
- Experience: ${profile.experience}
- Education: ${profile.education}
- Certifications: ${profile.certifications || 'N/A'}
- Projects: ${profile.projects || 'N/A'}

APPLYING FOR: ${jobTitle} at ${companyName}

STEP 1 — CLASSIFY THE ROLE DISTANCE:
Before writing, silently decide which category applies:
- SAME FIELD: Candidate background directly matches the role
- ADJACENT: Some overlap (e.g. IT person applying for IT support at a hospital)
- UNRELATED: Different field but office/professional skills transfer (e.g. IT applying for front desk, admin, nurse)
- HIGHLY UNRELATED: No professional overlap at all (e.g. IT applying for line cook, barista, driver, construction, warehouse)

STEP 2 — WRITE ACCORDINGLY:
- SAME FIELD: Highlight technical depth and specific achievements. Use relevant technical language.
- ADJACENT: Blend technical competence with transferable soft skills.
- UNRELATED: Focus on transferable professional qualities — work ethic, communication, organization, reliability. Anchor every claim to a real specific experience. Do NOT mention unrelated technical skills or certifications.
- HIGHLY UNRELATED: Do NOT reframe tech experience as physical/trade experience. Lead with CHARACTER and POTENTIAL: work ethic, fast learning, reliability, handling pressure, positive attitude. Tone should be humble, eager, and genuine.

RULES FOR ALL CASES:
- Open with a strong specific first sentence — never "I am writing to apply for..."
- Reference the company name and role naturally
- No vague filler like "I am a team player" without backing it up
- No fabrication — only use what is in the profile
- Close with a confident forward-looking statement
- Under 300 words
- Clean paragraphs only — no markdown, no bullet points, no headers
- No meta-commentary or explanations outside the letter itself
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });
    res.json({ letter: completion.choices[0].message.content });
  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ message: 'Cover letter generation failed' });
  }
});

// ─── Resume Generator ────────────────────────────────────────────────────────

app.post('/generate-resume', requireAuth, async (req, res) => {
  const { jobTitle, companyName } = req.body;
  const { rows } = await pool.query(
    `SELECT * FROM profile WHERE user_id = $1 LIMIT 1`,
    [req.user.id]
  );
  const profile = rows[0];
  if (!profile) return res.status(400).json({ error: 'No profile found. Please save your profile first.' });

  const prompt = `
You are an expert resume writer and career coach. Tailor a resume for "${jobTitle}" at "${companyName}" using ONLY the real information provided. No fabrication. No invented details.

CANDIDATE PROFILE:
- Name: ${profile.fullName}
- Email: ${profile.email}
- Phone: ${profile.phone}
- Location: ${profile.location}
- LinkedIn: ${profile.linkedin || 'N/A'}
- Portfolio/GitHub: ${profile.portfolio || 'N/A'}
- Summary: ${profile.summary || 'N/A'}
- Skills: ${profile.skills}
- Languages: ${profile.languages || 'N/A'}
- Certifications: ${profile.certifications || 'N/A'}
- Experience: ${profile.experience}
- Education: ${profile.education}
- Projects: ${profile.projects || 'N/A'}
- Awards: ${profile.awards || 'N/A'}

STEP 1 — CLASSIFY THE ROLE DISTANCE
SAME FIELD — Background directly matches the role
ADJACENT — Partial overlap
UNRELATED — Different field but professional skills transfer
HIGHLY UNRELATED — No meaningful professional overlap (cook, barista, driver, warehouse, etc.)

STEP 2 — APPLY THE CORRECT STRATEGY

IF SAME FIELD:
- Keep all technical skills, certifications, and projects
- Use industry-specific terminology
- Experience bullets highlight technical achievements

IF ADJACENT:
- Keep only skills and certifications relevant to the overlap
- Blend technical competence with soft skills in bullets
- Include projects only if genuinely relevant

IF UNRELATED:
- SKILLS: Only transferable professional skills. No technical skills.
- CERTIFICATIONS: Remove all technical certifications.
- PROJECTS: Remove entirely.
- EXPERIENCE: Reframe bullets around transferable skills anchored to real specific actions.
- SUMMARY: Honest human case. No mention of IT or technical background.

IF HIGHLY UNRELATED:
- SKILLS: Universal human qualities only relevant to this role.
- CERTIFICATIONS: Remove all.
- PROJECTS: Remove entirely.
- EXPERIENCE: Keep title/company/dates. 2-3 bullets max — universal traits only: reliability, teamwork, adapting quickly, taking initiative. Simple direct language.
- EDUCATION: Always keep.
- SUMMARY: Humble, eager, genuine. No IT mention. Reference company and role.
- Keep resume SHORT.

REFRAMING RULES (not for HIGHLY UNRELATED):
- Keep specific project names and achievements as anchors
- Reframe the angle — same truth, different lens
- Never write: "demonstrating teamwork", "showcasing leadership", "highlighting communication skills"
- Every bullet = real action + real outcome

ABSOLUTE RULES:
- No fabrication
- No meta-commentary or "Note:" paragraphs
- No markdown
- Output resume only

STRICT FORMAT:
- Section headers: plain ALL CAPS, blank line before and after
- Bullets: plain hyphen (-)
- Job entries: Job Title  Company Name  Date Range (two spaces between)
- Order: CONTACT, SUMMARY, SKILLS, EXPERIENCE, EDUCATION — then CERTIFICATIONS/PROJECTS only if warranted
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
    });
    res.json({ resume: completion.choices[0].message.content });
  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ message: 'Resume generation failed' });
  }
});

// ─── Applications ─────────────────────────────────────────────────────────────

app.post('/applications', requireAuth, async (req, res) => {
  const { jobTitle, companyName, jobLink } = req.body;
  await pool.query(
    `INSERT INTO applications (user_id, "jobTitle", "companyName", "jobLink") VALUES ($1,$2,$3,$4)`,
    [req.user.id, jobTitle, companyName, jobLink]
  );
  res.json({ message: 'Application saved!' });
});

app.get('/applications', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM applications WHERE user_id = $1 ORDER BY "appliedAt" DESC`,
    [req.user.id]
  );
  res.json(rows);
});

app.patch('/applications/:id', requireAuth, async (req, res) => {
  const { status } = req.body;
  await pool.query(
    `UPDATE applications SET status = $1 WHERE id = $2 AND user_id = $3`,
    [status, req.params.id, req.user.id]
  );
  res.json({ message: 'Status updated!' });
});

app.delete('/applications/:id', requireAuth, async (req, res) => {
  await pool.query(
    `DELETE FROM applications WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Application deleted!' });
});


// CaviteJobs scraper
app.get('/cavitejobs', requireAuth, async (req, res) => {
  const { keyword } = req.query;
  try {
    const response = await fetch(
      `https://www.cavitejobs.net/?view=recommendedjobs&format=nothtml&ajax=linefeed&feed_num=1&keyword=${encodeURIComponent(keyword)}&joblocation=&jobsite=www.cavitejobs.net&title=&company=&salary=&posted=&empId=&contactemail=&referral=`
    );
    const html = await response.text();
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    const jobs = [];

    $('tr[job_id]').each((i, el) => {
      const jobId = $(el).attr('job_id');
      const title = $(el).find('a').first().text().trim();
      const company = $(el).find('td').eq(1).text().trim();
      const location = $(el).find('td').eq(2).text().trim();
      const posted = $(el).find('td').eq(3).text().trim().split('\n')[0].trim();
      const salary = $(el).find('.hasTooltip').first().text().trim();

      if (title) {
        jobs.push({
          job_id: `cavite_${jobId}`,
          job_title: title,
          employer_name: company,
          job_city: location,
          job_country: 'PH',
          job_employment_type: 'Full-time',
          job_apply_link: `https://www.cavitejobs.net/job-opening/?jobid=${jobId}`,
          salary: salary || null,
          posted: posted,
          source: 'cavitejobs.net'
        });
      }
    });

    res.json(jobs);
  } catch (err) {
    console.error('CaviteJobs error:', err.message);
    res.status(500).json({ message: 'CaviteJobs scraping failed' });
  }
});

// ─── Server ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Just Apply Smart running on port ${PORT}`);
});