export interface NoteData {
    id: string
    content: string;
    showBeforeExercise?: boolean;
    noteType?: string

    // Internal merge tracking
    _mergeChecked?: boolean // Has background merge service processed this item?
}