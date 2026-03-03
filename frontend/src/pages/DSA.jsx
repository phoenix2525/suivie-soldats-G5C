import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import '../styles/DSA.css';

/* ══════════════════════════════════════════════════
   CONSTANTES
══════════════════════════════════════════════════ */
const APTITUDES_LIST = [
  { key:'apte',                   label:'Apte',                color:'#34d399', icon:'✅', bg:'rgba(52,211,153,.12)'  },
  { key:'apte_avec_restrictions', label:'Avec restrictions',   color:'#f59e0b', icon:'⚠️', bg:'rgba(245,158,11,.12)'  },
  { key:'inapte_temporaire',      label:'Inapte temporaire',   color:'#f87171', icon:'🔴', bg:'rgba(248,113,113,.12)' },
  { key:'inapte_definitif',       label:'Inapte définitif',    color:'#ef4444', icon:'⛔', bg:'rgba(239,68,68,.12)'   },
];
const APTITUDES_MAP = {
  apte:                   { label:'Apte',               color:'#34d399', bg:'rgba(52,211,153,.12)',  border:'rgba(52,211,153,.25)'  },
  apte_avec_restrictions: { label:'Avec restrictions',  color:'#f59e0b', bg:'rgba(245,158,11,.12)', border:'rgba(245,158,11,.25)'  },
  inapte_temporaire:      { label:'Inapte temporaire',  color:'#f87171', bg:'rgba(248,113,113,.12)',border:'rgba(248,113,113,.25)' },
  inapte_definitif:       { label:'Inapte définitif',   color:'#ef4444', bg:'rgba(239,68,68,.12)',  border:'rgba(239,68,68,.25)'   },
};
const GROUPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const getApt  = (key) => APTITUDES_LIST.find(a=>a.key===key) || APTITUDES_LIST[0];
const fmt     = (d)   => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

/* ══════════════════════════════════════════════════
   COMPOSANTS PARTAGÉS
══════════════════════════════════════════════════ */

/* ── Avatar ── */
const Av = ({ s, size=34, color='#34d399' }) => {
  const st = {
    width:size, height:size, borderRadius:'50%', overflow:'hidden', flexShrink:0,
    background:color+'15', border:`1px solid ${color}30`,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:size*0.28, fontWeight:700, color,
  };
  if (s?.photo_url?.startsWith('data:'))
    return <div style={st}><img src={s.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>;
  return <div style={st}>{s?.prenom?.[0]}{s?.nom?.[0]}</div>;
};

/* ── Toast ── */
const Toast = ({ msg, icon='✅', onDone }) => {
  useEffect(() => { const t=setTimeout(onDone,2800); return ()=>clearTimeout(t); },[onDone]);
  return <div className="dsa-toast"><span>{icon}</span><span className="dsa-toast-msg">{msg}</span></div>;
};

/* ── Donut ── */
const Donut = ({ aptes, restrictions, inapteTemp, inapteDef, total }) => {
  const r=50, cx=60, cy=60, stroke=18, circ=2*Math.PI*r;
  const segs=[
    {val:parseInt(aptes)||0,       color:'#34d399'},
    {val:parseInt(restrictions)||0,color:'#f59e0b'},
    {val:parseInt(inapteTemp)||0,  color:'#f87171'},
    {val:parseInt(inapteDef)||0,   color:'#ef4444'},
  ];
  const tot=segs.reduce((a,s)=>a+s.val,0)||1;
  let offset=0;
  const pct=total>0?Math.round((tot/total)*100):0;
  return (
    <div className="dsa-donut-rel">
      <svg className="dsa-donut-svg" viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={stroke}/>
        {segs.map((s,i)=>{
          const len=(s.val/tot)*circ;
          const el=<circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${len} ${circ-len}`} strokeDashoffset={-offset}/>;
          offset+=len; return el;
        })}
      </svg>
      <div className="dsa-donut-center">
        <div className="dsa-donut-pct">{pct}%</div>
        <div className="dsa-donut-sub">ÉVALUÉS</div>
      </div>
    </div>
  );
};

/* ── PatientPicker ── */
const PatientPicker = ({ soldiers, crics, value, type, onChange, onTypeChange }) => {
  const [open,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  const [dropPos,setDropPos]=useState({top:0,left:0,width:0});
  const triggerRef=useRef(); const ref=useRef();
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',h); return ()=>document.removeEventListener('mousedown',h);
  },[]);
  const handleOpen=()=>{
    if(triggerRef.current){
      const r=triggerRef.current.getBoundingClientRect();
      setDropPos({top:r.bottom+window.scrollY,left:r.left+window.scrollX,width:r.width});
    }
    setOpen(o=>!o);
  };
  const list=type==='soldat'?soldiers:crics;
  const filtered=list.filter(p=>`${p.prenom} ${p.nom} ${p.matricule||p.matricule_etudiant||''}`.toLowerCase().includes(search.toLowerCase()));
  const selected=list.find(p=>p.id==value);
  return (
    <div className="apt-patient-wrap" ref={ref}>
      <div className="apt-type-toggle">
        <button className={type==='soldat'?'active':''} onClick={()=>{onTypeChange('soldat');onChange('');setOpen(false);}}>👮 Soldat</button>
        <button className={type==='cric'?'active':''}   onClick={()=>{onTypeChange('cric');  onChange('');setOpen(false);}}>🎓 CRIC</button>
      </div>
      <div ref={triggerRef} className={`spk-trigger ${open?'open':''} ${value?'has-value':''}`} onClick={handleOpen}>
        {selected ? (
          <div className="spk-selected">
            <div className="spk-avatar">{selected.photo_url?<img src={selected.photo_url} alt=""/>:<span>{selected.prenom[0]}{selected.nom[0]}</span>}</div>
            <div className="spk-info">
              <span className="spk-name">{selected.prenom} {selected.nom}</span>
              <span className="spk-meta">{selected.grade||'CRIC'} · {selected.matricule||selected.matricule_etudiant||''}</span>
            </div>
            <button className="spk-clear" onClick={e=>{e.stopPropagation();onChange('');setSearch('');setOpen(false);}}>✕</button>
          </div>
        ) : <span className="spk-placeholder">— Sélectionner un {type} —</span>}
        <span className="spk-arrow">{open?'▲':'▼'}</span>
      </div>
      {open && (
        <div className="spk-dropdown-fixed" style={{
          position:'fixed',top:dropPos.top,left:dropPos.left,width:dropPos.width,
          zIndex:99999,background:'var(--bg-card)',border:'1px solid #C9943A',
          borderRadius:'0 0 12px 12px',boxShadow:'0 16px 40px rgba(0,0,0,.8)',overflow:'hidden'
        }}>
          <div className="spk-search-wrap">
            <span className="spk-search-icon">⌕</span>
            <input className="spk-search" placeholder="Rechercher…" autoFocus value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="spk-list">
            {filtered.length===0&&<div className="spk-empty">Aucun résultat ({list.length} disponibles)</div>}
            {filtered.map(p=>(
              <div key={p.id} className={`spk-item ${p.id==value?'active':''}`}
                onClick={()=>{onChange(p.id);setOpen(false);setSearch('');}}>
                <div className="spk-avatar">{p.photo_url?<img src={p.photo_url} alt=""/>:<span>{p.prenom[0]}{p.nom[0]}</span>}</div>
                <div className="spk-info">
                  <span className="spk-name">{p.prenom} {p.nom}</span>
                  <span className="spk-meta">{p.grade||'CRIC'} · {p.matricule||p.matricule_etudiant||''}</span>
                </div>
                {p.id==value&&<span className="spk-check">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── RCheck ── */
const RCheck = ({label,icon,value,onChange}) => (
  <div className={`apt-rcheck ${value?'on':''}`} onClick={()=>onChange(!value)}>
    <span className="apt-rcheck-icon">{icon}</span>
    <span className="apt-rcheck-label">{label}</span>
    <div className="apt-rcheck-box">{value?'✓':''}</div>
  </div>
);

/* ══════════════════════════════════════════════════
   FORMULAIRE MÉDICAL
══════════════════════════════════════════════════ */
const INIT = {
  patient_id:'', patient_type:'soldat',
  date_visite: new Date().toISOString().split('T')[0],
  aptitude_generale:'apte', groupe_sanguin:'',
  taille_cm:'', poids_kg:'', tension_arterielle:'', frequence_cardiaque:'', pouls:'',
  etat_sante_general:'',
  restriction_course:false, restriction_port_charge:false,
  restriction_station_debout_prolongee:false, restriction_ceremonies:false,
  autres_restrictions:'',
  pathologies_actuelles:'', blessures_en_cours:'', traitements_en_cours:'',
  visite_urgente_requise:false,
  observations:'', recommandations:'',
  medecin_nom:'', medecin_signature:'',
};

const MedicalForm = ({ soldiers, crics, onSave, onCancel, saving, initialData=null, editMode=false }) => {
  const [f,setF]=useState(()=>{
    if(!initialData) return INIT;
    return {
      patient_id: initialData.soldier_id||initialData.cric_id||'',
      patient_type: initialData.soldier_id?'soldat':'cric',
      date_visite: initialData.date_visite?.slice(0,10)||new Date().toISOString().slice(0,10),
      aptitude_generale: initialData.aptitude_generale||'apte',
      groupe_sanguin: initialData.groupe_sanguin||'',
      taille_cm: initialData.taille_cm||'',
      poids_kg: initialData.poids_kg||'',
      tension_arterielle: initialData.tension_arterielle||'',
      frequence_cardiaque: initialData.frequence_cardiaque||'',
      pouls: initialData.pouls||'',
      etat_sante_general: initialData.etat_sante_general||'',
      restriction_course: initialData.restriction_course||false,
      restriction_port_charge: initialData.restriction_port_charge||false,
      restriction_station_debout_prolongee: initialData.restriction_station_debout_prolongee||false,
      restriction_ceremonies: initialData.restriction_ceremonies||false,
      autres_restrictions: initialData.autres_restrictions||'',
      pathologies_actuelles: initialData.pathologies_actuelles||'',
      blessures_en_cours: initialData.blessures_en_cours||'',
      traitements_en_cours: initialData.traitements_en_cours||'',
      visite_urgente_requise: initialData.visite_urgente_requise||false,
      observations: initialData.observations||'',
      recommandations: initialData.recommandations||'',
      medecin_nom: initialData.medecin_nom||'',
      medecin_signature: initialData.medecin_signature||'',
    };
  });
  const [err,setErr]=useState('');
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const imc=f.taille_cm&&f.poids_kg?(f.poids_kg/Math.pow(f.taille_cm/100,2)).toFixed(1):null;
  const imcColor=!imc?'#94a3b8':imc<18.5?'#60a5fa':imc<25?'#34d399':imc<30?'#f59e0b':'#ef4444';
  const imcLabel=!imc?'':imc<18.5?'Insuffisance pondérale':imc<25?'Poids normal':imc<30?'Surpoids':'Obésité';
  const handleSubmit=async()=>{
    if(!f.patient_id){setErr('Sélectionnez un patient');return;}
    setErr('');
    const payload={...f,[f.patient_type==='soldat'?'soldier_id':'cric_id']:parseInt(f.patient_id)};
    delete payload.patient_id; delete payload.patient_type;
    ['taille_cm','poids_kg','frequence_cardiaque','pouls'].forEach(k=>{
      if(payload[k]!==''&&payload[k]!==null)payload[k]=parseFloat(payload[k]);
      else payload[k]=null;
    });
    await onSave(payload);
  };
  const showRestr=f.aptitude_generale!=='apte';
  return (
    <div className="aptf">
      {err&&<div className="aptf-err">{err}</div>}
      <div className="aptf-section">
        <div className="aptf-section-title">👤 Patient</div>
        <PatientPicker soldiers={soldiers} crics={crics} value={f.patient_id} type={f.patient_type}
          onChange={v=>set('patient_id',v)} onTypeChange={v=>set('patient_type',v)}/>
      </div>
      <div className="aptf-section">
        <div className="aptf-section-title">📋 Visite</div>
        <div className="aptf-row2">
          <div className="aptf-fg"><label>Date *</label>
            <input type="date" className="aptf-input" value={f.date_visite} onChange={e=>set('date_visite',e.target.value)}/>
          </div>
          <div className="aptf-fg"><label>Groupe sanguin</label>
            <div className="aptf-gs">{GROUPES.map(g=>(
              <button key={g} className={`aptf-gs-btn ${f.groupe_sanguin===g?'on':''}`}
                onClick={()=>set('groupe_sanguin',f.groupe_sanguin===g?'':g)}>{g}</button>
            ))}</div>
          </div>
        </div>
        <div className="aptf-fg"><label>Aptitude générale *</label>
          <div className="apt-apt-btns">{APTITUDES_LIST.map(a=>(
            <button key={a.key} className={`apt-apt-btn ${f.aptitude_generale===a.key?'active':''}`}
              style={f.aptitude_generale===a.key?{borderColor:a.color,background:a.bg,color:a.color}:{}}
              onClick={()=>set('aptitude_generale',a.key)}>{a.icon} {a.label}</button>
          ))}</div>
        </div>
        <div className="aptf-fg"><label>État de santé général</label>
          <input className="aptf-input" placeholder="Bon état général / Fatigué / Convalescent..."
            value={f.etat_sante_general} onChange={e=>set('etat_sante_general',e.target.value)}/>
        </div>
      </div>
      <div className="aptf-section">
        <div className="aptf-section-title">❤️ Constantes vitales</div>
        <div className="aptf-vitals">
          <div className="aptf-vital"><label>Taille</label>
            <div className="aptf-vital-inp"><input type="number" className="aptf-input" placeholder="175" value={f.taille_cm} onChange={e=>set('taille_cm',e.target.value)}/><span>cm</span></div>
          </div>
          <div className="aptf-vital"><label>Poids</label>
            <div className="aptf-vital-inp"><input type="number" className="aptf-input" placeholder="70" value={f.poids_kg} onChange={e=>set('poids_kg',e.target.value)}/><span>kg</span></div>
          </div>
          <div className="aptf-vital"><label>IMC</label>
            <div className="aptf-imc" style={{color:imcColor}}>{imc?<><b>{imc}</b><small>{imcLabel}</small></>:<small style={{color:'var(--text-muted)'}}>—</small>}</div>
          </div>
          <div className="aptf-vital"><label>Tension</label>
            <div className="aptf-vital-inp"><input className="aptf-input" placeholder="120/80" value={f.tension_arterielle} onChange={e=>set('tension_arterielle',e.target.value)}/><span>mmHg</span></div>
          </div>
          <div className="aptf-vital"><label>Fréq. cardiaque</label>
            <div className="aptf-vital-inp"><input type="number" className="aptf-input" placeholder="70" value={f.frequence_cardiaque} onChange={e=>set('frequence_cardiaque',e.target.value)}/><span>bpm</span></div>
          </div>
          <div className="aptf-vital"><label>Pouls</label>
            <div className="aptf-vital-inp"><input type="number" className="aptf-input" placeholder="72" value={f.pouls} onChange={e=>set('pouls',e.target.value)}/><span>/min</span></div>
          </div>
        </div>
      </div>
      {showRestr&&(
        <div className="aptf-section">
          <div className="aptf-section-title">⚠️ Restrictions</div>
          <div className="aptf-rchecks">
            <RCheck label="Course / Jogging"         icon="🏃" value={f.restriction_course}                   onChange={v=>set('restriction_course',v)}/>
            <RCheck label="Port de charge lourde"    icon="🏋️" value={f.restriction_port_charge}              onChange={v=>set('restriction_port_charge',v)}/>
            <RCheck label="Station debout prolongée" icon="🧍" value={f.restriction_station_debout_prolongee} onChange={v=>set('restriction_station_debout_prolongee',v)}/>
            <RCheck label="Cérémonies militaires"    icon="🎖️" value={f.restriction_ceremonies}               onChange={v=>set('restriction_ceremonies',v)}/>
          </div>
          <div className="aptf-fg" style={{marginTop:8}}><label>Autres restrictions</label>
            <input className="aptf-input" placeholder="Précisez..." value={f.autres_restrictions} onChange={e=>set('autres_restrictions',e.target.value)}/>
          </div>
        </div>
      )}
      <div className="aptf-section">
        <div className="aptf-section-title">🩺 Antécédents & pathologies</div>
        <div className="aptf-fg"><label>Pathologies actuelles</label><textarea className="aptf-input aptf-ta" placeholder="Diabète, hypertension..." value={f.pathologies_actuelles} onChange={e=>set('pathologies_actuelles',e.target.value)}/></div>
        <div className="aptf-fg"><label>Blessures en cours</label><textarea className="aptf-input aptf-ta" placeholder="Fracture, entorse..." value={f.blessures_en_cours} onChange={e=>set('blessures_en_cours',e.target.value)}/></div>
        <div className="aptf-fg"><label>Traitements en cours</label><textarea className="aptf-input aptf-ta" placeholder="Médicaments, thérapie..." value={f.traitements_en_cours} onChange={e=>set('traitements_en_cours',e.target.value)}/></div>
      </div>
      <div className="aptf-section">
        <div className="aptf-section-title">📝 Observations & recommandations</div>
        <div className="aptf-fg"><label>Observations cliniques</label><textarea className="aptf-input aptf-ta" placeholder="Notes du médecin..." value={f.observations} onChange={e=>set('observations',e.target.value)}/></div>
        <div className="aptf-fg"><label>Recommandations</label><textarea className="aptf-input aptf-ta" placeholder="Repos, suivi spécialisé..." value={f.recommandations} onChange={e=>set('recommandations',e.target.value)}/></div>
        <div className="aptf-urgent-row" onClick={()=>set('visite_urgente_requise',!f.visite_urgente_requise)}>
          <div className={`aptf-toggle ${f.visite_urgente_requise?'on':''}`}><div className="aptf-toggle-knob"/></div>
          <span style={{color:f.visite_urgente_requise?'#ef4444':'var(--text-muted)',fontWeight:600}}>🚨 Visite urgente requise</span>
        </div>
      </div>
      <div className="aptf-section">
        <div className="aptf-section-title">👨‍⚕️ Médecin</div>
        <div className="aptf-row2">
          <div className="aptf-fg"><label>Nom du médecin</label><input className="aptf-input" placeholder="Dr. Diallo..." value={f.medecin_nom} onChange={e=>set('medecin_nom',e.target.value)}/></div>
          <div className="aptf-fg"><label>N° cachet / référence</label><input className="aptf-input" placeholder="N° ordre..." value={f.medecin_signature} onChange={e=>set('medecin_signature',e.target.value)}/></div>
        </div>
      </div>
      <div className="aptf-footer">
        <button className="apt-btn-cancel" onClick={onCancel}>Annuler</button>
        <button className="apt-btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving?'⏳ Enregistrement...':'✓ Enregistrer l\'évaluation'}
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   ONGLET DASHBOARD
══════════════════════════════════════════════════ */
const TabDashboard = ({ data, onNouvelleEval }) => {
  if (!data) return <div className="apt-loading">Chargement...</div>;
  const st=data.stats||{};
  const totalSoldats=parseInt(st.total_soldats)||0;
  const aptes=parseInt(st.aptes)||0;
  const restrictions=parseInt(st.restrictions)||0;
  const inapteTemp=parseInt(st.inaptes_temp)||0;
  const inapteDef=parseInt(st.inaptes_def)||0;
  const urgences=parseInt(st.urgences)||0;
  const nonEvalues=parseInt(st.non_evalues)||0;
  const evalues=parseInt(st.evalues)||0;
  const tauxApte=evalues>0?Math.round((aptes/evalues)*100):0;

  return (
    <div>
      {/* Alerte urgences */}
      {urgences>0&&(
        <div className="dsa-alert-banner">
          <span className="dsa-alert-icon">🚨</span>
          <span className="dsa-alert-txt"><strong style={{color:'#f87171'}}>{urgences} soldat{urgences>1?'s':''}</strong> nécessite{urgences>1?'nt':''} une visite médicale urgente</span>
          <span className="dsa-alert-count">URGENT</span>
        </div>
      )}

      {/* Stats */}
      <div className="dsa-stats">
        {[
          {val:totalSoldats,lbl:'Effectif Total',     icon:'👮',color:'var(--gold-bright)',bar:'var(--gold-main)'},
          {val:aptes,       lbl:'Aptes',              icon:'✅',color:'#34d399',           bar:'#34d399'},
          {val:restrictions,lbl:'Avec restrictions',  icon:'⚠️',color:'#f59e0b',           bar:'#f59e0b'},
          {val:inapteTemp,  lbl:'Inaptes temporaires',icon:'🔴',color:'#f87171',           bar:'#f87171'},
          {val:inapteDef,   lbl:'Inaptes définitifs', icon:'⛔',color:'#ef4444',           bar:'#ef4444'},
          {val:nonEvalues,  lbl:'Non évalués',        icon:'❓',color:'var(--text-muted)', bar:'#6b7280'},
        ].map((s,i)=>(
          <div key={i} className="dsa-stat" style={{borderColor:s.val>0&&i>2?s.bar+'30':undefined}}>
            <div className="dsa-stat-bar" style={{background:s.bar}}/>
            <div className="dsa-stat-icon">{s.icon}</div>
            <div className="dsa-stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="dsa-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Grille donut + jauges + évolution */}
      <div className="dsa-grid-3">
        {/* Donut */}
        <div className="dsa-card">
          <div className="dsa-card-title">◉ Répartition Aptitudes</div>
          <div className="dsa-donut-wrap">
            <Donut aptes={aptes} restrictions={restrictions} inapteTemp={inapteTemp} inapteDef={inapteDef} total={totalSoldats}/>
            <div className="dsa-donut-legend">
              {[
                {label:'Aptes',           val:aptes,       color:'#34d399'},
                {label:'Restrictions',    val:restrictions,color:'#f59e0b'},
                {label:'Inaptes temp.',   val:inapteTemp,  color:'#f87171'},
                {label:'Inaptes déf.',    val:inapteDef,   color:'#ef4444'},
                {label:'Non évalués',     val:nonEvalues,  color:'#6b7280'},
              ].map(l=>(
                <div key={l.label} className="dsa-legend-item">
                  <div className="dsa-legend-dot" style={{background:l.color}}/>
                  <span className="dsa-legend-lbl">{l.label}</span>
                  <span className="dsa-legend-val" style={{color:l.color}}>{l.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Jauges */}
        <div className="dsa-card">
          <div className="dsa-card-title">◈ Indicateurs Santé</div>
          <div className="dsa-health-gauge">
            {[
              {lbl:"Taux d'aptitude",  val:tauxApte,                                                  color:'#34d399', max:100,                      fmt:v=>`${v}%`},
              {lbl:'Soldats évalués',  val:evalues,                                                    color:'#60a5fa', max:Math.max(totalSoldats,1),  fmt:v=>`${v}/${totalSoldats}`},
              {lbl:'Retards de visite',val:Math.max(0,totalSoldats-(data.retard?.length||0)),           color:'#f59e0b', max:Math.max(totalSoldats,1),  fmt:()=>`${data.retard?.length||0} en retard`},
              {lbl:'Cas urgents',      val:Math.max(0,evalues-urgences),                               color:urgences>0?'#ef4444':'#34d399', max:Math.max(evalues,1), fmt:()=>urgences>0?`${urgences} urgent(s)`:'Aucun'},
            ].map(g=>{
              const pct=Math.round((g.val/g.max)*100);
              return (
                <div key={g.lbl} className="dsa-gauge-row">
                  <div className="dsa-gauge-header">
                    <span className="dsa-gauge-label">{g.lbl}</span>
                    <span className="dsa-gauge-val" style={{color:g.color}}>{g.fmt(g.val)}</span>
                  </div>
                  <div className="dsa-gauge-track">
                    <div className="dsa-gauge-fill" style={{width:pct+'%',background:g.color}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Évolution */}
        <div className="dsa-card">
          <div className="dsa-card-title">📈 Évolution Mensuelle</div>
          {(!data.evolution||data.evolution.length===0)?(
            <div className="dsa-empty">Données disponibles après plusieurs visites</div>
          ):(
            <>
              <div className="dsa-bar-chart">
                {data.evolution.map((m,i)=>{
                  const tot2=(parseInt(m.aptes)||0)+(parseInt(m.restrictions)||0)+(parseInt(m.inaptes)||0)||1;
                  const hA=Math.round(((parseInt(m.aptes)||0)/tot2)*80);
                  const hR=Math.round(((parseInt(m.restrictions)||0)/tot2)*80);
                  const hI=Math.round(((parseInt(m.inaptes)||0)/tot2)*80);
                  return (
                    <div key={i} className="dsa-bar-group">
                      <div className="dsa-bar-stack">
                        {hI>0&&<div className="dsa-bar-seg" style={{height:hI+'px',background:'#ef4444'}}/>}
                        {hR>0&&<div className="dsa-bar-seg" style={{height:hR+'px',background:'#f59e0b'}}/>}
                        {hA>0&&<div className="dsa-bar-seg" style={{height:hA+'px',background:'#34d399'}}/>}
                      </div>
                      <div className="dsa-bar-lbl">{m.mois}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:'flex',gap:12,marginTop:8,justifyContent:'center'}}>
                {[['#34d399','Aptes'],['#f59e0b','Restrictions'],['#ef4444','Inaptes']].map(([c,l])=>(
                  <div key={l} style={{display:'flex',alignItems:'center',gap:5,fontSize:'.6rem',color:'var(--text-muted)'}}>
                    <div style={{width:8,height:8,borderRadius:2,background:c}}/>{l}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inaptes & Retards */}
      <div className="dsa-grid-2">
        {/* Inaptes */}
        <div className="dsa-card">
          <div className="dsa-card-title">🔴 Inaptes & Restrictions</div>
          {(!data.inaptes||data.inaptes.length===0)?(
            <div className="dsa-empty">✅ Aucun inapte ni restriction actuellement</div>
          ):(
            <div className="dsa-inaptes-list">
              {data.inaptes.map(s=>{
                const apt=APTITUDES_MAP[s.aptitude_generale]||APTITUDES_MAP.apte;
                return (
                  <div key={s.id} className="dsa-inapte-row">
                    <Av s={s} color={apt.color}/>
                    <div className="dsa-inapte-info">
                      <div className="dsa-inapte-name">{s.prenom} {s.nom}</div>
                      <div className="dsa-inapte-meta">{s.grade} · {s.matricule} · {fmt(s.date_visite)}</div>
                      {s.pathologies_actuelles&&<div style={{fontSize:'.6rem',color:'#f87171',marginTop:2,fontStyle:'italic'}}>{s.pathologies_actuelles}</div>}
                    </div>
                    <div className="dsa-restrict-icons">
                      {s.restriction_course&&<span className="dsa-restrict-icon" title="Course">🏃</span>}
                      {s.restriction_port_charge&&<span className="dsa-restrict-icon" title="Port charge">🏋️</span>}
                      {s.restriction_ceremonies&&<span className="dsa-restrict-icon" title="Cérémonies">🎖️</span>}
                    </div>
                    <span className="dsa-apt-badge" style={{background:apt.bg,color:apt.color,border:`1px solid ${apt.border}`}}>{apt.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Retards */}
        <div className="dsa-card">
          <div className="dsa-card-title">⏰ Visites en retard</div>
          {(!data.retard||data.retard.length===0)?(
            <div className="dsa-empty">✅ Tous les soldats ont été évalués récemment</div>
          ):(
            <div className="dsa-retard-list">
              {data.retard.map(s=>(
                <div key={s.id} className="dsa-retard-item">
                  <Av s={s} size={30} color="#f59e0b"/>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="dsa-retard-name">{s.prenom} {s.nom}</div>
                    <div className="dsa-retard-grade">{s.grade} · {s.matricule}</div>
                  </div>
                  {s.date_visite?(
                    <span className="dsa-retard-days" style={{
                      color:s.jours_retard>365?'#ef4444':'#f59e0b',
                      background:s.jours_retard>365?'rgba(239,68,68,.1)':'rgba(245,158,11,.1)',
                      border:`1px solid ${s.jours_retard>365?'rgba(239,68,68,.2)':'rgba(245,158,11,.2)'}`,
                      borderRadius:5,padding:'2px 8px'
                    }}>{Math.round(s.jours_retard/30)}m de retard</span>
                  ):(
                    <span className="dsa-retard-never">Jamais évalué</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Équipe médicale */}
      {data.equipe&&data.equipe.length>0&&(
        <div className="dsa-card dsa-grid-full">
          <div className="dsa-card-title">👨‍⚕️ Équipe Médicale — DSA</div>
          <div className="dsa-equipe-grid">
            {data.equipe.map((m,i)=>{
              const isChef=m.fonction?.toLowerCase().includes('chef')||m.fonction?.toLowerCase().includes('médecin chef');
              return (
                <div key={m.id} className={`dsa-equipe-card ${isChef?'chef':''}`}>
                  {isChef&&<div className="dsa-equipe-crown">👑 MÉDECIN CHEF</div>}
                  <Av s={m} size={isChef?56:44} color={isChef?'#f59e0b':'#34d399'}/>
                  <div className="dsa-equipe-name">{m.prenom} {m.nom}</div>
                  <div className="dsa-equipe-grade">{m.grade}</div>
                  <div className="dsa-equipe-fonction">{m.fonction||'Agent de Santé'}</div>
                  {m.telephone&&<div className="dsa-equipe-contact">📞 {m.telephone}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════
   ONGLET ÉVALUATIONS
══════════════════════════════════════════════════ */
const TabEvaluations = ({ soldiers, crics, onSave, saving }) => {
  const [showForm,setShowForm]=useState(false);
  const [filter,setFilter]=useState('all');
  const [search,setSearch]=useState('');
  const [allApt,setAllApt]=useState([]);
  const [inaptes,setInaptes]=useState([]);
  const [retard,setRetard]=useState([]);
  const [stats,setStats]=useState(null);
  const [loading,setLoading]=useState(true);
  const [ficheId,setFicheId]=useState(null);
  const [ficheData,setFicheData]=useState(null);
  const [editApt,setEditApt]=useState(null);

  const loadEvals=useCallback(async()=>{
    setLoading(true);
    try {
      const [inR,retR,stR,allR]=await Promise.all([
        api.get('/aptitudes/inaptes').catch(()=>({data:{data:[]}})),
        api.get('/aptitudes/retard').catch(()=>({data:{data:[]}})),
        api.get('/aptitudes/stats').catch(()=>({data:{data:null}})),
        api.get('/aptitudes/all').catch(()=>({data:{data:[]}})),
      ]);
      setInaptes(inR.data.data||[]);
      setRetard(retR.data.data||[]);
      setStats(stR.data.data);
      setAllApt(allR.data.data||[]);
    } catch(e){console.error(e);}
    setLoading(false);
  },[]);

  useEffect(()=>{loadEvals();},[loadEvals]);

  // Charger le détail d'une fiche
  useEffect(()=>{
    if(!ficheId){setFicheData(null);return;}
    api.get(`/aptitudes/${ficheId}`).then(r=>setFicheData(r.data.data)).catch(()=>setFicheData(null));
  },[ficheId]);

  const handleSave=async(payload)=>{
    await onSave(payload);
    setShowForm(false);
    loadEvals();
  };

  const handleDelete=async(id)=>{
    if(!window.confirm('Supprimer cette évaluation ?')) return;
    try{
      await api.delete(`/aptitudes/${id}`);
      loadEvals();
    }catch(e){alert('Erreur lors de la suppression');}
  };

  const handleEdit=async(payload)=>{
    try{
      await api.put(`/aptitudes/${editApt.id}`,payload);
      setEditApt(null);
      loadEvals();
    }catch(e){alert('Erreur lors de la modification');}
  };

  const nbInaptes=(stats?.inaptes_temp||0)+(stats?.inaptes_def||0);
  const nbRestricts=stats?.avec_restrictions||0;
  let displayed=filter==='inaptes'?inaptes:filter==='retard'?retard:allApt;
  if(search){const q=search.toLowerCase();displayed=displayed.filter(a=>`${a.prenom||''} ${a.nom||''} ${a.matricule||''}`.toLowerCase().includes(q));}

  return (
    <div>
      {/* KPIs */}
      <div className="apt-kpis" style={{marginBottom:20}}>
        {[
          {label:'Évalués',    val:stats?.soldats_evalues||0, color:'#C9A84C',icon:'📋'},
          {label:'Aptes',      val:stats?.aptes||0,           color:'#34d399',icon:'✅'},
          {label:'Restrictions',val:nbRestricts,              color:'#f59e0b',icon:'⚠️'},
          {label:'Inaptes',    val:nbInaptes,                 color:'#ef4444',icon:'⛔'},
          {label:'Sans visite',val:retard.length,             color:'#f87171',icon:'🔔'},
          {label:'Urgences',   val:stats?.urgences||0,        color:'#ef4444',icon:'🚨'},
        ].map(k=>(
          <div key={k.label} className="apt-kpi" style={{borderColor:k.color+'44'}}>
            <div className="apt-kpi-icon">{k.icon}</div>
            <div className="apt-kpi-val" style={{color:k.color}}>{k.val}</div>
            <div className="apt-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="apt-toolbar">
        <div className="apt-search-wrap">
          <span>⌕</span>
          <input className="apt-search-input" placeholder="Rechercher patient..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="apt-filter-btns">
          {[
            {key:'all',    label:'Toutes'},
            {key:'inaptes',label:`⛔ Inaptes (${nbInaptes+nbRestricts})`},
            {key:'retard', label:`🔔 Sans visite (${retard.length})`},
          ].map(b=>(
            <button key={b.key} className={`apt-fbtn ${filter===b.key?'active':''}`} onClick={()=>setFilter(b.key)}>{b.label}</button>
          ))}
        </div>
        <button className="apt-btn-primary" onClick={()=>setShowForm(true)}>+ Nouvelle évaluation</button>
      </div>

      {/* Grille */}
      {loading?<div className="apt-loading">Chargement...</div>:displayed.length===0?(
        <div className="apt-empty"><span>🩺</span><p>Aucune évaluation enregistrée</p></div>
      ):(
        <div className="apt-cards-grid">
          {displayed.map(a=>{
            const apt=getApt(a.aptitude_generale);
            return (
              <div key={a.id} className="apt-card" style={{borderColor:apt.color+'44',cursor:'pointer'}}
                onClick={()=>setFicheId(a.id)}>
                <div className="apt-card-header" style={{background:apt.bg}}>
                  <div className="apt-card-avatar">{a.photo_url?<img src={a.photo_url} alt=""/>:<span>{a.prenom?.[0]}{a.nom?.[0]}</span>}</div>
                  <div className="apt-card-id">
                    <div className="apt-card-name">{a.prenom} {a.nom}</div>
                    <div className="apt-card-meta">{a.grade||'CRIC'} · {a.matricule||'—'}</div>
                  </div>
                  <div className="apt-card-badge" style={{color:apt.color}}>{apt.icon} {apt.label}</div>
                </div>
                <div className="apt-card-body">
                  <div className="apt-card-row"><span>📅 Visite</span><span>{fmt(a.date_visite)}</span></div>
                  {a.groupe_sanguin&&<div className="apt-card-row"><span>🩸 Groupe</span><span className="apt-gs-val">{a.groupe_sanguin}</span></div>}
                  {a.tension_arterielle&&<div className="apt-card-row"><span>💉 Tension</span><span>{a.tension_arterielle} mmHg</span></div>}
                  {a.taille_cm&&a.poids_kg&&<div className="apt-card-row"><span>📏 IMC</span><span>{(a.poids_kg/Math.pow(a.taille_cm/100,2)).toFixed(1)}</span></div>}
                  {a.medecin_nom&&<div className="apt-card-row"><span>👨‍⚕️</span><span>{a.medecin_nom}</span></div>}
                </div>
                {(a.restriction_course||a.restriction_port_charge||a.restriction_station_debout_prolongee||a.restriction_ceremonies)&&(
                  <div className="apt-card-restr">
                    {a.restriction_course&&<span title="Course">🏃</span>}
                    {a.restriction_port_charge&&<span title="Port de charge">🏋️</span>}
                    {a.restriction_station_debout_prolongee&&<span title="Station debout">🧍</span>}
                    {a.restriction_ceremonies&&<span title="Cérémonies">🎖️</span>}
                  </div>
                )}
                {a.visite_urgente_requise&&<div className="apt-card-urgent">🚨 VISITE URGENTE</div>}
                <div style={{padding:'8px 14px',borderTop:'1px solid rgba(255,255,255,.05)',display:'flex',gap:6,justifyContent:'flex-end'}}
                  onClick={e=>e.stopPropagation()}>
                  <button style={{background:'none',border:'1px solid rgba(96,165,250,.3)',color:'#60a5fa',cursor:'pointer',fontSize:'.65rem',padding:'3px 10px',borderRadius:5,transition:'all .2s'}}
                    onClick={()=>setFicheId(a.id)}>🔍 Détail</button>
                  <button style={{background:'none',border:'1px solid rgba(245,158,11,.3)',color:'#f59e0b',cursor:'pointer',fontSize:'.65rem',padding:'3px 10px',borderRadius:5,transition:'all .2s'}}
                    onClick={()=>setEditApt(a)}>✏️ Éditer</button>
                  <button style={{background:'none',border:'1px solid rgba(239,68,68,.3)',color:'#ef4444',cursor:'pointer',fontSize:'.65rem',padding:'3px 10px',borderRadius:5,transition:'all .2s'}}
                    onClick={()=>handleDelete(a.id)}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Fiche détaillée ── */}
      {ficheId && ficheData && (
        <div className="apt-overlay" onClick={e=>e.target===e.currentTarget&&setFicheId(null)}>
          <div className="apt-modal apt-modal-lg" style={{maxWidth:640}}>
            <div className="apt-modal-header" style={{background:'rgba(52,211,153,.07)'}}>
              <span>🩺 Fiche médicale complète</span>
              <button className="apt-modal-close" onClick={()=>setFicheId(null)}>✕</button>
            </div>
            <div className="apt-modal-body" style={{gap:0}}>
              {/* En-tête patient */}
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'12px 0 18px',borderBottom:'1px solid rgba(255,255,255,.07)',marginBottom:16}}>
                {ficheData.photo_url?.startsWith('data:')
                  ? <img src={ficheData.photo_url} alt="" style={{width:56,height:56,borderRadius:'50%',objectFit:'cover',border:'2px solid rgba(52,211,153,.3)'}}/>
                  : <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(52,211,153,.15)',border:'2px solid rgba(52,211,153,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',fontWeight:700,color:'#34d399'}}>{ficheData.prenom?.[0]}{ficheData.nom?.[0]}</div>
                }
                <div style={{flex:1}}>
                  <div style={{fontSize:'1rem',fontWeight:700,color:'var(--text-primary)'}}>{ficheData.prenom} {ficheData.nom}</div>
                  <div style={{fontSize:'.72rem',color:'var(--gold-main)',marginTop:2}}>{ficheData.grade} · {ficheData.matricule}</div>
                  {ficheData.ufr&&<div style={{fontSize:'.65rem',color:'var(--text-muted)',marginTop:1}}>{ficheData.ufr}</div>}
                </div>
                {(()=>{const apt=getApt(ficheData.aptitude_generale);return(
                  <div style={{padding:'6px 14px',borderRadius:8,background:apt.bg,color:apt.color,border:`1px solid ${apt.color}44`,fontSize:'.75rem',fontWeight:700}}>
                    {apt.icon} {apt.label}
                  </div>
                );})()}
              </div>

              {/* Visite */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                {[
                  ['📅 Date visite',    fmt(ficheData.date_visite)],
                  ['🩸 Groupe sanguin', ficheData.groupe_sanguin||'—'],
                  ['📏 Taille',         ficheData.taille_cm?`${ficheData.taille_cm} cm`:'—'],
                  ['⚖️ Poids',          ficheData.poids_kg?`${ficheData.poids_kg} kg`:'—'],
                  ['📊 IMC',            ficheData.taille_cm&&ficheData.poids_kg?(ficheData.poids_kg/Math.pow(ficheData.taille_cm/100,2)).toFixed(1):'—'],
                  ['💉 Tension',        ficheData.tension_arterielle?`${ficheData.tension_arterielle} mmHg`:'—'],
                  ['❤️ Fréq. cardiaque',ficheData.frequence_cardiaque?`${ficheData.frequence_cardiaque} bpm`:'—'],
                  ['🫀 Pouls',          ficheData.pouls?`${ficheData.pouls}/min`:'—'],
                ].map(([l,v])=>(
                  <div key={l} style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'8px 12px'}}>
                    <div style={{fontSize:'.6rem',color:'var(--text-muted)',marginBottom:3}}>{l}</div>
                    <div style={{fontSize:'.78rem',color:'var(--text-primary)',fontWeight:600}}>{v}</div>
                  </div>
                ))}
              </div>

              {/* État général */}
              {ficheData.etat_sante_general&&(
                <div style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'10px 14px',marginBottom:10}}>
                  <div style={{fontSize:'.6rem',color:'var(--text-muted)',marginBottom:4}}>🏥 ÉTAT DE SANTÉ GÉNÉRAL</div>
                  <div style={{fontSize:'.78rem',color:'var(--text-primary)'}}>{ficheData.etat_sante_general}</div>
                </div>
              )}

              {/* Restrictions */}
              {(ficheData.restriction_course||ficheData.restriction_port_charge||ficheData.restriction_station_debout_prolongee||ficheData.restriction_ceremonies)&&(
                <div style={{background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.2)',borderRadius:8,padding:'10px 14px',marginBottom:10}}>
                  <div style={{fontSize:'.6rem',color:'#f59e0b',marginBottom:8,letterSpacing:'.15em'}}>⚠️ RESTRICTIONS</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {ficheData.restriction_course&&<span className="apt-restr-tag">🏃 Course</span>}
                    {ficheData.restriction_port_charge&&<span className="apt-restr-tag">🏋️ Port de charge</span>}
                    {ficheData.restriction_station_debout_prolongee&&<span className="apt-restr-tag">🧍 Station debout</span>}
                    {ficheData.restriction_ceremonies&&<span className="apt-restr-tag">🎖️ Cérémonies</span>}
                    {ficheData.autres_restrictions&&<span className="apt-restr-tag">➕ {ficheData.autres_restrictions}</span>}
                  </div>
                </div>
              )}

              {/* Antécédents */}
              {[
                ['🩺 Pathologies actuelles',  ficheData.pathologies_actuelles],
                ['🤕 Blessures en cours',     ficheData.blessures_en_cours],
                ['💊 Traitements en cours',   ficheData.traitements_en_cours],
                ['📝 Observations cliniques', ficheData.observations],
                ['✅ Recommandations',        ficheData.recommandations],
              ].filter(([,v])=>v).map(([l,v])=>(
                <div key={l} style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'10px 14px',marginBottom:8}}>
                  <div style={{fontSize:'.6rem',color:'var(--text-muted)',marginBottom:4,letterSpacing:'.12em'}}>{l}</div>
                  <div style={{fontSize:'.78rem',color:'var(--text-secondary)',lineHeight:1.5}}>{v}</div>
                </div>
              ))}

              {/* Urgence */}
              {ficheData.visite_urgente_requise&&(
                <div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:8,padding:'10px 14px',textAlign:'center',color:'#ef4444',fontWeight:700,fontSize:'.8rem',marginBottom:8}}>
                  🚨 VISITE MÉDICALE URGENTE REQUISE
                </div>
              )}

              {/* Médecin */}
              {(ficheData.medecin_nom||ficheData.medecin_signature)&&(
                <div style={{display:'flex',gap:12,marginTop:4}}>
                  {ficheData.medecin_nom&&<div style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'8px 14px',flex:1}}>
                    <div style={{fontSize:'.6rem',color:'var(--text-muted)',marginBottom:3}}>👨‍⚕️ MÉDECIN</div>
                    <div style={{fontSize:'.78rem',color:'var(--text-primary)',fontWeight:600}}>{ficheData.medecin_nom}</div>
                  </div>}
                  {ficheData.medecin_signature&&<div style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'8px 14px',flex:1}}>
                    <div style={{fontSize:'.6rem',color:'var(--text-muted)',marginBottom:3}}>🔖 CACHET / REF</div>
                    <div style={{fontSize:'.78rem',color:'var(--text-primary)',fontWeight:600}}>{ficheData.medecin_signature}</div>
                  </div>}
                </div>
              )}
            </div>
            <div className="apt-modal-footer" style={{justifyContent:'space-between'}}>
              <div style={{display:'flex',gap:8}}>
                <button className="apt-btn-cancel" style={{color:'#f59e0b',borderColor:'rgba(245,158,11,.3)'}}
                  onClick={()=>{setEditApt(ficheData);setFicheId(null);}}>✏️ Modifier</button>
                <button className="apt-btn-cancel" style={{color:'#ef4444',borderColor:'rgba(239,68,68,.3)'}}
                  onClick={()=>{if(window.confirm('Supprimer cette évaluation ?')){handleDelete(ficheId);setFicheId(null);}}}>🗑️ Supprimer</button>
              </div>
              <button className="apt-btn-primary" onClick={()=>setFicheId(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal édition ── */}
      {editApt&&(
        <div className="apt-overlay" onClick={e=>e.target===e.currentTarget&&setEditApt(null)}>
          <div className="apt-modal apt-modal-lg">
            <div className="apt-modal-header">
              <span>✏️ Modifier l'évaluation — {editApt.prenom} {editApt.nom}</span>
              <button className="apt-modal-close" onClick={()=>setEditApt(null)}>✕</button>
            </div>
            <div className="apt-modal-body">
              <MedicalForm soldiers={soldiers} crics={crics}
                initialData={editApt}
                onSave={handleEdit}
                onCancel={()=>setEditApt(null)}
                saving={saving}
                editMode={true}/>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm&&(
        <div className="apt-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="apt-modal apt-modal-lg">
            <div className="apt-modal-header">
              <span>🏥 Nouvelle évaluation médicale</span>
              <button className="apt-modal-close" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="apt-modal-body">
              <MedicalForm soldiers={soldiers} crics={crics}
                onSave={handleSave} onCancel={()=>setShowForm(false)} saving={saving}/>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════
   ONGLET HISTORIQUE
══════════════════════════════════════════════════ */
const TabHistorique = ({ soldiers }) => {
  const [selected,setSelected]=useState(null);
  const [historique,setHistorique]=useState([]);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState('');

  const openHistorique=async(s)=>{
    setSelected(s); setLoading(true);
    try{const r=await api.get(`/aptitudes/soldat/${s.id}/historique`);setHistorique(r.data.data||[]);}
    catch(e){setHistorique([]);}
    setLoading(false);
  };

  const filtered=soldiers.filter(s=>`${s.prenom} ${s.nom} ${s.matricule||''}`.toLowerCase().includes(search.toLowerCase()));

  if(selected) return (
    <div className="apt-historique">
      <div className="apt-hist-header">
        <div className="apt-soldier-avatar lg">{selected.prenom?.[0]}{selected.nom?.[0]}</div>
        <div>
          <div className="apt-detail-name">{selected.prenom} {selected.nom}</div>
          <div className="apt-detail-meta">{selected.grade} · {selected.matricule}</div>
        </div>
        <button className="apt-hist-btn" onClick={()=>{setSelected(null);setHistorique([]);}}>← Retour</button>
      </div>
      {loading?<div className="apt-loading">Chargement...</div>
       :historique.length===0?<div className="apt-empty"><span>📋</span><p>Aucun historique médical</p></div>
       :(
        <div className="apt-timeline">
          {historique.map((h,i)=>{
            const info=getApt(h.aptitude_generale);
            return (
              <div key={h.id} className="apt-timeline-item">
                <div className="apt-timeline-dot" style={{background:info.color,borderColor:info.color}}>
                  {i===0&&<div className="apt-timeline-pulse" style={{background:info.color+'33'}}/>}
                </div>
                <div className="apt-timeline-content">
                  <div className="apt-timeline-header">
                    <span className="apt-apt-badge" style={{color:info.color,background:info.bg,border:`1px solid ${info.color}44`}}>{info.icon} {info.label}</span>
                    {i===0&&<span className="apt-current-badge">● ACTUEL</span>}
                    <span className="apt-timeline-date">{fmt(h.date_visite)}</span>
                  </div>
                  {(h.taille_cm||h.poids_kg||h.tension_arterielle||h.groupe_sanguin)&&(
                    <div className="apt-hist-vitals">
                      {h.groupe_sanguin&&<span>🩸 {h.groupe_sanguin}</span>}
                      {h.taille_cm&&<span>📏 {h.taille_cm}cm</span>}
                      {h.poids_kg&&<span>⚖️ {h.poids_kg}kg</span>}
                      {h.tension_arterielle&&<span>💉 {h.tension_arterielle}</span>}
                      {h.frequence_cardiaque&&<span>❤️ {h.frequence_cardiaque}bpm</span>}
                    </div>
                  )}
                  {(h.restriction_course||h.restriction_port_charge||h.restriction_station_debout_prolongee||h.restriction_ceremonies)&&(
                    <div className="apt-restr-tags">
                      {h.restriction_course&&<span className="apt-restr-tag">🏃 Course</span>}
                      {h.restriction_port_charge&&<span className="apt-restr-tag">🏋️ Port charge</span>}
                      {h.restriction_station_debout_prolongee&&<span className="apt-restr-tag">🧍 Station debout</span>}
                      {h.restriction_ceremonies&&<span className="apt-restr-tag">🎖️ Cérémonies</span>}
                    </div>
                  )}
                  {h.pathologies_actuelles&&<div className="apt-detail-field"><b>Pathologies :</b> {h.pathologies_actuelles}</div>}
                  {h.traitements_en_cours&&<div className="apt-detail-field"><b>Traitements :</b> {h.traitements_en_cours}</div>}
                  {h.observations&&<div className="apt-detail-field"><b>Observations :</b> {h.observations}</div>}
                  {h.recommandations&&<div className="apt-detail-field"><b>Recommandations :</b> {h.recommandations}</div>}
                  {h.visite_urgente_requise&&<div className="apt-card-urgent">🚨 VISITE URGENTE</div>}
                  <div className="apt-timeline-footer">
                    {h.medecin_nom&&<span>👨‍⚕️ {h.medecin_nom}</span>}
                    {h.medecin_signature&&<span>🔖 {h.medecin_signature}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div className="apt-toolbar" style={{marginBottom:16}}>
        <div className="apt-search-wrap">
          <span>⌕</span>
          <input className="apt-search-input" placeholder="Rechercher un soldat..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      <div className="apt-cards-grid">
        {filtered.map(s=>(
          <div key={s.id} className="apt-card" style={{cursor:'pointer'}} onClick={()=>openHistorique(s)}>
            <div className="apt-card-header" style={{background:'rgba(52,211,153,.05)'}}>
              <div className="apt-card-avatar">{s.photo_url?<img src={s.photo_url} alt=""/>:<span>{s.prenom?.[0]}{s.nom?.[0]}</span>}</div>
              <div className="apt-card-id">
                <div className="apt-card-name">{s.prenom} {s.nom}</div>
                <div className="apt-card-meta">{s.grade} · {s.matricule}</div>
              </div>
              <span style={{fontSize:'.7rem',color:'#34d399'}}>🕐 Voir</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   PAGE PRINCIPALE DSA
══════════════════════════════════════════════════ */
export default function DSA() {
  const [tab,     setTab]     = useState('dashboard');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [soldiers,setSoldiers]= useState([]);
  const [crics,   setCrics]   = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(null);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [dash,sols,cricR]=await Promise.allSettled([
        api.get('/dsa/dashboard'),
        api.get('/soldiers'),
        api.get('/crics'),
      ]);
      if(dash.status==='fulfilled') setData(dash.value.data.data);
      if(sols.status==='fulfilled') setSoldiers((sols.value.data.data||[]).filter(s=>s.statut==='actif'));
      if(cricR.status==='fulfilled') setCrics(cricR.value.data.data||[]);
    }catch(e){console.error(e);}
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  const handleSave=async(payload)=>{
    setSaving(true);
    try{
      await api.post('/aptitudes',payload);
      setToast({msg:'Évaluation enregistrée !',icon:'✅'});
      load();
    }catch(e){
      setToast({msg:e.response?.data?.error||'Erreur serveur',icon:'❌'});
    }
    setSaving(false);
  };

  const urgences=parseInt(data?.stats?.urgences)||0;
  const nonEvalues=parseInt(data?.stats?.non_evalues)||0;

  return (
    <div className="dsa-page">
      {/* Header */}
      <div className="dsa-header">
        <div>
          <div className="dsa-eyebrow">G5C Armée · QG Command Center</div>
          <div className="dsa-title">Direction de la Santé de l'Armée</div>
          <div className="dsa-subtitle">SURVEILLANCE MÉDICALE · APTITUDES · HISTORIQUE</div>
        </div>
        <div className="dsa-header-actions">
          {urgences>0&&(
            <div className="dsa-alert-pill">🚨 {urgences} urgent{urgences>1?'s':''}</div>
          )}
          {nonEvalues>0&&(
            <div className="dsa-warn-pill">⚠️ {nonEvalues} non évalué{nonEvalues>1?'s':''}</div>
          )}
        </div>
      </div>

      {/* Onglets principaux */}
      <div className="dsa-main-tabs">
        {[
          {key:'dashboard',  label:'🏥 Tableau de bord'},
          {key:'evals',      label:'📋 Évaluations'},
          {key:'historique', label:'🕐 Historique'},
        ].map(t=>(
          <button key={t.key} className={`dsa-main-tab ${tab===t.key?'active':''}`} onClick={()=>setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {loading&&tab==='dashboard'?(
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'40vh'}}>
          <div className="spinner"/>
        </div>
      ):(
        <>
          {tab==='dashboard'  && <TabDashboard data={data} onNouvelleEval={()=>setTab('evals')}/>}
          {tab==='evals'      && <TabEvaluations soldiers={soldiers} crics={crics} onSave={handleSave} saving={saving}/>}
          {tab==='historique' && <TabHistorique soldiers={soldiers}/>}
        </>
      )}

      {toast&&<Toast msg={toast.msg} icon={toast.icon} onDone={()=>setToast(null)}/>}
    </div>
  );
}
