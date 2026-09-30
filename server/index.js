import express from 'express'; import cors from 'cors'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import fs from 'fs';
const F = './db.json', SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const SERVICES = [{ id: 1, name: 'Coupe', price: 15, min: 30 }, { id: 2, name: 'Barbe', price: 10, min: 30 }, { id: 3, name: 'Coupe + barbe', price: 22, min: 60 }, { id: 4, name: 'Soin du visage', price: 25, min: 60 }];
const BARBERS = [{ id: 1, name: 'Sami' }, { id: 2, name: 'Wassim' }, { id: 3, name: 'Nour' }];
const OPEN = 540, CLOSE = 1140, STEP = 30; // 09:00 → 19:00, fermé le dimanche
if (!fs.existsSync(F)) fs.writeFileSync(F, JSON.stringify({ admin: { email: 'admin@barbier.tn', hash: bcrypt.hashSync('admin123', 8) }, bookings: [] }, null, 1));
const load = () => JSON.parse(fs.readFileSync(F)), save = d => fs.writeFileSync(F, JSON.stringify(d, null, 1));
const toMin = t => { const [h, m] = t.split(':'); return +h * 60 + +m; };
const fmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const now = () => { const n = new Date(); return { date: n.toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' }), min: toMin(n.toLocaleTimeString('en-GB', { timeZone: 'Africa/Tunis', hour: '2-digit', minute: '2-digit' })) }; };

function freeSlots(d, date, barberId, serviceId) {
  const svc = SERVICES.find(s => s.id === serviceId), t = now();
  if (!svc || !BARBERS.some(b => b.id === barberId) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date < t.date) return [];
  if (new Date(date + 'T12:00:00').getDay() === 0) return [];
  const busy = d.bookings.filter(b => b.date === date && b.barberId === barberId).map(b => [toMin(b.time), toMin(b.time) + b.min]);
  const out = [];
  for (let s = OPEN; s + svc.min <= CLOSE; s += STEP) {
    if (date === t.date && s <= t.min) continue;
    if (busy.some(([a, e]) => s < e && s + svc.min > a)) continue;
    out.push(fmt(s));
  }
  return out;
}
const app = express(); app.use(cors(), express.json());
const auth = (req, res, next) => { try { jwt.verify((req.headers.authorization || '').slice(7), SECRET); next(); } catch { res.status(401).json({ error: 'Connexion requise' }); } };

app.get('/api/config', (_, res) => res.json({ services: SERVICES, barbers: BARBERS }));
app.get('/api/slots', (req, res) => res.json(freeSlots(load(), req.query.date, +req.query.barberId, +req.query.serviceId)));
app.post('/api/bookings', (req, res) => {
  const { name, phone, serviceId, barberId, date, time } = req.body, d = load();
  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Nom requis' });
  if (!/^\+?[0-9 ]{8,15}$/.test(phone || '')) return res.status(400).json({ error: 'Numéro de téléphone invalide' });
  if (!freeSlots(d, date, barberId, serviceId).includes(time)) return res.status(409).json({ error: 'Ce créneau vient d’être pris. Choisissez une autre heure.' });
  const svc = SERVICES.find(s => s.id === serviceId), br = BARBERS.find(b => b.id === barberId);
  const b = { id: Date.now(), code: Math.random().toString(36).slice(2, 8).toUpperCase(), name: name.trim(), phone, serviceId, serviceName: svc.name, price: svc.price, min: svc.min, barberId, barberName: br.name, date, time };
  d.bookings.push(b); save(d); res.json(b);
});
app.post('/api/auth/login', (req, res) => {
  const { admin } = load();
  if (req.body.email !== admin.email || !bcrypt.compareSync(req.body.password || '', admin.hash)) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  res.json({ token: jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '7d' }) });
});
app.get('/api/bookings', auth, (req, res) => res.json(load().bookings.filter(b => !req.query.date || b.date === req.query.date).sort((a, b) => a.time.localeCompare(b.time))));
app.delete('/api/bookings/:id', auth, (req, res) => { const d = load(); d.bookings = d.bookings.filter(b => b.id != req.params.id); save(d); res.json({ ok: true }); });
app.listen(5001, () => console.log('API sur http://localhost:5001'));
