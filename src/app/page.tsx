"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { scoresToGradient } from "@/lib/gradient";
import { generatePostcard, downloadPostcard } from "@/lib/postcard";
import { HERA_COLORS } from "@/lib/constants";
import { KioskKeyboard } from "@/components/kiosk/KioskKeyboard";
import { CameraIcon, ImageIcon, CloseIcon, CheckIcon, RefreshIcon } from "@/components/kiosk/CameraIcons";
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
type KioskField = "nome" | "cognome" | "email" | "telefono";

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
    if (!formNome.trim() || !formCognome.trim() || !formEmail.trim() || !formTelefono.trim()) {
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

    // Salva partecipante — best effort, non bloccante. I dati generati dal
    // tasto "COMPILA" non vengono mai scritti nel db ufficiale.
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
    // Viso grande (>15%) → più zoom-out (padding 2.2×)
    // Viso piccolo (<5%) → più zoom-in (padding 1.0×)
    // Normale → padding 1.6× (meno primo piano rispetto alla versione precedente)
    let padding: number;
    if (faceArea > 0.15) padding = 2.2;
    else if (faceArea < 0.05) padding = 1.0;
    else padding = 1.6;

    // Crop square centrato sul viso con il padding calcolato
    const faceSizePx = Math.max(face.w * W, face.h * H);
    const cropSize = Math.min(Math.max(faceSizePx * padding, 200), Math.min(W, H));
    const faceCxPx = face.cx * W;
    const faceCyPx = face.cy * H;

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
        video: { facingMode: "user", width: { ideal: 800 }, height: { ideal: 600 } },
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

  async function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Cattura frame completo (non specchiato — la segmentazione funziona meglio)
    const fullCanvas = document.createElement("canvas");
    fullCanvas.width = video.videoWidth;
    fullCanvas.height = video.videoHeight;
    const fullCtx = fullCanvas.getContext("2d")!;
    // Mirror orizzontale per selfie naturale
    fullCtx.translate(fullCanvas.width, 0);
    fullCtx.scale(-1, 1);
    fullCtx.drawImage(video, 0, 0);
    fullCtx.setTransform(1, 0, 0, 1, 0, 0);

    stopCamera();
    setSelfieAttempts((a) => a + 1);

    // Prova il riconoscimento facciale adattivo
    const faceBox = await detectFaceBoundingBox(fullCanvas);
    if (faceBox) {
      const cropped = adaptiveCrop(fullCanvas, faceBox);
      showRawPreview(cropped.toDataURL("image/jpeg", 0.85));
      return;
    }

    // Fallback: center-crop quadrato
    const srcSize = Math.min(video.videoWidth, video.videoHeight);
    const outSize = Math.min(srcSize, 384);
    const fallback = document.createElement("canvas");
    fallback.width = outSize;
    fallback.height = outSize;
    const ctx = fallback.getContext("2d")!;
    const offsetX = (fullCanvas.width - srcSize) / 2;
    const offsetY = (fullCanvas.height - srcSize) / 2;
    ctx.drawImage(fullCanvas, offsetX, offsetY, srcSize, srcSize, 0, 0, outSize, outSize);
    showRawPreview(fallback.toDataURL("image/jpeg", 0.85));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      const srcCanvas = document.createElement("canvas");
      srcCanvas.width = img.naturalWidth;
      srcCanvas.height = img.naturalHeight;
      const ctx = srcCanvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      // Prova face detection
      const faceBox = await detectFaceBoundingBox(srcCanvas);
      if (faceBox) {
        const cropped = adaptiveCrop(srcCanvas, faceBox);
        showRawPreview(cropped.toDataURL("image/jpeg", 0.85));
        return;
      }

      // Fallback: center-crop
      const srcSize = Math.min(img.naturalWidth, img.naturalHeight);
      const size = Math.min(srcSize, 384);
      const out = document.createElement("canvas");
      out.width = size;
      out.height = size;
      const outCtx = out.getContext("2d")!;
      const offsetX = (img.naturalWidth - srcSize) / 2;
      const offsetY = (img.naturalHeight - srcSize) / 2;
      outCtx.drawImage(img, offsetX, offsetY, srcSize, srcSize, 0, 0, size, size);
      showRawPreview(out.toDataURL("image/jpeg", 0.85));
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
        el.src = sourceDataUrl;
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

  const gradient = scoresToGradient(finalScores);
  const currentQuestion = questions[currentQuestionIndex];

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
                    label: "Acconsento alla profilazione dei miei dati per finalità di marketing personalizzato",
                    required: false,
                  },
                ].map(({ key, value, setter, label, required }) => (
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
                    <span className="text-[1.1025rem] text-foreground/80 leading-snug">
                      {label}
                      {required ? (
                        <span className="text-destructive ml-1">*</span>
                      ) : (
                        <span className="text-muted-foreground ml-1">(facoltativo)</span>
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

      {/* ── SELFIE — viewfinder quadrato in stile fotocamera iOS ── */}
      {screen === "selfie" && (
        <div className="h-[1920px] w-full flex flex-col bg-background">
          <canvas ref={captureCanvasRef} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />

          {/* Header — solo logo, 200px, nulla di cliccabile */}
          <div className="shrink-0 w-full flex items-center justify-center" style={{ height: 200 }}>
            <HeraLogo className="h-12 w-auto" />
          </div>

          {/* Viewfinder — 1080×1080, pulito, full-bleed */}
          <div className="relative shrink-0 w-full overflow-hidden" style={{ height: 1080, background: `${BTN.neutral}0f` }}>
            {selfieStep === "idle" && (
              <div className="w-full h-full flex items-center justify-center">
                <CameraIcon className="w-28 h-28" style={{ color: BTN.neutral }} />
              </div>
            )}

            {selfieStep === "capturing" && (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                {/* Badge tentativo — overlay traslucido stile iOS */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 px-6 py-2.5 rounded-full backdrop-blur-md bg-black/40">
                  <span className="text-white text-[1.05rem] font-semibold tracking-wide">
                    Scatto {selfieAttempts + 1} di {MAX_SELFIE_ATTEMPTS}
                  </span>
                </div>
                {/* Countdown scatto — overlay trasparente, numeri in gradiente HERA */}
                {shutterCountdown !== null && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <span
                      className="font-black bg-clip-text text-transparent"
                      style={{
                        fontSize: shutterCountdown === 0 ? "3.5rem" : "9.1rem",
                        backgroundImage: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`,
                        filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.35))",
                      }}
                    >
                      {shutterCountdown === 0 ? "CHEESE!" : shutterCountdown}
                    </span>
                  </div>
                )}
              </>
            )}

            {selfieStep === "preview" && selfieDataUrl && (
              <img src={selfieDataUrl} alt="Anteprima selfie" className="w-full h-full object-cover" />
            )}

            {/* Toast camera — errore non bloccante, sparisce da solo */}
            {selfieToast && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full backdrop-blur-md bg-destructive/90 shadow-lg max-w-[90%]">
                <span className="text-white text-[1.05rem] font-semibold text-center block">{selfieToast}</span>
              </div>
            )}
          </div>

          {/* Pannello inferiore — messaggi + controlli, tutto lo spazio restante */}
          <div className="flex-1 flex flex-col items-center justify-center px-16 pb-16 gap-8">
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

                <div className="flex items-center justify-center gap-16 w-full">
                  <button
                    onClick={skipSelfie}
                    aria-label="Salta"
                    className="w-16 h-16 rounded-full flex items-center justify-center bg-muted text-foreground/60 active:scale-90 transition-transform"
                  >
                    <CloseIcon className="w-7 h-7" />
                  </button>

                  <button
                    onClick={startShutterCountdown}
                    disabled={shutterCountdown !== null}
                    aria-label="Scatta"
                    className="rounded-full flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                    style={{ width: 104, height: 104, border: "5px solid hsl(var(--foreground) / 0.15)" }}
                  >
                    <span className="rounded-full" style={{ width: 84, height: 84, background: BTN.primary }} />
                  </button>

                  <div className="w-16 h-16" aria-hidden="true" />
                </div>
              </>
            )}

            {selfieStep === "preview" && selfieDataUrl && (
              <>
                <div className="text-center space-y-2">
                  <h2 className="text-[2.1rem] font-black text-foreground">Ti piace?</h2>
                  {selfieAttempts >= MAX_SELFIE_ATTEMPTS ? (
                    <p className="text-[1.4rem] text-muted-foreground">Nessun tentativo rimasto — si procede con questo scatto</p>
                  ) : MAX_SELFIE_ATTEMPTS - selfieAttempts === 1 ? (
                    <p className="text-[1.4rem] font-semibold" style={{ color: BTN.destructive }}>
                      Ultimo tentativo disponibile se rifai la foto
                    </p>
                  ) : (
                    <p className="text-[1.4rem] text-muted-foreground">Se sei soddisfatto/a, procedi al quiz</p>
                  )}
                </div>

                <div className="flex items-center justify-center gap-5 w-full flex-wrap">
                  {selfieAttempts < MAX_SELFIE_ATTEMPTS && (
                    <button
                      onClick={retrySelfie}
                      className="flex items-center gap-3 text-[1.4rem] font-semibold px-8 py-5 rounded-full border-2 transition-colors"
                      style={{
                        borderColor: MAX_SELFIE_ATTEMPTS - selfieAttempts === 1 ? BTN.destructive : BTN.neutral,
                        color: MAX_SELFIE_ATTEMPTS - selfieAttempts === 1 ? BTN.destructive : BTN.neutral,
                      }}
                    >
                      <RefreshIcon className="w-6 h-6" /> Riprova ({MAX_SELFIE_ATTEMPTS - selfieAttempts})
                    </button>
                  )}
                  <button
                    onClick={confirmSelfie}
                    className="flex items-center gap-3 text-[1.4rem] font-bold px-10 py-5 rounded-full text-white shadow-lg active:scale-95 transition-transform"
                    style={{ background: BTN.success }}
                  >
                    <CheckIcon className="w-6 h-6" /> Usa questa foto
                  </button>
                </div>
              </>
            )}
          </div>
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

          <TouchZone>
            <div className="w-full max-w-[820px] space-y-10">
              <h3 className="text-[1.8375rem] font-black text-foreground leading-snug text-center">
                {currentQuestion.question_text}
              </h3>

              <div className="flex flex-col gap-5">
                {(["a", "b"] as SelectedOption[]).map((opt) => {
                  const icon = opt === "a" ? currentQuestion.option_a_icon : currentQuestion.option_b_icon;
                  const text = opt === "a" ? currentQuestion.option_a_text : currentQuestion.option_b_text;
                  const isSelected = selectedAnswers[currentQuestion.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectAnswer(currentQuestion.id, opt)}
                      disabled={autoAdvancing}
                      aria-pressed={isSelected}
                      className={`flex items-center gap-6 text-left px-8 py-7 rounded-2xl border-2 transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-md scale-[1.01]"
                          : "border-border bg-card"
                      } ${autoAdvancing ? "pointer-events-none" : ""}`}
                    >
                      <span className="text-[2.94rem] shrink-0">{icon}</span>
                      <span className={`text-[1.47rem] font-semibold leading-snug ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {text}
                      </span>
                      {isSelected && (
                        <span className="ml-auto text-primary text-[1.8375rem] shrink-0">✓</span>
                      )}
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

          <TopZone>
            <HeraLogo className="h-14 w-auto" />
            <p className="text-[1.75rem] font-semibold text-muted-foreground uppercase tracking-widest">
              IL TUO GRADIENTE HERA
            </p>
          </TopZone>

          <TouchZone className="gap-8 justify-start pt-2">
            {/* Foto con anello gradiente — focal point, reveal animato */}
            <div
              className="rounded-full p-5 shadow-2xl"
              style={{ background: gradient.css, width: 340, height: 340, animation: "heraReveal 700ms cubic-bezier(0.16,1,0.3,1) both" }}
            >
              <div className="rounded-full w-full h-full overflow-hidden flex items-center justify-center" style={{ background: "#e8e0ec" }}>
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

            {/* Nome profilo */}
            <div className="text-center space-y-2">
              <h2 className="text-[2.94rem] font-black text-foreground tracking-tight leading-none">
                {profile?.name || result.profile_key.toUpperCase()}
              </h2>
              {profile?.claim && (
                <p className="text-[1.75rem] text-foreground/70 italic max-w-[680px] mx-auto">
                  {profile.claim}
                </p>
              )}
            </div>

            {/* Barra gradiente */}
            <div className="w-full max-w-[520px] h-4 rounded-full shadow-md" style={{ background: gradient.css }} />

            {/* Score V/C/M */}
            <div className="flex justify-center gap-10">
              {[
                { key: "verde",   score: result.score_verde },
                { key: "magenta", score: result.score_magenta },
                { key: "ciano",   score: result.score_ciano },
              ].map(({ key, score }) => {
                const cat = CATEGORY_ICONS[key];
                return (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <div
                      className="rounded-full flex items-center justify-center text-[1.8375rem]"
                      style={{ width: 64, height: 64, backgroundColor: cat.color + "22", border: `3px solid ${cat.color}` }}
                    >
                      {cat.icon}
                    </div>
                    <span className="text-[1.75rem] font-black" style={{ color: cat.color }}>{score}</span>
                    <span className="text-[1.225rem] text-muted-foreground font-semibold uppercase tracking-wider">{cat.label}</span>
                  </div>
                );
              })}
            </div>

            {profile?.description && (
              <p className="text-[1.1025rem] text-muted-foreground max-w-[680px] mx-auto text-center leading-relaxed">
                {profile.description}
              </p>
            )}

            {/* CTA — sempre nella touch zone */}
            <div className="flex flex-col items-center gap-5 pt-2 w-full max-w-[680px]">
              {result.code && (
                <button
                  onClick={() => setScreen("prize")}
                  className="w-full flex items-center justify-center gap-4 text-[1.47rem] font-bold px-12 py-6 rounded-full text-white transition-transform active:scale-95 shadow-xl"
                  style={{ background: BTN.primary }}
                >
                  🏆 SCOPRI SE HAI VINTO UN PREMIO
                </button>
              )}

              {postcardUrl && (
                <div className="w-full flex flex-col items-center gap-4 py-2">
                  <p className="text-[1.75rem] font-bold text-foreground tracking-wide text-center">
                    Scarica la tua postcard
                  </p>
                  {postcardQrUrl ? (
                    <>
                      <img src={postcardQrUrl} alt="QR Code postcard" className="w-44 h-44 rounded-2xl shadow-lg" />
                      <p className="text-[1.4rem] text-muted-foreground text-center">
                        Inquadra il QR con il tuo smartphone
                      </p>
                    </>
                  ) : (
                    <div className="w-44 h-44 rounded-2xl bg-muted animate-pulse" />
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

                  {process.env.NODE_ENV === "development" && (
                    <button
                      onClick={() => downloadPostcard(postcardUrl)}
                      className="text-[1.225rem] text-muted-foreground/40 underline underline-offset-2"
                    >
                      [dev] download diretto
                    </button>
                  )}
                </div>
              )}

              {!result.code && (
                <button
                  onClick={handleRestart}
                  className="text-[1.75rem] font-semibold px-10 py-4 text-muted-foreground underline"
                >
                  Ricomincia
                </button>
              )}
            </div>
          </TouchZone>

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
