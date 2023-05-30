const APP_REVISION = (process.env['NEXT_PUBLIC_APP_REVISION'] ||
  process.env['NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA']) as string;

const API_ORIGIN = process.env['NEXT_PUBLIC_API_ORIGIN'] as string;
const API_SECURE = process.env['NEXT_PUBLIC_API_SECURE'] as string;
const API_PROTOCOL_SUFFIX = API_SECURE === 'true' ? 's' : '';

export const AppConfig = {
  APP_REVISION,

  API_HTTP_ENDPOINT: `http${API_PROTOCOL_SUFFIX}://${API_ORIGIN}`,
  API_WSS_ENDPOINT: `ws${API_PROTOCOL_SUFFIX}://${API_ORIGIN}`,
};

console.log('App Config', AppConfig);
