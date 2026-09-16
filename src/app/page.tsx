"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { scoresToConicGradient } from "@/lib/gradient";
import { generatePostcard, downloadPostcard } from "@/lib/postcard";
import { HERA_COLORS } from "@/lib/constants";
import { KioskKeyboard } from "@/components/kiosk/KioskKeyboard";
import { CameraIcon, ImageIcon, CheckIcon, RefreshIcon } from "@/components/kiosk/CameraIcons";
import type {
  ArmoEvent,
  ArmoSettings,
  ArmoQuestion,
  ArmoProfile,
  ColorScores,
  QuizAnswer,
  PlayResult,
  SelectedOption,
} from "@/lib/types";

type Screen =
  | "loading"
  | "intro"
  | "age_selection"
  | "form"
  | "selfie"
  | "quiz"
  | "calculating"
  | "result"
  | "prize"
  | "error";

type SelfieStep = "idle" | "capturing" | "preview";
type AgeGroup = "young" | "classic";
type KioskField = "nome" | "cognome" | "email" | "telefono" | "comune";

// Kiosk 1080x1920 — vincoli d'uso: la fascia 0-450px dall'alto è scomoda da
// raggiungere e non deve contenere nulla di cliccabile; gli ultimi 200px in
// basso restano vuoti (margine di comfort). Ogni elemento touch vive nella
// TouchZone, che assorbe lo spazio restante.
const TOP_SAFE = 450;
const BOTTOM_SAFE = 200;

function TopZone({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="shrink-0 w-full flex flex-col items-center justify-center gap-5 px-16 text-center"
      style={{ minHeight: TOP_SAFE }}
    >
      {children}
    </div>
  );
}

function TouchZone({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex-1 w-full flex flex-col items-center justify-center px-16 ${className}`}>
      {children}
    </div>
  );
}

function BottomSafe() {
  return <div className="shrink-0 w-full" style={{ minHeight: BOTTOM_SAFE }} />;
}

function HeraLogo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/hera-logo.webp"
      alt="Gruppo Hera"
      className={className}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

const CATEGORY_ICONS: Record<string, { icon: string; label: string; color: string }> = {
  verde:   { icon: "🌱", label: "Ambiente", color: HERA_COLORS.verde },
  ciano:   { icon: "💧", label: "Acqua",    color: HERA_COLORS.ciano },
  magenta: { icon: "⚡", label: "Energia",  color: HERA_COLORS.magenta },
};

// Microcopy generica per le 3 categorie sulla card risultato — placeholder
// neutro in attesa di testi definitivi validati dal team copy HERA (vedi
// TO_ASK.md, punto 9 "Contenuti testuali").
const CATEGORY_SUBLABEL: Record<string, string> = {
  verde: "Rispetto per l'ambiente",
  ciano: "Consumo consapevole",
  magenta: "Efficienza energetica",
};

const MEDIAPIPE_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation";
const FACE_DETECTION_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection";

// Sistema colori pulsanti — niente gradienti sui bottoni, solo tinte piene
// con significato: magenta è l'azione di default, verde una conferma
// positiva, ciano un'azione neutra/secondaria, rosso un'azione distruttiva.
const BTN = {
  primary: HERA_COLORS.magenta,
  success: HERA_COLORS.verde,
  neutral: HERA_COLORS.ciano,
  destructive: "#ef4444",
} as const;

const MAX_SELFIE_ATTEMPTS = 3;

// Dati fake per il tasto "COMPILA" — solo per velocizzare i test, mai salvati
// nel db ufficiale. Domini .invalid/.example sono riservati IANA (RFC 2606):
// non risolvono e non possono appartenere a nessuno davvero.
const FAKE_FIRST_NAMES = ["Luca", "Giulia", "Marco", "Sara", "Davide", "Chiara", "Simone", "Elena", "Andrea", "Francesca", "Matteo", "Alice", "Riccardo", "Martina", "Federico"];
const FAKE_LAST_NAMES = ["Bianchi", "Rossi", "Verdi", "Ferrari", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "Costa", "Fontana"];
const FAKE_EMAIL_DOMAINS = ["mailtest.invalid", "fakemail.test", "noexist.example", "provaqa.invalid"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Placeholder temporanei in attesa delle immagini reali fornite dal cliente.
const PLACEHOLDER_IMAGE_POOL = [
  "/images/quiz/q8_a_shade_park.jpg",
  "/images/quiz/q8_b_shower_splash.jpg",
  "/images/quiz/q18_a_hiking_trail.jpg",
];

function pickPlaceholderImage(questionId: string, opt: SelectedOption): string {
  const key = `${questionId}-${opt}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PLACEHOLDER_IMAGE_POOL[hash % PLACEHOLDER_IMAGE_POOL.length];
}

export default function TotemPage() {
  const supabase = createClient();

  const [screen, setScreen] = useState<Screen>("loading");
  const [error, setError] = useState("");

  const [event, setEvent] = useState<ArmoEvent | null>(null);
  const [settings, setSettings] = useState<ArmoSettings | null>(null);

  // Age group
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);

  // Form
  const [formNome, setFormNome] = useState("");
  const [formCognome, setFormCognome] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formComune, setFormComune] = useState("");
  const [consenso1, setConsenso1] = useState(false);
  const [consenso2, setConsenso2] = useState(false);
  const [consenso3, setConsenso3] = useState(false);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  // true quando i campi sono stati riempiti dal tasto "COMPILA" — in quel caso
  // non salviamo il partecipante nel db ufficiale. Torna false se l'utente
  // modifica un campo a mano dopo aver premuto COMPILA.
  const [isFakeTestData, setIsFakeTestData] = useState(false);

  // Tastiera kiosk — attiva solo sul campo attualmente a fuoco
  const [activeKioskField, setActiveKioskField] = useState<KioskField | null>(null);
  const lastKioskFieldRef = useRef<KioskField>("nome");

  const [userName, setUserName] = useState("");

  const [questions, setQuestions] = useState<ArmoQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, SelectedOption>>({});
  const [autoAdvancing, setAutoAdvancing] = useState(false);

  const [birthYearForPlay, setBirthYearForPlay] = useState(1990);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [profile, setProfile] = useState<ArmoProfile | null>(null);
  const [finalScores, setFinalScores] = useState<ColorScores>({ verde: 0, ciano: 0, magenta: 0 });
  const [postcardUrl, setPostcardUrl] = useState<string | null>(null);
  const [postcardQrUrl, setPostcardQrUrl] = useState<string | null>(null);

  // Prize countdown
  const [prizeCountdown, setPrizeCountdown] = useState(20);

  // Selfie
  const [selfieStep, setSelfieStep] = useState<SelfieStep>("idle");
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [selfieStorageUrl, setSelfieStorageUrl] = useState<string | null>(null);
  const [selfieError, setSelfieError] = useState("");
  const [selfieProcessing, setSelfieProcessing] = useState(false);
  // Scatti usati sulla webcam live (max 3). Non conta l'upload da file.
  const [selfieAttempts, setSelfieAttempts] = useState(0);
  // null = nessun countdown in corso; 5→0 poi scatta in automatico ("cheese")
  const [shutterCountdown, setShutterCountdown] = useState<number | null>(null);
  // Toast transitorio per errori camera — non blocca lo schermo con uno step dedicato
  const [selfieToast, setSelfieToast] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { loadEvent(); }, []);

  // Countdown scatto — 5-4-3-2-1-cheese, poi cattura automatica
  useEffect(() => {
    if (shutterCountdown === null) return;
    if (shutterCountdown === 0) {
      const t = setTimeout(() => {
        setShutterCountdown(null);
        capturePhoto();
      }, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShutterCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [shutterCountdown]);

  // Toast camera — si chiude da solo dopo qualche secondo
  useEffect(() => {
    if (!selfieToast) return;
    const t = setTimeout(() => setSelfieToast(null), 4000);
    return () => clearTimeout(t);
  }, [selfieToast]);

  // Prize countdown timer
  useEffect(() => {
    if (screen !== "prize") return;
    setPrizeCountdown(20);
    const interval = setInterval(() => {
      setPrizeCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleRestart();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [screen]);

  // Rigenera postcard con foto scontornata se arriva dopo quiz
  useEffect(() => {
    if (screen !== "result" || !selfieDataUrl || selfieProcessing || !profile || !result) return;
    generatePostcard({
      scores: finalScores,
      profileName: profile.name,
      claim: profile.claim ?? "",
      description: profile.description ?? "",
      photoUrl: selfieDataUrl,
    }).then((url) => {
      setPostcardUrl(url);
      uploadPostcardAndQr(url, result.session_id);
    }).catch(() => {});
  }, [selfieDataUrl]);

  // Campi collegati alla tastiera kiosk (solo dove servono testo: schermata form).
  // Modificare un campo a mano invalida il flag "dati fake" — se l'utente
  // interviene manualmente, il salvataggio nel db torna a essere normale.
  const KIOSK_FIELDS: Record<KioskField, { value: string; set: (v: string) => void; variant: "text" | "email" | "tel"; label: string }> = {
    nome:     { value: formNome,     set: (v) => { setFormNome(v);     setIsFakeTestData(false); }, variant: "text",  label: "Nome" },
    cognome:  { value: formCognome,  set: (v) => { setFormCognome(v);  setIsFakeTestData(false); }, variant: "text",  label: "Cognome" },
    email:    { value: formEmail,    set: (v) => { setFormEmail(v);    setIsFakeTestData(false); }, variant: "email", label: "Email" },
    telefono: { value: formTelefono, set: (v) => { setFormTelefono(v); setIsFakeTestData(false); }, variant: "tel",   label: "Telefono" },
    comune:   { value: formComune,   set: (v) => { setFormComune(v);   setIsFakeTestData(false); }, variant: "text",  label: "Comune" },
  };

  function closeKioskKeyboard() {
    setActiveKioskField(null);
  }

  function toggleKioskKeyboard() {
    setActiveKioskField((cur) => (cur ? null : lastKioskFieldRef.current));
  }

  // Riempie il form con dati fake per velocizzare i test — non viene mai
  // salvato nel db ufficiale (vedi handleFormSubmit).
  function fillFakeTestData() {
    const first = randomFrom(FAKE_FIRST_NAMES);
    const last = randomFrom(FAKE_LAST_NAMES);
    const domain = randomFrom(FAKE_EMAIL_DOMAINS);
    const handle = `${first}.${last}${Math.floor(Math.random() * 900 + 100)}`.toLowerCase();
    const phone = `+39 3${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 9000000 + 1000000)}`;

    setFormNome(first);
    setFormCognome(last);
    setFormEmail(`${handle}@${domain}`);
    setFormTelefono(phone);
    setIsFakeTestData(true);
    setFormError("");
    closeKioskKeyboard();
  }

  async function loadEvent() {
    const { data: events } = await supabase
      .from("hera_armo_events")
      .select("*")
      .eq("is_active", true)
      .limit(1);

    if (!events || events.length === 0) {
      setError("Nessun evento attivo");
      setScreen("error");
      return;
    }

    const ev = events[0] as ArmoEvent;
    setEvent(ev);

    const { data: sett } = await supabase
      .from("hera_armo_settings")
      .select("*")
      .eq("event_id", ev.id)
      .single();

    if (!sett) {
      setError("Impostazioni evento non trovate");
      setScreen("error");
      return;
    }

    setSettings(sett as ArmoSettings);
    setScreen("intro");
  }

  async function handleAgeSelect(group: AgeGroup) {
    setAgeGroup(group);
    const birthYear = group === "young" ? 1990 : 1968;
    setBirthYearForPlay(birthYear);

    const { data: qData } = await supabase
      .from("hera_armo_questions")
      .select("*")
      .eq("event_id", event!.id)
      .eq("age_group", group)
      .eq("is_active", true);

    if (!qData || qData.length === 0) {
      setError("Nessuna domanda disponibile");
      setScreen("error");
      return;
    }

    const shuffled = (qData as ArmoQuestion[])
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    setQuestions(shuffled);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setScreen("form");
  }

  async function handleFormSubmit() {
    if (!formNome.trim() || !formCognome.trim() || !formEmail.trim() || !formTelefono.trim() || !formComune.trim()) {
      setFormError("Compila tutti i campi obbligatori");
      return;
    }
    if (!consenso1) {
      setFormError("Il consenso al trattamento dei dati è obbligatorio");
      return;
    }
    setFormLoading(true);
    setFormError("");
    closeKioskKeyboard();

    const fullName = `${formNome.trim()} ${formCognome.trim()}`;
    setUserName(fullName);

    // ── SIMULAZIONE SUITALK (solo console, nessun invio reale) ──────────────
    // Finché non abbiamo i parametri definitivi dal cliente (eventID, queue,
    // promoter) e il vero snippet, logghiamo qui il payload che INVIEREMMO,
    // per verificare che i campi mappino correttamente. Vedi armocromia/TO ASK.md.
    if (process.env.NODE_ENV === "development") {
      const suitalkConfig = {
        customerCode: "alphaomega", // fisso, confermato da doc v2
        eventID: "TODO-la-barcolana", // da HeraComm/AlphaOmega
        sessionID: crypto.randomUUID(),
        queue: "TODO-Web_Standard-o-Web_Special", // da confermare
        promoter: "TODO-hc-o-ee", // da confermare
      };
      const simulatedLeadPayload = {
        type: "traveling-event",
        nome: formNome.trim(),
        cognome: formCognome.trim(),
        email: formEmail.trim(),
        telefono: formTelefono.trim(),
        comune: formComune.trim(), // campo cautelativo — vedi nota UI, da confermare col cliente
        age_group: ageGroup,
        consenso_gaming_obbligatorio: consenso1,
        consenso_ricontatto_commerciale: consenso2,
        "consenso_profilazione (da confermare se va tenuto)": consenso3,
        timestamp: new Date().toISOString(),
      };
      console.group("%c[SUITALK SIMULAZIONE] nessun dato reale inviato", "color:#E4007D;font-weight:bold");
      console.log("SuitalkParam (config snippet):", suitalkConfig);
      console.log("Payload lead che verrebbe inviato:", simulatedLeadPayload);
      console.warn(
        "'promoter' non è un dato utente ma va configurato per evento (hc/ee) — ancora da confermare. " +
        "'comune' è stato aggiunto al form ma resta da confermare se serve anche per Evento Itinerante " +
        "(nel doc è descritto solo per Evento Generico). 'consenso_profilazione' è un nostro extra, non " +
        "descritto nel doc Suitalk per Evento Itinerante — verificare se il widget reale lo prevede o va tolto."
      );
      console.groupEnd();
    }

    // Salva partecipante — best effort, non bloccante. I dati generati dal
    // tasto "COMPILA" non vengono mai scritti nel db ufficiale.
    // NB: "comune" non viene ancora salvato qui — manca la colonna su
    // hera_armo_participants (serve una migration quando il campo sarà confermato).
    if (!isFakeTestData) {
      try {
        await supabase.from("hera_armo_participants").insert({
          event_id: event!.id,
          nome: formNome.trim(),
          cognome: formCognome.trim(),
          email: formEmail.trim(),
          telefono: formTelefono.trim(),
          age_group: ageGroup,
          consenso_dati: consenso1,
          consenso_marketing: consenso2,
          consenso_profilazione: consenso3,
        });
      } catch {
        // non bloccante
      }
    }

    setFormLoading(false);
    setSelfieDataUrl(null);
    setSelfieStorageUrl(null);
    setSelfieError("");
    setScreen("selfie");
    // Fotocamera avviata subito — è qui che il browser chiede il permesso
    startCamera();
  }

  // ── Face detection helpers ─────────────────────────────────────────────────

  async function loadFaceDetection(): Promise<any> {
    if (!(window as any).FaceDetection) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = `${FACE_DETECTION_CDN}/face_detection.js`;
        s.crossOrigin = "anonymous";
        s.onload = () => resolve();
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const FaceDetection = (window as any).FaceDetection;
    const fd = new FaceDetection({
      locateFile: (file: string) => `${FACE_DETECTION_CDN}/${file}`,
    });
    fd.setOptions({ model: "short", minDetectionConfidence: 0.5 });
    return fd;
  }

  async function detectFaceBoundingBox(canvas: HTMLCanvasElement): Promise<{
    cx: number; cy: number; w: number; h: number;
  } | null> {
    try {
      const fd = await loadFaceDetection();
      const result = await new Promise<any>((resolve, reject) => {
        fd.onResults((r: any) => resolve(r));
        fd.initialize()
          .then(() => fd.send({ image: canvas }))
          .catch(reject);
      });
      const detections = result?.detections;
      if (!detections || detections.length === 0) return null;
      const bb = detections[0].boundingBox;
      return {
        cx: bb.xCenter,
        cy: bb.yCenter,
        w: bb.width,
        h: bb.height,
      };
    } catch {
      return null;
    }
  }

  function adaptiveCrop(
    source: HTMLCanvasElement,
    face: { cx: number; cy: number; w: number; h: number }
  ): HTMLCanvasElement {
    const W = source.width;
    const H = source.height;

    // Area del viso normalizzata
    const faceArea = face.w * face.h;

    // Calcola il padding intorno al viso in base alla sua dimensione relativa
    // Viso grande (>15%) → più zoom-out (padding 3.2×)
    // Viso piccolo (<5%) → più zoom-in (padding 1.7×)
    // Normale → padding 2.4× (ulteriore zoom-out richiesto: troppo stretto sul volto)
    let padding: number;
    if (faceArea > 0.15) padding = 3.2;
    else if (faceArea < 0.05) padding = 1.7;
    else padding = 2.4;

    // Crop square centrato sul viso con il padding calcolato
    const faceSizePx = Math.max(face.w * W, face.h * H);
    const cropSize = Math.min(Math.max(faceSizePx * padding, 200), Math.min(W, H));
    const faceCxPx = face.cx * W;
    // Il centro verticale del crop viene spostato leggermente sotto il viso
    // (verso le spalle) invece che centrato esattamente sul viso, così sopra
    // la testa resta meno margine vuoto e sotto si vedono un po' le spalle.
    const faceCyPx = face.cy * H + cropSize * 0.12;

    let x0 = faceCxPx - cropSize / 2;
    let y0 = faceCyPx - cropSize / 2;
    // Clamp dentro i bordi
    x0 = Math.max(0, Math.min(x0, W - cropSize));
    y0 = Math.max(0, Math.min(y0, H - cropSize));

    const out = Math.min(cropSize, 384);
    const result = document.createElement("canvas");
    result.width = out;
    result.height = out;
    const ctx = result.getContext("2d")!;
    ctx.drawImage(source, x0, y0, cropSize, cropSize, 0, 0, out, out);
    return result;
  }

  // ── Selfie helpers ──────────────────────────────────────────────────────────

  async function startCamera() {
    setSelfieError("");
    setSelfieToast(null);
    setSelfieStep("capturing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      // Nessuno step dedicato: un toast + fallback upload/salta restano nello stesso schermo
      setSelfieToast("Fotocamera non disponibile — usa il pulsante di upload.");
      setSelfieStep("idle");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Avviata dal pulsante scatto — 5-4-3-2-1-cheese poi cattura da sola
  function startShutterCountdown() {
    if (shutterCountdown !== null) return;
    setShutterCountdown(5);
  }

  // Ritaglio quadrato centrato di fallback, quando il rilevamento volto non trova nulla
  function centerSquareCrop(source: HTMLCanvasElement, maxOut = 384): HTMLCanvasElement {
    const srcSize = Math.min(source.width, source.height);
    const outSize = Math.min(srcSize, maxOut);
    const out = document.createElement("canvas");
    out.width = outSize;
    out.height = outSize;
    const ctx = out.getContext("2d")!;
    const offsetX = (source.width - srcSize) / 2;
    const offsetY = (source.height - srcSize) / 2;
    ctx.drawImage(source, offsetX, offsetY, srcSize, srcSize, 0, 0, outSize, outSize);
    return out;
  }

  async function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Cattura il frame intero 9:16, specchiato per un selfie naturale.
    // Il ritaglio sul volto avviene più avanti (vedi processInBackground) —
    // qui mostriamo subito la foto intera in anteprima, senza tagli.
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = video.videoWidth;
    fullCanvas.height = video.videoHeight;
    const fullCtx = fullCanvas.getContext("2d")!;
    fullCtx.translate(fullCanvas.width, 0);
    fullCtx.scale(-1, 1);
    fullCtx.drawImage(video, 0, 0);
    fullCtx.setTransform(1, 0, 0, 1, 0, 0);

    stopCamera();
    setSelfieAttempts((a) => a + 1);
    showRawPreview(fullCanvas.toDataURL("image/jpeg", 0.9));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      // Foto intera in anteprima, così com'è caricata — il ritaglio sul volto
      // (se rilevato) avviene più avanti, in processInBackground.
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = img.naturalWidth;
      srcCanvas.height = img.naturalHeight;
      const ctx = srcCanvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      showRawPreview(srcCanvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setSelfieError("Formato non supportato dal browser. Usa JPG, PNG o WebP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    img.src = objectUrl;
  }

  function showRawPreview(sourceDataUrl: string) {
    setSelfieDataUrl(sourceDataUrl);
    setSelfieStep("preview");
  }

  async function processInBackground(sourceDataUrl: string) {
    setSelfieProcessing(true);
    setSelfieDataUrl(null);

    try {
      const rawImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = sourceDataUrl;
      });

      // Ritaglio sul volto (o fallback centrato) — la foto intera 9:16 vista
      // in anteprima diventa qui il quadrato stretto usato nel cerchio finale.
      const rawCanvas = document.createElement("canvas");
      rawCanvas.width = rawImg.naturalWidth;
      rawCanvas.height = rawImg.naturalHeight;
      rawCanvas.getContext("2d")!.drawImage(rawImg, 0, 0);

      const faceBox = await detectFaceBoundingBox(rawCanvas);
      const croppedCanvas = faceBox ? adaptiveCrop(rawCanvas, faceBox) : centerSquareCrop(rawCanvas);

      if (!(window as any).SelfieSegmentation) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = `${MEDIAPIPE_CDN}/selfie_segmentation.js`;
          s.crossOrigin = "anonymous";
          s.onload = () => resolve();
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = croppedCanvas.toDataURL("image/jpeg", 0.9);
      });

      const SelfieSegmentation = (window as any).SelfieSegmentation;
      const seg = new SelfieSegmentation({
        locateFile: (file: string) => `${MEDIAPIPE_CDN}/${file}`,
      });
      seg.setOptions({ modelSelection: 1 });

      const maskCanvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
        seg.onResults((results: any) => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          ctx.globalCompositeOperation = "destination-in";
          ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);
          resolve(canvas);
        });
        seg.initialize()
          .then(() => seg.send({ image: img }))
          .catch(reject);
      });

      const resultBlob = await new Promise<Blob>((resolve, reject) => {
        maskCanvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/png",
          0.9
        );
      });

      const outputUrl = URL.createObjectURL(resultBlob);
      setSelfieDataUrl(outputUrl);

      if (event) {
        const filename = `${event.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("armo-selfies-test")
          .upload(filename, resultBlob, { contentType: "image/png", upsert: false });
        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage
            .from("armo-selfies-test")
            .getPublicUrl(uploadData.path);
          setSelfieStorageUrl(urlData.publicUrl);
        }
      }
    } catch (err) {
      console.error("[BG-REMOVAL] ERROR:", err);
    } finally {
      setSelfieProcessing(false);
    }
  }

  function skipSelfie() {
    stopCamera();
    setSelfieDataUrl(null);
    setSelfieStorageUrl(null);
    setScreen("quiz");
  }

  function confirmSelfie() {
    stopCamera();
    if (selfieDataUrl) processInBackground(selfieDataUrl);
    setScreen("quiz");
  }

  function retrySelfie() {
    setSelfieDataUrl(null);
    setSelfieStorageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // Tentativi ancora disponibili → si riapre subito la camera per il nuovo scatto
    if (selfieAttempts < MAX_SELFIE_ATTEMPTS) {
      startCamera();
    } else {
      setSelfieStep("idle");
    }
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────

  function handleSelectAnswer(questionId: string, option: SelectedOption) {
    if (autoAdvancing) return;
    const newAnswers = { ...selectedAnswers, [questionId]: option };
    setSelectedAnswers(newAnswers);
    setAutoAdvancing(true);

    setTimeout(() => {
      setAutoAdvancing(false);
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
      } else {
        submitQuizWithAnswers(newAnswers);
      }
    }, 400);
  }

  async function submitQuizWithAnswers(answers: Record<string, SelectedOption>) {
    if (!event) return;
    setScreen("calculating");

    const finalAnswers: QuizAnswer[] = questions.map((q) => ({
      question_id: q.id,
      selected_option: answers[q.id],
    }));

    const scores: ColorScores = questions.reduce(
      (acc, q) => {
        const opt = answers[q.id];
        return {
          verde:   acc.verde   + (opt === "a" ? q.option_a_verde   : q.option_b_verde),
          ciano:   acc.ciano   + (opt === "a" ? q.option_a_ciano   : q.option_b_ciano),
          magenta: acc.magenta + (opt === "a" ? q.option_a_magenta : q.option_b_magenta),
        };
      },
      { verde: 0, ciano: 0, magenta: 0 }
    );

    setFinalScores(scores);

    const { data, error: err } = await supabase.rpc("hera_armo_play", {
      p_event_id: event.id,
      p_birth_year: birthYearForPlay,
      p_answers: finalAnswers,
    });

    if (err || !data) {
      setError(err?.message || "Errore durante il salvataggio");
      setScreen("error");
      return;
    }

    const playResult = data as PlayResult;
    setResult(playResult);

    const { data: profileData } = await supabase
      .from("hera_armo_profiles")
      .select("*")
      .eq("event_id", event.id)
      .eq("profile_key", playResult.profile_key)
      .eq("age_group", playResult.age_group)
      .single();

    setProfile((profileData as ArmoProfile) || null);

    try {
      const url = await generatePostcard({
        scores,
        profileName: (profileData as ArmoProfile)?.name || playResult.profile_key,
        claim: (profileData as ArmoProfile)?.claim || "",
        description: (profileData as ArmoProfile)?.description || "",
        photoUrl: selfieDataUrl ?? undefined,
      });
      setPostcardUrl(url);
      uploadPostcardAndQr(url, playResult.session_id);
    } catch {
      // silent
    }

    setTimeout(() => setScreen("result"), 1400);
  }

  async function uploadPostcardAndQr(dataUrl: string, sessionId: string) {
    if (!event) return;
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const filename = `postcards/${event.id}/${sessionId}.png`;
      const { data: up, error: upErr } = await supabase.storage
        .from("armo-selfies-test")
        .upload(filename, blob, { contentType: "image/png", upsert: true });
      if (upErr || !up) return;
      const { data: urlData } = supabase.storage.from("armo-selfies-test").getPublicUrl(up.path);
      const publicUrl = urlData.publicUrl;
      const QRCode = await import("qrcode");
      const qrDataUrl = await QRCode.toDataURL(publicUrl, { width: 400, margin: 1 });
      setPostcardQrUrl(qrDataUrl);
    } catch {
      // silent
    }
  }

  function handleRestart() {
    setAgeGroup(null);
    setFormNome("");
    setFormCognome("");
    setFormEmail("");
    setFormTelefono("");
    setConsenso1(false);
    setConsenso2(false);
    setConsenso3(false);
    setFormError("");
    setIsFakeTestData(false);
    setActiveKioskField(null);
    setUserName("");
    setQuestions([]);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setAutoAdvancing(false);
    setResult(null);
    setProfile(null);
    setFinalScores({ verde: 0, ciano: 0, magenta: 0 });
    setPostcardUrl(null);
    setPostcardQrUrl(null);
    setSelfieDataUrl(null);
    setSelfieStorageUrl(null);
    setSelfieStep("idle");
    setSelfieError("");
    setSelfieProcessing(false);
    setSelfieAttempts(0);
    setShutterCountdown(null);
    stopCamera();
    setScreen("intro");
  }

  const conicGradient = scoresToConicGradient(finalScores);
  const currentQuestion = questions[currentQuestionIndex];

  // Percentuali normalizzate per la card risultato (sommano ~100%, a
  // differenza di punteggi grezzi che dipendono dal numero di domande).
  const resultPercentages = {
    verde: Math.round(conicGradient.weights.verde * 100),
    ciano: Math.round(conicGradient.weights.ciano * 100),
    magenta: Math.round(conicGradient.weights.magenta * 100),
  };

  // Countdown premio come anello SVG (attesa resa informativa)
  const RING_R = 54;
  const RING_C = 2 * Math.PI * RING_R;
  const ringOffset = RING_C * (1 - prizeCountdown / 20);

  return (
    <div className="w-[1080px] min-h-[1920px] mx-auto relative bg-background text-foreground flex flex-col">

      {/* ── LOADING ── */}
      {screen === "loading" && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-[1.47rem]">Caricamento...</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {screen === "error" && (
        <div className="h-[1920px] w-full flex flex-col">
          <TopZone>
            <p className="text-destructive text-[1.47rem]">{error}</p>
          </TopZone>
          <TouchZone>
            <button onClick={handleRestart} className="text-[1.47rem] font-bold text-primary underline underline-offset-4">
              Riprova
            </button>
          </TouchZone>
          <BottomSafe />
        </div>
      )}

      {/* ── INTRO — fullscreen CTA ── */}
      {screen === "intro" && (
        <div
          className="w-full h-[1920px] flex flex-col relative overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${HERA_COLORS.verde}dd, ${HERA_COLORS.ciano}cc, ${HERA_COLORS.magenta}dd)` }}
        >
          {/* Fascia alta (0-450px): logo + hero, nulla di cliccabile */}
          <div className="shrink-0 flex flex-col items-center justify-center gap-10 px-16 pt-16 text-center" style={{ minHeight: TOP_SAFE }}>
            <HeraLogo className="h-16 w-auto brightness-0 invert" />
            <div
              className="w-[620px] h-[460px] rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)", border: "2px dashed rgba(255,255,255,0.4)" }}
            >
              <div className="text-center space-y-4">
                <div className="text-[6.3rem]">🎨</div>
                <p className="text-white/60 text-[1.75rem] font-medium">
                  Immagine CTA evento<br />
                  <span className="text-[1.4rem] opacity-60">(placeholder — da sostituire con asset HERA)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Zona touch: headline + unico CTA */}
          <TouchZone className="gap-14">
            <div className="space-y-6 text-center">
              <h1 className="text-[6.3rem] font-black tracking-tight leading-none text-white drop-shadow-lg">
                LA TUA ARMOCROMIA<br />
                <span className="text-white/90">HERAVIGLIOSA</span>
              </h1>
              <p className="text-[1.47rem] text-white/80 leading-relaxed max-w-[680px] mx-auto">
                Scopri il tuo profilo armocromatico attraverso le tue scelte quotidiane
              </p>
            </div>

            <button
              onClick={() => setScreen("age_selection")}
              className="text-[1.8375rem] font-black px-20 py-7 rounded-full text-white shadow-2xl active:scale-95 transition-transform border-4 border-white/90"
              style={{ background: BTN.primary }}
            >
              PARTECIPA
            </button>
          </TouchZone>

          <BottomSafe />
        </div>
      )}

      {/* ── AGE SELECTION — single column, box impilati ── */}
      {screen === "age_selection" && (
        <div className="h-[1920px] w-full flex flex-col">
          <TopZone>
            <HeraLogo className="h-14 w-auto" />
            <h2 className="text-[5.25rem] font-black text-foreground tracking-tight">
              Quanti anni hai?
            </h2>
            <p className="text-[1.47rem] text-muted-foreground">
              Scegli la tua fascia generazionale
            </p>
          </TopZone>

          <TouchZone className="gap-8">
            <div className="w-full max-w-[820px] flex flex-col gap-8">
              <button
                onClick={() => handleAgeSelect("young")}
                className="flex items-center gap-8 py-12 px-12 rounded-3xl border-4 border-transparent hover:border-primary transition-all active:scale-[0.99] shadow-xl text-left"
                style={{ background: `${BTN.neutral}18` }}
              >
                <span className="text-[6.3rem] shrink-0">✨</span>
                <div className="space-y-2">
                  <p className="text-[2.205rem] font-black text-foreground">Millennial & Gen Z</p>
                  <p className="text-[1.75rem] text-muted-foreground font-semibold">nati dal 1982 a oggi</p>
                </div>
              </button>

              <button
                onClick={() => handleAgeSelect("classic")}
                className="flex items-center gap-8 py-12 px-12 rounded-3xl border-4 border-transparent hover:border-primary transition-all active:scale-[0.99] shadow-xl text-left"
                style={{ background: `${BTN.neutral}18` }}
              >
                <span className="text-[6.3rem] shrink-0">🌟</span>
                <div className="space-y-2">
                  <p className="text-[2.205rem] font-black text-foreground">Gen X & Boomer</p>
                  <p className="text-[1.75rem] text-muted-foreground font-semibold">nati fino al 1981</p>
                </div>
              </button>
            </div>
          </TouchZone>

          <BottomSafe />
        </div>
      )}

      {/* ── FORM — single column, tastiera kiosk sui campi testo ── */}
      {screen === "form" && (
        <div className="h-[1920px] w-full flex flex-col">
          <TopZone>
            <HeraLogo className="h-14 w-auto" />
            <div className="w-full max-w-[780px] bg-red-50 border-2 border-red-400 rounded-2xl px-8 py-4 flex items-center gap-4 text-left">
              <span className="text-red-500 text-[1.47rem] shrink-0">⚠️</span>
              <p className="text-red-600 font-bold text-[1.4rem]">
                FORM TEMPORANEO — verrà integrato con Suitalk prima del go-live
              </p>
            </div>
            <h2 className="text-[2.94rem] font-black text-foreground tracking-tight">Registrati</h2>
            <p className="text-[1.75rem] text-muted-foreground">Inserisci i tuoi dati per partecipare</p>
          </TopZone>

          <TouchZone className="items-stretch">
            <div className="w-full max-w-[780px] mx-auto space-y-5">
              {/* Tasto manuale per richiamare/chiudere la tastiera kiosk a comando */}
              <div className="flex justify-end">
                <button
                  onClick={toggleKioskKeyboard}
                  className="flex items-center gap-2 text-[1.225rem] font-semibold px-5 py-2.5 rounded-full border-2 transition-colors"
                  style={{ borderColor: BTN.neutral, color: BTN.neutral }}
                >
                  ⌨️ {activeKioskField ? "Nascondi tastiera" : "Mostra tastiera"}
                </button>
              </div>

              {(
                [
                  { field: "nome" as KioskField, label: "Nome", placeholder: "Mario", type: "text" },
                  { field: "cognome" as KioskField, label: "Cognome", placeholder: "Rossi", type: "text" },
                  { field: "email" as KioskField, label: "Email", placeholder: "mario.rossi@email.it", type: "email" },
                  { field: "telefono" as KioskField, label: "Telefono", placeholder: "+39 333 1234567", type: "tel" },
                ] as const
              ).map(({ field, label, placeholder, type }) => (
                <div key={field} className="space-y-2">
                  <label className="text-[1.1025rem] font-semibold text-foreground">{label} *</label>
                  <input
                    type={type}
                    inputMode="none"
                    autoComplete="off"
                    spellCheck={false}
                    value={KIOSK_FIELDS[field].value}
                    onChange={(e) => KIOSK_FIELDS[field].set(e.target.value)}
                    onFocus={() => { setActiveKioskField(field); lastKioskFieldRef.current = field; }}
                    onBlur={() => setActiveKioskField((cur) => (cur === field ? null : cur))}
                    placeholder={placeholder}
                    className={`w-full text-[1.75rem] px-6 py-4 rounded-2xl border-2 bg-card text-foreground placeholder-muted-foreground/40 outline-none transition-colors ${
                      activeKioskField === field ? "border-primary" : "border-border"
                    }`}
                  />
                </div>
              ))}

              {/* Campo "comune" — aggiunto in via cautelativa, non ancora confermato dal
                  cliente per il form "Evento Itinerante" (il doc Suitalk v2 lo descrive
                  solo per "Evento Generico", per lo switch privacy territoriale HC/EE). */}
              <div className="space-y-2">
                <label className="text-[1.1025rem] font-semibold text-foreground">
                  Comune <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  inputMode="none"
                  autoComplete="off"
                  spellCheck={false}
                  value={KIOSK_FIELDS.comune.value}
                  onChange={(e) => KIOSK_FIELDS.comune.set(e.target.value)}
                  onFocus={() => { setActiveKioskField("comune"); lastKioskFieldRef.current = "comune"; }}
                  onBlur={() => setActiveKioskField((cur) => (cur === "comune" ? null : cur))}
                  placeholder="Bologna"
                  className={`w-full text-[1.75rem] px-6 py-4 rounded-2xl border-2 bg-card text-foreground placeholder-muted-foreground/40 outline-none transition-colors ${
                    activeKioskField === "comune" ? "border-primary" : "border-border"
                  }`}
                />
                <p className="text-[1.05rem] text-destructive/80 leading-snug">
                  * Campo aggiunto in via cautelativa: nel documento Suitalk questo dato serve a
                  cambiare il link privacy (HeraComm/EstEnergy) sul form "Evento Generico" — non
                  sappiamo ancora se serve anche su "Evento Itinerante" (il nostro caso). Da
                  confermare col cliente prima del go-live.
                </p>
              </div>

              {/* Consensi */}
              <div className="space-y-4 pt-2">
                {[
                  {
                    key: "c1",
                    value: consenso1,
                    setter: setConsenso1,
                    label: "Acconsento al trattamento dei dati personali ai sensi dell'art. 13 del GDPR (EU 2016/679)",
                    required: true,
                  },
                  {
                    key: "c2",
                    value: consenso2,
                    setter: setConsenso2,
                    label: "Acconsento alla ricezione di comunicazioni commerciali e promozionali da parte di HERA",
                    required: false,
                  },
                  {
                    key: "c3",
                    value: consenso3,
                    setter: setConsenso3,
                    label: "Acconsento alla profilazione dei miei dati per finalità di marketing personalizzato (da confermare se va mantenuto — non descritto nel doc Suitalk per Evento Itinerante)",
                    required: false,
                    unsure: true,
                  },
                ].map(({ key, value, setter, label, required, unsure }) => (
                  <button
                    key={key}
                    onClick={() => setter(!value)}
                    className="w-full flex items-start gap-5 text-left py-4 px-5 rounded-2xl border-2 transition-all"
                    style={{ borderColor: value ? HERA_COLORS.verde : "hsl(var(--border))", background: value ? `${HERA_COLORS.verde}11` : "transparent" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all"
                      style={{ borderColor: value ? HERA_COLORS.verde : "hsl(var(--border))", background: value ? HERA_COLORS.verde : "transparent" }}
                    >
                      {value && <span className="text-white font-bold text-[1.225rem]">✓</span>}
                    </div>
                    <span className={`text-[1.1025rem] leading-snug ${unsure ? "text-destructive/80" : "text-foreground/80"}`}>
                      {label}
                      {required ? (
                        <span className="text-destructive ml-1">*</span>
                      ) : (
                        <span className={unsure ? "text-destructive/70 ml-1" : "text-muted-foreground ml-1"}>(facoltativo)</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>

              {formError && (
                <p className="text-destructive text-[1.1025rem] font-semibold text-center">{formError}</p>
              )}

              <button
                onClick={handleFormSubmit}
                disabled={formLoading}
                className="w-full text-[1.47rem] font-black py-6 rounded-full text-white transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
                style={{ background: BTN.primary }}
              >
                {formLoading ? "Salvataggio..." : "AVANTI →"}
              </button>

              <p className="text-center text-muted-foreground/60 text-[1.4rem]">
                * campi obbligatori
              </p>

              {/* Strumento di test — riempie il form con dati fake, mai salvati nel db ufficiale */}
              <button
                onClick={fillFakeTestData}
                className="w-full text-[1.1025rem] font-bold py-4 rounded-full text-white active:scale-[0.98] transition-transform"
                style={{ background: BTN.neutral }}
              >
                🧪 COMPILA (dati di test, non salvati)
              </button>
            </div>
          </TouchZone>

          <BottomSafe />
        </div>
      )}

      {/* ── SELFIE — viewfinder fullscreen 9:16, overlay in stile fotocamera ── */}
      {screen === "selfie" && (
        <div className="relative h-[1920px] w-full overflow-hidden bg-background">
          <canvas ref={captureCanvasRef} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />

          {/* Sfondo — video live, foto scattata, o placeholder neutro se la camera non c'è */}
          <div className="absolute inset-0">
            {selfieStep === "idle" && (
              <div className="w-full h-full flex items-center justify-center" style={{ background: `${BTN.neutral}0f` }}>
                <CameraIcon className="w-28 h-28" style={{ color: BTN.neutral }} />
              </div>
            )}
            {selfieStep === "capturing" && (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
            )}
            {selfieStep === "preview" && selfieDataUrl && (
              <img src={selfieDataUrl} alt="Anteprima selfie" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Badge tentativo — overlay in alto, non cliccabile */}
          {selfieStep === "capturing" && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full backdrop-blur-md bg-white/85 shadow-md">
              <span className="text-foreground text-[1.05rem] font-semibold tracking-wide">
                Scatto {selfieAttempts + 1} di {MAX_SELFIE_ATTEMPTS}
              </span>
            </div>
          )}

          {/* Toast camera — errore non bloccante, sparisce da solo */}
          {selfieToast && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full backdrop-blur-md bg-destructive/90 shadow-lg max-w-[90%]">
              <span className="text-white text-[1.05rem] font-semibold text-center block">{selfieToast}</span>
            </div>
          )}

          {/* Pannello inferiore — frosted, overlay su video/foto, tutti i controlli */}
          <div className="absolute bottom-0 inset-x-0 backdrop-blur-xl bg-background/90 rounded-t-[48px] shadow-[0_-8px_40px_rgba(0,0,0,0.15)] px-10 pt-8 pb-16 flex flex-col items-center gap-6">
            {selfieStep === "idle" && (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-[2.1rem] font-black text-foreground">Fotocamera non disponibile</h2>
                  <p className="text-[1.4rem] text-muted-foreground leading-relaxed max-w-[720px]">
                    Puoi comunque partecipare caricando una foto dal dispositivo, oppure saltare questo passaggio.
                  </p>
                  {selfieError && <p className="text-[1.05rem] text-destructive font-medium">{selfieError}</p>}
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-3 text-[1.4rem] font-bold px-14 py-6 rounded-full text-white shadow-lg active:scale-95 transition-transform"
                    style={{ background: BTN.primary }}
                  >
                    <CameraIcon className="w-7 h-7" /> Riprova con la fotocamera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-3 text-[1.4rem] font-semibold px-10 py-4 rounded-full border-2 transition-colors"
                    style={{ borderColor: BTN.neutral, color: BTN.neutral }}
                  >
                    <ImageIcon className="w-6 h-6" /> Carica una foto
                  </button>
                  <button onClick={skipSelfie} className="text-[1.4rem] py-2 text-muted-foreground underline">
                    Salta questo passaggio
                  </button>
                </div>
              </>
            )}

            {selfieStep === "capturing" && (
              <>
                <p className="text-[1.4rem] text-muted-foreground text-center">Quando sei pronto/a, premi lo scatto</p>

                <button
                  onClick={startShutterCountdown}
                  disabled={shutterCountdown !== null}
                  className="w-full max-w-[640px] h-[110px] rounded-full flex items-center justify-between px-4 text-white shadow-xl active:scale-[0.98] transition-transform disabled:opacity-50"
                  style={{ background: BTN.primary }}
                >
                  <span className="w-[86px] h-[86px] rounded-full bg-white flex items-center justify-center shrink-0">
                    <CameraIcon className="w-9 h-9" style={{ color: BTN.primary }} />
                  </span>
                  <span className="flex-1 text-[1.75rem] font-black tracking-widest uppercase">Scatta</span>
                  <span className="w-[86px] shrink-0" aria-hidden="true" />
                </button>

                <button onClick={skipSelfie} className="text-[1.4rem] py-1 text-muted-foreground underline">
                  Salta questo passaggio
                </button>
              </>
            )}

            {selfieStep === "preview" && selfieDataUrl && (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-[2.1rem] font-black text-foreground">Ti piace questo scatto?</h2>
                  {selfieAttempts >= MAX_SELFIE_ATTEMPTS ? (
                    <p className="text-[1.4rem] text-muted-foreground">Nessun tentativo rimasto — si procede con questo scatto</p>
                  ) : MAX_SELFIE_ATTEMPTS - selfieAttempts === 1 ? (
                    <p className="text-[1.4rem] font-semibold" style={{ color: BTN.destructive }}>
                      Ultimo tentativo disponibile se rifai la foto
                    </p>
                  ) : (
                    <p className="text-[1.4rem] text-muted-foreground">Conferma per proseguire o scatta di nuovo</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                  {selfieAttempts < MAX_SELFIE_ATTEMPTS && (
                    <button
                      onClick={retrySelfie}
                      className="h-[110px] rounded-3xl px-6 flex items-center justify-between border-2 transition-colors active:scale-[0.98]"
                      style={{
                        borderColor: MAX_SELFIE_ATTEMPTS - selfieAttempts === 1 ? BTN.destructive : "hsl(var(--border))",
                        color: MAX_SELFIE_ATTEMPTS - selfieAttempts === 1 ? BTN.destructive : "hsl(var(--foreground))",
                      }}
                    >
                      <span className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <RefreshIcon className="w-6 h-6" />
                      </span>
                      <span className="flex flex-col items-end min-w-0">
                        <span className="text-[1.4rem] font-bold uppercase tracking-wide leading-tight">Riprova</span>
                        <span className="text-[1.05rem] font-medium opacity-70">
                          ({MAX_SELFIE_ATTEMPTS - selfieAttempts} rimasti)
                        </span>
                      </span>
                    </button>
                  )}
                  <button
                    onClick={confirmSelfie}
                    className={`h-[110px] rounded-3xl px-6 flex items-center justify-between text-white shadow-xl active:scale-[0.98] transition-transform ${
                      selfieAttempts >= MAX_SELFIE_ATTEMPTS ? "col-span-2" : ""
                    }`}
                    style={{ background: BTN.success }}
                  >
                    <span className="flex flex-col items-start min-w-0">
                      <span className="text-[1.4rem] font-black uppercase tracking-wide leading-tight">Usa questa foto</span>
                      <span className="text-[1.05rem] font-semibold opacity-85 uppercase tracking-wider">Conferma e procedi</span>
                    </span>
                    <span className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0">
                      <CheckIcon className="w-7 h-7" style={{ color: BTN.success }} />
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Countdown scatto — overlay fullscreen, anello + numero in gradiente HERA + flash */}
          {shutterCountdown !== null && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
              {/* Bagliore pulsante dietro il numero */}
              <div className="absolute w-[420px] h-[420px] rounded-full bg-white/10 blur-3xl animate-pulse" />

              <div className="relative flex items-center justify-center" style={{ width: 340, height: 340 }}>
                <svg width="340" height="340" viewBox="0 0 340 340" className="absolute inset-0 -rotate-90">
                  <circle cx="170" cy="170" r="150" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                  <circle
                    cx="170" cy="170" r="150" fill="none"
                    stroke="url(#selfieCountdownGradient)" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 150}
                    strokeDashoffset={2 * Math.PI * 150 * (1 - shutterCountdown / 5)}
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                  <defs>
                    <linearGradient id="selfieCountdownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={HERA_COLORS.verde} />
                      <stop offset="50%" stopColor={HERA_COLORS.ciano} />
                      <stop offset="100%" stopColor={HERA_COLORS.magenta} />
                    </linearGradient>
                  </defs>
                </svg>
                <span
                  className="font-black bg-clip-text text-transparent"
                  style={{
                    fontSize: shutterCountdown === 0 ? "3.5rem" : "6.3rem",
                    backgroundImage: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`,
                    filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.35))",
                  }}
                >
                  {shutterCountdown === 0 ? "CHEESE!" : shutterCountdown}
                </span>
              </div>

              {/* Flash bianco al momento dello scatto */}
              <div
                className="absolute inset-0 bg-white transition-opacity duration-150 pointer-events-none"
                style={{ opacity: shutterCountdown === 0 ? 0.85 : 0 }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── QUIZ — 1 domanda per schermata ── */}
      {screen === "quiz" && currentQuestion && (
        <div className="h-[1920px] w-full flex flex-col">
          <TopZone>
            <HeraLogo className="h-14 w-auto" />
            <div className="w-full max-w-[820px] space-y-3">
              <p className="text-[1.1025rem] font-semibold text-muted-foreground uppercase tracking-widest">
                Domanda {currentQuestionIndex + 1} di {questions.length}
              </p>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentQuestionIndex) / questions.length) * 100}%`,
                    background: `linear-gradient(90deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano})`,
                  }}
                />
              </div>
            </div>
          </TopZone>

          <TouchZone className="-translate-y-[300px]">
            <div className="w-full max-w-[820px] space-y-10">
              <h3 className="text-[1.8375rem] font-black text-foreground leading-snug text-center">
                {currentQuestion.question_text}
              </h3>

              <div className="flex flex-col gap-9">
                {(["a", "b"] as SelectedOption[]).map((opt) => {
                  const text = opt === "a" ? currentQuestion.option_a_text : currentQuestion.option_b_text;
                  const realImage = opt === "a" ? currentQuestion.option_a_image : currentQuestion.option_b_image;
                  const imageUrl = realImage || pickPlaceholderImage(currentQuestion.id, opt);
                  const isSelected = selectedAnswers[currentQuestion.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectAnswer(currentQuestion.id, opt)}
                      disabled={autoAdvancing}
                      aria-pressed={isSelected}
                      className={`relative flex flex-col text-left p-3 rounded-2xl border-2 transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md scale-[1.01]"
                          : "border-border bg-card"
                      } ${autoAdvancing ? "pointer-events-none" : ""}`}
                    >
                      <div className="w-full h-[320px] rounded-xl overflow-hidden bg-muted shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageUrl}
                          alt={text}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between px-2 py-4">
                        <span className={`text-[1.47rem] font-semibold leading-snug ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {text}
                        </span>
                        <span
                          className={`ml-4 w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center text-[1.05rem] ${
                            isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {process.env.NODE_ENV === "development" && (
                <div className="text-center">
                  <button
                    onClick={() => {
                      const autoAnswers: Record<string, SelectedOption> = {};
                      questions.forEach((q) => { autoAnswers[q.id] = "a"; });
                      submitQuizWithAnswers(autoAnswers);
                    }}
                    className="text-[1.05rem] text-muted-foreground/40 underline underline-offset-2"
                  >
                    [dev] auto-rispondi tutto
                  </button>
                </div>
              )}
            </div>
          </TouchZone>

          <BottomSafe />
        </div>
      )}

      {/* ── CALCULATING ── */}
      {screen === "calculating" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="w-32 h-32 rounded-full border-4 border-muted border-t-primary mx-auto animate-spin" />
          <p className="text-[1.8375rem] font-bold text-foreground">Stiamo elaborando il tuo profilo...</p>
          <p className="text-[1.75rem] text-muted-foreground">Il tuo gradiente è unico e irripetibile</p>
        </div>
      )}

      {/* ── RESULT ── */}
      {screen === "result" && result && (
        <div
          className="w-full h-[1920px] flex flex-col"
          style={{ background: `linear-gradient(160deg, ${HERA_COLORS.verde}18, ${HERA_COLORS.ciano}18, ${HERA_COLORS.magenta}18)` }}
        >
          <style>{`
            @keyframes heraReveal {
              from { opacity: 0; transform: scale(0.85); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>

          <div className="shrink-0 w-full flex flex-col items-center justify-center gap-3 px-16 text-center" style={{ minHeight: TOP_SAFE }}>
            <HeraLogo className="h-14 w-auto" />
            <p className="text-[1.4rem] font-semibold text-muted-foreground uppercase tracking-widest">
              Profilo Armonico Generato
            </p>
          </div>

          {/* Card scrollabile — non deve mai coprire i tasti azione sotto */}
          <div className="flex-1 min-h-0 w-full flex flex-col items-center px-16 pb-6">
            <div className="w-full max-w-[820px] flex-1 min-h-0 overflow-y-auto rounded-[40px] bg-card shadow-2xl px-10 py-10 flex flex-col items-center gap-8">
              {/* Nome profilo + claim */}
              <div className="text-center space-y-2">
                <h2 className="text-[2.94rem] font-black text-foreground tracking-tight leading-none">
                  {profile?.name || result.profile_key.toUpperCase()}
                </h2>
                {profile?.claim && (
                  <p className="text-[1.47rem] text-muted-foreground max-w-[600px] mx-auto leading-snug">
                    {profile.claim}
                  </p>
                )}
              </div>

              {/* Foto con anello a sfumatura HERA — focal point, reveal animato */}
              <div
                className="rounded-full p-5 shadow-2xl shrink-0"
                style={{ background: conicGradient.css, width: 340, height: 340, animation: "heraReveal 700ms cubic-bezier(0.16,1,0.3,1) both" }}
              >
                <div
                  className="rounded-full w-full h-full overflow-hidden flex items-center justify-center"
                  style={{ background: "#e8e0ec" }}
                >
                  {selfieProcessing ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-4 border-white/40 border-t-white animate-spin" />
                      <span className="text-white/80 text-[1.05rem] font-medium">elaborazione...</span>
                    </div>
                  ) : selfieDataUrl ? (
                    <img src={selfieDataUrl} alt="Profilo" className="w-full h-full object-cover" />
                  ) : (
                    <img src="/brand/placeholder-person.svg" alt="Profilo" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>

              {/* Percentuali per categoria — tile, sempre valorizzate */}
              <div className="w-full grid grid-cols-3 gap-3">
                {[
                  { key: "verde",   pct: resultPercentages.verde },
                  { key: "ciano",   pct: resultPercentages.ciano },
                  { key: "magenta", pct: resultPercentages.magenta },
                ].map(({ key, pct }) => {
                  const cat = CATEGORY_ICONS[key];
                  return (
                    <div
                      key={key}
                      className="rounded-2xl px-3 py-4 flex flex-col items-center gap-1 text-center"
                      style={{ background: `${cat.color}14` }}
                    >
                      <span className="text-[1.75rem] font-black text-foreground leading-none">
                        {pct}<span className="text-[1.1025rem] align-top">%</span>
                      </span>
                      <span className="text-[1.05rem] font-bold uppercase tracking-wide" style={{ color: cat.color }}>
                        {cat.label}
                      </span>
                      <span className="text-[1.05rem] text-muted-foreground leading-snug">
                        {CATEGORY_SUBLABEL[key]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {profile?.description && (
                <div className="w-full rounded-2xl px-6 py-5" style={{ background: "hsl(var(--muted))" }}>
                  <p className="text-[1.1025rem] font-bold text-foreground mb-1.5">Il tuo profilo Heraviglioso</p>
                  <p className="text-[1.05rem] text-muted-foreground leading-relaxed">
                    {profile.description}
                  </p>
                </div>
              )}

              {/* QR postcard — solo a schermo, non sulla cartolina scaricata */}
              {postcardUrl && (
                <div className="w-full rounded-2xl px-6 py-5 flex items-center gap-5" style={{ background: `${HERA_COLORS.ciano}14` }}>
                  {postcardQrUrl ? (
                    <img src={postcardQrUrl} alt="QR Code postcard" className="w-20 h-20 rounded-xl shadow-md shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-muted animate-pulse shrink-0" />
                  )}
                  <div className="text-left">
                    <p className="text-[1.1025rem] font-bold text-foreground">Scarica la tua Cartolina Hera</p>
                    <p className="text-[1.05rem] text-muted-foreground leading-snug">
                      Inquadra il QR con lo smartphone per salvarla
                    </p>
                  </div>
                </div>
              )}

              {postcardUrl && (
                <button
                  onClick={() => downloadPostcard(postcardUrl)}
                  className="text-[1.05rem] font-semibold underline underline-offset-2"
                  style={{ color: HERA_COLORS.ciano }}
                >
                  ⬇️ Scarica anteprima cartolina
                </button>
              )}
            </div>
          </div>

          {/* CTA — fuori dalla card, sempre visibili senza scroll */}
          <div className="shrink-0 w-full flex flex-col items-center gap-4 px-16 pb-4">
            {result.code && (
              <button
                onClick={() => setScreen("prize")}
                className="w-full max-w-[680px] flex items-center justify-center gap-4 text-[1.47rem] font-bold px-12 py-6 rounded-full text-white transition-transform active:scale-95 shadow-xl"
                style={{ background: BTN.primary }}
              >
                🏆 SCOPRI SE HAI VINTO UN PREMIO
              </button>
            )}

            <div className="relative group">
              <button
                disabled
                className="flex items-center gap-3 text-[1.1025rem] font-semibold px-8 py-3 rounded-full border-2 border-muted-foreground/30 text-muted-foreground/50 cursor-not-allowed"
              >
                ✉️ Invia per email
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block bg-foreground text-background text-[1.225rem] rounded-xl px-4 py-3 w-64 text-center shadow-xl z-10">
                Funzione in arrivo — richiede configurazione del servizio email
              </div>
            </div>

            {!result.code && (
              <button
                onClick={handleRestart}
                className="text-[1.4rem] font-semibold px-10 py-2 text-muted-foreground underline"
              >
                Ricomincia
              </button>
            )}
          </div>

          <BottomSafe />
        </div>
      )}

      {/* ── PRIZE ── */}
      {screen === "prize" && result && (
        <div className="h-[1920px] w-full flex flex-col">
          <TopZone>
            <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
              <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
                <circle cx="70" cy="70" r={RING_R} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="70" cy="70" r={RING_R} fill="none"
                  stroke="url(#prizeGradient)" strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringOffset}
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
                <defs>
                  <linearGradient id="prizeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={HERA_COLORS.verde} />
                    <stop offset="50%" stopColor={HERA_COLORS.ciano} />
                    <stop offset="100%" stopColor={HERA_COLORS.magenta} />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute text-[1.8375rem] font-black text-foreground">{prizeCountdown}</span>
            </div>
            <p className="text-muted-foreground text-[1.4rem] -mt-2">secondi al reset</p>

            <h2
              className="text-[6.3rem] font-black tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
            >
              HAI VINTO!
            </h2>
          </TopZone>

          <TouchZone className="gap-10">
            <div className="space-y-6 text-center">
              <p className="text-[1.47rem] text-foreground font-bold">
                Complimenti! Hai ottenuto un premio.
              </p>
              <div
                className="rounded-3xl px-10 py-7 inline-block"
                style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}22, ${HERA_COLORS.ciano}22)` }}
              >
                <p className="text-[1.75rem] text-foreground/80 leading-relaxed">
                  📩 Riceverai una mail all'indirizzo che hai indicato<br />
                  con le <strong>istruzioni per il ritiro del premio</strong>.
                </p>
              </div>

              {result.prize?.name && (
                <p className="text-[1.75rem] text-muted-foreground">
                  Premio: <strong>{result.prize.name}</strong>
                </p>
              )}
            </div>

            <button
              onClick={handleRestart}
              className="text-[1.47rem] font-black px-16 py-6 rounded-full text-white shadow-xl active:scale-95 transition-transform"
              style={{ background: BTN.destructive }}
            >
              🔄 RICOMINCIA
            </button>
          </TouchZone>

          <BottomSafe />
        </div>
      )}

      {/* Tastiera kiosk — solo dove servono campi di testo (form) */}
      <KioskKeyboard
        visible={screen === "form" && activeKioskField !== null}
        value={activeKioskField ? KIOSK_FIELDS[activeKioskField].value : ""}
        label={activeKioskField ? KIOSK_FIELDS[activeKioskField].label : ""}
        variant={activeKioskField ? KIOSK_FIELDS[activeKioskField].variant : "text"}
        onChange={(v) => activeKioskField && KIOSK_FIELDS[activeKioskField].set(v)}
        onClose={closeKioskKeyboard}
      />
    </div>
  );
}
