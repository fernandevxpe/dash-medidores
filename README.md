# dash-medidores

Dashboard operacional (medidores / analisadores). Front em `web/` (Vite + React).

## Vercel (evitar 404 na raiz)

No painel do projeto: **Settings → General → Root Directory** → defina **`web`** → **Save**.

Depois: **Deployments → … nos três pontos do último deploy → Redeploy** (ou faça um `git push` vazio).

Sem esta pasta raiz, a Vercel não corre o `npm run build` de dentro de `web/` nem publica `web/dist` com `index.html`.

### Variáveis de ambiente (Production)

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | JSON completo da conta de serviço (secret). |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | ID da planilha. |
| `VITE_DASHBOARD_DATA_URL` | `/api/dashboard-bundle` |
| `VITE_DASHBOARD_POLL_MS` | ex.: `60000` |

Repositório: [github.com/fernandevxpe/dash-medidores](https://github.com/fernandevxpe/dash-medidores)
