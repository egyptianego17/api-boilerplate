import { StringField } from '../../decorators/field.decorators.js';

export class MessageResponseDto {
  @StringField()
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
