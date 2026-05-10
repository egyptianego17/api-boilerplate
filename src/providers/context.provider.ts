import { ClsServiceManager } from 'nestjs-cls';

import type { LanguageCode } from '../constants/language-code.js';
import type { UserEntity } from '../modules/user/entities/user.entity.js';
import {
  AUTH_USER_KEY,
  LANGUAGE_KEY,
  REQUEST_ID_KEY,
} from './context-keys.js';

export class ContextProvider {
  private static get<T>(key: string) {
    return ClsServiceManager.getClsService().get<T>(key);
  }

  private static set<T>(key: string, value: T): void {
    ClsServiceManager.getClsService().set(key, value);
  }

  static setAuthUser(user: UserEntity): void {
    ContextProvider.set(AUTH_USER_KEY, user);
  }

  static getAuthUser(): UserEntity | undefined {
    return ContextProvider.get<UserEntity>(AUTH_USER_KEY);
  }

  static setLanguage(language: LanguageCode): void {
    ContextProvider.set(LANGUAGE_KEY, language);
  }

  static getLanguage(): LanguageCode | undefined {
    return ContextProvider.get<LanguageCode>(LANGUAGE_KEY);
  }

  static setRequestId(requestId: string): void {
    ContextProvider.set(REQUEST_ID_KEY, requestId as Uuid);
  }

  static getRequestId(): Uuid | undefined {
    return ContextProvider.get<Uuid>(REQUEST_ID_KEY);
  }
}
