/**
 * Entity Note Deduplication
 *
 * Deduplicates notes attached to entities based on note signature (noteType + content).
 * This is in the app layer because it coordinates between entity repos.
 */

import type { NoteRepoContract } from '@/entities/notes/NoteRepoContract';
import type { NoteData } from '@/entities/notes/NoteData';

/**
 * Get unique signature for a note
 */
function getNoteSignature(note: NoteData): string {
  return `${note.noteType || ''}|${note.content}`;
}

/**
 * Deduplicate an array of note IDs
 *
 * @param noteIds - Array of note IDs to deduplicate
 * @param noteRepo - Note repository for fetching and deleting notes
 * @returns Deduplicated array of note IDs
 */
export async function deduplicateNoteIds(
  noteIds: string[],
  noteRepo: NoteRepoContract
): Promise<string[]> {
  if (noteIds.length === 0) {
    return [];
  }

  // Fetch all notes
  const notes = await noteRepo.getNotesByUIDs(noteIds);

  // Group by signature
  const signatureMap = new Map<string, NoteData>();
  const duplicateIds: string[] = [];

  for (const note of notes) {
    const signature = getNoteSignature(note);

    if (signatureMap.has(signature)) {
      // Duplicate found - mark for deletion
      duplicateIds.push(note.id);
    } else {
      // First occurrence - keep it
      signatureMap.set(signature, note);
    }
  }

  // Delete duplicate notes
  if (duplicateIds.length > 0) {
    await noteRepo.deleteNotes(duplicateIds);
  }

  // Return only unique note IDs
  return Array.from(signatureMap.values()).map(note => note.id);
}
