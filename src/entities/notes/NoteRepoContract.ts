import type { NoteData } from './NoteData';

export interface NoteRepoContract {
  // Basic CRUD operations
  getNoteByUID(id: string): Promise<NoteData | undefined>;
  getNotesByUIDs(Ids: string[]): Promise<NoteData[]>;
  saveNote(note: Omit<NoteData, "id">): Promise<NoteData>;
  updateNote(note: NoteData): Promise<void>;
  deleteNote(id: string): Promise<void>;
  deleteNotes(Ids: string[]): Promise<void>;

  // Batch operations
  bulkCreateNotes(notes: Omit<NoteData, 'id'>[]): Promise<NoteData[]>;

  // Merge operations (notes don't deduplicate, but need to track as checked)
  getUncheckedNotes(limit: number): Promise<NoteData[]>;
}