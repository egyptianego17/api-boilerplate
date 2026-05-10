import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { AuditLogEntity } from '../entities/audit-log.entity.js';

@Injectable()
export class AuditLogRepository extends Repository<AuditLogEntity> {
  constructor(dataSource: DataSource) {
    super(AuditLogEntity, dataSource.createEntityManager());
  }
}
