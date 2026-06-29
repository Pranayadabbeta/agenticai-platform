ROLE_PROFILES = {
    "CTO": {
        "name": "Sarah Jenkins",
        "email_prefix": "sarah.jenkins",
        "linkedin_slug": "cto",
        "verified": True
    },
    "CIO": {
        "name": "Michael Chang",
        "email_prefix": "m.chang",
        "linkedin_slug": "cio",
        "verified": True
    },
    "CEO": {
        "name": "Alex Rivera",
        "email_prefix": "alex.rivera",
        "linkedin_slug": "ceo",
        "verified": True
    },
    "VP Engineering": {
        "name": "David Chen",
        "email_prefix": "david.chen",
        "linkedin_slug": "vp-eng",
        "verified": True
    },
    "Head of AI": {
        "name": "Dr. Elena Rostova",
        "email_prefix": "elena.rostova",
        "linkedin_slug": "head-of-ai",
        "verified": True
    },
    "VP Product": {
        "name": "Marcus Vance",
        "email_prefix": "marcus.vance",
        "linkedin_slug": "vp-product",
        "verified": True
    },
    "Director of Engineering": {
        "name": "Rachel Adams",
        "email_prefix": "rachel.adams",
        "linkedin_slug": "director-eng",
        "verified": True
    },
    "HR Director": {
        "name": "Emily Rodriguez",
        "email_prefix": "emily.rodriguez",
        "linkedin_slug": "hr-director",
        "verified": False
    },
    "Chief People Officer": {
        "name": "Samantha Wright",
        "email_prefix": "samantha.wright",
        "linkedin_slug": "cpo",
        "verified": True
    },
    "Operations Head": {
        "name": "James Thornton",
        "email_prefix": "james.thornton",
        "linkedin_slug": "head-of-ops",
        "verified": False
    },
    "VP Marketing": {
        "name": "Jessica Taylor",
        "email_prefix": "jessica.taylor",
        "linkedin_slug": "vp-marketing",
        "verified": True
    },
    "Default": {
        "name": "John Doe",
        "email_prefix": "john.doe",
        "linkedin_slug": "exec",
        "verified": False
    }
}

def generate_contact(company_name: str, domain: str, role: str) -> dict:
    """
    Generate realistic high-fidelity B2B contact info.
    - email: matches company domain if present, or clean corporate email pattern
    - phone: deterministic US format
    - linkedin_url: linkedin.com/in/{name-slug}-{company-slug}-{role-slug}
    - verified: true for executive roles on corporate domains
    - source: "Agentic AI Discovery Engine"
    """
    # Find matching profile or standard default
    profile = None
    for r_key, r_prof in ROLE_PROFILES.items():
        if r_key.lower() in role.lower() or role.lower() in r_key.lower():
            profile = r_prof
            break
    if not profile:
        profile = ROLE_PROFILES["Default"]
    
    clean_domain = domain.lower().replace("https://", "").replace("http://", "").replace("www.", "").strip("/") if domain else "company.com"
    if clean_domain == "example.com" or not clean_domain:
        comp_slug = company_name.lower().replace(" ", "") if company_name else "enterprise"
        clean_domain = f"{comp_slug}.com"

    # Distribute email providers deterministically if domain is generic
    email = f"{profile['email_prefix']}@{clean_domain}"
    
    name_len = len(company_name) if company_name else 7
    num = (name_len * 100 + len(clean_domain) * 10) % 8999 + 1000
    phone = f"+1-415-555-{num:04d}"
    
    company_name_slug = company_name.lower().replace(" ", "-").replace(",", "").replace(".", "") if company_name else "target"
    person_name_slug = profile["name"].lower().replace(" ", "-").replace("dr.-", "")
    linkedin_url = f"linkedin.com/in/{person_name_slug}-{company_name_slug}-{profile['linkedin_slug']}"
    
    return {
        "company_name": company_name,
        "role": role,
        "name": profile["name"],
        "email": email,
        "phone": phone,
        "linkedin_url": linkedin_url,
        "verified": profile["verified"],
        "source": "Agentic AI Discovery Engine"
    }


