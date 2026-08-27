# Selfie + Rimozione Sfondo — Note Tecniche

## Libreria in uso: `@imgly/background-removal`

- **Package**: `@imgly/background-removal`
- **Come funziona**: WebAssembly (WASM) + modello ONNX in-browser. Zero API key, zero costi per immagine, zero dati inviati a server esterni. Il modello viene scaricato dal CDN jsDelivr la prima volta e poi cached dal browser (~20MB per il modello quint8).
- **Repo**: https://github.com/imgly/background-removal-js

---

## Configurazione attuale (ottimizzata per totem fieristico)

```ts
await removeBackground(blob, {
  model: "isnet_quint8",       // modello quantizzato: il più veloce (~20MB)
  output: {
    format: "image/png",       // PNG con canale alpha (trasparenza)
    quality: 0.6,              // qualità ridotta: basta per uso social/card
  },
});
```

**Pre-processing obbligatorio prima di passare al modello:**
Ridimensionare l'immagine a max 384×384 px prima della rimozione sfondo.
- Il modello non guadagna qualità oltre questa risoluzione per ritratti in cerchio su card social
- Riduce il tempo di elaborazione da ~8-15s a ~3-6s
- L'immagine finale nel risultato occupa ~280px di diametro: 384px è ampiamente sufficiente

```ts
function resizeToMax(canvas: HTMLCanvasElement, max: number): Blob {
  const offscreen = document.createElement("canvas");
  const scale = Math.min(1, max / Math.max(canvas.width, canvas.height));
  offscreen.width  = Math.round(canvas.width  * scale);
  offscreen.height = Math.round(canvas.height * scale);
  offscreen.getContext("2d")!.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
  return offscreen.toDataURL("image/jpeg", 0.85);
}
```

---

## Modelli disponibili (dal più veloce al più lento)

| Model | Dimensione | Velocità stimata | Qualità capelli/bordi |
|-------|-----------|-----------------|----------------------|
| `isnet_quint8` | ~20 MB | ⚡ ~3-6s | Buona per ritratti con sfondo uniforme |
| `isnet_fp16` | ~45 MB | ~6-10s | Migliore sui bordi irregolari |
| `isnet` | ~90 MB | ~12-20s | Massima qualità |

**Raccomandazione per totem fieristico**: `isnet_quint8` con input ridotto a 384px. In stand con sfondo neutro (step and repeat, backdrop bianco) la qualità è più che sufficiente.

---

## Alternative valutate

### remove.bg (API esterna)
- **Pro**: qualità superiore specialmente su capelli mossi/sfondi complessi
- **Contro**: richiede API key, costa ~€1.99/50 crediti (1 credito = 1 immagine HD), richiede connessione stabile, latenza rete aggiunta (~2-4s)
- **Quando usarla**: se la card viene stampata in grande formato o il cliente richiede qualità fotografica

### `@tensorflow-models/body-segmentation` (MediaPipe)
- **Pro**: segmentazione real-time (30fps) → sfondo rimosso in live camera, effetto molto più fluido
- **Contro**: più complessa da integrare, non ritorna un singolo PNG ritagliato ma una mask separata
- **Quando usarla**: se volessimo mostrare la camera con sfondo rimosso in tempo reale (live preview)

### `rembg` via Edge Function Supabase (server-side Python)
- **Pro**: massima qualità, modello U2Net, nessun carico sul client
- **Contro**: richiede Edge Function custom, cold start ~2s, non disponibile out-of-the-box con Supabase
- **Quando usarla**: se il totem fosse un device molto debole (tablet entry-level)

---

## Parametri su cui giocare

| Parametro | Valore attuale | Range | Effetto |
|-----------|---------------|-------|---------|
| `model` | `isnet_quint8` | vedi tabella sopra | velocità vs qualità |
| `output.quality` | `0.6` | 0.0 – 1.0 | dimensione file PNG |
| Risoluzione input | 384px | 256–640px | velocità (lineare) e qualità bordi |
| `output.format` | `image/png` | `image/png`, `image/webp` | WebP sarebbe più leggero ma meno supporto |

---

## Storage

- **Bucket**: `armo-selfies-test` su Supabase project `kbvtybuchcnwbqectejp`
- **Path file**: `{event_id}/{timestamp}-{random}.png`
- **RLS**: anon può uplodare, authenticated può leggere e cancellare
- **Limite file**: 5MB (ampiamente sufficiente con la configurazione attuale: ~30-80KB per immagine)
- **Bucket definitivi**: da definire con cliente (vedi TO ASK #8) — separare per evento, retention policy, accesso admin

---

## Contesto d'uso

- **Device**: totem kiosk 1080×1920, solitamente con webcam integrata o USB
- **Sfondo reale**: step and repeat HERA, sfondo uniforme → condizioni ideali per il modello
- **Output finale**: foto usata dentro un cerchio ~280px di diametro in una card digitale condivisa sui social → qualità elevata inutile
- **Target velocità**: < 10 secondi dalla cattura al risultato visibile
