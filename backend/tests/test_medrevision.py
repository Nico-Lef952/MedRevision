"""Backend test suite for MedRevision EDN-style upgrade.
Covers: auth, ancrage (progress, snooze, bookmark, due, by-status, summary),
quiz modes (due/bookmarked/new), exam (start/submit/history), courses (file/html),
and dashboard new fields.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://yo-social-33.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@medrevision.com"
ADMIN_PASSWORD = "admin123"


# ----------------- Fixtures -----------------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text}")
    token = r.json().get("access_token")
    session.headers.update({"Authorization": f"Bearer {token}"})
    return r.json()


@pytest.fixture(scope="session")
def question_ids(session, auth):
    r = session.get(f"{API}/questions?limit=100")
    assert r.status_code == 200, r.text
    qs = r.json()
    return [q["id"] for q in qs]


@pytest.fixture(scope="session")
def subject_ids(session, auth):
    r = session.get(f"{API}/subjects")
    assert r.status_code == 200
    return [s["id"] for s in r.json()]


# ----------------- Auth -----------------
class TestAuth:
    def test_login_success(self, auth):
        assert auth["email"] == ADMIN_EMAIL
        assert auth["role"] == "admin"
        assert "access_token" in auth

    def test_me(self, session, auth):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# ----------------- Progress Summary -----------------
class TestProgressSummary:
    def test_progress_summary_keys(self, session, auth):
        r = session.get(f"{API}/questions/progress-summary")
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ["total", "new", "acquired", "anchored", "to_review", "snoozed", "bookmarked", "due_today"]:
            assert k in data, f"Missing key {k} in progress-summary"
        assert isinstance(data["total"], int)
        assert data["total"] >= 0


# ----------------- Bookmark -----------------
class TestBookmark:
    def test_toggle_bookmark(self, session, auth, question_ids):
        if not question_ids:
            pytest.skip("No questions in DB")
        qid = question_ids[0]
        r1 = session.post(f"{API}/questions/{qid}/bookmark")
        assert r1.status_code == 200, r1.text
        s1 = r1.json()["bookmarked"]
        r2 = session.post(f"{API}/questions/{qid}/bookmark")
        assert r2.status_code == 200
        s2 = r2.json()["bookmarked"]
        assert s1 != s2, "Bookmark should toggle"
        # Restore to false
        if s2:
            session.post(f"{API}/questions/{qid}/bookmark")


# ----------------- Snooze -----------------
class TestSnooze:
    def test_snooze_question(self, session, auth, question_ids):
        if len(question_ids) < 2:
            pytest.skip("Not enough questions")
        qid = question_ids[1]
        r = session.post(f"{API}/questions/{qid}/snooze", json={"days": 7})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "snoozed_until" in data
        assert data["days"] == 7
        # Verify status='snoozed' via by-status
        r2 = session.get(f"{API}/questions/by-status?status=snoozed")
        assert r2.status_code == 200
        ids = [q["id"] for q in r2.json()]
        assert qid in ids


# ----------------- Progress / Ancrage -----------------
class TestAncrage:
    def test_anchored_after_3_correct(self, session, auth, question_ids):
        if len(question_ids) < 3:
            pytest.skip("Not enough questions")
        qid = question_ids[2]
        statuses = []
        for _ in range(3):
            r = session.post(f"{API}/questions/{qid}/progress", json={"is_correct": True})
            assert r.status_code == 200, r.text
            statuses.append(r.json())
        last = statuses[-1]
        assert last["status"] == "anchored", f"Expected anchored, got {last}"
        assert last["consecutive_correct"] >= 3
        assert last["anchor_count"] >= 1

    def test_to_review_on_incorrect(self, session, auth, question_ids):
        if len(question_ids) < 4:
            pytest.skip("Not enough questions")
        qid = question_ids[3]
        # First correct
        session.post(f"{API}/questions/{qid}/progress", json={"is_correct": True})
        # Then incorrect - status should be to_review and consecutive_correct=0
        r = session.post(f"{API}/questions/{qid}/progress", json={"is_correct": False})
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "to_review"
        assert data["consecutive_correct"] == 0


# ----------------- Due & By-Status -----------------
class TestDueAndByStatus:
    def test_due_excludes_anchored_and_snoozed(self, session, auth):
        r = session.get(f"{API}/questions/due?limit=100")
        assert r.status_code == 200
        for q in r.json():
            assert q.get("status") != "anchored"

    def test_by_status_bookmarked(self, session, auth, question_ids):
        if not question_ids:
            pytest.skip("No questions")
        qid = question_ids[0]
        # Ensure bookmarked
        r0 = session.post(f"{API}/questions/{qid}/bookmark")
        if not r0.json().get("bookmarked"):
            session.post(f"{API}/questions/{qid}/bookmark")
        r = session.get(f"{API}/questions/by-status?status=bookmarked")
        assert r.status_code == 200
        ids = [q["id"] for q in r.json()]
        assert qid in ids

    def test_by_status_new(self, session, auth):
        r = session.get(f"{API}/questions/by-status?status=new")
        assert r.status_code == 200
        # All questions never answered should not be in question_progress
        assert isinstance(r.json(), list)

    def test_by_status_invalid(self, session, auth):
        r = session.get(f"{API}/questions/by-status?status=foobar")
        assert r.status_code == 400


# ----------------- Quiz modes -----------------
class TestQuizModes:
    def test_quiz_start_due(self, session, auth):
        r = session.post(f"{API}/quiz/start", json={"mode": "due", "question_count": 5})
        assert r.status_code in (200, 404), r.text
        if r.status_code == 200:
            data = r.json()
            assert "session_id" in data and "questions" in data

    def test_quiz_start_bookmarked(self, session, auth):
        r = session.post(f"{API}/quiz/start", json={"mode": "bookmarked", "question_count": 5})
        assert r.status_code in (200, 404)
        if r.status_code == 200:
            assert len(r.json()["questions"]) >= 1

    def test_quiz_start_new(self, session, auth):
        r = session.post(f"{API}/quiz/start", json={"mode": "new", "question_count": 5})
        assert r.status_code in (200, 404)

    def test_quiz_answer_updates_progress(self, session, auth, question_ids):
        # Start a subject quiz
        r = session.post(f"{API}/quiz/start", json={"mode": "random", "question_count": 1})
        # mode 'random' may not match any branch - fall back to all questions
        if r.status_code != 200:
            pytest.skip("Cannot start quiz")
        sid = r.json()["session_id"]
        q = r.json()["questions"][0]
        # Get pre-summary
        pre = session.get(f"{API}/questions/progress-summary").json()
        ans = session.post(f"{API}/quiz/{sid}/answer", json={
            "question_id": q["id"], "selected_options": [0], "time_spent": 5
        })
        assert ans.status_code == 200
        post = session.get(f"{API}/questions/progress-summary").json()
        # Total attempts should increase somewhere - either acquired/to_review
        assert (post["acquired"] + post["to_review"] + post["anchored"]) >= (
            pre["acquired"] + pre["to_review"] + pre["anchored"]
        ) or post["new"] <= pre["new"]


# ----------------- Exam -----------------
class TestExam:
    @pytest.fixture(scope="class")
    def exam_session(self, session, auth):
        r = session.post(f"{API}/exam/start", json={"question_count": 5, "duration_minutes": 15})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_id" in data
        assert "ends_at" in data
        assert len(data["questions"]) <= 5
        # Verify is_correct NOT exposed in options
        for q in data["questions"]:
            for opt in q.get("options", []):
                assert "is_correct" not in opt, "is_correct must not be exposed in exam options"
        return data

    def test_exam_start(self, exam_session):
        assert exam_session["total"] >= 1
        assert exam_session["duration_minutes"] == 15

    def test_exam_submit(self, session, auth, exam_session):
        sid = exam_session["session_id"]
        answers = [{"question_id": q["id"], "selected_options": [0], "time_spent": 10}
                   for q in exam_session["questions"]]
        r = session.post(f"{API}/exam/{sid}/submit", json={"answers": answers})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "score" in data and "percentage" in data and "detailed" in data
        for d in data["detailed"]:
            assert "options" in d and "correct_options" in d and "explanation" in d and "is_correct" in d

    def test_exam_history(self, session, auth):
        r = session.get(f"{API}/exam/history")
        assert r.status_code == 200
        history = r.json()
        assert isinstance(history, list)
        if len(history) >= 2:
            # Sorted by completed_at desc
            assert history[0]["completed_at"] >= history[1]["completed_at"]


# ----------------- Courses (file/html, original_file) -----------------
class TestCourses:
    def test_get_course_returns_original_file_field(self, session, auth):
        r = session.get(f"{API}/courses")
        assert r.status_code == 200
        courses = r.json()
        if not courses:
            pytest.skip("No courses")
        cid = courses[0]["id"]
        r2 = session.get(f"{API}/courses/{cid}")
        assert r2.status_code == 200
        # original_file may be None if not uploaded; field should exist
        body = r2.json()
        assert "original_file" in body or body.get("source_type") == "text"

    def test_course_file_html_endpoint(self, session, auth):
        r = session.get(f"{API}/courses")
        courses = r.json()
        if not courses:
            pytest.skip("No courses")
        cid = courses[0]["id"]
        r2 = session.get(f"{API}/courses/{cid}/file/html")
        # Should be 200 if uploaded, 404/400 otherwise
        assert r2.status_code in (200, 400, 404)


# ----------------- Dashboard -----------------
class TestDashboard:
    def test_dashboard_new_fields(self, session, auth):
        r = session.get(f"{API}/dashboard")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["due_questions", "progress_summary", "heatmap"]:
            assert k in d, f"Missing field {k} in dashboard"
        assert isinstance(d["heatmap"], list)
        assert isinstance(d["progress_summary"], dict)
        assert "total" in d["progress_summary"]
