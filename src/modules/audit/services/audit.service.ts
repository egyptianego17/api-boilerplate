import type { OnApplicationBootstrap } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { ContextProvider } from '../../../providers/context.provider.js';
import { AUDITED_TABLES } from '../audited-tables.js';
import { AUDIT_EVENT_NAMESPACE, AuditEvent } from '../constants/audit-event.js';
import { AuditOperation } from '../constants/audit-operation.js';
import { AuditLogEntity } from '../entities/audit-log.entity.js';
import { AuditLogRepository } from '../repositories/audit-log.repository.js';
import { ATTACH_AUDIT_LOG_FN } from '../sql/attach-audit-log.sql.js';
import { RECORD_ROW_CHANGE_FN } from '../sql/record-row-change.sql.js';

export interface AuditRecordOptions {
  readonly objectId: Uuid;
  readonly payload?: Record<string, unknown>;
}

@Injectable()
export class AuditService implements OnApplicationBootstrap {
  constructor(
    private readonly logger: PinoLogger,
    private readonly auditLogRepository: AuditLogRepository,
  ) {
    this.logger.setContext(AuditService.name);
  }

  async onApplicationBootstrap(): Promise<void> {
    const manager = this.auditLogRepository.manager;

    await manager.query(RECORD_ROW_CHANGE_FN);
    await manager.query(ATTACH_AUDIT_LOG_FN);

    for (const spec of AUDITED_TABLES) {
      await manager.query(
        'SELECT attach_audit_log($1::regclass, $2::text[], $3::text[])',
        [spec.table, spec.operations, spec.redactColumns],
      );
    }
  }

  async record(event: AuditEvent, options: AuditRecordOptions): Promise<void> {
    const user = ContextProvider.getAuthUser();
    const requestId = ContextProvider.getRequestId();

    const row = new AuditLogEntity();
    row.tableName = AUDIT_EVENT_NAMESPACE[event];
    row.operation = AuditOperation.EVENT;
    row.eventName = event;
    row.objectId = options.objectId;
    row.changedBy = user ? user.id : null;
    row.requestId = requestId === undefined ? null : requestId;
    row.eventPayload = options.payload === undefined ? null : options.payload;

    try {
      await this.auditLogRepository.save(row);
    } catch (error) {
      this.logger.error({ err: error, event }, 'Failed to record audit event');
    }
  }
}
