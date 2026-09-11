# HERA Armocromia Heravigliosa — Punti da chiarire

## 1. Inquadramento legale dell'iniziativa

Come per altri progetti HERA, la classificazione giuridica dell'iniziativa determina gli obblighi normativi applicabili:

- **Concorso a premi** (la vincita dipende dalla sorte — instant win con probabilità): richiede comunicazione preventiva al MISE almeno 15 giorni prima, regolamento depositato presso notaio o Camera di Commercio, fideiussione bancaria a garanzia dei premi, e verbali di assegnazione.

- **Operazione a premio** (tutti i partecipanti ricevono un premio, finché le scorte lo permettono): obblighi significativamente ridotti. Se il valore del premio è di modico valore, può essere ulteriormente semplificata.

- **Semplice attività promozionale** (il quiz e la postcard sono fini a sé stessi, il codice è solo un gadget senza valore legale): potrebbe non rientrare affatto nella disciplina dei concorsi.

Serve sapere come HERA intende inquadrare l'iniziativa: da questo dipendono sia la logica del software sia gli adempimenti da predisporre prima del primo evento.


## 2. Logica di assegnazione dei premi

Il sistema supporta diverse modalità di instant win. Serve una scelta definitiva:

- **Tutti vincono sempre**: ogni partecipante riceve sempre un premio finché c'è stock. Quando lo stock si esaurisce, il partecipante ottiene il codice ma senza premio fisico associato. Questa è la modalità più semplice e potrebbe far rientrare l'iniziativa come operazione a premio.

- **Instant win con probabilità**: a prescindere dal profilo ottenuto, una percentuale predefinita di partecipanti vince (es. 1 su 5). La componente aleatoria configura quasi certamente un concorso a premi.

- **Premio legato al profilo**: certi profili (es. Hera — il più bilanciato e raro) danno accesso a premi diversi o di maggior valore. Introduce una componente di "merito" che può influire sull'inquadramento legale.

- **Stock esaurito = nessun premio**: il codice viene comunque emesso ma non porta a nulla. Va definito cosa mostrare all'utente in questo caso.

La scelta impatta direttamente sull'inquadramento legale (punto 1) e sulla certificazione tecnica.


## 3. Tipologia e quantità dei premi

Per configurare correttamente il sistema evento per evento serve sapere:

- Quanti tipi di premio diversi ci saranno (uno uguale per tutti, oppure più livelli per profilo)
- Descrizione e immagine di ciascun premio (il pannello admin supporta upload PNG/JPG/WebP/SVG)
- Quantità disponibile per ogni evento (stock, che può essere diverso da evento a evento)
- Se i premi cambiano da evento a evento o restano gli stessi per l'intera campagna
- Se esiste un "premio di consolazione" quando lo stock fisico è esaurito


## 4. Trattamento fotografico nella postcard

Al termine del quiz, il sistema scatta la foto del partecipante, rimuove automaticamente lo sfondo tramite intelligenza artificiale (MediaPipe Selfie Segmentation) e la inserisce nella postcard personalizzata con il gradiente del profilo assegnato.

Attualmente le aree trasparenti intorno alla persona lasciano trasparire il gradiente sottostante: la persona appare "integrata" nello sfondo colorato, senza una cornice separata.

Le alternative possibili sono:

- **Sfondo trasparente sul gradiente** (comportamento attuale): la persona fluttua sul colore del suo profilo. Visivamente coerente col concetto di armocromia.
- **Cerchio bianco o colorato dietro la persona**: aggiunge una cornice che separa la foto dallo sfondo.
- **Sfondo neutro** (bianco, grigio chiaro): più pulito e simile a una foto formale.
- **Nessuna foto**: se l'utente non vuole farsi fotografare, la postcard usa un avatar di default.

Serve una decisione visiva, idealmente con validazione del team creativo HERA.


## 5. Gestione dei dati fotografici — Privacy e GDPR

Ogni sessione che include la foto genera due file immagine salvati su cloud (Supabase Storage / AWS Francoforte): la foto scontornata e la postcard finale. Questi file non sono collegati al nome della persona ma sono potenzialmente riconducibili all'individuo, il che li qualifica come dati personali ai sensi del GDPR — e in certi contesti come dati biometrici.

Servono risposte su quattro aspetti:

- **Retention**: per quanto tempo vanno conservati questi file? (es. cancellazione automatica 7 giorni dopo l'evento, 30 giorni, o su richiesta)
- **Consenso**: il partecipante acconsente implicitamente scattando la foto e procedendo? O serve un consenso esplicito con checkbox e informativa specifica?
- **Diritto all'oblio**: se un partecipante chiedesse la cancellazione dei propri dati, il processo attuale è manuale. Serve un flusso automatizzato o è sufficiente la gestione su richiesta?
- **Localizzazione del server**: il database e lo storage sono su AWS EU-WEST-1 (Francoforte, Germania), all'interno dell'UE ma non in Italia. Se l'iniziativa viene inquadrata come concorso a premi, potrebbe essere rilevante ai sensi del DPR 430/2001. Serve parere legale.


## 6. Consensi privacy — Testi e struttura

Il partecipante interagisce con il totem senza compilare un form registrazione (la registrazione avviene esternamente). Non c'è però un momento esplicito in cui acconsente al trattamento fotografico.

Serve definire:

- Se è necessario aggiungere una schermata di consenso prima della foto (es. "Acconsento al trattamento della mia immagine per la creazione della postcard — art. X del GDPR")
- I testi esatti dei consensi che l'ufficio legale HERA vuole utilizzare
- Il link all'informativa privacy completa da rendere consultabile sul totem
- Se i consensi già raccolti in fase di registrazione coprono anche il trattamento fotografico, rendendo superfluo un consenso aggiuntivo sul totem


## 7. Raccolta dati e integrazione Suitalk

Il totem attualmente non raccoglie dati anagrafici dell'utente — l'identificazione avviene tramite il codice di accesso generato in fase di registrazione. I dati del partecipante (nome, email, ecc.) esistono nel sistema di registrazione esterno ma non vengono trasmessi al totem.

Se si vuole collegare la sessione di armocromia al profilo del partecipante nel CRM HERA tramite Suitalk, servono:

- Conferma che questa integrazione è in scope per il primo go-live o se è rimandabile
- URL dello snippet JavaScript Suitalk da caricare
- eventID dell'evento
- Parametro queue specifico per questa attività
- Mapping dei campi: quali dati della sessione (profilo, punteggi, timestamp) devono essere trasmessi al CRM e con quale nome campo

In assenza di integrazione, i dati delle sessioni restano disponibili solo nel pannello admin.


## 8. URL della landing page di registrazione

Quando un partecipante cerca di accedere al totem con un codice non valido (o non lo ha), viene mostrata una schermata con un QR code che invita a registrarsi. Questo serve a non perdere l'utente che si avvicina al totem senza essersi preventivamente registrato.

Serve l'URL completo della landing page di registrazione ufficiale (es. `https://heravigliosa.gruppohera.it/registrati`). Il QR attualmente punta a un placeholder interno.


## 9. Contenuti testuali — Profili, domande, claim

Il sistema è configurabile tramite pannello admin e tutti i testi sono modificabili senza intervento tecnico. Tuttavia, prima del go-live è utile confermare:

- **Nomi e claim dei 4 profili**: Ambiente, Acqua, Energia, Hera — i testi attualmente in database sono stati inseriti in fase di setup e potrebbero essere placeholder o bozze non validate dal team copy HERA.
- **Descrizioni dei profili**: il testo lungo che appare nella schermata risultato. Serve versione definitiva approvata.
- **Domande del quiz**: il tono, la pertinenza e la distribuzione dei punteggi (verde/ciano/magenta) per ogni risposta vanno validati dal team HERA. Attualmente sono presenti domande di esempio per le due fasce d'età (young/classic).
- **Testi dell'intro**: headline e sottotitolo della schermata iniziale del totem.
- **Hashtag della postcard**: attualmente "#LaTuaArmocromiaHeravigliosa" — da confermare.


## 10. Asset grafici

Servono o vanno confermati:

- Immagini dei premi reali (il pannello admin supporta upload diretto)
- Eventuale immagine di sfondo o texture da affiancare al gradiente nella postcard
- Conferma che il logo HERA attualmente in uso sia quello definitivo per questo progetto
- Eventuali icone o grafiche evento-specifiche (es. per ogni tappa della campagna)
- Font proprietari HERA: se il cliente vuole usare il proprio font corporate nella postcard e nell'interfaccia, serve il file `.woff2` con relativa licenza d'uso web


## 11. Dominio e infrastruttura

L'applicazione è attualmente deployata su Vercel con dominio generato automaticamente (`hera-armo.vercel.app`). Per la messa in produzione serve:

- Il dominio finale (es. `armocromia.gruppohera.it` o sottodominio analogo)
- Sapere chi gestisce il DNS lato HERA per poter configurare il puntamento
- Conferma che HTTPS sia sufficiente come protocollo di sicurezza
- Se è previsto un sistema di monitoraggio o alerting lato HERA, o se è sufficiente il dashboard Vercel che gestiamo noi
