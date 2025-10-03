import type { NoteRepoContract } from './NoteRepoContract';
import type { NoteData } from './NoteData';
import { db } from '@/shared/database/db';

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
    const newNote: Omit<NoteData, 'id'> = {
      content: note.content,
      showBeforeExercise: note.showBeforeExercise ?? false,
      noteType: note.noteType
    };

    const id = await db.notes.add(newNote as NoteData);
    return { ...newNote, id: id as string };
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

    // Insert all notes and get back their auto-generated IDs
    const generatedIds = await db.notes.bulkAdd(
      notes as NoteData[],
      { allKeys: true }
    );

    // Combine the input data with the generated IDs
    return notes.map((note, index) => ({
      ...note,
      id: String(generatedIds[index])
    }));
  }
}