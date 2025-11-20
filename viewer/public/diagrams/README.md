# Anatomical Diagram Images

This directory contains anatomical diagram images for the reporting module.

## Required Diagram Images

Place anatomical diagram PNG images in this directory with the following naming convention:
`{bodyPart}_{view}.png`

### Current Requirements

1. **Breast Diagrams**
   - `breast_bilateral.png` - Bilateral breast diagram (frontal view)
   - Used by: Mammography BI-RADS template

2. **Spine Diagrams**
   - `spine_lateral.png` - Spine lateral view
   - Used by: MRI Spine template

3. **Chest Diagrams**
   - `chest_frontal.png` - Chest frontal view
   - Used by: CT Chest Lung Nodule template

## Image Specifications

- **Format**: PNG with transparent background preferred
- **Size**: 400x300 pixels (or higher resolution, will be scaled)
- **Content**: Simple anatomical outline suitable for marking/annotation
- **Color**: Grayscale or single color outlines work best

## Fallback Behavior

If a diagram image is not found, the DiagramInlineModule will display a placeholder with the body part and view name. The annotation tools will still function normally.

## Sources for Anatomical Diagrams

You can obtain anatomical diagrams from:
- Open anatomy databases (e.g., OpenAnatomy)
- Medical illustration libraries (ensure proper licensing)
- Custom illustrations created for your institution
- AI-generated anatomical outlines

## Example File Structure

```
viewer/public/diagrams/
├── README.md (this file)
├── breast_bilateral.png
├── spine_lateral.png
├── spine_frontal.png
├── chest_frontal.png
├── chest_lateral.png
├── head_axial.png
├── head_sagittal.png
└── abdomen_frontal.png
```
