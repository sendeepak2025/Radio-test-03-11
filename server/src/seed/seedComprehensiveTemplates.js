/**
 * Comprehensive Radiology Report Templates
 * Covering entire radiology industry with specialized UI modules
 * Following current implementation pattern with proper body part mapping
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ReportTemplate = require('../models/ReportTemplate');

const comprehensiveTemplates = [
  // ============================================================
  // 1. CHEST/THORACIC IMAGING (4 templates)
  // ============================================================
  
  {
    templateId: 'XRAY-CHEST-01',
    name: 'Chest X-Ray (PA/Lateral)',
    description: 'Standard chest radiograph with cardiac, pulmonary, and bony thorax assessment',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CR', 'DX', 'XRAY'],
      bodyParts: ['CHEST', 'THORAX'],
      keywords: ['chest xray', 'cxr', 'chest radiograph'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    uiModules: [
      {
        id: 'chest_checklist',
        type: 'checklist',
        title: 'Systematic Review Checklist',
        order: 1,
        required: false,
        config: {
          items: ['Replace with proper array']
      },
      {
        id: 'chest_diagram',
        type: 'diagram',
        title: 'Chest Diagram - Finding Localization',
        order: 2,
        required: false,
        config: {
          bodyPart: 'chest',
          view: 'frontal',
          allowedTools: ['point', 'circle', 'arrow', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      {
        id: 'clinical_history',
        title: 'Clinical History',
        order: 1,
        required: true,
        content: ''
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: false,
        content: 'Frontal and lateral chest radiographs obtained.'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 3,
        required: true,
        content: 'Lungs:\nHeart:\nMediastinum:\nPleura:\nBones:\nSoft tissues:'
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 4,
        required: true,
        content: ''
      }
    ]
  },

  {
    templateId: 'CT-CHEST-NODULE-02',
    name: 'CT Chest - Lung Nodule Follow-up (Lung-RADS)',
    description: 'CT chest with Lung-RADS calculator for lung nodule assessment',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CT'],
      bodyParts: ['CHEST', 'THORAX', 'LUNG'],
      keywords: ['lung nodule', 'lung cancer screening', 'lung-rads'],
      procedureTypes: ['screening', 'follow-up']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    uiModules: [
      {
        id: 'lungrads_calculator',
        type: 'calculator',
        title: 'Lung-RADS Assessment',
        order: 1,
        required: true,
        config: {
          type: 'lungrads',
          title: 'Lung-RADS Category',
          criteria: [
            {
              id: 'nodule_size',
              label: 'Largest Nodule Size (mm)',
              type: 'number',
              min: 0,
              max: 100
            },
            {
              id: 'nodule_type',
              label: 'Nodule Type',
              type: 'select',
              options: [
                { value: 'solid', label: 'Solid' },
                { value: 'part_solid', label: 'Part-solid' },
                { value: 'ground_glass', label: 'Ground-glass' }
              ]
            },
            {
              id: 'growth', label: 'Growth compared to prior',
              type: 'select',
              options: [
                { value: 'none', label: 'No growth' },
                { value: 'slow', label: 'Slow growth (<1.5mm/year)' },
                { value: 'fast', label: 'Rapid growth (>1.5mm/year)' }
              ]
            }
          ],
          result: 'Lung-RADS Category: [1-4]'
        }
      },
      {
        id: 'nodule_measurements',
        type: 'measurements',
        title: 'Nodule Measurements',
        order: 2,
        required: false,
        config: {
          measurements: [
            { id: 'm1', label: 'Nodule 1 - Size', unit: 'mm', value: null },
            { id: 'm2', label: 'Nodule 1 - Solid component', unit: 'mm', value: null },
            { id: 'm3', label: 'Nodule 2 - Size', unit: 'mm', value: null }
          ]
        }
      },
      {
        id: 'chest_diagram_nodule',
        type: 'diagram',
        title: 'Lung Nodule Localization',
        order: 3,
        required: false,
        config: {
          bodyPart: 'chest',
          view: 'frontal',
          allowedTools: ['point', 'circle', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'Low-dose CT chest without contrast.' },
      { id: 'comparison', title: 'Comparison', order: 3, required: false, content: '' },
      { id: 'findings', title: 'Findings', order: 4, required: true, content: 'Nodules:\nLungs:\nMediastinum:\nPleura:' },
      { id: 'impression', title: 'Impression', order: 5, required: true, content: '' }
    ]
  },

  {
    templateId: 'CT-PE-01',
    name: 'CT Pulmonary Angiography (PE Protocol)',
    description: 'CTPA for pulmonary embolism evaluation',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CT', 'CTA'],
      bodyParts: ['CHEST', 'PULMONARY'],
      keywords: ['pulmonary embolism', 'pe', 'ctpa', 'pulmonary angiogram'],
      procedureTypes: ['diagnostic', 'interventional']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 10,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'pe_checklist',
        type: 'checklist',
        title: 'PE Assessment Checklist',
        order: 1,
        required: false,
        config: {
          items: ['Replace with proper array']
      },
      {
        id: 'chest_pe_diagram',
        type: 'diagram',
        title: 'PE Location Diagram',
        order: 2,
        required: false,
        config: {
          bodyPart: 'chest',
          view: 'frontal',
          allowedTools: ['point', 'arrow'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'CT pulmonary angiography with IV contrast.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Pulmonary Arteries:\nRV/LV ratio:\nSecondary findings:\nLungs:\nPleura:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  {
    templateId: 'CTA-CARDIAC-01',
    name: 'Coronary CT Angiography (CAD-RADS)',
    description: 'Cardiac CT with coronary artery assessment and CAD-RADS scoring',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CT', 'CTA'],
      bodyParts: ['HEART', 'CARDIAC', 'CORONARY'],
      keywords: ['coronary', 'cardiac ct', 'cta heart', 'coronary angiogram'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 10,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'cadrads_calculator',
        type: 'calculator',
        title: 'CAD-RADS Assessment',
        order: 1,
        required: true,
        config: {
          type: 'cadrads',
          title: 'CAD-RADS Category',
          criteria: [
            {
              id: 'max_stenosis',
              label: 'Maximum Stenosis (%)',
              type: 'select',
              options: [
                { value: 'zero', label: '0% - No plaque', score: 0 },
                { value: 'minimal', label: '1-24% - Minimal', score: 1 },
                { value: 'mild', label: '25-49% - Mild', score: 2 },
                { value: 'moderate', label: '50-69% - Moderate', score: 3 },
                { value: 'severe', label: '70-99% - Severe', score: 4 },
                { value: 'occluded', label: '100% - Occluded', score: 5 }
              ]
            },
            {
              id: 'plaque_type',
              label: 'Plaque Composition',
              type: 'select',
              options: [
                { value: 'none', label: 'No plaque' },
                { value: 'calcified', label: 'Calcified' },
                { value: 'non_calcified', label: 'Non-calcified' },
                { value: 'mixed', label: 'Mixed' }
              ]
            }
          ],
          result: 'CAD-RADS: [0-5]'
        }
      },
      {
        id: 'cardiac_measurements',
        type: 'measurements',
        title: 'Cardiac Measurements',
        order: 2,
        required: false,
        config: {
          measurements: [
            { id: 'calcium_score', label: 'Calcium Score (Agatston)', unit: '', value: null },
            { id: 'lad_stenosis', label: 'LAD - Max stenosis', unit: '%', value: null },
            { id: 'lcx_stenosis', label: 'LCx - Max stenosis', unit: '%', value: null },
            { id: 'rca_stenosis', label: 'RCA - Max stenosis', unit: '%', value: null }
          ]
        }
      },
      {
        id: 'heart_diagram',
        type: 'diagram',
        title: 'Coronary Artery Diagram',
        order: 3,
        required: false,
        config: {
          bodyPart: 'heart',
          view: 'anterior',
          allowedTools: ['point', 'arrow', 'circle'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'ECG-gated coronary CTA with IV contrast.' },
      { id: 'calcium_score', title: 'Calcium Score', order: 3, required: false, content: 'Agatston score:' },
      { id: 'findings', title: 'Findings', order: 4, required: true, content: 'Left Main:\nLAD:\nLCx:\nRCA:\nCardiac chambers:\nValves:' },
      { id: 'impression', title: 'Impression', order: 5, required: true, content: '' }
    ]
  },

  // ============================================================
  // 2. NEURO IMAGING (4 templates)
  // ============================================================

  {
    templateId: 'CT-HEAD-01',
    name: 'CT Head Non-Contrast',
    description: 'Non-contrast CT head for acute stroke, trauma, headache evaluation',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CT'],
      bodyParts: ['HEAD', 'BRAIN', 'SKULL'],
      keywords: ['ct head', 'ct brain', 'head ct'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    uiModules: [
      {
        id: 'neuro_checklist',
        type: 'checklist',
        title: 'Neuro Checklist',
        order: 1,
        required: false,
        config: {
          items: ['Replace with proper array']
      },
      {
        id: 'head_measurements',
        type: 'measurements',
        title: 'Measurements',
        order: 2,
        required: false,
        config: {
          measurements: [
            { id: 'midline_shift', label: 'Midline shift', unit: 'mm', value: null },
            { id: 'hematoma_size', label: 'Hematoma size (if present)', unit: 'cc', value: null }
          ]
        }
      },
      {
        id: 'brain_diagram',
        type: 'diagram',
        title: 'Brain Diagram',
        order: 3,
        required: false,
        config: {
          bodyPart: 'brain',
          view: 'axial',
          allowedTools: ['point', 'circle', 'arrow'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'Non-contrast CT head.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Brain parenchyma:\nVentricles:\nExtra-axial spaces:\nSkull base/calvarium:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  {
    templateId: 'CT-STROKE-01',
    name: 'CT Head Stroke Protocol (ASPECTS)',
    description: 'CT head with ASPECTS score for acute stroke evaluation',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CT', 'CTA'],
      bodyParts: ['HEAD', 'BRAIN', 'CEREBRAL'],
      keywords: ['stroke', 'aspects', 'cva', 'cerebral ischemia'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 40,
      bodyPartWeight: 40,
      keywordWeight: 20,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'aspects_calculator',
        type: 'calculator',
        title: 'ASPECTS Score',
        order: 1,
        required: true,
        config: {
          type: 'aspects',
          title: 'Alberta Stroke Program Early CT Score',
          description: 'Score 0-10; 10=normal, lower scores=more extensive early ischemic changes',
          criteria: [
            { id: 'caudate', label: 'Caudate', type: 'checkbox', checked: true },
            { id: 'lentiform', label: 'Lentiform nucleus', type: 'checkbox', checked: true },
            { id: 'internal_capsule', label: 'Internal capsule', type: 'checkbox', checked: true },
            { id: 'insula', label: 'Insular cortex', type: 'checkbox', checked: true },
            { id: 'm1', label: 'M1 (anterior MCA cortex)', type: 'checkbox', checked: true },
            { id: 'm2', label: 'M2 (MCA cortex lateral to insula)', type: 'checkbox', checked: true },
            { id: 'm3', label: 'M3 (posterior MCA cortex)', type: 'checkbox', checked: true },
            { id: 'm4', label: 'M4 (anterior MCA)', type: 'checkbox', checked: true },
            { id: 'm5', label: 'M5 (lateral MCA)', type: 'checkbox', checked: true },
            { id: 'm6', label: 'M6 (posterior MCA)', type: 'checkbox', checked: true }
          ],
          result: 'ASPECTS Score: [0-10]'
        }
      },
      {
        id: 'brain_stroke_diagram',
        type: 'diagram',
        title: 'Stroke Territory Diagram',
        order: 2,
        required: false,
        config: {
          bodyPart: 'brain',
          view: 'axial',
          allowedTools: ['circle', 'arrow', 'freehand'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: 'Time of symptom onset:\nNIHSS score:' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'Non-contrast CT head and CTA head/neck.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'ASPECTS score:\nVessel occlusion:\nHemorrhage:\nCollaterals:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  {
    templateId: 'MRI-BRAIN-01',
    name: 'MRI Brain Comprehensive',
    description: 'MRI brain with/without contrast for tumor, stroke, dementia evaluation',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['MR', 'MRI'],
      bodyParts: ['BRAIN', 'HEAD'],
      keywords: ['mri brain', 'brain mri', 'head mri'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    uiModules: [
      {
        id: 'brain_measurements',
        type: 'measurements',
        title: 'Brain Measurements',
        order: 1,
        required: false,
        config: {
          measurements: [
            { id: 'lesion_size', label: 'Lesion size (if present)', unit: 'mm', value: null },
            { id: 'ventricular', label: 'Ventricular size', unit: 'mm', value: null }
          ]
        }
      },
      {
        id: 'brain_checklist',
        type: 'checklist',
        title: 'MRI Brain Checklist',
        order: 2,
        required: false,
        config: {
          items: ['Replace with proper array']
      },
      {
        id: 'mri_brain_diagram',
        type: 'diagram',
        title: 'Brain MRI Findings Diagram',
        order: 3,
        required: false,
        config: {
          bodyPart: 'brain',
          view: 'axial',
          allowedTools: ['point', 'circle', 'arrow', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'MRI brain with multiplanar multisequence imaging.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Brain parenchyma:\nVentricles:\nExtra-axial spaces:\nVascular structures:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  // MRI Spine already exists in previous seed file, using same pattern

  // ============================================================
  // 3. ABDOMINAL IMAGING (5 templates)
  // ============================================================

  {
    templateId: 'CT-ABDOMEN-01',
    name: 'CT Abdomen/Pelvis with Contrast',
    description: 'Comprehensive CT abdomen and pelvis evaluation',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CT'],
      bodyParts: ['ABDOMEN', 'PELVIS', 'ABD'],
      keywords: ['ct abdomen', 'ct pelvis', 'ct abdomen pelvis'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    uiModules: [
      {
        id: 'abdomen_measurements',
        type: 'measurements',
        title: 'Measurements',
        order: 1,
        required: false,
        config: {
          measurements: [
            { id: 'liver_lesion', label: 'Liver lesion (if present)', unit: 'mm', value: null },
            { id: 'kidney_size', label: 'Kidney length', unit: 'cm', value: null },
            { id: 'lymph_node', label: 'Largest lymph node', unit: 'mm', value: null },
            { id: 'free_fluid', label: 'Free fluid - volume estimate', unit: 'mL', value: null }
          ]
        }
      },
      {
        id: 'abdomen_checklist',
        type: 'checklist',
        title: 'Systematic Review',
        order: 2,
        required: false,
        config: {
          items: ['Replace with proper array']
      },
      {
        id: 'abdomen_diagram',
        type: 'diagram',
        title: 'Abdomen Diagram',
        order: 3,
        required: false,
        config: {
          bodyPart: 'abdomen',
          view: 'anterior',
          allowedTools: ['point', 'circle', 'arrow', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'CT abdomen and pelvis with IV contrast.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Liver:\nGallbladder:\nPancreas:\nSpleen:\nKidneys:\nBowel:\nVessels:\nLymph nodes:\nPelvis:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  {
    templateId: 'CT-LIVER-LIRADS-01',
    name: 'CT Liver Multiphasic (LI-RADS)',
    description: 'Multiphasic liver CT with LI-RADS scoring for cirrhosis/HCC surveillance',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CT'],
      bodyParts: ['LIVER', 'ABDOMEN'],
      keywords: ['liver ct', 'lirads', 'hcc', 'cirrhosis', 'multiphasic'],
      procedureTypes: ['screening']
    },
    
    matchingWeights: {
      modalityWeight: 40,
      bodyPartWeight: 40,
      keywordWeight: 20,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'lirads_calculator',
        type: 'calculator',
        title: 'LI-RADS Assessment',
        order: 1,
        required: true,
        config: {
          type: 'lirads',
          title: 'LI-RADS Category',
          criteria: [
            {
              id: 'size',
              label: 'Lesion Size (mm)',
              type: 'number',
              min: 0,
              max: 200
            },
            {
              id: 'aphe',
              label: 'Arterial Phase Hyperenhancement (APHE)',
              type: 'select',
              options: [
                { value: 'yes', label: 'Yes - non-rim' },
                { value: 'rim', label: 'Yes - rim (peripheral)' },
                { value: 'no', label: 'No' }
              ]
            },
            {
              id: 'washout',
              label: 'Washout',
              type: 'select',
              options: [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' }
              ]
            },
            {
              id: 'capsule',
              label: 'Capsule Appearance',
              type: 'select',
              options: [
                { value: 'yes', label: 'Enhancing capsule' },
                { value: 'no', label: 'No capsule' }
              ]
            },
            {
              id: 'threshold_growth',
              label: 'Threshold Growth (>50% in <6 months)',
              type: 'select',
              options: [
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' }
              ]
            }
          ],
          result: 'LI-RADS: [LR-1 to LR-5, LR-M, LR-TIV]'
        }
      },
      {
        id: 'liver_measurements',
        type: 'measurements',
        title: 'Liver Lesion Measurements',
        order: 2,
        required: false,
        config: {
          measurements: [
            { id: 'lesion1', label: 'Lesion 1 - Size', unit: 'mm', value: null },
            { id: 'lesion2', label: 'Lesion 2 - Size', unit: 'mm', value: null },
            { id: 'lesion3', label: 'Lesion 3 - Size', unit: 'mm', value: null }
          ]
        }
      },
      {
        id: 'liver_diagram',
        type: 'diagram',
        title: 'Liver Segment Diagram',
        order: 3,
        required: false,
        config: {
          bodyPart: 'liver',
          view: 'anterior',
          allowedTools: ['point', 'circle', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: 'History of cirrhosis/HCC risk factors:' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'Multiphasic CT liver (non-contrast, arterial, portal venous, delayed phases).' },
      { id: 'comparison', title: 'Comparison', order: 3, required: false, content: '' },
      { id: 'findings', title: 'Findings', order: 4, required: true, content: 'Liver morphology:\nLesions (LI-RADS category):\nVascular patency:\nAscites:' },
      { id: 'impression', title: 'Impression', order: 5, required: true, content: '' }
    ]
  },

  {
    templateId: 'MRI-PROSTATE-PIRADS-01',
    name: 'MRI Prostate Multiparametric (PI-RADS)',
    description: 'Multiparametric prostate MRI with PI-RADS v2.1 scoring',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['MR', 'MRI'],
      bodyParts: ['PROSTATE', 'PELVIS'],
      keywords: ['prostate mri', 'pirads', 'mpmri', 'multiparametric'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 40,
      bodyPartWeight: 40,
      keywordWeight: 20,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'pirads_calculator',
        type: 'calculator',
        title: 'PI-RADS v2.1 Assessment',
        order: 1,
        required: true,
        config: {
          type: 'pirads',
          title: 'PI-RADS Score',
          criteria: [
            {
              id: 'zone',
              label: 'Lesion Location',
              type: 'select',
              options: [
                { value: 'pz', label: 'Peripheral Zone (PZ)' },
                { value: 'tz', label: 'Transition Zone (TZ)' },
                { value: 'afms', label: 'Anterior Fibromuscular Stroma' }
              ]
            },
            {
              id: 't2_score',
              label: 'T2-weighted Signal (1-5)',
              type: 'select',
              options: [
                { value: '1', label: '1 - Uniform hyperintense', score: 1 },
                { value: '2', label: '2 - Linear/wedge hypointense', score: 2 },
                { value: '3', label: '3 - Heterogeneous/obscured margins', score: 3 },
                { value: '4', label: '4 - Lenticular/circumscribed <1.5cm', score: 4 },
                { value: '5', label: '5 - Lesion ≥1.5cm or EPE', score: 5 }
              ]
            },
            {
              id: 'dwi_score',
              label: 'DWI/ADC Signal (1-5)',
              type: 'select',
              options: [
                { value: '1', label: '1 - No abnormality', score: 1 },
                { value: '2', label: '2 - Indistinct hypointense', score: 2 },
                { value: '3', label: '3 - Focal mildly/moderately hypointense', score: 3 },
                { value: '4', label: '4 - Focal marked hypointense <1.5cm', score: 4 },
                { value: '5', label: '5 - Lesion ≥1.5cm or EPE', score: 5 }
              ]
            },
            {
              id: 'dce',
              label: 'DCE (Dynamic Contrast)',
              type: 'select',
              options: [
                { value: 'negative', label: 'Negative (no early enhancement)' },
                { value: 'positive', label: 'Positive (focal early enhancement)' }
              ]
            }
          ],
          result: 'PI-RADS Score: [1-5]'
        }
      },
      {
        id: 'prostate_measurements',
        type: 'measurements',
        title: 'Prostate Measurements',
        order: 2,
        required: false,
        config: {
          measurements: [
            { id: 'lesion_size', label: 'Index lesion size', unit: 'mm', value: null },
            { id: 'prostate_vol', label: 'Prostate volume', unit: 'cc', value: null },
            { id: 'psa_density', label: 'PSA density (if known)', unit: 'ng/mL/cc', value: null }
          ]
        }
      },
      {
        id: 'prostate_diagram',
        type: 'diagram',
        title: 'Prostate Zone Diagram',
        order: 3,
        required: false,
        config: {
          bodyPart: 'prostate',
          view: 'axial',
          allowedTools: ['point', 'circle', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: 'PSA:\nPrior biopsy:' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'Multiparametric MRI prostate (T2, DWI/ADC, DCE).' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Prostate volume:\nIndex lesion PI-RADS score:\nExtraprostatic extension:\nSeminal vesicles:\nLymph nodes:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  {
    templateId: 'US-ABDOMEN-01',
    name: 'Ultrasound Abdomen Complete',
    description: 'Complete abdominal ultrasound including liver, gallbladder, pancreas, kidneys, spleen',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['US', 'ULTRASOUND'],
      bodyParts: ['ABDOMEN'],
      keywords: ['ultrasound abdomen', 'abdominal ultrasound', 'us abdomen'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    uiModules: [
      {
        id: 'us_abdomen_measurements',
        type: 'measurements',
        title: 'Organ Measurements',
        order: 1,
        required: false,
        config: {
          measurements: [
            { id: 'liver_span', label: 'Liver span', unit: 'cm', value: null },
            { id: 'cbd', label: 'Common bile duct', unit: 'mm', value: null },
            { id: 'right_kidney', label: 'Right kidney length', unit: 'cm', value: null },
            { id: 'left_kidney', label: 'Left kidney length', unit: 'cm', value: null },
            { id: 'spleen', label: 'Spleen length', unit: 'cm', value: null },
            { id: 'aorta', label: 'Aorta diameter', unit: 'mm', value: null }
          ]
        }
      },
      {
        id: 'us_abdomen_checklist',
        type: 'checklist',
        title: 'Organ Checklist',
        order: 2,
        required: false,
        config: {
          items: ['Replace with proper array']
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'Transabdominal ultrasound.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Liver:\nGallbladder:\nBile ducts:\nPancreas:\nSpleen:\nKidneys:\nAorta:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  {
    templateId: 'US-PELVIS-ORADS-01',
    name: 'Ultrasound Pelvis (O-RADS)',
    description: 'Pelvic ultrasound with O-RADS classification for adnexal masses',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['US', 'ULTRASOUND'],
      bodyParts: ['PELVIS', 'UTERUS', 'OVARY'],
      keywords: ['pelvic ultrasound', 'transvaginal', 'ovarian', 'orads'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 40,
      bodyPartWeight: 40,
      keywordWeight: 20,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'orads_calculator',
        type: 'calculator',
        title: 'O-RADS US Assessment',
        order: 1,
        required: true,
        config: {
          type: 'orads',
          title: 'O-RADS Classification',
          criteria: [
            {
              id: 'mass_type',
              label: 'Mass Characteristics',
              type: 'select',
              options: [
                { value: 'no_mass', label: 'No mass (O-RADS 0)' },
                { value: 'simple_cyst', label: 'Simple cyst <3cm (O-RADS 1)' },
                { value: 'simple_large', label: 'Simple cyst 3-10cm (O-RADS 2)' },
                { value: 'complex_low', label: 'Low risk features (O-RADS 3)' },
                { value: 'complex_int', label: 'Intermediate risk (O-RADS 4)' },
                { value: 'complex_high', label: 'High risk features (O-RADS 5)' }
              ]
            },
            {
              id: 'solid_component',
              label: 'Solid Component',
              type: 'select',
              options: [
                { value: 'none', label: 'No solid component' },
                { value: 'minimal', label: 'Minimal solid (<4mm)' },
                { value: 'moderate', label: 'Moderate solid (4-7mm)' },
                { value: 'extensive', label: 'Extensive solid (>7mm)' }
              ]
            },
            {
              id: 'vascularity',
              label: 'Color Doppler Vascularity',
              type: 'select',
              options: [
                { value: 'none', label: 'No flow' },
                { value: 'minimal', label: 'Minimal flow (score 1-2)' },
                { value: 'moderate', label: 'Moderate flow (score 3)' },
                { value: 'marked', label: 'Marked flow (score 4)' }
              ]
            }
          ],
          result: 'O-RADS: [0-5]'
        }
      },
      {
        id: 'pelvis_measurements',
        type: 'measurements',
        title: 'Pelvic Measurements',
        order: 2,
        required: false,
        config: {
          measurements: [
            { id: 'uterus_length', label: 'Uterus length', unit: 'cm', value: null },
            { id: 'endometrium', label: 'Endometrial thickness', unit: 'mm', value: null },
            { id: 'right_ovary', label: 'Right ovary volume', unit: 'cc', value: null },
            { id: 'left_ovary', label: 'Left ovary volume', unit: 'cc', value: null },
            { id: 'mass_size', label: 'Adnexal mass size (if present)', unit: 'cm', value: null }
          ]
        }
      },
      {
        id: 'pelvis_diagram',
        type: 'diagram',
        title: 'Pelvic Anatomy Diagram',
        order: 3,
        required: false,
        config: {
          bodyPart: 'pelvis',
          view: 'sagittal',
          allowedTools: ['point', 'circle', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: 'LMP:\nHRT/contraception:' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'Transvaginal and/or transabdominal ultrasound.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Uterus:\nEndometrium:\nRight ovary:\nLeft ovary:\nAdnexal mass (if present - O-RADS):' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  // ============================================================
  // 4. BREAST IMAGING (2 templates - Mammography already exists)
  // ============================================================

  {
    templateId: 'US-BREAST-01',
    name: 'Breast Ultrasound Targeted (BI-RADS)',
    description: 'Targeted breast ultrasound with BI-RADS assessment',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['US', 'ULTRASOUND'],
      bodyParts: ['BREAST'],
      keywords: ['breast ultrasound', 'breast us', 'birads ultrasound'],
      procedureTypes: ['diagnostic', 'screening']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 10,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'birads_us_calculator',
        type: 'calculator',
        title: 'BI-RADS US Assessment',
        order: 1,
        required: true,
        config: {
          type: 'birads',
          title: 'BI-RADS Category',
          criteria: [
            {
              id: 'mass_shape',
              label: 'Mass Shape',
              type: 'select',
              options: [
                { value: 'oval', label: 'Oval (benign)' },
                { value: 'round', label: 'Round' },
                { value: 'irregular', label: 'Irregular (suspicious)' }
              ]
            },
            {
              id: 'orientation',
              label: 'Orientation',
              type: 'select',
              options: [
                { value: 'parallel', label: 'Parallel (wider than tall)' },
                { value: 'not_parallel', label: 'Not parallel (taller than wide)' }
              ]
            },
            {
              id: 'margin',
              label: 'Margin',
              type: 'select',
              options: [
                { value: 'circumscribed', label: 'Circumscribed (benign)' },
                { value: 'indistinct', label: 'Indistinct' },
                { value: 'angular', label: 'Angular' },
                { value: 'microlobulated', label: 'Microlobulated' },
                { value: 'spiculated', label: 'Spiculated (suspicious)' }
              ]
            },
            {
              id: 'echo_pattern',
              label: 'Echo Pattern',
              type: 'select',
              options: [
                { value: 'anechoic', label: 'Anechoic (cyst)' },
                { value: 'hyperechoic', label: 'Hyperechoic' },
                { value: 'complex', label: 'Complex' },
                { value: 'hypoechoic', label: 'Hypoechoic' },
                { value: 'isoechoic', label: 'Isoechoic' }
              ]
            },
            {
              id: 'posterior',
              label: 'Posterior Features',
              type: 'select',
              options: [
                { value: 'none', label: 'No posterior features' },
                { value: 'enhancement', label: 'Enhancement (benign)' },
                { value: 'shadowing', label: 'Shadowing (suspicious)' },
                { value: 'combined', label: 'Combined pattern' }
              ]
            }
          ],
          result: 'BI-RADS US: [0-6]'
        }
      },
      {
        id: 'breast_us_measurements',
        type: 'measurements',
        title: 'Mass Measurements',
        order: 2,
        required: false,
        config: {
          measurements: [
            { id: 'ap', label: 'Anteroposterior (AP)', unit: 'mm', value: null },
            { id: 'transverse', label: 'Transverse (width)', unit: 'mm', value: null },
            { id: 'longitudinal', label: 'Longitudinal (length)', unit: 'mm', value: null }
          ]
        }
      },
      {
        id: 'breast_us_diagram',
        type: 'diagram',
        title: 'Breast Location Diagram',
        order: 3,
        required: false,
        config: {
          bodyPart: 'breast',
          view: 'bilateral',
          allowedTools: ['point', 'circle', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: 'Indication:' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'High-resolution breast ultrasound.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Mass location (clock position, distance from nipple):\nMass characteristics:\nAxillary lymph nodes:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  // ============================================================
  // 5. MUSCULOSKELETAL (3 templates)
  // ============================================================

  {
    templateId: 'XRAY-EXTREMITY-01',
    name: 'X-Ray Extremity (Trauma/Routine)',
    description: 'Standard extremity radiographs for trauma or routine evaluation',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CR', 'DX', 'XRAY'],
      bodyParts: ['HAND', 'WRIST', 'ELBOW', 'FOREARM', 'SHOULDER', 'FOOT', 'ANKLE', 'KNEE', 'FEMUR', 'TIBIA', 'FIBULA', 'HUMERUS'],
      keywords: ['xray', 'extremity', 'bone', 'fracture'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    uiModules: [
      {
        id: 'msk_checklist',
        type: 'checklist',
        title: 'MSK Checklist',
        order: 1,
        required: false,
        config: {
          items: ['Replace with proper array']
      },
      {
        id: 'extremity_diagram',
        type: 'diagram',
        title: 'Extremity Diagram',
        order: 2,
        required: false,
        config: {
          bodyPart: 'extremity',
          view: 'anterior',
          allowedTools: ['point', 'arrow', 'circle', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'Two views of the [body part].' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Alignment:\nBones:\nJoint spaces:\nSoft tissues:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  {
    templateId: 'MRI-KNEE-01',
    name: 'MRI Knee',
    description: 'MRI knee for meniscal, ligamentous, and cartilage evaluation',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['MR', 'MRI'],
      bodyParts: ['KNEE'],
      keywords: ['mri knee', 'knee mri'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    uiModules: [
      {
        id: 'knee_checklist',
        type: 'checklist',
        title: 'Knee Structures Checklist',
        order: 1,
        required: false,
        config: {
          items: ['Replace with proper array']
      },
      {
        id: 'knee_diagram',
        type: 'diagram',
        title: 'Knee Anatomy Diagram',
        order: 2,
        required: false,
        config: {
          bodyPart: 'knee',
          view: 'anterior',
          allowedTools: ['point', 'circle', 'arrow'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'MRI knee with multiplanar multisequence imaging.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Menisci:\nCruciate ligaments:\nCollateral ligaments:\nCartilage:\nBone marrow:\nJoint effusion:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  {
    templateId: 'MRI-SHOULDER-01',
    name: 'MRI Shoulder',
    description: 'MRI shoulder for rotator cuff and labral evaluation',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['MR', 'MRI'],
      bodyParts: ['SHOULDER'],
      keywords: ['mri shoulder', 'shoulder mri', 'rotator cuff'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    uiModules: [
      {
        id: 'shoulder_checklist',
        type: 'checklist',
        title: 'Shoulder Structures Checklist',
        order: 1,
        required: false,
        config: {
          items: ['Replace with proper array']
      },
      {
        id: 'shoulder_diagram',
        type: 'diagram',
        title: 'Shoulder Anatomy Diagram',
        order: 2,
        required: false,
        config: {
          bodyPart: 'shoulder',
          view: 'anterior',
          allowedTools: ['point', 'circle', 'arrow'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'MRI shoulder with multiplanar multisequence imaging.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Rotator cuff:\nLabrum:\nBiceps tendon:\nAC joint:\nBone marrow:\nJoint effusion:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  // ============================================================
  // 6. VASCULAR IMAGING (2 templates)
  // ============================================================

  {
    templateId: 'CTA-AORTA-01',
    name: 'CT Angiography Aorta',
    description: 'CTA for aortic aneurysm and dissection evaluation',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CT', 'CTA'],
      bodyParts: ['AORTA', 'CHEST', 'ABDOMEN'],
      keywords: ['aorta', 'aneurysm', 'dissection', 'cta aorta'],
      procedureTypes: ['diagnostic', 'interventional']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 10,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'aorta_measurements',
        type: 'measurements',
        title: 'Aortic Measurements',
        order: 1,
        required: true,
        config: {
          measurements: [
            { id: 'ascending', label: 'Ascending aorta', unit: 'mm', value: null },
            { id: 'arch', label: 'Aortic arch', unit: 'mm', value: null },
            { id: 'descending', label: 'Descending thoracic', unit: 'mm', value: null },
            { id: 'suprarenal', label: 'Suprarenal abdominal', unit: 'mm', value: null },
            { id: 'infrarenal', label: 'Infrarenal abdominal', unit: 'mm', value: null }
          ]
        }
      },
      {
        id: 'aorta_checklist',
        type: 'checklist',
        title: 'Aortic Assessment',
        order: 2,
        required: false,
        config: {
          items: ['Replace with proper array']
      },
      {
        id: 'aorta_diagram',
        type: 'diagram',
        title: 'Aortic Pathology Diagram',
        order: 3,
        required: false,
        config: {
          bodyPart: 'aorta',
          view: 'anterior',
          allowedTools: ['point', 'arrow', 'ruler', 'circle'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'CT angiography of the aorta with IV contrast.' },
      { id: 'comparison', title: 'Comparison', order: 3, required: false, content: '' },
      { id: 'findings', title: 'Findings', order: 4, required: true, content: 'Aortic dimensions:\nAneurysm/dissection:\nMural thrombus:\nBranch vessels:' },
      { id: 'impression', title: 'Impression', order: 5, required: true, content: '' }
    ]
  },

  {
    templateId: 'US-CAROTID-01',
    name: 'Carotid Doppler Ultrasound',
    description: 'Bilateral carotid artery ultrasound with stenosis grading',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['US', 'ULTRASOUND', 'DOPPLER'],
      bodyParts: ['NECK', 'CAROTID'],
      keywords: ['carotid', 'doppler', 'carotid ultrasound'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 10,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'carotid_measurements',
        type: 'measurements',
        title: 'Carotid Doppler Velocities',
        order: 1,
        required: true,
        config: {
          measurements: [
            { id: 'right_ica_psv', label: 'Right ICA Peak Systolic Velocity', unit: 'cm/s', value: null },
            { id: 'right_cca_psv', label: 'Right CCA Peak Systolic Velocity', unit: 'cm/s', value: null },
            { id: 'right_ratio', label: 'Right ICA/CCA ratio', unit: '', value: null },
            { id: 'left_ica_psv', label: 'Left ICA Peak Systolic Velocity', unit: 'cm/s', value: null },
            { id: 'left_cca_psv', label: 'Left CCA Peak Systolic Velocity', unit: 'cm/s', value: null },
            { id: 'left_ratio', label: 'Left ICA/CCA ratio', unit: '', value: null }
          ]
        }
      },
      {
        id: 'carotid_calculator',
        type: 'calculator',
        title: 'Stenosis Grading',
        order: 2,
        required: false,
        config: {
          type: 'stenosis',
          title: 'Carotid Stenosis Category',
          criteria: [
            {
              id: 'ica_psv',
              label: 'ICA Peak Systolic Velocity',
              type: 'number',
              unit: 'cm/s'
            },
            {
              id: 'ica_cca_ratio',
              label: 'ICA/CCA Ratio',
              type: 'number'
            }
          ],
          result: 'Stenosis: [<50%, 50-69%, 70-99%, Occluded]'
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'Bilateral carotid duplex ultrasound.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Right carotid:\nLeft carotid:\nPlaque characterization:\nVertebral arteries:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  // ============================================================
  // 7. SPECIALIZED (2 templates)
  // ============================================================

  {
    templateId: 'US-THYROID-TIRADS-01',
    name: 'Thyroid Ultrasound (TI-RADS)',
    description: 'Thyroid ultrasound with ACR TI-RADS classification',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['US', 'ULTRASOUND'],
      bodyParts: ['THYROID', 'NECK'],
      keywords: ['thyroid', 'tirads', 'thyroid ultrasound'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 10,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'tirads_calculator',
        type: 'calculator',
        title: 'ACR TI-RADS Assessment',
        order: 1,
        required: true,
        config: {
          type: 'tirads',
          title: 'TI-RADS Score',
          criteria: [
            {
              id: 'composition',
              label: 'Composition',
              type: 'select',
              options: [
                { value: 'cystic', label: 'Cystic/almost completely cystic (0 points)', score: 0 },
                { value: 'spongiform', label: 'Spongiform (0 points)', score: 0 },
                { value: 'mixed', label: 'Mixed cystic and solid (1 point)', score: 1 },
                { value: 'solid', label: 'Solid or almost completely solid (2 points)', score: 2 }
              ]
            },
            {
              id: 'echogenicity',
              label: 'Echogenicity',
              type: 'select',
              options: [
                { value: 'anechoic', label: 'Anechoic (0 points)', score: 0 },
                { value: 'hyper_iso', label: 'Hyperechoic or isoechoic (1 point)', score: 1 },
                { value: 'hypo', label: 'Hypoechoic (2 points)', score: 2 },
                { value: 'very_hypo', label: 'Very hypoechoic (3 points)', score: 3 }
              ]
            },
            {
              id: 'shape',
              label: 'Shape',
              type: 'select',
              options: [
                { value: 'wider', label: 'Wider-than-tall (0 points)', score: 0 },
                { value: 'taller', label: 'Taller-than-wide (3 points)', score: 3 }
              ]
            },
            {
              id: 'margin',
              label: 'Margin',
              type: 'select',
              options: [
                { value: 'smooth', label: 'Smooth (0 points)', score: 0 },
                { value: 'ill_defined', label: 'Ill-defined (0 points)', score: 0 },
                { value: 'lobulated', label: 'Lobulated or irregular (2 points)', score: 2 },
                { value: 'extra_extension', label: 'Extra-thyroidal extension (3 points)', score: 3 }
              ]
            },
            {
              id: 'foci',
              label: 'Echogenic Foci',
              type: 'select',
              options: [
                { value: 'none', label: 'None or large comet-tail (0 points)', score: 0 },
                { value: 'macrocalc', label: 'Macrocalcifications (1 point)', score: 1 },
                { value: 'rim', label: 'Peripheral (rim) calcifications (2 points)', score: 2 },
                { value: 'microCalc', label: 'Punctate echogenic foci (3 points)', score: 3 }
              ]
            }
          ],
          result: 'TI-RADS: [TR1-TR5] Total Points: [0-14+]'
        }
      },
      {
        id: 'thyroid_measurements',
        type: 'measurements',
        title: 'Thyroid Nodule Measurements',
        order: 2,
        required: false,
        config: {
          measurements: [
            { id: 'nodule_ap', label: 'Nodule AP dimension', unit: 'mm', value: null },
            { id: 'nodule_trans', label: 'Nodule transverse', unit: 'mm', value: null },
            { id: 'nodule_long', label: 'Nodule longitudinal', unit: 'mm', value: null },
            { id: 'thyroid_volume', label: 'Thyroid gland volume', unit: 'mL', value: null }
          ]
        }
      },
      {
        id: 'thyroid_diagram',
        type: 'diagram',
        title: 'Thyroid Nodule Location',
        order: 3,
        required: false,
        config: {
          bodyPart: 'thyroid',
          view: 'anterior',
          allowedTools: ['point', 'circle', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: '' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'High-resolution thyroid ultrasound.' },
      { id: 'findings', title: 'Findings', order: 3, required: true, content: 'Thyroid gland:\nNodule description (TI-RADS):\nCervical lymph nodes:' },
      { id: 'impression', title: 'Impression', order: 4, required: true, content: '' }
    ]
  },

  {
    templateId: 'PET-CT-ONCOLOGY-01',
    name: 'PET/CT FDG Whole Body',
    description: 'FDG PET/CT for oncologic staging and treatment response',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['PT', 'PET', 'PET-CT'],
      bodyParts: ['WHOLE BODY', 'WB'],
      keywords: ['pet', 'fdg', 'pet ct', 'oncology'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 30,
      keywordWeight: 20,
      procedureTypeWeight: 0
    },
    
    uiModules: [
      {
        id: 'pet_measurements',
        type: 'measurements',
        title: 'SUV Measurements',
        order: 1,
        required: false,
        config: {
          measurements: [
            { id: 'primary_suv', label: 'Primary tumor SUVmax', unit: '', value: null },
            { id: 'primary_size', label: 'Primary tumor size', unit: 'mm', value: null },
            { id: 'node_suv', label: 'Highest nodal SUVmax', unit: '', value: null },
            { id: 'met_suv', label: 'Metastasis SUVmax (if present)', unit: '', value: null }
          ]
        }
      },
      {
        id: 'pet_checklist',
        type: 'checklist',
        title: 'Disease Distribution',
        order: 2,
        required: false,
        config: {
          items: ['Replace with proper array']
      }
    ],
    
    sections: [
      { id: 'clinical_history', title: 'Clinical History', order: 1, required: true, content: 'Cancer type:\nStaging vs restaging:' },
      { id: 'technique', title: 'Technique', order: 2, required: false, content: 'FDG PET/CT from skull base to mid-thighs.' },
      { id: 'comparison', title: 'Comparison', order: 3, required: false, content: '' },
      { id: 'findings', title: 'Findings', order: 4, required: true, content: 'Primary tumor:\nLymph nodes:\nDistant metastases:\nOther findings:' },
      { id: 'impression', title: 'Impression', order: 5, required: true, content: '' }
    ]
  }
];

// Seeding function
async function seedComprehensiveTemplates() {
  try {
    console.log('🌱 Seeding comprehensive radiology templates...');
    
    // Ensure indexes
    await ReportTemplate.collection.createIndex({ templateId: 1 }, { unique: true });
    await ReportTemplate.collection.createIndex({ name: 1 });
    await ReportTemplate.collection.createIndex({ 'matchingCriteria.modalities': 1 });
    await ReportTemplate.collection.createIndex({ 'matchingCriteria.bodyParts': 1 });
    console.log('✅ Report indexes ensured');
    
    let created = 0;
    let updated = 0;
    
    for (const template of comprehensiveTemplates) {
      const existing = await ReportTemplate.findOne({ templateId: template.templateId });
      
      if (existing) {
        // Update existing template
        await ReportTemplate.updateOne(
          { templateId: template.templateId },
          { $set: template }
        );
        console.log(`✅ Updated template: ${template.name}`);
        updated++;
      } else {
        // Create new template
        await ReportTemplate.create(template);
        console.log(`✅ Created template: ${template.name}`);
        created++;
      }
    }
    
    console.log('\n✅ Comprehensive templates seeded successfully!');
    console.log(`📊 Summary: ${created} created, ${updated} updated`);
    console.log(`📊 Total templates: ${comprehensiveTemplates.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding comprehensive templates:', error);
    throw error;
  }
}

module.exports = { seedComprehensiveTemplates, comprehensiveTemplates };

