from app.core.agent_registry import AgentBase
from app.core.memory_manager import MemoryManager
from app.tools.llm import call_llm, is_llm_available, extract_json_from_response
import json

SUMMARY_SYSTEM_PROMPT = """You are a B2B sales intelligence analyst at a top consulting firm.
Synthesize the provided intelligence data into a final recommendation for a sales team.
Be specific. Reference actual data points. Never be generic.
For "sources_used", inspect the RESEARCH AGENT OUTPUT. If its "source_used" is "tavily_gemini", output "Tavily live search + Gemini extraction". If its "source_used" is "sqlite_fallback", output "SQLite offline company database".
Return ONLY valid JSON, no other text:

{
  "priority_target": "<exact company name>",
  "recommendation_strength": "<one of: Strong Buy, Buy, Hold, Pass>",
  "confidence": <integer 0-100>,
  "executive_summary": "<2-3 sentence summary a VP of Sales would appreciate>",
  "evidence": [
    "<specific data point 1 with numbers>",
    "<specific data point 2 with numbers>",
    "<specific data point 3 with numbers>"
  ],
  "risk_factors": ["<potential concern 1>", "<potential concern 2>"],
  "persona": {"role": "<role>", "seniority": "<seniority>", "confidence": "<High/Medium/Low>"},
  "contact": {"email": "<email>", "linkedin_url": "<url>"},
  "next_action": "<specific, actionable first step with timeline>",
  "icp_match_score": <integer 0-100>,
  "sources_used": ["Tavily live search + Gemini extraction or SQLite offline company database", "Qualification scoring engine", "Persona mapping"]
}"""

class SummaryAgent(AgentBase):

    @property
    def name(self) -> str:
        return "summary"

    @property
    def description(self) -> str:
        return "Synthesizes all agent results into a final executive recommendation"

    @property
    def capabilities(self) -> list[str]:
        return ["summarize", "recommend", "analyze", "synthesis",
                "final report", "recommendation", "next steps", "insights"]

    @property
    def requires(self) -> list[str]:
        return ["research"]

    def _build_context(self, workflow_id: str) -> str:
        parts = []
        for agent in ["research", "qualification", "persona", "contact"]:
            result = self.memory.get_agent_result(workflow_id, agent)
            if result:
                parts.append(f"=== {agent.upper()} AGENT OUTPUT ===\n{json.dumps(result, indent=2)}")
        return "\n\n".join(parts)

    def _fallback_summary(self, workflow_id: str) -> dict:
        qual = self.memory.get_agent_result(workflow_id, "qualification")
        persona = self.memory.get_agent_result(workflow_id, "persona")
        contact = self.memory.get_agent_result(workflow_id, "contact")
        research = self.memory.get_agent_result(workflow_id, "research")

        top_lead = qual.get("top_lead") if qual else None
        if not top_lead:
            companies = research.get("companies", []) if research else []
            company_name = companies[0].get("company_name", "Unknown") if companies else "Unknown"
            score = 0
            evidence = ["Research completed"]
            tier = "Unknown"
        else:
            company_name = top_lead.get("company_name", "Unknown")
            score = top_lead.get("lead_score", 0)
            evidence = top_lead.get("evidence", [])
            tier = top_lead.get("tier", "Unknown")

        persona_data = persona.get("persona") if (persona and persona.get("persona")) else {"role": "CTO", "seniority": "C-Suite"}
        contact_data = {"email": (contact.get("email") or ""), "linkedin_url": (contact.get("linkedin_url") or "")} if contact else {}

        strength = "Strong Buy" if score >= 80 else "Buy" if score >= 60 else "Hold" if score >= 40 else "Pass"

        research_source = "SQLite company database"
        if research:
            if research.get("source_used") == "tavily_gemini":
                research_source = "Tavily live search + Gemini extraction"
            elif research.get("source_used") == "sqlite_fallback":
                research_source = "SQLite offline company database"

        return {
            "priority_target": company_name,
            "recommendation_strength": strength,
            "confidence": score,
            "executive_summary": f"{company_name} is a {tier} prospect with an ICP match score of {score}/100. {('Immediate outreach recommended.' if score >= 70 else 'Monitor for future engagement.')}",
            "evidence": evidence[:5],
            "risk_factors": ["Contact details unverified", "Market timing uncertain"],
            "persona": persona_data,
            "contact": contact_data,
            "next_action": f"Send personalized email to {persona_data.get('role','CTO')} at {company_name} within 48 hours",
            "icp_match_score": score,
            "sources_used": [research_source, "Qualification scoring engine"]
        }

    def run(self, workflow_id: str) -> dict:
        import time
        start = time.time()
        context = self._build_context(workflow_id)

        if is_llm_available() and context:
            try:
                response = call_llm(
                    f"Analyze this B2B prospect intelligence and generate recommendation:\n\n{context}",
                    SUMMARY_SYSTEM_PROMPT
                )
                result = extract_json_from_response(response)
            except Exception:
                result = self._fallback_summary(workflow_id)
        else:
            result = self._fallback_summary(workflow_id)

        elapsed = round(time.time() - start, 2)
        result["elapsed_seconds"] = elapsed
        result["memory_read"] = ["agent_results.research", "agent_results.qualification",
                                  "agent_results.persona", "agent_results.contact"]
        result["memory_write"] = ["agent_results.summary"]
        return result
