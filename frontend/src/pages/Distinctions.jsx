import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import api from '../utils/api';
import '../styles/Distinctions.css';


const TYPES = [
  'Soldat du mois','Mention d\'honneur','Médaille de mérite','Citation à l\'ordre',
  'Prix de discipline','Prix d\'excellence académique','Prix sportif','Autre'
];


// ── Sélecteur de soldat élégant ─────────────────────────────────────────
const SoldierPicker = ({ soldiers, value, onChange }) => {
  const [open,   setOpen]   = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef();

  React.useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = soldiers.filter(s =>
    `${s.prenom} ${s.nom} ${s.matricule}`.toLowerCase().includes(search.toLowerCase())
  );
  const selected = soldiers.find(s => s.id == value);

  return (
    <div className="spk-wrap" ref={ref}>
      <div className={`spk-trigger ${open?'open':''} ${value?'has-value':''}`} onClick={() => setOpen(o => !o)}>
        {selected ? (
          <div className="spk-selected">
            <div className="spk-avatar">{selected.photo_url
              ? <img src={selected.photo_url} alt="" />
              : <span>{selected.prenom[0]}{selected.nom[0]}</span>}
            </div>
            <div className="spk-info">
              <span className="spk-name">{selected.prenom} {selected.nom}</span>
              <span className="spk-meta">{selected.grade} · {selected.matricule}</span>
            </div>
            <button className="spk-clear" onClick={e => { e.stopPropagation(); onChange(''); setSearch(''); }}>✕</button>
          </div>
        ) : (
          <span className="spk-placeholder">— Sélectionner un soldat —</span>
        )}
        <span className="spk-arrow">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="spk-dropdown">
          <div className="spk-search-wrap">
            <span className="spk-search-icon">⌕</span>
            <input className="spk-search" placeholder="Rechercher…" autoFocus
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="spk-list">
            {filtered.length === 0 && <div className="spk-empty">Aucun résultat</div>}
            {filtered.map(s => (
              <div key={s.id} className={`spk-item ${s.id == value ? 'active' : ''}`}
                onClick={() => { onChange(s.id); setOpen(false); setSearch(''); }}>
                <div className="spk-avatar">
                  {s.photo_url
                    ? <img src={s.photo_url} alt="" />
                    : <span>{s.prenom[0]}{s.nom[0]}</span>}
                </div>
                <div className="spk-info">
                  <span className="spk-name">{s.prenom} {s.nom}</span>
                  <span className="spk-meta">{s.grade} · {s.matricule}</span>
                </div>
                {s.id == value && <span className="spk-check">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Distinctions() {
  const location = useLocation();
  const perms = usePermissions(JSON.parse(localStorage.getItem('user')||'{}'), location.pathname);
  const [distinctions, setDistinctions] = useState([]);
  const [classement, setClassement]     = useState([]);
  const [soldiers, setSoldiers]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [activeTab, setActiveTab]       = useState('classement');
  const [search, setSearch]             = useState('');
  const [form, setForm] = useState({
    soldier_id: '', type_distinction: 'Soldat du mois',
    intitule: '', motif: '', date_distinction: new Date().toISOString().split('T')[0]
  });

  const load = useCallback(async () => {
    try {
      const [distRes, clasRes, solRes] = await Promise.all([
        api.get('/distinctions'),
        api.get('/distinctions/classement'),
        api.get('/soldiers'),
      ]);
      setDistinctions(distRes.data.data || []);
      setClassement(clasRes.data.data || []);
      setSoldiers((solRes.data.data || []).filter(s => s.statut === 'actif'));
    } catch(e) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    if (!form.soldier_id || !form.type_distinction || !form.intitule || !form.motif) return alert('Remplissez tous les champs obligatoires (soldat, type, intitulé, motif)');
    setSaving(true);
    try {
      await api.post('/distinctions', form);
      setShowForm(false);
      setForm({ soldier_id:'', type_distinction:'Soldat du mois', intitule:'', motif:'', date_distinction: new Date().toISOString().split('T')[0] });
      load();
    } catch(e) { alert('Erreur : ' + (e.response?.data?.error || e.message)); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette distinction ?')) return;
    try { await api.delete(`/distinctions/${id}`); load(); } catch(e) {}
  };

  const filtered = distinctions.filter(d =>
    !search || `${d.nom} ${d.prenom} ${d.type_distinction}`.toLowerCase().includes(search.toLowerCase())
  );

  const MEDAL_COLORS = ['#FFD700','#C0C0C0','#CD7F32','#C9A84C','#C9A84C',
                        '#C9A84C','#C9A84C','#C9A84C','#C9A84C','#C9A84C'];

  return (
    <div className="dist-page">
      <div className="dist-header">
        <div>
          <h1 className="dist-title">Distinctions</h1>
          <p className="dist-sub">Honneurs et récompenses</p>
        </div>
        {perms.canWrite && <button className="dist-btn-primary" onClick={() => setShowForm(true)}>
          + Accorder une distinction
        </button>}
      </div>

      {/* Stats rapides */}
      <div className="dist-stats">
        {[
          { label: 'Total distinctions', val: distinctions.length, color: '#C9A84C' },
          { label: 'Soldats décorés', val: classement.length, color: '#60a5fa' },
          { label: 'Ce mois', val: distinctions.filter(d => d.date_distinction?.startsWith(new Date().toISOString().slice(0,7))).length, color: '#34d399' },
          { label: 'Types différents', val: new Set(distinctions.map(d=>d.type_distinction)).size, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} className="dist-stat-card" style={{ borderColor: s.color+'44' }}>
            <div className="dist-stat-val" style={{ color: s.color }}>{s.val}</div>
            <div className="dist-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="dist-tabs">
        {[['classement','🏆 Classement'],['liste','🎖️ Toutes les distinctions']].map(([k,l]) => (
          <button key={k} className={`dist-tab ${activeTab===k?'active':''}`} onClick={() => setActiveTab(k)}>{l}</button>
        ))}
      </div>

      {/* ═══ CLASSEMENT ═══ */}
      {activeTab === 'classement' && (
        <div className="dist-classement">
          {classement.length === 0 ? (
            <div className="dist-empty"><div className="dist-empty-icon">🎖️</div><p>Aucune distinction enregistrée</p></div>
          ) : (
            <>
              {/* Podium top 3 */}
              {classement.length >= 3 && (
                <div className="dist-podium">
                  {[1,0,2].map(i => {
                    const s = classement[i];
                    if (!s) return null;
                    const pos = i+1 === 2 ? 1 : i+1 === 1 ? 2 : 3;
                    const heights = { 1: 140, 2: 110, 3: 90 };
                    return (
                      <div key={s.matricule} className={`dist-podium-item rank-${i===0?1:i===1?2:3}`}>
                        <div className="dist-podium-avatar" style={{ borderColor: MEDAL_COLORS[pos-1] }}>
                          {s.prenom?.[0]}{s.nom?.[0]}
                        </div>
                        <div className="dist-podium-name">{s.prenom} {s.nom}</div>
                        <div className="dist-podium-count" style={{ color: MEDAL_COLORS[pos-1] }}>
                          {s.nb_distinctions} distinction{s.nb_distinctions>1?'s':''}
                        </div>
                        <div className="dist-podium-block" style={{ height: heights[pos===1?1:pos===2?2:3], background: MEDAL_COLORS[pos-1]+'33', borderTop: `3px solid ${MEDAL_COLORS[pos-1]}` }}>
                          <span style={{ color: MEDAL_COLORS[pos-1], fontSize:'1.5rem' }}>
                            {pos===1?'🥇':pos===2?'🥈':'🥉'}
                          </span>
                          <span style={{ color: MEDAL_COLORS[pos-1], fontWeight:800 }}>#{pos}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reste du classement */}
              <div className="dist-rank-list">
                {classement.map((s, i) => (
                  <div key={s.matricule} className="dist-rank-row">
                    <div className="dist-rank-num" style={{ color: i < 3 ? MEDAL_COLORS[i] : 'var(--text-muted)' }}>
                      {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                    </div>
                    <div className="dist-rank-avatar" style={{ borderColor: i < 3 ? MEDAL_COLORS[i] : 'var(--border-color)' }}>
                      {s.prenom?.[0]}{s.nom?.[0]}
                    </div>
                    <div className="dist-rank-info">
                      <span className="dist-rank-name">{s.prenom} {s.nom}</span>
                      <span className="dist-rank-meta">{s.grade} · {s.matricule}</span>
                    </div>
                    <div className="dist-rank-badges">
                      {s.types && s.types.slice(0,3).map((t,j) => (
                        <span key={j} className="dist-type-badge">{t}</span>
                      ))}
                    </div>
                    <div className="dist-rank-count" style={{ color: i < 3 ? MEDAL_COLORS[i] : 'var(--gold-main)' }}>
                      {s.nb_distinctions}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ LISTE ═══ */}
      {activeTab === 'liste' && (
        <div className="dist-liste">
          <div className="dist-search-wrap">
            <span className="dist-search-icon">⌕</span>
            <input className="dist-search" placeholder="Rechercher par nom, type..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="dist-grid">
            {filtered.length === 0 ? (
              <div className="dist-empty"><div className="dist-empty-icon">🎖️</div><p>Aucune distinction trouvée</p></div>
            ) : filtered.map(d => (
              <div key={d.id} className="dist-card">
                <div className="dist-card-top">
                  <div className="dist-medal-icon">🎖️</div>
                  <div className="dist-card-info">
                    <div className="dist-card-type">{d.type_distinction}</div>
                    <div className="dist-card-name">{d.prenom} {d.nom}</div>
                    <div className="dist-card-meta">{d.grade} · {d.matricule}</div>
                  </div>
                  {perms.canDelete && <button className="dist-del-btn" onClick={() => handleDelete(d.id)} title="Supprimer">✕</button>}
                </div>
                {d.intitule && <div className="dist-card-desc">{d.intitule}</div>}
                {d.motif && <div className="dist-card-desc" style={{fontStyle:'italic'}}>"{d.motif}"</div>}
                <div className="dist-card-footer">
                  <span className="dist-card-date">📅 {new Date(d.date_distinction).toLocaleDateString('fr-FR')}</span>
                  {d.accordee_par_nom && <span className="dist-card-by">par {d.accordee_par_nom}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ MODAL ═══ */}
      {showForm && (
        <div className="dist-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="dist-modal">
            <div className="dist-modal-header">
              <span>🎖️ Accorder une distinction</span>
              <button className="dist-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="dist-modal-body">
              <div className="dist-form-group">
                <label>Soldat *</label>
                <SoldierPicker
                  soldiers={soldiers}
                  value={form.soldier_id}
                  onChange={id => setForm(f => ({...f, soldier_id: id}))}
                />
              </div>
              <div className="dist-form-row">
                <div className="dist-form-group">
                  <label>Type de distinction *</label>
                  <select className="dist-input" value={form.type_distinction}
                    onChange={e => setForm(f => ({...f, type_distinction: e.target.value}))}>
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="dist-form-group">
                  <label>Date *</label>
                  <input type="date" className="dist-input" value={form.date_distinction}
                    onChange={e => setForm(f => ({...f, date_distinction: e.target.value}))} />
                </div>
              </div>
              <div className="dist-form-group">
                <label>Intitulé *</label>
                <input className="dist-input"
                  placeholder="Ex: Médaille d'honneur pour excellence académique"
                  value={form.intitule}
                  onChange={e => setForm(f => ({...f, intitule: e.target.value}))} />
              </div>
              <div className="dist-form-group">
                <label>Motif *</label>
                <textarea className="dist-input dist-textarea"
                  placeholder="Ex: Pour son excellence académique et son engagement exemplaire..."
                  value={form.motif}
                  onChange={e => setForm(f => ({...f, motif: e.target.value}))} />
              </div>
              <div className="dist-modal-footer">
                <button className="dist-btn-cancel" onClick={() => setShowForm(false)}>Annuler</button>
                <button className="dist-btn-primary" onClick={handleSubmit} disabled={saving}>
                  {saving ? '⏳ Enregistrement...' : '🎖️ Accorder la distinction'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

