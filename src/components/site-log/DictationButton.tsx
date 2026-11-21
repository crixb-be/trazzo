"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui";
import { getSpeechRecognitionCtor, type SpeechRecognitionInstance } from "@/lib/speech/dictation";

export function DictationButton({
  label,
  onTranscript,
}: {
  label: string;
  onTranscript: (text: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported(!!getSpeechRecognitionCtor(window));
    return () => {
      const active = recognition.current;
      if (!active) return;
      active.onresult = active.onend = active.onerror = null;
      active.stop();
    };
  }, []);

  function toggle() {
    if (recognition.current) {
      recognition.current.stop();
      return;
    }
    const Recognition = getSpeechRecognitionCtor(window);
    if (!Recognition) return;
    try {
      const active = new Recognition();
      active.lang = "es-PE";
      active.continuous = false;
      active.interimResults = false;
      function reset() {
        if (recognition.current !== active) return;
        recognition.current = null;
        setListening(false);
      }
      active.onend = reset;
      active.onerror = ({ error }) => {
        reset();
        if (error !== "aborted")
          toast(
            "No se pudo dictar. Revisa el permiso del micrófono e inténtalo de nuevo.",
            "error",
          );
      };
      active.onresult = ({ results, resultIndex }) => {
        const transcript = results[resultIndex]?.[0]?.transcript;
        if (transcript) onTranscript(transcript);
      };
      recognition.current = active;
      active.start();
      setListening(true);
    } catch {
      recognition.current = null;
      setListening(false);
      toast("No se pudo iniciar el dictado.", "error");
    }
  }

  if (!supported) return null;
  const Icon = listening ? Square : Mic;
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={toggle}
      aria-label={"Dictar por voz: " + label}
      aria-pressed={listening}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}
