import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useVoice Hook
 * ─────────────
 * Speech Recognition (STT): Browser Web Speech API
 * Text-to-Speech (TTS):    Backend KittenTTS via /api/tts endpoint
 *
 * This produces natural human-quality voice instead of robotic browser TTS.
 */

const TTS_API_URL = "http://localhost:8000/api/tts";

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const abortControllerRef = useRef(null);

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

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

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
        setTranscript((prev) => (final ? final : interim));
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

  // ── Text-to-Speech via Backend KittenTTS ────────
  const speak = useCallback(async (text) => {
    if (!text || text.trim().length === 0) return;

    // Cancel any ongoing speech
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      setIsSpeaking(true);
      abortControllerRef.current = new AbortController();

      // Clean text: remove JSON artifacts, curly braces, etc.
      const cleanText = text
        .replace(/\{.*?\}/gs, "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/[{}[\]]/g, "")
        .trim();

      if (!cleanText) {
        setIsSpeaking(false);
        return;
      }

      console.log("🐱 KittenTTS: Generating speech for:", cleanText.substring(0, 60) + "...");

      const url = `${TTS_API_URL}?text=${encodeURIComponent(cleanText)}&voice=Jasper`;

      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = (e) => {
        console.error("Audio playback error:", e);
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();

    } catch (err) {
      if (err.name === "AbortError") {
        console.log("TTS cancelled");
      } else {
        console.error("TTS Error:", err);
        // Fallback to browser TTS if backend is unavailable
        _fallbackBrowserSpeak(text);
      }
      setIsSpeaking(false);
    }
  }, []);

  // ── Browser TTS Fallback (only if backend fails) ──
  const _fallbackBrowserSpeak = useCallback((text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Try to use best available voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes("Microsoft Zira") ||
          v.name.includes("Google US English") ||
          v.name.includes("Samantha"),
      );
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  }, []);

  // ── Stop speaking ─────────────────────────────────
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
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
