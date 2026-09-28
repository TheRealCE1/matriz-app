# Matriz de Habilidades — Buscador de competencias

Backend: Node.js (Express) · Frontend: React (Vite) · Node 20.19.0+

## Puesta en marcha
```bash
npm run install:all   # instala dependencias de raíz, server y client
npm run dev           # API en :3001 y frontend en http://localhost:5173
```
Producción (un solo proceso, sirve el frontend compilado):
```bash
npm start             # compila el cliente y abre http://localhost:3001
```

## API
- `GET /api/stats` — totales
- `GET /api/employees?q=texto` — búsqueda por nombre o nómina (sin acentos)
- `GET /api/employees/:id` — perfil con líneas, competencias y cursos

## Actualizar los datos
Los datos viven en `server/data/employees.json`, generado desde el Excel:
```bash
pip install openpyxl
python tools/extract.py ruta/al/MATRICES_EN_INTRANET_CC_1.xlsm
```
Reinicia el servidor después.
