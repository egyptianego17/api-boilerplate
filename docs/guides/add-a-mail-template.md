# Add a Mail Template

Recipe for adding a new transactional email — Handlebars template, typed context, service method, i18n strings. Worked example: a "welcome" email sent after the user verifies their address.

---

## Anatomy

The mail subsystem under [`src/shared/mail/`](../../src/shared/mail/) has five moving parts:

1. **Handlebars templates** in `mail-templates/` — `activation.hbs`, `reset-password.hbs`, `confirm-new-email.hbs`. Plus shared `partials/header.hbs`, `partials/footer.hbs`, `partials/styles.hbs`.
2. **`MailTemplate` enum** in [`constants/mail-template.constant.ts`](../../src/shared/mail/constants/mail-template.constant.ts) — maps friendly names to filenames.
3. **Typed contexts** in [`interfaces/mail.interface.ts`](../../src/shared/mail/interfaces/mail.interface.ts) — `BaseEmailContext`, `AuthEmailContext`, etc. The context is what Handlebars sees when rendering.
4. **Service methods** — [`AuthMailService`](../../src/shared/mail/services/auth-mail.service.ts) builds the context, calls `MailerService.sendMail`, and exists per "topic" (auth, billing, etc.).
5. **The `MailService` façade** in [`mail.service.ts`](../../src/shared/mail/mail.service.ts) — the single entry point business code calls. Delegates to the topic services.

The flow:

```
business code → MailService.welcome({ to, data })
                 ↓
                AuthMailService.sendWelcomeEmail(...)
                 ↓ builds typed context, resolves template path
                MailerService.sendMail(...)
                 ↓ Handlebars compiles template + context
                SendGrid HTTPS → recipient
```

---

## Step 1 — Add the template file

Create `src/shared/mail/mail-templates/welcome.hbs`. Copy from `activation.hbs` and edit:

```handlebars
<!DOCTYPE html>
<html lang='{{lang}}'>
  <head>
    <meta charset='UTF-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1.0' />
    <title>{{t 'common.welcome'}}</title>
    {{> styles}}
  </head>
  <body>
    <div class='page'>
      <div class='card'>
        {{> header}}

        <div class='content'>
          <h1 class='heading'>{{t 'welcome.heading'}}</h1>
          <p class='lede'>{{t 'welcome.lede' name=firstName}}</p>
          <p class='muted'>{{t 'welcome.cta'}}</p>

          <a class='cta' href='{{url}}'>{{t 'welcome.cta_label'}}</a>
        </div>

        {{> footer footerText=(t 'welcome.footer')}}
      </div>
    </div>
  </body>
</html>
```

Available helpers in templates:
- `{{t 'key.path'}}` — translate via `nestjs-i18n` (resolves to the request's locale).
- `{{upper expr}}` — uppercase.
- `{{> partial}}` — include a partial from `partials/`.

Always include `{{> styles}}`, `{{> header}}`, `{{> footer}}` for visual consistency.

---

## Step 2 — Register the enum value

Append to [`mail-template.constant.ts`](../../src/shared/mail/constants/mail-template.constant.ts):

```typescript
export enum MailTemplate {
  ACTIVATION = 'activation.hbs',
  RESET_PASSWORD = 'reset-password.hbs',
  CONFIRM_NEW_EMAIL = 'confirm-new-email.hbs',
  WELCOME = 'welcome.hbs',          // ← new
}
```

The value must match the file name in `mail-templates/`.

---

## Step 3 — Define the typed context

Append to [`interfaces/mail.interface.ts`](../../src/shared/mail/interfaces/mail.interface.ts):

```typescript
export interface WelcomeEmailContext extends BaseEmailContext {
  firstName: string;
  url: string;
}
```

Always extend `BaseEmailContext` (or `AuthEmailContext` if your template uses the action-link pattern). `BaseEmailContext` provides `appName`, `lang`, `logoUrl`, `companyTagline` — the values the partials need.

---

## Step 4 — Add a service method

Extend [`AuthMailService`](../../src/shared/mail/services/auth-mail.service.ts) — or create a sibling like `MarketingMailService` if it's a logically separate topic. For this example we'll extend `AuthMailService`:

```typescript
// inside AuthMailService class
async sendWelcomeEmail(
  mailData: MailData<{ firstName: string }>,
): Promise<void> {
  const translations = this.mailHelper.getTranslations([
    'common.welcome',
    'welcome.heading',
  ]);

  const url = this.mailHelper.buildUrl('/dashboard');

  const context: WelcomeEmailContext = {
    firstName: mailData.data.firstName,
    url: url.toString(),
    appName: this.mailHelper.getAppName(),
    lang: this.mailHelper.getCurrentLanguage(),
    logoUrl: this.mailHelper.getLogoUrl(),
    companyTagline: this.mailHelper.getCompanyTagline(),
  };

  await this.mailerService.sendMail({
    to: mailData.to,
    subject: translations[0] || 'Welcome',
    text: `Welcome, ${mailData.data.firstName}!`,
    templatePath: this.mailHelper.getTemplatePath(MailTemplate.WELCOME),
    context,
  });
}
```

Helpers available on `MailHelperService`:
- `getTranslations(keys)` — synchronously fetch a list of i18n strings.
- `buildUrl(path, queryParams?)` — produces `${FRONTEND_DOMAIN}${path}?...`.
- `getAppName()`, `getCurrentLanguage()`, `getLogoUrl()`, `getCompanyTagline()` — fill out `BaseEmailContext`.
- `getTemplatePath(MailTemplate.X)` — absolute path to the `.hbs` file.

Always provide a plain-text `text` fallback for clients that don't render HTML.

---

## Step 5 — Expose via `MailService`

Append to [`mail.service.ts`](../../src/shared/mail/mail.service.ts):

```typescript
async welcome(mailData: MailData<{ firstName: string }>): Promise<void> {
  return this.authMailService.sendWelcomeEmail(mailData);
}
```

`MailService` is the single entry point business code calls. It's a thin façade — keeps services from depending on the inner topic-services directly.

---

## Step 6 — Add i18n strings

Append to each locale's JSONs.

```json
// src/i18n/en/common.json
{
  "confirmEmail": "Confirm Email",
  "resetPassword": "Reset Password",
  "welcome": "Welcome"
}
```

Create a new file (since `welcome.*` is its own namespace):

```json
// src/i18n/en/welcome.json
{
  "heading": "Welcome aboard",
  "lede": "Hi {name}, glad to have you. Let's get you started.",
  "cta": "Your dashboard is ready when you are.",
  "cta_label": "Open dashboard",
  "footer": "Need help? Just reply to this email."
}
```

Repeat in `src/i18n/ar/welcome.json` and `src/i18n/fr/welcome.json` (translated). Untranslated locales fall back to English.

---

## Step 7 — Wire into the relevant flow

In `UserService` (or wherever the trigger lives), inject `MailService` and call:

```typescript
await this.mailService.welcome({
  to: user.email,
  data: { firstName: user.firstName },
});
```

If you want the send to happen asynchronously (so the request doesn't block on SendGrid), wire it through a BullMQ queue — see [`add-a-queue.md`](./add-a-queue.md).

---

## Smoke test

With `SENDGRID_API_KEY` set to a real (or sandbox) key:

1. Trigger the flow that calls `mailService.welcome(...)`.
2. Inspect the SendGrid Activity log (or your sandbox inbox) for the rendered HTML.
3. Pass `?lang=ar` on the triggering request to verify the locale propagates into the template (`{{t '...'}}` should render Arabic).

If `SENDGRID_API_KEY` is the placeholder, the SDK warns "API key does not start with 'SG.'" and the send fails silently. Use a sandbox key or stub the mailer in dev.

---

## See also

- [`../conventions/coding-standards.md`](../conventions/coding-standards.md) — service patterns
- [`add-a-queue.md`](./add-a-queue.md) — sending mail asynchronously via BullMQ
- [`env-vars.md`](./env-vars.md) — `SENDGRID_API_KEY`, `MAIL_DEFAULT_EMAIL`, `FRONTEND_DOMAIN`
