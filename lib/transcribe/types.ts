/**
 * Anything that can turn live microphone speech into text. The browser
 * implementation lives in webSpeech.ts; a server-side one (e.g. Whisper on the
 * uploaded file) can implement the same shape later.
 */
export interface Transcriber {
  readonly supported: boolean;
  start(): void;
  pause(): void;
  resume(): void;
  /** Stops listening and resolves with the final text. */
  stop(): Promise<string>;
  onUpdate(cb: (finalText: string, interim: string) => void): void;
  onError(cb: (message: string) => void): void;
}
