/**
 * Elasticsearch Service
 * Full-text search and advanced filtering for reports, patients, and templates
 */

const { Client } = require('@elastic/elasticsearch');

class ElasticsearchService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.indices = {
      reports: 'reports',
      patients: 'patients',
      templates: 'templates'
    };
  }

  /**
   * Initialize Elasticsearch client
   */
  async initialize() {
    try {
      const esNode = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
      
      this.client = new Client({
        node: esNode,
        auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD ? {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD
        } : undefined
      });

      // Test connection
      const health = await this.client.cluster.health();
      this.isConnected = true;
      console.log('✅ Elasticsearch connected:', health.status);

      // Create indices if they don't exist
      await this.createIndices();

    } catch (error) {
      console.warn('⚠️ Elasticsearch not available, search will use fallback:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Create indices with mappings
   */
  async createIndices() {
    if (!this.client) return;

    // Reports index
    try {
      const reportExists = await this.client.indices.exists({ index: this.indices.reports });
      if (!reportExists) {
        await this.client.indices.create({
          index: this.indices.reports,
          body: {
            mappings: {
              properties: {
                reportId: { type: 'keyword' },
                patientId: { type: 'keyword' },
                patientName: { type: 'text' },
                mrn: { type: 'keyword' },
                studyInstanceUID: { type: 'keyword' },
                modality: { type: 'keyword' },
                bodyPart: { type: 'keyword' },
                status: { type: 'keyword' },
                priority: { type: 'keyword' },
                templateName: { type: 'text' },
                content: { type: 'text' },
                findings: { type: 'text' },
                impression: { type: 'text' },
                radiologistId: { type: 'keyword' },
                radiologistName: { type: 'text' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' },
                signedAt: { type: 'date' }
              }
            }
          }
        });
        console.log('✅ Created reports index');
      }
    } catch (error) {
      console.error('Error creating reports index:', error.message);
    }

    // Patients index
    try {
      const patientExists = await this.client.indices.exists({ index: this.indices.patients });
      if (!patientExists) {
        await this.client.indices.create({
          index: this.indices.patients,
          body: {
            mappings: {
              properties: {
                patientId: { type: 'keyword' },
                firstName: { type: 'text' },
                lastName: { type: 'text' },
                fullName: { type: 'text' },
                mrn: { type: 'keyword' },
                dateOfBirth: { type: 'date' },
                gender: { type: 'keyword' },
                createdAt: { type: 'date' }
              }
            }
          }
        });
        console.log('✅ Created patients index');
      }
    } catch (error) {
      console.error('Error creating patients index:', error.message);
    }
  }

  /**
   * Index a report
   */
  async indexReport(report) {
    if (!this.isConnected || !this.client) return;

    try {
      await this.client.index({
        index: this.indices.reports,
        id: report._id.toString(),
        body: {
          reportId: report._id.toString(),
          patientId: report.patientId?._id?.toString() || report.patientId,
          patientName: report.patientId ? `${report.patientId.firstName} ${report.patientId.lastName}` : '',
          mrn: report.patientId?.mrn || '',
          studyInstanceUID: report.studyInstanceUID,
          modality: report.modality,
          bodyPart: report.bodyPart,
          status: report.status,
          priority: report.priority,
          templateName: report.templateId?.name || '',
          content: JSON.stringify(report.content || {}),
          findings: report.content?.findings || '',
          impression: report.content?.impression || '',
          radiologistId: report.userId?._id?.toString() || report.userId,
          radiologistName: report.userId ? `${report.userId.firstName} ${report.userId.lastName}` : '',
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          signedAt: report.signedAt
        }
      });
    } catch (error) {
      console.error('Error indexing report:', error.message);
    }
  }

  /**
   * Search reports
   */
  async searchReports(query, filters = {}, options = {}) {
    if (!this.isConnected || !this.client) {
      throw new Error('Elasticsearch not available');
    }

    const {
      from = 0,
      size = 20,
      sort = '_score'
    } = options;

    // Build query
    const must = [];
    const filter = [];

    // Full-text search
    if (query && query.trim()) {
      must.push({
        multi_match: {
          query: query,
          fields: ['patientName^3', 'mrn^3', 'findings^2', 'impression^2', 'content', 'templateName'],
          fuzziness: 'AUTO',
          operator: 'or'
        }
      });
    }

    // Filters
    if (filters.modality) {
      filter.push({ term: { modality: filters.modality } });
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        filter.push({ terms: { status: filters.status } });
      } else {
        filter.push({ term: { status: filters.status } });
      }
    }

    if (filters.priority) {
      filter.push({ term: { priority: filters.priority } });
    }

    if (filters.radiologistId) {
      filter.push({ term: { radiologistId: filters.radiologistId } });
    }

    if (filters.bodyPart) {
      filter.push({ match: { bodyPart: filters.bodyPart } });
    }

    // Date range
    if (filters.dateFrom || filters.dateTo) {
      const range = {};
      if (filters.dateFrom) range.gte = filters.dateFrom;
      if (filters.dateTo) range.lte = filters.dateTo;
      filter.push({ range: { createdAt: range } });
    }

    // Build Elasticsearch query
    const esQuery = {
      bool: {
        must: must.length > 0 ? must : [{ match_all: {} }],
        filter
      }
    };

    try {
      const result = await this.client.search({
        index: this.indices.reports,
        body: {
          query: esQuery,
          from,
          size,
          sort: sort === '_score' ? undefined : [{ [sort]: { order: 'desc' } }],
          highlight: {
            fields: {
              patientName: {},
              findings: {},
              impression: {},
              content: {}
            },
            pre_tags: ['<mark>'],
            post_tags: ['</mark>']
          }
        }
      });

      return {
        hits: result.hits.hits.map(hit => ({
          _id: hit._id,
          _score: hit._score,
          ...hit._source,
          highlights: hit.highlight
        })),
        total: result.hits.total.value,
        maxScore: result.hits.max_score
      };
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSuggestions(prefix, field = 'patientName') {
    if (!this.isConnected || !this.client) {
      return [];
    }

    try {
      const result = await this.client.search({
        index: this.indices.reports,
        body: {
          suggest: {
            suggestions: {
              prefix,
              completion: {
                field: field,
                size: 10,
                fuzzy: {
                  fuzziness: 'AUTO'
                }
              }
            }
          }
        }
      });

      return result.suggest.suggestions[0].options.map(opt => opt.text);
    } catch (error) {
      console.error('Error getting suggestions:', error.message);
      return [];
    }
  }

  /**
   * Aggregate search (faceted search)
   */
  async getAggregations(query = '', filters = {}) {
    if (!this.isConnected || !this.client) {
      return {};
    }

    try {
      const result = await this.client.search({
        index: this.indices.reports,
        body: {
          size: 0,
          query: query ? {
            multi_match: {
              query,
              fields: ['patientName', 'findings', 'impression']
            }
          } : { match_all: {} },
          aggs: {
            modalities: {
              terms: { field: 'modality', size: 20 }
            },
            statuses: {
              terms: { field: 'status', size: 10 }
            },
            priorities: {
              terms: { field: 'priority', size: 5 }
            },
            bodyParts: {
              terms: { field: 'bodyPart', size: 20 }
            }
          }
        }
      });

      return {
        modalities: result.aggregations.modalities.buckets,
        statuses: result.aggregations.statuses.buckets,
        priorities: result.aggregations.priorities.buckets,
        bodyParts: result.aggregations.bodyParts.buckets
      };
    } catch (error) {
      console.error('Error getting aggregations:', error);
      return {};
    }
  }

  /**
   * Delete report from index
   */
  async deleteReport(reportId) {
    if (!this.isConnected || !this.client) return;

    try {
      await this.client.delete({
        index: this.indices.reports,
        id: reportId
      });
    } catch (error) {
      console.error('Error deleting report from index:', error.message);
    }
  }

  /**
   * Bulk index reports
   */
  async bulkIndexReports(reports) {
    if (!this.isConnected || !this.client) return;

    const body = reports.flatMap(report => [
      { index: { _index: this.indices.reports, _id: report._id.toString() } },
      {
        reportId: report._id.toString(),
        patientId: report.patientId?._id?.toString(),
        patientName: report.patientId ? `${report.patientId.firstName} ${report.patientId.lastName}` : '',
        mrn: report.patientId?.mrn || '',
        modality: report.modality,
        status: report.status,
        content: JSON.stringify(report.content || {}),
        createdAt: report.createdAt
      }
    ]);

    try {
      const result = await this.client.bulk({ body });
      console.log(`✅ Bulk indexed ${reports.length} reports, errors: ${result.errors}`);
    } catch (error) {
      console.error('Bulk indexing error:', error);
    }
  }

  /**
   * Reindex all reports
   */
  async reindexReports() {
    if (!this.isConnected) {
      console.warn('⚠️ Cannot reindex: Elasticsearch not connected');
      return;
    }

    try {
      const Report = require('../models/Report');
      const reports = await Report.find()
        .populate('patientId', 'firstName lastName mrn')
        .populate('userId', 'firstName lastName')
        .populate('templateId', 'name')
        .limit(1000);

      await this.bulkIndexReports(reports);
      console.log(`✅ Reindexed ${reports.length} reports`);
    } catch (error) {
      console.error('Reindexing failed:', error);
    }
  }
}

module.exports = new ElasticsearchService();
