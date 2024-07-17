/* eslint-disable import/no-extraneous-dependencies */
import React from 'react';
import '../styles.css';
import '../globals.css';
import { SpeedPushGame } from './SpeedPushGame';

export default {
  component: SpeedPushGame,
  title: 'Speed Push Game',
};

export const defaultStory = () => <SpeedPushGame />;
