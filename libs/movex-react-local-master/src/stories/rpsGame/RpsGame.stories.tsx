/* eslint-disable import/no-extraneous-dependencies */
import { RpsGame } from './RpsGame';
import '../styles.css';
import '../globals.css';

export default {
  component: RpsGame,
  title: 'RPS Game',
};

export const defaultStory = () => <RpsGame />;
