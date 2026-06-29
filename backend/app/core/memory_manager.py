import json
import os
from datetime import datetime
from app.core.database import SessionLocal, Company, Workflow, PlannerRun, AgentResult, Knowledge, init_db
from app.core.schemas import CompanyRecord, WorkflowPlan, AgentResultSchema

class MemoryManager:
    def __init__(self):
        init_db()
        self.db = SessionLocal()

    # --- Workflow operations ---

    def save_workflow(self, workflow_id: str, goal: str, icp_config: dict, agent_sequence: list) -> None:
        """Create a new workflow record. Skip if already exists."""
        try:
            existing = self.db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
            if not existing:
                workflow = Workflow(
                    workflow_id=workflow_id,
                    goal=goal,
                    icp_config=json.dumps(icp_config) if icp_config is not None else None,
                    agent_sequence=json.dumps(agent_sequence) if agent_sequence is not None else None,
                    status="planning"
                )
                self.db.add(workflow)
                self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e

    def update_workflow_status(self, workflow_id: str, status: str) -> None:
        """Update workflow status field. Mark completed_at if status == 'complete' or 'failed'."""
        try:
            workflow = self.db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
            if workflow:
                workflow.status = status
                if status in ("complete", "failed"):
                    workflow.completed_at = datetime.utcnow()
                self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e

    def load_workflow(self, workflow_id: str) -> dict | None:
        """Return workflow as dict with keys: workflow_id, goal, icp_config, status, agent_sequence, created_at"""
        try:
            workflow = self.db.query(Workflow).filter(Workflow.workflow_id == workflow_id).first()
            if not workflow:
                return None
            
            icp_config_val = None
            if workflow.icp_config:
                try:
                    icp_config_val = json.loads(workflow.icp_config)
                except Exception:
                    icp_config_val = {}
            
            agent_sequence_val = None
            if workflow.agent_sequence:
                try:
                    agent_sequence_val = json.loads(workflow.agent_sequence)
                except Exception:
                    agent_sequence_val = []

            return {
                "workflow_id": workflow.workflow_id,
                "goal": workflow.goal,
                "icp_config": icp_config_val,
                "status": workflow.status,
                "agent_sequence": agent_sequence_val,
                "created_at": workflow.created_at
            }
        except Exception:
            return None

    # --- Company operations ---

    def save_company(self, company: dict) -> int:
        """INSERT OR IGNORE into companies table. Return company id."""
        # Check by company_name before inserting to avoid duplicates
        try:
            existing = self.db.query(Company).filter(Company.company_name == company.get("company_name")).first()
            if existing:
                return existing.id

            new_company = Company(
                company_name=company.get("company_name"),
                industry=company.get("industry"),
                employees=company.get("employees"),
                funding_stage=company.get("funding_stage"),
                cloud_platform=company.get("cloud_platform"),
                region=company.get("region"),
                hiring_roles=company.get("hiring_roles", 0),
                growth_signal=company.get("growth_signal"),
                domain=company.get("domain")
            )
            self.db.add(new_company)
            self.db.commit()
            self.db.refresh(new_company)
            return new_company.id
        except Exception as e:
            self.db.rollback()
            raise e

    def get_all_companies(self) -> list[dict]:
        """Return all companies as list of dicts."""
        try:
            companies = self.db.query(Company).all()
            res = []
            for c in companies:
                res.append({
                    "id": c.id,
                    "company_name": c.company_name,
                    "industry": c.industry,
                    "employees": c.employees,
                    "funding_stage": c.funding_stage,
                    "cloud_platform": c.cloud_platform,
                    "region": c.region,
                    "hiring_roles": c.hiring_roles,
                    "growth_signal": c.growth_signal,
                    "domain": c.domain,
                    "created_at": c.created_at.isoformat() if c.created_at else None
                })
            return res
        except Exception:
            return []

    def search_companies(self, filters: dict) -> list[dict]:
        """
        Filter companies table by ICP. filters keys:
        - industry (str, optional): exact match OR partial match using LIKE
        - funding_stages (list[str], optional): IN filter
        - region (str, optional): exact match
        - min_employees (int, optional): employees >= min
        - max_employees (int, optional): employees <= max
        - cloud_platform (str, optional): exact match, skip if "Any"
        Return list of dicts.
        """
        try:
            query = self.db.query(Company)
            
            industry = filters.get("industry")
            if industry:
                query = query.filter(Company.industry.ilike(industry))

            funding_stages = filters.get("funding_stages")
            if funding_stages:
                query = query.filter(Company.funding_stage.in_(funding_stages))

            region = filters.get("region")
            if region:
                query = query.filter(Company.region == region)

            min_employees = filters.get("min_employees")
            if min_employees is not None:
                query = query.filter(Company.employees >= min_employees)

            max_employees = filters.get("max_employees")
            if max_employees is not None:
                query = query.filter(Company.employees <= max_employees)

            cloud_platform = filters.get("cloud_platform")
            if cloud_platform and cloud_platform != "Any":
                query = query.filter(Company.cloud_platform == cloud_platform)
            
            companies = query.all()
            res = []
            for c in companies:
                res.append({
                    "id": c.id,
                    "company_name": c.company_name,
                    "industry": c.industry,
                    "employees": c.employees,
                    "funding_stage": c.funding_stage,
                    "cloud_platform": c.cloud_platform,
                    "region": c.region,
                    "hiring_roles": c.hiring_roles,
                    "growth_signal": c.growth_signal,
                    "domain": c.domain,
                    "created_at": c.created_at.isoformat() if c.created_at else None
                })
            return res
        except Exception:
            return []

    # --- Planner run ---

    def save_planner_run(self, workflow_id: str, raw_goal: str, plan_json: dict, llm_model: str, reasoning: str | None = None, intent: str | None = None) -> None:
        """Save the planner output to planner_runs table."""
        try:
            if reasoning is None and plan_json is not None:
                reasoning = plan_json.get("reasoning")
            if intent is None and plan_json is not None:
                intent = plan_json.get("intent")
            run = PlannerRun(
                workflow_id=workflow_id,
                raw_goal=raw_goal,
                plan_json=json.dumps(plan_json) if plan_json is not None else None,
                llm_model=llm_model,
                reasoning=reasoning,
                intent=intent
            )
            self.db.add(run)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e

    # --- Agent result operations ---

    def save_agent_result(self, workflow_id: str, agent_name: str, payload: dict, status: str = "complete", error: str | None = None) -> None:
        """
        UPSERT into agent_results.
        If a row with (workflow_id, agent_name) exists, update it.
        Set completed_at = utcnow when status == 'complete' or 'failed'.
        Serialize payload to JSON string before storing.
        """
        try:
            existing = self.db.query(AgentResult).filter(
                AgentResult.workflow_id == workflow_id,
                AgentResult.agent_name == agent_name
            ).first()

            if existing:
                existing.status = status
                existing.payload = json.dumps(payload) if payload is not None else None
                existing.error = error
                if status in ("complete", "failed"):
                    existing.completed_at = datetime.utcnow()
            else:
                new_result = AgentResult(
                    workflow_id=workflow_id,
                    agent_name=agent_name,
                    status=status,
                    payload=json.dumps(payload) if payload is not None else None,
                    error=error,
                    completed_at=datetime.utcnow() if status in ("complete", "failed") else None
                )
                self.db.add(new_result)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e

    def mark_agent_running(self, workflow_id: str, agent_name: str) -> None:
        """Set agent status to 'running' and started_at = utcnow."""
        try:
            existing = self.db.query(AgentResult).filter(
                AgentResult.workflow_id == workflow_id,
                AgentResult.agent_name == agent_name
            ).first()

            if existing:
                existing.status = "running"
                existing.started_at = datetime.utcnow()
            else:
                new_result = AgentResult(
                    workflow_id=workflow_id,
                    agent_name=agent_name,
                    status="running",
                    started_at=datetime.utcnow()
                )
                self.db.add(new_result)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e

    def get_agent_result(self, workflow_id: str, agent_name: str) -> dict | None:
        """Return agent result payload as dict. Return None if not found."""
        try:
            result = self.db.query(AgentResult).filter(
                AgentResult.workflow_id == workflow_id,
                AgentResult.agent_name == agent_name
            ).first()
            if not result or not result.payload:
                return None
            return json.loads(result.payload)
        except Exception:
            return None

    def get_all_agent_results(self, workflow_id: str) -> dict:
        """Return all agent results for a workflow as {agent_name: {"status": status, "payload": payload, "error": error}}."""
        try:
            results = self.db.query(AgentResult).filter(
                AgentResult.workflow_id == workflow_id
            ).all()
            res = {}
            for r in results:
                payload_val = {}
                if r.payload:
                    try:
                        payload_val = json.loads(r.payload)
                    except Exception:
                        pass
                res[r.agent_name] = {
                    "status": r.status,
                    "payload": payload_val,
                    "error": r.error
                }
            return res
        except Exception:
            return {}

    def get_hitl_history(self, workflow_id: str) -> list:
        """Return all HITL decisions for this workflow as a list."""
        results = self.db.query(AgentResult).filter(
            AgentResult.workflow_id == workflow_id,
            AgentResult.agent_name == "hitl"
        ).order_by(AgentResult.started_at).all()
        return [json.loads(r.payload) for r in results if r.payload]

    def get_workflow_iteration(self, workflow_id: str) -> int:
        """Count how many HITL decisions have been made."""
        return len(self.get_hitl_history(workflow_id))

    # --- Knowledge ---

    def get_knowledge(self, category: str, key: str) -> dict | None:
        """Look up knowledge table by category and key. Return value as dict."""
        try:
            k = self.db.query(Knowledge).filter(
                Knowledge.category == category,
                Knowledge.key == key
            ).first()
            if not k or not k.value:
                return None
            return json.loads(k.value)
        except Exception:
            return None

    # --- Dashboard Telemetry ---

    def get_recent_workflows(self, limit: int = 10) -> list[dict]:
        """Return list of recent workflows ordered by created_at desc."""
        try:
            wfs = self.db.query(Workflow).order_by(Workflow.created_at.desc()).limit(limit).all()
            res = []
            for w in wfs:
                icp_val = {}
                if w.icp_config:
                    try:
                        icp_val = json.loads(w.icp_config)
                    except Exception:
                        pass
                
                # Fetch actual companies found count from research agent result
                companies_count = 0
                research_res = self.db.query(AgentResult).filter(
                    AgentResult.workflow_id == w.workflow_id,
                    AgentResult.agent_name == "research"
                ).first()
                if research_res and research_res.payload:
                    try:
                        research_payload = json.loads(research_res.payload)
                        companies_count = len(research_payload.get("companies", []))
                    except Exception:
                        pass

                res.append({
                    "workflow_id": w.workflow_id,
                    "goal": w.goal,
                    "industry": icp_val.get("industry", "SaaS"),
                    "status": w.status,
                    "companies_count": companies_count,
                    "started_at": w.created_at.strftime("%b %d, %I:%M %p") if w.created_at else "Now",
                    "owner": "Agentic AI"
                })
            return res
        except Exception:
            return []

    def get_recent_agent_activity(self, limit: int = 10) -> list[dict]:
        """Return list of recent agent executions for live dashboards."""
        try:
            results = self.db.query(AgentResult).order_by(AgentResult.completed_at.desc()).limit(limit).all()
            res = []
            for r in results:
                time_str = r.completed_at.strftime("%H:%M") if r.completed_at else datetime.utcnow().strftime("%H:%M")
                msg = f"{r.agent_name.capitalize()} Agent completed step for workflow"
                if r.agent_name == "research":
                    msg = "Research Agent discovered target companies matching ICP"
                elif r.agent_name == "qualification":
                    msg = "Qualification Agent scored companies relative to target criteria"
                elif r.agent_name == "persona":
                    msg = "Persona Agent mapped target executive decision-makers"
                elif r.agent_name == "contact":
                    msg = "Contact Agent enriched verified domain emails & LinkedIn links"
                elif r.agent_name == "summary":
                    msg = "Summary Agent synthesized recommendations and match evidence"

                res.append({
                    "time": time_str,
                    "agent": f"{r.agent_name.capitalize()} Agent",
                    "message": msg,
                    "workflow_id": r.workflow_id
                })
            return res
        except Exception:
            return []

    def get_dashboard_stats(self) -> dict:
        """Return aggregated stats for dashboard telemetry cards."""
        try:
            active_wfs = self.db.query(Workflow).filter(Workflow.status == "running").count()
            if active_wfs == 0:
                active_wfs = self.db.query(Workflow).count()
            total_companies = self.db.query(Company).count()
            
            # Count qualified leads dynamically across all completed qualification agent runs
            qualified_leads_count = 0
            qual_results = self.db.query(AgentResult).filter(
                AgentResult.agent_name == "qualification",
                AgentResult.status == "complete"
            ).all()
            for qr in qual_results:
                if qr.payload:
                    try:
                        payload = json.loads(qr.payload)
                        qualified_leads_count += len(payload.get("qualified_leads", []))
                    except Exception:
                        pass
            
            # Count workflows awaiting human review
            pending_approval = self.db.query(Workflow).filter(Workflow.status == "complete").count()
            
            return {
                "active_workflows": active_wfs or 0,
                "companies_found": total_companies or 0,
                "qualified_leads": qualified_leads_count or 0,
                "pending_approval": pending_approval or 0
            }
        except Exception:
            return {
                "active_workflows": 0,
                "companies_found": 0,
                "qualified_leads": 0,
                "pending_approval": 0
            }

    # --- Cleanup ---

    def close(self):
        try:
            self.db.close()
        except Exception:
            pass

