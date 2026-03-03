import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/Soldiers.css';


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
// Sections officielles du QG G5C (sans suffixe G5C)
const SECTIONS = [
  '',
  'DRH — Direction des Ressources Humaines',
  "DSA — Direction de la Santé de l'Armée",
  'DCSP — Direction du Contrôle et du Suivi Pédagogique',
  'DASC — Direction des Activités Sportives et Culturelles',
  "DASB — Direction de l'Action Sociale et du Budget",
  "DGMI — Direction du Matériel et de l'Intendance",
  'Section Drapeau',
  'Section Restauration',
  'Section Recrutement',
  'Section Musique — BAT-MUSIC',
  'Haut Commandement',
];

// Fonctions disponibles par section
const FONCTIONS_PAR_SECTION = {
  '': [''],
  'DRH — Direction des Ressources Humaines': [
    '','Directeur DRH','Adjoint DRH','Responsable Grades & Promotions','Responsable Effectifs','Agent RH',
  ],
  "DSA — Direction de la Santé de l'Armée": [
    '','Médecin Chef','Médecin Adjoint','Infirmier','Aide-soignant','Agent de Santé',
  ],
  "DCSP — Direction du Contrôle et du Suivi Pédagogique": [
    '','Directeur DCSP','Responsable Suivi Académique','Encadreur Pédagogique','Moniteur','Agent DCSP',
  ],
  'DASC — Direction des Activités Sportives et Culturelles': [
    '','Directeur DASC','Responsable Sportif','Responsable Culturel','Entraîneur','Agent DASC',
  ],
  "DASB — Direction de l'Action Sociale et du Budget": [
    '','Directeur DASB','Responsable Budget','Agent Social','Trésorier','Agent DASB',
  ],
  "DGMI — Direction du Matériel et de l'Intendance": [
    '','Directeur DGMI','Responsable Matériel','Responsable Intendance','Magasinier','Agent DGMI',
  ],
  'Section Drapeau': [
    '','Chef Section Drapeau','Porte-Drapeau','Garde du Drapeau',
  ],
  'Section Restauration': [
    '','Chef Section Restauration','Responsable Cuisine','Cuisinier','Agent Restauration',
  ],
  'Section Recrutement': [
    '','Chef Section Recrutement','Agent de Recrutement','Chargé de Sélection',
  ],
  "Section Musique — BAT-MUSIC": [
    '','Chef de Musique','Musicien','Percussionniste','Trompettiste','Clarinettiste',
  ],
  'Haut Commandement': [
    '','Major','Légionnaire','Aide de Camp','Chargé de Mission','Conseiller',
  ],
};

const getFonctions = (section) => FONCTIONS_PAR_SECTION[section] || [''];
const UFRS     = ['Lettres et Sciences Humaines','Sciences Appliquées et de Technologie','Sciences Juridiques et Politiques','Sciences Économiques et de Gestion','Sciences de la Santé','Sciences Agronomiques, d\'Aquaculture et de Technologie Alimentaire','Civilisations, Religions, Arts et Communication','Sciences de l\'Éducation, de la Formation et du Sport'];
const ANNEES   = ['L1','L2','L3','M1','M2','Doctorat','Diplômé','En pause académique'];
const VILLAGES = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','Hors campus'];

// Composant Field défini à l'extérieur pour rester stable entre les rendus
const Field = ({ label, err, hint, children }) => (
  <div className="sf-field">
    <label className="sf-label">{label}</label>
    {children}
    {err  && <span className="sf-field-error">{err}</span>}
    {hint && !err && <span className="sf-field-hint">{hint}</span>}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   SOLDIER FORM — défini au niveau MODULE (jamais recréé → focus stable)
═══════════════════════════════════════════════════════════════════════════ */
const SoldierForm = ({ initial, onSave, onCancel }) => {
  const EMPTY = {
    prenom:'', nom:'', alias:'', grade:'Soldat', promotion:'', fonction:'', haut_commandement: false,
    date_integration:'', date_naissance:'', lieu_naissance:'',
    ufr:'', departement:'', annee_etude:'L1', matricule_etudiant:'',
    village:'', batiment:'', numero_chambre:'', adresse:'',
    telephone:'+221 ', email:'', photo_url:'',
    section_affectation: '',
  };

  const [form,    setForm]    = useState(() => {
    if (!initial) return EMPTY;
    const toDate = (v) => v ? v.slice(0, 10) : '';
    return {
      ...EMPTY,
      ...initial,
      date_integration: toDate(initial.date_integration),
      date_naissance:   toDate(initial.date_naissance),
      telephone:        initial.telephone || '+221 ',
      village:          initial.village || '',
      batiment:         initial.batiment || initial.pavillon || '',
            numero_chambre:   initial.numero_chambre || '',
      adresse:          initial.adresse || '',
      matricule_etudiant: initial.matricule_etudiant || '',
      departement:      initial.departement || '',
      ufr:              initial.ufr || '',
      annee_etude:      initial.annee_etude || 'L1',
      alias:            initial.alias || '',
      fonction:         initial.fonction || '',
      haut_commandement: initial.haut_commandement || false,
      section_affectation: initial.section_affectation || '',
    };
  });
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [apiErr,  setApiErr]  = useState('');
  const [preview, setPreview] = useState(initial?.photo_url || '');
  const fileRef = useRef();

  // useRef pour éviter que les callbacks soient la cause de re-render
  const formRef = useRef(form);
  formRef.current = form;

  const set = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  }, []);

  const handlePhoto = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'Photo trop lourde (max 2 Mo)' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 400;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = h*MAX/w; w = MAX; } }
        else        { if (h > MAX) { w = w*MAX/h; h = MAX; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.75);
        setPreview(b64);
        setForm(prev => ({ ...prev, photo_url: b64 }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePhone = useCallback((raw) => {
    let digits = raw.replace(/\D/g, '');
    if (!digits.startsWith('221')) digits = '221' + digits.replace(/^221/, '');
    digits = digits.slice(0, 12);
    let f = '+';
    if (digits.length > 0)  f += digits.slice(0,3);
    if (digits.length > 3)  f += ' ' + digits.slice(3,5);
    if (digits.length > 5)  f += ' ' + digits.slice(5,8);
    if (digits.length > 8)  f += ' ' + digits.slice(8,10);
    if (digits.length > 10) f += ' ' + digits.slice(10,12);
    set('telephone', f);
  }, [set]);

  const validate = useCallback(() => {
    const f = formRef.current;
    const e = {};
    if (!f.prenom.trim())    e.prenom    = 'Prénom obligatoire';
    if (!f.nom.trim())       e.nom       = 'Nom obligatoire';
    if (!f.promotion.trim()) e.promotion = 'Promotion obligatoire';
    if (!f.date_integration) e.date_integration = 'Date obligatoire';
    if (f.telephone && f.telephone !== '+221 ') {
      const d = f.telephone.replace(/\D/g,'');
      if (!d.startsWith('221') || d.length !== 12)
        e.telephone = 'Format invalide — ex: +221 77 123 45 67';
    }
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
      e.email = 'Email invalide';
    if (f.matricule_etudiant && !/^[A-Z]\d{2}\s?\d{4}$/i.test(f.matricule_etudiant.trim()))
      e.matricule_etudiant = 'Format attendu : P34 2219';
    return e;
  }, []);


const handleSubmit = useCallback(async (ev) => {
  ev.preventDefault();
  const e = validate();
  if (Object.keys(e).length) { setErrors(e);
 return; }
  setSaving(true); setApiErr('');
  try {
    const payload = { ...formRef.current };
    if (payload.date_naissance === '') payload.date_naissance = null;
    if (payload.date_integration === '') payload.date_integration = null;
    if (payload.telephone === '+221 ') payload.telephone = '';
    if (payload.telephone) payload.telephone = payload.telephone.replace(/\s/g, '');
    await onSave(payload);
  } catch (err) {
    setApiErr(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    setSaving(false);
  }
}, [validate, onSave]);
  const initials = (form.prenom[0] || '?') + (form.nom[0] || '');

  return (
    <form onSubmit={handleSubmit} className="soldier-form" noValidate>
      {apiErr && <div className="sf-api-error">{apiErr}</div>}

      {/* ── Photo de profil ── */}
      <div className="sf-photo-row">
        <div className="sf-photo-wrap" onClick={() => fileRef.current.click()}>
          {preview
            ? <img src={preview} alt="Photo" className="sf-photo-img" />
            : <div className="sf-photo-placeholder">
                <span className="sf-photo-initials">{initials}</span>
                <span className="sf-photo-hint-text">Cliquer pour ajouter une photo</span>
              </div>
          }
          <div className="sf-photo-overlay">
            <span>📷 Modifier</span>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handlePhoto} />
        {errors.photo && <span className="sf-field-error">{errors.photo}</span>}
        <div className="sf-photo-info">
          <p>Photo de profil du soldat</p>
          <p>Format JPG ou PNG, max 2 Mo</p>
        </div>
      </div>

      <div className="sf-section">▸ Identité</div>
      <div className="sf-row">
        <Field label="Prénom *" err={errors.prenom}>
          <input className={`sf-input${errors.prenom?' sf-err':''}`}
            value={form.prenom} onChange={e=>set('prenom',e.target.value)} />
        </Field>
        <Field label="Nom *" err={errors.nom}>
          <input className={`sf-input${errors.nom?' sf-err':''}`}
            value={form.nom} onChange={e=>set('nom',e.target.value)} />
        </Field>
      </div>
      <div className="sf-row">
        <Field label="Grade">
          <select className="sf-input" value={form.grade} onChange={e=>set('grade',e.target.value)}>
            {GRADES.map(g=><option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Promotion d'intégration *" err={errors.promotion}>
          <input className={`sf-input${errors.promotion?' sf-err':''}`}
            placeholder="Ex: 34" value={form.promotion}
            onChange={e=>set('promotion',e.target.value)} />
        </Field>
      </div>
      <div className="sf-row">
        <Field label="Date d'intégration *" err={errors.date_integration}>
          <input type="date" className={`sf-input${errors.date_integration?' sf-err':''}`}
            value={form.date_integration} onChange={e=>set('date_integration',e.target.value)} />
        </Field>
        <Field label="Date de naissance">
          <input type="date" className="sf-input"
            value={form.date_naissance} onChange={e=>set('date_naissance',e.target.value)} />
        </Field>
      </div>
      <Field label="Lieu de naissance">
        <input className="sf-input" placeholder="Ex: Dakar"
          value={form.lieu_naissance} onChange={e=>set('lieu_naissance',e.target.value)} />
      </Field>

      <div className="sf-section">▸ Rôle dans l'unité</div>
      <div className="sf-row">
        <Field label="Section / Direction d'affectation">
          <select className="sf-input" value={form.section_affectation}
            onChange={e=>{ set('section_affectation', e.target.value); set('fonction',''); }}>
            {SECTIONS.map(s=><option key={s} value={s}>{s||'— Sélectionner une section —'}</option>)}
          </select>
        </Field>
        <Field label="Fonction dans la section">
          <select className="sf-input" value={form.fonction} onChange={e=>set('fonction',e.target.value)}>
            {getFonctions(form.section_affectation).map(f=>(
              <option key={f} value={f}>{f||'— Sélectionner une fonction —'}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Alias / Surnom">
        <input className="sf-input" placeholder="Ex: Le Lion, Alpha..."
          value={form.alias} onChange={e=>set('alias',e.target.value)} />
      </Field>

      <div className="sf-haut-cmd-wrap">
        <label className="sf-haut-cmd-label">
          <div className="sf-haut-cmd-left">
            <span className="sf-haut-cmd-icon">⭐</span>
            <div>
              <div className="sf-haut-cmd-title">Haut Commandement</div>
              <div className="sf-haut-cmd-sub">Membre du bureau de commandement de l'unité</div>
            </div>
          </div>
          <div className={`sf-toggle ${form.haut_commandement ? 'on' : ''}`}
            onClick={() => set('haut_commandement', !form.haut_commandement)}>
            <div className="sf-toggle-knob" />
          </div>
        </label>
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
          <input className="sf-input" placeholder="Ex: Informatique"
            value={form.departement} onChange={e=>set('departement',e.target.value)} />
        </Field>
      </div>
      <div className="sf-row">
        <Field label="Année d'étude">
          <select className="sf-input" value={form.annee_etude} onChange={e=>set('annee_etude',e.target.value)}>
            {ANNEES.map(a=><option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Code étudiant" err={errors.matricule_etudiant}>
          <input className={`sf-input${errors.matricule_etudiant?' sf-err':''}`}
            placeholder="Ex: P34 2219" value={form.matricule_etudiant}
            onChange={e=>set('matricule_etudiant',e.target.value.toUpperCase())} />
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
          <Field label="G ou Bloc">
            <input className="sf-input" placeholder="Ex: G3 ou Bloc B"
              value={form.batiment} onChange={e=>set('batiment',e.target.value)} />
          </Field>
          <Field label="N° Chambre">
            <input className="sf-input" placeholder="Ex: 105"
              value={form.numero_chambre} onChange={e=>set('numero_chambre',e.target.value)} />
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
        <Field label="Téléphone" err={errors.telephone} hint="+221 77/78/76/70 — 9 chiffres">
          <input className={`sf-input${errors.telephone?' sf-err':''}`}
            value={form.telephone} onChange={e=>handlePhone(e.target.value)} />
        </Field>
        <Field label="Email" err={errors.email}>
          <input type="email" className={`sf-input${errors.email?' sf-err':''}`}
            placeholder="exemple@ugb.edu.sn"
            value={form.email} onChange={e=>set('email',e.target.value)} />
        </Field>
      </div>

      <div className="sf-actions">
        <button type="button" className="sf-btn-cancel" onClick={onCancel}>Annuler</button>
        <button type="submit" className="sf-btn-save" disabled={saving}>
          {saving ? '⏳ Enregistrement…' : '✓ Enregistrer le soldat'}
        </button>
      </div>
    </form>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════════════════════════════ */
export default function Soldiers() {
  const user = JSON.parse(localStorage.getItem("user")||"null");
  const location = useLocation();
  const perms = usePermissions(user, location.pathname);
  const [soldiers,    setSoldiers]    = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showForm,    setShowForm]    = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [viewMode,    setViewMode]    = useState('table');
  const navigate = useNavigate();

  const fetchSoldiers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/soldiers');
      setSoldiers(data.data || []);
    } catch { setSoldiers([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { fetchSoldiers(); }, [fetchSoldiers]);

  useEffect(() => {
    let list = [...soldiers];
    if (search)      list = list.filter(s =>
      `${s.nom} ${s.prenom} ${s.matricule} ${s.alias||''} ${s.fonction||''}`.toLowerCase().includes(search.toLowerCase()));
    if (filterGrade) list = list.filter(s => s.grade === filterGrade);
    setFiltered(list);
  }, [search, filterGrade, soldiers]);

  const openAdd   = useCallback(() => { setSelected(null); setShowForm(true); }, []);
  const openEdit  = useCallback(async (s) => {
    try {
      const res = await api.get(`/soldiers/${s.id}`);
      setSelected(res.data.data || s);
    } catch(e) {
      setSelected(s);
    }
    setShowForm(true);
  }, []);
  const closeForm = useCallback(() => { setSelected(null); setShowForm(false); }, []);

  const handleSave = useCallback(async (payload) => {
    if (payload.id) await api.put(`/soldiers/${payload.id}`, payload);
    else            await api.post('/soldiers', payload);
    closeForm();
    fetchSoldiers();
  }, [closeForm, fetchSoldiers]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Supprimer ce soldat ?')) return;
    await api.delete(`/soldiers/${id}`);
    fetchSoldiers();
  }, [fetchSoldiers]);

  const Avatar = ({ s, size = 36 }) => (
    s?.photo_url
      ? <img src={s.photo_url} alt={s.nom_complet} className="sol-avatar-img" style={{width:size,height:size}} />
      : <div className="sol-avatar" style={{width:size,height:size,fontSize:size*0.35}}>
          {(s?.prenom?.[0]||'?')+(s?.nom?.[0]||'')}
        </div>
  );

  return (
    <div className="soldiers-page">

      {/* En-tête */}
      <div className="soldiers-header">
        <div>
          <h1 className="soldiers-title">Effectifs</h1>
          <p className="soldiers-count">
            {soldiers.length} soldat{soldiers.length !== 1 ? 's' : ''} enregistré{soldiers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {perms.canWrite && <button className="sol-btn-primary" onClick={openAdd}>＋ Enrôler un soldat</button>}
      </div>

      {/* Filtres */}
      <div className="sol-toolbar">
        <div className="sol-search-wrap">
          <span className="sol-search-icon">⌕</span>
          <input className="sol-search" placeholder="Rechercher par nom, prénom, matricule, alias, fonction…"
            value={search} onChange={e=>setSearch(e.target.value)} />
        </div>
        <select className="sol-select" value={filterGrade} onChange={e=>setFilterGrade(e.target.value)}>
          <option value="">Tous les grades</option>
          {GRADES.map(g=><option key={g}>{g}</option>)}
        </select>
        <div className="sol-view-toggle">
          <button className={viewMode==='table'?'active':''} onClick={()=>setViewMode('table')}>
            ☰ Liste
          </button>
          <button className={viewMode==='grid'?'active':''} onClick={()=>setViewMode('grid')}>
            ⊞ Grille
          </button>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="sol-overlay" onClick={e=>{ if(e.target===e.currentTarget) closeForm(); }}>
          <div className="sol-modal">
            <div className="sol-modal-header">
              <span>{selected ? 'Modifier le soldat' : 'Enrôler un nouveau soldat'}</span>
              <button className="sol-modal-close" onClick={closeForm}>✕</button>
            </div>
            <div className="sol-modal-body">
              <SoldierForm
                key={selected?.id ?? 'new'}
                initial={selected}
                onSave={handleSave}
                onCancel={closeForm}
              />
            </div>
          </div>
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <div className="sol-loading">Chargement des effectifs…</div>
      ) : filtered.length === 0 ? (
        <div className="sol-empty">
          <div className="sol-empty-icon">◈</div>
          <p>Aucun soldat trouvé</p>
          {perms.canWrite && <button className="sol-btn-primary" onClick={openAdd}>Enrôler le premier soldat</button>}
        </div>
      ) : viewMode === 'table' ? (
        <div className="sol-table-wrap">
          <table className="sol-table">
            <thead><tr>
              <th>Photo</th><th>Matricule</th><th>Nom complet</th><th>Grade</th>
              <th>Promotion</th><th>UFR / Année</th><th>Résidence</th><th>Statut</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td><Avatar s={s} size={34} /></td>
                  <td>
                    <span className="sol-matricule">{s.matricule}</span>
                    {s.haut_commandement && <div className="sol-hc-badge">⭐ H.C.</div>}
                  </td>
                  <td>
                    <strong className="sol-name-link" onClick={()=>navigate(`/soldats/${s.id}`)} style={{cursor:'pointer'}}>{s.nom_complet}</strong>
                    {s.alias && <div className="sol-alias-tag">« {s.alias} »</div>}
                    {s.matricule_etudiant && <div className="sol-code-etu">{s.matricule_etudiant}</div>}
                  </td>
                  <td>
                    {s.grade === 'Major' ? <span className="sol-badge-major">👑 Major</span>
                    : s.grade === 'Légionnaire' ? <span className="sol-badge-legion">⚔️ Légionnaire</span>
                    : <span>{s.grade}</span>}
                    {s.fonction && <div style={{fontSize:'.68rem',color:'var(--gold-dim)',marginTop:2}}>{s.fonction}</div>}
                  </td>
                  <td>Promo {s.promotion}</td>
                  <td>{s.ufr ? `${({'Lettres et Sciences Humaines':'LSH','Sciences Appliquées et de Technologie':'SAT','Sciences Juridiques et Politiques':'SJP','Sciences Économiques et de Gestion':'SEG','Sciences de la Santé':'2S',"Sciences Agronomiques, d'Aquaculture et de Technologie Alimentaire":'SAATA','Civilisations, Religions, Arts et Communication':'CRAC',"Sciences de l'Éducation, de la Formation et du Sport":'SEFS'})[s.ufr] || s.ufr.split(' ')[0]} · ${s.annee_etude}` : s.annee_etude || '—'}</td>
                  <td>{s.village ? `Vill.${s.village}${s.batiment?' · '+s.batiment:''}${s.numero_chambre?' Ch.'+s.numero_chambre:''}` : '—'}</td>
                  <td><span className={`sol-status sol-status-${s.statut}`}>{s.statut}</span></td>
                  <td>
                    <div className="sol-actions-cell">
                      {perms.canWrite && <button className="sol-icon-btn" title="Modifier" onClick={()=>openEdit(s)}>✏</button>}
                      {perms.canDelete && <button className="sol-icon-btn sol-icon-danger" title="Supprimer" onClick={()=>handleDelete(s.id)}>✕</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sol-grid">
          {filtered.map(s => {
            const ufrMap = {'Lettres et Sciences Humaines':'LSH','Sciences Appliquées et de Technologie':'SAT','Sciences Juridiques et Politiques':'SJP','Sciences Économiques et de Gestion':'SEG','Sciences de la Santé':'2S',"Sciences Agronomiques, d'Aquaculture et de Technologie Alimentaire":'SAATA','Civilisations, Religions, Arts et Communication':'CRAC',"Sciences de l'Éducation, de la Formation et du Sport":'SEFS'};
            const ufrLabel = s.ufr ? (ufrMap[s.ufr] || s.ufr.split(' ')[0]) : null;
            const residence = s.village === 'Hors campus'
              ? (s.adresse || 'Hors campus')
              : s.village
                ? `Vill. ${s.village}${s.batiment?' · '+s.batiment:''}${s.numero_chambre?' Ch.'+s.numero_chambre:''}`
                : null;
            return (
            <div key={s.id} className={`sol-card${s.grade==='Major'?' sol-card-major':s.grade==='Légionnaire'?' sol-card-legion':''}`}>
              {/* Bannière colorée selon statut */}
              <div className={`sol-card-banner banner-${s.statut}`} />

              {/* Photo + badge grade */}
              <div className="sol-card-hero">
                <div className="sol-card-avatar-wrap">
                  <Avatar s={s} size={72} />
                  <div className={`sol-card-statut-dot dot-${s.statut}`} title={s.statut} />
                </div>
                {s.grade === 'Major' ? (
                  <div className="sol-grade-major">👑 MAJOR <span>Chef Suprême</span></div>
                ) : s.grade === 'Légionnaire' ? (
                  <div className="sol-grade-legion">⚔️ LÉGIONNAIRE <span>Second</span></div>
                ) : (
                  <div className="sol-card-grade-badge">{s.grade}{s.fonction ? ` · ${s.fonction}` : ''}</div>
                )}
              </div>

              {/* Identité */}
              <div className="sol-card-identity">
                <div className="sol-card-name">{s.prenom} {s.nom}</div>
                {s.alias && <div className="sol-card-alias">« {s.alias} »</div>}
                <div className="sol-card-matricule">{s.matricule}</div>
                <div className="sol-card-promo">Promotion {s.promotion}</div>
              </div>

              {/* Badge Haut Commandement */}
              {s.haut_commandement && (
                <div className="sol-card-hc-badge">⭐ HAUT COMMANDEMENT</div>
              )}

              {/* Voir profil */}
              <div className="sol-card-view-profile" onClick={()=>navigate(`/soldats/${s.id}`)}>👤 Voir la fiche complète →</div>

              {/* Infos clés */}
              <div className="sol-card-infos">
                {ufrLabel && (
                  <div className="sol-card-info-row">
                    <span className="sol-info-icon">🎓</span>
                    <span className="sol-info-val">{ufrLabel}{s.annee_etude ? ' · '+s.annee_etude : ''}</span>
                  </div>
                )}
                {residence && (
                  <div className="sol-card-info-row">
                    <span className="sol-info-icon">🏠</span>
                    <span className="sol-info-val">{residence}</span>
                  </div>
                )}
                {s.telephone && (
                  <div className="sol-card-info-row">
                    <span className="sol-info-icon">📞</span>
                    <span className="sol-info-val">{s.telephone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="sol-card-info-row">
                    <span className="sol-info-icon">✉</span>
                    <span className="sol-info-val sol-info-email">{s.email}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="sol-card-actions">
                <button className="sol-card-btn-edit" onClick={()=>openEdit(s)}>✏ Modifier</button>
                <button className="sol-card-btn-del" onClick={()=>handleDelete(s.id)}>✕</button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
