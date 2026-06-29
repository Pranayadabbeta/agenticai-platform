from dotenv import load_dotenv
load_dotenv(override=True)

import os, time, json
from app.core.agent_registry import AgentBase

def log_debug(msg: str):
    print(msg)
    try:
        # Write to a file in the backend directory
        log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "server_debug.log")
        with open(log_path, "a") as f:
            f.write(f"[ResearchAgent] {msg}\n")
    except Exception as e:
        print(f"Failed to write to server_debug.log: {e}")

class ResearchAgent(AgentBase):

    @property
    def name(self): return "research"
    @property  
    def description(self): return "Finds real companies via Tavily live search + Gemini extraction"
    @property
    def capabilities(self): return ["find companies","discover companies","search companies","company lookup"]
    @property
    def requires(self): return []

    def _run_tavily_search(self, query: str, max_results: int = 8) -> list:
        tavily_key = os.getenv("TAVILY_API_KEY", "")
        if not tavily_key:
            log_debug("WARNING: TAVILY_API_KEY not set")
            return []
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=tavily_key)
            log_debug(f"Tavily searching: {query}")
            # NO include_domains restriction — search the full web
            resp = client.search(
                query=query,
                search_depth="basic",
                max_results=max_results
            )
            results = resp.get("results", [])
            log_debug(f"Tavily returned {len(results)} results for: {query[:50]}")
            return results
        except Exception as e:
            log_debug(f"Tavily error: {e}")
            return []

    def _extract_with_gemini(self, search_results: list, icp: dict, goal: str) -> list:
        if not search_results:
            return []
        
        from app.tools.llm import call_llm, extract_json_from_response, is_llm_available
        
        if not is_llm_available():
            log_debug("Gemini not available for extraction")
            return []

        # Build text from all search results
        text_blob = ""
        for i, r in enumerate(search_results[:8]):
            text_blob += f"\n---SOURCE {i+1}---\n"
            text_blob += f"Title: {r.get('title','')}\n"
            text_blob += f"URL: {r.get('url','')}\n"
            text_blob += f"Content: {r.get('content','')[:500]}\n"

        industry = icp.get("industry","AI")
        region = icp.get("region","USA")

        prompt = f"""From the search results below, extract REAL company names.

User is looking for: {goal}
Target industry: {industry}
Target region: {region}

SEARCH RESULTS:
{text_blob}

Extract every real company name you can find in these results.
Only include real companies actually mentioned in the text above.
Do NOT invent any company. Do NOT include companies not in the text.

Return a JSON array. Each object must be:
{{
  "company_name": "exact name as written in source",
  "industry": "best guess: AI or SaaS or Healthcare or Fintech or Other",
  "employees": 0,
  "funding_stage": "funding stage if mentioned, else Unknown",
  "cloud_platform": "AWS or GCP or Azure or Unknown",
  "region": "{region}",
  "hiring_roles": 0,
  "growth_signal": "one fact about this company from the source text",
  "domain": "company domain if mentioned else empty string",
  "source_url": "the URL where this company was found"
}}

Return ONLY the JSON array. No explanation. No markdown. Just the raw JSON array starting with ["""

        try:
            response = call_llm(prompt, "You extract company data from text. Return only a valid JSON array starting with [. No other text.")
            log_debug(f"Gemini extraction response length: {len(response)}")
            
            # Try to extract JSON array
            text = response.strip()
            if not text.startswith("["):
                # Find the array
                start = text.find("[")
                end = text.rfind("]") + 1
                if start >= 0 and end > start:
                    text = text[start:end]
                else:
                    log_debug(f"Could not find JSON array in Gemini response: {text[:200]}")
                    return []
            
            companies = json.loads(text)
            if not isinstance(companies, list):
                log_debug("Gemini returned non-list")
                return []
            
            # Filter out fake/bad entries
            valid = []
            seen = set()
            bad_names = {"example","test","sample","acme","foo","bar","lorem","company","startup","unnamed","unknown"}
            for c in companies:
                name = c.get("company_name","").strip()
                if (name and 
                    len(name) > 2 and 
                    name.lower() not in seen and
                    not any(bad in name.lower() for bad in bad_names)):
                    seen.add(name.lower())
                    valid.append(c)
            
            log_debug(f"Gemini extracted {len(valid)} valid companies")
            return valid[:20]
            
        except json.JSONDecodeError as e:
            log_debug(f"JSON parse error in Gemini extraction: {e}")
            log_debug(f"Response was: {response[:300]}")
            return []
        except Exception as e:
            log_debug(f"Gemini extraction exception: {e}")
            return []

    def _build_queries(self, goal: str, icp: dict) -> list:
        industry = icp.get("industry","AI")
        region = icp.get("region","USA")
        funding = icp.get("funding_stage","Series A")

        queries = []
        
        # Query 1: Based on user goal directly
        if goal and len(goal.strip()) > 8:
            queries.append(f"{goal} companies list 2024")
        
        # Query 2: ICP-based broad search
        queries.append(f"top {industry} startups {region} 2024 {funding} funded list")
        
        # Query 3: Crunchbase/Techcrunch style
        queries.append(f"best {industry} companies {region} {funding} investment 2024 techcrunch")

        return queries

    def run(self, workflow_id: str) -> dict:
        start = time.time()
        
        # Dynamically load env on each run
        load_dotenv(override=True)
        tavily_key = os.getenv("TAVILY_API_KEY", "")
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        
        workflow = self.memory.load_workflow(workflow_id) or {}
        if not workflow:
            return {"error": "Workflow not found", "companies_found": 0, "companies": []}
        
        icp = workflow.get("icp_config", {}) or {}
        goal = workflow.get("goal", "")
        
        log_debug(f"Research Agent starting. TAVILY_KEY: {bool(tavily_key)}, GEMINI_KEY: {bool(gemini_key)}")
        log_debug(f"ICP: {icp}")
        log_debug(f"Goal: {goal}")

        companies = []
        source_used = "none"

        if tavily_key:
            # Run multiple queries and combine results
            queries = self._build_queries(goal, icp)
            all_raw_results = []
            seen_urls = set()
            
            for query in queries:
                results = self._run_tavily_search(query, max_results=8)
                for r in results:
                    if r.get("url") not in seen_urls:
                        seen_urls.add(r.get("url"))
                        all_raw_results.append(r)
            
            log_debug(f"Total unique Tavily results: {len(all_raw_results)}")
            
            if all_raw_results:
                companies = self._extract_with_gemini(all_raw_results, icp, goal)
                source_used = "tavily_gemini"
        
        # Fallback to SQLite only if Tavily completely failed
        if not companies:
            log_debug("Tavily+Gemini returned 0 companies, falling back to SQLite")
            source_used = "sqlite_fallback"
            companies = self._sqlite_fallback(icp)

        # Save all found companies to SQLite for other agents to use
        saved = 0
        for c in companies:
            try:
                self.memory.save_company(c)
                saved += 1
            except Exception as e:
                log_debug(f"Could not save company {c.get('company_name')}: {e}")

        elapsed = round(time.time() - start, 2)
        
        log_debug(f"Research complete: {len(companies)} companies, source: {source_used}, elapsed: {elapsed}s")
        
        return {
            "companies_found": len(companies),
            "companies": companies,
            "source_used": source_used,
            "sources": ["Tavily live search + Gemini extraction"] if source_used == "tavily_gemini" else ["SQLite offline fallback"],
            "queries_run": self._build_queries(goal, icp) if tavily_key else [],
            "elapsed_seconds": elapsed,
            "memory_read": ["workflow.icp_config","workflow.goal"],
            "memory_write": ["agent_results.research","companies table"]
        }

    def _sqlite_fallback(self, icp: dict) -> list:
        """Only used when Tavily completely fails"""
        stage_map = {
            "Seed":     ["Seed","Series A","Series B","Series C","Series D","Series F","Public"],
            "Series A": ["Series A","Series B","Series C","Series D","Series F","Public"],
            "Series B": ["Series B","Series C","Series D","Series F","Public"],
            "Series C": ["Series C","Series D","Series F","Public"],
        }
        funding = icp.get("funding_stage","")
        filters = {}
        if icp.get("industry") and icp["industry"] != "Any":
            filters["industry"] = icp["industry"]
        if icp.get("region") and icp["region"] != "Any":
            filters["region"] = icp["region"]
        if icp.get("min_employees"):
            filters["min_employees"] = int(icp["min_employees"])
        if icp.get("max_employees"):
            filters["max_employees"] = int(icp["max_employees"])
        if icp.get("cloud_platform") and icp["cloud_platform"] != "Any":
            filters["cloud_platform"] = icp["cloud_platform"]
        if funding:
            filters["funding_stages"] = stage_map.get(funding, [funding])
        results = self.memory.search_companies(filters)
        for r in results:
            r["source_url"] = "SQLite offline dataset"
        return results
