const nodemailer = require('nodemailer');
const pool = require('../config/database');

let io = null;
const setIO = (ioInstance) => { io = ioInstance; };

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const saveAndEmit = async (user_ids, titre, corps, type = 'info') => {
  if (!user_ids?.length) return;
  try {
    for (const uid of user_ids) {
      await pool.query(
        'INSERT INTO notifications (user_id, titre, corps, type) VALUES ($1,$2,$3,$4)',
        [uid, titre, corps, type]
      );
    }
    if (io) {
      const notifs = await pool.query(
        'SELECT * FROM notifications WHERE user_id = ANY($1) AND lu = false ORDER BY created_at DESC',
        [user_ids]
      );
      user_ids.forEach(uid => {
        const userNotifs = notifs.rows.filter(n => n.user_id === uid);
        io.to('user_' + uid).emit('notifications', { success: true, data: userNotifs });
      });
    }
  } catch (err) { console.error('saveAndEmit error:', err.message); }
};

const emailSignalement = async ({ section, type, description, nom_personne }) => {
  if (!process.env.GMAIL_USER || process.env.GMAIL_APP_PASSWORD === 'Soldatunjour') return;
  const sectionLabels = {
    drapeau:'Section Drapeau', caporaux:'Section Caporaux',
    recrutement:'Section Recrutement', bat_music:'BAT-MUSIC',
    drh:'DRH', dsa:'DSA', dasc:'DASC', dcsp:'DCSP', dasb:'DASB',
  };
  const typeLabels = { absence:'Absence', retard:'Retard', comportement:'Comportement', autre:'Autre' };
  const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0b0d;color:#e2e8f0;padding:32px;border-radius:12px;border:1px solid #C9A84C">'
    + '<h2 style="color:#C9A84C;text-align:center">⚠️ ARMÉE G5C — Nouveau Signalement</h2>'
    + '<table style="width:100%;border-collapse:collapse">'
    + '<tr><td style="padding:10px;color:#94a3b8">Section</td><td style="padding:10px;color:#C9A84C;font-weight:700">' + (sectionLabels[section]||section) + '</td></tr>'
    + '<tr style="background:#ffffff08"><td style="padding:10px;color:#94a3b8">Type</td><td style="padding:10px;color:#ef4444;font-weight:700">' + (typeLabels[type]||type) + '</td></tr>'
    + '<tr><td style="padding:10px;color:#94a3b8">Concerné</td><td style="padding:10px;font-weight:700">' + (nom_personne||'—') + '</td></tr>'
    + '<tr style="background:#ffffff08"><td style="padding:10px;color:#94a3b8">Description</td><td style="padding:10px">' + (description||'—') + '</td></tr>'
    + '<tr><td style="padding:10px;color:#94a3b8">Date</td><td style="padding:10px">' + new Date().toLocaleString('fr-FR') + '</td></tr>'
    + '</table>'
    + '<p style="margin-top:20px;padding:12px;background:#ef444418;border-radius:8px;color:#f87171;font-size:.82rem">Ce signalement nécessite une prise en charge par le Haut Commandement.</p>'
    + '</div>';
  try {
    await transporter.sendMail({
      from: '"Armée G5C" <' + process.env.GMAIL_USER + '>',
      to: process.env.GMAIL_NOTIFY_TO || process.env.GMAIL_USER,
      subject: '[G5C] Signalement ' + (typeLabels[type]||type) + ' — ' + (sectionLabels[section]||section),
      html,
    });
    console.log('📧 Email signalement envoyé');
  } catch (err) { console.error('Email error:', err.message); }
};

const getAdminsOfficiers = async () => {
  const r = await pool.query("SELECT id FROM users WHERE role IN ('admin','officier') AND is_active=true");
  return r.rows.map(u => u.id);
};

const getMembresSectionUsers = async (section_slug) => {
  const r = await pool.query(
    'SELECT DISTINCT s.user_id FROM section_membres sm JOIN soldiers s ON s.id = sm.soldier_id WHERE sm.section_slug = $1 AND s.user_id IS NOT NULL',
    [section_slug]
  );
  return r.rows.map(u => u.user_id);
};

const notifySignalement = async (signalement) => {
  const uids = await getAdminsOfficiers();
  const nom = signalement.soldier_prenom
    ? signalement.soldier_prenom + ' ' + signalement.soldier_nom
    : signalement.cric_prenom ? signalement.cric_prenom + ' ' + signalement.cric_nom : null;
  await saveAndEmit(uids, '⚠️ Nouveau signalement — ' + signalement.section_slug, (signalement.type||'') + ' · ' + (signalement.description||''), 'signalement');
  await emailSignalement({ section: signalement.section_slug, type: signalement.type, description: signalement.description, nom_personne: nom });
};

const notifyCeremonieAuto = async (titres) => {
  const uids = await getMembresSectionUsers('drapeau');
  if (!uids.length) return;
  await saveAndEmit(uids, '🚩 Cérémonies générées automatiquement', 'Nouvelles cérémonies : ' + titres.join(', '), 'drapeau');
};

const notifyFeuCamp = async (titre) => {
  const uids = await getMembresSectionUsers('bat_music');
  if (!uids.length) return;
  await saveAndEmit(uids, '🔥 Nouveau feu de camp : ' + titre, 'Un feu de camp a été programmé.', 'bat_music');
};

const notifyRepetition = async (type_rep, date_rep) => {
  const uids = await getMembresSectionUsers('bat_music');
  if (!uids.length) return;
  const label = type_rep === 'interne' ? 'Interne' : 'Générale';
  await saveAndEmit(uids, '🎤 Nouvelle répétition ' + label, 'Prévue le ' + new Date(date_rep).toLocaleDateString('fr-FR'), 'bat_music');
};

const notifyEntrainement = async (titre, date_entr) => {
  const uids = await getMembresSectionUsers('caporaux');
  if (!uids.length) return;
  await saveAndEmit(uids, '💪 Nouvel entraînement : ' + titre, 'Prévu le ' + new Date(date_entr).toLocaleDateString('fr-FR'), 'caporaux');
};

module.exports = { setIO, saveAndEmit, notifySignalement, notifyCeremonieAuto, notifyFeuCamp, notifyRepetition, notifyEntrainement };

// ══════════════════════════════════════════════════════════════════════════
// EMAILS EN MASSE
// ══════════════════════════════════════════════════════════════════════════

const getAllEmails = async () => {
  const r = await pool.query("SELECT email, prenom, nom FROM soldiers WHERE email IS NOT NULL AND email != '' AND statut = 'actif'");
  return r.rows;
};

const sendBulkEmail = async (subject, htmlBody, destinataires = null) => {
  const list = destinataires || await getAllEmails();
  if (!list.length) return { sent: 0, errors: 0 };
  let sent = 0, errors = 0;
  for (const dest of list) {
    try {
      const personalHtml = htmlBody.replace('{{PRENOM}}', dest.prenom || 'Soldat').replace('{{NOM}}', dest.nom || '');
      await transporter.sendMail({
        from: `"Armée G5C" <${process.env.GMAIL_USER}>`,
        to: dest.email,
        subject,
        html: personalHtml,
      });
      sent++;
      await new Promise(r => setTimeout(r, 150)); // anti-spam délai
    } catch(e) { console.error('Email failed:', dest.email, e.message); errors++; }
  }
  console.log(`📧 Bulk email: ${sent} envoyés, ${errors} erreurs`);
  return { sent, errors };
};

const emailTemplate = (titre, corps, bouton = null) => `
<div style="font-family:'Georgia',serif;max-width:600px;margin:0 auto;background:#0a0b0d;
  color:#e2e8f0;border-radius:12px;overflow:hidden;border:1px solid rgba(201,168,76,.2)">
  <div style="background:linear-gradient(135deg,#0a0b0d,#111318);border-bottom:2px solid #C9A84C;
    padding:24px 32px;display:flex;align-items:center;gap:16px">
    <div style="font-size:1.8rem">⚔</div>
    <div>
      <div style="font-size:.55rem;letter-spacing:.3em;color:#C9A84C">ARMÉE DU G5C · XEL-DIOM-FIT</div>
      <div style="font-size:1.1rem;font-weight:700;color:#fff;margin-top:3px">${titre}</div>
    </div>
  </div>
  <div style="padding:28px 32px">
    <div style="margin-bottom:12px;font-size:.85rem;color:#94a3b8">
      Bonjour <strong style="color:#C9A84C">{{PRENOM}} {{NOM}}</strong>,
    </div>
    ${corps}
    ${bouton ? `<div style="margin-top:24px;text-align:center">
      <a href="${bouton.url}" style="background:linear-gradient(135deg,#C9A84C,#a8732a);color:#0a0b0d;
        padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;
        font-size:.8rem;letter-spacing:.1em;display:inline-block">${bouton.text}</a>
    </div>` : ''}
  </div>
  <div style="padding:14px 32px;border-top:1px solid rgba(201,168,76,.1);
    display:flex;justify-content:space-between;font-size:.55rem;color:#444">
    <span>Armée du G5C — 36e Promotion</span>
    <span>Université Gaston Berger · Saint-Louis</span>
  </div>
</div>`;

// Convocation cérémonie
const emailConvocationCeremonie = async (ceremonie) => {
  const subject = `📢 Convocation — ${ceremonie.titre}`;
  const corps = `
    <div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-size:.6rem;letter-spacing:.2em;color:#C9A84C;margin-bottom:8px">DÉTAILS DE LA CÉRÉMONIE</div>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px;color:#94a3b8;font-size:.8rem">🗓 Date</td><td style="padding:6px;color:#fff;font-weight:600">${new Date(ceremonie.date_ceremonie).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</td></tr>
        <tr><td style="padding:6px;color:#94a3b8;font-size:.8rem">⏰ Heure</td><td style="padding:6px;color:#fff;font-weight:600">${ceremonie.heure_debut||'À confirmer'}</td></tr>
        <tr><td style="padding:6px;color:#94a3b8;font-size:.8rem">📍 Lieu</td><td style="padding:6px;color:#fff;font-weight:600">${ceremonie.lieu||'À confirmer'}</td></tr>
        <tr><td style="padding:6px;color:#94a3b8;font-size:.8rem">📋 Type</td><td style="padding:6px;color:#fff;font-weight:600">${ceremonie.type_ceremonie||'Cérémonie officielle'}</td></tr>
      </table>
    </div>
    <p style="color:#e2e8f0;line-height:1.7;font-size:.85rem">
      Votre présence est <strong style="color:#C9A84C">obligatoire</strong> à cette cérémonie.<br>
      Veillez à être en tenue réglementaire et à l'heure.
    </p>`;
  return sendBulkEmail(subject, emailTemplate(ceremonie.titre, corps));
};

// Feu de camp BAT-MUSIC
const emailFeuCamp = async (feu) => {
  const subject = `🔥 Feu de camp programmé — ${feu.titre}`;
  const corps = `
    <div style="background:rgba(249,115,22,.08);border:1px solid rgba(249,115,22,.2);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-size:.6rem;letter-spacing:.2em;color:#f97316;margin-bottom:8px">🔥 SOIRÉE FEU DE CAMP</div>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px;color:#94a3b8;font-size:.8rem">🗓 Date</td><td style="padding:6px;color:#fff;font-weight:600">${new Date(feu.date_evenement).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long'})}</td></tr>
        <tr><td style="padding:6px;color:#94a3b8;font-size:.8rem">📍 Lieu</td><td style="padding:6px;color:#fff;font-weight:600">${feu.lieu||'À confirmer'}</td></tr>
        <tr><td style="padding:6px;color:#94a3b8;font-size:.8rem">👥 Pour</td><td style="padding:6px;color:#fff;font-weight:600">${feu.groupe_beneficiaire||'Toute la promotion'}</td></tr>
      </table>
    </div>
    <p style="color:#e2e8f0;line-height:1.7;font-size:.85rem">
      La BAT-MUSIC vous invite à une soirée animée. Venez nombreux !
    </p>`;
  return sendBulkEmail(subject, emailTemplate(feu.titre, corps));
};

// Classement promotion
const emailClassement = async (classement) => {
  const subject = `🏆 Résultats du classement — Promotion ${classement.promotion}`;
  const top3 = classement.resultats?.slice(0,3)||[];
  const corps = `
    <p style="color:#e2e8f0;line-height:1.7;font-size:.85rem;margin-bottom:16px">
      Les résultats du classement de la Promotion <strong style="color:#C9A84C">${classement.promotion}</strong> sont disponibles.
    </p>
    ${top3.length ? `
    <div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-size:.6rem;letter-spacing:.2em;color:#C9A84C;margin-bottom:12px">🏆 PODIUM</div>
      ${top3.map((s,i)=>`
        <div style="display:flex;align-items:center;gap:12px;padding:8px 0;${i<2?'border-bottom:1px solid rgba(201,168,76,.1);':''}">
          <span style="font-size:1.4rem">${['🥇','🥈','🥉'][i]}</span>
          <div style="flex:1;color:#fff;font-weight:600">${s.prenom} ${s.nom}</div>
          <span style="color:#C9A84C;font-family:monospace">${s.score||s.rang}</span>
        </div>`).join('')}
    </div>` : ''}
    <p style="color:#94a3b8;font-size:.8rem">Consultez le classement complet sur le portail.</p>`;
  return sendBulkEmail(subject, emailTemplate('Résultats du Classement', corps));
};

// Annonce administrative
const emailAnnonce = async (titre, message, expediteur = 'Le Commandement') => {
  const subject = `📢 Annonce — ${titre}`;
  const corps = `
    <div style="background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.2);border-radius:8px;
      padding:16px;margin-bottom:16px">
      <div style="font-size:.6rem;letter-spacing:.2em;color:#60a5fa;margin-bottom:8px">MESSAGE OFFICIEL</div>
      <p style="color:#e2e8f0;line-height:1.8;font-size:.9rem">${message}</p>
    </div>
    <div style="font-size:.75rem;color:#94a3b8">
      — <em>${expediteur}</em><br>
      <span style="font-size:.65rem;color:#666">${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</span>
    </div>`;
  return sendBulkEmail(subject, emailTemplate(titre, corps));
};

// Alerte soldat/gradé
const emailAlerteSoldat = async (soldat, motif, details) => {
  const subject = `⚠️ Alerte — ${soldat.prenom} ${soldat.nom}`;
  const corps = `
    <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:8px;padding:16px;margin-bottom:16px">
      <div style="font-size:.6rem;letter-spacing:.2em;color:#f87171;margin-bottom:8px">⚠️ ALERTE</div>
      <table style="width:100%">
        <tr><td style="padding:6px;color:#94a3b8;font-size:.8rem">Soldat</td><td style="color:#fff;font-weight:600">${soldat.prenom} ${soldat.nom} — ${soldat.matricule}</td></tr>
        <tr><td style="padding:6px;color:#94a3b8;font-size:.8rem">Motif</td><td style="color:#f87171;font-weight:600">${motif}</td></tr>
        <tr><td style="padding:6px;color:#94a3b8;font-size:.8rem">Détails</td><td style="color:#e2e8f0">${details||'—'}</td></tr>
      </table>
    </div>`;
  // Envoyer seulement aux admins/officiers
  const admins = await pool.query("SELECT s.email, s.prenom, s.nom FROM soldiers s JOIN users u ON u.id = s.user_id WHERE u.role IN ('admin','officier') AND s.email IS NOT NULL");
  return sendBulkEmail(subject, emailTemplate('Alerte Opérationnelle', corps), admins.rows);
};

module.exports = {
  setIO, saveAndEmit,
  notifySignalement, notifyCeremonieAuto, notifyFeuCamp, notifyRepetition, notifyEntrainement,
  emailConvocationCeremonie, emailFeuCamp, emailClassement, emailAnnonce, emailAlerteSoldat,
  sendBulkEmail, emailTemplate, getAllEmails,
};
