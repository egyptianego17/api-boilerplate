export const ATTACH_AUDIT_LOG_FN = `
CREATE OR REPLACE FUNCTION attach_audit_log(
  target_table   regclass,
  ops            text[] DEFAULT ARRAY['INSERT', 'UPDATE', 'DELETE'],
  redact_columns text[] DEFAULT ARRAY[]::text[]
) RETURNS void AS $$
DECLARE
  redact_args text;
BEGIN
  EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_log ON %s', target_table);

  redact_args := COALESCE(
    array_to_string(
      ARRAY(SELECT quote_literal(c) FROM unnest(redact_columns) c),
      ','
    ),
    ''
  );

  EXECUTE format(
    'CREATE TRIGGER trg_audit_log AFTER %s ON %s FOR EACH ROW EXECUTE FUNCTION record_row_change(%s)',
    array_to_string(ops, ' OR '),
    target_table,
    redact_args
  );
END;
$$ LANGUAGE plpgsql;
`;
