import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

export const api = {
  runWorkflow: async (goal, icp) => {
    // POST /api/workflow/run
    // Body: { goal, icp }
    // Returns: { workflow_id, status, message }
    const response = await axios.post(`${BASE_URL}/api/workflow/run`, { goal, icp });
    return response.data;
  },
  
  getWorkflow: async (workflowId) => {
    // GET /api/workflow/{workflowId}
    const response = await axios.get(`${BASE_URL}/api/workflow/${workflowId}`);
    return response.data;
  },

  getWorkflowPlan: async (workflowId) => {
    // GET /api/workflow/{workflowId}/plan
    const response = await axios.get(`${BASE_URL}/api/workflow/${workflowId}/plan`);
    return response.data;
  },
  
  getWorkflowSummary: async (workflowId) => {
    // GET /api/workflow/{workflowId}/summary
    const response = await axios.get(`${BASE_URL}/api/workflow/${workflowId}/summary`);
    return response.data;
  },

  getWorkflowEvidence: async (workflowId) => {
    // GET /api/workflow/{workflowId}/evidence
    const response = await axios.get(`${BASE_URL}/api/workflow/${workflowId}/evidence`);
    return response.data;
  },
  
  submitHITLDecision: async (workflowId, decision, notes = "", focusArea = "") => {
    // POST /api/hitl/decision
    // Body: { workflow_id: workflowId, decision, notes, focus_area }
    const response = await axios.post(`${BASE_URL}/api/hitl/decision`, {
      workflow_id: workflowId,
      decision,
      notes,
      focus_area: focusArea
    });
    return response.data;
  },
  
  getAgents: async () => {
    // GET /api/agents
    const response = await axios.get(`${BASE_URL}/api/agents`);
    return response.data;
  },

  getDashboardTelemetry: async () => {
    // GET /api/dashboard/telemetry
    const response = await axios.get(`${BASE_URL}/api/dashboard/telemetry`);
    return response.data;
  },

  getCompanies: async () => {
    // GET /api/companies
    const response = await axios.get(`${BASE_URL}/api/companies`);
    return response.data;
  },

  getRecentWorkflows: async () => {
    // GET /api/workflows
    const response = await axios.get(`${BASE_URL}/api/workflows`);
    return response.data;
  }
};
