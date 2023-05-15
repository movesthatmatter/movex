<p align="center">
<img width="400" alt="logo_b@2x" src="https://user-images.githubusercontent.com/2099521/221382702-e655e567-0a5f-4520-b4f6-1dcfc73d2d86.png" />
<p>

Movex is a Multiplayer (Game) State Synchronization Library using Deterministic Action Propagation without the need to write Server Specific Code.

**It's currently in dev, but the following sections describe the idea behind it. Drop me a message or create an issue if you have any questions, ideas or would like to get involved.**

---

- [Why? What makes it unique?](#why-what-makes-it-unique)
- [How does it work?](#how-does-it-work)
  - [Resources](#resources)
  - [Reducers](#reducers)
      - [Client Runner](#client-runner)
      - [Server Runner](#server-runner)
  - [Actions](#actions)
    - [Public Actions](#public-actions)
    - [Private Actions \& Secret State](#private-actions--secret-state)
    - [Revelatory Action (Check)](#revelatory-action-check)
  - [How Does the Private Action/Secret State actually works?](#how-does-the-private-actionsecret-state-actually-works)
  - [Remote State Mismatch Resynchronization (WIP)](#remote-state-mismatch-resynchronization-wip)
        - [1. Use The Checksums to its advantage (Optimal)](#1-use-the-checksums-to-its-advantage-optimal)
        - [2. Ask for the whole State Again (Sub Optimal but rare)](#2-ask-for-the-whole-state-again-sub-optimal-but-rare)
  - [Private State Deltas Reconciliation Strategy (WIP \& not Used at the moment)](#private-state-deltas-reconciliation-strategy-wip--not-used-at-the-moment)
        - [Primitives](#primitives)
        - [Complex Data types (Arrays \& Objects)](#complex-data-types-arrays--objects)
          - [Array](#array)
- [Usage on the Client](#usage-on-the-client)
      - [Vanilla TS](#vanilla-ts)
      - [With React](#with-react)
  - [Constraints](#constraints)
        - [1. The Reducer Needs to stay Pure.](#1-the-reducer-needs-to-stay-pure)

<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>

--- 

# Why? What makes it unique?

Movex combines the following features out of the box:

1. Local and Remote State Synchronization across all peers and server.
2. Server Authoritative with Deterministic Propagation. Why is that important? Read [here](https://gafferongames.com/post/deterministic_lockstep/) or [here](https://longwelwind.**net**/blog/networking-turn-based-game/).
3. Secret/Private State Fragments.
4. Easy, functional way to handle the state via Actions & Reducers.
5. Write only client code. (The server code and multiplayer mode is incidental)!!! 🥳

# How does it work?

At its core Movex is a local Redux/Flux-like store that incidentally synchronizes the state with all the peers involved as well as with the Server (Master). Without having to write any specific code for that or for the Server!

There are a few key concepts to know:
1. Resources
2. Reducers 
3. Actions
4. State & Private State Fragments

## Resources

A Resource at its very base is the combination of Data (State) and Subscribers (Clients) that lives in a (Remote) Store accessible to all the involved clients/peers in the system. A resource is following the Observable Pattern out of the box, allowing clients to subscribe to it and get change notifications. Out of the box 🤩!

This makes working with a resource a breeze. Here's an example:

```ts
// *Note the Api can change

const counterResource = movex.registerResource(counterReducer);

const resourceIdentifier = counter.create();

// movex.resources is MovexResource({});
counterResource.onUpdated(resourceIdentifier, (nextState) => {
  console.log('got next state', nextState);
});

counterResource.dispatch(resourceIdentifier, { type: 'increment' });

```

A resource can be anything from a room, a game, a chat box, to any portion of your game or application that needs it's own seperated state & subscribers. 

For example your UI can display a Game of Chess inside a Room Page. The Room Resource contains all sort of items such as a chatbox, a leaderboard, video chat, etc., while the Game only contains the state of the game and the players. 
There is a requirement that only the Clients that have the right password can enter the Room, see the Game and have access to the chatbox and videochat, but the game will be "broadcasted" to "spectators" outside of the room as well. This is a fair requirement for a chess tournament actually, and thus there needs to be a distinction between the Game Resource and the Room Resource because each one of them has its own set of subscribers.

Movex comes with some native resources out of the box such as \$match, \$room, \$chat, etc.,
but you can simply create a new resource of your own. Just don't prefix it with "\$"!

## Reducers

Each Resource, needs a Reducer to modify its state. A Movex Reducer, is almost the same as a Redux or React's useReducer' reducer. It's where the business/game logic happens. [Learn more here](https://www.tutorialspoint.com/redux/redux_reducers.htm) on what a reducer does in Redux.

Example of a reducer:

```ts
// *Api might change

import { Action } from 'movex';

export type CounterState = {
  count: number;
};

export const initialCounterState: CounterState = {
  count: 0,
};

export type CounterActions =
  | Action<'increment'>
  | Action<'decrement'>
  | Action<'incrementBy', number>;

export default (state = initialCounterState, action: CounterActions) => {
  if (action.type === 'increment') {
    return {
      ...state,
      count: state.count + 1,
    };
  }

  if (action.type === 'decrement') {
    return {
      ...state,
      count: state.count - 1,
    };
  }

  if (action.type === 'incrementBy') {
    return {
      ...state,
      count: state.count + action.payload,
    };
  }

  return state;
};
```

It's a simple, deterministic mechanism that when given the same input, it always returns the same output.

Where it differs from Redux is that it runs both on the Client and the Server, which makes such features as **Server Authority** and **Private States** possible.

#### Client Runner

The client is just an optimization, and it takes advantage of the above mentioned quality of _determinism_ (same input always returns the same output), which means that we can run it on the client even before it gets sent to the server for validation, and thus render the next state without any lag.

See the secion on [State Mismatch Resynchronization](#remote-state-mismatch-resynchronization) on what happens when the remote states get out of sync and how does movex reconcile them.

#### Server Runner

Although, the reducer runs on the client, the Server is always the **authority**! **This is the feature that enables *Server Side Authority* without writing server specific code.**
*Note, this feature will only work with JS/TS codebases for the initial releases, and it will still need to be deployed manually (most likely via Docker). This is still a Work In Progress.*

Here is what the Server Runner does:
1. Receives an action and processes the next state.
2. Sends an acknowledgemnt back to the sender containing the checksum of the processed state.
3. Forwards the action to the rest of the clients subscribed to that resource (peers).
4. Computes and Stores Private State Fragments until a future _revelation_ event. (See the section on [Secret State & Private Actions](#private-actions--secret-state)).
5. Calls the `$canRevealPrivateState` Native Action after each incoming Private Action. (This only gets called on the server)

## Actions

Actions, like in Redux or Flux are simple commands paired with input that are sent to a reducer in order to compute the next state.

```ts

type Action = {
  type: 'incrementBy';
  payload: number;
}

```

### Public Actions

A Public Action, as its name implies is an Action that modifies the shared state (aka the public state), so everyone subscribed to it can get notified and see it.

```ts
type PublicAction = {
  type: 'incrementBy';
  payload: number;
  isPrivate?: false;
}
```

### Private Actions & Secret State

The State resulted from these actions MUST NOT be seen by the other peers/players in a game, until a future revelatory event. This is really useful in submission based games like poker when you don't want to show the whole state (cards) to each player until everyone submits.

```ts
type PrivateAction = {
  type: 'incrementBy';
  payload: number;
  isPrivate: true;
}
```

### Revelatory Action (Check)

The Revelatory Action (Check) is what determines when the private fragments of the State should reconcile back into a next public version.

It is part of the Reducer, and it is the only code that runs only on the Server, but it's minimal and part of the same Reducer that runs on the Client, which makes movex almoooost serverless :).

Here's how it works:

```ts
// *Note Api might change

type State = {
  playerA: {
    submitted: boolean;
    moves: Move[] | undefined;
  };
  playerB: {
    submitted: boolean;
    moves: Move[] | undefined;
  };
}

const counterReducer = {
  submitMoves: (state, action): State => {
    
  },
  setSubmitted: (state, action): State => {
    
  },

}

const gameReducer = (state = initialCounterState, action: CounterActions) => {
  if (action.type === 'submitMoves') {
    const { payload } = action;

    return {
      ...state,
      // Apply the next submission to the submitting player
      [payload.playerId]: {
        submitted: true,
        moves: payload.moves, // reveal the moves
      }
    };
  }

  if (action.type === 'setSubmitted') {
    const { payload } = action;

    return {
      ...state,
      // Apply the next submission to the submitting player
      [payload.playerId]: {
        // Set the status to submitted so the other player can see I submitted
        //  and also for the canReveal Validation to determine when to reconcile
        submitted: true, 
        moves: [], // hide the moves
      }
    };
  }

  return state;
};

// As a static method on the reducer function to check wether the  
//  It returns true when it's time to reveal all the private states by 
//  reconciling them all into the Public State
gameReducer.$canRevealPrivateState: (state): boolean => {
  // If both players submitted than it's time to Reveal the moves!!!
  return state.playerA.submitted && state.playerB.submitted;
}

dispatchPrivate(
  resourceIdentifier,
{
  type: 'submitMoves',
  payload: {
    playerId: 'playerA',
    moves: ['e2e4', 'f2f4'],
  }
  isPrivate: true, 
},
{
  type: 'setSubmitted',
  payload: {
    playerId: 'playerA',
  }
})

```

## How Does the Private Action/Secret State actually works?

A __*Private Action*__ can only be sent in pair with a __*Public Action*__. The public action is needed to create the changes in the Public State in order for the `$canRevealPrivateState` handler to determine if it can reconcile the states or not yet. Think about it as a record of the private action being taken (could be a change of status for that player), without actually revealing the content of the action.

- **On The Client**

The sender's client, calls the reducer with the private action which will simply return the next state, BUT disregards the paired public one as that is only relevant to its peers (the rest of the clients).

- **On the Server**

The server will call the reducer with the private action, but knowing behind the scenes that is a private action, it will do something different with the result. Instead of simply merging it into the publc state, it will compute a delta from the prev to the next, and store that as a Client Private Fragment (delta) along with the action. This will allow the Sender Client to always get the _Private State_ even after a resource refetch, while all the others to get the _Public State_ or their own _Private State_ (in case they have dispatched Private Actions as well and the state hasn't reconciled yet).

## Remote State Mismatch Resynchronization (WIP)

Sometimes there might be mismatches in the client state and the server state. This could be due to network errors, bugs in the code or who knows what. Dealing with Shared State is hard :), but don't fret, Movex has some solutions:

##### 1. Use The Checksums to its advantage (Optimal)

 First of all it can take advantage of the state checksums. Each Forwarded/Acknowledge Action contains the prev and next state checksum, so the clients will be able to compare that with the locally computed next checksum and proceed accordingly given the outcome.


**If they match all is good 🥳, if not we take advantage of the following:**

The client will always store the last server reconciled checksum with its state (just in case it's needed to recompile). This will be derived from the ack/fwd received from the server, containing the next state checksum. If the client computes the same checksum than that becomes the last reconciled. If not, the below _Strategy_ needs to happen.

The server also stores a map of each checksum and the action that derived it in the order in which it was received. *(TODO: This could become big pretty early on, so there might be some optimization done.)*

When the server acks/forwards an action, and the checksum from the local state don't match, the client responds back with the last reconciled checksum it has, and the server will respond with all the actions from that point in the order of application. In theory this should set the two states in sync again, but there might be some other issues (especially if in the middle of the payload there was another action – or should it be an issue?)

When the client receives the reconciliatory actions (since it's reconciled state and checksum) it applies them right away and computes the next state (without intermediary renders I would say, since they might have already show some of them) and simply render the end result.

##### 2. Ask for the whole State Again (Sub Optimal but rare)

If the above doesn't work, for whatever reason, again dealing with Shared State is hard, we have the ultimate sling shot:

The Client Sends for help to the Server and the Server will respond with the latest version of the reconciled state. This should set things straight for another while, but in theory this shouldn't really happen too often. Hopefully not at all! 😇 
  
> Note: This is still a WIP and we'll have to come up with proper tests and validation for this as well as probably more optimizations and heuristics

## Private State Deltas Reconciliation Strategy (WIP & not Used at the moment)

This describes the strategy used to apply to deltas (resulted from a movex action).

Each delta has a PATH and a DIFF TYPE (Add, Change & Remove). Normally a simple merge/overwrite in case of primitive works, but when the paths coincide then a more complex strategy should be involved:

There are really only 3 type of diff between 2 states: ADD, CHANGE & REMOVE, and each one of them might have a specific use case given the data type in which they are applied. They also are applied on json states, so we only care about the json data types (https://www.w3schools.com/js/js_json_datatypes.asp). 

##### Primitives

The Primitives are very straightforward, as follows:

- ADD + ADD => N/A as it cannot happen at the same path for a primitive

- ADD + CHANGE => If the path is the same then the change simply changes the addition, but most likely this is N/A as ADD + ADD

- ADD + REMOVE => N/A or Add Wins b/c a the time of "REMOVE" action, the state did not "know" about the addition therefore was applied to a prev state 

- CHANGE + ADD => Both. An Add will be on a different PATH so N/A really

- CHANGE + CHANGE => Last Action wins

- CHANGE + REMOVE => Change becomes ADD and wins. __Any issues with that?!__ My thinking is that the removal happened w/o knowing of the CHANGE so the CHANGE WINS

- REMOVE + ADD => ADD wins or N/A

- REMOVE + CHANGE => Change becomes ADD and wins. See above CHANGE + REMOVE

- REMOVE + REMOVE => Get's removed w/o an error


##### Complex Data types (Arrays & Objects)

These are more complex b/c they allow for nesting.

###### Array

- ADD + ADD => N/A as it cannot happen at the same path for a primitive

- ADD + CHANGE => If the path is the same then the change simply changes the addition, but most likely this is N/A as ADD + ADD

- ADD + REMOVE => N/A or Add Wins b/c a the time of "REMOVE" action, the state did not "know" about the addition therefore was applied to a prev state 

- CHANGE + ADD => Both. An Add will be on a different PATH so N/A really

- CHANGE + CHANGE => Last Action wins

- CHANGE + REMOVE => Change becomes ADD and wins. __Any issues with that?!__ My thinking is that the removal happened w/o knowing of the CHANGE so the CHANGE WINS

- REMOVE + ADD => ADD wins or N/A

- REMOVE + CHANGE => Change becomes ADD and wins. See above CHANGE + REMOVE

- REMOVE + REMOVE => Get's removed w/o an error


# Usage on the Client

The client acts as the state keeper. The whole server sync it just incidental, but the changes are kept locally as well as in a remote store!

That means the resource has its own store locally.

```ts
// *Api might change

import { Action } from 'movex';

export type CounterState = {
  count: number;
};

export const initialCounterState: CounterState = {
  count: 0,
};

export type CounterActions =
  | Action<'increment'>
  | Action<'decrement'>
  | Action<'incrementBy', number>;

export default (state = initialCounterState, action: CounterActions) => {
  if (action.type === 'increment') {
    return {
      ...state,
      count: state.count + 1,
    };
  }

  if (action.type === 'decrement') {
    return {
      ...state,
      count: state.count - 1,
    };
  }

  if (action.type === 'incrementBy') {
    return {
      ...state,
      count: state.count + action.payload,
    };
  }

  return state;
};
```

#### Vanilla TS

```ts
// Note: Api might change

// instantiate it
const movex = new Movex(config: MovexClientConfig);

const conterResource = movex.registerResource('counter', counterResourceReducer);

// use it
const counterResourceIdentifier = conterResource.create();

// movex.resources is MovexResource({});
counterResource.onUpdated(counterResourceIdentifier, (nextState) => {
  console.log('got next state', nextState);
})

```

#### With React

```tsx
// Note: Api might change
// src: App.tsx

const AppComponent() {
  const movex = useInstance(new Movex({
    config: ClientSDKConfig
  }));

  const counterResource = useMemo(() => movex.registerResource(counterReducer), [movex])

  const [counterRid, setCounterRid] = useState<Movex.ResourceIdentifier>();

  return (
    <div>
      {counterRid ? (
        <CounterComponent rid={counterRid}>
      ) : (
        <button
          // When the resource get's created the default state becomes it' state once the response is returned
          action={() => counterResource.create().map(setCounterRid)}
        >
          Create Counter
        </button>
      )}
    </div>
  )
}
```

```tsx
// Note: Api might change
// src: Counter.tsx
import { useResourceReducer } from 'movex-react';

const CounterComponent({rid: Movex.ResourceIdentifier<'counter'>}) {
  const [counter, dispatchCounterAction] = useResourceReducer(movex, rid);

  return (
    <div>
      <span>Counter: {counter}</span>

      {/* Actions */}
      <button onClick={() => dispatchCounterAction({type: 'increment', payload: undefined})}>
        Increment
      </button>
      <button onClick={() => dispatchCounterAction({type: 'decrement', /* payload could be ommited when undefined */ })}>
        Decrement
      </button>
      <button onClick={() => dispatchCounterAction('changeTo', 34)}> {/* this shows an even simpler api */}
        Change to
      </button>
    </div>
  )
}f
```

## Constraints

##### 1. The Reducer Needs to stay Pure.
This is actually a constraint of general functoinal programming that says: "A function returns the same output everytime it receives a given input X."

This means that the reducer cannot make use of global contextt utilities such as randomness or time, since they break purity, but instead should rely on given input to calculate the next state.

Note: One thing that can be a feature is to use Placeholders at action level, such as GetMovexTime, or GetMovexUUID, or GetMovexID, etc..., which can be replaceable
on the server and they don't count towards the checksum, or... These can work by adding a temporary *value* locally (since this only needs to be part of the state until the ack comes back to the sender and it only needs to happen for the sender), which can then be picked up at server level and replaced with the real one, which will also happen on the client at ack time. The peers will always get the FWD/Reconciliation action with the Replaced Real Value and the Checksum based on it!

This is in accord wth authority being on the server, not on the client, which thus means the client shouldn't really be the one deciding what the next id of a resource should be or what the timestamp really is (since that can be easily hacked), but the server. 

Example of a scenario:

```ts
movex.dispatch({
  type: 'sendMessage',
  payload: {
    msg: "Hey",
    timestamp: Movex.timestamp(), // ___@mvx:timestamp___ or something like this
    id: Movex.id(), // ___@mvx:id___ or Movex.uuid(), etc...
  }
})
```

Locally this is saved with some randomly randomly or current local time, etc... values, thus not having to deal with asking the server for them pre-emptively, and thus waiting for the trip back from the server.

```ts
// local state looks like this:

const chatState = {
  messages: [
    {
      msg: 'Hey',
      timestamp: 131312313123, // the time now which will get replaced with the time from the server
      id: 'some-id', // gets replaced
    }
  ]
} 

```

And the "ack" looks something like this

```ts

movex.onDispatched(({ action, next: nextLocalCheckedState }) => {
  movex.onEmitted((ack) => {
    if (ack.placeholders) {
      const nextLocalStateWithRealValues = Movex.replacePlaceholders(nextLocalCheckstate, ack.placeholders);

      if (ack.masterChecksum !== nextLocalStateWithRealValues[1]) {
        // If they aren't the same we have an issue, but normally they should be the same

        return;
      }
    } 
    
    // Regular logic
    else if (ack.masterChecksum !== nextChecksum) {
      // If they aren't the same we have an issue, but normally they should be the same

      return;
    }
  })
})


```

But there is still an issue where the id, could be used write a way, let's say to redirect to another page or smtg like that. In which case
when the ack comes back it it's going to be too late b/c the user already is at the wrong place in the UI.

One solution for this could be a special type of dispatch, that waits for the ack to come back before affecting the local state: a delayed dispatch.
This is a limitation of both the learning curve, and the performance of the library/game/application, as well as it breaks a bit from the "write on the client only", although the latter still is relevant as the client doesn't need to know anything ab the msater nor the developer, just to wait for a bit (the magic happens in movex), so it might not be that bad.

Besides it's pretty exceptional – only when creating an id, and that id is to be used right away, otherwise the placeolder could work. In the worst case even a client generated id/time/etc is ok – just not ideal.