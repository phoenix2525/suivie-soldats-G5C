import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/Recrutement.css';

// Stats mapping
const STATS_MAP = {
  candidature:        "candidatures",
  "entretien_planifié":"entretiens_planifies",
  "confirmé":         "confirmes",
  "visite_médicale":  "visites_medicales",
  apte:               "aptes",
  "intégration":      "en_integration",
  serment:            "serment",
};

const PIPELINE = [
  { key:'candidature',        label:'Candidature',        icon:'📋', color:'#94a3b8', desc:'Dossier déposé, en attente de traitement' },
  { key:'entretien_planifié', label:'Entretien planifié',  icon:'📅', color:'#60a5fa', desc:'Entretien personnel planifié avec l\'instructeur' },
  { key:'confirmé',           label:'Confirmé',            icon:'✅', color:'#34d399', desc:'Candidat retenu après entretien' },
  { key:'visite_médicale',    label:'Visite médicale',     icon:'🏥', color:'#f59e0b', desc:'Examen médical par la DSA en cours' },
  { key:'apte',               label:'Apte',                icon:'💪', color:'#10b981', desc:'Déclaré apte physiquement et médicalement' },
  { key:'intégration',        label:'Intégration',         icon:'🎖️', color:'#a78bfa', desc:'Période d\'intégration dans les rangs' },
  { key:'serment',            label:'Serment',             icon:'⚔️', color:'#fbbf24', desc:'A prêté serment — prêt à devenir soldat' },
];

export default function Recrutement() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [assidStats, setAssidStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/crics/stats').catch(() => ({ data: { data: null } })),
      api.get('/assiduites/stats').catch(() => ({ data: { data: null } })),
    ]).then(([s, a]) => {
      setStats(s.data.data);
      setAssidStats(a.data.data);
      setLoading(false);
    });
  }, []);

  const total = stats ? parseInt(stats.total) : 0;

  return (
    <div className="recrut-page">

      {/* ── HERO ── */}
      <div className="recrut-hero">
        <div className="recrut-hero-content">
          <div className="recrut-eyebrow">🎯 G5C ARMÉE — SECTION RECRUTEMENT</div>
          <h1 className="recrut-title">Centre de Recrutement</h1>
          <p className="recrut-subtitle">
            Recruter, sélectionner et orienter les jeunes candidats qui souhaitent rejoindre le QG,
            en veillant à ce qu'ils répondent aux critères physiques, psychologiques et techniques requis.
          </p>
          <div className="recrut-hero-actions">
            <button className="recrut-btn-primary" onClick={() => navigate('/recrutement/crics')}>
              👥 Gérer les CRICs
            </button>
            <button className="recrut-btn-secondary" onClick={() => navigate('/recrutement/assiduites')}>
              📅 Suivi Assiduité
            </button>
          </div>
        </div>
        <div className="recrut-hero-kpis">
          {[
            { val: total, label: 'CRICs totaux', color: '#C9A84C', icon: '👥' },
            { val: stats?.confirmes || 0, label: 'Confirmés', color: '#34d399', icon: '✅' },
            { val: stats?.refuses || 0, label: 'Refusés', color: '#ef4444', icon: '✗' },
            { val: assidStats?.taux_moyen ? `${assidStats.taux_moyen}%` : '—', label: 'Assiduité moy.', color: '#60a5fa', icon: '📊' },
          ].map((k, i) => (
            <div key={i} className="recrut-kpi" style={{ borderColor: k.color + '44' }}>
              <div className="recrut-kpi-icon">{k.icon}</div>
              <div className="recrut-kpi-val" style={{ color: k.color }}>{k.val}</div>
              <div className="recrut-kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PIPELINE ── */}
      <div className="recrut-section-title">Pipeline de recrutement</div>
      <div className="recrut-pipeline">
        {PIPELINE.map((step, i) => {
          const count = stats?.[step.key] || stats?.[step.key.replace('é','e').replace('î','i')] || 0;
          return (
            <div key={step.key} className="recrut-pipeline-step">
              {i > 0 && <div className="recrut-pipeline-arrow">›</div>}
              <div className="recrut-pipeline-card" style={{ borderColor: step.color + '44' }}
                onClick={() => navigate('/recrutement/crics')}>
                <div className="recrut-pipeline-icon" style={{ background: step.color + '18', color: step.color }}>
                  {step.icon}
                </div>
                <div className="recrut-pipeline-count" style={{ color: step.color }}>
                  {stats
                    ? (stats[STATS_MAP[step.key]] ?? 0)
                    : '—'}
                </div>
                <div className="recrut-pipeline-label">{step.label}</div>
                <div className="recrut-pipeline-desc">{step.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CRITÈRES DE SÉLECTION ── */}
      <div className="recrut-section-title">Processus de sélection</div>
      <div className="recrut-criteres-grid">
        {[
          { icon:'🏃', title:'Test d\'aptitude physique', desc:'Course, pompes, abdominaux — évaluation de la condition physique générale du candidat.', color:'#34d399' },
          { icon:'🏥', title:'Examen médical', desc:'Bilan de santé complet effectué par la Direction de la Santé de l\'Armée (DSA-G5C).', color:'#60a5fa' },
          { icon:'🧠', title:'Tests psychotechniques', desc:'Évaluation de la stabilité mentale, capacité de leadership et adaptabilité.', color:'#a78bfa' },
          { icon:'📋', title:'Entretien personnel', desc:'Entretien individuel avec l\'instructeur pour évaluer la motivation et les compétences sociales.', color:'#f59e0b' },
          { icon:'🔍', title:'Vérification des antécédents', desc:'Contrôle du casier judiciaire et vérification de la moralité et de l\'intégrité du candidat.', color:'#f87171' },
          { icon:'🎯', title:'Période d\'intégration', desc:'Phase d\'observation et d\'adaptation aux exigences militaires du G5C.', color:'#fbbf24' },
        ].map((c, i) => (
          <div key={i} className="recrut-critere-card" style={{ borderColor: c.color + '33' }}>
            <div className="recrut-critere-icon" style={{ color: c.color, background: c.color + '15' }}>
              {c.icon}
            </div>
            <div className="recrut-critere-title" style={{ color: c.color }}>{c.title}</div>
            <div className="recrut-critere-desc">{c.desc}</div>
          </div>
        ))}
      </div>

      {/* ── ALERTES ── */}
      {assidStats?.nb_alertes > 0 && (
        <div className="recrut-alert-banner" onClick={() => navigate('/recrutement/assiduites')}>
          <span className="recrut-alert-icon">⚠️</span>
          <span className="recrut-alert-txt">
            <strong>{assidStats.nb_alertes} CRIC(s)</strong> ont un taux d'assiduité inférieur à 70% — intervention requise
          </span>
          <span className="recrut-alert-link">Voir →</span>
        </div>
      )}

      {/* ── RACCOURCIS ── */}
      <div className="recrut-shortcuts">
        <div className="recrut-shortcut" onClick={() => navigate('/recrutement/crics')}>
          <span>👥</span>
          <span>Liste des CRICs</span>
          <span>›</span>
        </div>
        <div className="recrut-shortcut" onClick={() => navigate('/recrutement/assiduites')}>
          <span>📅</span>
          <span>Gestion des séances</span>
          <span>›</span>
        </div>
        <div className="recrut-shortcut" onClick={() => navigate('/recrutement/crics')}>
          <span>🎖️</span>
          <span>Convertir en soldat</span>
          <span>›</span>
        </div>
      </div>

    </div>
  );
}
