import type { LocalSetRepoContract } from './LocalSetRepoContract';
import type { VocabRepoContract } from '@/entities/vocab/VocabRepoContract';
import type { ResourceRepoContract } from '@/entities/resources/ResourceRepoContract';
import type { FactCardRepoContract } from '@/entities/fact-cards/FactCardRepoContract';
import type { GoalRepoContract } from '@/entities/goals/GoalRepoContract';

export interface DeleteSetStats {
  vocabToDelete: number;
  vocabToUpdate: number;
  resourcesToDelete: number;
  resourcesToUpdate: number;
  factCardsToDelete: number;
  factCardsToUpdate: number;
  goalsToDelete: number;
  goalsToUpdate: number;
}

export class LocalSetDeleteService {
  constructor(
    private localSetRepo: LocalSetRepoContract,
    private vocabRepo: VocabRepoContract,
    private resourceRepo: ResourceRepoContract,
    private factCardRepo: FactCardRepoContract,
    private goalRepo: GoalRepoContract
  ) {}

  /**
   * Calculate what will be affected when deleting a set
   * Returns statistics about entities that will be deleted vs updated
   */
  async calculateDeleteImpact(setId: string): Promise<DeleteSetStats> {
    const stats: DeleteSetStats = {
      vocabToDelete: 0,
      vocabToUpdate: 0,
      resourcesToDelete: 0,
      resourcesToUpdate: 0,
      factCardsToDelete: 0,
      factCardsToUpdate: 0,
      goalsToDelete: 0,
      goalsToUpdate: 0
    };

    // Get all entities that reference this set
    const [vocab, resources, factCards, goals] = await Promise.all([
      this.vocabRepo.getVocabByOrigins([setId]),
      this.resourceRepo.getResourcesByOrigins([setId]),
      this.factCardRepo.getFactCardsByOrigins([setId]),
      this.goalRepo.getGoalsByOrigins([setId])
    ]);

    // Count vocab to delete vs update
    for (const v of vocab) {
      if (v.origins.length === 1 && v.origins[0] === setId) {
        stats.vocabToDelete++;
      } else if (v.origins.includes(setId)) {
        stats.vocabToUpdate++;
      }
    }

    // Count resources to delete vs update
    for (const r of resources) {
      if (r.origins.length === 1 && r.origins[0] === setId) {
        stats.resourcesToDelete++;
      } else if (r.origins.includes(setId)) {
        stats.resourcesToUpdate++;
      }
    }

    // Count fact cards to delete vs update
    for (const fc of factCards) {
      if (fc.origins.length === 1 && fc.origins[0] === setId) {
        stats.factCardsToDelete++;
      } else if (fc.origins.includes(setId)) {
        stats.factCardsToUpdate++;
      }
    }

    // Count goals to delete vs update
    for (const g of goals) {
      if (g.origins.length === 1 && g.origins[0] === setId) {
        stats.goalsToDelete++;
      } else if (g.origins.includes(setId)) {
        stats.goalsToUpdate++;
      }
    }

    return stats;
  }

  /**
   * Delete a set and handle all associated entities
   * - Deletes entities that only belong to this set
   * - Updates entities that belong to multiple sets (removes setId from origins)
   */
  async deleteSetAndAssociatedEntities(setId: string): Promise<void> {
    // Get all entities that reference this set
    const [vocab, resources, factCards, goals] = await Promise.all([
      this.vocabRepo.getVocabByOrigins([setId]),
      this.resourceRepo.getResourcesByOrigins([setId]),
      this.factCardRepo.getFactCardsByOrigins([setId]),
      this.goalRepo.getGoalsByOrigins([setId])
    ]);

    // Process vocab
    for (const v of vocab) {
      if (v.origins.length === 1 && v.origins[0] === setId) {
        // Only belongs to this set - delete it
        await this.vocabRepo.deleteVocab(v.id);
      } else if (v.origins.includes(setId)) {
        // Belongs to multiple sets - remove this set from origins
        const updatedVocab = {
          ...v,
          origins: v.origins.filter(origin => origin !== setId)
        };
        await this.vocabRepo.updateVocab(updatedVocab);
      }
    }

    // Process resources
    for (const r of resources) {
      if (r.origins.length === 1 && r.origins[0] === setId) {
        await this.resourceRepo.deleteResource(r.id);
      } else if (r.origins.includes(setId)) {
        const updatedResource = {
          ...r,
          origins: r.origins.filter(origin => origin !== setId)
        };
        await this.resourceRepo.updateResource(updatedResource);
      }
    }

    // Process fact cards
    for (const fc of factCards) {
      if (fc.origins.length === 1 && fc.origins[0] === setId) {
        await this.factCardRepo.deleteFactCard(fc.id);
      } else if (fc.origins.includes(setId)) {
        const updatedFactCard = {
          ...fc,
          origins: fc.origins.filter(origin => origin !== setId)
        };
        await this.factCardRepo.updateFactCard(updatedFactCard);
      }
    }

    // Process goals
    for (const g of goals) {
      if (g.origins.length === 1 && g.origins[0] === setId) {
        await this.goalRepo.delete(g.id);
      } else if (g.origins.includes(setId)) {
        await this.goalRepo.update(g.id, {
          origins: g.origins.filter(origin => origin !== setId)
        });
      }
    }

    // Finally, delete the set itself
    await this.localSetRepo.deleteLocalSet(setId);
  }
}
