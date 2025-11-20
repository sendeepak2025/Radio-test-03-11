/**
 * AI Assistant Service
 * Google Gemini Pro integration for intelligent report assistance
 * 
 * Features:
 * - Findings text analysis and suggestion
 * - Impression generation from findings
 * - Critical finding detection
 * - Template field auto-fill suggestions
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
let genAI = null;
let model = null;

// Initialize Gemini client
function initializeGemini() {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY not set. AI features will be disabled.');
    return false;
  }
  
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    console.log('✅ Google Gemini Pro initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Gemini:', error.message);
    return false;
  }
}

// Initialize on module load
const isInitialized = initializeGemini();

/**
 * Check if AI service is available
 */
function isAvailable() {
  return isInitialized && model !== null;
}

/**
 * Analyze findings text and generate suggestions
 * @param {string} findingsText - Raw findings text
 * @param {Object} context - Additional context (modality, body part, etc.)
 * @returns {Promise<Object>} Analysis results with suggestions
 */
async function analyzeFindingsText(findingsText, context = {}) {
  if (!isAvailable()) {
    throw new Error('AI service not available. Please configure GEMINI_API_KEY.');
  }

  if (!findingsText || findingsText.trim().length === 0) {
    return {
      suggestions: [],
      confidence: 0,
      message: 'No findings text provided'
    };
  }

  try {
    const prompt = buildAnalysisPrompt(findingsText, context);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse AI response
    const analysis = parseAnalysisResponse(text);

    return {
      suggestions: analysis.suggestions || [],
      improvements: analysis.improvements || [],
      confidence: analysis.confidence || 0.7,
      detectedFindings: analysis.findings || [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error analyzing findings:', error);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}

/**
 * Generate impression from findings text
 * @param {string} findingsText - Findings section text
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} Generated impression with confidence
 */
async function generateImpression(findingsText, context = {}) {
  if (!isAvailable()) {
    throw new Error('AI service not available. Please configure GEMINI_API_KEY.');
  }

  if (!findingsText || findingsText.trim().length === 0) {
    return {
      impression: '',
      confidence: 0,
      message: 'No findings provided'
    };
  }

  try {
    const prompt = buildImpressionPrompt(findingsText, context);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const impression = response.text();

    // Clean up impression text
    const cleanImpression = cleanupImpressionText(impression);

    return {
      impression: cleanImpression,
      confidence: 0.85,
      alternatives: extractAlternatives(impression),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating impression:', error);
    throw new Error(`Impression generation failed: ${error.message}`);
  }
}

/**
 * Detect critical findings in report
 * @param {Object} report - Full report object
 * @returns {Promise<Object>} Critical findings with severity
 */
async function detectCriticalFindings(report) {
  if (!isAvailable()) {
    return {
      criticalFindings: [],
      hasCritical: false,
      confidence: 0
    };
  }

  const findingsText = report.findingsText || report.sections?.findings || '';
  const impression = report.impression || report.sections?.impression || '';
  
  if (!findingsText && !impression) {
    return {
      criticalFindings: [],
      hasCritical: false,
      confidence: 0
    };
  }

  try {
    const prompt = buildCriticalFindingsPrompt(findingsText, impression, report);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse critical findings
    const findings = parseCriticalFindings(text);

    return {
      criticalFindings: findings,
      hasCritical: findings.length > 0,
      highestSeverity: findings.length > 0 ? Math.max(...findings.map(f => f.severity)) : 0,
      confidence: 0.8,
      requiresNotification: findings.some(f => f.severity >= 4),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error detecting critical findings:', error);
    return {
      criticalFindings: [],
      hasCritical: false,
      error: error.message
    };
  }
}

/**
 * Suggest auto-fill values for template fields
 * @param {Object} template - Report template
 * @param {Object} studyMetadata - Study metadata (modality, body part, etc.)
 * @returns {Promise<Object>} Field suggestions
 */
async function suggestTemplateFields(template, studyMetadata) {
  if (!isAvailable()) {
    return {
      suggestions: {},
      confidence: 0
    };
  }

  try {
    const prompt = buildTemplateFieldsPrompt(template, studyMetadata);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const suggestions = parseTemplateFieldSuggestions(text, template);

    return {
      suggestions,
      confidence: 0.75,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error suggesting template fields:', error);
    return {
      suggestions: {},
      error: error.message
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS - Prompt Building
// ============================================================================

function buildAnalysisPrompt(findingsText, context) {
  const { modality, bodyPart, clinicalHistory } = context;
  
  return `You are an expert radiologist assistant. Analyze the following findings text and provide suggestions for improvement.

Context:
- Modality: ${modality || 'Unknown'}
- Body Part: ${bodyPart || 'Unknown'}
- Clinical History: ${clinicalHistory || 'Not provided'}

Findings Text:
${findingsText}

Please provide:
1. Suggestions for more precise medical terminology
2. Missing details that should be included
3. Detected findings with anatomical locations
4. Confidence score (0-1)

Format your response as JSON:
{
  "suggestions": ["suggestion1", "suggestion2"],
  "improvements": ["improvement1", "improvement2"],
  "findings": [{"name": "finding", "location": "location", "severity": "mild|moderate|severe"}],
  "confidence": 0.8
}`;
}

function buildImpressionPrompt(findingsText, context) {
  const { modality, bodyPart, clinicalHistory } = context;
  
  return `You are an expert radiologist. Based on the following findings, generate a concise, professional impression.

Context:
- Modality: ${modality || 'Unknown'}
- Body Part: ${bodyPart || 'Unknown'}
- Clinical History: ${clinicalHistory || 'Not provided'}

Findings:
${findingsText}

Generate a numbered impression that:
1. Summarizes key findings
2. Addresses the clinical question
3. Uses standard radiology terminology
4. Is concise and actionable

Provide ONLY the impression text, numbered list format.`;
}

function buildCriticalFindingsPrompt(findingsText, impression, report) {
  const { modality, patientID } = report;
  
  return `You are a critical finding detection system. Analyze the report for urgent/critical findings that require immediate notification.

Modality: ${modality || 'Unknown'}
Patient ID: ${patientID || 'Unknown'} (for context only, DO NOT include in output)

Findings:
${findingsText}

Impression:
${impression}

Identify critical findings such as:
- Pneumothorax
- Large vessel injury
- Active hemorrhage
- Mass effect / midline shift
- Bowel perforation
- Acute fractures
- PE / DVT
- Acute stroke
- Malposition of tubes/lines

Format as JSON array:
[
  {
    "finding": "description",
    "severity": 1-5 (5=critical),
    "location": "anatomical location",
    "requiresImmediate": true/false
  }
]

If no critical findings, return: []`;
}

function buildTemplateFieldsPrompt(template, studyMetadata) {
  const { modality, bodyPart, studyDescription } = studyMetadata;
  
  return `You are a radiology template assistant. Suggest default values for template fields based on study metadata.

Template: ${template.name}
Modality: ${modality}
Body Part: ${bodyPart}
Study Description: ${studyDescription || 'Not provided'}

Template Sections:
${template.sections.map(s => `- ${s.title} (${s.id})`).join('\n')}

Provide brief, professional default text for each section appropriate for this study type.

Format as JSON:
{
  "section-id": "suggested text",
  ...
}`;
}

// ============================================================================
// HELPER FUNCTIONS - Response Parsing
// ============================================================================

function parseAnalysisResponse(text) {
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback: parse as plain text
    return {
      suggestions: text.split('\n').filter(line => line.trim().length > 0),
      confidence: 0.6
    };
  } catch (error) {
    console.error('Failed to parse analysis response:', error);
    return {
      suggestions: [],
      confidence: 0
    };
  }
}

function parseCriticalFindings(text) {
  try {
    // Try to extract JSON array
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const findings = JSON.parse(jsonMatch[0]);
      return findings.map(f => ({
        finding: f.finding || '',
        severity: f.severity || 3,
        location: f.location || '',
        requiresImmediate: f.requiresImmediate || false
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to parse critical findings:', error);
    return [];
  }
}

function parseTemplateFieldSuggestions(text, template) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {};
  } catch (error) {
    console.error('Failed to parse template field suggestions:', error);
    return {};
  }
}

function cleanupImpressionText(text) {
  // Remove JSON formatting if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Remove extra whitespace
  text = text.trim();
  
  // Ensure proper numbering
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let counter = 1;
  const numberedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.match(/^\d+\./)) {
      return trimmed;
    } else if (trimmed.match(/^[-*•]/)) {
      return `${counter++}. ${trimmed.replace(/^[-*•]\s*/, '')}`;
    } else {
      return `${counter++}. ${trimmed}`;
    }
  });
  
  return numberedLines.join('\n');
}

function extractAlternatives(text) {
  // Extract alternative phrasings from AI response
  const alternatives = [];
  const altPattern = /(?:alternatively|or|also consider):\s*([^\n]+)/gi;
  let match;
  
  while ((match = altPattern.exec(text)) !== null) {
    alternatives.push(match[1].trim());
  }
  
  return alternatives.slice(0, 3); // Max 3 alternatives
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  isAvailable,
  analyzeFindingsText,
  generateImpression,
  detectCriticalFindings,
  suggestTemplateFields
};
