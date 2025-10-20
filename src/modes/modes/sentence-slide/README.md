# Sentence Slide

## Generation

### General

- Do not use `usePracticeMode` (it's introducing issues)
- Move all logic into the widget, since queue state is intertwined heavily with generation. 
- Do not bother with crazy preloading logic

### Logic

1. Find random [vocab](src/entities/vocab/VocabData.ts) that is `consideredSentence` and has a non-empty `contains` array
2. Add all such `contains` vocab to a pool, as long as it's either due or new/unseen
3. Randomly pick from the pool and show a task via [this util](src/modes/utils/getRandomGeneratedTaskForVocab.ts)
4. If the vocab was unseen, don't remove it from the pool. If it was seen, remove it from the pool after scoring (so new vocab comes up twice, effectively)
5. When pool is empty, show the [guess what sentence means](src/tasks/task-guess-what-sentence-means/generate.ts) task
6. Pick a new sentence (back to beginning)