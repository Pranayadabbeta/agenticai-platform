from pydantic import BaseModel

class ICPConfig(BaseModel):
    industry: str | None = None
    funding_stage: str | None = None  # Seed, Series A, Series B, Series C, Series D, Series F, Public
    region: str | None = None
    min_employees: int | None = None
    max_employees: int | None = None
    cloud_platform: str | None = None  # AWS, GCP, Azure, Any
    tech_stack: str | None = None
    hiring_departments: str | None = None
    growth_rate: str | None = None
    domain_extension: str | None = None
    keyword: str | None = None

class CompanyRecord(BaseModel):
    company_name: str
    industry: str
    employees: int
    funding_stage: str
    cloud_platform: str
    region: str
    hiring_roles: int = 0
    growth_signal: str = ""
    domain: str

class LeadScore(BaseModel):
    company_name: str
    lead_score: int  # 0-100
    tier: str  # Strategic, Qualified, Nurture, Disqualified
    rationale: list[str]

class PersonaResult(BaseModel):
    company_name: str
    role: str
    seniority: str
    confidence: str  # High, Medium, Low
    reason: str

class ContactResult(BaseModel):
    company_name: str
    role: str
    email: str
    phone: str
    linkedin_url: str
    verified: bool = False
    full_name: str | None = None
    personal_email: str | None = None
    verification_reason: str | None = None

class SummaryResult(BaseModel):
    priority_target: str
    confidence: int  # 0-100
    evidence: list[str]
    persona: dict
    contact: dict
    next_action: str

class WorkflowPlan(BaseModel):
    workflow_id: str
    goal: str
    agents: list[str]
    parallel_groups: list[list[str]] = []
    estimated_steps: int
    status: str = "planning"
    icp_override: dict = {}

class AgentResultSchema(BaseModel):
    agent_name: str
    status: str
    payload: dict
    error: str | None = None
    retry_count: int = 0

class WorkflowRunRequest(BaseModel):
    goal: str
    icp: ICPConfig

class WorkflowRunResponse(BaseModel):
    workflow_id: str
    status: str
    message: str

class HITLDecision(BaseModel):
    workflow_id: str
    decision: str  # approve, reject, request_more
    notes: str = ""
    focus_area: str = ""  # for request_more: what to research deeper
