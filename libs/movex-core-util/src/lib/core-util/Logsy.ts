// const movexLogsy = Logger.get('Movex');

type LogsyMethods =
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
  | 'group'
  | 'groupEnd'
  | 'debug';

var globalDisabled: boolean = false;

var globalLogsyConfigWrapper = {
  config: {
    disabled: false,
  },
};

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
    message?: any,
    ...optionalParams: any[]
  ) => {
    if (!this.ON || globalLogsyConfigWrapper.config.disabled) {
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
