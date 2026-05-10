import {
  EmailField,
  StringField,
  StringFieldOptional,
  UUIDField,
} from '../../../decorators/field.decorators.js';
import type { UserEntity } from '../entities/user.entity.js';

export class UserSummaryDto {
  @UUIDField()
  id!: Uuid;

  @StringField()
  firstName!: string;

  @StringField()
  lastName!: string;

  @EmailField()
  email!: string;

  @StringFieldOptional({ nullable: true })
  avatar?: string | null;

  constructor(user: UserEntity) {
    this.id = user.id;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.avatar = user.avatar;
  }
}
