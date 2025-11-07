#!/usr/bin/env python3
"""Add tw- prefix to Tailwind CSS classes in landing page components"""

import re
import os
from pathlib import Path

# Common Tailwind class patterns
TAILWIND_PATTERNS = [
    # Layout
    r'^(flex|inline-flex|grid|inline-grid|block|inline-block|hidden|container)$',
    r'^flex-(row|col|wrap|nowrap|1|auto|initial|none)$',
    r'^grid-cols-\d+$',
    
    # Spacing
    r'^[pm][xytblr]?-(\d+|auto|px)$',
    r'^space-[xy]-\d+$',
    r'^gap-\d+$',
    
    # Sizing  
    r'^[wh]-(full|screen|auto|fit|min|max|\d+|\[.+\])$',
    r'^(min|max)-[wh]-.+$',
    
    # Typography
    r'^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$',
    r'^text-(left|center|right|justify|start|end)$',
    r'^text-.+$',  # text-primary, text-muted-foreground, etc.
    r'^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$',
    r'^leading-.+$',
    r'^tracking-.+$',
    r'^(uppercase|lowercase|capitalize|normal-case)$',
    
    # Colors
    r'^bg-.+$',
    r'^border-.+$',
    
    # Borders & Radius
    r'^border(-[tblr])?(-\d+)?$',
    r'^rounded(-[a-z]+)?$',
    
    # Effects
    r'^shadow(-[a-z]+)?$',
    r'^opacity-\d+$',
    
    # Position
    r'^(relative|absolute|fixed|sticky|static)$',
    r'^(top|bottom|left|right|inset)-\d+$',
    r'^z-\d+$',
    
    # Display
    r'^overflow-.+$',
    r'^(visible|invisible)$',
    
    # Flexbox & Grid
    r'^(items|justify|content|self)-.+$',
    r'^col-span-\d+$',
    
    # Transitions & Animations
    r'^transition(-[a-z]+)?$',
    r'^duration-\d+$',
    r'^ease-.+$',
    r'^animate-.+$',
    
    # Transforms
    r'^transform$',
    r'^(translate|scale|rotate)-.+$',
    
    # Gradients
    r'^bg-gradient-.+$',
    r'^(from|to|via)-.+$',
    
    # Backdrop
    r'^backdrop-.+$',
    
    # Cursor & Pointer
    r'^cursor-.+$',
    r'^pointer-events-.+$',
    
    # Responsive & State prefixes
    r'^(sm|md|lg|xl|2xl):.+$',
    r'^(hover|focus|active|group-hover|group):.+$',
    
    # Custom classes from landing page
    r'^(card-glow|hover-lift|text-gradient|animate-float|animate-pulse-slow|animate-slide-in-up)$',
]

def is_tailwind_class(class_name):
    """Check if a class name is a Tailwind class"""
    for pattern in TAILWIND_PATTERNS:
        if re.match(pattern, class_name):
            return True
    return False

def add_prefix_to_classes(class_string):
    """Add tw- prefix to Tailwind classes in a className string"""
    if not class_string or class_string.startswith('tw-'):
        return class_string
    
    classes = class_string.split()
    prefixed_classes = []
    
    for cls in classes:
        # Skip empty strings
        if not cls:
            continue
            
        # Skip if already prefixed
        if cls.startswith('tw-'):
            prefixed_classes.append(cls)
            continue
        
        # Add prefix if it's a Tailwind class
        if is_tailwind_class(cls):
            prefixed_classes.append(f'tw-{cls}')
        else:
            prefixed_classes.append(cls)
    
    return ' '.join(prefixed_classes)

def process_file(file_path):
    """Process a single file and add tw- prefix to Tailwind classes"""
    print(f"Processing: {file_path.name}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all className attributes
    def replace_classname(match):
        classes = match.group(1)
        new_classes = add_prefix_to_classes(classes)
        return f'className="{new_classes}"'
    
    # Replace className="..." with prefixed version
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
    print("Adding tw- Prefix to Tailwind Classes")
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
            files_processed += 1
            if process_file(file_path):
                files_updated += 1
    
    print()
    print("=" * 50)
    print(f"✅ Complete!")
    print(f"   Processed: {files_processed} files")
    print(f"   Updated: {files_updated} files")
    print("=" * 50)
    print()
    print("Next steps:")
    print("1. Review the changes")
    print("2. Run: cd viewer && npm run dev")
    print("3. Visit: http://localhost:3010")

if __name__ == '__main__':
    main()
