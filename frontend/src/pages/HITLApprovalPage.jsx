import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, BASE_URL } from '../services/api';

export default function HITLApprovalPage() {
  const { workflowId } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [agentResults, setAgentResults] = useState(null);
  const [iteration, setIteration] = useState(1);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState(null); // 'approved', 'rejected'
  const [notes, setNotes] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [showFocusArea, setShowFocusArea] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [hitlHistory, setHitlHistory] = useState([]);
  const [toastMessage, setToastMessage] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadAllData = async () => {
    try {
      const [sum, wf] = await Promise.all([
        api.getWorkflowSummary(workflowId).catch(() => null),
        api.getWorkflow(workflowId).catch(() => null)
      ]);

      if (sum) setSummary(sum);
      if (wf) {
        setAgentResults(wf.agent_results || {});
        if (wf.hitl_history) {
          setHitlHistory(wf.hitl_history);
          setIteration(wf.hitl_history.length + 1);

          // Check if approved or rejected in history
          const lastDecision = wf.hitl_history[wf.hitl_history.length - 1];
          if (lastDecision) {
            if (lastDecision.decision === 'approve') setDecision('approved');
            if (lastDecision.decision === 'reject') setDecision('rejected');
          }
        }
        // Fallback status check directly on workflow status
        if (wf.workflow) {
          if (wf.workflow.status === 'approved') setDecision('approved');
          else if (wf.workflow.status === 'rejected') setDecision('rejected');
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [workflowId]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await api.submitHITLDecision(workflowId, "approve", notes, "");
      setDecision("approved");
      triggerToast("Prospect approved successfully!");
    } catch (err) {
      console.error(err);
      alert("Approval failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    try {
      await api.submitHITLDecision(workflowId, "reject", notes, "");
      setDecision("rejected");
      triggerToast("Prospect rejected.");
    } catch (err) {
      console.error(err);
      alert("Rejection failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestMore = async () => {
    setSubmitting(true);
    try {
      await api.submitHITLDecision(workflowId, "request_more", notes, focusArea);
      setPolling(true);

      // Start polling
      const intervalId = setInterval(async () => {
        try {
          const wf = await api.getWorkflow(workflowId);
          if (wf && wf.workflow && wf.workflow.status === 'complete') {
            clearInterval(intervalId);

            // Fetch updated data
            const updatedSummary = await api.getWorkflowSummary(workflowId).catch(() => null);
            if (updatedSummary) setSummary(updatedSummary);
            setAgentResults(wf.agent_results || {});
            if (wf.hitl_history) {
              setHitlHistory(wf.hitl_history);
              setIteration(wf.hitl_history.length + 1);
            }

            triggerToast("Analysis updated based on your feedback");
            setNotes("");
            setFocusArea("");
            setShowFocusArea(false);
            setSubmitting(false);
            setPolling(false);
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 2000);

    } catch (err) {
      console.error(err);
      alert("Feedback submission failed: " + (err.response?.data?.detail || err.message));
      setSubmitting(false);
    }
  };

  if (loading || polling) {
    return (
      <div className="h-[calc(100vh-4rem)] flex justify-center items-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl border border-slate-200 shadow-lg text-center max-w-md animate-fade-in">
          <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {polling ? "Re-running analysis with feedback..." : "Loading recommendation intelligence..."}
            </h3>
            {focusArea && (
              <p className="text-xs text-slate-500 mt-1">
                Focus Area: <span className="font-semibold text-blue-600">{focusArea}</span>
              </p>
            )}
          </div>
          <span className="text-2xs font-bold uppercase tracking-widest px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
            Iteration {iteration}
          </span>
        </div>
      </div>
    );
  }

  // Map variables safely
  const company = summary?.priority_target || agentResults?.qualification?.payload?.top_lead?.company_name || "Unknown";
  const score = summary?.confidence || agentResults?.qualification?.payload?.top_lead?.lead_score || 0;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const priorityLabel = score >= 80 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW';
  const priorityColor = score >= 80 ? 'bg-rose-100 text-rose-700 border-rose-200' : score >= 60 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200';
  const recStrength = summary?.recommendation_strength || "Buy";
  const execSummary = summary?.executive_summary || "";
  const humanFeedbackAddressed = summary?.human_feedback_addressed || "";
  const evidenceList = summary?.evidence || agentResults?.qualification?.payload?.top_lead?.evidence || [];
  const riskFactors = summary?.risk_factors || [];
  const sourcesUsed = summary?.sources_used || ["Existing agent analysis", "Human feedback integration", "Gemini re-analysis"];

  const role = agentResults?.persona?.payload?.persona?.role || summary?.persona?.role || "CTO";
  const seniority = agentResults?.persona?.payload?.persona?.seniority || summary?.persona?.seniority || "C-Suite";
  const email = summary?.contact?.email || agentResults?.contact?.payload?.email || "Not found";
  const phone = agentResults?.contact?.payload?.phone || "Not found";
  const linkedin = summary?.contact?.linkedin_url || agentResults?.contact?.payload?.linkedin_url || "";
  const verified = agentResults?.contact?.payload?.verified || false;

  // Badge colors
  let confBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score < 60) confBadgeClass = "bg-rose-50 text-rose-700 border-rose-200";
  else if (score < 80) confBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";

  let strengthPillClass = "bg-emerald-600 text-white";
  if (recStrength === "Buy") strengthPillClass = "bg-blue-600 text-white";
  else if (recStrength === "Hold") strengthPillClass = "bg-amber-500 text-white";
  else if (recStrength === "Pass") strengthPillClass = "bg-rose-600 text-white";

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in flex flex-col min-h-[calc(100vh-4rem)] pb-32 relative">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <span className="text-emerald-400">✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Full-screen success overlays */}
      {decision === 'approved' && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-100 text-center space-y-6 transform animate-scale-in">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Prospect Approved</h2>
              <p className="text-sm font-semibold text-slate-500 mt-1">{company}</p>
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => window.open(`${BASE_URL}/api/workflow/${workflowId}/export/pdf`, '_blank')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"
              >
                Export PDF
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Start New Search
              </button>
            </div>
          </div>
        </div>
      )}

      {decision === 'rejected' && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-100 text-center space-y-6 transform animate-scale-in">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto border border-rose-100">
              <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Prospect Rejected</h2>
              <p className="text-sm text-slate-500 mt-1">This lead has been marked as rejected and removed from pipeline.</p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Start New Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Row */}
      <div className="flex justify-between items-center shrink-0">
        <button
          onClick={() => navigate('/')}
          className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Workflows</span>
        </button>
      </div>

      {/* TOP BANNER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recommendation Ready</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold border shadow-xs ${confBadgeClass}`}>
              {score}% Confidence
            </span>
            {iteration > 1 && (
              <span className="bg-amber-100 text-amber-800 text-2xs font-extrabold px-2.5 py-1 rounded-md border border-amber-200 uppercase tracking-wider animate-pulse">
                Iteration {iteration} — Updated based on your feedback
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">AI synthesis & multi-agent verification complete. Ready for human-in-the-loop review.</p>
        </div>

        <div className={`px-6 py-2.5 rounded-xl text-sm font-black tracking-wider uppercase shadow-md shrink-0 ${strengthPillClass}`}>
          {recStrength}
        </div>
      </div>

      {/* THREE COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">

        {/* LEFT COLUMN (30%) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Profile</span>
            <span className={`text-2xs font-black px-2.5 py-1 rounded-md border uppercase tracking-wider ${priorityColor}`}>
              {priorityLabel} PRIORITY
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* CSS Circular Progress Donut */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: `conic-gradient(${scoreColor} ${score}%, #e5e7eb ${score}%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700
              }}>
                {score}%
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 leading-tight">{company}</h3>
              <span className="text-xs font-semibold text-blue-600 block mt-0.5">Primary Target</span>
            </div>
          </div>

          {execSummary && (
            <div>
              <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2">Executive Summary</h4>
              <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                {execSummary}
              </p>
            </div>
          )}

          {humanFeedbackAddressed && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-medium space-y-1 shadow-sm">
              <div className="font-bold flex items-center gap-1.5">
                <span className="text-emerald-600">✓</span>
                <span>Feedback Addressed</span>
              </div>
              <p className="leading-relaxed">{humanFeedbackAddressed}</p>
            </div>
          )}
        </div>

        {/* MIDDLE COLUMN (40%) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-100 mb-4">
              Evidence
            </h3>
            <ol className="space-y-3.5">
              {evidenceList.map((item, idx) => (
                <li key={idx} className="flex gap-3 items-start text-xs font-medium text-slate-700 leading-relaxed">
                  <span className="text-emerald-500 font-bold shrink-0 bg-emerald-50 w-5 h-5 rounded-full flex items-center justify-center text-2xs border border-emerald-200">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          {riskFactors.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-100 mb-4">
                Risk Factors
              </h3>
              <div className="flex flex-wrap gap-2">
                {riskFactors.map((risk, idx) => (
                  <span key={idx} className="bg-rose-50 text-rose-800 border border-rose-200 px-3 py-1 rounded-lg text-2xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <span className="text-rose-500">⚠️</span>
                    <span>{risk}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Sources Used</h4>
            <div className="flex flex-wrap gap-2">
              {sourcesUsed.map((src, idx) => (
                <span key={idx} className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md text-2xs font-semibold">
                  {src}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (30%) */}
        <div className="lg:col-span-3 space-y-6">

          {/* Contact Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recommended Contact</h3>
              <span className="bg-blue-50 text-blue-700 text-2xs font-bold px-2 py-0.5 rounded border border-blue-100">
                {seniority}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Role</span>
                <span className="font-bold text-slate-900">{role}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Email</span>
                {email !== "Not found" ? (
                  <a href={`mailto:${email}`} className="font-bold text-blue-600 hover:underline">{email}</a>
                ) : (
                  <span className="font-medium text-slate-500">{email}</span>
                )}
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Phone</span>
                {phone !== "Not found" ? (
                  <a href={`tel:${phone}`} className="font-bold text-blue-600 hover:underline">{phone}</a>
                ) : (
                  <span className="font-medium text-slate-500">{phone}</span>
                )}
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">LinkedIn</span>
                {linkedin ? (
                  <a href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} target="_blank" rel="noreferrer" className="font-bold text-blue-600 hover:underline truncate max-w-[150px]">
                    Profile
                  </a>
                ) : (
                  <span className="font-medium text-slate-500">Not found</span>
                )}
              </div>

              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-50">
                <span className="text-slate-400 font-medium">Verified Status</span>
                {verified ? (
                  <span className="bg-emerald-50 text-emerald-700 text-2xs font-extrabold px-2 py-0.5 rounded border border-emerald-200">
                    Verified ✓
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-600 text-2xs font-medium px-2 py-0.5 rounded border border-slate-200">
                    Generated Pattern
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => window.open(`${BASE_URL}/api/workflow/${workflowId}/export/pdf`, '_blank')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors uppercase tracking-wider mt-2"
            >
              Export PDF
            </button>
          </div>

          {/* Next Action Box */}
          {summary?.next_action && (
            <div className="border-l-4 border-blue-500 bg-blue-50/50 p-5 rounded-r-2xl space-y-2">
              <h4 className="text-2xs font-bold text-blue-800 uppercase tracking-wider">Next Outreach Step</h4>
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                {summary.next_action}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* HITL HISTORY SECTION */}
      {hitlHistory.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 shrink-0">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex justify-between items-center w-full text-left"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Feedback History ({hitlHistory.length} Rounds)
            </h3>
            <span className="text-slate-400 text-xs font-bold">{showHistory ? "Collapse ▲" : "Expand ▼"}</span>
          </button>

          {showHistory && (
            <div className="space-y-3 pt-2">
              {hitlHistory.map((round, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between items-center text-2xs text-slate-400 font-bold">
                    <span>ROUND {idx + 1} — {round.decision?.toUpperCase()}</span>
                    <span>{new Date(round.decided_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700 font-medium"><span className="font-bold text-slate-400">Feedback:</span> {round.notes || "None"}</p>
                  {round.focus_area && (
                    <p className="text-slate-700 font-medium"><span className="font-bold text-slate-400">Focus:</span> {round.focus_area}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DECISION BAR (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl p-4 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-start">

          <div className="flex-1 w-full space-y-2">
            <textarea
              placeholder="Add notes for your decision (optional)..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs resize-none h-16 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
            {showFocusArea && (
              <input
                placeholder="What should the AI focus on? e.g. 'recent funding news' or 'focus on Series B companies'"
                value={focusArea}
                onChange={e => setFocusArea(e.target.value)}
                className="w-full p-3 border border-blue-300 rounded-xl text-xs bg-blue-50/50 text-blue-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />
            )}
          </div>

          <div className="flex gap-2.5 w-full md:w-auto justify-end flex-shrink-0">
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 md:flex-none bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              ✓ Approve & Export
            </button>
            <button
              onClick={() => {
                if (!showFocusArea) {
                  setShowFocusArea(true);
                } else {
                  handleRequestMore();
                }
              }}
              disabled={submitting}
              className="flex-1 md:flex-none bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              🔄 Request More Research
            </button>
            <button
              onClick={handleReject}
              disabled={submitting}
              className="flex-1 md:flex-none bg-white hover:bg-rose-50 border border-[#dc2626] text-[#dc2626] px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              ✗ Reject
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
