// Quick script to check study metadata
const studyUID = '1.3.12.2.1107.5.1.4.154053.30000026011211392216400000001';

fetch(`http://localhost:8001/api/dicom/studies/${studyUID}/metadata`)
  .then(res => res.json())
  .then(data => {
    console.log('\n=== STUDY INFORMATION ===\n');
    console.log('Study UID:', data.studyInstanceUID);
    console.log('Patient Name:', data.patientName);
    console.log('Patient ID:', data.patientID);
    console.log('Study Date:', data.studyDate);
    console.log('Study Time:', data.studyTime);
    console.log('Modality:', data.modality);
    console.log('Study Description:', data.studyDescription);
    console.log('Accession Number:', data.accessionNumber);
    
    console.log('\n=== SERIES INFORMATION ===\n');
    console.log('Total Series:', data.series?.length || 0);
    
    if (data.series && data.series.length > 0) {
      data.series.forEach((series, index) => {
        console.log(`\nSeries ${index + 1}:`);
        console.log('  Series UID:', series.seriesInstanceUID);
        console.log('  Series Number:', series.seriesNumber);
        console.log('  Modality:', series.modality);
        console.log('  Description:', series.seriesDescription);
        console.log('  Number of Instances:', series.numberOfInstances);
        console.log('  Instances:', series.instances?.length || 0);
        
        if (series.instances && series.instances.length > 0) {
          console.log('  First Instance:');
          console.log('    SOP Instance UID:', series.instances[0].sopInstanceUID);
          console.log('    Instance Number:', series.instances[0].instanceNumber);
          console.log('    Orthanc ID:', series.instances[0].orthancInstanceId);
        }
      });
    }
    
    console.log('\n=== FULL JSON ===\n');
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => {
    console.error('Error fetching study:', err.message);
  });
