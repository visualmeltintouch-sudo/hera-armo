-- ============================================================
-- SEED DATA — Armocromia Heravigliosa
-- Eseguire DOPO schema.sql e DOPO aver creato un evento
-- Sostituire EVENT_ID con l'id dell'evento creato
-- ============================================================

-- Per comodità, crea un evento di test e cattura l'id
DO $$
DECLARE
  v_event_id uuid;
BEGIN

INSERT INTO hera_armo_events (name, location, code_letter, date_start, is_active)
VALUES ('Evento Test Armocromia', 'Bologna', 'A', CURRENT_DATE, true)
RETURNING id INTO v_event_id;

-- Settings
INSERT INTO hera_armo_settings (event_id, year_cutoff, hera_threshold, questions_per_session)
VALUES (v_event_id, 1982, 2, 10);

-- ============================================================
-- DOMANDE GIOVANI (Proposta 1 — young, nati dal 1997+)
-- ============================================================

INSERT INTO hera_armo_questions (event_id, age_group, sort_order, question_text, option_a_text, option_a_verde, option_a_ciano, option_a_magenta, option_b_text, option_b_verde, option_b_ciano, option_b_magenta) VALUES
(v_event_id, 'young', 1,
 'Esci per una giornata infinita. Prima cosa che controlli?',
 'Che la borraccia sia piena', 0, 2, 0,
 'Che ci sia sempre un posto dove prendere qualcosa al volo', 0, 0, 1),

(v_event_id, 'young', 2,
 'Devi fare un tragitto breve. Vai in modalità:',
 'Cammino e mi godo il tragitto', 2, 0, 0,
 'Bici e si ottimizza il tempo', 0, 0, 1),

(v_event_id, 'young', 3,
 'Weekend libero, nessun piano. Dove ti ritrovi?',
 'Coperta stesa e zero notifiche al parco', 2, 0, 0,
 'Acqua, sole e giornata vista mare/vista montagne', 0, 2, 0),

(v_event_id, 'young', 4,
 'Allenamento ideale?',
 'Fuori, aria addosso e si resetta il cervello', 2, 0, 0,
 'Playlist giusta e modalità performance ON', 0, 0, 2),

(v_event_id, 'young', 5,
 'Torni a casa, fuori ci sono 35°.',
 'Finestre aperte e strategia anti-caldo', 2, 0, 0,
 'Clima acceso e pace fatta col mondo', 0, 0, 1),

(v_event_id, 'young', 6,
 'In cucina il tuo alter ego è:',
 '"Con quello che c''è creo qualcosa"', 2, 0, 0,
 '"Pochi step, risultato garantito"', 0, 0, 1),

(v_event_id, 'young', 7,
 'Al supermercato cosa ti conquista subito?',
 'Versione essenziale: meno packaging possibile', 2, 0, 0,
 'Versione smart: pronto e senza sbatti', 0, 0, 1),

(v_event_id, 'young', 8,
 'Giornata calda. Cosa ti resetta davvero?',
 'Un posto fresco all''aperto', 1, 1, 0,
 'Doccia veloce e si riparte', 0, 2, 0),

(v_event_id, 'young', 9,
 'Quando cucini il tuo superpotere è:',
 'Far sparire gli avanzi (nel senso buono)', 2, 0, 0,
 'Usare esattamente quello che serve', 0, 1, 1),

(v_event_id, 'young', 10,
 'Giornata fuori casa: nel tuo kit base c''è:',
 'Una shopper che appare sempre al momento giusto', 2, 0, 0,
 'La borraccia che si ricarica ovunque', 0, 2, 0),

(v_event_id, 'young', 11,
 'A casa, qual è il tuo gesto automatico?',
 'Aprire le finestre per cambiare aria', 2, 0, 0,
 'Spegnere luci e dispositivi inutilizzati', 0, 0, 2),

(v_event_id, 'young', 12,
 'Estate in città: come affronti il caldo?',
 'Ombra, tende e corrente naturale', 2, 0, 0,
 'Clima acceso, ma impostato bene', 0, 0, 1),

(v_event_id, 'young', 13,
 'Quando compri qualcosa, cosa ti convince di più?',
 'Meno imballaggi', 2, 0, 0,
 'Spedizione rapida', 0, 0, 1),

(v_event_id, 'young', 14,
 'Se qualcosa si rompe, cosa pensi per primo?',
 'Provo a ripararlo', 2, 0, 0,
 'Lo sostituisco con qualcosa di più efficiente', 0, 0, 2),

(v_event_id, 'young', 15,
 'In cucina, cosa ottimizzi di più?',
 'Acqua per lavare e cucinare', 0, 2, 0,
 'Tempi e consumi dei fornelli', 0, 0, 2),

(v_event_id, 'young', 16,
 'In spiaggia, prima di andare via, cosa fai?',
 'Controllo di non lasciare nulla sulla sabbia', 2, 0, 0,
 'Mi faccio la doccia al lido', 0, 2, 0),

(v_event_id, 'young', 17,
 'Giornata al mare: cosa non può mancare nella tua borsa?',
 'Borraccia termica sempre piena', 0, 2, 0,
 'Power bank carico per musica e foto', 0, 0, 2),

(v_event_id, 'young', 18,
 'In montagna, durante una camminata, cosa ti rappresenta di più?',
 'Scoprire nuovi sentieri', 2, 0, 0,
 'Usare app, mappe e telefono ben carichi', 0, 0, 2),

(v_event_id, 'young', 19,
 'In hotel o in casa vacanza, qual è il tuo gesto automatico?',
 'Sprecare meno acqua durante la doccia', 0, 2, 0,
 'Spegnere luci e aria quando esci', 0, 0, 2),

(v_event_id, 'young', 20,
 'Zaino da vacanza: cosa metti sempre dentro?',
 'Schiscetta per il pranzo', 2, 0, 0,
 'Comprare un drink energetico', 0, 0, 1);

-- ============================================================
-- DOMANDE CLASSIC (Proposta 2 — classic, nati prima del 1997)
-- ============================================================

INSERT INTO hera_armo_questions (event_id, age_group, sort_order, question_text, option_a_text, option_a_verde, option_a_ciano, option_a_magenta, option_b_text, option_b_verde, option_b_ciano, option_b_magenta) VALUES
(v_event_id, 'classic', 1,
 'Esci di casa per una giornata lunga. Cosa porti con te?',
 'Borraccia riutilizzabile', 0, 2, 0,
 'Bottiglietta al volo', 0, 0, 1),

(v_event_id, 'classic', 2,
 'Per uno spostamento breve scegli più spesso…',
 'Vado a piedi', 2, 0, 0,
 'Prendo la bici', 0, 0, 1),

(v_event_id, 'classic', 3,
 'Weekend libero: cosa ti chiama di più?',
 'Picnic al parco', 2, 0, 0,
 'Giornata al mare', 0, 2, 0),

(v_event_id, 'classic', 4,
 'Allenamento ideale?',
 'Sport all''aria aperta', 2, 0, 0,
 'Palestra con playlist giusta', 0, 0, 2),

(v_event_id, 'classic', 5,
 'Estate in città: prima mossa anti-caldo?',
 'Apro tutto e creo corrente', 2, 0, 0,
 'Accendo il climatizzatore', 0, 0, 1),

(v_event_id, 'classic', 6,
 'In cucina sei più tipo…',
 'Uso tutto, zero sprechi', 2, 0, 0,
 'Cucino veloce e pratico', 0, 0, 1),

(v_event_id, 'classic', 7,
 'Quando fai la spesa ti attira di più…',
 'Prodotto sfuso o con meno packaging', 2, 0, 0,
 'Prodotto pronto, comodo e smart', 0, 0, 1),

(v_event_id, 'classic', 8,
 'Durante una giornata calda, cosa ti rigenera di più?',
 'Stare all''ombra in un parco', 2, 0, 0,
 'Una doccia fresca e veloce', 0, 2, 0),

(v_event_id, 'classic', 9,
 'In cucina, cosa ti viene più naturale?',
 'Recuperare gli avanzi', 2, 0, 0,
 'Usare solo l''acqua che serve', 0, 2, 0),

(v_event_id, 'classic', 10,
 'Per una giornata fuori, quale abitudine ti rappresenta di più?',
 'Portare una shopper riutilizzabile', 2, 0, 0,
 'Riempire la borraccia quando puoi', 0, 2, 0),

(v_event_id, 'classic', 11,
 'A casa, qual è il tuo gesto automatico?',
 'Aprire le finestre per cambiare aria', 2, 0, 0,
 'Spegnere luci e dispositivi inutilizzati', 0, 0, 2),

(v_event_id, 'classic', 12,
 'Estate in città: come affronti il caldo?',
 'Ombra, tende e corrente naturale', 2, 0, 0,
 'Clima acceso, ma impostato bene', 0, 0, 1),

(v_event_id, 'classic', 13,
 'Quando compri qualcosa, cosa ti convince di più?',
 'Meno imballaggi', 2, 0, 0,
 'Spedizione rapida', 0, 0, 1),

(v_event_id, 'classic', 14,
 'Se qualcosa si rompe, cosa pensi per primo?',
 'Provo a ripararlo', 2, 0, 0,
 'Lo sostituisco con qualcosa di più efficiente', 0, 0, 2),

(v_event_id, 'classic', 15,
 'In cucina, cosa ottimizzi di più?',
 'Acqua per lavare e cucinare', 0, 2, 0,
 'Tempi e consumi dei fornelli', 0, 0, 2),

(v_event_id, 'classic', 16,
 'In spiaggia, prima di andare via, cosa fai?',
 'Controllo di non lasciare nulla sulla sabbia', 2, 0, 0,
 'Mi faccio la doccia al lido', 0, 2, 0),

(v_event_id, 'classic', 17,
 'Giornata al mare: cosa non può mancare nella tua borsa?',
 'Borraccia termica sempre piena', 0, 2, 0,
 'Power bank carico per musica e foto', 0, 0, 2),

(v_event_id, 'classic', 18,
 'In montagna, durante una camminata, cosa ti rappresenta di più?',
 'Scoprire nuovi sentieri', 2, 0, 0,
 'Usare app, mappe e telefono ben carichi', 0, 0, 2),

(v_event_id, 'classic', 19,
 'In hotel o in casa vacanza, qual è il tuo gesto automatico?',
 'Sprecare meno acqua durante la doccia', 0, 2, 0,
 'Spegnere luci e aria quando esci', 0, 0, 2),

(v_event_id, 'classic', 20,
 'Zaino da vacanza: cosa metti sempre dentro?',
 'Schiscetta per il pranzo', 2, 0, 0,
 'Comprare un drink energetico', 0, 0, 1);

-- ============================================================
-- PROFILI (8 = 4 profili × 2 fasce età)
-- ============================================================

INSERT INTO hera_armo_profiles (event_id, profile_key, age_group, name, claim, description) VALUES
-- Young
(v_event_id, 'ambiente', 'young', 'GREEN FLAG',
 'I''M A GREEN FLAG, BABY.',
 'Sei quella persona che fa scelte giuste senza trasformarle in una conferenza TED. Recuperi, riusi, viaggi leggero. Non vuoi fare il "sostenibile" — lo sei e basta!'),

(v_event_id, 'acqua', 'young', 'FLOW MODE',
 'SONO NEL CHILL, SEGUO IL FLOW!',
 'Ti muovi fluido come l''acqua, ti adatti a tutto e riesci a far sembrare effortless ogni impegno. Sei quello che arriva con la borraccia piena, i capelli al vento e la calma di chi sa già dove trovare il tramonto migliore.'),

(v_event_id, 'energia', 'young', 'FULL CHARGE',
 'FULL CHARGE, I''M ALL IN!',
 'Sei quella persona che esce di casa con batteria al 100%, piano B pronto e una soluzione per tutto. Ottimizzi, organizzi, accendi la situazione. Non sei "troppo": sei semplicemente già al prossimo livello.'),

(v_event_id, 'hera', 'young', 'ENERGY MIX',
 'I''M NOT A TYPE. LA MIA ARMOCROMIA È SEMPLICEMENTE HERAVIGLIOSA!',
 'Il tuo profilo è Main Mix Energy: un blend Heraviglioso di istinto, equilibrio e caos controllato. Non hai una sola sfumatura: hai tutto il gradiente.'),

-- Classic
(v_event_id, 'ambiente', 'classic', 'Gradiente Ambiente',
 'Sei così green che attorno a te tutto fiorisce.',
 'La tua sensibilità verso il mondo ambiente emerge in ogni scelta quotidiana. Le tue abitudini dimostrano attenzione e rispetto per ciò che ti circonda.'),

(v_event_id, 'acqua', 'classic', 'Gradiente Acqua',
 'Per te ogni goccia conta davvero.',
 'La tua attenzione all''acqua si riflette nelle tue abitudini di ogni giorno. Sai quanto è preziosa e la tratti con cura in ogni momento.'),

(v_event_id, 'energia', 'classic', 'Gradiente Energia',
 'La tua energia è fatta di scelte intelligenti.',
 'Le tue scelte quotidiane dimostrano una grande consapevolezza energetica. Sai come ottimizzare i consumi senza rinunciare al comfort.'),

(v_event_id, 'hera', 'classic', 'Gradiente Hera',
 'Sei un mix Heraviglioso di buone abitudini.',
 'Il tuo profilo riflette un equilibrio perfetto tra ambiente, acqua ed energia. Le tue scelte quotidiane abbracciano tutti i mondi Hera con armonia.');

-- ============================================================
-- PREMI DI ESEMPIO
-- ============================================================

INSERT INTO hera_armo_prizes (event_id, name, label, weight, stock_total, stock_remaining) VALUES
(v_event_id, 'sconto_bolletta_10', 'Sconto 10% in bolletta', 5, 50, 50),
(v_event_id, 'sconto_bolletta_20', 'Sconto 20% in bolletta', 2, 20, 20),
(v_event_id, 'biglietto_evento', 'Biglietto evento esclusivo', 1, 10, 10),
(v_event_id, 'voucher_digitale', 'Voucher digitale 15€', 3, 30, 30);

END $$;
