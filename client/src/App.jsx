import { useEffect, useState } from 'react';
import Profile from './Profile.jsx';
import QrScannerModal from './QrScannerModal.jsx';
import SupervisorLogin from './SupervisorLogin.jsx';
import { getSession, clearSession } from './auth.js';

const api = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });

export default function App() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [session, setSession] = useState(getSession());
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    api('/api/stats').then(setStats).catch(() => setError('No se pudo conectar con el servidor.'));
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) return setResults([]);
    const t = setTimeout(() => {
      api(`/api/employees?q=${encodeURIComponent(term)}`)
        .then((r) => { setResults(r); setError(''); })
        .catch(() => setError('Error al buscar.'));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const open = (id) => api(`/api/employees/${id}`).then(setSelected).catch(() => setError('Error al cargar el perfil.'));

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('emp');
    if (id) open(id);
  }, []);

  const onScanned = (data) => {
    setScanning(false);
    try {
      const id = new URL(data).searchParams.get('emp');
      open(id || data);
    } catch {
      open(data);
    }
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <div className="wrap">
      <div className="header">
        <div className="header-icon">
          <img src="/ZF_logo.svg" alt="Logo ZF" className="header-logo" />
        </div>
        <div>
          <p className="eyebrow">Smart Factory ESL</p>
          <h1>Matriz de competencias</h1>
          {stats && <p className="sub">{stats.colaboradores} colaboradores · {stats.lineas} líneas/estaciones</p>}
        </div>
        {session ? (
          <button className="supervisor-badge" onClick={logout} title="Cerrar sesión de supervisor">
            🛡️ Supervisor · Salir
          </button>
        ) : (
          <button className="supervisor-badge supervisor-badge-off" onClick={() => setLoggingIn(true)}>
            🔒 Modo supervisor
          </button>
        )}
      </div>

      <div className="search-row">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            id="employee-search"
            name="employeeSearch"
            type="text"
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o número de nómina…"
            autoFocus
          />
        </div>
        <button className="scan-button" onClick={() => setScanning(true)}>
          <span aria-hidden="true">📷</span> Escanear QR
        </button>
      </div>

      {error && <p className="hint">⚠️ {error}</p>}
      {!q.trim() && <p className="hint">Escribe un nombre o número de nómina, o escanea el QR de tu credencial para empezar.</p>}
      {q.trim() && !error && results.length === 0 && <p className="hint">Sin resultados.</p>}

      <div className="results">
        {results.map((r) => (
          <button key={r.id} className="result" onClick={() => open(r.id)}>
            <div>
              <div className="result-name">{r.nombre}</div>
              <div className="result-meta">Nómina {r.id} · {r.lineas} línea(s)</div>
            </div>
            <span className="badge">{r.competencias} competencias</span>
          </button>
        ))}
      </div>

      {selected && (
        <Profile
          emp={selected}
          onClose={() => setSelected(null)}
          isSupervisor={!!session}
          token={session?.token}
          onUpdated={setSelected}
        />
      )}
      {scanning && <QrScannerModal onResult={onScanned} onClose={() => setScanning(false)} />}
      {loggingIn && (
        <SupervisorLogin
          onClose={() => setLoggingIn(false)}
          onLoggedIn={() => {
            setSession(getSession());
            setLoggingIn(false);
          }}
        />
      )}
    </div>
  );
}
