import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import '../styles/DRH.css';

/* ── SoldierPicker élégant avec recherche ────────── */
const SoldierPicker = ({ soldiers, value, onChange }) => {
  const [open,   setOpen]   = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef();

  React.useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = soldiers
    .filter(s => `${s.prenom} ${s.nom} ${s.matricule} ${s.grade||''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`));

  const selected = soldiers.find(s => s.id == value);

  return (
    <div style={{ position:'relative' }} ref={ref}>
      {/* Trigger */}
      <div onClick={() => setOpen(o => !o)} style={{
        background: 'rgba(255,255,255,.04)', border: `1px solid ${open ? 'rgba(201,168,76,.4)' : 'rgba(255,255,255,.09)'}`,
        borderRadius: 10, padding: selected ? '10px 14px' : '12px 14px',
        cursor: 'pointer', transition: 'all .2s', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 10,
        boxShadow: open ? '0 0 0 3px rgba(201,168,76,.08)' : 'none',
      }}>
        {selected ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
            <div style={{
              width:34, height:34, borderRadius:'50%', flexShrink:0, overflow:'hidden',
              background:'rgba(201,168,76,.1)', border:'1px solid rgba(201,168,76,.25)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'.65rem', fontWeight:700, color:'var(--gold-bright)'
            }}>
              {selected.photo_url?.startsWith('data:')
                ? <img src={selected.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <span>{selected.prenom?.[0]}{selected.nom?.[0]}</span>
              }
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:600, color:'var(--text-primary)', fontSize:'.78rem',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {selected.prenom} {selected.nom}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                <span style={{
                  fontSize:'.6rem', padding:'1px 7px', borderRadius:4, fontWeight:700,
                  color: gradeColor(selected.grade),
                  background: gradeColor(selected.grade) + '18',
                  border: '1px solid ' + gradeColor(selected.grade) + '35',
                }}>{selected.grade || '—'}</span>
                <span style={{ fontSize:'.6rem', color:'var(--text-muted)' }}>{selected.matricule}</span>
              </div>
            </div>
          </div>
        ) : (
          <span style={{ fontSize:'.78rem', color:'var(--text-muted)', letterSpacing:'.05em' }}>
            — Sélectionner un soldat —
          </span>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {selected && (
            <span onClick={e => { e.stopPropagation(); onChange(''); setSearch(''); }}
              style={{ color:'var(--text-muted)', fontSize:'.75rem', lineHeight:1,
                width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center',
                borderRadius:4, transition:'all .15s', cursor:'pointer',
                ':hover':{ background:'rgba(255,255,255,.08)' }
              }}>✕</span>
          )}
          <span style={{ color:'var(--gold-main)', fontSize:'.65rem', transition:'transform .2s',
            transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:500,
          background:'#0d0e12', border:'1px solid rgba(201,168,76,.2)',
          borderRadius:12, overflow:'hidden',
          boxShadow:'0 16px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(201,168,76,.05)',
          animation:'drh-fadeIn .15s ease',
        }}>
          {/* Barre de recherche */}
          <div style={{ padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,.06)',
            display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:'var(--gold-main)', fontSize:'.8rem' }}>⌕</span>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, grade, matricule…"
              style={{
                flex:1, background:'transparent', border:'none', outline:'none',
                color:'var(--text-primary)', fontSize:'.76rem',
                '::placeholder':{ color:'var(--text-muted)' }
              }}
            />
            {search && (
              <span onClick={() => setSearch('')} style={{ cursor:'pointer', color:'var(--text-muted)',
                fontSize:'.7rem' }}>✕</span>
            )}
          </div>

          {/* Liste */}
          <div style={{ maxHeight:260, overflowY:'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)',
                fontSize:'.73rem', letterSpacing:'.1em' }}>Aucun résultat</div>
            )}
            {filtered.map(s => (
              <div key={s.id} onClick={() => { onChange(s.id); setOpen(false); setSearch(''); }}
                style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                  cursor:'pointer', transition:'background .15s',
                  background: s.id == value ? 'rgba(201,168,76,.08)' : 'transparent',
                  borderLeft: s.id == value ? '2px solid var(--gold-main)' : '2px solid transparent',
                }}
                onMouseEnter={e => { if(s.id != value) e.currentTarget.style.background='rgba(255,255,255,.03)'; }}
                onMouseLeave={e => { if(s.id != value) e.currentTarget.style.background='transparent'; }}
              >
                <div style={{
                  width:34, height:34, borderRadius:'50%', flexShrink:0, overflow:'hidden',
                  background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'.65rem', fontWeight:700, color:'var(--gold-bright)'
                }}>
                  {s.photo_url?.startsWith('data:')
                    ? <img src={s.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : <span>{s.prenom?.[0]}{s.nom?.[0]}</span>
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight: s.id==value ? 700:500, color:'var(--text-primary)',
                    fontSize:'.77rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {s.prenom} {s.nom}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                    <span style={{
                      fontSize:'.59rem', padding:'1px 6px', borderRadius:3, fontWeight:600,
                      color: gradeColor(s.grade), background: gradeColor(s.grade)+'15',
                      border:'1px solid '+gradeColor(s.grade)+'30',
                    }}>{s.grade||'—'}</span>
                    <span style={{ fontSize:'.6rem', color:'var(--text-muted)' }}>{s.matricule}</span>
                  </div>
                </div>
                {s.id == value && <span style={{ color:'var(--gold-main)', fontSize:'.75rem' }}>✓</span>}
              </div>
            ))}
          </div>

          {/* Footer compteur */}
          <div style={{ padding:'7px 14px', borderTop:'1px solid rgba(255,255,255,.05)',
            fontSize:'.6rem', color:'var(--text-muted)', letterSpacing:'.1em', textAlign:'right' }}>
            {filtered.length} soldat{filtered.length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};


/* ── GradePicker élégant ─────────────────────────── */
const GradePicker = ({ grades, value, onChange, currentGrade }) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef();

  React.useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const currentRang = grades.find(g => g.label === currentGrade)?.rang || 0;
  const available = grades.filter(g => g.rang > currentRang);

  const filtered = available.filter(g =>
    `${g.label} ${g.cat}`.toLowerCase().includes(search.toLowerCase())
  );

  const selected = grades.find(g => g.label === value);

  // Grouper par catégorie
  const categories = ['Rang','Sous-Officier','Officier','Officier Supérieur','Commandement','Commandement Suprême'];
  const grouped = categories.map(cat => ({
    cat,
    items: filtered.filter(g => g.cat === cat)
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ position:'relative' }} ref={ref}>
      {/* Trigger */}
      <div onClick={() => setOpen(o => !o)} style={{
        background: 'rgba(255,255,255,.04)',
        border: `1px solid ${open ? 'rgba(201,168,76,.4)' : (value ? gradeColor(value)+'50' : 'rgba(255,255,255,.09)')}`,
        borderRadius: 10, padding: '11px 14px',
        cursor: 'pointer', transition: 'all .2s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        boxShadow: open ? '0 0 0 3px rgba(201,168,76,.08)' : 'none',
      }}>
        {selected ? (
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
            {/* Indicateur couleur */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: gradeColor(selected.label),
              boxShadow: `0 0 8px ${gradeColor(selected.label)}`,
              flexShrink: 0,
            }} />
            <div>
              <div style={{ fontWeight:700, color: gradeColor(selected.label), fontSize:'.8rem' }}>
                {selected.label}
              </div>
              <div style={{ fontSize:'.58rem', color:'var(--text-muted)', letterSpacing:'.12em',
                textTransform:'uppercase', marginTop:1 }}>
                {selected.cat}
              </div>
            </div>
          </div>
        ) : (
          <span style={{ fontSize:'.78rem', color:'var(--text-muted)', letterSpacing:'.05em' }}>
            — Sélectionner le nouveau grade —
          </span>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {selected && (
            <span onClick={e => { e.stopPropagation(); onChange(''); setSearch(''); }}
              style={{ color:'var(--text-muted)', fontSize:'.7rem', cursor:'pointer',
                width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center',
                borderRadius:4, transition:'all .15s' }}>✕</span>
          )}
          <span style={{ color:'var(--gold-main)', fontSize:'.65rem', transition:'transform .2s',
            display:'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:600,
          background:'#0d0e12', border:'1px solid rgba(201,168,76,.2)',
          borderRadius:12, overflow:'hidden',
          boxShadow:'0 16px 48px rgba(0,0,0,.7), 0 0 0 1px rgba(201,168,76,.05)',
          animation:'drh-fadeIn .15s ease',
        }}>
          {/* Barre de recherche */}
          <div style={{ padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,.06)',
            display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ color:'var(--gold-main)', fontSize:'.8rem' }}>⌕</span>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un grade…"
              style={{
                flex:1, background:'transparent', border:'none', outline:'none',
                color:'var(--text-primary)', fontSize:'.76rem',
              }}
            />
            {search && (
              <span onClick={() => setSearch('')}
                style={{ cursor:'pointer', color:'var(--text-muted)', fontSize:'.7rem' }}>✕</span>
            )}
          </div>

          {/* Grades groupés */}
          <div style={{ maxHeight:300, overflowY:'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding:'20px', textAlign:'center', color:'var(--text-muted)',
                fontSize:'.73rem', letterSpacing:'.1em' }}>Aucun grade disponible</div>
            )}
            {grouped.map(({ cat, items }) => (
              <div key={cat}>
                {/* Séparateur de catégorie */}
                <div style={{
                  padding:'6px 14px 4px',
                  fontSize:'.55rem', letterSpacing:'.22em', textTransform:'uppercase',
                  color:'var(--text-muted)',
                  borderTop:'1px solid rgba(255,255,255,.04)',
                  display:'flex', alignItems:'center', gap:8,
                }}>
                  <div style={{ width:16, height:1, background: items[0]?.color || 'rgba(255,255,255,.2)' }} />
                  {cat}
                  <div style={{ flex:1, height:1, background:'rgba(255,255,255,.04)' }} />
                </div>
                {items.map(g => (
                  <div key={g.label}
                    onClick={() => { onChange(g.label); setOpen(false); setSearch(''); }}
                    style={{
                      display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
                      cursor:'pointer', transition:'background .15s',
                      background: g.label === value ? g.color+'10' : 'transparent',
                      borderLeft: g.label === value ? `3px solid ${g.color}` : '3px solid transparent',
                    }}
                    onMouseEnter={e => { if(g.label !== value) e.currentTarget.style.background='rgba(255,255,255,.03)'; }}
                    onMouseLeave={e => { if(g.label !== value) e.currentTarget.style.background='transparent'; }}
                  >
                    {/* Pastille couleur */}
                    <div style={{
                      width:10, height:10, borderRadius:'50%', flexShrink:0,
                      background: g.color,
                      boxShadow: g.label === value ? `0 0 10px ${g.color}` : 'none',
                    }} />
                    <div style={{ flex:1 }}>
                      <div style={{
                        fontWeight: g.label === value ? 700 : 500,
                        color: g.label === value ? g.color : 'var(--text-primary)',
                        fontSize:'.78rem',
                        transition:'color .15s',
                      }}>{g.label}</div>
                    </div>
                    {g.label === value && (
                      <span style={{ color: g.color, fontSize:'.75rem' }}>✓</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding:'7px 14px', borderTop:'1px solid rgba(255,255,255,.05)',
            fontSize:'.6rem', color:'var(--text-muted)', letterSpacing:'.1em',
            display:'flex', justifyContent:'space-between' }}>
            <span>Grades supérieurs à <strong style={{color:'var(--gold-main)'}}>{currentGrade || '—'}</strong></span>
            <span>{filtered.length} disponible{filtered.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Hiérarchie des grades ───────────────────────── */
const GRADES = [
  { label: 'Soldat',            rang: 1,  cat: 'Rang',              color: '#6b7280' },
  { label: 'Caporal',           rang: 2,  cat: 'Rang',              color: '#6b7280' },
  { label: 'Caporal-Chef',      rang: 3,  cat: 'Rang',              color: '#6b7280' },
  { label: 'Sergent',           rang: 4,  cat: 'Sous-Officier',     color: '#60a5fa' },
  { label: 'Sergent-Chef',      rang: 5,  cat: 'Sous-Officier',     color: '#60a5fa' },
  { label: 'Adjudant',          rang: 6,  cat: 'Sous-Officier',     color: '#60a5fa' },
  { label: 'Adjudant-Chef',     rang: 7,  cat: 'Sous-Officier',     color: '#60a5fa' },
  { label: 'Sous-Lieutenant',   rang: 8,  cat: 'Officier',          color: '#c9a84c' },
  { label: 'Lieutenant',        rang: 9,  cat: 'Officier',          color: '#c9a84c' },
  { label: 'Capitaine',         rang: 10, cat: 'Officier',          color: '#c9a84c' },
  { label: 'Commandant',        rang: 11, cat: 'Officier Supérieur',color: '#f59e0b' },
  { label: 'Lieutenant-Colonel',rang: 12, cat: 'Officier Supérieur',color: '#f59e0b' },
  { label: 'Colonel',           rang: 13, cat: 'Officier Supérieur',color: '#f59e0b' },
  { label: 'Légionnaire',       rang: 14, cat: 'Commandement',      color: '#ffd700' },
  { label: 'Major',             rang: 15, cat: 'Commandement Suprême', color: '#ff6b35' },
];

const GRADE_LABELS = GRADES.map(g => g.label);

const gradeRang = (label) => GRADES.find(g => g.label === label)?.rang || 0;
const gradeColor = (label) => GRADES.find(g => g.label === label)?.color || '#6b7280';

const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

/* ── Avatar ──────────────────────────────────────── */
const Avatar = ({ s }) => {
  if (s?.photo_url && s.photo_url.startsWith('data:'))
    return <img src={s.photo_url} alt="" />;
  return <span>{s?.prenom?.[0]}{s?.nom?.[0]}</span>;
};

/* ── Toast ───────────────────────────────────────── */
const Toast = ({ msg, icon = '✅', onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="drh-toast">
      <span className="drh-toast-icon">{icon}</span>
      <span className="drh-toast-msg">{msg}</span>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
══════════════════════════════════════════════════ */
export default function DRH() {
  const [soldiers,    setSoldiers]    = useState([]);
  const [timeline,    setTimeline]    = useState([]);
  const [classement,  setClassement]  = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);

  const [search,      setSearch]      = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterCat,   setFilterCat]   = useState('');

  const [modal,       setModal]       = useState(null); // null | { soldier }
  const [form,        setForm]        = useState({ nouveau_grade:'', date_promotion:'', motif:'', autorise_par:'' });
  const [saving,      setSaving]      = useState(false);
  const [toast,       setToast]       = useState(null);

  /* ── Chargement ──────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [solRes, tlRes, clsRes, stRes] = await Promise.allSettled([
        api.get('/soldiers'),
        api.get('/drh/grades/recent').catch(() => ({ data: { data: [] } })),
        api.get('/distinctions/classement').catch(() => ({ data: { data: [] } })),
        api.get('/drh/stats').catch(() => ({ data: { data: null } })),
      ]);

      const sols = solRes.status === 'fulfilled' ? solRes.value.data.data || [] : [];
      setSoldiers(sols.filter(s => s.statut === 'actif'));
      setTimeline(tlRes.status === 'fulfilled' ? tlRes.value.data.data || [] : []);
      setClassement(clsRes.status === 'fulfilled' ? clsRes.value.data.data || [] : []);
      setStats(stRes.status === 'fulfilled' ? stRes.value.data.data : null);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Filtres ─────────────────────────────────── */
  const filtered = soldiers.filter(s => {
    const txt = `${s.prenom} ${s.nom} ${s.matricule} ${s.grade}`.toLowerCase();
    const matchTxt = !search || txt.includes(search.toLowerCase());
    const matchGrade = !filterGrade || s.grade === filterGrade;
    const matchCat = !filterCat || (GRADES.find(g => g.label === s.grade)?.cat === filterCat);
    return matchTxt && matchGrade && matchCat;
  }).sort((a, b) => gradeRang(b.grade) - gradeRang(a.grade));

  /* ── Stats calculées ─────────────────────────── */
  const parGrade = GRADES.map(g => ({
    ...g, count: soldiers.filter(s => s.grade === g.label).length
  })).filter(g => g.count > 0);

  const maxCount = Math.max(...parGrade.map(g => g.count), 1);

  const totalPromos = timeline.length;
  const promosMonth = timeline.filter(t => {
    const d = new Date(t.date_promotion);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  /* ── Ouvrir modal ────────────────────────────── */
  const openModal = (soldier) => {
    setModal(soldier || 'pick');
    setForm({ soldier_id: soldier?.id || '', nouveau_grade: '', date_promotion: new Date().toISOString().slice(0, 10), motif: '', autorise_par: '' });
  };

  /* ── Soumettre promotion ─────────────────────── */
  const submitPromotion = async () => {
    if (!form.nouveau_grade) return;
    setSaving(true);
    try {
      const sid = modal === 'pick' ? form.soldier_id : modal.id;
      if (!sid) { setToast({ msg: 'Sélectionnez un soldat', icon: '⚠️' }); setSaving(false); return; }
      await api.post('/drh/promotion', {
        soldier_id:     sid,
        nouveau_grade:  form.nouveau_grade,
        date_promotion: form.date_promotion,
        motif:          form.motif,
        autorise_par:   form.autorise_par,
      });
      setToast({ msg: `${modal.prenom} ${modal.nom} promu(e) ${form.nouveau_grade} !`, icon: '🎖️' });
      setModal(null);
      load();
    } catch (e) {
      setToast({ msg: 'Erreur lors de la promotion', icon: '❌' });
    }
    setSaving(false);
  };

  /* ── Rang dans classement ────────────────────── */
  const rankStyle = (i) => {
    if (i === 0) return 'gold';
    if (i === 1) return 'silver';
    if (i === 2) return 'bronze';
    return 'other';
  };
  const rankSymbol = (i) => ['🥇','🥈','🥉'][i] || `#${i+1}`;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="drh-page">

      {/* ── En-tête ─────────────────────────────── */}
      <div className="drh-header">
        <div className="drh-header-left">
          <div className="drh-eyebrow">G5C Armée · QG Command Center</div>
          <div className="drh-title">Direction des Ressources Humaines</div>
          <div className="drh-subtitle">GESTION DES GRADES · PROMOTIONS · DISTINCTIONS</div>
        </div>
        <button className="drh-btn-promote" onClick={() => openModal(null)}>
          <span>🎖️</span> ENREGISTRER UNE PROMOTION
        </button>
      </div>

      {/* ── Stat cards ──────────────────────────── */}
      <div className="drh-stats-row">
        <div className="drh-stat">
          <div className="drh-stat-accent" style={{ background: 'var(--gold-main)' }} />
          <div className="drh-stat-icon">👮</div>
          <div className="drh-stat-val">{soldiers.length}</div>
          <div className="drh-stat-lbl">Soldats Actifs</div>
          <div className="drh-stat-delta" style={{ color: '#34d399' }}>
            ↑ {soldiers.filter(s => s.statut === 'actif').length} en service
          </div>
        </div>
        <div className="drh-stat">
          <div className="drh-stat-accent" style={{ background: '#818cf8' }} />
          <div className="drh-stat-icon">🎖️</div>
          <div className="drh-stat-val">{totalPromos}</div>
          <div className="drh-stat-lbl">Promotions Totales</div>
          <div className="drh-stat-delta" style={{ color: '#818cf8' }}>
            {promosMonth > 0 ? `↑ ${promosMonth} ce mois` : '— aucune ce mois'}
          </div>
        </div>
        <div className="drh-stat">
          <div className="drh-stat-accent" style={{ background: '#f59e0b' }} />
          <div className="drh-stat-icon">★</div>
          <div className="drh-stat-val">{classement.reduce((a,c) => a + (parseInt(c.total)||0), 0)}</div>
          <div className="drh-stat-lbl">Distinctions Attribuées</div>
          <div className="drh-stat-delta" style={{ color: '#f59e0b' }}>
            {classement.length} soldats décorés
          </div>
        </div>
        <div className="drh-stat">
          <div className="drh-stat-accent" style={{ background: '#ffd700' }} />
          <div className="drh-stat-icon">◈</div>
          <div className="drh-stat-val">{parGrade.length}</div>
          <div className="drh-stat-lbl">Grades Représentés</div>
          <div className="drh-stat-delta" style={{ color: '#ffd700' }}>
            sur {GRADES.length} grades
          </div>
        </div>
      </div>

      {/* ── Grille : Pyramide + Timeline ────────── */}
      <div className="drh-grid">

        {/* Pyramide des grades */}
        <div className="drh-card">
          <div className="drh-card-title">⬡ Pyramide des Grades</div>
          {parGrade.length === 0 ? (
            <div className="drh-empty">Aucun soldat enregistré</div>
          ) : (
            <div className="drh-pyramid">
              {['Commandement','Officier Supérieur','Officier','Sous-Officier','Rang'].map(cat => {
                const rows = parGrade.filter(g => g.cat === cat).sort((a,b) => b.rang - a.rang);
                if (!rows.length) return null;
                return (
                  <React.Fragment key={cat}>
                    <div className="drh-pyramid-cat">{cat}</div>
                    {rows.map(g => {
                      const pct = Math.round((g.count / maxCount) * 220);
                      return (
                        <div key={g.label} className="drh-pyramid-row">
                          <div className="drh-pyramid-label">{g.label}</div>
                          <div className="drh-pyramid-bar-wrap">
                            <div className="drh-pyramid-bar"
                              style={{ width: Math.max(pct, 28) + 'px', background: g.color }}>
                              {g.count > 1 && g.count}
                            </div>
                          </div>
                          <div className="drh-pyramid-bar-count">{g.count}</div>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Timeline des promotions récentes */}
        <div className="drh-card">
          <div className="drh-card-title">◉ Promotions Récentes</div>
          {timeline.length === 0 ? (
            <div className="drh-empty">Aucune promotion enregistrée</div>
          ) : (
            <div className="drh-timeline">
              {timeline.slice(0, 8).map((t, i) => (
                <div key={t.id} className="drh-tl-item">
                  <div className="drh-tl-dot-col">
                    <div className="drh-tl-dot" style={{ borderColor: gradeColor(t.nouveau_grade) }} />
                    {i < timeline.length - 1 && <div className="drh-tl-line" />}
                  </div>
                  <div className="drh-tl-body">
                    <div className="drh-tl-name">{t.prenom} {t.nom}</div>
                    <div className="drh-tl-grades">
                      <span className="drh-tl-old">{t.ancien_grade || '—'}</span>
                      <span className="drh-tl-arrow">→</span>
                      <span className="drh-tl-new" style={{ color: gradeColor(t.nouveau_grade), borderColor: gradeColor(t.nouveau_grade) + '40' }}>
                        {t.nouveau_grade}
                      </span>
                    </div>
                    <div className="drh-tl-meta">
                      {fmt(t.date_promotion)}
                      {t.autorise_par && ` · Autorisé par ${t.autorise_par}`}
                      {t.motif && ` · ${t.motif}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tableau des soldats ──────────────────── */}
      <div className="drh-card" style={{ marginBottom: 20 }}>
        <div className="drh-card-title">◈ Effectifs & Grades</div>

        <div className="drh-soldiers-filters">
          <input
            className="drh-filter-search"
            placeholder="🔍  Rechercher un soldat…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="drh-filter-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">Toutes catégories</option>
            {['Rang','Sous-Officier','Officier','Officier Supérieur','Commandement'].map(c =>
              <option key={c} value={c}>{c}</option>
            )}
          </select>
          <select className="drh-filter-select" value={filterGrade} onChange={e => setFilterGrade(e.target.value)}>
            <option value="">Tous les grades</option>
            {GRADE_LABELS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className="drh-table-wrap">
          <table className="drh-table">
            <thead>
              <tr>
                <th>SOLDAT</th>
                <th>MATRICULE</th>
                <th>GRADE ACTUEL</th>
                <th>PROMOTION</th>
                <th>SECTION</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="drh-empty">Aucun résultat</td></tr>
              )}
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <div className="drh-soldier-cell">
                      <div className="drh-avatar"><Avatar s={s} /></div>
                      <div>
                        <div className="drh-soldier-name">{s.prenom} {s.nom}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="drh-soldier-mat">{s.matricule}</span></td>
                  <td>
                    <span className="drh-grade-badge" style={{
                      color: gradeColor(s.grade),
                      borderColor: gradeColor(s.grade) + '40',
                      background: gradeColor(s.grade) + '12',
                    }}>
                      {s.grade || '—'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '.68rem' }}>
                    {s.promotion ? `Promo ${s.promotion}` : '—'}
                  </td>
                  <td>
                    {s.section_affectation
                      ? <span className="drh-section-tag">📍 {s.section_affectation}</span>
                      : <span style={{ color:'var(--text-muted)', fontSize:'.65rem' }}>—</span>
                    }
                  </td>
                  <td>
                    <button className="drh-btn-action" onClick={() => openModal(s)}>
                      🎖️ Promouvoir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Classement distinctions ──────────────── */}
      <div className="drh-card">
        <div className="drh-card-title">★ Classement — Soldats les Plus Décorés</div>
        {classement.length === 0 ? (
          <div className="drh-empty">Aucune distinction enregistrée</div>
        ) : (
          <div className="drh-classement">
            {classement.slice(0, 10).map((c, i) => (
              <div key={c.id} className="drh-cls-item">
                <div className={`drh-cls-rank ${rankStyle(i)}`}>{rankSymbol(i)}</div>
                <div className="drh-avatar" style={{ width:36, height:36 }}>
                  <Avatar s={c} />
                </div>
                <div style={{ flex:1 }}>
                  <div className="drh-cls-name">{c.prenom} {c.nom}</div>
                  <div className="drh-cls-grade">{c.grade} · {c.matricule}</div>
                </div>
                <div className="drh-cls-score">{c.total}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Promotion ─────────────────────── */}
      {modal && (
        <div className="drh-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="drh-modal">
            <div className="drh-modal-header">
              <div className="drh-modal-title">🎖️ Enregistrer une Promotion</div>
              <button className="drh-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="drh-modal-body">

              {/* Sélecteur ou aperçu soldat */}
              {modal === 'pick' ? (
                <div className="drh-field">
                  <label>Soldat *</label>
                  <SoldierPicker
                    soldiers={soldiers}
                    value={form.soldier_id}
                    onChange={id => setForm(f => ({...f, soldier_id: id, nouveau_grade: ''}))}
                  />
                </div>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:12,
                  background:'rgba(201,168,76,.05)', border:'1px solid rgba(201,168,76,.15)',
                  borderRadius:10, padding:'12px 16px' }}>
                  <div className="drh-avatar" style={{ width:44, height:44, fontSize:'.8rem' }}>
                    <Avatar s={modal} />
                  </div>
                  <div>
                    <div style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'.82rem' }}>
                      {modal.prenom} {modal.nom}
                    </div>
                    <div style={{ fontSize:'.65rem', color:'var(--text-muted)' }}>
                      {modal.matricule} · Grade actuel :&nbsp;
                      <span style={{ color: gradeColor(modal.grade), fontWeight:600 }}>{modal.grade || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Aperçu transition */}
              {form.nouveau_grade && (
                <div className="drh-grade-arrow">
                  <span className="drh-grade-from">{modal === 'pick' ? (soldiers.find(s=>s.id==form.soldier_id)?.grade || '—') : (modal.grade || 'Aucun')}</span>
                  <span className="drh-grade-chevron">⟶</span>
                  <span className="drh-grade-to" style={{ color: gradeColor(form.nouveau_grade) }}>
                    {form.nouveau_grade}
                  </span>
                </div>
              )}

              <div className="drh-field">
                <label>Nouveau Grade *</label>
                <GradePicker
                  grades={GRADES}
                  value={form.nouveau_grade}
                  onChange={val => setForm(f => ({...f, nouveau_grade: val}))}
                  currentGrade={modal === 'pick'
                    ? soldiers.find(s => s.id == form.soldier_id)?.grade
                    : modal?.grade
                  }
                />
              </div>

              <div className="drh-field">
                <label>Date de Promotion</label>
                <input type="date" value={form.date_promotion}
                  onChange={e => setForm(f => ({...f, date_promotion:e.target.value}))} />
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div className="drh-field">
                  <label>Autorisé par</label>
                  <input type="text" placeholder="Ex: Col. DIOP"
                    value={form.autorise_par}
                    onChange={e => setForm(f => ({...f, autorise_par:e.target.value}))} />
                </div>
                <div className="drh-field">
                  <label>Motif</label>
                  <input type="text" placeholder="Ex: Mérite exceptionnel"
                    value={form.motif}
                    onChange={e => setForm(f => ({...f, motif:e.target.value}))} />
                </div>
              </div>

            </div>
            <div className="drh-modal-footer">
              <button className="drh-btn-cancel" onClick={() => setModal(null)}>Annuler</button>
              <button className="drh-btn-confirm" onClick={submitPromotion}
                disabled={!form.nouveau_grade || saving}>
                {saving ? '…' : 'CONFIRMER LA PROMOTION'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ────────────────────────────────── */}
      {toast && <Toast msg={toast.msg} icon={toast.icon} onDone={() => setToast(null)} />}

    </div>
  );
}
