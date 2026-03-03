const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { pool } = require('../config/database');
const pdf  = require('../services/pdfService');
const nodemailer = require('nodemailer');
const { emailConvocationCeremonie, emailFeuCamp, emailClassement, emailAnnonce } = require('../services/notificationService');

// ── PDFs ──────────────────────────────────────────────────────────────────
const sendPDF = (res, buffer, filename) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

// Fiche soldat
router.get('/fiche-soldat/:id', protect, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT s.*, 
        json_agg(DISTINCT d.*) FILTER (WHERE d.id IS NOT NULL) as distinctions,
        json_agg(DISTINCT san.*) FILTER (WHERE san.id IS NOT NULL) as sanctions
      FROM soldiers s
      LEFT JOIN distinctions d ON d.soldier_id = s.id
      LEFT JOIN sanctions san ON san.soldier_id = s.id
      WHERE s.id = $1 GROUP BY s.id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ success:false, error:'Soldat introuvable' });
    const buf = await pdf.ficheSoldat(r.rows[0]);
    sendPDF(res, buf, `fiche-${r.rows[0].matricule}.pdf`);
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

// Attestation présence
router.get('/attestation/:id', protect, async (req, res) => {
  try {
    const s = (await pool.query('SELECT * FROM soldiers WHERE id=$1', [req.params.id])).rows[0];
    if (!s) return res.status(404).json({ success:false, error:'Soldat introuvable' });
    const stats = (await pool.query(`
      SELECT COUNT(*) as total_seances,
        SUM(CASE WHEN statut='present' THEN 1 ELSE 0 END) as presents,
        ROUND(AVG(CASE WHEN statut='present' THEN 100 ELSE 0 END)) as taux
      FROM presences WHERE soldier_id=$1`, [req.params.id])).rows[0];
    const buf = await pdf.attestationPresence(s, { total_seances:stats.presents, seances_totales:stats.total_seances, taux:stats.taux||0 });
    sendPDF(res, buf, `attestation-${s.matricule}.pdf`);
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

// Rapport signalement
router.get('/signalement/:id', protect, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT sg.*,
        s.prenom as soldier_prenom, s.nom as soldier_nom, s.matricule as soldier_matricule,
        c.prenom as cric_prenom, c.nom as cric_nom,
        json_agg(DISTINCT san.*) FILTER (WHERE san.id IS NOT NULL) as sanctions
      FROM signalements sg
      LEFT JOIN soldiers s ON s.id = sg.soldier_id
      LEFT JOIN crics c ON c.id = sg.cric_id
      LEFT JOIN sanctions san ON san.signalement_id = sg.id
      WHERE sg.id=$1 GROUP BY sg.id,s.prenom,s.nom,s.matricule,c.prenom,c.nom`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ success:false, error:'Introuvable' });
    const buf = await pdf.rapportSignalement(r.rows[0]);
    sendPDF(res, buf, `signalement-${req.params.id}.pdf`);
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

// Certificat distinction
router.get('/distinction/:id', protect, async (req, res) => {
  try {
    const d = (await pool.query('SELECT d.*, u.username as approuve_par_nom FROM distinctions d LEFT JOIN users u ON u.id=d.approuve_par WHERE d.id=$1', [req.params.id])).rows[0];
    if (!d) return res.status(404).json({ success:false, error:'Introuvable' });
    const s = (await pool.query('SELECT * FROM soldiers WHERE id=$1', [d.soldier_id])).rows[0];
    const buf = await pdf.certificatDistinction(s, d);
    sendPDF(res, buf, `distinction-${req.params.id}.pdf`);
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

// Feuille pointage cérémonie
router.get('/pointage-ceremonie/:id', protect, async (req, res) => {
  try {
    const c = (await pool.query('SELECT * FROM ceremonies WHERE id=$1', [req.params.id])).rows[0];
    if (!c) return res.status(404).json({ success:false, error:'Introuvable' });
    const pres = (await pool.query(`
      SELECT cp.*, s.prenom, s.nom, s.matricule, s.grade
      FROM ceremonie_presences cp JOIN soldiers s ON s.id=cp.soldier_id
      WHERE cp.ceremonie_id=$1 ORDER BY s.nom`, [req.params.id])).rows;
    const buf = await pdf.feuillePointage(c, pres);
    sendPDF(res, buf, `pointage-ceremonie-${req.params.id}.pdf`);
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

// Rapport mensuel
router.get('/rapport-mensuel/:section/:mois/:annee', protect, async (req, res) => {
  try {
    const { section, mois, annee } = req.params;
    const membres = (await pool.query("SELECT COUNT(*) as n FROM section_membres WHERE section_slug=$1",[section])).rows[0].n;
    const buf = await pdf.rapportMensuel(section, mois, annee, { membres, evenements:0, taux_presence:0, signalements:0 });
    sendPDF(res, buf, `rapport-${section}-${mois}-${annee}.pdf`);
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

// ── EMAILS EN MASSE ───────────────────────────────────────────────────────
router.post('/email/ceremonie/:id', protect, async (req, res) => {
  try {
    const c = (await pool.query('SELECT * FROM ceremonies WHERE id=$1',[req.params.id])).rows[0];
    if (!c) return res.status(404).json({ success:false, error:'Cérémonie introuvable' });
    const result = await emailConvocationCeremonie(c);
    res.json({ success:true, message:`📧 ${result.sent} emails envoyés`, ...result });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

router.post('/email/feu-camp/:id', protect, async (req, res) => {
  try {
    const f = (await pool.query('SELECT * FROM bat_feux_camp WHERE id=$1',[req.params.id])).rows[0];
    if (!f) return res.status(404).json({ success:false, error:'Introuvable' });
    const result = await emailFeuCamp(f);
    res.json({ success:true, message:`📧 ${result.sent} emails envoyés`, ...result });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

router.post('/email/annonce', protect, async (req, res) => {
  try {
    const { titre, message, expediteur } = req.body;
    if (!titre || !message) return res.status(400).json({ success:false, error:'titre et message requis' });
    const result = await emailAnnonce(titre, message, expediteur);
    res.json({ success:true, message:`📧 ${result.sent} emails envoyés`, ...result });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

router.get('/email/stats', protect, async (req, res) => {
  try {
    const r = await pool.query("SELECT COUNT(*) as total FROM soldiers WHERE email IS NOT NULL AND email != '' AND statut='actif'");
    res.json({ success:true, data:{ destinataires: parseInt(r.rows[0].total) } });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

// ── PDF Rapport Sanction ──────────────────────────────────────────────────
router.get('/sanction/:id', protect, async (req, res) => {
  try {
    const sc = (await pool.query(`
      SELECT s.*, u.username as prononce_par_nom FROM sanctions s
      LEFT JOIN users u ON u.id=s.prononce_par WHERE s.id=$1`, [req.params.id])).rows[0];
    if (!sc) return res.status(404).json({ success:false, error:'Sanction introuvable' });
    const soldat = (await pool.query('SELECT * FROM soldiers WHERE id=$1', [sc.soldier_id])).rows[0];
    const buf = await pdf.rapportSanction(soldat, sc);
    sendPDF(res, buf, `sanction-${req.params.id}.pdf`);
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

// ── SANCTION AUTOMATIQUE : génère PDF + envoie email au concerné + soldats ─
router.post('/sanction-auto', protect, async (req, res) => {
  try {
    const { soldier_id, type_sanction, severite, motif, faits, date_sanction } = req.body;
    if (!soldier_id || !motif || !severite) {
      return res.status(400).json({ success:false, error:'soldier_id, motif et severite requis' });
    }

    // 1. Créer la sanction en DB
    const scR = await pool.query(`
      INSERT INTO sanctions (soldier_id, type_sanction, severite, motif, faits, date_sanction, statut, prononce_par)
      VALUES ($1,$2,$3,$4,$5,$6,'en_cours',$7) RETURNING *`,
      [soldier_id, type_sanction||'Avertissement', severite, motif, faits||null,
       date_sanction||new Date().toISOString().slice(0,10), req.user.id]
    );
    const sanction = scR.rows[0];

    // 2. Récupérer le soldat
    const soldat = (await pool.query('SELECT * FROM soldiers WHERE id=$1', [soldier_id])).rows[0];
    if (!soldat) return res.status(404).json({ success:false, error:'Soldat introuvable' });

    // 3. Générer le PDF
    const pdfBuffer = await pdf.rapportSanction(soldat, {
      ...sanction,
      prononce_par_nom: req.user.username
    });

    // 4. Config email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
    });

    const sevEmoji = { mineure:'🔵', moyenne:'🟡', grave:'🔴', tres_grave:'⛔' };
    const subject = `${sevEmoji[severite]||'⚠️'} Notification de sanction — ${soldat.prenom} ${soldat.nom}`;

    const htmlEmail = (prenom, nom, estConcerne) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;600&display=swap');
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #0a0b0d;
          margin: 0;
          padding: 20px;
          color: #e2e8f0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #0f1115;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(201,168,76,0.25);
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        }
        .header {
          background: linear-gradient(135deg, #0f1115, #1a1e26);
          border-bottom: 2px solid #C9A84C;
          padding: 28px 32px;
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .header-emblem {
          font-size: 2.5rem;
          filter: drop-shadow(0 0 10px rgba(201,168,76,0.3));
        }
        .header-title {
          flex: 1;
        }
        .header-surtitle {
          font-family: 'Cinzel', serif;
          font-size: 0.55rem;
          letter-spacing: 0.3em;
          color: #C9A84C;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .header-main {
          font-family: 'Cinzel', serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.3;
        }
        .content {
          padding: 30px 32px;
        }
        .greeting {
          font-size: 0.9rem;
          color: #a0afbe;
          margin-bottom: 20px;
        }
        .greeting strong {
          color: #C9A84C;
          font-weight: 600;
        }
        .sanction-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 12px;
          padding: 22px 24px;
          margin-bottom: 20px;
        }
        .sanction-badge {
          display: inline-block;
          font-family: 'Cinzel', serif;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          padding: 4px 14px;
          border-radius: 30px;
          text-transform: uppercase;
          margin-bottom: 15px;
          border: 1px solid;
        }
        .badge-concerne {
          background: rgba(239,68,68,0.1);
          color: #f87171;
          border-color: rgba(239,68,68,0.3);
        }
        .badge-info {
          background: rgba(245,158,11,0.1);
          color: #fbbf24;
          border-color: rgba(245,158,11,0.3);
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
        }
        .info-table td {
          padding: 8px 0;
          vertical-align: top;
        }
        .info-table td:first-child {
          width: 35%;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 400;
          letter-spacing: 0.02em;
        }
        .info-table td:last-child {
          color: #e2e8f0;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .info-table .severite {
          color: #f87171;
          font-weight: 700;
        }
        .motif-block {
          background: rgba(0,0,0,0.2);
          border-left: 3px solid #C9A84C;
          padding: 14px 16px;
          margin: 16px 0 8px;
          border-radius: 0 8px 8px 0;
          font-size: 0.85rem;
          line-height: 1.7;
          color: #cbd5e1;
          font-style: italic;
        }
        .footer {
          border-top: 1px solid rgba(201,168,76,0.15);
          padding: 24px 32px 20px;
          background: #0a0c10;
        }
        .footer-legal {
          font-size: 0.55rem;
          color: #5a6474;
          text-align: center;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .footer-stamp {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 15px;
        }
        .stamp {
          font-family: 'Cinzel', serif;
          font-size: 0.6rem;
          color: #C9A84C;
          border: 1px dashed rgba(201,168,76,0.5);
          border-radius: 6px;
          padding: 5px 12px;
          text-align: center;
          letter-spacing: 0.15em;
        }
        .signature {
          text-align: right;
        }
        .signature-line {
          width: 180px;
          height: 1px;
          background: #C9A84C;
          margin: 5px 0 3px auto;
        }
        .signature-name {
          font-size: 0.7rem;
          color: #a0afbe;
        }
        hr {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.05);
          margin: 16px 0;
        }
        .button {
          display: inline-block;
          background: rgba(201,168,76,0.1);
          border: 1px solid rgba(201,168,76,0.3);
          color: #C9A84C;
          padding: 8px 20px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
          text-decoration: none;
          letter-spacing: 0.1em;
          margin-top: 12px;
        }
        @media (max-width: 480px) {
          .header { padding: 20px; }
          .content { padding: 20px; }
          .footer { padding: 20px; }
          .info-table td:first-child { width: 40%; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-emblem">⚔️</div>
          <div class="header-title">
            <div class="header-surtitle">ARMÉE DU G5C · COMMANDEMENT</div>
            <div class="header-main">Notification de Sanction Disciplinaire</div>
          </div>
        </div>

        <div class="content">
          <div class="greeting">
            Bonjour <strong>${prenom} ${nom}</strong>,
          </div>

          ${estConcerne ? `
          <div class="sanction-card">
            <div class="sanction-badge badge-concerne">🔔 VOUS ÊTES CONCERNÉ</div>
            <table class="info-table">
              <tr><td>Type de sanction</td><td>${type_sanction || 'Avertissement'}</td></tr>
              <tr><td>Sévérité</td><td class="severite">${severite.toUpperCase().replace('_',' ')}</td></tr>
              <tr><td>Date de prononciation</td><td>${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</td></tr>
            </table>
            <div class="motif-block">
              <strong>Motif :</strong> ${motif}
            </div>
            <div style="font-size:0.75rem; color:#94a3b8; margin-top:12px;">
              Le rapport officiel est joint à cet email. Vous disposez de <strong style="color:#C9A84C;">7 jours</strong> pour contester cette décision auprès du Commandement.
            </div>
          </div>
          ` : `
          <div class="sanction-card">
            <div class="sanction-badge badge-info">ℹ️ INFORMATION GÉNÉRALE</div>
            <p style="font-size:0.85rem; line-height:1.7; margin:0 0 10px 0;">
              Le soldat <strong style="color:#C9A84C;">${soldat.prenom} ${soldat.nom}</strong>
              (${soldat.grade} — ${soldat.matricule}) a reçu une sanction de type
              <strong>${type_sanction || 'Avertissement'}</strong>
              de sévérité <strong style="color:#f87171;">${severite.toUpperCase().replace('_',' ')}</strong>.
            </p>
            <div class="motif-block" style="margin-top:5px;">
              <strong>Motif :</strong> ${motif}
            </div>
          </div>
          `}

          <div style="text-align:center;">
            <a href="#" class="button">📥 Télécharger le rapport PDF</a>
          </div>
          <hr />
          <div style="font-size:0.7rem; color:#94a3b8; line-height:1.6; text-align:center;">
            Cet email est envoyé automatiquement par le système de gestion des effectifs G5C.
            Merci de ne pas y répondre.
          </div>
        </div>

        <div class="footer">
          <div class="footer-stamp">
            <div class="stamp">⚔️ ARMÉE G5C ⚔️</div>
            <div class="signature">
              <div class="signature-line"></div>
              <div class="signature-name">Le Commandant G5C</div>
            </div>
          </div>
          <div class="footer-legal">
            DOCUMENT OFFICIEL · RÉFÉRENCE ${new Date().getFullYear()}-SANC-${soldier_id}
          </div>
        </div>
      </div>
    </body>
    </html>
    `;

    let emailsSent = 0, errors = 0;

    // 5a. Email au concerné (avec PDF en pièce jointe)
    if (soldat.email) {
      try {
        await transporter.sendMail({
          from: `"Commandement G5C" <${process.env.GMAIL_USER}>`,
          to: soldat.email,
          subject,
          html: htmlEmail(soldat.prenom, soldat.nom, true),
          attachments: [{
            filename: `sanction-officielle-${soldat.matricule}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }]
        });
        emailsSent++;
      } catch(e) { console.error('Email concerné failed:', e.message); errors++; }
    }

    // 5b. Email à tous les soldats actifs (SAUF CRICs) sans PDF joint
    const soldatsActifs = (await pool.query(`
      SELECT email, prenom, nom FROM soldiers
      WHERE statut='actif' AND email IS NOT NULL AND email!='' AND id!=$1`,
      [soldier_id])).rows;

    for (const dest of soldatsActifs) {
      try {
        await transporter.sendMail({
          from: `"Commandement G5C" <${process.env.GMAIL_USER}>`,
          to: dest.email,
          subject,
          html: htmlEmail(dest.prenom, dest.nom, false),
        });
        emailsSent++;
        await new Promise(r => setTimeout(r, 100));
      } catch(e) { errors++; }
    }

    console.log(`⚖️ Sanction auto: ${emailsSent} emails, ${errors} erreurs`);

    res.json({
      success: true,
      data: { sanction_id: sanction.id, emails_sent: emailsSent, errors },
      message: `✅ Sanction créée, ${emailsSent} notifications envoyées`
    });

  } catch(e) {
    console.error('Erreur sanction-auto:', e);
    res.status(500).json({ success:false, error:e.message });
  }
});

// ── PDF Rapport DASB ──────────────────────────────────────────────────────
router.get('/rapport-dasb', protect, async (req, res) => {
  try {
    const budgets = (await pool.query('SELECT * FROM budgets ORDER BY created_at DESC LIMIT 5')).rows;
    const demandes = (await pool.query(`
      SELECT d.*, s.prenom, s.nom, s.matricule FROM demandes_sociales d
      LEFT JOIN soldiers s ON s.id=d.soldier_id ORDER BY d.created_at DESC LIMIT 20`)).rows;
    const stats = (await pool.query(`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN statut='approuvee' THEN 1 ELSE 0 END) as approuvees,
        SUM(CASE WHEN statut='rejetee' THEN 1 ELSE 0 END) as rejetees,
        SUM(CASE WHEN statut='en_attente' THEN 1 ELSE 0 END) as en_attente,
        SUM(montant_accorde) as total_accorde
      FROM demandes_sociales`)).rows[0];

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${require('../services/pdfService').BASE_CSS||''}</style></head><body>
    <div style="font-family:'Georgia',serif;padding:40px;background:#fff">
      <h1 style="font-family:'Georgia',serif;color:#8B6914;border-bottom:2px solid #C9A84C;padding-bottom:8px">
        Rapport DASB — Aide Sociale & Budget
      </h1>
      <p style="color:#666;font-size:.85rem">Généré le ${new Date().toLocaleDateString('fr-FR')}</p>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0">
        ${[
          {l:'Total demandes',v:stats.total,c:'#1e40af'},
          {l:'Approuvées',v:stats.approuvees||0,c:'#065f46'},
          {l:'Rejetées',v:stats.rejetees||0,c:'#991b1b'},
          {l:'Budget accordé',v:(parseFloat(stats.total_accorde)||0).toLocaleString('fr-FR')+'F',c:'#8B6914'},
        ].map(k=>`<div style="background:#faf8f4;border:1px solid #e8e0d0;border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:1.4rem;font-weight:700;color:${k.c}">${k.v}</div>
          <div style="font-size:.6rem;color:#666;margin-top:4px;text-transform:uppercase;letter-spacing:.1em">${k.l}</div>
        </div>`).join('')}
      </div>

      <h2 style="font-family:'Georgia',serif;color:#8B6914;margin:20px 0 10px">Dernières demandes</h2>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#0a0b0d">
          ${['Soldat','Type d\'aide','Montant','Statut','Date'].map(h=>`<th style="color:#C9A84C;padding:8px 12px;text-align:left;font-size:.65rem;letter-spacing:.1em">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${demandes.map((d,i)=>`<tr style="background:${i%2?'#faf8f4':'#fff'}">
            <td style="padding:8px 12px;font-size:.82rem"><strong>${d.prenom||'—'} ${d.nom||''}</strong></td>
            <td style="padding:8px 12px;font-size:.82rem">${d.type_aide||'—'}</td>
            <td style="padding:8px 12px;font-size:.82rem;font-weight:600">${d.montant_demande?parseFloat(d.montant_demande).toLocaleString('fr-FR')+'F':'—'}</td>
            <td style="padding:8px 12px"><span style="font-size:.65rem;padding:2px 8px;border-radius:12px;font-weight:700;
              background:${d.statut==='approuvee'?'#D1FAE5':d.statut==='rejetee'?'#FEE2E2':'#FEF3C7'};
              color:${d.statut==='approuvee'?'#065f46':d.statut==='rejetee'?'#991b1b':'#92400e'}">${d.statut}</span></td>
            <td style="padding:8px 12px;font-size:.78rem;color:#666">${d.date_demande?new Date(d.date_demande).toLocaleDateString('fr-FR'):'—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div></body></html>`;

    const { default: puppeteer } = await import('puppeteer');
    const browser = await puppeteer.launch({
      executablePath:'/home/khalil/.cache/puppeteer/chrome/linux-145.0.7632.77/chrome-linux64/chrome',
      args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil:'domcontentloaded' });
    await new Promise(r=>setTimeout(r,800));
    const buf = Buffer.from(await page.pdf({ format:'A4', printBackground:true }));
    await browser.close();
    sendPDF(res, buf, `rapport-dasb-${new Date().toISOString().slice(0,10)}.pdf`);
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
});

module.exports = router;
