import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import api from '../utils/api';
import '../styles/SectionDrapeau.css';

const TYPE_CFG = {
  levee:          { label:'Levée des Couleurs',  icon:'🌅', color:'#fbbf24' },
  descente:       { label:'Descente des Couleurs',icon:'🌇', color:'#f59e0b' },
  'défilé':       { label:'Défilé',              icon:'🚶', color:'#60a5fa' },
  commemorative:  { label:'Commémorative',        icon:'🎖️', color:'#a78bfa' },
  autre:          { label:'Autre',               icon:'📋', color:'#94a3b8' },
};
const STATUT_CFG = {
  planifiee:  { label:'Planifiée',   color:'#60a5fa', bg:'rgba(96,165,250,.12)'  },
  confirmee:  { label:'Confirmée',   color:'#f59e0b', bg:'rgba(245,158,11,.12)'  },
  terminee:   { label:'Terminée',    color:'#34d399', bg:'rgba(52,211,153,.12)'  },
  annulee:    { label:'Annulée',     color:'#ef4444', bg:'rgba(239,68,68,.12)'   },
};
const PRES_CFG = {
  present: { label:'Présent', color:'#34d399', icon:'✅' },
  absent:  { label:'Absent',  color:'#ef4444', icon:'✗'  },
  retard:  { label:'Retard',  color:'#f59e0b', icon:'⏰' },
  excuse:  { label:'Excusé',  color:'#60a5fa', icon:'📝' },
};
const fmt   = d => d ? new Date(d).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}) : '—';
const fmtS  = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}) : '—';
const fmtH  = h => h ? h.slice(0,5) : '';

const Avatar = ({ nom, prenom, photo, size=36, color='#C9A84C' }) => (
  photo
    ? <img src={photo} alt="" style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0}} />
    : <div style={{width:size,height:size,borderRadius:'50%',background:`${color}18`,border:`1.5px solid ${color}44`,
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*.3,fontWeight:800,
        color,flexShrink:0}}>
        {(prenom?.[0]||'')+(nom?.[0]||'')}
      </div>
);

// ── Modal Pointage ────────────────────────────────────────────────────────
const ModalPointage = ({ ceremonie, onClose, onDone }) => {
  const [soldiers, setSoldiers] = useState([]);
  const [crics,    setCrics]    = useState([]);
  const [tab,      setTab]      = useState('soldiers');
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState('');

  useEffect(() => {
    api.get(`/drapeau/ceremonies/${ceremonie.id}/pointage`).then(r => {
      setSoldiers(r.data.data.soldiers || []);
      setCrics(r.data.data.crics || []);
    });
  }, [ceremonie.id]);

  const setPresence = (type, id, val) => {
    if (type === 'soldier') setSoldiers(p => p.map(s => s.id===id ? {...s,presence:val} : s));
    else setCrics(p => p.map(c => c.id===id ? {...c,presence:val} : c));
  };

  const markAll = (type, val) => {
    if (type === 'soldier') setSoldiers(p => p.map(s => ({...s,presence:val})));
    else setCrics(p => p.map(c => ({...c,presence:val})));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const pointages = [
        ...soldiers.map(s => ({ id:s.id, type:'soldier', presence:s.presence, motif:s.motif })),
        ...crics.map(c    => ({ id:c.id, type:'cric',    presence:c.presence, motif:c.motif })),
      ];
      await api.post(`/drapeau/ceremonies/${ceremonie.id}/pointage`, { pointages });
      setToast('✅ Pointage enregistré');
      setTimeout(() => { onDone(); onClose(); }, 1000);
    } catch { setToast('❌ Erreur'); setSaving(false); }
  };

  const list  = tab === 'soldiers' ? soldiers : crics;
  const type  = tab === 'soldiers' ? 'soldier' : 'cric';
  const nbP   = list.filter(x=>x.presence==='present').length;

  return (
    <div className="sd-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sd-modal sd-modal-lg">
        <div className="sd-modal-header">
          ✎ Pointage — {ceremonie.titre} · {fmtS(ceremonie.date_ceremonie)}
          <button className="sd-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sd-modal-body">
          {/* Tabs soldiers/crics */}
          <div className="sd-ptabs">
            <button className={`sd-ptab ${tab==='soldiers'?'active':''}`} onClick={()=>setTab('soldiers')}>
              ◈ Soldats ({soldiers.length})
            </button>
            <button className={`sd-ptab ${tab==='crics'?'active':''}`} onClick={()=>setTab('crics')}>
              ◎ CRICs ({crics.length})
            </button>
          </div>

          {/* Sélection rapide */}
          <div className="sd-quick-row">
            <span style={{fontSize:'.68rem',color:'var(--text-muted)'}}>Tout marquer :</span>
            {Object.entries(PRES_CFG).map(([k,v]) => (
              <button key={k} className="sd-quick-btn"
                style={{color:v.color,borderColor:v.color+'44'}}
                onClick={()=>markAll(type,k)}>
                {v.icon} {v.label}
              </button>
            ))}
            <span style={{marginLeft:'auto',fontSize:'.75rem',color:'var(--gold-bright)',fontWeight:700}}>
              {nbP}/{list.length} présents
            </span>
          </div>

          {/* Liste */}
          <div className="sd-point-list">
            {list.map(p => {
              const cfg = PRES_CFG[p.presence] || PRES_CFG.absent;
              return (
                <div key={p.id} className="sd-point-row" style={{borderColor:cfg.color+'33',background:cfg.color+'08'}}>
                  <Avatar nom={p.nom} prenom={p.prenom} photo={p.photo_url} size={38} color={cfg.color} />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'.82rem',color:'var(--text-primary)'}}>{p.prenom} {p.nom}</div>
                    <div style={{fontSize:'.65rem',color:'var(--text-muted)'}}>
                      {p.grade || p.statut_cric || ''}
                    </div>
                  </div>
                  <div className="sd-pres-btns">
                    {Object.entries(PRES_CFG).map(([k,v]) => (
                      <button key={k} className={`sd-pres-btn ${p.presence===k?'active':''}`}
                        style={p.presence===k
                          ? {background:v.color,color:'#fff',borderColor:v.color}
                          : {borderColor:v.color+'55',color:v.color}}
                        onClick={()=>setPresence(type,p.id,k)}>
                        {v.icon} {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {list.length === 0 && <div className="sd-empty">Aucun participant</div>}
          </div>

          {toast && <div className="sd-toast-inline">{toast}</div>}
          <div className="sd-modal-footer">
            <button className="sd-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="sd-btn-confirm" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Enregistrement…' : `✓ Sauvegarder le pointage`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal Nouvelle Cérémonie ──────────────────────────────────────────────
const ModalCeremonie = ({ onClose, onDone }) => {
  const [form, setForm] = useState({
    type:'levee', titre:'', date_ceremonie: new Date().toISOString().slice(0,10),
    heure_debut:'07:00', lieu:'QG — UGB', description:'',
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  // Auto-titre selon le type
  useEffect(() => {
    const titles = { levee:'Levée des Couleurs', descente:'Descente des Couleurs',
      'défilé':'Défilé Militaire', commemorative:'Cérémonie Commémorative', autre:'' };
    set('titre', titles[form.type] || '');
    if (form.type==='descente') set('heure_debut','18:00');
    else if (form.type==='levee') set('heure_debut','07:00');
  }, [form.type]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/drapeau/ceremonies', form);
      onDone(); onClose();
    } catch { setSaving(false); }
  };

  return (
    <div className="sd-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sd-modal">
        <div className="sd-modal-header">
          🚩 Nouvelle Cérémonie
          <button className="sd-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sd-modal-body">
          <div className="sd-field">
            <label>Type</label>
            <select className="sd-input" value={form.type} onChange={e=>set('type',e.target.value)}>
              {Object.entries(TYPE_CFG).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div className="sd-field">
            <label>Titre</label>
            <input className="sd-input" value={form.titre} onChange={e=>set('titre',e.target.value)} />
          </div>
          <div className="sd-field-row">
            <div className="sd-field">
              <label>Date</label>
              <input type="date" className="sd-input" value={form.date_ceremonie} onChange={e=>set('date_ceremonie',e.target.value)} />
            </div>
            <div className="sd-field">
              <label>Heure</label>
              <input type="time" className="sd-input" value={form.heure_debut} onChange={e=>set('heure_debut',e.target.value)} />
            </div>
          </div>
          <div className="sd-field">
            <label>Lieu</label>
            <input className="sd-input" value={form.lieu} onChange={e=>set('lieu',e.target.value)} />
          </div>
          <div className="sd-field">
            <label>Description</label>
            <textarea className="sd-input" rows={2} value={form.description} onChange={e=>set('description',e.target.value)} />
          </div>
          <div className="sd-modal-footer">
            <button className="sd-btn-cancel" onClick={onClose}>Annuler</button>
            {perms.canWrite && <button className="sd-btn-confirm" onClick={handleSave} disabled={saving}>
              {saving?'⏳…':'✓ Créer'}
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Modal Paramètres ──────────────────────────────────────────────────────
const ModalParams = ({ params, onClose, onDone }) => {
  const [form, setForm] = useState({
    auto_levee_active:    params.auto_levee_active,
    auto_descente_active: params.auto_descente_active,
    heure_levee:          params.heure_levee?.slice(0,5) || '07:00',
    heure_descente:       params.heure_descente?.slice(0,5) || '18:00',
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const handleSave = async () => {
    setSaving(true);
    try { await api.put('/drapeau/parametres', form); onDone(); onClose(); }
    catch { setSaving(false); }
  };

  return (
    <div className="sd-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="sd-modal">
        <div className="sd-modal-header">⚙️ Paramètres Automatisation<button className="sd-modal-close" onClick={onClose}>✕</button></div>
        <div className="sd-modal-body">
          <div className="sd-param-row">
            <div>
              <div style={{fontWeight:700,color:'var(--text-primary)',fontSize:'.85rem'}}>🌅 Levée des Couleurs (Lundi)</div>
              <div style={{fontSize:'.68rem',color:'var(--text-muted)',marginTop:2}}>Génération automatique chaque lundi</div>
            </div>
            <label className="sd-toggle">
              <input type="checkbox" checked={form.auto_levee_active} onChange={e=>set('auto_levee_active',e.target.checked)} />
              <span className="sd-toggle-slider" />
            </label>
          </div>
          {form.auto_levee_active && (
            <div className="sd-field">
              <label>Heure de la Levée</label>
              <input type="time" className="sd-input" value={form.heure_levee} onChange={e=>set('heure_levee',e.target.value)} />
            </div>
          )}
          <div className="sd-param-row">
            <div>
              <div style={{fontWeight:700,color:'var(--text-primary)',fontSize:'.85rem'}}>🌇 Descente des Couleurs (Vendredi)</div>
              <div style={{fontSize:'.68rem',color:'var(--text-muted)',marginTop:2}}>Génération automatique chaque vendredi</div>
            </div>
            <label className="sd-toggle">
              <input type="checkbox" checked={form.auto_descente_active} onChange={e=>set('auto_descente_active',e.target.checked)} />
              <span className="sd-toggle-slider" />
            </label>
          </div>
          {form.auto_descente_active && (
            <div className="sd-field">
              <label>Heure de la Descente</label>
              <input type="time" className="sd-input" value={form.heure_descente} onChange={e=>set('heure_descente',e.target.value)} />
            </div>
          )}
          <div className="sd-modal-footer">
            <button className="sd-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="sd-btn-confirm" onClick={handleSave} disabled={saving}>{saving?'⏳…':'✓ Sauvegarder'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════
export default function SectionDrapeau() {
  const location = useLocation();
  const perms = usePermissions(JSON.parse(localStorage.getItem('user')||'{}'), location.pathname);
  const [tab,          setTab]          = useState('dashboard');
  const [ceremonies,   setCeremonies]   = useState([]);
  const [stats,        setStats]        = useState(null);
  const [params,       setParams]       = useState(null);
  const [membres,      setMembres]      = useState([]);
  const [soldiers,     setSoldiers]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatut, setFilterStatut] = useState('');
  const [showNew,      setShowNew]      = useState(false);
  const [showParams,   setShowParams]   = useState(false);
  const [showPointage, setShowPointage] = useState(null);
  const [showAddMembre,setShowAddMembre]= useState(false);
  const [toast,        setToast]        = useState('');

  const notify = (msg) => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cer, st, pr, mb, sol] = await Promise.all([
        api.get('/drapeau/ceremonies'),
        api.get('/drapeau/stats'),
        api.get('/drapeau/parametres'),
        api.get('/drapeau/membres'),
        api.get('/soldiers'),
      ]);
      setCeremonies(cer.data.data || []);
      setStats(st.data.data);
      setParams(pr.data.data);
      setMembres(mb.data.data || []);
      setSoldiers(sol.data.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGenerer = async () => {
    try {
      const r = await api.post('/drapeau/ceremonies/generer');
      notify(r.data.message);
      load();
    } catch { notify('❌ Erreur'); }
  };

  const handleConfirmer = async (id) => {
    try {
      await api.patch(`/drapeau/ceremonies/${id}/confirmer`);
      notify('✅ Cérémonie confirmée — pointage ouvert');
      load();
    } catch { notify('❌ Erreur'); }
  };

  const handleTerminer = async (id) => {
    try {
      const r = await api.patch(`/drapeau/ceremonies/${id}/terminer`);
      notify(r.data.message);
      load();
    } catch { notify('❌ Erreur'); }
  };

  const handleAnnuler = async (id) => {
    if (!confirm('Annuler cette cérémonie ?')) return;
    try { await api.patch(`/drapeau/ceremonies/${id}/annuler`); load(); }
    catch { notify('❌ Erreur'); }
  };

  const handleRemoveMembre = async (soldier_id) => {
    if (!confirm('Retirer ce membre ?')) return;
    try { await api.delete(`/drapeau/membres/${soldier_id}`); load(); }
    catch {}
  };

  const handleAddMembre = async (soldier_id, role) => {
    try { await api.post('/drapeau/membres', { soldier_id, role }); load(); setShowAddMembre(false); }
    catch {}
  };

  const filtered = ceremonies.filter(c => !filterStatut || c.statut === filterStatut);

  // ── DASHBOARD ─────────────────────────────────────────────────────────
  const TabDashboard = () => (
    <div className="sd-dashboard">
      {/* KPIs */}
      <div className="sd-kpis">
        {[
          { val: stats?.total_ceremonies    || 0,  label:'Cérémonies totales', color:'#C9A84C', icon:'🚩' },
          { val: stats?.ceremonies_ce_mois  || 0,  label:'Ce mois',            color:'#60a5fa', icon:'📅' },
          { val: `${stats?.taux_presence_moyen||0}%`, label:'Taux de présence', color: (stats?.taux_presence_moyen||0)>=80?'#34d399':'#ef4444', icon:'📊' },
          { val: stats?.top_absents?.length || 0,  label:'Absents récurrents', color:'#f87171', icon:'⚠️' },
        ].map((k,i) => (
          <div key={i} className="sd-kpi" style={{borderColor:k.color+'44'}}>
            <div className="sd-kpi-icon">{k.icon}</div>
            <div className="sd-kpi-val" style={{color:k.color}}>{k.val}</div>
            <div className="sd-kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Prochaine cérémonie */}
      {stats?.prochaine_ceremonie && (
        <div className="sd-next-card">
          <div className="sd-next-label">PROCHAINE CÉRÉMONIE</div>
          <div className="sd-next-title">
            {TYPE_CFG[stats.prochaine_ceremonie.type]?.icon} {stats.prochaine_ceremonie.titre}
          </div>
          <div className="sd-next-meta">
            📅 {fmt(stats.prochaine_ceremonie.date_ceremonie)} · ⏰ {fmtH(stats.prochaine_ceremonie.heure_debut)}
          </div>
        </div>
      )}

      {/* Top absents */}
      {stats?.top_absents?.length > 0 && (
        <div className="sd-card">
          <div className="sd-card-title">⚠️ SOLDATS LES PLUS ABSENTS</div>
          <div className="sd-absents-list">
            {stats.top_absents.map((s,i) => (
              <div key={i} className="sd-absent-row">
                <Avatar nom={s.nom} prenom={s.prenom} photo={s.photo_url} size={36} color='#ef4444' />
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:'.8rem',color:'var(--text-primary)'}}>{s.prenom} {s.nom}</div>
                </div>
                <div className="sd-absent-count">{s.nb_absences} abs.</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automatisation */}
      {params && (
        <div className="sd-card">
          <div className="sd-card-title">⚙️ AUTOMATISATION</div>
          <div className="sd-auto-row">
            <div>
              <span className={`sd-auto-dot ${params.auto_levee_active?'on':'off'}`} />
              Levée auto (Lundi {fmtH(params.heure_levee)})
            </div>
            <div>
              <span className={`sd-auto-dot ${params.auto_descente_active?'on':'off'}`} />
              Descente auto (Vendredi {fmtH(params.heure_descente)})
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}>
            <button className="sd-btn-gold" onClick={handleGenerer}>⚡ Générer cette semaine</button>
            <button className="sd-btn-outline" onClick={()=>setShowParams(true)}>⚙️ Paramètres</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── CÉRÉMONIES ────────────────────────────────────────────────────────
  const TabCeremonies = () => (
    <div>
      <div className="sd-toolbar">
        <select className="sd-select" value={filterStatut} onChange={e=>setFilterStatut(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        {perms.canWrite && <button className="sd-btn-gold" onClick={()=>setShowNew(true)}>+ Nouvelle cérémonie</button>}
      </div>

      {filtered.length === 0
        ? <div className="sd-empty"><span>🚩</span><p>Aucune cérémonie</p></div>
        : (
          <div className="sd-ceremonies-list">
            {filtered.map(c => {
              const scfg = STATUT_CFG[c.statut] || STATUT_CFG.planifiee;
              const tcfg = TYPE_CFG[c.type] || TYPE_CFG.autre;
              const pct  = parseInt(c.taux_presence) || 0;
              return (
                <div key={c.id} className="sd-cer-card" style={{borderColor:tcfg.color+'44'}}>
                  <div className="sd-cer-topbar" style={{background:tcfg.color}} />
                  <div className="sd-cer-body">
                    <div className="sd-cer-left">
                      <div className="sd-cer-icon" style={{color:tcfg.color,background:tcfg.color+'15'}}>
                        {tcfg.icon}
                      </div>
                      <div>
                        <div className="sd-cer-titre">{c.titre}</div>
                        <div className="sd-cer-meta">
                          📅 {fmt(c.date_ceremonie)} · ⏰ {fmtH(c.heure_debut)}
                          {c.auto_generee && <span className="sd-auto-badge">⚡ Auto</span>}
                        </div>
                        {c.statut === 'terminee' && (
                          <div className="sd-cer-prog">
                            <div className="sd-cer-prog-bar">
                              <div style={{width:pct+'%',background:pct>=80?'#34d399':pct>=60?'#f59e0b':'#ef4444'}} />
                            </div>
                            <span style={{fontSize:'.68rem',color:'var(--text-muted)'}}>
                              {c.nb_presents}/{c.total_participants} présents ({pct}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="sd-cer-right">
                      <span className="sd-statut-badge" style={{color:scfg.color,background:scfg.bg}}>
                        {scfg.label}
                      </span>
                      <div className="sd-cer-actions">
                        {c.statut === 'planifiee' && <>
                          <button className="sd-btn-sm sd-btn-confirm-sm" onClick={()=>handleConfirmer(c.id)}>
                            ✓ Confirmer
                          </button>
                          {perms.canDelete && <button className="sd-btn-sm sd-btn-danger-sm" onClick={()=>handleAnnuler(c.id)}>
                            ✕ Annuler
                          </button>}
                        </>}
                        {c.statut === 'confirmee' && <>
                          <button className="sd-btn-sm sd-btn-point-sm" onClick={()=>setShowPointage(c)}>
                            ✎ Pointer
                          </button>
                          <button className="sd-btn-sm sd-btn-termine-sm" onClick={()=>handleTerminer(c.id)}>
                            ⬛ Terminer
                          </button>
                        </>}
                        {c.statut === 'terminee' && (
                          <button className="sd-btn-sm sd-btn-point-sm" onClick={()=>setShowPointage(c)}>
                            👁 Voir pointage
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );

  // ── MEMBRES ───────────────────────────────────────────────────────────
  const TabMembres = () => {
    const [selSoldier, setSelSoldier] = useState('');
    const [selRole,    setSelRole]    = useState('membre');
    const membreIds = new Set(membres.map(m=>m.soldier_id));
    const disponibles = soldiers.filter(s => !membreIds.has(s.id) && s.statut === 'actif');

    return (
      <div>
        <div className="sd-card" style={{marginBottom:20}}>
          <div className="sd-card-title">👥 MEMBRES DE LA SECTION DRAPEAU</div>
          {membres.length === 0
            ? <div className="sd-empty"><p>Aucun membre assigné</p></div>
            : (
              <div className="sd-membres-list">
                {membres.map(m => (
                  <div key={m.id} className="sd-membre-row">
                    <Avatar nom={m.nom} prenom={m.prenom} photo={m.photo_url} size={42} color='#C9A84C' />
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:'.85rem',color:'var(--text-primary)'}}>{m.prenom} {m.nom}</div>
                      <div style={{fontSize:'.68rem',color:'var(--text-muted)'}}>{m.grade} · Depuis le {fmtS(m.date_affectation)}</div>
                    </div>
                    <span className={`sd-role-badge sd-role-${m.role}`}>
                      {m.role==='chef'?'👑 Chef':m.role==='second'?'⭐ Second':'Membre'}
                    </span>
                    <button className="sd-btn-remove" onClick={()=>handleRemoveMembre(m.soldier_id)}>✕</button>
                  </div>
                ))}
              </div>
            )
          }
        </div>

        {/* Ajouter un membre */}
        <div className="sd-card">
          <div className="sd-card-title">➕ AJOUTER UN MEMBRE</div>
          <div className="sd-field-row">
            <div className="sd-field">
              <label>Soldat</label>
              <select className="sd-input" value={selSoldier} onChange={e=>setSelSoldier(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {disponibles.map(s=><option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.grade}</option>)}
              </select>
            </div>
            <div className="sd-field">
              <label>Rôle</label>
              <select className="sd-input" value={selRole} onChange={e=>setSelRole(e.target.value)}>
                <option value="chef">👑 Chef de section</option>
                <option value="second">⭐ Second</option>
                <option value="membre">Membre</option>
              </select>
            </div>
            <div className="sd-field" style={{justifyContent:'flex-end'}}>
              <label style={{opacity:0}}>_</label>
              {perms.canWrite && <button className="sd-btn-gold" disabled={!selSoldier}
                onClick={()=>handleAddMembre(parseInt(selSoldier),selRole)}>
                ➕ Ajouter
              </button>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sd-page">
      {/* Header */}
      <div className="sd-header">
        <div>
          <div className="sd-eyebrow">G5C ARMÉE — SECTION</div>
          <h1 className="sd-title">🚩 Section Drapeau</h1>
          <div className="sd-subtitle">Gestion des cérémonies et des couleurs de l'Armée du G5C</div>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
          <button className="sd-btn-outline" onClick={()=>setShowParams(true)}>⚙️ Paramètres</button>
          <button className="sd-btn-gold" onClick={handleGenerer}>⚡ Générer semaine</button>
          {perms.canWrite && <button className="sd-btn-gold" style={{background:'rgba(201,168,76,.15)',color:'var(--gold-bright)',border:'1px solid rgba(201,168,76,.3)'}} onClick={()=>setShowNew(true)}>+ Cérémonie</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="sd-tabs">
        {[['dashboard','📊 Tableau de bord'],['ceremonies','🚩 Cérémonies'],['membres','👥 Membres']].map(([k,l])=>(
          <button key={k} className={`sd-tab ${tab===k?'active':''}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {loading ? <div className="sd-empty">Chargement…</div> : (
        <>
          {tab === 'dashboard'  && <TabDashboard />}
          {tab === 'ceremonies' && <TabCeremonies />}
          {tab === 'membres'    && <TabMembres />}
        </>
      )}

      {/* Modals */}
      {showNew     && <ModalCeremonie onClose={()=>setShowNew(false)} onDone={load} />}
      {showParams  && params && <ModalParams params={params} onClose={()=>setShowParams(false)} onDone={load} />}
      {showPointage && <ModalPointage ceremonie={showPointage} onClose={()=>setShowPointage(null)} onDone={load} />}

      {toast && <div className="sd-toast">{toast}</div>}
    </div>
  );
}
