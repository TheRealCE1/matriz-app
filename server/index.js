import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const norm = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// ---- Carga de datos (generados con tools/extract.py) ----
const raw = JSON.parse(readFileSync(path.join(__dirname, 'data', 'employees.json'), 'utf-8'));

const employees = Object.entries(raw).map(([id, e]) => ({
  id,
  nombre: e.n,
  matrices: Object.entries(e.m)
    .map(([linea, m]) => ({
      matriz: linea,
      linea: m.linea ?? null,
      puesto: m.puesto ?? null,
      turno: m.turno ?? null,
      competencias: Object.entries(m.skills).map(([nombre, skill]) => (
        skill?.tipo === 'cantidad'
          ? { nombre, tipo: 'cantidad', cantidad: skill.cantidad }
          : {
              nombre,
              nivel: typeof skill === 'object' ? skill.nivel : skill,
              categoria: typeof skill === 'object' ? skill.categoria : null,
            }
      )),
    }))
    .sort((a, b) => (a.linea ?? '').localeCompare(b.linea ?? '')),
  cursos: e.c ?? [],
}));

const byId = new Map(employees.map((e) => [e.id, e]));
const searchIndex = employees.map((e) => ({ e, key: `${norm(e.id)} ${norm(e.nombre)}` }));
const summary = (e) => ({
  id: e.id,
  nombre: e.nombre,
  lineas: e.matrices.length,
  competencias: e.matrices.reduce((a, m) => a + m.competencias.length, 0),
  cursos: e.cursos.length,
});

// ---- API ----
const app = express();

app.get('/api/stats', (_req, res) => {
  res.json({
    colaboradores: employees.length,
    lineas: new Set(employees.flatMap((e) => e.matrices.map((m) => m.linea).filter(Boolean))).size,
  });
});

app.get('/api/employees', (req, res) => {
  const q = norm(req.query.q).trim();
  if (!q) return res.json([]);
  const limit = Math.min(Number(req.query.limit) || 60, 200);
  const out = searchIndex
    .filter((x) => x.key.includes(q))
    .map((x) => x.e)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .slice(0, limit)
    .map(summary);
  res.json(out);
});

app.get('/api/employees/:id', (req, res) => {
  const e = byId.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Colaborador no encontrado' });
  res.json(e);
});

// ---- Frontend compilado (producción) ----
const dist = path.join(__dirname, '..', 'client', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}`));
