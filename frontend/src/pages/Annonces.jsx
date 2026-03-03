import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Annonces() {
  const [titre,      setTitre]      = useState('');
  const [message,    setMessage]    = useState('');
  const [expediteur, setExpediteur] = useState('Le Commandement G5C');
  const [sending,    setSending]    = useState(false);
  const [result,     setResult]     = useState(null);
  const [stats,      setStats]      = useState(null);

  useEffect(() => {
    api.get('/pdf/email/stats').then(r => setStats(r.data.data)).catch(() => {});
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!titre || !message) return;
    if (!window.confirm(`Envoyer cette annonce à ${stats?.destinataires || 'tous les'} soldats actifs ?`)) return;
    setSending(true); setResult(null);
    try {
      const res = await api.post('/pdf/email/annonce', { titre, message, expediteur });
      setResult({ ok: true, msg: res.data.message });
      setTitre(''); setMessage('');
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.error || 'Erreur' });
    } finally {
      setSending(false);
      setTimeout(() => setResult(null), 6000);
    }
  };

  const templates = [
    { lbl: '📢 Réunion générale', titre: 'Convocation Réunion Générale', msg: 'Tous les soldats sont convoqués en réunion générale. La présence est obligatoire. Tenez-vous prêts en tenue réglementaire.' },
    { lbl: '⚠️ Rappel discipline', titre: 'Rappel des Règles de Discipline', msg: 'Le commandement rappelle à tous les soldats l\'importance du respect des règles de discipline et de la tenue réglementaire en toutes circonstances.' },
    { lbl: '🏆 Félicitations', titre: 'Félicitations à la Promotion', msg: 'Le commandement félicite l\'ensemble de la promotion pour ses efforts et son engagement exemplaire. Continuez ainsi !' },
    { lbl: '📅 Rappel événement', titre: 'Rappel — Événement à venir', msg: 'Nous vous rappelons qu\'un événement important est prévu prochainement. Veuillez vous préparer en conséquence.' },
  ];

  return (
    <div style={{ padding: '24px 28px', maxWidth: 800, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.55rem', letterSpacing: '.35em', color: 'var(--gold-main)', marginBottom: 6 }}>
          ◆ COMMUNICATION OFFICIELLE ◆
        </div>
        <h1 style={{ fontFamily: "'Cinzel',serif", fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold-bright)', margin: 0 }}>
          Annonces & Emails
        </h1>
        {stats && (
          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.2)',
            borderRadius: 20, padding: '4px 14px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 6px #34d399' }}/>
            <span style={{ fontSize: '.65rem', color: '#34d399' }}>
              {stats.destinataires} soldat{stats.destinataires > 1 ? 's' : ''} actif{stats.destinataires > 1 ? 's' : ''} avec email
            </span>
          </div>
        )}
      </div>

      {/* Templates rapides */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '.6rem', letterSpacing: '.2em', color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>
          Modèles rapides
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {templates.map((t, i) => (
            <button key={i} onClick={() => { setTitre(t.titre); setMessage(t.msg); }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: '.65rem',
                fontFamily: 'inherit', transition: 'all .2s' }}
              onMouseEnter={e => e.target.style.borderColor = 'rgba(201,168,76,.4)'}
              onMouseLeave={e => e.target.style.borderColor = 'var(--border-color)'}>
              {t.lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 16, padding: 28, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg,transparent,var(--gold-main),transparent)' }}/>

        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.62rem', letterSpacing: '.2em',
          color: 'var(--gold-main)', marginBottom: 20, textTransform: 'uppercase' }}>
          ◈ Composer une annonce
        </div>

        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '.58rem', letterSpacing: '.15em',
              color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Objet / Titre
            </label>
            <input value={titre} onChange={e => setTitre(e.target.value)}
              placeholder="Ex: Convocation réunion générale"
              style={{ width: '100%', background: 'var(--bg-input, rgba(0,0,0,.3))',
                border: '1px solid var(--border-color)', borderRadius: 8,
                padding: '10px 14px', color: 'var(--text-primary)',
                fontFamily: 'inherit', fontSize: '.85rem', outline: 'none',
                boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '.58rem', letterSpacing: '.15em',
              color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Message
            </label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              rows={6} placeholder="Rédigez votre message ici..."
              style={{ width: '100%', background: 'var(--bg-input, rgba(0,0,0,.3))',
                border: '1px solid var(--border-color)', borderRadius: 8,
                padding: '10px 14px', color: 'var(--text-primary)',
                fontFamily: 'inherit', fontSize: '.85rem', outline: 'none',
                resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '.58rem', letterSpacing: '.15em',
              color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
              Expéditeur
            </label>
            <input value={expediteur} onChange={e => setExpediteur(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-input, rgba(0,0,0,.3))',
                border: '1px solid var(--border-color)', borderRadius: 8,
                padding: '10px 14px', color: 'var(--text-primary)',
                fontFamily: 'inherit', fontSize: '.85rem', outline: 'none',
                boxSizing: 'border-box' }}
            />
          </div>

          {/* Aperçu */}
          {(titre || message) && (
            <div style={{ background: 'rgba(201,168,76,.04)', border: '1px solid rgba(201,168,76,.1)',
              borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: '.58rem', letterSpacing: '.15em', color: 'var(--gold-main)',
                marginBottom: 10, textTransform: 'uppercase' }}>Aperçu email</div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                Objet : <strong style={{ color: 'var(--text-primary)' }}>📢 Annonce — {titre}</strong>
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                De : <strong style={{ color: 'var(--text-primary)' }}>Armée G5C &lt;{process?.env?.GMAIL_USER || 'armeeg5cugb@gmail.com'}&gt;</strong>
              </div>
              <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', lineHeight: 1.7,
                borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
                Bonjour <strong>[Prénom Nom]</strong>,<br/>
                {message}
                <div style={{ marginTop: 8, fontSize: '.7rem', color: 'var(--text-muted)' }}>
                  — {expediteur}
                </div>
              </div>
            </div>
          )}

          {result && (
            <div style={{ padding: '10px 16px', borderRadius: 8,
              background: result.ok ? 'rgba(52,211,153,.08)' : 'rgba(239,68,68,.08)',
              border: `1px solid ${result.ok ? 'rgba(52,211,153,.2)' : 'rgba(239,68,68,.2)'}`,
              color: result.ok ? '#34d399' : '#f87171', fontSize: '.78rem' }}>
              {result.msg}
            </div>
          )}

          <button type="submit" disabled={sending || !titre || !message}
            style={{ background: sending ? 'rgba(201,168,76,.05)' : 'rgba(201,168,76,.12)',
              border: '1px solid rgba(201,168,76,.3)', borderRadius: 10,
              padding: '13px', color: 'var(--gold-main)',
              fontFamily: "'Cinzel',serif", fontSize: '.7rem', fontWeight: 700,
              letterSpacing: '.15em', cursor: sending || !titre || !message ? 'not-allowed' : 'pointer',
              opacity: sending || !titre || !message ? .5 : 1, transition: 'all .2s' }}>
            {sending ? '⏳ ENVOI EN COURS...' : `📧 ENVOYER À ${stats?.destinataires || 'TOUS LES'} SOLDATS`}
          </button>
        </form>
      </div>
    </div>
  );
}
