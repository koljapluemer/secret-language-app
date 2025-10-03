import type { LearningProgress } from "@/shared/types/LearningProgress";
import type { Link } from "@/shared/links/Link";

export interface FactCardData {
    id: string
    language: string
    front: string
    back: string
    notes: string[] // array of NoteData Ids
    links: Link[]
    
 
    priority: number;
    doNotPractice?: boolean;

    progress: LearningProgress;

    origins: string[] // id of set, or the string "user-added"

    // Internal merge tracking
    _mergeChecked?: boolean // Has background merge service processed this item?
}