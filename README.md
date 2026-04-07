# dash-medidores

Dashboard operacional (medidores / analisadores). Front em `web/` (Vite + React).

## Vercel (evitar 404 na raiz)

No painel do projeto: **Settings → General → Root Directory** → defina **`web`** → **Save**.

Depois: **Deployments → … nos três pontos do último deploy → Redeploy** (ou faça um `git push` vazio).

Sem esta pasta raiz, a Vercel não corre o `npm run build` de dentro de `web/` nem publica `web/dist` com `index.html`.

### Variáveis de ambiente (Production)

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo da conta de serviço (secret). **Obrigatório** para a API live. |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | ID da planilha. **Obrigatório** para a API live. |
| `VITE_DASHBOARD_DATA_URL` | Opcional — em produção o default já é `/api/dashboard-bundle`. |
| `VITE_DASHBOARD_POLL_MS` | Opcional — em produção o default já é `60000` (1 min). `0` = só ao recarregar. |

Depois de alterar `VITE_*`, faz **Redeploy** (entram no build).

Repositório: [github.com/fernandevxpe/dash-medidores](https://github.com/fernandevxpe/dash-medidores)
