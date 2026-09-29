# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Linguanodon is a language learning application built with Vue 3, TypeScript, and Vite. The app is currently being rebuilt around a queue-based MVP architecture where users consume exercises and tasks in an infinite queue system.

## Common Development Commands

```bash
# Development
npm run build              # Build for production (includes type checking)
npm run preview            # Preview production build

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint errors automatically
npm run test               # Run tests with Vitest
```

Do NOT run the dev server, it's pointless!

## Architecture

The project follows **Feature-Sliced Design (FSD)** architecture with strict layer dependencies. Layers can only import from layers below them:

### Layer Structure (top to bottom)
- **app/**: Global app configuration, router, dependency injection
- **pages/**: High-level entry points, main page components
- **widgets/**: Large self-sufficient UI blocks, reusable across pages
- **features/**: Main user interactions and business logic
- **entities/**: Real-world business concepts (Vocab, ImmersionContent)
- **shared/**: Foundation utilities, UI components, external connections

### Key Architectural Concepts

**Entity Repositories**: Uses contract-based repositories with Dexie (IndexedDB) for persistence:
- `VocabAndTranslationRepo`: Core vocabulary management
- Immersion content management
- All repos injected via `src/app/injectRepositories.ts`

## Key Development Patterns

**Import Syntax**: Always use `@/...` imports except for same-directory files
**Component Structure**: Components are either controller (logic) or representational (props/emits only)
**Type Organization**: Types live in dedicated files, never duplicated in components
**Testing**: Unit tests live alongside code, use Vitest with jsdom environment
**Type Safety**: NEVER use `any` type. Always use proper TypeScript types or type assertions with `as Type`

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Vite
- **Styling**: Tailwind CSS + DaisyUI (mobile + desktop responsive, dark/light mode)
- **Database**: Dexie (IndexedDB wrapper)
- **Icons**: Lucide Vue Next
- **Testing**: Vitest + Vue Test Utils
- **State**: Pinia with persistence
- **Learning Algorithm**: ts-fsrs for spaced repetition

## Design

- Use Tailwind and Daisy.UI components
- Understand [App.vue](src/app/App.vue): Note that the router view is already wrapped with a container and a flex layout. Do not wrap a page into another container or flex layout for no reason.
- In general (barring special cases where it makes no sense), every page should have a `h1` on top
- Do not add classes to headings
- Use wrapping components and especially cards sparingly, and only when needed.
- When using a card, give it classes `card` and `shadow`. Nothing else. No variation unless called for.
- If a card must have an hover effect because it's clickable, give it `transition-hover` and `hover:shadow-md`
- A `card` always must have a `card-body` where the content lives (this is Daisy UI syntax)
- A `card-title`, if existing, must be within `card-body`
- Prefer clean `grid` and `flex` layouts over `space-*`
- Use standard buttons unless special case calls for customization. Do not vary the size randomly unless called for
- Do not use gray text. If text must be dis-emphasized, use only and consistently `text-light`. Do not give it an `sm` size.
- Do not use excessive subheadings, redundant labels or little information widgets that the user does not care about. 
- Before implementing a component, look for similar components and copy their styles and/or approach.
- When setting margins, paddings, gaps and so on, prefer the size `1`, `2`, `4`, and `6`
- For recurring complex styles, use `@apply` in `App.vue`.
- User color sparingly, and only for primary/important elements or those that must use color to communicate (e.g. a warning)
- Make sure any given layout works well on mobile and desktop!

- Use this pattern for form inputs:

```
<fieldset class="fieldset">
  <label for="page-title" class="label">Page title</label>
  <input
    type="text"
    name="page-title"
    class="input"
    placeholder="My awesome page"
  />
</fieldset>
```

- KEEP. IT. SIMPLE.


## Code Organization Notes

**Legacy Code**: Legacy implementation exists in `/legacy/` folder for reference only. New code goes in `/src/` following FSD principles.
# DEXIE CLONING RULES

## The Problem
Dexie uses `structuredClone()` internally which CANNOT clone:
- Vue 3 reactive proxies (`ref`, `reactive`, `computed`)
- Objects with non-enumerable properties
- Functions, symbols, etc.

## The Solution
**ALWAYS** use `toRaw()` or manual object spreading when saving to Dexie:

```typescript
import { toRaw } from 'vue';

// ❌ WRONG - will cause DataCloneError
await taskRepo.saveTask(reactiveTaskObject);

// ✅ CORRECT - use toRaw()  
await taskRepo.saveTask(toRaw(reactiveTaskObject));

// ✅ CORRECT - manual spreading
await taskRepo.saveTask({
  ...taskRef.value,
  // additional properties
});
```

## When This Happens
- Saving Vue reactive objects directly to Dexie
- Task objects that come from Vue computed/ref
- Any object that has been made reactive by Vue

## Remember
- Use `toRaw()` before ALL Dexie save operations
- Check if object came from Vue reactivity system
- Manual object spread also works but is more verbose

# DATABASE OPERATIONS RULE

**CRITICAL: ALL data filtering and querying must be done in the repository layer, NOT in memory.**

## The Problem
- Memory filtering after fetching all data is inefficient and doesn't scale
- Violates the repository pattern by putting business logic in the wrong layer
- Can cause performance issues with large datasets

## The Solution
**ALWAYS** add proper repository methods with database-level filtering:

```typescript
// ❌ WRONG - memory filtering
const allVocab = await vocabRepo.getVocab();
const filteredVocab = allVocab.filter(v => v.someCondition);

// ✅ CORRECT - repository method with DB filtering
const filteredVocab = await vocabRepo.getVocabBySomeCondition();
```

## When This Applies
- Any filtering, sorting, or querying of data
- Complex selection criteria 
- Performance-sensitive operations
- Any time you're tempted to use `.filter()`, `.find()`, `.some()` etc. on repo results

## Remember
- Create specific repository methods for each query pattern
- Use Dexie's IndexedDB querying capabilities
- Let the database do the work, not JavaScript memory operations