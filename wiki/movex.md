---
noteId: "0d11f8f0b1fc11edb93bc50742d65a62"
tags: []

---

# [WIP] Movex 

## Deltas Reconciliation

This describes the strategy used to apply to deltas (resulted from a movex action).

Each delta has a PATH and a DIFF TYPE (Add, Change & Remove). Normally a simple merge/overwrite in case of primitive works, but when the paths coincide then a more complex strategy should be involved:

There are really only 3 type of diff between 2 states: ADD, CHANGE & REMOVE, and each one of them might have a specific use case given the data type in which they are applied. They also are applied on json states, so we only care about the json data types (https://www.w3schools.com/js/js_json_datatypes.asp). 

#### Primitives 
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


#### Complex Data types (Arrays & Objects)

These are more complex b/c they allow for nesting.

##### Array

- ADD + ADD => N/A as it cannot happen at the same path for a primitive

- ADD + CHANGE => If the path is the same then the change simply changes the addition, but most likely this is N/A as ADD + ADD

- ADD + REMOVE => N/A or Add Wins b/c a the time of "REMOVE" action, the state did not "know" about the addition therefore was applied to a prev state 

- CHANGE + ADD => Both. An Add will be on a different PATH so N/A really

- CHANGE + CHANGE => Last Action wins

- CHANGE + REMOVE => Change becomes ADD and wins. __Any issues with that?!__ My thinking is that the removal happened w/o knowing of the CHANGE so the CHANGE WINS

- REMOVE + ADD => ADD wins or N/A

- REMOVE + CHANGE => Change becomes ADD and wins. See above CHANGE + REMOVE

- REMOVE + REMOVE => Get's removed w/o an error