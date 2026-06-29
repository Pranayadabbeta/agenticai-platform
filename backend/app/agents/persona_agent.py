from app.core.agent_registry import AgentBase
from app.core.memory_manager import MemoryManager
from app.tools.llm import call_llm, is_llm_available, extract_json_from_response
from app.tools.persona_mapper import map_persona

PERSONA_SYSTEM_PROMPT = """You are a B2B sales expert identifying the right decision-maker.
Given company information, identify the ideal person to contact for a B2B SaaS sale.
Return ONLY valid JSON, no other text.

{
  "role": "exact job title (e.g. Chief Technology Officer)",
  "role_short": "short version (e.g. CTO)",
  "seniority": "one of: C-Suite, VP, Director, Manager",
  "confidence": "one of: High, Medium, Low",
  "reasoning": "one sentence explaining why this person",
  "alternative_role": "second best contact role",
  "department": "Engineering/Product/Operations/HR/Finance"
}"""

class PersonaAgent(AgentBase):

    @property
    def name(self) -> str:
        return "persona"

    @property
    def description(self) -> str:
        return "Maps company to the correct decision-maker persona using Gemini LLM"

    @property
    def capabilities(self) -> list[str]:
        return ["find decision maker", "identify persona", "who to contact",
                "find cto", "find cio", "stakeholder", "outreach target",
                "sales contact", "buyer persona"]

    @property
    def requires(self) -> list[str]:
        return ["research"]

    def run(self, workflow_id: str) -> dict:
        import time
        start = time.time()

        qual = self.memory.get_agent_result(workflow_id, "qualification")
        research = self.memory.get_agent_result(workflow_id, "research")

        top_lead = qual.get("top_lead") if qual else None
        if not top_lead:
            # Try first company from research if qualification skipped
            companies = research.get("companies", []) if research else []
            if not companies:
                return {"error": "No companies found", "persona": None}
            top_company = companies[0]
        else:
            top_company = top_lead.get("company") or {}

        company_name = top_company.get("company_name", "")
        industry = top_company.get("industry", "")

        # Try Gemini first
        if is_llm_available():
            prompt = f"""Company: {company_name}
Industry: {industry}
Employees: {top_company.get('employees', 0)}
Funding Stage: {top_company.get('funding_stage', '')}
Cloud Platform: {top_company.get('cloud_platform', '')}
Growth Signal: {top_company.get('growth_signal', '')}

Who is the ideal B2B SaaS decision maker to contact at this company?"""
            try:
                response = call_llm(prompt, PERSONA_SYSTEM_PROMPT)
                persona_data = extract_json_from_response(response)
            except Exception:
                persona_data = {}
        else:
            persona_data = {}

        # Standardize/Sanitize/Fallback keys
        fallback = map_persona(company_name, industry)
        if not isinstance(persona_data, dict):
            persona_data = {}

        persona_data = {
            "role": persona_data.get("role") or fallback.get("role") or "Chief Technology Officer",
            "role_short": persona_data.get("role_short") or persona_data.get("role") or "CTO",
            "seniority": persona_data.get("seniority") or fallback.get("seniority") or "C-Suite",
            "confidence": persona_data.get("confidence") or fallback.get("confidence") or "High",
            "reasoning": persona_data.get("reasoning") or persona_data.get("reason") or fallback.get("reason") or "Standard industry mapping",
            "alternative_role": persona_data.get("alternative_role") or "VP of Engineering",
            "department": persona_data.get("department") or "Engineering"
        }

        elapsed = round(time.time() - start, 2)

        return {
            "company_name": company_name,
            "industry": industry,
            "lead_score": top_lead.get("lead_score", 0) if top_lead else 0,
            "tier": top_lead.get("tier", "Unknown") if top_lead else "Unknown",
            "persona": persona_data,
            "elapsed_seconds": elapsed,
            "memory_read": ["agent_results.qualification", "agent_results.research"],
            "memory_write": ["agent_results.persona"]
        }
