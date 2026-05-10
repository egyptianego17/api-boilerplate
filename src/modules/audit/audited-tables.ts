import { AuditedTable } from './constants/audited-table.js';

export interface AuditedTableSpec {
  readonly table: AuditedTable;
  readonly operations: ReadonlyArray<'INSERT' | 'UPDATE' | 'DELETE'>;
  readonly redactColumns: ReadonlyArray<string>;
}

export const AUDITED_TABLES: ReadonlyArray<AuditedTableSpec> = [
  {
    table: AuditedTable.Users,
    operations: ['INSERT', 'UPDATE', 'DELETE'],
    redactColumns: [
      'password',
      'password_reset_token',
      'email_verification_token',
      'two_factor_secret',
      'recovery_codes',
      'refresh_token',
    ],
  },
  {
    table: AuditedTable.UserSettings,
    operations: ['INSERT', 'UPDATE', 'DELETE'],
    redactColumns: [],
  },
];
