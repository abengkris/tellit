/**
 * Identity Logger - Specialized logger for identity resolution and vanity slugs.
 * Helps track down issues with NIP-05, vanity handles, and pubkey resolution.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class IdentityLogger {
  private prefix = '[Identity]';

  private log(level: LogLevel, message: string, data?: unknown) {
    // Only log in development or if localStorage.debug is set
    const isDev = process.env.NODE_ENV === 'development';
    const isDebugEnabled = typeof window !== 'undefined' && 
      (window.localStorage.getItem('debug')?.includes('identity') || window.localStorage.getItem('debug') === '*');

    if (!isDev && !isDebugEnabled && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const formattedMessage = `${this.prefix} [${level.toUpperCase()}] [${timestamp}] ${message}`;

    switch (level) {
      case 'debug':
        console.log(formattedMessage, data ?? '');
        break;
      case 'info':
        console.info(formattedMessage, data ?? '');
        break;
      case 'warn':
        console.warn(formattedMessage, data ?? '');
        break;
      case 'error':
        console.error(formattedMessage, data ?? '');
        break;
    }
  }

  debug(message: string, data?: unknown) { this.log('debug', message, data); }
  info(message: string, data?: unknown) { this.log('info', message, data); }
  warn(message: string, data?: unknown) { this.log('warn', message, data); }
  error(message: string, data?: unknown) { this.log('error', message, data); }

  /**
   * Helper to track the entire resolution lifecycle of a slug
   */
  trackResolution(slug: string) {
    const start = performance.now();
    this.info(`Starting resolution for: ${slug}`);
    
    return {
      success: (method: string, pubkey: string) => {
        const duration = (performance.now() - start).toFixed(2);
        this.info(`Resolved ${slug} via ${method} in ${duration}ms`, { pubkey });
      },
      fail: (method: string, error?: unknown) => {
        this.warn(`Failed to resolve ${slug} via ${method}`, error);
      },
      fatal: (error: unknown) => {
        this.error(`Fatal error resolving ${slug}`, error);
      }
    };
  }
}

export const idLog = new IdentityLogger();
