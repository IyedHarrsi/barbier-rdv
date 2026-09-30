# Le Barbier de la Corniche — réservation en ligne
Application de prise de rendez-vous : React (Vite) + Node/Express + JWT.
**Fonctionnalités** : choix service/barbier/jour, créneaux calculés côté serveur (durée du service, chevauchements, dimanche fermé, heures passées), anti double-réservation, code de confirmation, agenda admin avec annulation.
**Démo admin** (bouton « Espace pro ») : admin@barbier.tn / admin123

## Lancer
1. `cd server && npm install && npm start` (API : http://localhost:5001)
2. `cd client && npm install && npm run dev`

## Déploiement
Client → Netlify/Vercel (`npm run build`). Serveur → Render/Railway (variable `JWT_SECRET`).
