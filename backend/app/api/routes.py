import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Response

from app.core.memory_manager import MemoryManager
from app.core.agent_registry import AgentRegistry
from app.core.workflow_engine import WorkflowEngine
from app.core.database import Workflow, init_db, get_db, PlannerRun

from app.core.schemas import (
    WorkflowRunRequest,
    WorkflowRunResponse,
    ICPConfig,
    HITLDecision,
)

from app.agents.research_agent import ResearchAgent
from app.agents.qualification_agent import QualificationAgent
from app.agents.persona_agent import PersonaAgent
from app.agents.contact_agent import ContactAgent
from app.agents.summary_agent import SummaryAgent
from app.agents.planner import PlannerAgent
from app.tools.pdf_generator import generate_prospect_pdf

router = APIRouter()

def get_memory():
    m = MemoryManager()
    try:
        yield m
    finally:
        m.close()

def get_registry(memory: MemoryManager = Depends(get_memory)) -> AgentRegistry:
    """Build and return a fully-populated AgentRegistry."""
    reg = AgentRegistry()
    reg.register(ResearchAgent(memory))
    reg.register(QualificationAgent(memory))
    reg.register(PersonaAgent(memory))
    reg.register(ContactAgent(memory))
    reg.register(SummaryAgent(memory))
    return reg


@router.get("/registry")
def get_registry_capabilities(registry: AgentRegistry = Depends(get_registry)):
    return registry.get_all_capabilities()


def run_workflow_background(workflow_id: str, agent_sequence: list):
    memory = MemoryManager()
    try:
        reg = AgentRegistry()
        reg.register(ResearchAgent(memory))
        reg.register(QualificationAgent(memory))
        reg.register(PersonaAgent(memory))
        reg.register(ContactAgent(memory))
        reg.register(SummaryAgent(memory))
        
        engine = WorkflowEngine(reg, memory)
        engine.run(workflow_id, agent_sequence)
    except Exception as e:
        try:
            db_wf = memory.db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
            if db_wf:
                db_wf.status = "failed"
                memory.db.commit()
        except Exception:
            pass
    finally:
        memory.close()


# --- ROUTE 1 ---
@router.post("/workflow/run", response_model=WorkflowRunResponse)
def run_workflow(request: WorkflowRunRequest, background_tasks: BackgroundTasks):
    workflow_id = f"WF-{uuid.uuid4().hex[:8].upper()}"
    goal = request.goal
    icp = request.icp
    
    memory = MemoryManager()
    try:
        # Save workflow
        memory.save_workflow(workflow_id, goal, icp.model_dump(), [])
        
        # Create PlannerAgent and call planner.plan
        registry = get_registry(memory)
        planner = PlannerAgent(memory, registry)
        plan = planner.plan(workflow_id, goal, icp.model_dump())
        
        # Update workflow agent_sequence, status, and merge icp_override directly in the database
        db_wf = memory.db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
        if db_wf:
            # Merge plan["icp_override"] into current icp_config
            icp_data = icp.model_dump()
            icp_override = plan.get("icp_override", {})
            for key, val in icp_override.items():
                if val is not None and val != "":
                    icp_data[key] = val
            db_wf.icp_config = json.dumps(icp_data)
            db_wf.agent_sequence = json.dumps(plan["agents"])
            db_wf.status = "running"
            memory.db.commit()
            
        background_tasks.add_task(run_workflow_background, workflow_id, plan["agents"])
        
        return WorkflowRunResponse(
            workflow_id=workflow_id,
            status="running",
            message="Workflow pipeline started in the background"
        )
    except Exception as e:
        try:
            db_wf = memory.db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
            if db_wf:
                db_wf.status = "failed"
                memory.db.commit()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        memory.close()


# --- ROUTE 2 ---
@router.get("/workflow/{workflow_id}")
def get_workflow(workflow_id: str, memory: MemoryManager = Depends(get_memory)):
    workflow = memory.load_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
    
    results = memory.get_all_agent_results(workflow_id)
    hitl_history = memory.get_hitl_history(workflow_id)
    return {
        "workflow": workflow,
        "agent_results": results,
        "hitl_history": hitl_history
    }


# --- ROUTE 2C: EXPORT PDF ---
@router.get("/workflow/{workflow_id}/export/pdf")
def export_pdf(workflow_id: str):
    memory = MemoryManager()
    try:
        workflow = memory.load_workflow(workflow_id)
        agent_results = memory.get_all_agent_results(workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        pdf_bytes = generate_prospect_pdf(workflow, agent_results)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=prospect_{workflow_id}.pdf"}
        )
    finally:
        memory.close()


# --- ROUTE 2B: GET WORKFLOW PLAN ---
@router.get("/workflow/{workflow_id}/plan")
def get_workflow_plan(workflow_id: str, memory: MemoryManager = Depends(get_memory)):
    plan_run = memory.db.query(PlannerRun).filter(PlannerRun.workflow_id == workflow_id).first()
    if not plan_run:
        raise HTTPException(status_code=404, detail=f"Plan for workflow {workflow_id} not found")
    
    # Parse plan_json
    agents = []
    estimated_steps = 0
    reasoning = plan_run.reasoning or ""
    intent = getattr(plan_run, "intent", None) or "company_discovery"
    if plan_run.plan_json:
        try:
            plan_data = json.loads(plan_run.plan_json)
            agents = plan_data.get("agents", [])
            estimated_steps = plan_data.get("estimated_steps", len(agents))
            if not reasoning:
                reasoning = plan_data.get("reasoning", "")
            if not intent or intent == "company_discovery":
                intent = plan_data.get("intent", intent)
        except Exception:
            pass
            
    return {
        "workflow_id": plan_run.workflow_id,
        "goal": plan_run.raw_goal or "",
        "intent": intent,
        "agents": agents,
        "reasoning": reasoning,
        "estimated_steps": estimated_steps
    }


def rerun_research_summary_background(workflow_id: str, focus_area: str):
    memory = MemoryManager()
    try:
        db_wf = memory.db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
        if db_wf:
            db_wf.status = "running"
            if focus_area:
                db_wf.goal = f"{db_wf.goal} with focus on: {focus_area}"
            memory.db.commit()

        reg = AgentRegistry()
        reg.register(ResearchAgent(memory))
        reg.register(QualificationAgent(memory))
        reg.register(PersonaAgent(memory))
        reg.register(ContactAgent(memory))
        reg.register(SummaryAgent(memory))

        engine = WorkflowEngine(reg, memory)
        engine.run(workflow_id, ["research", "summary"])

        db_wf = memory.db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
        if db_wf:
            db_wf.status = "complete"
            memory.db.commit()
    except Exception:
        try:
            db_wf = memory.db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
            if db_wf:
                db_wf.status = "failed"
                memory.db.commit()
        except Exception:
            pass
    finally:
        memory.close()


# --- ROUTE 3 ---
@router.get("/workflow/{workflow_id}/summary")
def get_workflow_summary(workflow_id: str, memory: MemoryManager = Depends(get_memory)):
    summary = memory.get_agent_result(workflow_id, "summary")
    if summary is None:
        raise HTTPException(status_code=404, detail=f"Summary for workflow {workflow_id} not found")
    return summary


# --- ROUTE 3B: EVIDENCE & TIMELINE ---
@router.get("/workflow/{workflow_id}/evidence")
def get_workflow_evidence(workflow_id: str, memory: MemoryManager = Depends(get_memory)):
    results = memory.get_all_agent_results(workflow_id)
    timeline = []
    total_elapsed = 0.0
    sources = []
    confidence_breakdown = {}

    agent_order = ["research", "qualification", "persona", "contact", "summary"]
    for agent_name in agent_order:
        if agent_name in results and results[agent_name].get("status") == "complete":
            payload = results[agent_name].get("payload", {})
            elapsed = payload.get("elapsed_seconds", 0.0)
            total_elapsed += float(elapsed)
            m_read = payload.get("memory_read", [])
            m_write = payload.get("memory_write", [])

            if agent_name == "research":
                summary_text = f"Found {payload.get('companies_found', 0)} companies"
                details = payload.get("companies", [])
                sources.extend(payload.get("sources", []))
            elif agent_name == "qualification":
                summary_text = f"Scored {payload.get('leads_scored', 0)} leads"
                details = payload.get("all_leads", [])
                top_l = payload.get("top_lead", {})
                if top_l:
                    confidence_breakdown = top_l.get("score_breakdown", {})
            elif agent_name == "persona":
                p_role = payload.get("persona", {}).get("role", "CTO")
                summary_text = f"Identified decision maker: {p_role}"
                details = payload.get("persona", {})
            elif agent_name == "contact":
                summary_text = f"Generated contact for {payload.get('company_name', 'target')}"
                details = {
                    "email": payload.get("email"),
                    "phone": payload.get("phone"),
                    "linkedin_url": payload.get("linkedin_url"),
                    "verified": payload.get("verified", False)
                }
            elif agent_name == "summary":
                summary_text = f"Recommendation ready ({payload.get('recommendation_strength', 'Strong Buy')})"
                details = {
                    "executive_summary": payload.get("executive_summary"),
                    "next_action": payload.get("next_action")
                }
                if payload.get("sources_used"):
                    sources.extend(payload.get("sources_used"))

            timeline.append({
                "agent": agent_name,
                "summary": summary_text,
                "details": details,
                "elapsed": elapsed,
                "memory_read": m_read,
                "memory_write": m_write
            })

    # Deduplicate sources
    seen_src = set()
    dedup_sources = []
    for s in sources:
        if s not in seen_src:
            dedup_sources.append(s)
            seen_src.add(s)

    return {
        "timeline": timeline,
        "total_elapsed": round(total_elapsed, 2),
        "sources": dedup_sources,
        "confidence_breakdown": confidence_breakdown
    }


# --- ROUTE 4 ---
@router.post("/hitl/decision")
def post_hitl_decision(request: HITLDecision, background_tasks: BackgroundTasks):
    from datetime import datetime, timezone

    memory = MemoryManager()
    try:
        workflow = memory.load_workflow(request.workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")

        iteration = memory.get_workflow_iteration(request.workflow_id) + 1

        if request.decision == "approve":
            memory.update_workflow_status(request.workflow_id, "approved")
            memory.save_agent_result(request.workflow_id, "hitl", {
                "decision": "approve",
                "notes": request.notes,
                "decided_at": datetime.now(timezone.utc).isoformat(),
                "iteration": iteration
            })
            memory.close()
            return {"workflow_id": request.workflow_id, "decision": "approve",
                    "status": "approved", "message": "Prospect approved and saved"}

        elif request.decision == "reject":
            memory.update_workflow_status(request.workflow_id, "rejected")
            memory.save_agent_result(request.workflow_id, "hitl", {
                "decision": "reject",
                "notes": request.notes,
                "decided_at": datetime.now(timezone.utc).isoformat(),
                "iteration": iteration
            })
            memory.close()
            return {"workflow_id": request.workflow_id, "decision": "reject",
                    "status": "rejected", "message": "Prospect rejected"}

        elif request.decision == "request_more":
            # Save the HITL feedback first
            memory.save_agent_result(request.workflow_id, "hitl", {
                "decision": "request_more",
                "notes": request.notes,
                "focus_area": request.focus_area,
                "decided_at": datetime.now(timezone.utc).isoformat(),
                "iteration": iteration
            })

            # Update workflow goal to include human feedback
            original_workflow = memory.load_workflow(request.workflow_id)
            original_goal = original_workflow.get("goal","")
            updated_goal = f"{original_goal}. Human feedback: {request.notes}. Focus on: {request.focus_area}"

            # Update the workflow goal in database
            db_workflow = memory.db.query(Workflow).filter(
                Workflow.workflow_id == request.workflow_id
            ).first()
            if db_workflow:
                db_workflow.goal = updated_goal
                db_workflow.status = "running"
                memory.db.commit()

            memory.close()

            # Re-run ONLY summary agent with updated context in background
            background_tasks.add_task(
                rerun_with_feedback,
                request.workflow_id,
                updated_goal,
                request.notes,
                request.focus_area
            )

            return {
                "workflow_id": request.workflow_id,
                "decision": "request_more",
                "status": "running",
                "message": f"Re-analyzing with your feedback. Iteration {iteration + 1} starting..."
            }

    except HTTPException:
        raise
    except Exception as e:
        memory.close()
        raise HTTPException(status_code=500, detail=str(e))


def rerun_with_feedback(workflow_id: str, updated_goal: str, notes: str, focus_area: str):
    """
    Re-runs research and summary agents incorporating human feedback.
    Does NOT re-run qualification, persona, contact (saves time).
    """
    memory = MemoryManager()
    try:
        # Give Gemini the human feedback + existing data to create updated summary
        from app.tools.llm import call_llm, extract_json_from_response, is_llm_available
        import json

        existing_results = memory.get_all_agent_results(workflow_id)
        hitl_history = memory.get_hitl_history(workflow_id)

        if is_llm_available():
            # Build context with human feedback prominently
            context = json.dumps(existing_results, indent=2)
            feedback_context = "\n".join([
                f"Iteration {h.get('iteration',1)}: {h.get('notes','')} | Focus: {h.get('focus_area','')}"
                for h in hitl_history
            ])

            prompt = f"""A human reviewer has provided feedback on this B2B prospect analysis.
Update the recommendation based on their specific feedback.

HUMAN FEEDBACK HISTORY:
{feedback_context}

EXISTING AGENT DATA:
{context}

Generate an UPDATED recommendation that directly addresses the human's feedback.
Return ONLY valid JSON:
{{
  "priority_target": "<company from existing data>",
  "recommendation_strength": "Strong Buy or Buy or Hold or Pass",
  "confidence": <0-100>,
  "executive_summary": "<updated summary addressing human feedback specifically>",
  "evidence": ["<updated evidence 1>","<updated evidence 2>","<updated evidence 3>"],
  "risk_factors": ["<updated risk 1>","<updated risk 2>"],
  "next_action": "<updated specific action based on feedback>",
  "human_feedback_addressed": "<one sentence explaining how feedback was incorporated>",
  "sources_used": ["Existing agent analysis","Human feedback integration","Gemini re-analysis"]
}}"""

            try:
                system = "You are a B2B analyst updating a recommendation based on human expert feedback. Use only data provided. Return only JSON."
                response = call_llm(prompt, system)
                updated_summary = extract_json_from_response(response)
                updated_summary["iteration"] = len(hitl_history) + 1
                memory.save_agent_result(workflow_id, "summary", updated_summary, "complete")
            except Exception as e:
                print(f"Re-analysis failed: {e}")

        memory.update_workflow_status(workflow_id, "complete")
    except Exception as e:
        print(f"Rerun failed: {e}")
        memory.update_workflow_status(workflow_id, "complete")
    finally:
        memory.close()


# --- ROUTE 5 ---
@router.get("/companies")
def get_companies(memory: MemoryManager = Depends(get_memory)):
    return memory.get_all_companies()


# --- ROUTE 6 ---
@router.get("/agents")
def get_agents(registry: AgentRegistry = Depends(get_registry)):
    return registry.list_agents()


# --- ROUTE 7 ---
@router.get("/workflows")
def get_recent_workflows(memory: MemoryManager = Depends(get_memory)):
    return memory.get_recent_workflows()


# --- ROUTE 8 ---
@router.get("/dashboard/telemetry")
def get_dashboard_telemetry(memory: MemoryManager = Depends(get_memory)):
    return {
        "stats": memory.get_dashboard_stats(),
        "recent_workflows": memory.get_recent_workflows(),
        "recent_activity": memory.get_recent_agent_activity()
    }
