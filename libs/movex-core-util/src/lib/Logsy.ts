// const movexLogsy = Logger.get('Movex');

import { Pubsy } from 'ts-pubsy';

type LogsyMethods =
  | 'log'
  | 'info'
  | 'warn'
  | 'error'
  | 'group'
  | 'groupEnd'
  | 'debug';

export type LoggingEvent = {
  method: LogsyMethods;
  prefix?: string;
  message?: unknown;
  payload?: LogsyPayload;
};

export type LogsyPayload = Record<string | number, unknown>;

class Logsy {
  private pubsy = new Pubsy<{
    onLog: LoggingEvent;
  }>();

  constructor(public prefix: string = '') {}

  onLog = (fn: (event: LoggingEvent) => void) =>
    this.pubsy.subscribe('onLog', fn);

  // To be overriden
  // public onLog: (event: LoggingEvent) => void = (event: LoggingEvent) => {
  //   this.pubsy.publish('onLog', {
  //     ...event,
  //   });
  // };

  private handler = (event: LoggingEvent) => {
    const prefix = this.hasGroupOpen() ? '' : this.prefix;
    this.pubsy.publish('onLog', {
      ...event,
      prefix,
    });
    // this.onLog({ ...event, prefix });
  };

  // public ON: boolean = globalDisabled || true;

  private activeGroups = 0;

  log = (message?: string, payload?: LogsyPayload) => {
    this.handler({ method: 'log', message, payload });
  };

  info = (message?: string, payload?: LogsyPayload) => {
    this.handler({ method: 'info', message, payload });
  };

  warn = (message?: string, payload?: LogsyPayload) => {
    this.handler({ method: 'warn', message, payload });
  };
  error = (message?: string, payload?: LogsyPayload) => {
    this.handler({ method: 'error', message, payload });
  };

  group = (message?: string, payload?: LogsyPayload) => {
    this.handler({ method: 'group', message, payload });
    this.openGroup();
  };

  groupEnd = (message?: string, payload?: LogsyPayload) => {
    if (message) {
      this.handler({ method: 'log', message, payload });
    }
    this.handler({ method: 'groupEnd' });
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

  debug = (message?: any, payload?: LogsyPayload) => {
    this.handler({ method: 'debug', message, payload });
  };

  withNamespace = (s: string) => {
    const next = new Logsy(this.prefix + s);

    // next.onLog((...args) => this.onLog(...args));
    // // this.onLog();
    // this.onLog((event) => {
    //   this.pubsy.publish('onLog', event);
    // });
    // next.onLog = (event) => this.pubsy.publish('onLog', event);
    next.onLog((event) => {
      this.pubsy.publish('onLog', event);
    });

    return next;
  };
}

export const globalLogsy = new Logsy();
