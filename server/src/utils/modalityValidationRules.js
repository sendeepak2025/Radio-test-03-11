/**
 * Comprehensive Modality-Specific Validation Rules
 * Enforces modality-appropriate documentation standards
 */

/**
 * Validate report based on modality-specific rules
 * @param {Object} report - Report to validate
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
function validateReportForSigning(report) {
  const errors = [];
  const warnings = [];

  // Universal validation (all modalities)
  if (!report.impression || report.impression.trim().length === 0) {
    errors.push('Impression is required');
  } else if (report.impression.trim().length < 5) {
    errors.push('Impression must be at least 5 characters');
  }

  const findingsText = report.findingsText || '';
  const hasStructuredFindings = report.findings && report.findings.length > 0;
  
  if (!findingsText && !hasStructuredFindings) {
    errors.push('Findings are required (narrative or structured)');
  } else if (findingsText && findingsText.trim().length < 10) {
    errors.push('Findings narrative must be at least 10 characters');
  }

  if (!report.technique || report.technique.trim().length === 0) {
    errors.push('Technique is required');
  }

  // Template-based validation
  if (report.templateId && (!report.clinicalHistory || report.clinicalHistory.trim().length === 0)) {
    errors.push('Clinical history is required when using a template');
  }

  // Modality-specific validation
  const modality = (report.modality || '').toUpperCase();
  
  switch (modality) {
    case 'CT':
      validateCT(report, errors, warnings);
      break;
    case 'MR':
    case 'MRI':
      validateMRI(report, errors, warnings);
      break;
    case 'CR':
    case 'DX':
      validateXRay(report, errors, warnings);
      break;
    case 'XA':
    case 'RF':
      validateAngiography(report, errors, warnings);
      break;
    case 'US':
      validateUltrasound(report, errors, warnings);
      break;
    case 'MG':
    case 'DM':
      validateMammography(report, errors, warnings);
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * CT-Specific Validation
 */
function validateCT(report, errors, warnings) {
  const techniqueText = (report.technique || '').toLowerCase();
  const findingsText = (report.findingsText || '').toLowerCase();

  // Rule 1: Contrast documentation consistency
  const hasContrast = techniqueText.includes('contrast') || 
                      techniqueText.includes('iv contrast') ||
                      techniqueText.includes('oral contrast');
  
  if (hasContrast) {
    const contrastInFindings = findingsText.includes('contrast') ||
                               findingsText.includes('enhancement') ||
                               findingsText.includes('enhancing');
    
    if (!contrastInFindings) {
      errors.push('Contrast mentioned in technique but not documented in findings (must describe enhancement pattern)');
    }
  }

  // Rule 2: Slice thickness documentation
  const hasSliceThickness = techniqueText.includes('mm') || 
                            techniqueText.includes('slice') ||
                            techniqueText.includes('thickness');
  
  if (!hasSliceThickness) {
    warnings.push('Consider documenting slice thickness in technique section');
  }

  // Rule 3: Multi-phase documentation for contrast studies
  if (hasContrast) {
    const hasPhaseInfo = techniqueText.includes('arterial') ||
                         techniqueText.includes('venous') ||
                         techniqueText.includes('portal') ||
                         techniqueText.includes('delayed') ||
                         techniqueText.includes('phase');
    
    if (!hasPhaseInfo) {
      warnings.push('Consider documenting contrast phase timing (arterial, portal venous, delayed)');
    }
  }

  // Rule 4: Radiation dose documentation (optional but recommended)
  const hasDoseInfo = techniqueText.includes('dlp') ||
                      techniqueText.includes('ctdi') ||
                      techniqueText.includes('dose');
  
  if (!hasDoseInfo) {
    warnings.push('Consider documenting radiation dose metrics (DLP, CTDI)');
  }
}

/**
 * MRI-Specific Validation
 */
function validateMRI(report, errors, warnings) {
  const techniqueText = (report.technique || '').toLowerCase();
  const findingsText = (report.findingsText || '').toLowerCase();

  // Rule 1: Sequence documentation
  const hasT1 = techniqueText.includes('t1');
  const hasT2 = techniqueText.includes('t2');
  
  if (!hasT1 || !hasT2) {
    errors.push('MRI technique must document sequences performed (minimum: T1 and T2)');
  }

  // Rule 2: Gadolinium documentation consistency
  const hasGadolinium = techniqueText.includes('gadolinium') ||
                        techniqueText.includes('contrast') ||
                        techniqueText.includes('gd') ||
                        techniqueText.includes('t1+c') ||
                        techniqueText.includes('t1 +c');
  
  if (hasGadolinium) {
    const gadoliniumInFindings = findingsText.includes('gadolinium') ||
                                  findingsText.includes('contrast') ||
                                  findingsText.includes('enhancement') ||
                                  findingsText.includes('enhancing');
    
    if (!gadoliniumInFindings) {
      errors.push('Gadolinium mentioned in technique but not documented in findings (must describe enhancement pattern)');
    }
  }

  // Rule 3: Field strength documentation
  const hasFieldStrength = techniqueText.includes('1.5') ||
                           techniqueText.includes('3.0') ||
                           techniqueText.includes('tesla') ||
                           techniqueText.includes('3t') ||
                           techniqueText.includes('1.5t');
  
  if (!hasFieldStrength) {
    warnings.push('Consider documenting MRI field strength (1.5T or 3.0T)');
  }

  // Rule 4: STIR sequence for spine studies
  if (report.studyDescription && 
      (report.studyDescription.toLowerCase().includes('spine') ||
       report.bodyPart && report.bodyPart.toLowerCase().includes('spine'))) {
    const hasSTIR = techniqueText.includes('stir') ||
                    techniqueText.includes('short tau inversion recovery');
    
    if (!hasSTIR) {
      warnings.push('Consider including STIR sequence for comprehensive spine evaluation');
    }
  }
}

/**
 * X-Ray Specific Validation
 */
function validateXRay(report, errors, warnings) {
  const techniqueText = (report.technique || '').toLowerCase();

  // Rule 1: View documentation
  const hasViews = techniqueText.includes('ap') ||
                   techniqueText.includes('pa') ||
                   techniqueText.includes('lateral') ||
                   techniqueText.includes('oblique') ||
                   techniqueText.includes('view');
  
  if (!hasViews) {
    errors.push('X-ray technique must specify views obtained (e.g., AP, PA, lateral, oblique)');
  }

  // Rule 2: Minimum two views for extremities
  if (report.bodyPart && 
      (report.bodyPart.toLowerCase().includes('hand') ||
       report.bodyPart.toLowerCase().includes('wrist') ||
       report.bodyPart.toLowerCase().includes('foot') ||
       report.bodyPart.toLowerCase().includes('ankle') ||
       report.bodyPart.toLowerCase().includes('elbow') ||
       report.bodyPart.toLowerCase().includes('knee'))) {
    
    const viewCount = (techniqueText.match(/\b(ap|pa|lateral|oblique)\b/g) || []).length;
    
    if (viewCount < 2) {
      warnings.push('Extremity radiographs should include at least two orthogonal views');
    }
  }

  // Rule 3: Portable vs department documentation
  const hasLocation = techniqueText.includes('portable') ||
                      techniqueText.includes('bedside') ||
                      techniqueText.includes('department') ||
                      techniqueText.includes('upright');
  
  if (!hasLocation) {
    warnings.push('Consider documenting patient position/location (portable, upright, supine)');
  }
}

/**
 * Angiography/Fluoroscopy Specific Validation
 */
function validateAngiography(report, errors, warnings) {
  const techniqueText = (report.technique || '').toLowerCase();
  const findingsText = (report.findingsText || '').toLowerCase();

  // Rule 1: Access site documentation
  const hasAccessSite = techniqueText.includes('radial') ||
                        techniqueText.includes('femoral') ||
                        techniqueText.includes('brachial') ||
                        techniqueText.includes('access');
  
  if (!hasAccessSite) {
    errors.push('Angiography technique must document vascular access site (radial, femoral, etc.)');
  }

  // Rule 2: Contrast agent documentation
  const hasContrastAgent = techniqueText.includes('iohexol') ||
                           techniqueText.includes('iopamidol') ||
                           techniqueText.includes('iodixanol') ||
                           techniqueText.includes('contrast');
  
  if (!hasContrastAgent) {
    warnings.push('Consider documenting contrast agent type and volume');
  }

  // Rule 3: Fluoroscopy time documentation
  const hasFluoroTime = techniqueText.includes('minutes') ||
                        techniqueText.includes('fluoroscopy time') ||
                        techniqueText.includes('fluoro time');
  
  if (!hasFluoroTime) {
    errors.push('Fluoroscopy time must be documented for radiation safety compliance');
  }

  // Rule 4: Closure method for interventions
  if (report.procedureType && report.procedureType.toLowerCase() === 'interventional') {
    const hasClosure = techniqueText.includes('closure') ||
                       techniqueText.includes('hemostasis') ||
                       techniqueText.includes('manual compression') ||
                       techniqueText.includes('closure device');
    
    if (!hasClosure) {
      errors.push('Interventional procedures must document access site closure method');
    }
  }

  // Rule 5: Vessel assessment for coronary studies
  if (report.studyDescription && 
      report.studyDescription.toLowerCase().includes('coronary')) {
    const hasVesselAssessment = findingsText.includes('left main') ||
                                findingsText.includes('lad') ||
                                findingsText.includes('rca') ||
                                findingsText.includes('lcx');
    
    if (!hasVesselAssessment) {
      warnings.push('Coronary angiography should document all major vessels (LM, LAD, LCX, RCA)');
    }
  }
}

/**
 * Ultrasound Specific Validation
 */
function validateUltrasound(report, errors, warnings) {
  const techniqueText = (report.technique || '').toLowerCase();

  // Rule 1: Transducer frequency documentation
  const hasFrequency = techniqueText.includes('mhz') ||
                       techniqueText.includes('frequency') ||
                       techniqueText.includes('probe');
  
  if (!hasFrequency) {
    warnings.push('Consider documenting transducer frequency (e.g., 3.5 MHz, 7.5 MHz)');
  }

  // Rule 2: Fasting status for abdominal ultrasound
  if (report.bodyPart && report.bodyPart.toLowerCase().includes('abdomen')) {
    const hasFastingStatus = techniqueText.includes('fasting') ||
                             techniqueText.includes('npo') ||
                             techniqueText.includes('non-fasting');
    
    if (!hasFastingStatus) {
      warnings.push('Consider documenting fasting status for abdominal ultrasound');
    }
  }

  // Rule 3: Approach for pelvic ultrasound
  if (report.bodyPart && 
      (report.bodyPart.toLowerCase().includes('pelvis') ||
       report.bodyPart.toLowerCase().includes('uterus') ||
       report.bodyPart.toLowerCase().includes('ovary'))) {
    
    const hasApproach = techniqueText.includes('transabdominal') ||
                        techniqueText.includes('transvaginal') ||
                        techniqueText.includes('endovaginal');
    
    if (!hasApproach) {
      errors.push('Pelvic ultrasound must specify approach (transabdominal and/or transvaginal)');
    }

    const hasBladderStatus = techniqueText.includes('bladder') ||
                             techniqueText.includes('full') ||
                             techniqueText.includes('empty');
    
    if (!hasBladderStatus) {
      warnings.push('Consider documenting bladder status for pelvic ultrasound');
    }
  }

  // Rule 4: Doppler documentation
  const hasDoppler = techniqueText.includes('doppler') ||
                     techniqueText.includes('color flow') ||
                     techniqueText.includes('spectral');
  
  if (hasDoppler) {
    const findingsText = (report.findingsText || '').toLowerCase();
    const dopplerInFindings = findingsText.includes('flow') ||
                              findingsText.includes('doppler') ||
                              findingsText.includes('resistance');
    
    if (!dopplerInFindings) {
      warnings.push('Doppler technique mentioned but flow characteristics not documented in findings');
    }
  }
}

/**
 * Mammography Specific Validation (BI-RADS)
 */
function validateMammography(report, errors, warnings) {
  const techniqueText = (report.technique || '').toLowerCase();
  const findingsText = (report.findingsText || '').toLowerCase();
  const impressionText = (report.impression || '').toLowerCase();

  // Rule 1: Breast density documentation (BI-RADS requirement)
  const hasDensity = techniqueText.includes('density') ||
                     findingsText.includes('density') ||
                     findingsText.includes('bi-rads a') ||
                     findingsText.includes('bi-rads b') ||
                     findingsText.includes('bi-rads c') ||
                     findingsText.includes('bi-rads d');
  
  if (!hasDensity) {
    errors.push('Mammography report must document breast composition/density (BI-RADS A, B, C, or D)');
  }

  // Rule 2: Views documentation
  const hasViews = techniqueText.includes('cc') ||
                   techniqueText.includes('mlo') ||
                   techniqueText.includes('craniocaudal') ||
                   techniqueText.includes('mediolateral');
  
  if (!hasViews) {
    errors.push('Mammography technique must specify views obtained (CC, MLO)');
  }

  // Rule 3: Tomosynthesis documentation
  const hasTomosynthesis = techniqueText.includes('tomosynthesis') ||
                           techniqueText.includes('3d') ||
                           techniqueText.includes('dbt');
  
  if (hasTomosynthesis) {
    // Just a note, not required in findings
    console.log('Tomosynthesis documented');
  }

  // Rule 4: BI-RADS category in impression
  const hasBIRADS = impressionText.includes('bi-rads') ||
                    impressionText.includes('birads') ||
                    impressionText.includes('category');
  
  if (!hasBIRADS) {
    errors.push('Mammography impression must include BI-RADS assessment category (0-6)');
  }

  // Rule 5: Comparison required for screening
  if (report.procedureType && report.procedureType.toLowerCase() === 'screening') {
    if (!report.comparison || report.comparison.trim().length === 0) {
      warnings.push('Screening mammography should include comparison to prior studies when available');
    }
  }

  // Rule 6: Management recommendation
  const hasRecommendation = impressionText.includes('follow') ||
                            impressionText.includes('biopsy') ||
                            impressionText.includes('additional') ||
                            impressionText.includes('ultrasound') ||
                            impressionText.includes('routine');
  
  if (!hasRecommendation) {
    warnings.push('Consider including management recommendation based on BI-RADS category');
  }
}

/**
 * Get modality-specific validation preview (before signing)
 * @param {String} modality - Modality code
 * @returns {Object} Expected validation rules for the modality
 */
function getModalityValidationPreview(modality) {
  const preview = {
    modality: modality,
    requiredFields: ['impression', 'findings', 'technique'],
    warnings: [],
    specialRules: []
  };

  switch ((modality || '').toUpperCase()) {
    case 'CT':
      preview.specialRules.push('If contrast used, must document enhancement pattern in findings');
      preview.warnings.push('Slice thickness and contrast phase recommended');
      break;
    
    case 'MR':
    case 'MRI':
      preview.requiredFields.push('sequences (T1, T2)');
      preview.specialRules.push('If gadolinium used, must document enhancement pattern in findings');
      preview.warnings.push('Field strength (1.5T/3.0T) recommended');
      break;
    
    case 'CR':
    case 'DX':
      preview.requiredFields.push('views (AP, PA, lateral, etc.)');
      preview.warnings.push('Extremities should have at least 2 orthogonal views');
      break;
    
    case 'XA':
    case 'RF':
      preview.requiredFields.push('access site', 'fluoroscopy time');
      preview.specialRules.push('Interventional procedures must document closure method');
      preview.warnings.push('Contrast agent type and volume recommended');
      break;
    
    case 'US':
      preview.warnings.push('Transducer frequency recommended');
      preview.specialRules.push('Pelvic US must specify approach (transabdominal/transvaginal)');
      preview.warnings.push('Abdominal US: fasting status recommended');
      break;
    
    case 'MG':
    case 'DM':
      preview.requiredFields.push('breast density (BI-RADS A-D)', 'BI-RADS category', 'views (CC, MLO)');
      preview.specialRules.push('BI-RADS category required in impression');
      preview.warnings.push('Comparison to prior studies recommended for screening');
      break;
  }

  return preview;
}

module.exports = {
  validateReportForSigning,
  getModalityValidationPreview,
  // Individual validators exported for testing
  validateCT,
  validateMRI,
  validateXRay,
  validateAngiography,
  validateUltrasound,
  validateMammography
};
