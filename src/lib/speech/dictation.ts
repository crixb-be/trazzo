export interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;
type SpeechWindow = {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function getSpeechRecognitionCtor(win: object): SpeechRecognitionConstructor | null {
  const speech = win as SpeechWindow;
  if (typeof speech.SpeechRecognition === "function") return speech.SpeechRecognition;
  if (typeof speech.webkitSpeechRecognition === "function") return speech.webkitSpeechRecognition;
  return null;
}

export function appendTranscript(previous: string, transcript: string): string {
  const spoken = transcript.trim();
  if (!spoken) return previous;
  const existing = previous.trimEnd();
  const newline = existing.length > 0 && /\n\s*$/.test(previous);
  const startsSentence = !existing.trim() || newline || /[.!?…]["'»)]*$/.test(existing);
  const next = startsSentence
    ? spoken.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase("es-PE"))
    : spoken;
  return existing ? existing + (newline ? "\n" : " ") + next : next;
}
