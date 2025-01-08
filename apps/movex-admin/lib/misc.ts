export const getCookieFromRequest = (context: any, cookieName: string) =>
  (context as any).req.cookies[cookieName];
