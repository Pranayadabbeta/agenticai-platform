import sys
import os

# Add parent directory of 'data' to the Python path to allow app imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import SessionLocal, Company, init_db

def seed():
    # Call init_db() first to create tables
    init_db()

    session = SessionLocal()
    try:
        # Clear the table completely
        session.query(Company).delete()
        session.commit()

        companies_to_seed = [
            Company(
                company_name="ScaleAI",
                industry="AI",
                employees=500,
                funding_stage="Series F",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=45,
                growth_signal="Federal AI contracts expansion 2024",
                domain="scale.ai"
            ),
            Company(
                company_name="Anthropic",
                industry="AI",
                employees=400,
                funding_stage="Series C",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=60,
                growth_signal="Claude 3.5 Sonnet launch 2024",
                domain="anthropic.com"
            ),
            Company(
                company_name="Perplexity AI",
                industry="AI",
                employees=100,
                funding_stage="Series B",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=25,
                growth_signal="Surpassed 100M users 2024",
                domain="perplexity.ai"
            ),
            Company(
                company_name="Cohere",
                industry="AI",
                employees=300,
                funding_stage="Series C",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=40,
                growth_signal="Enterprise NLP platform growth",
                domain="cohere.com"
            ),
            Company(
                company_name="Together AI",
                industry="AI",
                employees=80,
                funding_stage="Series A",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=20,
                growth_signal="Open source inference platform launch",
                domain="together.ai"
            ),
            Company(
                company_name="Hugging Face",
                industry="AI",
                employees=250,
                funding_stage="Series C",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=35,
                growth_signal="Enterprise hub 50000 organizations",
                domain="huggingface.co"
            ),
            Company(
                company_name="Stability AI",
                industry="AI",
                employees=120,
                funding_stage="Series A",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=15,
                growth_signal="Image generation enterprise licensing",
                domain="stability.ai"
            ),
            Company(
                company_name="Runway ML",
                industry="AI",
                employees=90,
                funding_stage="Series C",
                cloud_platform="GCP",
                region="USA",
                hiring_roles=18,
                growth_signal="Gen-2 video model viral growth",
                domain="runwayml.com"
            ),
            Company(
                company_name="Character AI",
                industry="AI",
                employees=200,
                funding_stage="Series B",
                cloud_platform="GCP",
                region="USA",
                hiring_roles=30,
                growth_signal="1B+ conversations daily 2024",
                domain="character.ai"
            ),
            Company(
                company_name="Adept AI",
                industry="AI",
                employees=100,
                funding_stage="Series B",
                cloud_platform="GCP",
                region="USA",
                hiring_roles=22,
                growth_signal="Multimodal AI agent platform",
                domain="adept.ai"
            ),
            Company(
                company_name="Mistral AI",
                industry="AI",
                employees=150,
                funding_stage="Series A",
                cloud_platform="GCP",
                region="Europe",
                hiring_roles=30,
                growth_signal="Open source model releases 2024",
                domain="mistral.ai"
            ),
            Company(
                company_name="Aleph Alpha",
                industry="AI",
                employees=100,
                funding_stage="Series B",
                cloud_platform="Azure",
                region="Europe",
                hiring_roles=20,
                growth_signal="European sovereign AI platform",
                domain="aleph-alpha.com"
            ),
            Company(
                company_name="Notion",
                industry="SaaS",
                employees=600,
                funding_stage="Series C",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=28,
                growth_signal="AI feature rollout 2024",
                domain="notion.so"
            ),
            Company(
                company_name="Figma",
                industry="SaaS",
                employees=1200,
                funding_stage="Public",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=15,
                growth_signal="Design platform post-Adobe 2024",
                domain="figma.com"
            ),
            Company(
                company_name="Postman",
                industry="SaaS",
                employees=800,
                funding_stage="Series D",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=22,
                growth_signal="API platform 30M developers",
                domain="postman.com"
            ),
            Company(
                company_name="BrowserStack",
                industry="SaaS",
                employees=1000,
                funding_stage="Series B",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=18,
                growth_signal="Testing platform global expansion",
                domain="browserstack.com"
            ),
            Company(
                company_name="Freshworks",
                industry="SaaS",
                employees=5000,
                funding_stage="Public",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=10,
                growth_signal="CRM AI features launch 2024",
                domain="freshworks.com"
            ),
            Company(
                company_name="Vercel",
                industry="SaaS",
                employees=400,
                funding_stage="Series D",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=32,
                growth_signal="Next.js 14 AI features adoption",
                domain="vercel.com"
            ),
            Company(
                company_name="Linear",
                industry="SaaS",
                employees=80,
                funding_stage="Series B",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=15,
                growth_signal="Project management tool 2024",
                domain="linear.app"
            ),
            Company(
                company_name="Retool",
                industry="SaaS",
                employees=300,
                funding_stage="Series C",
                cloud_platform="AWS",
                region="USA",
                hiring_roles=25,
                growth_signal="Internal tools platform growth",
                domain="retool.com"
            ),
        ]

        session.add_all(companies_to_seed)
        session.commit()
        print(f"Seeded {len(companies_to_seed)} companies")
    except Exception as e:
        session.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    seed()
