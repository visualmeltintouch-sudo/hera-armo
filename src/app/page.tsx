"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { scoresToGradient } from "@/lib/gradient";
import { generatePostcard, downloadPostcard } from "@/lib/postcard";
import { HERA_COLORS } from "@/lib/constants";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { loadEvent(); }, []);

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

    const fullName = `${formNome.trim()} ${formCognome.trim()}`;
    setUserName(fullName);

    // Salva partecipante — best effort, non bloccante
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

    setFormLoading(false);
    setSelfieDataUrl(null);
    setSelfieStorageUrl(null);
    setSelfieStep("idle");
    setSelfieError("");
    setScreen("selfie");
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
    // Viso grande (>15%) → più zoom-out (padding 2.0×)
    // Viso piccolo (<5%) → più zoom-in (padding 0.7×)
    // Normale → padding 1.2×
    let padding: number;
    if (faceArea > 0.15) padding = 2.0;
    else if (faceArea < 0.05) padding = 0.7;
    else padding = 1.2;

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
    setSelfieStep("capturing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setSelfieError("Fotocamera non disponibile. Usa il pulsante di upload.");
      setSelfieStep("idle");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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
    setSelfieStep("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    stopCamera();
    setScreen("intro");
  }

  const gradient = scoresToGradient(finalScores);
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="w-[1080px] min-h-[1920px] mx-auto relative bg-background text-foreground flex flex-col">

      {/* Header logo — nascosto su intro (fullscreen) e result/prize */}
      {screen !== "intro" && screen !== "result" && screen !== "prize" && (
        <header className="flex items-center justify-center pt-14 pb-8 shrink-0">
          <HeraLogo className="h-16 w-auto" />
        </header>
      )}

      {/* ── LOADING ── */}
      {screen === "loading" && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-2xl">Caricamento...</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {screen === "error" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-8">
            <p className="text-destructive text-2xl">{error}</p>
            <button onClick={handleRestart} className="text-lg text-primary underline">Riprova</button>
          </div>
        </div>
      )}

      {/* ── INTRO — fullscreen CTA ── */}
      {screen === "intro" && (
        <div
          className="w-full min-h-[1920px] flex flex-col items-center justify-between relative overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${HERA_COLORS.verde}dd, ${HERA_COLORS.ciano}cc, ${HERA_COLORS.magenta}dd)` }}
        >
          {/* Logo in alto */}
          <div className="pt-16 pb-0">
            <HeraLogo className="h-20 w-auto brightness-0 invert" />
          </div>

          {/* Contenuto centrale */}
          <div className="flex-1 flex flex-col items-center justify-center px-16 gap-14 text-center">
            {/* Placeholder immagine CTA */}
            <div
              className="w-[720px] h-[720px] rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.12)", border: "2px dashed rgba(255,255,255,0.4)" }}
            >
              <div className="text-center space-y-4">
                <div className="text-8xl">🎨</div>
                <p className="text-white/60 text-2xl font-medium">
                  Immagine CTA evento<br />
                  <span className="text-lg opacity-60">(placeholder — da sostituire con asset HERA)</span>
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h1 className="text-7xl font-black tracking-tight leading-none text-white drop-shadow-lg">
                LA TUA ARMOCROMIA<br />
                <span className="text-white/90">HERAVIGLIOSA</span>
              </h1>
              <p className="text-2xl text-white/80 leading-relaxed max-w-[680px] mx-auto">
                Scopri il tuo profilo armocromatico attraverso le tue scelte quotidiane
              </p>
            </div>

            <button
              onClick={() => setScreen("age_selection")}
              className="text-3xl font-black px-20 py-7 rounded-full text-foreground bg-white shadow-2xl hover:scale-105 transition-transform"
            >
              PARTECIPA
            </button>
          </div>

          {/* Footer */}
          <div className="pb-16">
            <p className="text-white/50 text-lg">Tocca per iniziare</p>
          </div>
        </div>
      )}

      {/* ── AGE SELECTION ── */}
      {screen === "age_selection" && (
        <div className="flex-1 flex flex-col items-center justify-center px-16 pb-16 gap-16">
          <div className="text-center space-y-4">
            <h2 className="text-6xl font-black text-foreground tracking-tight">
              Quanti anni hai?
            </h2>
            <p className="text-2xl text-muted-foreground">
              Scegli la tua fascia generazionale
            </p>
          </div>

          <div className="flex gap-8 w-full max-w-[900px]">
            {/* Box Millennial & Gen Z */}
            <button
              onClick={() => handleAgeSelect("young")}
              className="flex-1 flex flex-col items-center gap-6 py-16 px-8 rounded-3xl border-4 border-transparent hover:border-primary transition-all hover:scale-[1.02] shadow-xl text-center group"
              style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}22, ${HERA_COLORS.ciano}22)` }}
            >
              <span className="text-8xl">✨</span>
              <div className="space-y-3">
                <p className="text-4xl font-black text-foreground">Millennial & Gen Z</p>
                <p className="text-2xl text-muted-foreground font-semibold">nati dal 1982</p>
                <p className="text-lg text-muted-foreground/70">(1982 – oggi)</p>
              </div>
            </button>

            {/* Box Gen X & Boomer */}
            <button
              onClick={() => handleAgeSelect("classic")}
              className="flex-1 flex flex-col items-center gap-6 py-16 px-8 rounded-3xl border-4 border-transparent hover:border-primary transition-all hover:scale-[1.02] shadow-xl text-center group"
              style={{ background: `linear-gradient(135deg, ${HERA_COLORS.ciano}22, ${HERA_COLORS.magenta}22)` }}
            >
              <span className="text-8xl">🌟</span>
              <div className="space-y-3">
                <p className="text-4xl font-black text-foreground">Gen X & Boomer</p>
                <p className="text-2xl text-muted-foreground font-semibold">nati prima del 1982</p>
                <p className="text-lg text-muted-foreground/70">(fino al 1981)</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {screen === "form" && (
        <div className="flex-1 flex flex-col items-center justify-center px-16 pb-16 gap-12 w-full">
          {/* Banner temporaneo */}
          <div className="w-full max-w-[780px] bg-red-50 border-2 border-red-400 rounded-2xl px-8 py-4 flex items-center gap-4">
            <span className="text-red-500 text-3xl">⚠️</span>
            <p className="text-red-600 font-bold text-lg">
              FORM TEMPORANEO — verrà integrato con Suitalk prima del go-live
            </p>
          </div>

          <div className="w-full max-w-[780px] space-y-6">
            <div className="text-center space-y-3">
              <h2 className="text-5xl font-black text-foreground tracking-tight">Registrati</h2>
              <p className="text-xl text-muted-foreground">Inserisci i tuoi dati per partecipare</p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-lg font-semibold text-foreground">Nome *</label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Mario"
                  className="w-full text-xl px-6 py-4 rounded-2xl border-2 border-border bg-card text-foreground placeholder-muted-foreground/40 focus:border-primary outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-lg font-semibold text-foreground">Cognome *</label>
                <input
                  type="text"
                  value={formCognome}
                  onChange={(e) => setFormCognome(e.target.value)}
                  placeholder="Rossi"
                  className="w-full text-xl px-6 py-4 rounded-2xl border-2 border-border bg-card text-foreground placeholder-muted-foreground/40 focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-lg font-semibold text-foreground">Email *</label>
              <input
                type="email"
                inputMode="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="mario.rossi@email.it"
                className="w-full text-xl px-6 py-4 rounded-2xl border-2 border-border bg-card text-foreground placeholder-muted-foreground/40 focus:border-primary outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-lg font-semibold text-foreground">Telefono *</label>
              <input
                type="tel"
                inputMode="tel"
                value={formTelefono}
                onChange={(e) => setFormTelefono(e.target.value)}
                placeholder="+39 333 1234567"
                className="w-full text-xl px-6 py-4 rounded-2xl border-2 border-border bg-card text-foreground placeholder-muted-foreground/40 focus:border-primary outline-none transition-colors"
              />
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
                    {value && <span className="text-white font-bold text-sm">✓</span>}
                  </div>
                  <span className="text-lg text-foreground/80 leading-snug">
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
              <p className="text-destructive text-lg font-semibold text-center">{formError}</p>
            )}

            <button
              onClick={handleFormSubmit}
              disabled={formLoading}
              className="w-full text-2xl font-black py-6 rounded-full text-white transition-all hover:scale-[1.02] shadow-lg disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
            >
              {formLoading ? "Salvataggio..." : "AVANTI →"}
            </button>

            <p className="text-center text-muted-foreground/60 text-base">
              * campi obbligatori
            </p>
          </div>
        </div>
      )}

      {/* ── SELFIE ── */}
      {screen === "selfie" && (
        <div className="flex-1 flex flex-col items-center justify-center px-16 pb-16 gap-10 w-full max-w-[700px] mx-auto">
          <canvas ref={captureCanvasRef} className="hidden" />
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileUpload} />

          {selfieStep === "idle" && (
            <>
              <div className="space-y-4 text-center">
                <h2 className="text-5xl font-black text-foreground">Scatta la tua foto</h2>
                <p className="text-2xl text-muted-foreground leading-relaxed">
                  {userName ? `Ciao ${userName.split(" ")[0]}! ` : ""}Il tuo ritratto entrerà nel gradiente personale.
                </p>
              </div>

              {selfieError && (
                <p className="text-lg text-destructive font-medium">{selfieError}</p>
              )}

              <div className="flex flex-col items-center gap-5 w-full">
                <button
                  onClick={startCamera}
                  className="flex items-center gap-4 text-2xl font-bold px-14 py-6 rounded-full text-white shadow-lg hover:scale-105 transition-transform"
                  style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
                >
                  📷 APRI FOTOCAMERA
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-4 text-xl font-semibold px-12 py-5 rounded-full border-2 border-primary text-primary hover:bg-primary/5 transition-colors"
                >
                  🖼️ CARICA UNA FOTO
                </button>
                <button onClick={skipSelfie} className="text-xl py-4 px-8 text-muted-foreground underline mt-2">
                  Salta questo passaggio
                </button>
              </div>
            </>
          )}

          {selfieStep === "capturing" && (
            <>
              <div className="space-y-4 text-center">
                <h2 className="text-5xl font-black text-foreground">Mettiti in posa!</h2>
                <p className="text-xl text-muted-foreground">Centra il viso e scatta quando sei pronto/a</p>
              </div>
              <div className="relative mx-auto" style={{ width: 400, height: 400 }}>
                <div
                  className="absolute inset-0 rounded-full overflow-hidden border-8 border-transparent"
                  style={{ background: `linear-gradient(white, white) padding-box, linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta}) border-box` }}
                >
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={capturePhoto}
                  className="w-24 h-24 rounded-full text-white text-5xl flex items-center justify-center shadow-xl hover:scale-110 transition-transform"
                  style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
                >
                  📸
                </button>
                <button onClick={() => { stopCamera(); setSelfieStep("idle"); }} className="text-xl py-4 px-8 text-muted-foreground underline">
                  Annulla
                </button>
              </div>
            </>
          )}

          {selfieStep === "preview" && selfieDataUrl && (
            <>
              <div className="space-y-3 text-center">
                <h2 className="text-5xl font-black text-foreground">Ti piace?</h2>
                <p className="text-xl text-muted-foreground">Se sei soddisfatto/a, procedi al quiz</p>
              </div>
              <div className="relative mx-auto flex items-center justify-center" style={{ width: 340, height: 340 }}>
                <div
                  className="rounded-full p-5 shadow-2xl"
                  style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`, width: 340, height: 340 }}
                >
                  <div className="rounded-full w-full h-full overflow-hidden" style={{ background: "#e8e0ec" }}>
                    <img src={selfieDataUrl} alt="Selfie" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={confirmSelfie}
                  className="text-2xl font-bold px-14 py-6 rounded-full text-white shadow-lg hover:scale-105 transition-transform"
                  style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
                >
                  ✓ OTTIMA! PROCEDI
                </button>
                <button onClick={retrySelfie} className="text-xl py-4 px-8 text-muted-foreground underline">
                  Riprova
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── QUIZ — 1 domanda per schermata ── */}
      {screen === "quiz" && currentQuestion && (
        <div className="flex-1 flex flex-col items-center justify-center px-16 pb-16 gap-0 w-full max-w-[920px] mx-auto">
          {/* Progress */}
          <div className="w-full mb-10">
            <div className="flex justify-between items-center mb-3">
              <p className="text-lg font-semibold text-muted-foreground uppercase tracking-widest">
                Domanda {currentQuestionIndex + 1} di {questions.length}
              </p>
            </div>
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

          {/* Domanda */}
          <div className="w-full space-y-10">
            <h3 className="text-3xl font-black text-foreground leading-snug">
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
                        : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                    } ${autoAdvancing ? "pointer-events-none" : ""}`}
                  >
                    <span className="text-5xl shrink-0">{icon}</span>
                    <span className={`text-2xl font-semibold leading-snug ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {text}
                    </span>
                    {isSelected && (
                      <span className="ml-auto text-primary text-3xl shrink-0">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pulsante test — solo in sviluppo */}
          {process.env.NODE_ENV === "development" && (
            <button
              onClick={() => {
                const autoAnswers: Record<string, SelectedOption> = {};
                questions.forEach((q) => { autoAnswers[q.id] = "a"; });
                submitQuizWithAnswers(autoAnswers);
              }}
              className="mt-16 text-xs text-muted-foreground/40 underline underline-offset-2 hover:text-muted-foreground/60"
            >
              [dev] auto-rispondi tutto
            </button>
          )}
        </div>
      )}

      {/* ── CALCULATING ── */}
      {screen === "calculating" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8">
          <div className="w-32 h-32 rounded-full border-4 border-muted border-t-primary mx-auto animate-spin" />
          <p className="text-3xl font-bold text-foreground">Stiamo elaborando il tuo profilo...</p>
          <p className="text-xl text-muted-foreground">Il tuo gradiente è unico e irripetibile</p>
        </div>
      )}

      {/* ── RESULT ── */}
      {screen === "result" && result && (
        <div
          className="w-full min-h-[1920px] flex flex-col"
          style={{ background: `linear-gradient(160deg, ${HERA_COLORS.verde}18, ${HERA_COLORS.ciano}18, ${HERA_COLORS.magenta}18)` }}
        >
          <div className="flex items-center justify-center pt-14 pb-4 shrink-0">
            <HeraLogo className="h-16 w-auto" />
          </div>

          <div className="flex-1 flex flex-col items-center px-16 pb-16 gap-10">
            {/* Eyebrow */}
            <p className="text-xl font-semibold text-muted-foreground uppercase tracking-widest text-center">
              IL TUO GRADIENTE HERA
            </p>

            {/* Foto con anello gradiente — focal point principale */}
            <div
              className="rounded-full p-5 shadow-2xl"
              style={{ background: gradient.css, width: 380, height: 380 }}
            >
              <div className="rounded-full w-full h-full overflow-hidden flex items-center justify-center" style={{ background: "#e8e0ec" }}>
                {selfieProcessing ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-4 border-white/40 border-t-white animate-spin" />
                    <span className="text-white/80 text-xs font-medium">elaborazione...</span>
                  </div>
                ) : selfieDataUrl ? (
                  <img src={selfieDataUrl} alt="Profilo" className="w-full h-full object-cover" />
                ) : (
                  <img src="/brand/placeholder-person.svg" alt="Profilo" className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            {/* Nome profilo */}
            <div className="text-center space-y-3">
              <h2 className="text-6xl font-black text-foreground tracking-tight leading-none">
                {profile?.name || result.profile_key.toUpperCase()}
              </h2>
              {profile?.claim && (
                <p className="text-2xl text-foreground/70 italic max-w-[680px] mx-auto">
                  {profile.claim}
                </p>
              )}
            </div>

            {/* Barra gradiente */}
            <div className="w-full max-w-[580px] h-5 rounded-full shadow-md" style={{ background: gradient.css }} />

            {/* Score V/C/M */}
            <div className="flex justify-center gap-12">
              {[
                { key: "verde",   score: result.score_verde },
                { key: "magenta", score: result.score_magenta },
                { key: "ciano",   score: result.score_ciano },
              ].map(({ key, score }) => {
                const cat = CATEGORY_ICONS[key];
                return (
                  <div key={key} className="flex flex-col items-center gap-2">
                    <div
                      className="w-18 h-18 rounded-full flex items-center justify-center text-4xl"
                      style={{ width: 72, height: 72, backgroundColor: cat.color + "22", border: `3px solid ${cat.color}` }}
                    >
                      {cat.icon}
                    </div>
                    <span className="text-2xl font-black" style={{ color: cat.color }}>{score}</span>
                    <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">{cat.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Descrizione */}
            {profile?.description && (
              <p className="text-xl text-muted-foreground max-w-[680px] mx-auto text-center leading-relaxed">
                {profile.description}
              </p>
            )}

            {/* CTA */}
            <div className="flex flex-col items-center gap-6 pt-4 w-full max-w-[700px]">
              {/* Premio se disponibile */}
              {result.code && (
                <button
                  onClick={() => setScreen("prize")}
                  className="w-full flex items-center justify-center gap-4 text-2xl font-bold px-12 py-6 rounded-full text-white transition-transform hover:scale-105 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
                >
                  🏆 SCOPRI SE HAI VINTO UN PREMIO
                </button>
              )}

              {/* Postcard QR */}
              {postcardUrl && (
                <div className="w-full flex flex-col items-center gap-4 py-4">
                  <p className="text-2xl font-bold text-foreground tracking-wide text-center">
                    Scarica la tua postcard
                  </p>
                  {postcardQrUrl ? (
                    <>
                      <img src={postcardQrUrl} alt="QR Code postcard" className="w-56 h-56 rounded-2xl shadow-lg" />
                      <p className="text-lg text-muted-foreground text-center">
                        Inquadra il QR con il tuo smartphone
                      </p>
                    </>
                  ) : (
                    <div className="w-56 h-56 rounded-2xl bg-muted animate-pulse" />
                  )}

                  {/* Invia per email — visibile ma non funzionante */}
                  <div className="relative group">
                    <button
                      disabled
                      className="flex items-center gap-3 text-xl font-semibold px-10 py-4 rounded-full border-2 border-muted-foreground/30 text-muted-foreground/50 cursor-not-allowed"
                    >
                      ✉️ Invia per email
                    </button>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block bg-foreground text-background text-sm rounded-xl px-4 py-3 w-64 text-center shadow-xl z-10">
                      Funzione in arrivo — richiede configurazione del servizio email
                    </div>
                  </div>

                  {/* Download diretto — solo in sviluppo */}
                  {process.env.NODE_ENV === "development" && (
                    <button
                      onClick={() => downloadPostcard(postcardUrl)}
                      className="text-sm text-muted-foreground/40 underline underline-offset-2 hover:text-muted-foreground/60"
                    >
                      [dev] download diretto
                    </button>
                  )}
                </div>
              )}

              {!result.code && (
                <button
                  onClick={handleRestart}
                  className="text-xl font-semibold px-10 py-4 text-muted-foreground underline mt-2"
                >
                  Ricomincia
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PRIZE ── */}
      {screen === "prize" && result && (
        <div className="flex-1 flex flex-col items-center justify-center px-16 pb-16 gap-14 text-center">
          {/* Countdown */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
            >
              {prizeCountdown}
            </div>
            <p className="text-muted-foreground text-base">secondi al reset</p>
          </div>

          <div className="space-y-8">
            <h2
              className="text-8xl font-black tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
            >
              HAI VINTO!
            </h2>

            <div className="space-y-5">
              <p className="text-3xl text-foreground font-bold">
                Complimenti! Hai ottenuto un premio.
              </p>
              <div
                className="rounded-3xl px-12 py-8 inline-block"
                style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}22, ${HERA_COLORS.ciano}22)` }}
              >
                <p className="text-2xl text-foreground/80 leading-relaxed">
                  📩 Riceverai una mail all'indirizzo che hai indicato<br />
                  con le <strong>istruzioni per il ritiro del premio</strong>.
                </p>
              </div>
            </div>

            {result.prize?.name && (
              <p className="text-2xl text-muted-foreground">
                Premio: <strong>{result.prize.name}</strong>
              </p>
            )}
          </div>

          <button
            onClick={handleRestart}
            className="text-2xl font-black px-16 py-6 rounded-full text-white shadow-xl hover:scale-105 transition-transform"
            style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
          >
            🔄 RICOMINCIA
          </button>
        </div>
      )}
    </div>
  );
}
