/**
 * 🏥 RADIOLOGY REPORT TEMPLATE SCHEMAS
 * Industry-standard templates for all modalities
 * NABH / International Hospital Compliant
 */

// ============ CONTROLLED VOCABULARIES ============

const STATUS_VALUES = {
  NORMAL: 'Normal',
  ABNORMAL: 'Abnormal',
  NOT_VISUALIZED: 'Not Visualized',
  INDETERMINATE: 'Indeterminate'
};

const BIRADS_CATEGORIES = {
  0: { code: '0', label: 'Incomplete', action: 'Need additional imaging' },
  1: { code: '1', label: 'Negative', action: 'Routine screening' },
  2: { code: '2', label: 'Benign', action: 'Routine screening' },
  3: { code: '3', label: 'Probably Benign', action: 'Short-term follow-up (6 months)' },
  4: { code: '4A', label: 'Low Suspicion', action: 'Biopsy should be considered' },
  '4A': { code: '4A', label: 'Low Suspicion', action: 'Biopsy should be considered' },
  '4B': { code: '4B', label: 'Moderate Suspicion', action: 'Biopsy recommended' },
  '4C': { code: '4C', label: 'High Suspicion', action: 'Biopsy strongly recommended' },
  5: { code: '5', label: 'Highly Suggestive of Malignancy', action: 'Appropriate action should be taken' },
  6: { code: '6', label: 'Known Biopsy-Proven Malignancy', action: 'Surgical excision when appropriate' }
};

const LUNGRADS_CATEGORIES = {
  0: { code: '0', label: 'Incomplete', action: 'Prior CT needed or incomplete exam' },
  1: { code: '1', label: 'Negative', action: 'Continue annual screening' },
  2: { code: '2', label: 'Benign Appearance', action: 'Continue annual screening' },
  3: { code: '3', label: 'Probably Benign', action: '6-month follow-up CT' },
  '4A': { code: '4A', label: 'Suspicious', action: '3-month follow-up CT' },
  '4B': { code: '4B', label: 'Suspicious', action: 'PET/CT or tissue sampling' },
  '4X': { code: '4X', label: 'Suspicious with additional features', action: 'PET/CT and/or tissue sampling' }
};

const CADRADS_CATEGORIES = {
  0: { code: '0', label: 'No Plaque or Stenosis', action: 'No further workup' },
  1: { code: '1', label: '1-24% Stenosis', action: 'Preventive therapy' },
  2: { code: '2', label: '25-49% Stenosis', action: 'Preventive therapy' },
  3: { code: '3', label: '50-69% Stenosis', action: 'Consider functional assessment' },
  4: { code: '4A', label: '70-99% Stenosis (1-2 vessels)', action: 'ICA or functional assessment' },
  '4A': { code: '4A', label: '70-99% Stenosis (1-2 vessels)', action: 'ICA or functional assessment' },
  '4B': { code: '4B', label: '70-99% Stenosis (3 vessels or LM)', action: 'ICA recommended' },
  5: { code: '5', label: 'Total Occlusion', action: 'ICA and viability assessment' },
  N: { code: 'N', label: 'Non-diagnostic', action: 'Repeat or alternative test' }
};

const LIRADS_CATEGORIES = {
  'LR-1': { code: 'LR-1', label: 'Definitely Benign', action: 'Continue surveillance' },
  'LR-2': { code: 'LR-2', label: 'Probably Benign', action: 'Continue surveillance' },
  'LR-3': { code: 'LR-3', label: 'Intermediate Probability', action: 'Consider follow-up or biopsy' },
  'LR-4': { code: 'LR-4', label: 'Probably HCC', action: 'Multidisciplinary discussion' },
  'LR-5': { code: 'LR-5', label: 'Definitely HCC', action: 'Treatment without biopsy' },
  'LR-M': { code: 'LR-M', label: 'Probably Malignant, not HCC specific', action: 'Biopsy recommended' },
  'LR-TIV': { code: 'LR-TIV', label: 'Tumor in Vein', action: 'Staging and treatment' }
};

const PIRADS_CATEGORIES = {
  1: { code: '1', label: 'Very Low', action: 'Clinically significant cancer highly unlikely' },
  2: { code: '2', label: 'Low', action: 'Clinically significant cancer unlikely' },
  3: { code: '3', label: 'Intermediate', action: 'Equivocal, consider MRI-targeted biopsy' },
  4: { code: '4', label: 'High', action: 'Clinically significant cancer likely, biopsy recommended' },
  5: { code: '5', label: 'Very High', action: 'Clinically significant cancer highly likely, biopsy strongly recommended' }
};

const TIRADS_CATEGORIES = {
  'TR1': { code: 'TR1', label: 'Benign', action: 'No FNA' },
  'TR2': { code: 'TR2', label: 'Not Suspicious', action: 'No FNA' },
  'TR3': { code: 'TR3', label: 'Mildly Suspicious', action: 'FNA if ≥2.5cm, follow if ≥1.5cm' },
  'TR4': { code: 'TR4', label: 'Moderately Suspicious', action: 'FNA if ≥1.5cm, follow if ≥1cm' },
  'TR5': { code: 'TR5', label: 'Highly Suspicious', action: 'FNA if ≥1cm, follow if ≥0.5cm' }
};

const ORADS_CATEGORIES = {
  0: { code: '0', label: 'Incomplete Evaluation', action: 'Additional imaging needed' },
  1: { code: '1', label: 'Normal', action: 'Routine follow-up' },
  2: { code: '2', label: 'Almost Certainly Benign', action: 'Routine follow-up' },
  3: { code: '3', label: 'Low Risk', action: 'Follow-up or MRI' },
  4: { code: '4', label: 'Intermediate Risk', action: 'MRI or surgical evaluation' },
  5: { code: '5', label: 'High Risk', action: 'Surgical evaluation' }
};

const ASPECTS_REGIONS = [
  'C - Caudate', 'L - Lentiform', 'IC - Internal Capsule', 'I - Insular Ribbon',
  'M1 - Anterior MCA', 'M2 - MCA lateral to insular ribbon', 'M3 - Posterior MCA',
  'M4 - Anterior MCA above M1', 'M5 - Lateral MCA above M2', 'M6 - Posterior MCA above M3'
];

// ============ TEMPLATE DEFINITIONS ============

const TEMPLATE_SCHEMAS = {
  // BI-RADS Templates
  'BIRADS_MAMMOGRAPHY': {
    name: 'BI-RADS Mammography',
    modality: 'MG',
    scoringSystem: 'BI-RADS',
    categories: BIRADS_CATEGORIES,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'Standard two-view digital mammography (CC and MLO views) of both breasts was performed.' },
      breast_composition: { required: true, label: 'Breast Composition', options: ['A - Almost entirely fatty', 'B - Scattered fibroglandular', 'C - Heterogeneously dense', 'D - Extremely dense'] },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'Mammography Findings',
      items: ['Mass', 'Calcifications', 'Architectural Distortion', 'Asymmetry', 'Skin Changes', 'Nipple Changes', 'Lymph Nodes']
    }
  },

  'BIRADS_BREAST_US': {
    name: 'BI-RADS Breast Ultrasound',
    modality: 'US',
    scoringSystem: 'BI-RADS',
    categories: BIRADS_CATEGORIES,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'High-resolution ultrasound of both breasts was performed using a linear transducer (12-15 MHz).' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'Breast US Findings',
      items: ['Shape', 'Orientation', 'Margin', 'Echo Pattern', 'Posterior Features', 'Vascularity']
    }
  },

  // Lung-RADS
  'LUNGRADS_CT_CHEST': {
    name: 'Lung-RADS CT Chest',
    modality: 'CT',
    scoringSystem: 'Lung-RADS',
    categories: LUNGRADS_CATEGORIES,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'Low-dose CT chest was performed without IV contrast for lung cancer screening.' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'Pulmonary Nodule Assessment',
      items: ['Nodule Location', 'Nodule Size', 'Nodule Type', 'Nodule Margins', 'Calcification', 'Growth Rate']
    }
  },

  // CAD-RADS
  'CADRADS_CORONARY_CTA': {
    name: 'CAD-RADS Coronary CTA',
    modality: 'CT',
    scoringSystem: 'CAD-RADS',
    categories: CADRADS_CATEGORIES,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'ECG-gated CT coronary angiography was performed following IV administration of iodinated contrast. Beta-blocker/nitroglycerin administered as per protocol.' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'Coronary Artery Assessment',
      items: ['Left Main', 'LAD Proximal', 'LAD Mid', 'LAD Distal', 'LCx Proximal', 'LCx Distal', 'RCA Proximal', 'RCA Mid', 'RCA Distal', 'Ramus', 'Diagonal', 'OM']
    },
    measurementFields: ['Calcium Score', 'Stenosis %']
  },

  // LI-RADS
  'LIRADS_LIVER_CT': {
    name: 'LI-RADS Liver CT/MRI',
    modality: 'CT',
    scoringSystem: 'LI-RADS',
    categories: LIRADS_CATEGORIES,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'Multiphasic CT/MRI of the liver was performed with arterial, portal venous, and delayed phases.' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'Liver Observation Assessment',
      items: ['Size', 'Arterial Phase Hyperenhancement', 'Washout', 'Capsule', 'Threshold Growth', 'Portal Vein Thrombosis']
    }
  },

  // PI-RADS
  'PIRADS_PROSTATE_MRI': {
    name: 'PI-RADS Prostate MRI',
    modality: 'MR',
    scoringSystem: 'PI-RADS',
    categories: PIRADS_CATEGORIES,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'Multiparametric MRI of the prostate was performed including T2W, DWI (b-values 0, 1000, 1500), and DCE sequences.' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'Prostate Zone Assessment',
      items: ['Peripheral Zone Right', 'Peripheral Zone Left', 'Transition Zone Right', 'Transition Zone Left', 'Central Zone', 'Anterior Fibromuscular Stroma', 'Seminal Vesicles']
    }
  },

  // TI-RADS
  'TIRADS_THYROID_US': {
    name: 'TI-RADS Thyroid Ultrasound',
    modality: 'US',
    scoringSystem: 'TI-RADS',
    categories: TIRADS_CATEGORIES,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'High-resolution ultrasound of the thyroid gland was performed using a linear transducer (10-15 MHz).' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'Thyroid Nodule Assessment',
      items: ['Composition', 'Echogenicity', 'Shape', 'Margin', 'Echogenic Foci']
    },
    tiradsPoints: {
      composition: { cystic: 0, spongiform: 0, mixed: 1, solid: 2 },
      echogenicity: { anechoic: 0, hyperechoic: 1, isoechoic: 1, hypoechoic: 2, veryHypoechoic: 3 },
      shape: { widerThanTall: 0, tallerThanWide: 3 },
      margin: { smooth: 0, illDefined: 0, lobulated: 2, irregular: 2, extrathyroidal: 3 },
      echogenicFoci: { none: 0, comet: 0, macrocalc: 1, peripheral: 2, punctate: 3 }
    }
  },

  // O-RADS
  'ORADS_PELVIC_US': {
    name: 'O-RADS Pelvic Ultrasound',
    modality: 'US',
    scoringSystem: 'O-RADS',
    categories: ORADS_CATEGORIES,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'Transabdominal and transvaginal ultrasound of the pelvis was performed.' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'Adnexal Mass Assessment',
      items: ['Size', 'Composition', 'Wall Thickness', 'Septations', 'Solid Component', 'Vascularity', 'Acoustic Shadowing']
    }
  },

  // ASPECTS
  'ASPECTS_CT_HEAD': {
    name: 'ASPECTS CT Head (Stroke)',
    modality: 'CT',
    scoringSystem: 'ASPECTS',
    maxScore: 10,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'Non-contrast CT head was performed for acute stroke evaluation.' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'ASPECTS Regions',
      items: ASPECTS_REGIONS
    }
  },

  // CTA Aorta
  'CTA_AORTA': {
    name: 'CT Angiography - Aorta',
    modality: 'CT',
    scoringSystem: null,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'CT Angiography of the thoracic and abdominal aorta was performed following IV administration of iodinated contrast with arterial phase acquisition.' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' },
      recommendations: { required: false, label: 'Recommendations' }
    },
    checklist: {
      name: 'Aorta Assessment',
      items: ['Aortic Root', 'Ascending Aorta', 'Aortic Arch', 'Descending Thoracic Aorta', 'Suprarenal Abdominal Aorta', 'Infrarenal Abdominal Aorta', 'Celiac Trunk', 'SMA', 'Renal Arteries', 'IMA', 'Common Iliac Arteries']
    },
    normalRanges: {
      'Aortic Root': { min: 2.9, max: 3.5, unit: 'cm' },
      'Ascending Aorta': { min: 2.5, max: 4.0, unit: 'cm' },
      'Aortic Arch': { min: 2.5, max: 3.0, unit: 'cm' },
      'Descending Thoracic Aorta': { min: 2.0, max: 2.5, unit: 'cm' },
      'Suprarenal Abdominal Aorta': { min: 2.0, max: 2.5, unit: 'cm' },
      'Infrarenal Abdominal Aorta': { min: 1.5, max: 2.0, unit: 'cm' },
      'Common Iliac Arteries': { min: 1.0, max: 1.2, unit: 'cm' }
    }
  },

  // PET/CT
  'PETCT_FDG': {
    name: 'PET/CT FDG Oncology',
    modality: 'PT',
    scoringSystem: 'Deauville',
    maxPages: 3,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'Whole body FDG PET/CT was performed 60 minutes after IV administration of 18F-FDG. Low-dose CT was acquired for attenuation correction and anatomical localization.' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'FDG Uptake Assessment',
      items: ['Brain', 'Head & Neck', 'Chest', 'Mediastinum', 'Axillae', 'Abdomen', 'Pelvis', 'Skeleton', 'Soft Tissues']
    }
  },

  // General Templates
  'GENERAL_CT': {
    name: 'General CT Report',
    modality: 'CT',
    scoringSystem: null,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    }
  },

  'GENERAL_MRI': {
    name: 'General MRI Report',
    modality: 'MR',
    scoringSystem: null,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    }
  },

  'GENERAL_XRAY': {
    name: 'General X-Ray Report',
    modality: 'CR',
    scoringSystem: null,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    }
  },

  'GENERAL_US': {
    name: 'General Ultrasound Report',
    modality: 'US',
    scoringSystem: null,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    }
  }
};

// ============ VALIDATION FUNCTIONS ============

/**
 * Validate content - check for junk/placeholder text
 */
function isValidContent(content) {
  if (!content || typeof content !== 'string') return false;
  
  const cleaned = content.trim().toLowerCase();
  if (cleaned.length < 3) return false;
  
  // Junk text patterns
  const junkPatterns = [
    /^[a-z]{2,5}$/,           // Random letters like 'asdf', 'sdf'
    /^[a-z]+[0-9]+$/,         // Like 'test123'
    /^(test|demo|sample|placeholder|xxx|yyy|zzz)/i,
    /^(n\/a|na|none|nil|tbd|pending|todo)$/i,
    /^[-_.]+$/,               // Just dashes, dots, underscores
    /^\.{2,}$/,               // Multiple dots
    /sdfsdf|asdf|qwer|zxcv/i  // Common keyboard mash
  ];
  
  for (const pattern of junkPatterns) {
    if (pattern.test(cleaned)) return false;
  }
  
  return true;
}

/**
 * Validate status value
 */
function isValidStatus(status) {
  if (!status) return false;
  const validStatuses = Object.values(STATUS_VALUES);
  return validStatuses.includes(status) || 
         status.toLowerCase().includes('normal') || 
         status.toLowerCase().includes('abnormal');
}

/**
 * Normalize status to controlled vocabulary
 */
function normalizeStatus(status) {
  if (!status) return STATUS_VALUES.NOT_VISUALIZED;
  
  const lower = status.toLowerCase();
  
  if (lower.includes('abnormal') || lower.includes('dilated') || 
      lower.includes('stenosis') || lower.includes('aneurysm') ||
      lower.includes('mass') || lower.includes('lesion')) {
    return STATUS_VALUES.ABNORMAL;
  }
  
  if (lower.includes('normal') || lower.includes('patent') || 
      lower.includes('unremarkable') || lower.includes('within limits')) {
    return STATUS_VALUES.NORMAL;
  }
  
  if (lower.includes('not seen') || lower.includes('not visualized') ||
      lower.includes('obscured')) {
    return STATUS_VALUES.NOT_VISUALIZED;
  }
  
  return STATUS_VALUES.INDETERMINATE;
}

/**
 * Get scoring category details
 */
function getScoringCategory(templateId, score) {
  const template = TEMPLATE_SCHEMAS[templateId];
  if (!template || !template.categories) return null;
  
  return template.categories[score] || null;
}

/**
 * Get template schema by ID or modality
 */
function getTemplateSchema(templateIdOrModality) {
  // Direct match
  if (TEMPLATE_SCHEMAS[templateIdOrModality]) {
    return TEMPLATE_SCHEMAS[templateIdOrModality];
  }
  
  // Match by modality
  const modality = templateIdOrModality?.toUpperCase();
  for (const [id, schema] of Object.entries(TEMPLATE_SCHEMAS)) {
    if (schema.modality === modality) {
      return schema;
    }
  }
  
  // Default to general CT
  return TEMPLATE_SCHEMAS.GENERAL_CT;
}

/**
 * Detect template from report data
 */
function detectTemplate(report) {
  const templateName = (report.templateName || '').toLowerCase();
  const modality = (report.modality || '').toUpperCase();
  
  // BI-RADS detection
  if (templateName.includes('birads') || templateName.includes('bi-rads')) {
    if (templateName.includes('mammo') || modality === 'MG') {
      return TEMPLATE_SCHEMAS.BIRADS_MAMMOGRAPHY;
    }
    if (templateName.includes('breast') || templateName.includes('us')) {
      return TEMPLATE_SCHEMAS.BIRADS_BREAST_US;
    }
  }
  
  // Lung-RADS
  if (templateName.includes('lung') || templateName.includes('lungrads')) {
    return TEMPLATE_SCHEMAS.LUNGRADS_CT_CHEST;
  }
  
  // CAD-RADS
  if (templateName.includes('cad') || templateName.includes('coronary')) {
    return TEMPLATE_SCHEMAS.CADRADS_CORONARY_CTA;
  }
  
  // LI-RADS
  if (templateName.includes('li-rads') || templateName.includes('lirads') || templateName.includes('liver')) {
    return TEMPLATE_SCHEMAS.LIRADS_LIVER_CT;
  }
  
  // PI-RADS
  if (templateName.includes('pi-rads') || templateName.includes('pirads') || templateName.includes('prostate')) {
    return TEMPLATE_SCHEMAS.PIRADS_PROSTATE_MRI;
  }
  
  // TI-RADS
  if (templateName.includes('ti-rads') || templateName.includes('tirads') || templateName.includes('thyroid')) {
    return TEMPLATE_SCHEMAS.TIRADS_THYROID_US;
  }
  
  // O-RADS
  if (templateName.includes('o-rads') || templateName.includes('orads') || templateName.includes('ovarian')) {
    return TEMPLATE_SCHEMAS.ORADS_PELVIC_US;
  }
  
  // ASPECTS
  if (templateName.includes('aspects') || templateName.includes('stroke')) {
    return TEMPLATE_SCHEMAS.ASPECTS_CT_HEAD;
  }
  
  // CTA Aorta
  if (templateName.includes('aorta') || templateName.includes('cta')) {
    return TEMPLATE_SCHEMAS.CTA_AORTA;
  }
  
  // PET/CT
  if (modality === 'PT' || templateName.includes('pet')) {
    return TEMPLATE_SCHEMAS.PETCT_FDG;
  }
  
  // General templates by modality
  switch (modality) {
    case 'CT': return TEMPLATE_SCHEMAS.GENERAL_CT;
    case 'MR': return TEMPLATE_SCHEMAS.GENERAL_MRI;
    case 'CR': case 'DX': return TEMPLATE_SCHEMAS.GENERAL_XRAY;
    case 'US': return TEMPLATE_SCHEMAS.GENERAL_US;
    default: return TEMPLATE_SCHEMAS.GENERAL_CT;
  }
}

module.exports = {
  STATUS_VALUES,
  BIRADS_CATEGORIES,
  LUNGRADS_CATEGORIES,
  CADRADS_CATEGORIES,
  LIRADS_CATEGORIES,
  PIRADS_CATEGORIES,
  TIRADS_CATEGORIES,
  ORADS_CATEGORIES,
  ASPECTS_REGIONS,
  TEMPLATE_SCHEMAS,
  isValidContent,
  isValidStatus,
  normalizeStatus,
  getScoringCategory,
  getTemplateSchema,
  detectTemplate
};
