import * as Sentry from '@sentry/react-native';

// DSN is not a secret (it's the public ingest endpoint), so it's safe to inline.
// Sensitive keys (auth tokens, source-map upload tokens) go in EAS secrets only.
const DSN = 'https://fb010c282f9f90b848d2d461fe89a88c@o4511691012243456.ingest.us.sentry.io/4511691018010624';

export function initSentry() {
  Sentry.init({
    dsn: DSN,
    // Capture 100% of transactions during development; reduce in production if costs
    // become a concern (e.g. 0.2 = 20%). Set to 1.0 to establish a solid baseline.
    tracesSampleRate: 1.0,
    // Disable verbose Sentry logs in production.
    debug: false,
  });
}

export { Sentry };
