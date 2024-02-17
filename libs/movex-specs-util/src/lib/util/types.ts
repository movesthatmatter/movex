//  TODO: This needs to be better

export type WhiteMove = `w:${string}-${string}`;
export type BlackMove = `b:${string}-${string}`;
export type Move = WhiteMove | BlackMove;

export type Submission =
  | {
      status: 'none';
      white: {
        canDraw: true;
        moves: Move[];
      };
      black: {
        canDraw: true;
        moves: Move[];
      };
    }
  | {
      status: 'preparing';
      white: {
        canDraw: true;
        moves: Move[];
      };
      black: {
        canDraw: true;
        moves: Move[];
      };
    }
  | {
      status: 'partial';
      white: {
        canDraw: true;
        moves: Move[];
      };
      black: {
        canDraw: false;
        moves: Move[]; // hidden
      };
    }
  | {
      status: 'partial';
      white: {
        canDraw: false;
        moves: Move[]; // hidden
      };
      black: {
        canDraw: true;
        moves: Move[];
      };
    }
  | {
      status: 'reconciled';
      white: {
        canDraw: false;
        moves: Move[];
      };
      black: {
        canDraw: false;
        moves: Move[];
      };
    };
