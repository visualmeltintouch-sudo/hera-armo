# TO ASK — Domande aperte per HeraComm / bizConsulting / Cliente

> Documento da usare come riferimento nelle prossime call con il cliente.
> Aggiornato: 2026-08-27

---

## Suitalk / Registrazione

**CONFERMATO dal cliente (2026-09-16), a valle del doc "Form di inserimento lead - Documentazione - ALPHAOMEGA - v2":**
- La Barcolana è il primo di diversi eventi itineranti in cui gira Armocromia.
- Perfect Circle **non** è coinvolto: resta standalone, gioco dal device dell'utente, nessuna registrazione/Suitalk.
- Il punto di aggancio in Armocromia è la schermata **`form`** già presente nel totem dopo la scelta della fascia d'età (`src/app/page.tsx:948`, oggi segnata "FORM TEMPORANEO — verrà integrato con Suitalk prima del go-live"). Va usata la tipologia **"Evento Itinerante"** → `Suitalk.main.openLeadForm('traveling-event')` (doc v2 §2.2.1, §4).

Domande aggiornate rispetto alla v2 del documento bizConsulting/AlphaOmega:

1. **La nostra schermata `form` (nome/cognome/email/telefono/consensi) va rimossa in favore dell'overlay Suitalk, o resta come fallback?**
   Il doc dice che Suitalk mostra il form "in overlay sopra la pagina erogata dal Fornitore" — la nostra UI attuale andrebbe probabilmente sostituita da una CTA che chiama `openLeadForm('traveling-event')`.

2. **Dopo la compilazione del form Suitalk, come riceviamo il segnale per generare/mostrare il codice di accesso al totem?**
   Il doc v2 non descrive un callback JS di completamento, solo l'invio anagrafiche via API ad AlphaOmega. Serve sapere se esiste un evento lato client (es. `Suitalk.on('leadSubmitted', ...)`) o se dobbiamo esporre noi un endpoint chiamato da AlphaOmega a valle.

3. **Valorizzazione dei 4 parametri dello snippet per La Barcolana:**
   - `eventID`: chi lo genera, quale sarà il valore per questo evento?
   - `sessionID`: lo generiamo noi (UUID lato client) o arriva da loro?
   - `queue`: `Web_Standard` o `Web_Special` (valori da doc v2 §3.3)?
   - `promoter`: `hc` (HeraComm) o `ee` (EstEnergy)?

4. **Ambiente di Staging**: il doc chiede che il Fornitore condivida uno staging che rispecchi la produzione, con lo snippet dedicato (`.../stage/v1/suitalk-js`) prima del go-live. Proponiamo `hera-armo.vercel.app` (o un branch preview) come staging ufficiale — da comunicare a bizConsulting/HeraComm per il whitelisting.

5. **Whitelisting dominio**: lo snippet funziona solo su domini autorizzati e la produzione client è `eventi.gruppohera.it`. Il totem resta su dominio Vercel — va abilitato esplicitamente in stage/prod, o l'intero flusso deve girare sotto `eventi.gruppohera.it`?

6. **Rapporto col consenso foto/GDPR già previsto sul totem** (vedi §6 in `TO_ASK.md`): l'informativa privacy di Suitalk (concorso a premi, differenziata HC/EE) copre anche il trattamento della foto per la postcard, o restano due consensi distinti?

**Risposta pronta per il cliente** sulla domanda infrastrutturale dell'email di Fahrizio ("che server disponete per l'instant win?"): Vercel per il frontend, Supabase (Postgres + Storage) su AWS eu-west-1 Francoforte per database/selfie — in UE, coerente col vincolo espresso ("per la parte AI non è un problema se è all'estero purché in ambito UE"). Da confermare se Francoforte (non Italia) va bene anche per il server applicativo/dati, non solo per l'AI — punto legale già aperto in `STATO_IMPLEMENTAZIONE.md`.

**Ipotesi di lavoro sull'URL `eventi.gruppohera.it/fattiungiroheraviglioso` (2026-09-16, non confermata dal cliente):**
Probabilmente quella pagina ospiterà il regolamento/landing dell'iniziativa in generale, con eventualmente una sottopagina dedicata a Perfect Circle servita direttamente da Vercel tramite DNS/dominio personalizzato puntato lì. Da verificare esplicitamente con Fabrizio prima di configurare qualunque dominio, perché lo slug ("fatti un giro") corrisponde al tagline attualmente in bozza per Perfect Circle mentre l'integrazione Suitalk "Evento Itinerante" confermata riguarda Armocromia — quindi va chiarito se è un contenitore condiviso per entrambi o riguarda solo uno dei due progetti.

7. **Simulazione Suitalk implementata (2026-09-16)**: `handleFormSubmit` in `src/app/page.tsx` ora logga in console (solo `NODE_ENV=development`, nessun invio reale) il payload che verrebbe inviato a Suitalk, per verificare il mapping dei campi prima di collegare l'endpoint vero. Emette anche un warning su due gap rilevati confrontando il nostro form con quanto descritto nel doc v2:
   - **`comune`**: il doc descrive lo switch privacy territoriale (HC/EE) in base al comune per il form "Evento Generico" (§2.2.3) — non è chiaro se si applica anche a "Evento Itinerante". Il nostro form non raccoglie il comune. Da chiedere al cliente/bizConsulting.
   - **`consenso_profilazione`**: il nostro form ha 3 consensi (dati/marketing/profilazione), ma il doc per Evento Itinerante descrive solo 2 tipi di consenso (gaming obbligatorio + ricontatto commerciale opzionale). Da chiarire se il widget Suitalk reale gestisce la profilazione separatamente o se va rimappata/rimossa.

8. **Sequenza di attivazione da rispettare, non saltare fasi**: 1) simulazione console (fatto), 2) test su ambiente di Staging Suitalk con lo snippet dedicato, 3) produzione. Non inviare mai dati verso l'endpoint reale durante le fasi di test del form.

---

## Totem / Experience

7. **L'URL nel QR code del totem (schermata codice errato) — qual è la landing page reale di registrazione?**
   Attualmente il QR punta a `/register` (nostro dominio). Va sostituito con l'URL definitivo della pagina di registrazione dell'evento.

8. **Le foto selfie scattate al totem — per quanto vanno conservate e chi può accedervi?**
   Attualmente salviamo le foto in un bucket Supabase Storage legato alla sessione. Decidere:
   - Retention: es. 24h, 7 giorni, fino a fine evento, indefinito?
   - Chi può vedere le foto: solo admin? operatori? nessuno dopo il download?
   - Dopo il download della postcard, la foto può essere eliminata automaticamente?
   - Il partecipante dà consenso implicito con `consent_immagine` o serve una informativa specifica sul totem?
   - I bucket vanno separati per evento (es. `armo-selfies-evento-xyz`) o uno solo con cartelle per evento?

---

## Brand / Asset

9. **Font ufficiale HERA — ci verrà fornita o usiamo Circular Std definitivamente?**
   Attualmente usiamo Circular Std come font principale. Se HERA ha un font proprietario, serve il file `.woff`/`.woff2` per integrarlo.

10. **Il logo `.webp` che stiamo usando è quello ufficiale definitivo approvato da HERA?**
    Stiamo usando il file `logo_new.webp` copiato dal progetto Perfect Circle. Confermare che sia l'asset corretto e aggiornato.

---

## Infrastruttura

11. **Serve un dominio custom per l'evento?**
    Es. `armocromia.gruppohera.it` o simile. Da configurare su Vercel se richiesto.

12. **Serve un ambiente di staging separato da condividere con bizConsulting per i test Suitalk?**
    Il documento richiede che il Fornitore (noi) fornisca un ambiente di staging che rispecchi la produzione, per testare l'integrazione prima del go-live.
