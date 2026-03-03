const puppeteer = require('puppeteer');

const HEADER = (titre, sous_titre = '') => `
<div style="background:linear-gradient(135deg,#0a0b0d,#111318);border-bottom:2px solid #C9A84C;
  padding:28px 40px;display:flex;align-items:center;gap:24px;font-family:'Georgia',serif">
  <div style="width:64px;height:64px;border-radius:50%;border:2px solid #C9A84C;
    display:flex;align-items:center;justify-content:center;background:rgba(201,168,76,.1);
    font-size:1.4rem;color:#C9A84C;flex-shrink:0">⚔</div>
  <div style="flex:1">
    <div style="font-size:.55rem;letter-spacing:.4em;color:#C9A84C;text-transform:uppercase;margin-bottom:4px">
      UNIVERSITÉ GASTON BERGER · SAINT-LOUIS · SÉNÉGAL
    </div>
    <div style="font-size:1.3rem;font-weight:700;color:#fff;letter-spacing:.08em">${titre}</div>
    ${sous_titre ? `<div style="font-size:.75rem;color:#C9A84C;margin-top:3px">${sous_titre}</div>` : ''}
  </div>
  <div style="text-align:right">
    <div style="font-size:.55rem;color:#666;letter-spacing:.1em">ARMÉE DU G5C</div>
    <div style="font-size:.65rem;color:#C9A84C;font-weight:700">XEL · DIOM · FIT</div>
    <div style="font-size:.55rem;color:#666;margin-top:4px">${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</div>
  </div>
</div>`;

const FOOTER = (ref = '') => `
<div style="background:#0a0b0d;border-top:1px solid rgba(201,168,76,.2);padding:12px 40px;
  display:flex;justify-content:space-between;align-items:center;font-family:'Georgia',serif">
  <div style="font-size:.55rem;color:#444;letter-spacing:.1em">DOCUMENT OFFICIEL — ARMÉE G5C 36e PROMOTION</div>
  ${ref ? `<div style="font-size:.55rem;color:#666">Réf: ${ref}</div>` : ''}
  <div style="font-size:.55rem;color:#444">Généré le ${new Date().toLocaleString('fr-FR')}</div>
</div>`;

const BASE_CSS = `
  /* fonts locales */
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#f8f6f0;font-family:'EB Garamond','Georgia',serif;color:#1a1a1a;font-size:11pt}
  .page{background:#fff;min-height:297mm;display:flex;flex-direction:column}
  .content{padding:32px 40px;flex:1}
  h2{font-family:'Cinzel',serif;font-size:1rem;letter-spacing:.15em;color:#8B6914;
    text-transform:uppercase;border-bottom:1px solid #C9A84C;padding-bottom:8px;margin:20px 0 12px}
  .field-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px}
  .field{margin-bottom:10px}
  .field label{font-size:.6rem;letter-spacing:.15em;color:#8B6914;text-transform:uppercase;display:block;margin-bottom:3px}
  .field .val{font-size:.95rem;font-weight:600;color:#1a1a1a;border-bottom:1px solid #e8e0d0;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th{background:#0a0b0d;color:#C9A84C;padding:9px 12px;font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.15em;text-align:left}
  td{padding:8px 12px;border-bottom:1px solid #f0ead8;font-size:.85rem}
  tr:nth-child(even) td{background:#faf8f4}
  .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:.65rem;font-weight:600}
  .badge-gold{background:#FFF3CD;border:1px solid #C9A84C;color:#8B6914}
  .badge-green{background:#D1FAE5;border:1px solid #34d399;color:#065f46}
  .badge-red{background:#FEE2E2;border:1px solid #ef4444;color:#991b1b}
  .badge-blue{background:#DBEAFE;border:1px solid #3b82f6;color:#1e40af}
  .signature-block{margin-top:40px;display:flex;justify-content:space-between}
  .signature{text-align:center;min-width:180px}
  .sig-line{border-top:1px solid #1a1a1a;margin-top:50px;padding-top:6px;font-size:.8rem;color:#444}
  .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);
    font-family:'Cinzel',serif;font-size:5rem;color:rgba(201,168,76,.06);white-space:nowrap;
    pointer-events:none;z-index:0;letter-spacing:.2em}
`;

async function generatePDF(html) {
  const browser = await puppeteer.launch({ executablePath: '/home/khalil/.cache/puppeteer/chrome/linux-145.0.7632.77/chrome-linux64/chrome', args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));
  const pdfData = await page.pdf({
    format: 'A4', printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });
  await browser.close();
  return Buffer.from(pdfData);
}

// ── 1. FICHE INDIVIDUELLE SOLDAT ─────────────────────────────────────────
const ficheSoldat = async (soldat) => {
  const s = soldat;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}</style></head><body>
  <div class="page">
    <div class="watermark">G5C</div>
    ${HEADER('FICHE INDIVIDUELLE DU SOLDAT', `Matricule : ${s.matricule || '—'}`)}
    <div class="content">
      <div style="display:flex;gap:24px;align-items:flex-start;margin-bottom:20px">
        ${s.photo_url?.startsWith('data:') ? `<img src="${s.photo_url}" style="width:100px;height:120px;object-fit:cover;border:2px solid #C9A84C;border-radius:4px">` :
          `<div style="width:100px;height:120px;border:2px dashed #C9A84C;display:flex;align-items:center;justify-content:center;color:#C9A84C;font-size:2rem;border-radius:4px;background:rgba(201,168,76,.05)">
            ${(s.prenom?.[0]||'')+(s.nom?.[0]||'')}
          </div>`}
        <div style="flex:1">
          <div style="font-family:'Cinzel',serif;font-size:1.5rem;font-weight:700;color:#0a0b0d">${s.prenom} ${s.nom}</div>
          ${s.alias ? `<div style="font-size:1rem;color:#8B6914;font-style:italic;margin-top:2px">« ${s.alias} »</div>` : ''}
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
            <span class="badge badge-gold">${s.grade || '—'}</span>
            <span class="badge ${s.statut==='actif'?'badge-green':'badge-red'}">${(s.statut||'—').toUpperCase()}</span>
            ${s.promotion ? `<span class="badge badge-blue">Promo ${s.promotion}</span>` : ''}
          </div>
        </div>
      </div>
      <h2>Informations Personnelles</h2>
      <div class="field-row">
        <div class="field"><label>Prénom</label><div class="val">${s.prenom||'—'}</div></div>
        <div class="field"><label>Nom</label><div class="val">${s.nom||'—'}</div></div>
        <div class="field"><label>Matricule</label><div class="val">${s.matricule||'—'}</div></div>
        <div class="field"><label>Grade</label><div class="val">${s.grade||'—'}</div></div>
        <div class="field"><label>Date de naissance</label><div class="val">${s.date_naissance?new Date(s.date_naissance).toLocaleDateString('fr-FR'):'—'}</div></div>
        <div class="field"><label>Lieu de naissance</label><div class="val">${s.lieu_naissance||'—'}</div></div>
        <div class="field"><label>Email</label><div class="val">${s.email||'—'}</div></div>
        <div class="field"><label>Téléphone</label><div class="val">${s.telephone||'—'}</div></div>
      </div>
      <h2>Informations Militaires</h2>
      <div class="field-row">
        <div class="field"><label>Promotion</label><div class="val">${s.promotion||'—'}</div></div>
        <div class="field"><label>Section d'affectation</label><div class="val">${s.section_affectation||'—'}</div></div>
        <div class="field"><label>Fonction</label><div class="val">${s.fonction||'—'}</div></div>
        <div class="field"><label>Statut</label><div class="val">${s.statut||'—'}</div></div>
      </div>
      ${s.distinctions?.length ? `
        <h2>Distinctions</h2>
        <table><thead><tr><th>Titre</th><th>Date</th><th>Motif</th></tr></thead><tbody>
        ${s.distinctions.map(d=>`<tr><td><strong>${d.type_distinction || d.titre || '—'}</strong></td><td>${new Date(d.date_distinction).toLocaleDateString('fr-FR')}</td><td>${d.motif||'—'}</td></tr>`).join('')}
        </tbody></table>` : ''}
      ${s.sanctions?.length ? `
        <h2>Sanctions</h2>
        <table><thead><tr><th>Type</th><th>Sévérité</th><th>Date</th><th>Motif</th></tr></thead><tbody>
        ${s.sanctions.map(s=>`<tr><td>${s.type_sanction}</td><td><span class="badge ${s.severite==='grave'?'badge-red':'badge-gold'}">${s.severite}</span></td><td>${new Date(s.date_sanction).toLocaleDateString('fr-FR')}</td><td>${s.motif||'—'}</td></tr>`).join('')}
        </tbody></table>` : ''}
      <div class="signature-block">
        <div class="signature"><div class="sig-line">Le Soldat</div></div>
        <div class="signature"><div class="sig-line">Chef de Section</div></div>
        <div class="signature"><div class="sig-line">Commandant G5C</div></div>
      </div>
    </div>
    ${FOOTER(`FICHE-${s.matricule}`)}
  </div></body></html>`;
  return generatePDF(html);
};

// ── 2. ATTESTATION DE PRÉSENCE ────────────────────────────────────────────
const attestationPresence = async (soldat, stats) => {
  const s = soldat;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}</style></head><body>
  <div class="page">
    <div class="watermark">OFFICIEL</div>
    ${HEADER('ATTESTATION DE PRÉSENCE', 'Document Officiel')}
    <div class="content">
      <div style="text-align:center;margin:30px 0 40px">
        <div style="font-family:'Cinzel',serif;font-size:.7rem;letter-spacing:.3em;color:#8B6914;margin-bottom:12px">
          LE COMMANDANT DE L'ARMÉE DU G5C
        </div>
        <div style="font-size:1rem;font-weight:600;color:#1a1a1a;line-height:1.8">
          Atteste que le soldat <strong style="color:#8B6914;font-size:1.1rem">${s.prenom} ${s.nom}</strong><br>
          Matricule <strong>${s.matricule}</strong> — Grade <strong>${s.grade}</strong><br>
          Promotion <strong>${s.promotion}</strong>
        </div>
        <div style="margin:20px auto;width:80px;height:2px;background:linear-gradient(90deg,transparent,#C9A84C,transparent)"></div>
        <div style="font-size:.95rem;color:#333;line-height:2;max-width:500px;margin:0 auto">
          A effectué <strong style="color:#8B6914;font-size:1.1rem">${stats.total_seances || 0}</strong> séances de présence<br>
          sur un total de <strong>${stats.seances_totales || 0}</strong> séances organisées<br>
          Taux de présence : <strong style="color:${stats.taux>=75?'#065f46':'#991b1b'};font-size:1.1rem">${stats.taux || 0}%</strong>
        </div>
        ${stats.taux >= 75
          ? `<div style="margin:16px auto;padding:12px 24px;background:#D1FAE5;border:1px solid #34d399;border-radius:8px;color:#065f46;font-weight:600;display:inline-block">✓ ASSIDUITÉ SATISFAISANTE</div>`
          : `<div style="margin:16px auto;padding:12px 24px;background:#FEE2E2;border:1px solid #ef4444;border-radius:8px;color:#991b1b;font-weight:600;display:inline-block">⚠ ASSIDUITÉ INSUFFISANTE</div>`}
      </div>
      <div style="margin:0 40px;padding:16px;background:#faf8f4;border:1px solid #e8e0d0;border-radius:8px">
        <div style="font-size:.75rem;color:#666;text-align:center">
          Cette attestation est délivrée pour servir et valoir ce que de droit.<br>
          Fait à Saint-Louis, le ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}
        </div>
      </div>
      <div class="signature-block" style="margin-top:60px">
        <div class="signature"><div class="sig-line">Le Titulaire</div></div>
        <div class="signature">
          <div style="font-size:.7rem;color:#8B6914;text-align:center;margin-bottom:50px">CACHET OFFICIEL</div>
          <div class="sig-line">Le Commandant G5C</div>
        </div>
      </div>
    </div>
    ${FOOTER(`ATT-PRES-${s.matricule}-${new Date().getFullYear()}`)}
  </div></body></html>`;
  return generatePDF(html);
};

// ── 3. RAPPORT DE SIGNALEMENT ─────────────────────────────────────────────
const rapportSignalement = async (signalement) => {
  const sg = signalement;
  const sevColors = { grave:'#991b1b', moyen:'#92400e', faible:'#065f46' };
  const sevBg     = { grave:'#FEE2E2', moyen:'#FEF3C7', faible:'#D1FAE5' };
  const sevBorder = { grave:'#ef4444', moyen:'#f59e0b', faible:'#34d399' };
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}</style></head><body>
  <div class="page">
    <div class="watermark">CONFIDENTIEL</div>
    ${HEADER('RAPPORT DE SIGNALEMENT', `Réf: SIG-${sg.id} · Section ${sg.section_slug}`)}
    <div class="content">
      <div style="padding:14px 20px;background:${sevBg[sg.severite]||'#FEF3C7'};
        border:1px solid ${sevBorder[sg.severite]||'#f59e0b'};border-radius:8px;
        margin-bottom:20px;display:flex;align-items:center;gap:12px">
        <span style="font-size:1.5rem">${sg.severite==='grave'?'🔴':sg.severite==='moyen'?'🟡':'🟢'}</span>
        <div>
          <div style="font-weight:700;color:${sevColors[sg.severite]||'#92400e'};font-size:.9rem">
            SIGNALEMENT ${(sg.severite||'').toUpperCase()} · ${(sg.type||'').toUpperCase()}
          </div>
          <div style="font-size:.75rem;color:#666">Section : ${sg.section_slug} · Date : ${new Date(sg.created_at).toLocaleString('fr-FR')}</div>
        </div>
      </div>
      <h2>Personne Concernée</h2>
      <div class="field-row">
        <div class="field"><label>Nom complet</label><div class="val">${sg.soldier_prenom||sg.cric_prenom||'—'} ${sg.soldier_nom||sg.cric_nom||''}</div></div>
        <div class="field"><label>Type</label><div class="val">${sg.cible_type==='soldat'?'Soldat':'CRIC'}</div></div>
        <div class="field"><label>Matricule / ID</label><div class="val">${sg.soldier_matricule||sg.cric_id||'—'}</div></div>
        <div class="field"><label>Section</label><div class="val">${sg.section_slug||'—'}</div></div>
      </div>
      <h2>Détails du Signalement</h2>
      <div class="field"><label>Type d'incident</label><div class="val">${sg.type||'—'}</div></div>
      <div class="field"><label>Description</label>
        <div style="background:#faf8f4;border:1px solid #e8e0d0;border-radius:6px;padding:12px;
          font-size:.9rem;line-height:1.7;margin-top:4px;min-height:80px">${sg.description||'Aucune description'}</div>
      </div>
      ${sg.sanctions?.length ? `
        <h2>Sanctions Associées</h2>
        <table><thead><tr><th>Type</th><th>Sévérité</th><th>Date</th><th>Prononcé par</th></tr></thead><tbody>
        ${sg.sanctions.map(s=>`<tr><td>${s.type_sanction}</td><td><span class="badge badge-red">${s.severite}</span></td><td>${new Date(s.date_sanction).toLocaleDateString('fr-FR')}</td><td>${s.prononce_par_nom||'—'}</td></tr>`).join('')}
        </tbody></table>` : ''}
      <div class="signature-block">
        <div class="signature"><div class="sig-line">Rapporteur</div></div>
        <div class="signature"><div class="sig-line">Chef de Section</div></div>
        <div class="signature"><div class="sig-line">Commandant G5C</div></div>
      </div>
    </div>
    ${FOOTER(`SIG-${sg.id}-${new Date().getFullYear()}`)}
  </div></body></html>`;
  return generatePDF(html);
};

// ── 4. CERTIFICAT DE DISTINCTION ──────────────────────────────────────────
const certificatDistinction = async (soldat, distinction) => {
  const s = soldat; const d = distinction;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}
  .cert-border{border:8px double #C9A84C;margin:20px;padding:30px;position:relative}
  .cert-border::before,.cert-border::after{content:'◆';position:absolute;color:#C9A84C;font-size:1.2rem}
  .cert-border::before{top:8px;left:12px}
  .cert-border::after{bottom:8px;right:12px}
  </style></head><body>
  <div class="page">
    ${HEADER('CERTIFICAT DE DISTINCTION MILITAIRE', 'Honneur & Mérite · Armée du G5C')}
    <div class="content">
      <div class="cert-border">
        <div style="text-align:center">
          <div style="font-size:3rem;margin-bottom:12px">🏅</div>
          <div style="font-family:'Cinzel',serif;font-size:.6rem;letter-spacing:.4em;color:#8B6914;margin-bottom:16px">
            L'ARMÉE DU G5C DÉCERNE LA DISTINCTION
          </div>
          <div style="font-family:'Cinzel',serif;font-size:1.6rem;font-weight:700;color:#8B6914;
            border:2px solid #C9A84C;display:inline-block;padding:10px 30px;margin:8px 0;
            background:linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.02))">
            ${d.type_distinction || d.titre || 'DISTINCTION HONORIFIQUE'}
          </div>
          <div style="margin:20px 0;font-size:.75rem;letter-spacing:.2em;color:#666">À</div>
          <div style="font-family:'Cinzel',serif;font-size:1.4rem;font-weight:700;color:#1a1a1a">
            ${s.prenom} ${s.nom}
          </div>
          <div style="font-size:.85rem;color:#666;margin:6px 0">
            ${s.grade} · Matricule ${s.matricule} · Promotion ${s.promotion}
          </div>
          <div style="margin:24px auto;width:120px;height:2px;background:linear-gradient(90deg,transparent,#C9A84C,transparent)"></div>
          <div style="font-size:.9rem;line-height:1.8;color:#333;max-width:480px;margin:0 auto">
            <em>En reconnaissance de ${d.motif || 'ses mérites exceptionnels et son dévouement exemplaire au service de l\'Armée du G5C'}</em>
          </div>
          <div style="margin-top:20px;font-size:.75rem;color:#8B6914">
            Décernée le ${new Date(d.date_distinction).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}
          </div>
          ${d.approuve_par_nom ? `<div style="font-size:.7rem;color:#666;margin-top:4px">Approuvée par : ${d.approuve_par_nom}</div>` : ''}
        </div>
        <div class="signature-block" style="margin-top:40px">
          <div class="signature"><div class="sig-line">Le Récipiendaire</div></div>
          <div class="signature">
            <div style="text-align:center;font-size:4rem;margin-bottom:4px;opacity:.15">⚔</div>
            <div class="sig-line">Le Commandant G5C</div>
          </div>
        </div>
      </div>
    </div>
    ${FOOTER(`DIST-${d.id}-${new Date().getFullYear()}`)}
  </div></body></html>`;
  return generatePDF(html);
};

// ── 5. FEUILLE DE POINTAGE CÉRÉMONIE ─────────────────────────────────────
const feuillePointage = async (ceremonie, presences) => {
  const c = ceremonie;
  const total = presences.length;
  const presents = presences.filter(p=>p.presence==='present').length;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}
  .pres-present{color:#065f46;background:#D1FAE5;border:1px solid #34d399}
  .pres-absent{color:#991b1b;background:#FEE2E2;border:1px solid #ef4444}
  .pres-retard{color:#92400e;background:#FEF3C7;border:1px solid #f59e0b}
  .pres-excuse{color:#1e40af;background:#DBEAFE;border:1px solid #3b82f6}
  </style></head><body>
  <div class="page">
    ${HEADER('FEUILLE DE POINTAGE', `Cérémonie : ${c.titre}`)}
    <div class="content">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
        ${[
          ['Date',c.date_ceremonie?new Date(c.date_ceremonie).toLocaleDateString('fr-FR'):'—'],
          ['Heure',c.heure_debut||'—'],
          ['Lieu',c.lieu||'—'],
          ['Type',c.type_ceremonie||'—'],
          ['Total convoqués',total],
          ['Présents',`${presents} (${total>0?Math.round(presents/total*100):0}%)`],
        ].map(([l,v])=>`
          <div style="background:#faf8f4;border:1px solid #e8e0d0;border-radius:6px;padding:10px">
            <div style="font-size:.55rem;letter-spacing:.15em;color:#8B6914;text-transform:uppercase;margin-bottom:3px">${l}</div>
            <div style="font-weight:600;font-size:.9rem">${v}</div>
          </div>`).join('')}
      </div>
      <table>
        <thead><tr><th>#</th><th>Matricule</th><th>Nom & Prénom</th><th>Grade</th><th>Présence</th><th>Motif</th></tr></thead>
        <tbody>
        ${presences.map((p,i)=>`
          <tr>
            <td style="color:#999;font-size:.75rem">${i+1}</td>
            <td style="font-family:'Courier New',monospace;font-size:.8rem">${p.matricule||'—'}</td>
            <td><strong>${p.prenom} ${p.nom}</strong></td>
            <td>${p.grade||'—'}</td>
            <td><span class="badge pres-${p.presence||'absent'}">${(p.presence||'absent').toUpperCase()}</span></td>
            <td style="font-size:.8rem;color:#666">${p.motif_absence||''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:16px;padding:12px 16px;background:#faf8f4;border:1px solid #e8e0d0;
        border-radius:6px;display:flex;gap:24px;font-size:.8rem">
        <span>✅ Présents : <strong style="color:#065f46">${presents}</strong></span>
        <span>❌ Absents : <strong style="color:#991b1b">${presences.filter(p=>p.presence==='absent').length}</strong></span>
        <span>⏰ Retards : <strong style="color:#92400e">${presences.filter(p=>p.presence==='retard').length}</strong></span>
        <span>📝 Excusés : <strong style="color:#1e40af">${presences.filter(p=>p.presence==='excuse').length}</strong></span>
        <span style="margin-left:auto">Taux : <strong>${total>0?Math.round(presents/total*100):0}%</strong></span>
      </div>
      <div class="signature-block">
        <div class="signature"><div class="sig-line">Officier de Section</div></div>
        <div class="signature"><div class="sig-line">Commandant G5C</div></div>
      </div>
    </div>
    ${FOOTER(`POINT-CER-${c.id}`)}
  </div></body></html>`;
  return generatePDF(html);
};

// ── 6. RAPPORT MENSUEL SECTION ────────────────────────────────────────────
const rapportMensuel = async (section, mois, annee, stats) => {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}</style></head><body>
  <div class="page">
    ${HEADER(`RAPPORT MENSUEL — ${section.toUpperCase()}`, `${mois} ${annee}`)}
    <div class="content">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">
        ${[
          {lbl:'Membres actifs',val:stats.membres||0,color:'#065f46'},
          {lbl:'Événements',val:stats.evenements||0,color:'#1e40af'},
          {lbl:'Taux présence',val:(stats.taux_presence||0)+'%',color:'#8B6914'},
          {lbl:'Signalements',val:stats.signalements||0,color:'#991b1b'},
        ].map(k=>`
          <div style="background:linear-gradient(135deg,rgba(201,168,76,.08),rgba(201,168,76,.02));
            border:1px solid rgba(201,168,76,.2);border-radius:10px;padding:16px;text-align:center">
            <div style="font-size:1.6rem;font-weight:700;color:${k.color};font-family:'Cinzel',serif">${k.val}</div>
            <div style="font-size:.6rem;letter-spacing:.12em;color:#666;text-transform:uppercase;margin-top:4px">${k.lbl}</div>
          </div>`).join('')}
      </div>
      ${stats.evenements_details?.length ? `
        <h2>Événements du mois</h2>
        <table><thead><tr><th>Titre</th><th>Date</th><th>Type</th><th>Présents</th></tr></thead><tbody>
        ${stats.evenements_details.map(e=>`<tr>
          <td><strong>${e.titre}</strong></td>
          <td>${new Date(e.date).toLocaleDateString('fr-FR')}</td>
          <td><span class="badge badge-gold">${e.type}</span></td>
          <td>${e.presents||0}/${e.total||0}</td>
        </tr>`).join('')}
        </tbody></table>` : ''}
      ${stats.membres_details?.length ? `
        <h2>Assiduité des membres</h2>
        <table><thead><tr><th>Soldat</th><th>Présences</th><th>Total</th><th>Taux</th></tr></thead><tbody>
        ${stats.membres_details.map(m=>`<tr>
          <td><strong>${m.prenom} ${m.nom}</strong><br><span style="font-size:.75rem;color:#666">${m.grade}</span></td>
          <td style="text-align:center;color:#065f46;font-weight:700">${m.presents}</td>
          <td style="text-align:center">${m.total}</td>
          <td><span class="badge ${m.taux>=75?'badge-green':'badge-red'}">${m.taux}%</span></td>
        </tr>`).join('')}
        </tbody></table>` : ''}
      ${stats.observations ? `
        <h2>Observations</h2>
        <div style="background:#faf8f4;border:1px solid #e8e0d0;border-radius:6px;padding:16px;line-height:1.8">
          ${stats.observations}
        </div>` : ''}
      <div class="signature-block" style="margin-top:40px">
        <div class="signature"><div class="sig-line">Responsable de Section</div></div>
        <div class="signature"><div class="sig-line">Commandant G5C</div></div>
      </div>
    </div>
    ${FOOTER(`RPT-${section.toUpperCase().replace(' ','-')}-${mois}-${annee}`)}
  </div></body></html>`;
  return generatePDF(html);
};


// ── 7. RAPPORT DE SANCTION ────────────────────────────────────────────────
const rapportSanction = async (soldat, sanction) => {
  const s = soldat; const sc = sanction;
  const sevColor = { mineure:'#1e40af', moyenne:'#92400e', grave:'#991b1b', tres_grave:'#7f1d1d' };
  const sevBg    = { mineure:'#DBEAFE', moyenne:'#FEF3C7', grave:'#FEE2E2', tres_grave:'#fee2e2' };
  const sevBorder= { mineure:'#3b82f6', moyenne:'#f59e0b', grave:'#ef4444', tres_grave:'#dc2626' };
  const sev = sc.severite||'moyenne';
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${BASE_CSS}
  .sanc-header{background:linear-gradient(135deg,${sevBg[sev]},#fff);border:2px solid ${sevBorder[sev]};
    border-radius:10px;padding:20px 24px;margin-bottom:24px;display:flex;align-items:center;gap:16px}
  </style></head><body>
  <div class="page">
    <div class="watermark">SANCTION</div>
    ${HEADER('RAPPORT DE SANCTION DISCIPLINAIRE', `Réf: SANC-${sc.id}-${new Date().getFullYear()}`)}
    <div class="content">

      <div class="sanc-header">
        <div style="font-size:2.5rem">${sev==='tres_grave'?'⛔':sev==='grave'?'🔴':sev==='moyenne'?'🟡':'🔵'}</div>
        <div style="flex:1">
          <div style="font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:${sevColor[sev]}">
            SANCTION ${sev.toUpperCase().replace('_',' ')} — ${(sc.type_sanction||'').toUpperCase()}
          </div>
          <div style="font-size:.75rem;color:#666;margin-top:4px">
            Prononcée le ${sc.date_sanction?new Date(sc.date_sanction).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}):'—'}
          </div>
        </div>
        <div style="text-align:right">
          <span style="background:${sevBg[sev]};border:1px solid ${sevBorder[sev]};color:${sevColor[sev]};
            padding:6px 16px;border-radius:20px;font-weight:700;font-size:.75rem;letter-spacing:.1em">
            ${sev.toUpperCase().replace('_',' ')}
          </span>
        </div>
      </div>

      <h2>Soldat Concerné</h2>
      <div class="field-row">
        <div class="field"><label>Nom complet</label><div class="val">${s.prenom} ${s.nom}</div></div>
        <div class="field"><label>Matricule</label><div class="val">${s.matricule||'—'}</div></div>
        <div class="field"><label>Grade</label><div class="val">${s.grade||'—'}</div></div>
        <div class="field"><label>Promotion</label><div class="val">${s.promotion||'—'}</div></div>
        ${s.section_affectation?`<div class="field sp-full"><label>Section d'affectation</label><div class="val">${s.section_affectation}</div></div>`:''}
      </div>

      <h2>Nature de la Sanction</h2>
      <div class="field-row">
        <div class="field"><label>Type de sanction</label><div class="val">${sc.type_sanction||'—'}</div></div>
        <div class="field"><label>Sévérité</label><div class="val" style="color:${sevColor[sev]};font-weight:700">${sev.toUpperCase().replace('_',' ')}</div></div>
        <div class="field"><label>Date de prononciation</label><div class="val">${sc.date_sanction?new Date(sc.date_sanction).toLocaleDateString('fr-FR'):'—'}</div></div>
        ${sc.date_fin?`<div class="field"><label>Date de fin</label><div class="val">${new Date(sc.date_fin).toLocaleDateString('fr-FR')}</div></div>`:''}
        ${sc.prononce_par_nom?`<div class="field"><label>Prononcée par</label><div class="val">${sc.prononce_par_nom}</div></div>`:''}
        <div class="field"><label>Statut</label><div class="val">${sc.statut||'en_cours'}</div></div>
      </div>

      <h2>Motif & Faits</h2>
      <div class="field" style="margin-bottom:14px">
        <label>Motif</label>
        <div style="background:#faf8f4;border:1px solid #e8e0d0;border-radius:6px;padding:12px;
          font-size:.9rem;line-height:1.7;margin-top:4px;font-weight:600;color:${sevColor[sev]}">
          ${sc.motif||'Non précisé'}
        </div>
      </div>
      ${sc.faits?`
      <div class="field">
        <label>Faits reprochés</label>
        <div style="background:#faf8f4;border:1px solid #e8e0d0;border-radius:6px;padding:12px;
          font-size:.9rem;line-height:1.8;margin-top:4px;min-height:80px">${sc.faits}</div>
      </div>`:''}

      ${sc.observations?`
      <h2>Observations</h2>
      <div style="background:#faf8f4;border:1px solid #e8e0d0;border-radius:6px;padding:14px;
        font-size:.9rem;line-height:1.8">${sc.observations}</div>`:''}

      <div style="margin-top:24px;padding:14px 18px;background:#fef9ee;border:1px solid rgba(201,168,76,.3);
        border-radius:8px;font-size:.75rem;color:#92400e;line-height:1.7">
        <strong>⚖ Note légale :</strong> Cette sanction a été prononcée conformément au règlement intérieur
        de l'Armée du G5C. Le soldat concerné a le droit de contester cette décision auprès du Commandement
        dans un délai de 7 jours à compter de la réception de ce document.
      </div>

      <div class="signature-block" style="margin-top:40px">
        <div class="signature"><div class="sig-line">Le Soldat (accusé réception)</div></div>
        <div class="signature">
          <div style="text-align:center;margin-bottom:50px;font-size:.65rem;color:#8B6914">CACHET OFFICIEL</div>
          <div class="sig-line">Le Commandant G5C</div>
        </div>
      </div>
    </div>
    ${FOOTER(`SANC-${sc.id}-${new Date().getFullYear()}`)}
  </div></body></html>`;
  return generatePDF(html);
};

module.exports = { ficheSoldat, attestationPresence, rapportSignalement, certificatDistinction, feuillePointage, rapportMensuel, rapportSanction };
