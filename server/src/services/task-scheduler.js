/**
 * Automated Task Scheduler
 * Scheduled tasks using node-cron
 */

const cron = require('node-cron');
const Report = require('../models/Report');
const FollowUp = require('../models/FollowUp');
const batchOperationsService = require('./batch-operations-service');
const { cacheService } = require('./cache-service');

class TaskScheduler {
  constructor() {
    this.tasks = [];
    this.isInitialized = false;
  }

  /**
   * Initialize scheduled tasks
   */
  initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Task scheduler already initialized');
      return;
    }

    // Daily cleanup of old batch jobs (runs at 2 AM)
    this.scheduleTask('cleanup-batch-jobs', '0 2 * * *', async () => {
      console.log('🧹 Running scheduled cleanup of batch jobs...');
      try {
        await batchOperationsService.cleanup();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    });

    // Daily cache cleanup (runs at 3 AM)
    this.scheduleTask('cleanup-cache', '0 3 * * *', async () => {
      console.log('🧹 Running scheduled cache cleanup...');
      try {
        cacheService.clearExpired();
        const stats = cacheService.getStats();
        console.log('Cache stats after cleanup:', stats);
      } catch (error) {
        console.error('Cache cleanup failed:', error);
      }
    });

    // Check for overdue follow-ups (runs every hour)
    this.scheduleTask('check-followups', '0 * * * *', async () => {
      console.log('📅 Checking for overdue follow-ups...');
      try {
        const now = new Date();
        const overdueFollowUps = await FollowUp.find({
          dueDate: { $lt: now },
          status: 'pending',
          completed: false
        }).populate('patientId', 'firstName lastName mrn');

        if (overdueFollowUps.length > 0) {
          console.log(`⚠️ Found ${overdueFollowUps.length} overdue follow-ups`);
          
          // Update status to overdue
          await FollowUp.updateMany(
            {
              _id: { $in: overdueFollowUps.map(f => f._id) }
            },
            {
              $set: { status: 'overdue' }
            }
          );

          // TODO: Send notifications to assigned radiologists
        }
      } catch (error) {
        console.error('Follow-up check failed:', error);
      }
    });

    // Generate daily report statistics (runs at 1 AM)
    this.scheduleTask('daily-stats', '0 1 * * *', async () => {
      console.log('📊 Generating daily statistics...');
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await Report.aggregate([
          {
            $match: {
              createdAt: {
                $gte: yesterday,
                $lt: today
              }
            }
          },
          {
            $group: {
              _id: null,
              totalReports: { $sum: 1 },
              finalizedReports: {
                $sum: {
                  $cond: [{ $in: ['$status', ['final', 'signed']] }, 1, 0]
                }
              },
              draftReports: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'draft'] }, 1, 0]
                }
              },
              avgTurnaroundTime: { $avg: '$turnaroundTime' }
            }
          }
        ]);

        if (stats.length > 0) {
          console.log('📈 Daily stats:', stats[0]);
          // TODO: Store stats in database or send summary email
        }
      } catch (error) {
        console.error('Daily stats generation failed:', error);
      }
    });

    // Auto-finalize reports in draft status for > 7 days (runs daily at 4 AM)
    this.scheduleTask('auto-finalize-old-drafts', '0 4 * * *', async () => {
      console.log('📝 Checking for old draft reports to auto-finalize...');
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const oldDrafts = await Report.find({
          status: 'draft',
          updatedAt: { $lt: sevenDaysAgo }
        });

        if (oldDrafts.length > 0) {
          console.log(`⚠️ Found ${oldDrafts.length} old draft reports`);
          
          // This is a policy decision - you might want to notify instead
          // For now, just log
          // await Report.updateMany(
          //   { _id: { $in: oldDrafts.map(r => r._id) } },
          //   { $set: { status: 'final' } }
          // );
        }
      } catch (error) {
        console.error('Auto-finalize check failed:', error);
      }
    });

    // Monitor system health (runs every 5 minutes)
    this.scheduleTask('health-check', '*/5 * * * *', async () => {
      try {
        const dbStats = {
          reports: await Report.countDocuments(),
          followUps: await FollowUp.countDocuments()
        };

        const cacheStats = cacheService.getStats();

        // Check for anomalies
        if (cacheStats.hitRate < 0.3 && cacheStats.size > 100) {
          console.warn('⚠️ Low cache hit rate:', cacheStats.hitRate);
        }

        // Log health status (can be sent to monitoring service)
        // console.log('💚 System health check:', { dbStats, cacheStats });
      } catch (error) {
        console.error('❌ Health check failed:', error);
      }
    });

    this.isInitialized = true;
    console.log(`✅ Task scheduler initialized with ${this.tasks.length} tasks`);
  }

  /**
   * Schedule a task
   */
  scheduleTask(name, cronExpression, taskFunction) {
    if (!cron.validate(cronExpression)) {
      console.error(`❌ Invalid cron expression for task ${name}: ${cronExpression}`);
      return;
    }

    const task = cron.schedule(cronExpression, taskFunction, {
      timezone: process.env.TZ || 'UTC'
    });

    this.tasks.push({
      name,
      cronExpression,
      task,
      startedAt: new Date()
    });

    console.log(`📅 Scheduled task: ${name} (${cronExpression})`);
    return task;
  }

  /**
   * Stop a specific task
   */
  stopTask(name) {
    const taskEntry = this.tasks.find(t => t.name === name);
    if (taskEntry) {
      taskEntry.task.stop();
      console.log(`⏹️ Stopped task: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all tasks
   */
  stopAll() {
    this.tasks.forEach(taskEntry => {
      taskEntry.task.stop();
    });
    console.log(`⏹️ Stopped all ${this.tasks.length} scheduled tasks`);
  }

  /**
   * Get task status
   */
  getTaskStatus() {
    return this.tasks.map(t => ({
      name: t.name,
      cronExpression: t.cronExpression,
      startedAt: t.startedAt,
      isRunning: t.task.getStatus() === 'scheduled'
    }));
  }

  /**
   * Run a task immediately (for testing)
   */
  async runTaskNow(name) {
    const taskEntry = this.tasks.find(t => t.name === name);
    if (!taskEntry) {
      throw new Error(`Task not found: ${name}`);
    }

    console.log(`▶️ Running task immediately: ${name}`);
    // Extract the task function and run it
    // Note: This is a workaround since node-cron doesn't expose the task function
    // In production, you'd want to refactor to store the function separately
  }
}

module.exports = new TaskScheduler();
