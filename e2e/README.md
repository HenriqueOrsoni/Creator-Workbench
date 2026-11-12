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
