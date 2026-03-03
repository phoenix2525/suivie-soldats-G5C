import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import usePermissions from '../hooks/usePermissions';
import api from '../utils/api';
import '../styles/Mensurations.css';


const TAILLES = ['XS','S','M','L','XL','XXL','XXXL'];
const TAILLE_COLORS = { XS:'#60a5fa', S:'#34d399', M:'#a78bfa', L:'#fbbf24', XL:'#f97316', XXL:'#ef4444', XXXL:'#ec4899' };

// ── Formulaire mensuration ──────────────────────────────────────────────
const MensurationForm = ({ soldiers, onSave, onCancel }) => {
  const [form, setForm] = useState({
    soldier_id:'', date_mesure: new Date().toISOString().split('T')[0],
    taille_cm:'', poids_kg:'', tour_poitrine_cm:'', tour_taille_cm:'',
    tour_hanches_cm:'', longueur_bras_cm:'', longueur_jambe_cm:'',
    pointure:'', taille_standard:'', notes:'',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [search, setSearch] = useState('');

  const filtered = soldiers.filter(s =>
    `${s.prenom} ${s.nom} ${s.matricule}`.toLowerCase().includes(search.toLowerCase())
  );

  const set = (k,v) => setForm(f => ({...f, [k]:v}));

  // Calcul IMC auto
  const imc = form.taille_cm && form.poids_kg
    ? (form.poids_kg / Math.pow(form.taille_cm/100, 2)).toFixed(1)
    : null;
  const imcLabel = imc
    ? imc < 18.5 ? '🔵 Insuffisance pondérale'
    : imc < 25   ? '🟢 Poids normal'
    : imc < 30   ? '🟡 Surpoids'
    : '🔴 Obésité'
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.soldier_id) { setError('Sélectionnez un soldat'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, soldier_id: parseInt(form.soldier_id) };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      await onSave(payload);
    } catch(err) {
      setError(err.response?.data?.message || 'Erreur serveur');
      setSaving(false);
    }
  };

  const F = ({label, unit, children}) => (
    <div className="mens-field">
      <label className="sf-label">{label}{unit && <span className="mens-unit">{unit}</span>}</label>
      {children}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="mens-form" noValidate>
      {error && <div className="sanc-error">{error}</div>}

      <div className="sf-section">▸ Soldat</div>
      <input className="sf-input" placeholder="🔍 Rechercher un soldat..."
        value={search} onChange={e => setSearch(e.target.value)} style={{marginBottom:8}} />
      <div className="mens-soldier-list">
        {filtered.slice(0,8).map(s => (
          <div key={s.id}
            className={`sanc-soldier-row ${form.soldier_id==s.id?'selected':''}`}
            onClick={() => set('soldier_id', s.id)}>
            <div className="sanc-soldier-avatar">{s.prenom[0]}{s.nom[0]}</div>
            <div className="sanc-soldier-info">
              <span className="sanc-soldier-name">{s.prenom} {s.nom}</span>
              <span className="sanc-soldier-meta">{s.grade} · {s.matricule}</span>
            </div>
            {form.soldier_id==s.id && <span style={{color:'var(--gold-main)',fontWeight:800}}>✓</span>}
          </div>
        ))}
        {filtered.length===0 && <div className="sanc-no-result">Aucun soldat trouvé</div>}
      </div>

      <div className="sf-section">▸ Date & Taille uniforme</div>
      <div className="mens-row-2">
        <F label="Date de mesure">
          <input type="date" className="sf-input" value={form.date_mesure}
            onChange={e => set('date_mesure', e.target.value)} />
        </F>
        <F label="Taille standard (uniforme)">
          <div className="mens-taille-btns">
            {TAILLES.map(t => (
              <button type="button" key={t}
                className={`mens-taille-btn ${form.taille_standard===t?'active':''}`}
                style={form.taille_standard===t ? {background:TAILLE_COLORS[t]+'22', borderColor:TAILLE_COLORS[t], color:TAILLE_COLORS[t]} : {}}
                onClick={() => set('taille_standard', form.taille_standard===t?'':t)}>
                {t}
              </button>
            ))}
          </div>
        </F>
      </div>

      <div className="sf-section">▸ Mensurations corporelles</div>
      <div className="mens-row-3">
        <F label="Taille" unit="cm">
          <input type="number" className="sf-input" placeholder="Ex: 178"
            value={form.taille_cm} onChange={e => set('taille_cm', e.target.value)} />
        </F>
        <F label="Poids" unit="kg">
          <input type="number" className="sf-input" placeholder="Ex: 75"
            value={form.poids_kg} onChange={e => set('poids_kg', e.target.value)} />
        </F>
        <F label="Pointure">
          <input type="number" className="sf-input" placeholder="Ex: 43"
            value={form.pointure} onChange={e => set('pointure', e.target.value)} />
        </F>
      </div>

      {imc && (
        <div className="mens-imc-banner">
          IMC : <strong>{imc}</strong> — {imcLabel}
        </div>
      )}

      <div className="sf-section">▸ Tour de corps</div>
      <div className="mens-row-3">
        <F label="Tour de poitrine" unit="cm">
          <input type="number" className="sf-input" placeholder="Ex: 96"
            value={form.tour_poitrine_cm} onChange={e => set('tour_poitrine_cm', e.target.value)} />
        </F>
        <F label="Tour de taille" unit="cm">
          <input type="number" className="sf-input" placeholder="Ex: 82"
            value={form.tour_taille_cm} onChange={e => set('tour_taille_cm', e.target.value)} />
        </F>
        <F label="Tour de hanches" unit="cm">
          <input type="number" className="sf-input" placeholder="Ex: 98"
            value={form.tour_hanches_cm} onChange={e => set('tour_hanches_cm', e.target.value)} />
        </F>
      </div>

      <div className="sf-section">▸ Longueurs</div>
      <div className="mens-row-2">
        <F label="Longueur de bras" unit="cm">
          <input type="number" className="sf-input" placeholder="Ex: 62"
            value={form.longueur_bras_cm} onChange={e => set('longueur_bras_cm', e.target.value)} />
        </F>
        <F label="Longueur de jambe" unit="cm">
          <input type="number" className="sf-input" placeholder="Ex: 82"
            value={form.longueur_jambe_cm} onChange={e => set('longueur_jambe_cm', e.target.value)} />
        </F>
      </div>

      <div className="sf-field">
        <label className="sf-label">Notes</label>
        <textarea className="sf-input" rows={2}
          placeholder="Remarques particulières..."
          value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>

      <div className="sf-actions">
        <button type="button" className="sf-btn-cancel" onClick={onCancel}>Annuler</button>
        <button type="submit" className="sf-btn-save" disabled={saving}>
          {saving ? '⏳ Enregistrement...' : '✓ Enregistrer les mensurations'}
        </button>
      </div>
    </form>
  );
};

// ── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────
export default function Mensurations() {
  const location = useLocation();
  const perms = usePermissions(JSON.parse(localStorage.getItem('user')||'{}'), location.pathname);
  const [data,       setData]       = useState([]);
  const [statsTailles, setStatsTailles] = useState([]);
  const [manquants,  setManquants]  = useState([]);
  const [soldiers,   setSoldiers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [activeTab,  setActiveTab]  = useState('tableau');
  const [filterTaille, setFilterTaille] = useState('');
  const [search,     setSearch]     = useState('');

  const load = useCallback(async () => {
    try {
      const [mensRes, manqRes, solRes] = await Promise.all([
        api.get('/mensurations').catch(() => ({ data: { data: [], stats_tailles: [] } })),
        api.get('/mensurations/manquants').catch(() => ({ data: { data: [] } })),
        api.get('/soldiers').catch(() => ({ data: { data: [] } })),
      ]);
      setData(mensRes.data.data || []);
      setStatsTailles(mensRes.data.stats_tailles || []);
      setManquants(manqRes.data.data || []);
      setSoldiers((solRes.data.data || []).filter(s => s.statut === 'actif'));
    } catch(e) { console.error('Erreur chargement mensurations:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async (payload) => {
    await api.post('/mensurations', payload);
    setShowForm(false);
    load();
  }, [load]);

  const filtered = data.filter(s => {
    if (filterTaille && s.taille_standard !== filterTaille) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${s.nom} ${s.prenom} ${s.matricule}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalAvec = data.length;
  const totalSans = manquants.length;
  const totalSoldiers = totalAvec + totalSans;
  const tauxCouverture = totalSoldiers > 0 ? Math.round((totalAvec/totalSoldiers)*100) : 0;

  return (
    <div className="mens-page">

      {/* HEADER */}
      <div className="sanc-header">
        <div>
          <h1 className="mens-title">Mensurations</h1>
          <p className="sanc-sub">Confection des uniformes & suivi corporel</p>
        </div>
        {perms.canWrite && <button className="sol-btn-primary" onClick={() => setShowForm(true)}>
          + Enregistrer des mensurations
        </button>}
      </div>

      {/* COUVERTURE */}
      <div className="mens-coverage-card">
        <div className="mens-cov-left">
          <div className="mens-cov-title">Couverture des mensurations</div>
          <div className="mens-cov-bar-wrap">
            <div className="mens-cov-bar">
              <div className="mens-cov-fill" style={{width: tauxCouverture+'%'}} />
            </div>
            <span className="mens-cov-pct">{tauxCouverture}%</span>
          </div>
          <div className="mens-cov-detail">
            <span className="mens-cov-ok">✓ {totalAvec} mesuré{totalAvec>1?'s':''}</span>
            <span className="mens-cov-nok">✗ {totalSans} sans mensuration</span>
          </div>
        </div>
        <div className="mens-taille-distrib">
          {TAILLES.map(t => {
            const stat = statsTailles.find(s => s.taille_standard === t);
            const nb = stat ? parseInt(stat.nombre) : 0;
            const pct = totalAvec > 0 ? Math.round((nb/totalAvec)*100) : 0;
            return (
              <div key={t} className="mens-dist-item">
                <div className="mens-dist-bar-wrap">
                  <div className="mens-dist-bar">
                    <div className="mens-dist-fill"
                      style={{height: pct+'%', background: TAILLE_COLORS[t]}} />
                  </div>
                </div>
                <div className="mens-dist-label" style={{color: nb>0?TAILLE_COLORS[t]:'var(--text-muted)'}}>{t}</div>
                <div className="mens-dist-nb">{nb}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ONGLETS */}
      <div className="pres-tabs">
        <button className={`pres-tab ${activeTab==='tableau'?'active':''}`}
          onClick={() => setActiveTab('tableau')}>📋 Tableau des mensurations</button>
        <button className={`pres-tab ${activeTab==='manquants'?'active':''}`}
          onClick={() => setActiveTab('manquants')}>
          ⚠ Sans mensurations {totalSans>0 && <span className="mens-badge-count">{totalSans}</span>}
        </button>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="sol-overlay" onClick={e => e.target===e.currentTarget&&setShowForm(false)}>
          <div className="sol-modal" style={{maxWidth:740}}>
            <div className="sol-modal-header">
              📏 Enregistrer des mensurations
              <button className="sol-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="sol-modal-body">
              <MensurationForm soldiers={soldiers} onSave={handleSave} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}

      {/* TABLEAU */}
      {activeTab === 'tableau' && (
        <>
          <div className="sol-toolbar">
            <div className="sol-search-wrap">
              <span className="sol-search-icon">⌕</span>
              <input className="sol-search" placeholder="Rechercher par nom, matricule..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="sol-select" value={filterTaille} onChange={e => setFilterTaille(e.target.value)}>
              <option value="">Toutes les tailles</option>
              {TAILLES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="sol-loading">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="sol-empty">
              <div className="sol-empty-icon">📏</div>
              <p>{data.length===0?'Aucune mensuration enregistrée':'Aucun résultat'}</p>
              <button className="sol-btn-primary" onClick={() => setShowForm(true)}>
                Enregistrer les premières mensurations
              </button>
            </div>
          ) : (
            <div className="sol-table-wrap">
              <table className="sol-table">
                <thead><tr>
                  <th>Soldat</th><th>Grade · Promo</th>
                  <th>Taille</th><th>Poids</th><th>IMC</th>
                  <th>Poitrine</th><th>Taille (tour)</th><th>Hanches</th>
                  <th>Bras</th><th>Jambe</th><th>Pointure</th>
                  <th>Uniforme</th><th>Date mesure</th>
                </tr></thead>
                <tbody>
                  {filtered.map((s,i) => {
                    const imc = s.taille_cm && s.poids_kg
                      ? (s.poids_kg / Math.pow(s.taille_cm/100,2)).toFixed(1) : null;
                    const imcColor = imc
                      ? imc < 18.5 ? '#60a5fa' : imc < 25 ? '#34d399' : imc < 30 ? '#fbbf24' : '#ef4444'
                      : null;
                    const tc = TAILLE_COLORS[s.taille_standard];
                    return (
                      <tr key={i}>
                        <td><strong>{s.prenom} {s.nom}</strong><div style={{fontSize:'.7rem',color:'var(--text-muted)'}}>{s.matricule}</div></td>
                        <td style={{fontSize:'.78rem'}}>{s.grade}<br/><span style={{color:'var(--text-muted)'}}>Promo {s.promotion}</span></td>
                        <td>{s.taille_cm ? `${s.taille_cm} cm` : '—'}</td>
                        <td>{s.poids_kg ? `${s.poids_kg} kg` : '—'}</td>
                        <td>{imc ? <span style={{color:imcColor,fontWeight:700}}>{imc}</span> : '—'}</td>
                        <td>{s.tour_poitrine_cm ? `${s.tour_poitrine_cm}` : '—'}</td>
                        <td>{s.tour_taille_cm ? `${s.tour_taille_cm}` : '—'}</td>
                        <td>{s.tour_hanches_cm ? `${s.tour_hanches_cm}` : '—'}</td>
                        <td>{s.longueur_bras_cm ? `${s.longueur_bras_cm}` : '—'}</td>
                        <td>{s.longueur_jambe_cm ? `${s.longueur_jambe_cm}` : '—'}</td>
                        <td>{s.pointure || '—'}</td>
                        <td>{s.taille_standard
                          ? <span className="mens-taille-pill" style={{background:tc+'22',color:tc,borderColor:tc+'44'}}>{s.taille_standard}</span>
                          : '—'}</td>
                        <td style={{fontSize:'.75rem',color:'var(--text-muted)'}}>
                          {s.date_mesure ? new Date(s.date_mesure).toLocaleDateString('fr-FR') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* MANQUANTS */}
      {activeTab === 'manquants' && (
        <div className="mens-manquants">
          {manquants.length === 0 ? (
            <div className="sol-empty">
              <div className="sol-empty-icon">✅</div>
              <p>Tous les soldats ont leurs mensurations !</p>
            </div>
          ) : (
            <>
              <div className="mens-manq-info">
                {manquants.length} soldat{manquants.length>1?'s':''} sans mensurations enregistrées
              </div>
              <div className="mens-manq-list">
                {manquants.map(s => (
                  <div key={s.id} className="mens-manq-row">
                    <div className="sanc-soldier-avatar">{s.prenom[0]}{s.nom[0]}</div>
                    <div className="sanc-soldier-info">
                      <span className="sanc-soldier-name">{s.prenom} {s.nom}</span>
                      <span className="sanc-soldier-meta">{s.grade} · {s.matricule} · Promo {s.promotion}</span>
                    </div>
                    {perms.canWrite && <button className="mens-manq-btn"
                      onClick={() => { setShowForm(true); }}>
                      + Mesurer
                    </button>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
