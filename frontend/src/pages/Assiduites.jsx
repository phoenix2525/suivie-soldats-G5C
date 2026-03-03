import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import '../styles/Assiduites.css';

const TYPE_ICONS = {
  activite_physique: '🏃',
  formation:         '📚',
  reunion:           '🗣️',
  ceremonie:         '🎖️',
  autre:             '📋',
};
const TYPE_LABELS = {
  activite_physique: 'Activité physique',
  formation:         'Formation',
  reunion:           'Réunion',
  ceremonie:         'Cérémonie',
  autre:             'Autre',
};
const PRESENCE_CONFIG = {
  present: { label: 'Présent',  color: '#34d399', bg: 'rgba(52,211,153,.15)',  icon: '✅' },
  absent:  { label: 'Absent',   color: '#ef4444', bg: 'rgba(239,68,68,.15)',   icon: '✗'  },
  retard:  { label: 'Retard',   color: '#f59e0b', bg: 'rgba(245,158,11,.15)',  icon: '⏰' },
  excuse:  { label: 'Excusé',   color: '#60a5fa', bg: 'rgba(96,165,250,.15)', icon: '📝' },
};

export default function Assiduites() {
  const [tab,        setTab]        = useState('tableau');
  const [seances,    setSeances]    = useState([]);
  const [tableau,    setTableau]    = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [pointage,   setPointage]   = useState(null); // seance en cours de pointage
  const [pointData,  setPointData]  = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [toast,      setToast]      = useState('');

  // Formulaire nouvelle séance
  const [form, setForm] = useState({
    titre: '', type_seance: 'activite_physique',
    date_seance: new Date().toISOString().slice(0, 10),
    heure_debut: '', heure_fin: '', lieu: '', description: '',
  });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    const [s, t, st] = await Promise.all([
      api.get('/assiduites/seances').catch(() => ({ data: { data: [] } })),
      api.get('/assiduites/tableau').catch(() => ({ data: { data: [] } })),
      api.get('/assiduites/stats').catch(() => ({ data: { data: null } })),
    ]);
    setSeances(s.data.data || []);
    setTableau(t.data.data || []);
    setStats(st.data.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreateSeance = async () => {
    if (!form.titre) return;
    setSaving(true);
    try {
      await api.post('/assiduites/seances', form);
      setShowForm(false);
      setForm({ titre:'', type_seance:'activite_physique', date_seance: new Date().toISOString().slice(0,10), heure_debut:'', heure_fin:'', lieu:'', description:'' });
      load();
      showToast('✅ Séance créée avec succès');
    } catch (e) { showToast('❌ Erreur lors de la création'); }
    setSaving(false);
  };

  const handleOpenPointage = async (seance) => {
    const res = await api.get(`/assiduites/seances/${seance.id}/pointage`).catch(() => null);
    if (res) { setPointData(res.data.data || []); setPointage(seance); }
  };

  const handlePresence = (cricId, val) => {
    setPointData(prev => prev.map(p => p.id === cricId ? { ...p, presence: val } : p));
  };

  const handleSavePointage = async () => {
    setSaving(true);
    try {
      await api.post(`/assiduites/seances/${pointage.id}/pointage`, {
        pointages: pointData.map(p => ({ cric_id: p.id, presence: p.presence, motif: p.motif }))
      });
      setPointage(null);
      load();
      showToast('✅ Pointage enregistré');
    } catch { showToast('❌ Erreur lors du pointage'); }
    setSaving(false);
  };

  const handleDeleteSeance = async (id) => {
    if (!confirm('Supprimer cette séance ?')) return;
    await api.delete(`/assiduites/seances/${id}`);
    load();
    showToast('Séance supprimée');
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  return (
    <div className="assid-page">

      {/* Header */}
      <div className="assid-header">
        <div>
          <div className="assid-eyebrow">SECTION RECRUTEMENT — G5C ARMÉE</div>
          <h1 className="assid-title">Suivi de l'Assiduité</h1>
          <div className="assid-subtitle">Pointage et suivi des présences des CRICs aux activités</div>
        </div>
        <button className="assid-btn-primary" onClick={() => setShowForm(true)}>
          + Nouvelle séance
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="assid-kpis">
          {[
            { val: stats.total_seances, label: 'Séances totales', color: '#C9A84C',  icon: '📅' },
            { val: stats.seances_auj,   label: 'Aujourd\'hui',    color: '#60a5fa', icon: '🔵' },
            { val: `${stats.taux_moyen}%`, label: 'Taux moyen',   color: stats.taux_moyen >= 70 ? '#34d399' : '#ef4444', icon: '📊' },
            { val: stats.nb_alertes,    label: 'Alertes < 70%',   color: '#ef4444', icon: '⚠️' },
          ].map((k, i) => (
            <div key={i} className="assid-kpi" style={{ borderColor: k.color + '44' }}>
              <div className="assid-kpi-icon">{k.icon}</div>
              <div className="assid-kpi-val" style={{ color: k.color }}>{k.val}</div>
              <div className="assid-kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="assid-tabs">
        {[['tableau', '📊 Tableau des CRICs'], ['seances', '📅 Séances']].map(([k, l]) => (
          <button key={k} className={`assid-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ═══ TAB TABLEAU ═══ */}
      {tab === 'tableau' && (
        <div className="assid-card">
          <div className="assid-card-title">📊 TAUX D'ASSIDUITÉ PAR CRIC</div>
          {loading ? <div className="assid-empty">Chargement…</div>
          : tableau.length === 0 ? <div className="assid-empty">Aucune donnée disponible</div>
          : (
            <div className="assid-tableau">
              {/* Alertes */}
              {tableau.filter(c => c.total_seances > 0 && c.taux_assiduite < 70).length > 0 && (
                <div className="assid-alert-section">
                  <div className="assid-alert-title">⚠️ CRICs en dessous de 70% d'assiduité</div>
                  {tableau.filter(c => c.total_seances > 0 && c.taux_assiduite < 70).map(c => (
                    <div key={c.id} className="assid-alert-row">
                      <div className="assid-ta-avatar">
                        {c.photo_url ? <img src={c.photo_url} alt="" /> : (c.prenom?.[0]||'')+(c.nom?.[0]||'')}
                      </div>
                      <div className="assid-ta-name">{c.prenom} {c.nom}</div>
                      <div className="assid-ta-taux" style={{ color: '#ef4444' }}>{c.taux_assiduite}%</div>
                      <div className="assid-ta-bar">
                        <div className="assid-ta-fill" style={{ width: c.taux_assiduite + '%', background: '#ef4444' }} />
                      </div>
                      <span style={{ fontSize: '.65rem', color: '#ef4444', fontWeight: 700 }}>
                        {c.absences} abs · {c.presences} prés
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tableau complet */}
              <div className="assid-table-wrap">
                <table className="assid-table">
                  <thead>
                    <tr>
                      <th>CRIC</th>
                      <th>STATUT</th>
                      <th>SÉANCES</th>
                      <th>PRÉSENTS</th>
                      <th>ABSENTS</th>
                      <th>RETARDS</th>
                      <th>EXCUSÉS</th>
                      <th>TAUX</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableau.map(c => {
                      const taux = parseInt(c.taux_assiduite);
                      const col = taux >= 80 ? '#34d399' : taux >= 70 ? '#f59e0b' : '#ef4444';
                      return (
                        <tr key={c.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div className="assid-ta-avatar">
                                {c.photo_url ? <img src={c.photo_url} alt="" /> : (c.prenom?.[0]||'')+(c.nom?.[0]||'')}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '.82rem' }}>{c.prenom} {c.nom}</div>
                              </div>
                            </div>
                          </td>
                          <td><span style={{ fontSize: '.65rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,.06)', color: 'var(--text-muted)' }}>{c.statut}</span></td>
                          <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{c.total_seances}</td>
                          <td style={{ textAlign: 'center', color: '#34d399', fontWeight: 700 }}>{c.presences}</td>
                          <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>{c.absences}</td>
                          <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{c.retards}</td>
                          <td style={{ textAlign: 'center', color: '#60a5fa', fontWeight: 700 }}>{c.excuses}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: taux + '%', background: col, borderRadius: 3, transition: 'width .5s' }} />
                              </div>
                              <span style={{ color: col, fontWeight: 700, fontSize: '.78rem', minWidth: 36 }}>{taux}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB SÉANCES ═══ */}
      {tab === 'seances' && (
        <div className="assid-card">
          <div className="assid-card-title">📅 LISTE DES SÉANCES</div>
          {loading ? <div className="assid-empty">Chargement…</div>
          : seances.length === 0 ? (
            <div className="assid-empty">
              <span style={{ fontSize: '2rem' }}>📅</span>
              <p>Aucune séance enregistrée</p>
              <button className="assid-btn-primary" onClick={() => setShowForm(true)}>Créer la première séance</button>
            </div>
          ) : (
            <div className="assid-seances-list">
              {seances.map(s => {
                const nbP = parseInt(s.nb_presents) || 0;
                const tot = parseInt(s.total_crics) || 1;
                const pct = Math.round(nbP * 100 / tot);
                return (
                  <div key={s.id} className="assid-seance-item">
                    <div className="assid-seance-icon" style={{ color: '#C9A84C' }}>
                      {TYPE_ICONS[s.type_seance] || '📋'}
                    </div>
                    <div className="assid-seance-info">
                      <div className="assid-seance-titre">{s.titre}</div>
                      <div className="assid-seance-meta">
                        <span>{fmt(s.date_seance)}</span>
                        {s.heure_debut && <span>· {s.heure_debut.slice(0,5)}{s.heure_fin ? ' → ' + s.heure_fin.slice(0,5) : ''}</span>}
                        {s.lieu && <span>· 📍 {s.lieu}</span>}
                        <span className="assid-seance-type-badge">{TYPE_LABELS[s.type_seance]}</span>
                      </div>
                      <div className="assid-seance-prog">
                        <div className="assid-seance-prog-bar">
                          <div style={{ width: pct + '%', background: pct >= 70 ? '#34d399' : '#ef4444' }} />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '.68rem' }}>
                          {nbP}/{tot} présents ({pct}%)
                        </span>
                      </div>
                    </div>
                    <div className="assid-seance-actions">
                      <button className="assid-btn-point" onClick={() => handleOpenPointage(s)}>
                        ✎ Pointer
                      </button>
                      <button className="assid-btn-del" onClick={() => handleDeleteSeance(s.id)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ MODAL NOUVELLE SÉANCE ═══ */}
      {showForm && (
        <div className="assid-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="assid-modal">
            <div className="assid-modal-header">
              📅 Nouvelle séance
              <button className="assid-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="assid-modal-body">
              <div className="assid-field">
                <label>Titre *</label>
                <input className="assid-input" placeholder="Ex: Entraînement physique — Semaine 3"
                  value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} />
              </div>
              <div className="assid-field">
                <label>Type de séance</label>
                <select className="assid-input" value={form.type_seance}
                  onChange={e => setForm(p => ({ ...p, type_seance: e.target.value }))}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{TYPE_ICONS[k]} {v}</option>)}
                </select>
              </div>
              <div className="assid-field-row">
                <div className="assid-field">
                  <label>Date</label>
                  <input type="date" className="assid-input" value={form.date_seance}
                    onChange={e => setForm(p => ({ ...p, date_seance: e.target.value }))} />
                </div>
                <div className="assid-field">
                  <label>Lieu</label>
                  <input className="assid-input" placeholder="Ex: Terrain principal"
                    value={form.lieu} onChange={e => setForm(p => ({ ...p, lieu: e.target.value }))} />
                </div>
              </div>
              <div className="assid-field-row">
                <div className="assid-field">
                  <label>Heure début</label>
                  <input type="time" className="assid-input" value={form.heure_debut}
                    onChange={e => setForm(p => ({ ...p, heure_debut: e.target.value }))} />
                </div>
                <div className="assid-field">
                  <label>Heure fin</label>
                  <input type="time" className="assid-input" value={form.heure_fin}
                    onChange={e => setForm(p => ({ ...p, heure_fin: e.target.value }))} />
                </div>
              </div>
              <div className="assid-field">
                <label>Description</label>
                <textarea className="assid-input" rows={2} placeholder="Détails de la séance…"
                  value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="assid-modal-footer">
                <button className="assid-btn-cancel" onClick={() => setShowForm(false)}>Annuler</button>
                <button className="assid-btn-confirm" onClick={handleCreateSeance} disabled={saving}>
                  {saving ? '⏳ Création…' : '✓ Créer la séance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL POINTAGE ═══ */}
      {pointage && (
        <div className="assid-overlay" onClick={e => e.target === e.currentTarget && setPointage(null)}>
          <div className="assid-modal assid-modal-lg">
            <div className="assid-modal-header">
              ✎ Pointage — {pointage.titre}
              <button className="assid-modal-close" onClick={() => setPointage(null)}>✕</button>
            </div>
            <div className="assid-modal-body">
              {/* Sélecteurs rapides */}
              <div className="assid-quick-btns">
                <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Tout marquer :</span>
                {Object.entries(PRESENCE_CONFIG).map(([k, v]) => (
                  <button key={k} className="assid-quick-btn" style={{ color: v.color, borderColor: v.color + '44' }}
                    onClick={() => setPointData(prev => prev.map(p => ({ ...p, presence: k })))}>
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>

              <div className="assid-pointage-list">
                {pointData.map(c => {
                  const cfg = PRESENCE_CONFIG[c.presence] || PRESENCE_CONFIG.absent;
                  return (
                    <div key={c.id} className="assid-pointage-row" style={{ borderColor: cfg.color + '33', background: cfg.bg }}>
                      <div className="assid-ta-avatar">
                        {c.photo_url ? <img src={c.photo_url} alt="" /> : (c.prenom?.[0]||'')+(c.nom?.[0]||'')}
                      </div>
                      <div className="assid-pointage-name">
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.prenom} {c.nom}</span>
                        {c.ufr && <span style={{ fontSize: '.63rem', color: 'var(--text-muted)' }}> · {c.annee_etude}</span>}
                      </div>
                      <div className="assid-pointage-btns">
                        {Object.entries(PRESENCE_CONFIG).map(([k, v]) => (
                          <button key={k}
                            className={`assid-pres-btn ${c.presence === k ? 'active' : ''}`}
                            style={c.presence === k ? { background: v.color, color: '#fff', borderColor: v.color } : { borderColor: v.color + '55', color: v.color }}
                            onClick={() => handlePresence(c.id, k)}>
                            {v.icon} {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="assid-modal-footer">
                <button className="assid-btn-cancel" onClick={() => setPointage(null)}>Annuler</button>
                <button className="assid-btn-confirm" onClick={handleSavePointage} disabled={saving}>
                  {saving ? '⏳ Enregistrement…' : `✓ Enregistrer le pointage (${pointData.filter(p=>p.presence==='present').length} présents)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="assid-toast">{toast}</div>}
    </div>
  );
}
