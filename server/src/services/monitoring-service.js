/**
 * Production Monitoring Service
 * System health monitoring and performance tracking
 */

const os = require('os');
const mongoose = require('mongoose');
const { cacheService } = require('./cache-service');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: new Map(), // Method -> count
      errors: [],
      slowQueries: [],
      systemHealth: []
    };
    
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
  }

  /**
   * Record HTTP request
   */
  recordRequest(method, path, duration, statusCode) {
    const key = `${method}:${path}`;
    
    if (!this.metrics.requests.has(key)) {
      this.metrics.requests.set(key, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        statusCodes: {}
      });
    }

    const metric = this.metrics.requests.get(key);
    metric.count++;
    metric.totalDuration += duration;
    metric.avgDuration = metric.totalDuration / metric.count;
    metric.statusCodes[statusCode] = (metric.statusCodes[statusCode] || 0) + 1;

    this.requestCount++;

    // Track slow requests
    if (duration > 1000) {
      this.metrics.slowQueries.push({
        method,
        path,
        duration,
        timestamp: new Date()
      });

      // Keep only last 100 slow queries
      if (this.metrics.slowQueries.length > 100) {
        this.metrics.slowQueries.shift();
      }
    }
  }

  /**
   * Record error
   */
  recordError(error, context = {}) {
    this.errorCount++;
    
    this.metrics.errors.push({
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    });

    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    const uptime = Date.now() - this.startTime;
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: {
        ms: uptime,
        hours: (uptime / (1000 * 60 * 60)).toFixed(2),
        formatted: this.formatUptime(uptime)
      },
      process: {
        memory: {
          rss: this.formatBytes(memUsage.rss),
          heapTotal: this.formatBytes(memUsage.heapTotal),
          heapUsed: this.formatBytes(memUsage.heapUsed),
          external: this.formatBytes(memUsage.external)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        pid: process.pid
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: this.formatBytes(os.totalmem()),
        freeMemory: this.formatBytes(os.freemem()),
        loadAverage: os.loadavg()
      }
    };
  }

  /**
   * Get database metrics
   */
  async getDatabaseMetrics() {
    try {
      const dbStats = await mongoose.connection.db.stats();
      
      return {
        connected: mongoose.connection.readyState === 1,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        collections: dbStats.collections,
        dataSize: this.formatBytes(dbStats.dataSize),
        storageSize: this.formatBytes(dbStats.storageSize),
        indexes: dbStats.indexes,
        indexSize: this.formatBytes(dbStats.indexSize),
        avgObjSize: this.formatBytes(dbStats.avgObjSize)
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Get cache metrics
   */
  getCacheMetrics() {
    return cacheService.getStats();
  }

  /**
   * Get application metrics
   */
  getApplicationMetrics() {
    const topRequests = Array.from(this.metrics.requests.entries())
      .map(([key, value]) => ({ endpoint: key, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const slowestRequests = [...this.metrics.slowQueries]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    return {
      totalRequests: this.requestCount,
      totalErrors: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) : 0,
      topRequests,
      slowestRequests,
      recentErrors: this.metrics.errors.slice(-10)
    };
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    const systemMetrics = await this.getSystemMetrics();
    const dbMetrics = await this.getDatabaseMetrics();
    const cacheMetrics = this.getCacheMetrics();
    const appMetrics = this.getApplicationMetrics();

    const health = {
      status: 'healthy',
      timestamp: new Date(),
      checks: {
        database: dbMetrics.connected ? 'pass' : 'fail',
        memory: this.checkMemoryHealth(systemMetrics.process.memory),
        errors: appMetrics.errorRate < 0.05 ? 'pass' : 'warn',
        cache: cacheMetrics.hitRate > 0.5 ? 'pass' : 'warn'
      }
    };

    // Determine overall status
    const checks = Object.values(health.checks);
    if (checks.includes('fail')) {
      health.status = 'unhealthy';
    } else if (checks.includes('warn')) {
      health.status = 'degraded';
    }

    return {
      health,
      system: systemMetrics,
      database: dbMetrics,
      cache: cacheMetrics,
      application: appMetrics
    };
  }

  /**
   * Check memory health
   */
  checkMemoryHealth(memory) {
    const heapUsedPercent = (memory.heapUsed / memory.heapTotal) * 100;
    
    if (heapUsedPercent > 90) return 'fail';
    if (heapUsedPercent > 75) return 'warn';
    return 'pass';
  }

  /**
   * Format bytes to human-readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return {
      value: parseFloat((bytes / Math.pow(k, i)).toFixed(2)),
      unit: sizes[i],
      formatted: parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    };
  }

  /**
   * Format uptime
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Reset metrics (for testing)
   */
  resetMetrics() {
    this.metrics.requests.clear();
    this.metrics.errors = [];
    this.metrics.slowQueries = [];
    this.requestCount = 0;
    this.errorCount = 0;
  }

  /**
   * Get alerts
   */
  async getAlerts() {
    const alerts = [];
    const health = await this.getHealthStatus();

    if (health.checks.database === 'fail') {
      alerts.push({
        severity: 'critical',
        message: 'Database connection lost',
        timestamp: new Date()
      });
    }

    if (health.checks.memory === 'fail') {
      alerts.push({
        severity: 'critical',
        message: 'Memory usage critical (>90%)',
        timestamp: new Date()
      });
    }

    if (health.checks.errors === 'warn') {
      alerts.push({
        severity: 'warning',
        message: `High error rate (${(health.application.errorRate * 100).toFixed(2)}%)`,
        timestamp: new Date()
      });
    }

    if (health.application.slowestRequests.length > 0) {
      const slowest = health.application.slowestRequests[0];
      if (slowest.duration > 5000) {
        alerts.push({
          severity: 'warning',
          message: `Very slow request detected (${slowest.duration}ms): ${slowest.method} ${slowest.path}`,
          timestamp: new Date()
        });
      }
    }

    return alerts;
  }
}

module.exports = new MonitoringService();
