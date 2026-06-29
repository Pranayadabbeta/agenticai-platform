class AgentBase:
    """All agents inherit from this."""
    
    def __init__(self, memory: "MemoryManager"):
        self.memory = memory
    
    def run(self, workflow_id: str) -> dict:
        """Execute the agent. Must return a dict payload. Override in subclass."""
        raise NotImplementedError
    
    @property
    def name(self) -> str:
        raise NotImplementedError
    
    @property
    def description(self) -> str:
        raise NotImplementedError

    @property
    def capabilities(self) -> list[str]:
        """Keywords describing what this agent can do. Planner uses these."""
        raise NotImplementedError

    @property
    def requires(self) -> list[str]:
        """Agent names that must run before this one."""
        return []

    @property
    def optional_after(self) -> list[str]:
        """Agent names this can run after but doesn't require."""
        return []


class AgentRegistry:
    """Maps agent name strings to agent instances."""
    
    def __init__(self):
        self._registry: dict = {}
    
    def register(self, agent_instance: AgentBase) -> None:
        """Register an agent by its name property."""
        self._registry[agent_instance.name] = agent_instance
    
    def get(self, agent_name: str) -> AgentBase:
        """Return agent instance. Raise ValueError if not found."""
        if agent_name not in self._registry:
            raise ValueError(f"Agent '{agent_name}' not found in registry. Available: {list(self._registry.keys())}")
        return self._registry[agent_name]
    
    def list_agents(self) -> list[dict]:
        """Return list of {name, description} for all registered agents."""
        return [{"name": a.name, "description": a.description} for a in self._registry.values()]
    
    def is_registered(self, agent_name: str) -> bool:
        return agent_name in self._registry

    def get_all_capabilities(self) -> dict:
        """Returns {agent_name: {capabilities, requires, description}} for all registered agents."""
        return {
            name: {
                "capabilities": agent.capabilities,
                "requires": agent.requires,
                "description": agent.description
            }
            for name, agent in self._registry.items()
        }
