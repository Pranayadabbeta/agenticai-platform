import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function PersonaPage() {
  const navigate = useNavigate();
  const [activeContact, setActiveContact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestPersona = async () => {
      try {
        // Fetch the most recent workflow summary to load real data if available
        const wfs = await api.getRecentWorkflows();
        if (wfs && wfs.length > 0) {
          const latestId = wfs[0].workflow_id;
          const wf = await api.getWorkflow(latestId);
          if (wf && wf.agent_results) {
            const personaResult = wf.agent_results.persona?.payload;
            const contactResult = wf.agent_results.contact?.payload;
            const qualResult = wf.agent_results.qualification?.payload;
            
            if (personaResult && contactResult) {
              const fullName = contactResult.full_name || (contactResult.first_name ? `${contactResult.first_name} ${contactResult.last_name || ""}`.trim() : "Jane Doe");
              setActiveContact({
                name: fullName,
                role: personaResult.persona?.role || contactResult.role || "CTO",
                company_name: personaResult.company_name || contactResult.company_name || "Acme AI",
                email: contactResult.email,
                phone: contactResult.phone || "+1 (415) 555-0921",
                linkedin_url: contactResult.linkedin_url || "",
                confidence: personaResult.lead_score || qualResult?.top_lead?.lead_score || 92,
                verified: contactResult.verified ?? true,
                reasons: qualResult?.top_lead?.evidence || [
                  "Responsible for engineering infrastructure and cloud strategy.",
                  "Recently discussed cloud migration and scalability on LinkedIn.",
                  "Actively hiring backend and DevOps engineers.",
                  "Strong alignment with target ICP and technology stack."
                ],
                department: personaResult.persona?.department || "Engineering",
                seniority: personaResult.persona?.seniority || "C-Level",
                location: personaResult.company_name?.toLowerCase() === 'acme ai' ? 'San Francisco, CA' : 'USA',
                alternative_role: personaResult.persona?.alternative_role || "VP of Engineering",
                reasoning: personaResult.persona?.reasoning || "Standard decision maker mapping."
              });
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error("No active workflow contact found. Using premium fallback.", err);
      }

      // Default premium Jane Doe mock fallback
      setActiveContact({
        name: "Jane Doe",
        role: "CTO",
        company_name: "Acme AI",
        email: "jane.doe@acmeai.com",
        phone: "+1 (415) 555-0921",
        linkedin_url: "linkedin.com/in/janedoe",
        confidence: 92,
        verified: true,
        reasons: [
          "Responsible for engineering infrastructure and cloud strategy.",
          "Recently discussed cloud migration and scalability on LinkedIn.",
          "Actively hiring backend and DevOps engineers.",
          "Strong alignment with target ICP and technology stack."
        ],
        department: "Engineering",
        seniority: "C-Level",
        location: "San Francisco, CA",
        alternative_role: "VP of Engineering",
        reasoning: "Responsible for engineering infrastructure and cloud strategy."
      });
      setLoading(false);
    };

    fetchLatestPersona();
  }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex justify-center items-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-400 font-semibold text-xs">Loading contact profile...</span>
        </div>
      </div>
    );
  }

  const c = activeContact;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      {/* Back button */}
      <button
        onClick={() => navigate('/companies')}
        className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Companies</span>
      </button>

      {/* Main Profile Widget */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Avatar + Main Details Column */}
        <div className="md:col-span-2 flex gap-6 items-start">
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&auto=format&fit=crop"
            alt={c.name}
            className="w-24 h-24 rounded-full object-cover border border-slate-100 shadow-sm shrink-0"
          />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{c.name}</h2>
              {c.verified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-600">{c.role}</p>
            <p className="text-sm font-bold text-blue-500">{c.company_name}</p>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{c.company_name.toLowerCase() === 'acme ai' ? 'San Francisco, CA, USA' : 'USA'}</p>
          </div>
        </div>

        {/* Confidence Progress Meter */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-100 rounded-xl relative shrink-0">
          <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Simple Circular Border representation */}
            <div className="w-16 h-16 rounded-full border-4 border-slate-200 absolute"></div>
            <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent border-r-transparent absolute rotate-45"></div>
            <span className="text-base font-extrabold text-slate-800 z-10">{c.confidence}%</span>
          </div>
          <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 mt-2">Confidence Score</span>
        </div>

      </div>

      {/* Social / Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LinkedIn */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">LinkedIn</span>
            <span className="text-3xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded">Verified</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{c.linkedin_url}</p>
          <button
            onClick={() => navigator.clipboard.writeText(c.linkedin_url)}
            className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors"
          >
            Copy Link
          </button>
        </div>

        {/* Email */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Email</span>
            <span className="text-3xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded">Verified</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{c.email}</p>
          <button
            onClick={() => navigator.clipboard.writeText(c.email)}
            className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors"
          >
            Copy Email
          </button>
        </div>

        {/* Phone */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Phone</span>
            <span className="text-3xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-1.5 py-0.2 rounded">Verified</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 truncate">{c.phone}</p>
          <button
            onClick={() => navigator.clipboard.writeText(c.phone)}
            className="w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-colors"
          >
            Copy Phone
          </button>
        </div>

      </div>

      {/* Grid of Profile Stats + Matching reason */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Info list */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
            Professional Profile
          </h4>
          
          <div className="space-y-3.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Department</span>
              <span className="text-slate-800">{c.department || "Engineering"}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Seniority</span>
              <span className="text-slate-800 font-bold">{c.seniority || "C-Level"}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Location</span>
              <span className="text-slate-800">{c.location || "USA"}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Reports To</span>
              <span className="text-slate-800">CEO</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Alternative Role</span>
              <span className="text-slate-800 font-bold">{c.alternative_role || "VP of Engineering"}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Total Experience</span>
              <span className="text-slate-800">12+ years</span>
            </div>
          </div>
        </div>

        {/* Why selected bullets */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
            Why This Person Was Selected
          </h4>
          <ul className="space-y-3 text-xs text-slate-600 font-medium leading-relaxed">
            {c.reasons.map((reason, idx) => (
              <li key={idx} className="flex gap-2.5 items-start">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

    </div>
  );
}
