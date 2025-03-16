const fs = require("fs"); const workflow = JSON.parse(fs.readFileSync("workflow.json", "utf8")); const sendErrorAlertNode = workflow.nodes.find(node => node.name === "Send Error Alert1"); if (sendErrorAlertNode) { sendErrorAlertNode.type = "n8n-nodes-base.code"; sendErrorAlertNode.typeVersion = 1; sendErrorAlertNode.parameters = { jsCode: "// Registrar erro no log
console.log(`❌ ERRO: Falha na sincronização de métricas para o workflow ${$json.workflow}`);
console.log(`Origem do erro: ${$json.errorSource}`);
console.log(`Detalhes: ${$json.errorDetails}`);
console.log(`Timestamp: ${$json.timestamp}`);

// Manter os mesmos dados para compatibilidade com o restante do fluxo
return { json: $json };" }; sendErrorAlertNode.name = "Log Error1"; for (const [nodeId, connections] of Object.entries(workflow.connections)) { if (connections && connections.main) { connections.main.forEach(mainConn => { mainConn.forEach(conn => { if (conn.node === "Send Error Alert1") { conn.node = "Log Error1"; } }); }); } } fs.writeFileSync("workflow.json", JSON.stringify(workflow, null, 2)); console.log("Arquivo workflow.json atualizado com sucesso!"); } else { console.log("Nó \"Send Error Alert1\" não encontrado no workflow."); }
