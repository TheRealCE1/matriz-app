import { useEffect } from 'react';

function Dots({ nivel }) {
  return (
    <span className="dots" title={`Nivel ${nivel}`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={i <= nivel ? 'dot on' : 'dot'} />
      ))}
    </span>
  );
}

export default function Profile({ emp, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-top">
          <div>
            <h2>{emp.nombre}</h2>
            <div className="result-meta">Nómina {emp.id}</div>
          </div>
          <button className="close" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <h3>Líneas / estaciones y competencias</h3>
        {emp.matrices.length === 0 && <p className="hint">Sin competencias registradas en las matrices.</p>}
        {emp.matrices.map((m) => (
          <div className="line-card" key={m.linea}>
            <div className="line-head">
              <strong>{m.linea}</strong>
              <span className="result-meta">{[m.puesto, m.turno].filter(Boolean).join(' · ')}</span>
            </div>
            {m.competencias.map((c) => (
              <div className="skill" key={c.nombre}>
                <span>{c.nombre}</span>
                <Dots nivel={c.nivel} />
              </div>
            ))}
          </div>
        ))}

        <h3>Cursos tomados</h3>
        {emp.cursos.length === 0 && <p className="hint">Sin cursos registrados.</p>}
        {emp.cursos.map((c, i) => (
          <div className="course" key={i}>
            <span>{c.curso}</span>
            <span className="result-meta">{c.fecha}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
