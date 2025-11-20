/**
 * AI-Assisted Template Generator
 * Generates report template structures using AI based on modality and body part
 */

class TemplateAIGenerator {
  constructor() {
    this.modalityKnowledge = {
      'CT': {
        sections: ['Indication', 'Technique', 'Comparison', 'Findings', 'Impression'],
        commonBodyParts: ['Chest', 'Abdomen', 'Head', 'Spine', 'Pelvis'],
        techDetails: 'CT examination performed with/without IV contrast'
      },
      'MRI': {
        sections: ['Indication', 'Technique', 'Comparison', 'Findings', 'Impression'],
        commonBodyParts: ['Brain', 'Spine', 'Knee', 'Shoulder', 'Abdomen'],
        techDetails: 'MRI examination performed on [field strength] Tesla scanner'
      },
      'X-Ray': {
        sections: ['Indication', 'Technique', 'Comparison', 'Findings', 'Impression'],
        commonBodyParts: ['Chest', 'Abdomen', 'Extremities', 'Spine'],
        techDetails: 'Digital radiography performed'
      },
      'Ultrasound': {
        sections: ['Indication', 'Technique', 'Findings', 'Impression'],
        commonBodyParts: ['Abdomen', 'Pelvis', 'Vascular', 'Obstetric'],
        techDetails: 'Ultrasound examination performed with [probe type]'
      },
      'Mammography': {
        sections: ['Indication', 'Technique', 'Comparison', 'Findings', 'BI-RADS Assessment', 'Impression'],
        commonBodyParts: ['Breast'],
        techDetails: 'Digital mammography performed'
      }
    };
  }

  /**
   * Generate template structure based on modality and body part
   */
  async generateTemplate(params) {
    const {
      modality,
      bodyPart,
      includeTechnique = true,
      includeComparison = true,
      customSections = [],
      aiEnhanced = true
    } = params;

    const modalityInfo = this.modalityKnowledge[modality] || this.modalityKnowledge['X-Ray'];
    
    const sections = [];
    let sectionId = 1;

    // Indication
    sections.push({
      id: `section_${sectionId++}`,
      title: 'Indication',
      placeholder: 'Clinical indication for the study',
      required: true,
      type: 'text'
    });

    // Technique (optional)
    if (includeTechnique) {
      sections.push({
        id: `section_${sectionId++}`,
        title: 'Technique',
        placeholder: modalityInfo.techDetails || 'Description of imaging technique',
        required: false,
        type: 'text'
      });
    }

    // Comparison (optional)
    if (includeComparison) {
      sections.push({
        id: `section_${sectionId++}`,
        title: 'Comparison',
        placeholder: 'Comparison studies if available',
        required: false,
        type: 'text'
      });
    }

    // Body part specific findings
    const findingsSection = this.generateFindingsSection(modality, bodyPart, sectionId++);
    sections.push(findingsSection);

    // Impression
    sections.push({
      id: `section_${sectionId++}`,
      title: 'Impression',
      placeholder: 'Summary and diagnostic impression',
      required: true,
      type: 'text'
    });

    // BI-RADS for mammography
    if (modality === 'Mammography') {
      sections.push({
        id: `section_${sectionId++}`,
        title: 'BI-RADS Assessment',
        placeholder: 'Select BI-RADS category',
        required: true,
        type: 'select',
        options: [
          'BI-RADS 0 - Incomplete',
          'BI-RADS 1 - Negative',
          'BI-RADS 2 - Benign',
          'BI-RADS 3 - Probably Benign',
          'BI-RADS 4 - Suspicious',
          'BI-RADS 5 - Highly Suggestive of Malignancy',
          'BI-RADS 6 - Known Biopsy-Proven Malignancy'
        ]
      });
    }

    // Add custom sections
    customSections.forEach((customSection, idx) => {
      sections.push({
        id: `section_${sectionId++}`,
        ...customSection
      });
    });

    return {
      sections,
      metadata: {
        totalSections: sections.length,
        requiredSections: sections.filter(s => s.required).length,
        optionalSections: sections.filter(s => !s.required).length,
        hasAIAssist: aiEnhanced,
        aiModelVersion: '1.0'
      },
      suggestions: this.generateSuggestions(modality, bodyPart)
    };
  }

  /**
   * Generate findings section based on body part
   */
  generateFindingsSection(modality, bodyPart, sectionId) {
    const bodyPartLower = (bodyPart || '').toLowerCase();
    
    const subsections = [];
    let subsectionId = 1;

    // Chest-specific
    if (bodyPartLower.includes('chest') || bodyPartLower.includes('thorax')) {
      subsections.push(
        {
          id: `subsection_${subsectionId++}`,
          title: 'Lungs and Airways',
          placeholder: 'Describe lung parenchyma, airways, and any abnormalities',
          required: false,
          type: 'text'
        },
        {
          id: `subsection_${subsectionId++}`,
          title: 'Heart and Mediastinum',
          placeholder: 'Describe cardiac size, mediastinal contours',
          required: false,
          type: 'text'
        },
        {
          id: `subsection_${subsectionId++}`,
          title: 'Pleura',
          placeholder: 'Describe pleural spaces',
          required: false,
          type: 'text'
        },
        {
          id: `subsection_${subsectionId++}`,
          title: 'Bones',
          placeholder: 'Describe visualized osseous structures',
          required: false,
          type: 'text'
        }
      );
    }
    // Abdomen-specific
    else if (bodyPartLower.includes('abdomen')) {
      subsections.push(
        {
          id: `subsection_${subsectionId++}`,
          title: 'Liver',
          placeholder: 'Describe liver size, contour, and parenchyma',
          required: false,
          type: 'text'
        },
        {
          id: `subsection_${subsectionId++}`,
          title: 'Gallbladder and Biliary Tree',
          placeholder: 'Describe gallbladder and bile ducts',
          required: false,
          type: 'text'
        },
        {
          id: `subsection_${subsectionId++}`,
          title: 'Pancreas and Spleen',
          placeholder: 'Describe pancreas and spleen',
          required: false,
          type: 'text'
        },
        {
          id: `subsection_${subsectionId++}`,
          title: 'Kidneys and Adrenals',
          placeholder: 'Describe kidneys and adrenal glands',
          required: false,
          type: 'text'
        },
        {
          id: `subsection_${subsectionId++}`,
          title: 'Bowel and Mesentery',
          placeholder: 'Describe bowel and mesentery',
          required: false,
          type: 'text'
        }
      );
    }
    // Brain-specific
    else if (bodyPartLower.includes('brain') || bodyPartLower.includes('head')) {
      subsections.push(
        {
          id: `subsection_${subsectionId++}`,
          title: 'Brain Parenchyma',
          placeholder: 'Describe brain parenchyma and any lesions',
          required: false,
          type: 'text'
        },
        {
          id: `subsection_${subsectionId++}`,
          title: 'Ventricles and CSF Spaces',
          placeholder: 'Describe ventricular system and CSF spaces',
          required: false,
          type: 'text'
        },
        {
          id: `subsection_${subsectionId++}`,
          title: 'Extra-axial Spaces',
          placeholder: 'Describe extra-axial spaces',
          required: false,
          type: 'text'
        },
        {
          id: `subsection_${subsectionId++}`,
          title: 'Skull Base and Calvarium',
          placeholder: 'Describe skull base and calvarium',
          required: false,
          type: 'text'
        }
      );
    }
    // Generic findings for other body parts
    else {
      subsections.push({
        id: `subsection_${subsectionId++}`,
        title: 'Detailed Findings',
        placeholder: `Detailed description of ${bodyPart || 'examined area'}`,
        required: false,
        type: 'text'
      });
    }

    return {
      id: `section_${sectionId}`,
      title: 'Findings',
      placeholder: 'Overall findings',
      required: true,
      type: 'composite',
      subsections
    };
  }

  /**
   * Generate template suggestions
   */
  generateSuggestions(modality, bodyPart) {
    return {
      relatedTemplates: this.getRelatedTemplates(modality, bodyPart),
      commonPhrases: this.getCommonPhrases(modality, bodyPart),
      criticalFindings: this.getCriticalFindings(modality, bodyPart)
    };
  }

  /**
   * Get related template suggestions
   */
  getRelatedTemplates(modality, bodyPart) {
    const templates = [];
    const modalityInfo = this.modalityKnowledge[modality];
    
    if (modalityInfo && modalityInfo.commonBodyParts) {
      modalityInfo.commonBodyParts.forEach(part => {
        if (part !== bodyPart) {
          templates.push({
            modality,
            bodyPart: part,
            similarity: this.calculateSimilarity(bodyPart, part)
          });
        }
      });
    }

    return templates.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  }

  /**
   * Get common phrases for modality/body part
   */
  getCommonPhrases(modality, bodyPart) {
    const phrases = {
      'CT-Chest': [
        'No acute pulmonary abnormality',
        'Lungs are clear without focal consolidation',
        'No pleural effusion or pneumothorax',
        'Heart size is within normal limits'
      ],
      'X-Ray-Chest': [
        'Heart size is normal',
        'Lungs are clear',
        'No acute cardiopulmonary process',
        'No pleural effusion or pneumothorax'
      ],
      'MRI-Brain': [
        'No acute intracranial abnormality',
        'No mass effect or midline shift',
        'Ventricles and sulci are normal in size',
        'No abnormal enhancement'
      ]
    };

    const key = `${modality}-${bodyPart}`;
    return phrases[key] || [];
  }

  /**
   * Get critical findings checklist
   */
  getCriticalFindings(modality, bodyPart) {
    const findings = {
      'CT-Chest': [
        'Pulmonary embolism',
        'Pneumothorax',
        'Aortic dissection',
        'Large pleural effusion'
      ],
      'X-Ray-Chest': [
        'Tension pneumothorax',
        'Large pneumothorax',
        'Widened mediastinum',
        'Free air under diaphragm'
      ],
      'MRI-Brain': [
        'Acute stroke',
        'Mass with significant mass effect',
        'Hemorrhage',
        'Herniation'
      ]
    };

    const key = `${modality}-${bodyPart}`;
    return findings[key] || [];
  }

  /**
   * Calculate similarity between body parts
   */
  calculateSimilarity(part1, part2) {
    if (!part1 || !part2) return 0;
    
    const p1 = part1.toLowerCase();
    const p2 = part2.toLowerCase();
    
    if (p1 === p2) return 1.0;
    
    const groups = {
      thoracic: ['chest', 'thorax', 'lung', 'heart'],
      abdominal: ['abdomen', 'liver', 'kidney', 'pelvis'],
      neurological: ['brain', 'head', 'spine', 'neck'],
      musculoskeletal: ['knee', 'shoulder', 'hip', 'extremity']
    };

    for (const group of Object.values(groups)) {
      if (group.includes(p1) && group.includes(p2)) {
        return 0.7;
      }
    }

    return 0.3;
  }

  /**
   * Validate generated template
   */
  validateTemplate(template) {
    const errors = [];
    const warnings = [];

    if (!template.sections || template.sections.length === 0) {
      errors.push('Template must have at least one section');
    }

    const hasIndication = template.sections.some(s => 
      s.title.toLowerCase().includes('indication')
    );
    if (!hasIndication) {
      warnings.push('Template should include an Indication section');
    }

    const hasImpression = template.sections.some(s => 
      s.title.toLowerCase().includes('impression')
    );
    if (!hasImpression) {
      warnings.push('Template should include an Impression section');
    }

    const hasFindings = template.sections.some(s => 
      s.title.toLowerCase().includes('findings')
    );
    if (!hasFindings) {
      warnings.push('Template should include a Findings section');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = new TemplateAIGenerator();
