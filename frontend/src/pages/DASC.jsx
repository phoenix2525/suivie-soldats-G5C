import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import '../styles/DASC.css';

/* ══ Constantes ══════════════════════════════════════════════════════════════ */
const SPORTS = ['Football','Basketball','Athlétisme','Volleyball','Natation','Boxe','Lutte','Judo','Tennis de table','Cross-country','Tir','Autre'];
const TYPES_COMP = [{v:'interne',l:'Interne'},{v:'externe',l:'Externe'},{v:'tournoi',l:'Tournoi'}];
const TYPES_EVT  = ['Gala','Cérémonie','Spectacle','Exposition','Concours','Fête culturelle','Autre'];
const STATUTS    = [{v:'planifie',l:'Planifié'},{v:'en_cours',l:'En cours'},{v:'termine',l:'Terminé'},{v:'annule',l:'Annulé'}];
const MEDAILLES  = [{v:'or',l:'🥇 Or'},{v:'argent',l:'🥈 Argent'},{v:'bronze',l:'🥉 Bronze'},{v:'aucune',l:'Aucune'}];

const SPORT_ICONS = {Football:'⚽',Basketball:'🏀',Athlétisme:'🏃',Volleyball:'🏐',Natation:'🏊',Boxe:'🥊',Lutte:'🤼',Judo:'🥋','Tennis de table':'🏓',Cross:'🏅',Tir:'🎯',Autre:'🏆'};
const EVT_ICONS   = {Gala:'🎭',Cérémonie:'🎖️',Spectacle:'🎪',Exposition:'🖼️',Concours:'🏆','Fête culturelle':'🎉',Autre:'🎨'};

const sportIcon = (s) => SPORT_ICONS[s] || '🏆';
const evtIcon   = (t) => EVT_ICONS[t]   || '🎭';
const fmt       = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtStatut = (s) => ({planifie:'Planifié',en_cours:'En cours',termine:'Terminé',annule:'Annulé'}[s]||s);

/* ── Avatar ── */
const Av = ({s,size=36,color='#60a5fa'}) => {
  const st={width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,
    background:color+'15',border:`1px solid ${color}30`,display:'flex',alignItems:'center',
    justifyContent:'center',fontSize:size*0.28,fontWeight:700,color};
  if(s?.photo_url?.startsWith('data:'))
    return <div style={st}><img src={s.photo_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>;
  return <div style={st}>{s?.prenom?.[0]}{s?.nom?.[0]}</div>;
};

/* ── Toast ── */
const Toast = ({msg,icon='✅',onDone}) => {
  useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t);},[onDone]);
  return <div className="dasc-toast"><span>{icon}</span><span className="dasc-toast-msg">{msg}</span></div>;
};

/* ══ ONGLET DASHBOARD ════════════════════════════════════════════════════════ */
const TabDashboard = ({data, onVoirComp, onVoirEvt}) => {
  if (!data) return <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>Chargement...</div>;
  const st = data.stats || {};

  return (
    <div>
      {/* Stats */}
      <div className="dasc-stats">
        {[
          {val:parseInt(st.total_competitions)||0, lbl:'Compétitions',   icon:'🏆', color:'#60a5fa', bar:'#3b82f6'},
          {val:parseInt(st.en_cours)||0,           lbl:'En cours',       icon:'▶',  color:'#34d399', bar:'#34d399'},
          {val:parseInt(st.total_evenements)||0,   lbl:'Événements',     icon:'🎭', color:'#a78bfa', bar:'#7c3aed'},
          {val:parseInt(st.medailles_or)||0,       lbl:'Médailles Or',   icon:'🥇', color:'#eab308', bar:'#eab308'},
          {val:(parseInt(st.medailles_argent)||0)+(parseInt(st.medailles_bronze)||0), lbl:'Arg. & Bronze', icon:'🥈', color:'#94a3b8', bar:'#64748b'},
        ].map((s,i)=>(
          <div key={i} className="dasc-stat">
            <div className="dasc-stat-bar" style={{background:s.bar}}/>
            <div className="dasc-stat-icon">{s.icon}</div>
            <div className="dasc-stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="dasc-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="dasc-grid-2">
        {/* Compétitions récentes */}
        <div className="dasc-card">
          <div className="dasc-card-title">🏆 Compétitions récentes</div>
          {(!data.competitions||data.competitions.length===0)
            ? <div className="dasc-empty"><div className="dasc-empty-icon">🏆</div>Aucune compétition</div>
            : <div className="dasc-comp-list">
                {data.competitions.slice(0,5).map(c=>(
                  <div key={c.id} className="dasc-comp-item" onClick={()=>onVoirComp(c)}>
                    <div className="dasc-comp-sport-badge">{sportIcon(c.sport)}</div>
                    <div className="dasc-comp-info">
                      <div className="dasc-comp-titre">{c.titre}</div>
                      <div className="dasc-comp-meta">{c.sport} · {fmt(c.date_debut)} · {c.nb_participants} participant(s)</div>
                    </div>
                    <div className="dasc-comp-medals">
                      {parseInt(c.ors)>0    && <span className="dasc-medal dasc-medal-or">🥇 {c.ors}</span>}
                      {parseInt(c.argents)>0 && <span className="dasc-medal dasc-medal-argent">🥈 {c.argents}</span>}
                      {parseInt(c.bronzes)>0 && <span className="dasc-medal dasc-medal-bronze">🥉 {c.bronzes}</span>}
                    </div>
                    <span className={`dasc-statut-badge statut-${c.statut}`}>{fmtStatut(c.statut)}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Événements culturels */}
        <div className="dasc-card">
          <div className="dasc-card-title">🎭 Événements culturels</div>
          {(!data.evenements||data.evenements.length===0)
            ? <div className="dasc-empty"><div className="dasc-empty-icon">🎭</div>Aucun événement</div>
            : <div className="dasc-evt-list">
                {data.evenements.slice(0,5).map(e=>(
                  <div key={e.id} className="dasc-evt-item">
                    <div className="dasc-evt-icon">{evtIcon(e.type)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="dasc-evt-titre">{e.titre}</div>
                      <div className="dasc-evt-meta">{fmt(e.date_evenement)} · {e.nb_participants} participant(s){e.lieu ? ` · ${e.lieu}` : ''}</div>
                    </div>
                    <span className="dasc-evt-type">{e.type}</span>
                    <span className={`dasc-statut-badge statut-${e.statut}`}>{fmtStatut(e.statut)}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Palmarès + Équipe */}
      <div className="dasc-grid-2">
        {/* Palmarès */}
        <div className="dasc-card">
          <div className="dasc-card-title">🏅 Palmarès — Top soldats</div>
          {(!data.palmares||data.palmares.length===0)
            ? <div className="dasc-empty"><div className="dasc-empty-icon">🏅</div>Aucune médaille enregistrée</div>
            : <div className="dasc-palmares">
                {data.palmares.map((s,i)=>(
                  <div key={s.id} className="dasc-palmares-item">
                    <div className="dasc-palmares-rank" style={{color:i===0?'#eab308':i===1?'#94a3b8':i===2?'#b45309':'var(--text-muted)'}}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                    </div>
                    <Av s={s} size={32} color={i===0?'#eab308':'#60a5fa'}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div className="dasc-palmares-name">{s.prenom} {s.nom}</div>
                      <div className="dasc-palmares-grade">{s.grade} · {s.nb_participations} compét.</div>
                    </div>
                    <div className="dasc-palmares-medals">
                      {parseInt(s.ors)>0    && <span className="dasc-medal dasc-medal-or">🥇{s.ors}</span>}
                      {parseInt(s.argents)>0 && <span className="dasc-medal dasc-medal-argent">🥈{s.argents}</span>}
                      {parseInt(s.bronzes)>0 && <span className="dasc-medal dasc-medal-bronze">🥉{s.bronzes}</span>}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Équipe DASC */}
        <div className="dasc-card">
          <div className="dasc-card-title">👥 Équipe DASC</div>
          {(!data.equipe||data.equipe.length===0)
            ? <div className="dasc-empty"><div className="dasc-empty-icon">👥</div>Affectez des soldats à la section DASC</div>
            : <div className="dasc-equipe-grid">
                {data.equipe.map((m,i)=>{
                  const isDir=m.fonction?.toLowerCase().includes('directeur');
                  return (
                    <div key={m.id} className={`dasc-equipe-card ${isDir?'directeur':''}`}>
                      {isDir&&<div className="dasc-equipe-crown">🏅 DIRECTEUR</div>}
                      <Av s={m} size={isDir?50:40} color={isDir?'#3b82f6':'#60a5fa'}/>
                      <div className="dasc-equipe-name">{m.prenom} {m.nom}</div>
                      <div className="dasc-equipe-grade">{m.grade}</div>
                      <div className="dasc-equipe-fonction">{m.fonction||'Agent DASC'}</div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>
    </div>
  );
};

/* ══ ONGLET COMPÉTITIONS ═════════════════════════════════════════════════════ */
const TabCompetitions = ({soldiers, onToast}) => {
  const [competitions, setCompetitions] = useState([]);
  const [detail, setDetail]   = useState(null);
  const [modal,  setModal]    = useState(false);
  const [modalPart, setModalPart] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form,   setForm]     = useState({titre:'',sport:'Football',type:'interne',date_debut:new Date().toISOString().slice(0,10),date_fin:'',lieu:'',description:'',statut:'planifie'});
  const [formPart, setFormPart] = useState({soldier_id:'',medaille:'aucune',classement:'',performance:'',observations:''});

  const load = useCallback(async()=>{
    try{const r=await api.get('/dasc/dashboard');setCompetitions(r.data.data.competitions||[]);}
    catch(e){console.error(e);}
  },[]);
  useEffect(()=>{load();},[load]);

  const openDetail = async(c)=>{
    try{const r=await api.get(`/dasc/competitions/${c.id}`);setDetail(r.data.data);}
    catch(e){setDetail({...c,participants:[]});}
  };

  const save = async()=>{
    if(!form.titre||!form.sport){return;}
    setSaving(true);
    try{
      await api.post('/dasc/competitions',form);
      onToast({msg:'Compétition créée !',icon:'🏆'});
      setModal(false); load();
    }catch(e){onToast({msg:'Erreur',icon:'❌'});}
    setSaving(false);
  };

  const savePart = async()=>{
    if(!formPart.soldier_id||!detail){return;}
    setSaving(true);
    try{
      await api.post('/dasc/participations',{...formPart,competition_id:detail.id});
      onToast({msg:'Participation enregistrée !',icon:'🏅'});
      setModalPart(false);
      openDetail(detail);
    }catch(e){onToast({msg:'Erreur',icon:'❌'});}
    setSaving(false);
  };

  const supprimerPart = async(id)=>{
    try{await api.delete(`/dasc/participations/${id}`);openDetail(detail);onToast({msg:'Supprimé',icon:'🗑️'});}
    catch(e){}
  };

  const supprimerComp = async(id)=>{
    try{await api.delete(`/dasc/competitions/${id}`);onToast({msg:'Supprimée',icon:'🗑️'});load();}
    catch(e){}
  };

  if (detail) return (
    <div>
      <div className="dasc-detail-header">
        <div className="dasc-comp-sport-badge" style={{width:50,height:50}}>{sportIcon(detail.sport)}</div>
        <div>
          <div className="dasc-detail-titre">{detail.titre}</div>
          <div className="dasc-detail-meta">{detail.sport} · {fmtStatut(detail.statut)} · {fmt(detail.date_debut)}{detail.date_fin?` → ${fmt(detail.date_fin)}`:''}{detail.lieu?` · ${detail.lieu}`:''}</div>
        </div>
        <span className={`dasc-statut-badge statut-${detail.statut}`} style={{marginLeft:0}}>{fmtStatut(detail.statut)}</span>
        <button className="dasc-btn-secondary" onClick={()=>setModalPart(true)}>➕ Ajouter participant</button>
        <button className="dasc-detail-back" onClick={()=>setDetail(null)}>← Retour</button>
      </div>

      {(!detail.participants||detail.participants.length===0)
        ? <div className="dasc-empty"><div className="dasc-empty-icon">🏅</div>Aucun participant enregistré</div>
        : <div className="dasc-participants-grid">
            {detail.participants.map(p=>(
              <div key={p.id} className={`dasc-participant-card ${p.medaille&&p.medaille!=='aucune'?'medaille-'+p.medaille:''}`}>
                <div style={{fontSize:'1.5rem'}}>{p.medaille==='or'?'🥇':p.medaille==='argent'?'🥈':p.medaille==='bronze'?'🥉':'🏅'}</div>
                <Av s={p} size={44} color={p.medaille==='or'?'#eab308':p.medaille==='argent'?'#94a3b8':p.medaille==='bronze'?'#b45309':'#60a5fa'}/>
                <div className="dasc-participant-name">{p.prenom} {p.nom}</div>
                <div className="dasc-participant-meta">{p.grade}</div>
                {p.classement&&<div style={{fontSize:'.65rem',color:'#60a5fa'}}>#{p.classement}</div>}
                {p.performance&&<div style={{fontSize:'.62rem',color:'var(--text-muted)',fontStyle:'italic'}}>{p.performance}</div>}
                <button className="dasc-btn-danger" onClick={()=>supprimerPart(p.id)}>🗑️</button>
              </div>
            ))}
          </div>
      }

      {/* Modal ajout participant */}
      {modalPart&&(
        <div className="dasc-overlay" onClick={e=>e.target===e.currentTarget&&setModalPart(false)}>
          <div className="dasc-modal">
            <div className="dasc-modal-header">
              <div className="dasc-modal-title">🏅 Ajouter un participant</div>
              <button className="dasc-modal-close" onClick={()=>setModalPart(false)}>✕</button>
            </div>
            <div className="dasc-modal-body">
              <div className="dasc-field"><label>Soldat *</label>
                <select value={formPart.soldier_id} onChange={e=>setFormPart(f=>({...f,soldier_id:e.target.value}))}>
                  <option value="">— Sélectionner —</option>
                  {soldiers.sort((a,b)=>`${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`)).map(s=>(
                    <option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.grade}</option>
                  ))}
                </select>
              </div>
              <div className="dasc-field-row">
                <div className="dasc-field"><label>Médaille</label>
                  <select value={formPart.medaille} onChange={e=>setFormPart(f=>({...f,medaille:e.target.value}))}>
                    {MEDAILLES.map(m=><option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                </div>
                <div className="dasc-field"><label>Classement</label>
                  <input type="number" placeholder="1, 2, 3..." value={formPart.classement} onChange={e=>setFormPart(f=>({...f,classement:e.target.value}))}/>
                </div>
              </div>
              <div className="dasc-field"><label>Performance</label>
                <input type="text" placeholder="Ex: 10.5s, 2m30, 3 buts..." value={formPart.performance} onChange={e=>setFormPart(f=>({...f,performance:e.target.value}))}/>
              </div>
              <div className="dasc-field"><label>Observations</label>
                <textarea value={formPart.observations} onChange={e=>setFormPart(f=>({...f,observations:e.target.value}))} placeholder="Notes..."/>
              </div>
            </div>
            <div className="dasc-modal-footer">
              <button className="dasc-btn-cancel" onClick={()=>setModalPart(false)}>Annuler</button>
              <button className="dasc-btn-confirm" onClick={savePart} disabled={!formPart.soldier_id||saving}>{saving?'…':'ENREGISTRER'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <button className="dasc-btn-primary" onClick={()=>setModal(true)}>➕ Nouvelle compétition</button>
      </div>

      {competitions.length===0
        ? <div className="dasc-empty"><div className="dasc-empty-icon">🏆</div>Aucune compétition enregistrée</div>
        : <div className="dasc-comp-list">
            {competitions.map(c=>(
              <div key={c.id} className="dasc-comp-item" onClick={()=>openDetail(c)}>
                <div className="dasc-comp-sport-badge">{sportIcon(c.sport)}</div>
                <div className="dasc-comp-info">
                  <div className="dasc-comp-titre">{c.titre}</div>
                  <div className="dasc-comp-meta">{c.sport} · {c.type} · {fmt(c.date_debut)}{c.lieu?` · ${c.lieu}`:''} · {c.nb_participants} participant(s)</div>
                </div>
                <div className="dasc-comp-medals">
                  {parseInt(c.ors)>0    && <span className="dasc-medal dasc-medal-or">🥇 {c.ors}</span>}
                  {parseInt(c.argents)>0 && <span className="dasc-medal dasc-medal-argent">🥈 {c.argents}</span>}
                  {parseInt(c.bronzes)>0 && <span className="dasc-medal dasc-medal-bronze">🥉 {c.bronzes}</span>}
                </div>
                <span className={`dasc-statut-badge statut-${c.statut}`}>{fmtStatut(c.statut)}</span>
                <button className="dasc-btn-danger" onClick={e=>{e.stopPropagation();supprimerComp(c.id);}}>🗑️</button>
              </div>
            ))}
          </div>
      }

      {/* Modal nouvelle compétition */}
      {modal&&(
        <div className="dasc-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="dasc-modal">
            <div className="dasc-modal-header">
              <div className="dasc-modal-title">🏆 Nouvelle compétition</div>
              <button className="dasc-modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="dasc-modal-body">
              <div className="dasc-field"><label>Titre *</label>
                <input type="text" placeholder="Ex: Tournoi inter-promotion Football" value={form.titre} onChange={e=>setForm(f=>({...f,titre:e.target.value}))}/>
              </div>
              <div className="dasc-field-row">
                <div className="dasc-field"><label>Sport *</label>
                  <select value={form.sport} onChange={e=>setForm(f=>({...f,sport:e.target.value}))}>
                    {SPORTS.map(s=><option key={s} value={s}>{sportIcon(s)} {s}</option>)}
                  </select>
                </div>
                <div className="dasc-field"><label>Type</label>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                    {TYPES_COMP.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                </div>
              </div>
              <div className="dasc-field-row">
                <div className="dasc-field"><label>Date début *</label>
                  <input type="date" value={form.date_debut} onChange={e=>setForm(f=>({...f,date_debut:e.target.value}))}/>
                </div>
                <div className="dasc-field"><label>Date fin</label>
                  <input type="date" value={form.date_fin} onChange={e=>setForm(f=>({...f,date_fin:e.target.value}))}/>
                </div>
              </div>
              <div className="dasc-field-row">
                <div className="dasc-field"><label>Lieu</label>
                  <input type="text" placeholder="Stade, gymnase..." value={form.lieu} onChange={e=>setForm(f=>({...f,lieu:e.target.value}))}/>
                </div>
                <div className="dasc-field"><label>Statut</label>
                  <select value={form.statut} onChange={e=>setForm(f=>({...f,statut:e.target.value}))}>
                    {STATUTS.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </div>
              </div>
              <div className="dasc-field"><label>Description</label>
                <textarea value={form.description} placeholder="Détails de la compétition..." onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
              </div>
            </div>
            <div className="dasc-modal-footer">
              <button className="dasc-btn-cancel" onClick={()=>setModal(false)}>Annuler</button>
              <button className="dasc-btn-confirm" onClick={save} disabled={!form.titre||saving}>{saving?'…':'CRÉER'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ ONGLET ÉVÉNEMENTS CULTURELS ═════════════════════════════════════════════ */
const TabEvenements = ({soldiers, onToast}) => {
  const [evenements, setEvenements] = useState([]);
  const [modal,      setModal]      = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [form, setForm] = useState({titre:'',type:'Gala',date_evenement:new Date().toISOString().slice(0,10),lieu:'',description:'',statut:'planifie'});

  const load = useCallback(async()=>{
    try{const r=await api.get('/dasc/dashboard');setEvenements(r.data.data.evenements||[]);}
    catch(e){console.error(e);}
  },[]);
  useEffect(()=>{load();},[load]);

  const save = async()=>{
    if(!form.titre||!form.type){return;}
    setSaving(true);
    try{
      await api.post('/dasc/evenements',form);
      onToast({msg:'Événement créé !',icon:'🎭'});
      setModal(false); load();
    }catch(e){onToast({msg:'Erreur',icon:'❌'});}
    setSaving(false);
  };

  const supprimer = async(id)=>{
    try{await api.delete(`/dasc/evenements/${id}`);onToast({msg:'Supprimé',icon:'🗑️'});load();}
    catch(e){}
  };

  return (
    <div>
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}>
        <button className="dasc-btn-primary" onClick={()=>setModal(true)}>➕ Nouvel événement</button>
      </div>

      {evenements.length===0
        ? <div className="dasc-empty"><div className="dasc-empty-icon">🎭</div>Aucun événement enregistré</div>
        : <div className="dasc-evt-list">
            {evenements.map(e=>(
              <div key={e.id} className="dasc-evt-item" style={{cursor:'default'}}>
                <div className="dasc-evt-icon">{evtIcon(e.type)}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div className="dasc-evt-titre">{e.titre}</div>
                  <div className="dasc-evt-meta">{fmt(e.date_evenement)} · {e.nb_participants} participant(s){e.lieu?` · ${e.lieu}`:''}</div>
                  {e.description&&<div style={{fontSize:'.62rem',color:'var(--text-muted)',marginTop:3,fontStyle:'italic'}}>{e.description}</div>}
                </div>
                <span className="dasc-evt-type">{e.type}</span>
                <span className={`dasc-statut-badge statut-${e.statut}`}>{fmtStatut(e.statut)}</span>
                <button className="dasc-btn-danger" onClick={()=>supprimer(e.id)}>🗑️</button>
              </div>
            ))}
          </div>
      }

      {modal&&(
        <div className="dasc-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="dasc-modal">
            <div className="dasc-modal-header">
              <div className="dasc-modal-title">🎭 Nouvel événement culturel</div>
              <button className="dasc-modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="dasc-modal-body">
              <div className="dasc-field"><label>Titre *</label>
                <input type="text" placeholder="Ex: Gala de fin d'année" value={form.titre} onChange={e=>setForm(f=>({...f,titre:e.target.value}))}/>
              </div>
              <div className="dasc-field-row">
                <div className="dasc-field"><label>Type *</label>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                    {TYPES_EVT.map(t=><option key={t} value={t}>{evtIcon(t)} {t}</option>)}
                  </select>
                </div>
                <div className="dasc-field"><label>Statut</label>
                  <select value={form.statut} onChange={e=>setForm(f=>({...f,statut:e.target.value}))}>
                    {STATUTS.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
                  </select>
                </div>
              </div>
              <div className="dasc-field-row">
                <div className="dasc-field"><label>Date *</label>
                  <input type="date" value={form.date_evenement} onChange={e=>setForm(f=>({...f,date_evenement:e.target.value}))}/>
                </div>
                <div className="dasc-field"><label>Lieu</label>
                  <input type="text" placeholder="Salle des fêtes..." value={form.lieu} onChange={e=>setForm(f=>({...f,lieu:e.target.value}))}/>
                </div>
              </div>
              <div className="dasc-field"><label>Description</label>
                <textarea value={form.description} placeholder="Détails de l'événement..." onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
              </div>
            </div>
            <div className="dasc-modal-footer">
              <button className="dasc-btn-cancel" onClick={()=>setModal(false)}>Annuler</button>
              <button className="dasc-btn-confirm" onClick={save} disabled={!form.titre||saving}>{saving?'…':'CRÉER'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ PAGE PRINCIPALE ═════════════════════════════════════════════════════════ */
export default function DASC() {
  const [tab,      setTab]      = useState('dashboard');
  const [data,     setData]     = useState(null);
  const [soldiers, setSoldiers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);

  const load = useCallback(async()=>{
    setLoading(true);
    try{
      const [dash,sols]=await Promise.allSettled([
        api.get('/dasc/dashboard'),
        api.get('/soldiers'),
      ]);
      if(dash.status==='fulfilled') setData(dash.value.data.data);
      if(sols.status==='fulfilled') setSoldiers((sols.value.data.data||[]).filter(s=>s.statut==='actif'));
    }catch(e){console.error(e);}
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  return (
    <div className="dasc-page">
      {/* Header */}
      <div className="dasc-header">
        <div>
          <div className="dasc-eyebrow">G5C Armée · QG Command Center</div>
          <div className="dasc-title">Direction des Activités Sportives & Culturelles</div>
          <div className="dasc-subtitle">COMPÉTITIONS · ÉVÉNEMENTS · PALMARÈS</div>
        </div>
      </div>

      {/* Onglets */}
      <div className="dasc-main-tabs">
        {[
          {key:'dashboard',   label:'🏅 Tableau de bord'},
          {key:'competitions',label:'🏆 Compétitions'},
          {key:'evenements',  label:'🎭 Événements culturels'},
        ].map(t=>(
          <button key={t.key} className={`dasc-main-tab ${tab===t.key?'active':''}`} onClick={()=>setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {loading&&tab==='dashboard'
        ? <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'40vh'}}><div className="spinner"/></div>
        : <>
            {tab==='dashboard'    && <TabDashboard data={data} onVoirComp={c=>{setTab('competitions');}} onVoirEvt={()=>setTab('evenements')}/>}
            {tab==='competitions' && <TabCompetitions soldiers={soldiers} onToast={setToast}/>}
            {tab==='evenements'   && <TabEvenements soldiers={soldiers} onToast={setToast}/>}
          </>
      }

      {toast && <Toast msg={toast.msg} icon={toast.icon} onDone={()=>setToast(null)}/>}
    </div>
  );
}
