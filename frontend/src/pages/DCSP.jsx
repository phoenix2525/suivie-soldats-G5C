import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import '../styles/DCSP.css';

const PALIERS = ['Infanterie','Artillerie','Marine','Air'];
const PALIER_COLORS = { Infanterie:'#34d399', Artillerie:'#f59e0b', Marine:'#60a5fa', Air:'#a78bfa' };
const PALIER_ICONS  = { Infanterie:'🪖', Artillerie:'💣', Marine:'⚓', Air:'✈️' };
const TYPES_FORM = [{v:'initiale',l:'Initiale'},{v:'continue',l:'Continue'},{v:'specialisation',l:'Spécialisation'},{v:'perfectionnement',l:'Perfectionnement'},{v:'autre',l:'Autre'}];
const STATUTS_FORM = [{v:'en_cours',l:'En cours'},{v:'validee',l:'Validée'},{v:'echouee',l:'Échouée'},{v:'abandonnee',l:'Abandonnée'}];
const MENTIONS = ['Très bien','Bien','Assez bien','Passable','Insuffisant','Redoublant'];
const STATUTS_FICHE = [{v:'en_cours',l:'En cours'},{v:'valide',l:'Validé'},{v:'redoublant',l:'Redoublant'},{v:'abandonne',l:'Abandonné'}];

const fmt = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const noteColor = (n,s) => { if(!n||!s) return ''; const p=(n/s)*20; return p>=14?'dcsp-note-excellent':p>=12?'dcsp-note-bien':p>=10?'dcsp-note-moyen':'dcsp-note-insuffisant'; };
const typeIcon = t => ({initiale:'🎓',continue:'📚',specialisation:'🔬',perfectionnement:'⚡',autre:'📋'}[t]||'📋');
const statutLabel = s => ({en_cours:'En cours',validee:'Validée',echouee:'Échouée',abandonnee:'Abandonnée'}[s]||s);

const Av = ({p, size=36, color='#a78bfa'}) => {
  const prenom=p?.prenom||p?.cric_prenom||'?', nom=p?.nom||p?.cric_nom||'', photo=p?.photo_url;
  const st={width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,background:`${color}18`,border:`1px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.28,fontWeight:700,color};
  if(photo?.startsWith('data:')) return <div style={st}><img src={photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>;
  return <div style={st}>{prenom[0]}{nom[0]}</div>;
};

const Toast = ({msg,icon='✅',onDone}) => {
  useEffect(()=>{const t=setTimeout(onDone,2800);return()=>clearTimeout(t);},[onDone]);
  return <div className="dcsp-toast"><span>{icon}</span><span style={{color:'var(--text-primary)'}}>{msg}</span></div>;
};

const PatientSelect = ({soldiers,crics,soldierVal,cricVal,onSoldier,onCric,mode,onMode}) => (
  <div style={{display:'flex',flexDirection:'column',gap:8}}>
    <div style={{display:'flex',gap:6}}>
      {['soldat','cric'].map(m=>(
        <button key={m} onClick={()=>onMode(m)} style={{flex:1,padding:'7px',borderRadius:8,cursor:'pointer',fontSize:'.72rem',fontWeight:600,background:mode===m?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',border:mode===m?'1px solid rgba(167,139,250,.3)':'1px solid rgba(255,255,255,.09)',color:mode===m?'#a78bfa':'var(--text-muted)'}}>
          {m==='soldat'?'🪖 Soldat':'👤 CRIC'}
        </button>
      ))}
    </div>
    {mode==='soldat'
      ? <select value={soldierVal} onChange={e=>onSoldier(e.target.value)} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.09)',borderRadius:8,padding:'9px 13px',color:'var(--text-primary)',fontSize:'.76rem',outline:'none',width:'100%'}}>
          <option value="">— Sélectionner un soldat —</option>
          {soldiers.sort((a,b)=>a.nom.localeCompare(b.nom)).map(s=><option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.grade}</option>)}
        </select>
      : <select value={cricVal} onChange={e=>onCric(e.target.value)} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.09)',borderRadius:8,padding:'9px 13px',color:'var(--text-primary)',fontSize:'.76rem',outline:'none',width:'100%'}}>
          <option value="">— Sélectionner un CRIC —</option>
          {crics.sort((a,b)=>a.nom.localeCompare(b.nom)).map(c=><option key={c.id} value={c.id}>{c.prenom} {c.nom} · {c.matricule_etudiant}</option>)}
        </select>
    }
  </div>
);

/* ══ TAB DASHBOARD ══════════════════════════════════════════════════════════ */
const TabDashboard = ({data}) => {
  if(!data) return <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>Chargement...</div>;
  const st=data.stats||{};
  return (
    <div>
      <div className="dcsp-stats">
        {[
          {val:parseInt(st.total_soldats)||0,      lbl:'Soldats-étudiants', icon:'🪖', color:'#a78bfa', bar:'#7c3aed'},
          {val:parseInt(st.total_crics)||0,         lbl:'CRICs',            icon:'👤', color:'#60a5fa', bar:'#3b82f6'},
          {val:parseInt(st.total_formations)||0,    lbl:'Formations',       icon:'📚', color:'#34d399', bar:'#10b981'},
          {val:parseInt(st.certifications)||0,      lbl:'Certifications',   icon:'🏅', color:'#eab308', bar:'#eab308'},
          {val:parseFloat(st.moyenne_generale)||'—',lbl:'Moy. générale /20',icon:'📊', color:'#f59e0b', bar:'#d97706'},
        ].map((s,i)=>(
          <div key={i} className="dcsp-stat">
            <div className="dcsp-stat-bar" style={{background:s.bar}}/>
            <div className="dcsp-stat-icon">{s.icon}</div>
            <div className="dcsp-stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="dcsp-stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      <div className="dcsp-grid-2">
        <div className="dcsp-card">
          <div className="dcsp-card-title">📚 Formations récentes</div>
          {(!data.formations||data.formations.length===0)
            ? <div className="dcsp-empty"><div className="dcsp-empty-icon">📚</div>Aucune formation</div>
            : <div className="dcsp-form-list">
                {data.formations.slice(0,5).map(f=>(
                  <div key={f.id} className="dcsp-form-item">
                    <div className="dcsp-form-icon">{typeIcon(f.type_formation)}</div>
                    <Av p={f} size={32}/>
                    <div className="dcsp-form-info">
                      <div className="dcsp-form-titre">{f.intitule}</div>
                      <div className="dcsp-form-meta">{f.prenom} {f.nom} · {fmt(f.date_debut)}</div>
                    </div>
                    <span className={`dcsp-statut-badge dcsp-statut-${f.statut}`}>{statutLabel(f.statut)}</span>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Classement Génie en herbe */}
        <div className="dcsp-card">
          <div className="dcsp-card-title">🧠 Classement Génie en herbe</div>
          {(!data.classement||data.classement.length===0)
            ? <div className="dcsp-empty"><div className="dcsp-empty-icon">🧠</div>Aucun tournoi en cours</div>
            : <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {data.classement.map((e,i)=>{
                  const color=PALIER_COLORS[e.palier]||'#a78bfa';
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',background:'rgba(255,255,255,.025)',border:`1px solid ${color}25`,borderLeft:`3px solid ${color}`,borderRadius:10}}>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.2rem',fontWeight:900,color,width:28,textAlign:'center'}}>{i+1}</div>
                      <div style={{fontSize:'1.3rem'}}>{PALIER_ICONS[e.palier]}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'.82rem',fontWeight:700,color:'var(--text-primary)'}}>{e.palier}</div>
                        <div style={{fontSize:'.62rem',color:'var(--text-muted)'}}>{e.victoires}V · {e.nuls}N · {e.defaites}D</div>
                      </div>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.1rem',fontWeight:700,color}}>{e.score_total} pts</div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>

      {data.equipe?.length>0&&(
        <div className="dcsp-card" style={{marginTop:18}}>
          <div className="dcsp-card-title">👥 Équipe DCSP</div>
          <div className="dcsp-equipe-grid">
            {data.equipe.map(m=>{
              const isDir=m.fonction?.toLowerCase().includes('directeur');
              return (
                <div key={m.id} className={`dcsp-equipe-card ${isDir?'directeur':''}`}>
                  {isDir&&<div style={{fontSize:'.58rem',letterSpacing:'.2em',color:'#a78bfa',fontWeight:800}}>🎓 DIRECTEUR</div>}
                  <Av p={m} size={isDir?50:40} color={isDir?'#7c3aed':'#a78bfa'}/>
                  <div className="dcsp-equipe-name">{m.prenom} {m.nom}</div>
                  <div className="dcsp-equipe-grade">{m.grade}</div>
                  <div className="dcsp-equipe-fonction">{m.fonction||'Agent DCSP'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ TAB FORMATIONS ══════════════════════════════════════════════════════════ */
const TabFormations = ({soldiers,crics,onToast}) => {
  const [formations,setFormations]=useState([]);
  const [modal,setModal]=useState(false);
  const [editForm,setEditForm]=useState(null);
  const [saving,setSaving]=useState(false);
  const [search,setSearch]=useState('');
  const [mode,setMode]=useState('soldat');
  const INIT={soldier_id:'',cric_id:'',intitule:'',type_formation:'initiale',domaine:'',description:'',date_debut:new Date().toISOString().slice(0,10),date_fin:'',duree_heures:'',statut:'en_cours',note_finale:'',note_sur:20,appreciation:'',certifiante:false,certificat_obtenu:false,numero_certificat:'',organisme:'',formateur:'',lieu:''};
  const [form,setForm]=useState(INIT);

  const load=useCallback(async()=>{try{const r=await api.get('/dcsp/formations');setFormations(r.data.data||[]);}catch(e){}},[]);
  useEffect(()=>{load();},[load]);

  const save=async()=>{
    const payload={...form};
    if(mode==='soldat') delete payload.cric_id; else delete payload.soldier_id;
    if(!payload.intitule||!payload.date_debut) return;
    setSaving(true);
    try{
      if(editForm) await api.put(`/dcsp/formations/${editForm.id}`,payload);
      else await api.post('/dcsp/formations',payload);
      onToast({msg:editForm?'Formation modifiée !':'Formation créée !',icon:'📚'});
      setModal(false); load();
    }catch(e){onToast({msg:'Erreur',icon:'❌'});}
    setSaving(false);
  };

  const supprimer=async(id)=>{
    if(!window.confirm('Supprimer ?')) return;
    try{await api.delete(`/dcsp/formations/${id}`);onToast({msg:'Supprimée',icon:'🗑️'});load();}catch(e){}
  };

  const openEdit=(f)=>{
    setEditForm(f); setMode(f.soldier_id?'soldat':'cric');
    setForm({soldier_id:f.soldier_id||'',cric_id:f.cric_id||'',intitule:f.intitule||'',type_formation:f.type_formation||'initiale',domaine:f.domaine||'',description:f.description||'',date_debut:f.date_debut?.slice(0,10)||'',date_fin:f.date_fin?.slice(0,10)||'',duree_heures:f.duree_heures||'',statut:f.statut||'en_cours',note_finale:f.note_finale||'',note_sur:f.note_sur||20,appreciation:f.appreciation||'',certifiante:f.certifiante||false,certificat_obtenu:f.certificat_obtenu||false,numero_certificat:f.numero_certificat||'',organisme:f.organisme||'',formateur:f.formateur||'',lieu:f.lieu||''});
    setModal(true);
  };

  const displayed=formations.filter(f=>{const q=search.toLowerCase();return !q||f.intitule?.toLowerCase().includes(q)||f.prenom?.toLowerCase().includes(q)||f.nom?.toLowerCase().includes(q);});

  return (
    <div>
      <div style={{display:'flex',gap:12,marginBottom:16,alignItems:'center'}}>
        <input placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.09)',borderRadius:8,padding:'9px 14px',color:'var(--text-primary)',fontSize:'.76rem',outline:'none'}}/>
        <button className="dcsp-btn-primary" onClick={()=>{setEditForm(null);setForm(INIT);setMode('soldat');setModal(true);}}>➕ Nouvelle formation</button>
      </div>

      {displayed.length===0
        ? <div className="dcsp-empty"><div className="dcsp-empty-icon">📚</div>Aucune formation</div>
        : <div className="dcsp-form-list">
            {displayed.map(f=>(
              <div key={f.id} className="dcsp-form-item">
                <div className="dcsp-form-icon">{typeIcon(f.type_formation)}</div>
                <Av p={f.soldier_id?f:{prenom:f.cric_prenom,nom:f.cric_nom}} size={36}/>
                <div className="dcsp-form-info">
                  <div className="dcsp-form-titre">{f.intitule}</div>
                  <div className="dcsp-form-meta">
                    {f.soldier_id?`${f.prenom} ${f.nom} · ${f.grade}`:`${f.cric_prenom} ${f.cric_nom} (CRIC)`}
                    {' · '}{fmt(f.date_debut)}{f.organisme?` · ${f.organisme}`:''}
                  </div>
                </div>
                {f.certificat_obtenu&&<span className="dcsp-certif-badge">🏅 Certifié</span>}
                {f.note_finale&&<div className={`dcsp-note-badge ${noteColor(f.note_finale,f.note_sur)}`}>{f.note_finale}/{f.note_sur}</div>}
                <span className={`dcsp-statut-badge dcsp-statut-${f.statut}`}>{statutLabel(f.statut)}</span>
                <button className="dcsp-btn-secondary" style={{padding:'6px 10px',fontSize:'.7rem'}} onClick={()=>openEdit(f)}>✏️</button>
                <button className="dcsp-btn-danger" onClick={()=>supprimer(f.id)}>🗑️</button>
              </div>
            ))}
          </div>
      }

      {modal&&(
        <div className="dcsp-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="dcsp-modal">
            <div className="dcsp-modal-header">
              <div className="dcsp-modal-title">{editForm?'✏️ Modifier':'📚 Nouvelle formation'}</div>
              <button className="dcsp-modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="dcsp-modal-body">
              {!editForm&&<PatientSelect soldiers={soldiers} crics={crics} soldierVal={form.soldier_id} cricVal={form.cric_id} onSoldier={v=>setForm(f=>({...f,soldier_id:v}))} onCric={v=>setForm(f=>({...f,cric_id:v}))} mode={mode} onMode={setMode}/>}
              <div className="dcsp-field"><label>Intitulé *</label><input value={form.intitule} onChange={e=>setForm(f=>({...f,intitule:e.target.value}))} placeholder="Ex: Formation commandement"/></div>
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Type</label><select value={form.type_formation} onChange={e=>setForm(f=>({...f,type_formation:e.target.value}))}>{TYPES_FORM.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
                <div className="dcsp-field"><label>Domaine</label><input value={form.domaine} onChange={e=>setForm(f=>({...f,domaine:e.target.value}))} placeholder="Ex: Leadership..."/></div>
              </div>
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Date début *</label><input type="date" value={form.date_debut} onChange={e=>setForm(f=>({...f,date_debut:e.target.value}))}/></div>
                <div className="dcsp-field"><label>Date fin</label><input type="date" value={form.date_fin} onChange={e=>setForm(f=>({...f,date_fin:e.target.value}))}/></div>
              </div>
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Statut</label><select value={form.statut} onChange={e=>setForm(f=>({...f,statut:e.target.value}))}>{STATUTS_FORM.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}</select></div>
                <div className="dcsp-field"><label>Durée (h)</label><input type="number" value={form.duree_heures} onChange={e=>setForm(f=>({...f,duree_heures:e.target.value}))} placeholder="Ex: 40"/></div>
              </div>
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Note</label><input type="number" step="0.01" value={form.note_finale} onChange={e=>setForm(f=>({...f,note_finale:e.target.value}))} placeholder="Ex: 15.5"/></div>
                <div className="dcsp-field"><label>Sur</label><input type="number" value={form.note_sur} onChange={e=>setForm(f=>({...f,note_sur:e.target.value}))}/></div>
              </div>
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Organisme</label><input value={form.organisme} onChange={e=>setForm(f=>({...f,organisme:e.target.value}))} placeholder="Ex: UCAD..."/></div>
                <div className="dcsp-field"><label>Formateur</label><input value={form.formateur} onChange={e=>setForm(f=>({...f,formateur:e.target.value}))}/></div>
              </div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                {[['certifiante','🎓 Certifiante'],['certificat_obtenu','🏅 Certificat obtenu']].map(([k,l])=>(
                  <label key={k} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:'.76rem',color:'var(--text-secondary)'}}>
                    <input type="checkbox" checked={form[k]||false} onChange={e=>setForm(f=>({...f,[k]:e.target.checked}))} style={{width:16,height:16,accentColor:'#a78bfa'}}/>{l}
                  </label>
                ))}
              </div>
              {form.certificat_obtenu&&<div className="dcsp-field"><label>N° Certificat</label><input value={form.numero_certificat} onChange={e=>setForm(f=>({...f,numero_certificat:e.target.value}))} placeholder="CERT-2024-001"/></div>}
              <div className="dcsp-field"><label>Description</label><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Détails..."/></div>
            </div>
            <div className="dcsp-modal-footer">
              <button className="dcsp-btn-cancel" onClick={()=>setModal(false)}>Annuler</button>
              <button className="dcsp-btn-confirm" onClick={save} disabled={!form.intitule||saving}>{saving?'…':editForm?'MODIFIER':'CRÉER'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ TAB RÉSULTATS ACADÉMIQUES ═══════════════════════════════════════════════ */
const TabFiches = ({soldiers,crics,onToast}) => {
  const [fiches,setFiches]=useState([]);
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [search,setSearch]=useState('');
  const [mode,setMode]=useState('soldat');
  const [pdfViewer,setPdfViewer]=useState(null);
  const releveRef=useRef(null);
  const attestRef=useRef(null);
  const [form,setForm]=useState({soldier_id:'',cric_id:'',annee_academique:'2025-2026',moyenne_annuelle:'',mention:'',statut:'en_cours',observations:'',releve_notes:null,attestation:null});

  const load=useCallback(async()=>{try{const r=await api.get('/dcsp/fiches');setFiches(r.data.data||[]);}catch(e){}},[]);
  useEffect(()=>{load();},[load]);

  const lirePDF=(file,champ)=>{
    const reader=new FileReader();
    reader.onload=e=>setForm(f=>({...f,[champ]:e.target.result}));
    reader.readAsDataURL(file);
  };

  const save=async()=>{
    const payload={...form};
    if(mode==='soldat') delete payload.cric_id; else delete payload.soldier_id;
    if(!payload.annee_academique) return;
    setSaving(true);
    try{
      await api.post('/dcsp/fiches',payload);
      onToast({msg:'Fiche académique enregistrée !',icon:'📄'});
      setModal(false); load();
    }catch(e){onToast({msg:'Erreur : '+e.response?.data?.message,icon:'❌'});}
    setSaving(false);
  };

  const supprimer=async(id)=>{
    if(!window.confirm('Supprimer cette fiche ?')) return;
    try{await api.delete(`/dcsp/fiches/${id}`);onToast({msg:'Supprimée',icon:'🗑️'});load();}catch(e){}
  };

  const voirPDF=async(id,type)=>{
    try{
      const r=await api.get(`/dcsp/fiches/${id}/pdf/${type}`);
      setPdfViewer({data:r.data.data,titre:type==='releve'?'Relevé de notes':'Attestation de scolarité'});
    }catch(e){onToast({msg:'Document introuvable',icon:'❌'});}
  };

  const mentionColor=m=>({
    'Très bien':'#34d399','Bien':'#60a5fa','Assez bien':'#a78bfa',
    'Passable':'#f59e0b','Insuffisant':'#ef4444','Redoublant':'#f97316'
  }[m]||'var(--text-muted)');

  const displayed=fiches.filter(f=>{const q=search.toLowerCase();return !q||f.prenom?.toLowerCase().includes(q)||f.nom?.toLowerCase().includes(q)||f.cric_prenom?.toLowerCase().includes(q)||f.annee_academique?.includes(q);});

  return (
    <div>
      <div style={{display:'flex',gap:12,marginBottom:16,alignItems:'center'}}>
        <input placeholder="🔍 Rechercher..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.09)',borderRadius:8,padding:'9px 14px',color:'var(--text-primary)',fontSize:'.76rem',outline:'none'}}/>
        <button className="dcsp-btn-primary" onClick={()=>{setForm({soldier_id:'',cric_id:'',annee_academique:'2025-2026',moyenne_annuelle:'',mention:'',statut:'en_cours',observations:'',releve_notes:null,attestation:null});setMode('soldat');setModal(true);}}>➕ Nouvelle fiche</button>
      </div>

      {displayed.length===0
        ? <div className="dcsp-empty"><div className="dcsp-empty-icon">📄</div>Aucune fiche académique</div>
        : <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {displayed.map(f=>{
              const prenom=f.soldier_id?f.prenom:f.cric_prenom, nom=f.soldier_id?f.nom:f.cric_nom;
              const grade=f.soldier_id?f.grade:'CRIC';
              const mColor=mentionColor(f.mention);
              return (
                <div key={f.id} className="dcsp-form-item" style={{gap:14}}>
                  <Av p={{prenom,nom,photo_url:f.photo_url}} size={42}/>
                  <div className="dcsp-form-info">
                    <div className="dcsp-form-titre">{prenom} {nom}</div>
                    <div className="dcsp-form-meta">{grade} · Année {f.annee_academique}</div>
                  </div>

                  {f.moyenne_annuelle&&(
                    <div style={{textAlign:'center'}}>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.3rem',fontWeight:900,color:f.moyenne_annuelle>=10?'#34d399':'#ef4444'}}>{f.moyenne_annuelle}</div>
                      <div style={{fontSize:'.55rem',color:'var(--text-muted)',letterSpacing:'.1em'}}>MOYENNE /20</div>
                    </div>
                  )}

                  {f.mention&&<span style={{fontSize:'.68rem',fontWeight:700,padding:'3px 10px',borderRadius:6,background:`${mColor}15`,color:mColor,border:`1px solid ${mColor}30`}}>{f.mention}</span>}

                  <div style={{display:'flex',gap:6}}>
                    {f.has_releve&&<button onClick={()=>voirPDF(f.id,'releve')} style={{background:'rgba(96,165,250,.1)',border:'1px solid rgba(96,165,250,.2)',color:'#60a5fa',borderRadius:6,padding:'5px 10px',fontSize:'.65rem',fontWeight:700,cursor:'pointer'}}>📄 Relevé</button>}
                    {f.has_attestation&&<button onClick={()=>voirPDF(f.id,'attestation')} style={{background:'rgba(52,211,153,.1)',border:'1px solid rgba(52,211,153,.2)',color:'#34d399',borderRadius:6,padding:'5px 10px',fontSize:'.65rem',fontWeight:700,cursor:'pointer'}}>📜 Attestation</button>}
                  </div>

                  <span className={`dcsp-statut-badge dcsp-statut-${f.statut}`}>{STATUTS_FICHE.find(s=>s.v===f.statut)?.l||f.statut}</span>
                  <button className="dcsp-btn-danger" onClick={()=>supprimer(f.id)}>🗑️</button>
                </div>
              );
            })}
          </div>
      }

      {/* Modal nouvelle fiche */}
      {modal&&(
        <div className="dcsp-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="dcsp-modal">
            <div className="dcsp-modal-header">
              <div className="dcsp-modal-title">📄 Nouvelle fiche académique</div>
              <button className="dcsp-modal-close" onClick={()=>setModal(false)}>✕</button>
            </div>
            <div className="dcsp-modal-body">
              <PatientSelect soldiers={soldiers} crics={crics} soldierVal={form.soldier_id} cricVal={form.cric_id} onSoldier={v=>setForm(f=>({...f,soldier_id:v}))} onCric={v=>setForm(f=>({...f,cric_id:v}))} mode={mode} onMode={setMode}/>
              <div className="dcsp-field"><label>Année académique *</label>
                <input value={form.annee_academique} onChange={e=>setForm(f=>({...f,annee_academique:e.target.value}))} placeholder="Ex: 2025-2026"/>
              </div>
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Moyenne annuelle /20</label>
                  <input type="number" step="0.01" min="0" max="20" value={form.moyenne_annuelle} onChange={e=>setForm(f=>({...f,moyenne_annuelle:e.target.value}))} placeholder="Ex: 14.5"/>
                </div>
                <div className="dcsp-field"><label>Mention</label>
                  <select value={form.mention} onChange={e=>setForm(f=>({...f,mention:e.target.value}))}>
                    <option value="">— Auto —</option>
                    {MENTIONS.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="dcsp-field"><label>Statut</label>
                <select value={form.statut} onChange={e=>setForm(f=>({...f,statut:e.target.value}))}>
                  {STATUTS_FICHE.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </div>

              {/* Upload PDFs */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="dcsp-field">
                  <label>📄 Relevé de notes (PDF)</label>
                  <input ref={releveRef} type="file" accept="application/pdf" style={{display:'none'}} onChange={e=>e.target.files[0]&&lirePDF(e.target.files[0],'releve_notes')}/>
                  <button onClick={()=>releveRef.current?.click()} style={{background:'rgba(96,165,250,.08)',border:'1px dashed rgba(96,165,250,.3)',borderRadius:8,padding:'10px',color:'#60a5fa',cursor:'pointer',fontSize:'.72rem',width:'100%',textAlign:'center'}}>
                    {form.releve_notes?'✅ PDF chargé':'📁 Choisir un PDF'}
                  </button>
                </div>
                <div className="dcsp-field">
                  <label>📜 Attestation (PDF)</label>
                  <input ref={attestRef} type="file" accept="application/pdf" style={{display:'none'}} onChange={e=>e.target.files[0]&&lirePDF(e.target.files[0],'attestation')}/>
                  <button onClick={()=>attestRef.current?.click()} style={{background:'rgba(52,211,153,.08)',border:'1px dashed rgba(52,211,153,.3)',borderRadius:8,padding:'10px',color:'#34d399',cursor:'pointer',fontSize:'.72rem',width:'100%',textAlign:'center'}}>
                    {form.attestation?'✅ PDF chargé':'📁 Choisir un PDF'}
                  </button>
                </div>
              </div>

              <div className="dcsp-field"><label>Observations</label>
                <textarea value={form.observations} onChange={e=>setForm(f=>({...f,observations:e.target.value}))} placeholder="Remarques..."/>
              </div>
            </div>
            <div className="dcsp-modal-footer">
              <button className="dcsp-btn-cancel" onClick={()=>setModal(false)}>Annuler</button>
              <button className="dcsp-btn-confirm" onClick={save} disabled={(!form.soldier_id&&!form.cric_id)||saving}>{saving?'…':'ENREGISTRER'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Visionneuse PDF */}
      {pdfViewer&&(
        <div className="dcsp-overlay" onClick={e=>e.target===e.currentTarget&&setPdfViewer(null)}>
          <div style={{background:'#0d0e12',border:'1px solid rgba(167,139,250,.2)',borderRadius:16,width:'100%',maxWidth:900,height:'90vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 80px rgba(0,0,0,.6)'}}>
            <div style={{padding:'16px 24px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:'.8rem',letterSpacing:'.18em',color:'#a78bfa',textTransform:'uppercase'}}>{pdfViewer.titre}</div>
              <div style={{display:'flex',gap:8}}>
                <a href={pdfViewer.data} download={`${pdfViewer.titre}.pdf`} style={{background:'rgba(96,165,250,.1)',border:'1px solid rgba(96,165,250,.3)',color:'#60a5fa',borderRadius:7,padding:'6px 14px',fontSize:'.72rem',fontWeight:700,textDecoration:'none'}}>⬇️ Télécharger</a>
                <button onClick={()=>setPdfViewer(null)} style={{background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:'1.1rem',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6}}>✕</button>
              </div>
            </div>
            <iframe src={pdfViewer.data} style={{flex:1,border:'none',background:'#fff'}} title={pdfViewer.titre}/>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ TAB GÉNIE EN HERBE ══════════════════════════════════════════════════════ */
const TabGenie = ({soldiers,onToast}) => {
  const [genieData,setGenieData]=useState({tournois:[],equipes:[],matchs:[]});
  const [activeTournoi,setActiveTournoi]=useState(null);
  const [modalTournoi,setModalTournoi]=useState(false);
  const [modalMatch,setModalMatch]=useState(false);
  const [modalMembres,setModalMembres]=useState(null);
  const [saving,setSaving]=useState(false);
  const [membres,setMembres]=useState([]);
  const [formTournoi,setFormTournoi]=useState({titre:'',annee:new Date().getFullYear(),description:'',date_debut:'',date_fin:''});
  const [formMatch,setFormMatch]=useState({equipe1_id:'',equipe2_id:'',score1:0,score2:0,phase:'poule',date_match:'',lieu:'',observations:''});

  const load=useCallback(async()=>{
    try{
      const r=await api.get('/dcsp/genie');
      setGenieData(r.data.data||{tournois:[],equipes:[],matchs:[]});
    }catch(e){}
  },[]);
  useEffect(()=>{load();},[load]);

  const loadMembres=async(equipeId)=>{
    try{const r=await api.get(`/dcsp/genie/equipes/${equipeId}/membres`);setMembres(r.data.data||[]);}catch(e){}
  };

  const creerTournoi=async()=>{
    if(!formTournoi.titre) return;
    setSaving(true);
    try{
      await api.post('/dcsp/genie/tournois',formTournoi);
      onToast({msg:'Tournoi créé avec 4 équipes !',icon:'🧠'});
      setModalTournoi(false); load();
    }catch(e){onToast({msg:'Erreur',icon:'❌'});}
    setSaving(false);
  };

  const majStatut=async(id,statut)=>{
    try{await api.put(`/dcsp/genie/tournois/${id}`,{statut});load();}catch(e){}
  };

  const supprimerTournoi=async(id)=>{
    if(!window.confirm('Supprimer ce tournoi ?')) return;
    try{await api.delete(`/dcsp/genie/tournois/${id}`);if(activeTournoi?.id===id)setActiveTournoi(null);load();}catch(e){}
  };

  const enregistrerMatch=async()=>{
    if(!formMatch.equipe1_id||!formMatch.equipe2_id) return;
    setSaving(true);
    try{
      await api.post('/dcsp/genie/matchs',{...formMatch,tournoi_id:activeTournoi.id,statut:'joue'});
      onToast({msg:'Match enregistré !',icon:'⚔️'});
      setModalMatch(false); load();
    }catch(e){onToast({msg:'Erreur',icon:'❌'});}
    setSaving(false);
  };

  const ajouterMembre=async(equipeId,soldierId)=>{
    try{await api.post(`/dcsp/genie/equipes/${equipeId}/membres`,{soldier_id:soldierId,role:'membre'});loadMembres(equipeId);}catch(e){}
  };

  const retirerMembre=async(equipeId,soldierId)=>{
    try{await api.delete(`/dcsp/genie/equipes/${equipeId}/membres/${soldierId}`);loadMembres(equipeId);}catch(e){}
  };

  const tournoiEquipes=activeTournoi?genieData.equipes.filter(e=>e.tournoi_id===activeTournoi.id):[];
  const tournoiMatchs=activeTournoi?genieData.matchs.filter(m=>m.tournoi_id===activeTournoi.id):[];
  const sortedEquipes=[...tournoiEquipes].sort((a,b)=>b.score_total-a.score_total);

  return (
    <div>
      {/* Liste des tournois */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:12}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {genieData.tournois.map(t=>(
            <button key={t.id} onClick={()=>setActiveTournoi(t)}
              style={{padding:'8px 16px',borderRadius:9,fontSize:'.75rem',fontWeight:700,cursor:'pointer',background:activeTournoi?.id===t.id?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',border:activeTournoi?.id===t.id?'1px solid rgba(167,139,250,.35)':'1px solid rgba(255,255,255,.09)',color:activeTournoi?.id===t.id?'#a78bfa':'var(--text-muted)'}}>
              🏆 {t.titre} <span style={{opacity:.6,fontSize:'.62rem',marginLeft:4}}>{t.statut}</span>
            </button>
          ))}
        </div>
        <button className="dcsp-btn-primary" onClick={()=>{setFormTournoi({titre:'',annee:new Date().getFullYear(),description:'',date_debut:'',date_fin:''});setModalTournoi(true);}}>🏆 Nouveau tournoi</button>
      </div>

      {!activeTournoi
        ? <div className="dcsp-empty"><div className="dcsp-empty-icon">🧠</div>{genieData.tournois.length===0?'Aucun tournoi créé — commencez par créer un tournoi !':'Sélectionnez un tournoi ci-dessus'}</div>
        : <>
            {/* En-tête tournoi */}
            <div className="dcsp-card" style={{marginBottom:18,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:'1rem',fontWeight:700,color:'var(--text-primary)'}}>{activeTournoi.titre}</div>
                <div style={{fontSize:'.68rem',color:'var(--text-muted)',marginTop:4}}>
                  {activeTournoi.date_debut?`${fmt(activeTournoi.date_debut)} → ${fmt(activeTournoi.date_fin)||'...'}`:''} · {activeTournoi.annee}
                </div>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[{v:'planifie',l:'📋 Planifié'},{v:'en_cours',l:'▶️ En cours'},{v:'termine',l:'🏁 Terminé'}].map(s=>(
                  <button key={s.v} onClick={()=>{majStatut(activeTournoi.id,s.v);setActiveTournoi(t=>({...t,statut:s.v}));}}
                    style={{padding:'6px 12px',borderRadius:7,fontSize:'.7rem',fontWeight:700,cursor:'pointer',background:activeTournoi.statut===s.v?'rgba(167,139,250,.15)':'rgba(255,255,255,.04)',border:activeTournoi.statut===s.v?'1px solid rgba(167,139,250,.3)':'1px solid rgba(255,255,255,.08)',color:activeTournoi.statut===s.v?'#a78bfa':'var(--text-muted)'}}>
                    {s.l}
                  </button>
                ))}
                <button className="dcsp-btn-primary" onClick={()=>setModalMatch(true)} disabled={tournoiEquipes.length<2}>⚔️ Ajouter un match</button>
                <button className="dcsp-btn-danger" onClick={()=>supprimerTournoi(activeTournoi.id)} style={{padding:'6px 10px'}}>🗑️</button>
              </div>
            </div>

            <div className="dcsp-grid-2">
              {/* Classement */}
              <div className="dcsp-card">
                <div className="dcsp-card-title">🏆 Classement des paliers</div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {sortedEquipes.map((e,i)=>{
                    const color=PALIER_COLORS[e.palier]||'#a78bfa';
                    const total=(e.victoires||0)+(e.defaites||0)+(e.nuls||0);
                    return (
                      <div key={e.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:`${color}08`,border:`1px solid ${color}20`,borderLeft:`3px solid ${color}`,borderRadius:10,cursor:'pointer',transition:'all .2s'}}
                        onClick={()=>{setModalMembres(e);loadMembres(e.id);}}>
                        <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.3rem',fontWeight:900,color,width:30,textAlign:'center'}}>{i+1}</div>
                        <div style={{fontSize:'1.5rem'}}>{PALIER_ICONS[e.palier]}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'.85rem',fontWeight:700,color:'var(--text-primary)'}}>{e.palier}</div>
                          <div style={{fontSize:'.62rem',color:'var(--text-muted)',marginTop:2}}>
                            {e.victoires||0}V · {e.nuls||0}N · {e.defaites||0}D · {parseInt(e.nb_membres)||0} membres
                          </div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.4rem',fontWeight:900,color}}>{e.score_total||0}</div>
                          <div style={{fontSize:'.55rem',color:'var(--text-muted)',letterSpacing:'.1em'}}>POINTS</div>
                        </div>
                      </div>
                    );
                  })}
                  {sortedEquipes.length===0&&<div className="dcsp-empty"><div className="dcsp-empty-icon">⚖️</div>Classement en attente des matchs</div>}
                </div>
              </div>

              {/* Historique des matchs */}
              <div className="dcsp-card">
                <div className="dcsp-card-title">⚔️ Résultats des matchs</div>
                {tournoiMatchs.length===0
                  ? <div className="dcsp-empty"><div className="dcsp-empty-icon">⚔️</div>Aucun match enregistré</div>
                  : <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {tournoiMatchs.map(m=>{
                        const c1=PALIER_COLORS[m.palier1]||'#a78bfa', c2=PALIER_COLORS[m.palier2]||'#a78bfa';
                        const gagnant=m.score1>m.score2?m.palier1:m.score2>m.score1?m.palier2:'Nul';
                        return (
                          <div key={m.id} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:'rgba(255,255,255,.025)',border:'1px solid rgba(255,255,255,.07)',borderRadius:10}}>
                            <div style={{flex:1,textAlign:'center'}}>
                              <div style={{fontSize:'.75rem',fontWeight:700,color:c1}}>{PALIER_ICONS[m.palier1]} {m.palier1}</div>
                            </div>
                            <div style={{textAlign:'center',minWidth:80}}>
                              <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.2rem',fontWeight:900,color:'var(--text-primary)'}}>{m.score1} — {m.score2}</div>
                              <div style={{fontSize:'.58rem',color:'var(--text-muted)',letterSpacing:'.1em'}}>{m.phase}</div>
                            </div>
                            <div style={{flex:1,textAlign:'center'}}>
                              <div style={{fontSize:'.75rem',fontWeight:700,color:c2}}>{PALIER_ICONS[m.palier2]} {m.palier2}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                }
              </div>
            </div>
          </>
      }

      {/* Modal nouveau tournoi */}
      {modalTournoi&&(
        <div className="dcsp-overlay" onClick={e=>e.target===e.currentTarget&&setModalTournoi(false)}>
          <div className="dcsp-modal" style={{maxWidth:460}}>
            <div className="dcsp-modal-header">
              <div className="dcsp-modal-title">🏆 Nouveau tournoi Génie en herbe</div>
              <button className="dcsp-modal-close" onClick={()=>setModalTournoi(false)}>✕</button>
            </div>
            <div className="dcsp-modal-body">
              <div style={{background:'rgba(167,139,250,.06)',border:'1px solid rgba(167,139,250,.15)',borderRadius:10,padding:'12px 16px',fontSize:'.72rem',color:'var(--text-muted)'}}>
                ℹ️ Les 4 équipes (Infanterie, Artillerie, Marine, Air) seront créées automatiquement.
              </div>
              <div className="dcsp-field"><label>Titre *</label><input value={formTournoi.titre} onChange={e=>setFormTournoi(f=>({...f,titre:e.target.value}))} placeholder="Ex: Tournoi Génie en herbe 2025"/></div>
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Année</label><input type="number" value={formTournoi.annee} onChange={e=>setFormTournoi(f=>({...f,annee:e.target.value}))}/></div>
              </div>
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Date début</label><input type="date" value={formTournoi.date_debut} onChange={e=>setFormTournoi(f=>({...f,date_debut:e.target.value}))}/></div>
                <div className="dcsp-field"><label>Date fin</label><input type="date" value={formTournoi.date_fin} onChange={e=>setFormTournoi(f=>({...f,date_fin:e.target.value}))}/></div>
              </div>
              <div className="dcsp-field"><label>Description</label><textarea value={formTournoi.description} onChange={e=>setFormTournoi(f=>({...f,description:e.target.value}))} placeholder="Règlement, format..."/></div>

              {/* Aperçu des équipes */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {PALIERS.map(p=>(
                  <div key={p} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:`${PALIER_COLORS[p]}10`,border:`1px solid ${PALIER_COLORS[p]}25`,borderRadius:8}}>
                    <span style={{fontSize:'1.2rem'}}>{PALIER_ICONS[p]}</span>
                    <span style={{fontSize:'.75rem',fontWeight:700,color:PALIER_COLORS[p]}}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dcsp-modal-footer">
              <button className="dcsp-btn-cancel" onClick={()=>setModalTournoi(false)}>Annuler</button>
              <button className="dcsp-btn-confirm" onClick={creerTournoi} disabled={!formTournoi.titre||saving}>{saving?'…':'CRÉER'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ajouter match */}
      {modalMatch&&activeTournoi&&(
        <div className="dcsp-overlay" onClick={e=>e.target===e.currentTarget&&setModalMatch(false)}>
          <div className="dcsp-modal" style={{maxWidth:480}}>
            <div className="dcsp-modal-header">
              <div className="dcsp-modal-title">⚔️ Enregistrer un match</div>
              <button className="dcsp-modal-close" onClick={()=>setModalMatch(false)}>✕</button>
            </div>
            <div className="dcsp-modal-body">
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Équipe 1 *</label>
                  <select value={formMatch.equipe1_id} onChange={e=>setFormMatch(f=>({...f,equipe1_id:e.target.value}))}>
                    <option value="">— Palier —</option>
                    {tournoiEquipes.map(e=><option key={e.id} value={e.id}>{PALIER_ICONS[e.palier]} {e.palier}</option>)}
                  </select>
                </div>
                <div className="dcsp-field"><label>Équipe 2 *</label>
                  <select value={formMatch.equipe2_id} onChange={e=>setFormMatch(f=>({...f,equipe2_id:e.target.value}))}>
                    <option value="">— Palier —</option>
                    {tournoiEquipes.filter(e=>e.id!==parseInt(formMatch.equipe1_id)).map(e=><option key={e.id} value={e.id}>{PALIER_ICONS[e.palier]} {e.palier}</option>)}
                  </select>
                </div>
              </div>
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Score Équipe 1 *</label><input type="number" min="0" value={formMatch.score1} onChange={e=>setFormMatch(f=>({...f,score1:e.target.value}))}/></div>
                <div className="dcsp-field"><label>Score Équipe 2 *</label><input type="number" min="0" value={formMatch.score2} onChange={e=>setFormMatch(f=>({...f,score2:e.target.value}))}/></div>
              </div>
              <div className="dcsp-field-row">
                <div className="dcsp-field"><label>Phase</label>
                  <select value={formMatch.phase} onChange={e=>setFormMatch(f=>({...f,phase:e.target.value}))}>
                    {['poule','quart','demi','finale','petit-final'].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                </div>
                <div className="dcsp-field"><label>Date</label><input type="date" value={formMatch.date_match} onChange={e=>setFormMatch(f=>({...f,date_match:e.target.value}))}/></div>
              </div>
              <div className="dcsp-field"><label>Lieu</label><input value={formMatch.lieu} onChange={e=>setFormMatch(f=>({...f,lieu:e.target.value}))} placeholder="Ex: Salle des conférences"/></div>
              <div className="dcsp-field"><label>Observations</label><textarea value={formMatch.observations} onChange={e=>setFormMatch(f=>({...f,observations:e.target.value}))} placeholder="Notes sur le match..."/></div>
            </div>
            <div className="dcsp-modal-footer">
              <button className="dcsp-btn-cancel" onClick={()=>setModalMatch(false)}>Annuler</button>
              <button className="dcsp-btn-confirm" onClick={enregistrerMatch} disabled={!formMatch.equipe1_id||!formMatch.equipe2_id||saving}>{saving?'…':'ENREGISTRER'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestion membres */}
      {modalMembres&&(
        <div className="dcsp-overlay" onClick={e=>e.target===e.currentTarget&&setModalMembres(null)}>
          <div className="dcsp-modal" style={{maxWidth:500}}>
            <div className="dcsp-modal-header">
              <div className="dcsp-modal-title">{PALIER_ICONS[modalMembres.palier]} Équipe {modalMembres.palier} — Membres</div>
              <button className="dcsp-modal-close" onClick={()=>setModalMembres(null)}>✕</button>
            </div>
            <div className="dcsp-modal-body">
              {/* Ajouter capitaine */}
              <div className="dcsp-field">
                <label>Capitaine</label>
                <select value={modalMembres.capitaine_id||''} onChange={async e=>{
                  await api.put(`/dcsp/genie/equipes/${modalMembres.id}`,{capitaine_id:e.target.value||null});
                  setModalMembres(m=>({...m,capitaine_id:e.target.value})); load();
                }}>
                  <option value="">— Aucun —</option>
                  {membres.map(m=><option key={m.soldier_id} value={m.soldier_id}>{m.prenom} {m.nom}</option>)}
                </select>
              </div>

              {/* Liste membres */}
              <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:200,overflowY:'auto'}}>
                {membres.map(m=>(
                  <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',background:'rgba(255,255,255,.025)',borderRadius:8}}>
                    <Av p={m} size={32} color={PALIER_COLORS[modalMembres.palier]}/>
                    <div style={{flex:1}}><div style={{fontSize:'.78rem',fontWeight:600,color:'var(--text-primary)'}}>{m.prenom} {m.nom}</div><div style={{fontSize:'.62rem',color:'var(--text-muted)'}}>{m.grade}</div></div>
                    <button onClick={()=>retirerMembre(modalMembres.id,m.soldier_id)} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:'.75rem'}}>✕</button>
                  </div>
                ))}
                {membres.length===0&&<div style={{textAlign:'center',color:'var(--text-muted)',fontSize:'.75rem',padding:'16px'}}>Aucun membre</div>}
              </div>

              {/* Ajouter membre */}
              <div className="dcsp-field">
                <label>Ajouter un soldat</label>
                <select defaultValue="" onChange={e=>{if(e.target.value){ajouterMembre(modalMembres.id,e.target.value);e.target.value='';}}}>
                  <option value="">— Sélectionner —</option>
                  {soldiers.filter(s=>!membres.find(m=>m.soldier_id===s.id)).sort((a,b)=>a.nom.localeCompare(b.nom)).map(s=>(
                    <option key={s.id} value={s.id}>{s.prenom} {s.nom} · {s.grade}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="dcsp-modal-footer">
              <button className="dcsp-btn-confirm" onClick={()=>setModalMembres(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ══ PAGE PRINCIPALE ═════════════════════════════════════════════════════════ */
export default function DCSP() {
  const [tab,setTab]=useState('dashboard');
  const [data,setData]=useState(null);
  const [soldiers,setSoldiers]=useState([]);
  const [crics,setCrics]=useState([]);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const [dash,sols,crs]=await Promise.allSettled([api.get('/dcsp/dashboard'),api.get('/soldiers'),api.get('/crics')]);
      if(dash.status==='fulfilled') setData(dash.value.data.data);
      if(sols.status==='fulfilled') setSoldiers((sols.value.data.data||[]).filter(s=>s.statut==='actif'));
      if(crs.status==='fulfilled')  setCrics(crs.value.data.data||[]);
    }catch(e){}
    setLoading(false);
  },[]);

  useEffect(()=>{load();},[load]);

  return (
    <div className="dcsp-page">
      <div className="dcsp-header">
        <div>
          <div className="dcsp-eyebrow">G5C Armée · QG Command Center</div>
          <div className="dcsp-title">Direction du Contrôle & Suivi Pédagogique</div>
          <div className="dcsp-subtitle">FORMATIONS · RÉSULTATS ACADÉMIQUES · GÉNIE EN HERBE</div>
        </div>
      </div>

      <div className="dcsp-main-tabs">
        {[
          {key:'dashboard',  label:'📊 Tableau de bord'},
          {key:'formations', label:'📚 Formations'},
          {key:'fiches',     label:'📄 Résultats académiques'},
          {key:'genie',      label:'🧠 Génie en herbe'},
        ].map(t=>(
          <button key={t.key} className={`dcsp-main-tab ${tab===t.key?'active':''}`} onClick={()=>setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading&&tab==='dashboard'
        ? <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'40vh'}}><div className="spinner"/></div>
        : <>
            {tab==='dashboard'  && <TabDashboard data={data}/>}
            {tab==='formations' && <TabFormations soldiers={soldiers} crics={crics} onToast={setToast}/>}
            {tab==='fiches'     && <TabFiches soldiers={soldiers} crics={crics} onToast={setToast}/>}
            {tab==='genie'      && <TabGenie soldiers={soldiers} onToast={setToast}/>}
          </>
      }

      {toast&&<Toast msg={toast.msg} icon={toast.icon} onDone={()=>setToast(null)}/>}
    </div>
  );
}
