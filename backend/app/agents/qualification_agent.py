from app.core.agent_registry import AgentBase
from app.core.memory_manager import MemoryManager

SCORING_CONFIG = {
    "funding": {
        "weight": 30,
        "tiers": {
            "high": {"stages": ["Series C","Series D","Series F","Public"], "points": 30},
            "mid":  {"stages": ["Series B"], "points": 20},
            "low":  {"stages": ["Series A","Seed"], "points": 10}
        }
    },
    "hiring": {
        "weight": 20,
        "tiers": {
            "high": {"min_roles": 20, "points": 20},
            "mid":  {"min_roles": 10, "points": 10},
            "low":  {"min_roles": 1,  "points": 5}
        }
    },
    "cloud": {
        "weight": 20,
        "target_platforms": ["AWS", "GCP"],
        "points": 20
    },
    "employees": {
        "weight": 15,
        "sweet_spot": {"min": 50, "max": 1000, "points": 15},
        "close_range": {"min": 10, "max": 5000, "points": 8}
    },
    "region": {
        "weight": 10,
        "target": "USA",
        "points": 10
    },
    "growth": {
        "weight": 5,
        "points": 5
    }
}

TIER_CONFIG = {
    "Strategic": 80,
    "Qualified": 60,
    "Nurture": 40,
    "Disqualified": 0
}

class QualificationAgent(AgentBase):

    @property
    def name(self) -> str:
        return "qualification"

    @property
    def description(self) -> str:
        return "Scores companies 0-100 using deterministic weighted Python model with rich evidence"

    @property
    def capabilities(self) -> list[str]:
        return ["score companies", "rank companies", "qualify leads",
                "icp scoring", "lead scoring", "filter companies"]

    @property
    def requires(self) -> list[str]:
        return ["research"]

    def _score_company(self, company: dict) -> dict:
        score = 0
        evidence = []
        rationale = []

        # Funding
        stage = company.get("funding_stage","")
        for tier_name, tier in SCORING_CONFIG["funding"]["tiers"].items():
            if stage in tier["stages"]:
                score += tier["points"]
                evidence.append(f"Funding: {stage} (+{tier['points']} pts)")
                rationale.append(f"{stage} funding stage — strong budget indicator")
                break

        # Hiring
        roles = company.get("hiring_roles", 0) or 0
        for tier_name, tier in SCORING_CONFIG["hiring"]["tiers"].items():
            if roles >= tier["min_roles"]:
                score += tier["points"]
                evidence.append(f"Hiring: {roles} open roles (+{tier['points']} pts)")
                rationale.append(f"Active hiring ({roles} roles) signals growth")
                break

        # Cloud
        cloud = company.get("cloud_platform","")
        if cloud in SCORING_CONFIG["cloud"]["target_platforms"]:
            pts = SCORING_CONFIG["cloud"]["points"]
            score += pts
            evidence.append(f"Cloud: {cloud} (+{pts} pts)")
            rationale.append(f"Uses {cloud} — integration opportunity")

        # Employees
        emp = company.get("employees", 0) or 0
        sp = SCORING_CONFIG["employees"]["sweet_spot"]
        cr = SCORING_CONFIG["employees"]["close_range"]
        if sp["min"] <= emp <= sp["max"]:
            score += sp["points"]
            evidence.append(f"Size: {emp} employees (+{sp['points']} pts)")
            rationale.append(f"{emp} employees — ideal company size")
        elif cr["min"] <= emp <= cr["max"]:
            score += cr["points"]
            evidence.append(f"Size: {emp} employees (+{cr['points']} pts)")

        # Region
        if company.get("region") == SCORING_CONFIG["region"]["target"]:
            pts = SCORING_CONFIG["region"]["points"]
            score += pts
            evidence.append(f"Region: USA (+{pts} pts)")
            rationale.append("USA region — primary sales territory")

        # Growth signal
        gs = company.get("growth_signal","")
        if isinstance(gs, str) and gs.strip():
            pts = SCORING_CONFIG["growth"]["points"]
            score += pts
            evidence.append(f"Growth signal detected (+{pts} pts)")
            rationale.append(gs)

        # Determine tier
        tier = "Disqualified"
        for tier_name, min_score in sorted(TIER_CONFIG.items(), key=lambda x: -x[1]):
            if score >= min_score:
                tier = tier_name
                break

        return {
            "company_name": company.get("company_name", "Unknown"),
            "company": company,
            "lead_score": min(score, 100),
            "tier": tier,
            "evidence": evidence,
            "rationale": rationale,
            "score_breakdown": {
                "funding": next((int(e.split("+")[1].split(" ")[0]) for e in evidence if "Funding" in e), 0),
                "hiring": next((int(e.split("+")[1].split(" ")[0]) for e in evidence if "Hiring" in e), 0),
                "cloud": next((int(e.split("+")[1].split(" ")[0]) for e in evidence if "Cloud" in e), 0),
                "employees": next((int(e.split("+")[1].split(" ")[0]) for e in evidence if "Size" in e), 0),
                "region": next((int(e.split("+")[1].split(" ")[0]) for e in evidence if "Region" in e), 0),
                "growth": next((int(e.split("+")[1].split(" ")[0]) for e in evidence if "Growth" in e), 0),
            }
        }

    def run(self, workflow_id: str) -> dict:
        import time
        start = time.time()
        research = self.memory.get_agent_result(workflow_id, "research")
        companies = research.get("companies", []) if research else []
        scored = [self._score_company(c) for c in companies]
        scored.sort(key=lambda x: x["lead_score"], reverse=True)
        elapsed = round(time.time() - start, 2)
        return {
            "leads_scored": len(scored),
            "top_lead": scored[0] if scored else None,
            "qualified_leads": [l for l in scored if l["tier"] in ["Strategic","Qualified"]],
            "all_leads": scored,
            "elapsed_seconds": elapsed,
            "memory_read": ["agent_results.research"],
            "memory_write": ["agent_results.qualification"]
        }
