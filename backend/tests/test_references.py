"""Backend tests for the new Référentiels admin feature and bug fixes.
Covers:
- GET /api/references public read for any logged user
- POST /api/references/upload admin guard (403 for normal user)
- POST /api/references/upload happy path (admin TXT upload)
- DELETE/PUT /api/references/{id} admin guard
- DELETE /api/courses/{id} (regression: bouton supprimer cours)
- GET /api/subjects expose question_count for ExamPage subject selector
"""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://yo-social-33.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@medrevision.com"
ADMIN_PASSWORD = "admin123"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    s.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})
    return s


@pytest.fixture(scope="module")
def normal_user_session():
    """Register & log in a non-admin user to test 403 guard."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    email = f"TEST_user_{uuid.uuid4().hex[:8]}@medrev.test"
    pwd = "Test1234!"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": pwd, "full_name": "Test User"})
    if r.status_code not in (200, 201):
        pytest.skip(f"Cannot register normal user: {r.status_code} {r.text}")
    # Some auth flows return token on register, others require login
    body = r.json()
    token = body.get("access_token")
    if not token:
        rl = s.post(f"{API}/auth/login", json={"email": email, "password": pwd})
        if rl.status_code != 200:
            pytest.skip(f"Cannot login newly-registered user: {rl.status_code} {rl.text}")
        token = rl.json()["access_token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ---------------- References ----------------
class TestReferences:
    def test_list_references_public_for_logged_users(self, admin_session, normal_user_session):
        r1 = admin_session.get(f"{API}/references")
        assert r1.status_code == 200, r1.text
        assert isinstance(r1.json(), list)
        # Normal user should ALSO be able to read
        r2 = normal_user_session.get(f"{API}/references")
        assert r2.status_code == 200, r2.text
        assert isinstance(r2.json(), list)

    def test_list_references_unauthenticated(self):
        r = requests.get(f"{API}/references")
        # Must require auth (any logged user)
        assert r.status_code in (401, 403)

    def test_upload_reference_requires_admin(self, normal_user_session):
        files = {"file": ("note.txt", b"contenu cardiologie test", "text/plain")}
        # Don't send Content-Type json here
        s = requests.Session()
        s.headers.update({"Authorization": normal_user_session.headers["Authorization"]})
        r = s.post(
            f"{API}/references/upload",
            files=files,
            params={"title": "TEST_note", "subject_hint": "cardio", "keywords": "test,cardio"}
        )
        assert r.status_code == 403, f"Expected 403 for non-admin upload, got {r.status_code}: {r.text}"

    @pytest.fixture(scope="class")
    def uploaded_ref(self, admin_session):
        content = (
            "TEST Référentiel - Cardiologie. Ce document décrit l'insuffisance cardiaque, "
            "les troubles du rythme et l'hypertension artérielle. Mots clés: HTA, IC, FA."
        )
        files = {"file": ("TEST_ref.txt", content.encode("utf-8"), "text/plain")}
        s = requests.Session()
        s.headers.update({"Authorization": admin_session.headers["Authorization"]})
        r = s.post(
            f"{API}/references/upload",
            files=files,
            params={"title": "TEST_RefCardio", "subject_hint": "Cardiologie", "keywords": "HTA, IC, fa, cardiologie"}
        )
        assert r.status_code == 200, f"Upload failed: {r.status_code} {r.text}"
        data = r.json()
        assert "id" in data
        assert data["title"] == "TEST_RefCardio"
        assert data["file_type"] == "text"
        assert data["content_length"] > 0
        # Keywords lowercased server-side
        assert "hta" in data["keywords"]
        assert "cardiologie" in data["keywords"]
        yield data
        # Teardown: delete
        try:
            admin_session.delete(f"{API}/references/{data['id']}")
        except Exception:
            pass

    def test_upload_admin_success(self, uploaded_ref):
        assert uploaded_ref["id"]
        assert uploaded_ref["filename"] == "TEST_ref.txt"

    def test_uploaded_ref_appears_in_list(self, admin_session, uploaded_ref):
        r = admin_session.get(f"{API}/references")
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert uploaded_ref["id"] in ids
        # And the file should physically exist
        # (path is internal but we can verify via a second get)
        match = [x for x in r.json() if x["id"] == uploaded_ref["id"]][0]
        assert match["title"] == "TEST_RefCardio"
        assert match["subject_hint"] == "Cardiologie"

    def test_uploaded_file_persisted_on_disk(self, uploaded_ref):
        # Files are saved under /app/backend/uploads/refs/<file_id>.<ext>
        # We don't have file_id back; assert directory exists & has at least one .txt
        d = "/app/backend/uploads/refs"
        assert os.path.isdir(d), f"Expected dir {d}"
        files = os.listdir(d)
        assert any(f.endswith(".txt") for f in files), f"No .txt persisted in {d}: {files}"

    def test_update_reference_requires_admin(self, normal_user_session, uploaded_ref):
        r = normal_user_session.put(
            f"{API}/references/{uploaded_ref['id']}",
            json={"title": "HACK"}
        )
        assert r.status_code == 403, r.text

    def test_update_reference_admin(self, admin_session, uploaded_ref):
        r = admin_session.put(
            f"{API}/references/{uploaded_ref['id']}",
            json={"title": "TEST_RefCardio_Updated", "keywords": ["HTA", "IC"]}
        )
        assert r.status_code == 200, r.text
        # Verify via GET
        r2 = admin_session.get(f"{API}/references")
        match = [x for x in r2.json() if x["id"] == uploaded_ref["id"]][0]
        assert match["title"] == "TEST_RefCardio_Updated"
        assert "hta" in match["keywords"]  # lowercased on PUT

    def test_delete_reference_requires_admin(self, normal_user_session, uploaded_ref):
        r = normal_user_session.delete(f"{API}/references/{uploaded_ref['id']}")
        assert r.status_code == 403, r.text


# ---------------- Subjects expose question_count (used by ExamPage) ----------------
class TestSubjectsQuestionCount:
    def test_subjects_have_question_count(self, admin_session):
        r = admin_session.get(f"{API}/subjects")
        assert r.status_code == 200, r.text
        subs = r.json()
        assert isinstance(subs, list) and len(subs) >= 1
        for s in subs:
            assert "question_count" in s, f"Missing question_count in subject: {s}"
            assert isinstance(s["question_count"], int)
            assert s["question_count"] >= 0


# ---------------- Courses delete (regression bug #1) ----------------
class TestCoursesDelete:
    def test_create_then_delete_course(self, admin_session):
        # Need a subject
        subs = admin_session.get(f"{API}/subjects").json()
        if not subs:
            pytest.skip("No subjects to create a course")
        subject_id = subs[0]["id"]
        # Create a minimal course via text source
        payload = {
            "title": f"TEST_course_{uuid.uuid4().hex[:6]}",
            "subject_id": subject_id,
            "content": "Contenu test pour suppression. " * 20,
            "source_type": "text"
        }
        r = admin_session.post(f"{API}/courses", json=payload)
        assert r.status_code in (200, 201), r.text
        cid = r.json().get("id") or r.json().get("course_id")
        assert cid, f"No course id returned: {r.json()}"
        # Delete
        rd = admin_session.delete(f"{API}/courses/{cid}")
        assert rd.status_code in (200, 204), f"Delete failed: {rd.status_code} {rd.text}"
        # Verify gone
        rg = admin_session.get(f"{API}/courses/{cid}")
        assert rg.status_code == 404


# ---------------- find_relevant_references is exercised via course creation flow ----------------
# (We don't directly call the helper because it's not exposed; the upload + list test above
# along with an admin-created course are sufficient for integration.)
