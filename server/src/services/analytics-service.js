/**
 * Analytics Service
 * Aggregates telemetry data for analytics dashboard
 */

const TelemetryEvent = require('../models/TelemetryEvent');
const StructuredReport = require('../models/StructuredReport');
const User = require('../models/User');

/**
 * Get report metrics for a time period
 */
async function getReportMetrics(startDate, endDate, filters = {}) {
  try {
    const dateFilter = {
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    // Apply additional filters
    const reportFilter = { ...dateFilter };
    if (filters.modality) reportFilter.modality = filters.modality;
    if (filters.hospitalId) reportFilter['metadata.hospitalId'] = filters.hospitalId;
    
    // Total reports created
    const totalReports = await StructuredReport.countDocuments(reportFilter);
    
    // Reports by status
    const statusBreakdown = await StructuredReport.aggregate([
      { $match: reportFilter },
      { $group: { _id: '$reportStatus', count: { $sum: 1 } } }
    ]);
    
    // Reports by modality
    const modalityBreakdown = await StructuredReport.aggregate([
      { $match: reportFilter },
      { $group: { _id: '$modality', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Signed reports count
    const signedReports = await StructuredReport.countDocuments({
      ...reportFilter,
      reportStatus: 'final'
    });
    
    // Average turnaround time (time from created to signed)
    const avgTATResult = await StructuredReport.aggregate([
      { 
        $match: { 
          ...reportFilter, 
          reportStatus: 'final',
          signedAt: { $exists: true }
        } 
      },
      {
        $project: {
          tat: { 
            $subtract: ['$signedAt', '$createdAt'] 
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTAT: { $avg: '$tat' },
          minTAT: { $min: '$tat' },
          maxTAT: { $max: '$tat' }
        }
      }
    ]);
    
    const avgTAT = avgTATResult[0] ? Math.round(avgTATResult[0].avgTAT / 1000 / 60) : 0; // Convert to minutes
    
    // Reports over time (daily breakdown)
    const reportsOverTime = await StructuredReport.aggregate([
      { $match: reportFilter },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    return {
      totalReports,
      signedReports,
      draftReports: totalReports - signedReports,
      avgTurnaroundTime: avgTAT,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      modalityBreakdown: modalityBreakdown.map(item => ({
        modality: item._id,
        count: item.count
      })),
      reportsOverTime: reportsOverTime.map(item => ({
        date: item._id,
        count: item.count
      }))
    };
  } catch (error) {
    console.error('Error getting report metrics:', error);
    throw error;
  }
}

/**
 * Get user activity metrics
 */
async function getUserActivityMetrics(userId, startDate, endDate) {
  try {
    const dateFilter = {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    const userFilter = userId ? { userId, ...dateFilter } : dateFilter;
    
    // Total events
    const totalEvents = await TelemetryEvent.countDocuments(userFilter);
    
    // Events by type
    const eventsByType = await TelemetryEvent.aggregate([
      { $match: userFilter },
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Active users (unique user IDs with events)
    const activeUsers = await TelemetryEvent.distinct('userId', dateFilter);
    
    // Reports created by user
    let reportsCreated = 0;
    if (userId) {
      reportsCreated = await StructuredReport.countDocuments({
        radiologistId: userId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      });
    }
    
    // Daily activity
    const dailyActivity = await TelemetryEvent.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } 
          },
          events: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          date: '$_id',
          events: 1,
          sessions: { $size: '$uniqueSessions' }
        }
      },
      { $sort: { date: 1 } }
    ]);
    
    return {
      totalEvents,
      activeUsersCount: activeUsers.length,
      reportsCreated,
      eventsByType: eventsByType.map(item => ({
        eventType: item._id,
        count: item.count
      })),
      dailyActivity: dailyActivity.map(item => ({
        date: item.date,
        events: item.events,
        sessions: item.sessions
      }))
    };
  } catch (error) {
    console.error('Error getting user activity metrics:', error);
    throw error;
  }
}

/**
 * Get template usage statistics
 */
async function getTemplateUsageStats(startDate, endDate) {
  try {
    const dateFilter = {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    // Template selection events
    const templateUsage = await TelemetryEvent.aggregate([
      { 
        $match: { 
          eventType: 'template.selected',
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: '$metadata.templateId',
          templateName: { $first: '$metadata.templateName' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Template usage over time
    const usageOverTime = await TelemetryEvent.aggregate([
      { 
        $match: { 
          eventType: 'template.selected',
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } 
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    return {
      topTemplates: templateUsage.map(item => ({
        templateId: item._id,
        templateName: item.templateName,
        usageCount: item.count
      })),
      usageOverTime: usageOverTime.map(item => ({
        date: item._id,
        count: item.count
      }))
    };
  } catch (error) {
    console.error('Error getting template usage stats:', error);
    throw error;
  }
}

/**
 * Get turnaround time metrics
 */
async function getTurnaroundTimeMetrics(modality, startDate, endDate) {
  try {
    const filter = {
      reportStatus: 'final',
      signedAt: { $exists: true },
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (modality) filter.modality = modality;
    
    // Calculate TAT for each report
    const tatData = await StructuredReport.aggregate([
      { $match: filter },
      {
        $project: {
          modality: 1,
          tat: { 
            $divide: [
              { $subtract: ['$signedAt', '$createdAt'] },
              1000 * 60 // Convert to minutes
            ]
          },
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$signedAt' }
          }
        }
      }
    ]);
    
    // Overall statistics
    const avgTAT = tatData.length > 0
      ? tatData.reduce((sum, item) => sum + item.tat, 0) / tatData.length
      : 0;
    
    const tatValues = tatData.map(item => item.tat).sort((a, b) => a - b);
    const medianTAT = tatValues.length > 0
      ? tatValues[Math.floor(tatValues.length / 2)]
      : 0;
    
    // TAT by modality
    const tatByModality = await StructuredReport.aggregate([
      { $match: filter },
      {
        $project: {
          modality: 1,
          tat: { 
            $divide: [
              { $subtract: ['$signedAt', '$createdAt'] },
              1000 * 60
            ]
          }
        }
      },
      {
        $group: {
          _id: '$modality',
          avgTAT: { $avg: '$tat' },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgTAT: -1 } }
    ]);
    
    // TAT over time (daily average)
    const tatOverTime = await StructuredReport.aggregate([
      { $match: filter },
      {
        $project: {
          date: {
            $dateToString: { format: '%Y-%m-%d', date: '$signedAt' }
          },
          tat: { 
            $divide: [
              { $subtract: ['$signedAt', '$createdAt'] },
              1000 * 60
            ]
          }
        }
      },
      {
        $group: {
          _id: '$date',
          avgTAT: { $avg: '$tat' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    return {
      overall: {
        averageTAT: Math.round(avgTAT),
        medianTAT: Math.round(medianTAT),
        totalReports: tatData.length
      },
      byModality: tatByModality.map(item => ({
        modality: item._id,
        avgTAT: Math.round(item.avgTAT),
        count: item.count
      })),
      overTime: tatOverTime.map(item => ({
        date: item._id,
        avgTAT: Math.round(item.avgTAT),
        count: item.count
      }))
    };
  } catch (error) {
    console.error('Error getting TAT metrics:', error);
    throw error;
  }
}

/**
 * Get AI usage metrics
 */
async function getAIUsageMetrics(startDate, endDate) {
  try {
    const dateFilter = {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    // AI analyze events
    const totalAnalyses = await TelemetryEvent.countDocuments({
      eventType: 'ai.analyze',
      ...dateFilter
    });
    
    // Suggestions applied
    const suggestionsApplied = await TelemetryEvent.countDocuments({
      eventType: 'ai.suggestion.applied',
      ...dateFilter
    });
    
    // Impressions generated
    const impressionsGenerated = await TelemetryEvent.countDocuments({
      eventType: 'ai.impression.generated',
      ...dateFilter
    });
    
    // Critical findings detected
    const criticalFindings = await TelemetryEvent.countDocuments({
      eventType: 'ai.critical.detected',
      ...dateFilter
    });
    
    // AI usage over time
    const aiUsageOverTime = await TelemetryEvent.aggregate([
      { 
        $match: { 
          eventType: { $in: ['ai.analyze', 'ai.suggestion.applied', 'ai.impression.generated'] },
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    return {
      totalAnalyses,
      suggestionsApplied,
      impressionsGenerated,
      criticalFindings,
      acceptanceRate: totalAnalyses > 0 ? ((suggestionsApplied / totalAnalyses) * 100).toFixed(1) : 0,
      usageOverTime: aiUsageOverTime.map(item => ({
        date: item._id.date,
        eventType: item._id.eventType,
        count: item.count
      }))
    };
  } catch (error) {
    console.error('Error getting AI usage metrics:', error);
    throw error;
  }
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(startDate, endDate) {
  try {
    const dateFilter = {
      timestamp: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    // Page load times
    const pageLoadMetrics = await TelemetryEvent.aggregate([
      { 
        $match: { 
          eventType: 'page.loaded',
          duration: { $exists: true },
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: '$metadata.page',
          avgDuration: { $avg: '$duration' },
          minDuration: { $min: '$duration' },
          maxDuration: { $max: '$duration' },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgDuration: -1 } }
    ]);
    
    // Error tracking
    const errorCount = await TelemetryEvent.countDocuments({
      eventType: 'error.occurred',
      ...dateFilter
    });
    
    const errorsByType = await TelemetryEvent.aggregate([
      { 
        $match: { 
          eventType: 'error.occurred',
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: '$error.code',
          message: { $first: '$error.message' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    return {
      pageLoadMetrics: pageLoadMetrics.map(item => ({
        page: item._id,
        avgDuration: Math.round(item.avgDuration),
        minDuration: item.minDuration,
        maxDuration: item.maxDuration,
        count: item.count
      })),
      errorCount,
      errorsByType: errorsByType.map(item => ({
        code: item._id,
        message: item.message,
        count: item.count
      }))
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    throw error;
  }
}

module.exports = {
  getReportMetrics,
  getUserActivityMetrics,
  getTemplateUsageStats,
  getTurnaroundTimeMetrics,
  getAIUsageMetrics,
  getPerformanceMetrics
};
