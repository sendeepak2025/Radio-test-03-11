/**
 * Adaptive Learning Service for Template Selection
 * Learns from radiologist corrections and adjusts template weights automatically
 */

const ReportTemplate = require('../models/ReportTemplate');
const StructuredReport = require('../models/StructuredReport');

class AdaptiveLearningService {
  /**
   * Record template selection and track user acceptance
   * @param {String} studyInstanceUID - Study UID
   * @param {String} suggestedTemplateId - Auto-suggested template
   * @param {String} actualTemplateId - Template actually used by radiologist
   * @param {Object} studyMetadata - Study metadata used for suggestion
   */
  async recordTemplateSelection(studyInstanceUID, suggestedTemplateId, actualTemplateId, studyMetadata) {
    try {
      const suggested = await ReportTemplate.findOne({ templateId: suggestedTemplateId });
      const actual = await ReportTemplate.findOne({ templateId: actualTemplateId });

      if (!suggested || !actual) {
        console.warn('Template not found for learning');
        return;
      }

      const wasCorrect = suggestedTemplateId === actualTemplateId;

      // Record selection event
      const selectionEvent = {
        studyInstanceUID,
        suggestedTemplateId,
        actualTemplateId,
        wasCorrect,
        modality: studyMetadata.modality,
        bodyPart: studyMetadata.bodyPart,
        studyDescription: studyMetadata.studyDescription,
        timestamp: new Date()
      };

      // Store in template usage stats
      suggested.usageStats.selections = suggested.usageStats.selections || [];
      suggested.usageStats.selections.push(selectionEvent);

      // Keep only last 100 selections to prevent bloat
      if (suggested.usageStats.selections.length > 100) {
        suggested.usageStats.selections = suggested.usageStats.selections.slice(-100);
      }

      await suggested.save();

      // If incorrect, adjust weights
      if (!wasCorrect) {
        await this.adjustWeights(suggested, actual, studyMetadata);
      }

      console.log(`📊 Learning event recorded: ${wasCorrect ? '✓ Correct' : '✗ Corrected'} - ${suggestedTemplateId} → ${actualTemplateId}`);

    } catch (error) {
      console.error('❌ Error recording template selection:', error);
    }
  }

  /**
   * Adjust template weights based on user correction
   * @param {Object} suggestedTemplate - Template that was suggested but not used
   * @param {Object} actualTemplate - Template that was actually used
   * @param {Object} studyMetadata - Study metadata
   */
  async adjustWeights(suggestedTemplate, actualTemplate, studyMetadata) {
    try {
      // Analyze why the suggestion was wrong
      const analysis = this.analyzeIncorrectSuggestion(suggestedTemplate, actualTemplate, studyMetadata);

      console.log(`🔧 Adjusting weights for ${suggestedTemplate.templateId}:`, analysis.reason);

      // Decrease weights for factors that led to incorrect suggestion
      if (analysis.modalityMismatch) {
        suggestedTemplate.matchingWeights.modalityWeight = Math.max(
          30,
          suggestedTemplate.matchingWeights.modalityWeight - 5
        );
      }

      if (analysis.bodyPartMismatch) {
        suggestedTemplate.matchingWeights.bodyPartWeight = Math.max(
          20,
          suggestedTemplate.matchingWeights.bodyPartWeight - 3
        );
      }

      if (analysis.keywordMismatch) {
        suggestedTemplate.matchingWeights.keywordWeight = Math.max(
          2,
          suggestedTemplate.matchingWeights.keywordWeight - 1
        );
      }

      // Increase weights for actual template
      if (analysis.modalityMatch) {
        actualTemplate.matchingWeights.modalityWeight = Math.min(
          60,
          actualTemplate.matchingWeights.modalityWeight + 5
        );
      }

      if (analysis.bodyPartMatch) {
        actualTemplate.matchingWeights.bodyPartWeight = Math.min(
          40,
          actualTemplate.matchingWeights.bodyPartWeight + 3
        );
      }

      // Save adjusted weights
      await suggestedTemplate.save();
      await actualTemplate.save();

      console.log(`✅ Weights adjusted - Suggested template weights decreased, actual template weights increased`);

    } catch (error) {
      console.error('❌ Error adjusting weights:', error);
    }
  }

  /**
   * Analyze why suggestion was incorrect
   * @param {Object} suggestedTemplate - Suggested template
   * @param {Object} actualTemplate - Actual template used
   * @param {Object} studyMetadata - Study metadata
   * @returns {Object} Analysis result
   */
  analyzeIncorrectSuggestion(suggestedTemplate, actualTemplate, studyMetadata) {
    const analysis = {
      reason: '',
      modalityMismatch: false,
      bodyPartMismatch: false,
      keywordMismatch: false,
      modalityMatch: false,
      bodyPartMatch: false
    };

    // Check modality
    const suggestedModalities = suggestedTemplate.matchingCriteria.modalities || [];
    const actualModalities = actualTemplate.matchingCriteria.modalities || [];

    if (!suggestedModalities.includes(studyMetadata.modality) && 
        actualModalities.includes(studyMetadata.modality)) {
      analysis.modalityMismatch = true;
      analysis.modalityMatch = true;
      analysis.reason += 'Modality mismatch; ';
    }

    // Check body part
    const suggestedBodyParts = suggestedTemplate.matchingCriteria.bodyParts || [];
    const actualBodyParts = actualTemplate.matchingCriteria.bodyParts || [];
    const bodyPartUpper = (studyMetadata.bodyPart || '').toUpperCase();

    const suggestedBodyPartMatch = suggestedBodyParts.some(bp => 
      bodyPartUpper.includes(bp.toUpperCase()) || bp.toUpperCase().includes(bodyPartUpper)
    );

    const actualBodyPartMatch = actualBodyParts.some(bp =>
      bodyPartUpper.includes(bp.toUpperCase()) || bp.toUpperCase().includes(bodyPartUpper)
    );

    if (!suggestedBodyPartMatch && actualBodyPartMatch) {
      analysis.bodyPartMismatch = true;
      analysis.bodyPartMatch = true;
      analysis.reason += 'Body part mismatch; ';
    }

    // Check keywords
    const studyDesc = (studyMetadata.studyDescription || '').toLowerCase();
    const suggestedKeywords = suggestedTemplate.matchingCriteria.keywords || [];
    const actualKeywords = actualTemplate.matchingCriteria.keywords || [];

    const suggestedKeywordMatches = suggestedKeywords.filter(kw => studyDesc.includes(kw.toLowerCase())).length;
    const actualKeywordMatches = actualKeywords.filter(kw => studyDesc.includes(kw.toLowerCase())).length;

    if (actualKeywordMatches > suggestedKeywordMatches) {
      analysis.keywordMismatch = true;
      analysis.reason += `Keyword match difference (actual: ${actualKeywordMatches}, suggested: ${suggestedKeywordMatches}); `;
    }

    if (!analysis.reason) {
      analysis.reason = 'User preference override';
    }

    return analysis;
  }

  /**
   * Get template accuracy statistics
   * @param {String} templateId - Template ID (optional, for specific template)
   * @returns {Promise<Object>} Accuracy statistics
   */
  async getAccuracyStatistics(templateId = null) {
    try {
      let query = { active: true };
      if (templateId) {
        query.templateId = templateId;
      }

      const templates = await ReportTemplate.find(query);

      const stats = templates.map(template => {
        const selections = template.usageStats.selections || [];
        const totalSelections = selections.length;
        const correctSelections = selections.filter(s => s.wasCorrect).length;
        const accuracy = totalSelections > 0 ? (correctSelections / totalSelections * 100).toFixed(2) : 0;

        return {
          templateId: template.templateId,
          name: template.name,
          totalSelections,
          correctSelections,
          incorrectSelections: totalSelections - correctSelections,
          accuracy: `${accuracy}%`,
          currentWeights: template.matchingWeights
        };
      });

      return {
        templates: stats,
        overall: {
          totalTemplates: templates.length,
          averageAccuracy: stats.reduce((sum, s) => sum + parseFloat(s.accuracy), 0) / stats.length || 0
        }
      };

    } catch (error) {
      console.error('❌ Error getting accuracy statistics:', error);
      throw error;
    }
  }

  /**
   * Analyze user behavior patterns
   * @param {String} userId - User ID
   * @returns {Promise<Object>} User preferences and patterns
   */
  async analyzeUserPatterns(userId) {
    try {
      // Get reports created by this user
      const reports = await StructuredReport.find({
        radiologistId: userId
      }).select('templateId modality bodyPart studyDescription').limit(100);

      if (reports.length === 0) {
        return {
          userId,
          reportCount: 0,
          patterns: {}
        };
      }

      // Analyze template preferences
      const templateUsage = {};
      const modalityPreferences = {};
      const bodyPartPreferences = {};

      reports.forEach(report => {
        // Template frequency
        templateUsage[report.templateId] = (templateUsage[report.templateId] || 0) + 1;

        // Modality frequency
        if (report.modality) {
          modalityPreferences[report.modality] = (modalityPreferences[report.modality] || 0) + 1;
        }

        // Body part frequency
        if (report.bodyPart) {
          bodyPartPreferences[report.bodyPart] = (bodyPartPreferences[report.bodyPart] || 0) + 1;
        }
      });

      // Find most used template
      const sortedTemplates = Object.entries(templateUsage).sort((a, b) => b[1] - a[1]);
      const mostUsedTemplate = sortedTemplates[0];

      // Find specialty based on modality preferences
      const sortedModalities = Object.entries(modalityPreferences).sort((a, b) => b[1] - a[1]);
      const primaryModality = sortedModalities[0];

      return {
        userId,
        reportCount: reports.length,
        patterns: {
          mostUsedTemplate: {
            templateId: mostUsedTemplate[0],
            count: mostUsedTemplate[1],
            percentage: ((mostUsedTemplate[1] / reports.length) * 100).toFixed(2) + '%'
          },
          primaryModality: {
            modality: primaryModality[0],
            count: primaryModality[1],
            percentage: ((primaryModality[1] / reports.length) * 100).toFixed(2) + '%'
          },
          templateDistribution: Object.fromEntries(sortedTemplates.map(([tid, count]) => [
            tid,
            {
              count,
              percentage: ((count / reports.length) * 100).toFixed(2) + '%'
            }
          ])),
          modalityDistribution: modalityPreferences,
          bodyPartDistribution: bodyPartPreferences
        }
      };

    } catch (error) {
      console.error('❌ Error analyzing user patterns:', error);
      throw error;
    }
  }

  /**
   * Reset template weights to defaults
   * @param {String} templateId - Template ID
   */
  async resetWeights(templateId) {
    try {
      const template = await ReportTemplate.findOne({ templateId });

      if (!template) {
        throw new Error('Template not found');
      }

      // Reset to default weights
      template.matchingWeights = {
        modalityWeight: 50,
        bodyPartWeight: 30,
        keywordWeight: 5,
        procedureTypeWeight: 15
      };

      // Clear selection history
      template.usageStats.selections = [];

      await template.save();

      console.log(`✅ Weights reset for template: ${template.name}`);

      return template;

    } catch (error) {
      console.error('❌ Error resetting weights:', error);
      throw error;
    }
  }
}

module.exports = new AdaptiveLearningService();
