const MOVEX_ENDPOINT = process.env['NEXT_PUBLIC_MOVEX_ENDPOINT'] as string;
const MOCK_DATA = process.env['NEXT_PUBLIC_MOCK_DATA'] === 'TRUE';

export const config = {
  // MOVEX_ENDPOINT,
  // MOCK_DATA,
};


console.log('Config', config);