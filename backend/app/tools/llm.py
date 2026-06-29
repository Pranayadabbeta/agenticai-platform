import os, requests, json, time
from dotenv import load_dotenv

load_dotenv(override=True)

def get_gemini_config():
    key = os.getenv("GEMINI_API_KEY", "")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    return key, model, url

def call_llm(prompt: str, system_prompt: str = "", max_retries: int = 3) -> str:
    key, model, url = get_gemini_config()
    headers = {"Content-Type": "application/json", "x-goog-api-key": key}
    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
    body = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 4000}
    }
    for attempt in range(max_retries):
        try:
            r = requests.post(url, headers=headers, json=body, timeout=30)
            r.raise_for_status()
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                raise RuntimeError(f"Gemini API failed with model {model}: {str(e)}")

def extract_json_from_response(text: str) -> dict:
    cleaned = text.strip()
    try:
        return json.loads(cleaned)
    except: pass
    try:
        if "```json" in cleaned:
            start = cleaned.index("```json") + 7
            end = cleaned.index("```", start)
            return json.loads(cleaned[start:end].strip())
    except: pass
    try:
        start = cleaned.index("[")
        end = cleaned.rindex("]") + 1
        return json.loads(cleaned[start:end])
    except: pass
    try:
        start = cleaned.index("{")
        end = cleaned.rindex("}") + 1
        return json.loads(cleaned[start:end])
    except: pass
    raise ValueError(f"Cannot extract JSON from: {text[:300]}")

def is_llm_available() -> bool:
    key, _, _ = get_gemini_config()
    return bool(key)

# Backward-compatible aliases so nothing else breaks
call_ollama = call_llm
is_ollama_available = is_llm_available