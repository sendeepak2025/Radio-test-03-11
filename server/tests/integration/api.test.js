const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../server');
const User = require('../../src/models/User');
const Report = require('../../src/models/Report');
const Patient = require('../../src/models/Patient');
const ReportTemplate = require('../../src/models/ReportTemplate');

let authToken;
let testUser;
let testPatient;
let testTemplate;
let testReport;

beforeAll(async () => {
  // Connect to test database
  const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/radiology-test';
  await mongoose.connect(mongoUri);
  
  // Clear test data
  await User.deleteMany({});
  await Report.deleteMany({});
  await Patient.deleteMany({});
  await ReportTemplate.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Authentication API', () => {
  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@radiology.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'Radiologist',
          role: 'radiologist'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test@radiology.com');
      
      testUser = response.body.user;
      authToken = response.body.token;
    });

    it('should not register with duplicate email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@radiology.com',
          password: 'TestPassword123!',
          firstName: 'Duplicate',
          lastName: 'User'
        });

      expect(response.status).toBe(400);
    });

    it('should not register with weak password', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'weak@radiology.com',
          password: '123',
          firstName: 'Weak',
          lastName: 'Password'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@radiology.com',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should not login with invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@radiology.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /auth/me', () => {
    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('test@radiology.com');
    });

    it('should not get user without token', async () => {
      const response = await request(app).get('/auth/me');
      expect(response.status).toBe(401);
    });
  });
});

describe('Reports API', () => {
  beforeAll(async () => {
    // Create test patient
    testPatient = await Patient.create({
      firstName: 'John',
      lastName: 'Doe',
      mrn: 'MRN123456',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'male'
    });

    // Create test template
    testTemplate = await ReportTemplate.create({
      name: 'Test Template',
      modality: 'X-Ray',
      bodyPart: 'Chest',
      structure: {
        sections: [
          { id: 'indication', title: 'Indication', required: true },
          { id: 'findings', title: 'Findings', required: true },
          { id: 'impression', title: 'Impression', required: true }
        ]
      },
      createdBy: testUser._id,
      isActive: true
    });
  });

  describe('POST /api/reports', () => {
    it('should create a new report', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: testPatient._id,
          templateId: testTemplate._id,
          modality: 'X-Ray',
          bodyPart: 'Chest',
          content: {
            indication: 'Cough',
            findings: 'Normal',
            impression: 'No abnormality'
          },
          status: 'draft'
        });

      expect(response.status).toBe(201);
      expect(response.body.report).toHaveProperty('_id');
      expect(response.body.report.status).toBe('draft');
      
      testReport = response.body.report;
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          modality: 'X-Ray'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/reports', () => {
    it('should get all reports for user', async () => {
      const response = await request(app)
        .get('/api/reports')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.reports)).toBe(true);
      expect(response.body.reports.length).toBeGreaterThan(0);
    });

    it('should filter reports by status', async () => {
      const response = await request(app)
        .get('/api/reports?status=draft')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reports.every(r => r.status === 'draft')).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/reports?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.reports.length).toBeLessThanOrEqual(5);
      expect(response.body).toHaveProperty('pagination');
    });
  });

  describe('GET /api/reports/:id', () => {
    it('should get a specific report', async () => {
      const response = await request(app)
        .get(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body._id).toBe(testReport._id);
    });

    it('should return 404 for non-existent report', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/reports/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/reports/:id', () => {
    it('should update a report', async () => {
      const response = await request(app)
        .put(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: {
            indication: 'Updated indication',
            findings: 'Updated findings',
            impression: 'Updated impression'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.report.content.indication).toBe('Updated indication');
    });

    it('should not update signed report', async () => {
      // First, sign the report
      await Report.findByIdAndUpdate(testReport._id, { status: 'signed' });

      const response = await request(app)
        .put(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: { findings: 'Try to update' }
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/reports/:id', () => {
    it('should delete a draft report', async () => {
      // Reset to draft
      await Report.findByIdAndUpdate(testReport._id, { status: 'draft' });

      const response = await request(app)
        .delete(`/api/reports/${testReport._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });
});

describe('Templates API', () => {
  describe('GET /api/templates', () => {
    it('should get all active templates', async () => {
      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.templates)).toBe(true);
    });

    it('should filter templates by modality', async () => {
      const response = await request(app)
        .get('/api/templates?modality=X-Ray')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.templates.every(t => t.modality === 'X-Ray')).toBe(true);
    });
  });

  describe('POST /api/templates', () => {
    it('should create a new template', async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Template',
          modality: 'CT',
          bodyPart: 'Abdomen',
          structure: {
            sections: [
              { id: 'indication', title: 'Indication', required: true }
            ]
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.template.name).toBe('New Template');
    });
  });
});

describe('Search API', () => {
  describe('POST /api/search/reports', () => {
    it('should search reports with query', async () => {
      const response = await request(app)
        .post('/api/search/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'normal',
          from: 0,
          size: 10
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('total');
    });

    it('should search with filters', async () => {
      const response = await request(app)
        .post('/api/search/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: '',
          filters: {
            modality: 'X-Ray',
            status: ['draft', 'final']
          },
          from: 0,
          size: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
    });
  });

  describe('GET /api/search/suggestions', () => {
    it('should get autocomplete suggestions', async () => {
      const response = await request(app)
        .get('/api/search/suggestions?q=pneu')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });
  });
});

describe('Collaboration API', () => {
  describe('POST /api/collaboration/peer-review/request', () => {
    it('should create peer review request', async () => {
      const response = await request(app)
        .post('/api/collaboration/peer-review/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportId: testReport._id,
          reviewerId: testUser._id,
          priority: 'normal',
          notes: 'Please review'
        });

      expect(response.status).toBe(201);
      expect(response.body.review).toHaveProperty('_id');
    });
  });

  describe('POST /api/collaboration/consultation/request', () => {
    it('should create consultation request', async () => {
      const response = await request(app)
        .post('/api/collaboration/consultation/request')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportId: testReport._id,
          specialistId: testUser._id,
          specialistDepartment: 'Cardiology',
          urgency: 'routine',
          clinicalQuestion: 'Is this normal?'
        });

      expect(response.status).toBe(201);
      expect(response.body.consultation).toHaveProperty('_id');
    });
  });
});

describe('Batch Operations API', () => {
  describe('POST /api/batch-operations/export/pdf', () => {
    it('should queue batch PDF export', async () => {
      const response = await request(app)
        .post('/api/batch-operations/export/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportIds: [testReport._id],
          format: 'zip'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jobId');
    });

    it('should reject too many reports', async () => {
      const manyIds = Array(101).fill(testReport._id);
      const response = await request(app)
        .post('/api/batch-operations/export/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportIds: manyIds
        });

      expect(response.status).toBe(400);
    });
  });
});

describe('Monitoring API', () => {
  describe('GET /api/monitoring/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/monitoring/health');

      expect(response.status).toBe(200);
      expect(response.body.health).toHaveProperty('status');
    });
  });

  describe('GET /api/monitoring/metrics', () => {
    it('should return metrics for admin', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`);

      // Will fail if user is not admin, which is expected
      expect([200, 403]).toContain(response.status);
    });
  });
});

describe('Error Handling', () => {
  it('should handle 404 for unknown routes', async () => {
    const response = await request(app).get('/api/nonexistent');
    expect(response.status).toBe(404);
  });

  it('should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    expect(response.status).toBe(400);
  });

  it('should handle invalid ObjectId', async () => {
    const response = await request(app)
      .get('/api/reports/invalid-id')
      .set('Authorization', `Bearer ${authToken}`);

    expect([400, 404]).toContain(response.status);
  });
});

describe('Rate Limiting', () => {
  it('should rate limit excessive requests', async () => {
    const requests = [];
    
    // Send 100 requests rapidly
    for (let i = 0; i < 100; i++) {
      requests.push(
        request(app)
          .get('/api/reports')
          .set('Authorization', `Bearer ${authToken}`)
      );
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);

    // Should hit rate limit
    expect(rateLimited).toBe(true);
  }, 30000);
});
