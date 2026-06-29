import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function ICPConfigPage() {
  const navigate = useNavigate();

  const [goal, setGoal] = useState("");
  const [industry, setIndustry] = useState("SaaS");
  const [employeeMin, setEmployeeMin] = useState(50);
  const [employeeMax, setEmployeeMax] = useState(5000);
  const [region, setRegion] = useState("North America");
  
  // Funding stage chips
  const [fundingStages, setFundingStages] = useState(["Series A", "Series B", "Series C"]);
  
  // Cloud platform checkboxes
  const [cloudAWS, setCloudAWS] = useState(true);
  const [cloudAzure, setCloudAzure] = useState(false);
  const [cloudGCP = true, setCloudGCP] = useState(true);

  // Hiring slider (0: Low, 1: Medium, 2: High, 3: Very High)
  const [hiringActivity, setHiringActivity] = useState(3);

  // Target Persona
  const [targetPersona, setTargetPersona] = useState("CTO");

  // Priority Technologies tags
  const [technologies, setTechnologies] = useState(["AWS", "Kubernetes", "Snowflake", "Python", "React"]);
  const [newTech, setNewTech] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleFundingStage = (stage) => {
    setFundingStages(prev =>
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    );
  };

  const handleAddTech = (e) => {
    if (e.key === 'Enter' && newTech.trim()) {
      e.preventDefault();
      if (!technologies.includes(newTech.trim())) {
        setTechnologies([...technologies, newTech.trim()]);
      }
      setNewTech("");
    }
  };

  const removeTech = (tech) => {
    setTechnologies(prev => prev.filter(t => t !== tech));
  };

  // Dynamically calculate estimated statistics based on inputs
  const getEstimatedCount = () => {
    let base = 1280;
    if (industry === 'AI') base = 480;
    if (industry === 'HealthTech') base = 350;
    if (industry === 'Fintech') base = 620;
    if (region === 'Europe') base = Math.round(base * 0.4);
    if (region === 'APAC') base = Math.round(base * 0.2);
    return base;
  };

  const getMatchScore = () => {
    let base = 83;
    if (cloudAWS && cloudGCP) base += 4;
    if (hiringActivity > 2) base += 3;
    return Math.min(base, 98);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Build automated goal description if blank
    const activeGoal = goal.trim() || `Find ${fundingStages.join('/')} ${industry} companies in ${region} with ${employeeMin}-${employeeMax} employees hiring for ${targetPersona} persona`;

    // Map cloud platforms list
    const clouds = [];
    if (cloudAWS) clouds.push("AWS");
    if (cloudGCP) clouds.push("GCP");
    if (cloudAzure) clouds.push("Azure");
    const cloudStr = clouds.join("/") || "Any";

    const icpPayload = {
      industry: industry,
      funding_stage: fundingStages[0] || "Series A",
      region: region === "North America" ? "USA" : region,
      min_employees: employeeMin,
      max_employees: employeeMax,
      cloud_platform: cloudStr
    };

    try {
      const result = await api.runWorkflow(activeGoal, icpPayload);
      if (result && result.workflow_id) {
        navigate(`/pipeline/${result.workflow_id}`);
      } else {
        setError("Failed to initialize workflow. Invalid response received.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.message || "Connection error. Make sure the backend server is running.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">ICP Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">Define your ideal customer profile for AI-powered prospect discovery.</p>
      </div>

      {/* Grid wrapper */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column (Inputs) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          
          {/* Optional Goal Prompt */}
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Business Search Goal (Prompt)
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Target Series A/B AI startups in USA hiring engineering roles with AWS..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-inner"
            />
          </div>

          {/* Industry & Region */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="SaaS">SaaS</option>
                <option value="AI">AI</option>
                <option value="HealthTech">HealthTech</option>
                <option value="Fintech">Fintech</option>
                <option value="E-commerce">E-commerce</option>
              </select>
            </div>
            
            <div className="flex flex-col">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                <option value="North America">North America</option>
                <option value="Europe">Europe</option>
                <option value="APAC">APAC</option>
              </select>
            </div>
          </div>

          {/* Employee range */}
          <div className="flex flex-col">
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Employee Size</label>
              <span className="text-sm font-semibold text-blue-600">{employeeMin} - {employeeMax}+</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10"
                max="1000"
                value={employeeMin}
                onChange={(e) => setEmployeeMin(parseInt(e.target.value))}
                className="flex-1 accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
              />
              <input
                type="range"
                min="1001"
                max="10000"
                value={employeeMax}
                onChange={(e) => setEmployeeMax(parseInt(e.target.value))}
                className="flex-1 accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Funding Stage */}
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">Funding Stage</label>
            <div className="flex flex-wrap gap-2">
              {["Seed", "Series A", "Series B", "Series C", "Series D", "Public"].map((stage) => {
                const active = fundingStages.includes(stage);
                return (
                  <button
                    type="button"
                    key={stage}
                    onClick={() => toggleFundingStage(stage)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      active
                        ? "bg-blue-50 text-blue-600 border-blue-200"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {stage}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cloud Platforms */}
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">Cloud Platform</label>
            <div className="flex gap-6 items-center">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloudAWS}
                  onChange={(e) => setCloudAWS(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500 bg-slate-50"
                />
                <span>AWS</span>
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloudAzure}
                  onChange={(e) => setCloudAzure(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500 bg-slate-50"
                />
                <span>Azure</span>
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cloudGCP}
                  onChange={(e) => setCloudGCP(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-350 rounded focus:ring-blue-500 bg-slate-50"
                />
                <span>GCP</span>
              </label>
            </div>
          </div>

          {/* Hiring activity slider */}
          <div className="flex flex-col">
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Hiring Activity</label>
              <span className="text-sm font-semibold text-blue-600">
                {hiringActivity === 0 ? "Low" : hiringActivity === 1 ? "Medium" : hiringActivity === 2 ? "High" : "Very High"}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="3"
              step="1"
              value={hiringActivity}
              onChange={(e) => setHiringActivity(parseInt(e.target.value))}
              className="w-full accent-blue-600 h-1 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Target Persona */}
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Target Persona</label>
            <select
              value={targetPersona}
              onChange={(e) => setTargetPersona(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="CTO">CTO</option>
              <option value="VP Engineering">VP Engineering</option>
              <option value="Founder">Founder</option>
              <option value="CEO">CEO</option>
              <option value="Head of Infrastructure">Head of Infrastructure</option>
            </select>
          </div>

          {/* Technologies tags */}
          <div className="flex flex-col">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Priority Technologies</label>
            <div className="flex flex-wrap gap-2 p-3 border border-slate-200 rounded-xl bg-slate-50/50">
              {technologies.map(tech => (
                <span
                  key={tech}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                >
                  {tech}
                  <button
                    type="button"
                    onClick={() => removeTech(tech)}
                    className="text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="+ Add technology..."
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                onKeyDown={handleAddTech}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none px-2 py-1"
              />
            </div>
          </div>

          {/* Error widget */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl tracking-wide shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:translate-y-0 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Generating Workflow...</span>
              </>
            ) : (
              <span>Generate Workflow</span>
            )}
          </button>

        </div>

        {/* Right Column (Live ICP Preview) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
            Live ICP Preview
          </h3>

          {/* Stats blocks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Estimated Companies</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {getEstimatedCount().toLocaleString()}
              </div>
              <span className="text-3xs font-bold text-emerald-600 mt-1 block">▲ 18% match</span>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Avg Match Score</span>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {getMatchScore()}%
              </div>
              <span className="text-3xs font-bold text-emerald-600 mt-1 block">▲ +7% score</span>
            </div>
          </div>

          {/* Chart 1: Likely Personas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Likely Personas</h4>
            <div className="space-y-2">
              {[
                { name: "CTO", pct: 68, active: targetPersona === "CTO" },
                { name: "VP Engineering", pct: 22, active: targetPersona === "VP Engineering" },
                { name: "Founder", pct: 10, active: targetPersona === "Founder" }
              ].map(p => (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{p.name}</span>
                    <span>{p.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${p.active ? 'bg-blue-600' : 'bg-slate-400'}`}
                      style={{ width: `${p.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Top Industries */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Top Industries</h4>
            <div className="space-y-2">
              {[
                { name: "SaaS", pct: 62, active: industry === "SaaS" },
                { name: "Fintech", pct: 18, active: industry === "Fintech" },
                { name: "HealthTech", pct: 10, active: industry === "HealthTech" },
                { name: "E-commerce", pct: 10, active: industry === "E-commerce" }
              ].map(ind => (
                <div key={ind.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{ind.name}</span>
                    <span>{ind.pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${ind.active ? 'bg-indigo-500' : 'bg-slate-350'}`}
                      style={{ width: `${ind.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </form>

    </div>
  );
}
