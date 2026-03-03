import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import PDFButton from '../components/PDFButton';
import SanctionAutoModal from '../components/SanctionAutoModal';
import '../styles/SoldierProfile.css';

const APTITUDE_INFO = {
  'apte':                   { label:'Apte',                   color:'#34d399', icon:'✅', bg:'rgba(52,211,153,.1)'  },
  'apte_avec_restrictions': { label:'Apte avec restrictions',  color:'#f59e0b', icon:'⚠️', bg:'rgba(245,158,11,.1)'  },
  'inapte_temporaire':      { label:'Inapte temporaire',       color:'#f87171', icon:'🔴', bg:'rgba(248,113,113,.1)' },
  'inapte_definitif':       { label:'Inapte définitif',        color:'#ef4444', icon:'⛔', bg:'rgba(239,68,68,.1)'   },
};
const SEVERITE_COLOR = { mineure:'#60a5fa', moyenne:'#f59e0b', grave:'#f87171', tres_grave:'#ef4444' };
const STATUT_FORM_COLOR = { validee:'#34d399', en_cours:'#60a5fa', echouee:'#ef4444', abandonnee:'#94a3b8' };
const MENTION_COLOR = { 'Très bien':'#34d399','Bien':'#60a5fa','Assez bien':'#a78bfa','Passable':'#f59e0b','Insuffisant':'#ef4444','Redoublant':'#f97316' };

const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const InfoItem = ({label, value, mono=false, full=false}) => value ? (
  <div className={`sp-info-item${full?' sp-full':''}`}>
    <span className="sp-info-label">{label}</span>
    <span className={`sp-info-val${mono?' sp-mono':''}`}>{value}</span>
  </div>
) : null;

export default function SoldierProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [soldier,      setSoldier]      = useState(null);
  const [sanctions,    setSanctions]    = useState([]);
  const [distinctions, setDistinctions] = useState([]);
  const [presences,    setPresences]    = useState(null);
  const [aptitude,     setAptitude]     = useState(null);
  const [aptHist,      setAptHist]      = useState([]);
  const [mensuration,  setMensuration]  = useState(null);
  const [formations,   setFormations]   = useState([]);
  const [fiches,       setFiches]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [statutCampus, setstatutCampus] = useState(null);
  const [histCampus,   setHistCampus]   = useState([]);
  const [showScModal,  setShowScModal]  = useState(false);
  const [scForm,       setScForm]       = useState({statut_campus:'actif',motif:'',date_retour_prevue:''});
  const [scSaving,     setScSaving]     = useState(false);
  const [activeTab,    setActiveTab]    = useState('overview');
  const [sanctionModal, setSanctionModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [solR, sanctR, distR, presR, aptR, aptHR, mensR, formR, ficheR] = await Promise.all([
        api.get(`/soldiers/${id}`),
        api.get(`/sanctions/soldat/${id}`).catch(()=>({data:{data:[]}})),
        api.get(`/distinctions/soldat/${id}`).catch(()=>({data:{data:[]}})),
        api.get(`/presences/soldat/${id}`).catch(()=>({data:{data:null}})),
        api.get(`/aptitudes/soldat/${id}`).catch(()=>({data:{data:null}})),
        api.get(`/aptitudes/soldat/${id}/historique`).catch(()=>({data:{data:[]}})),
        api.get(`/mensurations/soldat/${id}`).catch(()=>({data:{data:null}})),
        api.get(`/dcsp/formations`).catch(()=>({data:{data:[]}})),
        api.get(`/dcsp/fiches`).catch(()=>({data:{data:[]}})),
      ]);
      setSoldier(solR.data.data);
      setSanctions(sanctR.data.data||[]);
      setDistinctions(distR.data.data||[]);
      setPresences(presR.data.data);
      setAptitude(aptR.data.data);
      setAptHist(aptHR.data.data||[]);
      setMensuration(mensR.data.data);
      setFormations((formR.data.data||[]).filter(f=>f.soldier_id===parseInt(id)));
      setFiches((ficheR.data.data||[]).filter(f=>f.soldier_id===parseInt(id)));
      // Statut campus
      const [scR, scSol] = await Promise.all([
        api.get(`/statuts-campus/${id}/historique`).catch(()=>({data:{data:[]}})),
        api.get(`/statuts-campus`).catch(()=>({data:{data:[]}})),
      ]);
      const scData = (scSol.data.data||[]).find(s=>s.id===parseInt(id));
      setstatutCampus(scData||null);
      setHistCampus(scR.data.data||[]);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [id]);

  useEffect(()=>{ load(); },[load]);

  if (loading) return (
    <div className="sp-loading">
      <div className="sp-spinner"/>
      <p>Chargement de la fiche…</p>
    </div>
  );

  if (!soldier) return (
    <div className="sp-loading">
      <p style={{color:'#ef4444'}}>Soldat introuvable</p>
      <button className="sp-back-btn" onClick={()=>navigate('/soldats')}>← Retour</button>
    </div>
  );

  const apt = aptitude ? (APTITUDE_INFO[aptitude.aptitude_generale]||APTITUDE_INFO.apte) : null;
  const tauxPresence = presences?.taux_presence ?? null;

  const residence = soldier.village === 'Hors campus'
    ? (soldier.adresse||'Hors campus')
    : soldier.village
      ? `Village ${soldier.village}${soldier.pavillon?' · '+soldier.pavillon:''}${soldier.batiment?' · '+soldier.batiment:''}${soldier.numero_chambre?' · Ch.'+soldier.numero_chambre:''}`
      : null;

  const TABS = [
    { key:'overview',      label:'📋 Vue d\'ensemble' },
    { key:'distinctions',  label:`🎖️ Distinctions (${distinctions.length})` },
    { key:'sanctions',     label:`⚠️ Sanctions (${sanctions.length})` },
    { key:'presences',     label:'📅 Présences' },
    { key:'medical',       label:`🏥 Médical (${aptHist.length})` },
    { key:'formations',    label:`📚 Formations (${formations.length})` },
    { key:'academique',    label:`📄 Académique (${fiches.length})` },
    { key:'mensurations',  label:'📏 Mensurations' },
  ];

  return (
    <div className="sp-page">

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:10}}>
        <button className="sp-back-btn" style={{margin:0}} onClick={()=>navigate('/soldats')}>← Retour aux effectifs</button>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <PDFButton url={`/pdf/fiche-soldat/${id}`}    filename={`fiche-${soldier?.matricule}.pdf`}    label="Fiche soldat"      variant="gold"   size="sm"/>
          <PDFButton url={`/pdf/attestation/${id}`}     filename={`attestation-${soldier?.matricule}.pdf`} label="Attestation présence" variant="blue" size="sm"/>
        </div>
      </div>

      {/* ══ HERO ══ */}
      <div className={`sp-hero banner-${soldier.statut}`}>
        <div className="sp-hero-inner">

          {/* Avatar */}
          <div className="sp-avatar-wrap">
            {soldier.photo_url
              ? <img src={soldier.photo_url} alt="" className="sp-avatar-img"/>
              : <div className="sp-avatar-initials">{soldier.prenom?.[0]}{soldier.nom?.[0]}</div>}
            <div className={`sp-statut-dot dot-${soldier.statut}`}/>
          </div>

          {/* Identité */}
          <div className="sp-hero-info">
            <div className="sp-hero-grade">
              {soldier.grade}
              {soldier.haut_commandement && <span className="sp-hc-star">⭐ HAUT COMMANDEMENT</span>}
            </div>
            <h1 className="sp-hero-name">{soldier.prenom} {soldier.nom}</h1>
            {soldier.alias && <div className="sp-hero-alias">« {soldier.alias} »</div>}
            <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:8,alignItems:'center'}}>
              {soldier.fonction && (
                <span style={{fontSize:'.75rem',fontWeight:600,color:'#a78bfa',background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',borderRadius:6,padding:'3px 10px'}}>
                  {soldier.fonction}
                </span>
              )}
              {soldier.section_affectation && (
                <span style={{fontSize:'.72rem',fontWeight:600,color:'#f59e0b',background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.2)',borderRadius:6,padding:'3px 10px'}}>
                  🏛️ {soldier.section_affectation.split('—')[0].trim()}
                </span>
              )}
              <span className={`sp-statut-badge badge-${soldier.statut}`}>{soldier.statut}</span>
            </div>
            <div className="sp-hero-meta" style={{marginTop:6}}>
              <span className="sp-hero-matricule">{soldier.matricule}</span>
              <span>·</span>
              <span>Promotion {soldier.promotion}</span>
              {soldier.unite && <><span>·</span><span>{soldier.unite}</span></>}
            </div>
          </div>

          {/* KPIs */}
          <div className="sp-hero-kpis">
            <div className="sp-kpi">
              <div className="sp-kpi-val" style={{color:'#fbbf24'}}>{distinctions.length}</div>
              <div className="sp-kpi-label">Distinctions</div>
            </div>
            <div className="sp-kpi">
              <div className="sp-kpi-val" style={{color:sanctions.length>0?'#f87171':'#34d399'}}>{sanctions.length}</div>
              <div className="sp-kpi-label">Sanctions</div>
            </div>
            <div className="sp-kpi">
              <div className="sp-kpi-val" style={{color:'#60a5fa'}}>
                {tauxPresence!==null?`${tauxPresence}%`:'—'}
              </div>
              <div className="sp-kpi-label">Présence</div>
            </div>
            <div className="sp-kpi">
              <div className="sp-kpi-val" style={{color:apt?apt.color:'#94a3b8'}}>{apt?apt.icon:'—'}</div>
              <div className="sp-kpi-label">Aptitude</div>
            </div>
            <div className="sp-kpi">
              <div className="sp-kpi-val" style={{color:'#a78bfa'}}>{formations.length}</div>
              <div className="sp-kpi-label">Formations</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ TABS ══ */}
      <div className="sp-tabs">
        {TABS.map(t=>(
          <button key={t.key} className={`sp-tab ${activeTab===t.key?'active':''}`}
            onClick={()=>setActiveTab(t.key)}>{t.label}
          </button>
        ))}
      </div>

      <div className="sp-content">

        {/* ════ VUE D'ENSEMBLE ════ */}
        {activeTab==='overview' && (
          <div className="sp-overview">

            <div className="sp-section-card">
              <div className="sp-section-title">👤 Informations personnelles</div>
              <div className="sp-info-grid">
                <InfoItem label="Nom complet"        value={`${soldier.prenom} ${soldier.nom}`}/>
                <InfoItem label="Alias"              value={soldier.alias ? `« ${soldier.alias} »` : null}/>
                <InfoItem label="Grade"              value={soldier.grade}/>
                <InfoItem label="Promotion"          value={soldier.promotion}/>
                <InfoItem label="Matricule"          value={soldier.matricule} mono/>
                <InfoItem label="Date d'intégration" value={fmt(soldier.date_integration)}/>
                <InfoItem label="Date de naissance"  value={fmt(soldier.date_naissance)}/>
                <InfoItem label="Lieu de naissance"  value={soldier.lieu_naissance}/>
                <InfoItem label="Statut"             value={soldier.statut}/>
              </div>
            </div>

            {/* Section affectation */}
            {(soldier.section_affectation||soldier.fonction) && (
              <div className="sp-section-card" style={{borderColor:'rgba(245,158,11,.15)'}}>
                <div className="sp-section-title" style={{color:'#f59e0b'}}>🏛️ Affectation au QG</div>
                <div className="sp-info-grid">
                  <InfoItem label="Section"  value={soldier.section_affectation} full/>
                  <InfoItem label="Fonction" value={soldier.fonction}/>
                  <InfoItem label="Unité"    value={soldier.unite}/>
                  {soldier.haut_commandement && (
                    <div className="sp-info-item sp-full">
                      <span style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.25)',borderRadius:8,padding:'6px 14px',color:'#fbbf24',fontSize:'.78rem',fontWeight:700}}>
                        ⭐ Membre du Haut Commandement
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── STATUT CAMPUS ── */}
            <div className="sp-section-card" style={{borderColor:'rgba(96,165,250,.15)'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div className="sp-section-title" style={{color:'#60a5fa',margin:0}}>🏕️ Statut Campus</div>
                <button onClick={()=>{
                  setScForm({
                    statut_campus: statutCampus?.statut_campus||'actif',
                    motif: statutCampus?.motif_absence_campus||'',
                    date_retour_prevue: statutCampus?.date_retour_prevue
                      ? new Date(statutCampus.date_retour_prevue).toISOString().slice(0,10) : '',
                  });
                  setShowScModal(true);
                }} style={{background:'rgba(96,165,250,.08)',border:'1px solid rgba(96,165,250,.25)',
                  color:'#60a5fa',borderRadius:7,padding:'6px 14px',cursor:'pointer',fontSize:'.68rem',fontWeight:700}}>
                  ✎ Modifier
                </button>
              </div>
              {(()=>{
                const cfg = {
                  actif:             { label:'Actif sur campus',  icon:'✅', color:'#34d399', bg:'rgba(52,211,153,.1)'  },
                  absent_temporaire: { label:'Absent temporaire', icon:'⏳', color:'#f59e0b', bg:'rgba(245,158,11,.1)'  },
                  inactif:           { label:'Inactif',           icon:'⛔', color:'#ef4444', bg:'rgba(239,68,68,.1)'   },
                };
                const sc = statutCampus?.statut_campus||'actif';
                const c = cfg[sc]||cfg.actif;
                return (
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <span style={{fontSize:'1.6rem'}}>{c.icon}</span>
                      <div>
                        <span style={{display:'inline-flex',alignItems:'center',gap:6,
                          background:c.bg,border:`1px solid ${c.color}40`,
                          borderRadius:20,padding:'5px 14px',color:c.color,fontWeight:700,fontSize:'.82rem'}}>
                          {c.label}
                        </span>
                        {statutCampus?.motif_absence_campus&&(
                          <div style={{fontSize:'.7rem',color:'var(--text-muted)',marginTop:5}}>
                            📝 {statutCampus.motif_absence_campus}
                          </div>
                        )}
                        {statutCampus?.date_retour_prevue&&(
                          <div style={{fontSize:'.7rem',color:'#f59e0b',marginTop:3}}>
                            📅 Retour prévu : {new Date(statutCampus.date_retour_prevue).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Mini historique */}
                    {histCampus.length>0&&(
                      <div style={{borderTop:'1px solid var(--border-color)',paddingTop:10}}>
                        <div style={{fontSize:'.58rem',letterSpacing:'.15em',color:'var(--text-muted)',textTransform:'uppercase',marginBottom:8}}>
                          Historique ({histCampus.length} changement{histCampus.length>1?'s':''})
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:5}}>
                          {histCampus.slice(0,3).map((h,i)=>{
                            const av=cfg[h.ancien_statut];const nv=cfg[h.nouveau_statut];
                            return(
                              <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:'.68rem',color:'var(--text-muted)'}}>
                                <div style={{width:7,height:7,borderRadius:'50%',background:nv?.color||'#94a3b8',flexShrink:0}}/>
                                {av&&<span style={{color:av.color}}>{av.icon} {av.label}</span>}
                                <span>→</span>
                                <span style={{color:nv?.color,fontWeight:600}}>{nv?.icon} {nv?.label}</span>
                                <span style={{marginLeft:'auto'}}>{new Date(h.created_at).toLocaleDateString('fr-FR')}</span>
                                {h.modifie_par&&<span>· {h.modifie_par}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal changement statut campus */}
            {showScModal&&(
              <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.75)',backdropFilter:'blur(6px)',
                zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
                onClick={e=>e.target===e.currentTarget&&setShowScModal(false)}>
                <div style={{background:'var(--bg-panel)',border:'1px solid rgba(96,165,250,.25)',borderRadius:16,
                  width:'100%',maxWidth:440,boxShadow:'0 24px 80px rgba(0,0,0,.6)',overflow:'hidden'}}>
                  <div style={{padding:'16px 20px',borderBottom:'1px solid var(--border-color)',display:'flex',
                    justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontWeight:700,color:'var(--text-primary)'}}>🏕️ Modifier le statut campus</span>
                    <button onClick={()=>setShowScModal(false)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:'1.1rem'}}>✕</button>
                  </div>
                  <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:14}}>
                    <div style={{display:'flex',gap:8}}>
                      {Object.entries({
                        actif:             { label:'Actif',            icon:'✅', color:'#34d399', bg:'rgba(52,211,153,.1)'  },
                        absent_temporaire: { label:'Absent temporaire',icon:'⏳', color:'#f59e0b', bg:'rgba(245,158,11,.1)'  },
                        inactif:           { label:'Inactif',          icon:'⛔', color:'#ef4444', bg:'rgba(239,68,68,.1)'   },
                      }).map(([k,v])=>(
                        <button key={k} onClick={()=>setScForm(f=>({...f,statut_campus:k}))}
                          style={{flex:1,padding:'9px 4px',borderRadius:8,cursor:'pointer',fontSize:'.68rem',fontWeight:700,
                            border:`1px solid ${v.color}55`,transition:'all .2s',
                            background:scForm.statut_campus===k?v.color:v.bg,
                            color:scForm.statut_campus===k?'#0a0b0d':v.color}}>
                          {v.icon} {v.label}
                        </button>
                      ))}
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:5}}>
                      <label style={{fontSize:'.6rem',letterSpacing:'.15em',color:'var(--text-muted)',textTransform:'uppercase'}}>Motif</label>
                      <textarea rows={2} value={scForm.motif} onChange={e=>setScForm(f=>({...f,motif:e.target.value}))}
                        placeholder="Raison du changement…"
                        style={{background:'var(--bg-hover)',border:'1px solid var(--border-color)',borderRadius:8,
                          padding:'9px 12px',color:'var(--text-primary)',fontSize:'.78rem',outline:'none',
                          fontFamily:'inherit',resize:'vertical'}}/>
                    </div>
                    {scForm.statut_campus==='absent_temporaire'&&(
                      <div style={{display:'flex',flexDirection:'column',gap:5}}>
                        <label style={{fontSize:'.6rem',letterSpacing:'.15em',color:'var(--text-muted)',textTransform:'uppercase'}}>Date de retour prévue</label>
                        <input type="date" value={scForm.date_retour_prevue}
                          onChange={e=>setScForm(f=>({...f,date_retour_prevue:e.target.value}))}
                          style={{background:'var(--bg-hover)',border:'1px solid var(--border-color)',borderRadius:8,
                            padding:'9px 12px',color:'var(--text-primary)',fontSize:'.78rem',outline:'none'}}/>
                      </div>
                    )}
                  </div>
                  <div style={{padding:'12px 20px',borderTop:'1px solid var(--border-color)',display:'flex',gap:10,justifyContent:'flex-end'}}>
                    <button onClick={()=>setShowScModal(false)}
                      style={{background:'var(--bg-hover)',border:'1px solid var(--border-color)',borderRadius:8,
                        color:'var(--text-muted)',cursor:'pointer',fontSize:'.7rem',padding:'9px 16px'}}>Annuler</button>
                    <button disabled={scSaving} onClick={async()=>{
                      setScSaving(true);
                      try{
                        await api.put(`/statuts-campus/${id}`, scForm);
                        setShowScModal(false);
                        load();
                      }catch(e){console.error(e);}
                      setScSaving(false);
                    }} style={{background:'linear-gradient(135deg,#60a5fa,#3b82f6)',border:'none',borderRadius:8,
                      color:'#fff',fontWeight:700,fontSize:'.7rem',padding:'9px 20px',cursor:'pointer'}}>
                      {scSaving?'…':'✓ Confirmer'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="sp-section-card">
              <div className="sp-section-title">🎓 Scolarité</div>
              <div className="sp-info-grid">
                <InfoItem label="UFR"             value={soldier.ufr} full/>
                <InfoItem label="Département"     value={soldier.departement}/>
                <InfoItem label="Filière"         value={soldier.filiere}/>
                <InfoItem label="Spécialité"      value={soldier.specialite}/>
                <InfoItem label="Niveau"          value={soldier.annee_etude}/>
                <InfoItem label="Code étudiant"   value={soldier.matricule_etudiant} mono/>
              </div>
            </div>

            <div className="sp-section-card">
              <div className="sp-section-title">📞 Contact & Résidence</div>
              <div className="sp-info-grid">
                <InfoItem label="Téléphone" value={soldier.telephone}/>
                <InfoItem label="Email"     value={soldier.email}/>
                <InfoItem label="Résidence" value={residence} full/>
              </div>
            </div>

            <div className="sp-row-2">
              <div className="sp-section-card">
                <div className="sp-section-title">🏥 Aptitude actuelle</div>
                {apt ? (
                  <div className="sp-apt-current" style={{borderColor:apt.color+'44',background:apt.bg}}>
                    <div className="sp-apt-icon">{apt.icon}</div>
                    <div>
                      <div className="sp-apt-label" style={{color:apt.color}}>{apt.label}</div>
                      {aptitude.date_visite&&<div className="sp-apt-date">Dernière visite : {fmt(aptitude.date_visite)}</div>}
                      {aptitude.medecin_nom&&<div className="sp-apt-date">Dr. {aptitude.medecin_nom}</div>}
                    </div>
                  </div>
                ) : <div className="sp-empty-small">Aucune évaluation médicale</div>}
              </div>

              <div className="sp-section-card">
                <div className="sp-section-title">📏 Mensurations</div>
                {mensuration ? (
                  <div className="sp-mens-grid">
                    {mensuration.taille_cm&&<div className="sp-mens-item"><span>{mensuration.taille_cm} cm</span><span>Taille</span></div>}
                    {mensuration.poids_kg&&<div className="sp-mens-item"><span>{mensuration.poids_kg} kg</span><span>Poids</span></div>}
                    {mensuration.pointure&&<div className="sp-mens-item"><span>{mensuration.pointure}</span><span>Pointure</span></div>}
                    {mensuration.taille_haut&&<div className="sp-mens-item"><span>{mensuration.taille_haut}</span><span>Uniforme haut</span></div>}
                    {mensuration.taille_pantalon&&<div className="sp-mens-item"><span>{mensuration.taille_pantalon}</span><span>Pantalon</span></div>}
                  </div>
                ) : <div className="sp-empty-small">Aucune mensuration</div>}
              </div>
            </div>

            {/* Aperçu formations */}
            {formations.length > 0 && (
              <div className="sp-section-card">
                <div className="sp-section-title">📚 Formations récentes</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {formations.slice(0,3).map(f=>(
                    <div key={f.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'rgba(255,255,255,.025)',borderRadius:10,border:'1px solid rgba(255,255,255,.07)'}}>
                      <div style={{fontSize:'1.2rem',width:36,height:36,background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        {{initiale:'🎓',continue:'📚',specialisation:'🔬',perfectionnement:'⚡',autre:'📋'}[f.type_formation]||'📋'}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:'.82rem',fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.intitule}</div>
                        <div style={{fontSize:'.65rem',color:'var(--text-muted)',marginTop:2}}>{fmt(f.date_debut)}{f.organisme?` · ${f.organisme}`:''}</div>
                      </div>
                      {f.note_finale&&<span style={{fontFamily:"'Cinzel',serif",fontSize:'.82rem',fontWeight:700,color:f.note_finale/f.note_sur>=0.7?'#34d399':f.note_finale/f.note_sur>=0.5?'#f59e0b':'#ef4444'}}>{f.note_finale}/{f.note_sur}</span>}
                      <span style={{fontSize:'.62rem',padding:'3px 8px',borderRadius:5,fontWeight:700,background:STATUT_FORM_COLOR[f.statut]+'18',color:STATUT_FORM_COLOR[f.statut]||'#94a3b8',border:`1px solid ${STATUT_FORM_COLOR[f.statut]||'#94a3b8'}30`}}>
                        {{en_cours:'En cours',validee:'Validée',echouee:'Échouée',abandonnee:'Abandonnée'}[f.statut]||f.statut}
                      </span>
                    </div>
                  ))}
                  {formations.length>3&&<button onClick={()=>setActiveTab('formations')} style={{background:'none',border:'none',color:'#a78bfa',cursor:'pointer',fontSize:'.75rem',textAlign:'left',padding:'4px 0'}}>Voir toutes les formations ({formations.length}) →</button>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ DISTINCTIONS ════ */}
        {activeTab==='distinctions' && (
          <div className="sp-list-section">
            {distinctions.length===0
              ? <div className="sp-empty"><span>🎖️</span><p>Aucune distinction</p></div>
              : distinctions.map(d=>(
                <div key={d.id} className="sp-dist-card">
                  <div className="sp-dist-icon">🎖️</div>
                  <div className="sp-dist-info">
                    <div className="sp-dist-type">{d.type_distinction}</div>
                    {d.intitule&&<div className="sp-dist-intitule">{d.intitule}</div>}
                    {d.motif&&<div className="sp-dist-motif">{d.motif}</div>}
                    <div className="sp-dist-meta">
                      📅 {fmt(d.date_distinction)}
                      {d.lieu_ceremonie&&` · 📍 ${d.lieu_ceremonie}`}
                      {d.remise_par&&` · remis par ${d.remise_par}`}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ════ SANCTIONS ════ */}
        {activeTab==='sanctions' && (
          <div className="sp-list-section">
            {sanctions.length===0
              ? <div className="sp-empty"><span>✅</span><p>Aucune sanction enregistrée</p></div>
              : sanctions.map(s=>(
                <div key={s.id} className="sp-sanc-card" style={{borderLeft:`4px solid ${SEVERITE_COLOR[s.severite]||'#94a3b8'}`}}>
                  <div className="sp-sanc-header">
                    <span className="sp-sanc-type">{s.type_sanction}</span>
                    <span className="sp-sanc-sev" style={{color:SEVERITE_COLOR[s.severite],background:SEVERITE_COLOR[s.severite]+'22',border:`1px solid ${SEVERITE_COLOR[s.severite]}44`}}>{s.severite}</span>
                    <span className="sp-sanc-date">{fmt(s.date_sanction)}</span>
                  </div>
                  <div className="sp-sanc-motif">{s.motif}</div>
                  {s.faits&&<div className="sp-sanc-faits">{s.faits}</div>}
                  {s.statut&&<div className="sp-sanc-statut">Statut : {s.statut}</div>}
                  <div style={{marginTop:8}}>
                    <PDFButton url={`/pdf/sanction/${s.id}`} filename={`rapport-sanction-${s.id}.pdf`} label="Rapport PDF" variant="red" size="sm"/>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* ════ PRÉSENCES ════ */}
        {activeTab==='presences' && (
          <div className="sp-list-section">
            {!presences
              ? <div className="sp-empty"><span>📅</span><p>Aucune donnée de présence</p></div>
              : <div className="sp-pres-stats">
                  {[
                    {val:presences.total_presences||0, label:'Présences',    color:'#34d399'},
                    {val:presences.total_absences||0,  label:'Absences',     color:'#ef4444'},
                    {val:`${presences.taux_presence||0}%`, label:'Taux', color:'#C9A84C'},
                  ].map((k,i)=>(
                    <div key={i} className="sp-pres-kpi" style={{borderColor:k.color}}>
                      <div className="sp-pres-val" style={{color:k.color}}>{k.val}</div>
                      <div className="sp-pres-label">{k.label}</div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ════ MÉDICAL ════ */}
        {activeTab==='medical' && (
          <div className="sp-list-section">
            {aptHist.length===0
              ? <div className="sp-empty"><span>🏥</span><p>Aucun historique médical</p></div>
              : <div className="sp-timeline">
                  {aptHist.map((h,i)=>{
                    const info=APTITUDE_INFO[h.aptitude_generale]||APTITUDE_INFO.apte;
                    return (
                      <div key={h.id} className="sp-timeline-item">
                        <div className="sp-timeline-dot" style={{background:info.color,borderColor:info.color}}>
                          {i===0&&<div className="sp-timeline-pulse" style={{background:info.color+'33'}}/>}
                        </div>
                        <div className="sp-timeline-content">
                          <div className="sp-timeline-header">
                            <span className="sp-apt-badge" style={{color:info.color,background:info.bg,border:`1px solid ${info.color}44`}}>{info.icon} {info.label}</span>
                            {i===0&&<span className="sp-current-tag">● EN COURS</span>}
                            <span className="sp-timeline-date">{fmt(h.date_visite)}</span>
                          </div>
                          {h.observations&&<div className="sp-detail-row"><b>Observations :</b> {h.observations}</div>}
                          {h.recommandations&&<div className="sp-detail-row"><b>Recommandations :</b> {h.recommandations}</div>}
                          <div className="sp-timeline-footer">
                            {h.date_prochaine_visite&&<span>🔜 Prochaine : {fmt(h.date_prochaine_visite)}</span>}
                            {h.medecin_nom&&<span>👨‍⚕️ {h.medecin_nom}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {/* ════ FORMATIONS ════ */}
        {activeTab==='formations' && (
          <div className="sp-list-section">
            {formations.length===0
              ? <div className="sp-empty"><span>📚</span><p>Aucune formation enregistrée</p></div>
              : <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {formations.map(f=>{
                    const sc=STATUT_FORM_COLOR[f.statut]||'#94a3b8';
                    const statLabel={en_cours:'En cours',validee:'Validée',echouee:'Échouée',abandonnee:'Abandonnée'}[f.statut]||f.statut;
                    return (
                      <div key={f.id} style={{background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'18px 20px',transition:'all .2s'}}>
                        <div style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:12}}>
                          <div style={{fontSize:'1.4rem',width:44,height:44,background:'rgba(167,139,250,.1)',border:'1px solid rgba(167,139,250,.2)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            {{initiale:'🎓',continue:'📚',specialisation:'🔬',perfectionnement:'⚡',autre:'📋'}[f.type_formation]||'📋'}
                          </div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:'.9rem',fontWeight:700,color:'var(--text-primary)',marginBottom:4}}>{f.intitule}</div>
                            <div style={{display:'flex',flexWrap:'wrap',gap:8,alignItems:'center'}}>
                              <span style={{fontSize:'.68rem',padding:'2px 8px',borderRadius:5,background:`${sc}18`,color:sc,border:`1px solid ${sc}30`,fontWeight:700}}>{statLabel}</span>
                              {f.certificat_obtenu&&<span style={{fontSize:'.65rem',padding:'2px 8px',borderRadius:5,background:'rgba(234,179,8,.1)',color:'#eab308',border:'1px solid rgba(234,179,8,.2)',fontWeight:700}}>🏅 Certifié</span>}
                              {f.domaine&&<span style={{fontSize:'.65rem',color:'var(--text-muted)',padding:'2px 8px',borderRadius:5,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)'}}>{f.domaine}</span>}
                            </div>
                          </div>
                          {f.note_finale&&(
                            <div style={{textAlign:'center',flexShrink:0}}>
                              <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.3rem',fontWeight:900,color:f.note_finale/f.note_sur>=0.7?'#34d399':f.note_finale/f.note_sur>=0.5?'#f59e0b':'#ef4444'}}>{f.note_finale}</div>
                              <div style={{fontSize:'.55rem',color:'var(--text-muted)',letterSpacing:'.1em'}}>/{f.note_sur}</div>
                            </div>
                          )}
                        </div>
                        <div style={{display:'flex',gap:20,flexWrap:'wrap',fontSize:'.72rem',color:'var(--text-muted)',paddingTop:10,borderTop:'1px solid rgba(255,255,255,.05)'}}>
                          <span>📅 {fmt(f.date_debut)}{f.date_fin?` → ${fmt(f.date_fin)}`:''}</span>
                          {f.duree_heures&&<span>⏱️ {f.duree_heures}h</span>}
                          {f.organisme&&<span>🏛️ {f.organisme}</span>}
                          {f.formateur&&<span>👨‍🏫 {f.formateur}</span>}
                          {f.lieu&&<span>📍 {f.lieu}</span>}
                          {f.numero_certificat&&<span>🏅 N° {f.numero_certificat}</span>}
                        </div>
                        {f.description&&<div style={{marginTop:10,fontSize:'.75rem',color:'var(--text-secondary)',lineHeight:1.6,fontStyle:'italic'}}>{f.description}</div>}
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {/* ════ ACADÉMIQUE ════ */}
        {activeTab==='academique' && (
          <div className="sp-list-section">
            {fiches.length===0
              ? <div className="sp-empty"><span>📄</span><p>Aucune fiche académique enregistrée</p></div>
              : <div style={{display:'flex',flexDirection:'column',gap:12}}>
                  {fiches.map(f=>{
                    const mColor=MENTION_COLOR[f.mention]||'var(--text-muted)';
                    const statutLabel={en_cours:'En cours',valide:'Validé',redoublant:'Redoublant',abandonne:'Abandonné'}[f.statut]||f.statut;
                    return (
                      <div key={f.id} style={{background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:'20px',display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
                        <div style={{flex:1,minWidth:200}}>
                          <div style={{fontSize:'.95rem',fontWeight:700,color:'var(--text-primary)',marginBottom:6}}>
                            Année académique {f.annee_academique}
                          </div>
                          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                            <span style={{fontSize:'.7rem',padding:'3px 10px',borderRadius:6,background:'rgba(167,139,250,.1)',color:'#a78bfa',border:'1px solid rgba(167,139,250,.2)',fontWeight:700}}>{statutLabel}</span>
                            {f.mention&&<span style={{fontSize:'.7rem',padding:'3px 10px',borderRadius:6,background:`${mColor}15`,color:mColor,border:`1px solid ${mColor}30`,fontWeight:700}}>{f.mention}</span>}
                          </div>
                          {f.observations&&<div style={{marginTop:8,fontSize:'.72rem',color:'var(--text-muted)',fontStyle:'italic'}}>{f.observations}</div>}
                        </div>
                        {f.moyenne_annuelle&&(
                          <div style={{textAlign:'center',flexShrink:0}}>
                            <div style={{fontFamily:"'Cinzel',serif",fontSize:'2rem',fontWeight:900,color:f.moyenne_annuelle>=10?'#34d399':'#ef4444',lineHeight:1}}>{f.moyenne_annuelle}</div>
                            <div style={{fontSize:'.6rem',color:'var(--text-muted)',letterSpacing:'.12em',marginTop:3}}>MOYENNE /20</div>
                          </div>
                        )}
                        <div style={{display:'flex',gap:8,flexShrink:0}}>
                          {f.has_releve&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                            <div style={{background:'rgba(96,165,250,.1)',border:'1px solid rgba(96,165,250,.25)',borderRadius:8,padding:'8px 12px',color:'#60a5fa',fontSize:'.7rem',fontWeight:700,textAlign:'center'}}>📄<br/>Relevé</div>
                          </div>}
                          {f.has_attestation&&<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                            <div style={{background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.25)',borderRadius:8,padding:'8px 12px',color:'#34d399',fontSize:'.7rem',fontWeight:700,textAlign:'center'}}>📜<br/>Attestation</div>
                          </div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}

        {/* ════ MENSURATIONS ════ */}
        {activeTab==='mensurations' && (
          <div className="sp-list-section">
            {!mensuration
              ? <div className="sp-empty"><span>📏</span><p>Aucune mensuration enregistrée</p></div>
              : <div className="sp-section-card">
                  <div className="sp-section-title">📏 Mensurations — {fmt(mensuration.date_mesure)}</div>
                  <div className="sp-mens-full-grid">
                    {[
                      {v:mensuration.taille_cm,       l:'Taille (cm)'},
                      {v:mensuration.poids_kg,        l:'Poids (kg)'},
                      {v:mensuration.pointure,        l:'Pointure'},
                      {v:mensuration.taille_haut,     l:'Uniforme haut'},
                      {v:mensuration.taille_pantalon, l:'Pantalon'},
                      {v:mensuration.tour_poitrine_cm,l:'Tour poitrine'},
                      {v:mensuration.tour_taille_cm,  l:'Tour taille'},
                      {v:mensuration.tour_hanches_cm, l:'Tour hanches'},
                      {v:mensuration.longueur_bras_cm,l:'Longueur bras'},
                      {v:mensuration.longueur_jambe_cm,l:'Longueur jambe'},
                    ].filter(m=>m.v).map((m,i)=>(
                      <div key={i} className="sp-mens-big"><span>{m.v}</span><span>{m.l}</span></div>
                    ))}
                  </div>
                  {mensuration.remarques&&<div className="sp-detail-row" style={{marginTop:12}}><b>Remarques :</b> {mensuration.remarques}</div>}
                </div>
            }
          </div>
        )}

      </div>
    {sanctionModal && soldier && (
      <SanctionAutoModal
        soldier={soldier}
        onClose={()=>setSanctionModal(false)}
        onSuccess={()=>{ setSanctionModal(false); load(); }}
      />
    )}
    </div>
  );
}
