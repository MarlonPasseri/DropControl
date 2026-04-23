-- Template para corrigir permissao no Cloud SQL for PostgreSQL.
-- Rode como usuario administrativo ou dono do banco, ajustando os nomes abaixo.
-- Nao salve senhas reais neste arquivo.

-- Se o banco ainda nao existir, crie pelo Console/GCloud ou rode:
-- CREATE DATABASE dropcontrol;

-- Se o usuario ainda nao existir, crie pelo Console/GCloud ou rode:
-- CREATE USER dropcontrol_app WITH PASSWORD 'SENHA_FORTE_AQUI';

GRANT CONNECT ON DATABASE dropcontrol TO dropcontrol_app;
GRANT ALL PRIVILEGES ON DATABASE dropcontrol TO dropcontrol_app;
ALTER DATABASE dropcontrol OWNER TO dropcontrol_app;

-- Depois conecte no banco dropcontrol antes de rodar os comandos abaixo.
-- No psql: \connect dropcontrol

GRANT USAGE, CREATE ON SCHEMA public TO dropcontrol_app;
ALTER SCHEMA public OWNER TO dropcontrol_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dropcontrol_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO dropcontrol_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dropcontrol_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO dropcontrol_app;
