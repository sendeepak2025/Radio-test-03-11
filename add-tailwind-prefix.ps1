#!/usr/bin/env pwsh
# Add tw- prefix to all Tailwind classes in landing pages

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Adding tw- Prefix to Tailwind Classes" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Common Tailwind classes that need prefixing
$tailwindPatterns = @(
    # Layout
    'flex', 'inline-flex', 'grid', 'inline-grid', 'block', 'inline-block', 'hidden',
    'container', 'flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap',
    
    # Spacing
    'p-\d+', 'px-\d+', 'py-\d+', 'pt-\d+', 'pb-\d+', 'pl-\d+', 'pr-\d+',
    'm-\d+', 'mx-\d+', 'my-\d+', 'mt-\d+', 'mb-\d+', 'ml-\d+', 'mr-\d+',
    'gap-\d+', 'space-x-\d+', 'space-y-\d+',
    
    # Sizing
    'w-\d+', 'w-full', 'w-screen', 'w-auto', 'w-\[.*?\]',
    'h-\d+', 'h-full', 'h-screen', 'h-auto', 'h-\[.*?\]',
    'min-h-screen', 'min-w-\d+', 'max-w-\w+', 'max-h-\d+',
    
    # Typography
    'text-\w+', 'font-\w+', 'leading-\w+', 'tracking-\w+',
    'uppercase', 'lowercase', 'capitalize', 'normal-case',
    
    # Colors
    'bg-\w+', 'text-\w+', 'border-\w+',
    
    # Borders
    'border', 'border-\d+', 'border-t', 'border-b', 'border-l', 'border-r',
    'rounded', 'rounded-\w+',
    
    # Effects
    'shadow', 'shadow-\w+', 'opacity-\d+',
    
    # Positioning
    'relative', 'absolute', 'fixed', 'sticky', 'static',
    'top-\d+', 'bottom-\d+', 'left-\d+', 'right-\d+',
    'inset-\d+', 'z-\d+',
    
    # Display
    'overflow-\w+', 'visible', 'invisible',
    
    # Flexbox & Grid
    'items-\w+', 'justify-\w+', 'content-\w+', 'self-\w+',
    'grid-cols-\d+', 'col-span-\d+',
    
    # Transitions
    'transition', 'transition-\w+', 'duration-\d+', 'ease-\w+',
    
    # Transforms
    'transform', 'translate-\w+-\d+', 'scale-\d+', 'rotate-\d+',
    
    # Hover, Focus, etc
    'hover:', 'focus:', 'active:', 'group-hover:',
    
    # Responsive
    'sm:', 'md:', 'lg:', 'xl:', '2xl:',
    
    # Custom animations
    'animate-\w+',
    
    # Gradients
    'bg-gradient-\w+', 'from-\w+', 'to-\w+', 'via-\w+',
    
    # Backdrop
    'backdrop-\w+',
    
    # Cursor
    'cursor-\w+',
    
    # Pointer events
    'pointer-events-\w+'
)

function Add-TwPrefix {
    param (
        [string]$Content
    )
    
    # Replace className=" with a marker to process
    $result = $Content
    
    # Process each className attribute
    $result = $result -replace 'className="([^"]*)"', {
        param($match)
        $classes = $match.Groups[1].Value
        
        # Skip if already has tw- prefix or is empty
        if ($classes -match '^tw-' -or $classes -eq '') {
            return $match.Value
        }
        
        # Split classes and add tw- prefix to Tailwind classes
        $classArray = $classes -split '\s+'
        $prefixedClasses = $classArray | ForEach-Object {
            $class = $_
            
            # Skip if already prefixed
            if ($class -match '^tw-') {
                return $class
            }
            
            # Check if it's a Tailwind class
            $isTailwind = $false
            foreach ($pattern in $tailwindPatterns) {
                if ($class -match "^$pattern") {
                    $isTailwind = $true
                    break
                }
            }
            
            # Add prefix if it's a Tailwind class
            if ($isTailwind) {
                return "tw-$class"
            } else {
                return $class
            }
        }
        
        $newClasses = $prefixedClasses -join ' '
        return "className=`"$newClasses`""
    }
    
    return $result
}

# Get all landing page files
$landingFiles = @(
    Get-ChildItem -Path "viewer/src/pages/landing" -Filter "*.tsx" -Recurse
    Get-ChildItem -Path "viewer/src/components/landing" -Filter "*.tsx" -Recurse
)

$totalFiles = $landingFiles.Count
$currentFile = 0

foreach ($file in $landingFiles) {
    $currentFile++
    Write-Host "[$currentFile/$totalFiles] Processing: $($file.Name)" -ForegroundColor Yellow
    
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $newContent = Add-TwPrefix -Content $content
        
        if ($content -ne $newContent) {
            Set-Content -Path $file.FullName -Value $newContent -NoNewline -Encoding UTF8
            Write-Host "  ✓ Updated" -ForegroundColor Green
        } else {
            Write-Host "  - No changes needed" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Prefix addition complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the changes" -ForegroundColor White
Write-Host "2. Run: cd viewer && npm run dev" -ForegroundColor White
Write-Host "3. Visit: http://localhost:3010" -ForegroundColor White
Write-Host ""
