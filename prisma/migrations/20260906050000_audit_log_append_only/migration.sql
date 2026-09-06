-- AuditLog is meant to be append-only. Application code already only ever
-- calls .create() on it, but that's a convention, not a guarantee — this
-- makes it one at the database level by rejecting any UPDATE or DELETE.
--
-- The seed script's reset() needs to wipe this table along with everything
-- else for a fresh seed, so it gets one explicit, scoped exception: it sets
-- the session-local flag below (via SET LOCAL, inside its transaction)
-- before deleting. Nothing else in the app ever sets this flag.
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('atlas.allow_audit_log_mutation', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'AuditLog is append-only: % is not allowed (id=%)', TG_OP, OLD.id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_update ON "AuditLog";
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS audit_log_no_delete ON "AuditLog";
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();
