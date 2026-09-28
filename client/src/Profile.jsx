import { useEffect } from 'react';

const levelNames = {
  1: 'Opera',
  2: 'Habil',
  3: 'Prepara',
  4: 'Enseña',
};
const categoryNames = { A: 'Crítica', B: 'Media', C: 'Básica' };
const categoryGroups = [
  { key: 'C', label: 'Básicas' },
  { key: 'A', label: 'Críticas' },
  { key: 'B', label: 'Medias' },
];

function Dots({ nivel }) {
  return (
    <span className="skill-level" title={`Nivel ${nivel}: ${levelNames[nivel] || 'Sin clasificar'}`}>
      <span className="level-name">{levelNames[nivel] || `Nivel ${nivel}`}</span>
      <span className="dots" aria-label={`Nivel ${nivel}: ${levelNames[nivel] || 'Sin clasificar'}`}>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={i <= nivel ? 'dot on' : 'dot'} />
        ))}
      </span>
    </span>
  );
}

function Skill({ competency }) {
  return (
    <div className={`skill category-${(competency.categoria || 'B').toLowerCase()}`}>
      <div className="skill-info">
        <span>{competency.nombre}</span>
        <span className="category-name">{categoryNames[competency.categoria] || categoryNames.B}</span>
      </div>
      <Dots nivel={competency.nivel} />
    </div>
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
        {emp.matrices.map((matrix) => {
          const grouped = categoryGroups.reduce((groups, group) => {
            groups[group.key] = matrix.competencias.filter(
              (competency) => competency.tipo !== 'cantidad' && competency.categoria === group.key
            );
            return groups;
          }, {});
          const certifications = matrix.competencias.filter((competency) => competency.tipo === 'cantidad');

          return (
          <div className="line-card" key={matrix.matriz}>
            <div className="line-head">
              <div>
                <strong>Línea: {matrix.linea || 'No registrada'}</strong>
                <div className="matrix-name">Matriz: {matrix.matriz}</div>
              </div>
              <span className="result-meta">{[matrix.puesto, matrix.turno].filter(Boolean).join(' · ')}</span>
            </div>
            <div className="category-groups">
              {categoryGroups.map((group) => (
                grouped[group.key].length > 0 && (
                  <details className={`category-group category-group-${group.key.toLowerCase()}`} key={group.key}>
                    <summary>
                      <span>{group.label}</span>
                      <span className="group-count">{grouped[group.key].length}</span>
                    </summary>
                    <div className="group-skills">
                      {grouped[group.key].map((competency) => (
                        <Skill competency={competency} key={competency.nombre} />
                      ))}
                    </div>
                  </details>
                )
              ))}
            </div>
            {certifications.map((certification) => (
              <div className="skill certification" key={certification.nombre}>
                <span>{certification.nombre}</span>
                <span className="certification-count">{certification.cantidad}</span>
              </div>
            ))}
          </div>
          );
        })}

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
