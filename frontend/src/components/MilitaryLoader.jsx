import { useEffect, useState } from 'react';
import '../styles/MilitaryLoader.css';

const BOOT_SEQUENCE = [
  { delay: 0,    text: 'INITIALISATION DU SYSTÈME DE COMMANDEMENT...' },
  { delay: 400,  text: 'VÉRIFICATION DES ACCRÉDITATIONS...' },
  { delay: 800,  text: 'CHARGEMENT DE LA BASE DE DONNÉES TACTIQUE...' },
  { delay: 1200, text: 'ÉTABLISSEMENT DE LA CONNEXION SÉCURISÉE...' },
  { delay: 1600, text: 'DÉPLOIEMENT DES MODULES OPÉRATIONNELS...' },
  { delay: 2000, text: 'SYSTÈME OPÉRATIONNEL — ACCÈS AUTORISÉ ✓' },
];

export default function MilitaryLoader({ message, progress = null }) {
  const [lines,   setLines]   = useState([]);
  const [pct,     setPct]     = useState(0);
  const [phase,   setPhase]   = useState(0);

  useEffect(() => {
    BOOT_SEQUENCE.forEach(({ delay, text }) => {
      setTimeout(() => setLines(l => [...l, text]), delay);
    });
    // Progress bar animée
    const iv = setInterval(() => {
      setPct(p => {
        if (p >= 100) { clearInterval(iv); return 100; }
        return p + (p < 80 ? 1.8 : 0.4);
      });
    }, 30);
    // Phase logo
    const ph = setInterval(() => setPhase(p => (p + 1) % 4), 500);
    return () => { clearInterval(iv); clearInterval(ph); };
  }, []);

  const phaseSymbols = ['◆', '◇', '◈', '◉'];

  return (
    <div className="ml-root">
      {/* Grille tactique de fond */}
      <div className="ml-grid" />
      {/* Lignes de scan */}
      <div className="ml-scan ml-scan-h" />
      <div className="ml-scan ml-scan-v" />
      {/* Coins HUD */}
      <div className="ml-corner ml-tl"><span/><span/></div>
      <div className="ml-corner ml-tr"><span/><span/></div>
      <div className="ml-corner ml-bl"><span/><span/></div>
      <div className="ml-corner ml-br"><span/><span/></div>
      {/* Coordonnées HUD */}
      <div className="ml-hud-coords ml-hud-tl">UGB · SJO · 16.0262°N</div>
      <div className="ml-hud-coords ml-hud-tr">EST. 1990 · G5C</div>
      <div className="ml-hud-coords ml-hud-bl">SYS v3.1.0 · SECURE</div>
      <div className="ml-hud-coords ml-hud-br">NODE: ALPHA-1</div>

      <div className="ml-center">
        {/* Emblème animé */}
        <div className="ml-emblem-wrap">
          <div className="ml-ring ml-r1" />
          <div className="ml-ring ml-r2" />
          <div className="ml-ring ml-r3" />
          <div className="ml-ring ml-r4" />
          {/* Croix de visée */}
          <div className="ml-reticle">
            <div className="ml-ret-h" /><div className="ml-ret-v" />
            <div className="ml-ret-tl" /><div className="ml-ret-tr" />
            <div className="ml-ret-bl" /><div className="ml-ret-br" />
          </div>
          <div className="ml-emblem-inner">
            <img src="/logo-g5c.png" alt="G5C" className="ml-logo"
              onError={e=>{ e.target.style.display='none';
                e.target.nextSibling.style.display='flex'; }}/>
            <div className="ml-logo-fallback">G5C</div>
          </div>
          {/* Points orbitants */}
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="ml-orbit-dot" style={{'--i':i}} />
          ))}
        </div>

        {/* Titre */}
        <div className="ml-title-wrap">
          <div className="ml-pre-title">
            {phaseSymbols[phase]} ARMÉE DU G5C {phaseSymbols[(phase+2)%4]}
          </div>
          <div className="ml-title">COMMAND CENTER</div>
          <div className="ml-divider">
            <span className="ml-div-line"/><span className="ml-div-gem">◆</span><span className="ml-div-line"/>
          </div>
          <div className="ml-subtitle">XEL · DIOM · FIT</div>
        </div>

        {/* Barre de progression */}
        <div className="ml-progress-wrap">
          <div className="ml-progress-header">
            <span className="ml-progress-label">CHARGEMENT DU SYSTÈME</span>
            <span className="ml-progress-pct">{Math.round(pct)}%</span>
          </div>
          <div className="ml-progress-track">
            <div className="ml-progress-fill" style={{width:`${pct}%`}} />
            <div className="ml-progress-glow" style={{left:`${pct}%`}} />
          </div>
          {/* Segments */}
          <div className="ml-progress-segs">
            {[25,50,75].map(s => (
              <div key={s} className="ml-seg" style={{left:`${s}%`,
                opacity: pct >= s ? 1 : 0.2,
                color: pct >= s ? '#C9A84C' : 'var(--text-muted)'
              }}>◆</div>
            ))}
          </div>
        </div>

        {/* Séquence de boot */}
        <div className="ml-boot-log">
          {lines.map((line, i) => (
            <div key={i} className="ml-boot-line" style={{animationDelay:`${i*0.05}s`}}>
              <span className="ml-boot-prompt">{'>'}</span>
              <span className={i === lines.length-1 ? 'ml-boot-active' : 'ml-boot-done'}>
                {line}
              </span>
            </div>
          ))}
        </div>

        {/* Devise */}
        <div className="ml-footer-devise">
          <span className="ml-dev-line"/><span>Université Gaston Berger · Saint-Louis</span><span className="ml-dev-line"/>
        </div>
      </div>
    </div>
  );
}
