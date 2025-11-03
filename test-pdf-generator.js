/**
 * Test Professional PDF Generator
 * Generates sample medical reports to verify PDF generation
 */

const ProfessionalPDFGenerator = require('./server/src/utils/professionalPDFGenerator');
const path = require('path');
const fs = require('fs');

// Sample report data
const sampleReportData = {
  reportId: 'SR-TEST-2025-001',
  patientName: 'John Doe',
  patientID: 'P12345',
  studyInstanceUID: '1.2.840.113619.2.55.3.TEST12345',
  modality: 'XA',
  studyDescription: 'Coronary Angiography',
  studyDate: '2025-10-27',
  radiologistName: 'Dr. Jane Smith',
  reportDate: new Date(),
  reportStatus: 'draft',
  version: '1.0',
  
  stats: {
    totalFrames: 3,
    averageConfidence: 0.87,
    mostCommonFinding: 'Normal coronary arteries',
    mostCommonFindingCount: 2,
    criticalFindings: [],
    servicesUsed: ['MedSigLIP (Hugging Face)', 'MedGemma (Google Gemini)'],
    classificationDistribution: [
      { label: 'Normal coronary arteries', count: 2, percentage: 66.7 },
      { label: 'Mild stenosis', count: 1, percentage: 33.3 }
    ],
    highestConfidence: { score: 0.92, frameIndex: 0 },
    lowestConfidence: { score: 0.78, frameIndex: 2 }
  },

  frames: [
    {
      frameIndex: 0,
      timestamp: new Date(),
      classification: {
        label: 'Normal coronary arteries',
        confidence: 0.92
      },
      report: {
        findings: 'The coronary angiography demonstrates normal coronary arteries with no significant stenosis. Left main coronary artery is patent. Left anterior descending artery shows normal flow with no obstructive lesions. Circumflex artery appears normal. Right coronary artery is dominant and shows normal caliber throughout.',
        impression: 'Normal coronary angiography. No significant coronary artery disease detected.',
        recommendations: [
          'Continue current medical management',
          'Risk factor modification including diet and exercise',
          'Follow-up as clinically indicated'
        ]
      },
      imageSnapshot: {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        caption: 'Frame 0 - Normal coronary arteries'
      }
    },
    {
      frameIndex: 1,
      timestamp: new Date(),
      classification: {
        label: 'Normal coronary arteries',
        confidence: 0.89
      },
      report: {
        findings: 'Continued evaluation of the coronary circulation shows patent vessels. No evidence of plaque formation or luminal narrowing. TIMI 3 flow observed in all major epicardial vessels. Myocardial blush grade is normal.',
        impression: 'Continued normal appearance of coronary arteries.',
        recommendations: [
          'Maintain current cardiovascular risk reduction strategies',
          'Annual cardiovascular risk assessment'
        ]
      },
      imageSnapshot: {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        caption: 'Frame 1 - Normal coronary arteries'
      }
    },
    {
      frameIndex: 2,
      timestamp: new Date(),
      classification: {
        label: 'Mild stenosis',
        confidence: 0.78
      },
      report: {
        findings: 'Mild stenosis noted in the proximal right coronary artery, estimated at 30-40% narrowing. The lesion appears to be non-calcified and smooth in contour. Distal vessel fills normally with preserved TIMI 3 flow. No other significant lesions identified.',
        impression: 'Mild non-obstructive coronary artery disease in the proximal RCA.',
        recommendations: [
          'Medical management with statin therapy',
          'Antiplatelet therapy as appropriate',
          'Aggressive risk factor modification',
          'Consider repeat angiography if symptoms develop'
        ]
      },
      imageSnapshot: {
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        caption: 'Frame 2 - Mild stenosis in RCA'
      }
    }
  ]
};

// Sample QA results
const sampleQAResults = {
  passed: true,
  score: 85,
  maxScore: 100,
  percentage: "85.0",
  grade: "Good",
  checks: [
    {
      name: 'Frame Processing Validation',
      passed: true,
      points: 18,
      maxPoints: 20,
      details: ['✅ 3 frame(s) processed', '✅ All frames have AI service attribution']
    },
    {
      name: 'Required Data Fields',
      passed: true,
      points: 20,
      maxPoints: 20,
      details: ['✅ studyInstanceUID present', '✅ patientID present', '✅ reportDate present', '✅ radiologistName present']
    },
    {
      name: 'Confidence Score Validation',
      passed: true,
      points: 15,
      maxPoints: 15,
      details: ['✅ 3 valid confidence score(s)']
    },
    {
      name: 'Timestamp Validation',
      passed: true,
      points: 10,
      maxPoints: 10,
      details: ['✅ Valid report date', '✅ All frame timestamps valid']
    },
    {
      name: 'Image Data Validation',
      passed: true,
      points: 12,
      maxPoints: 15,
      details: ['✅ 3 frame(s) with images']
    },
    {
      name: 'Clinical Data Validation',
      passed: true,
      points: 15,
      maxPoints: 15,
      details: ['✅ Findings text present', '✅ Impression present', '✅ Technique documented']
    },
    {
      name: 'Metadata Validation',
      passed: true,
      points: 5,
      maxPoints: 5,
      details: ['✅ Report ID present', '✅ Modality specified', '✅ Tags present']
    }
  ],
  errors: [],
  warnings: [
    'Image size exceeds recommended limit for Frame 0',
    'Consider adding more detailed technique description'
  ]
};

// Sample data quality metrics
const sampleDataQuality = {
  framesWithCompleteData: 3,
  averageCompleteness: "87.3",
  imagesAvailable: 3,
  qualityScore: "Good"
};

/**
 * Test 1: Generate basic report
 */
async function testBasicReport() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Generate Basic Report');
  console.log('='.repeat(60));

  try {
    const generator = new ProfessionalPDFGenerator();
    const outputPath = path.join(__dirname, 'test-report-basic.pdf');

    console.log('Generating PDF...');
    await generator.generateReport(sampleReportData, outputPath);

    // Check if file exists
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log('✅ PDF generated successfully');
      console.log(`   File: ${outputPath}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      return true;
    } else {
      console.error('❌ PDF file not created');
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 2: Generate report with QA
 */
async function testReportWithQA() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Generate Report with QA');
  console.log('='.repeat(60));

  try {
    const generator = new ProfessionalPDFGenerator();
    const outputPath = path.join(__dirname, 'test-report-with-qa.pdf');

    console.log('Generating PDF with QA sections...');
    await generator.generateReportWithQA(
      sampleReportData,
      sampleQAResults,
      sampleDataQuality,
      outputPath
    );

    // Check if file exists
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log('✅ PDF with QA generated successfully');
      console.log(`   File: ${outputPath}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      return true;
    } else {
      console.error('❌ PDF file not created');
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 3: Generate final report with signature
 */
async function testFinalReport() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Generate Final Report with Signature');
  console.log('='.repeat(60));

  try {
    const finalReportData = {
      ...sampleReportData,
      reportId: 'SR-TEST-2025-002',
      reportStatus: 'final',
      signedAt: new Date(),
      radiologistSignature: 'Dr. Jane Smith, MD'
    };

    const generator = new ProfessionalPDFGenerator();
    const outputPath = path.join(__dirname, 'test-report-final.pdf');

    console.log('Generating final signed PDF...');
    await generator.generateReport(finalReportData, outputPath);

    // Check if file exists
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log('✅ Final PDF generated successfully');
      console.log(`   File: ${outputPath}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Status: FINAL`);
      console.log(`   Signed by: ${finalReportData.radiologistSignature}`);
      return true;
    } else {
      console.error('❌ PDF file not created');
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 4: Generate report with critical findings
 */
async function testCriticalFindingsReport() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Generate Report with Critical Findings');
  console.log('='.repeat(60));

  try {
    const criticalReportData = {
      ...sampleReportData,
      reportId: 'SR-TEST-2025-003',
      stats: {
        ...sampleReportData.stats,
        criticalFindings: [
          {
            frameIndex: 1,
            type: 'Severe stenosis',
            description: 'Critical stenosis in LAD requiring immediate intervention'
          }
        ]
      }
    };

    const generator = new ProfessionalPDFGenerator();
    const outputPath = path.join(__dirname, 'test-report-critical.pdf');

    console.log('Generating PDF with critical findings...');
    await generator.generateReport(criticalReportData, outputPath);

    // Check if file exists
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log('✅ Critical findings PDF generated successfully');
      console.log(`   File: ${outputPath}`);
      console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
      console.log(`   Critical Findings: ${criticalReportData.stats.criticalFindings.length}`);
      return true;
    } else {
      console.error('❌ PDF file not created');
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Test 5: Verify PDF structure
 */
async function testPDFStructure() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Verify PDF Structure');
  console.log('='.repeat(60));

  try {
    const testFile = path.join(__dirname, 'test-report-basic.pdf');

    if (!fs.existsSync(testFile)) {
      console.error('❌ Test file not found. Run Test 1 first.');
      return false;
    }

    const fileContent = fs.readFileSync(testFile);
    const pdfString = fileContent.toString('latin1');

    // Check for PDF header
    const hasPDFHeader = pdfString.startsWith('%PDF-');
    console.log(`${hasPDFHeader ? '✅' : '❌'} PDF header present`);

    // Check for required sections
    const sections = [
      'AI MEDICAL ANALYSIS REPORT',
      'EXECUTIVE SUMMARY',
      'STUDY INFORMATION',
      'DETAILED FRAME ANALYSIS',
      'COMPREHENSIVE SUMMARY',
      'IMPORTANT NOTICES',
      'CONFIDENTIAL MEDICAL REPORT'
    ];

    let sectionsFound = 0;
    sections.forEach(section => {
      if (pdfString.includes(section)) {
        console.log(`✅ Section found: ${section}`);
        sectionsFound++;
      } else {
        console.log(`⚠️  Section missing: ${section}`);
      }
    });

    const allSectionsPresent = sectionsFound === sections.length;
    console.log(`\n${allSectionsPresent ? '✅' : '❌'} All sections present: ${sectionsFound}/${sections.length}`);

    return hasPDFHeader && allSectionsPresent;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n' + '█'.repeat(60));
  console.log('PROFESSIONAL PDF GENERATOR TEST SUITE');
  console.log('█'.repeat(60));

  const results = {
    basicReport: false,
    reportWithQA: false,
    finalReport: false,
    criticalFindings: false,
    pdfStructure: false
  };

  // Run tests
  results.basicReport = await testBasicReport();
  results.reportWithQA = await testReportWithQA();
  results.finalReport = await testFinalReport();
  results.criticalFindings = await testCriticalFindingsReport();
  results.pdfStructure = await testPDFStructure();

  // Summary
  console.log('\n' + '█'.repeat(60));
  console.log('TEST SUMMARY');
  console.log('█'.repeat(60));

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  console.log(`\nResults: ${passed}/${total} tests passed\n`);
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const name = test.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${icon} ${name.charAt(0).toUpperCase() + name.slice(1)}`);
  });

  console.log('\n' + '█'.repeat(60));

  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! PDF Generator is working correctly.');
    console.log('\nGenerated files:');
    console.log('  - test-report-basic.pdf');
    console.log('  - test-report-with-qa.pdf');
    console.log('  - test-report-final.pdf');
    console.log('  - test-report-critical.pdf');
  } else {
    console.log(`⚠️  ${total - passed} test(s) failed. Please review the errors above.`);
  }

  console.log('█'.repeat(60) + '\n');

  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
