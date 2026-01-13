const axios = require('axios');

const studyUid = '1.3.12.2.1107.5.1.4.154053.30000026011211392216400000001';
const orthancUrl = 'http://35.172.184.138:8043';
const dicomWebBase = `${orthancUrl}/dicom-web`;

async function testDicomWeb() {
  console.log(`Testing DICOMweb: ${dicomWebBase}/studies/${studyUid}/metadata`);
  console.log('This may take a while for large studies...\n');
  
  const startTime = Date.now();
  
  try {
    const response = await axios.get(
      `${dicomWebBase}/studies/${studyUid}/metadata`,
      {
        auth: { username: 'orthanc', password: 'orthanc' },
        timeout: 120000, // 2 minutes
        headers: { 'Accept': 'application/json' }
      }
    );
    
    const elapsed = (Date.now() - startTime) / 1000;
    const instances = response.data;
    
    console.log(`✅ Success! Fetched ${instances.length} instances in ${elapsed.toFixed(1)}s\n`);
    
    if (instances.length > 0) {
      const first = instances[0];
      
      // Helper to get tag value
      const getTag = (inst, tag) => {
        const t = inst[tag];
        if (!t || !t.Value) return '';
        const v = t.Value[0];
        return typeof v === 'object' && v.Alphabetic ? v.Alphabetic : v;
      };
      
      console.log('Patient Name:', getTag(first, '00100010'));
      console.log('Patient ID:', getTag(first, '00100020'));
      console.log('Study Date:', getTag(first, '00080020'));
      console.log('Modality:', getTag(first, '00080060'));
      
      // Count series
      const seriesSet = new Set();
      instances.forEach(inst => {
        const seriesUID = getTag(inst, '0020000E');
        if (seriesUID) seriesSet.add(seriesUID);
      });
      
      console.log('\nTotal Series:', seriesSet.size);
      console.log('Total Instances:', instances.length);
    }
  } catch (error) {
    const elapsed = (Date.now() - startTime) / 1000;
    console.error(`❌ Failed after ${elapsed.toFixed(1)}s:`, error.message);
  }
}

testDicomWeb();
