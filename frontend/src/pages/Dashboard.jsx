import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/Dashboard.css';

/* ── Compteur animé ── */
const Counter = ({ target, duration = 1200, suffix = '' }) => {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);
  return <>{val}{suffix}</>;
};

/* ── Avatar ── */
const Avatar = ({ s, size = 72 }) => {
  if (s?.photo_url?.startsWith('data:'))
    return <img src={s.photo_url} alt="" style={{width:size,height:size,borderRadius:'50%',objectFit:'cover'}}/>;
  return (
    <div style={{width:size,height:size,borderRadius:'50%',display:'flex',alignItems:'center',
      justifyContent:'center',fontFamily:"'Cinzel',serif",fontWeight:800,
      fontSize:size*.28,background:'rgba(201,168,76,.12)',
      border:'2px solid rgba(201,168,76,.35)',color:'var(--gold-bright)'}}>
      {s?.prenom?.[0]}{s?.nom?.[0]}
    </div>
  );
};

/* ── Barre animée ── */
const Bar = ({ pct, color, delay = 0 }) => {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(pct), 300 + delay); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div style={{background:'rgba(255,255,255,.05)',borderRadius:3,height:6,overflow:'hidden',flex:1}}>
      <div style={{height:'100%',width:w+'%',background:color,borderRadius:3,
        transition:'width 1s cubic-bezier(.4,0,.2,1)',boxShadow:`0 0 8px ${color}60`}}/>
    </div>
  );
};

export default function Dashboard() {
  const user     = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [time,    setTime]    = useState(new Date());
  const [welcome, setWelcome] = useState(true);
  const [wPhase,  setWPhase]  = useState(0);

  /* Horloge */
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Message de bienvenue 3s */
  useEffect(() => {
    const phases = [0,1,2,3];
    phases.forEach((p,i) => setTimeout(() => setWPhase(p), i * 600));
    setTimeout(() => setWelcome(false), 3200);
  }, []);

  /* Données */
  useEffect(() => {
    (async () => {
      try {
        const [solR, scR, presR, sanctR, distR, criR, evtR] = await Promise.allSettled([
          api.get('/soldiers'),
          api.get('/statuts-campus/stats'),
          api.get('/presences/stats'),
          api.get('/sanctions'),
          api.get('/distinctions'),
          api.get('/crics/stats'),
          api.get('/restauration/stats'),
        ]);
        const soldiers   = solR.status==='fulfilled'  ? solR.value.data.data||[]   : [];
        const sc         = scR.status==='fulfilled'   ? scR.value.data.data        : null;
        const pres       = presR.status==='fulfilled' ? presR.value.data.data      : null;
        const sanctions  = sanctR.status==='fulfilled'? sanctR.value.data.data||[] : [];
        const dists      = distR.status==='fulfilled' ? distR.value.data.data||[]  : [];
        const crics      = criR.status==='fulfilled'  ? criR.value.data.data       : null;
        const evts       = evtR.status==='fulfilled'  ? evtR.value.data.data       : null;

        /* Commandement */
        const major  = soldiers.find(s => s.grade==='Major');
        const legion = soldiers.find(s => s.grade==='Légionnaire');
        let mFull = major, lFull = legion;
        if (major)  try { mFull = (await api.get(`/soldiers/${major.id}`)).data.data; } catch {}
        if (legion) try { lFull = (await api.get(`/soldiers/${legion.id}`)).data.data; } catch {}

        /* Promotions */
        const promoMap = {};
        soldiers.filter(s=>s.statut==='actif').forEach(s => {
          if (s.promotion) promoMap[s.promotion] = (promoMap[s.promotion]||0) + 1;
        });
        const promos = Object.entries(promoMap).sort((a,b)=>b[0]-a[0]).slice(0,6).map(([p,n])=>({p,n}));

        /* Sections actives */
        const sectionMap = {};
        soldiers.filter(s=>s.statut==='actif').forEach(s => {
          if (s.section_affectation) {
            const sec = s.section_affectation.split('—')[0].trim();
            sectionMap[sec] = (sectionMap[sec]||0) + 1;
          }
        });
        const sections = Object.entries(sectionMap).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([s,n])=>({s,n}));

        /* Stats sanctiones */
        const graveS = sanctions.filter(s=>s.severite==='grave').length;

        setData({
          total: soldiers.length,
          actifs: soldiers.filter(s=>s.statut==='actif').length,
          inactifs: soldiers.filter(s=>s.statut==='inactif').length,
          absents: sc?.absents || 0,
          alertes: sc?.alertes || 0,
          sanctions: sanctions.length, graveS,
          distinctions: dists.length,
          cricsTotal: crics?.total||0, cricsConf: crics?.confirmes||0,
          tauxPres: Math.round(pres?.taux_moyen_presence||0),
          evtsTotal: evts?.evenements?.total||0, evtsPlan: evts?.evenements?.planifies||0,
          major: mFull, legion: lFull,
          promos, sections,
          recentSoldiers: soldiers.filter(s=>s.statut==='actif').slice(0,6),
        });
      } catch(e) { console.error(e); }
    })();
  }, []);

  const hh = time.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const dd = time.toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).toUpperCase();

  /* ── WELCOME OVERLAY ── */
  if (welcome) return (
    <div style={{position:'fixed',inset:0,background:'#020406',display:'flex',
      flexDirection:'column',alignItems:'center',justifyContent:'center',
      zIndex:9999,fontFamily:"'Cinzel',serif",gap:24,overflow:'hidden'}}>
      {/* Grille */}
      <div style={{position:'absolute',inset:0,
        backgroundImage:'linear-gradient(rgba(201,168,76,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,.03) 1px,transparent 1px)',
        backgroundSize:'40px 40px',animation:'gridMove 8s linear infinite'}}/>
      {/* Coins */}
      {[['0','0'],['0','auto'],['auto','0'],['auto','auto']].map(([t,r],i)=>(
        <div key={i} style={{position:'absolute',top:t==='0'?20:'auto',bottom:t!=='0'?20:'auto',
          left:r==='0'?20:'auto',right:r!=='0'?20:'auto',
          width:50,height:50,borderTop:t==='0'?'2px solid rgba(201,168,76,.6)':'none',
          borderBottom:t!=='0'?'2px solid rgba(201,168,76,.6)':'none',
          borderLeft:r==='0'?'2px solid rgba(201,168,76,.6)':'none',
          borderRight:r!=='0'?'2px solid rgba(201,168,76,.6)':'none'}}/>
      ))}
      {/* Contenu */}
      <div style={{opacity:wPhase>=1?1:0,transform:wPhase>=1?'none':'translateY(20px)',
        transition:'all .6s ease',fontSize:'.6rem',letterSpacing:'.5em',color:'rgba(201,168,76,.5)'}}>
        ◆ SYSTÈME DE COMMANDEMENT ◆
      </div>
      <div style={{opacity:wPhase>=2?1:0,transform:wPhase>=2?'none':'scale(.8)',
        transition:'all .7s cubic-bezier(.34,1.56,.64,1)',
        fontFamily:"'Cinzel',serif",fontSize:'clamp(1.4rem,4vw,2.2rem)',fontWeight:800,
        color:'#C9A84C',letterSpacing:'.12em',textShadow:'0 0 40px rgba(201,168,76,.5)',textAlign:'center'}}>
        BIENVENUE,<br/>
        <span style={{fontSize:'1.3em',color:'#fff'}}>{user?.username?.toUpperCase()}</span>
      </div>
      <div style={{opacity:wPhase>=3?1:0,transition:'all .6s ease .2s',display:'flex',alignItems:'center',gap:12}}>
        <div style={{height:1,width:80,background:'rgba(201,168,76,.3)'}}/>
        <div style={{fontSize:'.62rem',letterSpacing:'.3em',color:'rgba(201,168,76,.6)'}}>
          {user?.role?.toUpperCase()} · ARMÉE DU G5C
        </div>
        <div style={{height:1,width:80,background:'rgba(201,168,76,.3)'}}/>
      </div>
      <div style={{position:'absolute',bottom:32,fontSize:'.52rem',letterSpacing:'.2em',color:'rgba(201,168,76,.3)'}}>
        XEL · DIOM · FIT
      </div>
      <style>{`@keyframes gridMove{to{background-position:40px 40px}}`}</style>
    </div>
  );

  /* ── SKELETON ── */
  if (!data) return (
    <div className="db-page">
      {[1,2,3,4].map(i=>(
        <div key={i} style={{height:120,background:'var(--bg-card)',borderRadius:14,
          animation:'db-pulse 1.5s ease infinite',animationDelay:`${i*.15}s`}}/>
      ))}
    </div>
  );

  return (
    <div className="db-page">

      {/* ── HEADER ── */}
      <div className="db-header">
        <div>
          <div className="db-eyebrow">◆ TABLEAU DE COMMANDEMENT · G5C ◆</div>
          <h1 className="db-title">Armée du G5C</h1>
          <div className="db-date">{dd}</div>
          <div className="db-devise">XEL · DIOM · FIT</div>
        </div>
        <div className="db-clock">
          <div className="db-clock-time">{hh}</div>
          <div className="db-clock-label">HEURE LOCALE · SAINT-LOUIS</div>
          <div className="db-clock-status">
            <span className="db-status-dot"/>SYSTÈME OPÉRATIONNEL
          </div>
        </div>
      </div>

      {/* ── ÉTAT-MAJOR ── */}
      {(data.major||data.legion) && (
        <div className="db-em-wrap">
          <div className="db-section-label">⚔️ ÉTAT-MAJOR · COMMANDEMENT</div>
          <div className="db-em-grid">
            {data.major && (
              <div className="db-em-card db-em-major" onClick={()=>navigate(`/soldats/${data.major.id}`)}>
                <div className="db-em-bg"/>
                <div className="db-em-rank">👑 CHEF SUPRÊME</div>
                <div className="db-em-avatar-wrap">
                  <Avatar s={data.major} size={80}/>
                  <div className="db-em-crown">👑</div>
                </div>
                <div className="db-em-name">{data.major.prenom} {data.major.nom}</div>
                {data.major.alias&&<div className="db-em-alias">« {data.major.alias} »</div>}
                <div className="db-em-badge db-em-badge-gold">MAJOR</div>
                <div className="db-em-meta">{data.major.matricule} · Promo {data.major.promotion}</div>
                {data.major.fonction&&<div className="db-em-fonction">{data.major.fonction}</div>}
              </div>
            )}
            {data.legion && (
              <div className="db-em-card db-em-legion" onClick={()=>navigate(`/soldats/${data.legion.id}`)}>
                <div className="db-em-bg"/>
                <div className="db-em-rank db-em-rank-silver">🗡️ SECOND DU COMMANDEMENT</div>
                <div className="db-em-avatar-wrap">
                  <Avatar s={data.legion} size={80}/>
                  <div className="db-em-crown">🗡️</div>
                </div>
                <div className="db-em-name">{data.legion.prenom} {data.legion.nom}</div>
                {data.legion.alias&&<div className="db-em-alias">« {data.legion.alias} »</div>}
                <div className="db-em-badge db-em-badge-silver">LÉGIONNAIRE</div>
                <div className="db-em-meta">{data.legion.matricule} · Promo {data.legion.promotion}</div>
                {data.legion.fonction&&<div className="db-em-fonction">{data.legion.fonction}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="db-kpis">
        {[
          { val:data.actifs,       lbl:'Soldats actifs',    icon:'◈', color:'#C9A84C', sub:`/ ${data.total} total`,       link:'/soldats' },
          { val:data.tauxPres,     lbl:'Taux de présence',  icon:'◉', color:'#34d399', sub:'moyenne globale', suffix:'%',  link:'/presences' },
          { val:data.distinctions, lbl:'Distinctions',      icon:'★', color:'#fbbf24', sub:'attribuées',                   link:'/distinctions' },
          { val:data.sanctions,    lbl:'Sanctions actives', icon:'⚠', color: data.graveS>0?'#ef4444':'#f59e0b',
            sub: data.graveS>0?`${data.graveS} grave(s)`:'aucune grave',                                                   link:'/sanctions' },
          { val:data.cricsTotal,   lbl:'CRICs en formation',icon:'◎', color:'#a78bfa', sub:`${data.cricsConf} confirmés`,  link:'/recrutement/crics' },
          { val:data.absents,      lbl:'Absents campus',    icon:'🏕️', color:'#f59e0b', sub:`${data.alertes} alerte(s)`,   link:'/statuts-campus' },
        ].map((k,i) => (
          <div key={i} className="db-kpi" style={{borderColor:k.color+'33',cursor:'pointer'}}
            onClick={()=>navigate(k.link)}>
            <div className="db-kpi-top">
              <span className="db-kpi-icon" style={{color:k.color}}>{k.icon}</span>
              <span className="db-kpi-arrow">→</span>
            </div>
            <div className="db-kpi-val" style={{color:k.color}}>
              <Counter target={k.val} duration={1000+i*100} suffix={k.suffix||''}/>
            </div>
            <div className="db-kpi-lbl">{k.lbl}</div>
            <div className="db-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── LIGNE 2 : Promotions + Sections + Statuts campus ── */}
      <div className="db-row-3">

        {/* Répartition promotions */}
        <div className="db-card">
          <div className="db-card-title">📊 RÉPARTITION PAR PROMOTION</div>
          {data.promos.length===0
            ? <div className="db-empty">Aucune donnée</div>
            : data.promos.map((p,i) => {
                const max = Math.max(...data.promos.map(x=>x.n));
                const pct = Math.round(p.n/max*100);
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <div style={{fontSize:'.65rem',color:'var(--text-muted)',width:60,flexShrink:0}}>
                      Promo {p.p}
                    </div>
                    <Bar pct={pct} color='#C9A84C' delay={i*100}/>
                    <div style={{fontSize:'.72rem',fontWeight:700,color:'var(--gold-bright)',width:24,textAlign:'right'}}>
                      {p.n}
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Sections */}
        <div className="db-card">
          <div className="db-card-title">🏛️ EFFECTIF PAR SECTION</div>
          {data.sections.length===0
            ? <div className="db-empty">Aucune affectation</div>
            : data.sections.map((s,i) => {
                const max = Math.max(...data.sections.map(x=>x.n));
                const colors = ['#C9A84C','#60a5fa','#34d399','#a78bfa','#f97316','#f59e0b'];
                return (
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <div style={{fontSize:'.6rem',color:'var(--text-muted)',width:90,flexShrink:0,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {s.s.replace('Section ','')}
                    </div>
                    <Bar pct={Math.round(s.n/max*100)} color={colors[i%colors.length]} delay={i*100}/>
                    <div style={{fontSize:'.72rem',fontWeight:700,color:colors[i%colors.length],width:20,textAlign:'right'}}>
                      {s.n}
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Statuts campus */}
        <div className="db-card">
          <div className="db-card-title">🏕️ STATUTS CAMPUS</div>
          <div style={{display:'flex',flexDirection:'column',gap:14,marginTop:8}}>
            {[
              {lbl:'Actifs sur campus',   val:data.actifs,    color:'#34d399', icon:'✅'},
              {lbl:'Absents temporaires', val:data.absents,   color:'#f59e0b', icon:'⏳'},
              {lbl:'Inactifs',            val:data.inactifs,  color:'#ef4444', icon:'⛔'},
            ].map((s,i) => (
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',
                background:`${s.color}0d`,border:`1px solid ${s.color}25`,borderRadius:10,cursor:'pointer'}}
                onClick={()=>navigate('/statuts-campus')}>
                <span style={{fontSize:'1.2rem'}}>{s.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:'.68rem',color:'var(--text-muted)'}}>{s.lbl}</div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:'1.3rem',fontWeight:800,color:s.color,lineHeight:1.1}}>
                    <Counter target={s.val} duration={800+i*150}/>
                  </div>
                </div>
                {s.lbl==='Absents temporaires' && data.alertes>0 && (
                  <span style={{background:'rgba(239,68,68,.15)',border:'1px solid rgba(239,68,68,.3)',
                    color:'#ef4444',borderRadius:20,padding:'2px 8px',fontSize:'.58rem',fontWeight:700}}>
                    ⚠ {data.alertes} alerte{data.alertes>1?'s':''}
                  </span>
                )}
              </div>
            ))}
          </div>
          {data.alertes>0&&(
            <div style={{marginTop:10,padding:'8px 12px',background:'rgba(239,68,68,.08)',
              border:'1px solid rgba(239,68,68,.2)',borderRadius:8,fontSize:'.68rem',color:'#f87171',
              display:'flex',alignItems:'center',gap:8}}>
              <span>🔴</span> {data.alertes} soldat{data.alertes>1?'s':''} avec retour en retard
            </div>
          )}
        </div>
      </div>

      {/* ── LIGNE 3 : Derniers enrôlés + Modules + Événements ── */}
      <div className="db-row-2">

        {/* Derniers soldats */}
        <div className="db-card">
          <div className="db-card-title">◈ DERNIERS ENRÔLÉS</div>
          <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
            {data.recentSoldiers.slice(0,6).map((s,i)=>(
              <div key={s.id} className="db-soldier-row"
                style={{animationDelay:`${i*.06}s`}}
                onClick={()=>navigate(`/soldats/${s.id}`)}>
                <div className="db-sol-avatar">
                  {s.photo_url?.startsWith('data:')
                    ? <img src={s.photo_url} alt="" style={{width:34,height:34,borderRadius:'50%',objectFit:'cover'}}/>
                    : <span style={{fontFamily:"'Cinzel',serif",fontWeight:800,fontSize:'.7rem'}}>
                        {s.prenom?.[0]}{s.nom?.[0]}
                      </span>
                  }
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:'.78rem',color:'var(--text-primary)',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {s.prenom} {s.nom}
                  </div>
                  <div style={{fontSize:'.62rem',color:'var(--text-muted)'}}>
                    {s.grade} · {s.matricule}
                  </div>
                </div>
                <span style={{background:'rgba(201,168,76,.1)',border:'1px solid rgba(201,168,76,.2)',
                  color:'var(--gold-main)',borderRadius:20,padding:'2px 8px',fontSize:'.58rem',
                  fontWeight:700,whiteSpace:'nowrap'}}>
                  P{s.promotion}
                </span>
              </div>
            ))}
          </div>
          <button onClick={()=>navigate('/soldats')}
            style={{marginTop:12,width:'100%',background:'rgba(201,168,76,.06)',
              border:'1px solid rgba(201,168,76,.2)',borderRadius:8,padding:'8px',
              color:'var(--gold-main)',cursor:'pointer',fontSize:'.65rem',
              fontFamily:"'Cinzel',serif",letterSpacing:'.1em'}}>
            VOIR TOUS LES EFFECTIFS →
          </button>
        </div>

        {/* Modules opérationnels */}
        <div className="db-card">
          <div className="db-card-title">⚙️ MODULES OPÉRATIONNELS</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
            {[
              {lbl:'Section Drapeau',   icon:'🚩',path:'/drapeau',    color:'#f59e0b'},
              {lbl:'Section Caporaux',  icon:'💪',path:'/caporaux',   color:'#34d399'},
              {lbl:'BAT-MUSIC',         icon:'🎵',path:'/bat-music',  color:'#a78bfa'},
              {lbl:'Restauration',      icon:'🍽️',path:'/restauration',color:'#f97316'},
              {lbl:'Recrutement',       icon:'🎯',path:'/recrutement', color:'#60a5fa'},
              {lbl:'DSA — Santé',       icon:'✚', path:'/dsa',        color:'#34d399'},
              {lbl:'DASC — Sports',     icon:'⚽',path:'/dasc',       color:'#f59e0b'},
              {lbl:'DCSP — Pédagogie', icon:'🎓',path:'/dcsp',       color:'#a78bfa'},
            ].map((m,i)=>(
              <div key={i} onClick={()=>navigate(m.path)}
                style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',
                  background:`${m.color}0d`,border:`1px solid ${m.color}20`,
                  borderRadius:9,cursor:'pointer',transition:'all .2s'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.borderColor=m.color+'50';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.borderColor=m.color+'20';}}>
                <span style={{fontSize:'.95rem'}}>{m.icon}</span>
                <span style={{fontSize:'.62rem',fontWeight:700,color:'var(--text-secondary)',
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {m.lbl}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BARRE SYSTÈME ── */}
      <div className="db-sys-bar">
        <div className="db-sys-item"><span className="db-dot db-dot-green"/>BASE DE DONNÉES</div>
        <div className="db-sys-item"><span className="db-dot db-dot-green"/>API BACKEND</div>
        <div className="db-sys-item"><span className="db-dot db-dot-green"/>AUTHENTIFICATION</div>
        <div className="db-sys-item"><span className="db-dot db-dot-gold"/>NOTIFICATIONS</div>
        <div style={{marginLeft:'auto',fontSize:'.55rem',color:'rgba(201,168,76,.3)',letterSpacing:'.15em'}}>
          G5C SYSTEM v2.0 · {new Date().getFullYear()}
        </div>
      </div>

    </div>
  );
}
