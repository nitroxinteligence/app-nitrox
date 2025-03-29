"""
Implementação da classe base para os agentes de IA de Gestão de Tráfego
"""
from crewai import Agent
from langchain_openai import ChatOpenAI
from backend.trafego_ai.config.settings import OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TEMPERATURE


class BaseAgent:
    """
    Classe base para todos os agentes do sistema.
    Implementa funcionalidades comuns e fornece integração com o CrewAI.
    """
    
    def __init__(self, role, goal, backstory=None, memory=True, verbose=False, 
                tools=None, model=None, temperature=None, allow_delegation=True):
        """
        Inicializa um agente base.
        
        Args:
            role (str): O papel/função do agente
            goal (str): O objetivo principal do agente
            backstory (str, optional): História de fundo do agente
            memory (bool, optional): Se o agente deve manter memória das interações
            verbose (bool, optional): Se deve imprimir logs detalhados
            tools (list, optional): Lista de ferramentas disponíveis para o agente
            model (str, optional): Modelo LLM específico a ser usado
            temperature (float, optional): Temperatura para o modelo LLM
            allow_delegation (bool, optional): Se o agente pode delegar tarefas
        """
        self.role = role
        self.goal = goal
        self.backstory = backstory
        self.memory = memory
        self.verbose = verbose
        self.tools = tools or []
        self.model_name = model or OPENAI_MODEL
        self.temperature = temperature or OPENAI_TEMPERATURE
        self.allow_delegation = allow_delegation
        
        # Inicializar o modelo LLM
        self.llm = ChatOpenAI(
            api_key=OPENAI_API_KEY,
            model=self.model_name,
            temperature=self.temperature
        )
        
        # Criar o agente CrewAI
        self.agent = self._create_agent()
    
    def _create_agent(self):
        """
        Cria e retorna uma instância do agente CrewAI.
        
        Returns:
            Agent: Uma instância do agente CrewAI
        """
        return Agent(
            role=self.role,
            goal=self.goal,
            backstory=self.backstory,
            verbose=self.verbose,
            memory=self.memory,
            allow_delegation=self.allow_delegation,
            tools=self.tools,
            llm=self.llm
        )
    
    def get_agent(self):
        """
        Obtém a instância do agente CrewAI.
        
        Returns:
            Agent: A instância do agente CrewAI
        """
        return self.agent
    
    def add_tool(self, tool):
        """
        Adiciona uma nova ferramenta ao agente.
        
        Args:
            tool: A ferramenta a ser adicionada
            
        Returns:
            BaseAgent: O próprio agente para encadeamento de métodos
        """
        self.tools.append(tool)
        # Recria o agente com a nova ferramenta
        self.agent = self._create_agent()
        return self
    
    def set_temperature(self, temperature):
        """
        Define a temperatura do modelo LLM.
        
        Args:
            temperature (float): O valor da temperatura (0.0 - 1.0)
            
        Returns:
            BaseAgent: O próprio agente para encadeamento de métodos
        """
        self.temperature = temperature
        self.llm = ChatOpenAI(
            api_key=OPENAI_API_KEY,
            model=self.model_name,
            temperature=self.temperature
        )
        self.agent = self._create_agent()
        return self 