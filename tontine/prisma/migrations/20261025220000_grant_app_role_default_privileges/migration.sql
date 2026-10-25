-- La table BeneficiaryVote (migration précédente) a été créée sans les privilèges Postgres pour
-- le rôle applicatif tontine_ci_app, qui n'a PAS de privilèges par défaut configurés dans ce
-- schéma (contrairement à postgres/anon/authenticated/service_role, cf. pg_default_acl) : chaque
-- nouvelle table doit recevoir un GRANT explicite pour tontine_ci_app, sans quoi toute requête
-- échoue en production avec "permission denied for table ..." (code Postgres 42501).
--
-- Corrige l'immédiat (BeneficiaryVote) et empêche la récidive pour toute future CREATE TABLE.
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE "BeneficiaryVote" TO tontine_ci_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO tontine_ci_app;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO tontine_ci_app;
