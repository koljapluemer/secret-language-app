# UnifiedRemoteSetService Data Integration Architecture

## Overview

The `UnifiedRemoteSetService` is a critical orchestration service that handles the download, validation, and integration of remote language learning sets into the local database. It coordinates data flow across 8 different repository interfaces, managing complex entity relationships and ensuring data consistency during the integration process.

## Architecture Components

### Repository Dependencies

The service operates through dependency injection of 8 specialized repositories:

```typescript
constructor(
  private localSetRepo: LocalSetRepoContract,     // Manages set metadata and tracking
  private vocabRepo: VocabRepoContract,           // Core vocabulary management
  private translationRepo: TranslationRepoContract, // Translation entity management
  private noteRepo: NoteRepoContract,             // Note entity management
  private resourceRepo: ResourceRepoContract,     // Learning resource management
  private goalRepo: GoalRepoContract,             // Goal entity management
  private factCardRepo: FactCardRepoContract,     // Fact card management
  private languageRepo: LanguageRepoContract      // Language configuration
)
```

### Entity Model Relationships

```
LocalSet (metadata)
├── Language (configuration)
├── Notes (foundational, referenced by all)
├── Links (embedded in other entities)
├── Translations (referenced by vocab)
├── Vocab (central entity with bidirectional references)
│   ├── Images (media files)
│   └── Sounds (media files)
├── FactCards (standalone learning units)
├── Resources (content containers)
└── Goals (learning objectives)
```

## Data Flow Architecture

### Phase 1: Validation and Preparation

```typescript
async downloadSet(languageCode: string, setName: string, options?: DownloadOptions)
```

**Step 1: File Loading and Validation**
- Fetches all possible entity files (`vocab.jsonl`, `translations.jsonl`, etc.)
- Validates each file against Zod schemas (`vocabSchema`, `translationSchema`, etc.)
- Filters out invalid entries while preserving valid data
- Uses content-type detection to avoid HTML error pages

**Step 2: Language and Set Setup**
- Ensures target language exists in `languageRepo`
- Creates language entity if missing using `createLanguageFromCode()`
- Creates or updates local set metadata in `localSetRepo`
- Establishes tracking timestamp (`lastDownloadedAt`)

### Phase 2: Entity Processing Pipeline

The processing order is critical due to dependency relationships:

#### 2.1 Notes Processing (Foundation Layer)
```typescript
// Batch processing for performance
const remoteIdToLocalUid = await this.noteRepo.createNotesFromRemoteBatch(
  setFiles.notes,
  progressCallback
);
```

**Why First**: Notes are referenced by all other entities and must exist before processing dependents.

**Key Features**:
- Bulk creation via `createNotesFromRemoteBatch()` for O(1) vs O(n) operations
- Remote ID → Local UID mapping stored in `noteMap`
- Progress reporting during batch operations

#### 2.2 Links Processing (Embedded Layer)
```typescript
// Links are embedded, not stored as entities
linkMap.set(linkData.id, {
  label: linkData.label,
  url: linkData.url,
  owner: linkData.owner,
  ownerLink: linkData.ownerLink,
  license: linkData.license
});
```

**Why Second**: Links are embedded within other entities rather than stored independently.

**Key Features**:
- In-memory storage in `linkMap` for reference resolution
- No database persistence (embedded in other entities)
- License and attribution metadata preservation

#### 2.3 Translations Processing (Referenced Layer)
```typescript
const translationIdMap = await this.processTranslationsInBatch(
  setFiles.translations,
  localSet.uid,
  noteMap,
  progressCallback
);
```

**Why Third**: Translations are heavily referenced by vocabulary entries.

**Performance Optimization**:
- Pre-loads ALL existing translations once: `getAllTranslations()`
- Creates content-based lookup map for deduplication
- Batch processing via `bulkProcessTranslations()`
- Merge logic: existing entities get updated with new references

**Integration Logic**:
```typescript
// Merge with existing translation
if (existing) {
  const existingOrigins = new Set(existing.origins || []);
  const shouldIncrementPriority = !existingOrigins.has(localSetUid);
  existingOrigins.add(localSetUid);

  // Merge notes and update priority
  const mergedNotes = [...new Set([...existing.notes, ...noteUids])];
  // Update with merged data
}
```

#### 2.4 Vocab Processing (Central Entity)
**Most Complex Integration**: Two-pass processing due to self-referential relationships.

**Pass 1: Core Vocab Processing**
```typescript
// PERFORMANCE FIX: Load all vocab once instead of N queries
const allExistingVocab = await this.vocabRepo.getVocab();
const vocabByLanguageAndContent = new Map<string, VocabData>();
```

**Deduplication Strategy**:
1. **Primary**: Content + Language matching
2. **Fallback**: Translation UID matching for content-less vocab

**Merge vs Create Logic**:
```typescript
if (existingVocab) {
  // Merge strategy: preserve existing progress, merge arrays
  const shouldIncrementPriority = !existingOrigins.has(localSet.uid);
  await this.vocabRepo.updateVocab({
    ...existingVocab,
    notes: [...new Set([...existingVocab.notes, ...noteUids])],
    translations: [...new Set([...existingVocab.translations, ...translationUids])],
    priority: shouldIncrementPriority ? (existingVocab.priority ?? 0) + (vocabData.priority || 1) : existingVocab.priority
  });
} else {
  // Create new vocab with default progress state
  const savedVocab = await this.vocabRepo.saveVocab(localVocab);
}
```

**Pass 2: Vocab Relationship Resolution**
```typescript
// Second pass to resolve vocab-to-vocab relationships
for (const vocabData of setFiles.vocab) {
  const relatedVocabUids = this.resolveReferences(vocabData.relatedVocab || [], vocabMap);
  const notRelatedVocabUids = this.resolveReferences(vocabData.notRelatedVocab || [], vocabMap);
  // Update with resolved relationships
}
```

#### 2.5 Media Processing (Assets Layer)
```typescript
await this.processVocabMedia(languageCode, setName, setFiles.vocab, vocabMap);
```

**Image Processing**:
- Downloads from `/sets/{language}/{set}/images/{filename}`
- Compression via `compressImageFromUrl()` (800x600, 80% quality, JPEG)
- Duplicate detection by URL and file size/MIME type
- Graceful failure handling (warnings, not errors)

**Audio Processing**:
- Downloads from `/sets/{language}/{set}/audio/{filename}`
- Validation via `validateAudioFile()`
- Duration extraction via `getAudioDuration()`
- Duplicate detection by size + MIME type + filename

#### 2.6 Fact Cards Processing
**Entity Logic**: Similar to vocab but simpler (no self-references).

**Deduplication**: Front + Back + Language matching
```typescript
const existingFactCard = await this.factCardRepo.getFactCardByFrontBackLanguage(
  factCardData.front,
  factCardData.back,
  factCardData.language
);
```

#### 2.7 Resources Processing
**Entity Logic**: Container entities that reference vocab, fact cards, and notes.

**Deduplication**: Title + Language matching
**Reference Resolution**: Links to vocab, fact cards, notes, and embedded links

#### 2.8 Goals Processing
**Entity Logic**: Hierarchical entities with sub-goal relationships.

**Deduplication**: Title + Language matching
**Complex References**: Notes, vocab, fact cards, AND sub-goals (self-referential)

## Reference Resolution System

### Core Pattern
```typescript
private resolveReferences(remoteIds: string[], referenceMap: Map<string, string>): string[] {
  const resolvedUids: string[] = [];
  for (const remoteId of remoteIds) {
    const localUid = referenceMap.get(remoteId);
    if (localUid) {
      resolvedUids.push(localUid);
    } else {
      console.warn(`Reference not found for ID: ${remoteId}`);
    }
  }
  return [...new Set(resolvedUids)]; // Remove duplicates
}
```

### Reference Maps Maintained
- `noteMap`: Remote Note ID → Local UID
- `linkMap`: Remote Link ID → Link Object (embedded)
- `translationMap`: Remote Translation ID → Local UID
- `vocabMap`: Remote Vocab ID → Local UID
- `resourceMap`: Remote Resource ID → Local UID
- `goalMap`: Remote Goal ID → Local UID
- `factCardMap`: Remote Fact Card ID → Local UID

## Performance Optimizations

### Batch Operations
1. **Notes**: `createNotesFromRemoteBatch()` - Single transaction vs N inserts
2. **Translations**: `bulkProcessTranslations()` - Bulk updates and creates
3. **Vocab**: Pre-load all existing vocab to avoid N+1 queries

### Memory Efficiency
1. **Translation Lookup**: Pre-build content-based map for O(1) lookups
2. **Vocab Lookup**: Language+Content composite keys for deduplication
3. **Reference Resolution**: In-memory maps vs repeated database queries

### Database Optimization
1. **Indexed Fields**: Uses Dexie indexed fields (`[language+content]`, `progress.due`)
2. **Transaction Batching**: Groups related operations in single transactions
3. **Bulk Operations**: `bulkPut()`, `bulkAdd()` for multiple entities

## Error Handling and Graceful Degradation

### File-Level Resilience
- Missing files (404) are skipped, not treated as errors
- Invalid JSON lines are logged and filtered out
- Schema validation failures preserve valid entries

### Entity-Level Resilience
- Missing references are logged but don't break processing
- Media download failures are warnings, not errors
- Individual entity failures don't stop batch processing

### Progress Reporting
```typescript
const reportProgress = (phase: string, current: number, total: number) => {
  if (options?.onProgress) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    options.onProgress({ phase, current, total, percentage });
  }
};
```

## Integration Patterns

### Merge Strategy for Existing Entities
1. **Origin Tracking**: Add current set to `origins` array
2. **Priority Increment**: Only increment if not already from this set
3. **Array Merging**: Deduplicate and merge references (notes, translations, etc.)
4. **Progress Preservation**: Never overwrite existing learning progress

### Create Strategy for New Entities
1. **UID Generation**: `crypto.randomUUID()` for unique identification
2. **Default Values**: Establish sensible defaults (priority: 1, doNotPractice: false)
3. **Reference Arrays**: Initialize empty arrays for future references
4. **Progress Initialization**: Set appropriate initial state (level: -1 for unseen)

### Cross-Entity Validation
1. **Reference Integrity**: Warn about missing references but continue processing
2. **Relationship Validation**: Ensure bidirectional relationships are consistent
3. **Media Validation**: Check file types and sizes before processing

## Repository Integration Details

### VocabRepo Integration
- **Bulk Operations**: `bulkProcessVocab()` for performance
- **Media Handling**: `addImageFromUrl()`, `addSoundFromFile()`
- **Relationship Management**: `addRelatedVocab()`, `addNotRelatedVocab()`
- **Progress Tracking**: FSRS-based spaced repetition state

### Performance Considerations in VocabRepo
- **Indexed Queries**: Uses `[language+content]` compound index
- **Memory Pre-loading**: Loads all vocab once for deduplication
- **Compressed Media**: Automatic image compression (800x600, 80% quality)
- **Audio Validation**: File type and duration validation

### TranslationRepo Integration
- **Bulk Processing**: `bulkProcessTranslations()` for batch operations
- **Content-Based Deduplication**: Prevents duplicate translations
- **Reference Merging**: Combines note references from multiple sources

## Conclusion

The UnifiedRemoteSetService demonstrates sophisticated data integration patterns:

1. **Dependency-Ordered Processing**: Ensures referential integrity
2. **Performance-First Design**: Batch operations and memory optimization
3. **Graceful Error Handling**: Continues processing despite individual failures
4. **Flexible Merging**: Intelligently combines new and existing data
5. **Progress Transparency**: Real-time feedback during long operations

This architecture enables robust, scalable integration of complex learning datasets while maintaining data consistency and user experience.