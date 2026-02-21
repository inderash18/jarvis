try:
    import kittentts

    print(
        f"kittentts imported successfully. Version: {getattr(kittentts, '__version__', 'unknown')}"
    )
    print(f"Attributes: {dir(kittentts)}")
except ImportError as e:
    print(f"ImportError: {e}")
except Exception as e:
    print(f"Error: {e}")
