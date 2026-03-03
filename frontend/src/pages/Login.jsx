import { useState } from 'react';
import axios from 'axios';
import '../styles/Login.css';

const Login = ({ onLogin }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(import.meta.env.VITE_API_URL + '/auth/login' || 'https://g5c-backend.onrender.com/api/auth/login', form);
      if (res.data.success) {
        localStorage.setItem('token', res.data.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.data.user));
        onLogin(res.data.data.user);
      }
    } catch (err) {
      console.error('Erreur login complète:', err);
      console.error('Response data:', err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-grid" />
      <div className="login-flag-left" />
      <div className="login-flag-right" />
      <div className="login-radar login-radar-2" />
      <div className="login-radar login-radar-3" />
      <div className="login-particles">
        {[...Array(12)].map((_,i)=><div key={i} className="particle"/>)}
      </div>

      {/* Lignes de scan animées */}
      <div className="scan-line scan-1" />
      <div className="scan-line scan-2" />

      {/* Coins décoratifs */}
      <div className="corner corner-tl" />
      <div className="corner corner-tr" />
      <div className="corner corner-bl" />
      <div className="corner corner-br" />

      {/* Contenu principal */}
      <div className="login-content">

        {/* Logo / Emblème */}
        <div className="login-emblem">
          <div className="emblem-ring outer-ring">
<div className="emblem-ring inner-ring">
  <img
    src="/logo-g5c.png"
    alt="Logo Armée du G5C"
    className="login-logo-img"
  />
</div>
          </div>
        </div>

        {/* Titre */}
        <div className="login-header">
          <div className="login-pre-title">SYSTÈME DE COMMANDEMENT</div>
          <h1 className="login-title">ARMÉE DU G5C</h1>
          <div className="login-divider">
            <span className="divider-line" />
            <span className="divider-diamond">◆</span>
            <span className="divider-line" />
          </div>
          <p className="login-sub">Université Gaston Berger — Saint-Louis, Sénégal</p>
            <div className="login-devise">
  <span>◆</span>
  <span className="devise-text">XEL · DIOM · FIT</span>
  <span>◆</span>
</div>
          <div className="login-year">Est. 1990</div>
        </div>

        {/* Formulaire */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-title">ACCÈS SÉCURISÉ</div>

          {error && (
            <div className="login-error">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="login-field">
            <label className="login-label">IDENTIFIANT</label>
            <div className="login-input-wrap">
              <span className="input-icon">◈</span>
              <input
                type="text"
                className="login-input"
                placeholder="Nom d'utilisateur"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                autoFocus
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">MOT DE PASSE</label>
            <div className="login-input-wrap">
              <span className="input-icon">◉</span>
              <input
                type="password"
                className="login-input"
                placeholder="••••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="login-loading">
                <span className="login-spinner" />
                AUTHENTIFICATION...
              </span>
            ) : (
              <span>ACCÉDER AU SYSTÈME ▶</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <span className="footer-line" />
          <span className="footer-text">SYSTÈME SÉCURISÉ · ACCÈS RESTREINT</span>
          <span className="footer-line" />
        </div>

      </div>
    </div>
  );
};

export default Login;
