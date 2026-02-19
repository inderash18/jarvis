import { useState, useEffect, useRef, useCallback } from "react";

export const useVoice = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);

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

  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = useCallback(
    (text) => {
      if ("speechSynthesis" in window) {
        // Cancel any current speech to prevent queue buildup
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Select a futuristic/clean voice
        // Priority: Microsoft Zira (Windows), Google US English (Chrome), Samantha (Mac)
        const preferredVoice = voices.find(
          (v) =>
            v.name.includes("Microsoft Zira") ||
            v.name.includes("Google US English") ||
            v.name.includes("Samantha"),
        );

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        } else {
          // Fallback to first English voice
          const englishVoice = voices.find((v) => v.lang.startsWith("en"));
          if (englishVoice) utterance.voice = englishVoice;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        console.log(
          "Speaking:",
          text,
          "Voice:",
          utterance.voice ? utterance.voice.name : "Default",
        );
        window.speechSynthesis.speak(utterance);
      }
    },
    [voices],
  );

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    speak,
  };
};
