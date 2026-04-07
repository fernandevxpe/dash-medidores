# Dashboard Medidores XPE — análise da planilha e estrutura sugerida

Documento gerado a partir do arquivo **`help xpezinha.xlsx`** (exportação tipo Google Sheets). Serve como base para evoluir o **prompt de implementação**, definir **cálculos no front-end** e atender **execução local → Vercel → incorporação no ClickUp**.

---

## 0. Conceitos: Medidor × Analisador

| Conceito | Definição operacional | Na planilha atual (proxy) |
|----------|------------------------|---------------------------|
| **Medidor** | Unidade física identificada por **`ID do Medidor`** | Aba `medidores` + coluna `ID do Medidor` em `dados dashboard`. |
| **Analisador** | Ponto lógico/físico numerado (**01, 02, 03, 04…**) onde há medição no cliente | Proxy mais próximo: coluna **`Localização`** (`CDM1`…`CDM8`, `COND`, `GERAL`, `Desconhecido`, etc.). |

**Normalização sugerida no ETL/front:**

- Criar campo derivado `codigoAnalisador`: mapear `CDM1`→`01`, `CDM2`→`02`, …, `CDM10`→`10`; manter `COND`, `GERAL`, `Desconhecido` como categorias próprias ou mapear para política definida pelo negócio.
- **Total de analisadores (fleet):** ou (a) **catálogo fixo** (ex.: “temos 8 slots por medidor × N medidores”) vindo de config/aba futura, ou (b) **contagem distinta** de `Localização` já vista na base (subestima capacidade teórica).
- **Status por analisador:** na planilha atual **não há** coluna `Status_Analisador`; na v1 pode-se derivar: *“analisador em uso”* = existe último evento ativo com aquele par `(idMedidor, localizacao)` e medidor `instalado`; *“livre”* = não consta em campo ou medidor disponível — **validar com o time** ou enriquecer a fonte.

**Regra para gráficos duplos (medidor vs analisador):** sempre explicitar no rodapé se o analisador é **proxy por Localização** até existir coluna dedicada (`Analisador` / `Slot`).

---

## 1. Visão geral do arquivo

| Aba | Papel sugerido | Observação |
|-----|----------------|------------|
| **dados dashboard** | **Fonte principal de fatos** para histórico, localização/analisador por evento e cruzamento com cliente ClickUp | Colunas úteis à esquerda; muitas colunas vazias à direita (artefato de export). |
| **medidores** | **Cadastro / snapshot** de cada medidor e **status atual** | Uma linha por medidor (`Medidor`, `Status_Medidor`). |
| **infos de clientes clickup** | **Dimensão clientes** alinhada ao pipeline ClickUp | Cliente, serviço, status do funil, totais resumidos. |
| **dados brutos dashboard** | Possível **log bruto** (timestamps com hora) | Validar na fonte viva; pode ser a verdade temporal fina. |

**Regra prática:** **`dados dashboard` + `medidores`** no núcleo; **`infos de clientes clickup`** para contexto ClickUp; **analisador** derivado de **`Localização`** até haver coluna própria.

---

## 2. Modelo de dados (colunas relevantes)

### 2.1 `dados dashboard` (eventos / linhas operacionais)

| Coluna (cabeçalho) | Uso na dashboard |
|--------------------|------------------|
| **Localização** | **Proxy do analisador** (CDM1…CDM8, COND, GERAL…). |
| **ID do Medidor** | Chave do equipamento. |
| **Instalador** | Dimensão “quem instalou”. |
| **Cliente** | Empreendimento / obra. |
| **Data** | Instantâneo do registro — séries temporais, calendário, previsão +8 dias. |
| **Clientes clickup** | Cliente canônico para alinhar ao ClickUp. |
| **Quantidade de Medidores instalados** | Volume numérico por linha (agregações por cliente/período). |

**Campos desejáveis (futuro / banco):** `tipoEvento` (instalação/desinstalação/manutenção), `idAnalisador` explícito, `statusAnalisador`, `observacao`, `duracaoPrevistaDias` (default 8 configurável).

### 2.2 `medidores` (estado atual)

| Coluna | Uso |
|--------|-----|
| **Medidor** | ID. |
| **Status_Medidor** | Ex.: `disponivel`, `instalado` — donuts e KPIs de **medidor**. |

### 2.3 `infos de clientes clickup` (dimensão ClickUp)

| Coluna | Uso |
|--------|-----|
| **Cliente** | Join com `Clientes clickup`. |
| **Servico** / **Status** | Contexto e funil. |
| **ID Contrato** | Vínculo futuro. |

---

## 3. Indicadores pedidos × dados × cálculo (matriz estendida)

| Indicador | Atende hoje? | Fonte / lógica no front |
|-----------|--------------|-------------------------|
| **Total de medidores** | Sim | `COUNT` linhas em `medidores` (ou IDs únicos). |
| **Total de analisadores (01, 02…)** | Parcial | `COUNT DISTINCT localizacao` normalizada **ou** capacidade declarada em config se o negócio for “N slots por medidor”. |
| **Medidores instalados vs disponíveis** | Sim | Donut: agregação por `Status_Medidor` em `medidores`. |
| **Analisadores em uso vs livres** | Parcial | Regra derivada: slots `(idMedidor, localizacao)` com último evento “ativo” e medidor instalado = **em uso**; demais slots do catálogo = **livres** — **confirmar regra** ou adicionar coluna na planilha. |
| **Quantidade instalada por cliente** | Sim | Agrupar por `Clientes clickup`, somar `Quantidade de Medidores instalados` (e/ou contar eventos). |
| **Quais medidores em quais clientes (ID)** | Sim | Último evento por `ID do Medidor` → cliente + localização/analisador. |
| **Gráfico cliente: medidores e analisadores em uso** | Parcial | Por cliente: **medidores distintos** em campo no período; **analisadores** = distinct `Localização` (ou contagem de pares medidor×slot). Gráfico **barras empilhadas** ou **grouped bar**. |
| **Acumulado por cliente** | Sim | Série cumulativa ao longo do tempo (por mês ou por dia) filtrada por cliente — linha ou área. |
| **Período de medição por cliente** | Sim | Por cliente: `min(Data)` e `max(Data)` dos eventos no filtro; exibir duração `(max − min)` e “dias com pelo menos um registro”. |
| **Instalações por dia** | Sim | Bucket `YYYY-MM-DD` em `Data`. |
| **Por semana (ISO ou rolling)** | Sim | Semana ISO ou semana calendário local. |
| **Por mês** | Sim | `YYYY-MM`. |
| **Semana do mês (S1–S5)** | Sim | Mesma regra fixada em §4. |
| **Histórico de meses** | Sim | Série mensal completa (todas as chaves de mês presentes na base ou preenchidas com zero). |
| **Últimas 20 instalações (detalhadas)** | Sim | Ordenar por `Data` desc; colunas: data/hora, ID medidor, analisador/localização, clientes (obra + ClickUp), instalador, quantidade, link/ID de tarefa futuro. |
| **Status do medidor (todos os valores)** | Sim | Barras horizontais ou donut múltiplas fatias a partir de `Status_Medidor`; incluir legenda “outros” se surgirem novos status. |
| **Status do analisador** | Parcial | v1: estados derivados **Em uso / Indeterminado / Sem dados**; v2: status explícito na fonte. |
| **Busca: por cliente ou por medidor** | Sim | Dois campos de busca; resultados: tabela com localização, última data, status, previsão +8d. |
| **Dados históricos do medidor** | Sim | Painel ao selecionar ID: timeline de eventos, última instalação, “últimas ações” = últimas N linhas em `dados dashboard`. |
| **Última desinstalação** | Não (sem evento) | Exige `tipoEvento` ou data de desinstalação na fonte (§5). |
| **Calendário + previsão remoção (8 dias)** | Sim (modelo) | Para cada evento de **instalação** com data `t0`: `previsaoRemocao = t0 + 8 dias` (parametrizável). Calendário mensal com marcadores: instalações reais vs previsões; lista “vence em X dias”. |
| **Capacidade operacional (% uso)** | Parcial | **Definição A:** `% = medidores_instalados / total_medidores × 100`. **Definição B (analizadores):** `% = analisadores_em_uso / total_analisadores_frota × 100`. Calcular **por dia** (snapshot reconstruído: quantos instalados naquele dia se houver histórico de status; se não, usar **proxy do dia** = medidores com último evento ≤ dia e ainda “instalados” hoje — documentar limitação). **Por semana/mês:** média dos dias úteis ou valor no último dia do período. |

---

## 4. Definições de negócio (fixar no prompt da aplicação)

1. **Instalação para volume temporal:** preferir **soma** de `Quantidade de Medidores instalados`; “últimas 20 linhas” = **eventos** (linhas) ordenados por data.
2. **Semana do mês:** ex. S1 = dias 1–7, S2 = 8–14, …; timezone **America/Recife** (ou o oficial da operação).
3. **Cliente canônico:** **`Clientes clickup`** nos gráficos; **`Cliente`** como obra no detalhe.
4. **Regra dos 8 dias:** constante `DIAS_MEDICAO_PADRAO = 8` editável em config da app; não confundir com duração real até haver desinstalação registrada.
5. **Capacidade %:** escolher **uma definição oficial** (medidor vs analisador vs ambas em cartões separados) para não misturar denominadores.
6. **Analisador:** até existir coluna dedicada, usar **`Localização` normalizada** e declarar isso na UI.

---

## 5. Lacunas e evolução (banco / Sheets)

| Necessidade | Ação |
|-------------|------|
| **Desinstalação / última ação** | Coluna `tipoEvento` ou `dataDesinstalacao`; timeline fiel. |
| **Status por analisador** | Coluna `statusAnalisador` ou tabela de slots. |
| **Catálogo de analisadores** | Aba ou JSON: lista oficial 01…N e capacidade por medidor. |
| **Previsão vs real** | Quando houver desinstalação real, comparar `dataReal − dataPrevista` (atraso/adiantamento). |
| **Duplicatas** | Regra de deduplicação por `(idMedidor, data, localizacao)`. |

---

## 6. Insights mais poderosos (sugestões além dos KPIs básicos)

1. **Aderência à janela de 8 dias:** % de “ciclos” em que houve desinstalação/remoção registrada dentro de ±1 dia da previsão (quando dados existirem).  
2. **Backlog de campo:** medidores `instalado` há mais de 8 dias **sem** evento de desinstalação (alerta de possível atraso ou falta de registro).  
3. **Taxa de utilização da frota (heatmap):** por dia da semana, em qual dia a operação mais “enche” a capacidade.  
4. **Concentração por cliente:** índice Herfindahl ou “top 3 clientes = X% dos medidores em campo” — risco de dependência.  
5. **Recorrência:** clientes que reinstalam no mesmo mês (oportunidade ou problema de processo).  
6. **Produtividade por instalador:** eventos ou quantidade somada por `Instalador` no período (com caveats de escala).  
7. **Analisadores mais solicitados:** ranking de `Localização` (CDM3 vs CDM1…) para compra/manutenção de peças.  
8. **Lead time ClickUp × campo:** cruzar `infos de clientes clickup.Status` com presença de medidor em campo (futuro com datas de contrato).  
9. **Sazonalidade:** comparar mesmo mês ano anterior quando histórico crescer.  
10. **Qualidade de dados:** % de linhas com `Localização = Desconhecido` ou cliente vazio — meta de redução.

---

## 7. Outros indicadores recomendados

| Indicador | Utilidade |
|-----------|-----------|
| **Tempo médio em campo por medidor** | Entre instalação e desinstalação (quando houver desinstalação). |
| **Medidores ociosos > N dias** | `disponivel` há muito tempo — possível subutilização. |
| **Fila de “previstos para sair” nos próximos 7 dias** | Operação logística. |
| **Novos vs recorrentes (clientes)** | Primeira aparição de `Clientes clickup` no período. |
| **MTTR de dados** (meta): reduzir `Desconhecido` em localização. |
| **Alertas:** dois eventos contraditórios no mesmo dia para o mesmo ID | Possível erro de importação. |

---

## 8. Arquitetura sugerida (simples, Vercel + ClickUp)

- **Stack:** Vite + React + TypeScript; **Recharts** ou **Chart.js**; **calendário:** `react-day-picker`, **FullCalendar** (modo mês) ou grid próprio leve.  
- **Dados:** `public/data/dashboard-bundle.json`; cálculos em `src/analytics/`.  
- **Config:** `src/config.ts` — `DIAS_MEDICAO_PADRAO`, timezone, mapeamento `Localização` → código analisador.  
- **ClickUp:** URL pública + iframe; calendário e tabelas com scroll interno para larguras estreitas.

---

## 9. Estrutura da dashboard (wireframe em seções)

### 9.1 Cabeçalho e filtros globais

- Filtros: intervalo de datas, cliente ClickUp, instalador, status medidor, opcional filtro por **localização/analisador**.  
- **KPIs:** Total medidores | Total analisadores (definição escolhida) | Instalados | Disponíveis | Em uso (anal.) | **% capacidade medidor** | **% capacidade analisador**.

### 9.2 Bloco — Donuts e semelhantes

- **Donut 1:** medidores instalados vs disponíveis (+ fatia “outros status” se houver).  
- **Donut 2 (ou meia-rosca):** analisadores em uso vs livres (conforme regra §0).  
- **Opcional:** **bullet chart** ou **gauge** para meta de utilização (ex.: meta 75% da frota).

### 9.3 Bloco — Clientes (volume e composição)

- **Grouped / stacked bar:** por cliente — medidores distintos em uso vs analisadores (distinct localização) ou contagens acordadas.  
- **Linha acumulada:** evolução cumulativa por cliente (seletor de cliente).  
- **Mini-card por cliente:** “período de medição” = `min`–`max` de datas e duração.

### 9.4 Bloco — Tempo (quatro granularidades)

- Seletor: dia | semana | mês | semana-do-mês.  
- Mesmo eixo de métrica (soma ou contagem) para comparabilidade.  
- **Série histórica de meses** (longo prazo) em gráfico de barras ou linha.

### 9.5 Bloco — Últimas 20 instalações

- Tabela expandida com todos os campos úteis + badge **“prev. remoção”** (`Data + 8d`).

### 9.6 Bloco — Status

- **Medidor:** gráfico de barras com **todos** os valores distintos de `Status_Medidor`.  
- **Analisador:** gráfico separado com estados derivados ou reais (v2).

### 9.7 Bloco — Busca e localização

- Abas ou dois inputs: **Buscar por cliente** | **Buscar por ID medidor**.  
- Resultado: cards ou tabela com cliente obra, ClickUp, localização/analisador, status, datas, previsão.

### 9.8 Bloco — Ficha do medidor (histórico)

- Ao selecionar ID: timeline vertical das últimas ações (linhas de `dados dashboard`), destaque **última instalação**; placeholder **última desinstalação** até existir dado.

### 9.9 Bloco — Calendário operacional

- Vista mensal: pontos em dias com instalações; **ícone/outline** em dias de **previsão de remoção** (instalação + 8).  
- Painel lateral: “**Próximas remoções previstas**” (7 dias).  
- Legenda: instalado real | previsto | atraso (quando houver desinstalação real para comparar).

### 9.10 Bloco — Capacidade operacional

- Cartões **% uso** com toggle **dia | semana | mês**.  
- Texto explicativo do denominador (frota total de medidores / frota total de analisadores).  
- Opcional: sparkline dos últimos 30 dias.

### 9.11 Bloco opcional — Funil ClickUp

- Contexto comercial; legenda clara para não confundir com frota física.

---

## 10. Contrato de dados JSON (sugestão)

```json
{
  "geradoEm": "2026-04-06T00:00:00.000Z",
  "config": {
    "diasMedicaoPadrao": 8,
    "timezone": "America/Recife",
    "mapaLocalizacaoParaAnalisador": { "CDM1": "01", "CDM2": "02" }
  },
  "medidores": [
    { "id": "xp000000…", "status": "instalado" }
  ],
  "eventos": [
    {
      "idMedidor": "xp000000…",
      "data": "2026-04-02T12:00:00.000Z",
      "localizacao": "CDM3",
      "codigoAnalisador": "03",
      "clienteObra": "Jardin Sud Le Parc",
      "clienteClickup": "Ara Pacis",
      "instalador": "Flávio Cândido",
      "quantidade": 1,
      "tipoEvento": "instalacao"
    }
  ],
  "clientesClickup": [
    { "nome": "Ara Pacis", "servico": "…", "statusFunil": "agendamento", "idContrato": null }
  ],
  "frota": {
    "totalAnalisadoresOficial": null,
    "comentario": "Preencher quando houver catálogo; senão usar distinct localizacao"
  }
}
```

---

## 11. Prompt mestre (atualizado — colar no agente)

> Crie uma SPA com Vite + React + TypeScript, deployável na Vercel, lendo `public/data/dashboard-bundle.json` conforme `DASHBOARD_MEDIDORES.md`. Todos os agregados no cliente (funções puras). Implementar: KPIs de total medidores e total analisadores (derivado de `Localização` + mapa configurável); dois donuts (medidor instalado/disponível/outros; analisador em uso/livre com regra documentada); gráficos por cliente com medidores e analisadores e série acumulada; período de medição por cliente; volumes por **dia, semana, mês e semana do mês**; histórico mensal longo; tabela das **últimas 20** instalações com detalhe e coluna de **previsão +8 dias**; gráficos de status para medidor e para analisador (derivado na v1); busca por cliente e por ID de medidor com ficha e timeline; placeholder de desinstalação; **calendário mensal** com marcações de instalação e previsão de remoção; cartões de **% capacidade operacional** (dia/semana/mês) para medidor e analisador com denominadores explícitos na UI. Usar Recharts ou Chart.js e um componente de calendário acessível. Layout responsivo para iframe no ClickUp. Rótulos de UI em português; código (variáveis/pastas) em inglês.

---

## 12. Checklist de validação

- [ ] Validar com operação o mapeamento **Localização → analisador 01, 02…**.  
- [ ] Definir denominador oficial de **% capacidade** (medidor vs analisador vs ambos).  
- [ ] Confirmar se **8 dias** é fixo ou por tipo de serviço/cliente.  
- [ ] Planejar colunas de **desinstalação** e **status de analisador** na planilha/banco.  
- [ ] Testar embed ClickUp (largura, scroll, calendário).  

---

*Análise baseada no snapshot `help xpezinha.xlsx`. Exemplos de `Localização` observados: CDM1–CDM8, COND, GERAL, Desconhecido.*
