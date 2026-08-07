"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function TotemPage() {
  const supabase = createClient();

  const [screen, setScreen] = useState<Screen>("loading");
  const [error, setError] = useState("");

  const [event, setEvent] = useState<ArmoEvent | null>(null);
  const [settings, setSettings] = useState<ArmoSettings | null>(null);

  const [birthYear, setBirthYear] = useState("");

  const [questions, setQuestions] = useState<ArmoQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [scores, setScores] = useState<ColorScores>({ verde: 0, ciano: 0, magenta: 0 });
  const [animating, setAnimating] = useState(false);

  const [result, setResult] = useState<PlayResult | null>(null);
  const [profile, setProfile] = useState<ArmoProfile | null>(null);
  const [postcardUrl, setPostcardUrl] = useState<string | null>(null);

  useEffect(() => {
    loadEvent();
  }, []);

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

  function handleStartQuiz() {
    setScreen("birth_year");
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
    setCurrentIndex(0);
    setAnswers([]);
    setScores({ verde: 0, ciano: 0, magenta: 0 });
    setScreen("quiz");
  }

  const handleAnswer = useCallback(
    (option: SelectedOption) => {
      if (animating) return;
      setAnimating(true);

      const q = questions[currentIndex];
      const pts =
        option === "a"
          ? { verde: q.option_a_verde, ciano: q.option_a_ciano, magenta: q.option_a_magenta }
          : { verde: q.option_b_verde, ciano: q.option_b_ciano, magenta: q.option_b_magenta };

      const newScores = {
        verde: scores.verde + pts.verde,
        ciano: scores.ciano + pts.ciano,
        magenta: scores.magenta + pts.magenta,
      };
      setScores(newScores);

      const newAnswers: QuizAnswer[] = [
        ...answers,
        { question_id: q.id, selected_option: option },
      ];
      setAnswers(newAnswers);

      setTimeout(() => {
        if (currentIndex + 1 < questions.length) {
          setCurrentIndex(currentIndex + 1);
          setAnimating(false);
        } else {
          submitQuiz(newScores, newAnswers);
        }
      }, 600);
    },
    [animating, questions, currentIndex, scores, answers]
  );

  async function submitQuiz(finalScores: ColorScores, finalAnswers: QuizAnswer[]) {
    if (!event) return;
    setScreen("calculating");

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
        scores: finalScores,
        profileName: (profileData as ArmoProfile)?.name || playResult.profile_key,
        claim: (profileData as ArmoProfile)?.claim || "",
      });
      setPostcardUrl(url);
    } catch {
      // postcard generation failed silently
    }

    setScreen("result");
  }

  function handleRestart() {
    setBirthYear("");
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setScores({ verde: 0, ciano: 0, magenta: 0 });
    setResult(null);
    setProfile(null);
    setPostcardUrl(null);
    setScreen("intro");
  }

  const gradient = scoresToGradient(scores);

  return (
    <div className="w-[1080px] h-[1920px] mx-auto relative overflow-hidden bg-background text-foreground">
      {/* Gradient background */}
      <div
        className="absolute inset-0 transition-all duration-700 ease-out"
        style={{
          background:
            screen === "quiz" || screen === "calculating" || screen === "result"
              ? gradient.css
              : `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`,
          opacity:
            screen === "intro" || screen === "birth_year"
              ? 0.15
              : screen === "quiz"
                ? 0.3
                : 0.6,
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center h-full p-16">
        {screen === "loading" && (
          <p className="text-muted-foreground text-2xl">Caricamento...</p>
        )}

        {screen === "error" && (
          <div className="text-center space-y-8">
            <p className="text-destructive text-2xl">{error}</p>
            <button onClick={handleRestart} className="text-lg text-primary underline">
              Riprova
            </button>
          </div>
        )}

        {screen === "intro" && (
          <div className="text-center space-y-16">
            <div className="space-y-6">
              <h1 className="text-7xl font-bold tracking-tight leading-tight">
                LA TUA
                <br />
                ARMOCROMIA
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`,
                  }}
                >
                  HERAVIGLIOSA
                </span>
              </h1>
              <p className="text-2xl text-foreground/70 max-w-[700px] mx-auto leading-relaxed">
                Scopri il tuo profilo attraverso le tue scelte quotidiane
              </p>
            </div>
            <button
              onClick={handleStartQuiz}
              className="text-3xl font-semibold px-16 py-6 rounded-2xl text-white transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`,
              }}
            >
              INIZIA
            </button>
          </div>
        )}

        {screen === "birth_year" && (
          <div className="text-center space-y-12">
            <h2 className="text-5xl font-bold">In che anno sei nato/a?</h2>
            <div className="space-y-8">
              <input
                type="number"
                inputMode="numeric"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="es. 1995"
                className="w-[400px] text-center text-5xl font-bold bg-transparent border-b-4 border-border focus:border-primary outline-none py-4 placeholder-muted-foreground"
                min={1920}
                max={2010}
              />
              <div>
                <button
                  onClick={handleBirthYearSubmit}
                  disabled={!birthYear || parseInt(birthYear) < 1920 || parseInt(birthYear) > 2010}
                  className="text-2xl font-semibold px-12 py-5 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-30 transition-all"
                >
                  CONTINUA
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === "quiz" && questions.length > 0 && (
          <div className="w-full flex flex-col items-center space-y-12">
            {/* Progress */}
            <div className="w-full max-w-[900px]">
              <div className="flex justify-between text-lg text-foreground/70 mb-3">
                <span>Domanda {currentIndex + 1} di {questions.length}</span>
              </div>
              <div className="w-full bg-muted/60 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentIndex + 1) / questions.length) * 100}%`,
                    background: `linear-gradient(90deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`,
                  }}
                />
              </div>
            </div>

            {/* Score indicators */}
            <div className="flex gap-8">
              {[
                { label: "V", value: scores.verde, color: HERA_COLORS.verde },
                { label: "C", value: scores.ciano, color: HERA_COLORS.ciano },
                { label: "M", value: scores.magenta, color: HERA_COLORS.magenta },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-500"
                    style={{ backgroundColor: s.color + "40", color: s.color }}
                  >
                    {s.value}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Question */}
            <div
              key={questions[currentIndex].id}
              className={`w-full max-w-[900px] space-y-10 transition-all duration-300 ${animating ? "opacity-50 scale-95" : "opacity-100 scale-100"}`}
            >
              <h2 className="text-4xl font-bold text-center leading-snug min-h-[180px] flex items-center justify-center">
                {questions[currentIndex].question_text}
              </h2>

              <div className="space-y-6">
                <button
                  onClick={() => handleAnswer("a")}
                  disabled={animating}
                  className="w-full text-left text-2xl p-8 rounded-2xl border-2 border-foreground/20 bg-foreground/5 hover:bg-foreground/15 hover:border-foreground/40 active:scale-[0.98] transition-all duration-200"
                >
                  <span className="font-bold text-hera-ciano mr-4">A</span>
                  {questions[currentIndex].option_a_text}
                </button>
                <button
                  onClick={() => handleAnswer("b")}
                  disabled={animating}
                  className="w-full text-left text-2xl p-8 rounded-2xl border-2 border-foreground/20 bg-foreground/5 hover:bg-foreground/15 hover:border-foreground/40 active:scale-[0.98] transition-all duration-200"
                >
                  <span className="font-bold text-hera-magenta mr-4">B</span>
                  {questions[currentIndex].option_b_text}
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === "calculating" && (
          <div className="text-center space-y-8 animate-pulse">
            <div
              className="w-48 h-48 rounded-full mx-auto"
              style={{ background: gradient.css }}
            />
            <p className="text-3xl font-bold">Stiamo elaborando il tuo profilo...</p>
          </div>
        )}

        {screen === "result" && result && (
          <div className="text-center space-y-10">
            <div
              className="w-64 h-64 rounded-full mx-auto shadow-2xl"
              style={{ background: gradient.css }}
            />

            <div className="space-y-4">
              <h2 className="text-5xl font-bold">
                {profile?.name || result.profile_key.toUpperCase()}
              </h2>
              <p className="text-3xl text-foreground/80 italic max-w-[800px] mx-auto">
                {profile?.claim || ""}
              </p>
              {profile?.description && (
                <p className="text-xl text-foreground/70 max-w-[700px] mx-auto leading-relaxed mt-4">
                  {profile.description}
                </p>
              )}
            </div>

            <div className="flex justify-center gap-12">
              {[
                { label: "Ambiente", value: result.score_verde, color: HERA_COLORS.verde },
                { label: "Acqua", value: result.score_ciano, color: HERA_COLORS.ciano },
                { label: "Energia", value: result.score_magenta, color: HERA_COLORS.magenta },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-4xl font-bold" style={{ color: s.color }}>
                    {s.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-4">
              {postcardUrl && (
                <button
                  onClick={() => downloadPostcard(postcardUrl)}
                  className="text-2xl font-semibold px-12 py-5 rounded-2xl text-white transition-transform hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${HERA_COLORS.verde}, ${HERA_COLORS.ciano}, ${HERA_COLORS.magenta})`,
                  }}
                >
                  SCARICA LA TUA POSTCARD
                </button>
              )}

              {result.code ? (
                <button
                  onClick={() => setScreen("prize")}
                  className="block mx-auto text-xl text-primary underline mt-4"
                >
                  SCOPRI SE HAI VINTO
                </button>
              ) : (
                <button
                  onClick={handleRestart}
                  className="block mx-auto text-xl text-muted-foreground underline mt-4"
                >
                  RICOMINCIA
                </button>
              )}
            </div>
          </div>
        )}

        {screen === "prize" && result && (
          <div className="text-center space-y-12">
            {result.prize ? (
              <>
                <h2 className="text-6xl font-bold">HAI VINTO!</h2>
                <div className="space-y-4">
                  <p className="text-3xl text-foreground/80">{result.prize.name}</p>
                  {result.prize.image_url && (
                    <img
                      src={result.prize.image_url}
                      alt={result.prize.name}
                      className="w-64 h-64 object-contain mx-auto"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xl text-muted-foreground">Il tuo codice premio:</p>
                  <p className="text-6xl font-mono font-bold text-primary tracking-widest">
                    {result.code}
                  </p>
                  <p className="text-lg text-muted-foreground">
                    Mostra questo codice allo stand per ritirare il tuo premio
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-5xl font-bold">Grazie per aver partecipato!</h2>
                <p className="text-2xl text-foreground/70">
                  Passa allo stand per ritirare il tuo gadget
                </p>
              </>
            )}

            <button onClick={handleRestart} className="text-xl text-muted-foreground underline">
              NUOVA PARTITA
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
