-- Gate/Q17/e2e betiklerinin yerel docker DB'de bıraktığı test hesaplarını siler (yalnız localhost; bkz. scripts/lib/gateAccount.mjs).
-- Kullanım: psql -v pattern='^(gate-|q17-)' -f teardown-gate-accounts.sql   (tek transaction; bugraburunguz@gmail.com asla silinmez)
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE doomed_user AS SELECT id FROM app_user WHERE email ~ :'pattern' AND email <> 'bugraburunguz@gmail.com';
CREATE TEMP TABLE doomed_career AS SELECT id FROM career WHERE user_id IN (SELECT id FROM doomed_user);
-- FK'si NO ACTION olan bağlı satırlar önce (CASCADE olanlar kariyerle gider)
DELETE FROM roster_event WHERE career_id IN (SELECT id FROM doomed_career);
DELETE FROM user_player_state WHERE career_id IN (SELECT id FROM doomed_career);
DELETE FROM user_save_snapshot WHERE career_id IN (SELECT id FROM doomed_career);
DELETE FROM player_rating WHERE base_player_id IN (SELECT id FROM base_player WHERE owner_career_id IN (SELECT id FROM doomed_career)); -- üretilen oyuncuların derecelendirmesi (FK cascade değil)
DELETE FROM career WHERE id IN (SELECT id FROM doomed_career);
DELETE FROM contributor_audit WHERE user_id IN (SELECT id FROM doomed_user);
DELETE FROM contributor WHERE user_id IN (SELECT id FROM doomed_user);
DELETE FROM credit_transaction WHERE user_id IN (SELECT id FROM doomed_user);
DELETE FROM subscription WHERE user_id IN (SELECT id FROM doomed_user);
DELETE FROM sbc_vote WHERE user_id IN (SELECT id FROM doomed_user);
DELETE FROM player_valuation WHERE owner_user_id IN (SELECT id FROM doomed_user);
DELETE FROM app_user WHERE id IN (SELECT id FROM doomed_user);
SELECT (SELECT count(*) FROM doomed_user) AS silinen_hesap, (SELECT count(*) FROM doomed_career) AS silinen_kariyer;
COMMIT;
