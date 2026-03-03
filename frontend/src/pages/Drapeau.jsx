import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import '../styles/Drapeau.css';

const TYPE_CONFIG = {
  levee:         { label:'Levée des Couleurs',  icon:'🌅', color:'#C9A84C' },
  descente:      { label:'Descente des Couleurs',icon:'🌆', color:'#a78bfa' },
  'defilé':      { label:'Défilé',              icon:'🪖', color:'#60a5fa' },
  commemorative: { label:'Commémorative',       icon:'🎖️', color:'#f59e0b' },
  autre:         { label:'Autre',               icon:'📋', color:'#94a3b8' },
};
const STATUT_CONFIG = {
  planifiee:  { label:'Planifiée',  color:'#60a5fa', bg:'rgba(96,165,250,.1)' },
  confirmee:  { label:'Confirmée', color:'#f59e0b', bg:'rgba(245,158,11,.1)' },
  terminee:   { label:'Terminée',  color:'#34d399', bg:'rgba(52,211,153,.1)' },
  annulee:    { label:'Annulée',   color:'#ef4444', bg:'rgba(239,68,68,.1)'  },
};
const PRES_CFG = {
  present:{ label:'Présent', color:'#34d399', icon:'✅' },
  absent: { label:'Absent',  color:'#ef4444', icon:'✗'  },
  retard: { label:'Retard',  color:'#f59e0b', icon:'⏰' },
  excuse: { label:'Excusé',  color:'#60a5fa', icon:'📝' },
};

const fmt   = d => d ? new Date(d).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtHr = h => h ? h.slice(0,5) : '';

const Av = ({p, size=36, color='#C9A84C'}) => {
  const prn = p?.prenom||''; const nm = p?.nom||'';
  const st = {width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,
    background:`${color}18`,border:`1.5px solid ${color}40`,display:'flex',
    alignItems:'center',justifyContent:'center',fontSize:size*.28,fontWeight:700,color};
  if(p?.photo_url?.startsWith('data:'))
    return <div style={st}><img src={p.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>;
  return <div style={st}>{prn[0]}{nm[0]}</div>;
};

const Toast = ({msg,onDone}) => {
  useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t);},[onDone]);
  return <div className="drp-toast">{msg}</div>;
};

/* ══ DASHBOARD ══════════════════════════════════════════════════════════════ */
const TabDashboard = ({stats, ceremonies, onRefresh}) => {
  const prochaine = stats?.prochaine_ceremonie;
  const typeP = prochaine ? TYPE_CONFIG[prochaine.type] : null;
  return (
    <div>
      {/* KPIs */}
      <div className="drp-stats">
        {[
          {val:stats?.total_ceremonies||0,    lbl:'Cérémonies totales',  icon:'📅', color:'#C9A84C'},
          {val:stats?.ceremonies_ce_mois||0,  lbl:'Ce mois-ci',          icon:'🗓️', color:'#60a5fa'},
          {val:`${stats?.taux_presence_moyen||0}%`, lbl:'Taux de présence moy.', icon:'📊',
            color:(stats?.taux_presence_moyen||0)>=80?'#34d399':(stats?.taux_presence_moyen||0)>=60?'#f59e0b':'#ef4444'},
        ].map((s,i)=>(
          <div key={i} className="drp-stat">
            <div className="drp-stat-icon">{s.icon}</div>
            <div className="drp-stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="drp-stat-lbl">{s.lbl}</div>
          </div>
        ))}

        {/* Prochaine cérémonie */}
        <div className="drp-stat drp-stat-next" style={{borderColor:(typeP?.color||'#C9A84C')+'44'}}>
          <div className="drp-stat-icon">{typeP?.icon||'📅'}</div>
          <div style={{fontSize:'.72rem',fontWeight:700,color:typeP?.color||'#C9A84C',marginBottom:2}}>
            {prochaine ? typeP?.label : 'Aucune planifiée'}
          </div>
          {prochaine && <>
            <div style={{fontSize:'.8rem',color:'var(--text-primary)',fontWeight:700}}>{fmt(prochaine.date_ceremonie)}</div>
            <div style={{fontSize:'.68rem',color:'var(--text-muted)'}}>{fmtHr(prochaine.heure_debut)} · {prochaine.lieu||'QG'}</div>
          </>}
          <div className="drp-stat-lbl">Prochaine cérémonie</div>
        </div>
      </div>

      {/* Top absents */}
      {stats?.top_absents?.length > 0 && (
        <div className="drp-card" style={{marginBottom:18}}>
          <div className="drp-card-title">⚠️ Top absences</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {stats.top_absents.map((a,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',
                borderBottom:'1px solid var(--border-color)'}}>
                <Av p={a} size={32}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:'.8rem',fontWeight:600,color:'var(--text-primary)'}}>{a.prenom} {a.nom}</div>
                </div>
                <span style={{background:'rgba(239,68,68,.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,.2)',
                  padding:'2px 10px',borderRadius:5,fontSize:'.68rem',fontWeight:700}}>
                  {a.nb_absences} abs.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cérémonies récentes */}
      <div className="drp-card">
        <div className="drp-card-title">📋 Cérémonies récentes</div>
        {ceremonies.length===0
          ? <div className="drp-empty">Aucune cérémonie enregistrée</div>
          : <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {ceremonies.slice(0,5).map(c=>{
                const tc=TYPE_CONFIG[c.type]||TYPE_CONFIG.autre;
                const sc=STATUT_CONFIG[c.statut]||STATUT_CONFIG.planifiee;
                return (
                  <div key={c.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',
                    background:'var(--bg-hover)',borderRadius:10,border:`1px solid ${tc.color}22`}}>
                    <span style={{fontSize:'1.3rem'}}>{tc.icon}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--text-primary)'}}>{c.titre}</div>
                      <div style={{fontSize:'.65rem',color:'var(--text-muted)',marginTop:2}}>{fmt(c.date_ceremonie)} · {fmtHr(c.heure_debut)}</div>
                    </div>
                    {c.statut==='terminee'&&<span style={{fontSize:'.68rem',color:'var(--text-muted)'}}>
                      {c.nb_presents}/{c.total_participants} présents ({c.taux_presence}%)
                    </span>}
                    <span style={{background:sc.bg,color:sc.color,border:`1px solid ${sc.color}40`,
                      padding:'2px 9px',borderRadius:5,fontSize:'.62rem',fontWeight:700}}>
                      {sc.label}
                    </span>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
};

/* ══ CEREMONIES ═════════════════════════════════════════════════════════════ */
const TabCeremonies = ({onToast, onRefreshStats}) => {
  const [ceremonies, setCeremonies] = useState([]);
  const [params,     setParams]     = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [pointage,   setPointage]   = useState(null);
  const [pointData,  setPointData]  = useState({soldiers:[],crics:[]});
  const [saving,     setSaving]     = useState(false);
  const [filterStatut, setFilterStatut] = useState('');
  const [form, setForm] = useState({
    type:'levee', titre:'Levée des Couleurs',
    date_ceremonie:new Date().toISOString().slice(0,10),
    heure_debut:'07:00', lieu:'QG — UGB', description:''
  });

  const load = useCallback(async()=>{
    const [c,p] = await Promise.all([
      api.get('/drapeau/ceremonies').catch(()=>({data:{data:[]}})),
      api.get('/drapeau/parametres').catch(()=>({data:{data:null}})),
    ]);
    setCeremonies(c.data.data||[]);
    setParams(p.data.data);
  },[]);
  useEffect(()=>{load();},[load]);

  const generer = async()=>{
    try{
      const r=await api.post('/drapeau/ceremonies/generer');
      onToast(r.data.message||'Généré');load();onRefreshStats();
    }catch{onToast('❌ Erreur');}
  };

  const action = async(id, act)=>{
    try{
      await api.patch(`/drapeau/ceremonies/${id}/${act}`);
      onToast(act==='confirmer'?'✅ Cérémonie confirmée — pointage ouvert':act==='terminer'?'🎖️ Cérémonie terminée':act==='annuler'?'Annulée':'OK');
      load();onRefreshStats();
    }catch(e){onToast('❌ '+(e.response?.data?.error||'Erreur'));}
  };

  const openPointage = async(c)=>{
    const r=await api.get(`/drapeau/ceremonies/${c.id}/pointage`).catch(()=>null);
    if(r){setPointData(r.data.data);setPointage(c);}
  };

  const setPresence=(type,id,val)=>{
    setPointData(prev=>({
      ...prev,
      [type]:prev[type].map(p=>p.id===id?{...p,presence:val}:p)
    }));
  };

  const savePointage=async()=>{
    setSaving(true);
    try{
      const pointages=[
        ...pointData.soldiers.map(s=>({type:'soldier',id:s.id,presence:s.presence,motif:s.motif})),
        ...pointData.crics.map(c=>({type:'cric',id:c.id,presence:c.presence,motif:c.motif})),
      ];
      await api.post(`/drapeau/ceremonies/${pointage.id}/pointage`,{pointages});
      onToast('✅ Pointage enregistré');setPointage(null);load();
    }catch{onToast('❌ Erreur');}
    setSaving(false);
  };

  const updateParams=async(field,val)=>{
    const updated={...params,[field]:val};
    setParams(updated);
    await api.put('/drapeau/parametres',updated).catch(()=>{});
  };

  const typeChange=(t)=>{
    const def={levee:{titre:'Levée des Couleurs',heure:'07:00'},
                descente:{titre:'Descente des Couleurs',heure:'18:00'}};
    setForm(f=>({...f,type:t,titre:def[t]?.titre||f.titre,heure_debut:def[t]?.heure||f.heure_debut}));
  };

  const createCeremonie=async()=>{
    if(!form.titre||!form.date_ceremonie||!form.heure_debut) return;
    setSaving(true);
    try{
      await api.post('/drapeau/ceremonies',form);
      onToast('✅ Cérémonie créée');setShowForm(false);load();onRefreshStats();
    }catch{onToast('❌ Erreur');}
    setSaving(false);
  };

  const displayed=ceremonies.filter(c=>!filterStatut||c.statut===filterStatut);
  const presTotal=(pointData.soldiers?.length||0)+(pointData.crics?.length||0);
  const presCount=[...(pointData.soldiers||[]),...(pointData.crics||[])].filter(p=>p.presence==='present').length;

  return (
    <div>
      {/* Paramètres auto */}
      {params && (
        <div className="drp-card" style={{marginBottom:16}}>
          <div className="drp-card-title">⚙️ Génération automatique</div>
          <div style={{display:'flex',gap:24,flexWrap:'wrap',alignItems:'center'}}>
            {[
              {field:'auto_levee_active',label:'Levée (Lundi)',heure:'heure_levee'},
              {field:'auto_descente_active',label:'Descente (Vendredi)',heure:'heure_descente'},
            ].map(opt=>(
              <div key={opt.field} style={{display:'flex',alignItems:'center',gap:12,
                background:'var(--bg-hover)',borderRadius:10,padding:'10px 16px',border:'1px solid var(--border-color)'}}>
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'.8rem',color:'var(--text-secondary)'}}>
                  <input type="checkbox" checked={params[opt.field]||false}
                    onChange={e=>updateParams(opt.field,e.target.checked)}
                    style={{width:16,height:16,accentColor:'#C9A84C'}}/>
                  {opt.label}
                </label>
                <input type="time" value={params[opt.heure]?.slice(0,5)||''}
                  onChange={e=>updateParams(opt.heure,e.target.value)}
                  disabled={!params[opt.field]}
                  style={{background:'var(--bg-subtle)',border:'1px solid var(--border-color)',borderRadius:6,
                    padding:'4px 8px',color:'var(--text-primary)',fontSize:'.75rem',opacity:params[opt.field]?1:.4}}/>
              </div>
            ))}
            <button className="drp-btn-secondary" onClick={generer}>⚡ Générer semaine prochaine</button>
          </div>
        </div>
      )}

      {/* Barre actions */}
      <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
        <select value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}
          style={{background:'var(--bg-card)',border:'1px solid var(--border-color)',borderRadius:8,
            padding:'9px 13px',color:'var(--text-primary)',fontSize:'.76rem',outline:'none'}}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="drp-btn-primary" onClick={()=>setShowForm(true)}>+ Nouvelle cérémonie</button>
      </div>

      {/* Liste */}
      {displayed.length===0
        ? <div className="drp-empty"><div style={{fontSize:'2rem'}}>📅</div>Aucune cérémonie</div>
        : <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {displayed.map(c=>{
              const tc=TYPE_CONFIG[c.type]||TYPE_CONFIG.autre;
              const sc=STATUT_CONFIG[c.statut]||STATUT_CONFIG.planifiee;
              return(
                <div key={c.id} className="drp-cer-item" style={{borderLeft:`3px solid ${tc.color}`}}>
                  <div style={{fontSize:'1.6rem',flexShrink:0}}>{tc.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                      <span style={{fontSize:'.85rem',fontWeight:700,color:'var(--text-primary)'}}>{c.titre}</span>
                      {c.auto_generee&&<span style={{fontSize:'.55rem',background:'rgba(167,139,250,.1)',color:'#a78bfa',
                        border:'1px solid rgba(167,139,250,.2)',padding:'1px 6px',borderRadius:3,fontWeight:700}}>AUTO</span>}
                    </div>
                    <div style={{fontSize:'.68rem',color:'var(--text-muted)',display:'flex',gap:12,flexWrap:'wrap'}}>
                      <span>📅 {fmt(c.date_ceremonie)}</span>
                      <span>⏰ {fmtHr(c.heure_debut)}</span>
                      <span>📍 {c.lieu||'QG'}</span>
                      {c.statut==='terminee'&&<span style={{color:'#34d399'}}>
                        👥 {c.nb_presents}/{c.total_participants} ({c.taux_presence}%)
                      </span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0,alignItems:'center'}}>
                    <span style={{background:sc.bg,color:sc.color,border:`1px solid ${sc.color}40`,
                      padding:'3px 10px',borderRadius:5,fontSize:'.62rem',fontWeight:700}}>{sc.label}</span>
                    {c.statut==='planifiee'&&(
                      <>
                        <button className="drp-btn-action green" onClick={()=>action(c.id,'confirmer')}>✓ Confirmer</button>
                        <button className="drp-btn-action red"   onClick={()=>action(c.id,'annuler')}>✕</button>
                      </>
                    )}
                    {c.statut==='confirmee'&&(
                      <>
                        <button className="drp-btn-action gold"  onClick={()=>openPointage(c)}>✎ Pointer</button>
                        <button className="drp-btn-action green" onClick={()=>action(c.id,'terminer')}>⬛ Terminer</button>
                      </>
                    )}
                    {c.statut==='terminee'&&(
                      <button className="drp-btn-action gold" onClick={()=>openPointage(c)}>👁 Voir</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      }

      {/* Modal Nouvelle cérémonie */}
      {showForm&&(
        <div className="drp-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="drp-modal">
            <div className="drp-modal-header">📅 Nouvelle cérémonie
              <button className="drp-modal-close" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="drp-modal-body">
              <div className="drp-field"><label>Type</label>
                <select className="drp-input" value={form.type} onChange={e=>typeChange(e.target.value)}>
                  {Object.entries(TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div className="drp-field"><label>Titre</label>
                <input className="drp-input" value={form.titre} onChange={e=>setForm(f=>({...f,titre:e.target.value}))}/>
              </div>
              <div className="drp-field-row">
                <div className="drp-field"><label>Date</label>
                  <input type="date" className="drp-input" value={form.date_ceremonie}
                    onChange={e=>setForm(f=>({...f,date_ceremonie:e.target.value}))}/>
                </div>
                <div className="drp-field"><label>Heure</label>
                  <input type="time" className="drp-input" value={form.heure_debut}
                    onChange={e=>setForm(f=>({...f,heure_debut:e.target.value}))}/>
                </div>
              </div>
              <div className="drp-field"><label>Lieu</label>
                <input className="drp-input" value={form.lieu} onChange={e=>setForm(f=>({...f,lieu:e.target.value}))}/>
              </div>
              <div className="drp-field"><label>Description</label>
                <textarea className="drp-input" rows={2} value={form.description}
                  onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
              </div>
            </div>
            <div className="drp-modal-footer">
              <button className="drp-btn-cancel" onClick={()=>setShowForm(false)}>Annuler</button>
              <button className="drp-btn-confirm" onClick={createCeremonie} disabled={saving}>
                {saving?'…':'CRÉER'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pointage */}
      {pointage&&(
        <div className="drp-overlay" onClick={e=>e.target===e.currentTarget&&setPointage(null)}>
          <div className="drp-modal drp-modal-lg">
            <div className="drp-modal-header">
              ✎ {pointage.statut==='terminee'?'Résultats':'Pointage'} — {pointage.titre} · {fmt(pointage.date_ceremonie)}
              <button className="drp-modal-close" onClick={()=>setPointage(null)}>✕</button>
            </div>
            <div className="drp-modal-body">
              {/* Résumé rapide */}
              <div style={{display:'flex',gap:16,marginBottom:10,flexWrap:'wrap'}}>
                {Object.entries(PRES_CFG).map(([k,v])=>{
                  const n=[...pointData.soldiers,...pointData.crics].filter(p=>p.presence===k).length;
                  return <div key={k} style={{background:v.color+'15',border:`1px solid ${v.color}40`,
                    borderRadius:8,padding:'8px 14px',textAlign:'center',minWidth:80}}>
                    <div style={{color:v.color,fontWeight:800,fontSize:'1.1rem'}}>{n}</div>
                    <div style={{fontSize:'.62rem',color:'var(--text-muted)'}}>{v.label}</div>
                  </div>;
                })}
                {pointage.statut!=='terminee'&&(
                  <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:'.7rem',color:'var(--text-muted)'}}>Tout marquer:</span>
                    {Object.entries(PRES_CFG).map(([k,v])=>(
                      <button key={k} onClick={()=>setPointData(pd=>({
                        soldiers:pd.soldiers.map(s=>({...s,presence:k})),
                        crics:pd.crics.map(c=>({...c,presence:k}))
                      }))} style={{background:'none',border:`1px solid ${v.color}55`,color:v.color,
                        borderRadius:6,padding:'3px 9px',fontSize:'.68rem',fontWeight:700,cursor:'pointer'}}>
                        {v.icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="drp-pointage-list">
                {/* Soldats */}
                {pointData.soldiers?.length>0&&<>
                  <div className="drp-pointage-section">🪖 Soldats ({pointData.soldiers.length})</div>
                  {pointData.soldiers.map(s=>(
                    <PointageRow key={'s'+s.id} p={s} type="soldier"
                      onPres={val=>setPresence('soldiers',s.id,val)}
                      readonly={pointage.statut==='terminee'}/>
                  ))}
                </>}
                {/* CRICs */}
                {pointData.crics?.length>0&&<>
                  <div className="drp-pointage-section" style={{marginTop:10}}>👤 CRICs ({pointData.crics.length})</div>
                  {pointData.crics.map(c=>(
                    <PointageRow key={'c'+c.id} p={c} type="cric"
                      onPres={val=>setPresence('crics',c.id,val)}
                      readonly={pointage.statut==='terminee'}/>
                  ))}
                </>}
                {presTotal===0&&<div className="drp-empty">Aucun participant chargé</div>}
              </div>
            </div>
            <div className="drp-modal-footer">
              <button className="drp-btn-cancel" onClick={()=>setPointage(null)}>
                {pointage.statut==='terminee'?'Fermer':'Annuler'}
              </button>
              {pointage.statut!=='terminee'&&(
                <button className="drp-btn-confirm" onClick={savePointage} disabled={saving}>
                  {saving?'…':`✓ Enregistrer (${presCount} présents / ${presTotal})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PointageRow = ({p, onPres, readonly}) => {
  const cfg = PRES_CFG[p.presence]||PRES_CFG.absent;
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',
      borderRadius:8,border:`1px solid ${cfg.color}30`,background:cfg.color+'0d',marginBottom:4}}>
      <Av p={p} size={30}/>
      <div style={{flex:1,fontSize:'.78rem'}}>
        <span style={{fontWeight:600,color:'var(--text-primary)'}}>{p.prenom} {p.nom}</span>
        {p.grade&&<span style={{fontSize:'.63rem',color:'var(--text-muted)'}}> · {p.grade}</span>}
      </div>
      <div style={{display:'flex',gap:4}}>
        {Object.entries(PRES_CFG).map(([k,v])=>(
          <button key={k} disabled={readonly}
            onClick={()=>!readonly&&onPres(k)}
            style={{border:`1px solid ${v.color}55`,borderRadius:5,padding:'3px 8px',fontSize:'.65rem',
              fontWeight:700,cursor:readonly?'default':'pointer',
              background:p.presence===k?v.color:'transparent',
              color:p.presence===k?'#fff':v.color,
              opacity:readonly&&p.presence!==k?.3:1}}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ══ MEMBRES ════════════════════════════════════════════════════════════════ */
const TabMembres = ({onToast}) => {
  const [membres,  setMembres]  = useState([]);
  const [soldiers, setSoldiers] = useState([]);
  const [showAdd,  setShowAdd]  = useState(false);
  const [form,     setForm]     = useState({soldier_id:'', role:'membre'});

  const load = useCallback(async()=>{
    const [m,s]=await Promise.all([
      api.get('/drapeau/membres').catch(()=>({data:{data:[]}})),
      api.get('/soldiers').catch(()=>({data:{data:[]}})),
    ]);
    setMembres(m.data.data||[]);
    setSoldiers((s.data.data||[]).filter(x=>x.statut==='actif'));
  },[]);
  useEffect(()=>{load();},[load]);

  const add=async()=>{
    if(!form.soldier_id) return;
    try{await api.post('/drapeau/membres',form);onToast('✅ Membre ajouté');setShowAdd(false);load();}
    catch{onToast('❌ Erreur');}
  };
  const remove=async(sid)=>{
    if(!confirm('Retirer ce membre ?')) return;
    try{await api.delete(`/drapeau/membres/${sid}`);onToast('Membre retiré');load();}catch{}
  };

  const chef   = membres.find(m=>m.role==='chef');
  const second = membres.find(m=>m.role==='second');
  const autres = membres.filter(m=>m.role==='membre');
  const disponibles = soldiers.filter(s=>!membres.find(m=>m.soldier_id===s.id));

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
        <button className="drp-btn-primary" onClick={()=>setShowAdd(true)}>+ Ajouter membre</button>
      </div>

      {/* Chef & Second */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
        {[{role:'chef',label:'Chef de Section',icon:'⭐',data:chef},
          {role:'second',label:'Second',icon:'◎',data:second}].map(({role,label,icon,data})=>(
          <div key={role} className="drp-card" style={{borderColor:data?'rgba(201,168,76,.25)':'var(--border-color)'}}>
            <div className="drp-card-title">{icon} {label}</div>
            {data
              ? <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <Av p={data} size={48} color='#C9A84C'/>
                  <div>
                    <div style={{fontWeight:700,color:'var(--text-primary)'}}>{data.prenom} {data.nom}</div>
                    <div style={{fontSize:'.7rem',color:'var(--gold-main)'}}>{data.grade}</div>
                    <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{data.matricule}</div>
                  </div>
                  <button onClick={()=>remove(data.soldier_id)}
                    style={{marginLeft:'auto',background:'none',border:'1px solid rgba(239,68,68,.3)',
                      color:'#f87171',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontSize:'.7rem'}}>✕</button>
                </div>
              : <div style={{color:'var(--text-muted)',fontSize:'.78rem',textAlign:'center',padding:'20px 0'}}>
                  Non désigné
                </div>
            }
          </div>
        ))}
      </div>

      {/* Autres membres */}
      {autres.length > 0 && (
        <div className="drp-card">
          <div className="drp-card-title">👥 Membres ({autres.length})</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {autres.map(m=>(
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',
                borderBottom:'1px solid var(--border-color)'}}>
                <Av p={m} size={34}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:'.82rem',color:'var(--text-primary)'}}>{m.prenom} {m.nom}</div>
                  <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{m.grade} · {m.matricule}</div>
                </div>
                <button onClick={()=>remove(m.soldier_id)}
                  style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:'.85rem',
                    padding:'4px',borderRadius:4,transition:'color .2s'}}
                  onMouseOver={e=>e.target.style.color='#ef4444'}
                  onMouseOut={e=>e.target.style.color='var(--text-muted)'}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {membres.length===0&&<div className="drp-empty"><div style={{fontSize:'2rem'}}>👥</div>Aucun membre assigné</div>}

      {/* Modal ajout */}
      {showAdd&&(
        <div className="drp-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="drp-modal">
            <div className="drp-modal-header">👥 Ajouter un membre
              <button className="drp-modal-close" onClick={()=>setShowAdd(false)}>✕</button>
            </div>
            <div className="drp-modal-body">
              <div className="drp-field"><label>Soldat</label>
                <select className="drp-input" value={form.soldier_id} onChange={e=>setForm(f=>({...f,soldier_id:e.target.value}))}>
                  <option value="">— Sélectionner —</option>
                  {disponibles.sort((a,b)=>a.nom.localeCompare(b.nom)).map(s=>(
                    <option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.grade}</option>
                  ))}
                </select>
              </div>
              <div className="drp-field"><label>Rôle</label>
                <select className="drp-input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  <option value="chef">⭐ Chef de section</option>
                  <option value="second">◎ Second</option>
                  <option value="membre">👤 Membre</option>
                </select>
              </div>
            </div>
            <div className="drp-modal-footer">
              <button className="drp-btn-cancel" onClick={()=>setShowAdd(false)}>Annuler</button>
              <button className="drp-btn-confirm" onClick={add} disabled={!form.soldier_id}>AJOUTER</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ HISTORIQUE ═════════════════════════════════════════════════════════════ */
const TabHistorique = () => {
  const [ceremonies, setCeremonies] = useState([]);
  const [filterType, setFilterType] = useState('');

  useEffect(()=>{
    api.get('/drapeau/ceremonies?statut=terminee').then(r=>setCeremonies(r.data.data||[])).catch(()=>{});
  },[]);

  const displayed = ceremonies.filter(c=>!filterType||c.type===filterType);

  return (
    <div>
      <div style={{marginBottom:14,display:'flex',gap:10}}>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)}
          style={{background:'var(--bg-card)',border:'1px solid var(--border-color)',borderRadius:8,
            padding:'9px 13px',color:'var(--text-primary)',fontSize:'.76rem',outline:'none'}}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_CONFIG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <span style={{fontSize:'.78rem',color:'var(--text-muted)',alignSelf:'center'}}>{displayed.length} cérémonies</span>
      </div>

      {displayed.length===0
        ? <div className="drp-empty"><div style={{fontSize:'2rem'}}>📚</div>Aucune cérémonie terminée</div>
        : <div className="drp-card" style={{padding:0,overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.75rem'}}>
              <thead>
                <tr style={{borderBottom:'1px solid rgba(201,168,76,.2)'}}>
                  {['Type','Titre','Date','Heure','Présents','Absents','Taux'].map(h=>(
                    <th key={h} style={{padding:'12px 14px',textAlign:'left',fontSize:'.6rem',
                      letterSpacing:'.15em',color:'var(--gold-main)',textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(c=>{
                  const tc=TYPE_CONFIG[c.type]||TYPE_CONFIG.autre;
                  const taux=parseInt(c.taux_presence)||0;
                  return(
                    <tr key={c.id} style={{borderBottom:'1px solid var(--border-color)'}}>
                      <td style={{padding:'11px 14px'}}><span style={{fontSize:'1.1rem'}}>{tc.icon}</span></td>
                      <td style={{padding:'11px 14px',fontWeight:600,color:'var(--text-primary)'}}>{c.titre}</td>
                      <td style={{padding:'11px 14px',color:'var(--text-secondary)'}}>{fmt(c.date_ceremonie)}</td>
                      <td style={{padding:'11px 14px',color:'var(--text-muted)'}}>{fmtHr(c.heure_debut)}</td>
                      <td style={{padding:'11px 14px',color:'#34d399',fontWeight:700}}>{c.nb_presents}</td>
                      <td style={{padding:'11px 14px',color:'#ef4444',fontWeight:700}}>{c.nb_absents}</td>
                      <td style={{padding:'11px 14px'}}>
                        <span style={{fontWeight:700,color:taux>=80?'#34d399':taux>=60?'#f59e0b':'#ef4444'}}>{taux}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      }
    </div>
  );
};

/* ══ PAGE PRINCIPALE ════════════════════════════════════════════════════════ */
export default function Drapeau() {
  const [tab,      setTab]      = useState('ceremonies');
  const [stats,    setStats]    = useState(null);
  const [ceremon,  setCeremon]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState('');

  const loadStats = useCallback(async()=>{
    const [st,ce]=await Promise.all([
      api.get('/drapeau/stats').catch(()=>({data:{data:null}})),
      api.get('/drapeau/ceremonies').catch(()=>({data:{data:[]}})),
    ]);
    setStats(st.data.data);setCeremon(ce.data.data||[]);setLoading(false);
  },[]);
  useEffect(()=>{loadStats();},[loadStats]);

  return (
    <div className="drp-page">
      <div className="drp-header">
        <div>
          <div className="drp-eyebrow">G5C ARMÉE · QG COMMAND CENTER</div>
          <h1 className="drp-title">Section Drapeau</h1>
          <div className="drp-subtitle">CÉRÉMONIES · LEVÉE & DESCENTE DES COULEURS · PRÉSENCES</div>
        </div>
      </div>

      <div className="drp-tabs">
        {[
          {k:'dashboard',  l:'📊 Tableau de bord'},
          {k:'ceremonies', l:'🚩 Cérémonies'},
          {k:'membres',    l:'👥 Membres'},
          {k:'historique', l:'📚 Historique'},
        ].map(t=>(
          <button key={t.k} className={`drp-tab ${tab===t.k?'active':''}`} onClick={()=>setTab(t.k)}>
            {t.l}
          </button>
        ))}
      </div>

      {loading&&tab==='dashboard'
        ? <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>Chargement…</div>
        : <>
            {tab==='dashboard'  && <TabDashboard stats={stats} ceremonies={ceremon} onRefresh={loadStats}/>}
            {tab==='ceremonies' && <TabCeremonies onToast={setToast} onRefreshStats={loadStats}/>}
            {tab==='membres'    && <TabMembres    onToast={setToast}/>}
            {tab==='historique' && <TabHistorique/>}
          </>
      }

      {toast&&<Toast msg={toast} onDone={()=>setToast('')}/>}
    </div>
  );
}
