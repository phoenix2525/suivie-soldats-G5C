import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Soldiers from './pages/Soldiers';
import Crics from './pages/Crics';
import Presences from './pages/Presences';
import Distinctions from './pages/Distinctions';
import Sanctions from './pages/Sanctions';
import Mensurations from './pages/Mensurations';
import SoldierProfile from './pages/SoldierProfile';
import DRH from './pages/DRH';
import DSA from './pages/DSA';
import DASC from './pages/DASC';
import DCSP from './pages/DCSP';
import DASB from './pages/DASB';
import Rapports from './pages/Rapports';
import BatMusic from './pages/BatMusic';
import SectionDrapeau from './pages/SectionDrapeau';
import Recrutement from './pages/Recrutement';
import Drapeau from './pages/Drapeau';
import Caporaux from './pages/Caporaux';
import StatutsCampus from './pages/StatutsCampus';
import Restauration from './pages/Restauration';
import GestionUtilisateurs from './pages/GestionUtilisateurs';
import Assiduites from './pages/Assiduites';
import Annonces from './pages/Annonces';
import ProtectedRoute from './components/ProtectedRoute';
import MilitaryLoader from './components/MilitaryLoader';
import { UserContext } from './contexts/UserContext';
import './styles/index.css';

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) setUser(JSON.parse(stored));
    setChecking(false);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(prev => !prev);

  if (checking) return <MilitaryLoader />;

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Login onLogin={setUser} />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        ) : (
          <>
            <Route path="/" element={
              <UserContext.Provider value={user}>
                <Layout user={user} onLogout={() => setUser(null)} darkMode={darkMode} toggleTheme={toggleTheme} />
              </UserContext.Provider>
            }>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="rapports" element={<Rapports />} />
              <Route path="bat-music" element={<BatMusic />} />
              <Route path="soldats" element={<Soldiers />} />
              <Route path="recrutement" element={<Recrutement />} />
              <Route path="drapeau" element={<Drapeau />} />
              <Route path="caporaux" element={<Caporaux />} />
              <Route path="statuts-campus" element={<StatutsCampus />} />
              <Route path="restauration" element={<Restauration />} />
              <Route path="recrutement/crics" element={<Crics />} />
              <Route path="recrutement/assiduites" element={<Assiduites />} />
              <Route path="presences" element={<Presences />} />
              <Route path="sanctions" element={<Sanctions />} />
              <Route path="distinctions" element={<Distinctions />} />
              <Route path="mensurations" element={<Mensurations />} />
              <Route path="drapeau" element={<SectionDrapeau />} />
              <Route path="drh" element={<DRH />} />
              <Route path="dsa" element={<DSA />} />
              <Route path="dasc" element={<DASC />} />
              <Route path="dcsp" element={<DCSP />} />
              <Route path="dasb" element={<DASB />} />
              <Route path="soldats/:id" element={<SoldierProfile />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

const ComingSoon = ({ title, icon }) => (
  <div className="page-wrapper" style={{ padding: 32 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 20 }}>
      <div style={{ fontSize: '3rem', color: 'var(--bg-border)' }}>{icon}</div>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)', fontSize: '1.5rem' }}>{title}</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.1em' }}>MODULE EN COURS DE DÉVELOPPEMENT</p>
    </div>
  </div>
);

export default App;
