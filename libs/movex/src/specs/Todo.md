---
noteId: "1c13b2a0b51f11edadd4d72b1615afa0"
tags: []

---

## Doing

April 6th

I managed to start the Orchestration process, and where I left off is the Mock Emitter connecting the master with the clients. Need some hooking there but otherwise 
I'm there. It works with one client. Now is time for multiple.

After this, the orchestration should be much simpler, and the testing of the fwd and xreconciliation actions much more straightforward as well.

TODO After this works:
- Test peer state gets updated correctly
- Test the reconciliatory actions after the private state gets revealed
- Implement the Emitter for Socket.IO

--

Today (March 29) I worked on adding the MovexMaster as the Master Orchestrator, and changed the old Movexmaster into MovexMasterResource.
I also added MovexClientResource which used to be the old MovexResource.

This change is needed mainly to be able to write all the code inside Movex, even the one that lives only on master or the io portion. A code that lives in the codebase is a code that can be tested. All others are possibilities and opportunities for errors.

I've introduced the concept of MovexIO (WIP), to abstract away the socket/local/test etc protocol that makes the client server communication possible. So then again it's easy to setup in a testing environment.

Outcomes after WIP is done:
- createMasterEnv is removed or very very thin - no business logic
- the socket layer is abstracted by movexIO
- able to orchestrate the whole master/client connection and test each client getting the correct resource state

Next To Do

- rewrite Movex, the entry file. All the previous resource CRUD methods can be removed and only the simple (action/reducer) API alowed
  - this also means I can rewrite it to not be socket/io connection agnostic, and thus to be able to provide a tester. 
  - alos, with this occasion, all the master resource to client resource hooking can happen in here inside the registerResource! (onDispatched -> emitAction, onFwdAction, onReconciliatoryActions), and this file will be the tested one! 

----

- Now/ work on MovexMaster + masterEnv
  - I feel the need to have a MovexClient, split form the Movex (Client) SDK, in order to design and test the master/client orchestration but without the need to fire up the whole system. Hmm :/
    - Here it would be where the onFwdAction, onReconciliatoryAction, reconciliation and resynchornization logic would live
    - This should be split from the MovexClientSDK so it can be easily tested
    - Also, the Movex (on Client) could be allowed to load the Master in it to run all locally if so needed. Some usecases could be for not wanting to have another state management for the single player mode of a multiplayer game. Another when there is no server, but just a Peer to Peer arch, where one of the peers becomes the master.

- Next to do: Movex becomes MovexClient and MovexClient becomes the client portion that reconciles and resynchronizes the state from master! So it can be part of the logic 
---

    - What shoould the master return for the reconciliation portion?
      - The series of FWD and Ack for each client no? no cause I don't have the clients there
      - and the nthe outside will map them and forward them=

- Done/ work on $canReconcileState part

## To Do

## Backlog

## Done

- Done/ Add reconciliation handler or MovexMaster 

- Make the types work between resources and create movex instance on client.
  - Maybe redefine the Resource Reducer Input, The Resource Handler