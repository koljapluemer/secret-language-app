# Cram Mode

## Overview
Cram mode works through all vocab in selected set(s) that are due or new/unseen. It implements component-first practice logic, similar to sentence-slide mode.

## Key Features

### Component-First Practice
If vocab that you want to practice is mentioned in the `contains` array of another vocab, that component vocab is practiced first. This ensures learners understand building blocks before encountering them in context.

**Example:** If vocab A contains [vocab B, vocab C], the practice order will be:
1. Vocab B (component)
2. Vocab C (component)
3. Vocab A (parent)

### New Vocab Twice-Showing
If a vocab is new/unseen (level -1), it appears TWICE in the same session:
1. First time: Gets a task appropriate for new vocab
2. Second time: Gets treated as non-new vocab task

This reinforces initial learning within the same session.

### No Immediate Repetition
A given vocab will not come up twice in a row. The last used vocab ID is always blocked from the next task selection.

### Session Review (20% chance)
Once 3+ vocab have been practiced in the session, there's a 20% chance each task will be a review of previously practiced vocab that has become due again (per FSRS scheduling).

## Implementation Details

### State Management
Uses component-local state (not module-level):
- `vocabPool: Map<vocabId, VocabPoolItem>` - Tracks vocab to practice and times shown
- `sessionVocabIds: Set<string>` - Tracks practiced vocab for review opportunities

### Pool Building Logic
1. Fetch 10 due vocab + 10 unseen vocab from selected languages/sets
2. For each vocab:
   - If it has a `contains` array, fetch all contained vocab IDs
   - Filter contained vocab to only those that are due/unseen
   - Add component vocab to pool FIRST (prioritized)
   - Then add the parent vocab itself to pool
3. Result: Pool where components appear before their parents

### Task Generation
Tasks are generated via `src/modes/utils/getRandomGeneratedTaskForVocab.ts`, which selects appropriate task types based on vocab level and metadata.

## Set Filtering
The mode respects the practice filter system via `usePracticeFilters()`:
- `selectedLanguages` - Only vocab in these languages
- `setsToAvoid` - Exclude vocab from these sets

This allows users to focus on specific sets for cramming.

