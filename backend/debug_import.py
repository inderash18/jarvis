
try:
    import sentence_transformers
    print(f"Success! Version: {sentence_transformers.__version__}")
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
