const localProcess = process || require('process');

export const tillNextTick = () => new Promise(localProcess.nextTick);
