/**
 * Enhanced Report Templates with Expanded Modality Coverage
 * Includes 12 new templates for comprehensive radiology support
 */

const mongoose = require('mongoose');
const ReportTemplate = require('../models/ReportTemplate');
require('dotenv').config();

const enhancedTemplates = [
  // ============================================================================
  // 1. CT CHEST REPORT
  // ============================================================================
  {
    templateId: 'TPL-CT-CHEST-001',
    name: 'CT Chest Report',
    description: 'Comprehensive template for chest CT studies',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['CT'],
      bodyParts: ['CHEST', 'THORAX', 'LUNG', 'MEDIASTINUM'],
      keywords: ['chest', 'thorax', 'ct chest', 'pulmonary', 'lung', 'mediastinum'],
      procedureTypes: ['diagnostic', 'screening']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 30,
      keywordWeight: 5,
      procedureTypeWeight: 15
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication for CT chest examination'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'CT chest performed with intravenous contrast.\nSlice thickness: [___ mm]\nContrast: [___ mL of iodinated contrast]\nPhase: [Arterial/Venous/Portal venous]\nReconstruction: Axial, coronal, and sagittal reformats',
        placeholder: 'CT protocol, contrast administration, slice thickness',
        validationRules: {
          requireContrastDocumentation: true,
          requireSliceThickness: true
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior CT or radiograph studies'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'LUNGS:\n\nAIRWAYS:\n\nMEDIASTINUM:\n\nHEART AND GREAT VESSELS:\n\nPLEURA:\n\nCHEST WALL:\n\nBONES:\n',
        placeholder: 'Systematic assessment: Lungs, Airways, Mediastinum, Heart, Great Vessels, Pleura, Chest Wall, Bones',
        validationRules: {
          minimumFindings: ['lungs', 'mediastinum', 'heart'],
          requireContrastEnhancement: true
        }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary and clinical significance'
      },
      {
        id: 'recommendations',
        title: 'Recommendations',
        order: 6,
        required: false,
        placeholder: 'Follow-up imaging or clinical recommendations'
      }
    ],
    fieldOptions: new Map([
      ['lungs', ['Clear', 'Ground-glass opacity', 'Consolidation', 'Nodule', 'Mass', 'Cavitation', 'Interstitial thickening', 'Emphysema', 'Fibrosis']],
      ['airways', ['Normal', 'Bronchiectasis', 'Mucus plugging', 'Airway wall thickening']],
      ['mediastinum', ['Normal', 'Lymphadenopathy', 'Mass', 'Widened']],
      ['heart', ['Normal', 'Cardiomegaly', 'Pericardial effusion', 'Calcification']],
      ['greatVessels', ['Normal', 'Atherosclerosis', 'Aneurysm', 'Dissection', 'Pulmonary embolism']],
      ['pleura', ['Normal', 'Effusion', 'Thickening', 'Pneumothorax', 'Calcification']],
      ['chestWall', ['Normal', 'Soft tissue mass', 'Rib fracture', 'Subcutaneous emphysema']],
      ['bones', ['Normal', 'Fracture', 'Lytic lesion', 'Sclerotic lesion', 'Degenerative changes']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'chest-anatomy',
      annotationTypes: ['nodule-marker', 'measurement', 'region-outline', 'lesion-arrow']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['lungs', 'mediastinum', 'greatVessels', 'pleura'],
      suggestedFindings: ['nodule', 'ground-glass', 'consolidation', 'effusion', 'lymphadenopathy', 'pulmonary embolism']
    },
    priority: 95,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 2. MRI SPINE (CERVICAL) REPORT
  // ============================================================================
  {
    templateId: 'TPL-MRI-CSPINE-001',
    name: 'MRI Cervical Spine Report',
    description: 'Detailed template for cervical spine MRI',
    category: 'neurology',
    matchingCriteria: {
      modalities: ['MR', 'MRI'],
      bodyParts: ['CSPINE', 'C-SPINE', 'CERVICAL', 'NECK'],
      keywords: ['cervical', 'c-spine', 'neck', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
      procedureTypes: ['diagnostic']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 35,
      keywordWeight: 5,
      procedureTypeWeight: 10
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication (neck pain, radiculopathy, myelopathy)'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'MRI cervical spine without and with IV gadolinium contrast.\nField strength: [1.5T / 3T]\nSequences: Sagittal T1, Sagittal T2, Sagittal STIR, Axial T2, Axial T1+C, Sagittal T1+C\nSlice thickness: [___ mm]',
        placeholder: 'MR sequences (T1, T2, STIR, T1+C), field strength, slice thickness',
        validationRules: {
          requireSequences: ['T1', 'T2'],
          requireGadoliniumDocumentation: true
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior MRI or CT studies'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'VERTEBRAL ALIGNMENT: Normal cervical lordosis. No subluxation.\n\nVERTEBRAL BODIES: Normal marrow signal and height.\n\nSPINAL CORD: Normal caliber and signal. No intramedullary lesion.\n\nC2-C3:\nC3-C4:\nC4-C5:\nC5-C6:\nC6-C7:\nC7-T1:\n\nNEURAL FORAMINA: Bilateral foramina are patent.\n\nFACET JOINTS: No significant arthropathy.\n\nSOFT TISSUES: Unremarkable.',
        placeholder: 'Vertebral bodies, Disc spaces (C2-C3 through C7-T1), Spinal cord, Neural foramina, Facet joints, Soft tissues',
        validationRules: {
          requireLevelByLevel: true,
          minimumLevels: ['C2-C3', 'C3-C4', 'C4-C5', 'C5-C6', 'C6-C7', 'C7-T1']
        }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary of significant findings with level specification'
      }
    ],
    fieldOptions: new Map([
      ['vertebralBodies', ['Normal', 'Hemangioma', 'Compression fracture', 'Marrow edema', 'Metastasis', 'Degenerative changes']],
      ['discSpaces', ['Normal', 'Disc desiccation', 'Disc herniation (central)', 'Disc herniation (foraminal)', 'Disc herniation (lateral)', 'Disc bulge', 'Osteophyte complex']],
      ['spinalCord', ['Normal', 'Myelomalacia', 'Syrinx', 'Cord edema', 'Cord compression', 'Intramedullary lesion']],
      ['neuralForamina', ['Patent', 'Mild narrowing', 'Moderate narrowing', 'Severe narrowing', 'Occluded']],
      ['facetJoints', ['Normal', 'Mild arthropathy', 'Moderate arthropathy', 'Severe arthropathy', 'Effusion']],
      ['softTissues', ['Normal', 'Prevertebral edema', 'Paraspinal muscle spasm', 'Lymphadenopathy', 'Mass']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'spine-lateral',
      annotationTypes: ['disc-level-marker', 'measurement', 'stenosis-grade', 'herniation-arrow']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['vertebralBodies', 'discSpaces', 'spinalCord'],
      suggestedFindings: ['disc herniation', 'spinal stenosis', 'cord compression', 'foraminal narrowing']
    },
    priority: 90,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 3. MRI LUMBAR SPINE REPORT
  // ============================================================================
  {
    templateId: 'TPL-MRI-LSPINE-001',
    name: 'MRI Lumbar Spine Report',
    description: 'Detailed template for lumbar spine MRI',
    category: 'neurology',
    matchingCriteria: {
      modalities: ['MR', 'MRI'],
      bodyParts: ['LSPINE', 'L-SPINE', 'LUMBAR', 'LOWER BACK'],
      keywords: ['lumbar', 'l-spine', 'lower back', 'l1', 'l2', 'l3', 'l4', 'l5', 's1'],
      procedureTypes: ['diagnostic']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 35,
      keywordWeight: 5,
      procedureTypeWeight: 10
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication (back pain, radiculopathy, sciatica)'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'MRI lumbar spine without IV contrast.\nField strength: [1.5T / 3T]\nSequences: Sagittal T1, Sagittal T2, Sagittal STIR, Axial T2 through disc spaces\nSlice thickness: [___ mm]',
        placeholder: 'MR sequences (T1, T2, STIR), field strength, slice thickness',
        validationRules: {
          requireSequences: ['T1', 'T2'],
          requireGadoliniumDocumentation: true
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior MRI or CT studies'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'VERTEBRAL ALIGNMENT: Normal lumbar lordosis. No spondylolisthesis.\n\nVERTEBRAL BODIES: Normal marrow signal and height.\n\nCONUS MEDULLARIS: Terminates at appropriate level (T12-L2). Normal signal.\n\nT12-L1:\nL1-L2:\nL2-L3:\nL3-L4:\nL4-L5:\nL5-S1:\n\nNEURAL FORAMINA: Bilateral foramina are patent.\n\nFACET JOINTS: No significant arthropathy.\n\nSACRUM: Unremarkable.\n\nPARAVERTEBRAL SOFT TISSUES: Unremarkable.',
        placeholder: 'Vertebral bodies, Disc spaces (T12-L1 through L5-S1), Conus medullaris, Cauda equina, Neural foramina, Facet joints, Sacrum',
        validationRules: {
          requireLevelByLevel: true,
          minimumLevels: ['L1-L2', 'L2-L3', 'L3-L4', 'L4-L5', 'L5-S1']
        }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary of significant findings with level specification'
      }
    ],
    fieldOptions: new Map([
      ['vertebralBodies', ['Normal', 'Hemangioma', 'Compression fracture', 'Marrow edema', 'Metastasis', 'Degenerative changes', 'Schmorl\'s nodes']],
      ['discSpaces', ['Normal', 'Disc desiccation', 'Disc herniation (central)', 'Disc herniation (foraminal)', 'Disc herniation (lateral)', 'Disc bulge', 'Osteophyte complex', 'Annular fissure']],
      ['spinalCanal', ['Normal', 'Mild stenosis', 'Moderate stenosis', 'Severe stenosis']],
      ['neuralForamina', ['Patent', 'Mild narrowing', 'Moderate narrowing', 'Severe narrowing', 'Occluded']],
      ['facetJoints', ['Normal', 'Mild arthropathy', 'Moderate arthropathy', 'Severe arthropathy', 'Effusion', 'Ligamentum flavum hypertrophy']],
      ['sacrum', ['Normal', 'Sacral insufficiency fracture', 'Sacroiliitis', 'Degenerative changes']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'spine-lateral',
      annotationTypes: ['disc-level-marker', 'measurement', 'stenosis-grade', 'herniation-arrow', 'nerve-root-marker']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['vertebralBodies', 'discSpaces', 'spinalCanal', 'neuralForamina'],
      suggestedFindings: ['disc herniation', 'spinal stenosis', 'nerve root compression', 'foraminal narrowing', 'facet arthropathy']
    },
    priority: 90,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 4. ULTRASOUND ABDOMEN REPORT
  // ============================================================================
  {
    templateId: 'TPL-US-ABDOMEN-001',
    name: 'Ultrasound Abdomen Report',
    description: 'Complete template for abdominal ultrasound',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['US'],
      bodyParts: ['ABDOMEN', 'ABD', 'UPPER ABDOMEN'],
      keywords: ['abdomen', 'abdominal', 'ultrasound', 'sonography', 'us abdomen'],
      procedureTypes: ['diagnostic', 'screening']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 30,
      keywordWeight: 5,
      procedureTypeWeight: 15
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication for ultrasound examination'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'Transabdominal ultrasound of the abdomen.\nTransducer frequency: [3-5 MHz curved array]\nPatient position: Supine\nFasting status: [Fasting / Non-fasting]\nImage quality: [Adequate / Limited by bowel gas/body habitus]',
        placeholder: 'Transducer frequency, patient position, fasting status',
        validationRules: {
          requireProbeFrequency: true,
          requireFastingStatus: true
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior ultrasound or CT studies'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'LIVER: Normal size, echogenicity, and echotexture. No focal lesion. Portal vein is patent.\n\nGALLBLADDER: Normal wall thickness. No gallstones or sludge.\n\nBILE DUCTS: Common bile duct measures [___ mm] (normal <7 mm). Intrahepatic bile ducts are not dilated.\n\nPANCREAS: [Visualized portions are unremarkable / Not well visualized due to bowel gas].\n\nSPLEEN: Normal size and echogenicity. Measures [___ cm].\n\nRIGHT KIDNEY: Normal size, cortical thickness, and echogenicity. Measures [___ cm]. No hydronephrosis or stone.\n\nLEFT KIDNEY: Normal size, cortical thickness, and echogenicity. Measures [___ cm]. No hydronephrosis or stone.\n\nAORTA: Normal caliber. No aneurysm.\n\nIVC: Normal caliber. Patent.\n\nASCITES: None.',
        placeholder: 'Liver, Gallbladder, Bile ducts, Pancreas, Spleen, Kidneys, Aorta, IVC',
        validationRules: {
          minimumFindings: ['liver', 'gallbladder', 'kidneys']
        }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary and clinical significance'
      }
    ],
    fieldOptions: new Map([
      ['liver', ['Normal', 'Fatty liver', 'Cirrhosis', 'Cyst', 'Hemangioma', 'Mass', 'Hepatomegaly']],
      ['gallbladder', ['Normal', 'Cholelithiasis', 'Gallbladder wall thickening', 'Polyp', 'Sludge', 'Cholecystitis signs']],
      ['bileDucts', ['Normal', 'CBD dilatation', 'IHBD dilatation', 'Choledocholithiasis']],
      ['pancreas', ['Normal', 'Not well visualized', 'Pancreatitis', 'Mass', 'Duct dilatation']],
      ['spleen', ['Normal', 'Splenomegaly', 'Splenic cyst', 'Splenic infarct']],
      ['kidneys', ['Normal', 'Nephrolithiasis', 'Hydronephrosis', 'Cyst', 'Mass', 'Echogenic kidneys']],
      ['aorta', ['Normal', 'Aneurysm', 'Atherosclerosis']],
      ['ivc', ['Normal', 'Dilated', 'Thrombosis']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'abdomen-organs',
      annotationTypes: ['organ-marker', 'measurement-caliper', 'lesion-outline', 'stone-marker']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['liver', 'gallbladder', 'kidneys'],
      suggestedFindings: ['cholelithiasis', 'fatty liver', 'kidney stone', 'cyst', 'hepatomegaly']
    },
    priority: 85,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 5. MAMMOGRAPHY REPORT (BI-RADS)
  // ============================================================================
  {
    templateId: 'TPL-MAMMO-001',
    name: 'Mammography Report (BI-RADS)',
    description: 'Standardized mammography template with BI-RADS classification',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['MG', 'DM'],
      bodyParts: ['BREAST', 'CHEST'],
      keywords: ['mammogram', 'mammography', 'breast', 'screening', 'diagnostic'],
      procedureTypes: ['screening', 'diagnostic']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 30,
      keywordWeight: 5,
      procedureTypeWeight: 15
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Screening vs diagnostic, clinical symptoms, prior history'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'Digital mammography\nViews: Bilateral CC and MLO views\nTomosynthesis: [Yes / No]',
        placeholder: '2D vs 3D (tomosynthesis), views obtained (CC, MLO)',
        validationRules: {
          requireViews: true,
          requireBreastDensity: true
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: true,
        placeholder: 'Prior mammograms (date and stability assessment)'
      },
      {
        id: 'breast-composition',
        title: 'Breast Composition',
        order: 4,
        required: true,
        defaultContent: 'BI-RADS Breast Density: [Select A, B, C, or D]\n\nA - Almost entirely fatty\nB - Scattered fibroglandular density\nC - Heterogeneously dense (may obscure small masses)\nD - Extremely dense (lowers sensitivity of mammography)',
        placeholder: 'BI-RADS breast density category (A, B, C, or D)'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 5,
        required: true,
        defaultContent: 'RIGHT BREAST:\n  Masses: None\n  Calcifications: None\n  Asymmetries: None\n  Architectural distortion: None\n\nLEFT BREAST:\n  Masses: None\n  Calcifications: None\n  Asymmetries: None\n  Architectural distortion: None\n\nAXILLAE: Lymph nodes are within normal limits bilaterally.\n\nSKIN/NIPPLE: Unremarkable.',
        placeholder: 'Masses, Calcifications, Architectural distortion, Asymmetries, Lymph nodes'
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 6,
        required: true,
        defaultContent: 'BI-RADS Category: [Select 0-6]\n\n0 - Incomplete (need additional imaging)\n1 - Negative\n2 - Benign\n3 - Probably benign\n4 - Suspicious\n5 - Highly suggestive of malignancy\n6 - Known biopsy-proven malignancy\n\nRECOMMENDATION:',
        placeholder: 'BI-RADS category and management recommendation'
      }
    ],
    fieldOptions: new Map([
      ['breastDensity', ['A - Almost entirely fatty', 'B - Scattered fibroglandular density', 'C - Heterogeneously dense', 'D - Extremely dense']],
      ['biRadsCategory', ['0 - Incomplete', '1 - Negative', '2 - Benign', '3 - Probably benign', '4 - Suspicious', '5 - Highly suggestive of malignancy', '6 - Known biopsy-proven malignancy']],
      ['masses', ['None', 'Round/oval circumscribed', 'Irregular microlobulated', 'Irregular spiculated', 'Oval indistinct']],
      ['calcifications', ['None', 'Benign (coarse)', 'Benign (vascular)', 'Suspicious (fine pleomorphic)', 'Suspicious (fine linear/branching)', 'Suspicious (amorphous)']],
      ['asymmetries', ['None', 'Asymmetry', 'Focal asymmetry', 'Global asymmetry', 'Developing asymmetry']],
      ['recommendations', ['Routine screening in 1 year', '6-month follow-up', 'Additional imaging (ultrasound)', 'Biopsy recommended', 'Surgical consultation']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'breast-quadrants',
      annotationTypes: ['mass-marker', 'calcification-marker', 'clock-position', 'distance-from-nipple']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['breastDensity', 'masses', 'calcifications'],
      suggestedFindings: ['mass', 'calcifications', 'asymmetry', 'architectural distortion']
    },
    priority: 95,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 6. X-RAY EXTREMITY (UPPER) REPORT
  // ============================================================================
  {
    templateId: 'TPL-XRAY-EXTREMITY-UPPER-001',
    name: 'X-Ray Upper Extremity Report',
    description: 'Template for hand, wrist, forearm, elbow, humerus, shoulder X-rays',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['CR', 'DX'],
      bodyParts: ['HAND', 'WRIST', 'FOREARM', 'ELBOW', 'HUMERUS', 'SHOULDER', 'ARM'],
      keywords: ['hand', 'wrist', 'forearm', 'elbow', 'humerus', 'shoulder', 'arm', 'clavicle', 'scapula'],
      procedureTypes: ['diagnostic', 'follow-up']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 35,
      keywordWeight: 5,
      procedureTypeWeight: 10
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication (trauma, pain, swelling, limited ROM)'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'Radiographs of the [shoulder/humerus/elbow/forearm/wrist/hand/finger].\nViews obtained: [AP, lateral, oblique]\nNumber of views: [2/3/4]\nTechnique: [Digital radiography]\nPenetration: Adequate',
        placeholder: 'Views obtained (AP, lateral, oblique)',
        validationRules: {
          requireViews: true,
          minimumViews: 2
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior radiographs'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'BONES: Normal osseous structures. No acute fracture or dislocation. No lytic or blastic lesion. Normal bone mineralization.\n\nJOINTS: Joint spaces are preserved. No joint effusion. Articular surfaces are smooth.\n\nSOFT TISSUES: Soft tissues are unremarkable. No soft tissue swelling or foreign body.\n\nALIGNMENT: Normal anatomic alignment.',
        placeholder: 'Bones, Joints, Soft tissues, Alignment'
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary including fracture classification if applicable'
      }
    ],
    fieldOptions: new Map([
      ['bones', ['Normal', 'Acute fracture', 'Healing fracture', 'Nonunion', 'Malunion', 'Dislocation', 'Lytic lesion', 'Sclerotic lesion', 'Osteopenia']],
      ['joints', ['Normal', 'Degenerative changes', 'Joint space narrowing', 'Effusion', 'Dislocation', 'Subluxation']],
      ['softTissues', ['Normal', 'Soft tissue swelling', 'Foreign body', 'Calcification', 'Gas']],
      ['alignment', ['Normal', 'Malalignment', 'Subluxation', 'Dislocation']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'extremity-bones',
      annotationTypes: ['fracture-line', 'measurement', 'angle-measurement', 'displacement-arrow']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['bones', 'joints', 'alignment'],
      suggestedFindings: ['fracture', 'dislocation', 'degenerative changes', 'soft tissue swelling']
    },
    priority: 80,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 7. X-RAY EXTREMITY (LOWER) REPORT
  // ============================================================================
  {
    templateId: 'TPL-XRAY-EXTREMITY-LOWER-001',
    name: 'X-Ray Lower Extremity Report',
    description: 'Template for foot, ankle, tibia/fibula, knee, femur, hip, pelvis X-rays',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['CR', 'DX'],
      bodyParts: ['FOOT', 'ANKLE', 'LEG', 'TIBIA', 'FIBULA', 'KNEE', 'FEMUR', 'HIP', 'PELVIS'],
      keywords: ['foot', 'ankle', 'tibia', 'fibula', 'knee', 'femur', 'hip', 'pelvis', 'leg'],
      procedureTypes: ['diagnostic', 'follow-up']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 35,
      keywordWeight: 5,
      procedureTypeWeight: 10
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication (trauma, pain, swelling, limited ROM)'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'Radiographs of the [hip/femur/knee/tibia-fibula/ankle/foot/toe].\nViews obtained: [AP, lateral, oblique]\nNumber of views: [2/3/4]\nTechnique: [Digital radiography]\nWeight-bearing: [Yes / No]\nPenetration: Adequate',
        placeholder: 'Views obtained (AP, lateral, oblique)',
        validationRules: {
          requireViews: true,
          minimumViews: 2
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior radiographs'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'BONES: Normal osseous structures. No acute fracture or dislocation. No lytic or blastic lesion. Normal bone mineralization.\n\nJOINTS: Joint spaces are preserved. No joint effusion. Articular surfaces are smooth.\n\nSOFT TISSUES: Soft tissues are unremarkable. No soft tissue swelling or foreign body.\n\nALIGNMENT: Normal anatomic alignment.',
        placeholder: 'Bones, Joints, Soft tissues, Alignment'
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary including fracture classification if applicable'
      }
    ],
    fieldOptions: new Map([
      ['bones', ['Normal', 'Acute fracture', 'Stress fracture', 'Healing fracture', 'Nonunion', 'Malunion', 'Lytic lesion', 'Sclerotic lesion', 'Osteopenia']],
      ['joints', ['Normal', 'Degenerative changes', 'Joint space narrowing', 'Effusion', 'Dislocation', 'Subluxation']],
      ['softTissues', ['Normal', 'Soft tissue swelling', 'Foreign body', 'Calcification', 'Joint effusion']],
      ['alignment', ['Normal', 'Malalignment', 'Subluxation', 'Dislocation', 'Leg length discrepancy']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'extremity-bones',
      annotationTypes: ['fracture-line', 'measurement', 'angle-measurement', 'displacement-arrow', 'weight-bearing-line']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['bones', 'joints', 'alignment'],
      suggestedFindings: ['fracture', 'dislocation', 'degenerative changes', 'effusion']
    },
    priority: 80,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 8. CT HEAD/BRAIN REPORT
  // ============================================================================
  {
    templateId: 'TPL-CT-BRAIN-001',
    name: 'CT Head/Brain Report',
    description: 'Comprehensive template for non-contrast and contrast brain CT',
    category: 'neurology',
    matchingCriteria: {
      modalities: ['CT'],
      bodyParts: ['HEAD', 'BRAIN', 'SKULL'],
      keywords: ['head', 'brain', 'ct head', 'ct brain', 'skull', 'intracranial'],
      procedureTypes: ['diagnostic', 'follow-up']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 30,
      keywordWeight: 5,
      procedureTypeWeight: 15
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication (headache, trauma, stroke, seizure)'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'Non-contrast CT of the head.\nSlice thickness: [2.5/5 mm]\nReconstruction: Axial images. Coronal and sagittal reformats.\nWindow settings: Brain and bone windows reviewed.\nIV contrast: [None / 100 mL iodinated contrast administered]',
        placeholder: 'Non-contrast vs contrast, slice thickness, window settings',
        validationRules: {
          requireContrastDocumentation: true
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior CT or MRI studies'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'BRAIN PARENCHYMA: Normal gray-white matter differentiation. No acute infarct, hemorrhage, or mass lesion. No abnormal enhancement.\n\nVENTRICLES AND CISTERNS: Ventricles and sulci are normal in size and configuration. No midline shift. Fourth ventricle and basal cisterns are patent.\n\nEXTRA-AXIAL SPACES: No extra-axial fluid collection, hemorrhage, or mass.\n\nVASCULAR STRUCTURES: Major intracranial vessels are patent. No aneurysm or vascular malformation identified.\n\nSKULL AND SCALP: Calvarium is intact. No fracture. Scalp is unremarkable.\n\nPARANASAL SINUSES: Paranasal sinuses and mastoid air cells are clear.\n\nORBITS: Globes and extraocular muscles are symmetric and unremarkable.',
        placeholder: 'Brain parenchyma, Ventricles, Extra-axial spaces, Skull, Sinuses',
        validationRules: {
          minimumFindings: ['brain', 'ventricles', 'skull']
        }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary and clinical significance'
      }
    ],
    fieldOptions: new Map([
      ['brainParenchyma', ['Normal', 'Acute infarct', 'Hemorrhage (intraparenchymal)', 'Hemorrhage (subarachnoid)', 'Hemorrhage (subdural)', 'Hemorrhage (epidural)', 'Mass', 'Edema', 'Atrophy']],
      ['ventricles', ['Normal', 'Hydrocephalus', 'Intraventricular hemorrhage', 'Asymmetric']],
      ['extraAxial', ['Normal', 'Subdural hematoma', 'Epidural hematoma', 'Subarachnoid hemorrhage', 'Hygroma']],
      ['skull', ['Normal', 'Fracture', 'Lytic lesion', 'Sclerotic lesion']],
      ['sinuses', ['Clear', 'Mucosal thickening', 'Air-fluid level', 'Opacification']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'brain-axial',
      annotationTypes: ['hemorrhage-marker', 'measurement', 'lesion-outline', 'midline-shift']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['brainParenchyma', 'ventricles', 'extraAxial'],
      suggestedFindings: ['hemorrhage', 'infarct', 'mass', 'midline shift', 'hydrocephalus']
    },
    priority: 95,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 9. ULTRASOUND PELVIS (GYNECOLOGIC) REPORT
  // ============================================================================
  {
    templateId: 'TPL-US-PELVIS-GYN-001',
    name: 'Ultrasound Pelvis (Gynecologic) Report',
    description: 'Template for pelvic ultrasound focusing on gynecologic structures',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['US'],
      bodyParts: ['PELVIS', 'UTERUS', 'OVARY', 'ADNEXA'],
      keywords: ['pelvis', 'pelvic', 'uterus', 'ovary', 'adnexa', 'gynecologic', 'transvaginal'],
      procedureTypes: ['diagnostic', 'screening']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 30,
      keywordWeight: 5,
      procedureTypeWeight: 15
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication (pelvic pain, bleeding, mass)'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'Pelvic ultrasound performed.\nApproach: [Transabdominal and transvaginal / Transabdominal only / Transvaginal only]\nTransabdominal probe: [3-5 MHz curved array]\nTransvaginal probe: [7-9 MHz endocavitary]\nBladder: [Distended for transabdominal / Empty for transvaginal]\nImage quality: Adequate',
        placeholder: 'Transabdominal and/or transvaginal approach, probe frequency',
        validationRules: {
          requireApproach: true,
          requireBladderStatus: true
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior ultrasound studies'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'UTERUS: Anteverted/Retroverted. Normal size and contour. Measures [___ × ___ × ___ cm]. Myometrium is homogeneous. No fibroids or masses.\n\nENDOMETRIUM: Measures [___ mm] in thickness. [Appropriate for menstrual phase / Post-menopausal]. Endometrial stripe is smooth and symmetric.\n\nCERVIX: Unremarkable. No masses or nabothian cysts.\n\nRIGHT OVARY: Normal size and morphology. Measures [___ × ___ × ___ cm]. Contains normal follicles. No masses or cysts.\n\nLEFT OVARY: Normal size and morphology. Measures [___ × ___ × ___ cm]. Contains normal follicles. No masses or cysts.\n\nADNEXA: No adnexal masses. Fallopian tubes are not visualized (normal).\n\nCUL-DE-SAC: No free fluid.\n\nBLADDER: Unremarkable when visualized.',
        placeholder: 'Uterus, Endometrium, Cervix, Right ovary, Left ovary, Adnexa, Cul-de-sac, Bladder',
        validationRules: {
          minimumFindings: ['uterus', 'rightOvary', 'leftOvary']
        }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary and clinical significance'
      }
    ],
    fieldOptions: new Map([
      ['uterus', ['Normal', 'Enlarged', 'Fibroid', 'Adenomyosis', 'Retroverted', 'Anteverted']],
      ['endometrium', ['Normal thickness', 'Thickened', 'Polyp', 'Hyperplasia', 'Fluid']],
      ['cervix', ['Normal', 'Nabothian cyst', 'Mass']],
      ['ovaries', ['Normal', 'Cyst (simple)', 'Cyst (complex)', 'Hemorrhagic cyst', 'Dermoid', 'Solid mass', 'Enlarged', 'Not visualized']],
      ['adnexa', ['Normal', 'Free fluid', 'Mass', 'Hydrosalpinx']],
      ['culDeSac', ['No free fluid', 'Small free fluid', 'Moderate free fluid', 'Large free fluid']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'pelvis-sagittal',
      annotationTypes: ['organ-marker', 'measurement-caliper', 'cyst-marker', 'mass-outline']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['uterus', 'ovaries', 'endometrium'],
      suggestedFindings: ['fibroid', 'ovarian cyst', 'free fluid', 'endometrial thickening']
    },
    priority: 85,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 10. FLUOROSCOPY UPPER GI REPORT
  // ============================================================================
  {
    templateId: 'TPL-FLUORO-UGI-001',
    name: 'Fluoroscopy Upper GI Report',
    description: 'Template for upper GI fluoroscopy studies',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['RF', 'XA'],
      bodyParts: ['ESOPHAGUS', 'STOMACH', 'DUODENUM', 'UPPER GI'],
      keywords: ['upper gi', 'esophagus', 'stomach', 'duodenum', 'barium', 'swallow'],
      procedureTypes: ['diagnostic']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 30,
      keywordWeight: 5,
      procedureTypeWeight: 15
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication (dysphagia, reflux, upper GI bleeding)'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'Fluoroscopic examination of the upper gastrointestinal tract.\nContrast: Barium sulfate suspension\nPatient position: Upright and supine\nFluoroscopy time: [___ seconds]',
        placeholder: 'Contrast agent (barium vs water-soluble), patient position, fluoroscopy time',
        validationRules: {
          requireContrastAgent: true,
          requireFluoroscopyTime: true
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior upper GI studies'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'ESOPHAGUS: Normal caliber. No stricture, mass, or diverticulum. Swallowing mechanism intact.\n\nGASTROESOPHAGEAL JUNCTION: No hiatal hernia. No reflux observed.\n\nSTOMACH: Normal distensibility. Rugal folds are normal. No masses, ulcers, or filling defects.\n\nDUODENUM: Normal mucosal pattern. No obstruction or masses.\n\nTRANSIT: Contrast passes normally through the upper GI tract.',
        placeholder: 'Esophagus, Gastroesophageal junction, Stomach, Duodenum, Transit'
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary and clinical significance'
      }
    ],
    fieldOptions: new Map([
      ['esophagus', ['Normal', 'Stricture', 'Hiatal hernia', 'Diverticulum', 'Reflux', 'Mass', 'Dysmotility']],
      ['gej', ['Normal', 'Hiatal hernia', 'Reflux', 'Schatzki ring']],
      ['stomach', ['Normal', 'Gastritis', 'Ulcer', 'Mass', 'Outlet obstruction', 'Delayed emptying']],
      ['duodenum', ['Normal', 'Ulcer', 'Mass', 'Diverticulum']],
      ['transit', ['Normal', 'Delayed', 'Rapid']]
    ]),
    diagramAnnotations: {
      enabled: false
    },
    aiIntegration: {
      enabled: false
    },
    priority: 75,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 11. CT PULMONARY ANGIOGRAM (CTPA) REPORT
  // ============================================================================
  {
    templateId: 'TPL-CTPA-001',
    name: 'CT Pulmonary Angiogram (CTPA) Report',
    description: 'Specialized template for pulmonary embolism protocol CT',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['CT'],
      bodyParts: ['CHEST', 'LUNG', 'PULMONARY'],
      keywords: ['ctpa', 'pulmonary angiogram', 'pulmonary embolism', 'pe protocol'],
      procedureTypes: ['diagnostic']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 30,
      keywordWeight: 10,
      procedureTypeWeight: 10
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication (suspected pulmonary embolism, Wells score, D-dimer)'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'CT pulmonary angiography (CTPA) performed.\nContrast: [80-100 mL] of iodinated contrast at [4-5 mL/sec].\nBolus tracking: Triggered in main pulmonary artery at [100-150 HU].\nSlice thickness: [1-1.25 mm]\nReconstruction: Axial, coronal, and sagittal reformats.\nMIP images reviewed.',
        placeholder: 'IV contrast timing, bolus tracking, slice thickness',
        validationRules: {
          requireContrastDocumentation: true,
          requireContrastTiming: true
        }
      },
      {
        id: 'quality',
        title: 'Study Quality',
        order: 3,
        required: true,
        placeholder: 'Assessment of pulmonary arterial opacification and image quality'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'PULMONARY ARTERIES: Main, right, and left pulmonary arteries are patent. No filling defects to suggest pulmonary embolism. Pulmonary arterial opacification is diagnostic.\n\nRIGHT VENTRICLE: Normal size. RV/LV ratio is normal (<1.0). Interventricular septum is in normal position. No signs of right heart strain.\n\nLUNGS: Lungs are clear. No consolidation, mass, or nodule. No ground-glass opacity.\n\nPLEURA: No pleural effusion or pneumothorax.\n\nMEDIASTINUM: Mediastinal and hilar lymph nodes are not enlarged. No mediastinal mass.\n\nHEART: Heart size is normal. No pericardial effusion.\n\nCHEST WALL AND BONES: Unremarkable.\n\nUPPER ABDOMEN: Visualized portions of upper abdomen are unremarkable.',
        placeholder: 'Pulmonary arteries, Right ventricle size, Lungs, Pleura, Mediastinum',
        validationRules: {
          requirePEAssessment: true,
          requireRVAssessment: true
        }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'PE present/absent, location, RV strain assessment'
      }
    ],
    fieldOptions: new Map([
      ['studyQuality', ['Diagnostic', 'Suboptimal (motion)', 'Suboptimal (contrast timing)', 'Non-diagnostic']],
      ['pulmonaryEm bolism', ['No PE', 'Main PA thrombus', 'Lobar PE', 'Segmental PE', 'Subsegmental PE', 'Chronic PE']],
      ['rvSize', ['Normal', 'Mildly enlarged', 'Moderately enlarged', 'Severely enlarged', 'RV/LV ratio > 1']],
      ['lungs', ['Clear', 'Consolidation', 'Ground-glass opacity', 'Infarct', 'Atelectasis']],
      ['pleura', ['Normal', 'Effusion', 'Pneumothorax']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'pulmonary-vessels',
      annotationTypes: ['pe-marker', 'vessel-measurement', 'rv-lv-ratio']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['pulmonaryEmbolism', 'rvSize', 'studyQuality'],
      suggestedFindings: ['pulmonary embolism', 'rv enlargement', 'infarct', 'pleural effusion']
    },
    priority: 100,
    active: true,
    isDefault: true
  },

  // ============================================================================
  // 12. MRI KNEE REPORT
  // ============================================================================
  {
    templateId: 'TPL-MRI-KNEE-001',
    name: 'MRI Knee Report',
    description: 'Comprehensive template for knee MRI with meniscal/ligamentous evaluation',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['MR', 'MRI'],
      bodyParts: ['KNEE'],
      keywords: ['knee', 'meniscus', 'acl', 'pcl', 'mcl', 'lcl'],
      procedureTypes: ['diagnostic']
    },
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 35,
      keywordWeight: 5,
      procedureTypeWeight: 10
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical indication (pain, swelling, locking, instability)'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'MRI of the [right/left] knee without IV contrast.\nField strength: [1.5T / 3T]\nSequences: Sagittal T1, Sagittal PD fat-sat, Coronal T2 fat-sat, Coronal PD, Axial T2 fat-sat\nCoil: [Dedicated knee coil]\nSlice thickness: [3-4 mm]',
        placeholder: 'MR sequences (T1, T2, PD, STIR), field strength, coil type',
        validationRules: {
          requireSequences: ['T1', 'T2']
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior MRI or radiographs'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: 'MEDIAL MENISCUS: Normal morphology and signal. No tear. Meniscal body and horns are intact.\n\nLATERAL MENISCUS: Normal morphology and signal. No tear. Meniscal body and horns are intact.\n\nANTERIOR CRUCIATE LIGAMENT (ACL): Intact. Normal morphology and signal intensity. No tear.\n\nPOSTERIOR CRUCIATE LIGAMENT (PCL): Intact. Normal morphology and signal. No tear.\n\nMEDIAL COLLATERAL LIGAMENT (MCL): Intact. No sprain or tear.\n\nLATERAL COLLATERAL LIGAMENT (LCL): Intact. No sprain or tear.\n\nPOSTEROLATERAL CORNER: Intact.\n\nCARTILAGE: Articular cartilage is preserved in all compartments. No chondral defect or fissure.\n  - Medial compartment: Normal\n  - Lateral compartment: Normal\n  - Patellofemoral compartment: Normal\n\nBONE MARROW: Normal marrow signal. No bone marrow edema or contusion. No fracture.\n\nJOINT EFFUSION: [None / Minimal / Moderate / Large].\n\nSYNOVIUM: No synovitis or synovial thickening.\n\nEXTENSOR MECHANISM: Quadriceps and patellar tendons are intact. Normal patellar tracking.\n\nBAKER\'S CYST: [None / Present in popliteal fossa].',
        placeholder: 'Menisci, Cruciate ligaments, Collateral ligaments, Cartilage, Bone marrow, Joint effusion, Synovium',
        validationRules: {
          requireMeniscalAssessment: true,
          requireLigamentAssessment: true
        }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary of meniscal, ligamentous, and cartilage abnormalities'
      }
    ],
    fieldOptions: new Map([
      ['medialMeniscus', ['Normal', 'Horizontal tear', 'Vertical tear', 'Complex tear', 'Radial tear', 'Root tear', 'Meniscectomy changes', 'Degeneration']],
      ['lateralMeniscus', ['Normal', 'Horizontal tear', 'Vertical tear', 'Complex tear', 'Radial tear', 'Root tear', 'Meniscectomy changes', 'Degeneration']],
      ['acl', ['Normal', 'Complete tear', 'Partial tear', 'Sprain', 'Mucoid degeneration', 'Reconstruction']],
      ['pcl', ['Normal', 'Complete tear', 'Partial tear', 'Sprain']],
      ['mcl', ['Normal', 'Grade 1 sprain', 'Grade 2 sprain', 'Grade 3 tear']],
      ['lcl', ['Normal', 'Grade 1 sprain', 'Grade 2 sprain', 'Grade 3 tear']],
      ['cartilage', ['Normal', 'Thinning', 'Fissuring', 'Full-thickness defect', 'Chondromalacia']],
      ['boneMarrow', ['Normal', 'Contusion', 'Stress reaction', 'Osteochondral defect', 'AVN']],
      ['jointEffusion', ['None', 'Small', 'Moderate', 'Large']]
    ]),
    diagramAnnotations: {
      enabled: true,
      diagramType: 'knee-sagittal',
      annotationTypes: ['meniscal-tear-marker', 'ligament-tear-marker', 'cartilage-defect', 'measurement']
    },
    aiIntegration: {
      enabled: true,
      autoFillFields: ['medialMeniscus', 'lateralMeniscus', 'acl', 'pcl'],
      suggestedFindings: ['meniscal tear', 'acl tear', 'cartilage defect', 'bone contusion', 'effusion']
    },
    priority: 90,
    active: true,
    isDefault: true
  }
];

async function seedEnhancedTemplates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-imaging');
    console.log('✅ Connected to MongoDB');

    let newCount = 0;
    let existingCount = 0;

    // Insert enhanced templates
    for (const templateData of enhancedTemplates) {
      const existing = await ReportTemplate.findOne({ templateId: templateData.templateId });
      
      if (existing) {
        console.log(`⏭️  Template ${templateData.templateId} already exists, skipping`);
        existingCount++;
        continue;
      }

      const template = new ReportTemplate(templateData);
      await template.save();
      console.log(`✅ Created template: ${template.name} (${template.templateId})`);
      newCount++;
    }

    console.log('\n🎉 Enhanced template seeding completed!');
    console.log(`📊 New templates added: ${newCount}`);
    console.log(`📊 Existing templates: ${existingCount}`);
    console.log(`📊 Total in seed file: ${enhancedTemplates.length}`);
    
    // Display summary
    const allTemplates = await ReportTemplate.find({ active: true }).sort({ priority: -1 });
    console.log('\n📋 All Active Templates (by priority):');
    allTemplates.forEach(t => {
      console.log(`   - ${t.name} (${t.category}) - Priority: ${t.priority}`);
      console.log(`     Modalities: ${t.matchingCriteria.modalities.join(', ')}`);
      console.log(`     Diagram support: ${t.diagramAnnotations?.enabled ? 'Yes' : 'No'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding enhanced templates:', error);
    process.exit(1);
  }
}

// Run seeding
if (require.main === module) {
  seedEnhancedTemplates();
}

module.exports = { enhancedTemplates, seedEnhancedTemplates };
