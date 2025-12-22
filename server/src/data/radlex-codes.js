/**
 * RadLex Terminology Codes
 * Subset of RadLex ontology for common radiology findings
 * Full ontology: https://radlex.org/
 * 
 * Structure: { code, term, synonyms, category, bodyPart }
 */

const RADLEX_ANATOMICAL_LOCATIONS = {
  // Head/Brain
  'RID6434': { term: 'Brain', category: 'head', synonyms: ['cerebrum', 'encephalon'] },
  'RID6440': { term: 'Cerebral hemisphere', category: 'head', synonyms: ['hemisphere'] },
  'RID6472': { term: 'Frontal lobe', category: 'head', synonyms: ['frontal'] },
  'RID6476': { term: 'Parietal lobe', category: 'head', synonyms: ['parietal'] },
  'RID6480': { term: 'Temporal lobe', category: 'head', synonyms: ['temporal'] },
  'RID6484': { term: 'Occipital lobe', category: 'head', synonyms: ['occipital'] },
  'RID6495': { term: 'Cerebellum', category: 'head', synonyms: ['cerebellar'] },
  'RID6628': { term: 'Brainstem', category: 'head', synonyms: ['brain stem'] },
  'RID6670': { term: 'Ventricle', category: 'head', synonyms: ['ventricular system'] },
  
  // Chest
  'RID1301': { term: 'Lung', category: 'chest', synonyms: ['pulmonary'] },
  'RID1302': { term: 'Right lung', category: 'chest', synonyms: ['right pulmonary'] },
  'RID1326': { term: 'Left lung', category: 'chest', synonyms: ['left pulmonary'] },
  'RID1315': { term: 'Right upper lobe', category: 'chest', synonyms: ['RUL'] },
  'RID1310': { term: 'Right middle lobe', category: 'chest', synonyms: ['RML'] },
  'RID1303': { term: 'Right lower lobe', category: 'chest', synonyms: ['RLL'] },
  'RID1327': { term: 'Left upper lobe', category: 'chest', synonyms: ['LUL'] },
  'RID1338': { term: 'Left lower lobe', category: 'chest', synonyms: ['LLL'] },
  'RID1384': { term: 'Heart', category: 'chest', synonyms: ['cardiac'] },
  'RID1385': { term: 'Left ventricle', category: 'chest', synonyms: ['LV'] },
  'RID1386': { term: 'Right ventricle', category: 'chest', synonyms: ['RV'] },
  'RID1387': { term: 'Left atrium', category: 'chest', synonyms: ['LA'] },
  'RID1388': { term: 'Right atrium', category: 'chest', synonyms: ['RA'] },
  'RID1247': { term: 'Mediastinum', category: 'chest', synonyms: ['mediastinal'] },
  'RID1362': { term: 'Pleura', category: 'chest', synonyms: ['pleural'] },
  
  // Abdomen
  'RID170': { term: 'Liver', category: 'abdomen', synonyms: ['hepatic'] },
  'RID187': { term: 'Spleen', category: 'abdomen', synonyms: ['splenic'] },
  'RID205': { term: 'Pancreas', category: 'abdomen', synonyms: ['pancreatic'] },
  'RID29663': { term: 'Kidney', category: 'abdomen', synonyms: ['renal'] },
  'RID29662': { term: 'Right kidney', category: 'abdomen', synonyms: ['right renal'] },
  'RID29664': { term: 'Left kidney', category: 'abdomen', synonyms: ['left renal'] },
  'RID237': { term: 'Gallbladder', category: 'abdomen', synonyms: ['GB'] },
  'RID132': { term: 'Adrenal gland', category: 'abdomen', synonyms: ['adrenal', 'suprarenal'] },
  'RID431': { term: 'Aorta', category: 'abdomen', synonyms: ['aortic'] },
  
  // Spine
  'RID7741': { term: 'Cervical spine', category: 'spine', synonyms: ['c-spine', 'cervical'] },
  'RID7776': { term: 'Thoracic spine', category: 'spine', synonyms: ['t-spine', 'thoracic'] },
  'RID7816': { term: 'Lumbar spine', category: 'spine', synonyms: ['l-spine', 'lumbar'] },
  'RID7851': { term: 'Sacrum', category: 'spine', synonyms: ['sacral'] },
  'RID7859': { term: 'Coccyx', category: 'spine', synonyms: ['coccygeal'] },
  'RID7694': { term: 'Intervertebral disc', category: 'spine', synonyms: ['disc', 'disk'] },
  
  // Breast
  'RID29896': { term: 'Breast', category: 'breast', synonyms: ['mammary'] },
  'RID29897': { term: 'Right breast', category: 'breast', synonyms: ['right mammary'] },
  'RID29898': { term: 'Left breast', category: 'breast', synonyms: ['left mammary'] },
  
  // Musculoskeletal
  'RID2507': { term: 'Shoulder', category: 'msk', synonyms: ['glenohumeral'] },
  'RID2660': { term: 'Elbow', category: 'msk', synonyms: ['cubital'] },
  'RID2736': { term: 'Wrist', category: 'msk', synonyms: ['carpal'] },
  'RID2841': { term: 'Hip', category: 'msk', synonyms: ['coxal'] },
  'RID2918': { term: 'Knee', category: 'msk', synonyms: ['genu'] },
  'RID3015': { term: 'Ankle', category: 'msk', synonyms: ['talocrural'] }
};

const RADLEX_FINDINGS = {
  // Masses/Lesions
  'RID3874': { term: 'Mass', category: 'finding', synonyms: ['lesion', 'tumor'] },
  'RID3957': { term: 'Nodule', category: 'finding', synonyms: ['nodular'] },
  'RID4865': { term: 'Cyst', category: 'finding', synonyms: ['cystic'] },
  'RID34262': { term: 'Calcification', category: 'finding', synonyms: ['calcified'] },
  
  // Vascular
  'RID4660': { term: 'Hemorrhage', category: 'vascular', synonyms: ['bleeding', 'hematoma'] },
  'RID4661': { term: 'Infarct', category: 'vascular', synonyms: ['infarction', 'ischemia'] },
  'RID4662': { term: 'Aneurysm', category: 'vascular', synonyms: ['aneurysmal'] },
  'RID4663': { term: 'Thrombosis', category: 'vascular', synonyms: ['thrombus', 'clot'] },
  'RID4664': { term: 'Embolism', category: 'vascular', synonyms: ['embolus'] },
  'RID4665': { term: 'Stenosis', category: 'vascular', synonyms: ['narrowing'] },
  
  // Pulmonary
  'RID4870': { term: 'Consolidation', category: 'pulmonary', synonyms: ['airspace opacity'] },
  'RID4871': { term: 'Ground glass opacity', category: 'pulmonary', synonyms: ['GGO'] },
  'RID4872': { term: 'Atelectasis', category: 'pulmonary', synonyms: ['collapse'] },
  'RID4873': { term: 'Pneumothorax', category: 'pulmonary', synonyms: ['PTX'] },
  'RID4874': { term: 'Pleural effusion', category: 'pulmonary', synonyms: ['effusion'] },
  'RID4875': { term: 'Emphysema', category: 'pulmonary', synonyms: ['emphysematous'] },
  'RID4876': { term: 'Fibrosis', category: 'pulmonary', synonyms: ['fibrotic'] },
  
  // Cardiac
  'RID4880': { term: 'Cardiomegaly', category: 'cardiac', synonyms: ['enlarged heart'] },
  'RID4881': { term: 'Pericardial effusion', category: 'cardiac', synonyms: ['pericardial fluid'] },
  
  // Hepatobiliary
  'RID4890': { term: 'Hepatomegaly', category: 'hepatobiliary', synonyms: ['enlarged liver'] },
  'RID4891': { term: 'Fatty liver', category: 'hepatobiliary', synonyms: ['steatosis', 'hepatic steatosis'] },
  'RID4892': { term: 'Cirrhosis', category: 'hepatobiliary', synonyms: ['cirrhotic'] },
  'RID4893': { term: 'Cholelithiasis', category: 'hepatobiliary', synonyms: ['gallstones'] },
  
  // Musculoskeletal
  'RID4900': { term: 'Fracture', category: 'msk', synonyms: ['broken', 'fx'] },
  'RID4901': { term: 'Dislocation', category: 'msk', synonyms: ['dislocated'] },
  'RID4902': { term: 'Degenerative changes', category: 'msk', synonyms: ['DJD', 'osteoarthritis'] },
  'RID4903': { term: 'Disc herniation', category: 'msk', synonyms: ['herniated disc', 'HNP'] },
  'RID4904': { term: 'Spinal stenosis', category: 'msk', synonyms: ['canal stenosis'] },
  
  // Neuro
  'RID4910': { term: 'Edema', category: 'neuro', synonyms: ['swelling'] },
  'RID4911': { term: 'Hydrocephalus', category: 'neuro', synonyms: ['ventriculomegaly'] },
  'RID4912': { term: 'Atrophy', category: 'neuro', synonyms: ['volume loss'] },
  'RID4913': { term: 'White matter disease', category: 'neuro', synonyms: ['leukoaraiosis', 'WMD'] }
};

const SNOMED_CT_CODES = {
  // Severity
  'normal': { code: '17621005', display: 'Normal (qualifier value)' },
  'mild': { code: '255604002', display: 'Mild (qualifier value)' },
  'moderate': { code: '6736007', display: 'Moderate (qualifier value)' },
  'severe': { code: '24484000', display: 'Severe (qualifier value)' },
  'critical': { code: '399166001', display: 'Critical (qualifier value)' },
  
  // Common findings
  'mass': { code: '4147007', display: 'Mass (morphologic abnormality)' },
  'nodule': { code: '27925004', display: 'Nodule (morphologic abnormality)' },
  'cyst': { code: '441457006', display: 'Cyst (morphologic abnormality)' },
  'fracture': { code: '125605004', display: 'Fracture of bone (disorder)' },
  'hemorrhage': { code: '50960005', display: 'Hemorrhage (morphologic abnormality)' },
  'infarct': { code: '55641003', display: 'Infarct (morphologic abnormality)' },
  'pneumonia': { code: '233604007', display: 'Pneumonia (disorder)' },
  'pneumothorax': { code: '36118008', display: 'Pneumothorax (disorder)' },
  'pleural_effusion': { code: '60046008', display: 'Pleural effusion (disorder)' },
  'pulmonary_embolism': { code: '59282003', display: 'Pulmonary embolism (disorder)' },
  'stroke': { code: '230690007', display: 'Cerebrovascular accident (disorder)' },
  'tumor': { code: '108369006', display: 'Neoplasm (morphologic abnormality)' }
};

/**
 * Find RadLex code for anatomical location
 * @param {string} text - Text to search
 * @returns {Object|null} RadLex code object or null
 */
function findAnatomicalCode(text) {
  if (!text) return null;
  
  const normalizedText = text.toLowerCase().trim();
  
  for (const [code, data] of Object.entries(RADLEX_ANATOMICAL_LOCATIONS)) {
    // Check exact term match
    if (data.term.toLowerCase() === normalizedText) {
      return { code, system: 'RadLex', ...data };
    }
    
    // Check synonyms
    if (data.synonyms?.some(syn => syn.toLowerCase() === normalizedText)) {
      return { code, system: 'RadLex', ...data };
    }
    
    // Check partial match
    if (normalizedText.includes(data.term.toLowerCase()) || 
        data.term.toLowerCase().includes(normalizedText)) {
      return { code, system: 'RadLex', ...data };
    }
  }
  
  return null;
}

/**
 * Find RadLex code for finding
 * @param {string} text - Text to search
 * @returns {Object|null} RadLex code object or null
 */
function findFindingCode(text) {
  if (!text) return null;
  
  const normalizedText = text.toLowerCase().trim();
  
  for (const [code, data] of Object.entries(RADLEX_FINDINGS)) {
    // Check exact term match
    if (data.term.toLowerCase() === normalizedText) {
      return { code, system: 'RadLex', ...data };
    }
    
    // Check synonyms
    if (data.synonyms?.some(syn => syn.toLowerCase() === normalizedText)) {
      return { code, system: 'RadLex', ...data };
    }
    
    // Check partial match
    if (normalizedText.includes(data.term.toLowerCase())) {
      return { code, system: 'RadLex', ...data };
    }
  }
  
  return null;
}

/**
 * Get SNOMED CT code for severity
 * @param {string} severity - Severity level
 * @returns {Object|null} SNOMED code object or null
 */
function getSeverityCode(severity) {
  if (!severity) return null;
  return SNOMED_CT_CODES[severity.toLowerCase()] || null;
}

/**
 * Get SNOMED CT code for finding type
 * @param {string} findingType - Finding type
 * @returns {Object|null} SNOMED code object or null
 */
function getSnomedCode(findingType) {
  if (!findingType) return null;
  const normalized = findingType.toLowerCase().replace(/\s+/g, '_');
  return SNOMED_CT_CODES[normalized] || null;
}

/**
 * Auto-code a finding with RadLex and SNOMED
 * @param {Object} finding - Finding object with location, description, severity
 * @returns {Object} Finding with added codes
 */
function autoCodeFinding(finding) {
  const coded = { ...finding };
  
  // Code anatomical location
  if (finding.location) {
    const locationCode = findAnatomicalCode(finding.location);
    if (locationCode) {
      coded.locationCode = {
        system: 'http://radlex.org',
        code: locationCode.code,
        display: locationCode.term
      };
    }
  }
  
  // Code finding type from description
  if (finding.description) {
    const findingCode = findFindingCode(finding.description);
    if (findingCode) {
      coded.findingCode = {
        system: 'http://radlex.org',
        code: findingCode.code,
        display: findingCode.term
      };
    }
    
    // Also try SNOMED
    const snomedCode = getSnomedCode(finding.description);
    if (snomedCode) {
      coded.snomedCode = {
        system: 'http://snomed.info/sct',
        code: snomedCode.code,
        display: snomedCode.display
      };
    }
  }
  
  // Code severity
  if (finding.severity) {
    const severityCode = getSeverityCode(finding.severity);
    if (severityCode) {
      coded.severityCode = {
        system: 'http://snomed.info/sct',
        code: severityCode.code,
        display: severityCode.display
      };
    }
  }
  
  return coded;
}

/**
 * Search all codes by text
 * @param {string} query - Search query
 * @returns {Array} Matching codes
 */
function searchCodes(query) {
  if (!query || query.length < 2) return [];
  
  const results = [];
  const normalizedQuery = query.toLowerCase();
  
  // Search anatomical locations
  for (const [code, data] of Object.entries(RADLEX_ANATOMICAL_LOCATIONS)) {
    if (data.term.toLowerCase().includes(normalizedQuery) ||
        data.synonyms?.some(syn => syn.toLowerCase().includes(normalizedQuery))) {
      results.push({
        code,
        system: 'RadLex',
        type: 'anatomical',
        ...data
      });
    }
  }
  
  // Search findings
  for (const [code, data] of Object.entries(RADLEX_FINDINGS)) {
    if (data.term.toLowerCase().includes(normalizedQuery) ||
        data.synonyms?.some(syn => syn.toLowerCase().includes(normalizedQuery))) {
      results.push({
        code,
        system: 'RadLex',
        type: 'finding',
        ...data
      });
    }
  }
  
  return results.slice(0, 20); // Limit results
}

module.exports = {
  RADLEX_ANATOMICAL_LOCATIONS,
  RADLEX_FINDINGS,
  SNOMED_CT_CODES,
  findAnatomicalCode,
  findFindingCode,
  getSeverityCode,
  getSnomedCode,
  autoCodeFinding,
  searchCodes
};
