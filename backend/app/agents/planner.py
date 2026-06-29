from app.core.agent_registry import AgentBase, AgentRegistry
from app.core.memory_manager import MemoryManager
from app.tools.llm import call_llm, is_llm_available, extract_json_from_response
from app.core.schemas import WorkflowPlan
import json
import uuid

PLANNER_SYSTEM_PROMPT = """You are an intelligent workflow planner for a B2B prospect intelligence platform.

You have access to these agents and their capabilities:
{agent_capabilities_json}

Analyze the user's goal and determine the MINIMUM set of agents needed.
Use dependency rules (requires field) to ensure correct ordering.

Intent classification rules:
- Goal mentions "find", "list", "discover", "search" companies only (without specifying target roles, outreach, or persona details) → [research, qualification]
- Goal mentions target roles/personas (CTO, CIO, CEO, VP, Founder, director, head of, decision maker), "persona", "hiring for", "sell", "outreach", "contact", "email", "reach out", "sales" → [research, qualification, persona, contact, summary]
- Goal mentions "who to contact", "decision maker", "CTO email", "CIO email" specifically → [research, persona, contact]
- Goal mentions "summarize", "analyze", "recommend", "insights about" specific company → [research, summary]
- Goal mentions "qualify", "score", "rank", "best companies" → [research, qualification]
- Default when ambiguous → [research, qualification, summary]

DEPENDENCY RULES (enforce strictly):
- contact requires persona to be present
- persona requires research to be present
- qualification requires research to be present
- summary requires at least research to be present

Return ONLY this JSON, no other text:
{{
  "workflow_id": "<provided>",
  "goal": "<restate clearly>",
  "intent": "<one of: company_discovery | sales_outreach | contact_lookup | company_analysis | lead_qualification>",
  "agents": ["agent1", "agent2"],
  "reasoning": "<explain in ONE sentence why these specific agents were chosen>",
  "estimated_steps": <count>,
  "status": "planning"
}}"""

class PlannerAgent(AgentBase):

    def __init__(self, memory: MemoryManager, registry: AgentRegistry | None = None):
        super().__init__(memory)
        self._registry = registry

    @property
    def name(self) -> str:
        return "planner"

    @property
    def description(self) -> str:
        return "Converts user goal to WorkflowPlan dynamically using Agent Registry"

    def _get_registry(self) -> AgentRegistry:
        if self._registry is not None:
            return self._registry
        from app.agents.research_agent import ResearchAgent
        from app.agents.qualification_agent import QualificationAgent
        from app.agents.persona_agent import PersonaAgent
        from app.agents.contact_agent import ContactAgent
        from app.agents.summary_agent import SummaryAgent
        reg = AgentRegistry()
        reg.register(ResearchAgent(self.memory))
        reg.register(QualificationAgent(self.memory))
        reg.register(PersonaAgent(self.memory))
        reg.register(ContactAgent(self.memory))
        reg.register(SummaryAgent(self.memory))
        return reg

    def extract_icp_from_goal(self, goal: str) -> dict:
        """
        Regex and keyword matching fallback to extract ICP parameters from user's goal.
        """
        import re
        icp_override = {}
        goal_lower = goal.lower()

        def has_word(word_pattern: str) -> bool:
            return bool(re.search(r'\b' + re.escape(word_pattern) + r'\b', goal_lower))

        # Industry mapping
        if has_word("saas"):
            icp_override["industry"] = "SaaS"
        elif has_word("ai") or "artificial intelligence" in goal_lower:
            icp_override["industry"] = "AI"
        elif has_word("healthcare") or has_word("medical"):
            icp_override["industry"] = "Healthcare"
        elif has_word("staffing") or has_word("recruiting"):
            icp_override["industry"] = "Staffing"
        elif has_word("manufacturing"):
            icp_override["industry"] = "Manufacturing"
        elif has_word("fintech") or has_word("finance"):
            icp_override["industry"] = "Fintech"

        # Region mapping
        if has_word("usa") or has_word("us") or "united states" in goal_lower:
            icp_override["region"] = "USA"
        elif has_word("europe") or has_word("eu") or has_word("uk"):
            icp_override["region"] = "Europe"
        elif has_word("apac") or has_word("asia"):
            icp_override["region"] = "APAC"

        # Funding stage mapping
        if has_word("seed"):
            icp_override["funding_stage"] = "Seed"
        elif "series a" in goal_lower:
            icp_override["funding_stage"] = "Series A"
        elif "series b" in goal_lower:
            icp_override["funding_stage"] = "Series B"
        elif "series c" in goal_lower:
            icp_override["funding_stage"] = "Series C"
        elif "series d" in goal_lower:
            icp_override["funding_stage"] = "Series D"
        elif "series f" in goal_lower:
            icp_override["funding_stage"] = "Series F"
        elif has_word("public"):
            icp_override["funding_stage"] = "Public"

        # Cloud platform mapping
        if has_word("aws") or "amazon web services" in goal_lower:
            icp_override["cloud_platform"] = "AWS"
        elif has_word("gcp") or "google cloud" in goal_lower:
            icp_override["cloud_platform"] = "GCP"
        elif has_word("azure"):
            icp_override["cloud_platform"] = "Azure"

        return icp_override

    def plan(self, workflow_id: str, goal: str, icp_config: dict) -> dict:
        """
        Main entry point for planning. NOT called via run() — called directly by the API route.
        """
        registry = self._get_registry()
        capabilities = registry.get_all_capabilities()

        if not is_llm_available():
            return self.fallback_plan(workflow_id, goal)

        try:
            capabilities_json = json.dumps(capabilities, indent=2)
            sys_prompt = PLANNER_SYSTEM_PROMPT.format(agent_capabilities_json=capabilities_json)
            user_prompt = f"workflow_id: {workflow_id}\ngoal: {goal}"

            response_text = call_llm(user_prompt, sys_prompt)
            plan_dict = extract_json_from_response(response_text)

            agents = plan_dict.get("agents", [])
            if not isinstance(agents, list):
                agents = []

            # STEP 3: Validate all agent names exist in registry (remove unknown agents)
            registered_agent_names = list(capabilities.keys())
            agents = [a for a in agents if a in registered_agent_names]

            # STEP 3: Enforce dependency rules programmatically after LLM response:
            # - if "contact" in agents and "persona" not in agents: insert "persona" before "contact"
            if "contact" in agents and "persona" not in agents:
                idx = agents.index("contact")
                agents.insert(idx, "persona")

            # - if "persona" in agents and "research" not in agents: insert "research" at index 0
            if "persona" in agents and "research" not in agents:
                agents.insert(0, "research")

            # - if "qualification" in agents and "research" not in agents: insert "research" at index 0
            if "qualification" in agents and "research" not in agents:
                agents.insert(0, "research")

            # - if "summary" in agents and "research" not in agents: insert "research" at index 0
            if "summary" in agents and "research" not in agents:
                agents.insert(0, "research")

            if agents and "research" not in agents:
                agents.insert(0, "research")

            # Deduplicate while preserving order
            seen = set()
            dedup = []
            for a in agents:
                if a not in seen:
                    dedup.append(a)
                    seen.add(a)
            agents = dedup

            # - always maintain order: research -> qualification -> persona -> contact -> summary
            order = ["research", "qualification", "persona", "contact", "summary"]
            agents.sort(key=lambda x: order.index(x) if x in order else 999)

            plan_dict["agents"] = agents
            plan_dict["estimated_steps"] = len(agents)
            plan_dict["workflow_id"] = workflow_id
            plan_dict["goal"] = plan_dict.get("goal") or goal
            plan_dict["intent"] = plan_dict.get("intent") or "company_discovery"
            plan_dict["reasoning"] = plan_dict.get("reasoning") or "Chosen based on user intent and dynamic capability mapping."
            plan_dict["status"] = "planning"

            icp_override = plan_dict.get("icp_override", {})
            if not isinstance(icp_override, dict):
                icp_override = {}
            regex_override = self.extract_icp_from_goal(goal)
            for k, v in regex_override.items():
                if k not in icp_override or icp_override[k] is None:
                    icp_override[k] = v
            plan_dict["icp_override"] = icp_override

            self.memory.save_planner_run(
                workflow_id=workflow_id,
                raw_goal=goal,
                plan_json=plan_dict,
                llm_model="gemini",
                reasoning=plan_dict["reasoning"],
                intent=plan_dict["intent"]
            )
            return plan_dict
        except Exception as e:
            import logging
            logging.error(f"Planner agent LLM call failed: {e}", exc_info=True)
            return self.fallback_plan(workflow_id, goal)

    def fallback_plan(self, workflow_id: str, goal: str) -> dict:
        """
        Used when LLM is unavailable. Returns dynamic plan using rule-based heuristics.
        """
        goal_lower = goal.lower()
        has_persona = any(w in goal_lower for w in ["persona", "hiring for", "cto", "cio", "ceo", "founder", "vp", "director", "head of", "decision maker", "who to contact"])
        
        if any(w in goal_lower for w in ["sell", "outreach", "sales", "reach out"]) or has_persona:
            agents = ["research", "qualification", "persona", "contact", "summary"]
            intent = "sales_outreach"
            reasoning = "Sales outreach or persona targeting detected: running full pipeline"
        elif any(w in goal_lower for w in ["who", "cto email", "cio email", "email of"]):
            agents = ["research", "persona", "contact"]
            intent = "contact_lookup"
            reasoning = "Contact lookup detected: identity and contact agents needed"
        elif any(w in goal_lower for w in ["summarize", "analyze", "about", "recommend", "insights"]):
            agents = ["research", "summary"]
            intent = "company_analysis"
            reasoning = "Analysis detected: research and synthesis needed"
        else:
            agents = ["research", "qualification"]
            intent = "company_discovery"
            reasoning = "Discovery detected: search and scoring needed"

        icp_override = self.extract_icp_from_goal(goal)
        plan_dict = {
            "workflow_id": workflow_id,
            "goal": goal,
            "intent": intent,
            "agents": agents,
            "reasoning": reasoning,
            "estimated_steps": len(agents),
            "status": "planning",
            "icp_override": icp_override
        }
        self.memory.save_planner_run(
            workflow_id=workflow_id,
            raw_goal=goal,
            plan_json=plan_dict,
            llm_model="fallback",
            reasoning=reasoning,
            intent=intent
        )
        return plan_dict

    def run(self, workflow_id: str) -> dict:
        """Required by AgentBase but PlannerAgent is called via plan() directly."""
        workflow = self.memory.load_workflow(workflow_id)
        if not workflow:
            return self.fallback_plan(workflow_id, "Unknown goal")
        return self.plan(workflow_id, workflow["goal"], workflow["icp_config"])

