import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import api from '../utils/api';
import '../styles/Caporaux.css';

const TYPE_CFG = {
  parcours:    { label:'Parcours du combattant', icon:'🚧', color:'#ef4444' },
  footing:     { label:'Footing',                icon:'🏃', color:'#34d399' },
  musculation: { label:'Musculation',            icon:'💪', color:'#60a5fa' },
  autre:       { label:'Autre',                  icon:'📋', color:'#94a3b8' },
};
const STATUT_CFG = {
  planifie:  { label:'Planifié',    color:'#60a5fa', bg:'rgba(96,165,250,.1)'  },
  en_cours:  { label:'En cours',    color:'#f59e0b', bg:'rgba(245,158,11,.1)'  },
  termine:   { label:'Terminé',     color:'#34d399', bg:'rgba(52,211,153,.1)'  },
  annule:    { label:'Annulé',      color:'#ef4444', bg:'rgba(239,68,68,.1)'   },
};
const PRES_CFG = {
  present: { label:'Présent', color:'#34d399', icon:'✅' },
  absent:  { label:'Absent',  color:'#ef4444', icon:'✗'  },
  retard:  { label:'Retard',  color:'#f59e0b', icon:'⏰' },
  excuse:  { label:'Excusé',  color:'#60a5fa', icon:'📝' },
};

const fmt   = d => d ? new Date(d).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'short'}) : '—';
const fmtHr = h => h ? h.slice(0,5) : '';

const Av = ({p,size=36,color='#34d399'}) => {
  const st = {width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,
    background:`${color}18`,border:`1.5px solid ${color}40`,display:'flex',
    alignItems:'center',justifyContent:'center',fontSize:size*.28,fontWeight:700,color};
  if(p?.photo_url?.startsWith('data:'))
    return <div style={st}><img src={p.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>;
  return <div style={st}>{p?.prenom?.[0]}{p?.nom?.[0]}</div>;
};

const Toast = ({msg,onDone}) => {
  useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t);},[onDone]);
  return <div className="cap-toast">{msg}</div>;
};

/* ══ DASHBOARD ══════════════════════════════════════════════════════════════ */
const TabDashboard = ({stats}) => {
  if(!stats) return <div className="cap-empty">Chargement…</div>;
  return (
    <div>
      <div className="cap-stats">
        {[
          {val:stats.total,       lbl:'Entraînements',    icon:'🏋️', color:'#34d399'},
          {val:stats.ce_mois,     lbl:'Ce mois-ci',       icon:'📅', color:'#60a5fa'},
          {val:`${stats.taux_presence}%`, lbl:'Taux présence',  icon:'📊',
            color:stats.taux_presence>=80?'#34d399':stats.taux_presence>=60?'#f59e0b':'#ef4444'},
        ].map((s,i)=>(
          <div key={i} className="cap-stat">
            <div className="cap-stat-icon">{s.icon}</div>
            <div className="cap-stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="cap-stat-lbl">{s.lbl}</div>
          </div>
        ))}
        <div className="cap-stat" style={{textAlign:'left'}}>
          <div className="cap-stat-icon">⚡</div>
          {stats.prochain
            ? <>
                <div style={{fontSize:'.72rem',fontWeight:700,color:TYPE_CFG[stats.prochain.type_seance]?.color||'#34d399'}}>
                  {TYPE_CFG[stats.prochain.type_seance]?.icon} {TYPE_CFG[stats.prochain.type_seance]?.label}
                </div>
                <div style={{fontSize:'.82rem',color:'var(--text-primary)',fontWeight:700}}>{fmt(stats.prochain.date_seance)}</div>
                <div style={{fontSize:'.68rem',color:'var(--text-muted)'}}>{fmtHr(stats.prochain.heure_debut)}</div>
              </>
            : <div style={{fontSize:'.75rem',color:'var(--text-muted)'}}>Aucun prévu</div>
          }
          <div className="cap-stat-lbl">Prochain</div>
        </div>
      </div>

      {/* Top présents */}
      {stats.top_presents?.length>0 && (
        <div className="cap-card">
          <div className="cap-card-title">🏅 Top assidus</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {stats.top_presents.map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',
                borderBottom:'1px solid var(--border-color)'}}>
                <span style={{fontSize:'.75rem',fontWeight:800,color:'var(--text-muted)',width:18}}>{i+1}</span>
                <Av p={s} size={32}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:'.8rem',fontWeight:600,color:'var(--text-primary)'}}>{s.prenom} {s.nom}</div>
                  <div style={{fontSize:'.63rem',color:'var(--text-muted)'}}>{s.grade} · {s.presences}/{s.total} séances</div>
                </div>
                <span style={{fontWeight:800,color:s.taux>=80?'#34d399':s.taux>=60?'#f59e0b':'#ef4444',
                  fontSize:'.85rem'}}>{s.taux}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ ENTRAÎNEMENTS ══════════════════════════════════════════════════════════ */
const TabEntrainements = ({onToast, perms}) => {
  const [list,     setList]     = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [pointage, setPointage] = useState(null);
  const [pointData,setPointData]= useState({soldiers:[],crics:[]});
  const [perfModal,setPerfModal]= useState(null);
  const [perfData, setPerfData] = useState([]);
  const [perfType, setPerfType] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [filterSt, setFilterSt] = useState('');
  const [form, setForm] = useState({
    titre:'', type_seance:'footing',
    date_seance:new Date().toISOString().slice(0,10),
    heure_debut:'', heure_fin:'', lieu:'Terrain G5C', description:''
  });

  const load = useCallback(async()=>{
    const r = await api.get('/caporaux/entrainements').catch(()=>({data:{data:[]}}));
    setList(r.data.data||[]);
  },[]);
  useEffect(()=>{load();},[load]);

  const action = async(id,act)=>{
    try{
      await api.patch(`/caporaux/entrainements/${id}/${act}`);
      onToast(act==='demarrer'?'▶ Démarré — pointage ouvert':act==='terminer'?'⬛ Terminé':'Annulé');
      load();
    }catch(e){onToast('❌ '+(e.response?.data?.error||'Erreur'));}
  };

  const creer = async()=>{
    if(!form.titre||!form.date_seance) return;
    setSaving(true);
    try{
      await api.post('/caporaux/entrainements',form);
      onToast('✅ Entraînement créé');setShowForm(false);load();
    }catch{onToast('❌ Erreur');}
    setSaving(false);
  };

  const openPointage = async(e)=>{
    const r=await api.get(`/caporaux/entrainements/${e.id}/pointage`).catch(()=>null);
    if(r){setPointData(r.data.data);setPointage(e);}
  };

  const setPresence=(type,id,val)=>setPointData(prev=>({
    ...prev,[type]:prev[type].map(p=>p.id===id?{...p,presence:val}:p)
  }));

  const savePointage=async()=>{
    setSaving(true);
    try{
      const pointages=[
        ...pointData.soldiers.map(s=>({type:'soldier',id:s.id,presence:s.presence,motif:s.motif})),
        ...pointData.crics.map(c=>({type:'cric',id:c.id,presence:c.presence,motif:c.motif})),
      ];
      await api.post(`/caporaux/entrainements/${pointage.id}/pointage`,{pointages});
      onToast('✅ Pointage enregistré');setPointage(null);load();
    }catch{onToast('❌ Erreur');}
    setSaving(false);
  };

  const openPerfs = async(e)=>{
    const r=await api.get(`/caporaux/entrainements/${e.id}/perf`).catch(()=>null);
    if(r){setPerfData(r.data.data.performances||[]);setPerfType(r.data.data.type_seance);setPerfModal(e);}
  };

  const displayed = list.filter(e=>!filterSt||e.statut===filterSt);
  const presTotal=(pointData.soldiers?.length||0)+(pointData.crics?.length||0);
  const presCount=[...pointData.soldiers||[],...pointData.crics||[]].filter(p=>p.presence==='present').length;

  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'center',flexWrap:'wrap'}}>
        <select value={filterSt} onChange={e=>setFilterSt(e.target.value)} className="cap-select">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        {perms.canWrite && <button className="cap-btn-primary" onClick={()=>setShowForm(true)}>+ Nouvel entraînement</button>}
      </div>

      {displayed.length===0
        ? <div className="cap-empty"><div style={{fontSize:'2rem'}}>🏋️</div>Aucun entraînement</div>
        : <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {displayed.map(e=>{
              const tc=TYPE_CFG[e.type_seance]||TYPE_CFG.autre;
              const sc=STATUT_CFG[e.statut]||STATUT_CFG.planifie;
              return(
                <div key={e.id} className="cap-item" style={{borderLeft:`3px solid ${tc.color}`}}>
                  <span style={{fontSize:'1.5rem'}}>{tc.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'.85rem',fontWeight:700,color:'var(--text-primary)',marginBottom:3}}>{e.titre}</div>
                    <div style={{fontSize:'.68rem',color:'var(--text-muted)',display:'flex',gap:10,flexWrap:'wrap'}}>
                      <span>📅 {fmt(e.date_seance)}</span>
                      {e.heure_debut&&<span>⏰ {fmtHr(e.heure_debut)}</span>}
                      <span>📍 {e.lieu}</span>
                      {e.statut!=='planifie'&&<span style={{color:'#34d399'}}>
                        👥 {e.nb_presents}/{e.total_participants} présents
                      </span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
                    <span style={{background:sc.bg,color:sc.color,border:`1px solid ${sc.color}40`,
                      padding:'3px 9px',borderRadius:5,fontSize:'.62rem',fontWeight:700}}>{sc.label}</span>
                    {e.statut==='planifie'&&(
                      <>
                        <button className="cap-btn-action green" onClick={()=>action(e.id,'demarrer')}>▶ Démarrer</button>
                        <button className="cap-btn-action red"   onClick={()=>action(e.id,'annuler')}>✕</button>
                      </>
                    )}
                    {e.statut==='en_cours'&&(
                      <>
                        {perms.canWrite && <button className="cap-btn-action gold"  onClick={()=>openPointage(e)}>✎ Pointer</button>}
                        {perms.canWrite && <button className="cap-btn-action blue"  onClick={()=>openPerfs(e)}>📊 Perfs</button>}
                        <button className="cap-btn-action green" onClick={()=>action(e.id,'terminer')}>⬛ Terminer</button>
                      </>
                    )}
                    {e.statut==='termine'&&(
                      <>
                        {perms.canWrite && <button className="cap-btn-action gold" onClick={()=>openPointage(e)}>👁 Présences</button>}
                        {perms.canWrite && <button className="cap-btn-action blue" onClick={()=>openPerfs(e)}>📊 Résultats</button>}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      }

      {/* Modal Créer */}
      {showForm&&(
        <div className="cap-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="cap-modal">
            <div className="cap-modal-header">🏋️ Nouvel entraînement
              <button className="cap-modal-close" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="cap-modal-body">
              <div className="cap-field"><label>Type de séance</label>
                <select className="cap-input" value={form.type_seance}
                  onChange={e=>setForm(f=>({...f,type_seance:e.target.value,
                    titre:TYPE_CFG[e.target.value]?.label||f.titre}))}>
                  {Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div className="cap-field"><label>Titre</label>
                <input className="cap-input" value={form.titre} onChange={e=>setForm(f=>({...f,titre:e.target.value}))}/>
              </div>
              <div className="cap-field-row">
                <div className="cap-field"><label>Date</label>
                  <input type="date" className="cap-input" value={form.date_seance}
                    onChange={e=>setForm(f=>({...f,date_seance:e.target.value}))}/>
                </div>
                <div className="cap-field"><label>Heure début</label>
                  <input type="time" className="cap-input" value={form.heure_debut}
                    onChange={e=>setForm(f=>({...f,heure_debut:e.target.value}))}/>
                </div>
              </div>
              <div className="cap-field"><label>Lieu</label>
                <input className="cap-input" value={form.lieu} onChange={e=>setForm(f=>({...f,lieu:e.target.value}))}/>
              </div>
              <div className="cap-field"><label>Description</label>
                <textarea className="cap-input" rows={2} value={form.description}
                  onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
              </div>
            </div>
            <div className="cap-modal-footer">
              <button className="cap-btn-cancel" onClick={()=>setShowForm(false)}>Annuler</button>
              {perms.canWrite && <button className="cap-btn-confirm" onClick={creer} disabled={saving||!form.titre}>{saving?'…':'CRÉER'}</button>}
            </div>
          </div>
        </div>
      )}

      {/* Modal Pointage */}
      {pointage&&(
        <div className="cap-overlay" onClick={e=>e.target===e.currentTarget&&setPointage(null)}>
          <div className="cap-modal cap-modal-lg">
            <div className="cap-modal-header">
              ✎ {pointage.statut==='termine'?'Présences':'Pointage'} — {pointage.titre}
              <button className="cap-modal-close" onClick={()=>setPointage(null)}>✕</button>
            </div>
            <div className="cap-modal-body">
              <div style={{display:'flex',gap:12,marginBottom:10,flexWrap:'wrap'}}>
                {Object.entries(PRES_CFG).map(([k,v])=>{
                  const n=[...pointData.soldiers,...pointData.crics].filter(p=>p.presence===k).length;
                  return <div key={k} style={{background:v.color+'15',border:`1px solid ${v.color}40`,
                    borderRadius:8,padding:'7px 14px',textAlign:'center',minWidth:70}}>
                    <div style={{color:v.color,fontWeight:800,fontSize:'1rem'}}>{n}</div>
                    <div style={{fontSize:'.6rem',color:'var(--text-muted)'}}>{v.label}</div>
                  </div>;
                })}
                {pointage.statut!=='termine'&&(
                  <div style={{marginLeft:'auto',display:'flex',gap:5,alignItems:'center'}}>
                    <span style={{fontSize:'.68rem',color:'var(--text-muted)'}}>Tout:</span>
                    {Object.entries(PRES_CFG).map(([k,v])=>(
                      <button key={k} onClick={()=>setPointData(pd=>({
                        soldiers:pd.soldiers.map(s=>({...s,presence:k})),
                        crics:pd.crics.map(c=>({...c,presence:k}))
                      }))} style={{background:'none',border:`1px solid ${v.color}55`,color:v.color,
                        borderRadius:5,padding:'2px 8px',fontSize:'.65rem',fontWeight:700,cursor:'pointer'}}>
                        {v.icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="cap-pointage-list">
                {pointData.soldiers?.length>0&&<>
                  <div className="cap-section-sep">🪖 Soldats</div>
                  {pointData.soldiers.map(s=>(
                    <PresRow key={'s'+s.id} p={s}
                      onPres={v=>setPresence('soldiers',s.id,v)}
                      readonly={pointage.statut==='termine'}/>
                  ))}
                </>}
                {pointData.crics?.length>0&&<>
                  <div className="cap-section-sep">👤 CRICs</div>
                  {pointData.crics.map(c=>(
                    <PresRow key={'c'+c.id} p={c}
                      onPres={v=>setPresence('crics',c.id,v)}
                      readonly={pointage.statut==='termine'}/>
                  ))}
                </>}
              </div>
            </div>
            <div className="cap-modal-footer">
              <button className="cap-btn-cancel" onClick={()=>setPointage(null)}>
                {pointage.statut==='termine'?'Fermer':'Annuler'}
              </button>
              {pointage.statut!=='termine'&&(
                <button className="cap-btn-confirm" onClick={savePointage} disabled={saving}>
                  {saving?'…':`✓ Sauvegarder (${presCount}/${presTotal} présents)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Performances */}
      {perfModal&&(
        <PerfModal entrainement={perfModal} type={perfType} data={perfData}
          onClose={()=>setPerfModal(null)} onToast={onToast} onSaved={()=>openPerfs(perfModal)}/>
      )}
    </div>
  );
};

const PresRow = ({p,onPres,readonly}) => {
  const cfg=PRES_CFG[p.presence]||PRES_CFG.absent;
  return(
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'7px 10px',
      borderRadius:8,border:`1px solid ${cfg.color}30`,background:cfg.color+'0d',marginBottom:3}}>
      <Av p={p} size={28}/>
      <div style={{flex:1,fontSize:'.78rem'}}>
        <span style={{fontWeight:600,color:'var(--text-primary)'}}>{p.prenom} {p.nom}</span>
        {p.grade&&<span style={{fontSize:'.62rem',color:'var(--text-muted)'}}> · {p.grade}</span>}
      </div>
      <div style={{display:'flex',gap:3}}>
        {Object.entries(PRES_CFG).map(([k,v])=>(
          <button key={k} disabled={readonly} onClick={()=>!readonly&&onPres(k)}
            style={{border:`1px solid ${v.color}55`,borderRadius:4,padding:'2px 7px',fontSize:'.62rem',
              fontWeight:700,cursor:readonly?'default':'pointer',
              background:p.presence===k?v.color:'transparent',
              color:p.presence===k?'#fff':v.color,opacity:readonly&&p.presence!==k?.3:1}}>
            {v.icon}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Modal Performances ── */
const PerfModal = ({entrainement,type,data,onClose,onToast,onSaved}) => {
  const [form,setForm]=useState({soldier_id:'',cric_id:'',distance_km:'',temps_footing:'',
    temps_parcours:'',nb_pompes:'',nb_abdos:'',nb_tractions:'',note:'',observations:''});
  const [saving,setSaving]=useState(false);
  const [soldiers,setSoldiers]=useState([]);
  const [crics,setCrics]=useState([]);
  const [mode,setMode]=useState('soldat');

  useEffect(()=>{
    api.get('/soldiers').then(r=>setSoldiers((r.data.data||[]).filter(s=>s.statut==='actif'))).catch(()=>{});
    api.get('/crics').then(r=>setCrics(r.data.data||[])).catch(()=>{});
  },[]);

  const save=async()=>{
    setSaving(true);
    try{
      const payload={...form};
      if(mode==='soldat') delete payload.cric_id; else delete payload.soldier_id;
      await api.post(`/caporaux/entrainements/${entrainement.id}/perf`,payload);
      onToast('✅ Performance enregistrée');onSaved();
      setForm({soldier_id:'',cric_id:'',distance_km:'',temps_footing:'',
        temps_parcours:'',nb_pompes:'',nb_abdos:'',nb_tractions:'',note:'',observations:''});
    }catch{onToast('❌ Erreur');}
    setSaving(false);
  };

  return(
    <div className="cap-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="cap-modal cap-modal-lg">
        <div className="cap-modal-header">📊 Performances — {entrainement.titre}
          <button className="cap-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cap-modal-body">
          {/* Résultats existants */}
          {data.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:'.62rem',letterSpacing:'.15em',color:'var(--text-muted)',
                textTransform:'uppercase',marginBottom:8}}>Résultats enregistrés</div>
              <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:'30vh',overflowY:'auto'}}>
                {data.map((d,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',
                    background:'var(--bg-hover)',borderRadius:8,fontSize:'.75rem'}}>
                    <Av p={d} size={28}/>
                    <div style={{flex:1}}>
                      <span style={{fontWeight:600,color:'var(--text-primary)'}}>{d.prenom} {d.nom}</span>
                    </div>
                    {type==='footing'&&<span style={{color:'#34d399'}}>{d.distance_km}km · {d.temps_footing}</span>}
                    {type==='parcours'&&<span style={{color:'#ef4444'}}>⏱ {d.temps_parcours}</span>}
                    {type==='musculation'&&<span style={{color:'#60a5fa'}}>
                      {d.nb_pompes&&`💪 ${d.nb_pompes}`} {d.nb_abdos&&`· 🔥 ${d.nb_abdos}`} {d.nb_tractions&&`· ⬆️ ${d.nb_tractions}`}
                    </span>}
                    {d.note&&<span style={{fontWeight:700,color:'#f59e0b'}}>{d.note}/20</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formulaire ajout */}
          <div style={{borderTop:'1px solid var(--border-color)',paddingTop:14}}>
            <div style={{fontSize:'.62rem',letterSpacing:'.15em',color:'var(--text-muted)',
              textTransform:'uppercase',marginBottom:10}}>Ajouter une performance</div>
            {/* Sélecteur participant */}
            <div style={{display:'flex',gap:8,marginBottom:10}}>
              {['soldat','cric'].map(m=>(
                <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'7px',borderRadius:7,cursor:'pointer',
                  fontSize:'.72rem',fontWeight:600,
                  background:mode===m?'rgba(52,211,153,.1)':'rgba(255,255,255,.04)',
                  border:mode===m?'1px solid rgba(52,211,153,.3)':'1px solid rgba(255,255,255,.09)',
                  color:mode===m?'#34d399':'var(--text-muted)'}}>
                  {m==='soldat'?'🪖 Soldat':'👤 CRIC'}
                </button>
              ))}
            </div>
            <select className="cap-input" style={{marginBottom:10}}
              value={mode==='soldat'?form.soldier_id:form.cric_id}
              onChange={e=>setForm(f=>mode==='soldat'?{...f,soldier_id:e.target.value}:{...f,cric_id:e.target.value})}>
              <option value="">— Sélectionner —</option>
              {(mode==='soldat'?soldiers:crics).sort((a,b)=>a.nom.localeCompare(b.nom)).map(s=>(
                <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
              ))}
            </select>

            {/* Champs selon type */}
            {type==='footing'&&(
              <div className="cap-field-row">
                <div className="cap-field"><label>Distance (km)</label>
                  <input type="number" step="0.1" className="cap-input" placeholder="Ex: 5.5"
                    value={form.distance_km} onChange={e=>setForm(f=>({...f,distance_km:e.target.value}))}/>
                </div>
                <div className="cap-field"><label>Temps (mm:ss)</label>
                  <input type="text" className="cap-input" placeholder="Ex: 25:30"
                    value={form.temps_footing} onChange={e=>setForm(f=>({...f,temps_footing:e.target.value}))}/>
                </div>
              </div>
            )}
            {type==='parcours'&&(
              <div className="cap-field"><label>Temps parcours (mm:ss)</label>
                <input type="text" className="cap-input" placeholder="Ex: 12:45"
                  value={form.temps_parcours} onChange={e=>setForm(f=>({...f,temps_parcours:e.target.value}))}/>
              </div>
            )}
            {type==='musculation'&&(
              <div className="cap-field-row" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
                {[['nb_pompes','💪 Pompes'],['nb_abdos','🔥 Abdos'],['nb_tractions','⬆️ Tractions']].map(([k,l])=>(
                  <div key={k} className="cap-field"><label>{l}</label>
                    <input type="number" className="cap-input" placeholder="0"
                      value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
                  </div>
                ))}
              </div>
            )}
            <div className="cap-field-row" style={{marginTop:8}}>
              <div className="cap-field"><label>Note /20</label>
                <input type="number" step="0.5" min="0" max="20" className="cap-input" placeholder="Ex: 16"
                  value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
              </div>
              <div className="cap-field"><label>Observations</label>
                <input className="cap-input" placeholder="Commentaire…"
                  value={form.observations} onChange={e=>setForm(f=>({...f,observations:e.target.value}))}/>
              </div>
            </div>
          </div>
        </div>
        <div className="cap-modal-footer">
          <button className="cap-btn-cancel" onClick={onClose}>Fermer</button>
          <button className="cap-btn-confirm" onClick={save} disabled={saving||(!form.soldier_id&&!form.cric_id)}>
            {saving?'…':'✓ Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══ MEMBRES ════════════════════════════════════════════════════════════════ */
const TabMembres = ({onToast, perms}) => {
  const [membres,setSoldiers2]=useState([]);
  const [soldiers,setSoldiers]=useState([]);
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({soldier_id:'',role:'membre'});

  const load=useCallback(async()=>{
    const [m,s]=await Promise.all([
      api.get('/caporaux/membres').catch(()=>({data:{data:[]}})),
      api.get('/soldiers').catch(()=>({data:{data:[]}})),
    ]);
    setSoldiers2(m.data.data||[]);
    setSoldiers((s.data.data||[]).filter(x=>x.statut==='actif'));
  },[]);
  useEffect(()=>{load();},[load]);

  const add=async()=>{
    if(!form.soldier_id) return;
    try{await api.post('/caporaux/membres',form);onToast('✅ Membre ajouté');setShowAdd(false);load();}
    catch{onToast('❌ Erreur');}
  };
  const remove=async(sid)=>{
    if(!confirm('Retirer ?')) return;
    await api.delete(`/caporaux/membres/${sid}`);load();
  };

  const chef=membres.find(m=>m.role==='chef');
  const second=membres.find(m=>m.role==='second');
  const autres=membres.filter(m=>m.role==='membre');
  const disponibles=soldiers.filter(s=>!membres.find(m=>m.soldier_id===s.id));

  return(
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
        {perms.canWrite && <button className="cap-btn-primary" onClick={()=>setShowAdd(true)}>+ Ajouter membre</button>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
        {[{role:'chef',label:'Chef de Section',icon:'⭐',data:chef},
          {role:'second',label:'Second',icon:'◎',data:second}].map(({label,icon,data})=>(
          <div key={label} className="cap-card">
            <div className="cap-card-title">{icon} {label}</div>
            {data
              ? <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <Av p={data} size={46} color='#34d399'/>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:'var(--text-primary)'}}>{data.prenom} {data.nom}</div>
                    <div style={{fontSize:'.7rem',color:'#34d399'}}>{data.grade}</div>
                  </div>
                  <button onClick={()=>remove(data.soldier_id)}
                    style={{background:'none',border:'1px solid rgba(239,68,68,.3)',color:'#f87171',
                      borderRadius:5,padding:'3px 7px',cursor:'pointer',fontSize:'.7rem'}}>✕</button>
                </div>
              : <div style={{textAlign:'center',padding:'20px',color:'var(--text-muted)',fontSize:'.75rem'}}>Non désigné</div>
            }
          </div>
        ))}
      </div>
      {autres.length>0&&(
        <div className="cap-card">
          <div className="cap-card-title">👥 Caporaux ({autres.length})</div>
          {autres.map(m=>(
            <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'8px 0',
              borderBottom:'1px solid var(--border-color)'}}>
              <Av p={m} size={32}/>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:'.8rem',color:'var(--text-primary)'}}>{m.prenom} {m.nom}</div>
                <div style={{fontSize:'.63rem',color:'var(--text-muted)'}}>{m.grade}</div>
              </div>
              <button onClick={()=>remove(m.soldier_id)}
                style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',
                  fontSize:'.85rem',padding:'3px',borderRadius:4}}
                onMouseOver={e=>e.target.style.color='#ef4444'}
                onMouseOut={e=>e.target.style.color='var(--text-muted)'}>✕</button>
            </div>
          ))}
        </div>
      )}
      {membres.length===0&&<div className="cap-empty"><div style={{fontSize:'2rem'}}>👥</div>Aucun membre</div>}

      {showAdd&&(
        <div className="cap-overlay" onClick={e=>e.target===e.currentTarget&&setShowAdd(false)}>
          <div className="cap-modal">
            <div className="cap-modal-header">+ Ajouter membre
              {perms.canWrite && <button className="cap-modal-close" onClick={()=>setShowAdd(false)}>✕</button>}
            </div>
            <div className="cap-modal-body">
              <div className="cap-field"><label>Soldat</label>
                <select className="cap-input" value={form.soldier_id} onChange={e=>setForm(f=>({...f,soldier_id:e.target.value}))}>
                  <option value="">— Sélectionner —</option>
                  {disponibles.sort((a,b)=>a.nom.localeCompare(b.nom)).map(s=>(
                    <option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.grade}</option>
                  ))}
                </select>
              </div>
              <div className="cap-field"><label>Rôle</label>
                <select className="cap-input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  <option value="chef">⭐ Chef</option>
                  <option value="second">◎ Second</option>
                  <option value="membre">💪 Caporal</option>
                </select>
              </div>
            </div>
            <div className="cap-modal-footer">
              {perms.canWrite && <button className="cap-btn-cancel" onClick={()=>setShowAdd(false)}>Annuler</button>}
              {perms.canWrite && <button className="cap-btn-confirm" onClick={add} disabled={!form.soldier_id}>AJOUTER</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ PAGE PRINCIPALE ════════════════════════════════════════════════════════ */
export default function Caporaux() {
  const location = useLocation();
  const perms = usePermissions(JSON.parse(localStorage.getItem('user')||'{}'), location.pathname);
  const [tab,setTab]=useState('entrainements');
  const [stats,setStats]=useState(null);
  const [toast,setToast]=useState('');

  useEffect(()=>{
    api.get('/caporaux/stats').then(r=>setStats(r.data.data)).catch(()=>{});
  },[]);

  return(
    <div className="cap-page">
      <div className="cap-header">
        <div>
          <div className="cap-eyebrow">G5C ARMÉE · QG COMMAND CENTER</div>
          <h1 className="cap-title">Section Caporaux</h1>
          <div className="cap-subtitle">ENTRAÎNEMENTS · PERFORMANCES · SUIVI PHYSIQUE</div>
        </div>
      </div>
      <div className="cap-tabs">
        {[{k:'dashboard',l:'📊 Tableau de bord'},{k:'entrainements',l:'🏋️ Entraînements'},{k:'membres',l:'👥 Membres'}]
          .map(t=>(
          <button key={t.k} className={`cap-tab ${tab===t.k?'active':''}`} onClick={()=>setTab(t.k)}>{t.l}</button>
        ))}
      </div>
      {tab==='dashboard'     && <TabDashboard stats={stats}/>}
      {tab==='entrainements' && <TabEntrainements onToast={setToast} perms={perms}/>}
      {tab==='membres'       && <TabMembres onToast={setToast} perms={perms}/>}
      {toast&&<Toast msg={toast} onDone={()=>setToast('')}/>}
    </div>
  );
}

