import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from './lib/sentryOptions';

// DSN Sentry memang publik (hanya bisa mengirim event), jadi aman memakai NEXT_PUBLIC_.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));
