const { getOrthancPreviewClient } = require('./orthanc-preview-client');
const { getMetricsCollector } = require('./metrics-collector');
const Instance = require('../models/Instance');

// ============ FRAME CACHE FOR PERFORMANCE ============
// Simple LRU cache for frame data to reduce Orthanc requests
class FrameCache {
  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) { // 100 frames, 5 min TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  _makeKey(studyUid, seriesUid, frameIndex) {
    return `${studyUid}:${seriesUid}:${frameIndex}`;
  }

  get(studyUid, seriesUid, frameIndex) {
    const key = this._makeKey(studyUid, seriesUid, frameIndex);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.data;
  }

  set(studyUid, seriesUid, frameIndex, data) {
    const key = this._makeKey(studyUid, seriesUid, frameIndex);
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs
    };
  }

  clear() {
    this.cache.clear();
  }
}

// Global frame cache instance
const frameCache = new FrameCache(100, 5 * 60 * 1000);
// ============ END FRAME CACHE ============

/**
 * DICOMMigrationService - Handles gradual migration from Node DICOM decoding to Orthanc preview
 * Provides feature flags and performance monitoring for the migration process
 */
class DICOMMigrationService {
  constructor(config = {}) {
    this.config = {
      enableOrthancPreview: config.enableOrthancPreview !== false, // Default to true
      migrationPercentage: config.migrationPercentage || 100, // Percentage of requests to use Orthanc
      performanceThreshold: config.performanceThreshold || 5000, // 5 seconds
      enablePerformanceComparison: config.enablePerformanceComparison || false,
      ...config
    };

    this.orthancClient = getOrthancPreviewClient();
    this.metricsCollector = getMetricsCollector();
  }

  /**
   * Determine if a request should use Orthanc preview based on feature flags
   * @param {Object} context - Request context (studyUid, instanceId, etc.)
   * @returns {boolean} Whether to use Orthanc preview
   */
  shouldUseOrthancPreview(context = {}) {
    // Check global feature flag
    if (!this.config.enableOrthancPreview) {
      return false;
    }

    // Check migration percentage (gradual rollout)
    const random = Math.random() * 100;
    if (random > this.config.migrationPercentage) {
      return false;
    }

    // Check instance-specific flag if available
    if (context.instance && context.instance.useOrthancPreview !== undefined) {
      return context.instance.useOrthancPreview;
    }

    return true;
  }

  /**
   * Get frame with automatic fallback between Orthanc and Node decoding
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} nodeFallback - Node.js DICOM decoding fallback function
   */
  async getFrameWithMigration(req, res, nodeFallback) {
    const { studyUid, seriesUid, frameIndex } = req.params;
    const context = { studyUid, seriesUid, frameIndex };

    console.log('═══════════════════════════════════════════════════════');
    console.log('[MIGRATION SERVICE] Frame request received');
    console.log('[MIGRATION SERVICE] Study UID:', studyUid);
    console.log('[MIGRATION SERVICE] Series UID:', seriesUid || 'NOT PROVIDED');
    console.log('[MIGRATION SERVICE] Frame Index:', frameIndex);
    console.log('═══════════════════════════════════════════════════════');

    // Determine which method to use
    const useOrthanc = this.shouldUseOrthancPreview(context);

    if (useOrthanc) {
      try {
        return await this.getFrameWithOrthanc(req, res, nodeFallback);
      } catch (error) {
        console.warn('Orthanc preview failed, falling back to Node decoding:', error.message);
        this.metricsCollector.recordInstanceProcessed('orthanc_fallback', 'fallback_to_node');
        return await nodeFallback(req, res);
      }
    } else {
      // Use Node.js decoding
      this.metricsCollector.recordInstanceProcessed('node_selected', 'migration_routing');
      return await nodeFallback(req, res);
    }
  }

  /**
   * Get frame using Orthanc preview with performance monitoring
   * @private
   */
  async getFrameWithOrthanc(req, res, nodeFallback) {
    const timer = this.metricsCollector.startTimer('orthanc_preview_migration');

    try {
      const { studyUid, seriesUid, frameIndex } = req.params;
      const gIndex = Math.max(0, parseInt(frameIndex, 10) || 0);

      // ============ CHECK CACHE FIRST ============
      const cachedFrame = frameCache.get(studyUid, seriesUid, gIndex);
      if (cachedFrame) {
        console.log(`⚡ Cache HIT for frame ${gIndex} (${frameCache.getStats().size} cached)`);
        timer.end({ status: 'cache_hit' });
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Cache', 'HIT');
        return res.end(cachedFrame);
      }
      console.log(`📥 Cache MISS for frame ${gIndex}`);
      // ============ END CACHE CHECK ============

      // Find instances - filter by series if provided
      const query = { studyInstanceUID: studyUid };
      if (seriesUid) {
        query.seriesInstanceUID = seriesUid;
        console.log(`🎯 Migration Service: Filtering by series ${seriesUid}`);
      } else {
        console.log(`⚠️ Migration Service: NO series filter - will return all study instances`);
      }
      const instances = await Instance.find(query).lean();
      console.log(`📊 Migration Service: Found ${instances.length} instances`);
      
      // If no instances found locally, try fetching directly from Orthanc via DICOMweb
      if (!instances || instances.length === 0) {
        console.log('📡 No local instances found, trying DICOMweb WADO-RS...');
        
        try {
          const axios = require('axios');
          const orthancUrl = process.env.ORTHANC_URL || 'http://35.172.184.138:8043';
          const dicomWebBase = `${orthancUrl}/dicom-web`;
          
          // Build WADO-RS URL for the specific frame
          // Format: /studies/{studyUID}/series/{seriesUID}/instances/{sopInstanceUID}/frames/{frameNumber}
          // But we need to first get the instance metadata to find the SOP Instance UID
          
          let wadoUrl;
          if (seriesUid) {
            // Get series metadata to find instances
            const metadataUrl = `${dicomWebBase}/studies/${studyUid}/series/${seriesUid}/metadata`;
            console.log(`📡 Fetching series metadata: ${metadataUrl}`);
            
            const metadataResponse = await axios.get(metadataUrl, {
              auth: {
                username: process.env.ORTHANC_USERNAME || 'orthanc',
                password: process.env.ORTHANC_PASSWORD || 'orthanc'
              },
              timeout: 30000,
              headers: { 'Accept': 'application/json' }
            });
            
            const seriesInstances = metadataResponse.data;
            console.log(`📊 DICOMweb returned ${seriesInstances.length} instances for series`);
            
            if (seriesInstances && seriesInstances.length > 0) {
              // Sort by instance number
              seriesInstances.sort((a, b) => {
                const aNum = parseInt(a['00200013']?.Value?.[0]) || 0;
                const bNum = parseInt(b['00200013']?.Value?.[0]) || 0;
                return aNum - bNum;
              });
              
              // For multi-frame DICOM, we need to handle frame indexing
              // Each instance may have multiple frames (NumberOfFrames tag 00280008)
              let currentFrameOffset = 0;
              let targetInstance = null;
              let localFrameIndex = 0;
              
              for (const inst of seriesInstances) {
                const numFrames = parseInt(inst['00280008']?.Value?.[0]) || 1;
                
                if (gIndex < currentFrameOffset + numFrames) {
                  targetInstance = inst;
                  localFrameIndex = gIndex - currentFrameOffset;
                  break;
                }
                currentFrameOffset += numFrames;
              }
              
              if (!targetInstance) {
                // If frame index exceeds total frames, use last instance
                targetInstance = seriesInstances[seriesInstances.length - 1];
                localFrameIndex = 0;
              }
              
              const sopInstanceUID = targetInstance['00080018']?.Value?.[0];
              
              // WADO-RS rendered endpoint (returns image directly)
              // Frame numbers in WADO-RS are 1-based
              // Try different endpoints - some Orthanc versions don't support /rendered
              const frameNum = localFrameIndex + 1;
              
              // First try the preview endpoint (Orthanc-specific)
              const orthancPreviewUrl = `${orthancUrl}/instances/${sopInstanceUID}/frames/${localFrameIndex}/preview`;
              
              console.log(`📸 Trying Orthanc preview: ${orthancPreviewUrl}`);
              
              try {
                // Try to find the Orthanc instance ID first
                // Use a cache to avoid repeated lookups
                const cacheKey = `orthanc-id-${sopInstanceUID}`;
                let orthancInstanceId = this._orthancIdCache?.get(cacheKey);
                
                if (!orthancInstanceId) {
                  const findResponse = await axios.post(`${orthancUrl}/tools/find`, {
                    Level: 'Instance',
                    Query: { SOPInstanceUID: sopInstanceUID }
                  }, {
                    auth: {
                      username: process.env.ORTHANC_USERNAME || 'orthanc',
                      password: process.env.ORTHANC_PASSWORD || 'orthanc'
                    },
                    timeout: 30000 // Increased timeout
                  });
                  
                  if (findResponse.data && findResponse.data.length > 0) {
                    orthancInstanceId = findResponse.data[0];
                    // Cache the result
                    if (!this._orthancIdCache) {
                      this._orthancIdCache = new Map();
                    }
                    this._orthancIdCache.set(cacheKey, orthancInstanceId);
                  }
                }
                
                if (orthancInstanceId) {
                  const previewUrl = `${orthancUrl}/instances/${orthancInstanceId}/frames/${localFrameIndex}/preview`;
                  
                  console.log(`📸 Fetching frame via Orthanc preview: ${previewUrl}`);
                  
                  const frameResponse = await axios.get(previewUrl, {
                    auth: {
                      username: process.env.ORTHANC_USERNAME || 'orthanc',
                      password: process.env.ORTHANC_PASSWORD || 'orthanc'
                    },
                    timeout: 30000,
                    responseType: 'arraybuffer'
                  });
                  
                  timer.end({ status: 'success_orthanc_preview' });
                  
                  // ============ STORE IN CACHE ============
                  const frameBuffer = Buffer.from(frameResponse.data);
                  frameCache.set(studyUid, seriesUid, gIndex, frameBuffer);
                  console.log(`💾 Cached frame ${gIndex} (${frameCache.getStats().size} total)`);
                  // ============ END CACHE STORE ============
                  
                  res.setHeader('Content-Type', 'image/png');
                  res.setHeader('Cache-Control', 'public, max-age=3600');
                  res.setHeader('X-Preview-Method', 'orthanc-preview');
                  res.setHeader('X-Cache', 'MISS');
                  return res.end(frameBuffer);
                }
              } catch (previewError) {
                console.warn('Orthanc preview failed:', previewError.message);
              }
              
              // Fallback to WADO-RS
              wadoUrl = `${dicomWebBase}/studies/${studyUid}/series/${seriesUid}/instances/${sopInstanceUID}/frames/${frameNum}/rendered`;
              
              console.log(`📸 Fetching frame via WADO-RS: ${wadoUrl}`);
              
              const frameResponse = await axios.get(wadoUrl, {
                auth: {
                  username: process.env.ORTHANC_USERNAME || 'orthanc',
                  password: process.env.ORTHANC_PASSWORD || 'orthanc'
                },
                timeout: 30000,
                responseType: 'arraybuffer',
                headers: { 'Accept': 'image/png, image/jpeg, */*' }
              });
              
              timer.end({ status: 'success_dicomweb' });
              
              res.setHeader('Content-Type', frameResponse.headers['content-type'] || 'image/jpeg');
              res.setHeader('Cache-Control', 'public, max-age=3600');
              res.setHeader('X-Preview-Method', 'dicomweb-wado-rs');
              return res.end(Buffer.from(frameResponse.data));
            }
          }
          
          timer.end({ status: 'not_found' });
          throw new Error('No instances found for study');
          
        } catch (dicomWebError) {
          console.warn('DICOMweb WADO-RS failed:', dicomWebError.message);
          timer.end({ status: 'dicomweb_error' });
          throw new Error('No instances found for study');
        }
      }

      // Map global index to Orthanc instance
      const mapping = await this.mapGlobalIndexToOrthancInstance(instances, gIndex);
      if (!mapping) {
        timer.end({ status: 'mapping_failed' });
        throw new Error('Could not map frame index to Orthanc instance');
      }

      const { orthancInstanceId, localFrameIndex, instance } = mapping;

      // Use the local frame index (mapped from global index)
      const actualFrameIndex = localFrameIndex;

      console.log(`📸 Fetching frame from Orthanc: instanceId=${orthancInstanceId}, frameIndex=${actualFrameIndex}`);

      // Generate preview using Orthanc
      const pngBuffer = await this.orthancClient.generatePreview(orthancInstanceId, actualFrameIndex, {
        quality: req.query.quality ? parseInt(req.query.quality) : undefined,
        returnUnsupportedImage: true
      });

      // Record successful migration
      this.metricsCollector.recordInstanceProcessed('success', 'orthanc_preview_migration');
      timer.end({ status: 'success' });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Preview-Method', 'orthanc'); // Debug header
      return res.end(pngBuffer);

    } catch (error) {
      timer.end({ status: 'error' });
      throw error; // Let caller handle fallback
    }
  }

  /**
   * Map global frame index to Orthanc instance
   * @private
   */
  async mapGlobalIndexToOrthancInstance(instances, globalIndex) {
    // Sort instances by instanceNumber
    instances.sort((a, b) => {
      const ai = (a.instanceNumber !== undefined && a.instanceNumber !== null) ? a.instanceNumber : 0;
      const bi = (b.instanceNumber !== undefined && b.instanceNumber !== null) ? b.instanceNumber : 0;
      return ai - bi || (a._id.toString() < b._id.toString() ? -1 : 1);
    });

    // For multi-frame DICOM, each instance record represents one frame
    // The globalIndex directly maps to the instance index
    if (globalIndex >= 0 && globalIndex < instances.length) {
      const inst = instances[globalIndex];

      // Skip instances without Orthanc ID
      if (!inst.orthancInstanceId) {
        // Try to resolve Orthanc ID from SOP Instance UID
        const orthancInstanceId = await this.resolveOrthancInstanceId(inst.sopInstanceUID);
        if (!orthancInstanceId) {
          console.warn('Instance not available in Orthanc:', inst._id?.toString?.());
          return null;
        }

        // Update instance with Orthanc ID for future use
        await Instance.updateOne(
          { _id: inst._id },
          { $set: { orthancInstanceId } }
        );
        inst.orthancInstanceId = orthancInstanceId;
      }

      return {
        orthancInstanceId: inst.orthancInstanceId,
        localFrameIndex: inst.orthancFrameIndex || 0,
        instance: inst
      };
    }

    return null;
  }

  /**
   * Resolve Orthanc instance ID from SOP Instance UID
   * @private
   */
  async resolveOrthancInstanceId(sopInstanceUID) {
    try {
      // Query Orthanc to find instance by SOP Instance UID
      const response = await this.orthancClient.axiosInstance.post('/tools/find', {
        Level: 'Instance',
        Query: {
          SOPInstanceUID: sopInstanceUID
        }
      });

      if (response.data && response.data.length > 0) {
        return response.data[0]; // Return first matching instance ID
      }
    } catch (error) {
      console.warn('Failed to resolve Orthanc instance ID:', error.message);
    }
    return null;
  }

  /**
   * Compare performance between Orthanc and Node decoding
   * @param {string} studyUid - Study instance UID
   * @param {number} frameIndex - Frame index
   * @returns {Promise<Object>} Performance comparison results
   */
  async comparePerformance(studyUid, frameIndex) {
    if (!this.config.enablePerformanceComparison) {
      return { enabled: false };
    }

    const results = {
      studyUid,
      frameIndex,
      timestamp: new Date().toISOString(),
      orthanc: null,
      node: null,
      winner: null
    };

    try {
      // Test Orthanc performance
      const orthancStart = Date.now();
      await this.testOrthancPreview(studyUid, frameIndex);
      results.orthanc = {
        duration: Date.now() - orthancStart,
        success: true
      };
    } catch (error) {
      results.orthanc = {
        duration: null,
        success: false,
        error: error.message
      };
    }

    try {
      // Test Node performance (would need to be implemented)
      const nodeStart = Date.now();
      await this.testNodeDecoding(studyUid, frameIndex);
      results.node = {
        duration: Date.now() - nodeStart,
        success: true
      };
    } catch (error) {
      results.node = {
        duration: null,
        success: false,
        error: error.message
      };
    }

    // Determine winner
    if (results.orthanc.success && results.node.success) {
      results.winner = results.orthanc.duration < results.node.duration ? 'orthanc' : 'node';
    } else if (results.orthanc.success) {
      results.winner = 'orthanc';
    } else if (results.node.success) {
      results.winner = 'node';
    }

    // Record performance metrics
    this.metricsCollector.recordInstanceProcessed(results.winner || 'both_failed', 'performance_comparison');

    return results;
  }

  /**
   * Test Orthanc preview performance
   * @private
   */
  async testOrthancPreview(studyUid, frameIndex) {
    const instances = await Instance.find({ studyInstanceUID: studyUid }).lean();
    if (!instances || instances.length === 0) {
      throw new Error('No instances found');
    }

    const mapping = await this.mapGlobalIndexToOrthancInstance(instances, frameIndex);
    if (!mapping) {
      throw new Error('Could not map to Orthanc instance');
    }

    await this.orthancClient.generatePreview(mapping.orthancInstanceId, mapping.localFrameIndex);
  }

  /**
   * Test Node decoding performance (placeholder)
   * @private
   */
  async testNodeDecoding(studyUid, frameIndex) {
    // This would call the original Node.js DICOM decoding logic
    // For now, just simulate the call
    throw new Error('Node decoding test not implemented');
  }

  /**
   * Get migration statistics
   * @returns {Object} Migration statistics
   */
  getMigrationStats() {
    return {
      config: {
        enableOrthancPreview: this.config.enableOrthancPreview,
        migrationPercentage: this.config.migrationPercentage,
        performanceThreshold: this.config.performanceThreshold
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update migration configuration
   * @param {Object} newConfig - New configuration options
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('Migration configuration updated:', this.config);
  }
}

// Singleton instance
let migrationServiceInstance = null;

/**
 * Get singleton instance of DICOMMigrationService
 * @param {Object} config - Configuration options
 * @returns {DICOMMigrationService} Singleton instance
 */
function getDICOMMigrationService(config = {}) {
  if (!migrationServiceInstance) {
    migrationServiceInstance = new DICOMMigrationService(config);
  }
  return migrationServiceInstance;
}

module.exports = { DICOMMigrationService, getDICOMMigrationService };