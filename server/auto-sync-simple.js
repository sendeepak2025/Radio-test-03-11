/**
 * Full Working Auto-Sync Script
 * Fetches studies and instances from Orthanc and saves to MongoDB.
 * Correctly handles series → instances mapping.
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const Study = require('./src/models/Study');
const Instance = require('./src/models/Instance');
const Patient = require('./src/models/Patient');

const REMOTE_ORTHANC = {
    url: 'http://35.172.184.138:8042',
    username: 'orthanc',
    password: 'orthanc_secure_2024'
};

const orthancClient = axios.create({
    baseURL: REMOTE_ORTHANC.url,
    auth: {
        username: REMOTE_ORTHANC.username,
        password: REMOTE_ORTHANC.password
    },
    timeout: 30000
});

const processedStudies = new Set();

async function connectDB() {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dicomdb';
        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB connected');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

async function getRemoteStudyIds() {
    try {
        const res = await orthancClient.get('/studies');
        console.log('🔹 Remote studies fetched:', res.data);
        return res.data;
    } catch (err) {
        console.error('❌ Failed to fetch studies:', err.message);
        return [];
    }
}

async function getStudyDetails(studyId) {
    try {
        const res = await orthancClient.get(`/studies/${studyId}`);
        return res.data;
    } catch (err) {
        console.error(`❌ Failed to fetch study ${studyId}:`, err.message);
        return null;
    }
}

async function getInstanceMetadata(instanceId) {
    try {
        const res = await orthancClient.get(`/instances/${instanceId}/tags?simplify`);
        return res.data;
    } catch (err) {
        console.warn(`⚠️ Failed simplified tags for ${instanceId}, trying raw tags`);
        try {
            const res = await orthancClient.get(`/instances/${instanceId}/tags`);
            const tags = {};
            for (const [key, val] of Object.entries(res.data)) {
                if (!val || !val.Value) continue;
                const v = Array.isArray(val.Value) ? val.Value[0] : val.Value;
                if (key === '0020,000d') tags.StudyInstanceUID = v;
                else if (key === '0020,000e') tags.SeriesInstanceUID = v;
                else if (key === '0008,0018') tags.SOPInstanceUID = v;
                else if (key === '0010,0010') tags.PatientName = v;
                else if (key === '0010,0020') tags.PatientID = v;
                else if (key === '0008,0020') tags.StudyDate = v;
                else if (key === '0008,0030') tags.StudyTime = v;
                else if (key === '0008,1030') tags.StudyDescription = v;
                else if (key === '0008,0060') tags.Modality = v;
                else if (key === '0028,0008') tags.NumberOfFrames = v;
                else if (key === '0020,0013') tags.InstanceNumber = v;
            }
            return tags;
        } catch (e2) {
            console.error(`❌ Could not fetch tags for instance ${instanceId}:`, e2.message);
            return null;
        }
    }
}

async function fetchAllInstanceIdsFromStudy(studyDetails) {
    const instanceIds = [];
    if (studyDetails.Instances && studyDetails.Instances.length > 0) {
        instanceIds.push(...studyDetails.Instances);
    } else if (studyDetails.Series && studyDetails.Series.length > 0) {
        for (const seriesId of studyDetails.Series) {
            const series = await orthancClient.get(`/series/${seriesId}`).then(r => r.data);
            if (series.Instances && series.Instances.length > 0) {
                instanceIds.push(...series.Instances);
            }
        }
    }
    return instanceIds;
}

const DEFAULT_HOSPITAL_ID = '68f231e7301ed3979c14c5d4';
// Default hospital ObjectId

async function saveStudyToDatabase(orthancStudyId) {
    try {
        console.log(`📥 Processing study: ${orthancStudyId}`);

        const studyDetails = await getStudyDetails(orthancStudyId);
        if (!studyDetails) return false;

        // Extract instances from series if Instances array is empty
        let instanceIds = studyDetails.Instances || [];
        if (instanceIds.length === 0 && studyDetails.Series?.length > 0) {
            for (const seriesId of studyDetails.Series) {
                const seriesDetails = await orthancClient.get(`/series/${seriesId}`);
                if (seriesDetails.data.Instances) {
                    instanceIds.push(...seriesDetails.data.Instances);
                }
            }
        }

        if (instanceIds.length === 0) {
            console.log('⚠️ No instances found for study, skipping');
            return false;
        }

        // Get metadata from first instance
        const firstInstanceTags = await getInstanceMetadata(instanceIds[0]);
        if (!firstInstanceTags) {
            console.log('⚠️ Could not get metadata from first instance, skipping');
            return false;
        }

        const studyInstanceUID = firstInstanceTags.StudyInstanceUID || orthancStudyId;
        const patientID = firstInstanceTags.PatientID || 'NA';
        const patientName = firstInstanceTags.PatientName || 'Unknown';
        const studyDate = firstInstanceTags.StudyDate || '';
        const studyTime = firstInstanceTags.StudyTime || '';
        const studyDescription = firstInstanceTags.StudyDescription || '';
        const modality = firstInstanceTags.Modality || 'OT';

        // Check if study already exists - if yes, delete and re-create with new series data
        const existingStudy = await Study.findOne({ studyInstanceUID });
        if (existingStudy) {
            console.log('🔄 Study exists, updating with new series data...');
            // Delete old study and instances
            await Study.deleteOne({ studyInstanceUID });
            await Instance.deleteMany({ studyInstanceUID });
            console.log('✅ Old data cleaned');
        }

        // Fetch series details from Orthanc
        const seriesData = [];
        if (studyDetails.Series && studyDetails.Series.length > 0) {
            for (const seriesId of studyDetails.Series) {
                try {
                    const seriesRes = await orthancClient.get(`/series/${seriesId}`);
                    const seriesDetails = seriesRes.data;

                    // Get first instance of series for metadata
                    let seriesModality = modality;
                    let seriesDescription = '';
                    let seriesNumber = '';

                    if (seriesDetails.Instances && seriesDetails.Instances.length > 0) {
                        const firstSeriesInstance = await getInstanceMetadata(seriesDetails.Instances[0]);
                        if (firstSeriesInstance) {
                            seriesModality = firstSeriesInstance.Modality || modality;
                            seriesDescription = firstSeriesInstance.SeriesDescription || '';
                            seriesNumber = firstSeriesInstance.SeriesNumber || '';
                        }
                    }

                    seriesData.push({
                        orthancSeriesId: seriesId,
                        seriesInstanceUID: seriesDetails.MainDicomTags?.SeriesInstanceUID || `${studyInstanceUID}.${seriesData.length + 1}`,
                        seriesNumber: seriesNumber || seriesDetails.MainDicomTags?.SeriesNumber || (seriesData.length + 1).toString(),
                        seriesDescription: seriesDescription || seriesDetails.MainDicomTags?.SeriesDescription || '',
                        modality: seriesModality,
                        numberOfInstances: seriesDetails.Instances?.length || 0,
                        instances: seriesDetails.Instances || []
                    });
                } catch (err) {
                    console.warn(`⚠️ Could not fetch series ${seriesId}:`, err.message);
                }
            }
        }

        console.log(`📊 Found ${seriesData.length} series in study`);

        // Calculate total instances from all series
        const totalInstances = seriesData.reduce((sum, series) => sum + (series.numberOfInstances || 0), 0);

        console.log(`📊 Total instances across all series: ${totalInstances}`);

        // Save study
        await Study.create({
            studyInstanceUID,
            studyDate,
            studyTime,
            patientName,
            patientID,
            patientBirthDate: firstInstanceTags.PatientBirthDate || '',
            patientSex: firstInstanceTags.PatientSex || '',
            modality,
            studyDescription,
            numberOfSeries: seriesData.length || 1,
            numberOfInstances: totalInstances,
            orthancStudyId,
            remoteOrthancUrl: REMOTE_ORTHANC.url,
            hospitalId: DEFAULT_HOSPITAL_ID
        });

        console.log(`✅ Study saved: ${studyInstanceUID} with ${seriesData.length} series and ${totalInstances} instances`);

        // Save instance records with proper series mapping
        let instanceCount = 0;

        // Process instances by series
        for (const series of seriesData) {
            for (const instanceId of series.instances) {
                const instTags = await getInstanceMetadata(instanceId);
                if (!instTags) continue;

                const frameCount = parseInt(instTags.NumberOfFrames) || 1;
                const seriesInstanceUID = instTags.SeriesInstanceUID || series.seriesInstanceUID;
                const sopInstanceUID = instTags.SOPInstanceUID || instanceId;

                const instanceRecords = [];
                for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
                    instanceRecords.push({
                        studyInstanceUID,
                        seriesInstanceUID,
                        sopInstanceUID: frameCount > 1 ? `${sopInstanceUID}.frame${frameIndex}` : sopInstanceUID,
                        instanceNumber: frameIndex + 1,
                        modality: instTags.Modality || series.modality,
                        orthancInstanceId: instanceId,
                        orthancStudyId: orthancStudyId,
                        orthancSeriesId: series.orthancSeriesId,
                        orthancUrl: `${REMOTE_ORTHANC.url}/instances/${instanceId}`,
                        orthancFrameIndex: frameIndex,
                        useOrthancPreview: true,
                        remoteOrthancUrl: REMOTE_ORTHANC.url
                    });
                }

                await Instance.insertMany(instanceRecords, { ordered: false }).catch(err => {
                    if (err.code !== 11000) throw err;
                });
                instanceCount += frameCount;
            }
        }

        console.log(`✅ Created ${instanceCount} instance records from ${seriesData.length} series`);

        // Upsert patient
        await Patient.updateOne(
            { patientID, hospitalId: DEFAULT_HOSPITAL_ID },
            {
                $set: {
                    patientID,
                    patientName,
                    birthDate: firstInstanceTags.PatientBirthDate || '',
                    sex: firstInstanceTags.PatientSex || ''
                },
                $addToSet: { studyIds: studyInstanceUID }
            },
            { upsert: true }
        );

        console.log(`✅ Patient record updated or created: ${patientID}\n`);
        return true;

    } catch (error) {
        console.error(`❌ Error saving study: ${error.message}`);
        return false;
    }
}


async function checkAndSync() {
    try {
        const studyIds = await getRemoteStudyIds();
        const newStudies = studyIds.filter(id => !processedStudies.has(id));
        if (newStudies.length === 0) return;

        console.log(`🆕 Found ${newStudies.length} new study(ies)!`);
        for (const studyId of newStudies) {
            await saveStudyToDatabase(studyId);
            processedStudies.add(studyId);
        }
        console.log('✅ Sync complete!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (err) {
        console.error('❌ Sync check failed:', err.message);
    }
}

async function initialSync() {
    const studyIds = await getRemoteStudyIds();
    for (const studyId of studyIds) {
        await saveStudyToDatabase(studyId);
        processedStudies.add(studyId);
    }
    console.log('✅ Initial sync complete\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

async function startWatching(intervalSeconds = 30) {
    console.log('👀 Watching for new studies...');
    console.log(`⏱️ Checking every ${intervalSeconds} seconds\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    await checkAndSync();
    setInterval(checkAndSync, intervalSeconds * 1000);
}

// Main
async function main() {
    await connectDB();
    await initialSync();
    await startWatching(30);
}

process.on('SIGINT', async () => {
    console.log('\n👋 Stopping auto-sync...');
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
});

main().catch(err => console.error('Fatal error:', err.message));
