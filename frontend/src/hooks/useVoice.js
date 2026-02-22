import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useVoice Hook — Ultra-Fast Voice Engine
 * ─────────────────────────────────────────
 * Uses browser's native speechSynthesis for INSTANT voice.
 * No network round-trip — speaks the moment text appears.
 *
 * Speech Recognition (STT): Browser Web Speech API
 * Text-to-Speech (TTS):     Browser speechSynthesis (instant)
 */

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);
  const voiceRef = useRef(null);

  // ── Load best available voice ────────────────────
  useEffect(() => {
    const pickVoice = () => {
      const voices = window.speechSynthesis?.getVoices() || [];
      // Prefer premium Microsoft voices on Windows (natural sounding)
      const preferred = [
        "Microsoft David",
        "Microsoft Mark",
        "Microsoft Guy Online",   // Edge neural voice
        "Microsoft Ryan Online",
        "Google US English",
        "Samantha",               // macOS
        "Daniel",                 // macOS UK
      ];

      for (const name of preferred) {
        const found = voices.find((v) => v.name.includes(name));
        if (found) {
          voiceRef.current = found;
          console.log(`🔊 Voice Engine: ${found.name}`);
          return;
        }
      }

      // Fallback: pick any English voice
      const english = voices.find((v) => v.lang.startsWith("en"));
      if (english) {
        voiceRef.current = english;
        console.log(`🔊 Voice Engine (fallback): ${english.name}`);
      }
    };

    pickVoice();
    // Voices load asynchronously in some browsers
    window.speechSynthesis?.addEventListener?.("voiceschanged", pickVoice);
    return () => {
      window.speechSynthesis?.removeEventListener?.("voiceschanged", pickVoice);
    };
  }, []);

  // ── Speech Recognition Setup ────────────────────
  useEffect(() => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.error("Speech Recognition Not Supported");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (final || interim) {
        setTranscript(final ? final : interim);
      }
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Error starting recognition:", e);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  // ── Instant Text-to-Speech (Browser Native) ─────
  const speak = useCallback((text) => {
    if (!text || text.trim().length === 0) return;
    if (!("speechSynthesis" in window)) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean text: remove JSON artifacts, code blocks, brackets
    const cleanText = text
      .replace(/\{.*?\}/gs, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[{}\[\]]/g, "")
      .replace(/\\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;    // Slightly faster for snappy feel
    utterance.pitch = 0.95;   // Slightly deeper for JARVIS-like voice
    utterance.volume = 1.0;

    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Stop speaking ─────────────────────────────────
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    stopSpeaking,
    resetTranscript,
    speak,
  };
};
