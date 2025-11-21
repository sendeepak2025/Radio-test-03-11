/**
 * Report Validation Utility
 * Validates reports before signing based on template rules
 */

class ReportValidator {
  
  /**
   * Validate report against template requirements
   */
  validateReport(report, template) {
    const errors = [];
    const warnings = [];
    
    if (!template) {
      errors.push({
        field: 'template',
        message: 'Template not found',
        severity: 'error'
      });
      return { errors, warnings, valid: false };
    }
    
    // ✅ FIX: Check if template.sections exists and is an array
    if (!template.sections || !Array.isArray(template.sections)) {
      // If no sections defined, skip section validation but don't error
      console.warn('Template has no sections array, skipping section validation');
      return {
        valid: true,
        errors: [],
        warnings: [{
          field: 'template',
          message: 'Template has no sections defined',
          severity: 'warning'
        }]
      };
    }
    
    // Validate each section
    template.sections.forEach(section => {
      // Get section content from either sections object or top-level field
      const sectionContent = report.sections?.[section.id] || report[section.id] || '';
      
      // Required field check
      if (section.required && !sectionContent.trim()) {
        errors.push({
          field: section.id,
          message: `${section.title} is required`,
          severity: 'error'
        });
      }
      
      // Custom validation rules
      if (section.validationRules && sectionContent) {
        const sectionErrors = this.validateSection(
          section.id,
          sectionContent,
          section.validationRules,
          report
        );
        errors.push(...sectionErrors.errors);
        warnings.push(...sectionErrors.warnings);
      }
    });
    
    // Check for critical findings
    const criticalWarnings = this.checkCriticalFindings(report);
    warnings.push(...criticalWarnings);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Validate individual section based on rules
   */
  validateSection(sectionId, content, rules, report) {
    const errors = [];
    const warnings = [];
    
    // Minimum findings check
    if (rules.minimumFindings) {
      const missingFindings = rules.minimumFindings.filter(finding =>
        !content.toLowerCase().includes(finding.toLowerCase())
      );
      
      if (missingFindings.length > 0) {
        warnings.push({
          field: sectionId,
          message: `Consider documenting: ${missingFindings.join(', ')}`,
          severity: 'warning',
          missingItems: missingFindings
        });
      }
    }
    
    // Spine: Level-by-level check
    if (rules.requireLevelByLevel && rules.minimumLevels) {
      const missingLevels = rules.minimumLevels.filter(level =>
        !content.includes(level)
      );
      
      if (missingLevels.length > 0) {
        errors.push({
          field: sectionId,
          message: `Missing spine level documentation: ${missingLevels.join(', ')}`,
          severity: 'error',
          missingItems: missingLevels
        });
      }
    }
    
    // CTPA: PE assessment check
    if (rules.requirePEAssessment) {
      const hasPEStatement = /pulmonary embol|no pe|pe present|pe absent|no filling defect/i.test(content);
      
      if (!hasPEStatement) {
        errors.push({
          field: sectionId,
          message: 'Pulmonary embolism assessment required for CTPA',
          severity: 'error'
        });
      }
    }
    
    // CTPA: RV assessment check
    if (rules.requireRVAssessment) {
      const hasRVStatement = /right ventricle|rv|right heart|rv\/lv ratio/i.test(content);
      
      if (!hasRVStatement) {
        errors.push({
          field: sectionId,
          message: 'Right ventricle assessment required for CTPA',
          severity: 'error'
        });
      }
    }
    
    // Contrast documentation check
    if (rules.requireContrastDocumentation) {
      const hasContrast = /contrast|non-contrast|without contrast|with contrast/i.test(content);
      
      if (!hasContrast) {
        warnings.push({
          field: sectionId,
          message: 'Consider documenting contrast administration',
          severity: 'warning'
        });
      }
    }
    
    // MRI sequences check
    if (rules.requireSequences) {
      const missingSequences = rules.requireSequences.filter(seq =>
        !content.toLowerCase().includes(seq.toLowerCase())
      );
      
      if (missingSequences.length > 0) {
        warnings.push({
          field: sectionId,
          message: `Consider documenting sequences: ${missingSequences.join(', ')}`,
          severity: 'warning'
        });
      }
    }
    
    // Chest X-Ray: View documentation check
    if (rules.requireViewDocumentation) {
      const hasView = /\b(pa|ap|lateral|lordotic|decubitus|expiratory|portable)\b/i.test(content);
      
      if (!hasView) {
        errors.push({
          field: sectionId,
          message: 'View documentation required (e.g., PA, lateral, AP portable)',
          severity: 'error'
        });
      }
    }
    
    // Chest X-Ray: Minimum views check
    if (rules.minimumViews && rules.minimumViews > 0) {
      const viewMatches = content.match(/\b(pa|ap|lateral|lordotic|decubitus|expiratory)\b/gi);
      const uniqueViews = viewMatches ? [...new Set(viewMatches.map(v => v.toLowerCase()))] : [];
      
      if (uniqueViews.length < rules.minimumViews) {
        warnings.push({
          field: sectionId,
          message: `At least ${rules.minimumViews} view(s) recommended for complete examination`,
          severity: 'warning'
        });
      }
    }
    
    // Chest X-Ray: Systematic review check
    if (rules.requireSystemicReview) {
      const requiredSystems = ['lung', 'heart', 'mediastinum', 'pleura', 'bone'];
      const missingSystems = requiredSystems.filter(system =>
        !content.toLowerCase().includes(system)
      );
      
      if (missingSystems.length > 0) {
        warnings.push({
          field: sectionId,
          message: `Systematic review incomplete. Consider documenting: ${missingSystems.join(', ')}`,
          severity: 'warning',
          missingItems: missingSystems
        });
      }
    }
    
    return { errors, warnings };
  }
  
  /**
   * Check for undocumented critical findings
   */
  checkCriticalFindings(report) {
    const warnings = [];
    
    const criticalKeywords = [
      { keyword: 'hemorrhage', category: 'Intracranial Hemorrhage' },
      { keyword: 'embolism', category: 'Pulmonary Embolism' },
      { keyword: 'pneumothorax', category: 'Pneumothorax' },
      { keyword: 'tension pneumothorax', category: 'Tension Pneumothorax' },
      { keyword: 'aortic dissection', category: 'Aortic Dissection' },
      { keyword: 'bowel perforation', category: 'Bowel Perforation' },
      { keyword: 'acute stroke', category: 'Acute Stroke' },
      { keyword: 'acute infarct', category: 'Acute Infarct' },
      { keyword: 'fracture', category: 'Fracture' },
      { keyword: 'free air', category: 'Pneumoperitoneum' },
      { keyword: 'ruptured', category: 'Organ Rupture' },
      { keyword: 'large effusion', category: 'Large Pleural Effusion' },
      { keyword: 'massive effusion', category: 'Massive Pleural Effusion' },
      { keyword: 'mediastinal widening', category: 'Mediastinal Widening' },
      { keyword: 'wide mediastinum', category: 'Widened Mediastinum' },
      { keyword: 'pulmonary edema', category: 'Pulmonary Edema' },
      { keyword: 'acute chf', category: 'Acute CHF' },
      { keyword: 'ett malposition', category: 'ETT Malposition' },
      { keyword: 'tube malposition', category: 'Tube Malposition' },
      { keyword: 'line malposition', category: 'Line Malposition' }
    ];
    
    // Get findings text from sections or top-level fields
    // Handle both string (findingsText) and array (findings) formats
    let findingsText = '';
    if (report.sections?.findings) {
      findingsText = report.sections.findings;
    } else if (report.findingsText) {
      findingsText = report.findingsText;
    } else if (Array.isArray(report.findings)) {
      // If findings is an array, extract descriptions
      findingsText = report.findings.map(f => f.description || '').join(' ');
    } else if (typeof report.findings === 'string') {
      findingsText = report.findings;
    }
    
    const impression = report.sections?.impression || report.impression || '';
    const combinedText = `${findingsText} ${impression}`.toLowerCase();
    
    criticalKeywords.forEach(({ keyword, category }) => {
      if (combinedText.includes(keyword.toLowerCase())) {
        // Check if documented in criticalFindings array
        const documented = report.criticalFindings?.some(finding =>
          finding.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (!documented) {
          warnings.push({
            field: 'criticalFindings',
            message: `Possible critical finding detected: "${category}". Consider adding to critical findings list.`,
            severity: 'warning',
            suggestion: `Add "${category}" to critical findings and document communication`
          });
        }
      }
    });
    
    return warnings;
  }
  
  /**
   * Pre-sign validation (strict)
   */
  validateForSigning(report, template) {
    const validation = this.validateReport(report, template);
    
    // Additional signing requirements
    const signingErrors = [];
    
    // Only check fields that exist in the template
    // If template exists, rely on template validation
    // If no template, check standard fields
    
    if (template && template.sections) {
      // Template-based report: validation already done by validateReport
      // No additional checks needed - template defines what's required
      console.log('✅ Template-based validation: Using template section requirements');
    } else {
      // Non-template report: Check standard fields
      console.log('✅ Non-template validation: Checking standard fields');
      
      // Check findings field (supports sections, findingsText, and findings array)
      let findingsContent = '';
      if (report.sections?.findings) {
        findingsContent = report.sections.findings;
      } else if (report.findingsText) {
        findingsContent = report.findingsText;
      } else if (Array.isArray(report.findings) && report.findings.length > 0) {
        // If findings is an array with items, extract descriptions
        findingsContent = report.findings.map(f => f.description || '').join(' ');
      } else if (typeof report.findings === 'string') {
        findingsContent = report.findings;
      }
      
      if (findingsContent.trim().length < 10) {
        signingErrors.push({
          field: 'findings',
          message: 'Findings section must have meaningful content (at least 10 characters)',
          severity: 'error',
          suggestion: 'Add detailed findings or use "No significant findings" if appropriate'
        });
      }
      
      // Check impression (from sections or top-level)
      const impressionContent = report.sections?.impression || report.impression || '';
      if (impressionContent.trim().length < 5) {
        signingErrors.push({
          field: 'impression',
          message: 'Impression is required for signing (at least 5 characters)',
          severity: 'error',
          suggestion: 'Provide a clear diagnostic impression or conclusion'
        });
      }
    }
    
    return {
      ...validation,
      errors: [...validation.errors, ...signingErrors],
      valid: validation.errors.length === 0 && signingErrors.length === 0
    };
  }
}

module.exports = new ReportValidator();
