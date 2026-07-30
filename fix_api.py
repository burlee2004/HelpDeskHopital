import os
import re

directory = "frontend"

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content

    # Replace "http://127.0.0.1:8000/..." with `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/...`
    # Match double or single quotes
    content = re.sub(
        r'([\'"])http://127\.0\.0\.1:8000(.*?)(\1)', 
        r"`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}\2`", 
        content
    )

    # Replace inside backticks `http://127.0.0.1:8000/...`
    # Just replace the exact string with the env variable expression
    content = content.replace(
        "http://127.0.0.1:8000", 
        "${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}"
    )

    # Wait, the second replacement will also run on the first replacement's default value!
    # Because the first replacement inserts 'http://127.0.0.1:8000'.
    # Ah! Let's do it in one pass or use a temporary placeholder.

    pass

def process_file_better(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
        
    old_content = content
    
    # 1. Replace quotes: "http://127.0.0.1:8000..." -> `__API_BASE__...`
    content = re.sub(
        r'([\'"])http://127\.0\.0\.1:8000(.*?)(\1)',
        r"`__API_BASE__\2`",
        content
    )
    
    # 2. Replace raw string (which are inside backticks now, or were already inside backticks)
    content = content.replace("http://127.0.0.1:8000", "__API_BASE__")
    
    # 3. Replace placeholder with env variable
    content = content.replace("__API_BASE__", "${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}")
    
    if content != old_content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith((".ts", ".tsx")):
            process_file_better(os.path.join(root, file))

print("Done replacing.")
