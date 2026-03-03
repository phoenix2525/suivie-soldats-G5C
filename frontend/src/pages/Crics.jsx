import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import '../styles/Crics.css';
import '../styles/Soldiers.css';


const UFRS    = ['Lettres et Sciences Humaines','Sciences Appliquées et de Technologie','Sciences Juridiques et Politiques','Sciences Économiques et de Gestion','Sciences de la Santé','Sciences Agronomiques, d\'Aquaculture et de Technologie Alimentaire','Civilisations, Religions, Arts et Communication','Sciences de l\'Éducation, de la Formation et du Sport'];
const ANNEES  = ['L1','L2','L3','M1','M2','Doctorat'];
const VILLAGES = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','Hors campus'];

const STATUTS = [
  { key: 'candidature',       label: 'Candidature',       color: '#94a3b8', next: 'entretien_planifié' },
  { key: 'entretien_planifié',label: 'Entretien planifié', color: '#60a5fa', next: 'confirmé' },
  { key: 'confirmé',          label: 'Confirmé',           color: '#34d399', next: 'visite_médicale' },
  { key: 'visite_médicale',   label: 'Visite médicale',    color: '#f59e0b', next: 'apte' },
  { key: 'apte',              label: 'Apte',               color: '#10b981', next: 'intégration' },
  { key: 'inapte',            label: 'Inapte',             color: '#f87171', next: null },
  { key: 'intégration',       label: 'Intégration',        color: '#a78bfa', next: 'serment' },
  { key: 'serment',           label: 'Serment ✓',          color: '#fbbf24', next: null },
  { key: 'refusé',            label: 'Refusé',             color: '#ef4444', next: null },
];

const getStatut = (key) => STATUTS.find(s => s.key === key) || STATUTS[0];

// Composant Field stable (hors des composants de formulaire)
const Field = ({ label, err, children }) => (
  <div className="sf-field">
    <label className="sf-label">{label}</label>
    {children}
    {err && <span className="sf-field-error">{err}</span>}
  </div>
);

// ── Badge de statut ───────────────────────────────────────────────────────
const StatutBadge = ({ statut }) => {
  const s = getStatut(statut);
  return (
    <span className="cric-badge" style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}44` }}>
      {s.label}
    </span>
  );
};

// ── Barre de progression ──────────────────────────────────────────────────
const ProgressBar = ({ statut }) => {
  const steps = ['candidature','entretien_planifié','confirmé','visite_médicale','apte','intégration','serment'];
  const current = steps.indexOf(statut);
  return (
    <div className="cric-progress">
      {steps.map((s, i) => {
        const info = getStatut(s);
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={s} className={`cric-step ${done?'done':''} ${active?'active':''}`}>
            <div className="cric-step-dot" style={active||done ? {background: info.color, borderColor: info.color} : {}}>
              {done ? '✓' : i+1}
            </div>
            <div className="cric-step-label">{info.label}</div>
            {i < steps.length-1 && <div className={`cric-step-line ${done?'done':''}`} />}
          </div>
        );
      })}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// FORMULAIRE CRIC (hors composant principal)
// ══════════════════════════════════════════════════════════════════════════
const CricForm = ({ initial, onSave, onCancel }) => {
  const EMPTY = {
    prenom:'', nom:'', alias:'', date_naissance:'', lieu_naissance:'',
    telephone:'+221 ', email:'', photo_url:'',
    ufr:'', departement:'', annee_etude:'L1', matricule_etudiant:'',
    village:'', batiment:'', numero_chambre:'', adresse:'', notes_generales:'',
  };
  const [form, setForm] = useState(() => {
    if (!initial) return EMPTY;
    const toDate = (v) => v ? v.slice(0, 10) : '';
    return {
      ...EMPTY,
      ...initial,
      date_naissance:    toDate(initial.date_naissance),
      date_candidature:  toDate(initial.date_candidature),
      telephone:         initial.telephone || '+221 ',
      village:           initial.village || '',
            numero_chambre:    initial.numero_chambre || '',
      adresse:           initial.adresse || '',
      matricule_etudiant: initial.matricule_etudiant || '',
      departement:       initial.departement || '',
      ufr:               initial.ufr || '',
      annee_etude:       initial.annee_etude || 'L1',
      alias:             initial.alias || '',
    };
  });
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [preview, setPreview] = useState(initial?.photo_url || '');
  const fileRef = useRef();
  const formRef = useRef(form);
  formRef.current = form;

  const set = useCallback((k, v) => {
    setForm(p => ({...p, [k]: v}));
    setErrors(p => ({...p, [k]: ''}));
  }, []);

  const handlePhone = useCallback((raw) => {
    let d = raw.replace(/\D/g,'');
    if (!d.startsWith('221')) d = '221'+d.replace(/^221/,'');
    d = d.slice(0,12);
    let f = '+';
    if (d.length>0)  f+=d.slice(0,3);
    if (d.length>3)  f+=' '+d.slice(3,5);
    if (d.length>5)  f+=' '+d.slice(5,8);
    if (d.length>8)  f+=' '+d.slice(8,10);
    if (d.length>10) f+=' '+d.slice(10,12);
    set('telephone', f);
  }, [set]);

  const handlePhoto = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
      setForm(p => ({...p, photo_url: ev.target.result}));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = useCallback(async (ev) => {
    ev.preventDefault();
    const f = formRef.current;
    const e = {};
    if (!f.prenom.trim()) e.prenom = 'Prénom obligatoire';
    if (!f.nom.trim())    e.nom    = 'Nom obligatoire';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Email invalide';
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {...formRef.current};
      if (payload.telephone === '+221 ') payload.telephone = '';
      await onSave(payload);
    } catch(err) {
      setErrors({api: err.response?.data?.error || 'Erreur serveur'});
      setSaving(false);
    }
  }, [onSave]);

  return (
    <form onSubmit={handleSubmit} className="soldier-form" noValidate>
      {errors.api && <div className="sf-api-error">{errors.api}</div>}

      {/* Photo */}
      <div className="sf-photo-row">
        <div className="sf-photo-wrap" onClick={() => fileRef.current.click()}>
          {preview
            ? <img src={preview} alt="Photo" className="sf-photo-img" />
            : <div className="sf-photo-placeholder">
                <span className="sf-photo-initials">{(form.prenom[0]||'?')+(form.nom[0]||'')}</span>
                <span className="sf-photo-hint-text">Ajouter une photo</span>
              </div>}
          <div className="sf-photo-overlay"><span>📷 Modifier</span></div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto} />
        <div className="sf-photo-info">
          <p>Photo du candidat CRIC</p>
          <p>JPG ou PNG, max 2 Mo</p>
        </div>
      </div>

      <div className="sf-section">▸ Identité</div>
      <div className="sf-row">
        <Field label="Prénom *" err={errors.prenom}>
          <input className={`sf-input${errors.prenom?' sf-err':''}`} value={form.prenom} onChange={e=>set('prenom',e.target.value)} />
        </Field>
        <Field label="Nom *" err={errors.nom}>
          <input className={`sf-input${errors.nom?' sf-err':''}`} value={form.nom} onChange={e=>set('nom',e.target.value)} />
        </Field>
      </div>
      <div className="sf-row">
        <Field label="Date de naissance">
          <input type="date" className="sf-input" value={form.date_naissance} onChange={e=>set('date_naissance',e.target.value)} />
        </Field>
        <Field label="Lieu de naissance">
          <input className="sf-input" placeholder="Ex: Dakar" value={form.lieu_naissance} onChange={e=>set('lieu_naissance',e.target.value)} />
        </Field>
      </div>

      <div className="sf-section">▸ Scolarité</div>
      <div className="sf-row">
        <Field label="UFR">
          <select className="sf-input" value={form.ufr} onChange={e=>set('ufr',e.target.value)}>
            <option value="">— Sélectionner —</option>
            {UFRS.map(u=><option key={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Département">
          <input className="sf-input" placeholder="Ex: Informatique" value={form.departement} onChange={e=>set('departement',e.target.value)} />
        </Field>
      </div>
      <div className="sf-row">
        <Field label="Année d'étude">
          <select className="sf-input" value={form.annee_etude} onChange={e=>set('annee_etude',e.target.value)}>
            {ANNEES.map(a=><option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Code étudiant">
          <input className="sf-input" placeholder="Ex: P34 2219" value={form.matricule_etudiant} onChange={e=>set('matricule_etudiant',e.target.value.toUpperCase())} />
        </Field>
      </div>

      <div className="sf-section">▸ Résidence</div>
      <div className="sf-row sf-row-3">
        <Field label="Village / Résidence">
          <select className="sf-input" value={form.village} onChange={e=>set('village',e.target.value)}>
            <option value="">— Sélectionner —</option>
            {VILLAGES.map(v=><option key={v} value={v}>{v==='Hors campus'?'Hors campus':v==='Ancien Village'?'Ancien Village':'Village '+v}</option>)}
          </select>
        </Field>
        {form.village && form.village !== 'Hors campus' && <>
          <Field label="Bâtiment">
            <input className="sf-input" placeholder="Ex: G3 ou Bloc B" value={form.batiment} onChange={e=>set('batiment',e.target.value)} />
          </Field>
          <Field label="N° Chambre">
            <input className="sf-input" placeholder="Ex: 105" value={form.numero_chambre} onChange={e=>set('numero_chambre',e.target.value)} />
          </Field>
        </>}
      </div>
      {form.village === 'Hors campus' && (
        <Field label="Adresse complète (hors campus)">
          <input className="sf-input" placeholder="Ex: Rue 12, Ndiolofène, Saint-Louis"
            value={form.adresse||''} onChange={e=>set('adresse',e.target.value)} />
        </Field>
      )}

      <div className="sf-section">▸ Contact</div>
      <div className="sf-row">
        <Field label="Téléphone" err={errors.telephone}>
          <input className="sf-input" value={form.telephone} onChange={e=>handlePhone(e.target.value)} />
        </Field>
        <Field label="Email" err={errors.email}>
          <input type="email" className={`sf-input${errors.email?' sf-err':''}`} placeholder="exemple@ugb.edu.sn" value={form.email} onChange={e=>set('email',e.target.value)} />
        </Field>
      </div>

      <div className="sf-section">▸ Notes</div>
      <Field label="Notes générales">
        <textarea className="sf-input sf-textarea" placeholder="Observations, remarques sur le candidat…" value={form.notes_generales} onChange={e=>set('notes_generales',e.target.value)} rows={3} />
      </Field>

      <div className="sf-actions">
        <button type="button" className="sf-btn-cancel" onClick={onCancel}>Annuler</button>
        <button type="submit" className="sf-btn-save" disabled={saving}>
          {saving ? '⏳ Enregistrement…' : '✓ Enregistrer le CRIC'}
        </button>
      </div>
    </form>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MODAL DE PROGRESSION
// ══════════════════════════════════════════════════════════════════════════
const ProgressionModal = ({ cric, onClose, onUpdate }) => {
  const [statut,     setStatut]     = useState(cric.statut);
  const [notes,      setNotes]      = useState('');
  const [date,       setDate]       = useState('');
  const [resultat,   setResultat]   = useState('');
  const [avis,       setAvis]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = { statut };
      if (statut === 'entretien_planifié' || statut === 'confirmé') {
        payload.date_entretien = date || undefined;
        payload.resultat_entretien = resultat || undefined;
        payload.notes_entretien = notes || undefined;
      } else if (statut === 'visite_médicale' || statut === 'apte' || statut === 'inapte') {
        payload.date_visite_medicale = date || undefined;
        payload.avis_medical = avis || undefined;
        payload.notes_medicales = notes || undefined;
      } else if (statut === 'intégration') {
        payload.date_integration = date || undefined;
        payload.decision_instructeur = notes || undefined;
      } else if (statut === 'serment') {
        payload.date_serment = date || undefined;
      } else {
        payload.decision_instructeur = notes || undefined;
      }
      await api.patch(`/crics/${cric.id}/statut`, payload);
      onUpdate();
      onClose();
    } catch(err) {
      setError(err.response?.data?.error || 'Erreur serveur');
      setSaving(false);
    }
  };

  const s = getStatut(statut);

  return (
    <div className="sol-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sol-modal" style={{maxWidth:560}}>
        <div className="sol-modal-header">
          Progression — {cric.prenom} {cric.nom}
          <button className="sol-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sol-modal-body">
          <ProgressBar statut={cric.statut} />

          <div style={{marginTop:24}}>
            <label className="sf-label">Nouveau statut</label>
            <select className="sf-input" value={statut} onChange={e=>setStatut(e.target.value)} style={{marginTop:6}}>
              {STATUTS.map(s=>(
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Champs contextuels selon le statut */}
          {(statut==='entretien_planifié'||statut==='confirmé') && (
            <>
              <div style={{marginTop:14}}>
                <label className="sf-label">Date de l'entretien</label>
                <input type="date" className="sf-input" style={{marginTop:6}} value={date} onChange={e=>setDate(e.target.value)} />
              </div>
              <div style={{marginTop:14}}>
                <label className="sf-label">Résultat</label>
                <select className="sf-input" style={{marginTop:6}} value={resultat} onChange={e=>setResultat(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  <option value="réussi">✓ Réussi</option>
                  <option value="échoué">✗ Échoué</option>
                </select>
              </div>
            </>
          )}
          {(statut==='visite_médicale'||statut==='apte'||statut==='inapte') && (
            <>
              <div style={{marginTop:14}}>
                <label className="sf-label">Date de la visite médicale</label>
                <input type="date" className="sf-input" style={{marginTop:6}} value={date} onChange={e=>setDate(e.target.value)} />
              </div>
              <div style={{marginTop:14}}>
                <label className="sf-label">Avis médical</label>
                <select className="sf-input" style={{marginTop:6}} value={avis} onChange={e=>setAvis(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  <option value="apte">✓ Apte</option>
                  <option value="inapte">✗ Inapte</option>
                </select>
              </div>
            </>
          )}
          {statut==='intégration' && (
            <div style={{marginTop:14}}>
              <label className="sf-label">Date de début d'intégration</label>
              <input type="date" className="sf-input" style={{marginTop:6}} value={date} onChange={e=>setDate(e.target.value)} />
            </div>
          )}
          {statut==='serment' && (
            <div style={{marginTop:14}}>
              <label className="sf-label">Date de prestation de serment</label>
              <input type="date" className="sf-input" style={{marginTop:6}} value={date} onChange={e=>setDate(e.target.value)} />
            </div>
          )}

          <div style={{marginTop:14}}>
            <label className="sf-label">Notes / Décision de l'instructeur</label>
            <textarea className="sf-input sf-textarea" style={{marginTop:6}} rows={3}
              placeholder="Observations, remarques…" value={notes} onChange={e=>setNotes(e.target.value)} />
          </div>

          {error && <div className="sf-api-error" style={{marginTop:12}}>{error}</div>}

          <div className="sf-actions">
            <button className="sf-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="sf-btn-save" onClick={handleSave} disabled={saving}
              style={{background: s.color, color:'#0a0c0f'}}>
              {saving ? '⏳ Enregistrement…' : '✓ Mettre à jour'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MODAL CONVERSION EN SOLDAT
// ══════════════════════════════════════════════════════════════════════════
const ConvertModal = ({ cric, onClose, onDone }) => {
  const GRADES = [
  'Major','Légionnaire',
  'Général d\'Armée','Général de Corps d\'Armée','Général de Division','Général de Brigade',
  'Colonel','Lieutenant-Colonel','Commandant',
  'Capitaine','Lieutenant','Sous-Lieutenant',
  'Adjudant-Chef','Adjudant',
  'Sergent-Chef','Sergent',
  'Caporal-Chef','Caporal',
  'Soldat de 1ère classe','Soldat de 2ème classe','Soldat',
];
const GRADE_SPECIAL = { 'Major': { icon:'👑', color:'#FFD700', bg:'rgba(255,215,0,0.15)', label:'MAJOR — Chef Suprême' }, 'Légionnaire': { icon:'⚔️', color:'#C0C0C0', bg:'rgba(192,192,192,0.15)', label:'LÉGIONNAIRE — Second' } };
const FONCTIONS = ['','Instructeur','Instructeur en Chef','Responsable logistique','Responsable communication','Responsable culturel','Responsable sportif'];
  const [grade,      setGrade]      = useState('Soldat');
  const [promotion,  setPromotion]  = useState('');
  const [dateInteg,  setDateInteg]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const handleConvert = async () => {
    if (!promotion) { setError('La promotion est obligatoire'); return; }
    setSaving(true); setError('');
    try {
      const res = await api.post(`/crics/${cric.id}/convertir`, {
        grade, promotion, date_integration: dateInteg
      });
      alert(`🎖️ ${res.data.message}`);
      onDone();
      onClose();
    } catch(err) {
      setError(err.response?.data?.error || 'Erreur serveur');
      setSaving(false);
    }
  };

  return (
    <div className="sol-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sol-modal" style={{maxWidth:480}}>
        <div className="sol-modal-header" style={{color:'#fbbf24'}}>
          🎖️ Convertir en soldat — {cric.prenom} {cric.nom}
          <button className="sol-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sol-modal-body">
          <div className="cric-convert-banner">
            Ce CRIC a prêté serment. En confirmant, il deviendra officiellement
            un <strong>soldat de l'Armée du G5C</strong> et recevra son matricule définitif.
          </div>

          <div className="sf-field" style={{marginTop:16}}>
            <label className="sf-label">Grade attribué</label>
            <select className="sf-input" value={grade} onChange={e=>setGrade(e.target.value)}>
              {GRADES.map(g=><option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="sf-field" style={{marginTop:12}}>
            <label className="sf-label">Promotion *</label>
            <input className="sf-input" placeholder="Ex: 35" value={promotion} onChange={e=>setPromotion(e.target.value)} />
          </div>
          <div className="sf-field" style={{marginTop:12}}>
            <label className="sf-label">Date d'intégration officielle</label>
            <input type="date" className="sf-input" value={dateInteg} onChange={e=>setDateInteg(e.target.value)} />
          </div>

          {error && <div className="sf-api-error" style={{marginTop:12}}>{error}</div>}

          <div className="sf-actions">
            <button className="sf-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="sf-btn-save" onClick={handleConvert} disabled={saving}
              style={{background:'#fbbf24', color:'#0a0c0f'}}>
              {saving ? '⏳ Conversion…' : '🎖️ Confirmer le serment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════
export default function Crics() {
  const [crics,       setCrics]       = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterStatut,setFilterStatut]= useState('');
  const [showForm,    setShowForm]    = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [showProg,    setShowProg]    = useState(null);
  const [showConvert, setShowConvert] = useState(null);
  const [viewMode, setViewMode] = useState('liste');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [cricsRes, statsRes] = await Promise.all([
        api.get('/crics'),
        api.get('/crics/stats'),
      ]);
      setCrics(cricsRes.data.data || []);
      setStats(statsRes.data.data);
    } catch { setCrics([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    let list = [...crics];
    if (search)       list = list.filter(c =>
      `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase()));
    if (filterStatut) list = list.filter(c => c.statut === filterStatut);
    setFiltered(list);
  }, [search, filterStatut, crics]);

  const handleSave = useCallback(async (payload) => {
    if (payload.id) await api.put(`/crics/${payload.id}`, payload);
    else            await api.post('/crics', payload);
    setShowForm(false); setSelected(null);
    fetchAll();
  }, [fetchAll]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Supprimer ce CRIC ?')) return;
    await api.delete(`/crics/${id}`);
    fetchAll();
  }, [fetchAll]);

  const Avatar = ({ c, size=36 }) => (
    c?.photo_url
      ? <img src={c.photo_url} alt={c.nom} className="sol-avatar-img" style={{width:size,height:size}} />
      : <div className="sol-avatar" style={{width:size,height:size,fontSize:size*0.35}}>
          {(c?.prenom?.[0]||'?')+(c?.nom?.[0]||'')}
        </div>
  );

  return (
    <div className="soldiers-page">

      {/* En-tête */}
      <div className="soldiers-header">
        <div>
          <h1 className="soldiers-title">CRICs</h1>
          <p className="soldiers-count">Candidats en cours de formation</p>
        </div>
        <button className="sol-btn-primary" onClick={() => { setSelected(null); setShowForm(true); }}>
          + Enregistrer un CRIC
        </button>
      </div>

      {/* Stats rapides */}
      {stats && (
        <div className="cric-stats-row">
          {[
            { label:'Candidatures',  val: stats.candidatures,       color:'#94a3b8' },
            { label:'Confirmés',     val: stats.confirmes,          color:'#34d399' },
            { label:'Visites méd.',  val: stats.visites_medicales,  color:'#f59e0b' },
            { label:'En intégration',val: stats.en_integration,     color:'#a78bfa' },
            { label:'Serment',       val: stats.serment,            color:'#fbbf24' },
            { label:'Refusés',       val: stats.refuses,            color:'#ef4444' },
          ].map(s => (
            <div key={s.label} className="cric-stat-card" style={{borderColor: s.color+'44'}}>
              <div className="cric-stat-val" style={{color: s.color}}>{s.val}</div>
              <div className="cric-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="sol-toolbar">
        <div className="sol-search-wrap">
          <span className="sol-search-icon">⌕</span>
          <input className="sol-search" placeholder="Rechercher par nom, prénom…"
            value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="sol-select" value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* Modals */}
      {showForm && (
        <div className="sol-overlay" onClick={e=>e.target===e.currentTarget&&(setShowForm(false),setSelected(null))}>
          <div className="sol-modal">
            <div className="sol-modal-header">
              {selected ? 'Modifier le CRIC' : 'Enregistrer un nouveau CRIC'}
              <button className="sol-modal-close" onClick={()=>{setShowForm(false);setSelected(null);}}>✕</button>
            </div>
            <div className="sol-modal-body">
              <CricForm key={selected?.id??'new'} initial={selected}
                onSave={handleSave} onCancel={()=>{setShowForm(false);setSelected(null);}} />
            </div>
          </div>
        </div>
      )}

      {showProg && (
        <ProgressionModal cric={showProg} onClose={()=>setShowProg(null)} onUpdate={fetchAll} />
      )}

      {showConvert && (
        <ConvertModal cric={showConvert} onClose={()=>setShowConvert(null)} onDone={fetchAll} />
      )}

      {/* Toggle vue */}
      <div className="cric-view-toggle">
        <button className={viewMode==='liste'?'active':''} onClick={()=>setViewMode('liste')}>☰ Liste</button>
        <button className={viewMode==='grille'?'active':''} onClick={()=>setViewMode('grille')}>⊞ Grille</button>
      </div>

      {loading ? (
        <div className="sol-loading">Chargement des CRICs…</div>
      ) : filtered.length === 0 ? (
        <div className="sol-empty">
          <div className="sol-empty-icon">◈</div>
          <p>Aucun CRIC enregistré</p>
          <button className="sol-btn-primary" onClick={()=>setShowForm(true)}>Enregistrer le premier CRIC</button>
        </div>
      ) : viewMode === 'liste' ? (
        <div className="cric-list">
          {filtered.map(c => {
            const UFR_MAP = {
              'Lettres et Sciences Humaines':'LSH',
              'Sciences Appliquées et de Technologie':'SAT',
              'Sciences Juridiques et Politiques':'SJP',
              'Sciences Économiques et de Gestion':'SEG',
              'Sciences de la Santé':'2S',
              "Sciences Agronomiques, d'Aquaculture et de Technologie Alimentaire":'SAATA',
              'Civilisations, Religions, Arts et Communication':'CRAC',
              "Sciences de l'Éducation, de la Formation et du Sport":'SEFS'
            };
            return (
              <div key={c.id} className="cric-card">
                <div className="cric-card-left">
                  <Avatar c={c} size={48} />
                  <div className="cric-card-info">
                    <div className="cric-card-name">{c.prenom} {c.nom}</div>
                    <div className="cric-card-meta">
                      {c.ufr && <span>{UFR_MAP[c.ufr] || c.ufr.split(' ').map(w=>w[0]).join('')}</span>}
                      {c.annee_etude && <span>{c.annee_etude}</span>}
                      {c.matricule_etudiant && <span>{c.matricule_etudiant}</span>}
                    </div>
                    <div style={{marginTop:8}}><ProgressBar statut={c.statut} /></div>
                  </div>
                </div>
                <div className="cric-card-right">
                  <StatutBadge statut={c.statut} />
                  <div className="cric-card-actions">
                    <button className="sol-icon-btn" title="Modifier" onClick={async ()=>{ 
  try { const r = await api.get(`/crics/${c.id}`); setSelected(r.data.data || c); }
  catch(e) { setSelected(c); }
  setShowForm(true); 
}}>✏</button>
                    <button className="cric-btn-prog" onClick={()=>setShowProg(c)}>→ Progression</button>
                    {c.statut === 'serment' && (
                      <button className="cric-btn-convert" onClick={()=>setShowConvert(c)}>🎖️ Convertir</button>
                    )}
                    <button className="sol-icon-btn sol-icon-danger" onClick={()=>handleDelete(c.id)}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="cric-grid">
          {filtered.map(c => {
            const UFR_MAP = {
              'Lettres et Sciences Humaines':'LSH',
              'Sciences Appliquées et de Technologie':'SAT',
              'Sciences Juridiques et Politiques':'SJP',
              'Sciences Économiques et de Gestion':'SEG',
              'Sciences de la Santé':'2S',
              "Sciences Agronomiques, d'Aquaculture et de Technologie Alimentaire":'SAATA',
              'Civilisations, Religions, Arts et Communication':'CRAC',
              "Sciences de l'Éducation, de la Formation et du Sport":'SEFS'
            };
            const STEPS = ['candidature','entretien_planifié','confirmé','visite_médicale','apte','intégration','serment'];
            const stepIdx = STEPS.indexOf(c.statut);
            const pct = stepIdx >= 0 ? Math.round(((stepIdx + 1) / STEPS.length) * 100) : 0;
            const info = getStatut(c.statut);
            const color = info.color;
            const ufrLabel = c.ufr ? (UFR_MAP[c.ufr] || c.ufr.split(' ')[0]) : null;
            const residence = c.village === 'Hors campus'
              ? (c.adresse || 'Hors campus')
              : c.village ? ('Vill. ' + c.village + (c.batiment ? ' · ' + c.batiment : '')) : null;
            return (
              <div key={c.id} className="cric-gc" style={{borderColor: color + '44'}}>

                {/* Barre de progression haut */}
                <div className="cric-gc-topbar">
                  <div className="cric-gc-topbar-fill" style={{width: pct + '%', background: color}} />
                </div>

                {/* Avatar + badge statut */}
                <div className="cric-gc-hero">
                  <div className="cric-gc-avatar-wrap">
                    <Avatar c={c} size={70} />
                    <div className="cric-gc-statut-dot" style={{background: color}} />
                  </div>
                  <StatutBadge statut={c.statut} />
                </div>

                {/* Identité */}
                <div className="cric-gc-identity">
                  <div className="cric-gc-name">{c.prenom} {c.nom}</div>
                  {c.matricule_etudiant && <div className="cric-gc-mat">{c.matricule_etudiant}</div>}
                </div>

                {/* Progression */}
                <div className="cric-gc-prog-wrap">
                  <div className="cric-gc-prog-label">
                    <span>Étape {stepIdx >= 0 ? stepIdx + 1 : '?'} / {STEPS.length}</span>
                    <span style={{color}}>{pct}%</span>
                  </div>
                  <div className="cric-gc-prog-bar">
                    <div className="cric-gc-prog-fill" style={{width: pct + '%', background: color}} />
                  </div>
                  <div className="cric-gc-prog-step-name" style={{color}}>{info.label}</div>
                </div>

                {/* Infos clés */}
                <div className="cric-gc-infos">
                  {ufrLabel && (
                    <div className="cric-gc-info-row">
                      <span className="cric-gc-info-icon">🎓</span>
                      <span>{ufrLabel}{c.annee_etude ? ' · ' + c.annee_etude : ''}</span>
                    </div>
                  )}
                  {residence && (
                    <div className="cric-gc-info-row">
                      <span className="cric-gc-info-icon">🏠</span>
                      <span>{residence}</span>
                    </div>
                  )}
                  {c.telephone && (
                    <div className="cric-gc-info-row">
                      <span className="cric-gc-info-icon">📞</span>
                      <span>{c.telephone}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="cric-gc-actions">
                  <button className="cric-gc-btn-edit" onClick={async ()=>{ 
  try { const r = await api.get(`/crics/${c.id}`); setSelected(r.data.data || c); }
  catch(e) { setSelected(c); }
  setShowForm(true); 
}}>✏ Modifier</button>
                  <button className="cric-gc-btn-prog" title="Progression" onClick={()=>setShowProg(c)}>→</button>
                  {c.statut === 'serment' && (
                    <button className="cric-gc-btn-convert" title="Convertir" onClick={()=>setShowConvert(c)}>🎖️</button>
                  )}
                  <button className="cric-gc-btn-del" title="Supprimer" onClick={()=>handleDelete(c.id)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}