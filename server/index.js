import express from 'express';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// Contraseña compartida del supervisor; configúrala vía variable de entorno en producción.
const SUPERVISOR_PASSWORD = process.env.SUPERVISOR_PASSWORD || 'smartfactory';
const AUTH_SECRET = process.env.AUTH_SECRET || 'smartfactory-supervisor-secret';
const SESSION_MS = 12 * 60 * 60 * 1000;

// Llave de solo lectura para el conector de Power BI; configúrala vía variable de entorno en producción.
const POWERBI_API_KEY = process.env.POWERBI_API_KEY || 'smartfactory-powerbi';

const norm = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

//Carga de datos (generados con tools/extract.py)
const dataPath = path.join(__dirname, 'data', 'employees.json');
const raw = JSON.parse(readFileSync(dataPath, 'utf-8'));

let employees;
let byId;
let searchIndex;

function buildDerived() {
  employees = Object.entries(raw).map(([id, e]) => ({
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
    objetivos: e.o ?? [],
  }));
  byId = new Map(employees.map((e) => [e.id, e]));
  searchIndex = employees.map((e) => ({ e, key: `${norm(e.id)} ${norm(e.nombre)}` }));
}
buildDerived();

function persistRaw() {
  writeFileSync(dataPath, JSON.stringify(raw), 'utf-8');
}

function toRawSkill(c) {
  if (c?.tipo === 'cantidad') return { tipo: 'cantidad', cantidad: Number(c.cantidad) || 0 };
  return { nivel: Number(c?.nivel) || 0, categoria: ['A', 'B', 'C'].includes(c?.categoria) ? c.categoria : 'B' };
}

// ---- Autenticación de supervisor (token firmado con HMAC, sin estado en servidor) ----
function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  try {
    const expected = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireSupervisor(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'supervisor') return res.status(401).json({ error: 'No autorizado' });
  next();
}

function requirePowerBiKey(req, res, next) {
  const key = req.get('x-api-key') || req.query.key;
  if (key !== POWERBI_API_KEY) return res.status(401).json({ error: 'API key inválida' });
  next();
}

// Límite simple de intentos de inicio de sesión por IP.
const loginAttempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { count: 0, first: now };
  if (now - entry.first > 15 * 60 * 1000) { entry.count = 0; entry.first = now; }
  entry.count += 1;
  loginAttempts.set(ip, entry);
  return entry.count > 10;
}

const summary = (e) => ({
  id: e.id,
  nombre: e.nombre,
  lineas: e.matrices.length,
  competencias: e.matrices.reduce((a, m) => a + m.competencias.length, 0),
  cursos: e.cursos.length,
});

const app = express();
app.use(express.json());

app.post('/api/auth/login', (req, res) => {
  if (tooManyAttempts(req.ip)) return res.status(429).json({ error: 'Demasiados intentos, intenta más tarde.' });
  const { password } = req.body || {};
  if (password !== SUPERVISOR_PASSWORD) return res.status(401).json({ error: 'Contraseña incorrecta' });
  const exp = Date.now() + SESSION_MS;
  res.json({ token: signToken({ role: 'supervisor', exp }), expiresAt: exp });
});

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

// Edita matrices/competencias, cursos y objetivos; nombre, nómina y QR no son editables.
app.put('/api/employees/:id', requireSupervisor, (req, res) => {
  const id = req.params.id;
  if (!raw[id]) return res.status(404).json({ error: 'Colaborador no encontrado' });
  const body = req.body || {};

  if (Array.isArray(body.matrices)) {
    const m = {};
    for (const matrix of body.matrices) {
      if (!matrix?.matriz) continue;
      const skills = {};
      for (const c of matrix.competencias || []) {
        if (!c?.nombre) continue;
        skills[c.nombre] = toRawSkill(c);
      }
      m[matrix.matriz] = {
        turno: matrix.turno || null,
        linea: matrix.linea || null,
        puesto: matrix.puesto || null,
        skills,
      };
    }
    raw[id].m = m;
  }

  if (Array.isArray(body.cursos)) {
    raw[id].c = body.cursos
      .filter((c) => c?.curso)
      .map((c) => ({ curso: String(c.curso), fecha: c.fecha || null }));
  }

  if (Array.isArray(body.objetivos)) {
    raw[id].o = body.objetivos
      .filter((o) => o?.descripcion)
      .map((o) => ({
        id: o.id || crypto.randomUUID(),
        descripcion: String(o.descripcion),
        fecha: o.fecha || null,
        meta: o.meta || null,
      }));
  }

  persistRaw();
  buildDerived();
  res.json(byId.get(id));
});

// ---- Endpoints de solo lectura para Power BI (conector Web/JSON) ----
app.get('/api/powerbi/competencias', requirePowerBiKey, (_req, res) => {
  const rows = [];
  for (const e of employees) {
    for (const m of e.matrices) {
      for (const c of m.competencias) {
        rows.push({
          nomina: e.id,
          nombre: e.nombre,
          matriz: m.matriz,
          linea: m.linea,
          puesto: m.puesto,
          turno: m.turno,
          competencia: c.nombre,
          tipo: c.tipo === 'cantidad' ? 'certificaciones' : 'competencia',
          nivel: c.tipo === 'cantidad' ? null : c.nivel,
          categoria: c.tipo === 'cantidad' ? null : c.categoria,
          cantidad: c.tipo === 'cantidad' ? c.cantidad : null,
        });
      }
    }
  }
  res.json(rows);
});

app.get('/api/powerbi/cursos', requirePowerBiKey, (_req, res) => {
  const rows = [];
  for (const e of employees) {
    for (const c of e.cursos) rows.push({ nomina: e.id, nombre: e.nombre, curso: c.curso, fecha: c.fecha });
  }
  res.json(rows);
});

app.get('/api/powerbi/objetivos', requirePowerBiKey, (_req, res) => {
  const rows = [];
  for (const e of employees) {
    for (const o of e.objetivos || []) {
      rows.push({ nomina: e.id, nombre: e.nombre, objetivo: o.descripcion, fecha_limite: o.fecha, meta: o.meta });
    }
  }
  res.json(rows);
});

const dist = path.join(__dirname, '..', 'client', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`API lista en http://localhost:${PORT}`));
