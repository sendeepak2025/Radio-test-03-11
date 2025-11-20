/**
 * Database Performance Optimization
 * Add indexes to MongoDB collections for better query performance
 */

const mongoose = require('mongoose');
const Report = require('./src/models/Report');
const WorklistItem = require('./src/models/WorklistItem');
const Patient = require('./src/models/Patient');
const User = require('./src/models/User');
const ReportTemplate = require('./src/models/ReportTemplate');

async function optimizeDatabase() {
  try {
    console.log('🔧 Starting database optimization...\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/radiology';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Report collection indexes
    console.log('📊 Optimizing Report collection...');
    await Report.collection.createIndex({ status: 1, createdAt: -1 });
    await Report.collection.createIndex({ radiologistId: 1, status: 1 });
    await Report.collection.createIndex({ patientId: 1, createdAt: -1 });
    await Report.collection.createIndex({ worklistItemId: 1 });
    await Report.collection.createIndex({ 'content.findings': 'text', 'content.impression': 'text' });
    await Report.collection.createIndex({ signedAt: -1 }, { sparse: true });
    await Report.collection.createIndex({ modality: 1, status: 1 });
    console.log('  ✓ 7 indexes created on Report collection');

    // WorklistItem collection indexes
    console.log('📋 Optimizing WorklistItem collection...');
    await WorklistItem.collection.createIndex({ status: 1, priority: -1 });
    await WorklistItem.collection.createIndex({ assignedTo: 1, status: 1 });
    await WorklistItem.collection.createIndex({ studyDate: -1 });
    await WorklistItem.collection.createIndex({ patientId: 1, studyDate: -1 });
    await WorklistItem.collection.createIndex({ modality: 1, status: 1 });
    console.log('  ✓ 5 indexes created on WorklistItem collection');

    // Patient collection indexes
    console.log('👤 Optimizing Patient collection...');
    await Patient.collection.createIndex({ patientId: 1 }, { unique: true });
    await Patient.collection.createIndex({ firstName: 1, lastName: 1 });
    await Patient.collection.createIndex({ dateOfBirth: 1 });
    console.log('  ✓ 3 indexes created on Patient collection');

    // User collection indexes
    console.log('👨‍⚕️ Optimizing User collection...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1, isActive: 1 });
    await User.collection.createIndex({ department: 1 });
    console.log('  ✓ 3 indexes created on User collection');

    // ReportTemplate collection indexes
    console.log('📝 Optimizing ReportTemplate collection...');
    await ReportTemplate.collection.createIndex({ modality: 1, isActive: 1 });
    await ReportTemplate.collection.createIndex({ category: 1 });
    await ReportTemplate.collection.createIndex({ name: 'text', description: 'text' });
    console.log('  ✓ 3 indexes created on ReportTemplate collection');

    // Get index statistics
    console.log('\n📈 Index Statistics:');
    const collections = [
      { name: 'Report', model: Report },
      { name: 'WorklistItem', model: WorklistItem },
      { name: 'Patient', model: Patient },
      { name: 'User', model: User },
      { name: 'ReportTemplate', model: ReportTemplate }
    ];

    for (const coll of collections) {
      const indexes = await coll.model.collection.getIndexes();
      console.log(`  ${coll.name}: ${Object.keys(indexes).length} indexes`);
    }

    console.log('\n✅ Database optimization complete!\n');

    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Optimization failed:', error);
    process.exit(1);
  }
}

// Run optimization
if (require.main === module) {
  optimizeDatabase();
}

module.exports = optimizeDatabase;
