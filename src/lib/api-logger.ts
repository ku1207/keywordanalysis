type LogLevel = 'info' | 'success' | 'warning' | 'error';

interface LogContext {
  method?: string;
  url?: string;
  timestamp?: string;
  [key: string]: string | number | boolean | undefined;
}

const LOG_ICONS = {
  info: '📝',
  success: '✅', 
  warning: '⚠️',
  error: '❌'
} as const;

class APILogger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): [string, LogContext?] {
    const icon = LOG_ICONS[level];
    const formattedMessage = `${icon} ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      return [formattedMessage, context];
    }
    return [formattedMessage];
  }

  info(message: string, context?: LogContext) {
    const [msg, ctx] = this.formatMessage('info', message, context);
    if (ctx) {
      console.log(msg, ctx);
    } else {
      console.log(msg);
    }
  }

  success(message: string, context?: LogContext) {
    const [msg, ctx] = this.formatMessage('success', message, context);
    if (ctx) {
      console.log(msg, ctx);
    } else {
      console.log(msg);
    }
  }

  warning(message: string, context?: LogContext) {
    const [msg, ctx] = this.formatMessage('warning', message, context);
    if (ctx) {
      console.warn(msg, ctx);
    } else {
      console.warn(msg);
    }
  }

  error(message: string, context?: LogContext) {
    const [msg, ctx] = this.formatMessage('error', message, context);
    if (ctx) {
      console.error(msg, ctx);
    } else {
      console.error(msg);
    }
  }

  apiStart(apiName: string, context?: LogContext) {
    this.info(`${apiName} 요청 시작`, {
      timestamp: new Date().toISOString(),
      ...context
    });
  }

  apiSuccess(apiName: string, context?: LogContext) {
    this.success(`${apiName} 응답 받음`, context);
  }

  apiError(apiName: string, error: Error | string, context?: LogContext) {
    this.error(`${apiName} 호출 실패`, { error: typeof error === 'string' ? error : error.message, ...context });
  }

  parseSuccess(dataType: string) {
    this.success(`${dataType} 데이터 파싱 성공`);
  }

  parseError(dataType: string, error: Error | string) {
    this.error(`${dataType} JSON 파싱 실패`, { error: typeof error === 'string' ? error : error.message });
  }
}

export const apiLogger = new APILogger();