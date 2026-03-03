import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import '../styles/Aptitudes.css';

const APTITUDES = [
  { key:'apte',                   label:'Apte',                   color:'#34d399', icon:'✅', bg:'rgba(52,211,153,.12)'  },
  { key:'apte_avec_restrictions', label:'Avec restrictions',       color:'#f59e0b', icon:'⚠️', bg:'rgba(245,158,11,.12)'  },
  { key:'inapte_temporaire',      label:'Inapte temporaire',       color:'#f87171', icon:'🔴', bg:'rgba(248,113,113,.12)' },
  { key:'inapte_definitif',       label:'Inapte définitif',        color:'#ef4444', icon:'⛔', bg:'rgba(239,68,68,.12)'   },
];
const GROUPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const getApt  = (key) => APTITUDES.find(a=>a.key===key) || APTITUDES[0];
const fmt     = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtDays = (n) => !n ? 'Jamais' : n<30 ? `${n}j` : n<365 ? `${Math.round(n/30)}mois` : `${Math.round(n/365)}an(s)`;

/* ── PatientPicker ─────────────────────────────────────────────────────── */
const PatientPicker = ({ soldiers, crics, value, type, onChange, onTypeChange }) => {
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const [dropPos, setDropPos] = useState({top:0,left:0,width:0});
  const triggerRef = useRef();
  const ref = useRef();

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
    }
    setOpen(o => !o);
  };

  const list     = type === 'soldat' ? soldiers : crics;
  const filtered = list.filter(p =>
    `${p.prenom} ${p.nom} ${p.matricule||p.matricule_etudiant||''}`.toLowerCase().includes(search.toLowerCase())
  );
  const selected = list.find(p => p.id == value);

  return (
    <div className="apt-patient-wrap" ref={ref}>
      <div className="apt-type-toggle">
        <button className={type==='soldat'?'active':''} onClick={()=>{onTypeChange('soldat');onChange('');setOpen(false);}}>👮 Soldat</button>
        <button className={type==='cric'?'active':''  } onClick={()=>{onTypeChange('cric');  onChange('');setOpen(false);}}>🎓 CRIC</button>
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
          position:'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width,
          zIndex:99999, background:'var(--bg-card)', border:'1px solid #C9943A',
          borderRadius:'0 0 12px 12px', boxShadow:'0 16px 40px rgba(0,0,0,.8)', overflow:'hidden'
        }}>
          <div className="spk-search-wrap">
            <span className="spk-search-icon">⌕</span>
            <input className="spk-search" placeholder="Rechercher…" autoFocus value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="spk-list">
            {filtered.length===0 && <div className="spk-empty">Aucun résultat ({list.length} disponibles)</div>}
            {filtered.map(p=>(
              <div key={p.id} className={`spk-item ${p.id==value?'active':''}`}
                onClick={()=>{onChange(p.id);setOpen(false);setSearch('');}}>
                <div className="spk-avatar">{p.photo_url?<img src={p.photo_url} alt=""/>:<span>{p.prenom[0]}{p.nom[0]}</span>}</div>
                <div className="spk-info">
                  <span className="spk-name">{p.prenom} {p.nom}</span>
                  <span className="spk-meta">{p.grade||'CRIC'} · {p.matricule||p.matricule_etudiant||''}</span>
                </div>
                {p.id==value && <span className="spk-check">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Checkbox restriction ──────────────────────────────────────────────── */
const RCheck = ({label, icon, value, onChange}) => (
  <div className={`apt-rcheck ${value?'on':''}`} onClick={()=>onChange(!value)}>
    <span className="apt-rcheck-icon">{icon}</span>
    <span className="apt-rcheck-label">{label}</span>
    <div className="apt-rcheck-box">{value?'✓':''}</div>
  </div>
);

/* ── Formulaire médical ────────────────────────────────────────────────── */
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

const MedicalForm = ({ soldiers, crics, onSave, onCancel, saving }) => {
  const [f, setF] = useState(INIT);
  const [err, setErr] = useState('');
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const imc = f.taille_cm && f.poids_kg
    ? (f.poids_kg / Math.pow(f.taille_cm/100,2)).toFixed(1) : null;
  const imcColor = !imc?'#94a3b8':imc<18.5?'#60a5fa':imc<25?'#34d399':imc<30?'#f59e0b':'#ef4444';
  const imcLabel = !imc?'':imc<18.5?'Insuffisance pondérale':imc<25?'Poids normal':imc<30?'Surpoids':'Obésité';

  const handleSubmit = async () => {
    if (!f.patient_id) { setErr('Sélectionnez un patient'); return; }
    setErr('');
    const payload = {...f, [f.patient_type==='soldat'?'soldier_id':'cric_id']: parseInt(f.patient_id)};
    delete payload.patient_id; delete payload.patient_type;
    ['taille_cm','poids_kg','frequence_cardiaque','pouls'].forEach(k=>{
      if(payload[k]!=='' && payload[k]!==null) payload[k]=parseFloat(payload[k]);
      else payload[k]=null;
    });
    await onSave(payload);
  };

  const apt = getApt(f.aptitude_generale);
  const showRestr = f.aptitude_generale !== 'apte';

  return (
    <div className="aptf">
      {err && <div className="aptf-err">{err}</div>}

      {/* PATIENT */}
      <div className="aptf-section">
        <div className="aptf-section-title">👤 Patient</div>
        <PatientPicker soldiers={soldiers} crics={crics}
          value={f.patient_id} type={f.patient_type}
          onChange={v=>set('patient_id',v)} onTypeChange={v=>set('patient_type',v)}/>
      </div>

      {/* VISITE */}
      <div className="aptf-section">
        <div className="aptf-section-title">📋 Visite</div>
        <div className="aptf-row2">
          <div className="aptf-fg">
            <label>Date *</label>
            <input type="date" className="aptf-input" value={f.date_visite} onChange={e=>set('date_visite',e.target.value)}/>
          </div>
          <div className="aptf-fg">
            <label>Groupe sanguin</label>
            <div className="aptf-gs">
              {GROUPES.map(g=>(
                <button key={g} className={`aptf-gs-btn ${f.groupe_sanguin===g?'on':''}`}
                  onClick={()=>set('groupe_sanguin', f.groupe_sanguin===g?'':g)}>{g}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="aptf-fg">
          <label>Aptitude générale *</label>
          <div className="apt-apt-btns">
            {APTITUDES.map(a=>(
              <button key={a.key} className={`apt-apt-btn ${f.aptitude_generale===a.key?'active':''}`}
                style={f.aptitude_generale===a.key?{borderColor:a.color,background:a.bg,color:a.color}:{}}
                onClick={()=>set('aptitude_generale',a.key)}>{a.icon} {a.label}</button>
            ))}
          </div>
        </div>
        <div className="aptf-fg">
          <label>État de santé général</label>
          <input className="aptf-input" placeholder="Bon état général / Fatigué / Convalescent..."
            value={f.etat_sante_general} onChange={e=>set('etat_sante_general',e.target.value)}/>
        </div>
      </div>

      {/* CONSTANTES */}
      <div className="aptf-section">
        <div className="aptf-section-title">❤️ Constantes vitales</div>
        <div className="aptf-vitals">
          <div className="aptf-vital">
            <label>Taille</label>
            <div className="aptf-vital-inp"><input type="number" className="aptf-input" placeholder="175" value={f.taille_cm} onChange={e=>set('taille_cm',e.target.value)}/><span>cm</span></div>
          </div>
          <div className="aptf-vital">
            <label>Poids</label>
            <div className="aptf-vital-inp"><input type="number" className="aptf-input" placeholder="70" value={f.poids_kg} onChange={e=>set('poids_kg',e.target.value)}/><span>kg</span></div>
          </div>
          <div className="aptf-vital">
            <label>IMC</label>
            <div className="aptf-imc" style={{color:imcColor}}>{imc?<><b>{imc}</b><small>{imcLabel}</small></>:<small style={{color:'var(--text-muted)'}}>—</small>}</div>
          </div>
          <div className="aptf-vital">
            <label>Tension</label>
            <div className="aptf-vital-inp"><input className="aptf-input" placeholder="120/80" value={f.tension_arterielle} onChange={e=>set('tension_arterielle',e.target.value)}/><span>mmHg</span></div>
          </div>
          <div className="aptf-vital">
            <label>Fréq. cardiaque</label>
            <div className="aptf-vital-inp"><input type="number" className="aptf-input" placeholder="70" value={f.frequence_cardiaque} onChange={e=>set('frequence_cardiaque',e.target.value)}/><span>bpm</span></div>
          </div>
          <div className="aptf-vital">
            <label>Pouls</label>
            <div className="aptf-vital-inp"><input type="number" className="aptf-input" placeholder="72" value={f.pouls} onChange={e=>set('pouls',e.target.value)}/><span>/min</span></div>
          </div>
        </div>
      </div>

      {/* RESTRICTIONS */}
      {showRestr && (
        <div className="aptf-section">
          <div className="aptf-section-title">⚠️ Restrictions</div>
          <div className="aptf-rchecks">
            <RCheck label="Course / Jogging"          icon="🏃" value={f.restriction_course}                     onChange={v=>set('restriction_course',v)}/>
            <RCheck label="Port de charge lourde"     icon="🏋️" value={f.restriction_port_charge}                onChange={v=>set('restriction_port_charge',v)}/>
            <RCheck label="Station debout prolongée"  icon="🧍" value={f.restriction_station_debout_prolongee}   onChange={v=>set('restriction_station_debout_prolongee',v)}/>
            <RCheck label="Cérémonies militaires"     icon="🎖️" value={f.restriction_ceremonies}                 onChange={v=>set('restriction_ceremonies',v)}/>
          </div>
          <div className="aptf-fg" style={{marginTop:8}}>
            <label>Autres restrictions</label>
            <input className="aptf-input" placeholder="Précisez..." value={f.autres_restrictions} onChange={e=>set('autres_restrictions',e.target.value)}/>
          </div>
        </div>
      )}

      {/* ANTÉCÉDENTS */}
      <div className="aptf-section">
        <div className="aptf-section-title">🩺 Antécédents & pathologies</div>
        <div className="aptf-fg"><label>Pathologies actuelles</label><textarea className="aptf-input aptf-ta" placeholder="Diabète, hypertension..." value={f.pathologies_actuelles} onChange={e=>set('pathologies_actuelles',e.target.value)}/></div>
        <div className="aptf-fg"><label>Blessures en cours</label><textarea className="aptf-input aptf-ta" placeholder="Fracture, entorse..." value={f.blessures_en_cours} onChange={e=>set('blessures_en_cours',e.target.value)}/></div>
        <div className="aptf-fg"><label>Traitements en cours</label><textarea className="aptf-input aptf-ta" placeholder="Médicaments, thérapie..." value={f.traitements_en_cours} onChange={e=>set('traitements_en_cours',e.target.value)}/></div>
      </div>

      {/* OBSERVATIONS */}
      <div className="aptf-section">
        <div className="aptf-section-title">📝 Observations & recommandations</div>
        <div className="aptf-fg"><label>Observations cliniques</label><textarea className="aptf-input aptf-ta" placeholder="Notes du médecin..." value={f.observations} onChange={e=>set('observations',e.target.value)}/></div>
        <div className="aptf-fg"><label>Recommandations</label><textarea className="aptf-input aptf-ta" placeholder="Repos, suivi spécialisé..." value={f.recommandations} onChange={e=>set('recommandations',e.target.value)}/></div>
        <div className="aptf-urgent-row" onClick={()=>set('visite_urgente_requise',!f.visite_urgente_requise)}>
          <div className={`aptf-toggle ${f.visite_urgente_requise?'on':''}`}><div className="aptf-toggle-knob"/></div>
          <span style={{color:f.visite_urgente_requise?'#ef4444':'var(--text-muted)',fontWeight:600}}>🚨 Visite urgente requise</span>
        </div>
      </div>

      {/* MÉDECIN */}
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
          {saving ? '⏳ Enregistrement...' : '✓ Enregistrer l\'évaluation'}
        </button>
      </div>
    </div>
  );
};

/* ── PAGE PRINCIPALE ───────────────────────────────────────────────────── */
export default function Aptitudes() {
  const [soldiers,   setSoldiers]   = useState([]);
  const [crics,      setCrics]      = useState([]);
  const [inaptes,    setInaptes]    = useState([]);
  const [retard,     setRetard]     = useState([]);
  const [stats,      setStats]      = useState(null);
  const [allApt,     setAllApt]     = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState(null);
  const [historique, setHistorique] = useState([]);
  const [loadHist,   setLoadHist]   = useState(false);
  const [activeTab,  setActiveTab]  = useState('list');

  const load = useCallback(async () => {
    try {
      const [solR,cricR,inR,retR,stR,allR] = await Promise.all([
        api.get('/soldiers').catch(()=>({data:{data:[]}})),
        api.get('/crics').catch(()=>({data:{data:[]}})),
        api.get('/aptitudes/inaptes').catch(()=>({data:{data:[]}})),
        api.get('/aptitudes/retard').catch(()=>({data:{data:[]}})),
        api.get('/aptitudes/stats').catch(()=>({data:{data:null}})),
        api.get('/aptitudes/all').catch(()=>({data:{data:[]}})),
      ]);
      setSoldiers(solR.data.data||[]);
      setCrics(cricR.data.data||[]);
      setInaptes(inR.data.data||[]);
      setRetard(retR.data.data||[]);
      setStats(stR.data.data);
      setAllApt(allR.data.data||[]);
    } catch(e) { console.error(e); }
  },[]);

  useEffect(()=>{load();},[load]);

  const handleSave = async (payload) => {
    setSaving(true);
    try { await api.post('/aptitudes', payload); setShowForm(false); load(); }
    catch(e) { alert(e.response?.data?.error||'Erreur serveur'); }
    setSaving(false);
  };

  const openHistorique = async (s) => {
    setSelected(s); setActiveTab('historique'); setLoadHist(true);
    try { const r = await api.get(`/aptitudes/soldat/${s.id}/historique`); setHistorique(r.data.data||[]); }
    catch(e) { setHistorique([]); }
    setLoadHist(false);
  };

  // Données affichées selon filtre
  let displayed = filter==='inaptes' ? inaptes : filter==='retard' ? retard : allApt;
  if (search) {
    const q = search.toLowerCase();
    displayed = displayed.filter(a =>
      `${a.prenom||''} ${a.nom||''} ${a.matricule||''} ${a.observations||''}`.toLowerCase().includes(q)
    );
  }

  const nbInaptes   = (stats?.inaptes_temp||0)+(stats?.inaptes_def||0);
  const nbRestricts = stats?.avec_restrictions||0;

  return (
    <div className="apt-page">

      {/* HEADER */}
      <div className="apt-header">
        <div>
          <h1 className="apt-title">🩺 Aptitudes Médicales</h1>
          <p className="apt-sub">Suivi sanitaire · Soldats &amp; CRICs</p>
        </div>
        <button className="apt-btn-primary" onClick={()=>setShowForm(true)}>+ Nouvelle évaluation</button>
      </div>

      {/* KPIs */}
      <div className="apt-kpis">
        {[
          {label:'Évalués',    val:stats?.soldats_evalues||0, color:'#C9A84C', icon:'📋'},
          {label:'Aptes',      val:stats?.aptes||0,           color:'#34d399', icon:'✅'},
          {label:'Restrictions',val:nbRestricts,              color:'#f59e0b', icon:'⚠️'},
          {label:'Inaptes',    val:nbInaptes,                 color:'#ef4444', icon:'⛔'},
          {label:'Sans visite récente', val:retard.length,    color:'#f87171', icon:'🔔'},
          {label:'Urgences',   val:stats?.urgences||0,        color:'#ef4444', icon:'🚨'},
        ].map(k=>(
          <div key={k.label} className="apt-kpi" style={{borderColor:k.color+'44'}}>
            <div className="apt-kpi-icon">{k.icon}</div>
            <div className="apt-kpi-val" style={{color:k.color}}>{k.val}</div>
            <div className="apt-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="apt-tabs">
        {[
          {key:'list',       label:'📋 Évaluations'},
          {key:'historique', label:'🕐 Historique'},
        ].map(t=>(
          <button key={t.key} className={`apt-tab ${activeTab===t.key?'active':''}`}
            onClick={()=>setActiveTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* ══ LISTE ══ */}
      {activeTab==='list' && (
        <div>
          {/* Barre filtres */}
          <div className="apt-toolbar">
            <div className="apt-search-wrap">
              <span>⌕</span>
              <input className="apt-search-input" placeholder="Rechercher patient..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="apt-filter-btns">
              {[
                {key:'all',     label:'Toutes'},
                {key:'inaptes', label:`⛔ Inaptes (${nbInaptes+nbRestricts})`},
                {key:'retard',  label:`🔔 Sans visite (${retard.length})`},
              ].map(b=>(
                <button key={b.key} className={`apt-fbtn ${filter===b.key?'active':''}`}
                  onClick={()=>setFilter(b.key)}>{b.label}</button>
              ))}
            </div>
          </div>

          {/* Grille cartes */}
          {displayed.length===0 ? (
            <div className="apt-empty"><span>🩺</span><p>Aucune évaluation enregistrée</p></div>
          ) : (
            <div className="apt-cards-grid">
              {displayed.map(a=>{
                const apt = getApt(a.aptitude_generale);
                return (
                  <div key={a.id} className="apt-card" style={{borderColor:apt.color+'44'}}
                    onClick={()=>a.soldier_id&&openHistorique({id:a.soldier_id,prenom:a.prenom,nom:a.nom,grade:a.grade,matricule:a.matricule})}>
                    {/* Header carte */}
                    <div className="apt-card-header" style={{background:apt.bg}}>
                      <div className="apt-card-avatar">
                        {a.photo_url?<img src={a.photo_url} alt=""/>:<span>{a.prenom?.[0]}{a.nom?.[0]}</span>}
                      </div>
                      <div className="apt-card-id">
                        <div className="apt-card-name">{a.prenom} {a.nom}</div>
                        <div className="apt-card-meta">{a.grade||'CRIC'} · {a.matricule||'—'}</div>
                      </div>
                      <div className="apt-card-badge" style={{color:apt.color}}>
                        {apt.icon} {apt.label}
                      </div>
                    </div>
                    {/* Body carte */}
                    <div className="apt-card-body">
                      <div className="apt-card-row"><span>📅 Visite</span><span>{fmt(a.date_visite)}</span></div>
                      {a.groupe_sanguin && <div className="apt-card-row"><span>🩸 Groupe</span><span className="apt-gs-val">{a.groupe_sanguin}</span></div>}
                      {a.tension_arterielle && <div className="apt-card-row"><span>💉 Tension</span><span>{a.tension_arterielle} mmHg</span></div>}
                      {a.taille_cm && a.poids_kg && <div className="apt-card-row"><span>📏 IMC</span><span>{(a.poids_kg/Math.pow(a.taille_cm/100,2)).toFixed(1)}</span></div>}
                      {a.medecin_nom && <div className="apt-card-row"><span>👨‍⚕️</span><span>{a.medecin_nom}</span></div>}
                    </div>
                    {/* Restrictions */}
                    {(a.restriction_course||a.restriction_port_charge||a.restriction_station_debout_prolongee||a.restriction_ceremonies) && (
                      <div className="apt-card-restr">
                        {a.restriction_course && <span title="Course">🏃</span>}
                        {a.restriction_port_charge && <span title="Port de charge">🏋️</span>}
                        {a.restriction_station_debout_prolongee && <span title="Station debout">🧍</span>}
                        {a.restriction_ceremonies && <span title="Cérémonies">🎖️</span>}
                      </div>
                    )}
                    {a.visite_urgente_requise && <div className="apt-card-urgent">🚨 VISITE URGENTE</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ HISTORIQUE ══ */}
      {activeTab==='historique' && (
        <div className="apt-historique">
          {!selected ? (
            <div className="apt-empty"><span>📋</span><p>Cliquez sur une carte pour voir l'historique médical</p></div>
          ) : (
            <>
              <div className="apt-hist-header">
                <div className="apt-soldier-avatar lg">{selected.prenom?.[0]}{selected.nom?.[0]}</div>
                <div>
                  <div className="apt-detail-name">{selected.prenom} {selected.nom}</div>
                  <div className="apt-detail-meta">{selected.grade} · {selected.matricule}</div>
                </div>
                <button className="apt-hist-btn" onClick={()=>{setSelected(null);setActiveTab('list');}}>← Retour</button>
              </div>
              {loadHist ? <div className="apt-loading">Chargement...</div>
               : historique.length===0 ? <div className="apt-empty"><span>📋</span><p>Aucun historique</p></div>
               : (
                <div className="apt-timeline">
                  {historique.map((h,i)=>{
                    const info = getApt(h.aptitude_generale);
                    return (
                      <div key={h.id} className="apt-timeline-item">
                        <div className="apt-timeline-dot" style={{background:info.color,borderColor:info.color}}>
                          {i===0&&<div className="apt-timeline-pulse" style={{background:info.color+'33'}}/>}
                        </div>
                        <div className="apt-timeline-content">
                          <div className="apt-timeline-header">
                            <span className="apt-apt-badge" style={{color:info.color,background:info.bg,border:`1px solid ${info.color}44`}}>
                              {info.icon} {info.label}
                            </span>
                            {i===0&&<span className="apt-current-badge">● ACTUEL</span>}
                            <span className="apt-timeline-date">{fmt(h.date_visite)}</span>
                          </div>
                          {(h.taille_cm||h.poids_kg||h.tension_arterielle||h.groupe_sanguin) && (
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
            </>
          )}
        </div>
      )}

      {/* ══ MODAL ══ */}
      {showForm && (
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
}
