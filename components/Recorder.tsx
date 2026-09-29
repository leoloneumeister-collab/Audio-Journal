"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AudioRecorder, extensionFor } from "@/lib/recorder";
import { WebSpeechTranscriber } from "@/lib/transcribe/webSpeech";
import type { Transcriber } from "@/lib/transcribe/types";
import { createClient } from "@/lib/supabase/client";
import { SupportCard } from "./SupportCard";

type Phase = "idle" | "recording" | "paused" | "review" | "saving" | "processing" | "done";

const MAX_SECONDS = 10 * 60;

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Recorder({ userId, characterName }: { userId: string; characterName: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [result, setResult] = useState<{ entryId: string; reflection?: string; needsSupport?: boolean } | null>(
    null,
  );

  const audioUrl = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio]);
  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const recorder = useRef<AudioRecorder | null>(null);
  const transcriber = useRef<Transcriber | null>(null);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "recording" && seconds >= MAX_SECONDS) void stop();
  }, [seconds, phase]);

  useEffect(() => () => recorder.current?.cancel(), []);

  async function start() {
    setError(null);
    setNotice(null);
    setTranscript("");
    setInterim("");
    setSeconds(0);
    try {
      recorder.current = new AudioRecorder();
      await recorder.current.start();
    } catch {
      setError("We couldn't access your microphone. Check the browser's permission settings.");
      return;
    }
    const t = new WebSpeechTranscriber();
    if (t.supported) {
      t.onUpdate((finalText, live) => {
        setTranscript(finalText);
        setInterim(live);
      });
      t.onError((msg) => setNotice(msg));
      t.start();
      transcriber.current = t;
    } else {
      transcriber.current = null;
      setNotice("This browser can't transcribe live. Your audio still records, and you can type the text afterwards.");
    }
    setPhase("recording");
  }

  function pause() {
    recorder.current?.pause();
    transcriber.current?.pause();
    setPhase("paused");
  }

  function resume() {
    recorder.current?.resume();
    transcriber.current?.resume();
    setPhase("recording");
  }

  async function stop() {
    const [blob, text] = await Promise.all([
      recorder.current?.stop() ?? Promise.resolve(null),
      transcriber.current?.stop() ?? Promise.resolve(""),
    ]);
    setAudio(blob);
    setTranscript((prev) => (text || prev).trim());
    setInterim("");
    setPhase("review");
  }

  function typeInstead() {
    setAudio(null);
    setTranscript("");
    setSeconds(0);
    setPhase("review");
  }

  function discard() {
    setAudio(null);
    setTranscript("");
    setSeconds(0);
    setPhase("idle");
  }

  async function save() {
    setError(null);
    setPhase("saving");
    const supabase = createClient();
    const id = crypto.randomUUID();
    let audioPath: string | null = null;

    if (audio && audio.size > 0) {
      audioPath = `${userId}/${id}.${extensionFor(audio.type)}`;
      const { error: upErr } = await supabase.storage
        .from("journal-audio")
        .upload(audioPath, audio, { contentType: audio.type });
      if (upErr) {
        setError(`Upload failed: ${upErr.message}`);
        setPhase("review");
        return;
      }
    }

    const { error: insErr } = await supabase.from("entries").insert({
      id,
      user_id: userId,
      audio_path: audioPath,
      duration_s: seconds,
      transcript: transcript.trim(),
    });
    if (insErr) {
      setError(`Saving failed: ${insErr.message}`);
      setPhase("review");
      return;
    }

    setPhase("processing");
    try {
      const res = await fetch(`/api/entries/${id}/process`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) setError(body.error ?? "Your entry is saved, but the companion couldn't update yet.");
      setResult({ entryId: id, reflection: body.reflection, needsSupport: body.needsSupport });
    } catch {
      setError("Your entry is saved, but the companion couldn't update yet. You can retry from the journal.");
      setResult({ entryId: id });
    }
    setPhase("done");
  }

  if (phase === "done" && result) {
    return (
      <div className="flex flex-col items-center gap-5 pt-10 text-center">
        <h1 className="font-serif text-3xl">Entry saved</h1>
        {result.needsSupport && <SupportCard />}
        {result.reflection && <p className="font-serif text-lg italic">“{result.reflection}”</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex w-full flex-col gap-2">
          <Link className="btn" href="/character">
            See how {characterName} changed
          </Link>
          <Link className="btn-ghost" href={`/journal/${result.entryId}`}>
            Open this entry
          </Link>
          <button className="text-sm text-stone-500 underline" onClick={discard}>
            Record another
          </button>
        </div>
      </div>
    );
  }

  if (phase === "review" || phase === "saving" || phase === "processing") {
    const busy = phase !== "review";
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-2xl">{audio ? `Your entry · ${fmt(seconds)}` : "Write your entry"}</h1>
        {audioUrl && <audio controls src={audioUrl} className="w-full" />}
        <label className="text-sm text-stone-500" htmlFor="transcript">
          {audio ? "Transcript. Fix anything the browser misheard." : "What's on your mind?"}
        </label>
        <textarea
          id="transcript"
          className="input min-h-64 font-serif leading-relaxed"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          disabled={busy}
          placeholder={audio ? "No text was captured. Type a few lines about what you said." : ""}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn" onClick={save} disabled={busy || transcript.trim().split(/\s+/).length < 3}>
          {phase === "saving" ? "Saving…" : phase === "processing" ? `${characterName} is listening…` : "Save entry"}
        </button>
        {!busy && (
          <button className="btn-ghost" onClick={discard}>
            Discard
          </button>
        )}
      </div>
    );
  }

  const live = phase === "recording" || phase === "paused";
  return (
    <div className="flex flex-col items-center gap-6 pt-6 text-center">
      <div>
        <h1 className="font-serif text-3xl">{live ? fmt(seconds) : "How was today?"}</h1>
        {!live && <p className="mt-2 text-stone-500">Tap and talk. {characterName} will listen.</p>}
      </div>

      <button
        aria-label={live ? "Stop recording" : "Start recording"}
        onClick={live ? stop : start}
        className={`relative flex h-40 w-40 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${
          live ? "bg-red-500" : "bg-amber-500"
        }`}
      >
        <span className={phase === "recording" ? "h-12 w-12 rounded-lg bg-white" : "h-14 w-14 rounded-full bg-white"} />
        {phase === "recording" && <span className="absolute h-40 w-40 animate-ping rounded-full bg-red-400/30" />}
      </button>

      {live && (
        <button className="btn-ghost" onClick={phase === "recording" ? pause : resume}>
          {phase === "recording" ? "Pause" : "Resume"}
        </button>
      )}
      {!live && (
        <button className="text-sm text-stone-500 underline" onClick={typeInstead}>
          Type instead
        </button>
      )}

      {notice && <p className="text-sm text-amber-700 dark:text-amber-400">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {live && (transcript || interim) && (
        <div className="card w-full text-left font-serif leading-relaxed">
          {transcript}
          <span className="text-stone-400">{interim}</span>
        </div>
      )}
    </div>
  );
}
