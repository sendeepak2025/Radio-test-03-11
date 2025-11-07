#!/usr/bin/env python3
"""Remove tw- prefix from all Tailwind classes"""

import re
from pathlib import Path

def remove_prefix_from_classes(class_string):
    """Remove tw- prefix from classes"""
    if not class_string:
        return class_string
    
    # Remove tw- prefix from all classes
    classes = class_string.split()
    unprefixed_classes = [cls.replace('tw-', '') for cls in classes]
    return ' '.join(unprefixed_classes)

def process_file(file_path):
    """Process a single file and remove tw- prefix"""
    print(f"Processing: {file_path.name}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all className attributes
    def replace_classname(match):
        classes = match.group(1)
        new_classes = remove_prefix_from_classes(classes)
        return f'className="{new_classes}"'
    
    # Replace className="..." with unprefixed version
    new_content = re.sub(r'className="([^"]*)"', replace_classname, content)
    
    # Write back if changed
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  ✓ Updated")
        return True
    else:
        print(f"  - No changes")
        return False

def main():
    print("=" * 50)
    print("Removing tw- Prefix from Tailwind Classes")
    print("=" * 50)
    print()
    
    # Find all TSX files in landing directories
    landing_dirs = [
        Path('viewer/src/pages/landing'),
        Path('viewer/src/components/landing'),
    ]
    
    files_updated = 0
    files_processed = 0
    
    for directory in landing_dirs:
        if not directory.exists():
            print(f"Warning: {directory} not found")
            continue
        
        for file_path in directory.rglob('*.tsx'):
            # Skip InlineLanding and SimpleLanding
            if file_path.name in ['InlineLanding.tsx', 'SimpleLanding.tsx', 'TailwindTest.tsx']:
                continue
                
            files_processed += 1
            if process_file(file_path):
                files_updated += 1
    
    print()
    print("=" * 50)
    print(f"✅ Complete!")
    print(f"   Processed: {files_processed} files")
    print(f"   Updated: {files_updated} files")
    print("=" * 50)

if __name__ == '__main__':
    main()
