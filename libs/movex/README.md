---
noteId: "7d63b880b79911edadd4d72b1615afa0"
tags: []

---

<img width="400" alt="logo_b@2x" src="https://user-images.githubusercontent.com/2099521/221382702-e655e567-0a5f-4520-b4f6-1dcfc73d2d86.png">

- [Movex](#movex)
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
  - [Private State Deltas Reconciliation Strategy (WIP)](#private-state-deltas-reconciliation-strategy-wip)
        - [Primitives](#primitives)
        - [Complex Data types (Arrays \& Objects)](#complex-data-types-arrays--objects)
          - [Array](#array)
- [Usage on the Client](#usage-on-the-client)
      - [Vanilla TS](#vanilla-ts)
      - [With React](#with-react)

<small><i><a href='http://ecotrust-canada.github.io/markdown-toc/'>Table of contents generated with markdown-toc</a></i></small>

--- 

# Movex

Movex is a Multiplayer (Game) State Synchronization Library using Deterministic Action Propagation w/o the need to write Server Specific Code.

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

const { counter } = movex.resources;

const resourceIdentifier = counter.create({ val: 0 });

// movex.resources is MovexResource({});
counter.onUpdated(resourceIdentifier, (nextState) => {
  console.log('got next state', nextState);
});

counter.dispatch(resourceIdentifier, { type: 'increment' });

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

const counterReducer = {
  increment: (state, action: Action<undefined>) => state,
  decrement: (state, action: Action<undefined>) => state,
  changeTo: (state, action: Action<number>) => state,
}

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

The Revelatory Action (Check) is what determines when the private fragments of the state should reconcile back into a next public version.

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
    const { payload } = action;

    return {
      ...state,
      // Apply the next submission to the submitting player
      [payload.playerId]: {
        submitted: true,
        moves: payload.moves, // reveal the moves
      }
    };
  },
  setSubmitted: (state, action): State => {
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
  },

  // This is not really an action here as it doesn't process the next state
  //  but returns true when it's time to reveal all the private states by 
  //  reconciling them all into the Public State
  $canRevealPrivateState: (state): boolean => {
    // If both players submitted than it's time to Reveal the moves!!!
    return state.playerA.submitted && state.playerB.submitted;
  }
}

dispatchPrivate(
// Private Function
{
  type: 'submitMoves',
  payload: {
    playerId: 'playerA',
    moves: ['e2e4', 'f2f4'],
  }
  isPrivate: true, 
}, 
// Paired Public Function
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

First of all it can take advantage of the state checksums. Each Forwarded/Acknowledge Action contains the prev and next state checksum, so the clients will be able to compare that with the locally computed next checksum and proceed accordingly given the outcome.


If they match all is good! 🥳

**If they don't match we take advanytage of the following:**

The client will always store the last server reconciled checksum with its state (just in case it's needed to recompile). This will be derived from the ack/fwd received from the server, containing the next state checksum. If the client computes the same checksum than that becomes the last reconciled. If not, the strategy needs to happen.

The server also stores a map of each checksum and the action that derived it in the order in which it was received. *(TODO: This could become big pretty early on, so there might be some optimization done.)*

When the server acks/forwards an action, and the checksum from the local state don't match, the client responds back with the last reconciled checksum it has, and the server will respond with all the actions from that point in the order of application. In theory this should set the two states in sync again, but there might be some other issues (especially if in the middle of the payload there was another action – or should it be an issue?)

When the client receives the reconciliatory actions (since it's reconciled state and checksum) it applies them right away and computes the next state (without intermediary renders I would say, since they might have already show some of them) and simply render the end result.

If the above doesn't work, for whatever reason, again dealing with Shared State is hard, we have the ultimate sling shot:

- The Client Sends for help to the Server and the Server will respond with the latest version of the reconciled state. This should set thngs straight for another while, but in theory this shouldn't really happen too often. Hopefully not at all! 😇 
  
> Note: This is still a WIP and we'll have to come up with proper tests and validation for this as well as probably more optimizations and heuristics)*

## Private State Deltas Reconciliation Strategy (WIP)

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
// Note: Api might change
// src: resource-reducers/counter.ts

export default movex.createReducer({
  resourceType: 'counter', // This is the resource type
  actionsMap: {
    increment: (state, action: Action<undefined>) => state,
    decrement: (state, action: Action<undefined>) => state,
    changeTo: (state, action: Action<number>) => state,
  },
  // this is the state that will be used on the client before the resource is retieved from api
  // it can also be used to infer the state 
  defaultState: {} as TState, 
});

// In this way this is the way the actions are inferred

```

#### Vanilla TS

```ts
// Note: Api might change

// instantiate it
const movex = new Movex({
  resourceReducers: [counterResourceReducer], // an array of them given from the reducer files
  config: MovexClientConfig
});

// use it
const resourceIdentifier = movex.resources.create(state);

// movex.resources is MovexResource({});
movex.resources.counter.onUpdated(resourceIdentifier, (nextState) => {
  console.log('got next state', nextState);
})

```

#### With React

```tsx
// Note: Api might change
// src: App.tsx

const AppComponent() {
  const movex = useInstance(new Movex({
    resourceReducers: [counterResourceReducer],     // an array of them given from the reducer files
    config: ClientSDKConfig
  }));

  const [counterRid, setCounterRid] = useState<Movex.ResourceIdentifier>();

  return (
    <div>
      {counterRid ? (
        <CounterComponent rid={counterRid}>
      ) : (
        <button
          // When the resource get's created the default state becomes it' state once the response is returned
          action={() => movex.createResource('counter', state).map(setCounterRid)}
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
  const [counter, dispatchCounterAction] = useResourceReducer(movex, myCounterResourceId);

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

