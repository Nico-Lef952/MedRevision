#!/usr/bin/env python3
"""
MedRevision Backend API Testing Suite
Tests all API endpoints for the medical revision platform
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class MedRevisionAPITester:
    def __init__(self, base_url: str = "https://yo-social-33.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Test data
        self.admin_email = "admin@medrevision.com"
        self.admin_password = "admin123"
        self.test_user_email = f"test_{int(time.time())}@medrevision.com"
        self.test_user_password = "TestPass123!"
        self.test_user_name = "Test User"
        
        # Test results tracking
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.critical_failures = []
        
        # Store created resources for cleanup
        self.created_subjects = []
        self.created_courses = []
        self.quiz_sessions = []

    def log_test(self, name: str, success: bool, details: str = "", critical: bool = False):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.tests_passed += 1
        else:
            self.failed_tests.append({"name": name, "details": details})
            if critical:
                self.critical_failures.append({"name": name, "details": details})

    def make_request(self, method: str, endpoint: str, data: Dict = None, expected_status: int = 200, files: Dict = None) -> tuple[bool, Dict]:
        """Make HTTP request and validate response"""
        url = f"{self.base_url}/api{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url)
            elif method.upper() == 'POST':
                if files:
                    response = self.session.post(url, files=files, data=data)
                else:
                    response = self.session.post(url, json=data)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"text": response.text, "status_code": response.status_code}
            
            if not success:
                print(f"    Expected {expected_status}, got {response.status_code}")
                print(f"    Response: {response_data}")
            
            return success, response_data
            
        except Exception as e:
            print(f"    Request failed: {str(e)}")
            return False, {"error": str(e)}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, data = self.make_request('GET', '/')
        expected_fields = ['message', 'version']
        has_fields = all(field in data for field in expected_fields)
        
        self.log_test(
            "Root endpoint",
            success and has_fields,
            f"Response: {data}" if success else "Failed to get root endpoint"
        )

    def test_admin_login(self):
        """Test admin login"""
        success, data = self.make_request('POST', '/auth/login', {
            'email': self.admin_email,
            'password': self.admin_password
        })
        
        if success and 'id' in data:
            self.admin_user_id = data['id']
            
        self.log_test(
            "Admin login",
            success and 'id' in data,
            f"Admin ID: {data.get('id', 'N/A')}" if success else "Login failed",
            critical=True
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        success, data = self.make_request('POST', '/auth/register', {
            'email': self.test_user_email,
            'password': self.test_user_password,
            'name': self.test_user_name
        }, expected_status=200)
        
        if success and 'id' in data:
            self.test_user_id = data['id']
            
        self.log_test(
            "User registration",
            success and 'id' in data,
            f"User ID: {data.get('id', 'N/A')}" if success else "Registration failed"
        )
        return success

    def test_user_login(self):
        """Test user login with registered account"""
        success, data = self.make_request('POST', '/auth/login', {
            'email': self.test_user_email,
            'password': self.test_user_password
        })
        
        self.log_test(
            "User login",
            success and 'id' in data,
            f"Login successful for {self.test_user_email}" if success else "Login failed"
        )
        return success

    def test_auth_me(self):
        """Test getting current user info"""
        success, data = self.make_request('GET', '/auth/me')
        
        self.log_test(
            "Get current user",
            success and 'email' in data,
            f"User: {data.get('email', 'N/A')}" if success else "Failed to get user info"
        )

    def test_subjects_crud(self):
        """Test subjects CRUD operations"""
        # Create subject
        subject_data = {
            'name': 'Cardiologie',
            'description': 'Cours de cardiologie pour test',
            'color': '#FF6B6B',
            'icon': 'heart'
        }
        
        success, data = self.make_request('POST', '/subjects', subject_data, expected_status=200)
        
        if success and 'id' in data:
            subject_id = data['id']
            self.created_subjects.append(subject_id)
            
            self.log_test(
                "Create subject",
                True,
                f"Subject created: {subject_id}"
            )
            
            # Get subjects list
            success, subjects = self.make_request('GET', '/subjects')
            self.log_test(
                "Get subjects list",
                success and isinstance(subjects, list),
                f"Found {len(subjects) if success else 0} subjects"
            )
            
            # Get specific subject
            success, subject = self.make_request('GET', f'/subjects/{subject_id}')
            self.log_test(
                "Get specific subject",
                success and subject.get('name') == subject_data['name'],
                f"Subject name: {subject.get('name', 'N/A')}" if success else "Failed"
            )
            
            # Update subject
            update_data = {'description': 'Updated description'}
            success, _ = self.make_request('PUT', f'/subjects/{subject_id}', update_data)
            self.log_test(
                "Update subject",
                success,
                "Subject updated successfully" if success else "Update failed"
            )
            
            return subject_id
        else:
            self.log_test(
                "Create subject",
                False,
                "Failed to create subject",
                critical=True
            )
            return None

    def test_courses_crud(self, subject_id: str):
        """Test courses CRUD operations"""
        if not subject_id:
            self.log_test("Create course", False, "No subject ID available", critical=True)
            return None
            
        # Create course
        course_data = {
            'title': 'Insuffisance cardiaque',
            'subject_id': subject_id,
            'content': '''L'insuffisance cardiaque est un syndrome clinique complexe qui résulte de toute altération structurelle ou fonctionnelle du cœur qui compromet sa capacité à se remplir ou à éjecter le sang.

Physiopathologie:
- Dysfonction systolique: altération de la contractilité
- Dysfonction diastolique: altération du remplissage
- Activation des systèmes neuro-hormonaux (SRAA, système sympathique)

Signes cliniques:
- Dyspnée d'effort puis de repos
- Œdèmes des membres inférieurs
- Fatigue, asthénie
- Orthopnée, dyspnée paroxystique nocturne

Examens complémentaires:
- Échocardiographie: évaluation de la FEVG
- BNP/NT-proBNP: marqueurs biologiques
- Radiographie thoracique: cardiomégalie, œdème pulmonaire

Traitement:
- IEC/ARA2: inhibition du SRAA
- Bêta-bloquants: cardiosélectifs
- Diurétiques: furosémide en cas d'œdèmes
- Antagonistes des récepteurs minéralocorticoïdes''',
            'tags': ['cardiologie', 'insuffisance cardiaque', 'FEVG'],
            'chapter': 'Pathologies cardiovasculaires'
        }
        
        success, data = self.make_request('POST', '/courses', course_data, expected_status=200)
        
        if success and 'id' in data:
            course_id = data['id']
            self.created_courses.append(course_id)
            
            self.log_test(
                "Create course",
                True,
                f"Course created: {course_id} (AI analysis in progress)"
            )
            
            # Wait a bit for AI analysis to potentially start
            time.sleep(2)
            
            # Get courses list
            success, courses = self.make_request('GET', '/courses')
            self.log_test(
                "Get courses list",
                success and isinstance(courses, list),
                f"Found {len(courses) if success else 0} courses"
            )
            
            # Get specific course
            success, course = self.make_request('GET', f'/courses/{course_id}')
            self.log_test(
                "Get course detail",
                success and course.get('title') == course_data['title'],
                f"Course: {course.get('title', 'N/A')}" if success else "Failed"
            )
            
            # Check if AI analysis has started/completed
            if success and course.get('analysis'):
                analysis = course['analysis']
                has_analysis = any(analysis.get(key) for key in ['concepts', 'summary', 'keywords'])
                self.log_test(
                    "AI course analysis",
                    has_analysis,
                    f"Analysis fields: {list(analysis.keys())}" if has_analysis else "No analysis data"
                )
            else:
                self.log_test(
                    "AI course analysis",
                    False,
                    "Analysis not yet available (background task may still be running)"
                )
            
            return course_id
        else:
            self.log_test(
                "Create course",
                False,
                "Failed to create course",
                critical=True
            )
            return None

    def test_questions_api(self, course_id: str, subject_id: str):
        """Test questions API"""
        if not course_id:
            self.log_test("Get questions", False, "No course ID available")
            return
            
        # Wait a bit more for question generation
        time.sleep(3)
        
        # Get all questions
        success, questions = self.make_request('GET', '/questions')
        self.log_test(
            "Get all questions",
            success and isinstance(questions, list),
            f"Found {len(questions) if success else 0} questions"
        )
        
        # Get questions by course
        success, course_questions = self.make_request('GET', f'/questions?course_id={course_id}')
        self.log_test(
            "Get questions by course",
            success and isinstance(course_questions, list),
            f"Found {len(course_questions) if success else 0} questions for course"
        )
        
        # Get questions by subject
        success, subject_questions = self.make_request('GET', f'/questions?subject_id={subject_id}')
        self.log_test(
            "Get questions by subject",
            success and isinstance(subject_questions, list),
            f"Found {len(subject_questions) if success else 0} questions for subject"
        )

    def test_quiz_flow(self, subject_id: str):
        """Test complete quiz flow"""
        if not subject_id:
            self.log_test("Quiz flow", False, "No subject ID available")
            return
            
        # Start quiz
        quiz_data = {
            'mode': 'subject',
            'subject_id': subject_id,
            'question_count': 5,
            'question_types': ['qcm', 'vrai_faux']
        }
        
        success, data = self.make_request('POST', '/quiz/start', quiz_data)
        
        if success and 'session_id' in data:
            session_id = data['session_id']
            questions = data.get('questions', [])
            self.quiz_sessions.append(session_id)
            
            self.log_test(
                "Start quiz",
                True,
                f"Quiz started: {session_id} with {len(questions)} questions"
            )
            
            # Answer first question if available
            if questions:
                question = questions[0]
                answer_data = {
                    'question_id': question['id'],
                    'selected_options': [0],  # Select first option
                    'time_spent': 30
                }
                
                success, result = self.make_request('POST', f'/quiz/{session_id}/answer', answer_data)
                self.log_test(
                    "Submit quiz answer",
                    success and 'is_correct' in result,
                    f"Answer correct: {result.get('is_correct', 'N/A')}" if success else "Failed"
                )
                
                # Complete quiz
                success, final_result = self.make_request('POST', f'/quiz/{session_id}/complete')
                self.log_test(
                    "Complete quiz",
                    success and 'score' in final_result,
                    f"Final score: {final_result.get('score', 'N/A')}/{final_result.get('total', 'N/A')}" if success else "Failed"
                )
        else:
            self.log_test(
                "Start quiz",
                False,
                "Failed to start quiz - may be due to no questions available"
            )

    def test_flashcards_api(self, subject_id: str):
        """Test flashcards API"""
        if not subject_id:
            self.log_test("Flashcards API", False, "No subject ID available")
            return
            
        # Get all flashcards
        success, flashcards = self.make_request('GET', '/flashcards')
        self.log_test(
            "Get all flashcards",
            success and isinstance(flashcards, list),
            f"Found {len(flashcards) if success else 0} flashcards"
        )
        
        # Get due flashcards
        success, due_cards = self.make_request('GET', '/flashcards/due')
        self.log_test(
            "Get due flashcards",
            success and isinstance(due_cards, list),
            f"Found {len(due_cards) if success else 0} due flashcards"
        )
        
        # Review a flashcard if available
        if success and due_cards:
            card = due_cards[0]
            review_data = {'quality': 4}  # Good quality review
            
            success, result = self.make_request('POST', f'/flashcards/{card["id"]}/review', review_data)
            self.log_test(
                "Review flashcard",
                success and 'interval' in result,
                f"Next interval: {result.get('interval', 'N/A')} days" if success else "Failed"
            )

    def test_stats_api(self):
        """Test statistics API"""
        # Overview stats
        success, stats = self.make_request('GET', '/stats/overview')
        expected_fields = ['subject_count', 'course_count', 'question_count', 'success_rate']
        has_fields = success and all(field in stats for field in expected_fields)
        
        self.log_test(
            "Get stats overview",
            has_fields,
            f"Stats: {stats}" if success else "Failed"
        )
        
        # Stats by subject
        success, subject_stats = self.make_request('GET', '/stats/by-subject')
        self.log_test(
            "Get stats by subject",
            success and isinstance(subject_stats, list),
            f"Found stats for {len(subject_stats) if success else 0} subjects"
        )
        
        # Weak concepts
        success, weak_concepts = self.make_request('GET', '/stats/weak-concepts')
        self.log_test(
            "Get weak concepts",
            success and isinstance(weak_concepts, list),
            f"Found {len(weak_concepts) if success else 0} weak concepts"
        )

    def test_dashboard_api(self):
        """Test dashboard API"""
        success, dashboard = self.make_request('GET', '/dashboard')
        expected_fields = ['recent_courses', 'due_flashcards', 'stats']
        has_fields = success and all(field in dashboard for field in expected_fields)
        
        self.log_test(
            "Get dashboard data",
            has_fields,
            f"Dashboard loaded with {len(dashboard.get('recent_courses', []))} recent courses" if success else "Failed"
        )

    def test_knowledge_graph_api(self):
        """Test knowledge graph API"""
        success, graph = self.make_request('GET', '/knowledge-graph')
        expected_fields = ['nodes', 'links']
        has_fields = success and all(field in graph for field in expected_fields)
        
        self.log_test(
            "Get knowledge graph",
            has_fields,
            f"Graph: {len(graph.get('nodes', []))} nodes, {len(graph.get('links', []))} links" if success else "Failed"
        )

    def test_auth_logout(self):
        """Test logout"""
        success, _ = self.make_request('POST', '/auth/logout')
        self.log_test(
            "Logout",
            success,
            "Logged out successfully" if success else "Logout failed"
        )

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Login as admin for cleanup
        self.make_request('POST', '/auth/login', {
            'email': self.admin_email,
            'password': self.admin_password
        })
        
        # Delete courses
        for course_id in self.created_courses:
            success, _ = self.make_request('DELETE', f'/courses/{course_id}')
            if success:
                print(f"   Deleted course: {course_id}")
        
        # Delete subjects
        for subject_id in self.created_subjects:
            success, _ = self.make_request('DELETE', f'/subjects/{subject_id}')
            if success:
                print(f"   Deleted subject: {subject_id}")

    def run_all_tests(self):
        """Run complete test suite"""
        print("🏥 MedRevision Backend API Testing Suite")
        print("=" * 50)
        
        # Basic connectivity
        self.test_root_endpoint()
        
        # Authentication flow
        if not self.test_admin_login():
            print("❌ CRITICAL: Admin login failed - stopping tests")
            return False
            
        self.test_user_registration()
        self.test_user_login()
        self.test_auth_me()
        
        # Core functionality
        subject_id = self.test_subjects_crud()
        course_id = self.test_courses_crud(subject_id)
        
        # Wait for AI processing
        if course_id:
            print("\n⏳ Waiting for AI analysis to complete...")
            time.sleep(5)
        
        self.test_questions_api(course_id, subject_id)
        self.test_quiz_flow(subject_id)
        self.test_flashcards_api(subject_id)
        
        # Analytics and dashboard
        self.test_stats_api()
        self.test_dashboard_api()
        self.test_knowledge_graph_api()
        
        # Cleanup
        self.test_auth_logout()
        self.cleanup_resources()
        
        # Results summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"✅ Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.critical_failures:
            print(f"\n🚨 Critical failures ({len(self.critical_failures)}):")
            for failure in self.critical_failures:
                print(f"   - {failure['name']}: {failure['details']}")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests ({len(self.failed_tests)}):")
            for failure in self.failed_tests:
                print(f"   - {failure['name']}: {failure['details']}")
        
        return len(self.critical_failures) == 0

def main():
    """Main test execution"""
    tester = MedRevisionAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        tester.cleanup_resources()
        return 1
    except Exception as e:
        print(f"\n\n💥 Unexpected error: {e}")
        tester.cleanup_resources()
        return 1

if __name__ == "__main__":
    sys.exit(main())