# Versao 1 (estavel) e Roadmap de Melhorias

## Baseline estavel (v1.0.0)

Esta versao consolida:
- API serverless em Vercel com rota `GET /api/dashboard-bundle`
- Cache local no frontend para resiliencia offline
- Leitura live do Google Sheets via conta de servico
- Correcao de compatibilidade ESM na Vercel (imports com `.js`)
- Endpoint de sanidade `GET /api/health`

## Backlog priorizado

## P0 - Confiabilidade e operacao
- [ ] Adicionar observabilidade basica (logs estruturados e identificador de requisicao por chamada)
- [ ] Criar endpoint `GET /api/dashboard-status` com checks de env e conectividade (sem dados sensiveis)
- [ ] Implementar retry com backoff nas chamadas OAuth e Sheets
- [ ] Definir timeout explicito para chamadas externas (OAuth/Sheets)

## P1 - Qualidade de dados
- [ ] Validar schema dos eventos antes de montar o bundle (campos minimos obrigatorios)
- [ ] Registrar contadores de linhas descartadas por regra de parse
- [ ] Criar testes de parse para formatos diferentes de data e status
- [ ] Melhorar mensagens de erro para apontar aba/faixa com problema

## P1 - Frontend e UX
- [ ] Exibir estado "dados desatualizados" quando usando cache local
- [ ] Mostrar timestamp da ultima atualizacao com tooltip de origem (cache/API)
- [ ] Tratar visualmente graficos sem dimensao/dados para evitar warnings em tela
- [ ] Botao manual "Atualizar agora" com feedback de loading

## P2 - Performance e manutencao
- [ ] Avaliar code splitting para reduzir bundle principal do frontend
- [ ] Adicionar cache em memoria curto no serverless (ex.: 30-60s) para reduzir chamadas ao Sheets
- [ ] Extrair modulo de normalizacao de eventos com testes unitarios dedicados
- [ ] Documentar runbook de incidentes (env, permissoes da planilha, erros comuns)

## Proximos marcos sugeridos
- v1.0.1: hardening de operacao (P0)
- v1.1.0: qualidade de dados + UX basica (P1)
- v1.2.0: performance e simplificacao da manutencao (P2)
