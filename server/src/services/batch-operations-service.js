/**
 * Batch Operations Service
 * Handles bulk operations on reports with job queue management
 */

const Queue = require('bull');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const Report = require('../models/Report');
const pdfService = require('./pdf-service');

class BatchOperationsService {
  constructor() {
    // Initialize job queue (Redis connection optional, falls back to in-memory)
    const redisConfig = process.env.REDIS_URL ? {
      redis: process.env.REDIS_URL
    } : undefined;

    this.batchQueue = new Queue('batch-operations', redisConfig);
    this.setupJobProcessors();
  }

  /**
   * Setup job processors
   */
  setupJobProcessors() {
    // Process batch export job
    this.batchQueue.process('export-pdf', async (job) => {
      const { reportIds, userId, format = 'zip' } = job.data;
      
      try {
        const result = await this.executeBatchExport(reportIds, userId, format, job);
        return result;
      } catch (error) {
        console.error('Batch export job failed:', error);
        throw error;
      }
    });

    // Process batch status change job
    this.batchQueue.process('change-status', async (job) => {
      const { reportIds, newStatus, userId } = job.data;
      
      try {
        const result = await this.executeBatchStatusChange(reportIds, newStatus, userId, job);
        return result;
      } catch (error) {
        console.error('Batch status change job failed:', error);
        throw error;
      }
    });

    // Process batch assignment job
    this.batchQueue.process('assign-reports', async (job) => {
      const { reportIds, radiologistId, userId } = job.data;
      
      try {
        const result = await this.executeBatchAssignment(reportIds, radiologistId, userId, job);
        return result;
      } catch (error) {
        console.error('Batch assignment job failed:', error);
        throw error;
      }
    });

    // Job event handlers
    this.batchQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed:`, result);
    });

    this.batchQueue.on('failed', (job, err) => {
      console.error(`❌ Job ${job.id} failed:`, err.message);
    });

    console.log('✅ Batch operations service initialized');
  }

  /**
   * Queue batch PDF export
   */
  async queueBatchExport(reportIds, userId, format = 'zip') {
    const job = await this.batchQueue.add('export-pdf', {
      reportIds,
      userId,
      format
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    return {
      jobId: job.id,
      status: 'queued',
      reportCount: reportIds.length
    };
  }

  /**
   * Execute batch PDF export
   */
  async executeBatchExport(reportIds, userId, format, job) {
    const reports = await Report.find({ _id: { $in: reportIds } })
      .populate('userId', 'firstName lastName')
      .populate('patientId');

    if (reports.length === 0) {
      throw new Error('No reports found');
    }

    // Create temporary directory
    const tempDir = path.join(__dirname, '../../temp', `batch_${job.id}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const pdfPaths = [];
    let processed = 0;

    // Generate PDFs
    for (const report of reports) {
      try {
        const pdfPath = path.join(tempDir, `report_${report._id}.pdf`);
        
        // Use PDF service to generate PDF
        const pdfBuffer = await pdfService.exportReport(report._id, { 
          format: 'buffer',
          includeImages: false // Skip images for batch export to save time
        });
        
        // Write buffer to file
        fs.writeFileSync(pdfPath, pdfBuffer);
        pdfPaths.push(pdfPath);
        
        processed++;
        await job.progress((processed / reports.length) * 50); // 0-50% for PDF generation
      } catch (error) {
        console.error(`Failed to generate PDF for report ${report._id}:`, error);
      }
    }

    // Create ZIP archive
    const zipPath = path.join(tempDir, `reports_${Date.now()}.zip`);
    await this.createZipArchive(pdfPaths, zipPath, job);

    // Update progress to 100%
    await job.progress(100);

    return {
      success: true,
      zipPath,
      reportCount: reports.length,
      pdfCount: pdfPaths.length,
      downloadUrl: `/api/batch-operations/download/${job.id}`
    };
  }

  /**
   * Create ZIP archive from PDF files
   */
  async createZipArchive(pdfPaths, outputPath, job) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      let processed = 0;

      output.on('close', () => {
        console.log(`ZIP created: ${archive.pointer()} total bytes`);
        resolve(outputPath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.on('progress', async (progress) => {
        // Update progress 50-100% for ZIP creation
        const percent = 50 + (progress.entries.processed / progress.entries.total * 50);
        await job.progress(percent);
      });

      archive.pipe(output);

      // Add PDF files to archive
      pdfPaths.forEach((pdfPath) => {
        const filename = path.basename(pdfPath);
        archive.file(pdfPath, { name: filename });
      });

      archive.finalize();
    });
  }

  /**
   * Queue batch status change
   */
  async queueBatchStatusChange(reportIds, newStatus, userId) {
    const job = await this.batchQueue.add('change-status', {
      reportIds,
      newStatus,
      userId
    }, {
      attempts: 3
    });

    return {
      jobId: job.id,
      status: 'queued',
      reportCount: reportIds.length
    };
  }

  /**
   * Execute batch status change
   */
  async executeBatchStatusChange(reportIds, newStatus, userId, job) {
    const validStatuses = ['draft', 'pending', 'in-progress', 'final', 'signed', 'amended'];
    
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    let processed = 0;
    let updated = 0;
    const errors = [];

    for (const reportId of reportIds) {
      try {
        const report = await Report.findById(reportId);
        
        if (!report) {
          errors.push({ reportId, error: 'Report not found' });
          continue;
        }

        report.status = newStatus;
        await report.save();
        
        updated++;
      } catch (error) {
        errors.push({ reportId, error: error.message });
      }

      processed++;
      await job.progress((processed / reportIds.length) * 100);
    }

    return {
      success: true,
      totalReports: reportIds.length,
      updatedReports: updated,
      errors
    };
  }

  /**
   * Queue batch assignment
   */
  async queueBatchAssignment(reportIds, radiologistId, userId) {
    const job = await this.batchQueue.add('assign-reports', {
      reportIds,
      radiologistId,
      userId
    }, {
      attempts: 3
    });

    return {
      jobId: job.id,
      status: 'queued',
      reportCount: reportIds.length
    };
  }

  /**
   * Execute batch assignment
   */
  async executeBatchAssignment(reportIds, radiologistId, userId, job) {
    let processed = 0;
    let assigned = 0;
    const errors = [];

    for (const reportId of reportIds) {
      try {
        const report = await Report.findById(reportId);
        
        if (!report) {
          errors.push({ reportId, error: 'Report not found' });
          continue;
        }

        report.assignedTo = radiologistId;
        await report.save();
        
        assigned++;
      } catch (error) {
        errors.push({ reportId, error: error.message });
      }

      processed++;
      await job.progress((processed / reportIds.length) * 100);
    }

    return {
      success: true,
      totalReports: reportIds.length,
      assignedReports: assigned,
      errors
    };
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId) {
    const job = await this.batchQueue.getJob(jobId);
    
    if (!job) {
      return { error: 'Job not found' };
    }

    const state = await job.getState();
    const progress = job.progress();
    const result = job.returnvalue;

    return {
      jobId: job.id,
      state,
      progress,
      result,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn
    };
  }

  /**
   * Clean up old jobs and temp files
   */
  async cleanup(olderThan = 24 * 60 * 60 * 1000) { // Default 24 hours
    const jobs = await this.batchQueue.getCompleted();
    const now = Date.now();
    let cleaned = 0;

    for (const job of jobs) {
      if (now - job.timestamp > olderThan) {
        // Clean up temp files
        if (job.returnvalue?.zipPath) {
          const tempDir = path.dirname(job.returnvalue.zipPath);
          if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }
        }

        // Remove job
        await job.remove();
        cleaned++;
      }
    }

    console.log(`🧹 Cleaned up ${cleaned} old batch jobs`);
    return { cleaned };
  }

  /**
   * Get ZIP file for download
   */
  async getDownloadFile(jobId) {
    const job = await this.batchQueue.getJob(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();
    if (state !== 'completed') {
      throw new Error(`Job not completed (status: ${state})`);
    }

    const result = job.returnvalue;
    if (!result?.zipPath || !fs.existsSync(result.zipPath)) {
      throw new Error('Download file not found');
    }

    return result.zipPath;
  }
}

module.exports = new BatchOperationsService();
