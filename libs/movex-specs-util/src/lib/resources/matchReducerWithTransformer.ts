import { PlayerId } from 'libs/movex-examples/src/modules/rps';
import { Action, MovexRemoteContext } from 'movex-core-util';

export const ABORT_TIME_MS = 500;

type Color = 'black' | 'white';

export type AbortableMatch =
  | {
      status: 'pending';
      winner: undefined;
      startedAt: undefined;
      lastMoveBy: undefined;
    }
  | {
      status: 'idling';
      winner: undefined;
      startedAt: number;
      lastMoveBy: Color;
    }
  | {
      status: 'aborted';
      winner: undefined;
      startedAt: number;
      lastMoveBy: Color | undefined;
    }
  | {
      status: 'ongoing';
      winner: undefined;
      startedAt: number;
      lastMoveBy: Color;
    }
  | {
      status: 'completed';
      winner: Color | '1/2';
      startedAt: number;
      lastMoveBy: Color;
    };

export const initialmatchReducerWithTransoformerState: AbortableMatch = {
  status: 'pending',
  winner: undefined,
  startedAt: undefined,
  lastMoveBy: undefined,
};

export type AbortableMatchActions = Action<'move', { at: number, color: Color }>;

export const matchReducerWithTransoformer = (
  state = initialmatchReducerWithTransoformerState as AbortableMatch,
  action: AbortableMatchActions
): AbortableMatch => {
  if (action.type === 'move') {
    if (state.status === 'pending') {
      return {
        status: 'idling',
        winner: undefined,
        startedAt: action.payload.at,
        lastMoveBy: action.payload.color,
      };
    }

    if (state.status === 'idling') {
      return {
        status: 'ongoing',
        winner: undefined,
        startedAt: state.startedAt,
        lastMoveBy: action.payload.color,
      };
    }
  }

  return state;
};


matchReducerWithTransoformer.$transformState = (state: AbortableMatch, remoteContext: MovexRemoteContext) => {
  // if (state.status === 'inProgress' && state.) {
  // }
  if (state.status === 'idling' && state.startedAt + ABORT_TIME_MS < remoteContext.now()) { // Where does the NOW() come from?

  }
  // should it just be the system now, or a movex now? 
};
