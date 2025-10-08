# Component Clusters Mode

## Overview
Component Clusters mixes two task types:
1. Practise a “component” vocab item that appears inside multiple other vocab.
2. Work through a queue of “container” vocab that include that component.

Each generated task runs through the shared `getRandomGeneratedTaskForVocab` helper, so the actual exercise format depends on the vocab’s level and metadata.

## State
The generator keeps process-level state in `generateComponentClustersTasks.ts`:
- `currentComponent`: vocab currently treated as the component.
- `containerVocabQueue`: list of container vocab still to serve for that component.
- `phase`: `'component-task'` or `'container-tasks'`.
- `lastPracticedVocabId`, `lastPracticedOrigins`: cached metadata from the most recent task, used for the review branch.

State resets when we exhaust a container queue or hit an error.

## Task Flow
1. **Same-set review (25 % chance):**  
   If we have origins from the previous task, we request up to 10 due vocab from one of those sets, filter out non-due/new/recent items, and return the first viable task. When this fires we skip the rest of the flow.

2. **Component selection:**  
   If `currentComponent` is `null`, call `getRandomDueOrUnseenVocabContainedInMultiple` to pick a new component vocab and seed `containerVocabQueue` with `getDueOrUnseenVocabContainingVocabId`. Phase switches to `'component-task'`.

3. **Component task:**  
   In `'component-task'` phase we generate a task for the component, record it as last practiced, then move to `'container-tasks'`.

4. **Container queue:**  
   Randomly pick a vocab from `containerVocabQueue` (preferring items not in the incoming block list), generate a task, record it, and return. If generation fails we remove that vocab and retry. When the queue empties we reset all state so the next call starts a new component cycle.

5. **Queue maintenance:**  
   `removeVocabIfNotDue` runs after task completion (see the widget) to drop items that no longer need review.

The widget (`ComponentClustersWidget.vue`) drives the overall queue: it calls `generateComponentClustersTask`, handles loading/errors, and passes the generated task to the renderer. When a task finishes, it triggers the generator again and performs the due-check cleanup described above.

## Notes
- Origins with value `"user-added"` are ignored for the review branch.
- The review branch only revisits vocab with `progress.level > -1` and a due date in the past; it does not re-queue new items.
- Because state lives at module scope, concurrent sessions would interfere with each other; the mode assumes a single active practice run per client.
