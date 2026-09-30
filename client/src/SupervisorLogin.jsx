import { useState } from 'react';
import { setSession } from './auth.js';

export default function SupervisorLogin({ onClose, onLoggedIn }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSession(data.token, data.expiresAt);
      onLoggedIn();
    } catch {
      setError('Contraseña incorrecta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="scanner-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-top">
          <h2>Acceso de supervisor</h2>
          <button className="close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <form onSubmit={submit} className="login-form">
          <label htmlFor="supervisor-password">Contraseña</label>
          <input
            id="supervisor-password"
            name="supervisorPassword"
            type="password"
            className="search"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="hint">⚠️ {error}</p>}
          <button className="scan-button" type="submit" disabled={loading}>
            {loading ? 'Verificando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
