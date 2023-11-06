// const movexLogsy = Logger.get('Movex');

type LogsyMethods =
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
  | 'group'
  | 'groupEnd'
  | 'debug';

const globalDisabled = false;

const globalLogsyConfigWrapper = {
  config: {
    disabled: false,
    verbose: false,
  },
};

// Depreacte from here! maybe make own library

class Logsy {
  constructor(
    public prefix: string = '',
    disabled = false,
    private globalConfig?: typeof globalLogsyConfigWrapper
  ) {
    // This is needed
    if (disabled) {
      this.disable();
    }
  }

  private handler = (
    method: LogsyMethods,
    message?: unknown,
    ...optionalParams: unknown[]
  ) => {
    if (!this.ON || globalLogsyConfigWrapper.config.disabled) {
      return;
    }

    // If verbose is false, we don't want to log, info or debug
    if (
      (method === 'log' || method === 'info' || method === 'debug') &&
      !globalLogsyConfigWrapper.config.verbose
    ) {
      return;
    }

    const prefix = this.hasGroupOpen() ? '' : this.prefix;

    if (typeof message === 'string') {
      console[method](prefix + ' ' + message, ...optionalParams);
    } else {
      console[method](prefix, message, ...optionalParams);
    }
  };

  public ON: boolean = globalDisabled || true;

  private activeGroups = 0;

  enable() {
    this.ON = true;

    if (this.globalConfig) {
      this.globalConfig.config.disabled = false;
    }
  }

  disable() {
    this.ON = false;

    if (this.globalConfig) {
      this.globalConfig.config.disabled = true;
    }
  }

  log = (message?: any, ...optionalParams: any[]) => {
    this.handler('log', message, ...optionalParams);
  };

  info = (message?: any, ...optionalParams: any[]) => {
    this.handler('info', message, ...optionalParams);
  };

  warn = (message?: any, ...optionalParams: any[]) => {
    this.handler('warn', message, ...optionalParams);
  };
  error = (message?: any, ...optionalParams: any[]) => {
    this.handler('error', message, ...optionalParams);
  };

  group = (message?: any, ...optionalParams: any[]) => {
    this.handler('group', message, ...optionalParams);
    this.openGroup();
  };

  groupEnd = () => {
    // console.groupEnd()
    this.handler('groupEnd');
    this.closeGroup();
  };

  private openGroup = () => {
    this.activeGroups = this.activeGroups + 1;
  };

  private closeGroup = () => {
    if (this.activeGroups > 0) {
      this.activeGroups = this.activeGroups - 1;
    } else {
      this.activeGroups = 0;
    }
  };

  private hasGroupOpen = () => this.activeGroups > 0;

  debug = (message?: any, ...optionalParams: any[]) => {
    this.handler('debug', message, ...optionalParams);
  };

  withNamespace = (s: string) => {
    return new Logsy(this.prefix + s);
  };
}

export const globalLogsy = new Logsy('', false, globalLogsyConfigWrapper);
export const logsy = globalLogsy;
