from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, UploadFile, File, Depends, BackgroundTasks
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import uuid
import bcrypt
import jwt
import secrets
import json
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from contextlib import asynccontextmanager
import PyPDF2
import io

# JWT Configuration
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "default-secret-change-me")

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# AI Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

async def analyze_course_with_ai(content: str, subject_name: str) -> dict:
    """Analyze course content with GPT-5.2 to extract concepts and generate questions"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"analysis-{uuid.uuid4()}",
            system_message="""Tu es un expert en pédagogie médicale. Analyse le cours fourni et retourne un JSON structuré avec:
1. "concepts": liste des notions clés (max 20)
2. "definitions": liste des définitions importantes avec {"term": "...", "definition": "..."}
3. "mechanisms": liste des mécanismes physiologiques/pathologiques
4. "clinical_signs": signes cliniques mentionnés
5. "treatments": traitements évoqués
6. "confusions": confusions possibles avec d'autres notions
7. "summary": résumé en 3-5 phrases
8. "keywords": mots-clés pour la recherche (max 15)

Retourne UNIQUEMENT le JSON, sans texte avant ou après."""
        ).with_model("openai", "gpt-5.2")
        
        message = UserMessage(text=f"Matière: {subject_name}\n\nContenu du cours:\n{content[:15000]}")
        response = await chat.send_message(message)
        
        # Parse JSON from response
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
        
        return {
            "concepts": [],
            "definitions": [],
            "mechanisms": [],
            "clinical_signs": [],
            "treatments": [],
            "confusions": [],
            "summary": "Analyse non disponible",
            "keywords": []
        }
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return {
            "concepts": [],
            "definitions": [],
            "mechanisms": [],
            "clinical_signs": [],
            "treatments": [],
            "confusions": [],
            "summary": "Erreur lors de l'analyse",
            "keywords": []
        }

async def generate_questions_with_ai(content: str, subject_name: str, analysis: dict) -> list:
    """Generate various question types from course content"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"questions-{uuid.uuid4()}",
            system_message="""Tu es un expert en création de questions médicales pour étudiants en médecine (DFASM).
Génère des questions variées à partir du cours. Retourne un JSON array avec chaque question ayant:
- "type": "qcm" | "vrai_faux" | "flashcard" | "cas_clinique" | "qroc"
- "question": l'énoncé
- "options": array d'options (OBLIGATOIRE pour tous les types)
  - Pour QCM: 5 options avec "text" et "is_correct" (1-2 correctes)
  - Pour vrai_faux: [{"text": "Vrai", "is_correct": true/false}, {"text": "Faux", "is_correct": false/true}]
  - Pour flashcard: [{"text": "la réponse", "is_correct": true}]
  - Pour cas_clinique: 5 options diagnostiques/thérapeutiques
  - Pour qroc: [{"text": "réponse attendue", "is_correct": true}]
- "answer": réponse correcte textuelle
- "explanation": explication détaillée de la réponse
- "difficulty": 1-3 (1=facile, 2=moyen, 3=difficile)
- "concepts": notions liées du cours

Génère 12-15 questions variées avec au moins 2 de chaque type.
Pour les cas cliniques, crée un scénario patient réaliste et détaillé.
Retourne UNIQUEMENT le JSON array, sans texte avant ou après."""
        ).with_model("openai", "gpt-5.2")
        
        concepts_str = ", ".join(analysis.get("concepts", [])[:10])
        message = UserMessage(text=f"Matière: {subject_name}\nNotions clés: {concepts_str}\n\nContenu:\n{content[:12000]}")
        response = await chat.send_message(message)
        
        try:
            json_match = re.search(r'\[[\s\S]*\]', response)
            if json_match:
                questions = json.loads(json_match.group())
                # Ensure vrai_faux questions have proper options
                for q in questions:
                    if q.get("type") == "vrai_faux" and (not q.get("options") or len(q.get("options", [])) < 2):
                        # Determine correct answer based on the question
                        is_true = "vrai" in q.get("answer", "").lower()
                        q["options"] = [
                            {"text": "Vrai", "is_correct": is_true},
                            {"text": "Faux", "is_correct": not is_true}
                        ]
                return questions
        except:
            pass
        
        return []
    except Exception as e:
        logger.error(f"Question generation error: {e}")
        return []

async def find_cross_references(course_id: str, analysis: dict, user_id: str) -> list:
    """Find links between this course and others based on concepts"""
    try:
        concepts = analysis.get("concepts", []) + analysis.get("keywords", [])
        if not concepts:
            return []
        
        # Search for courses with matching concepts
        other_courses = await db.courses.find({
            "user_id": user_id,
            "_id": {"$ne": ObjectId(course_id)},
            "$or": [
                {"analysis.concepts": {"$in": concepts}},
                {"analysis.keywords": {"$in": concepts}}
            ]
        }, {"_id": 1, "title": 1, "subject_id": 1, "analysis.concepts": 1}).to_list(20)
        
        links = []
        for course in other_courses:
            course_concepts = course.get("analysis", {}).get("concepts", [])
            shared = list(set(concepts) & set(course_concepts))
            if shared:
                links.append({
                    "course_id": str(course["_id"]),
                    "title": course["title"],
                    "subject_id": str(course["subject_id"]),
                    "shared_concepts": shared[:5]
                })
        
        return links
    except Exception as e:
        logger.error(f"Cross-reference error: {e}")
        return []

# Pydantic Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

class SubjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: str = "#3B82F6"
    icon: str = "book"

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    archived: Optional[bool] = None

class CourseCreate(BaseModel):
    title: str
    subject_id: str
    content: str
    tags: Optional[List[str]] = []
    chapter: Optional[str] = ""

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    chapter: Optional[str] = None

class QuizStart(BaseModel):
    mode: str  # "subject", "course", "transversal", "errors", "random"
    subject_id: Optional[str] = None
    course_id: Optional[str] = None
    question_count: int = 10
    question_types: Optional[List[str]] = None

class QuizAnswer(BaseModel):
    question_id: str
    selected_options: List[int]
    time_spent: int = 0

class FlashcardReview(BaseModel):
    quality: int  # 0-5 for spaced repetition

# Lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.subjects.create_index([("user_id", 1), ("name", 1)])
    await db.courses.create_index([("user_id", 1), ("subject_id", 1)])
    await db.courses.create_index([("user_id", 1), ("analysis.keywords", 1)])
    await db.questions.create_index([("user_id", 1), ("course_id", 1)])
    await db.quiz_sessions.create_index([("user_id", 1), ("created_at", -1)])
    await db.flashcard_progress.create_index([("user_id", 1), ("next_review", 1)])
    
    # Seed admin
    await seed_admin()
    
    logger.info("MedRevision API started")
    yield
    # Shutdown
    client.close()

async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@medrevision.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated")
    
    # Write test credentials
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Auth Endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/refresh
""")

app = FastAPI(lifespan=lifespan)

api_router = APIRouter(prefix="/api")

# Auth dependency
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user["id"] = str(user["_id"])
        del user["_id"]
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(data: UserRegister):
    email = data.email.lower().strip()
    
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    # Return token in response body for clients that can't use cookies
    response = JSONResponse(content={
        "id": user_id,
        "email": email,
        "name": data.name,
        "role": "user",
        "created_at": user_doc["created_at"],
        "access_token": access_token
    })
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return response

@api_router.post("/auth/login")
async def login(data: UserLogin, request: Request):
    email = data.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{client_ip}:{email}"
    
    # Check brute force
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("count", 0) >= 5:
        lockout_time = attempts.get("locked_until")
        if lockout_time and datetime.fromisoformat(lockout_time) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Clear failed attempts
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    # Return token in response body for clients that can't use cookies
    response = JSONResponse(content={
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "created_at": user["created_at"],
        "access_token": access_token
    })
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return response

@api_router.post("/auth/logout")
async def logout():
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return response

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        user_id = str(user["_id"])
        new_access_token = create_access_token(user_id, user["email"])
        
        response = JSONResponse(content={"message": "Token refreshed"})
        response.set_cookie(key="access_token", value=new_access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return response
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ==================== SUBJECTS ROUTES ====================

@api_router.get("/subjects")
async def get_subjects(user: dict = Depends(get_current_user)):
    subjects = await db.subjects.find(
        {"user_id": user["id"], "archived": {"$ne": True}},
        {"_id": 1, "name": 1, "description": 1, "color": 1, "icon": 1, "created_at": 1}
    ).to_list(100)
    
    result = []
    for s in subjects:
        course_count = await db.courses.count_documents({"subject_id": str(s["_id"]), "user_id": user["id"]})
        question_count = await db.questions.count_documents({"subject_id": str(s["_id"]), "user_id": user["id"]})
        result.append({
            "id": str(s["_id"]),
            "name": s["name"],
            "description": s.get("description", ""),
            "color": s.get("color", "#3B82F6"),
            "icon": s.get("icon", "book"),
            "created_at": s.get("created_at", ""),
            "course_count": course_count,
            "question_count": question_count
        })
    
    return result

@api_router.post("/subjects")
async def create_subject(data: SubjectCreate, user: dict = Depends(get_current_user)):
    subject_doc = {
        "user_id": user["id"],
        "name": data.name,
        "description": data.description,
        "color": data.color,
        "icon": data.icon,
        "archived": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.subjects.insert_one(subject_doc)
    
    return {
        "id": str(result.inserted_id),
        "name": data.name,
        "description": data.description,
        "color": data.color,
        "icon": data.icon,
        "course_count": 0,
        "question_count": 0,
        "created_at": subject_doc["created_at"]
    }

@api_router.get("/subjects/{subject_id}")
async def get_subject(subject_id: str, user: dict = Depends(get_current_user)):
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id), "user_id": user["id"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    course_count = await db.courses.count_documents({"subject_id": subject_id, "user_id": user["id"]})
    question_count = await db.questions.count_documents({"subject_id": subject_id, "user_id": user["id"]})
    
    return {
        "id": str(subject["_id"]),
        "name": subject["name"],
        "description": subject.get("description", ""),
        "color": subject.get("color", "#3B82F6"),
        "icon": subject.get("icon", "book"),
        "created_at": subject.get("created_at", ""),
        "course_count": course_count,
        "question_count": question_count
    }

@api_router.put("/subjects/{subject_id}")
async def update_subject(subject_id: str, data: SubjectUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.subjects.update_one(
        {"_id": ObjectId(subject_id), "user_id": user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    return {"message": "Subject updated"}

@api_router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, user: dict = Depends(get_current_user)):
    # Archive instead of delete
    result = await db.subjects.update_one(
        {"_id": ObjectId(subject_id), "user_id": user["id"]},
        {"$set": {"archived": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    return {"message": "Subject archived"}

# ==================== COURSES ROUTES ====================

@api_router.get("/courses")
async def get_courses(
    user: dict = Depends(get_current_user),
    subject_id: Optional[str] = None,
    search: Optional[str] = None
):
    query = {"user_id": user["id"]}
    
    if subject_id:
        query["subject_id"] = subject_id
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
            {"tags": {"$regex": search, "$options": "i"}},
            {"analysis.keywords": {"$regex": search, "$options": "i"}}
        ]
    
    courses = await db.courses.find(
        query,
        {"_id": 1, "title": 1, "subject_id": 1, "tags": 1, "chapter": 1, "created_at": 1, "updated_at": 1, "analysis.summary": 1}
    ).sort("updated_at", -1).to_list(200)
    
    result = []
    for c in courses:
        question_count = await db.questions.count_documents({"course_id": str(c["_id"]), "user_id": user["id"]})
        result.append({
            "id": str(c["_id"]),
            "title": c["title"],
            "subject_id": c["subject_id"],
            "tags": c.get("tags", []),
            "chapter": c.get("chapter", ""),
            "summary": c.get("analysis", {}).get("summary", ""),
            "question_count": question_count,
            "created_at": c.get("created_at", ""),
            "updated_at": c.get("updated_at", c.get("created_at", ""))
        })
    
    return result

@api_router.post("/courses")
async def create_course(data: CourseCreate, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    # Verify subject exists
    subject = await db.subjects.find_one({"_id": ObjectId(data.subject_id), "user_id": user["id"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    course_doc = {
        "user_id": user["id"],
        "subject_id": data.subject_id,
        "title": data.title,
        "content": data.content,
        "tags": data.tags,
        "chapter": data.chapter,
        "analysis": {},
        "cross_references": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.courses.insert_one(course_doc)
    course_id = str(result.inserted_id)
    
    # Trigger AI analysis in background
    background_tasks.add_task(process_course_ai, course_id, data.content, subject["name"], user["id"])
    
    return {
        "id": course_id,
        "title": data.title,
        "subject_id": data.subject_id,
        "tags": data.tags,
        "chapter": data.chapter,
        "message": "Course created. AI analysis in progress..."
    }

async def process_course_ai(course_id: str, content: str, subject_name: str, user_id: str):
    """Background task to analyze course and generate questions"""
    try:
        # Analyze course
        analysis = await analyze_course_with_ai(content, subject_name)
        
        # Find cross references
        cross_refs = await find_cross_references(course_id, analysis, user_id)
        
        # Update course with analysis
        await db.courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": {"analysis": analysis, "cross_references": cross_refs}}
        )
        
        # Generate questions
        questions = await generate_questions_with_ai(content, subject_name, analysis)
        
        # Get subject_id from course
        course = await db.courses.find_one({"_id": ObjectId(course_id)})
        subject_id = course["subject_id"] if course else ""
        
        # Save questions
        if questions:
            question_docs = []
            for q in questions:
                question_docs.append({
                    "user_id": user_id,
                    "course_id": course_id,
                    "subject_id": subject_id,
                    "type": q.get("type", "qcm"),
                    "question": q.get("question", ""),
                    "options": q.get("options", []),
                    "answer": q.get("answer", ""),
                    "explanation": q.get("explanation", ""),
                    "difficulty": q.get("difficulty", 2),
                    "concepts": q.get("concepts", []),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            if question_docs:
                await db.questions.insert_many(question_docs)
        
        logger.info(f"Course {course_id} processed: {len(questions)} questions generated")
    except Exception as e:
        logger.error(f"Error processing course {course_id}: {e}")

@api_router.post("/courses/upload")
async def upload_course(
    file: UploadFile = File(...),
    subject_id: str = None,
    background_tasks: BackgroundTasks = None,
    user: dict = Depends(get_current_user)
):
    if not subject_id:
        raise HTTPException(status_code=400, detail="subject_id required")
    
    # Verify subject
    subject = await db.subjects.find_one({"_id": ObjectId(subject_id), "user_id": user["id"]})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    content = ""
    filename = file.filename or "Untitled"
    
    # Extract content based on file type
    if filename.endswith(".pdf"):
        pdf_content = await file.read()
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_content))
        content = "\n".join([page.extract_text() or "" for page in pdf_reader.pages])
    elif filename.endswith((".md", ".txt")):
        content = (await file.read()).decode("utf-8")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, MD or TXT")
    
    if not content.strip():
        raise HTTPException(status_code=400, detail="Could not extract content from file")
    
    # Create course
    title = filename.rsplit(".", 1)[0]
    course_doc = {
        "user_id": user["id"],
        "subject_id": subject_id,
        "title": title,
        "content": content,
        "tags": [],
        "chapter": "",
        "analysis": {},
        "cross_references": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.courses.insert_one(course_doc)
    course_id = str(result.inserted_id)
    
    # Trigger AI analysis
    background_tasks.add_task(process_course_ai, course_id, content, subject["name"], user["id"])
    
    return {
        "id": course_id,
        "title": title,
        "subject_id": subject_id,
        "message": "File uploaded. AI analysis in progress..."
    }

@api_router.get("/courses/{course_id}")
async def get_course(course_id: str, user: dict = Depends(get_current_user)):
    course = await db.courses.find_one({"_id": ObjectId(course_id), "user_id": user["id"]})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    question_count = await db.questions.count_documents({"course_id": course_id, "user_id": user["id"]})
    
    return {
        "id": str(course["_id"]),
        "title": course["title"],
        "subject_id": course["subject_id"],
        "content": course["content"],
        "tags": course.get("tags", []),
        "chapter": course.get("chapter", ""),
        "analysis": course.get("analysis", {}),
        "cross_references": course.get("cross_references", []),
        "question_count": question_count,
        "created_at": course.get("created_at", ""),
        "updated_at": course.get("updated_at", "")
    }

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, data: CourseUpdate, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If content changed, re-analyze
    if "content" in update_data:
        course = await db.courses.find_one({"_id": ObjectId(course_id), "user_id": user["id"]})
        if course:
            subject = await db.subjects.find_one({"_id": ObjectId(course["subject_id"])})
            if subject:
                background_tasks.add_task(process_course_ai, course_id, update_data["content"], subject["name"], user["id"])
    
    result = await db.courses.update_one(
        {"_id": ObjectId(course_id), "user_id": user["id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    
    return {"message": "Course updated"}

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(get_current_user)):
    result = await db.courses.delete_one({"_id": ObjectId(course_id), "user_id": user["id"]})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Delete associated questions
    await db.questions.delete_many({"course_id": course_id, "user_id": user["id"]})
    
    return {"message": "Course deleted"}

@api_router.post("/courses/{course_id}/regenerate-questions")
async def regenerate_questions(course_id: str, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    course = await db.courses.find_one({"_id": ObjectId(course_id), "user_id": user["id"]})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    subject = await db.subjects.find_one({"_id": ObjectId(course["subject_id"])})
    subject_name = subject["name"] if subject else "Unknown"
    
    # Delete existing questions
    await db.questions.delete_many({"course_id": course_id, "user_id": user["id"]})
    
    # Regenerate
    background_tasks.add_task(process_course_ai, course_id, course["content"], subject_name, user["id"])
    
    return {"message": "Question regeneration started"}

# ==================== QUESTIONS ROUTES ====================

@api_router.get("/questions")
async def get_questions(
    user: dict = Depends(get_current_user),
    subject_id: Optional[str] = None,
    course_id: Optional[str] = None,
    question_type: Optional[str] = None
):
    query = {"user_id": user["id"]}
    
    if subject_id:
        query["subject_id"] = subject_id
    if course_id:
        query["course_id"] = course_id
    if question_type:
        query["type"] = question_type
    
    questions = await db.questions.find(query).to_list(500)
    
    return [{
        "id": str(q["_id"]),
        "course_id": q["course_id"],
        "subject_id": q["subject_id"],
        "type": q["type"],
        "question": q["question"],
        "options": q.get("options", []),
        "answer": q["answer"],
        "explanation": q["explanation"],
        "difficulty": q.get("difficulty", 2),
        "concepts": q.get("concepts", [])
    } for q in questions]

# ==================== QUIZ ROUTES ====================

@api_router.post("/quiz/start")
async def start_quiz(data: QuizStart, user: dict = Depends(get_current_user)):
    query = {"user_id": user["id"]}
    
    if data.mode == "subject" and data.subject_id:
        query["subject_id"] = data.subject_id
    elif data.mode == "course" and data.course_id:
        query["course_id"] = data.course_id
    elif data.mode == "errors":
        # Get questions user got wrong
        wrong_questions = await db.quiz_answers.find({
            "user_id": user["id"],
            "is_correct": False
        }).distinct("question_id")
        query["_id"] = {"$in": [ObjectId(qid) for qid in wrong_questions]}
    
    if data.question_types:
        query["type"] = {"$in": data.question_types}
    
    # Get random questions
    pipeline = [
        {"$match": query},
        {"$sample": {"size": data.question_count}}
    ]
    
    questions = await db.questions.aggregate(pipeline).to_list(data.question_count)
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this criteria")
    
    # Create quiz session
    session_doc = {
        "user_id": user["id"],
        "mode": data.mode,
        "subject_id": data.subject_id,
        "course_id": data.course_id,
        "question_ids": [str(q["_id"]) for q in questions],
        "answers": [],
        "score": 0,
        "total": len(questions),
        "completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.quiz_sessions.insert_one(session_doc)
    
    return {
        "session_id": str(result.inserted_id),
        "questions": [{
            "id": str(q["_id"]),
            "type": q["type"],
            "question": q["question"],
            "options": q.get("options", []),
            "difficulty": q.get("difficulty", 2)
        } for q in questions],
        "total": len(questions)
    }

@api_router.post("/quiz/{session_id}/answer")
async def submit_answer(session_id: str, data: QuizAnswer, user: dict = Depends(get_current_user)):
    session = await db.quiz_sessions.find_one({"_id": ObjectId(session_id), "user_id": user["id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Quiz session not found")
    
    question = await db.questions.find_one({"_id": ObjectId(data.question_id)})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check answer
    correct_indices = []
    options = question.get("options", [])
    for i, opt in enumerate(options):
        if opt.get("is_correct", False):
            correct_indices.append(i)
    
    is_correct = sorted(data.selected_options) == sorted(correct_indices)
    
    # Record answer
    answer_doc = {
        "user_id": user["id"],
        "session_id": session_id,
        "question_id": data.question_id,
        "selected_options": data.selected_options,
        "is_correct": is_correct,
        "time_spent": data.time_spent,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.quiz_answers.insert_one(answer_doc)
    
    # Update session
    await db.quiz_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$push": {"answers": answer_doc},
            "$inc": {"score": 1 if is_correct else 0}
        }
    )
    
    return {
        "is_correct": is_correct,
        "correct_options": correct_indices,
        "explanation": question.get("explanation", ""),
        "answer": question.get("answer", "")
    }

@api_router.post("/quiz/{session_id}/complete")
async def complete_quiz(session_id: str, user: dict = Depends(get_current_user)):
    result = await db.quiz_sessions.update_one(
        {"_id": ObjectId(session_id), "user_id": user["id"]},
        {"$set": {"completed": True, "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quiz session not found")
    
    session = await db.quiz_sessions.find_one({"_id": ObjectId(session_id)})
    
    return {
        "score": session["score"],
        "total": session["total"],
        "percentage": round((session["score"] / session["total"]) * 100, 1) if session["total"] > 0 else 0
    }

# ==================== FLASHCARDS ROUTES ====================

@api_router.get("/flashcards")
async def get_flashcards(user: dict = Depends(get_current_user), subject_id: Optional[str] = None):
    query = {"user_id": user["id"], "type": "flashcard"}
    if subject_id:
        query["subject_id"] = subject_id
    
    flashcards = await db.questions.find(query).to_list(500)
    
    # Get progress for each
    result = []
    for fc in flashcards:
        progress = await db.flashcard_progress.find_one({
            "user_id": user["id"],
            "card_id": str(fc["_id"])
        })
        
        result.append({
            "id": str(fc["_id"]),
            "question": fc["question"],
            "answer": fc.get("answer", ""),
            "explanation": fc.get("explanation", ""),
            "subject_id": fc["subject_id"],
            "course_id": fc["course_id"],
            "next_review": progress.get("next_review") if progress else None,
            "interval": progress.get("interval", 1) if progress else 1,
            "ease_factor": progress.get("ease_factor", 2.5) if progress else 2.5
        })
    
    return result

@api_router.get("/flashcards/due")
async def get_due_flashcards(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    # Get cards due for review
    due_progress = await db.flashcard_progress.find({
        "user_id": user["id"],
        "next_review": {"$lte": now}
    }).to_list(50)
    
    card_ids = [ObjectId(p["card_id"]) for p in due_progress]
    
    # Also get cards never reviewed
    all_flashcards = await db.questions.find({
        "user_id": user["id"],
        "type": "flashcard"
    }, {"_id": 1}).to_list(500)
    
    reviewed_ids = await db.flashcard_progress.find({"user_id": user["id"]}).distinct("card_id")
    new_card_ids = [fc["_id"] for fc in all_flashcards if str(fc["_id"]) not in reviewed_ids][:10]
    
    all_ids = list(set(card_ids + new_card_ids))
    
    if not all_ids:
        return []
    
    cards = await db.questions.find({"_id": {"$in": all_ids}}).to_list(50)
    
    return [{
        "id": str(c["_id"]),
        "question": c["question"],
        "answer": c.get("answer", ""),
        "explanation": c.get("explanation", ""),
        "subject_id": c["subject_id"],
        "course_id": c["course_id"]
    } for c in cards]

@api_router.post("/flashcards/{card_id}/review")
async def review_flashcard(card_id: str, data: FlashcardReview, user: dict = Depends(get_current_user)):
    """Spaced repetition algorithm (SM-2)"""
    progress = await db.flashcard_progress.find_one({
        "user_id": user["id"],
        "card_id": card_id
    })
    
    if not progress:
        progress = {
            "user_id": user["id"],
            "card_id": card_id,
            "interval": 1,
            "ease_factor": 2.5,
            "repetitions": 0
        }
    
    quality = data.quality  # 0-5
    
    # SM-2 Algorithm
    if quality < 3:
        progress["repetitions"] = 0
        progress["interval"] = 1
    else:
        if progress["repetitions"] == 0:
            progress["interval"] = 1
        elif progress["repetitions"] == 1:
            progress["interval"] = 6
        else:
            progress["interval"] = round(progress["interval"] * progress["ease_factor"])
        
        progress["repetitions"] += 1
    
    # Update ease factor
    progress["ease_factor"] = max(1.3, progress["ease_factor"] + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    
    # Calculate next review
    next_review = datetime.now(timezone.utc) + timedelta(days=progress["interval"])
    progress["next_review"] = next_review.isoformat()
    progress["last_review"] = datetime.now(timezone.utc).isoformat()
    
    await db.flashcard_progress.update_one(
        {"user_id": user["id"], "card_id": card_id},
        {"$set": progress},
        upsert=True
    )
    
    return {
        "interval": progress["interval"],
        "next_review": progress["next_review"],
        "ease_factor": progress["ease_factor"]
    }

# ==================== STATISTICS ROUTES ====================

@api_router.get("/stats/overview")
async def get_stats_overview(user: dict = Depends(get_current_user)):
    # Counts
    subject_count = await db.subjects.count_documents({"user_id": user["id"], "archived": {"$ne": True}})
    course_count = await db.courses.count_documents({"user_id": user["id"]})
    question_count = await db.questions.count_documents({"user_id": user["id"]})
    
    # Quiz stats
    total_answers = await db.quiz_answers.count_documents({"user_id": user["id"]})
    correct_answers = await db.quiz_answers.count_documents({"user_id": user["id"], "is_correct": True})
    success_rate = round((correct_answers / total_answers) * 100, 1) if total_answers > 0 else 0
    
    # Recent activity
    recent_quizzes = await db.quiz_sessions.find(
        {"user_id": user["id"], "completed": True}
    ).sort("completed_at", -1).limit(7).to_list(7)
    
    activity = []
    for q in recent_quizzes:
        activity.append({
            "date": q.get("completed_at", q.get("created_at", "")),
            "score": q["score"],
            "total": q["total"]
        })
    
    return {
        "subject_count": subject_count,
        "course_count": course_count,
        "question_count": question_count,
        "total_answers": total_answers,
        "correct_answers": correct_answers,
        "success_rate": success_rate,
        "recent_activity": activity
    }

@api_router.get("/stats/by-subject")
async def get_stats_by_subject(user: dict = Depends(get_current_user)):
    subjects = await db.subjects.find(
        {"user_id": user["id"], "archived": {"$ne": True}}
    ).to_list(100)
    
    stats = []
    for s in subjects:
        subject_id = str(s["_id"])
        
        # Count questions and answers
        question_ids = await db.questions.find(
            {"subject_id": subject_id, "user_id": user["id"]}
        ).distinct("_id")
        
        question_id_strs = [str(qid) for qid in question_ids]
        
        total_answers = await db.quiz_answers.count_documents({
            "user_id": user["id"],
            "question_id": {"$in": question_id_strs}
        })
        
        correct_answers = await db.quiz_answers.count_documents({
            "user_id": user["id"],
            "question_id": {"$in": question_id_strs},
            "is_correct": True
        })
        
        mastery = round((correct_answers / total_answers) * 100) if total_answers > 0 else 0
        
        stats.append({
            "subject_id": subject_id,
            "name": s["name"],
            "color": s.get("color", "#3B82F6"),
            "course_count": await db.courses.count_documents({"subject_id": subject_id, "user_id": user["id"]}),
            "question_count": len(question_ids),
            "total_answers": total_answers,
            "correct_answers": correct_answers,
            "mastery": mastery
        })
    
    return stats

@api_router.get("/stats/weak-concepts")
async def get_weak_concepts(user: dict = Depends(get_current_user)):
    # Aggregate wrong answers by concept
    pipeline = [
        {"$match": {"user_id": user["id"], "is_correct": False}},
        {"$lookup": {
            "from": "questions",
            "let": {"qid": {"$toObjectId": "$question_id"}},
            "pipeline": [{"$match": {"$expr": {"$eq": ["$_id", "$$qid"]}}}],
            "as": "question"
        }},
        {"$unwind": "$question"},
        {"$unwind": "$question.concepts"},
        {"$group": {"_id": "$question.concepts", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    result = await db.quiz_answers.aggregate(pipeline).to_list(10)
    
    return [{"concept": r["_id"], "error_count": r["count"]} for r in result]

# ==================== KNOWLEDGE GRAPH ROUTES ====================

@api_router.get("/knowledge-graph")
async def get_knowledge_graph(user: dict = Depends(get_current_user)):
    courses = await db.courses.find(
        {"user_id": user["id"]},
        {"_id": 1, "title": 1, "subject_id": 1, "analysis.concepts": 1, "cross_references": 1}
    ).to_list(200)
    
    subjects = await db.subjects.find(
        {"user_id": user["id"], "archived": {"$ne": True}},
        {"_id": 1, "name": 1, "color": 1}
    ).to_list(100)
    
    subject_map = {str(s["_id"]): s for s in subjects}
    
    nodes = []
    links = []
    
    for course in courses:
        subject = subject_map.get(course["subject_id"], {})
        nodes.append({
            "id": str(course["_id"]),
            "label": course["title"],
            "type": "course",
            "color": subject.get("color", "#3B82F6"),
            "subject": subject.get("name", "Unknown")
        })
        
        # Add links from cross references
        for ref in course.get("cross_references", []):
            links.append({
                "source": str(course["_id"]),
                "target": ref["course_id"],
                "concepts": ref.get("shared_concepts", [])
            })
    
    return {"nodes": nodes, "links": links}

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard")
async def get_dashboard(user: dict = Depends(get_current_user)):
    # Recent courses
    recent_courses = await db.courses.find(
        {"user_id": user["id"]}
    ).sort("updated_at", -1).limit(5).to_list(5)
    
    # Get subject info for recent courses
    subject_ids = list(set([c["subject_id"] for c in recent_courses]))
    subjects = await db.subjects.find({"_id": {"$in": [ObjectId(sid) for sid in subject_ids]}}).to_list(100)
    subject_map = {str(s["_id"]): s for s in subjects}
    
    recent = [{
        "id": str(c["_id"]),
        "title": c["title"],
        "subject_name": subject_map.get(c["subject_id"], {}).get("name", "Unknown"),
        "subject_color": subject_map.get(c["subject_id"], {}).get("color", "#3B82F6"),
        "updated_at": c.get("updated_at", "")
    } for c in recent_courses]
    
    # Due flashcards count
    now = datetime.now(timezone.utc).isoformat()
    due_count = await db.flashcard_progress.count_documents({
        "user_id": user["id"],
        "next_review": {"$lte": now}
    })
    
    # Unreviewed flashcards
    all_flashcard_count = await db.questions.count_documents({"user_id": user["id"], "type": "flashcard"})
    reviewed_count = await db.flashcard_progress.count_documents({"user_id": user["id"]})
    new_flashcards = all_flashcard_count - reviewed_count
    
    # Stats
    stats = await get_stats_overview(user)
    
    return {
        "recent_courses": recent,
        "due_flashcards": due_count + max(0, new_flashcards),
        "stats": stats
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "MedRevision API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

# CORS - Must specify origins explicitly when using credentials
cors_origins = [
    "http://localhost:3000",
    "https://yo-social-33.preview.emergentagent.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
