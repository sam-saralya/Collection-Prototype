import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Minimal persistence layer for the prototype: one JSON blob in SQLite.
// No entities, no validation — the frontend owns the shape, this just
// saves and returns whatever it's given so it survives a reload/restart.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'data.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
  )
`);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/state', (req, res) => {
  const row = db.prepare('SELECT data FROM app_state WHERE id = 1').get();
  res.json(row ? JSON.parse(row.data) : {});
});

app.put('/api/state', (req, res) => {
  const data = JSON.stringify(req.body ?? {});
  db.prepare(
    `INSERT INTO app_state (id, data) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data`
  ).run(data);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Prototype data server listening on :${PORT}`));
