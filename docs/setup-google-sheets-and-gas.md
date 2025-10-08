1. Crie uma Google Sheet nova. Renomeie a aba principal para `RSVP`.
2. Cole o cabeçalho do `sheet-template.csv` na primeira linha (ver arquivo no repositório).
3. Abra Extensions → Apps Script. Apague código default e cole o conteúdo de `gas/Code.gs`.
4. Substitua `SHEET_ID` pelo ID da planilha (parte da URL).
5. Ajuste `ADMIN_PASS` para uma senha forte.
6. Salve. Deploy → New deployment → Select type: Web app → Execute as: **Me (sua conta)** → Who has access: **Anyone**. Copie a URL de deploy.
7. No `js/app.js`, substitua `GAS_URL` pela URL de deploy.
8. Gere tokens: no Editor de Script clique em `gerarTokens(100)` e rode (isso cria 100 tokens na planilha). Use esses tokens para gerar links: `https://SEU_SITE/index.html?t=TOKEN` (se hospedado em GitHub Pages) ou simplesmente compartilhe token & instruções.
9. Publique frontend no GitHub Pages (branch main, pasta root). Suba `index.html`, `admin.html`, `css/`, `js/`, `assets/`.
10. Teste os 3 casos: sim/nao/talvez; tente reenviar com mesmo token; faça check-in no admin.
