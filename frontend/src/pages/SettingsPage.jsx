import React from 'react';

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure AgentOS model nodes and pipeline parameters.</p>
      </div>

      {/* Settings Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* LLM Node Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">LLM Generation Node</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-blue-200 bg-blue-50/50 p-4 rounded-xl flex items-center justify-between cursor-pointer">
              <div>
                <h4 className="text-sm font-bold text-slate-800">Ollama Local</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">qwen2.5-coder:7b (Online)</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            </div>
            
            <div className="border border-slate-200 p-4 rounded-xl flex items-center justify-between opacity-50 cursor-not-allowed">
              <div>
                <h4 className="text-sm font-bold text-slate-800">DeepSeek API</h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">deepseek-coder (Offline)</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
            </div>
          </div>
        </div>

        {/* Scoring Thresholds */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Fit Scoring Thresholds</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Strategic Tier (Min Score)</label>
              <input
                type="number"
                defaultValue={80}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Qualified Tier (Min Score)</label>
              <input
                type="number"
                defaultValue={60}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500">Nurture Tier (Min Score)</label>
              <input
                type="number"
                defaultValue={40}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">CRM Integration</h3>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-slate-800">Auto HubSpot Export</h4>
              <p className="text-xs text-slate-500 font-medium">Export qualified prospects to HubSpot immediately after summary step.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

      </div>

    </div>
  );
}
