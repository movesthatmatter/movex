import styled from '@emotion/styled';
import { PlayRPSButton } from '../modules/rock-paper-scissors/RPSPlayButton';

const StyledPage = styled.div`
  .page {
  }
`;

export function Index() {
  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.@emotion/styled file.
   */
  return (
    <StyledPage>
      <PlayRPSButton />
    </StyledPage>
  );
}

export default Index;
