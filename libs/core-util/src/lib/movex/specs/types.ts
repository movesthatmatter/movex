//  TODO: This needs to be better

export type WhiteMove = `w:${string}-${string}`;
export type BlackMove = `w:${string}-${string}`;

export type Submission =
  | {
      status: 'none';
      white: {
        canDraw: true;
        moves: WhiteMove[];
      };
      black: {
        canDraw: true;
        moves: BlackMove[];
      };
    }
  | {
      status: 'preparing';
      white: {
        canDraw: true;
        moves: WhiteMove[];
      };
      black: {
        canDraw: true;
        moves: BlackMove[];
      };
    }
  | {
      status: 'partial';
      white: {
        canDraw: true;
        moves: WhiteMove[];
      };
      black: {
        canDraw: false;
        moves: BlackMove[]; // hidden
      };
    }
  | {
      status: 'partial';
      white: {
        canDraw: false;
        moves: WhiteMove[]; // hidden
      };
      black: {
        canDraw: true;
        moves: BlackMove[];
      };
    }
  | {
      status: 'reconciled';
      white: {
        canDraw: false;
        moves: WhiteMove[];
      };
      black: {
        canDraw: false;
        moves: BlackMove[];
      };
    };
