// Processar métricas de execução de workflows
var workflow = $node['Split By Workflow'].json;
var executions = $json.data || [];
var today = new Date();
var todayStr = today.toISOString().split('T')[0];
var lookbackDays = $node['Config'].json.dataLookbackDays || 360;

// Verificar se o workflow tem a tag "main agent"
var hasMainAgentTag = false;
if (Array.isArray(workflow.workflows[0].tags)) {
    for (var t = 0; t < workflow.workflows[0].tags.length; t++) {
        var tag = workflow.workflows[0].tags[t];
        var tagName = typeof tag === 'string' ? tag : tag.name;
        if (tagName === 'main agent') {
            hasMainAgentTag = true;
            break;
        }
    }
}

// Log inicial com informações do workflow
console.log('🔍 Análise de Métricas do Workflow');
console.log('----------------------------------');
console.log('📊 Workflow: ' + workflow.workflows[0].name);
console.log('🏷️ Tags: ' + workflow.workflows[0].tags.map(function(t) { 
    return typeof t === 'string' ? t : t.name; 
}).join(', '));
console.log('🔢 ID: ' + workflow.workflows[0].id);
console.log('📆 Período: Últimos ' + lookbackDays + ' dias');
console.log('📈 Total de execuções a analisar: ' + executions.length);
if (hasMainAgentTag) {
    console.log('🤖 Workflow com tag "main agent" - usando estratégia específica para qualificação de leads');
}
console.log('----------------------------------');

// Lista expandida de termos relacionados a agendamento para busca
var agendamentoTerms = [
    'agend', 'confirm', 'schedul', 'book', 'appointment', 'agendar', 
    'agenda', 'marcar', 'marca', 'marcado', 'reserv', 'slot', 'horario', 
    'horário', 'data', 'consulta', 'confirm', 'confirmação', 'confirmacao'
];

// Lista de nós que podem conter confirmação
var possibleConfirmationNodes = [
    'worker', 'agendador', 'scheduler', 'confirmar', 'confirm', 
    'book', 'calendar', 'date', 'whatsapp', 'data api', 
    'response', 'reply', 'success', 'flow', 'agenda', 'ai agent'
];

// Adicionar nós típicos de workflows com tag "main agent"
var mainAgentNodes = [
    'AI Agent', 'AI Agent1', 'Worker Agendador', 'Data API'
];

// Caminhos específicos onde a tool confirmar_agendamento pode ser encontrada
var toolPaths = [
    'tool', 'tools', 'executedTools', 'action', 'name', 'data.tool', 
    'data.tools', 'data.executedTools', 'message', 'content', 
    'data.action', 'chatInput', 'input', 'output', 'result',
    'response', 'history', 'conversation', 'messages', 'calls'
];

/**
 * Analisa profundamente um objeto JSON para encontrar valores específicos
 * @param {Object} obj - Objeto a ser analisado
 * @param {Array} searchTerms - Termos para busca
 * @param {Array} paths - Caminhos específicos para buscar (opcional)
 * @returns {Array} - Array de evidências encontradas
 */
function deepJsonAnalysis(obj, searchTerms, paths = []) {
    let results = [];
    
    // Função recursiva para busca profunda
    function searchDeep(data, path = '') {
        if (!data) return;
        
        // Caso base: string
        if (typeof data === 'string') {
            const lowerData = data.toLowerCase();
            // Verificar se a string contém algum dos termos de busca
            for (const term of searchTerms) {
                if (lowerData.includes(term.toLowerCase())) {
                    results.push({
                        path: path,
                        value: data,
                        matchTerm: term
                    });
                }
            }
            return;
        }
        
        // Caso recursivo: array
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                searchDeep(item, `${path}[${index}]`);
            });
            return;
        }
        
        // Caso recursivo: objeto
        if (typeof data === 'object') {
            for (const key in data) {
                // Verificar se a chave contém algum dos termos de busca
                const lowerKey = key.toLowerCase();
                for (const term of searchTerms) {
                    if (lowerKey.includes(term.toLowerCase())) {
                        results.push({
                            path: `${path}.${key}`,
                            key: key,
                            matchTerm: term
                        });
                    }
                }
                
                // Verificar os caminhos específicos
                for (const targetPath of paths) {
                    if (`${path}.${key}`.toLowerCase().includes(targetPath.toLowerCase())) {
                        results.push({
                            path: `${path}.${key}`,
                            key: key,
                            specialMatch: targetPath
                        });
                    }
                }
                
                // Continuar a busca recursiva
                searchDeep(data[key], `${path}.${key}`);
            }
        }
    }
    
    searchDeep(obj);
    return results;
}

/**
 * Análise profunda de um nó Worker Agendador para encontrar evidências
 * relacionadas à ferramenta confirmar_agendamento
 * @param {Object} execution - Dados da execução
 * @returns {Object} Resultado detalhado da análise
 */
function analyzeWorkerAgendadorNode(execution) {
    console.log(`🔍 Analisando nó Worker Agendador para confirmação de agendamento...`);
    
    if (!execution?.data?.resultData?.runData) {
        return {
            found: false,
            reason: 'sem_dados_de_execucao',
            evidence: []
        };
    }
    
    const runData = execution.data.resultData.runData;
    const workerNodes = [];
    const evidence = [];
    let scoredEvidence = 0;
    
    // 1. Identificar todos os nós Worker Agendador
    for (const nodeId in runData) {
        const nodeLower = nodeId.toLowerCase();
        if (nodeLower.includes('worker') && nodeLower.includes('agendador')) {
            console.log(`🧩 Nó Worker Agendador encontrado: ${nodeId}`);
            workerNodes.push({
                nodeId: nodeId,
                data: runData[nodeId]
            });
        }
    }
    
    if (workerNodes.length === 0) {
        console.log(`⚠️ Nenhum nó Worker Agendador encontrado no workflow`);
        return {
            found: false,
            reason: 'no_worker_agendador_nao_encontrado',
            evidence: []
        };
    }
    
    // 2. Analisar cada nó Worker Agendador
    for (const workerNode of workerNodes) {
        if (!isNodeExecuted(workerNode.data)) {
            console.log(`⚠️ Nó ${workerNode.nodeId} não foi executado`);
            continue;
        }
        
        console.log(`🔎 Analisando execução do nó ${workerNode.nodeId}`);
        
        // Verificar cada execução do nó
        for (let i = 0; i < workerNode.data.length; i++) {
            const nodeExecution = workerNode.data[i];
            
            // Buscar a ferramenta confirmar_agendamento diretamente
            if (nodeExecution?.data?.main) {
                for (const item of nodeExecution.data.main) {
                    // Busca específica para ferramenta confirmar_agendamento
                    const specificPaths = [
                        'parameters.tool', 
                        'parameters.tools',
                        'tool.name',
                        'tools.name',
                        'executedTools',
                        'agendamento',
                        'confirmacao',
                        'confirmar'
                    ];
                    
                    // Busca profunda por qualquer indício de agendamento
                    const results = deepJsonAnalysis(
                        item, 
                        ['confirmar_agendamento', 'confirmaragendamento', 'confirmar agendamento'], 
                        specificPaths
                    );
                    
                    if (results.length > 0) {
                        console.log(`✅ Encontradas ${results.length} evidências de confirmação de agendamento no nó ${workerNode.nodeId}`);
                        evidence.push(...results);
                        scoredEvidence += results.length * 2; // Evidência forte
                    }
                    
                    // Busca por termos relacionados a agendamento
                    const generalResults = deepJsonAnalysis(item, agendamentoTerms);
                    if (generalResults.length > 0) {
                        console.log(`ℹ️ Encontradas ${generalResults.length} menções a termos de agendamento no nó ${workerNode.nodeId}`);
                        evidence.push(...generalResults);
                        scoredEvidence += generalResults.length; // Evidência fraca
                    }
                }
            }
        }
    }
    
    // 3. Determinar se há evidência suficiente para confirmar
    const isConfirmed = scoredEvidence >= 1;
    
    if (isConfirmed) {
        console.log(`✅ Confirmação de agendamento detectada com ${scoredEvidence} pontos de evidência`);
    } else {
        console.log(`❌ Confirmação de agendamento não detectada (pontuação: ${scoredEvidence})`);
    }
    
    return {
        found: isConfirmed,
        score: scoredEvidence,
        evidence: evidence,
        workers: workerNodes.map(w => w.nodeId)
    };
}

/**
 * Verifica se um nó foi executado com sucesso
 * @param {Array} nodeData - Dados do nó
 * @returns {boolean} - Verdadeiro se o nó foi executado com sucesso
 */
function isNodeExecuted(nodeData) {
    if (!nodeData || !Array.isArray(nodeData) || nodeData.length === 0) {
        return false;
    }
    
    // Verificar se pelo menos uma execução tem dados
    for (var i = 0; i < nodeData.length; i++) {
        if (nodeData[i]?.data?.main) {
            return true;
        }
    }
    
    return false;
}

/**
 * Função que procura nos logs de execução quaisquer menções a agendamento
 */
function analyzeLogsForScheduling(execution) {
    if (!execution.data?.resultData?.runData) {
        return {
            found: false,
            reason: 'sem_dados_de_execucao'
        };
    }
    
    try {
        // Buscar no log de execução menções a agendamento
        var logs = execution.data.resultData.logs || [];
        if (logs && logs.length > 0) {
            var logText = logs.join(' ').toLowerCase();
            
            for (var i = 0; i < agendamentoTerms.length; i++) {
                if (logText.includes(agendamentoTerms[i])) {
                    console.log('🔍 Menção a agendamento encontrada nos logs:', agendamentoTerms[i]);
                    return {
                        found: true,
                        source: 'execution_logs',
                        term: agendamentoTerms[i],
                        nodeId: 'logs'
                    };
                }
            }
        }
        
        return {
            found: false,
            reason: 'nenhuma_mencao_agendamento_nos_logs'
        };
    } catch (error) {
        console.log('⚠️ Erro ao analisar logs:', error.message);
        return {
            found: false,
            reason: 'erro_ao_analisar_logs',
            error: error.message
        };
    }
}

/**
 * Função para encontrar nós específicos com certa profundidade de busca
 */
function findSpecificNodeTypes(execution, targetTypes) {
    var results = [];
    
    if (!execution.data?.resultData?.runData) {
        return results;
    }
    
    var runData = execution.data.resultData.runData;
    
    // Verificar cada nó
    for (var nodeId in runData) {
        var lowerNodeId = nodeId.toLowerCase();
        
        // Verificar se o nome do nó contém algum dos tipos alvo
        var matchedType = targetTypes.find(type => lowerNodeId.includes(type));
        
        if (matchedType) {
            var nodeData = runData[nodeId];
            if (isNodeExecuted(nodeData)) {
                results.push({
                    nodeId: nodeId,
                    type: matchedType,
                    executed: true,
                    data: nodeData[0].data.main
                });
            }
        }
    }
    
    return results;
}

/**
 * Função para analisar o fluxo de execução e detectar padrões de qualificação
 */
function analyzeExecutionFlow(execution) {
    if (!execution.data?.resultData?.runData) {
        return {
            isQualified: false,
            reason: 'sem_dados_de_execucao'
        };
    }
    
    var runData = execution.data.resultData.runData;
    var nodeOrder = execution.data.resultData.nodeExecutionOrder || [];
    
    // Verificar se há nós de sucesso executados após nós relacionados a agendamento
    var schedulingNodeIndex = -1;
    var successNodeIndices = [];
    
    // Mapear índices de nós relevantes na ordem de execução
    for (var i = 0; i < nodeOrder.length; i++) {
        var nodeId = nodeOrder[i];
        var lowerNodeId = nodeId.toLowerCase();
        
        // Verificar se é um nó relacionado a agendamento
        var isSchedulingNode = agendamentoTerms.some(term => lowerNodeId.includes(term));
        if (isSchedulingNode && schedulingNodeIndex === -1) {
            schedulingNodeIndex = i;
        }
        
        // Verificar se é um nó de sucesso
        var isSuccessNode = lowerNodeId.includes('success') || 
                           lowerNodeId.includes('confirm') || 
                           lowerNodeId.includes('ok');
        if (isSuccessNode) {
            successNodeIndices.push(i);
        }
    }
    
    // Verificar se há um nó de sucesso após um nó de agendamento
    if (schedulingNodeIndex !== -1 && 
        successNodeIndices.some(idx => idx > schedulingNodeIndex)) {
        return {
            isQualified: true,
            reason: 'fluxo_de_agendamento_seguido_por_sucesso',
            schedulingNodeId: nodeOrder[schedulingNodeIndex],
            successNodeId: nodeOrder[successNodeIndices.find(idx => idx > schedulingNodeIndex)]
        };
    }
    
    return {
        isQualified: false,
        reason: 'padrao_de_fluxo_nao_encontrado'
    };
}

/**
 * Nova função para verificar execuções focando exclusivamente no Worker Agendador e Data API
 * @param {Object} execution - Objeto de execução
 * @returns {Object} Resultado da verificação
 */
function checkWorkerAndDataApiExecution(execution) {
    // Registrar informações sobre a execução para diagnóstico
    const executionId = execution.id || 'unknown_id';
    
    console.log(`\n🔍 [LEAD-VALIDATION] Analisando execução #${executionId} para qualificação de lead`);
    
    if (!execution.data?.resultData?.runData) {
        console.log(`❌ [LEAD-VALIDATION] Execução #${executionId} não possui dados de execução`);
        return {
            isQualified: false,
            reason: 'sem_dados_de_execucao'
        };
    }
    
    var runData = execution.data.resultData.runData;
    var workerNodes = [];
    var dataApiNodes = [];
    var criteriosVerificados = 0;
    var criteriosAtendidos = 0;
    
    // Verificação completa de todos os nós e suas estruturas
    console.log(`\n🔬 [DEBUG] Estrutura completa da execução #${executionId}:`);
    for (const nodeId in runData) {
        console.log(`🔹 [DEBUG] Nó: ${nodeId}`);
        
        // Verificar se o nó tem execuções
        const nodeData = runData[nodeId];
        if (!Array.isArray(nodeData) || nodeData.length === 0) {
            console.log(`  ⚠️ [DEBUG] Nó sem dados de execução`);
            continue;
        }
        
        // Verificar cada execução do nó
        for (let execIndex = 0; execIndex < nodeData.length; execIndex++) {
            const execData = nodeData[execIndex];
            
            if (!execData?.data?.main) {
                console.log(`  ℹ️ [DEBUG] Execução #${execIndex} sem dados 'main'`);
                continue;
            }
            
            // Verificar se o nó tem conexão com ferramentas
            if (execData.data.ai_tool) {
                console.log(`  🛠️ [DEBUG] Nó tem conexão 'ai_tool' - possível uso de ferramentas`);
                
                // Analisar as ferramentas conectadas
                for (let toolIndex = 0; toolIndex < execData.data.ai_tool.length; toolIndex++) {
                    const toolItem = execData.data.ai_tool[toolIndex];
                    console.log(`    🔧 [DEBUG] Ferramenta conectada: ${JSON.stringify(toolItem)}`);
                    
                    // Verificar se a ferramenta é confirmar_agendamento
                    if (toolItem && 
                        (toolItem.name === 'confirmar_agendamento' || 
                         (typeof toolItem === 'string' && toolItem.includes('confirmar_agendamento')))) {
                        console.log(`    ✅ [DEBUG] ENCONTRADO: Ferramenta confirmar_agendamento conectada diretamente ao nó ${nodeId}`);
                        return {
                            isQualified: true,
                            source: 'tool_connection',
                            nodeId: nodeId,
                            details: {
                                message: `Ferramenta confirmar_agendamento conectada ao nó ${nodeId}`,
                                tool: 'confirmar_agendamento',
                                executionIndex: execIndex,
                                toolIndex: toolIndex
                            }
                        };
                    }
                }
            }
            
            // Verificar o conteúdo do nó para menções mais extensas
            const nodeContent = JSON.stringify(execData);
            if (nodeContent.includes('confirmar_agendamento')) {
                console.log(`  🔍 [DEBUG] Nó ${nodeId} contém menção a 'confirmar_agendamento' em sua estrutura`);
                
                // Extrair contexto ao redor da menção
                const startIndex = Math.max(0, nodeContent.indexOf('confirmar_agendamento') - 30);
                const endIndex = Math.min(nodeContent.length, nodeContent.indexOf('confirmar_agendamento') + 30);
                const context = nodeContent.substring(startIndex, endIndex);
                
                console.log(`  📝 [DEBUG] Contexto: ${context}`);
                
                // Verificar se parece ser uma chamada de ferramenta
                if (nodeContent.includes('"tool":"confirmar_agendamento"') || 
                    nodeContent.includes('"name":"confirmar_agendamento"') ||
                    nodeContent.includes('"action":"confirmar_agendamento"')) {
                    console.log(`  ✅ [DEBUG] ENCONTRADO: Referência direta à ferramenta confirmar_agendamento no nó ${nodeId}`);
                    return {
                        isQualified: true,
                        source: 'tool_reference',
                        nodeId: nodeId,
                        details: {
                            message: `Referência à ferramenta confirmar_agendamento encontrada no nó ${nodeId}`,
                            tool: 'confirmar_agendamento',
                            executionIndex: execIndex,
                            contexto: context
                        }
                    };
                }
            }
        }
    }
    
    console.log(`🔎 [LEAD-VALIDATION] Execução #${executionId} - ${Object.keys(runData).length} nós encontrados`);
    console.log(`📊 [LEAD-VALIDATION] Nós disponíveis: ${Object.keys(runData).join(', ')}`);
    
    // Identificar todos os nós Worker Agendador e Data API que foram executados
    for (var nodeId in runData) {
        var lowerNodeId = nodeId.toLowerCase();
        
        // Buscar nós Worker Agendador - AMPLIADA a busca para capturar mais variações
        if (nodeId === 'Worker Agendador' || // Busca exata
            lowerNodeId.includes('worker') && 
            (lowerNodeId.includes('agend') || lowerNodeId.includes('schedul') || 
             lowerNodeId.includes('agendador') || lowerNodeId.includes('agendar'))) {
            
            var nodeData = runData[nodeId];
            if (isNodeExecuted(nodeData)) {
                workerNodes.push({
                    nodeId: nodeId,
                    data: nodeData
                });
                console.log(`✓ [LEAD-VALIDATION] Nó Worker Agendador encontrado: ${nodeId} (com dados)`);
            } else {
                console.log(`⚠️ [LEAD-VALIDATION] Nó Worker Agendador sem dados: ${nodeId}`);
            }
        }
        
        // Buscar nós Data API
        if (lowerNodeId.includes('data') && lowerNodeId.includes('api')) {
            var nodeData = runData[nodeId];
            if (isNodeExecuted(nodeData)) {
                dataApiNodes.push({
                    nodeId: nodeId,
                    data: nodeData
                });
                console.log(`✓ [LEAD-VALIDATION] Nó Data API encontrado: ${nodeId} (com dados)`);
            } else {
                console.log(`⚠️ [LEAD-VALIDATION] Nó Data API sem dados: ${nodeId}`);
            }
        }
    }
    
    console.log(`📊 [LEAD-VALIDATION] Total: ${workerNodes.length} nós Worker Agendador e ${dataApiNodes.length} nós Data API executados`);
    
    // Verificar nós Worker Agendador para a ferramenta confirmar_agendamento
    for (var i = 0; i < workerNodes.length; i++) {
        var workerNode = workerNodes[i];
        console.log(`\n🔍 [LEAD-VALIDATION] Analisando nó Worker Agendador (${i+1}/${workerNodes.length}): ${workerNode.nodeId}`);
        
        var workerData = workerNode.data;
        var itemsVerificados = 0;
        
        // Verificar cada execução do nó Worker
        for (var j = 0; j < workerData.length; j++) {
            var executionData = workerData[j];
            
            if (!executionData?.data?.main || !Array.isArray(executionData.data.main)) {
                console.log(`⚠️ [LEAD-VALIDATION] Execução #${j} do nó ${workerNode.nodeId} não possui dados principais`);
                continue;
            }
            
            console.log(`📝 [LEAD-VALIDATION] Analisando execução #${j} do nó ${workerNode.nodeId} (${executionData.data.main.length} itens)`);
            
            // Verificar cada item nos dados principais
            for (var k = 0; k < executionData.data.main.length; k++) {
                var item = executionData.data.main[k];
                itemsVerificados++;
                criteriosVerificados++;
                
                // Verificar se tem referência direta à ferramenta confirmar_agendamento
                if (item && typeof item === 'object') {
                    // Log do objeto para análise detalhada
                    const itemKeys = Object.keys(item).join(', ');
                    console.log(`🔎 [LEAD-VALIDATION] Verificando item #${k}: propriedades disponíveis [${itemKeys}]`);
                    
                    // Critério 1: Verificação direta de tool, name ou action
                    if (
                        item.tool === 'confirmar_agendamento' ||
                        item.name === 'confirmar_agendamento' ||
                        item.action === 'confirmar_agendamento'
                    ) {
                        criteriosAtendidos++;
                        console.log(`✅ [LEAD-VALIDATION] CRITÉRIO ATENDIDO! Ferramenta confirmar_agendamento encontrada diretamente em ${workerNode.nodeId}`);
                        console.log(`📄 [LEAD-VALIDATION] Valor encontrado: ${item.tool || item.name || item.action}`);
                        return {
                            isQualified: true,
                            source: 'worker_agendador_tool',
                            nodeId: workerNode.nodeId,
                            details: {
                                message: 'Ferramenta confirmar_agendamento encontrada em Worker Agendador',
                                tool: 'confirmar_agendamento',
                                executionIndex: j,
                                itemIndex: k,
                                propriedade: item.tool ? 'tool' : (item.name ? 'name' : 'action')
                            }
                        };
                    }
                    
                    // Critério 2: Verificação em arrays de ferramentas
                    var toolArrays = ['tools', 'executedTools', 'actions'];
                    for (var l = 0; l < toolArrays.length; l++) {
                        var arrayName = toolArrays[l];
                        var toolArray = item[arrayName];
                        
                        if (Array.isArray(toolArray)) {
                            console.log(`🔎 [LEAD-VALIDATION] Verificando array ${arrayName} com ${toolArray.length} itens`);
                            
                            for (var m = 0; m < toolArray.length; m++) {
                                var tool = toolArray[m];
                                criteriosVerificados++;
                                
                                if (
                                    tool === 'confirmar_agendamento' ||
                                    (typeof tool === 'object' && tool.name === 'confirmar_agendamento') ||
                                    (typeof tool === 'object' && tool.action === 'confirmar_agendamento')
                                ) {
                                    criteriosAtendidos++;
                                    console.log(`✅ [LEAD-VALIDATION] CRITÉRIO ATENDIDO! Ferramenta confirmar_agendamento encontrada em array ${arrayName} do nó ${workerNode.nodeId}`);
                                    const toolValue = typeof tool === 'object' ? JSON.stringify(tool) : tool;
                                    console.log(`📄 [LEAD-VALIDATION] Valor encontrado: ${toolValue}`);
                                    return {
                                        isQualified: true,
                                        source: 'worker_agendador_array',
                                        nodeId: workerNode.nodeId,
                                        details: {
                                            message: `Ferramenta confirmar_agendamento encontrada em ${arrayName}`,
                                            array: arrayName,
                                            tool: 'confirmar_agendamento',
                                            executionIndex: j,
                                            itemIndex: k,
                                            arrayIndex: m,
                                            valorEncontrado: toolValue
                                        }
                                    };
                                }
                            }
                        }
                    }
                    
                    // Critério 3: Verificação em parâmetros
                    if (item.parameters) {
                        console.log(`🔎 [LEAD-VALIDATION] Verificando parameters: ${Object.keys(item.parameters).join(', ')}`);
                        criteriosVerificados++;
                        
                        if (item.parameters.tool === 'confirmar_agendamento') {
                            criteriosAtendidos++;
                            console.log(`✅ [LEAD-VALIDATION] CRITÉRIO ATENDIDO! Ferramenta confirmar_agendamento encontrada em parameters.tool do nó ${workerNode.nodeId}`);
                            return {
                                isQualified: true,
                                source: 'worker_agendador_parameters',
                                nodeId: workerNode.nodeId,
                                details: {
                                    message: 'Ferramenta confirmar_agendamento encontrada em parameters',
                                    tool: 'confirmar_agendamento',
                                    executionIndex: j,
                                    itemIndex: k
                                }
                            };
                        }
                        
                        // Verificar em parameters.tools se for array
                        if (Array.isArray(item.parameters.tools)) {
                            console.log(`🔎 [LEAD-VALIDATION] Verificando parameters.tools com ${item.parameters.tools.length} itens`);
                            
                            for (var n = 0; n < item.parameters.tools.length; n++) {
                                var paramTool = item.parameters.tools[n];
                                criteriosVerificados++;
                                
                                if (
                                    paramTool === 'confirmar_agendamento' ||
                                    (typeof paramTool === 'object' && paramTool.name === 'confirmar_agendamento')
                                ) {
                                    criteriosAtendidos++;
                                    const paramToolValue = typeof paramTool === 'object' ? JSON.stringify(paramTool) : paramTool;
                                    console.log(`✅ [LEAD-VALIDATION] CRITÉRIO ATENDIDO! Ferramenta confirmar_agendamento encontrada em parameters.tools do nó ${workerNode.nodeId}`);
                                    console.log(`📄 [LEAD-VALIDATION] Valor encontrado: ${paramToolValue}`);
                                    return {
                                        isQualified: true,
                                        source: 'worker_agendador_parameters_array',
                                        nodeId: workerNode.nodeId,
                                        details: {
                                            message: 'Ferramenta confirmar_agendamento encontrada em parameters.tools',
                                            tool: 'confirmar_agendamento',
                                            executionIndex: j,
                                            itemIndex: k,
                                            arrayIndex: n,
                                            valorEncontrado: paramToolValue
                                        }
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`📊 [LEAD-VALIDATION] Nó ${workerNode.nodeId}: ${itemsVerificados} itens verificados, nenhum critério atendido`);
    }
    
    // Se não encontrou no Worker Agendador, verificar nós Data API
    for (var i = 0; i < dataApiNodes.length; i++) {
        var dataApiNode = dataApiNodes[i];
        console.log(`\n🔍 [LEAD-VALIDATION] Analisando nó Data API (${i+1}/${dataApiNodes.length}): ${dataApiNode.nodeId}`);
        
        var dataApiData = dataApiNode.data;
        var itemsVerificados = 0;
        
        // Verificar cada execução do nó Data API
        for (var j = 0; j < dataApiData.length; j++) {
            var executionData = dataApiData[j];
            
            if (!executionData?.data?.main || !Array.isArray(executionData.data.main)) {
                console.log(`⚠️ [LEAD-VALIDATION] Execução #${j} do nó ${dataApiNode.nodeId} não possui dados principais`);
                continue;
            }
            
            console.log(`📝 [LEAD-VALIDATION] Analisando execução #${j} do nó ${dataApiNode.nodeId} (${executionData.data.main.length} itens)`);
            
            // Verificar cada item nos dados principais
            for (var k = 0; k < executionData.data.main.length; k++) {
                var item = executionData.data.main[k];
                itemsVerificados++;
                criteriosVerificados++;
                
                // Verificar se tem campos relacionados a agendamento
                if (item && typeof item === 'object') {
                    // Log do objeto para análise detalhada
                    const itemKeys = Object.keys(item).join(', ');
                    console.log(`🔎 [LEAD-VALIDATION] Verificando item #${k}: propriedades disponíveis [${itemKeys}]`);
                    
                    // Critério 5: Verificação de campos específicos que indicam confirmação de agendamento
                    if (
                        item.agendamento_confirmado === true ||
                        item.scheduling_confirmed === true ||
                        item.confirmed === true ||
                        item.data_agendamento ||
                        item.scheduling_date ||
                        item.appointment_date ||
                        item.horario_agendamento ||
                        item.scheduling_time ||
                        item.agendamento_id ||
                        item.scheduling_id
                    ) {
                        criteriosAtendidos++;
                        const campoEncontrado = Object.keys(item).find(key => 
                            ['agendamento_confirmado', 'scheduling_confirmed', 'confirmed',
                             'data_agendamento', 'scheduling_date', 'appointment_date',
                             'horario_agendamento', 'scheduling_time', 
                             'agendamento_id', 'scheduling_id'].includes(key));
                        
                        console.log(`✅ [LEAD-VALIDATION] CRITÉRIO ATENDIDO! Campo de agendamento "${campoEncontrado}" encontrado no Data API: ${dataApiNode.nodeId}`);
                        console.log(`📄 [LEAD-VALIDATION] Valor encontrado: ${JSON.stringify(item[campoEncontrado])}`);
                        
                        return {
                            isQualified: true,
                            source: 'data_api_fields',
                            nodeId: dataApiNode.nodeId,
                            details: {
                                message: `Campo de agendamento encontrado no Data API: ${campoEncontrado}`,
                                field: campoEncontrado,
                                value: item[campoEncontrado],
                                executionIndex: j,
                                itemIndex: k
                            }
                        };
                    }
                    
                    // Critério 6: Verificação de menções a agendamento no conteúdo
                    var itemStr = JSON.stringify(item).toLowerCase();
                    console.log(`🔎 [LEAD-VALIDATION] Verificando termos de agendamento no conteúdo Data API (${agendamentoTerms.length} termos)`);
                    
                    for (var o = 0; o < agendamentoTerms.length; o++) {
                        criteriosVerificados++;
                        
                        if (itemStr.includes(agendamentoTerms[o])) {
                            criteriosAtendidos++;
                            console.log(`✅ [LEAD-VALIDATION] CRITÉRIO ATENDIDO! Termo de agendamento '${agendamentoTerms[o]}' encontrado no conteúdo do Data API: ${dataApiNode.nodeId}`);
                            console.log(`📄 [LEAD-VALIDATION] Contexto do termo (trecho): ${itemStr.substring(Math.max(0, itemStr.indexOf(agendamentoTerms[o]) - 30), itemStr.indexOf(agendamentoTerms[o]) + 30)}`);
                            
                            // Mesmo processamento de contexto do Worker Node
                            let contexto = '';
                            try {
                                if (item.message && typeof item.message === 'string' && item.message.toLowerCase().includes(agendamentoTerms[o])) {
                                    contexto = `message: "${item.message}"`;
                                } else if (item.content && typeof item.content === 'string' && item.content.toLowerCase().includes(agendamentoTerms[o])) {
                                    contexto = `content: "${item.content}"`;
                                } else if (item.text && typeof item.text === 'string' && item.text.toLowerCase().includes(agendamentoTerms[o])) {
                                    contexto = `text: "${item.text}"`;
                                } else {
                                    contexto = `contexto genérico: termo encontrado em ${Object.keys(item).join(', ')}`;
                                }
                            } catch (e) {
                                contexto = 'Erro ao extrair contexto específico';
                            }
                            
                            return {
                                isQualified: true,
                                source: 'data_api_content',
                                nodeId: dataApiNode.nodeId,
                                term: agendamentoTerms[o],
                                details: {
                                    message: `Termo de agendamento encontrado: ${agendamentoTerms[o]}`,
                                    term: agendamentoTerms[o],
                                    executionIndex: j,
                                    itemIndex: k,
                                    contexto: contexto
                                }
                            };
                        }
                    }
                }
            }
        }
        
        console.log(`📊 [LEAD-VALIDATION] Nó ${dataApiNode.nodeId}: ${itemsVerificados} itens verificados, nenhum critério atendido`);
    }
    
    // Se não encontrou em nenhum nó específico, verificar qualquer outro nó Worker ou AI Agent
    for (var nodeId in runData) {
        if ((nodeId.toLowerCase().includes('worker') || 
             nodeId.toLowerCase().includes('ai') && nodeId.toLowerCase().includes('agent'))) {
            
            var nodeData = runData[nodeId];
            if (isNodeExecuted(nodeData)) {
                console.log(`✓ [LEAD-VALIDATION] Outro nó potencial encontrado: ${nodeId}`);
                
                // Processar dados do nó
                for (var j = 0; j < nodeData.length; j++) {
                    var executionData = nodeData[j];
                    
                    if (!executionData?.data?.main || !Array.isArray(executionData.data.main)) {
                        continue;
                    }
                    
                    // Analisar conteúdo para menções de agendamento
                    var nodeContent = JSON.stringify(executionData.data.main).toLowerCase();
                    for (var k = 0; k < agendamentoTerms.length; k++) {
                        criteriosVerificados++;
                        
                        if (nodeContent.includes(agendamentoTerms[k])) {
                            criteriosAtendidos++;
                            console.log(`✅ [LEAD-VALIDATION] CRITÉRIO ATENDIDO! Termo de agendamento '${agendamentoTerms[k]}' encontrado no nó genérico ${nodeId}`);
                            console.log(`📄 [LEAD-VALIDATION] Contexto do termo (trecho): ${nodeContent.substring(Math.max(0, nodeContent.indexOf(agendamentoTerms[k]) - 30), nodeContent.indexOf(agendamentoTerms[k]) + 30)}`);
                            
                            return {
                                isQualified: true,
                                source: 'other_node_content',
                                nodeId: nodeId,
                                term: agendamentoTerms[k],
                                details: {
                                    message: `Termo de agendamento encontrado: ${agendamentoTerms[k]}`,
                                    term: agendamentoTerms[k],
                                    contexto: nodeContent.substring(Math.max(0, nodeContent.indexOf(agendamentoTerms[k]) - 50), nodeContent.indexOf(agendamentoTerms[k]) + 50)
                                }
                            };
                        }
                    }
                }
            }
        }
    }
    
    console.log(`\n📊 [LEAD-VALIDATION] Resumo da análise para execução #${executionId}:`);
    console.log(`   - ${workerNodes.length} nós Worker Agendador analisados`);
    console.log(`   - ${dataApiNodes.length} nós Data API analisados`);
    console.log(`   - ${criteriosVerificados} critérios verificados`);
    console.log(`   - ${criteriosAtendidos} critérios atendidos`);
    console.log(`❌ [LEAD-VALIDATION] Lead NÃO QUALIFICADO: nenhum critério atendido em todos os nós verificados`);
    
    return {
        isQualified: false,
        reason: 'ferramenta_confirmar_agendamento_nao_encontrada',
        stats: {
            workerNodes: workerNodes.length,
            dataApiNodes: dataApiNodes.length,
            criteriosVerificados: criteriosVerificados,
            criteriosAtendidos: criteriosAtendidos
        }
    };
}

/**
 * Função especializada para verificar se a tool confirmar_agendamento foi acionada
 * @param {Object} execution - Objeto de execução
 * @returns {Object} Resultado da verificação
 */
function checkConfirmacaoAgendamentoTool(execution) {
    console.log(`\n🔍 [TOOL-CHECK] Iniciando verificação aprofundada da ferramenta confirmar_agendamento`);
    
    if (!execution?.data?.resultData?.runData) {
        return {
            isQualified: false,
            reason: 'sem_dados_de_execucao',
            nodeData: null
        };
    }
    
    const runData = execution.data.resultData.runData;
    let foundEvidence = [];
    let toolPatterns = [
        {pattern: '"tool":"confirmar_agendamento"', weight: 10},
        {pattern: '"name":"confirmar_agendamento"', weight: 10},
        {pattern: '"action":"confirmar_agendamento"', weight: 10},
        {pattern: 'confirmar_agendamento', weight: 5},
        {pattern: 'confirmaragendamento', weight: 5}
    ];
    
    // Novo: Mapear ordem de execução dos nós
    const nodeOrder = execution.data.resultData.nodeExecutionOrder || [];
    let nodeExecutionMap = {};
    nodeOrder.forEach((nodeId, index) => {
        nodeExecutionMap[nodeId] = index;
    });
    
    // Função auxiliar para calcular score baseado no tipo de nó
    function calculateNodeScore(nodeId, baseScore) {
        const lowerNodeId = nodeId.toLowerCase();
        let multiplier = 1;
        
        if (lowerNodeId.includes('worker') && lowerNodeId.includes('agend')) {
            multiplier = 2; // Maior peso para Worker Agendador
        } else if (lowerNodeId.includes('ai agent')) {
            multiplier = 1.5; // Peso intermediário para AI Agent
        }
        
        return baseScore * multiplier;
    }
    
    // Novo: Verificar conexões entre nós
    function analyzeNodeConnections(nodeId, runData) {
        const connections = [];
        const nodeData = runData[nodeId];
        
        if (!nodeData || !Array.isArray(nodeData)) return connections;
        
        nodeData.forEach(execution => {
            if (execution?.data?.main) {
                const mainData = JSON.stringify(execution.data.main);
                // Procurar por referências a outros nós
                Object.keys(runData).forEach(otherNodeId => {
                    if (nodeId !== otherNodeId && mainData.includes(otherNodeId)) {
                        connections.push(otherNodeId);
                    }
                });
            }
        });
        
        return [...new Set(connections)]; // Remove duplicatas
    }
    
    let highestScore = 0;
    let bestEvidence = null;
    
    // Análise principal dos nós
    for (const nodeId in runData) {
        console.log(`\n🔍 [TOOL-CHECK] Analisando nó: ${nodeId}`);
        
        const nodeData = runData[nodeId];
        if (!Array.isArray(nodeData) || nodeData.length === 0) continue;
        
        const connections = analyzeNodeConnections(nodeId, runData);
        console.log(`📊 [TOOL-CHECK] Conexões encontradas para ${nodeId}: ${connections.join(', ')}`);
        
        let nodeScore = 0;
        let nodeEvidence = [];
        
        // Verificar cada execução do nó
        nodeData.forEach((execution, execIndex) => {
            if (!execution?.data) return;
            
            // Novo: Verificar ferramentas conectadas
            if (execution.data.ai_tool) {
                const toolsStr = JSON.stringify(execution.data.ai_tool);
                toolPatterns.forEach(({pattern, weight}) => {
                    if (toolsStr.includes(pattern)) {
                        const score = calculateNodeScore(nodeId, weight);
                        nodeScore += score;
                        nodeEvidence.push({
                            type: 'ai_tool_connection',
                            pattern,
                            score,
                            location: `${nodeId}.ai_tool`,
                            executionIndex: execIndex
                        });
                    }
                });
            }
            
            // Verificar dados principais
            if (execution.data.main) {
                const mainData = JSON.stringify(execution.data.main);
                toolPatterns.forEach(({pattern, weight}) => {
                    if (mainData.includes(pattern)) {
                        const score = calculateNodeScore(nodeId, weight);
                        nodeScore += score;
                        
                        // Extrair contexto
                        const patternIndex = mainData.indexOf(pattern);
                        const context = mainData.substring(
                            Math.max(0, patternIndex - 50),
                            Math.min(mainData.length, patternIndex + 50)
                        );
                        
                        nodeEvidence.push({
                            type: 'main_data',
                            pattern,
                            score,
                            location: `${nodeId}.main`,
                            executionIndex: execIndex,
                            context
                        });
                    }
                });
            }
        });
        
        // Bônus por conexões relevantes
        connections.forEach(connectedNode => {
            if (connectedNode.toLowerCase().includes('worker') || 
                connectedNode.toLowerCase().includes('agent')) {
                nodeScore += 2;
                nodeEvidence.push({
                    type: 'connection',
                    connectedNode,
                    score: 2
                });
            }
        });
        
        // Bônus por posição na ordem de execução
        if (nodeExecutionMap[nodeId] !== undefined) {
            const positionScore = Math.max(0, 5 - nodeExecutionMap[nodeId]); // Maior score para nós executados primeiro
            nodeScore += positionScore;
            nodeEvidence.push({
                type: 'execution_order',
                position: nodeExecutionMap[nodeId],
                score: positionScore
            });
        }
        
        if (nodeScore > 0) {
            console.log(`✨ [TOOL-CHECK] Evidências encontradas em ${nodeId} - Score: ${nodeScore}`);
            foundEvidence.push({
                nodeId,
                score: nodeScore,
                evidence: nodeEvidence
            });
            
            if (nodeScore > highestScore) {
                highestScore = nodeScore;
                bestEvidence = {
                    nodeId,
                    score: nodeScore,
                    evidence: nodeEvidence
                };
            }
        }
    }
    
    // Determinar resultado final
    const QUALIFICATION_THRESHOLD = 10; // Ajustar conforme necessário
    
    if (highestScore >= QUALIFICATION_THRESHOLD) {
        console.log(`✅ [TOOL-CHECK] Lead QUALIFICADO - Score total: ${highestScore}`);
        console.log(`📊 [TOOL-CHECK] Melhor evidência encontrada em: ${bestEvidence.nodeId}`);
        
        return {
            isQualified: true,
            score: highestScore,
            nodeId: bestEvidence.nodeId,
            evidence: bestEvidence.evidence,
            allEvidence: foundEvidence,
            source: 'enhanced_tool_check',
            details: {
                threshold: QUALIFICATION_THRESHOLD,
                totalEvidenceCount: foundEvidence.length,
                nodeConnections: analyzeNodeConnections(bestEvidence.nodeId, runData),
                executionOrder: nodeExecutionMap[bestEvidence.nodeId]
            }
        };
    }
    
    console.log(`❌ [TOOL-CHECK] Lead NÃO QUALIFICADO - Score máximo (${highestScore}) abaixo do threshold (${QUALIFICATION_THRESHOLD})`);
    
    return {
        isQualified: false,
        reason: 'score_insuficiente',
        score: highestScore,
        evidence: foundEvidence,
        threshold: QUALIFICATION_THRESHOLD
    };
}

/**
 * Detecta se um lead é qualificado baseado na análise dos nós de execução
 * @param {Object} execution - Objeto de execução
 * @returns {Object} - Resultado da detecção com detalhes
 */
function detectQualifiedLead(execution) {
    console.log(`\n🔍 [LEAD-DETECTION] Iniciando análise de qualificação de lead...`);
    
    // Estratégia 0 (Prioritária): Verificação aprimorada da ferramenta confirmar_agendamento
    const enhancedToolCheck = checkConfirmacaoAgendamentoTool(execution);
    if (enhancedToolCheck.isQualified) {
        console.log(`✅ [LEAD-DETECTION] Lead QUALIFICADO via verificação aprimorada da ferramenta`);
        console.log(`📊 [LEAD-DETECTION] Score: ${enhancedToolCheck.score}, Nó: ${enhancedToolCheck.nodeId}`);
        
        // Registrar evidências encontradas
        if (enhancedToolCheck.evidence) {
            console.log(`\n📝 [LEAD-DETECTION] Evidências encontradas:`);
            enhancedToolCheck.evidence.forEach((ev, index) => {
                console.log(`${index + 1}. Tipo: ${ev.type}, Score: ${ev.score}`);
                if (ev.context) {
                    console.log(`   Contexto: ${ev.context}`);
                }
            });
        }
        
        return {
            isQualified: true,
            method: 'enhanced_tool_check',
            reason: 'ferramenta_confirmar_agendamento_detectada',
            score: enhancedToolCheck.score,
            source: enhancedToolCheck.source,
            details: {
                ...enhancedToolCheck,
                qualification_type: 'ferramenta_direta'
            }
        };
    }
    
    // Estratégia 1: Verificação do Worker Agendador
    const workerResult = checkWorkerAndDataApiExecution(execution);
    if (workerResult.isQualified) {
        console.log(`✅ [LEAD-DETECTION] Lead QUALIFICADO via análise de Worker/Data API`);
        return {
            isQualified: true,
            method: 'worker_data_check',
            reason: 'evidencia_agendamento_worker_data',
            source: workerResult.source,
            details: {
                ...workerResult,
                qualification_type: 'evidencia_indireta'
            }
        };
    }
    
    // Log detalhado caso nenhuma estratégia tenha funcionado
    console.log(`\n❌ [LEAD-DETECTION] Lead NÃO QUALIFICADO`);
    console.log(`📊 [LEAD-DETECTION] Resultados das verificações:`);
    console.log(`- Verificação aprimorada: score ${enhancedToolCheck.score || 0} (threshold: ${enhancedToolCheck.threshold || 'N/A'})`);
    console.log(`- Verificação Worker/Data: ${workerResult.reason || 'sem_evidencias'}`);
    
    return {
        isQualified: false,
        method: 'no_qualification',
        reason: 'nenhum_criterio_atendido',
        details: {
            enhancedToolCheck,
            workerResult,
            message: 'Nenhuma evidência suficiente de qualificação encontrada'
        }
    };
}

/**
 * Função melhorada para encontrar confirmação de agendamento dentro do Worker Agendador
 */
function findConfirmationNode(execution) {
    if (!execution.data?.resultData?.runData) {
        return {
            executed: false,
            reason: 'sem_dados_de_execucao',
            nodeData: null
        };
    }
    
    var runData = execution.data.resultData.runData;
    
    // Mostrar todos os nós disponíveis para debug
    console.log('🔎 Nós disponíveis na execução:', Object.keys(runData).join(', '));
    
    // Primeiro, vamos verificar nós com nome "Worker" ou "Agendador"
    var workerNodes = [];
    for (var nodeId in runData) {
        var lowerNodeId = nodeId.toLowerCase();
        if (lowerNodeId.includes('worker') || 
            lowerNodeId.includes('agend') || 
            lowerNodeId.includes('schedul') || 
            lowerNodeId.includes('book')) {
            workerNodes.push(nodeId);
        }
    }
    
    console.log('🔍 Nós relacionados a agendamento:', workerNodes.join(', '));
    
    // Procurar em cada nó candidato
    for (var i = 0; i < workerNodes.length; i++) {
        var nodeId = workerNodes[i];
        console.log('🔍 Analisando nó:', nodeId);
        
        var nodeData = runData[nodeId];
        if (!nodeData || !Array.isArray(nodeData) || nodeData.length === 0) {
            continue;
        }
        
        // Verificar os dados do worker
        for (var j = 0; j < nodeData.length; j++) {
            var executionData = nodeData[j];
            
            // Verificar se há dados da execução
            if (!executionData?.data?.main || !Array.isArray(executionData.data.main)) {
                continue;
            }
            
            // Log detalhado dos dados do worker para debug
            console.log('🔍 Dados do nó:', nodeId);
            
            // Verificar cada item nos dados principais
            for (var k = 0; k < executionData.data.main.length; k++) {
                var item = executionData.data.main[k];
                
                // Verificar se há informações sobre a tool confirmar_agendamento
                if (item && typeof item === 'object') {
                    // Converter todo o objeto para string e buscar palavras-chave
                    var itemStr = JSON.stringify(item).toLowerCase();
                    var hasSchedulingKeyword = agendamentoTerms.some(term => itemStr.includes(term));
                    
                    if (hasSchedulingKeyword) {
                        console.log('✅ Confirmação encontrada no nó', nodeId, 'pelo conteúdo:', item);
                        return {
                            executed: true,
                            nodeId: nodeId,
                            nodeData: item,
                            matchType: 'content_keyword',
                            details: {
                                executionIndex: j,
                                itemIndex: k,
                                item: item
                            }
                        };
                    }
                    
                    // Verificar diferentes possibilidades de confirmação
                    if (
                        // Verificar se a tool confirmar_agendamento foi executada
                        (item.tool === 'confirmar_agendamento') ||
                        (item.name === 'confirmar_agendamento') ||
                        // Verificar status de agendamento
                        (item.status && ['agendado', 'confirmado', 'scheduled', 'confirmed'].includes(item.status.toLowerCase())) ||
                        // Verificar campos específicos de agendamento
                        item.agendamento_confirmado === true ||
                        item.scheduling_confirmed === true ||
                        item.confirmed === true ||
                        // Verificar se há data de agendamento
                        item.data_agendamento ||
                        item.scheduling_date ||
                        item.appointment_date ||
                        // Verificar mensagem de confirmação
                        (item.message && item.message.toLowerCase().includes('agendamento confirmado')) ||
                        // Verificar resultado da tool
                        (item.result && item.result.toLowerCase().includes('agendamento')) ||
                        // Verificar campos específicos do worker
                        (item.action === 'confirmar_agendamento') ||
                        (item.type === 'scheduling_confirmation') ||
                        // Verificar se há horário de agendamento
                        item.horario_agendamento ||
                        item.scheduling_time ||
                        // Verificar se há ID de agendamento
                        item.agendamento_id ||
                        item.scheduling_id
                    ) {
                        console.log('✅ Confirmação encontrada no nó:', nodeId);
                        
                        return {
                            executed: true,
                            nodeId: nodeId,
                            nodeData: item,
                            matchType: 'field_match',
                            details: {
                                executionIndex: j,
                                itemIndex: k,
                                confirmationType: item.tool || item.action || 'status_check',
                                status: item.status || 'confirmed',
                                timestamp: item.timestamp || new Date().toISOString(),
                                data_agendamento: item.data_agendamento || item.scheduling_date || null,
                                horario: item.horario_agendamento || item.scheduling_time || null
                            }
                        };
                    }
                }
            }
        }
    }
    
    return {
        executed: false,
        reason: 'confirmacao_nao_encontrada',
        nodeData: null
    };
}

/**
 * Função otimizada para verificar se um nó foi executado e extrair dados relevantes
 */
function checkNodeExecution(execution, targetNode) {
    if (!execution.data?.resultData?.runData) {
        return {
            executed: false,
            reason: 'sem_dados_de_execucao',
            nodeData: null
        };
    }
    
    var runData = execution.data.resultData.runData;
    var normalizedTargetNode = targetNode.toLowerCase().replace(/\s+/g, '_');
    
    // Procurar o nó exato primeiro
    for (var nodeId in runData) {
        var normalizedNodeId = nodeId.toLowerCase().replace(/\s+/g, '_');
        
        if (normalizedNodeId === normalizedTargetNode) {
            var nodeData = runData[nodeId];
            if (isNodeExecuted(nodeData)) {
                return {
                    executed: true,
                    nodeId: nodeId,
                    nodeData: nodeData[0].data.main,
                    matchType: 'exact'
                };
            }
        }
    }
    
    return {
        executed: false,
        reason: 'no_nao_encontrado',
        nodeData: null
    };
}

/**
 * Função melhorada para extrair e validar números de telefone
 * @param {Object} execution - Objeto da execução
 * @returns {Set} Conjunto de números de telefone válidos
 */
function extractValidPhoneNumbers(execution) {
    var phoneNumbers = new Set();
    
    if (!execution.data?.resultData?.runData) {
        return phoneNumbers;
    }
    
    var runData = execution.data.resultData.runData;
    
    // Função auxiliar para processar dados recursivamente
    function processData(data, depth = 0, path = '') {
        if (depth > 10) return; // Evitar recursão infinita
        
        if (!data) return;
        
        if (typeof data === 'string') {
            var cleanPhone = validateAndFormatPhone(data);
            if (cleanPhone) {
                phoneNumbers.add(cleanPhone);
                console.log(`📱 Número encontrado em ${path}: ${cleanPhone}`);
            }
            return;
        }
        
        if (Array.isArray(data)) {
            data.forEach((item, index) => {
                processData(item, depth + 1, `${path}[${index}]`);
            });
            return;
        }
        
        if (typeof data === 'object') {
            Object.keys(data).forEach(key => {
                // Campos prioritários que provavelmente contêm números
                var priorityFields = [
                    'remotejid', 'remoteJid', 'remote_jid',
                    'phone', 'phoneNumber', 'phone_number',
                    'whatsapp', 'whatsappNumber', 'whatsapp_number',
                    'contact', 'contactNumber', 'contact_number',
                    'numero', 'number', 'telefone', 'celular', 'mobile'
                ];
                
                if (priorityFields.includes(key.toLowerCase())) {
                    var cleanPhone = validateAndFormatPhone(data[key]);
                    if (cleanPhone) {
                        phoneNumbers.add(cleanPhone);
                        console.log(`📱 Número prioritário encontrado em ${path}.${key}: ${cleanPhone}`);
                    }
                }
                
                processData(data[key], depth + 1, `${path}.${key}`);
            });
        }
    }
    
    // Processar cada nó do workflow
    for (var nodeId in runData) {
        var nodeData = runData[nodeId];
        if (!nodeData || !Array.isArray(nodeData)) continue;
        
        // Processar cada execução do nó
        nodeData.forEach((execution, execIndex) => {
            if (!execution?.data?.main) return;
            
            execution.data.main.forEach((item, itemIndex) => {
                processData(item, 0, `${nodeId}[${execIndex}].main[${itemIndex}]`);
            });
        });
    }
    
    return phoneNumbers;
}

/**
 * Função para validar e formatar números de telefone
 * @param {string} phone - Número de telefone a ser validado
 * @returns {string|null} Número formatado ou null se inválido
 */
function validateAndFormatPhone(phone) {
    if (!phone) return null;
    
    // Converter para string e remover caracteres não numéricos
    var digits = phone.toString().replace(/\D/g, '');
    
    // Regras de validação para números brasileiros
    if (digits.length >= 10 && digits.length <= 13) {
        // Remover 0 à esquerda do DDD se existir
        if (digits.length === 11 && digits.startsWith('0')) {
            digits = digits.substring(1);
        }
        
        // Se já começa com 55 e tem 12-13 dígitos
        if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
            // Validar DDD (10-99)
            var ddd = parseInt(digits.substring(2, 4));
            if (ddd >= 10 && ddd <= 99) {
                return digits;
            }
        }
        // Se tem 10-11 dígitos (sem DDI), adicionar 55
        else if (digits.length === 10 || digits.length === 11) {
            // Validar DDD (10-99)
            var ddd = parseInt(digits.substring(0, 2));
            if (ddd >= 10 && ddd <= 99) {
                return '55' + digits;
            }
        }
    }
    
    return null;
}

/**
 * Função principal para extrair métricas
 */
function extractLeadMetrics(executions) {
    // Criar uma data limite para filtrar execuções
    var dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - lookbackDays);
    
    // Filtrar execuções recentes
    var recentExecutions = executions.filter(function(exec) {
        var execDate = new Date(exec.startedAt || exec.stoppedAt || exec.createdAt);
        return execDate >= dateLimit;
    });
    
    // Contadores
    var capturedLeads = 0;
    var qualifiedLeads = 0;
    var unqualifiedLeads = 0;
    var failedExecutions = 0;
    
    // Rastreamento
    var capturedLeadExecutions = [];
    var qualifiedLeadExecutions = [];
    var unqualLeadExecutions = [];
    
    // Mapa para rastrear nós encontrados
    var nodesFound = {
        getUsers: {},
        confirmation: {}
    };
    
    // Conjunto para números de telefone únicos
    var uniquePhones = new Set();
    
    // Rastreamento de métodos de qualificação usados
    var qualificationMethods = {};
    
    // Estatísticas detalhadas para diagnóstico
    var qualificationStats = {
        total_attempts: 0,
        successful_qualifications: 0,
        qualification_by_method: {},
        qualification_by_node: {},
        terms_found: {},
        criterios_atendidos: {
            worker_agendador_tool: 0,
            worker_agendador_array: 0,
            worker_agendador_parameters: 0,
            worker_agendador_content: 0,
            data_api_fields: 0,
            data_api_content: 0,
            other_node_content: 0
        },
        termos_qualificacao: {},
        contextos_encontrados: []
    };
    
    // Processar cada execução
    for (var i = 0; i < recentExecutions.length; i++) {
        var execution = recentExecutions[i];
        
        // Log de progresso
        if (i % 20 === 0) {
            console.log('⏳ Processando execução ' + (i + 1) + '/' + recentExecutions.length);
        }
        
        var isSuccessful = execution.status === 'success' || execution.finished === true;
        
        if (isSuccessful) {
            // Verificar se é um lead capturado (passou pelo Get Users)
            var getUsersResult = checkNodeExecution(execution, 'Get Users');
            
            if (getUsersResult.executed) {
                capturedLeads++;
                capturedLeadExecutions.push(execution.id);
                
                // Rastrear nó Get Users
                nodesFound.getUsers[getUsersResult.nodeId] = 
                    (nodesFound.getUsers[getUsersResult.nodeId] || 0) + 1;
                
                // Incrementar contador de tentativas de qualificação
                qualificationStats.total_attempts++;
                
                // Verificar se é um lead qualificado usando a estratégia avançada
                var qualificationResult = detectQualifiedLead(execution);
                
                if (qualificationResult.isQualified) {
                    qualifiedLeads++;
                    qualificationStats.successful_qualifications++;
                    
                    // Rastrear método de qualificação usado
                    qualificationMethods[qualificationResult.method] = 
                        (qualificationMethods[qualificationResult.method] || 0) + 1;
                    
                    // Atualizar estatísticas detalhadas
                    qualificationStats.qualification_by_method[qualificationResult.method] = 
                        (qualificationStats.qualification_by_method[qualificationResult.method] || 0) + 1;
                    
                    // Rastrear nó de confirmação
                    if (qualificationResult.details && qualificationResult.details.nodeId) {
                        nodesFound.confirmation[qualificationResult.details.nodeId] = 
                            (nodesFound.confirmation[qualificationResult.details.nodeId] || 0) + 1;
                        
                        qualificationStats.qualification_by_node[qualificationResult.details.nodeId] = 
                            (qualificationStats.qualification_by_node[qualificationResult.details.nodeId] || 0) + 1;
                    }
                    
                    // Rastrear termos encontrados
                    if (qualificationResult.details && qualificationResult.details.term) {
                        const term = qualificationResult.details.term;
                        qualificationStats.terms_found[term] = 
                            (qualificationStats.terms_found[term] || 0) + 1;
                        
                        qualificationStats.termos_qualificacao[term] = 
                            (qualificationStats.termos_qualificacao[term] || 0) + 1;
                    }
                    
                    // Novo: rastrear critério específico
                    if (qualificationResult.details && qualificationResult.details.source) {
                        qualificationStats.criterios_atendidos[qualificationResult.details.source] =
                            (qualificationStats.criterios_atendidos[qualificationResult.details.source] || 0) + 1;
                    } else if (qualificationResult.source) {
                        qualificationStats.criterios_atendidos[qualificationResult.source] =
                            (qualificationStats.criterios_atendidos[qualificationResult.source] || 0) + 1;
                    }
                    
                    // Novo: salvar contexto para análise
                    if (qualificationResult.details && qualificationResult.details.contexto) {
                        // Limitar a 50 contextos para não sobrecarregar
                        if (qualificationStats.contextos_encontrados.length < 50) {
                            qualificationStats.contextos_encontrados.push({
                                executionId: execution.id,
                                contexto: qualificationResult.details.contexto,
                                termo: qualificationResult.details.term,
                                source: qualificationResult.details.source || qualificationResult.source
                            });
                        }
                    }
                    
                    qualifiedLeadExecutions.push({
                        executionId: execution.id,
                        getUsersNode: getUsersResult.nodeId,
                        confirmationDetails: qualificationResult
                    });
                    
                    console.log('✅ Execução ' + execution.id + ' QUALIFICADA - método: ' + 
                              qualificationResult.method + ', detalhes disponíveis');
                } else {
                    unqualifiedLeads++;
                    unqualLeadExecutions.push({
                        executionId: execution.id,
                        getUsersNode: getUsersResult.nodeId,
                        reason: qualificationResult.reason
                    });
                    console.log('❌ Execução ' + execution.id + ' NÃO QUALIFICADA - ' + qualificationResult.reason);
                }
                
                // Extrair números de telefone válidos
                var phones = extractValidPhoneNumbers(execution);
                phones.forEach(function(phone) {
                    uniquePhones.add(phone);
                });
            }
        } else {
            failedExecutions++;
            console.log('⚠️ Execução ' + execution.id + ' falhou com status: ' + execution.status);
        }
    }
    
    // Calcular taxa de conversão
    var conversionRate = capturedLeads > 0 ? (qualifiedLeads / capturedLeads) * 100 : 0;
    
    // Preparar relatórios de nós encontrados
    var getUsersNodesReport = [];
    Object.keys(nodesFound.getUsers).forEach(function(nodeName) {
        getUsersNodesReport.push({
            nodeName: nodeName,
            count: nodesFound.getUsers[nodeName]
        });
    });
    
    var confirmationNodesReport = [];
    Object.keys(nodesFound.confirmation).forEach(function(nodeName) {
        confirmationNodesReport.push({
            nodeName: nodeName,
            count: nodesFound.confirmation[nodeName]
        });
    });
    
    // Log final detalhado
    console.log('\n📊 Relatório Final de Métricas');
    console.log('--------------------------------');
    console.log('📈 Execuções analisadas: ' + recentExecutions.length);
    console.log('🔢 Leads capturados (Get Users): ' + capturedLeads);
    console.log('🎯 Leads qualificados: ' + qualifiedLeads);
    console.log('📉 Leads não qualificados: ' + unqualifiedLeads);
    console.log('📊 Taxa de conversão: ' + conversionRate.toFixed(2) + '%');
    console.log('📱 Números únicos encontrados: ' + uniquePhones.size);
    
    // Log de métodos de qualificação
    console.log('\n🔍 Métodos de qualificação utilizados:');
    Object.keys(qualificationMethods).forEach(function(method) {
        console.log('- ' + method + ': ' + qualificationMethods[method] + ' leads');
    });
    
    // Log de critérios específicos
    console.log('\n🔍 Critérios específicos de qualificação:');
    Object.keys(qualificationStats.criterios_atendidos).forEach(function(criterio) {
        if (qualificationStats.criterios_atendidos[criterio] > 0) {
            console.log('- ' + criterio + ': ' + qualificationStats.criterios_atendidos[criterio] + ' leads');
        }
    });
    
    // Log de termos específicos que geraram qualificação
    console.log('\n🔤 Top 10 termos que geraram qualificação:');
    Object.entries(qualificationStats.termos_qualificacao)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([termo, count]) => {
            console.log(`- "${termo}": ${count} ocorrências`);
        });
    
    // Log de nós encontrados
    if (getUsersNodesReport.length > 0) {
        console.log('\n🔍 Nós Get Users encontrados:');
        getUsersNodesReport.forEach(function(node) {
            console.log('- ' + node.nodeName + ': ' + node.count + ' execuções');
        });
    }
    
    if (confirmationNodesReport.length > 0) {
        console.log('\n✓ Nós de Confirmação encontrados:');
        confirmationNodesReport.forEach(function(node) {
            console.log('- ' + node.nodeName + ': ' + node.count + ' execuções');
        });
    }
    
    // Adicionar log para estatísticas de termos encontrados
    if (Object.keys(qualificationStats.terms_found).length > 0) {
        console.log('\n🔤 Termos de agendamento encontrados:');
        Object.keys(qualificationStats.terms_found).forEach(function(term) {
            console.log('- ' + term + ': ' + qualificationStats.terms_found[term] + ' ocorrências');
        });
    }
    
    // Converter Set para Array
    var phoneArray = Array.from(uniquePhones).sort();
    
    console.log('⚙️ Estatísticas de qualificação:', JSON.stringify(qualificationStats, null, 2));
    
    // Enriquecer o objeto de retorno com estatísticas detalhadas
    return {
        recentExecutions: recentExecutions.length,
        totalLeadsCaptured: capturedLeads,
        qualifiedLeads: qualifiedLeads,
        unqualifiedLeads: unqualifiedLeads,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        uniquePhoneNumbers: phoneArray.length,
        phoneNumbers: phoneArray,
        getUsersNodes: getUsersNodesReport,
        confirmationNodes: confirmationNodesReport,
        qualificationMethods: qualificationMethods,
        qualificationStats: {
            methods: qualificationMethods,
            nodes: confirmationNodesReport,
            terms: qualificationStats.terms_found,
            criterios: qualificationStats.criterios_atendidos,
            termos_qualificacao: qualificationStats.termos_qualificacao,
            amostra_contextos: qualificationStats.contextos_encontrados.slice(0, 10),
            details: qualificationStats
        },
        hasMainAgentTag: hasMainAgentTag,
        flowDisplayName: workflow.workflows[0].name,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
    };
}

// Extrair métricas
var metrics = extractLeadMetrics(executions);

// Construir tags array
var tagsArray = [];
if (Array.isArray(workflow.workflows[0].tags)) {
    for (var t = 0; t < workflow.workflows[0].tags.length; t++) {
        var tag = workflow.workflows[0].tags[t];
        tagsArray.push(typeof tag === 'string' ? tag : tag.name);
    }
}

// Retornar objeto final
return {
    json: {
        date: todayStr,
        workflow_id: workflow.workflows[0].id,
        workflow_name: workflow.workflows[0].name,
        tags: tagsArray,
        total_leads: metrics.totalLeadsCaptured,
        qualified_leads: metrics.qualifiedLeads,
        unqualified_leads: metrics.unqualifiedLeads,
        conversion_rate: metrics.conversionRate,
        source: 'get_users',
        campaign: workflow.workflows[0].name,
        source_breakdown: null,
        stage_distribution: null,
        get_users_nodes: JSON.stringify(metrics.getUsersNodes),
        confirmation_nodes: JSON.stringify(metrics.confirmationNodes),
        qualification_methods: JSON.stringify(metrics.qualificationMethods),
        remote_jids: JSON.stringify(metrics.phoneNumbers),
        unique_leads_count: metrics.uniquePhoneNumbers,
        metadata: JSON.stringify(metrics)
    }
};

// Fim do código
// Versão 3.0 - Melhorias:
// 1. Análise profunda do nó Worker Agendador para encontrar a ferramenta confirmar_agendamento
// 2. Busca hierárquica em objetos JSON para encontrar evidências de confirmação
// 3. Sistema de pontuação para avaliar a força das evidências encontradas
// 4. Múltiplas estratégias de detecção de leads qualificados
// 5. Extração e validação robusta de números de telefone
// 6. Estatísticas detalhadas sobre métodos de qualificação utilizados
// 7. Logs detalhados para facilitar o diagnóstico
// 8. REMOVIDO: Todas as referências a HTTP Request como fonte de qualificação
// 9. FOCO EXCLUSIVO: Worker Agendador e Data API para buscar evidências de confirmação de agendamento
// 10. PRIORIDADE: Detecção da ferramenta confirmar_agendamento em qualquer contexto 

/**
 * Versão 4.0 - Melhorias Implementadas (Março 2024)
 * 
 * 1. Sistema de Pontuação (Scoring)
 * - Implementado sistema de pontuação ponderada para qualificação de leads
 * - Diferentes pesos para diferentes tipos de evidência
 * - Bônus para nós específicos (Worker Agendador, AI Agent)
 * - Consideração da ordem de execução dos nós
 * 
 * 2. Análise de Conexões
 * - Mapeamento de conexões entre nós
 * - Identificação de fluxos de execução relevantes
 * - Bônus para conexões com nós importantes
 * 
 * 3. Detecção Aprimorada
 * - Busca profunda pela ferramenta confirmar_agendamento
 * - Múltiplos padrões de detecção com pesos diferentes
 * - Análise de contexto ao redor das evidências
 * 
 * 4. Logging Detalhado
 * - Logs estruturados por categoria
 * - Rastreamento de scores e evidências
 * - Diagnóstico completo em caso de não qualificação
 * 
 * 5. Priorização de Estratégias
 * - Verificação aprimorada da ferramenta como estratégia principal
 * - Fallback para análise de Worker/Data API
 * - Eliminação de verificações redundantes
 * 
 * 6. Estrutura de Retorno Enriquecida
 * - Inclusão de scores e thresholds
 * - Detalhamento completo das evidências encontradas
 * - Classificação do tipo de qualificação (direta/indireta)
 * 
 * Estas melhorias visam:
 * - Aumentar a precisão na detecção da ferramenta confirmar_agendamento
 * - Reduzir falsos positivos através do sistema de pontuação
 * - Fornecer mais contexto para análise e debugging
 * - Facilitar a manutenção e evolução do código
 */