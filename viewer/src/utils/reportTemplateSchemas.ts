/**
 * 🏥 RADIOLOGY REPORT TEMPLATE SCHEMAS (Frontend)
 * Industry-standard templates for all modalities
 * NABH / International Hospital Compliant
 */

// ============ CONTROLLED VOCABULARIES ============

export const STATUS_VALUES = {
  NORMAL: 'Normal',
  ABNORMAL: 'Abnormal',
  NOT_VISUALIZED: 'Not Visualized',
  INDETERMINATE: 'Indeterminate'
} as const;

export type StatusValue = typeof STATUS_VALUES[keyof typeof STATUS_VALUES];

export interface ScoringCategory {
  code: string;
  label: string;
  action: string;
}

// BI-RADS Categories
export const BIRADS_CATEGORIES: Record<string, ScoringCategory> = {
  '0': { code: '0', label: 'Incomplete', action: 'Need additional imaging' },
  '1': { code: '1', label: 'Negative', action: 'Routine screening' },
  '2': { code: '2', label: 'Benign', action: 'Routine screening' },
  '3': { code: '3', label: 'Probably Benign', action: 'Short-term follow-up (6 months)' },
  '4A': { code: '4A', label: 'Low Suspicion', action: 'Biopsy should be considered' },
  '4B': { code: '4B', label: 'Moderate Suspicion', action: 'Biopsy recommended' },
  '4C': { code: '4C', label: 'High Suspicion', action: 'Biopsy strongly recommended' },
  '5': { code: '5', label: 'Highly Suggestive of Malignancy', action: 'Appropriate action should be taken' },
  '6': { code: '6', label: 'Known Biopsy-Proven Malignancy', action: 'Surgical excision when appropriate' }
};

// Lung-RADS Categories
export const LUNGRADS_CATEGORIES: Record<string, ScoringCategory> = {
  '0': { code: '0', label: 'Incomplete', action: 'Prior CT needed or incomplete exam' },
  '1': { code: '1', label: 'Negative', action: 'Continue annual screening' },
  '2': { code: '2', label: 'Benign Appearance', action: 'Continue annual screening' },
  '3': { code: '3', label: 'Probably Benign', action: '6-month follow-up CT' },
  '4A': { code: '4A', label: 'Suspicious', action: '3-month follow-up CT' },
  '4B': { code: '4B', label: 'Suspicious', action: 'PET/CT or tissue sampling' },
  '4X': { code: '4X', label: 'Suspicious with additional features', action: 'PET/CT and/or tissue sampling' }
};

// CAD-RADS Categories
export const CADRADS_CATEGORIES: Record<string, ScoringCategory> = {
  '0': { code: '0', label: 'No Plaque or Stenosis', action: 'No further workup' },
  '1': { code: '1', label: '1-24% Stenosis', action: 'Preventive therapy' },
  '2': { code: '2', label: '25-49% Stenosis', action: 'Preventive therapy' },
  '3': { code: '3', label: '50-69% Stenosis', action: 'Consider functional assessment' },
  '4A': { code: '4A', label: '70-99% Stenosis (1-2 vessels)', action: 'ICA or functional assessment' },
  '4B': { code: '4B', label: '70-99% Stenosis (3 vessels or LM)', action: 'ICA recommended' },
  '5': { code: '5', label: 'Total Occlusion', action: 'ICA and viability assessment' },
  'N': { code: 'N', label: 'Non-diagnostic', action: 'Repeat or alternative test' }
};

// LI-RADS Categories
export const LIRADS_CATEGORIES: Record<string, ScoringCategory> = {
  'LR-1': { code: 'LR-1', label: 'Definitely Benign', action: 'Continue surveillance' },
  'LR-2': { code: 'LR-2', label: 'Probably Benign', action: 'Continue surveillance' },
  'LR-3': { code: 'LR-3', label: 'Intermediate Probability', action: 'Consider follow-up or biopsy' },
  'LR-4': { code: 'LR-4', label: 'Probably HCC', action: 'Multidisciplinary discussion' },
  'LR-5': { code: 'LR-5', label: 'Definitely HCC', action: 'Treatment without biopsy' },
  'LR-M': { code: 'LR-M', label: 'Probably Malignant, not HCC specific', action: 'Biopsy recommended' },
  'LR-TIV': { code: 'LR-TIV', label: 'Tumor in Vein', action: 'Staging and treatment' }
};

// PI-RADS Categories
export const PIRADS_CATEGORIES: Record<string, ScoringCategory> = {
  '1': { code: '1', label: 'Very Low', action: 'Clinically significant cancer highly unlikely' },
  '2': { code: '2', label: 'Low', action: 'Clinically significant cancer unlikely' },
  '3': { code: '3', label: 'Intermediate', action: 'Equivocal, consider MRI-targeted biopsy' },
  '4': { code: '4', label: 'High', action: 'Clinically significant cancer likely, biopsy recommended' },
  '5': { code: '5', label: 'Very High', action: 'Clinically significant cancer highly likely, biopsy strongly recommended' }
};

// TI-RADS Categories
export const TIRADS_CATEGORIES: Record<string, ScoringCategory> = {
  'TR1': { code: 'TR1', label: 'Benign', action: 'No FNA' },
  'TR2': { code: 'TR2', label: 'Not Suspicious', action: 'No FNA' },
  'TR3': { code: 'TR3', label: 'Mildly Suspicious', action: 'FNA if ≥2.5cm, follow if ≥1.5cm' },
  'TR4': { code: 'TR4', label: 'Moderately Suspicious', action: 'FNA if ≥1.5cm, follow if ≥1cm' },
  'TR5': { code: 'TR5', label: 'Highly Suspicious', action: 'FNA if ≥1cm, follow if ≥0.5cm' }
};

// O-RADS Categories
export const ORADS_CATEGORIES: Record<string, ScoringCategory> = {
  '0': { code: '0', label: 'Incomplete Evaluation', action: 'Additional imaging needed' },
  '1': { code: '1', label: 'Normal', action: 'Routine follow-up' },
  '2': { code: '2', label: 'Almost Certainly Benign', action: 'Routine follow-up' },
  '3': { code: '3', label: 'Low Risk', action: 'Follow-up or MRI' },
  '4': { code: '4', label: 'Intermediate Risk', action: 'MRI or surgical evaluation' },
  '5': { code: '5', label: 'High Risk', action: 'Surgical evaluation' }
};

// ASPECTS Regions
export const ASPECTS_REGIONS = [
  'C - Caudate', 'L - Lentiform', 'IC - Internal Capsule', 'I - Insular Ribbon',
  'M1 - Anterior MCA', 'M2 - MCA lateral to insular ribbon', 'M3 - Posterior MCA',
  'M4 - Anterior MCA above M1', 'M5 - Lateral MCA above M2', 'M6 - Posterior MCA above M3'
];

// ============ TEMPLATE SECTION INTERFACE ============

export interface TemplateSection {
  required: boolean;
  label: string;
  defaultText?: string;
  options?: string[];
}

export interface TemplateChecklist {
  name: string;
  items: string[];
}

export interface NormalRange {
  min: number;
  max: number;
  unit: string;
}

export interface TemplateSchema {
  name: string;
  modality: string;
  scoringSystem: string | null;
  categories?: Record<string, ScoringCategory>;
  sections: Record<string, TemplateSection>;
  checklist?: TemplateChecklist;
  normalRanges?: Record<string, NormalRange>;
  maxPages?: number;
}

// ============ TEMPLATE DEFINITIONS ============

export const TEMPLATE_SCHEMAS: Record<string, TemplateSchema> = {
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

  'CADRADS_CORONARY_CTA': {
    name: 'CAD-RADS Coronary CTA',
    modality: 'CT',
    scoringSystem: 'CAD-RADS',
    categories: CADRADS_CATEGORIES,
    sections: {
      clinical_history: { required: true, label: 'Clinical History / Indication' },
      technique: { required: true, label: 'Technique', defaultText: 'ECG-gated CT coronary angiography was performed following IV administration of iodinated contrast.' },
      findings: { required: true, label: 'Findings' },
      impression: { required: true, label: 'Impression' }
    },
    checklist: {
      name: 'Coronary Artery Assessment',
      items: ['Left Main', 'LAD Proximal', 'LAD Mid', 'LAD Distal', 'LCx Proximal', 'LCx Distal', 'RCA Proximal', 'RCA Mid', 'RCA Distal']
    }
  },

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
      'Infrarenal Abdominal Aorta': { min: 1.5, max: 2.0, unit: 'cm' }
    }
  },

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
export function isValidContent(content: string | null | undefined): boolean {
  if (!content || typeof content !== 'string') return false;
  
  const cleaned = content.trim().toLowerCase();
  if (cleaned.length < 3) return false;
  
  // Junk text patterns
  const junkPatterns = [
    /^[a-z]{2,5}$/,
    /^[a-z]+[0-9]+$/,
    /^(test|demo|sample|placeholder|xxx|yyy|zzz)/i,
    /^(n\/a|na|none|nil|tbd|pending|todo)$/i,
    /^[-_.]+$/,
    /^\.{2,}$/,
    /sdfsdf|asdf|qwer|zxcv/i
  ];
  
  for (const pattern of junkPatterns) {
    if (pattern.test(cleaned)) return false;
  }
  
  return true;
}

/**
 * Normalize status to controlled vocabulary
 */
export function normalizeStatus(status: string | null | undefined): StatusValue {
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
 * Get template schema by name or modality
 */
export function getTemplateSchema(templateNameOrModality: string): TemplateSchema | null {
  // Direct match
  const upperKey = templateNameOrModality.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  if (TEMPLATE_SCHEMAS[upperKey]) {
    return TEMPLATE_SCHEMAS[upperKey];
  }
  
  // Match by name
  for (const [, schema] of Object.entries(TEMPLATE_SCHEMAS)) {
    if (schema.name.toLowerCase().includes(templateNameOrModality.toLowerCase())) {
      return schema;
    }
  }
  
  // Match by modality
  const modality = templateNameOrModality.toUpperCase();
  for (const [, schema] of Object.entries(TEMPLATE_SCHEMAS)) {
    if (schema.modality === modality) {
      return schema;
    }
  }
  
  return null;
}

/**
 * Get scoring category details
 */
export function getScoringCategory(scoringSystem: string, score: string): ScoringCategory | null {
  const categories: Record<string, Record<string, ScoringCategory>> = {
    'BI-RADS': BIRADS_CATEGORIES,
    'Lung-RADS': LUNGRADS_CATEGORIES,
    'CAD-RADS': CADRADS_CATEGORIES,
    'LI-RADS': LIRADS_CATEGORIES,
    'PI-RADS': PIRADS_CATEGORIES,
    'TI-RADS': TIRADS_CATEGORIES,
    'O-RADS': ORADS_CATEGORIES
  };
  
  const systemCategories = categories[scoringSystem];
  if (!systemCategories) return null;
  
  return systemCategories[score] || null;
}

/**
 * Validate measurement against normal range
 */
export function validateMeasurement(
  templateName: string, 
  structure: string, 
  value: number
): { isNormal: boolean; range: NormalRange | null } {
  const schema = getTemplateSchema(templateName);
  if (!schema?.normalRanges?.[structure]) {
    return { isNormal: true, range: null };
  }
  
  const range = schema.normalRanges[structure];
  const isNormal = value >= range.min && value <= range.max;
  
  return { isNormal, range };
}
