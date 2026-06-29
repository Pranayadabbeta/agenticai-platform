from dotenv import load_dotenv
load_dotenv(override=True)

import os
import uvicorn

print(f"TAVILY_API_KEY loaded: {bool(os.getenv('TAVILY_API_KEY'))}")
print(f"GEMINI_API_KEY loaded: {bool(os.getenv('GEMINI_API_KEY'))}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.core.database import init_db

# Initialize database schema/migration
init_db()

from app.core.database import SessionLocal, Company
session = SessionLocal()
try:
    count = session.query(Company).count()
    if count < 20:
        print(f"Database has {count} companies. Clearing and running re-seed...")
        session.query(Company).delete()
        session.commit()
        from data.seed_companies import seed
        seed()
except Exception as e:
    print(f"Error during startup database check/seed: {e}")
finally:
    session.close()

app = FastAPI(title="agenticai-platform")

# CORS middleware allowing all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "agenticai-platform"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
