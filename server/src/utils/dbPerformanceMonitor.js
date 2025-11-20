/**
 * Database Query Performance Monitor
 * Tracks slow queries and provides optimization recommendations
 */

const mongoose = require('mongoose');

class DatabasePerformanceMonitor {
  constructor() {
    this.slowQueryThreshold = 100; // ms
    this.slowQueries = [];
    this.queryStats = new Map();
  }

  /**
   * Enable MongoDB profiling for slow query detection
   */
  async enableProfiling(level = 1, slowMs = 100) {
    try {
      const db = mongoose.connection.db;
      await db.command({ profile: level, slowms: slowMs });
      console.log(`✅ MongoDB profiling enabled (level: ${level}, slowMs: ${slowMs})`);
    } catch (error) {
      console.error('❌ Failed to enable MongoDB profiling:', error.message);
    }
  }

  /**
   * Get slow query statistics
   */
  async getSlowQueries(limit = 10) {
    try {
      const db = mongoose.connection.db;
      const systemProfile = db.collection('system.profile');
      
      const slowQueries = await systemProfile
        .find({ millis: { $gt: this.slowQueryThreshold } })
        .sort({ ts: -1 })
        .limit(limit)
        .toArray();

      return slowQueries.map(q => ({
        operation: q.op,
        namespace: q.ns,
        query: q.command?.filter || q.command?.query,
        duration: q.millis,
        timestamp: q.ts,
        planSummary: q.planSummary
      }));
    } catch (error) {
      console.error('Error fetching slow queries:', error.message);
      return [];
    }
  }

  /**
   * Get index usage statistics for a collection
   */
  async getIndexStats(collectionName) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);
      
      const indexStats = await collection.aggregate([
        { $indexStats: {} }
      ]).toArray();

      return indexStats.map(stat => ({
        name: stat.name,
        usageCount: stat.accesses.ops,
        usageSince: stat.accesses.since
      }));
    } catch (error) {
      console.error(`Error fetching index stats for ${collectionName}:`, error.message);
      return [];
    }
  }

  /**
   * Analyze query execution plan
   */
  async explainQuery(collection, query) {
    try {
      const db = mongoose.connection.db;
      const coll = db.collection(collection);
      
      const explanation = await coll.find(query).explain('executionStats');
      
      return {
        executionTimeMs: explanation.executionStats.executionTimeMillis,
        totalDocsExamined: explanation.executionStats.totalDocsExamined,
        totalKeysExamined: explanation.executionStats.totalKeysExamined,
        indexUsed: explanation.executionStats.executionStages.indexName,
        stage: explanation.executionStats.executionStages.stage,
        efficient: explanation.executionStats.totalDocsExamined === explanation.executionStats.nReturned
      };
    } catch (error) {
      console.error('Error explaining query:', error.message);
      return null;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionName) {
    try {
      const db = mongoose.connection.db;
      const stats = await db.command({ collStats: collectionName });
      
      return {
        count: stats.count,
        size: stats.size,
        avgObjSize: stats.avgObjSize,
        storageSize: stats.storageSize,
        indexes: stats.nindexes,
        totalIndexSize: stats.totalIndexSize,
        paddingFactor: stats.paddingFactor
      };
    } catch (error) {
      console.error(`Error fetching stats for ${collectionName}:`, error.message);
      return null;
    }
  }

  /**
   * Monitor query performance
   */
  monitorQuery(model, operation, query, duration) {
    const key = `${model}.${operation}`;
    
    if (!this.queryStats.has(key)) {
      this.queryStats.set(key, {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        slowCount: 0
      });
    }

    const stats = this.queryStats.get(key);
    stats.count++;
    stats.totalDuration += duration;
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.minDuration = Math.min(stats.minDuration, duration);
    
    if (duration > this.slowQueryThreshold) {
      stats.slowCount++;
      this.slowQueries.push({
        model,
        operation,
        query,
        duration,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = [];
    
    for (const [key, stats] of this.queryStats.entries()) {
      summary.push({
        operation: key,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        maxDuration: stats.maxDuration,
        minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration,
        slowQueryRate: (stats.slowCount / stats.count * 100).toFixed(2) + '%'
      });
    }

    return summary.sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations() {
    const recommendations = [];
    const slowQueries = await this.getSlowQueries(20);

    // Analyze slow queries
    for (const query of slowQueries) {
      if (query.planSummary === 'COLLSCAN') {
        recommendations.push({
          severity: 'HIGH',
          type: 'MISSING_INDEX',
          collection: query.namespace.split('.')[1],
          suggestion: `Add index for fields: ${JSON.stringify(query.query)}`,
          impact: 'High - Full collection scan detected'
        });
      }

      if (query.duration > 1000) {
        recommendations.push({
          severity: 'CRITICAL',
          type: 'SLOW_QUERY',
          collection: query.namespace.split('.')[1],
          suggestion: 'Query took over 1 second - consider optimization',
          duration: query.duration
        });
      }
    }

    // Check unused indexes
    const collections = ['reports', 'users', 'hospitals', 'followups', 'feedback'];
    for (const collection of collections) {
      const indexStats = await this.getIndexStats(collection);
      const unusedIndexes = indexStats.filter(idx => idx.name !== '_id_' && idx.usageCount === 0);

      if (unusedIndexes.length > 0) {
        recommendations.push({
          severity: 'MEDIUM',
          type: 'UNUSED_INDEX',
          collection,
          suggestion: `Consider removing unused indexes: ${unusedIndexes.map(i => i.name).join(', ')}`,
          impact: 'Medium - Wasting storage and write performance'
        });
      }
    }

    return recommendations;
  }

  /**
   * Clear statistics
   */
  clearStats() {
    this.slowQueries = [];
    this.queryStats.clear();
  }
}

module.exports = new DatabasePerformanceMonitor();
