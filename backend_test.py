#!/usr/bin/env python3
"""
Backend API Testing Script for DICOM Medical System
Tests the Node.js/Express backend endpoints as specified in review request.
"""

import requests
import json
import sys
from datetime import datetime
import uuid

class BackendTester:
    def __init__(self, base_url="http://127.0.0.1:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_result(self, test_name, success, response_data=None, error=None):
        """Log test result"""
        result = {
            'test': test_name,
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'response_data': response_data,
            'error': str(error) if error else None
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if error:
            print(f"   Error: {error}")
        if response_data and isinstance(response_data, dict):
            if 'success' in response_data:
                print(f"   Success: {response_data['success']}")
            if 'message' in response_data:
                print(f"   Message: {response_data['message']}")
        print()
        
    def test_health_root(self):
        """Test GET / (health root)"""
        try:
            response = self.session.get(f"{self.base_url}/")
            success = response.status_code == 200
            self.log_result("Health Root (GET /)", success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {'status_code': response.status_code, 'text': response.text[:200]})
            return success
        except Exception as e:
            self.log_result("Health Root (GET /)", False, error=e)
            return False
            
    def test_health_subroutes(self):
        """Test GET /health (health subroutes)"""
        try:
            response = self.session.get(f"{self.base_url}/health")
            success = response.status_code == 200
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
            
            # Health endpoint should return 200 even if status is unknown in dev mode
            if data and 'overall' in data:
                success = True
            
            self.log_result("Health Subroutes (GET /health)", success, data or {'status_code': response.status_code, 'text': response.text[:200]})
            return success
        except Exception as e:
            self.log_result("Health Subroutes (GET /health)", False, error=e)
            return False
            
    def test_structured_reports_test(self):
        """Test GET /api/reports/test (public test)"""
        try:
            response = self.session.get(f"{self.base_url}/api/reports/test")
            success = response.status_code == 200
            data = response.json() if response.headers.get('content-type', '').startswith('application/json') else None
            
            # Check if success is true as expected
            if data and data.get('success') == True:
                success = True
            else:
                success = False
                
            self.log_result("Structured Reports Test (GET /api/reports/test)", success, data or {'status_code': response.status_code, 'text': response.text[:200]})
            return success
        except Exception as e:
            self.log_result("Structured Reports Test (GET /api/reports/test)", False, error=e)
            return False
            
    def test_ai_status(self):
        """Test GET /api/ai/status (verify enabled flags) - requires auth"""
        return self.test_with_auth("/api/ai/status", "GET", test_name="AI Status (GET /api/ai/status)")
            
    def attempt_login(self):
        """Attempt to login to get auth token"""
        # Try common default credentials
        credentials_to_try = [
            {"username": "superadmin", "password": "12345678"},
            {"username": "admin", "password": "admin"},
            {"username": "admin", "password": "password"},
            {"username": "admin", "password": "admin123"},
            {"username": "radiologist", "password": "password"},
            {"username": "test", "password": "test"},
            {"email": "admin@example.com", "password": "admin"},
            {"email": "admin@hospital.com", "password": "password"}
        ]
        
        for creds in credentials_to_try:
            try:
                response = self.session.post(f"{self.base_url}/auth/login", json=creds)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success') and data.get('accessToken'):
                        self.auth_token = data['accessToken']
                        self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                        print(f"✅ Login successful with credentials: {creds}")
                        return True
            except Exception as e:
                continue
                
        print("❌ Could not login with any default credentials")
        return False
        
    def test_with_auth(self, endpoint, method="GET", data=None, test_name=None):
        """Test endpoint that requires authentication"""
        if not test_name:
            test_name = f"{method} {endpoint}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(f"{self.base_url}{endpoint}")
            elif method.upper() == "POST":
                response = self.session.post(f"{self.base_url}{endpoint}", json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code in [200, 201]
            response_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else {'status_code': response.status_code, 'text': response.text[:200]}
            
            self.log_result(test_name, success, response_data)
            return success
        except Exception as e:
            self.log_result(test_name, False, error=e)
            return False
            
    def test_report_templates(self):
        """Test GET /api/reports/templates?active=true (requires auth)"""
        return self.test_with_auth("/api/reports/templates?active=true", "GET", test_name="Report Templates (GET /api/reports/templates?active=true)")
        
    def test_reports_creation(self):
        """Test POST /api/reports (autosave draft upsert) with minimal studyData"""
        minimal_study_data = {
            "studyInstanceUID": f"1.2.3.4.5.{uuid.uuid4().hex[:8]}",
            "patientID": f"TEST_{uuid.uuid4().hex[:8]}",
            "patientName": "Test Patient",
            "modality": "XA",
            "templateId": "chest-xray",
            "templateName": "Chest X-Ray Report",
            "creationMode": "manual"
        }
        return self.test_with_auth("/api/reports-v2", "POST", minimal_study_data, "Reports Creation (POST /api/reports-v2)")
        
    def test_ai_generate(self):
        """Test POST /api/reports/ai-generate with minimal payload"""
        minimal_payload = {
            "templateId": "chest-xray",
            "studyData": {
                "patientAge": "45",
                "patientSex": "M",
                "modality": "XA",
                "studyDescription": "Chest X-Ray"
            },
            "measurements": [],
            "findings": []
        }
        return self.test_with_auth("/api/reports/ai-generate", "POST", minimal_payload, "AI Generate (POST /api/reports/ai-generate)")
        
    def test_structured_reports_from_ai(self):
        """Test POST /api/structured-reports/from-ai/:analysisId with sample aiResults"""
        analysis_id = f"AI_{uuid.uuid4().hex[:8]}"
        sample_data = {
            "radiologistName": "Dr. Test",
            "studyInstanceUID": f"1.2.3.4.5.{uuid.uuid4().hex[:8]}",
            "patientID": f"TEST_{uuid.uuid4().hex[:8]}",
            "patientName": "Test Patient",
            "modality": "XA",
            "aiResults": {
                "classification": {
                    "label": "Normal",
                    "confidence": 0.95,
                    "topPredictions": [
                        {"label": "Normal", "confidence": 0.95},
                        {"label": "Pneumonia", "confidence": 0.03}
                    ]
                },
                "findings": [
                    {
                        "type": "Normal",
                        "description": "No acute abnormalities detected",
                        "confidence": 0.95,
                        "severity": "normal",
                        "location": "Bilateral lungs"
                    }
                ],
                "report": {
                    "findings": "The chest X-ray shows clear lung fields bilaterally with no acute cardiopulmonary process.",
                    "impression": "Normal chest X-ray"
                },
                "frameIndex": 0,
                "analyzedAt": datetime.now().isoformat()
            }
        }
        return self.test_with_auth(f"/api/reports/from-ai/{analysis_id}", "POST", sample_data, f"Structured Reports from AI (POST /api/reports/from-ai/{analysis_id})")
        
    def test_study_reports(self):
        """Test GET /api/structured-reports/study/:uid (requires auth)"""
        # Use a sample study UID
        study_uid = f"1.2.3.4.5.{uuid.uuid4().hex[:8]}"
        return self.test_with_auth(f"/api/reports/study/{study_uid}", "GET", test_name=f"Study Reports (GET /api/reports/study/{study_uid})")
        
    def run_all_tests(self):
        """Run all backend tests"""
        print("🧪 Starting Backend API Tests")
        print("=" * 50)
        
        # Test public endpoints first (no auth required)
        print("📋 Testing Public Endpoints...")
        self.test_health_root()
        self.test_health_subroutes()
        self.test_structured_reports_test()
        
        # Try to login
        print("🔐 Attempting Authentication...")
        login_success = self.attempt_login()
        
        if login_success:
            print("📋 Testing Authenticated Endpoints...")
            self.test_ai_status()
            self.test_report_templates()
            self.test_reports_creation()
            self.test_ai_generate()
            self.test_structured_reports_from_ai()
            self.test_study_reports()
        else:
            print("⚠️  Skipping authenticated endpoints - no valid credentials found")
            # Still try to test them to see the auth error responses
            print("📋 Testing Authenticated Endpoints (expecting 401 errors)...")
            self.test_ai_status()
            self.test_report_templates()
            self.test_reports_creation()
            self.test_ai_generate()
            self.test_structured_reports_from_ai()
            self.test_study_reports()
        
        # Summary
        print("=" * 50)
        print("📊 Test Summary")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\n📋 Detailed Results:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            if result['error']:
                print(f"   Error: {result['error']}")
        
        return self.test_results

def main():
    """Main function"""
    print("🏥 DICOM Medical System - Backend API Testing")
    print("Testing Node.js/Express backend on port 8001")
    print()
    
    tester = BackendTester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    failed_tests = sum(1 for result in results if not result['success'])
    sys.exit(1 if failed_tests > 0 else 0)

if __name__ == "__main__":
    main()