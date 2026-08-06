# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Visitatori di eventi/fiere HERA (utility italiana — acqua, energia, ambiente). Pubblico generico, tutte le età (dai 18 ai 79 anni), che interagisce con un totem touchscreen 1080x1920px in uno stand fisico. Due fasce anagrafiche con tono di voce e domande distinte: giovani (nati dal 1982+, Gen Z e Millennials) e classic (nati prima del 1982, Gen X e Boomers).

Utenti secondari: operatori allo stand (verifica codici premio) e admin (gestione eventi, domande, premi).

## Product Purpose

"Armocromia Heravigliosa" è un quiz lifestyle che traduce le scelte quotidiane degli utenti in un profilo armocromatico visivo. Non è un quiz a risposte giuste/sbagliate: ogni risposta assegna punti ai tre mondi valoriali HERA (Ambiente=Verde, Acqua=Ciano, Energia=Magenta), generando un gradiente personalizzato. L'esperienza si conclude con una postcard digitale condivisibile e un sistema instant win per premi immediati.

Successo = engagement allo stand, condivisione social della postcard, raccolta lead, distribuzione premi.

## Positioning

Test di personalità armocromatico legato ai valori del brand HERA. L'output visivo (gradiente personale) rende il risultato unico, condivisibile e immediatamente riconoscibile come HERA.

## Operating Context

- Totem touchscreen fisso 1080x1920px, indoor, stand eventi
- Webcam integrata 1920x1080 per scatto selfie (futuro: scontorno AI + overlay su gradiente)
- Sessioni rapide: ~2 minuti per utente
- Multi-evento/multi-tappa: stesso sistema riutilizzato in diverse date e location
- Registrazione utente gestita esternamente (iframe da fornitore terzo)
- Operatori allo stand verificano codici premio su dispositivo separato

## Capabilities and Constraints

- 10 domande random da banco di 20, per fascia età
- Punteggio configurabile per risposta (verde/ciano/magenta indipendenti)
- 4 profili finali: Ambiente, Acqua, Energia, Hera (gradiente completo se bilanciato)
- Gradiente personalizzato in tempo reale durante il quiz
- Postcard PNG generata client-side via Canvas API
- Instant win con premi a stock, estrazione pesata, codici operatore
- Admin panel separato per gestione completa
- Risoluzione fissa 1080x1920 — nessun responsive necessario
- Deploy su Vercel, backend Supabase condiviso con Perfect Circle

## Brand Commitments

- Colori iconici HERA: Verde #00A651 (Ambiente), Ciano #00AEEF (Acqua), Magenta #EC008C (Energia)
- Il gradiente HERA completo (tutti e 3 i colori) è il risultato "perfetto"
- Naming: "Armocromia Heravigliosa" — gioco di parole armocromia + meravigliosa + Hera
- Hashtag: #LaTuaArmocromiaHeravigliosa
- Font ufficiale HERA: da integrare (asset da ricevere dal cliente)
- Logo HERA: da integrare (asset da ricevere dal cliente)

## Evidence on Hand

- Brief creativo completo con 40 domande (20 young pop + 20 classic istituzionale)
- 8 profili definiti (4 per fascia età) con nome, claim e descrizione
- Tono giovani: pop, irriverente, social (GREEN FLAG, FLOW MODE, FULL CHARGE, ENERGY MIX)
- Tono classic: istituzionale, ordinario (Gradiente Ambiente/Acqua/Energia/Hera)
- Nessun logo o font fornito ancora — placeholder necessari
- Nessuna foto reale — placeholder silhouette per ora

## Product Principles

1. **Istintivo, non didattico.** Non ci sono risposte giuste: ogni scelta rivela il profilo, non giudica.
2. **Visivamente personale.** Il gradiente è unico per ogni utente e immediatamente condivisibile.
3. **Veloce e touch-first.** Sessione completa in meno di 2 minuti su totem touchscreen.
4. **Configurabile per l'agenzia.** Tutto è gestibile dall'admin: domande, punteggi, profili, premi, soglie.
5. **Riutilizzabile tra eventi.** Multi-tappa, duplicazione eventi, stock indipendente per location.
