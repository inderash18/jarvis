try:
    import numpy as np
    import soundfile as sf
    from kittentts import KittenTTS

    print("Initializing KittenTTS...")
    # The README example used: m = KittenTTS("KittenML/kitten-tts-mini-0.8")
    # Let's try that.
    m = KittenTTS("KittenML/kitten-tts-mini-0.8")

    text = "Hello, I am Jarvis."
    print(f"Generating audio for: '{text}'")
    audio = m.generate(text, voice="Jasper")

    print(f"Audio generated. Shape: {audio.shape}, Type: {type(audio)}")

    sf.write("test_kitten.wav", audio, 24000)
    print("Saved to test_kitten.wav")

except Exception as e:
    print(f"Error during generation: {e}")
