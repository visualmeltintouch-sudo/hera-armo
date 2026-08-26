"use client";

import { useState, useEffect } from "react";
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
  | "birth_year"
  | "quiz"
  | "calculating"
  | "result"
  | "prize"
  | "error";

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
  const [birthYear, setBirthYear] = useState("");

  const [questions, setQuestions] = useState<ArmoQuestion[]>([]);
  // selectedAnswers: questionId → 'a' | 'b'
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, SelectedOption>>({});

  const [result, setResult] = useState<PlayResult | null>(null);
  const [profile, setProfile] = useState<ArmoProfile | null>(null);
  const [finalScores, setFinalScores] = useState<ColorScores>({ verde: 0, ciano: 0, magenta: 0 });
  const [postcardUrl, setPostcardUrl] = useState<string | null>(null);

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

  async function handleBirthYearSubmit() {
    if (!event || !settings) return;
    const year = parseInt(birthYear);
    if (isNaN(year) || year < 1920 || year > 2010) return;

    const group = year >= settings.year_cutoff ? "young" : "classic";

    const { data } = await supabase
      .from("hera_armo_questions")
      .select("*")
      .eq("event_id", event.id)
      .eq("age_group", group)
      .eq("is_active", true);

    if (!data || data.length === 0) {
      setError("Nessuna domanda disponibile");
      setScreen("error");
      return;
    }

    const shuffled = (data as ArmoQuestion[])
      .sort(() => Math.random() - 0.5)
      .slice(0, settings.questions_per_session);

    setQuestions(shuffled);
    setSelectedAnswers({});
    setScreen("quiz");
  }

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
      p_birth_year: parseInt(birthYear),
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
    setBirthYear("");
    setQuestions([]);
    setSelectedAnswers({});
    setResult(null);
    setProfile(null);
    setFinalScores({ verde: 0, ciano: 0, magenta: 0 });
    setPostcardUrl(null);
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
              onClick={() => setScreen("birth_year")}
              className="text-3xl font-semibold px-16 py-6 rounded-full text-white transition-transform hover:scale-105 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})` }}
            >
              INIZIA
            </button>
          </div>
        )}

        {/* BIRTH YEAR */}
        {screen === "birth_year" && (
          <div className="text-center space-y-12">
            <h2 className="text-5xl font-bold text-foreground">In che anno sei nato/a?</h2>
            <div className="space-y-8">
              <input
                type="number"
                inputMode="numeric"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="es. 1995"
                className="w-[400px] text-center text-5xl font-bold bg-transparent border-b-4 border-border focus:border-primary outline-none py-4 placeholder-muted-foreground/50 text-foreground"
                min={1920}
                max={2010}
              />
              <div>
                <button
                  onClick={handleBirthYearSubmit}
                  disabled={!birthYear || parseInt(birthYear) < 1920 || parseInt(birthYear) > 2010}
                  className="text-2xl font-semibold px-12 py-5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-30 transition-all"
                >
                  CONTINUA
                </button>
              </div>
            </div>
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
                  <div className="rounded-full w-full h-full overflow-hidden bg-[#e8e0ec]">
                    {/* TODO: sostituire con selfie del partecipante */}
                    <img
                      src="/brand/placeholder-person.svg"
                      alt="Profilo"
                      className="w-full h-full object-cover"
                    />
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
