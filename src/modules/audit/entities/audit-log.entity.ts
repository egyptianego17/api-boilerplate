import { Column, Entity, Index } from 'typeorm';

import { AbstractEntity } from '../../../common/abstract.entity.js';
import { AuditOperation } from '../constants/audit-operation.js';

@Entity({ name: 'audit_log' })
@Index('idx_audit_table_object', ['tableName', 'objectId', 'createdAt'])
@Index('idx_audit_request_id', ['requestId'])
export class AuditLogEntity extends AbstractEntity {
  @Column({ type: 'text' })
  tableName!: string;

  @Column({ type: 'enum', enum: AuditOperation })
  operation!: AuditOperation;

  @Column({ type: 'text', nullable: true })
  objectId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  changedBy?: Uuid | null;

  @Column({ type: 'uuid', nullable: true })
  requestId?: Uuid | null;

  @Column({ type: 'text', nullable: true })
  eventName?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  oldData?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  newData?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  eventPayload?: Record<string, unknown> | null;

  @Column({ type: 'text', array: true, nullable: true })
  changedColumns?: string[] | null;
}
