# Armocromia Heravigliosa — TODO

## ✅ Completato

### Core Features
- [x] Database schema (14 tabelle + RPC functions)
- [x] Supabase backend setup
- [x] Admin panel CRUD (eventi, domande, profili, premi, operatori, settings)
- [x] Totem UI completa (intro, anno nascita, 10 domande, risultato, premio)
- [x] Gradiente engine (weighted-stop positioning, smooth CSS + Canvas)
- [x] Postcard generation (Canvas API, PNG download)
- [x] Instant win (estrazione premi con stock management)
- [x] Logo HERA (webp reale)
- [x] Font Circular Std applicata
- [x] Answer cards con icone semantiche (40 domande × 2 opzioni)
- [x] UI white/minimal (#fcfcfc background, #e4379b primary)
- [x] Gradiente nascosto durante quiz, reveal al risultato
- [x] DESIGN.md system documentation
- [x] Deploy Vercel (live su hera-armo.vercel.app)

---

## ⏳ In Attesa / Da Completare

### Operatore Terminal
- [x] Pagina operatore (/operator) per verifica codici premio
- [x] Login operatore con access_code (verifica DB su hera_armo_operators)
- [x] UI redeem codice (input + verifica + feedback verde/rosso)
- [x] Integrazione RPC hera_armo_redeem()

### Analytics & Admin Stats
- [x] Dashboard statistiche (/admin/dashboard) con KPI, profili, premi
- [x] Pagina codici admin — tab Registrazioni + tab Codici Premio, export CSV per entrambi, filtri e ricerca
- [x] Live player tracking — Supabase Realtime subscription su hera_armo_sessions, badge LIVE + contatore sessioni in tempo reale, export CSV sessioni dalla dashboard

### Registrazione & Accesso
- [x] Tabella `hera_armo_registrations` con RPC `hera_armo_register` e `hera_armo_validate_code`
- [x] Pagina `/register` — form responsive mobile-first con tutti i campi richiesti dal brief
- [x] Totem: schermata "inserisci il tuo codice" con QR fallback per registrazione
- [x] Il codice identifica automaticamente age_group (young/classic) — nessun re-inserimento anno di nascita dal totem
- [ ] **TODO: L'URL nel QR code del totem punta a `/register` (stesso dominio). Sostituire con URL della landing page reale quando disponibile.**

### Quiz UX
- [x] Tutte le domande visibili su pagina unica scrollabile (anziché una alla volta)
- [x] Schermata risultato: gradiente come anello attorno alla foto persona
- [x] Placeholder persona (silhouette SVG)
- [x] **Selfie + rimozione sfondo** — webcam (getUserMedia) + fallback upload manuale; rimozione sfondo client-side ML (`@imgly/background-removal`); compositing nell'anello gradiente; foto salvata su Supabase Storage bucket `armo-selfies-test`.
- [ ] **Storage selfie — regole definitive** — retention policy, separazione bucket per evento, accesso admin, auto-delete post-download. Bloccato su risposta cliente (TO ASK #8).
- [ ] **TODO: L'URL nel QR code del totem punta a `/register`. Sostituire con URL landing reale quando disponibile.** (TO ASK #7)

### Testing & QA
- [ ] Test end-to-end (full quiz flow in headless browser)
- [ ] Unit tests (gradient engine, postcard rendering, RPC logic)
- [ ] Accessibility audit (WCAG, screen reader support)
- [ ] Performance profiling (Lighthouse, Core Web Vitals)
- [ ] Edge cases (invalid input, network timeouts, DB errors)

### Polish & UX
- [ ] Animazioni transizione domande (fade/slide)
- [ ] Micro-animations hover/click su answer cards
- [ ] Loading skeleton durante calcolo risultato
- [ ] Error states (connessione Supabase, generazione postcard fallita)
- [ ] Success toast/feedback per download postcard

### Internazionalizzazione (se richiesto)
- [ ] i18n setup (next-i18n-router o i18next)
- [ ] Traduzioni testi totem (IT → altre lingue)
- [ ] Traduzioni admin panel
- [ ] Locale-specific date/number formatting

### Documentazione & DevOps
- [ ] README.md con setup instructions
- [ ] Deployment guide (Vercel, Supabase, env vars)
- [ ] Database backup strategy
- [ ] Disaster recovery docs
- [ ] Admin onboarding guide (come usare l'admin panel)

### Optional Enhancements
- [ ] Dark mode admin panel (già strutturato in CSS, da testare)
- [ ] Responsive design per admin (attualmente desktop-only)
- [ ] Export quiz results (CSV, JSON per analytics)
- [ ] A/B testing framework (varianti domande, profili)
- [ ] Rate limiting su RPC calls (evitare abuse)
- [ ] Audit log (chi ha fatto cosa, quando)

---

## 🚀 Deploy Checklist

- [x] Build Vercel passa
- [x] Env vars configurate (NEXT_PUBLIC_SUPABASE_URL, ANON_KEY)
- [x] Logo asset presente
- [x] Font WOFF caricata
- [x] Database seeded con domande + icone semantiche
- [ ] Admin panel protetto (login Supabase RLS)
- [ ] Operatore pagina protetta
- [ ] CNAME/custom domain (se richiesto da HERA)
- [ ] SSL/TLS (Vercel di default)
- [ ] Backup strategy per Supabase

---

## 📝 Note

- **Icone semantiche**: Già caricate in DB via seed.sql, tutte 40 domande × 2 opzioni hanno icone attinenti
- **Gradiente**: True smooth blend (non 3 bande) - verificato su risultato screen
- **Postcard**: Canvas-rendered con stesso gradiente, scaricabile
- **Admin colors**: Tutti gli hardcoded color class sostituiti con CSS variables (--color-*)
- **Responsive**: Totem è fisso 1080×1920 (kiosk); admin è responsive

---

**Ultimo update**: 2026-08-26
**Stato**: Beta live — quiz scrollabile, risultato con gradiente ring, operator e dashboard pronti
