import sys

try:
    with open('all_files_raw.txt', 'r', encoding='utf-8') as f:
        for line in f:
            stripped_line = line.strip()
            if stripped_line.endswith('.ts') or stripped_line.endswith('.tsx'):
                print(stripped_line)
except UnicodeDecodeError:
    with open('all_files_raw.txt', 'r', encoding='cp1252') as f: # Try another common Windows encoding
        for line in f:
            stripped_line = line.strip()
            if stripped_line.endswith('.ts') or stripped_line.endswith('.tsx'):
                print(stripped_line)
