export const config = {
  REDIS_URL: process.env.REDIS_URL as string,
  APP_REVISION: process.env.APP_REVISION as string,
};

console.log('Config:', config);
