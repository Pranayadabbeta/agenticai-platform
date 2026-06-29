# AgentOS — Agentic AI Platform for B2B Prospect Intelligence
**XLVentures Agentic AI Platform Hackathon 2026**

# Team Details
| Member                    | Role     |
| ------------------------- | -------- |
| Pranaya Dabbeta           | Member 1 |
| Badrinath Reddy Nandaluri | Member 2 |
| Sahithi Reddy Kotla       | Member 3 |

**Team Name:** AgentOS
**Institution:** VNR Vignana Jyothi Institute of Engineering & Technology
**Technology Stack:** React • FastAPI • Python • Gemini • Hunter.io API • SQLite

# Project Overview

AgentOS is an extensible multi-agent platform that automates B2B prospect intelligence by transforming high-level business objectives into coordinated execution plans.
Instead of relying on predefined workflows, AgentOS employs a **Planner Agent** that dynamically composes an execution strategy by discovering registered specialized agents at runtime. Each agent performs an isolated responsibility while communicating exclusively through a shared typed memory layer, enabling modularity, scalability, and low coupling.
The platform accelerates sales research by automatically gathering company intelligence, qualifying leads, identifying buyer personas, discovering verified business contacts, and generating executive-ready prospect summaries—all while enforcing mandatory human approval before any downstream action.

# Architecture Highlights

* Dynamic workflow generation using a Planner Agent
* Runtime discovery of registered agents (no hardcoded workflows)
* Five specialized agents:
  * Research Agent
  * Qualification Agent
  * Persona Agent
  * Contact Agent
  * Summary Agent
* Shared typed Memory Manager enabling decoupled communication
* Human-in-the-Loop (HITL) approval integrated into the workflow engine
* Open-Closed architecture allowing new agents to be added without modifying existing orchestration logic
* Event-driven workflow execution designed for future Celery/Redis scaling


# Key Features

* Dynamic multi-agent orchestration
* Live company research and enrichment
* AI-driven lead qualification
* Buyer persona generation
* Business contact discovery using Hunter.io
* Executive summary generation
* Human approval before workflow completion
* Modular architecture for future agent expansion


# Repository

https://github.com/Pranayadabbeta/agenticai-platform

# Setup Instructions
## Prerequisites

* Node.js 18+
* Python 3.10+
* Gemini API Key
* Travily API Key
* Hunter.io API Key

## Clone Repository

```bash
git clone https://github.com/Pranayadabbeta/agenticai-platform.git
cd agenticai-platform
```

## Backend Setup

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload
```

Create a `.env` file inside the `backend` directory:

```env
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_travily_api_key
HUNTER_API_KEY=your_hunter_api_key
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

# System Workflow

1. User submits prospect research objective.
2. Planner Agent dynamically selects required specialized agents.
3. Research Agent gathers company intelligence.
4. Qualification Agent evaluates prospect quality.
5. Persona Agent identifies relevant stakeholders.
6. Contact Agent discovers verified business contacts.
7. Summary Agent prepares an executive-ready report.
8. Workflow pauses for Human-in-the-Loop approval.
9. Approved results are delivered to the user.

---

# Project Architecture

Presentation Layer
↓
API Layer
↓
Planner Agent
↓
Workflow Orchestration
↓
Specialized Agents
↓
Memory Manager
↓
Data Sources
↓
Persistence Layer
↓
LLM Services

# Future Enhancements

* Role-based access control
* Multi-tenant memory isolation
* Planner validation and consistency checks
* CRM integrations (HubSpot, Salesforce)
* Email automation workflows
* Redis + Celery distributed execution
* Additional plug-and-play specialized agents

---

# Notes

* Environment files (`.env`) are intentionally excluded from the repository for security.
* Install project dependencies before running the application.
* The repository includes only source code; generated files and dependency folders (`node_modules`, virtual environments, caches) are excluded.
