import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import api from '../utils/api';
import '../styles/Sanctions.css';


const TYPES_SANCTION = [
  'Avertissement verbal',
  'Avertissement écrit',
  'Blâme',
  'Corvée supplémentaire',
  'Consigne',
  'Mise à pied',
  'Exclusion temporaire',
];

const SEVERITE_CONFIG = {
  mineure:  { label: 'Mineure',  color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  icon: '⚠' },
  moyenne:  { label: 'Moyenne',  color: '#f97316', bg: 'rgba(249,115,22,.12)',  icon: '🔶' },
  grave:    { label: 'Grave',    color: '#ef4444', bg: 'rgba(239,68,68,.12)',   icon: '🔴' },
};

const SeveriteBadge = ({ s }) => {
  const c = SEVERITE_CONFIG[s] || SEVERITE_CONFIG.mineure;
  return (
    <span className="sanc-badge" style={{ background: c.bg, color: c.color, borderColor: c.color + '44' }}>
      {c.icon} {c.label}
    </span>
  );
};

// ── Formulaire ajout sanction ────────────────────────────────────────────
const SanctionForm = ({ soldiers, onSave, onCancel }) => {
  const [form, setForm] = useState({
    soldier_id: '', date_sanction: new Date().toISOString().split('T')[0],
    type_sanction: 'Avertissement verbal', motif: '', severite: 'mineure',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [search, setSearch] = useState('');

  const filtered = soldiers.filter(s =>
    `${s.prenom} ${s.nom} ${s.matricule}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.soldier_id) { setError('Sélectionnez un soldat'); return; }
    if (!form.motif.trim()) { setError('Le motif est obligatoire'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ ...form, soldier_id: parseInt(form.soldier_id) });
    } catch(err) {
      setError(err.response?.data?.message || 'Erreur serveur');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sanc-form" noValidate>
      {error && <div className="sanc-error">{error}</div>}

      <div className="sanc-section">▸ Soldat concerné</div>
      <input className="sanc-input" placeholder="🔍 Rechercher un soldat..."
        value={search} onChange={e => setSearch(e.target.value)} style={{marginBottom:8}} />
      <div className="sanc-soldier-list">
        {filtered.slice(0,8).map(s => (
          <div key={s.id}
            className={`sanc-soldier-row ${form.soldier_id==s.id?'selected':''}`}
            onClick={() => setForm(f => ({...f, soldier_id: s.id}))}>
            <div className="sanc-soldier-avatar">
              {s.prenom[0]}{s.nom[0]}
            </div>
            <div className="sanc-soldier-info">
              <span className="sanc-soldier-name">{s.prenom} {s.nom}</span>
              <span className="sanc-soldier-meta">{s.grade} · {s.matricule}</span>
            </div>
            {form.soldier_id == s.id && <span className="sanc-selected-check">✓</span>}
          </div>
        ))}
        {filtered.length === 0 && <div className="sanc-no-result">Aucun soldat trouvé</div>}
      </div>

      <div className="sanc-section">▸ Détails de la sanction</div>
      <div className="sanc-row">
        <div className="sf-field">
          <label className="sf-label">Date</label>
          <input type="date" className="sf-input"
            value={form.date_sanction}
            onChange={e => setForm(f => ({...f, date_sanction: e.target.value}))} />
        </div>
        <div className="sf-field">
          <label className="sf-label">Sévérité</label>
          <div className="sanc-sev-btns">
            {Object.entries(SEVERITE_CONFIG).map(([k, v]) => (
              <button type="button" key={k}
                className={`sanc-sev-btn ${form.severite===k?'active':''}`}
                style={form.severite===k ? {background:v.bg, borderColor:v.color, color:v.color} : {}}
                onClick={() => setForm(f => ({...f, severite: k}))}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sf-field">
        <label className="sf-label">Type de sanction</label>
        <select className="sf-input" value={form.type_sanction}
          onChange={e => setForm(f => ({...f, type_sanction: e.target.value}))}>
          {TYPES_SANCTION.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className="sf-field">
        <label className="sf-label">Motif *</label>
        <textarea className="sf-input sanc-textarea"
          placeholder="Décrivez le motif de la sanction..."
          rows={3} value={form.motif}
          onChange={e => setForm(f => ({...f, motif: e.target.value}))} />
      </div>

      <div className="sf-actions">
        <button type="button" className="sf-btn-cancel" onClick={onCancel}>Annuler</button>
        <button type="submit" className="sf-btn-save" disabled={saving}
          style={{ background: SEVERITE_CONFIG[form.severite].color }}>
          {saving ? '⏳ Enregistrement...' : '✓ Infliger la sanction'}
        </button>
      </div>
    </form>
  );
};

// ── COMPOSANT PRINCIPAL ──────────────────────────────────────────────────
export default function Sanctions() {
  const location = useLocation();
  const perms = usePermissions(JSON.parse(localStorage.getItem('user')||'{}'), location.pathname);
  const [sanctions,  setSanctions]  = useState([]);
  const [soldiers,   setSoldiers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [filterSev,  setFilterSev]  = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [search,     setSearch]     = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const load = useCallback(async () => {
    try {
      const [sancRes, solRes] = await Promise.all([
        api.get('/sanctions'),
        api.get('/soldiers'),
      ]);
      setSanctions(sancRes.data.data || []);
      setSoldiers((solRes.data.data || []).filter(s => s.statut === 'actif'));
    } catch(e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async (payload) => {
    await api.post('/sanctions', payload);
    setShowForm(false);
    load();
  }, [load]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Supprimer cette sanction ?')) return;
    await api.delete(`/sanctions/${id}`);
    load();
  }, [load]);

  // Filtres
  const filtered = sanctions.filter(s => {
    if (filterSev && s.severite !== filterSev) return false;
    if (filterDate && s.date_sanction?.slice(0,10) !== filterDate) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${s.nom} ${s.prenom} ${s.matricule} ${s.motif}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total:   sanctions.length,
    graves:  sanctions.filter(s => s.severite === 'grave').length,
    moyennes:sanctions.filter(s => s.severite === 'moyenne').length,
    mineures:sanctions.filter(s => s.severite === 'mineure').length,
  };

  // Soldats les plus sanctionnés
  const topSanctionnes = Object.entries(
    sanctions.reduce((acc, s) => {
      const key = s.soldier_id;
      if (!acc[key]) acc[key] = { nom: s.nom, prenom: s.prenom, grade: s.grade, matricule: s.matricule, count: 0, graves: 0 };
      acc[key].count++;
      if (s.severite === 'grave') acc[key].graves++;
      return acc;
    }, {})
  ).sort((a,b) => b[1].count - a[1].count).slice(0, 5);

  return (
    <div className="sanc-page">

      {/* HEADER */}
      <div className="sanc-header">
        <div>
          <h1 className="sanc-title">Sanctions</h1>
          <p className="sanc-sub">Registre disciplinaire</p>
        </div>
        {perms.canWrite && <button className="sanc-btn-primary" onClick={() => setShowForm(true)}>
          + Infliger une sanction
        </button>}
      </div>

      {/* STATS */}
      <div className="sanc-stats-row">
        {[
          { label: 'Total', val: stats.total, color: '#94a3b8' },
          { label: 'Graves', val: stats.graves, color: '#ef4444' },
          { label: 'Moyennes', val: stats.moyennes, color: '#f97316' },
          { label: 'Mineures', val: stats.mineures, color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="sanc-stat-card" style={{ borderColor: s.color + '33' }}>
            <div className="sanc-stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="sanc-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* TOP SANCTIONNÉS */}
      {topSanctionnes.length > 0 && (
        <div className="sanc-top-wrap">
          <div className="sanc-top-title">⚠ Soldats les plus sanctionnés</div>
          <div className="sanc-top-list">
            {topSanctionnes.map(([id, s]) => (
              <div key={id} className="sanc-top-row">
                <div className="sanc-top-info">
                  <span className="sanc-top-name">{s.prenom} {s.nom}</span>
                  <span className="sanc-top-meta">{s.grade} · {s.matricule}</span>
                </div>
                <div className="sanc-top-counts">
                  <span className="sanc-count-total">{s.count} sanction{s.count>1?'s':''}</span>
                  {s.graves > 0 && <span className="sanc-count-grave">{s.graves} grave{s.graves>1?'s':''}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTRES */}
      <div className="sanc-toolbar">
        <div className="sol-search-wrap">
          <span className="sol-search-icon">⌕</span>
          <input className="sol-search" placeholder="Rechercher par nom, motif..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="sol-select" value={filterSev} onChange={e => setFilterSev(e.target.value)}>
          <option value="">Toutes sévérités</option>
          <option value="mineure">⚠ Mineure</option>
          <option value="moyenne">🔶 Moyenne</option>
          <option value="grave">🔴 Grave</option>
        </select>
        <input type="date" className="sol-select" value={filterDate}
          onChange={e => setFilterDate(e.target.value)} style={{minWidth:160}} />
        {(filterSev||filterDate||search) && (
          <button className="sanc-clear-btn"
            onClick={() => {setFilterSev('');setFilterDate('');setSearch('');}}>
            ✕ Effacer filtres
          </button>
        )}
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="sol-overlay" onClick={e => e.target===e.currentTarget&&setShowForm(false)}>
          <div className="sol-modal">
            <div className="sol-modal-header">
              ⚠ Infliger une sanction
              <button className="sol-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="sol-modal-body">
              <SanctionForm soldiers={soldiers} onSave={handleSave} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}

      {/* LISTE */}
      {loading ? (
        <div className="sol-loading">Chargement des sanctions...</div>
      ) : filtered.length === 0 ? (
        <div className="sol-empty">
          <div className="sol-empty-icon">⚠</div>
          <p>{sanctions.length === 0 ? 'Aucune sanction enregistrée' : 'Aucun résultat'}</p>
        </div>
      ) : (
        <div className="sanc-list">
          {filtered.map(s => (
            <div key={s.id} className={`sanc-card sanc-${s.severite}`}>
              <div className="sanc-card-left">
                <div className="sanc-card-sev-bar" style={{ background: SEVERITE_CONFIG[s.severite]?.color }} />
                <div className="sanc-card-body">
                  <div className="sanc-card-top">
                    <div className="sanc-card-soldier">
                      <span className="sanc-card-name">{s.prenom} {s.nom}</span>
                      <span className="sanc-card-meta">{s.grade} · {s.matricule}</span>
                    </div>
                    <div className="sanc-card-mid">
                      <SeveriteBadge s={s.severite} />
                      <span className="sanc-card-type">{s.type_sanction}</span>
                    </div>
                    <div className="sanc-card-date">
                      {new Date(s.date_sanction).toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'numeric'})}
                    </div>
                  </div>
                  <div className="sanc-card-motif">💬 {s.motif}</div>
                  {s.enregistre_par_nom && (
                    <div className="sanc-card-by">Enregistré par {s.enregistre_par_nom}</div>
                  )}
                </div>
              </div>
              {perms.canDelete && <button className="sanc-delete-btn" title="Supprimer"
                onClick={() => handleDelete(s.id)}>✕</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
