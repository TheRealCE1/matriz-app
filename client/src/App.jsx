import { useEffect, useState } from 'react';
import Profile from './Profile.jsx';

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

  useEffect(() => {
    api('/api/stats').then(setStats).catch(() => setError('No se pudo conectar con el servidor.'));
  }, []);

  // Búsqueda con debounce
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
      </div>

      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o número de nómina…"
          autoFocus
        />
      </div>

      {error && <p className="hint">⚠️ {error}</p>}
      {!q.trim() && <p className="hint">Escribe un nombre o número de nómina para empezar.</p>}
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

      {selected && <Profile emp={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
