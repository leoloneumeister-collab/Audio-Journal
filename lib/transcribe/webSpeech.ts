import type { Transcriber } from "./types";

// Minimal typings, the DOM lib doesn't ship SpeechRecognition everywhere.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const FATAL = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);

export class WebSpeechTranscriber implements Transcriber {
  readonly supported = getCtor() !== null;
  private rec: Recognition | null = null;
  private finalText = "";
  private listening = false;
  private updateCb: (finalText: string, interim: string) => void = () => {};
  private errorCb: (message: string) => void = () => {};
  private endResolve: (() => void) | null = null;

  constructor(private lang = typeof navigator !== "undefined" ? navigator.language : "en-US") {}

  onUpdate(cb: (finalText: string, interim: string) => void) {
    this.updateCb = cb;
  }
  onError(cb: (message: string) => void) {
    this.errorCb = cb;
  }

  start() {
    this.finalText = "";
    this.listening = true;
    this.spawn();
  }

  pause() {
    this.listening = false;
    this.rec?.stop();
  }

  resume() {
    this.listening = true;
    this.spawn();
  }

  stop(): Promise<string> {
    this.listening = false;
    if (!this.rec) return Promise.resolve(this.finalText.trim());
    return new Promise((resolve) => {
      this.endResolve = () => resolve(this.finalText.trim());
      this.rec?.stop();
      // Some browsers never fire onend after stop(); don't hang the UI.
      setTimeout(() => this.endResolve?.(), 1500);
    });
  }

  private spawn() {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = this.lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += r[0].transcript.trim() + " ";
        else interim += r[0].transcript;
      }
      this.updateCb(this.finalText, interim);
    };
    rec.onerror = (e) => {
      if (FATAL.has(e.error)) {
        this.listening = false;
        this.errorCb(
          "Live transcription isn't available here. Your audio is still recording, you can type the text afterwards.",
        );
      }
      // "no-speech" and "aborted" are normal during pauses; onend restarts.
    };
    rec.onend = () => {
      this.rec = null;
      if (this.listening) {
        // Chrome ends continuous recognition after silence, so keep it alive.
        this.spawn();
      } else if (this.endResolve) {
        const done = this.endResolve;
        this.endResolve = null;
        done();
      }
    };

    this.rec = rec;
    try {
      rec.start();
    } catch {
      // start() throws if a previous session is still closing; onend will retry.
    }
  }
}
