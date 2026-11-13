# Testes E2E (Playwright)

Rodam contra o app real: frontend em `http://localhost:3000` e backend em `http://localhost:8080`
apontando para um banco de testes **separado** (`db_tcc_e2e`, nunca `db_tcc`).

## Preparar

1. Backend (na pasta do backend), com um banco novo e e-mail inofensivo:
   `SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/db_tcc_e2e?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true`,
   `DB_PASSWORD`, `JWT_SECRET`, `MAIL_HOST=localhost`, `MAIL_PORT=3025`, e `mvnw spring-boot:run` (Flyway cria o schema V1..V16).
2. Usuarios e equipes de teste (senha `Teste@123`, dominio `.test`):
   `MYSQL_BIN="C:\Program Files\MySQL\MySQL Server 9.7\bin\mysql.exe" MYSQL_PWD=<senha root> node e2e/support/seed.mjs`
3. Frontend: `npm run dev` (porta 3000). Navegador: `npx playwright install chromium`.

## Rodar

`npm run test:e2e` (todos) ou `npx playwright test e2e/board.spec.ts`. Os specs rodam em serie (1 worker) e criam dados
com sufixo unico, entao podem ser repetidos sem limpar o banco. Capturas ficam em `e2e/screenshots/` (nao versionadas).

Alguns testes falham de proposito enquanto o bug correspondente existir (mensagens com `[BUG]`), e `SEC-10` usa
`test.fail()` ate o backend implementar BE-44.

## Marco 2 (materiais, revisao, resumo)

- Backend extra: `STORAGE_LOCAL_DIR` (pasta temporaria) e `SUMMARY_URL=http://localhost:8001`; servico Python de resumo em `automation/` na porta 8001, sem `ANTHROPIC_API_KEY` (motor extrativo).
- A suite faz mais de 100 logins em poucos minutos: com o limite padrao de `/api/auth` (por IP e por e-mail, 10 min) aparecem 429 espurios. Suba o backend com `APP_RATE_LIMIT_MAX_ATTEMPTS_PER_IP=100000` e `APP_RATE_LIMIT_MAX_ATTEMPTS=29` (o SEC-10 tenta 30 vezes).
- `e2e/m2-content.spec.ts`: o teste do 503 real do resumo so roda com `SUMMARY_DOWN=1`; ele espera o servico da porta 8001 ser parado durante a execucao. Sem a variavel, fica ignorado (o 503 simulado roda sempre).
- Os `[BUG]` da suite de M2 (abas sobrepostas e nome de arquivo comprido a 375 px) foram corrigidos e viraram specs de regressao.
