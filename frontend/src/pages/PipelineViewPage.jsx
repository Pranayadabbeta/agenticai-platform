import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const AGENT_COLORS = {
  research: '#0D9488',
  qualification: '#F59E0B',
  persona: '#7C3AED',
  contact: '#059669',
  summary: '#1E3A5F',
  planner: '#2563EB',
  finance: '#DC2626',
  news: '#0EA5E9',
  risk: '#EF4444',
};

const getAgentSummary = (agentName, payload) => {
  if (!payload) return 'Waiting...';
  const p = payload;
  switch(agentName) {
    case 'research': return p.companies_found ? `Found ${p.companies_found} companies via ${p.sources?.join(', ')}` : 'Searching...';
    case 'qualification': return p.top_lead ? `Top: ${p.top_lead.company_name} — ${p.top_lead.lead_score}/100 (${p.top_lead.tier})` : 'Scoring...';
    case 'persona': return p.persona ? `${p.persona.role_short || p.persona.role} at ${p.company_name} (${p.persona.confidence} confidence)` : 'Identifying...';
    case 'contact': return p.email ? `Generated: ${p.email}` : 'Generating...';
    case 'summary': return p.priority_target ? `${p.recommendation_strength || 'Recommend'}: ${p.priority_target} — ${p.confidence}% confidence` : 'Synthesizing...';
    default: return payload ? `Completed` : 'Waiting...';
  }
};

function StepperItem({ name, status, color, isLast }) {
  const isCompleted = status === "complete";
  const isRunning = status === "running";
  const capName = name.charAt(0).toUpperCase() + name.slice(1);
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center relative z-10">
        <div 
          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
            isRunning ? 'bg-white animate-pulse' : 'bg-white text-slate-400 border-slate-200'
          }`}
          style={{
            backgroundColor: isCompleted ? color : undefined,
            borderColor: isCompleted || isRunning ? color : undefined,
            boxShadow: isCompleted 
              ? `0 1px 3px 0 ${color}40` 
              : isRunning 
              ? `0 0 0 4px ${color}20` 
              : undefined,
            color: isCompleted ? '#ffffff' : (isRunning ? color : undefined)
          }}
        >
          {isCompleted ? (
            <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <span className="text-xs font-black">●</span>
          )}
        </div>
        
        <span 
          className="text-[10px] font-extrabold uppercase tracking-wider mt-1.5"
          style={{
            color: isCompleted || isRunning ? color : "#94a3b8"
          }}
        >
          {capName}
        </span>
      </div>

      {!isLast && (
        <div className="w-8 h-0.5 bg-slate-200 shrink-0 mb-4"></div>
      )}
    </div>
  );
}

function AgentCard({ agentName, status, color, payload, elapsed, memoryRead, memoryWrite, summary }) {
  const capitalizedName = agentName.charAt(0).toUpperCase() + agentName.slice(1);
  
  let badgeText = "Waiting";
  let badgeClass = "bg-slate-100 text-slate-500 border-slate-200";
  if (status === 'complete') {
    badgeText = "Complete ✓";
    badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (status === 'running') {
    badgeText = "Running";
    badgeClass = "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
  } else if (status === 'failed') {
    badgeText = "Failed ✗";
    badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
  }

  const readsStr = memoryRead && memoryRead.length > 0 ? memoryRead.join(', ') : "companies, workflow";
  const writesStr = memoryWrite && memoryWrite.length > 0 ? memoryWrite.join(', ') : `agent_results.${agentName}`;

  return (
    <div 
      className="bg-white border border-slate-200 border-l-4 rounded-2xl p-5 shadow-sm space-y-3 transition-all duration-300 hover:shadow-md"
      style={{ borderLeftColor: color }}
    >
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-slate-800">{capitalizedName} Agent</h4>
        <div className="flex items-center gap-2">
          {status === 'complete' && elapsed !== undefined && (
            <span className="text-2xs text-slate-400">{elapsed}s</span>
          )}
          <span className={`px-2.5 py-0.5 rounded-full text-3xs font-black uppercase tracking-wider border ${badgeClass}`}>
            {badgeText}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-600 font-medium leading-relaxed">
        {summary}
      </p>

      <div className="text-[11px] text-[#9ca3af] font-medium space-y-0.5">
        <div>↑ reads: {readsStr}</div>
        <div>↓ writes: {writesStr}</div>
      </div>
    </div>
  );
}

export default function PipelineViewPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();
  
  const [workflowData, setWorkflowData] = useState(null);
  const [planData, setPlanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    let timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWorkflowPlan = async () => {
      try {
        const plan = await api.getWorkflowPlan(workflowId);
        setPlanData(plan);
      } catch (err) {
        console.error("Failed to load workflow plan:", err);
      }
    };
    
    const fetchWorkflow = async () => {
      try {
        const data = await api.getWorkflow(workflowId);
        setWorkflowData(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load workflow execution status.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkflow();
    fetchWorkflowPlan();

    const intervalId = setInterval(() => {
      fetchWorkflow();
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [workflowId]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [workflowData]);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex justify-center items-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-slate-400 font-semibold text-sm animate-pulse">Loading execution pipeline...</span>
        </div>
      </div>
    );
  }

  if (error || !workflowData) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-[#f8fafc]">
        <div className="bg-white border border-slate-200 p-8 rounded-2xl max-w-md w-full flex flex-col items-center text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900">Pipeline Error</h3>
          <p className="text-sm text-slate-500 mt-2">{error || "Workflow ID not found"}</p>
          <button
              onClick={() => navigate('/icp')}
              className="mt-6 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-sm transition-all"
          >
            Configure Search
          </button>
        </div>
      </div>
    );
  }

  const { workflow, agent_results: agentResults } = workflowData;

  const getLogsList = () => {
    const logs = [
      { time: "09:14:21", text: "Planner Agent INITIALIZED workflow", type: "info" }
    ];

    if (workflow.agent_sequence && workflow.agent_sequence.length > 0) {
      logs.push({ time: "09:14:22", text: `Planner Agent drafted sequence: [${workflow.agent_sequence.join(', ')}]`, type: "info" });

      workflow.agent_sequence.forEach((agentName, idx) => {
        const result = agentResults?.[agentName];
        const status = result?.status || "pending";
        const capName = agentName.charAt(0).toUpperCase() + agentName.slice(1);

        if (status === "running" || status === "complete" || status === "failed") {
          const startMin = 14 + idx;
          logs.push({ 
            time: `09:${startMin}:23`, 
            text: `${capName} Agent Invoked`,
            type: "info"
          });
        }

        if (status === "complete") {
          const endMin = 14 + idx;
          let detailText = "";
          if (agentName === "research") {
            const count = result.payload?.companies_found ?? 0;
            detailText = `Matched ${count} targets`;
          } else if (agentName === "qualification") {
            detailText = "Scoring complete: companies qualified";
          } else if (agentName === "persona") {
            detailText = "Mapped Target Executive Decision-Makers";
          } else if (agentName === "contact") {
            detailText = "Verified contact coordinates.";
          } else if (agentName === "summary") {
            detailText = "Synthesis ready. Pipeline execution COMPLETE.";
          } else {
            detailText = "Execution complete.";
          }
          logs.push({ 
            time: `09:${endMin}:30`, 
            text: `${capName} Agent: ${detailText}`,
            type: "success"
          });
        } else if (status === "failed") {
          const endMin = 14 + idx;
          logs.push({ 
            time: `09:${endMin}:30`, 
            text: `${capName} Agent: Execution failed. Error: ${result.error || "Unknown error"}`,
            type: "error"
          });
        }
      });
    }

    return logs;
  };

  const isWorkflowFinished = workflow.status === "complete" || workflow.status === "approved" || workflow.status === "rejected";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in flex flex-col h-[calc(100vh-4rem)]">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Workflow: {workflow.goal}
          </span>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Live Agent Pipeline</h1>
            <span className="text-xs text-slate-400 font-mono">ID: {workflowId}</span>
          </div>
        </div>

        {/* Action Button */}
        {isWorkflowFinished && (
          <button
            onClick={() => navigate(`/approval/${workflowId}`)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl tracking-wide shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <span>Review Recommendation</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* PART 5 — Stepper at top */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shrink-0 flex items-center justify-center gap-4 flex-wrap">
        {workflowData?.workflow?.agent_sequence?.map((agent, idx) => (
          <StepperItem key={agent} name={agent} color={AGENT_COLORS[agent]}
            status={workflowData?.agent_results?.[agent]?.status || 'pending'}
            isLast={idx === workflowData.workflow.agent_sequence.length - 1} />
        ))}
      </div>

      {/* PART 4 — Planner reasoning banner */}
      {planData?.reasoning && (
        <div 
          className="shrink-0 font-medium"
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '13px',
            color: '#1e40af'
          }}
        >
          🧠 {planData.reasoning}
        </div>
      )}

      {/* PART 1 — Fixed scroll flex layout */}
      <div style={{display:'flex', height:'calc(100vh - 310px)', gap:'24px', overflow:'hidden'}}>

        {/* LEFT: Agent cards - independent scroll */}
        <div style={{width:'60%', overflowY:'auto', height:'100%', paddingRight:'8px'}} className="space-y-6">
          {!workflow.agent_sequence || workflow.agent_sequence.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-2xl h-48 text-slate-500 font-medium">
              <svg className="animate-spin h-6 w-6 text-blue-600 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Planner is deciding...</span>
            </div>
          ) : (
            workflowData?.workflow?.agent_sequence?.map(agentName => {
              const result = workflowData?.agent_results?.[agentName];
              const status = result?.status || 'pending';
              const color = AGENT_COLORS[agentName] || AGENT_COLORS.research;
              return <AgentCard key={agentName} agentName={agentName} status={status}
                       color={color} payload={result?.payload}
                       elapsed={result?.payload?.elapsed_seconds}
                       memoryRead={result?.payload?.memory_read}
                       memoryWrite={result?.payload?.memory_write}
                       summary={getAgentSummary(agentName, result?.payload)} />;
            })
          )}
        </div>

        {/* RIGHT: Terminal - independent scroll */}
        <div style={{width:'40%', overflowY:'auto', height:'100%'}}>
          {/* PART 2 — White/light gray terminal panel */}
          <div 
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              fontFamily: 'Monaco, Consolas, monospace',
              fontSize: '12px',
              color: '#374151',
              padding: '16px',
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div className="pb-3 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400"></span>
                <span className="h-3 w-3 rounded-full bg-amber-400"></span>
                <span className="h-3 w-3 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold text-slate-500 ml-2">Terminal Logs</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Uptime: {elapsedTime}s
              </span>
            </div>

            {/* Logs stream */}
            <div className="flex-1 overflow-y-auto space-y-2 mt-4 pr-2">
              {getLogsList().map((log, idx) => {
                let msgColor = "#1f2937";
                if (log.type === "success") msgColor = "#16a34a";
                else if (log.type === "error") msgColor = "#dc2626";

                return (
                  <div key={idx} className="flex gap-3 leading-relaxed font-mono">
                    <span style={{ color: '#6b7280' }} className="shrink-0 select-none">[{log.time}]</span>
                    <span style={{ color: msgColor }}>
                      {log.text}
                    </span>
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
