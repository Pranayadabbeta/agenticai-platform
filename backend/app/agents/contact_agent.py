from app.core.agent_registry import AgentBase
import os, time, requests, hashlib

HUNTER_API_KEY = os.getenv("HUNTER_API_KEY", "")

class ContactAgent(AgentBase):

    @property
    def name(self): return "contact"
    @property
    def description(self): return "Finds real contact details via Hunter.io, falls back to pattern generation"
    @property
    def capabilities(self): return ["get email","find email","contact details","email address","linkedin","outreach"]
    @property
    def requires(self): return ["research","persona"]

    def _hunter_find_email(self, domain: str, role: str) -> dict:
        """
        Try Hunter.io domain search to find real emails at this company.
        Uses /domain-search endpoint which searches all emails at a domain.
        Free tier: 25 searches/month.
        """
        if not HUNTER_API_KEY or not domain:
            return {}
        try:
            url = "https://api.hunter.io/v2/domain-search"
            params = {
                "domain": domain,
                "api_key": HUNTER_API_KEY,
                "limit": 5,
                "type": "personal"
            }
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                emails = data.get("data", {}).get("emails", [])
                if emails:
                    # Find the most senior person matching the role
                    role_keywords = {
                        "CTO": ["cto","technology","technical","engineering"],
                        "CIO": ["cio","information","it director"],
                        "CEO": ["ceo","chief executive","founder"],
                        "VP Engineering": ["engineering","vp","vice president"],
                        "HR Director": ["hr","human resources","people","talent"],
                        "Operations Head": ["operations","ops","coo"],
                    }
                    keywords = role_keywords.get(role, ["cto","engineering"])

                    # First try to match by role keywords
                    for email_data in emails:
                        position = email_data.get("position","").lower()
                        if any(k in position for k in keywords):
                            return {
                                "email": email_data.get("value",""),
                                "first_name": email_data.get("first_name",""),
                                "last_name": email_data.get("last_name",""),
                                "position": email_data.get("position",""),
                                "linkedin": email_data.get("linkedin",""),
                                "verified": email_data.get("confidence",0) > 70,
                                "confidence": email_data.get("confidence",0),
                                "source": "hunter.io"
                            }
                    # If no role match, return most confident email
                    best = max(emails, key=lambda x: x.get("confidence",0))
                    return {
                        "email": best.get("value",""),
                        "first_name": best.get("first_name",""),
                        "last_name": best.get("last_name",""),
                        "position": best.get("position",""),
                        "linkedin": best.get("linkedin",""),
                        "verified": best.get("confidence",0) > 70,
                        "confidence": best.get("confidence",0),
                        "source": "hunter.io"
                    }
            return {}
        except Exception as e:
            print(f"Hunter.io error: {e}")
            return {}

    def _hunter_email_finder(self, domain: str, first_name: str, last_name: str) -> dict:
        """
        Try Hunter.io email finder if we have a name.
        """
        if not HUNTER_API_KEY or not domain or not first_name:
            return {}
        try:
            url = "https://api.hunter.io/v2/email-finder"
            params = {
                "domain": domain,
                "first_name": first_name,
                "last_name": last_name,
                "api_key": HUNTER_API_KEY
            }
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 200:
                data = resp.json().get("data", {})
                if data.get("email"):
                    return {
                        "email": data["email"],
                        "verified": data.get("score",0) > 70,
                        "confidence": data.get("score",0),
                        "source": "hunter.io email-finder"
                    }
            return {}
        except Exception as e:
            print(f"Hunter email-finder error: {e}")
            return {}

    def _generate_fallback_contact(self, company_name: str, domain: str, role: str) -> dict:
        """
        Deterministic generated contact when Hunter.io is unavailable or has no results.
        Same inputs always produce same outputs.
        """
        role_prefix = {
            "CTO": "cto", "Chief Technology Officer": "cto",
            "CIO": "cio", "Chief Information Officer": "cio",
            "CEO": "ceo", "VP Engineering": "vp.engineering",
            "HR Director": "hr", "Operations Head": "operations",
        }
        prefix = role_prefix.get(role, "contact")
        email = f"{prefix}@{domain}" if domain else f"{prefix}@{company_name.lower().replace(' ','')}.com"

        h = int(hashlib.md5(company_name.encode()).hexdigest()[:4], 16)
        phone = f"+1-{415 + h % 85}-555-{str(h % 9000 + 1000)}"

        company_slug = company_name.lower().replace(" ","-")
        role_slug = role.lower().replace(" ","-")
        linkedin = f"linkedin.com/in/{company_slug}-{role_slug}"

        return {
            "email": email,
            "phone": phone,
            "linkedin_url": linkedin,
            "verified": False,
            "confidence": 0,
            "source": "generated_pattern",
            "note": "Pattern generated — not verified. Add Hunter.io API key for real contacts."
        }

    def run(self, workflow_id: str) -> dict:
        start = time.time()

        persona_result = self.memory.get_agent_result(workflow_id, "persona")
        research_result = self.memory.get_agent_result(workflow_id, "research")

        if not persona_result or not persona_result.get("persona"):
            return {"error": "Persona agent must run first", "contact": None,
                    "elapsed_seconds": 0}

        company_name = persona_result.get("company_name","")
        persona = persona_result.get("persona") or {}
        role = persona.get("role_short") or persona.get("role") or "CTO"

        # Get domain from research
        domain = ""
        if research_result:
            for c in research_result.get("companies",[]):
                if c.get("company_name","").lower() == company_name.lower():
                    domain = c.get("domain","")
                    break
        if not domain and company_name:
            domain = company_name.lower().replace(" ","").replace(".","") + ".com"

        # Try Hunter.io first (real data)
        contact_data = {}
        if HUNTER_API_KEY:
            contact_data = self._hunter_find_email(domain, role)

        # Fall back to generated if Hunter found nothing
        if not contact_data.get("email"):
            contact_data = self._generate_fallback_contact(company_name, domain, role)

        # Build linkedin URL if Hunter didn't return one
        if not contact_data.get("linkedin_url"):
            contact_data["linkedin_url"] = contact_data.get("linkedin") or \
                f"linkedin.com/in/{company_name.lower().replace(' ','-')}-{role.lower().replace(' ','-')}"

        # Build phone if not returned
        if not contact_data.get("phone"):
            h = int(hashlib.md5(company_name.encode()).hexdigest()[:4], 16)
            contact_data["phone"] = f"+1-{415 + h % 85}-555-{str(h % 9000 + 1000)}"

        elapsed = round(time.time() - start, 2)
        return {
            "company_name": company_name,
            "role": persona.get("role",""),
            "role_short": role,
            "domain": domain,
            **contact_data,
            "elapsed_seconds": elapsed,
            "memory_read": ["agent_results.persona","agent_results.research"],
            "memory_write": ["agent_results.contact"]
        }
