// import { backend } from './backend';

import { ClientSdk } from './client-sdk';

describe('matches', () => {
  it('should work', () => {
    const clientSdk = new ClientSdk<
      {},
      {
        status: 'test';
      }
    >({ url: '', apiKey: '' });
    // expect(backend()).toEqual('backend');

    clientSdk.createMatch({
      matcher: '',
      playersTotal: 2,
      game: {
        status: 'test',
      },
    });
  });
});
