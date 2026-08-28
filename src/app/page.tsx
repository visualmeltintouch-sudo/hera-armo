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
  ValidateCodeResult,
} from "@/lib/types";

type Screen =
  | "loading"
  | "intro"
  | "code_entry"
  | "selfie"
  | "quiz"
  | "calculating"
  | "result"
  | "prize"
  | "error";

type SelfieStep = "idle" | "capturing" | "preview";

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

export default function TotemPage() {
  const supabase = createClient();

  const [screen, setScreen] = useState<Screen>("loading");
  const [error, setError] = useState("");

  const [event, setEvent] = useState<ArmoEvent | null>(null);
  const [settings, setSettings] = useState<ArmoSettings | null>(null);

  // Code entry
  const [accessCode, setAccessCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const qrRef = useRef<HTMLCanvasElement>(null);

  const [questions, setQuestions] = useState<ArmoQuestion[]>([]);
  // selectedAnswers: questionId → 'a' | 'b'
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, SelectedOption>>({});

  const [birthYearForPlay, setBirthYearForPlay] = useState(1990);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [profile, setProfile] = useState<ArmoProfile | null>(null);
  const [finalScores, setFinalScores] = useState<ColorScores>({ verde: 0, ciano: 0, magenta: 0 });
  const [postcardUrl, setPostcardUrl] = useState<string | null>(null);

  // Selfie
  const [selfieStep, setSelfieStep] = useState<SelfieStep>("idle");
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null); // bg-removed PNG (data URL)
  const [selfieStorageUrl, setSelfieStorageUrl] = useState<string | null>(null); // uploaded URL
  const [selfieError, setSelfieError] = useState("");
  const [selfieProcessing, setSelfieProcessing] = useState(false); // bg removal in corso
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { loadEvent(); }, []);

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

  // Genera QR code sulla canvas dopo che la schermata code_error è visibile
  useEffect(() => {
    if (codeError && qrRef.current && event) {
      const url = `${window.location.origin}/register`;
      import("qrcode").then((QRCode) => {
        QRCode.toCanvas(qrRef.current!, url, { width: 180, margin: 1 }, () => {});
      });
    }
  }, [codeError, event]);

  async function handleCodeSubmit() {
    if (!event || !accessCode.trim()) return;
    setCodeLoading(true);
    setCodeError("");

    const { data, error: err } = await supabase.rpc("hera_armo_validate_code", {
      p_code: accessCode.trim().toUpperCase(),
      p_event_id: event.id,
    });

    if (err || !data) {
      setCodeError("Errore di connessione. Riprova.");
      setCodeLoading(false);
      return;
    }

    const res = data as ValidateCodeResult;
    if (!res.valid) {
      setCodeError(res.error || "Codice non valido");
      setCodeLoading(false);
      return;
    }

    // Codice valido: carica domande direttamente
    setRegistrationId(res.registration_id || null);
    setUserName(res.name || "");

    const group = res.age_group!;
    const birthYear = res.birth_year!;

    const { data: qData } = await supabase
      .from("hera_armo_questions")
      .select("*")
      .eq("event_id", event.id)
      .eq("age_group", group)
      .eq("is_active", true);

    if (!qData || qData.length === 0) {
      setError("Nessuna domanda disponibile");
      setScreen("error");
      setCodeLoading(false);
      return;
    }

    const shuffled = (qData as ArmoQuestion[])
      .sort(() => Math.random() - 0.5)
      .slice(0, settings?.questions_per_session ?? 10);

    setQuestions(shuffled);
    setSelectedAnswers({});
    // Salva birth_year per la RPC hera_armo_play
    setBirthYearForPlay(birthYear);
    setCodeLoading(false);
    // Reset selfie state e vai alla schermata selfie
    setSelfieDataUrl(null);
    setSelfieStorageUrl(null);
    setSelfieStep("idle");
    setSelfieError("");
    setScreen("selfie");
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
    if (!videoRef.current || !captureCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    // Center-crop square, capped at 384px for speed
    const srcSize = Math.min(video.videoWidth, video.videoHeight);
    const outSize = Math.min(srcSize, 384);
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext("2d")!;
    const offsetX = (video.videoWidth - srcSize) / 2;
    const offsetY = (video.videoHeight - srcSize) / 2;
    ctx.drawImage(video, offsetX, offsetY, srcSize, srcSize, 0, 0, outSize, outSize);
    stopCamera();
    showRawPreview(canvas.toDataURL("image/jpeg", 0.85));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const srcSize = Math.min(img.naturalWidth, img.naturalHeight);
      const size = Math.min(srcSize, 384);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const offsetX = (img.naturalWidth - srcSize) / 2;
      const offsetY = (img.naturalHeight - srcSize) / 2;
      ctx.drawImage(img, offsetX, offsetY, srcSize, srcSize, 0, 0, size, size);
      // Normalizza sempre a JPEG — gestisce AVIF, HEIC, JFIF, WebP, ecc.
      showRawPreview(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setSelfieError("Formato non supportato dal browser. Usa JPG, PNG o WebP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    img.src = objectUrl;
  }

  // Mostra subito l'anteprima raw — nessuna attesa per l'utente
  function showRawPreview(sourceDataUrl: string) {
    setSelfieDataUrl(sourceDataUrl); // anteprima temporanea raw
    setSelfieStep("preview");
  }

  // Gira in background mentre l'utente fa il quiz
  async function processInBackground(sourceDataUrl: string) {
    setSelfieProcessing(true);
    setSelfieDataUrl(null); // reset: niente foto finché non è pronta senza sfondo
    console.log("[BG-REMOVAL] start");
    try {
      console.log("[BG-REMOVAL] importing library...");
      const { removeBackground } = await import("@imgly/background-removal");
      console.log("[BG-REMOVAL] library loaded ✓");

      console.log("[BG-REMOVAL] fetching source image...");
      const res = await fetch(sourceDataUrl);
      const blob = await res.blob();
      console.log("[BG-REMOVAL] source blob ready, size:", blob.size, "type:", blob.type);

      console.log("[BG-REMOVAL] running removeBackground (model: isnet_quint8)...");
      const resultBlob = await removeBackground(blob, {
        model: "isnet_quint8",
        publicPath: "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/",
        output: { format: "image/png", quality: 0.6 },
        progress: (key: string, current: number, total: number) => {
          console.log(`[BG-REMOVAL] progress: ${key} ${current}/${total}`);
        },
      });
      console.log("[BG-REMOVAL] done ✓ result size:", resultBlob.size);

      const outputUrl = URL.createObjectURL(resultBlob);
      setSelfieDataUrl(outputUrl);
      console.log("[BG-REMOVAL] photo updated in state ✓");

      // Upload su Supabase Storage
      if (event) {
        const filename = `${event.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("armo-selfies-test")
          .upload(filename, resultBlob, { contentType: "image/png", upsert: false });
        if (uploadErr) console.error("[BG-REMOVAL] upload error:", uploadErr);
        if (uploadData) {
          const { data: urlData } = supabase.storage
            .from("armo-selfies-test")
            .getPublicUrl(uploadData.path);
          setSelfieStorageUrl(urlData.publicUrl);
          console.log("[BG-REMOVAL] uploaded ✓", urlData.publicUrl);
        }
      }
    } catch (err) {
      console.error("[BG-REMOVAL] ERROR:", err);
      // Non mostriamo foto raw — manteniamo selfieDataUrl null e rimuoviamo il loading
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
    // Lancia la rimozione sfondo in background — l'utente fa il quiz nel frattempo
    if (selfieDataUrl) processInBackground(selfieDataUrl);
    setScreen("quiz");
  }

  function retrySelfie() {
    setSelfieDataUrl(null);
    setSelfieStorageUrl(null);
    setSelfieStep("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── End selfie helpers ──────────────────────────────────────────────────────

  function handleSelectAnswer(questionId: string, option: SelectedOption) {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: option }));
  }

  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  async function handleSubmitQuiz() {
    if (!event || !allAnswered) return;
    setScreen("calculating");

    // Build answers + compute scores from selections
    const finalAnswers: QuizAnswer[] = questions.map((q) => ({
      question_id: q.id,
      selected_option: selectedAnswers[q.id],
    }));

    const scores: ColorScores = questions.reduce(
      (acc, q) => {
        const opt = selectedAnswers[q.id];
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
      });
      setPostcardUrl(url);
    } catch {
      // silent
    }

    setTimeout(() => setScreen("result"), 1400);
  }

  function handleRestart() {
    setAccessCode("");
    setCodeError("");
    setRegistrationId(null);
    setUserName("");
    setQuestions([]);
    setSelectedAnswers({});
    setResult(null);
    setProfile(null);
    setFinalScores({ verde: 0, ciano: 0, magenta: 0 });
    setPostcardUrl(null);
    setSelfieDataUrl(null);
    setSelfieStorageUrl(null);
    setSelfieStep("idle");
    setSelfieError("");
    setSelfieProcessing(false);
    stopCamera();
    setScreen("intro");
  }

  const gradient = scoresToGradient(finalScores);

  return (
    <div className="w-[1080px] min-h-[1920px] mx-auto relative bg-background text-foreground flex flex-col">

      {/* Header: logo sempre visibile tranne nella schermata risultato (ha il suo header) */}
      {screen !== "result" && screen !== "prize" && (
        <header className="flex items-center justify-center pt-14 pb-8 shrink-0">
          <HeraLogo className="h-16 w-auto" />
        </header>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-16 pb-16">

        {/* LOADING */}
        {screen === "loading" && (
          <p className="text-muted-foreground text-2xl">Caricamento...</p>
        )}

        {/* ERROR */}
        {screen === "error" && (
          <div className="text-center space-y-8">
            <p className="text-destructive text-2xl">{error}</p>
            <button onClick={handleRestart} className="text-lg text-primary underline">Riprova</button>
          </div>
        )}

        {/* INTRO */}
        {screen === "intro" && (
          <div className="text-center space-y-16">
            <div className="space-y-6">
              <h1 className="text-7xl font-bold tracking-tight leading-tight text-foreground">
                LA TUA<br />ARMOCROMIA<br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
                >
                  HERAVIGLIOSA
                </span>
              </h1>
              <p className="text-2xl text-muted-foreground max-w-[700px] mx-auto leading-relaxed">
                Scopri il tuo profilo attraverso le tue scelte quotidiane
              </p>
            </div>
            <p className="text-xl text-muted-foreground/70 italic">
              Ogni scelta lascia il suo colore. Ogni colore racconta chi sei.
            </p>
            <button
              onClick={() => { setAccessCode(""); setCodeError(""); setScreen("code_entry"); }}
              className="text-3xl font-semibold px-16 py-6 rounded-full text-white transition-transform hover:scale-105 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
            >
              INIZIA
            </button>
          </div>
        )}

        {/* CODE ENTRY */}
        {screen === "code_entry" && (
          <div className="text-center space-y-12 w-full max-w-[700px]">
            <div className="space-y-4">
              <h2 className="text-5xl font-bold text-foreground">Inserisci il tuo codice</h2>
              <p className="text-2xl text-muted-foreground">
                Hai ricevuto un codice di accesso dopo la registrazione
              </p>
            </div>

            <div className="space-y-6">
              <input
                type="text"
                inputMode="text"
                value={accessCode}
                onChange={(e) => { setAccessCode(e.target.value.toUpperCase().slice(0, 5)); setCodeError(""); }}
                placeholder="es. AB3K7"
                className="w-[340px] text-center text-6xl font-black tracking-[0.25em] font-mono bg-transparent border-b-4 border-border focus:border-primary outline-none py-4 placeholder-muted-foreground/30 text-foreground uppercase"
                autoComplete="off"
                maxLength={5}
              />

              {/* Errore + QR code */}
              {codeError && (
                <div className="space-y-6">
                  <p className="text-xl text-destructive font-semibold">{codeError}</p>
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-lg text-muted-foreground">Non sei ancora registrato/a?</p>
                    <canvas ref={qrRef} className="rounded-xl shadow-md" />
                    <p className="text-base text-muted-foreground">
                      Scansiona il QR per registrarti
                    </p>
                  </div>
                </div>
              )}

              {/* Suggerimenti codici test — ⚠️ rimuovere prima del go-live */}
              <div className="flex gap-3 justify-center flex-wrap">
                {[{ code: "YOUNG", label: "Young (1982+)" }, { code: "BOOME", label: "Classic (<1982)" }].map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => { setAccessCode(code); setCodeError(""); }}
                    className="text-sm px-4 py-2 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {code} <span className="opacity-60">— {label}</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleCodeSubmit}
                disabled={codeLoading || accessCode.trim().length < 5}
                className="text-2xl font-bold px-14 py-6 rounded-full text-white disabled:opacity-30 transition-all hover:scale-105 shadow-lg"
                style={{
                  background: accessCode.trim().length === 5
                    ? `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`
                    : "#cecece",
                }}
              >
                {codeLoading ? "Verifica in corso..." : "ACCEDI ALL'EXPERIENCE"}
              </button>
            </div>
          </div>
        )}

        {/* SELFIE */}
        {screen === "selfie" && (
          <div className="text-center space-y-10 w-full max-w-[700px]">
            {/* hidden canvas for capture */}
            <canvas ref={captureCanvasRef} className="hidden" />
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileUpload} />

            {selfieStep === "idle" && (
              <>
                <div className="space-y-4">
                  <h2 className="text-5xl font-bold text-foreground">Scatta la tua foto</h2>
                  <p className="text-2xl text-muted-foreground leading-relaxed">
                    {userName ? `Ciao ${userName}! ` : ""}Il tuo ritratto entrerà nel gradiente personale.
                  </p>
                </div>

                {selfieError && (
                  <p className="text-lg text-destructive font-medium">{selfieError}</p>
                )}

                <div className="flex flex-col items-center gap-5">
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
                  <button onClick={skipSelfie} className="text-lg text-muted-foreground underline mt-2">
                    Salta questo passaggio
                  </button>
                </div>
              </>
            )}

            {selfieStep === "capturing" && (
              <>
                <div className="space-y-4">
                  <h2 className="text-5xl font-bold text-foreground">Mettiti in posa!</h2>
                  <p className="text-xl text-muted-foreground">Centra il viso e scatta quando sei pronto/a</p>
                </div>
                {/* Anteprima camera con maschera circolare */}
                <div className="relative mx-auto" style={{ width: 400, height: 400 }}>
                  <div className="absolute inset-0 rounded-full overflow-hidden border-8 border-transparent"
                    style={{ background: `linear-gradient(white, white) padding-box, linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta}) border-box` }}
                  >
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
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
                  <button onClick={() => { stopCamera(); setSelfieStep("idle"); }} className="text-lg text-muted-foreground underline">
                    Annulla
                  </button>
                </div>
              </>
            )}

{selfieStep === "preview" && selfieDataUrl && (
              <>
                <div className="space-y-3">
                  <h2 className="text-5xl font-bold text-foreground">Ti piace?</h2>
                  <p className="text-xl text-muted-foreground">Se sei soddisfatto/a, procedi al quiz</p>
                </div>
                {/* Preview composita: selfie dentro anello */}
                <div className="relative mx-auto flex items-center justify-center" style={{ width: 340, height: 340 }}>
                  <div
                    className="rounded-full p-5 shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`,
                      width: 340, height: 340,
                    }}
                  >
                    <div className="rounded-full w-full h-full overflow-hidden bg-[#e8e0ec]">
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
                  <button onClick={retrySelfie} className="text-lg text-muted-foreground underline">
                    Riprova
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* QUIZ — tutte le domande visibili, scorrevoli */}
        {screen === "quiz" && questions.length > 0 && (
          <div className="w-full max-w-[920px] flex flex-col gap-0">

            {/* Header fisso */}
            <div className="text-center pb-10">
              <h2 className="text-4xl font-bold text-foreground">Scegli la risposta</h2>
              <p className="text-xl text-muted-foreground mt-2">
                Che rappresenta di più il tuo stile di vita
              </p>
              <p className="text-base text-muted-foreground/60 mt-1">
                {answeredCount} di {questions.length} risposte selezionate
              </p>
            </div>

            {/* Domande */}
            <div className="flex flex-col gap-10">
              {questions.map((q, idx) => {
                const selected = selectedAnswers[q.id];
                return (
                  <div key={q.id} className="space-y-4">
                    {/* Numero domanda */}
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                      {idx + 1}
                    </p>
                    {/* Testo domanda */}
                    <h3 className="text-2xl font-bold text-foreground leading-snug">
                      {q.question_text}
                    </h3>
                    {/* Opzioni */}
                    <div className="flex flex-col gap-3">
                      {(["a", "b"] as SelectedOption[]).map((opt) => {
                        const icon = opt === "a" ? q.option_a_icon : q.option_b_icon;
                        const text = opt === "a" ? q.option_a_text : q.option_b_text;
                        const isSelected = selected === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => handleSelectAnswer(q.id, opt)}
                            className={`flex items-center gap-6 text-left px-8 py-6 rounded-2xl border-2 transition-all duration-150 ${
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md scale-[1.01]"
                                : "border-border bg-card hover:border-primary/50 hover:shadow-md"
                            }`}
                          >
                            <span className="text-4xl shrink-0">{icon}</span>
                            <span className={`text-xl font-medium leading-snug ${isSelected ? "text-primary" : "text-foreground"}`}>
                              {text}
                            </span>
                            {isSelected && (
                              <span className="ml-auto text-primary text-2xl shrink-0">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA submit */}
            <div className="pt-14 pb-4 text-center">
              <button
                onClick={handleSubmitQuiz}
                disabled={!allAnswered}
                className="text-2xl font-bold px-16 py-6 rounded-full text-white transition-all disabled:opacity-30 disabled:scale-100 hover:scale-105 shadow-lg"
                style={{
                  background: allAnswered
                    ? `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`
                    : "#cecece",
                }}
              >
                SCOPRI IL TUO GRADIENTE
              </button>
              {!allAnswered && (
                <p className="text-muted-foreground text-base mt-4">
                  Rispondi a tutte le domande per continuare
                </p>
              )}
            </div>
          </div>
        )}

        {/* CALCULATING */}
        {screen === "calculating" && (
          <div className="text-center space-y-8">
            <div className="w-32 h-32 rounded-full border-4 border-muted border-t-primary mx-auto animate-spin" />
            <p className="text-3xl font-bold text-foreground">Stiamo elaborando il tuo profilo...</p>
            <p className="text-xl text-muted-foreground">Il tuo gradiente è unico e irripetibile</p>
          </div>
        )}

        {/* RESULT */}
        {screen === "result" && result && (
          <div className="w-full min-h-[1920px] flex flex-col" style={{ background: `linear-gradient(160deg, ${HERA_COLORS.verde}22, ${HERA_COLORS.ciano}22, ${HERA_COLORS.magenta}22)` }}>
            {/* Header risultato */}
            <div className="flex items-center justify-center pt-14 pb-6 shrink-0">
              <HeraLogo className="h-16 w-auto" />
            </div>

            <div className="flex-1 flex flex-col items-center px-16 pb-16 gap-10">
              {/* Titolo */}
              <div className="text-center space-y-3">
                <h2 className="text-5xl font-bold text-foreground tracking-tight">
                  IL TUO GRADIENTE HERA
                </h2>
                <p className="text-xl text-muted-foreground max-w-[680px] mx-auto leading-relaxed">
                  Le tue scelte quotidiane hanno creato un gradiente unico e irripetibile.
                  <br />Ecco il tuo profilo.
                </p>
              </div>

              {/* Foto con anello gradiente */}
              <div className="relative flex items-center justify-center">
                {/* Anello gradiente esterno */}
                <div
                  className="rounded-full p-5 shadow-2xl"
                  style={{
                    background: gradient.css,
                    width: 340,
                    height: 340,
                  }}
                >
                  {/* Foto dentro */}
                  <div className="rounded-full w-full h-full overflow-hidden bg-[#e8e0ec] flex items-center justify-center">
                    {selfieProcessing ? (
                      // Rimozione sfondo in corso
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
              </div>

              {/* Nome profilo */}
              <div className="text-center space-y-2">
                <p className="text-lg text-muted-foreground uppercase tracking-widest font-semibold">
                  IL TUO GRADIENTE
                </p>
                <h3 className="text-4xl font-bold text-foreground">
                  {profile?.name || result.profile_key.toUpperCase()}
                </h3>
                <p className="text-2xl text-foreground/70 italic max-w-[700px] mx-auto mt-2">
                  {profile?.claim || ""}
                </p>
              </div>

              {/* Categorie con score */}
              <div className="flex justify-center gap-16">
                {[
                  { key: "verde",   score: result.score_verde },
                  { key: "magenta", score: result.score_magenta },
                  { key: "ciano",   score: result.score_ciano },
                ].map(({ key, score }) => {
                  const cat = CATEGORY_ICONS[key];
                  return (
                    <div key={key} className="flex flex-col items-center gap-2">
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                        style={{ backgroundColor: cat.color + "22", border: `3px solid ${cat.color}` }}
                      >
                        {cat.icon}
                      </div>
                      <span className="text-2xl font-bold" style={{ color: cat.color }}>{score}</span>
                      <span className="text-sm text-muted-foreground font-semibold uppercase tracking-wider">{cat.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Barra gradiente decorativa */}
              <div
                className="w-full max-w-[600px] h-6 rounded-full shadow-lg"
                style={{ background: gradient.css }}
              />

              {/* Descrizione */}
              {profile?.description && (
                <p className="text-xl text-muted-foreground max-w-[680px] mx-auto text-center leading-relaxed">
                  {profile.description}
                </p>
              )}

              {/* CTA */}
              <div className="flex flex-col items-center gap-5 pt-4 w-full max-w-[700px]">
                {result.code && (
                  <button
                    onClick={() => setScreen("prize")}
                    className="w-full flex items-center justify-center gap-4 text-2xl font-bold px-12 py-6 rounded-full text-white transition-transform hover:scale-105 shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
                  >
                    🏆 SCOPRI I PREMI E PARTECIPA AL CONCORSO INSTANT WIN!
                  </button>
                )}

                {postcardUrl && (
                  <button
                    onClick={() => downloadPostcard(postcardUrl)}
                    className="w-full text-xl font-semibold px-12 py-5 rounded-full border-2 border-primary text-primary hover:bg-primary/5 transition-all"
                  >
                    SCARICA LA TUA POSTCARD
                  </button>
                )}

                {!result.code && (
                  <button
                    onClick={handleRestart}
                    className="text-xl text-muted-foreground underline mt-2"
                  >
                    RICOMINCIA
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRIZE */}
        {screen === "prize" && result && (
          <div className="text-center space-y-12">
            {result.prize ? (
              <>
                <h2 className="text-6xl font-bold text-foreground">HAI VINTO!</h2>
                <div className="space-y-4">
                  <p className="text-3xl text-foreground/80">{result.prize.name}</p>
                  {result.prize.image_url && (
                    <img src={result.prize.image_url} alt={result.prize.name} className="w-64 h-64 object-contain mx-auto" />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xl text-muted-foreground">Il tuo codice premio:</p>
                  <p className="text-6xl font-mono font-bold text-primary tracking-widest">{result.code}</p>
                  <p className="text-lg text-muted-foreground">Mostra questo codice allo stand per ritirare il tuo premio</p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-5xl font-bold text-foreground">Grazie per aver partecipato!</h2>
                <p className="text-2xl text-muted-foreground">Passa allo stand per ritirare il tuo gadget</p>
              </>
            )}
            <button onClick={handleRestart} className="text-xl text-muted-foreground underline">NUOVA PARTITA</button>
          </div>
        )}
      </div>
    </div>
  );
}
