import { useState, useEffect } from 'react';
const api = async (p, o = {}, t) => {
  const r = await fetch('/api' + p, { ...o, headers: { 'Content-Type': 'application/json', ...(t && { Authorization: 'Bearer ' + t }) }, body: o.body && JSON.stringify(o.body) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Erreur'); return d;
};
const today = () => new Date().toLocaleDateString('en-CA');
const nice = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export default function App() {
  const [view, setView] = useState('book'), [msg, setMsg] = useState('');
  const flash = m => { setMsg(m); setTimeout(() => setMsg(''), 3500); };
  return (<>
    <header><h1>Le Barbier <span>de la Corniche</span></h1>
      <button className="ghost" onClick={() => setView(view === 'book' ? 'admin' : 'book')}>{view === 'book' ? 'Espace pro' : 'Prendre rendez-vous'}</button></header>
    <main>{view === 'book' ? <Book flash={flash} /> : <Admin flash={flash} />}</main>
    {msg && <div className="toast" role="status">{msg}</div>}
  </>);
}

function Book({ flash }) {
  const [cfg, setCfg] = useState({ services: [], barbers: [] }), [svc, setSvc] = useState(null), [br, setBr] = useState(null), [date, setDate] = useState(today());
  const [slots, setSlots] = useState(null), [time, setTime] = useState(''), [f, setF] = useState({ name: '', phone: '' }), [done, setDone] = useState(null);
  useEffect(() => { api('/config').then(setCfg).catch(e => flash(e.message)); }, []);
  useEffect(() => {
    setTime(''); setSlots(null);
    if (svc && br && date) api(`/slots?date=${date}&barberId=${br.id}&serviceId=${svc.id}`).then(setSlots).catch(e => flash(e.message));
  }, [svc, br, date]);
  const book = async () => {
    try { setDone(await api('/bookings', { method: 'POST', body: { ...f, serviceId: svc.id, barberId: br.id, date, time } })); }
    catch (e) { flash(e.message); if (svc && br) api(`/slots?date=${date}&barberId=${br.id}&serviceId=${svc.id}`).then(setSlots); setTime(''); }
  };
  if (done) return (<div className="side" style={{ maxWidth: 480, margin: 'auto', position: 'static' }}>
    <h2>Rendez-vous confirmé</h2><div className="code">{done.code}</div>
    <dl><dt>Quand</dt><dd>{nice(done.date)} à {done.time}</dd><dt>Service</dt><dd>{done.serviceName}</dd><dt>Avec</dt><dd>{done.barberName}</dd><dt>Prix</dt><dd>{done.price} TND</dd></dl>
    <p className="muted">Gardez ce code : donnez-le au salon à votre arrivée.</p>
    <button onClick={() => { setDone(null); setSvc(null); setBr(null); setF({ name: '', phone: '' }); }}>Nouveau rendez-vous</button></div>);
  const ready = svc && br && time && f.name.trim().length > 1 && f.phone.trim().length > 7;
  return (<div className="lay"><div>
    <section><h2>Service</h2><div className="opts">{cfg.services.map(s => <button key={s.id} className="opt" aria-pressed={svc?.id === s.id} onClick={() => setSvc(s)}><b>{s.name}</b><small>{s.min} min · {s.price} TND</small></button>)}</div></section>
    <section><h2>Barbier</h2><div className="opts">{cfg.barbers.map(b => <button key={b.id} className="opt" aria-pressed={br?.id === b.id} onClick={() => setBr(b)}><b>{b.name}</b></button>)}</div></section>
    <section><h2>Jour et heure</h2><input type="date" min={today()} value={date} onChange={e => setDate(e.target.value)} aria-label="Date" style={{ maxWidth: 220, marginBottom: '.8rem' }} />
      {!svc || !br ? <p className="muted">Choisissez un service et un barbier pour voir les heures libres.</p>
        : !slots ? <p className="muted">Chargement des horaires…</p>
        : !slots.length ? <p className="muted">Aucun créneau ce jour-là (salon fermé le dimanche). Essayez une autre date.</p>
        : <div className="slots">{slots.map(s => <button key={s} className="opt" aria-pressed={time === s} onClick={() => setTime(s)}>{s}</button>)}</div>}</section>
    <section><h2>Vos coordonnées</h2><div className="opts" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
      <input placeholder="Nom complet" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <input placeholder="Téléphone (ex : 22 123 456)" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div></section></div>
    <aside className="side"><h2>Votre rendez-vous</h2>
      <dl><dt>Service</dt><dd>{svc?.name || '—'}</dd><dt>Barbier</dt><dd>{br?.name || '—'}</dd><dt>Jour</dt><dd>{date ? nice(date) : '—'}</dd><dt>Heure</dt><dd>{time || '—'}</dd></dl>
      <div className="total">{svc ? svc.price : 0} TND</div><button disabled={!ready} onClick={book}>Confirmer le rendez-vous</button></aside></div>);
}

function Admin({ flash }) {
  const [tk, setTk] = useState(() => localStorage.getItem('tk') || ''), [c, setC] = useState({ email: '', password: '' }), [date, setDate] = useState(today()), [list, setList] = useState([]);
  const load = () => api('/bookings?date=' + date, {}, tk).then(setList).catch(() => { localStorage.removeItem('tk'); setTk(''); });
  useEffect(() => { if (tk) load(); }, [tk, date]);
  const login = async () => { try { const { token } = await api('/auth/login', { method: 'POST', body: c }); localStorage.setItem('tk', token); setTk(token); } catch (e) { flash(e.message); } };
  if (!tk) return (<div className="side" style={{ maxWidth: 400, margin: 'auto', position: 'static' }}><h2>Espace pro</h2>
    <input placeholder="Email" value={c.email} onChange={e => setC({ ...c, email: e.target.value })} /><input placeholder="Mot de passe" type="password" value={c.password} onChange={e => setC({ ...c, password: e.target.value })} />
    <button onClick={login}>Se connecter</button><span className="muted">Démo : admin@barbier.tn / admin123</span></div>);
  return (<><div className="panel"><div><h2>Agenda du jour</h2><span className="muted">{list.length} rendez-vous · {list.reduce((s, b) => s + b.price, 0)} TND attendus</span></div>
    <span style={{ display: 'flex', gap: '.6rem' }}><input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Date" /><button className="ghost" onClick={() => { localStorage.removeItem('tk'); setTk(''); }}>Se déconnecter</button></span></div>
    {!list.length && <p className="muted">Aucun rendez-vous ce jour-là.</p>}
    {list.map(b => <div className="panel" key={b.id}><span className="time">{b.time}</span><span style={{ flex: 1 }}><b>{b.name}</b> · {b.phone}<br /><span className="muted">{b.serviceName} avec {b.barberName} · code {b.code}</span></span>
      <button className="danger" onClick={async () => { try { await api('/bookings/' + b.id, { method: 'DELETE' }, tk); flash('Rendez-vous annulé'); load(); } catch (e) { flash(e.message); } }}>Annuler</button></div>)}</>);
}
