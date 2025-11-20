/**
 * Medical Vocabulary
 * Common radiology and medical terms for voice recognition
 */

export const medicalVocabulary = {
  // Radiology Findings
  radiologyFindings: [
    'pneumothorax',
    'pleural effusion',
    'consolidation',
    'ground-glass opacity',
    'infiltrate',
    'nodule',
    'mass',
    'cardiomegaly',
    'mediastinal widening',
    'hilar prominence',
    'atelectasis',
    'emphysema',
    'bronchiectasis',
    'interstitial markings',
    'pulmonary edema',
    'lymphadenopathy',
    'hemorrhage',
    'hematoma',
    'fracture',
    'dislocation',
    'degenerative changes'
  ],

  // Anatomical Terms
  anatomy: [
    'parenchyma',
    'mediastinum',
    'pleura',
    'pericardium',
    'bronchus',
    'alveolar',
    'diaphragm',
    'costophrenic angle',
    'cardiophrenic angle',
    'pulmonary vasculature',
    'aortic arch',
    'clavicle',
    'scapula',
    'vertebrae',
    'ribs',
    'sternum'
  ],

  // Descriptors
  descriptors: [
    'bilateral',
    'unilateral',
    'diffuse',
    'focal',
    'scattered',
    'patchy',
    'confluent',
    'homogeneous',
    'heterogeneous',
    'symmetric',
    'asymmetric',
    'enlarged',
    'prominent',
    'unremarkable',
    'normal',
    'abnormal',
    'acute',
    'chronic',
    'severe',
    'moderate',
    'mild',
    'minimal'
  ],

  // Measurements
  measurements: [
    'millimeter',
    'centimeter',
    'millimeters',
    'centimeters',
    'mm',
    'cm'
  ],

  // Common Diagnoses
  diagnoses: [
    'pneumonia',
    'COPD',
    'CHF',
    'tuberculosis',
    'sarcoidosis',
    'fibrosis',
    'malignancy',
    'metastasis',
    'lymphoma',
    'sarcoma',
    'carcinoma',
    'adenocarcinoma'
  ],

  // Body Parts
  bodyParts: [
    'chest',
    'abdomen',
    'pelvis',
    'head',
    'neck',
    'spine',
    'cervical',
    'thoracic',
    'lumbar',
    'sacral',
    'upper extremity',
    'lower extremity',
    'knee',
    'shoulder',
    'elbow',
    'wrist',
    'hip',
    'ankle'
  ],

  // Modality-Specific Terms
  ctTerms: [
    'Hounsfield units',
    'contrast enhancement',
    'arterial phase',
    'venous phase',
    'delayed phase',
    'soft tissue window',
    'bone window',
    'lung window'
  ],

  mriTerms: [
    'T1-weighted',
    'T2-weighted',
    'FLAIR',
    'DWI',
    'ADC',
    'gadolinium',
    'hyperintense',
    'hypointense',
    'isointense'
  ],

  // Common Phrases
  commonPhrases: [
    'within normal limits',
    'no acute findings',
    'no significant change',
    'compared to prior',
    'suggest clinical correlation',
    'recommend follow-up',
    'further evaluation',
    'clinical correlation recommended'
  ]
};

/**
 * Get all medical terms as a flat array
 */
export function getAllMedicalTerms(): string[] {
  return Object.values(medicalVocabulary).flat();
}

/**
 * Check if a word is a medical term
 */
export function isMedicalTerm(word: string): boolean {
  const lowerWord = word.toLowerCase();
  return getAllMedicalTerms().some(term => 
    term.toLowerCase() === lowerWord
  );
}

/**
 * Get suggestions for partial medical term
 */
export function getMedicalSuggestions(partial: string, limit: number = 5): string[] {
  if (!partial || partial.length < 2) return [];
  
  const lowerPartial = partial.toLowerCase();
  const allTerms = getAllMedicalTerms();
  
  const matches = allTerms.filter(term =>
    term.toLowerCase().startsWith(lowerPartial)
  );

  return matches.slice(0, limit);
}

export default medicalVocabulary;
