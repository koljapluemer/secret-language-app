This mode relies on the practice being filtered to a specific set only.
Make sure this works.

The goal is to work through all [Vocab]() in this set, as long as its due/new. 
We should always ensure that if vocab that we want to practice is mentioned in the `contains`
of *another* vocab, that we practice this first — sort of like (src/modes/modes/sentence-slide) or (src/modes/modes/component-clusters).

A given vocab should not come up twice in a row.
Task should be generated via `src/modes/utils/getRandomGeneratedTaskForVocab.ts`.
If a vocab is new, it should naturally first get a task appropriate for now vocab, and in the same session show up again, as a non-new-vocab task.

