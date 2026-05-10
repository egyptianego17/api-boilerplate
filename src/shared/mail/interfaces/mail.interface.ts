export interface SendMailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  templatePath?: string;
  context?: Record<string, unknown>;
}

export interface MailData<T = never> {
  to: string;
  data: T;
}

export interface BaseEmailContext extends Record<string, unknown> {
  appName: string;
  lang: string;
  logoUrl: string;
  companyTagline: string;
}

export interface AuthEmailContext extends BaseEmailContext {
  title: string;
  hash: string;
  url: string;
  actionTitle: string;
}

export interface ActivationEmailContext extends AuthEmailContext {
  text1: string;
  text2: string;
  text3: string;
}

export interface ResetPasswordEmailContext extends AuthEmailContext {
  text1: string;
  text2: string;
  text3: string;
  text4: string;
}

export interface ConfirmNewEmailContext extends AuthEmailContext {
  text1: string;
  text2: string;
  text3: string;
}

