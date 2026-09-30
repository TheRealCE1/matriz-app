import { useEffect, useMemo, useState, lazy, memo, Suspense } from 'react';

// Se carga bajo demanda: la librería de generación de QR no es necesaria hasta abrir un perfil.
const QrCode = lazy(() => import('./QrCode.jsx'));

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

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const emptyCompetencia = () => ({ nombre: '', tipo: 'competencia', nivel: 1, categoria: 'B', cantidad: 0 });
const emptyMatrix = () => ({ matriz: '', linea: '', puesto: '', turno: '', competencias: [] });
const emptyCurso = () => ({ curso: '', fecha: '' });
const emptyObjetivo = () => ({ id: newId(), descripcion: '', fecha: '', meta: '' });

const Dots = memo(function Dots({ nivel }) {
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
});

const Skill = memo(function Skill({ competency }) {
  return (
    <div className={`skill category-${(competency.categoria || 'B').toLowerCase()}`}>
      <div className="skill-info">
        <span>{competency.nombre}</span>
        <span className="category-name">{categoryNames[competency.categoria] || categoryNames.B}</span>
      </div>
      <Dots nivel={competency.nivel} />
    </div>
  );
});

export default function Profile({ emp, onClose, isSupervisor, token, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const matrixGroups = useMemo(
    () => emp.matrices.map((matrix) => {
      const grouped = categoryGroups.reduce((groups, group) => {
        groups[group.key] = matrix.competencias.filter(
          (competency) => competency.tipo !== 'cantidad' && competency.categoria === group.key
        );
        return groups;
      }, {});
      const certifications = matrix.competencias.filter((competency) => competency.tipo === 'cantidad');
      return { matrix, grouped, certifications };
    }),
    [emp.matrices]
  );

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const startEditing = () => {
    setSaveError('');
    setDraft({
      matrices: emp.matrices.map((m) => ({ ...m, competencias: m.competencias.map((c) => ({ ...c })) })),
      cursos: emp.cursos.map((c) => ({ ...c })),
      objetivos: (emp.objetivos || []).map((o) => ({ ...o })),
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraft(null);
    setSaveError('');
  };

  const updateMatrix = (i, patch) =>
    setDraft((d) => ({ ...d, matrices: d.matrices.map((m, idx) => (idx === i ? { ...m, ...patch } : m)) }));
  const addMatrix = () => setDraft((d) => ({ ...d, matrices: [...d.matrices, emptyMatrix()] }));
  const removeMatrix = (i) => setDraft((d) => ({ ...d, matrices: d.matrices.filter((_, idx) => idx !== i) }));

  const updateCompetencia = (mi, ci, patch) =>
    setDraft((d) => ({
      ...d,
      matrices: d.matrices.map((m, idx) =>
        idx !== mi ? m : { ...m, competencias: m.competencias.map((c, j) => (j === ci ? { ...c, ...patch } : c)) }
      ),
    }));
  const addCompetencia = (mi) =>
    setDraft((d) => ({
      ...d,
      matrices: d.matrices.map((m, idx) => (idx !== mi ? m : { ...m, competencias: [...m.competencias, emptyCompetencia()] })),
    }));
  const removeCompetencia = (mi, ci) =>
    setDraft((d) => ({
      ...d,
      matrices: d.matrices.map((m, idx) =>
        idx !== mi ? m : { ...m, competencias: m.competencias.filter((_, j) => j !== ci) }
      ),
    }));

  const updateCurso = (i, patch) =>
    setDraft((d) => ({ ...d, cursos: d.cursos.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) }));
  const addCurso = () => setDraft((d) => ({ ...d, cursos: [...d.cursos, emptyCurso()] }));
  const removeCurso = (i) => setDraft((d) => ({ ...d, cursos: d.cursos.filter((_, idx) => idx !== i) }));

  const updateObjetivo = (i, patch) =>
    setDraft((d) => ({ ...d, objetivos: d.objetivos.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) }));
  const addObjetivo = () => setDraft((d) => ({ ...d, objetivos: [...d.objetivos, emptyObjetivo()] }));
  const removeObjetivo = (i) => setDraft((d) => ({ ...d, objetivos: d.objetivos.filter((_, idx) => idx !== i) }));

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdated(updated);
      setEditing(false);
      setDraft(null);
    } catch {
      setSaveError('No se pudo guardar. Verifica tu sesión de supervisor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-top">
          <div>
            <h2>{emp.nombre}</h2>
            <div className="result-meta">Nómina {emp.id}</div>
          </div>
          <div className="panel-actions">
            {isSupervisor && !editing && (
              <button className="edit-button" onClick={startEditing}>✏️ Editar</button>
            )}
            {isSupervisor && editing && (
              <>
                <button className="edit-button" onClick={save} disabled={saving}>
                  {saving ? 'Guardando…' : '💾 Guardar'}
                </button>
                <button className="edit-button edit-button-cancel" onClick={cancelEditing} disabled={saving}>
                  Cancelar
                </button>
              </>
            )}
            <button className="close" onClick={onClose} aria-label="Cerrar">✕</button>
          </div>
        </div>

        {saveError && <p className="hint">⚠️ {saveError}</p>}

        <Suspense fallback={<div className="qr-card qr-card-loading">Cargando código QR…</div>}>
          <QrCode id={emp.id} nombre={emp.nombre} />
        </Suspense>

        <h3>Líneas / estaciones y competencias</h3>
        {!editing && matrixGroups.length === 0 && <p className="hint">Sin competencias registradas en las matrices.</p>}
        {!editing && matrixGroups.map(({ matrix, grouped, certifications }) => {
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

        {editing && draft.matrices.map((matrix, mi) => (
          <div className="line-card edit-card" key={mi}>
            <div className="edit-grid">
              <label>
                Matriz
                <input value={matrix.matriz} onChange={(e) => updateMatrix(mi, { matriz: e.target.value })} />
              </label>
              <label>
                Línea
                <input value={matrix.linea || ''} onChange={(e) => updateMatrix(mi, { linea: e.target.value })} />
              </label>
              <label>
                Puesto
                <input value={matrix.puesto || ''} onChange={(e) => updateMatrix(mi, { puesto: e.target.value })} />
              </label>
              <label>
                Turno
                <input value={matrix.turno || ''} onChange={(e) => updateMatrix(mi, { turno: e.target.value })} />
              </label>
            </div>

            {matrix.competencias.map((c, ci) => (
              <div className="edit-row" key={ci}>
                <input
                  className="edit-row-name"
                  placeholder="Nombre de la competencia"
                  value={c.nombre}
                  onChange={(e) => updateCompetencia(mi, ci, { nombre: e.target.value })}
                />
                {c.tipo === 'cantidad' ? (
                  <input
                    type="number"
                    min="0"
                    value={c.cantidad}
                    onChange={(e) => updateCompetencia(mi, ci, { cantidad: e.target.value })}
                  />
                ) : (
                  <>
                    <select value={c.nivel} onChange={(e) => updateCompetencia(mi, ci, { nivel: Number(e.target.value) })}>
                      {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>{n} · {levelNames[n]}</option>
                      ))}
                    </select>
                    <select value={c.categoria} onChange={(e) => updateCompetencia(mi, ci, { categoria: e.target.value })}>
                      <option value="A">Crítica</option>
                      <option value="B">Media</option>
                      <option value="C">Básica</option>
                    </select>
                  </>
                )}
                <button className="remove-button" onClick={() => removeCompetencia(mi, ci)} aria-label="Quitar">✕</button>
              </div>
            ))}
            <div className="edit-actions">
              <button className="add-button" onClick={() => addCompetencia(mi)}>+ Agregar competencia</button>
              <button className="remove-button-text" onClick={() => removeMatrix(mi)}>Eliminar esta línea/matriz</button>
            </div>
          </div>
        ))}
        {editing && <button className="add-button" onClick={addMatrix}>+ Agregar línea/matriz</button>}

        <h3>Cursos tomados</h3>
        {!editing && emp.cursos.length === 0 && <p className="hint">Sin cursos registrados.</p>}
        {!editing && emp.cursos.map((c, i) => (
          <div className="course" key={i}>
            <span>{c.curso}</span>
            <span className="result-meta">{c.fecha}</span>
          </div>
        ))}
        {editing && draft.cursos.map((c, i) => (
          <div className="edit-row" key={i}>
            <input
              className="edit-row-name"
              placeholder="Nombre del curso"
              value={c.curso}
              onChange={(e) => updateCurso(i, { curso: e.target.value })}
            />
            <input type="date" value={c.fecha || ''} onChange={(e) => updateCurso(i, { fecha: e.target.value })} />
            <button className="remove-button" onClick={() => removeCurso(i)} aria-label="Quitar">✕</button>
          </div>
        ))}
        {editing && <button className="add-button" onClick={addCurso}>+ Agregar curso</button>}

        <h3>Objetivos</h3>
        {!editing && (!emp.objetivos || emp.objetivos.length === 0) && (
          <p className="hint">Sin objetivos registrados para este colaborador.</p>
        )}
        {!editing && (emp.objetivos || []).map((o) => (
          <div className="objective" key={o.id}>
            <div className="objective-desc">{o.descripcion}</div>
            <div className="objective-meta">
              {o.meta && <span className="objective-meta-item">🎯 {o.meta}</span>}
              {o.fecha && <span className="objective-meta-item">📅 {o.fecha}</span>}
            </div>
          </div>
        ))}
        {editing && draft.objetivos.map((o, i) => (
          <div className="edit-row edit-row-objective" key={o.id}>
            <input
              className="edit-row-name"
              placeholder="Descripción del objetivo"
              value={o.descripcion}
              onChange={(e) => updateObjetivo(i, { descripcion: e.target.value })}
            />
            <input
              placeholder="Meta (p. ej. Nivel Prepara en soldadura)"
              value={o.meta || ''}
              onChange={(e) => updateObjetivo(i, { meta: e.target.value })}
            />
            <input type="date" value={o.fecha || ''} onChange={(e) => updateObjetivo(i, { fecha: e.target.value })} />
            <button className="remove-button" onClick={() => removeObjetivo(i)} aria-label="Quitar">✕</button>
          </div>
        ))}
        {editing && <button className="add-button" onClick={addObjetivo}>+ Agregar objetivo</button>}
      </div>
    </div>
  );
}

