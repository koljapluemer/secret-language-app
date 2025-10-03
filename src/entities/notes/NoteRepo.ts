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

  async getNoteByUID(uid: string): Promise<NoteData | undefined> {
    const note = await db.notes.get(uid);
    return note ? this.ensureNoteFields(note) : undefined;
  }

  async getNotesByUIDs(uids: string[]): Promise<NoteData[]> {
    const notes = await db.notes.where('id').anyOf(uids).toArray();
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

  async deleteNote(uid: string): Promise<void> {
    await db.notes.delete(uid);
  }

  async deleteNotes(uids: string[]): Promise<void> {
    await db.notes.where('id').anyOf(uids).delete();
  }

  async createNotesFromRemote(remoteNotes: { content: string; showBeforeExercise?: boolean; noteType?: string }[]): Promise<string[]> {
    const noteUids: string[] = [];

    for (const remoteNote of remoteNotes) {
      const noteData: Omit<NoteData, 'id'> = {
        content: remoteNote.content,
        showBeforeExercise: remoteNote.showBeforeExercise,
        noteType: remoteNote.noteType
      };
      const savedNote = await this.saveNote(noteData);
      noteUids.push(savedNote.id);
    }

    return noteUids;
  }


  async createNotesFromRemoteBatch(remoteNotes: { id?: string; content: string; showBeforeExercice?: boolean; noteType?: string }[], onProgress?: (current: number, total: number) => void): Promise<Map<string, string>> {
    if (remoteNotes.length === 0) {
      onProgress?.(0, 0);
      return new Map();
    }

    const newNotes: Omit<NoteData, 'id'>[] = [];
    const remoteIdToLocalUid = new Map<string, string>();

    // Process all remote notes - create a new note for each one
    for (let i = 0; i < remoteNotes.length; i++) {
      const remoteNote = remoteNotes[i];
      onProgress?.(i, remoteNotes.length);

      const localNote: Omit<NoteData, 'id'> = {
        content: remoteNote.content,
        showBeforeExercise: remoteNote.showBeforeExercice ?? false,
        noteType: remoteNote.noteType
      };

      newNotes.push(localNote);
    }

    // Bulk insert all notes
    if (newNotes.length > 0) {
      const addedIds = await db.transaction('rw', db.notes, async () => {
        return await db.notes.bulkAdd(newNotes as NoteData[], { allKeys: true });
      });

      // Map remote IDs to local IDs
      for (let i = 0; i < remoteNotes.length; i++) {
        if (remoteNotes[i].id && addedIds[i]) {
          remoteIdToLocalUid.set(remoteNotes[i].id!, String(addedIds[i]));
        }
      }
    }

    onProgress?.(remoteNotes.length, remoteNotes.length);
    return remoteIdToLocalUid;
  }

  async bulkMarkNotesAsChecked(uids: string[]): Promise<void> {
    await db.transaction('rw', db.notes, async () => {
      const notes = await db.notes.bulkGet(uids);
      const updates = notes
        .filter((n): n is NoteData => n !== undefined)
        .map(n => ({ ...n, _mergeChecked: true }));

      if (updates.length > 0) {
        await db.notes.bulkPut(updates);
      }
    });
  }

  async getUncheckedNotes(limit: number): Promise<NoteData[]> {
    const all = await this.getNotesByUIDs([]);
    return all
      .filter(n => !n._mergeChecked)
      .slice(0, limit);
  }
}