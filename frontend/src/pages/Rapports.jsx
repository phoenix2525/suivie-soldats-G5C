import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import '../styles/Rapports.css';

const SECTION_CFG = {
  drapeau:     { label:'Section Drapeau',     icon:'🚩', color:'#fbbf24' },
  caporaux:    { label:'Section Caporaux',    icon:'💪', color:'#34d399' },
  recrutement: { label:'Section Recrutement', icon:'🎯', color:'#60a5fa' },
  drh:         { label:'DRH',                 icon:'⚔️', color:'#a78bfa' },
  dsa:         { label:'DSA — Santé',         icon:'✚',  color:'#f87171' },
  dasc:        { label:'DASC — Sports',       icon:'⚽', color:'#34d399' },
  dcsp:        { label:'DCSP — Pédagogie',    icon:'🎓', color:'#60a5fa' },
  dasb:        { label:'DASB — Social',       icon:'💼', color:'#94a3b8' },
};
const TYPE_CFG = {
  absence:      { label:'Absence',      color:'#ef4444', icon:'✗'  },
  retard:       { label:'Retard',       color:'#f59e0b', icon:'⏰' },
  comportement: { label:'Comportement', color:'#a78bfa', icon:'⚠️' },
  autre:        { label:'Autre',        color:'#94a3b8', icon:'📋' },
};
const STATUT_CFG = {
  ouvert:         { label:'Ouvert',         color:'#ef4444', bg:'rgba(239,68,68,.1)'   },
  pris_en_charge: { label:'Pris en charge', color:'#f59e0b', bg:'rgba(245,158,11,.1)'  },
  cloture:        { label:'Clôturé',        color:'#34d399', bg:'rgba(52,211,153,.1)'  },
};
const SEVERITES  = ['mineure','moyenne','grave','tres_grave'];
const CATEGORIES = ['avertissement','blame','corvee','suspension','exclusion_temporaire','autre'];
const TYPES_SANC = ['Avertissement écrit','Blâme','Corvée supplémentaire','Suspension d\'activités','Autre'];
const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—';

const Avatar = ({ nom, prenom, photo, size=36, color='#C9A84C' }) => (
  photo
    ? <img src={photo} alt="" style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0,border:`1.5px solid ${color}44`}} />
    : <div style={{width:size,height:size,borderRadius:'50%',background:`${color}18`,border:`1.5px solid ${color}44`,
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.3,fontWeight:800,color,flexShrink:0}}>
        {(prenom?.[0]||'')+(nom?.[0]||'')}
      </div>
);

// ── Modal Sanction ────────────────────────────────────────────────────────
const ModalSanction = ({ signalement, onClose, onDone }) => {
  const [form, setForm] = useState({
    soldier_id:    signalement.soldier_id,
    date_sanction: new Date().toISOString().slice(0,10),
    type_sanction: 'Avertissement écrit',
    categorie:     'avertissement',
    motif:         signalement.description || '',
    faits:         signalement.description || '',
    severite:      'mineure',
    duree_jours:   '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSave = async () => {
    if (!form.motif) { setError('Motif obligatoire'); return; }
    setSaving(true);
    try {
      await api.post(`/signalements/${signalement.id}/sanctionner`, form);
      onDone(); onClose();
    } catch (e) { setError(e.response?.data?.error || 'Erreur'); setSaving(false); }
  };

  return (
    <div className="rp-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="rp-modal">
        <div className="rp-modal-header" style={{color:'#ef4444'}}>
          ⚔️ Prononcer une sanction — {signalement.soldier_prenom} {signalement.soldier_nom}
          <button className="rp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rp-modal-body">
          {/* Contexte signalement */}
          <div className="rp-context-banner">
            <span style={{color:TYPE_CFG[signalement.type]?.color}}>{TYPE_CFG[signalement.type]?.icon}</span>
            <div>
              <div style={{fontSize:'.75rem',fontWeight:700,color:'var(--text-primary)'}}>
                Signalement : {TYPE_CFG[signalement.type]?.label}
              </div>
              <div style={{fontSize:'.68rem',color:'var(--text-muted)'}}>{signalement.description}</div>
              <div style={{fontSize:'.62rem',color:'var(--text-muted)',marginTop:2}}>
                {SECTION_CFG[signalement.section_slug]?.icon} {SECTION_CFG[signalement.section_slug]?.label} · {fmt(signalement.created_at)}
              </div>
            </div>
          </div>

          <div className="rp-field-row">
            <div className="rp-field">
              <label>Date de la sanction</label>
              <input type="date" className="rp-input" value={form.date_sanction} onChange={e=>set('date_sanction',e.target.value)} />
            </div>
            <div className="rp-field">
              <label>Sévérité</label>
              <select className="rp-input" value={form.severite} onChange={e=>set('severite',e.target.value)}>
                {SEVERITES.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="rp-field">
            <label>Type de sanction</label>
            <select className="rp-input" value={form.type_sanction} onChange={e=>set('type_sanction',e.target.value)}>
              {TYPES_SANC.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="rp-field">
            <label>Catégorie</label>
            <select className="rp-input" value={form.categorie} onChange={e=>set('categorie',e.target.value)}>
              {CATEGORIES.map(c=><option key={c} value={c}>{c.replace('_',' ')}</option>)}
            </select>
          </div>
          <div className="rp-field">
            <label>Motif *</label>
            <textarea className="rp-input" rows={2} value={form.motif} onChange={e=>set('motif',e.target.value)} />
          </div>
          <div className="rp-field">
            <label>Faits reprochés</label>
            <textarea className="rp-input" rows={2} value={form.faits} onChange={e=>set('faits',e.target.value)} />
          </div>
          <div className="rp-field">
            <label>Durée (jours, si applicable)</label>
            <input type="number" className="rp-input" placeholder="Laisser vide si non applicable"
              value={form.duree_jours} onChange={e=>set('duree_jours',e.target.value)} />
          </div>
          {error && <div className="rp-error">{error}</div>}
          <div className="rp-modal-footer">
            <button className="rp-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="rp-btn-sanction" onClick={handleSave} disabled={saving}>
              {saving?'⏳ Enregistrement…':'⚔️ Prononcer la sanction'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal Nouveau signalement manuel ──────────────────────────────────────
const ModalNouveauSignalement = ({ soldiers, crics, onClose, onDone }) => {
  const [form, setForm] = useState({
    section_slug:'drapeau', type:'absence', description:'',
    soldier_id:'', cric_id:'', participant_type:'soldier',
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        section_slug: form.section_slug,
        type:         form.type,
        description:  form.description,
        soldier_id:   form.participant_type==='soldier' ? form.soldier_id||null : null,
        cric_id:      form.participant_type==='cric'    ? form.cric_id||null    : null,
      };
      await api.post('/signalements', payload);
      onDone(); onClose();
    } catch { setSaving(false); }
  };

  return (
    <div className="rp-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="rp-modal">
        <div className="rp-modal-header">
          ➕ Nouveau signalement
          <button className="rp-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rp-modal-body">
          <div className="rp-field">
            <label>Section</label>
            <select className="rp-input" value={form.section_slug} onChange={e=>set('section_slug',e.target.value)}>
              {Object.entries(SECTION_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div className="rp-field-row">
            <div className="rp-field">
              <label>Type</label>
              <select className="rp-input" value={form.type} onChange={e=>set('type',e.target.value)}>
                {Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            <div className="rp-field">
              <label>Concerne</label>
              <select className="rp-input" value={form.participant_type} onChange={e=>set('participant_type',e.target.value)}>
                <option value="soldier">Soldat</option>
                <option value="cric">CRIC</option>
              </select>
            </div>
          </div>
          {form.participant_type === 'soldier' ? (
            <div className="rp-field">
              <label>Soldat</label>
              <select className="rp-input" value={form.soldier_id} onChange={e=>set('soldier_id',e.target.value)}>
                <option value="">— Sélectionner —</option>
                {soldiers.map(s=><option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.grade}</option>)}
              </select>
            </div>
          ) : (
            <div className="rp-field">
              <label>CRIC</label>
              <select className="rp-input" value={form.cric_id} onChange={e=>set('cric_id',e.target.value)}>
                <option value="">— Sélectionner —</option>
                {crics.map(c=><option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
              </select>
            </div>
          )}
          <div className="rp-field">
            <label>Description *</label>
            <textarea className="rp-input" rows={3} value={form.description} onChange={e=>set('description',e.target.value)} />
          </div>
          <div className="rp-modal-footer">
            <button className="rp-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="rp-btn-confirm" onClick={handleSave} disabled={saving}>
              {saving?'⏳…':'✓ Créer le signalement'}
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
export default function Rapports() {
  const [tab,          setTab]          = useState('signalements');
  const [signalements, setSignalements] = useState([]);
  const [stats,        setStats]        = useState(null);
  const [soldiers,     setSoldiers]     = useState([]);
  const [crics,        setCrics]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterSection,setFilterSection]= useState('');
  const [filterType,   setFilterType]   = useState('');
  const [showSanction, setShowSanction] = useState(null);
  const [showNew,      setShowNew]      = useState(false);
  const [toast,        setToast]        = useState('');

  const notify = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatut)  params.append('statut',  filterStatut);
      if (filterSection) params.append('section', filterSection);
      if (filterType)    params.append('type',    filterType);

      const [sig, st, sol, cri] = await Promise.all([
        api.get(`/signalements?${params}`),
        api.get('/signalements/stats'),
        api.get('/soldiers'),
        api.get('/crics'),
      ]);
      setSignalements(sig.data.data || []);
      setStats(st.data.data);
      setSoldiers(sol.data.data || []);
      setCrics(cri.data.data || []);
    } catch {}
    setLoading(false);
  }, [filterStatut, filterSection, filterType]);

  useEffect(() => { load(); }, [load]);

  const handleStatut = async (id, statut) => {
    try {
      await api.patch(`/signalements/${id}/statut`, { statut });
      notify(`✅ Signalement ${statut === 'cloture' ? 'clôturé' : 'mis à jour'}`);
      load();
    } catch { notify('❌ Erreur'); }
  };

  return (
    <div className="rp-page">
      {/* Header */}
      <div className="rp-header">
        <div>
          <div className="rp-eyebrow">HAUT COMMANDEMENT — G5C ARMÉE</div>
          <h1 className="rp-title">📋 Rapports & Signalements</h1>
          <div className="rp-subtitle">Centralisation des signalements de toutes les sections</div>
        </div>
        <button className="rp-btn-gold" onClick={()=>setShowNew(true)}>+ Nouveau signalement</button>
      </div>

      {/* Tabs */}
      <div className="rp-tabs">
        {[['signalements','📋 Signalements'],['stats','📊 Statistiques']].map(([k,l])=>(
          <button key={k} className={`rp-tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ═══ STATS ═══ */}
      {tab === 'stats' && stats && (
        <div className="rp-stats-page">
          {/* KPIs */}
          <div className="rp-kpis">
            {[
              { val: stats.global.total,         label:'Total',          color:'#C9A84C', icon:'📋' },
              { val: stats.global.ouverts,        label:'Ouverts',        color:'#ef4444', icon:'🔴' },
              { val: stats.global.en_cours,       label:'Pris en charge', color:'#f59e0b', icon:'🟡' },
              { val: stats.global.clotures,       label:'Clôturés',       color:'#34d399', icon:'✅' },
              { val: stats.global.cette_semaine,  label:'Cette semaine',  color:'#60a5fa', icon:'📅' },
            ].map((k,i)=>(
              <div key={i} className="rp-kpi" style={{borderColor:k.color+'44'}}>
                <div className="rp-kpi-icon">{k.icon}</div>
                <div className="rp-kpi-val" style={{color:k.color}}>{k.val}</div>
                <div className="rp-kpi-label">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="rp-stats-grid">
            {/* Par section */}
            <div className="rp-card">
              <div className="rp-card-title">🏛️ PAR SECTION</div>
              {stats.par_section.map((s,i)=>{
                const scfg = SECTION_CFG[s.section_slug] || {label:s.section_slug,icon:'📋',color:'#94a3b8'};
                return (
                  <div key={i} className="rp-stat-row">
                    <span style={{fontSize:'.9rem'}}>{scfg.icon}</span>
                    <span style={{flex:1,fontSize:'.78rem',color:'var(--text-secondary)'}}>{scfg.label}</span>
                    <span style={{fontWeight:700,color:scfg.color,fontSize:'.82rem'}}>{s.total}</span>
                    {parseInt(s.ouverts)>0 && (
                      <span className="rp-open-badge">{s.ouverts} ouvert{s.ouverts>1?'s':''}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Par type */}
            <div className="rp-card">
              <div className="rp-card-title">📊 PAR TYPE</div>
              {Object.entries(TYPE_CFG).map(([k,v])=>(
                <div key={k} className="rp-stat-row">
                  <span>{v.icon}</span>
                  <span style={{flex:1,fontSize:'.78rem',color:'var(--text-secondary)'}}>{v.label}</span>
                  <span style={{fontWeight:700,color:v.color}}>{stats.global[k+'s']||0}</span>
                </div>
              ))}
            </div>

            {/* Top signalés */}
            {stats.top_signales?.length > 0 && (
              <div className="rp-card rp-card-full">
                <div className="rp-card-title">⚠️ SOLDATS LES PLUS SIGNALÉS</div>
                {stats.top_signales.map((s,i)=>(
                  <div key={i} className="rp-top-row">
                    <span className="rp-top-rank">#{i+1}</span>
                    <Avatar nom={s.nom} prenom={s.prenom} photo={s.photo_url} size={36} color='#ef4444' />
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:'.8rem',color:'var(--text-primary)'}}>{s.prenom} {s.nom}</div>
                      <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>{s.grade}</div>
                    </div>
                    <div className="rp-top-count">{s.nb_signalements} signal.</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ SIGNALEMENTS ═══ */}
      {tab === 'signalements' && (
        <>
          {/* Filtres */}
          <div className="rp-toolbar">
            <select className="rp-select" value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}>
              <option value="">Tous les statuts</option>
              {Object.entries(STATUT_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="rp-select" value={filterSection} onChange={e=>setFilterSection(e.target.value)}>
              <option value="">Toutes les sections</option>
              {Object.entries(SECTION_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <select className="rp-select" value={filterType} onChange={e=>setFilterType(e.target.value)}>
              <option value="">Tous les types</option>
              {Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>

          {loading
            ? <div className="rp-empty">Chargement…</div>
            : signalements.length === 0
              ? <div className="rp-empty"><span>📋</span><p>Aucun signalement</p></div>
              : (
                <div className="rp-list">
                  {signalements.map(sg => {
                    const scfg  = SECTION_CFG[sg.section_slug] || {label:sg.section_slug,icon:'📋',color:'#94a3b8'};
                    const tcfg  = TYPE_CFG[sg.type]    || TYPE_CFG.autre;
                    const stcfg = STATUT_CFG[sg.statut]|| STATUT_CFG.ouvert;
                    const isSoldier = !!sg.soldier_id;
                    const nom    = isSoldier ? `${sg.soldier_prenom} ${sg.soldier_nom}` : `${sg.cric_prenom} ${sg.cric_nom}`;
                    const photo  = isSoldier ? sg.soldier_photo : sg.cric_photo;
                    const grade  = isSoldier ? sg.grade : 'CRIC';
                    const color  = isSoldier ? '#C9A84C' : '#60a5fa';

                    return (
                      <div key={sg.id} className="rp-item" style={{borderColor:tcfg.color+'33'}}>
                        <div className="rp-item-type" style={{color:tcfg.color,background:tcfg.color+'10'}}>
                          {tcfg.icon}
                        </div>
                        <div className="rp-item-body">
                          <div className="rp-item-top">
                            <Avatar nom={isSoldier?sg.soldier_nom:sg.cric_nom}
                              prenom={isSoldier?sg.soldier_prenom:sg.cric_prenom}
                              photo={photo} size={38} color={color} />
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontWeight:700,fontSize:'.85rem',color:'var(--text-primary)'}}>{nom}</div>
                              <div style={{fontSize:'.65rem',color:'var(--text-muted)',display:'flex',gap:8,flexWrap:'wrap',marginTop:2}}>
                                <span>{grade}</span>
                                <span>·</span>
                                <span style={{color:scfg.color}}>{scfg.icon} {scfg.label}</span>
                                <span>·</span>
                                <span>{fmt(sg.created_at)}</span>
                                {sg.ceremonie_titre && <><span>·</span><span>📅 {sg.ceremonie_titre}</span></>}
                              </div>
                              {sg.description && (
                                <div style={{fontSize:'.72rem',color:'var(--text-secondary)',marginTop:6,lineHeight:1.5}}>
                                  {sg.description}
                                </div>
                              )}
                            </div>
                            <span className="rp-statut-badge" style={{color:stcfg.color,background:stcfg.bg}}>
                              {stcfg.label}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="rp-item-actions">
                            {sg.statut === 'ouvert' && (
                              <button className="rp-btn-sm rp-btn-pec"
                                onClick={()=>handleStatut(sg.id,'pris_en_charge')}>
                                👁 Prendre en charge
                              </button>
                            )}
                            {sg.statut !== 'cloture' && isSoldier && (
                              <button className="rp-btn-sm rp-btn-sanc"
                                onClick={()=>setShowSanction(sg)}>
                                ⚔️ Sanctionner
                              </button>
                            )}
                            {sg.statut !== 'cloture' && (
                              <button className="rp-btn-sm rp-btn-cloture"
                                onClick={()=>handleStatut(sg.id,'cloture')}>
                                ✓ Clôturer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
          }
        </>
      )}

      {/* Modals */}
      {showSanction && (
        <ModalSanction signalement={showSanction}
          onClose={()=>setShowSanction(null)}
          onDone={()=>{ notify('⚔️ Sanction prononcée avec succès'); load(); }} />
      )}
      {showNew && (
        <ModalNouveauSignalement soldiers={soldiers} crics={crics}
          onClose={()=>setShowNew(false)}
          onDone={()=>{ notify('✅ Signalement créé'); load(); }} />
      )}

      {toast && <div className="rp-toast">{toast}</div>}
    </div>
  );
}
