# Cram Mode

Mode should work as follows:

- This mode should have ensured that only one set is active (via the filter)
- First, from this set, pick a random goal (if no goal, return with toast error)
- From this goal (`src/entities/goals/GoalData.ts`), randomly select one of its `vocab`
- Fetch this vocab via repo
- get all the vocab mentioned in the `contains` of that vocab

- for the lesson, first practice all the `contains` vocab via [this](src/modes/utils/getRandomGeneratedTaskForVocab.ts), then the selected vocab itself, and then do a [goal attempt](src/tasks/task-goal-attempt/Render.vue) with the goal itself, ending the lesson