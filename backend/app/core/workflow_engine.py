from app.core.agent_registry import AgentRegistry, AgentBase
from app.core.memory_manager import MemoryManager

class WorkflowEngine:
    """
    Executes agents sequentially in the order specified by WorkflowPlan.
    Reads agent sequence from plan, resolves each from AgentRegistry, runs them in order.
    All results are stored via MemoryManager after each agent completes.
    """
    
    def __init__(self, registry: AgentRegistry, memory: MemoryManager):
        self.registry = registry
        self.memory = memory
    
    def run(self, workflow_id: str, agent_sequence: list[str]) -> dict:
        """
        Execute agents in sequence.
        
        For each agent_name in agent_sequence:
          1. Call self.memory.mark_agent_running(workflow_id, agent_name)
          2. Get agent from registry
          3. Call agent.run(workflow_id)
          4. Call self.memory.save_agent_result(workflow_id, agent_name, result, "complete")
          5. If agent.run() raises an exception:
             - Call self.memory.save_agent_result(workflow_id, agent_name, {}, "failed")
             - Set error in agent_results (add error field handling)
             - Continue to next agent (do NOT crash the whole workflow)
        
        After all agents complete:
          - Call self.memory.update_workflow_status(workflow_id, "complete")
        
        Return: {
            "workflow_id": workflow_id,
            "agents_run": list of agent names that completed,
            "agents_failed": list of agent names that failed,
            "status": "complete"
        }
        """
        agents_run = []
        agents_failed = []
        
        for agent_name in agent_sequence:
            self.memory.mark_agent_running(workflow_id, agent_name)
            import time
            time.sleep(2.0)
            try:
                # Get agent from registry
                agent = self.registry.get(agent_name)
                # Call agent.run
                result = agent.run(workflow_id)
                # Save complete status
                self.memory.save_agent_result(workflow_id, agent_name, result, "complete")
                agents_run.append(agent_name)
            except Exception as e:
                # Handle error by saving failed status and setting error field
                self.memory.save_agent_result(workflow_id, agent_name, {}, "failed", error=str(e))
                agents_failed.append(agent_name)
        
        # Mark workflow complete
        self.memory.update_workflow_status(workflow_id, "complete")
        
        return {
            "workflow_id": workflow_id,
            "agents_run": agents_run,
            "agents_failed": agents_failed,
            "status": "complete"
        }
