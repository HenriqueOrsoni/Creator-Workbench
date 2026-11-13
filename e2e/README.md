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
- Os `[BUG]` da suite de M3 (dialogos transparentes no tema claro e titulo da aula cortado a 375 px) foram corrigidos e viraram specs de regressao.

## Marco 5 (planos): como a suite lida com os limites

Desde o M5 toda equipe nasce no plano **Gratuito** (1 usuario, 3 projetos ativos, 1 curso, sem resumo, 100 MB) e cada pessoa so pode
administrar **uma** equipe compartilhada gratuita (a equipe pessoal nao conta); a segunda volta 402. Por isso o harness move as equipes de teste
para **Agencia** logo depois de cria-las, **pela rota do administrador do sistema** (assim a rota `/api/v1/admin` tambem e exercitada):

- Backend com `APP_ADMIN_EMAILS=admin.sistema@creatorworkbench.test`. O `seed.sql` cria esse usuario (mesmo hash de senha dos demais).
- `e2e/support/seed.mjs`: depois de criar "Estudio Alfa" e "Estudio Beta", faz `PUT /api/v1/admin/teams/{id}/plan {"plan":"AGENCIA"}` como o admin do sistema.
- `e2e/support/helpers.ts`: `apiCreateTeam(nome, dono, plano = "AGENCIA")` cria a equipe e ativa o plano (use `"GRATUITO"` para testar limites);
  `apiSetPlan(equipeId, plano)` muda o plano a qualquer momento; `USERS.sistema` e o admin do sistema.
- Alternativa descartada: `UPDATE teams SET plan='AGENCIA', plan_source='MANUAL' ...` no seed (nao exercita a rota).
- Regra para quem escreve spec: **nunca deixe uma equipe compartilhada de Ana/Bia no Gratuito** (ela passaria a receber 402 ao criar outras equipes).
  Specs que precisam de uma equipe Gratuita usam um usuario recem-cadastrado (`apiRegister`).

## Marco 4/5: e-mail capturado, usuarios novos e SQL

- `node e2e/support/mail-sink.mjs` sobe um SMTP minimo em `:3025` (API HTTP em `:3026`). O backend precisa de `MAIL_HOST=localhost`, `MAIL_PORT=3025`
  e **qualquer** `MAIL_USERNAME`/`MAIL_PASSWORD` (sem eles o JavaMail falha com "no password specified"; o sink ignora a autenticacao).
- `e2e/support/mail.ts`: `apiRegister(prefixo)` cadastra um usuario pelo fluxo real (codigo por e-mail), o que tambem cria a **equipe pessoal**;
  `waitMail`, `codeFrom` e `inviteTokenFrom` leem o codigo de 6 digitos e o token do link `/convite?token=`.
- `sql()` (mesmo arquivo) executa SQL no `db_tcc_e2e` (precisa de `MYSQL_BIN` e `MYSQL_PWD`); so e usado para antecipar o fim de um teste de 14 dias.
- Specs: `m4-collab.spec.ts` (alertas, equipe, convites, conta, redirect) e `m5-plans.spec.ts` (plano, teste, 402, aviso, selo, Resumo IA).
  Testes marcados com `test.fail` documentam bug confirmado (ficam verdes enquanto o bug existir; quando for corrigido o Playwright avisa).
- Backend extra: `APP_ADMIN_EMAILS` (acima); frontend com as flags ligadas (padrao).
