import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import api from '../utils/api';
import '../styles/StatutsCampus.css';

const STATUT_CFG = {
  actif:             { label:'Actif',             icon:'✅', color:'#34d399', bg:'rgba(52,211,153,.1)'  },
  absent_temporaire: { label:'Absent temporaire', icon:'⏳', color:'#f59e0b', bg:'rgba(245,158,11,.1)'  },
  inactif:           { label:'Inactif',           icon:'⛔', color:'#ef4444', bg:'rgba(239,68,68,.1)'   },
};

const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtRel  = d => {
  if(!d) return null;
  const diff = Math.floor((Date.now()-new Date(d))/(1000*60*60*24));
  if(diff===0) return "aujourd'hui";
  if(diff===1) return "hier";
  return `il y a ${diff} jours`;
};

const Av = ({p,size=38,color='#34d399'}) => {
  const st={width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,
    background:`${color}18`,border:`1.5px solid ${color}40`,display:'flex',
    alignItems:'center',justifyContent:'center',fontSize:size*.28,fontWeight:700,color};
  if(p?.photo_url?.startsWith('data:'))
    return <div style={st}><img src={p.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>;
  return <div style={st}>{p?.prenom?.[0]}{p?.nom?.[0]}</div>;
};

const Toast = ({msg,onDone}) => {
  useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t);},[onDone]);
  return <div className="sc-toast">{msg}</div>;
};

/* ══ MODAL CHANGEMENT STATUT ════════════════════════════════════════════════ */
const ModalStatut = ({soldier, onClose, onDone}) => {
  const [form, setForm] = useState({
    statut_campus: soldier.statut_campus || 'actif',
    motif: soldier.motif_absence_campus || '',
    date_retour_prevue: soldier.date_retour_prevue
      ? new Date(soldier.date_retour_prevue).toISOString().slice(0,10) : '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/statuts-campus/${soldier.id}`, form);
      onDone(); onClose();
    } catch(e) { alert(e.response?.data?.error||'Erreur'); setSaving(false); }
  };

  return (
    <div className="sc-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sc-modal">
        <div className="sc-modal-header">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <Av p={soldier} size={40}/>
            <div>
              <div style={{fontWeight:700,color:'var(--text-primary)'}}>{soldier.prenom} {soldier.nom}</div>
              <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{soldier.grade} · {soldier.matricule}</div>
            </div>
          </div>
          <button className="sc-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sc-modal-body">
          {/* Sélecteur statut */}
          <div style={{display:'flex',gap:8,marginBottom:4}}>
            {Object.entries(STATUT_CFG).map(([k,v])=>(
              <button key={k} onClick={()=>setForm(f=>({...f,statut_campus:k}))}
                className="sc-statut-btn"
                style={{
                  background:form.statut_campus===k?v.color:v.bg,
                  color:form.statut_campus===k?'#0a0b0d':v.color,
                  border:`1px solid ${v.color}55`,
                  fontWeight:form.statut_campus===k?800:600,
                }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>

          {/* Motif */}
          <div className="sc-field">
            <label>Motif {form.statut_campus==='actif'?'(optionnel)':'*'}</label>
            <textarea className="sc-input" rows={2}
              placeholder={
                form.statut_campus==='absent_temporaire'
                  ? "Ex: Permission famille, problème médical…"
                  : form.statut_campus==='inactif'
                  ? "Ex: Abandon, exclusion, mutation…"
                  : "Raison du changement…"
              }
              value={form.motif}
              onChange={e=>setForm(f=>({...f,motif:e.target.value}))}/>
          </div>

          {/* Date retour (si absent temporaire) */}
          {form.statut_campus==='absent_temporaire' && (
            <div className="sc-field">
              <label>Date de retour prévue</label>
              <input type="date" className="sc-input"
                value={form.date_retour_prevue}
                onChange={e=>setForm(f=>({...f,date_retour_prevue:e.target.value}))}/>
            </div>
          )}

          {/* Info impact */}
          {form.statut_campus!=='actif' && (
            <div className="sc-info-box" style={{borderColor:`${STATUT_CFG[form.statut_campus].color}44`,
              background:`${STATUT_CFG[form.statut_campus].color}08`}}>
              <span style={{color:STATUT_CFG[form.statut_campus].color}}>ℹ️</span>
              <span style={{fontSize:'.72rem',color:'var(--text-secondary)'}}>
                {form.statut_campus==='absent_temporaire'
                  ? "Ce soldat ne sera plus convoqué aux cérémonies ni aux entraînements jusqu'à son retour."
                  : "Ce soldat sera exclu de toutes les activités et cérémonies."}
              </span>
            </div>
          )}
        </div>
        <div className="sc-modal-footer">
          <button className="sc-btn-cancel" onClick={onClose}>Annuler</button>
          <button className="sc-btn-confirm" onClick={save} disabled={saving}>
            {saving ? '…' : '✓ Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══ MODAL HISTORIQUE ═══════════════════════════════════════════════════════ */
const ModalHistorique = ({soldier, onClose}) => {
  const [hist, setHist] = useState([]);
  useEffect(()=>{
    api.get(`/statuts-campus/${soldier.id}/historique`)
      .then(r=>setHist(r.data.data||[])).catch(()=>{});
  },[soldier.id]);

  return (
    <div className="sc-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sc-modal sc-modal-lg">
        <div className="sc-modal-header">
          📋 Historique — {soldier.prenom} {soldier.nom}
          <button className="sc-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sc-modal-body">
          {hist.length===0
            ? <div className="sc-empty">Aucun changement enregistré</div>
            : <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {hist.map(h=>{
                  const av=STATUT_CFG[h.ancien_statut];
                  const nv=STATUT_CFG[h.nouveau_statut];
                  return (
                    <div key={h.id} className="sc-hist-item">
                      <div className="sc-hist-timeline">
                        <div className="sc-hist-dot" style={{background:nv?.color||'#94a3b8'}}/>
                        <div className="sc-hist-line"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          {av&&<span className="sc-badge" style={{color:av.color,background:av.bg,border:`1px solid ${av.color}40`}}>{av.icon} {av.label}</span>}
                          <span style={{fontSize:'.75rem',color:'var(--text-muted)'}}>→</span>
                          <span className="sc-badge" style={{color:nv?.color,background:nv?.bg,border:`1px solid ${nv?.color}40`}}>{nv?.icon} {nv?.label}</span>
                        </div>
                        {h.motif&&<div style={{fontSize:'.72rem',color:'var(--text-secondary)',marginBottom:3}}>"{h.motif}"</div>}
                        {h.date_retour_prevue&&<div style={{fontSize:'.65rem',color:'#f59e0b'}}>📅 Retour prévu : {fmtDate(h.date_retour_prevue)}</div>}
                        <div style={{fontSize:'.62rem',color:'var(--text-muted)',marginTop:4}}>
                          {fmtDate(h.created_at)} · par <strong>{h.modifie_par||'système'}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>
    </div>
  );
};

/* ══ PAGE PRINCIPALE ════════════════════════════════════════════════════════ */
export default function StatutsCampus() {
  const location = useLocation();
  const perms = usePermissions(JSON.parse(localStorage.getItem('user')||'{}'), location.pathname);
  const [stats,    setStats]    = useState(null);
  const [liste,    setListe]    = useState([]);
  const [filtre,   setFiltre]   = useState('');
  const [search,   setSearch]   = useState('');
  const [tab,      setTab]      = useState('liste');
  const [histGlob, setHistGlob] = useState([]);
  const [modal,    setModal]    = useState(null); // {type:'statut'|'hist', data:soldier}
  const [toast,    setToast]    = useState('');

  const load = useCallback(async()=>{
    const [st,li]=await Promise.all([
      api.get('/statuts-campus/stats').catch(()=>({data:{data:null}})),
      api.get('/statuts-campus').catch(()=>({data:{data:[]}})),
    ]);
    setStats(st.data.data);
    setListe(li.data.data||[]);
  },[]);

  const loadHist = useCallback(async()=>{
    const r = await api.get('/statuts-campus/historique/global').catch(()=>({data:{data:[]}}));
    setHistGlob(r.data.data||[]);
  },[]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ if(tab==='historique') loadHist(); },[tab,loadHist]);

  const displayed = liste.filter(s=>{
    const matchStatut = !filtre || s.statut_campus===filtre;
    const matchSearch = !search ||
      `${s.prenom} ${s.nom} ${s.matricule} ${s.grade}`.toLowerCase().includes(search.toLowerCase());
    return matchStatut && matchSearch;
  });

  return (
    <div className="sc-page">
      <div className="sc-header">
        <div>
          <div className="sc-eyebrow">G5C ARMÉE · COMMANDEMENT</div>
          <h1 className="sc-title">Statuts Campus</h1>
          <div className="sc-subtitle">PRÉSENCE · ABSENCES · SUIVI DES EFFECTIFS</div>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="sc-kpis">
          {[
            {k:'actifs',   lbl:'Actifs sur campus',   cfg:STATUT_CFG.actif},
            {k:'absents',  lbl:'Absences temporaires', cfg:STATUT_CFG.absent_temporaire},
            {k:'inactifs', lbl:'Inactifs',             cfg:STATUT_CFG.inactif},
          ].map(({k,lbl,cfg})=>(
            <div key={k} className="sc-kpi" style={{borderColor:cfg.color+'33',cursor:'pointer'}}
              onClick={()=>{setFiltre(k==='actifs'?'actif':k==='absents'?'absent_temporaire':'inactif');setTab('liste');}}>
              <div style={{fontSize:'1.4rem'}}>{cfg.icon}</div>
              <div className="sc-kpi-val" style={{color:cfg.color}}>{stats[k]||0}</div>
              <div className="sc-kpi-lbl">{lbl}</div>
            </div>
          ))}
          {/* Alertes */}
          {stats.alertes?.length>0 && (
            <div className="sc-kpi sc-kpi-alert">
              <div style={{fontSize:'1.4rem'}}>⚠️</div>
              <div className="sc-kpi-val" style={{color:'#ef4444'}}>{stats.alertes.length}</div>
              <div className="sc-kpi-lbl">Retours en retard</div>
            </div>
          )}
        </div>
      )}

      {/* Alertes */}
      {stats?.alertes?.length>0 && (
        <div className="sc-alert-banner">
          <span style={{fontWeight:700,color:'#ef4444'}}>⚠️ {stats.alertes.length} soldat(s) absent(s) sans retour prévu ou retour dépassé</span>
          <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
            {stats.alertes.map(a=>(
              <div key={a.id} className="sc-alert-chip">
                <Av p={a} size={24} color='#f59e0b'/>
                <span style={{fontSize:'.72rem',fontWeight:600}}>{a.prenom} {a.nom}</span>
                {a.date_retour_prevue&&<span style={{fontSize:'.62rem',color:'#ef4444'}}>· retour {fmtDate(a.date_retour_prevue)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="sc-tabs">
        {[{k:'liste',l:'👥 Liste soldats'},{k:'historique',l:'📋 Historique global'}].map(t=>(
          <button key={t.k} className={`sc-tab ${tab===t.k?'active':''}`} onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {/* Tab Liste */}
      {tab==='liste' && (
        <div>
          {/* Filtres */}
          <div className="sc-toolbar">
            <input className="sc-search" placeholder="🔍 Nom, matricule, grade…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
            <div className="sc-filter-btns">
              <button className={`sc-filter-btn ${!filtre?'active':''}`} onClick={()=>setFiltre('')}>Tous ({liste.length})</button>
              {Object.entries(STATUT_CFG).map(([k,v])=>{
                const n=liste.filter(s=>s.statut_campus===k).length;
                return (
                  <button key={k} className={`sc-filter-btn ${filtre===k?'active':''}`}
                    style={filtre===k?{background:v.bg,color:v.color,borderColor:v.color+'55'}:{}}
                    onClick={()=>setFiltre(filtre===k?'':k)}>
                    {v.icon} {v.label} ({n})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          {displayed.length===0
            ? <div className="sc-empty"><div style={{fontSize:'2rem'}}>👥</div>Aucun soldat trouvé</div>
            : <div className="sc-table-wrap">
                <table className="sc-table">
                  <thead>
                    <tr>
                      {['Soldat','Grade','Statut','Depuis','Motif','Retour prévu','Actions'].map(h=>(
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(s=>{
                      const cfg=STATUT_CFG[s.statut_campus]||STATUT_CFG.actif;
                      const retardRetour = s.date_retour_prevue && new Date(s.date_retour_prevue)<new Date();
                      return (
                        <tr key={s.id} style={{opacity:s.statut_campus==='inactif'?.6:1}}>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <Av p={s} size={34} color={cfg.color}/>
                              <div>
                                <div style={{fontWeight:700,fontSize:'.82rem',color:'var(--text-primary)'}}>{s.prenom} {s.nom}</div>
                                <div style={{fontSize:'.62rem',color:'var(--text-muted)'}}>{s.matricule}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{fontSize:'.75rem',color:'var(--text-secondary)'}}>{s.grade}</td>
                          <td>
                            <span className="sc-badge" style={{color:cfg.color,background:cfg.bg,border:`1px solid ${cfg.color}40`}}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </td>
                          <td style={{fontSize:'.7rem',color:'var(--text-muted)'}}>{s.depuis?fmtRel(s.depuis):'—'}</td>
                          <td style={{fontSize:'.72rem',color:'var(--text-secondary)',maxWidth:160}}>
                            {s.motif_absence_campus
                              ? <span title={s.motif_absence_campus}>
                                  {s.motif_absence_campus.slice(0,40)}{s.motif_absence_campus.length>40?'…':''}
                                </span>
                              : <span style={{color:'var(--text-muted)'}}>—</span>
                            }
                          </td>
                          <td style={{fontSize:'.7rem',color:retardRetour?'#ef4444':'var(--text-muted)',fontWeight:retardRetour?700:400}}>
                            {s.date_retour_prevue
                              ? <>{fmtDate(s.date_retour_prevue)}{retardRetour&&<span style={{display:'block',fontSize:'.58rem'}}>⚠️ Dépassé</span>}</>
                              : '—'
                            }
                          </td>
                          <td>
                            <div style={{display:'flex',gap:5}}>
                              <button className="sc-btn-action sc-btn-edit"
                                onClick={()=>setModal({type:'statut',data:s})}>✎ Statut</button>
                              <button className="sc-btn-action sc-btn-hist"
                                onClick={()=>setModal({type:'hist',data:s})}>📋</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
          }
        </div>
      )}

      {/* Tab Historique global */}
      {tab==='historique' && (
        <div className="sc-card">
          <div className="sc-card-title">📋 Derniers changements de statut</div>
          {histGlob.length===0
            ? <div className="sc-empty">Aucun historique</div>
            : <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {histGlob.map(h=>{
                  const av=STATUT_CFG[h.ancien_statut];
                  const nv=STATUT_CFG[h.nouveau_statut];
                  return (
                    <div key={h.id} style={{display:'flex',alignItems:'center',gap:14,padding:'10px 14px',
                      background:'var(--bg-hover)',borderRadius:10,border:'1px solid var(--border-color)'}}>
                      <Av p={h} size={36} color={nv?.color||'#94a3b8'}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:'.8rem',color:'var(--text-primary)'}}>{h.prenom} {h.nom}</div>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>
                          {av&&<span className="sc-badge" style={{color:av.color,background:av.bg}}>{av.icon} {av.label}</span>}
                          <span style={{fontSize:'.7rem',color:'var(--text-muted)'}}>→</span>
                          <span className="sc-badge" style={{color:nv?.color,background:nv?.bg}}>{nv?.icon} {nv?.label}</span>
                        </div>
                        {h.motif&&<div style={{fontSize:'.68rem',color:'var(--text-muted)',marginTop:2}}>"{h.motif}"</div>}
                      </div>
                      <div style={{textAlign:'right',fontSize:'.62rem',color:'var(--text-muted)'}}>
                        <div>{fmtDate(h.created_at)}</div>
                        <div>par <strong>{h.modifie_par||'système'}</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      )}

      {modal?.type==='statut' && (
        <ModalStatut soldier={modal.data} onClose={()=>setModal(null)}
          onDone={()=>{ load(); setToast('✅ Statut mis à jour'); }}/>
      )}
      {modal?.type==='hist' && (
        <ModalHistorique soldier={modal.data} onClose={()=>setModal(null)}/>
      )}
      {toast && <Toast msg={toast} onDone={()=>setToast('')}/>}
    </div>
  );
}
