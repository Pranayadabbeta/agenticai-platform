import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker

# Read DATABASE_URL from environment variable (default: absolute path to data/agenticai.db)
if "DATABASE_URL" in os.environ:
    DATABASE_URL = os.environ["DATABASE_URL"]
else:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(BASE_DIR, "data", "agenticai.db")
    DATABASE_URL = f"sqlite:///{db_path}"

# Create SQLAlchemy engine with check_same_thread=False for SQLite
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)

# Create SessionLocal using sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base = declarative_base()
Base = declarative_base()

# Create a get_db() dependency function that yields a session and closes it after
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String, nullable=False)
    industry = Column(String, nullable=True)
    employees = Column(Integer, nullable=True)
    funding_stage = Column(String, nullable=True)  # Seed, Series A, Series B, Series C, Series D, Series F, Public
    cloud_platform = Column(String, nullable=True)  # AWS, GCP, Azure, None
    region = Column(String, nullable=True)  # USA, Europe, APAC
    hiring_roles = Column(Integer, default=0, nullable=False)
    growth_signal = Column(Text, nullable=True)
    domain = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(String, unique=True, nullable=False)
    goal = Column(String, nullable=False)
    icp_config = Column(Text, nullable=True)  # stores JSON string
    status = Column(String, default="planning", nullable=False)  # planning, running, complete, failed
    agent_sequence = Column(Text, nullable=True)  # stores JSON list as string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)


class PlannerRun(Base):
    __tablename__ = "planner_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(String, nullable=False)
    raw_goal = Column(Text, nullable=True)
    plan_json = Column(Text, nullable=True)  # stores JSON string
    llm_model = Column(String, nullable=True)
    reasoning = Column(Text, nullable=True)
    intent = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AgentResult(Base):
    __tablename__ = "agent_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(String, nullable=False)
    agent_name = Column(String, nullable=False)  # research, qualification, persona, contact, summary
    status = Column(String, default="pending", nullable=False)  # pending, running, complete, failed
    payload = Column(Text, nullable=True)  # stores JSON string
    error = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


class Knowledge(Base):
    __tablename__ = "knowledge"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String, nullable=True)  # icp_pattern, persona_rule, industry_insight
    key = Column(String, nullable=False)
    value = Column(Text, nullable=True)  # stores JSON string
    source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=True)
    icp_config = Column(Text, nullable=True)  # stores JSON string
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


def init_db():
    Base.metadata.create_all(bind=engine)
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            result = conn.execute(text("PRAGMA table_info(planner_runs)"))
            columns = [row[1] for row in result.fetchall()]
            if "reasoning" not in columns:
                conn.execute(text("ALTER TABLE planner_runs ADD COLUMN reasoning TEXT"))
            if "intent" not in columns:
                conn.execute(text("ALTER TABLE planner_runs ADD COLUMN intent TEXT"))
    except Exception as e:
        import logging
        logging.error(f"Failed to check/alter planner_runs columns: {e}")
