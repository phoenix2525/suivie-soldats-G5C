import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import api from '../utils/api';
import '../styles/Presences.css';


const TYPES_ACTIVITE = [
  { key: 'levee_couleurs',    label: 'Levée des couleurs',   icon: '🌅', color: '#f59e0b' },
  { key: 'descente_couleurs', label: 'Descente des couleurs', icon: '🌇', color: '#8b5cf6' },
  { key: 'course',            label: 'Parcours / Course',     icon: '🏃', color: '#10b981' },
  { key: 'autre',             label: 'Autre activité',        icon: '⚡', color: '#60a5fa' },
];

const getTypeInfo = (key) => TYPES_ACTIVITE.find(t => t.key === key) || TYPES_ACTIVITE[3];

export default function Presences() {
  const location = useLocation();
  const perms = usePermissions(JSON.parse(localStorage.getItem('user')||'{}'), location.pathname);
  const [stats, setStats]               = useState(null);
  const [soldiers, setSoldiers]         = useState([]);
  const [showForm, setShowForm]         = useState(false);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState('dashboard');
  const [filterDate, setFilterDate]     = useState('');
  const [filterType, setFilterType]     = useState('levee_couleurs');
  const [presencesResult, setPresencesResult] = useState(null);
  const [loadingResult, setLoadingResult]     = useState(false);
  const [customType, setCustomType]     = useState('');
  const [showCustom, setShowCustom]     = useState(false);

  const [form, setForm] = useState({
    date_activite: new Date().toISOString().split('T')[0],
    type_activite: 'levee_couleurs',
    remarque_generale: '',
    custom_label: '',
  });
  const [presents, setPresents] = useState({});
  const [remarques, setRemarques] = useState({});

  const load = useCallback(async () => {
    try {
      const [statsRes, soldiersRes] = await Promise.all([
        api.get('/presences/stats'),
        api.get('/soldiers'),
      ]);
      setStats(statsRes.data.data);
      setSoldiers((soldiersRes.data.data || []).filter(s => s.statut === 'actif'));
    } catch(e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const searchPresences = async () => {
    if (!filterDate) return;
    setLoadingResult(true);
    try {
      const res = await api.get('/presences/activite', {
        params: { date_activite: filterDate, type_activite: filterType }
      });
      setPresencesResult(res.data);
    } catch(e) { setPresencesResult(null); }
    setLoadingResult(false);
  };

  const togglePresent = (id) => setPresents(p => ({ ...p, [id]: !p[id] }));
  const selectAll = () => { const a = {}; soldiers.forEach(s => a[s.id] = true); setPresents(a); };
  const clearAll  = () => setPresents({});

  const handleSubmit = async () => {
    const presencesArr = soldiers.map(s => ({
      soldier_id: s.id,
      present: !!presents[s.id],
      remarque: remarques[s.id] || null,
    }));
    const nbPresents = presencesArr.filter(p => p.present).length;
    if (nbPresents === 0) return alert('Cochez au moins un soldat présent');

    setSaving(true);
    try {
      const payload = {
        date_activite: form.date_activite,
        type_activite: form.type_activite,
        remarque_generale: form.remarque_generale || null,
        presences: presencesArr,
      };
      await api.post('/presences', payload);
      setShowForm(false);
      setPresents({});
      setRemarques({});
      load();
    } catch(e) {
      alert('Erreur : ' + (e.response?.data?.message || e.message));
    }
    setSaving(false);
  };

  const nbPresents = Object.values(presents).filter(Boolean).length;
  const tauxAppel = soldiers.length > 0 ? Math.round((nbPresents / soldiers.length) * 100) : 0;

  // Stats par type
  const statsByType = stats?.par_type || [];
  const topAssidus  = stats?.top_assidus || [];

  return (
    <div className="pres-page">

      {/* HEADER */}
      <div className="pres-header">
        <div>
          <h1 className="pres-title">Présences</h1>
          <p className="pres-sub">Suivi des appels et activités</p>
        </div>
        <button className="pres-btn-primary" onClick={() => { setShowForm(true); setPresents({}); setRemarques({}); }}>
          + Enregistrer un appel
        </button>
      </div>

      {/* ONGLETS */}
      <div className="pres-tabs">
        {[['dashboard','📊 Tableau de bord'],['historique','📋 Historique']].map(([k,l]) => (
          <button key={k} className={`pres-tab ${activeTab===k?'active':''}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {/* ═══════════════ DASHBOARD ═══════════════ */}
      {activeTab === 'dashboard' && (
        <div className="pres-dashboard">

          {/* Stats par type d'activité */}
          <div className="pres-section-title">Taux de présence par activité</div>
          <div className="pres-type-grid">
            {TYPES_ACTIVITE.map(t => {
              const stat = statsByType.find(s => s.type_activite === t.key);
              const taux = stat ? parseInt(stat.taux_moyen) : 0;
              const nb   = stat ? parseInt(stat.nb_activites) : 0;
              return (
                <div key={t.key} className="pres-type-card" style={{ borderColor: t.color + '44' }}>
                  <div className="pres-type-icon" style={{ color: t.color }}>{t.icon}</div>
                  <div className="pres-type-label">{t.label}</div>
                  <div className="pres-type-nb">{nb} activité{nb>1?'s':''}</div>
                  <div className="pres-gauge-wrap">
                    <div className="pres-gauge-bar">
                      <div className="pres-gauge-fill" style={{ width: taux+'%', background: t.color }} />
                    </div>
                    <span className="pres-gauge-pct" style={{ color: t.color }}>{taux}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top soldats assidus */}
          {topAssidus.length > 0 && (
            <>
              <div className="pres-section-title" style={{marginTop:28}}>🏆 Top soldats les plus assidus</div>
              <div className="pres-top-list">
                {topAssidus.map((s, i) => (
                  <div key={s.matricule} className="pres-top-row">
                    <div className={`pres-top-rank rank-${i+1}`}>{i+1}</div>
                    <div className="pres-top-info">
                      <span className="pres-top-name">{s.prenom} {s.nom}</span>
                      <span className="pres-top-meta">{s.grade} · {s.matricule}</span>
                    </div>
                    <div className="pres-top-stats">
                      <span className="pres-top-count">{s.presents}/{s.total_activites}</span>
                      <div className="pres-top-bar-wrap">
                        <div className="pres-top-bar">
                          <div className="pres-top-fill" style={{ width: s.taux+'%' }} />
                        </div>
                        <span className="pres-top-pct">{s.taux}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════ HISTORIQUE ═══════════════ */}
      {activeTab === 'historique' && (
        <div className="pres-historique">
          <div className="pres-search-box">
            <div className="pres-search-title">Rechercher un appel</div>
            <div className="pres-search-row">
              <input type="date" className="pres-input" value={filterDate}
                onChange={e => setFilterDate(e.target.value)} />
              <select className="pres-select" value={filterType}
                onChange={e => setFilterType(e.target.value)}>
                {TYPES_ACTIVITE.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <button className="pres-btn-search" onClick={searchPresences} disabled={!filterDate}>
                🔍 Rechercher
              </button>
            </div>
          </div>

          {loadingResult && <div className="pres-loading">Recherche...</div>}

          {presencesResult && (
            <div className="pres-result">
              <div className="pres-result-header">
                <div className="pres-result-title">
                  {getTypeInfo(filterType).icon} {getTypeInfo(filterType).label} — {filterDate}
                </div>
                <div className="pres-result-stats">
                  <span className="pres-stat-pill present">{presencesResult.stats?.presents} présents</span>
                  <span className="pres-stat-pill absent">{presencesResult.stats?.absents} absents</span>
                  <span className="pres-stat-pill taux">{presencesResult.stats?.taux_presence}%</span>
                </div>
              </div>
              <div className="pres-result-list">
                {presencesResult.data?.length === 0
                  ? <div className="pres-empty">Aucun enregistrement pour ce critère</div>
                  : presencesResult.data?.map(p => (
                    <div key={p.id} className={`pres-res-row ${p.present ? 'present' : 'absent'}`}>
                      <div className="pres-res-name">{p.prenom} {p.nom}</div>
                      <div className="pres-res-meta">{p.grade} · {p.matricule}</div>
                      {p.remarque && <div className="pres-res-note">💬 {p.remarque}</div>}
                      <div className={`pres-badge ${p.present ? 'present' : 'absent'}`}>
                        {p.present ? '✓ Présent' : '✗ Absent'}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ MODAL APPEL ═══════════════ */}
      {showForm && (
        <div className="pres-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="pres-modal">
            <div className="pres-modal-header">
              <span>📋 Enregistrer un appel</span>
              <button className="pres-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="pres-modal-body">

              {/* Date + Type */}
              <div className="pres-form-row">
                <div className="pres-form-group">
                  <label>Date de l'activité</label>
                  <input type="date" className="pres-input"
                    value={form.date_activite}
                    onChange={e => setForm(f => ({...f, date_activite: e.target.value}))} />
                </div>
                <div className="pres-form-group">
                  <label>Type d'activité</label>
                  <div className="pres-type-btns">
                    {TYPES_ACTIVITE.filter(t => t.key !== 'autre').map(t => (
                      <button key={t.key}
                        className={`pres-type-btn ${form.type_activite===t.key?'active':''}`}
                        style={form.type_activite===t.key ? {borderColor:t.color, background:t.color+'22', color:t.color} : {}}
                        onClick={() => { setForm(f => ({...f, type_activite: t.key})); setShowCustom(false); }}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                    <button
                      className={`pres-type-btn ${showCustom?'active':''}`}
                      style={showCustom ? {borderColor:'#60a5fa', background:'#60a5fa22', color:'#60a5fa'} : {}}
                      onClick={() => { setShowCustom(true); setForm(f => ({...f, type_activite: 'autre'})); }}>
                      ➕ Nouvelle activité
                    </button>
                  </div>
                  {showCustom && (
                    <input className="pres-input" style={{marginTop:8}}
                      placeholder="Ex: Séance de tir, Cérémonie, Exercice..."
                      value={form.custom_label}
                      onChange={e => setForm(f => ({...f, custom_label: e.target.value}))} />
                  )}
                </div>
              </div>

              <div className="pres-form-group">
                <label>Remarque générale (optionnel)</label>
                <input className="pres-input"
                  placeholder="Ex: Mauvaise météo, Activité raccourcie..."
                  value={form.remarque_generale}
                  onChange={e => setForm(f => ({...f, remarque_generale: e.target.value}))} />
              </div>

              {/* Compteur + actions */}
              <div className="pres-appel-header">
                <div>
                  <div className="pres-appel-title">
                    Liste d'appel —{' '}
                    <span style={{color:'#34d399'}}>{nbPresents}</span> présents /{' '}
                    <span style={{color:'#ef4444'}}>{soldiers.length - nbPresents}</span> absents
                  </div>
                  <div className="pres-appel-taux">
                    <div className="pres-mini-bar">
                      <div className="pres-mini-fill" style={{width: tauxAppel+'%'}} />
                    </div>
                    <span>{tauxAppel}%</span>
                  </div>
                </div>
                <div className="pres-appel-actions">
                  <button className="pres-btn-sm" onClick={selectAll}>Tous présents</button>
                  <button className="pres-btn-sm danger" onClick={clearAll}>Effacer</button>
                </div>
              </div>

              {/* Liste soldats */}
              <div className="pres-appel-list">
                {soldiers.map(s => (
                  <div key={s.id} className={`pres-appel-row ${presents[s.id] ? 'present' : ''}`}
                    onClick={() => togglePresent(s.id)}>
                    <div className={`pres-check ${presents[s.id] ? 'checked' : ''}`}>
                      {presents[s.id] ? '✓' : ''}
                    </div>
                    <div className="pres-appel-info">
                      <span className="pres-appel-name">{s.prenom} {s.nom}</span>
                      <span className="pres-appel-meta">{s.grade} · {s.matricule}</span>
                    </div>
                    <div className={`pres-appel-badge ${presents[s.id] ? 'present' : 'absent'}`}>
                      {presents[s.id] ? 'Présent' : 'Absent'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pres-modal-footer">
                <button className="pres-btn-cancel" onClick={() => setShowForm(false)}>Annuler</button>
                <button className="pres-btn-primary" onClick={handleSubmit} disabled={saving}>
                  {saving ? '⏳ Enregistrement...' : `✓ Enregistrer (${nbPresents}/${soldiers.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
