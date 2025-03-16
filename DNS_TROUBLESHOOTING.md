# Solucionando Problemas de DNS com o Supabase

Este guia ajudará você a resolver problemas de resolução DNS que impedem a conexão com o Supabase, identificados pelo erro `net::ERR_NAME_NOT_RESOLVED`.

## Diagnóstico

O erro `ERR_NAME_NOT_RESOLVED` indica que seu sistema não consegue converter o nome de domínio do Supabase (ex: `dkvqjisxtdlrdgseiooq.supabase.co`) em um endereço IP. Isso impede qualquer comunicação com o banco de dados.

Execute o script de diagnóstico incluído neste projeto:

```bash
node scripts/dns-diagnostic.js
```

## Acessando a Versão Offline da Página de Monitoramento

Enquanto você resolve os problemas de DNS, pode acessar uma versão offline da página de monitoramento que funciona mesmo sem conexão com o Supabase:

1. Certifique-se de que o servidor Next.js esteja rodando
2. Acesse a URL: http://localhost:3000/monitoramento/offline
3. Esta versão exibe dados simulados e permite testar a interface sem depender da conexão com o Supabase

A versão offline oferece:
- Visualização de dados mockados
- Funcionalidade completa de UI
- Indicação clara de que está em modo offline
- Exportação de dados de exemplo

Quando resolver os problemas de DNS, você pode voltar à página normal em http://localhost:3000/monitoramento.

## Soluções Possíveis

### 1. Verificar Conexão com a Internet

Certifique-se de que sua conexão com a internet esteja funcionando corretamente, testando o acesso a outros sites.

### 2. Verificar se o Projeto Supabase Ainda Existe

Se o projeto Supabase foi excluído ou pausado, o domínio não responderá mais. Verifique no painel do Supabase se o projeto ainda está ativo.

### 3. Usar Servidores DNS Alternativos

Problemas com o DNS do seu provedor podem afetar a resolução de domínios específicos. Tente configurar servidores DNS alternativos:

**Cloudflare DNS:**
- 1.1.1.1
- 1.0.0.1

**Google DNS:**
- 8.8.8.8
- 8.8.4.4

### 4. Modificar Arquivo Hosts

Adicione uma entrada direta no arquivo hosts do seu sistema:

**No macOS/Linux:**
1. Obtenha o IP atual do seu projeto Supabase usando outro dispositivo ou rede
2. Execute `sudo nano /etc/hosts`
3. Adicione uma linha como: `123.45.67.89 dkvqjisxtdlrdgseiooq.supabase.co`
4. Salve o arquivo

**No Windows:**
1. Edite como administrador: `C:\Windows\System32\drivers\etc\hosts`
2. Adicione a entrada conforme acima

### 5. Limpar Cache DNS

**No macOS:**
```bash
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
```

**No Linux:**
```bash
sudo systemd-resolve --flush-caches
# ou
sudo service network-manager restart
```

**No Windows:**
```
ipconfig /flushdns
```

### 6. Testar em Outra Rede

Se possível, teste a aplicação em outra rede (como um hotspot móvel) para verificar se o problema está relacionado à sua rede atual.

### 7. Verificar Configurações de Proxy/Firewall

Firewalls ou proxies podem estar bloqueando o acesso a domínios do Supabase. Verifique suas configurações de firewall ou tente temporariamente desativar o firewall para testes.

### 8. Usar VPN

Em alguns casos, usar uma VPN pode contornar problemas de roteamento da sua operadora de internet.

## Verificação da Solução

Após aplicar uma solução, execute novamente o script de diagnóstico para verificar se o problema foi resolvido:

```bash
node scripts/dns-diagnostic.js
```

## Contornando o Problema

Se você não conseguir resolver o problema de DNS, uma solução temporária é implementar um proxy local:

1. Configure um servidor proxy simples que encaminhe requisições para o Supabase
2. Atualize sua aplicação para apontar para o proxy local em vez do domínio Supabase

## Próximos Passos

Se nenhuma das soluções acima resolver o problema:

1. Entre em contato com o suporte do Supabase
2. Verifique o status do serviço em https://status.supabase.com/
3. Considere migrar temporariamente para outro provedor de banco de dados 