import { useState } from 'react';
import api from '../utils/api';

export default function EmailButton({ endpoint, method = 'post', body = {}, label = 'Envoyer email', style = {} }) {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const handleSend = async () => {
    if (!window.confirm(`Envoyer "${label}" à tous les soldats actifs ?`)) return;
    setLoading(true);
    setResult(null);
    try {
      const res = method === 'post'
        ? await api.post(endpoint, body)
        : await api.get(endpoint);
      setResult({ ok: true, msg: res.data.message || `✅ ${res.data.sent} emails envoyés` });
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.error || 'Erreur envoi email' });
    } finally {
      setLoading(false);
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button
        onClick={handleSend}
        disabled={loading}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
          background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.3)',
          color: '#60a5fa', fontFamily: "'Cinzel', serif",
          fontSize: '.62rem', letterSpacing: '.1em',
          transition: 'all .2s', opacity: loading ? .6 : 1,
          ...style,
        }}
      >
        {loading ? '⏳' : '📧'} {loading ? 'Envoi...' : label}
      </button>
      {result && (
        <div style={{
          fontSize: '.65rem', padding: '4px 10px', borderRadius: 6,
          background: result.ok ? 'rgba(52,211,153,.1)' : 'rgba(239,68,68,.1)',
          color: result.ok ? '#34d399' : '#f87171',
          border: `1px solid ${result.ok ? 'rgba(52,211,153,.2)' : 'rgba(239,68,68,.2)'}`,
        }}>
          {result.msg}
        </div>
      )}
    </div>
  );
}
