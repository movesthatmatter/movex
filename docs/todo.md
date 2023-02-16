---
noteId: "5d2585c0ab1011ed963e5b4fcf4070c3"
tags: []

---

# Project Making Matterio MVP

There are a bunch of different fronts:

1. Product
   1. [Matterio Libraries](#matterio-library)
      1. [@matterio/client](#matterio/client)
      2. [@matterio/server](#matterio/server)
      3. [To Do](#product-todo)
   2. [Matterio Cloud](#matterio-cloud)
2. [Marketing](#marketing)
   1. [Landing Page](#landing-page)

## Product

### Matterio Library[matterio-library]

This is the Open Source and the core of Matterio. It will run on the client as (@matterio/client) and on the server for community deploys as @matterio/server (ex @matterio/backend).

##### @matterio/client[matterio/client]

Thinking to name this just @matterio to denote the importance of it over @matterio/server but probably doesn't make sense.

This is what runs directly on the client. Supporting js/ts only for now with posibility of opening it up to other languages maybe via a transpiler for the reducer. Since the server will always be in js, it will only need a way to read the reducer from other language so a transpiler might just do it, thus offering another benefit for people out of the box. 


##### @matterio/server[matterio/server]

This will be integrated directly on the cloud but the library is open source for who needs it


##### @matterio/backend 

This is deprecated in favor of using @matterio/server directly, as I noticed that after the idea of deploying just the reducer to the cloud (via cli probably for custom backends but in the beginning just offering a manual way to do it should be ok), or a github action out of the box for Matterio-cloud.


### To Do in order of importance [product-todo]

**Validation**

- [ ] Validate the whole mechanism works between the Client and the Server
  - [ ] Simulate the reducer being called on both ends and return the appropraite responses to the clients. Probably this will be a server (ex backend) test
  - [ ] Especially around dealing with private fragments
- [ ] Validate the reducer + its dependencies can be uploaded (as an edge function?) to the cloud and run on demand. No need for edginess here, just the idea of functions/lambda or a runtime.
  - [ ] Bonus: Validate it could potentiallly run if written in other languages

**Implementation**

- [ ] Refactor the Client code to work with the reducer
  - [ ] Define an API for the game dev to use with @matterio
    - [ ] connect (coud be out of the box)
    - [ ] disconnect
    - [ ] createResource
    - [ ] registerResourceUpdater (reducer)
      - [ ] Get the action dispatcher ith the logic for client (See ./notes.md for that)
    - [ ] Native Resources
      - [ ] Match (a special type of resource)
        - [ ] Create Match
        - [ ] Join Match
        - [ ] Leave Match
- [ ] Refactor the Server Code to work with the reducer
  - [ ] Reducer
    - [ ] Get the action dispatcher with the logic for backend (See ./notes.md for that)
- [ ] Ensure the reducer can be pushed to the server with its dependencies
- [ ] Add a way to test the integration without depending on the server
- [ ] The Client should function w/o the server. 
  - [ ] This means it needs to keep it's own state for resources. 
  - [ ] This also probably means it will be split in two: Local(Single) & Multiplayer. The Local will simply allow the creation of single player games w/o the need of a server. It's not too useful on its own but it could prove how the game works and use the reducer/actions way. Also pretty good for testing
- [ ] Combine the server with the backend
  - [ ] by renaming the @matterio/backend to @matterio/server, 
  - [ ] by deprecating @matterio/backend and by renaming @matterio/server-sdk to either @matterio/cloud-sdk or just make it part of the @matterio/server
- [ ] The Server doesn't always need redis. In fact it could run just as well w/o (using the mock) probably for a while, in favor of keeping everything on the server memory – Because all that matters is that the players are playing on the same machine. So Until I have 2 servers needed no need for redis – but I would say is good to keep redis in just to keep it easy to upgrade later on since it's already working and proved (the mock is also not to be used in prod)
- [ ] Need a way to deploy the reducer to the Matterio Cloud (including all the dependencies)
  - [ ] Probably via a cli the best, but via girhub actions even better for the Cloud

### Matterio Cloud (Saas)[matterio-cloud]

Native implementation for @matterio/server offering:
- [ ] hosting
- [ ] out of the box analytics
- [ ] ease of deployments (ala vercel with next using github/gitlab integrations)

for a paid subscription.

This will pair @matterio/server with the Matterio Store (Redis). In the future it could even offer persistence, identitity and other out of the box as well, but for the moment is just a wrapper around @matterio/server that pairs with the store.

## Marketing[marketing]

### Landing Page[landing-page]
- [ ] Using Framer 

- [ ] Bright colors on a purpleish backrdound. Brilliant pink, green, blue/cyan.

- [ ] For the Landing page I'm thinking to showcase a bunch of games right in the page, like a different section. Would be pretty cool if people get to play them right there, and to have the whole pipeline, go through a different country or so show on the other screen (all iframes) and present how it all works with the actions and stuff.

- [ ] Also I'm thinking to take some premade sample games in other engines such as phaser or whatnot and add matterio to them to showcase the ease

### Collect Interest[collect-interest]
  - Emails from the landing page
  - People on reddit

## Launch

- [ ] Javascript Weekly
- [ ] Product Hunt