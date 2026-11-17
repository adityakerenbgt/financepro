import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './lib/sentryOptions';

if (process.env.SENTRY_DSN) {
  Sentry.init(sentryOptions(process.env.SENTRY_DSN));
  (globalThis as { __fpSentrySetUser?: unknown }).__fpSentrySetUser = (u: { id: string }) => Sentry.setUser(u);
}
