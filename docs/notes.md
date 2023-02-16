---
noteId: "5b740eb0a96f11ed963e5b4fcf4070c3"
tags: []

---

# Matterio - Multiplayer Game Synchornization using Deterministic Action Propagation

Each Resource will get it's own reducer register, which will actually simply be a resource subscriber or something like that. Resource State maybe

What makes matterio unique? 

The combination of the following features:

1. Special way to think of resources in the store. Each one gets a list of subscribers out of the box. The hwole system is thought with updates/subscroptions in mind
2. Server Authoritative with Deterministic Propagation out of the box
3. Easy way to work with state – via actions
4. Write only client code. The server code and multiplayer mode is incidental (out of the box)
   - It works just as well on the client only (locally) as on the server. Out of the box state sync 

### Reducers

A reducer, is almost the same as a Redux or React's useReducer, reducer. It's where the business/game logic lives.

It's a simple, deterministically mechanism that given the same input it returns the same output (This might depend on a few things, but for a general turn based game without physics it should)!

__The interesting thing is that this runs both on client and on the server.__

The client is just an optimization, and it takes advantage of the above quality of of determinism: given the same input always returns the same output, which means that we can run it on the client even before it gets sent to the server to be authoratitively evalated and forwarded to all the subscribers.
- This could in theory be turned off, with the downside of increasing the general lag, on each turn. In general it shouldn't need to be turned off, since the client-sdk has a mechanism to ensure each next state is in sync with the server (in case it isn't a refetch from the server gets requested, generating at most an extra trip* (I believe))

The server is the authority. And what it does is this:
1. Processes the next state
2. Sends an acknowledgemnt back to the sender
3. Forwards the action to the rest of the resource subscribers

There is a Special Case for Private (Secret) Acions. These actions, as their name implies should NOT be revealed to the others (for a while). The mechanism is:
1. The client sends the __*Private Action*__ paired with a __*Public Action*__. The public action is needed in order to be able to know when to reconciliate – Think about it as a record of the private action being taken (could be a change of status for that player), without actually revealing the content of the action

On The Client 

The sender's client, calls the reducer with the private action wich will simply return the next state, BUT disregards the paired pubcic one as that is for the rest of the peers

On the Server

The backend will call the reducer with the private one, but knowing behind the scenes that is a private action, it will do something different with the result, instead of simply merging it into the publc state. It will compute a delta – from the prev to the next, and store that as a client private fragment/delta – This will allow the sender client to get the private state even after a resource refetch, and all the others to get the publis state.

Public Action & Reconciliation

On the paired public actions, the reducer will simply return the next state, as normal, and that will be simply updated in the store.

BUT, at the time of reconciliation, which is always a custom time, and it alwayss happen in the public action (which could be called reconciliatory action) the next merged state needs to happen. And this is a very important step, and it needs to be gotten right. Both in terms of the API, and also of the logic.

- For the Api ideally, the reconciliation action (which is always determined at runtime on the server, based on the prev state) can simply return the next state as normal and be done, but how then will the backend know the result now is a reconciliation and what I need is to delete all of the deltas/fragments and merge everything together, vs just a regular public update.

So the trick here, is that the Public Action can be both: a regular public action and the reconciliatory action given the right condition happened. So how to extrapolate from the return of it that is one or the other? This is what the backened needs to be let known. 

***Options/questions***
- Can it be inferred by the backend? - How? it seems pretty hard w/o knowing about the logic domain, and we don't want to involve the backend in that.

- If not, we could send a specific result, which is only in case of reconciliation like instad of nextState a [nextState, { reconcile: true }]. This could be pretty minimal and a good blan B.

- Call a certain function?

- Also, the thing is that that reconciliation, should also only happen on the server – BUUUUT, we are actually good w/ that because the public also don't get called on the actual client, so it will never get to the reconciliation step. yey!

- There could be some heuristics in place like – now that one playe rcreated a secret, all the players need to before the revelation. Or all players need to submit the same private/public action pair, and then they automatically reconcile.
  - I don't like this b/c the reducer gives total control over the game. If this heuristic is in place it locks the devs into a certain specific constraint and I don't think it's good. The best is for them to decide when to actually call a reconciliation.

- I'm also thinking, of the reconciliatory action being almost like an extension of the private action, which doesn't even get a name. In this way I can enforce some rules/heuristics


- A specific key in the state like ($reconciliationStatus) 
  - I don't like this because the key needs to be defined in the state of the object, with some generics like: ResourceWithPrivateState<>

- A specific action name, that's present by default called: "ReconcileState" or something like this that gets called by the backedn only, when there are pirvate deltas. All the devs need to do is to return the prev if not or the next state if yes? Or just a simple boolean;
  - In case of the boolean this is a special action, which could be called somthing like: $reconcileCheck -> true | false. 
    - I like this one 

  - Or, just return the prev if nope, so the backend can check that it is the same instance so no, or it is a next instance so yes. 
    - this is good in terms of keeping the same method definition between the acion handlers, but it actually is more error prone as what if someone decideds to do smtg with the prev like copying it. Now that will badly return true instaed of false. I think the simple -> boolean is the best. Remember, there is no real need to stick 100% with redux. We solve different use cases.


  - Yeah, that's the beauty of this, that the backedn can add it's own actions, and the clients simply respond to those actions (handlers). Yeaaah. Inversion of control baby.

---

- Also, at the moment of reconciliation (through whatever means) I believe what could happen, is simply for the private actions to be sent to the rest of the peers (w/o the og sender), which will then be a normal action (again, the reducer doesnt know this is a private or public action, it's just the runner (client or backend) that does things differently). and the computed state will be the full state in sync between all peers and server. In addition, the backend will ensure to delete teh fragments/diffs. 
  - Also, with for the above to work, the diffs will need to be stored with the actions, in order to be forwarded later.

---

So a private action, is actually an action that is kept secret until a reconciliation action in the future, at which point they will be released. I like it! They could be called deferred actions as well. 

Also, with this in mind, the reconciliation could also be called revelation :). Time for revelation. But reconciliation makes sense too as now all the peers are back in sync with each one and the server.

--- 

Reconciliator Question:

How does the reconciliation fragments get applied?

I was actually thinking of the applying each diff, BUUUT actually do they really need to be applied? Or just the actions to be run again? ON the backend all the private functions will have to run again, while on the clients all of them except their own
  - This is a direct feature of being deterministic. You can run that functcion many times. The only issue is that the state might not be the same, but I believe it can work. – need a bit of testing. 
  - Another crazy idea coul even be to revert the whole state but that's not good because what if there were other type of actions in the middle. no
  - The other idea, is for the $reconciliationCheck action actually compute the next step. But the most beautiful would be to just rerun those actions, and actually if the state is typed well, those use cases need to be handled any otherwise the compiler will complain, so it's really good. I think this can work!


### Client

The client actually could act as the state keeper. The whole server sync it jsut incidental, but the changes are kept locally as well in a store!

Tha means the resource has its own store locally.

- 

## Usage

```ts
/// resources/action-types.ts

type ActionsMap = {
  // Private Action
  submitMoves: {
    color: Color;
    moves: Move[];
  };
  // Public Action
  playerSubmitted: Color;
}
```

```ts 
// gameReducer.ts

import { createResourceReducer } from 'matterio/client';

// This will be both run by the client and the server
export default createResourceReducer<ActionsMap, Resource>({
  // Private Move
  submitMoves: (prev, { payload }) => {
    // On the client, this will be run optimistically to set the state right away

    // On the server it will run to get the authority
    // After it runs on the server it send an ack to the sender, and DOESN'T broadcast to the rest since it's private
  },
  // Public Move
  playerSubmitted: (prev, { payload }) => {
    return {

      ...prev,
    }
  },

  // This will only be called on the backend after a private method is called.
  // With this the paired public could be optional, b/c the reconciliation mechanism is here!
  $reconcileCheck: (prev): boolean => {
    return prev.white.submitted && prev.black.submitted;
  }
});

```


```ts
// useResourceReducer.ts (for react)

import { setState } from 'react';
import { ClientSdk } from 'client-sdk';

export const useResourceReducer = <
  TResourceType extends Resource['type'],
  ActionsMap,
  Resource
>(rId: ResourceIdentifier<TResourceType>, reducer: Reducer<Resource, ActionsMap>) => {
  // This comes from the Provider
  const matterio = useMatterio();

  const [state, setState] = setState<Resouce['item']>();
  const dispatch = matterio.registerResourceReducer<ActionsMap>(
    rId, 
    reducer, 
    (nextResourceItem) => {
      setState(nextResourceItem);
    })

  return [dispatch, state];
}

```

```ts
// use it somewhere in react

import { useResourceReducer } from './useResourceReducer';
import gameReducer from './gameReducer';

const [dispatchGameActions, gameState] = useResourceReducer(
  { id: 1, type: 'game'},
  gameReducer
)

```

For react there will be a hook to register the reducer. 


### Next Ideas

Deploy it like next. Just by setting a bunch of files that at deploy time (github actions) will deploy the client and read the server files and put them on the server as well.
- This is all cool but it's much longer down the road, as it's pretty involved as a process, not needed and it also lock people in to a certain way of doing things: gitnub, adding scripts to the package, etc.
  - Fot now, I need to think of the easier way of adopting it into the current frameworks as a library.



# Business Plan

- **Phase 1:** Build the Matterio Library and open source it to the public
- **Phase 2:** Sell cloud hosting for the backend, including access to redis, persistence, etc MatterioCloud

The OS Server comes with a full grown community edition admin, persistence, userbase, analytics, in memory store (not redis) but with the ability to connect to a redis instance or to our own 

And b/c of that I believe before launch the the codebase should be split into matterio-cloud and matterio sdk (client & server)/framework, b/c only the frameowrk will be open source and avilable to the community, the cloud will be behind doors since we are selling it.


How did Vercel, Graphana nad other Open Source first companie shave started?

Look into Linode for hosting the cloud. It has a flat pricing per month. 