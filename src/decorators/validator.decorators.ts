import type { ValidationOptions } from 'class-validator';
import { registerDecorator, ValidateIf } from 'class-validator';
import { isValidPhoneNumber } from 'libphonenumber-js';
import _ from 'lodash';
import { i18nValidationMessage } from 'nestjs-i18n';

export function IsPassword(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      propertyName: propertyName as string,
      name: 'isPassword',
      target: object.constructor,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string) {
          return /^[\d!#$%&*@A-Z^a-z]*$/.test(value);
        },
      },
    });
  };
}

export function IsPhoneNumber(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      propertyName: propertyName as string,
      name: 'isPhoneNumber',
      target: object.constructor,
      constraints: [],
      options: {
        message: i18nValidationMessage('validation.isPhoneNumber'),
        ...validationOptions,
      },
      validator: {
        validate(value: string) {
          return typeof value === 'string' && isValidPhoneNumber(value);
        },
      },
    });
  };
}

export function IsTmpKey(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) => {
    registerDecorator({
      propertyName: propertyName as string,
      name: 'tmpKey',
      target: object.constructor,
      options: validationOptions,
      validator: {
        validate(value: string): boolean {
          return _.isString(value) && value.startsWith('tmp/');
        },
        defaultMessage(): string {
          return 'error.invalidTmpKey';
        },
      },
    });
  };
}

export function IsUndefinable(options?: ValidationOptions): PropertyDecorator {
  return ValidateIf((_obj, value) => value !== undefined, options);
}

export function IsNullable(options?: ValidationOptions): PropertyDecorator {
  return ValidateIf((_obj, value) => value !== null, options);
}
