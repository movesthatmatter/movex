# Movex

Movex is a Multiplayer (Game) State Synchronization Library using Deterministic Action Propagation w/o the need to write Server Specific Code.

---

## Why? What makes it unique?

Movex combines the following features out of the box:

1. Local and Remote State Synchornization across all peers and server
2. Server Authoritative with Deterministic Propagation. Why is that important? Read [here](https://gafferongames.com/post/deterministic_lockstep/) or [here](https://longwelwind.net/blog/networking-turn-based-game/).
3. Easy, functional way to handle the state via Actions & Reducers
4. Write only client code. (The server code and multiplayer mode is incidental)!!! 🥳

## How does it work?

At its core Movex is a local Redux/Flux-like store that incidentally synchronizes the state with all the peers involved as well as with the server. Without having to write any specific code for that or for the server!

There are a few key concepts to know:
1. Reducers 
2. Resources
3. Actions
4. State & Private State

### Reducers

Each resource, needs a reducer that will modify it's state via [Actions](#actions).

A reducer, is almost the same as a Redux or React's useReducer, reducer. It's where the business/game logic lives.

```ts
// Api might change

const counterReducer = {
  increment: (state, action: Action<undefined>) => state,
  decrement: (state, action: Action<undefined>) => state,
  changeTo: (state, action: Action<number>) => state,
}

```

**It's a simple, deterministically mechanism that given the same input it returns the same output.** (This might depend on a few things, but for a general turn based game without physics it should)! 

**The difference is that that this runs both on client and on the server**

The client is just an optimization, and it takes advantage of the above quality of _determinism_: given the same input always returns the same output, which means that we can run it on the client even before it gets sent to the server to be authoratitively evalated and forwarded to all the subscribers.

_This could in theory be turned off, with the downside of increasing the general lag, on each turn. In general it shouldn't need to be turned off, since the client-sdk has a mechanism to ensure each next state is in sync with the server (in case it isn't a refetch from the server gets requested, generating at most an extra trip* (I believe))_

__But the server is the authority! And here is what it does:__
1. Receives an action and processes the next state
2. Sends an acknowledgemnt back to the sender
3. Forwards the action to the rest of the clients (subscribed to that resource)
4. Computes and Stores secret (private) state until a future _revelation_ event. (see the section on Secret State & Private Actions ) 

### Resources

A Resource at its very basic is the combination of Data (State) and Subscribers (Clients). 

There are some native resources like $match, $room or $chatHistory but you can simply create a new resource, as follows:

```ts
// Api might change

const counterReducer = movex.createReducer({
  resourceType: 'counter', // This is the resource type
  reducer: {
    increment: (state, action: Action<undefined>) => state,
    decrement: (state, action: Action<undefined>) => state,
    changeTo: (state, action: Action<number>) => state,
  },
  // this is the state that will be used on the client before the resource is retieved from api
  // it can also be used to infer the state 
  defaultState: {} as TState, 
});

const movex = new Movex({
  resourceReducers: [counterResourceReducer], // an array of them given from the reducer files
  config: MovexClientConfig
});

// use it
movex.resources.counter.create(rid, state);

// movex.resources is MovexResource({});
movex.resources.counter.onUpdated((nextState) => {
  console.log('got next state', nextState);
});

movex.resources.counter.dispatch({ type: changeTo, payload: 33 });

```

### Actions

Actions, like in Redux or Flux are simple commands paired with input that are sent to a reducer in order to compute the next state.

```ts

type Action = {
  type: 'incrementBy';
  payload: number;
}

```

#### Public Actions

A Public Action, as it's name implies is an Action that modifies the shared state (aka the public state), so everyone subscribed to it can see it.

```ts
type PublicAction = {
  type: 'incrementBy';
  payload: number;
  isPrivate?: false;
}
```

#### Private Actions & Secret State


These actions, as their name implies should NOT be revealed to the others (for a while). This is really useful in phase based games like poker when you don't want to show the whole state to each player until everyone submits.

```ts
type PrivateAction = {
  type: 'incrementBy';
  payload: number;
  isPrivate: true;
}
```



##### How Does the Private Action/State works?

The client sends the __*Private Action*__ paired with a __*Public Action*__. The public action is needed in order to be able to know when to reconciliate: Think about it as a record of the private action being taken (could be a change of status for that player), without actually revealing the content of the action.

- **On The Client**

The sender's client, calls the reducer with the private action which will simply return the next state, BUT disregards the paired public one as that is only rwlevant to its peers (the rest of the clients).

- **On the Server**

The server will call the reducer with the private action, but knowing behind the scenes that is a private action, it will do something different with the result, instead of simply merging it into the publc state, it will compute a delta from the prev to the next, and store that as a client private fragment/delta. This will allow the sender client to always get the _Private State_ even after a resource refetch, while all the others to get the _Public State_ or their own _Private State_.


#### Reconciliation Action

The Reconciliation Action is what determines when the private fragments of the state should reconcile back into a next public version.

### State Reconciliation

Movex takes advantage of the state checksums. Each forward/ack action will return the prev and next checksum to the clients. 

The clients will match the locally computed next checksum vs the remote received one.
- If they match all is good
- If they don't match here is the strategy:

The client will always store the last server reconciled checksum with its state (just in case it's needed to recompile). This will be derived from the ack/forward received from the server, which will contain the next checksum. If the client computes the same checksum than that becomes the last reconciled. If not, the strategy needs to happen.

The server always stores a map of each checksum and the action that derived it in the order in which it received it.
  - This could become big pretty early on, so there might be some optimization done.

When the server acks/forwards an action, and the checksum from the local state don't match, the client responds back with the last reconciled checksum it has, and the server will respond with all the actions from that point in the order of application. In theory this should set the two states in sync again, but there might be some other issues (especially if in the middle of the payload there was another action – or should it be an issue?)
When the client receives the reconciliatory actions (from it's reconciled state and checksum) it applies them right away and computes the next state (without intermediary renders I would say, since they might have already show some of them) and simply render the end result.

#### Deltas Reconciliation Strategy

This describes the strategy used to apply to deltas (resulted from a movex action).

Each delta has a PATH and a DIFF TYPE (Add, Change & Remove). Normally a simple merge/overwrite in case of primitive works, but when the paths coincide then a more complex strategy should be involved:

There are really only 3 type of diff between 2 states: ADD, CHANGE & REMOVE, and each one of them might have a specific use case given the data type in which they are applied. They also are applied on json states, so we only care about the json data types (https://www.w3schools.com/js/js_json_datatypes.asp). 

##### Primitives
```(Number, String, Boolean, Null))```

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

## Usage on the Client

The client acts as the state keeper. The whole server sync it just incidental, but the changes are kept locally as well as in a remote store!

That means the resource has its own store locally.

```ts
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

// instantiate it
const movex = new Movex({
  resourceReducers: [counterResourceReducer], // an array of them given from the reducer files
  config: MovexClientConfig
});

// use it
movex.resources.create(rid, state);

// movex.resources is MovexResource({});
movex.resources.counter.onUpdated((nextState) => {
  console.log('got next state', nextState);
})

```

#### With React

```tsx
// src: App.tsx

const AppComponent() {
  const movex = useInstance(new Movex({
    resourceReducers: [counterResourceReducer], // an array of them given from the reducer files
    config: ClientSDKConfig
  }));

  const [counterRid, setCounterRid] = useState<Movex.ResourceIdentifier>();

  useEffect(() => {
    
  }, [movex])

  // if (!counterId) {
  //   return null;
  // }

  return (
    <div>
      {counterRid ? (
        <CounterComponent rid={counterRid}>
      ) : (
        <button
          // When the resource get's created the default state becomes it's state once the response is returned
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

