import type { NoteRepoContract } from './NoteRepoContract';
import type { NoteData } from './NoteData';
import { db } from '@/shared/database/db';
import { nanoid } from 'nanoid';

export class NoteRepo implements NoteRepoContract {

  private ensureNoteFields(note: NoteData): NoteData {
    return {
      ...note,
      content: note.content || '',
      showBeforeExercise: note.showBeforeExercise ?? false,
      noteType: note.noteType
    };
  }

  async getNoteByUID(id: string): Promise<NoteData | undefined> {
    const note = await db.notes.get(id);
    return note ? this.ensureNoteFields(note) : undefined;
  }

  async getNotesByUIDs(Ids: string[]): Promise<NoteData[]> {
    const notes = await db.notes.where('id').anyOf(Ids).toArray();
    return notes.map(note => this.ensureNoteFields(note));
  }

  async saveNote(note: Omit<NoteData, 'id'>): Promise<NoteData> {
    const newNote: NoteData = {
      id: nanoid(),
      content: note.content,
      showBeforeExercise: note.showBeforeExercise ?? false,
      noteType: note.noteType
    };

    await db.notes.add(newNote);
    return newNote;
  }

  async updateNote(note: NoteData): Promise<void> {
    await db.notes.put(note);
  }

  async deleteNote(id: string): Promise<void> {
    await db.notes.delete(id);
  }

  async deleteNotes(Ids: string[]): Promise<void> {
    await db.notes.where('id').anyOf(Ids).delete();
  }

  async bulkCreateNotes(notes: Omit<NoteData, 'id'>[]): Promise<NoteData[]> {
    if (notes.length === 0) {
      return [];
    }

    // Prepare notes with generated UUIDs
    const notesWithIds: NoteData[] = notes.map(note => ({
      id: nanoid(),
      content: note.content,
      showBeforeExercise: note.showBeforeExercise ?? false,
      noteType: note.noteType
    }));

    // Bulk insert
    await db.notes.bulkAdd(notesWithIds);

    return notesWithIds;
  }
}