/**
 * Seed Default Report Templates
 * Creates 5 common medical report templates
 */

const mongoose = require('mongoose');
const ReportTemplate = require('../models/ReportTemplate');
require('dotenv').config();

const defaultTemplates = [
  {
    templateId: 'TPL-CORONARY-ANGIO-001',
    name: 'Coronary Angiography Report',
    description: 'Standard template for coronary angiography procedures',
    category: 'cardiology',
    matchingCriteria: {
      modalities: ['XA', 'RF'],
      bodyParts: ['HEART', 'CHEST', 'CARDIAC'],
      keywords: ['coronary', 'angiography', 'cardiac cath', 'catheterization', 'pci', 'stent'],
      procedureTypes: ['diagnostic', 'interventional']
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
        placeholder: 'Reason for procedure (e.g., chest pain, abnormal stress test)'
      },
      {
        id: 'procedure-details',
        title: 'Procedure Details',
        order: 2,
        required: true,
        placeholder: 'Access site, contrast used, fluoroscopy time'
      },
      {
        id: 'vessel-assessment',
        title: 'Vessel Assessment',
        order: 3,
        required: true,
        placeholder: 'Detailed assessment of coronary vessels'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        placeholder: 'Detailed findings from angiography'
      },
      {
        id: 'stenosis-grading',
        title: 'Stenosis Grading',
        order: 5,
        required: false,
        placeholder: 'Percentage stenosis for each vessel'
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 6,
        required: true,
        placeholder: 'Summary and clinical significance'
      },
      {
        id: 'recommendations',
        title: 'Recommendations',
        order: 7,
        required: true,
        placeholder: 'Follow-up recommendations and treatment plan'
      }
    ],
    fields: new Map([
      ['vessels', ['Left Main (LM)', 'Left Anterior Descending (LAD)', 'Left Circumflex (LCX)', 'Right Coronary Artery (RCA)']],
      ['accessSite', ['Right Radial', 'Left Radial', 'Right Femoral', 'Left Femoral']],
      ['contrast', ['Iohexol', 'Iopamidol', 'Iodixanol', 'Ioversol']]
    ]),
    fieldOptions: new Map([
      ['stenosisGrade', ['Normal (0%)', 'Minimal (<25%)', 'Mild (25-49%)', 'Moderate (50-69%)', 'Severe (70-99%)', 'Total Occlusion (100%)']],
      ['timiFlow', ['TIMI 0 (No flow)', 'TIMI 1 (Penetration without perfusion)', 'TIMI 2 (Partial perfusion)', 'TIMI 3 (Complete perfusion)']],
      ['intervention', ['None', 'Balloon Angioplasty', 'Stent Placement', 'Drug-Eluting Stent', 'Bare Metal Stent', 'Atherectomy']]
    ]),
    aiIntegration: {
      enabled: true,
      autoFillFields: ['vessels', 'stenosisGrade', 'timiFlow'],
      suggestedFindings: ['stenosis', 'occlusion', 'calcification', 'dissection', 'thrombus']
    },
    priority: 100,
    active: true,
    isDefault: true
  },

  {
    templateId: 'TPL-CHEST-XRAY-001',
    name: 'Chest X-Ray Report (Enhanced)',
    description: 'Comprehensive structured template for chest radiography with systematic review',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['CR', 'DX', 'RF'],
      bodyParts: ['CHEST', 'THORAX', 'LUNG'],
      keywords: ['chest', 'thorax', 'cxr', 'chest x-ray', 'chest radiograph', 'portable chest'],
      procedureTypes: ['diagnostic', 'screening', 'follow-up']
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
        placeholder: 'Clinical indication for chest radiography (e.g., cough, shortness of breath, chest pain, post-procedure follow-up)'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        defaultContent: 'PA and lateral views of the chest. Adequate inspiration and penetration.',
        placeholder: 'Views obtained (PA/lateral, AP portable, etc.) and technical quality',
        validationRules: {
          requireViewDocumentation: true,
          minimumViews: 1
        }
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior chest radiograph dated [DATE] available for comparison. No prior studies available for comparison.',
        defaultContent: 'No prior studies available for comparison.'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        defaultContent: `LUNGS AND AIRWAYS:
The lungs are clear bilaterally. No focal consolidation, pleural effusion, or pneumothorax.

HEART AND MEDIASTINUM:
Cardiomediastinal silhouette is normal in size and contour. No mediastinal widening.

PLEURA:
No pleural effusion or pneumothorax.

BONES AND SOFT TISSUES:
Visualized osseous structures are intact. No acute fracture or destructive lesion. Soft tissues are unremarkable.

LINES AND TUBES:
[If applicable] None. / [Describe position and placement]

ADDITIONAL FINDINGS:
None.`,
        placeholder: 'Systematic review of all anatomic structures',
        validationRules: {
          minimumFindings: ['lungs', 'heart', 'mediastinum'],
          requireSystemicReview: true
        }
      },
      {
        id: 'impression',
        title: 'Impression',
        order: 5,
        required: true,
        placeholder: 'Summary and clinical significance (e.g., 1. No acute cardiopulmonary process. 2. Clear lungs.)',
        defaultContent: '1. No acute cardiopulmonary process.'
      },
      {
        id: 'recommendations',
        title: 'Recommendations',
        order: 6,
        required: false,
        placeholder: 'Follow-up recommendations if needed (e.g., Follow-up chest CT recommended for further evaluation of nodule.)'
      }
    ],
    fieldOptions: new Map([
      ['lungFields', [
        'Clear',
        'Hyperinflated',
        'Infiltrate',
        'Consolidation - RUL',
        'Consolidation - RML',
        'Consolidation - RLL',
        'Consolidation - LUL',
        'Consolidation - Lingula',
        'Consolidation - LLL',
        'Ground-glass opacity',
        'Reticular pattern',
        'Reticulonodular pattern',
        'Nodule',
        'Mass',
        'Cavitation',
        'Atelectasis',
        'Volume loss',
        'Scarring'
      ]],
      ['heartSize', [
        'Normal (CTR <50%)',
        'Borderline (CTR ~50%)',
        'Enlarged (CTR >50%)',
        'Mild cardiomegaly',
        'Moderate cardiomegaly',
        'Severe cardiomegaly'
      ]],
      ['mediastinum', [
        'Normal',
        'Widened - superior',
        'Widened - middle',
        'Mass',
        'Lymphadenopathy',
        'Hilar enlargement - right',
        'Hilar enlargement - left',
        'Hilar enlargement - bilateral'
      ]],
      ['pleura', [
        'Normal',
        'Effusion - right small',
        'Effusion - right moderate',
        'Effusion - right large',
        'Effusion - left small',
        'Effusion - left moderate',
        'Effusion - left large',
        'Effusion - bilateral',
        'Pneumothorax - right small',
        'Pneumothorax - right moderate',
        'Pneumothorax - right large/tension',
        'Pneumothorax - left small',
        'Pneumothorax - left moderate',
        'Pneumothorax - left large/tension',
        'Pleural thickening',
        'Pleural calcification',
        'Pleural mass'
      ]],
      ['airways', [
        'Normal',
        'Tracheal deviation - right',
        'Tracheal deviation - left',
        'Bronchial wall thickening',
        'Bronchiectasis'
      ]],
      ['bones', [
        'Normal',
        'Degenerative changes - thoracic spine',
        'Degenerative changes - shoulders',
        'Rib fracture - acute',
        'Rib fracture - healing',
        'Rib fracture - old',
        'Lytic lesion',
        'Sclerotic lesion',
        'Compression fracture',
        'Scoliosis',
        'Kyphosis'
      ]],
      ['softTissues', [
        'Normal',
        'Subcutaneous emphysema',
        'Soft tissue mass',
        'Breast shadow - normal',
        'Mastectomy - right',
        'Mastectomy - left',
        'Gynecomastia'
      ]],
      ['linesAndTubes', [
        'None',
        'NGT - appropriate position',
        'NGT - malpositioned',
        'ETT - appropriate position',
        'ETT - too high',
        'ETT - too low',
        'Central line - right IJ',
        'Central line - left IJ',
        'Central line - right subclavian',
        'Central line - left subclavian',
        'Chest tube - right',
        'Chest tube - left',
        'Pacemaker/ICD - left',
        'Pacemaker/ICD - right',
        'Port-a-cath',
        'Swan-Ganz catheter'
      ]],
      ['technicalQuality', [
        'Adequate',
        'Suboptimal - rotation',
        'Suboptimal - low inspiration',
        'Suboptimal - underpenetrated',
        'Suboptimal - overpenetrated',
        'Suboptimal - motion artifact',
        'Limited - portable technique',
        'Limited - patient factors'
      ]],
      ['views', [
        'PA and lateral',
        'PA only',
        'AP portable',
        'AP and lateral',
        'Lateral only',
        'Lordotic view',
        'Expiratory view',
        'Decubitus - right',
        'Decubitus - left'
      ]]
    ]),
    aiIntegration: {
      enabled: true,
      autoFillFields: ['lungFields', 'heartSize', 'mediastinum', 'pleura', 'technicalQuality'],
      suggestedFindings: [
        'infiltrate', 'consolidation', 'effusion', 'pneumothorax', 'cardiomegaly',
        'atelectasis', 'nodule', 'mass', 'hyperinflation', 'edema',
        'fracture', 'line position', 'tube position'
      ]
    },
    priority: 95,
    active: true,
    isDefault: true,
    version: '2.0',
    customizable: true
  },

  {
    templateId: 'TPL-BRAIN-MRI-001',
    name: 'Brain MRI Report',
    description: 'Standard template for brain MRI studies',
    category: 'neurology',
    matchingCriteria: {
      modalities: ['MR', 'MRI'],
      bodyParts: ['BRAIN', 'HEAD', 'SKULL'],
      keywords: ['brain', 'head', 'mri', 'cerebral', 'intracranial'],
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
        placeholder: 'Reason for examination'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        placeholder: 'Sequences performed, contrast administration'
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior studies for comparison'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        placeholder: 'Detailed findings by anatomical region'
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
      ['grayMatter', ['Normal', 'Atrophy', 'Lesion', 'Infarct', 'Hemorrhage']],
      ['whiteMatter', ['Normal', 'Hyperintensities', 'Demyelination', 'Infarct']],
      ['ventricles', ['Normal', 'Enlarged', 'Hydrocephalus', 'Asymmetric']],
      ['vessels', ['Normal', 'Aneurysm', 'Stenosis', 'Occlusion', 'AVM']],
      ['extraAxial', ['Normal', 'Subdural', 'Epidural', 'Subarachnoid hemorrhage', 'Hygroma']]
    ]),
    aiIntegration: {
      enabled: true,
      autoFillFields: ['grayMatter', 'whiteMatter', 'ventricles'],
      suggestedFindings: ['infarct', 'hemorrhage', 'mass', 'atrophy', 'lesion']
    },
    priority: 85,
    active: true,
    isDefault: true
  },

  {
    templateId: 'TPL-CT-ABDOMEN-001',
    name: 'CT Abdomen/Pelvis Report',
    description: 'Standard template for abdominal CT studies',
    category: 'radiology',
    matchingCriteria: {
      modalities: ['CT'],
      bodyParts: ['ABDOMEN', 'PELVIS', 'ABD', 'ABDOMINAL'],
      keywords: ['abdomen', 'pelvis', 'abdominal', 'ct abdomen', 'ct pelvis'],
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
        placeholder: 'Reason for examination'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        placeholder: 'Contrast phases, slice thickness'
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior studies for comparison'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        placeholder: 'Organ-by-organ assessment'
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
      ['liver', ['Normal', 'Fatty infiltration', 'Cirrhosis', 'Mass', 'Cyst', 'Hemangioma']],
      ['gallbladder', ['Normal', 'Stones', 'Wall thickening', 'Distended', 'Absent']],
      ['pancreas', ['Normal', 'Pancreatitis', 'Mass', 'Atrophy', 'Calcifications']],
      ['spleen', ['Normal', 'Enlarged', 'Atrophic', 'Mass', 'Infarct']],
      ['kidneys', ['Normal', 'Stones', 'Hydronephrosis', 'Mass', 'Cyst', 'Atrophy']],
      ['bowel', ['Normal', 'Obstruction', 'Wall thickening', 'Diverticulosis', 'Mass']],
      ['vessels', ['Normal', 'Aneurysm', 'Stenosis', 'Thrombosis']],
      ['lymphNodes', ['Normal', 'Enlarged', 'Lymphadenopathy']]
    ]),
    aiIntegration: {
      enabled: true,
      autoFillFields: ['liver', 'kidneys', 'spleen'],
      suggestedFindings: ['mass', 'stones', 'obstruction', 'inflammation', 'free fluid']
    },
    priority: 80,
    active: true,
    isDefault: true
  },

  {
    templateId: 'TPL-GENERAL-RAD-001',
    name: 'General Radiology Report',
    description: 'Generic template for various radiology studies',
    category: 'general',
    matchingCriteria: {
      modalities: ['CR', 'DX', 'CT', 'MR', 'US', 'RF', 'XA'],
      bodyParts: [],
      keywords: [],
      procedureTypes: ['diagnostic', 'screening', 'follow-up']
    },
    matchingWeights: {
      modalityWeight: 10,
      bodyPartWeight: 10,
      keywordWeight: 5,
      procedureTypeWeight: 5
    },
    sections: [
      {
        id: 'clinical-indication',
        title: 'Clinical Indication',
        order: 1,
        required: true,
        placeholder: 'Reason for examination'
      },
      {
        id: 'technique',
        title: 'Technique',
        order: 2,
        required: true,
        placeholder: 'Imaging technique and parameters'
      },
      {
        id: 'comparison',
        title: 'Comparison',
        order: 3,
        required: false,
        placeholder: 'Prior studies for comparison'
      },
      {
        id: 'findings',
        title: 'Findings',
        order: 4,
        required: true,
        placeholder: 'Detailed findings'
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
        placeholder: 'Follow-up recommendations'
      }
    ],
    aiIntegration: {
      enabled: true,
      autoFillFields: [],
      suggestedFindings: []
    },
    priority: 0,
    active: true,
    isDefault: true
  }
];

async function seedTemplates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/medical-imaging');
    console.log('✅ Connected to MongoDB');

    // Clear existing templates (optional - comment out to preserve existing)
    // await ReportTemplate.deleteMany({});
    // console.log('🗑️  Cleared existing templates');

    // Insert default templates
    for (const templateData of defaultTemplates) {
      const existing = await ReportTemplate.findOne({ templateId: templateData.templateId });
      
      if (existing) {
        console.log(`⏭️  Template ${templateData.templateId} already exists, skipping`);
        continue;
      }

      const template = new ReportTemplate(templateData);
      await template.save();
      console.log(`✅ Created template: ${template.name} (${template.templateId})`);
    }

    console.log('\n🎉 Template seeding completed!');
    console.log(`📊 Total templates: ${defaultTemplates.length}`);
    
    // Display summary
    const templates = await ReportTemplate.find({ active: true });
    console.log('\n📋 Active Templates:');
    templates.forEach(t => {
      console.log(`   - ${t.name} (${t.category})`);
      console.log(`     Modalities: ${t.matchingCriteria.modalities.join(', ')}`);
      console.log(`     Priority: ${t.priority}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    process.exit(1);
  }
}

// Run seeding
if (require.main === module) {
  seedTemplates();
}

module.exports = { seedTemplates, defaultTemplates };
