# Backend do Sistema de IA para Gestão de Tráfego

Esta é a implementação do backend para o sistema de IA de Gestão de Tráfego Pago do SiaFlow, construído com Python utilizando a arquitetura multi-agente com CrewAI.

## Arquitetura

O sistema é composto por:

1. **API REST** (FastAPI): Interface para comunicação com o frontend
2. **Sistema Multi-Agente** (CrewAI): Orquestração dos agentes especializados
3. **Agentes Especializados**:
   - Estrategista: Responsável pela estratégia de marketing
   - Criador de Campanhas: Especialista na estrutura técnica das campanhas
   - Especialista em Anúncios: Especialista na criação e análise de anúncios
4. **Ferramentas**:
   - API do Meta ADS: Integração com a plataforma de anúncios do Meta
   - Web Search: Pesquisa na web para obter informações atualizadas

## Requisitos

- Python 3.9+
- Dependências listadas em `requirements.txt`
- Acesso à API da OpenAI (GPT-4o-mini)
- Acesso à API do Meta ADS (opcional para integração completa)

## Instalação

1. Clone o repositório:

```bash
git clone <url-do-repositório>
cd backend
```

2. Crie um ambiente virtual:

```bash
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
```

3. Instale as dependências:

```bash
pip install -r requirements.txt
```

4. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```
OPENAI_API_KEY=sua-chave-api
META_APP_ID=seu-app-id
META_APP_SECRET=seu-app-secret
META_ACCESS_TOKEN=seu-token-acesso
META_ACCOUNT_ID=seu-account-id
```

## Executando o Servidor

Para iniciar o servidor de desenvolvimento:

```bash
python run.py
```

A API estará disponível em `http://localhost:8000` por padrão.

A documentação interativa da API estará disponível em `http://localhost:8000/docs`.

## Endpoints da API

### Gerenciamento de Sessão

- `POST /api/trafego/session`: Cria uma nova sessão
- `GET /api/trafego/history/{session_id}`: Obtém o histórico da sessão

### Interação com o Agente

- `POST /api/trafego/message`: Envia uma mensagem para o agente
- `POST /api/trafego/upload`: Faz upload de um arquivo (criativo)
- `POST /api/trafego/campanha`: Cria uma campanha completa

## Fluxo de Trabalho

1. **Iniciar Sessão**: Crie uma nova sessão para o usuário
2. **Briefing**: Envie um briefing com informações sobre a campanha desejada
3. **Upload de Criativos**: (Opcional) Faça upload dos criativos disponíveis
4. **Criação de Campanha**: Solicite a criação da campanha completa
5. **Análise dos Resultados**: Receba a estratégia, estrutura técnica e especificações de anúncios

## Desenvolvimento

### Estrutura do Projeto

- `trafego_ai/`
  - `agents/`: Implementação dos agentes especializados
  - `api/`: API FastAPI para comunicação com o frontend
  - `config/`: Configurações do sistema
  - `models/`: Modelos de dados (schemas)
  - `tools/`: Ferramentas utilizadas pelos agentes
  - `utils/`: Utilidades e componentes compartilhados

### Personalização

Para customizar o comportamento dos agentes, edite os arquivos em `trafego_ai/agents/`.

Para ajustar as configurações do sistema, edite o arquivo `trafego_ai/config/settings.py`.

## Suporte

Para questões e suporte, entre em contato com a equipe do SiaFlow.

## Licença

Direitos autorais © 2023 SiaFlow. Todos os direitos reservados. 