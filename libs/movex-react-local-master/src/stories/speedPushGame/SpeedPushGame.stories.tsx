/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import '../styles.css';
import '../globals.css';
import { SpeedPushGame } from './SpeedPushGame';
// import { MovexLogger } from ;
import { action } from '@storybook/addon-actions';
import { MovexLogger } from 'movex-core-util';

export default {
  component: SpeedPushGame,
  title: 'Speed Push Game',
};

const logger: MovexLogger = {
  onLog: ({ method, prefix, message, payload }) => {
    console[method](prefix, message, payload);
    if (
      typeof message === 'string' &&
      message.indexOf('Action Dispatched') > -1
    ) {
      action(prefix + ' ' + message)(payload);
    }
  },
};

export const defaultStory = () => <SpeedPushGame logger={logger} />;
