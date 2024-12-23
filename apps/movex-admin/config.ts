const MOVEX_ENDPOINT = process.env['NEXT_PUBLIC_MOVEX_ENDPOINT'] as string;
const MOCK_DATA = process.env['NEXT_PUBLIC_MOCK_DATA'] === 'true';

export const config = {
  MOVEX_ENDPOINT,
  MOCK_DATA,
};
