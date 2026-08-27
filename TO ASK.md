# TO ASK — Domande aperte per HeraComm / bizConsulting / Cliente

> Documento da usare come riferimento nelle prossime call con il cliente.
> Aggiornato: 2026-08-27

---

## Suitalk / Registrazione

1. **La nostra `/register` rimane o Suitalk la sostituisce completamente?**
   La pagina `/register` che abbiamo sviluppato è operativa. Dobbiamo capire se servirà ancora o se l'intero flusso di registrazione sarà gestito da Suitalk (overlay su `eventi.gruppohera.it`).

2. **Chi mostra il codice all'utente dopo la registrazione — noi o la thank you page di Suitalk?**
   Il codice di accesso al totem deve essere mostrato a schermo dopo la compilazione. Se la thank you page è di Suitalk, dobbiamo capire se possono iniettare il codice nel loro layout.

3. **La thank you page di Suitalk è personalizzabile / supporta redirect esterno con il codice?**
   Es. redirect verso `hera-armo.vercel.app/register/success?code=AB3K7` per mostrare il codice nel nostro layout branded.

4. **`eventID` e `sessionID` chi li genera — noi o HeraComm/AlphaOmega?**
   Lo snippet richiede questi parametri valorizzati prima dell'inizializzazione. Dobbiamo stabilire chi è responsabile della generazione e dove vengono salvati.

5. **Dobbiamo esporre noi un endpoint API che Suitalk chiama dopo la compilazione del form?**
   "Le anagrafiche degli utenti saranno inviate via API ad AlphaOmega" — serve capire il formato della chiamata (payload, autenticazione, URL endpoint) che dobbiamo implementare per ricevere i dati e generare il codice.

6. **Il dominio di produzione sarà `eventi.gruppohera.it` — noi restiamo su Vercel con dominio custom o dobbiamo essere serviti da quel dominio?**
   Il form Suitalk funziona solo su domini autorizzati. Dobbiamo sapere se il nostro dominio (`hera-armo.vercel.app` o uno custom) verrà abilitato in staging e produzione.

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
