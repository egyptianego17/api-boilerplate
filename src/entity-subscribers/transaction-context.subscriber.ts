import type {
  EntitySubscriberInterface,
  InsertEvent,
  QueryRunner,
  RemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { EventSubscriber } from 'typeorm';

import {
  PG_CTX_REQUEST_ID,
  PG_CTX_USER_ID,
} from '../modules/audit/constants/postgres-context-vars.js';
import { ContextProvider } from '../providers/context.provider.js';

@EventSubscriber()
export class TransactionContextSubscriber implements EntitySubscriberInterface {
  beforeInsert(event: InsertEvent<unknown>): Promise<void> {
    return this.applyContext(event.queryRunner);
  }

  beforeUpdate(event: UpdateEvent<unknown>): Promise<void> {
    return this.applyContext(event.queryRunner);
  }

  beforeRemove(event: RemoveEvent<unknown>): Promise<void> {
    return this.applyContext(event.queryRunner);
  }

  private async applyContext(queryRunner: QueryRunner): Promise<void> {
    const user = ContextProvider.getAuthUser();
    const requestId = ContextProvider.getRequestId();

    if (user) {
      await queryRunner.query('SELECT set_config($1, $2, true)', [
        PG_CTX_USER_ID,
        user.id,
      ]);
    }

    if (requestId) {
      await queryRunner.query('SELECT set_config($1, $2, true)', [
        PG_CTX_REQUEST_ID,
        requestId,
      ]);
    }
  }
}
