Let's work on the "cram" version of this app.
See [README](/README.md) for context.

Currently, that app version is a complete mock (see [this](src/app/App.cram.vue) and [this](src/app/router.cram.ts))

Let's change that.

For now, we just want one flow cram (no settings page or other stuff).

On the home page for cram (should be in [this path](src/pages/cram/home)) create a combination of [PracticeHome](src/pages/secret/practice/PracticeHome.vue) and [DownloadsHome](src/pages/secret/downloads/DownloadsHome.vue).

Specifically, show every remote set that has preferred mode set to "cram" from the backend (see [here](src/pages/secret/downloads/UnifiedRemoteSetService.ts) for reference) as a card, showing title, description?, and [LanguageDisplay](src/entities/languages/LanguageDisplay.vue) as well as a primary button "Start" on each card.

This button should download the remote set if not downloaded, and then immediately start the "cram" practice mode (see [this](src/tasks) and [this](src/modes/modes/cram) for understanding), filtered to the relevant local set.