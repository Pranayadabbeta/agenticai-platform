PERSONA_MAP = {
    "AI": {
        "role": "CTO",
        "seniority": "C-Suite",
        "confidence": "High",
        "reason": "AI adoption decisions owned by CTO in AI-native companies"
    },
    "SaaS": {
        "role": "CTO",
        "seniority": "C-Suite",
        "confidence": "High",
        "reason": "SaaS technical decisions driven by engineering leadership"
    },
    "Healthcare": {
        "role": "CIO",
        "seniority": "C-Suite",
        "confidence": "High",
        "reason": "Healthcare IT procurement owned by CIO"
    },
    "Staffing": {
        "role": "HR Director",
        "seniority": "Director",
        "confidence": "High",
        "reason": "HR tech decisions owned by HR leadership"
    },
    "Manufacturing": {
        "role": "Operations Head",
        "seniority": "VP",
        "confidence": "Medium",
        "reason": "Ops automation owned by Operations leadership"
    },
    "Fintech": {
        "role": "CTO",
        "seniority": "C-Suite",
        "confidence": "High",
        "reason": "Fintech engineering decisions driven by CTO"
    },
    "Edtech": {
        "role": "CTO",
        "seniority": "C-Suite",
        "confidence": "Medium",
        "reason": "Product and tech decisions owned by CTO"
    },
    "Default": {
        "role": "CTO",
        "seniority": "C-Suite",
        "confidence": "Low",
        "reason": "Defaulted to CTO — industry mapping not found"
    }
}

def map_persona(company_name: str, industry: str) -> dict:
    """
    Look up industry in PERSONA_MAP.
    If not found, use "Default".
    Return dict: {company_name, role, seniority, confidence, reason}
    """
    mapped = PERSONA_MAP.get(industry, PERSONA_MAP["Default"])
    return {
        "company_name": company_name,
        "role": mapped["role"],
        "seniority": mapped["seniority"],
        "confidence": mapped["confidence"],
        "reason": mapped["reason"]
    }

def get_supported_industries() -> list[str]:
    """Return all industries in PERSONA_MAP except Default."""
    return [ind for ind in PERSONA_MAP.keys() if ind != "Default"]
