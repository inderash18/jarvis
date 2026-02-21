import os


import espeakng_loader

path = os.path.dirname(espeakng_loader.get_library_path())
print(f"Path: {path}")
print("Contents:")
for f in os.listdir(path):
    print(f)
