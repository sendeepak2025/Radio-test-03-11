/**
 * Seed Enhanced Report Templates with UI Modules
 * Demonstrates specialized templates for different modalities
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ReportTemplate = require('../models/ReportTemplate');

const enhancedTemplates = [
  {
    templateId: 'MAMMO-BIRADS-01',
    name: 'Mammography BI-RADS Assessment',
    description: 'Comprehensive mammography report with BI-RADS calculator and measurement tools',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['MG', 'MAMMO'],
      bodyParts: ['BREAST'],
      keywords: ['mammography', 'breast', 'screening', 'diagnostic'],
      procedureTypes: ['screening', 'diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 50,
      bodyPartWeight: 40,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    // UI Modules for specialized interaction
    uiModules: [
      {
        id: 'birads_calculator',
        type: 'calculator',
        title: 'BI-RADS Assessment',
        order: 1,
        required: true,
        config: {
          type: 'birads',
          title: 'BI-RADS Calculator',
          criteria: [
            {
              id: 'mass',
              label: 'Mass Characteristics',
              options: [
                { value: 'none', label: 'No mass', score: 0 },
                { value: 'round', label: 'Round/Oval, circumscribed', score: 1 },
                { value: 'irregular', label: 'Irregular shape', score: 2 },
                { value: 'spiculated', label: 'Spiculated margins', score: 3 }
              ]
            },
            {
              id: 'calcifications',
              label: 'Calcifications',
              options: [
                { value: 'none', label: 'No calcifications', score: 0 },
                { value: 'benign', label: 'Benign (coarse, popcorn)', score: 1 },
                { value: 'suspicious', label: 'Suspicious (fine, pleomorphic)', score: 3 }
              ]
            },
            {
              id: 'asymmetry',
              label: 'Architectural Distortion/Asymmetry',
              options: [
                { value: 'none', label: 'None', score: 0 },
                { value: 'asymmetry', label: 'Asymmetry', score: 1 },
                { value: 'distortion', label: 'Architectural distortion', score: 2 }
              ]
            }
          ]
        }
      },
      {
        id: 'breast_measurements',
        type: 'measurements',
        title: 'Lesion Measurements',
        order: 2,
        required: false,
        config: {
          defaultUnit: 'mm',
          allowedUnits: ['mm', 'cm'],
          predefinedLabels: ['Mass AP', 'Mass Transverse', 'Mass CC', 'Distance from nipple', 'Depth from skin'],
          maxMeasurements: 8
        }
      },
      {
        id: 'breast_diagram',
        type: 'diagram',
        title: 'Breast Lesion Localization',
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
      {
        id: 'technique',
        title: 'Technique',
        order: 1,
        required: true,
        defaultContent: 'Standard two-view mammography (CC and MLO) performed.',
        placeholder: 'Describe imaging technique...',
        validationRules: { minLength: 10 }
      },
      {
        id: 'breast_composition',
        title: 'Breast Composition',
        order: 2,
        required: true,
        placeholder: 'Select breast density (A, B, C, or D)',
        validationRules: { required: true }
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 3,
        required: true,
        placeholder: 'Detailed findings from both breasts...',
        validationRules: { minLength: 20 }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 4,
        required: true,
        placeholder: 'Final assessment and BI-RADS category...',
        validationRules: { required: true, minLength: 10 }
      },
      {
        id: 'recommendations',
        title: 'Recommendations',
        order: 5,
        required: true,
        placeholder: 'Follow-up recommendations based on BI-RADS...',
        validationRules: { required: true }
      }
    ],
    
    aiIntegration: {
      enabled: true,
      autoFillFields: ['findings'],
      suggestedFindings: ['mass', 'calcifications', 'asymmetry', 'architectural distortion']
    },
    
    priority: 10,
    active: true
  },
  
  {
    templateId: 'MRI-SPINE-01',
    name: 'MRI Spine - Comprehensive Assessment',
    description: 'Detailed spine MRI report with vertebral level checklist and measurement tools',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['MR', 'MRI'],
      bodyParts: ['SPINE', 'C-SPINE', 'T-SPINE', 'L-SPINE', 'LUMBAR', 'CERVICAL', 'THORACIC'],
      keywords: ['spine', 'vertebra', 'disc', 'spinal', 'cord'],
      procedureTypes: ['diagnostic']
    },
    
    matchingWeights: {
      modalityWeight: 45,
      bodyPartWeight: 45,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    
    uiModules: [
      {
        id: 'spine_checklist',
        type: 'checklist',
        title: 'Vertebral Level Assessment',
        order: 1,
        required: true,
        config: {
          items: ['L1', 'L2', 'L3', 'L4', 'L5', 'S1'],
          title: 'Lumbar Spine Assessment',
          statusOptions: ['Normal', 'Degenerative', 'Disc Herniation', 'Stenosis', 'Spondylolisthesis', 'Not Visualized'],
          columns: ['Level', 'Status', 'Findings'],
          type: 'spine'
        }
      },
      {
        id: 'disc_measurements',
        type: 'measurements',
        title: 'Disc and Canal Measurements',
        order: 2,
        required: false,
        config: {
          defaultUnit: 'mm',
          allowedUnits: ['mm', 'cm'],
          predefinedLabels: ['Disc Height', 'Canal AP Diameter', 'Foraminal Width', 'Herniation Size', 'Cord AP Diameter'],
          maxMeasurements: 10
        }
      },
      {
        id: 'spine_diagram',
        type: 'diagram',
        title: 'Spine Diagram - Pathology Localization',
        order: 3,
        required: false,
        config: {
          bodyPart: 'spine',
          view: 'lateral',
          allowedTools: ['point', 'arrow', 'circle', 'ruler'],
          width: 400,
          height: 300
        }
      }
    ],
    
    sections: [
      {
        id: 'clinical_indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical history and indication...',
        validationRules: { minLength: 10 }
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'MRI of the lumbar spine without contrast using standard protocols including sagittal T1, T2, and axial T2 sequences.',
        placeholder: 'MRI protocol and sequences...',
        validationRules: { minLength: 20 }
      },
      {
        id: 'alignment',
        title: 'Alignment',
        order: 3,
        required: false,
        placeholder: 'Spinal alignment and curvature...'
      },
      {
        id: 'findings',
        title: 'Detailed Findings',
        order: 4,
        required: true,
        placeholder: 'Level-by-level findings...',
        validationRules: { minLength: 30 }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary of key findings...',
        validationRules: { required: true, minLength: 15 }
      }
    ],
    
    aiIntegration: {
      enabled: true,
      autoFillFields: ['findings', 'alignment'],
      suggestedFindings: ['disc herniation', 'stenosis', 'degenerative changes', 'spondylolisthesis', 'facet arthropathy']
    },
    
    priority: 9,
    active: true
  },
  
  {
    templateId: 'CT-CHEST-01',
    name: 'CT Chest - Lung Nodule Assessment',
    description: 'CT chest report with nodule measurements and Lung-RADS scoring',
    category: 'radiology',
    
    matchingCriteria: {
      modalities: ['CT'],
      bodyParts: ['CHEST', 'THORAX', 'LUNG'],
      keywords: ['chest', 'lung', 'thorax', 'nodule', 'pulmonary'],
      procedureTypes: ['screening', 'diagnostic']
    },
    
    uiModules: [
      {
        id: 'nodule_measurements',
        type: 'measurements',
        title: 'Pulmonary Nodule Measurements',
        order: 1,
        required: false,
        config: {
          defaultUnit: 'mm',
          allowedUnits: ['mm', 'cm'],
          predefinedLabels: ['Nodule Diameter', 'Nodule Volume', 'Distance from Pleura', 'RUL', 'RML', 'RLL', 'LUL', 'LLL'],
          maxMeasurements: 12
        }
      },
      {
        id: 'chest_diagram',
        type: 'diagram',
        title: 'Chest Diagram - Nodule Localization',
        order: 2,
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
      {
        id: 'indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Clinical history...',
        validationRules: { minLength: 10 }
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'CT chest without contrast using lung and mediastinal windows.',
        placeholder: 'CT protocol...'
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior studies for comparison...'
      },
      {
        id: 'lungs',
        title: 'Lungs',
        order: 4,
        required: true,
        placeholder: 'Lung parenchyma findings...',
        validationRules: { minLength: 20 }
      },
      {
        id: 'mediastinum',
        title: 'Mediastinum',
        order: 5,
        required: true,
        placeholder: 'Mediastinal structures...'
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 6,
        required: true,
        placeholder: 'Summary and assessment...',
        validationRules: { required: true, minLength: 10 }
      }
    ],
    
    aiIntegration: {
      enabled: true,
      autoFillFields: ['lungs', 'findings'],
      suggestedFindings: ['pulmonary nodule', 'ground glass opacity', 'consolidation', 'pleural effusion', 'lymphadenopathy']
    },
    
    priority: 8,
    active: true
  }
];

async function seedEnhancedTemplatesWithModules() {
  try {
    console.log('🌱 Seeding enhanced report templates with UI modules...');
    
    for (const templateData of enhancedTemplates) {
      const existing = await ReportTemplate.findOne({ templateId: templateData.templateId });
      
      if (existing) {
        // Update existing template
        await ReportTemplate.findOneAndUpdate(
          { templateId: templateData.templateId },
          templateData,
          { new: true }
        );
        console.log(`✅ Updated template: ${templateData.name}`);
      } else {
        // Create new template
        await ReportTemplate.create(templateData);
        console.log(`✅ Created template: ${templateData.name}`);
      }
    }
    
    console.log('✅ Enhanced templates seeded successfully!');
    console.log(`📊 Total templates: ${enhancedTemplates.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding enhanced templates:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/radiology';
  
  mongoose.connect(dbUrl)
    .then(() => {
      console.log('📊 Connected to MongoDB');
      return seedEnhancedTemplatesWithModules();
    })
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}

module.exports = { seedEnhancedTemplatesWithModules, enhancedTemplates };
