import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import '../styles/DASB.css';

/* ── Constantes ── */
const TYPES_AIDE = ['Aide médicale','Aide alimentaire','Aide vestimentaire','Aide scolaire','Aide familiale','Aide logement','Aide transport','Secours d\'urgence','Autre'];
const PRIORITES  = [{v:'normale',l:'Normale'},{v:'haute',l:'Haute'},{v:'urgente',l:'🚨 Urgente'}];

const fmt     = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtXOF  = (n) => n ? `${parseInt(n).toLocaleString('fr-FR')} FCFA` : '—';
const fmtPct  = (n) => n ? `${n}%` : '0%';

/* ── Avatar ── */
const Av = ({s,size=38,color='#a78bfa'}) => {
  const prenom = s?.prenom || s?.c_prenom || '?';
  const nom    = s?.nom    || s?.c_nom    || '';
  const photo  = s?.photo_url;
  const st = {width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,
    background:color+'18',border:`1px solid ${color}30`,display:'flex',alignItems:'center',
    justifyContent:'center',fontSize:size*0.3,fontWeight:700,color};
  if (photo?.startsWith('data:'))
    return <div style={st}><img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>;
  return <div style={st}>{prenom[0]}{nom[0]}</div>;
};

/* ── Toast ── */
const Toast = ({msg,icon='✅',onDone}) => {
  useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t);},[onDone]);
  return <div className="dasb-toast"><span>{icon}</span><span style={{color:'var(--text-primary)'}}>{msg}</span></div>;
};

/* ── Barre de progression budget ── */
const BudgetBar = ({item}) => {
  const pct = item.montant_total > 0 ? Math.min(100, (item.montant_depense / item.montant_total) * 100) : 0;
  const color = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#34d399';
  return (
    <div className="dasb-progress-wrap">
      <div className="dasb-progress-bar">
        <div className="dasb-progress-fill" style={{width:`${pct}%`,background:color}}/>
      </div>
      <div className="dasb-progress-label">{pct.toFixed(1)}% utilisé · {fmtXOF(item.montant_disponible)} disponible</div>
    </div>
  );
};

/* ══ ONGLET DASHBOARD ════════════════════════════════════════════════════════ */
const TabDashboard = ({data}) => {
  if (!data) return <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>Chargement...</div>;
  const st = data.stats || {};

  return (
    <div>
      {/* Stats */}
      <div className="dasb-stats">
        {[
          {val:parseInt(st.en_attente)||0,      lbl:'En attente',   icon:'⏳', color:'#f59e0b', bar:'#f59e0b'},
          {val:parseInt(st.approuvees)||0,       lbl:'Approuvées',   icon:'✅', color:'#34d399', bar:'#34d399'},
          {val:parseInt(st.urgentes)||0,         lbl:'Urgentes',     icon:'🚨', color:'#ef4444', bar:'#ef4444'},
          {val:fmtXOF(st.budget_disponible),     lbl:'Disponible',   icon:'💰', color:'#a78bfa', bar:'#7c3aed', small:true},
        ].map((s,i)=>(
          <div key={i} className="dasb-stat">
            <div className="dasb-stat-bar" style={{background:s.bar}}/>
            <div className="dasb-stat-icon">{s.icon}</div>
            <div className="dasb-stat-val" style={{color:s.color,fontSize:s.small?'1.1rem':'1.8rem'}}>{s.val}</div>
            <div className="dasb-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        {/* Budgets */}
        <div className="dasb-card">
          <div className="dasb-card-title">💰 Budgets actifs</div>
          {(!data.budgets||data.budgets.length===0)
            ? <div className="dasb-empty"><div className="dasb-empty-icon">💰</div>Aucun budget créé</div>
            : <div className="dasb-budget-list">
                {data.budgets.map(b=>(
                  <div key={b.id} className="dasb-budget-item">
                    <div className="dasb-budget-header">
                      <div>
                        <div className="dasb-budget-titre">{b.titre}</div>
                        <div className="dasb-budget-periode">Période : {b.periode} · {b.nb_demandes} demande(s)</div>
                      </div>
                      <div className="dasb-budget-montants">
                        <div className="dasb-montant-item">
                          <span className="dasb-montant-label">Total</span>
                          <span className="dasb-montant-val" style={{color:'#a78bfa'}}>{fmtXOF(b.montant_total)}</span>
                        </div>
                        <div className="dasb-montant-item">
                          <span className="dasb-montant-label">Dépensé</span>
                          <span className="dasb-montant-val" style={{color:'#f59e0b'}}>{fmtXOF(b.montant_depense)}</span>
                        </div>
                      </div>
                    </div>
                    <BudgetBar item={b}/>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Demandes urgentes */}
        <div className="dasb-card">
          <div className="dasb-card-title">🚨 Demandes prioritaires</div>
          {(!data.demandes||data.demandes.filter(d=>d.statut==='en_attente').length===0)
            ? <div className="dasb-empty"><div className="dasb-empty-icon">✅</div>Aucune demande en attente</div>
            : <div className="dasb-demande-list">
                {data.demandes.filter(d=>d.statut==='en_attente').slice(0,5).map(d=>{
                  const nom   = d.prenom ? `${d.prenom} ${d.nom}` : `${d.c_prenom} ${d.c_nom}`;
                  const grade = d.grade || 'CRIC';
                  return (
                    <div key={d.id} className={`dasb-demande-item priorite-${d.priorite}`}>
                      <div className="dasb-demande-header">
                        <Av s={d} size={36}/>
                        <div style={{flex:1}}>
                          <div className="dasb-demande-name">{nom}</div>
                          <div className="dasb-demande-meta">{grade} · {fmt(d.date_demande)}</div>
                        </div>
                        <span className="dasb-demande-type">{d.type_aide}</span>
                        {d.priorite==='urgente'&&<span className="priorite-badge-urgente">URGENT</span>}
                        {d.priorite==='haute'&&<span className="priorite-badge-haute">HAUTE</span>}
                      </div>
                      <div className="dasb-demande-body">{d.motif}</div>
                      {d.montant_demande&&<div className="dasb-demande-montant">{fmtXOF(d.montant_demande)} demandés</div>}
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>

      {/* Équipe DASB */}
      {data.equipe?.length > 0 && (
        <div className="dasb-card" style={{marginTop:18}}>
          <div className="dasb-card-title">👥 Équipe DASB</div>
          <div className="dasb-equipe-grid">
            {data.equipe.map(m=>{
              const isDir = m.fonction?.toLowerCase().includes('directeur');
              return (
                <div key={m.id} className={`dasb-equipe-card ${isDir?'directeur':''}`}>
                  {isDir&&<div className="dasb-equipe-crown">💼 DIRECTEUR</div>}
                  <Av s={m} size={isDir?50:40} color={isDir?'#7c3aed':'#a78bfa'}/>
                  <div className="dasb-equipe-name">{m.prenom} {m.nom}</div>
                  <div className="dasb-equipe-grade">{m.grade}</div>
                  <div className="dasb-equipe-fonction">{m.fonction||'Agent DASB'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ ONGLET DEMANDES ═════════════════════════════════════════════════════════ */
const TabDemandes = ({soldiers, data, onToast, onRefresh}) => {
  const [modal,       setModal]       = useState(false);
  const [modalTrait,  setModalTrait]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [filterStat,  setFilterStat]  = useState('all');
  const [form, setForm] = useState({
    patient_id:'', patient_type:'soldat',
    budget_id:'', type_aide:'', motif:'', montant_demande:'', priorite:'normale',
    date_demande: new Date().toISOString().slice(0,10),
  });
  const [formTrait, setFormTrait] = useState({statut:'approuvee', montant_accorde:'', observations:''});

  const demandes = data?.demandes || [];
  const budgets  = data?.budgets  || [];

  const displayed = filterStat === 'all' ? demandes : demandes.filter(d => d.statut === filterStat);

  const save = async () => {
    if (!form.patient_id || !form.type_aide || !form.motif) return;
    setSaving(true);
    try {
      const payload = {
        type_aide: form.type_aide,
        motif: form.motif,
        montant_demande: form.montant_demande || null,
        priorite: form.priorite,
        date_demande: form.date_demande,
        budget_id: form.budget_id || null,
      };
      payload[form.patient_type === 'soldat' ? 'soldier_id' : 'cric_id'] = parseInt(form.patient_id);
      await api.post('/dasb/demandes', payload);
      onToast({msg:'Demande enregistrée !', icon:'📋'});
      setModal(false);
      onRefresh();
    } catch(e) { onToast({msg:'Erreur', icon:'❌'}); }
    setSaving(false);
  };

  const traiter = async () => {
    if (!modalTrait) return;
    setSaving(true);
    try {
      await api.put(`/dasb/demandes/${modalTrait.id}`, formTrait);
      onToast({msg: formTrait.statut==='approuvee' ? '✅ Demande approuvée !' : '❌ Demande rejetée', icon: formTrait.statut==='approuvee'?'✅':'❌'});
      setModalTrait(null);
      onRefresh();
    } catch(e) { onToast({msg:'Erreur', icon:'❌'}); }
    setSaving(false);
  };

  const supprimer = async (id) => {
    if (!window.confirm('Supprimer cette demande ?')) return;
    try { await api.delete(`/dasb/demandes/${id}`); onToast({msg:'Supprimée',icon:'🗑️'}); onRefresh(); }
    catch(e) {}
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{display:'flex',gap:10,marginBottom:18,alignItems:'center',flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:5}}>
          {[
            {k:'all',      l:'Toutes'},
            {k:'en_attente',l:'⏳ En attente'},
            {k:'approuvee', l:'✅ Approuvées'},
            {k:'rejetee',   l:'❌ Rejetées'},
          ].map(b=>(
            <button key={b.k} onClick={()=>setFilterStat(b.k)}
              style={{background:filterStat===b.k?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',
                border:filterStat===b.k?'1px solid rgba(167,139,250,.3)':'1px solid rgba(255,255,255,.1)',
                color:filterStat===b.k?'#a78bfa':'var(--text-muted)',
                borderRadius:7,padding:'7px 14px',fontSize:'.72rem',fontWeight:600,cursor:'pointer'}}>
              {b.l}
            </button>
          ))}
        </div>
        <button className="dasb-btn-primary" style={{marginLeft:'auto'}} onClick={()=>setModal(true)}>
          ➕ Nouvelle demande
        </button>
      </div>

      {displayed.length === 0
        ? <div className="dasb-empty"><div className="dasb-empty-icon">📋</div>Aucune demande</div>
        : <div className="dasb-demande-list">
            {displayed.map(d=>{
              const nom   = d.prenom ? `${d.prenom} ${d.nom}` : `${d.c_prenom||''} ${d.c_nom||''}`;
              const grade = d.grade || 'CRIC';
              return (
                <div key={d.id} className={`dasb-demande-item priorite-${d.priorite}`}>
                  <div className="dasb-demande-header">
                    <Av s={d} size={40}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="dasb-demande-name">{nom}</div>
                      <div className="dasb-demande-meta">{grade} · {fmt(d.date_demande)}{d.budget_titre?` · ${d.budget_titre}`:''}</div>
                    </div>
                    <span className="dasb-demande-type">{d.type_aide}</span>
                    {d.priorite==='urgente'&&<span className="priorite-badge-urgente">URGENT</span>}
                    {d.priorite==='haute'&&<span className="priorite-badge-haute">HAUTE</span>}
                    <span className={`dasb-statut-badge statut-${d.statut}`}>
                      {d.statut==='en_attente'?'En attente':d.statut==='approuvee'?'Approuvée':'Rejetée'}
                    </span>
                  </div>
                  <div className="dasb-demande-body">{d.motif}</div>
                  <div className="dasb-demande-footer">
                    {d.montant_demande&&<span className="dasb-demande-montant">{fmtXOF(d.montant_demande)} demandés</span>}
                    {d.montant_accorde&&<span style={{fontSize:'.72rem',color:'#34d399',fontWeight:700}}>{fmtXOF(d.montant_accorde)} accordés</span>}
                    {d.observations&&<span style={{fontSize:'.65rem',color:'var(--text-muted)',fontStyle:'italic',flex:1}}>{d.observations}</span>}
                    {d.statut==='en_attente'&&(
                      <>
                        <button className="dasb-btn-approve" onClick={()=>{setModalTrait(d);setFormTrait({statut:'approuvee',montant_accorde:d.montant_demande||'',observations:''});}}>✅ Approuver</button>
                        <button className="dasb-btn-reject" onClick={()=>{setModalTrait(d);setFormTrait({statut:'rejetee',montant_accorde:'',observations:''});}}>❌ Rejeter</button>
                      </>
                    )}
                    <button className="dasb-btn-danger" onClick={()=>supprimer(d.id)}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
      }

      {/* Modal nouvelle demande */}
      {modal&&(
        <div className="dasb-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="dasb-modal">
            <div className="dasb-modal-header">
              <div className="dasb-modal-title">📋 Nouvelle demande sociale</div>
              <button className="dasb-modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="dasb-modal-body">
              {/* Type patient */}
              <div className="dasb-field">
                <label>Demandeur</label>
                <div style={{display:'flex',gap:6,marginBottom:8}}>
                  {['soldat','cric'].map(t=>(
                    <button key={t} onClick={()=>setForm(f=>({...f,patient_type:t,patient_id:''}))}
                      style={{flex:1,padding:'7px',background:form.patient_type===t?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',
                        border:form.patient_type===t?'1px solid rgba(167,139,250,.3)':'1px solid rgba(255,255,255,.1)',
                        color:form.patient_type===t?'#a78bfa':'var(--text-muted)',
                        borderRadius:7,fontSize:'.78rem',fontWeight:600,cursor:'pointer'}}>
                      {t==='soldat'?'👮 Soldat':'🎓 CRIC'}
                    </button>
                  ))}
                </div>
                <select value={form.patient_id} onChange={e=>setForm(f=>({...f,patient_id:e.target.value}))}>
                  <option value="">— Sélectionner —</option>
                  {soldiers.sort((a,b)=>`${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`)).map(s=>(
                    <option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.grade}</option>
                  ))}
                </select>
              </div>
              <div className="dasb-field-row">
                <div className="dasb-field">
                  <label>Type d'aide *</label>
                  <select value={form.type_aide} onChange={e=>setForm(f=>({...f,type_aide:e.target.value}))}>
                    <option value="">— Sélectionner —</option>
                    {TYPES_AIDE.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="dasb-field">
                  <label>Priorité</label>
                  <select value={form.priorite} onChange={e=>setForm(f=>({...f,priorite:e.target.value}))}>
                    {PRIORITES.map(p=><option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                </div>
              </div>
              <div className="dasb-field">
                <label>Motif *</label>
                <textarea value={form.motif} onChange={e=>setForm(f=>({...f,motif:e.target.value}))} placeholder="Décrivez la situation et le besoin..."/>
              </div>
              <div className="dasb-field-row">
                <div className="dasb-field">
                  <label>Montant demandé (FCFA)</label>
                  <input type="number" value={form.montant_demande} onChange={e=>setForm(f=>({...f,montant_demande:e.target.value}))} placeholder="Ex: 50000"/>
                </div>
                <div className="dasb-field">
                  <label>Budget concerné</label>
                  <select value={form.budget_id} onChange={e=>setForm(f=>({...f,budget_id:e.target.value}))}>
                    <option value="">— Aucun —</option>
                    {budgets.map(b=><option key={b.id} value={b.id}>{b.titre} ({fmtXOF(b.montant_disponible)} dispo)</option>)}
                  </select>
                </div>
              </div>
              <div className="dasb-field">
                <label>Date de demande</label>
                <input type="date" value={form.date_demande} onChange={e=>setForm(f=>({...f,date_demande:e.target.value}))}/>
              </div>
            </div>
            <div className="dasb-modal-footer">
              <button className="dasb-btn-cancel" onClick={()=>setModal(false)}>Annuler</button>
              <button className="dasb-btn-confirm" onClick={save} disabled={!form.patient_id||!form.type_aide||!form.motif||saving}>
                {saving?'…':'ENREGISTRER'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal traitement */}
      {modalTrait&&(
        <div className="dasb-overlay" onClick={e=>e.target===e.currentTarget&&setModalTrait(null)}>
          <div className="dasb-modal" style={{maxWidth:440}}>
            <div className="dasb-modal-header">
              <div className="dasb-modal-title">{formTrait.statut==='approuvee'?'✅ Approuver':'❌ Rejeter'} la demande</div>
              <button className="dasb-modal-close" onClick={()=>setModalTrait(null)}>✕</button>
            </div>
            <div className="dasb-modal-body">
              <div style={{background:'rgba(255,255,255,.03)',borderRadius:10,padding:'12px 16px',marginBottom:4}}>
                <div style={{fontSize:'.72rem',color:'var(--text-muted)',marginBottom:4}}>Demande de</div>
                <div style={{fontSize:'.85rem',fontWeight:700,color:'var(--text-primary)'}}>
                  {modalTrait.prenom||modalTrait.c_prenom} {modalTrait.nom||modalTrait.c_nom}
                </div>
                <div style={{fontSize:'.7rem',color:'#a78bfa',marginTop:2}}>{modalTrait.type_aide}</div>
                <div style={{fontSize:'.72rem',color:'var(--text-secondary)',marginTop:6,fontStyle:'italic'}}>{modalTrait.motif}</div>
              </div>
              {formTrait.statut==='approuvee'&&(
                <div className="dasb-field">
                  <label>Montant accordé (FCFA)</label>
                  <input type="number" value={formTrait.montant_accorde} onChange={e=>setFormTrait(f=>({...f,montant_accorde:e.target.value}))} placeholder="Montant en FCFA"/>
                </div>
              )}
              <div className="dasb-field">
                <label>Observations / Motif de décision</label>
                <textarea value={formTrait.observations} onChange={e=>setFormTrait(f=>({...f,observations:e.target.value}))} placeholder="Notes sur la décision..."/>
              </div>
            </div>
            <div className="dasb-modal-footer">
              <button className="dasb-btn-cancel" onClick={()=>setModalTrait(null)}>Annuler</button>
              <button onClick={traiter} disabled={saving}
                style={{background:formTrait.statut==='approuvee'?'linear-gradient(135deg,#059669,#047857)':'linear-gradient(135deg,#dc2626,#b91c1c)',
                  border:'none',borderRadius:8,color:'#fff',fontFamily:"'Cinzel',serif",fontSize:'.7rem',
                  fontWeight:700,letterSpacing:'.1em',padding:'9px 20px',cursor:'pointer'}}>
                {saving?'…':formTrait.statut==='approuvee'?'APPROUVER':'REJETER'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ ONGLET BUDGETS ══════════════════════════════════════════════════════════ */
const TabBudgets = ({data, onToast, onRefresh}) => {
  const [modal,  setModal]  = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({titre:'', periode: new Date().getFullYear().toString(), montant_total:'', description:''});

  const budgets = data?.budgets || [];

  const save = async () => {
    if (!form.titre || !form.montant_total) return;
    setSaving(true);
    try {
      await api.post('/dasb/budgets', form);
      onToast({msg:'Budget créé !', icon:'💰'});
      setModal(false);
      setForm({titre:'', periode: new Date().getFullYear().toString(), montant_total:'', description:''});
      onRefresh();
    } catch(e) { onToast({msg:'Erreur', icon:'❌'}); }
    setSaving(false);
  };

  const supprimer = async (id) => {
    if (!window.confirm('Supprimer ce budget ?')) return;
    try { await api.delete(`/dasb/budgets/${id}`); onToast({msg:'Supprimé',icon:'🗑️'}); onRefresh(); }
    catch(e) {}
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:18}}>
        <button className="dasb-btn-primary" onClick={()=>setModal(true)}>➕ Nouveau budget</button>
      </div>

      {budgets.length === 0
        ? <div className="dasb-empty"><div className="dasb-empty-icon">💰</div>Aucun budget créé</div>
        : <div className="dasb-budget-list">
            {budgets.map(b=>(
              <div key={b.id} className="dasb-budget-item">
                <div className="dasb-budget-header">
                  <div>
                    <div className="dasb-budget-titre">{b.titre}</div>
                    <div className="dasb-budget-periode">Période : {b.periode} · {b.nb_demandes} demande(s) liée(s)</div>
                    {b.description&&<div style={{fontSize:'.65rem',color:'var(--text-muted)',marginTop:3,fontStyle:'italic'}}>{b.description}</div>}
                  </div>
                  <div className="dasb-budget-montants">
                    <div className="dasb-montant-item">
                      <span className="dasb-montant-label">Total alloué</span>
                      <span className="dasb-montant-val" style={{color:'#a78bfa'}}>{fmtXOF(b.montant_total)}</span>
                    </div>
                    <div className="dasb-montant-item">
                      <span className="dasb-montant-label">Dépensé</span>
                      <span className="dasb-montant-val" style={{color:'#f59e0b'}}>{fmtXOF(b.montant_depense)}</span>
                    </div>
                    <div className="dasb-montant-item">
                      <span className="dasb-montant-label">Disponible</span>
                      <span className="dasb-montant-val" style={{color:'#34d399'}}>{fmtXOF(b.montant_disponible)}</span>
                    </div>
                  </div>
                  <button className="dasb-btn-danger" onClick={()=>supprimer(b.id)}>🗑️</button>
                </div>
                <BudgetBar item={b}/>
              </div>
            ))}
          </div>
      }

      {modal&&(
        <div className="dasb-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="dasb-modal" style={{maxWidth:460}}>
            <div className="dasb-modal-header">
              <div className="dasb-modal-title">💰 Nouveau budget</div>
              <button className="dasb-modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="dasb-modal-body">
              <div className="dasb-field"><label>Intitulé *</label>
                <input value={form.titre} onChange={e=>setForm(f=>({...f,titre:e.target.value}))} placeholder="Ex: Budget social 2026"/>
              </div>
              <div className="dasb-field-row">
                <div className="dasb-field"><label>Période</label>
                  <input value={form.periode} onChange={e=>setForm(f=>({...f,periode:e.target.value}))} placeholder="2026"/>
                </div>
                <div className="dasb-field"><label>Montant total (FCFA) *</label>
                  <input type="number" value={form.montant_total} onChange={e=>setForm(f=>({...f,montant_total:e.target.value}))} placeholder="Ex: 500000"/>
                </div>
              </div>
              <div className="dasb-field"><label>Description</label>
                <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Objectif du budget..."/>
              </div>
            </div>
            <div className="dasb-modal-footer">
              <button className="dasb-btn-cancel" onClick={()=>setModal(false)}>Annuler</button>
              <button className="dasb-btn-confirm" onClick={save} disabled={!form.titre||!form.montant_total||saving}>{saving?'…':'CRÉER'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ PAGE PRINCIPALE ═════════════════════════════════════════════════════════ */
export default function DASB() {
  const [tab,      setTab]      = useState('dashboard');
  const [data,     setData]     = useState(null);
  const [soldiers, setSoldiers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, sols] = await Promise.allSettled([
        api.get('/dasb/dashboard'),
        api.get('/soldiers'),
      ]);
      if (dash.status==='fulfilled') setData(dash.value.data.data);
      if (sols.status==='fulfilled') setSoldiers((sols.value.data.data||[]).filter(s=>s.statut==='actif'));
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="dasb-page">
      <div className="dasb-header">
        <div>
          <div className="dasb-eyebrow">G5C Armée · QG Command Center</div>
          <div className="dasb-title">Direction de l'Action Sociale & du Budget</div>
          <div className="dasb-subtitle">AIDES SOCIALES · BUDGETS · SUIVI FINANCIER</div>
        </div>
      </div>

      <div className="dasb-tabs">
        {[
          {key:'dashboard', label:'📊 Tableau de bord'},
          {key:'demandes',  label:'📋 Demandes sociales'},
          {key:'budgets',   label:'💰 Budgets'},
        ].map(t=>(
          <button key={t.key} className={`dasb-tab ${tab===t.key?'active':''}`} onClick={()=>setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && tab==='dashboard'
        ? <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>Chargement...</div>
        : <>
            {tab==='dashboard' && <TabDashboard data={data}/>}
            {tab==='demandes'  && <TabDemandes soldiers={soldiers} data={data} onToast={setToast} onRefresh={load}/>}
            {tab==='budgets'   && <TabBudgets data={data} onToast={setToast} onRefresh={load}/>}
          </>
      }

      {toast && <Toast msg={toast.msg} icon={toast.icon} onDone={()=>setToast(null)}/>}
    </div>
  );
}
