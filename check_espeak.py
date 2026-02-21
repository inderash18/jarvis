import os
import sys

import espeakng_loader

print(f"espeakng_loader path: {espeakng_loader.get_library_path()}")
print(f"espeakng_loader data path: {espeakng_loader.get_data_path()}")

# Check if the path exists
lib_path = espeakng_loader.get_library_path()
if lib_path and os.path.exists(lib_path):
    print("Library found at path.")
else:
    print("Library not found.")
