-- Usuarios de teste do E2E (somente no banco local db_tcc_e2e). Senha de todos: Teste@123 (hash BCrypt $2a$10).
-- Dominio .test: nenhum e-mail real e usado.
INSERT IGNORE INTO users (email, password, name) VALUES
 ('ana.admin.e2e@creatorworkbench.test',   '$2a$10$TO8ON6/5dS05L.bH8BIL/Obln0uHBaSCLPuwtgTd9eGD9yFzTS5pe', 'Ana Administradora'),
 ('caio.criador.e2e@creatorworkbench.test','$2a$10$TO8ON6/5dS05L.bH8BIL/Obln0uHBaSCLPuwtgTd9eGD9yFzTS5pe', 'Caio Criador'),
 ('rui.revisor.e2e@creatorworkbench.test', '$2a$10$TO8ON6/5dS05L.bH8BIL/Obln0uHBaSCLPuwtgTd9eGD9yFzTS5pe', 'Rui Revisor'),
 ('bia.admin.e2e@creatorworkbench.test',   '$2a$10$TO8ON6/5dS05L.bH8BIL/Obln0uHBaSCLPuwtgTd9eGD9yFzTS5pe', 'Bia Administradora'),
 -- Administrador do sistema (M5): ativa planos. Precisa estar em APP_ADMIN_EMAILS no backend.
 ('admin.sistema@creatorworkbench.test',    '$2a$10$TO8ON6/5dS05L.bH8BIL/Obln0uHBaSCLPuwtgTd9eGD9yFzTS5pe', 'Admin Sistema');
