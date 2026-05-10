import {
  PG_CTX_REQUEST_ID,
  PG_CTX_USER_ID,
} from '../constants/postgres-context-vars.js';

export const RECORD_ROW_CHANGE_FN = `
CREATE OR REPLACE FUNCTION record_row_change() RETURNS trigger AS $$
DECLARE
  old_j jsonb;
  new_j jsonb;
  changed_cols text[];
  rec_id text;
  i int;
  k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_j := to_jsonb(NEW);
    rec_id := NEW.id::text;
  ELSIF TG_OP = 'UPDATE' THEN
    old_j := to_jsonb(OLD);
    new_j := to_jsonb(NEW);
    rec_id := NEW.id::text;
  ELSE
    old_j := to_jsonb(OLD);
    rec_id := OLD.id::text;
  END IF;

  FOR i IN 0 .. (TG_NARGS - 1) LOOP
    k := TG_ARGV[i];
    IF old_j IS NOT NULL AND old_j ? k THEN
      old_j := jsonb_set(old_j, ARRAY[k], '"<redacted>"'::jsonb);
    END IF;
    IF new_j IS NOT NULL AND new_j ? k THEN
      new_j := jsonb_set(new_j, ARRAY[k], '"<redacted>"'::jsonb);
    END IF;
  END LOOP;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key) INTO changed_cols
    FROM (
      SELECT key
      FROM jsonb_each(new_j) n
      WHERE NOT (old_j ? key) OR old_j -> key IS DISTINCT FROM n.value
      UNION
      SELECT key
      FROM jsonb_each(old_j) o
      WHERE NOT (new_j ? key)
    ) diffs
    WHERE key <> 'updated_at';

    IF changed_cols IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  INSERT INTO audit_log (
    table_name, operation, object_id,
    old_data, new_data, changed_columns,
    changed_by, request_id
  ) VALUES (
    TG_TABLE_NAME, TG_OP, rec_id,
    old_j, new_j, changed_cols,
    NULLIF(current_setting('${PG_CTX_USER_ID}', true), '')::uuid,
    NULLIF(current_setting('${PG_CTX_REQUEST_ID}', true), '')::uuid
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
`;
