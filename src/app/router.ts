import { createRouter, createWebHistory } from 'vue-router';
import PracticeOverview from '@/pages/practice/PracticeOverview.vue';
import PracticeHome from '@/pages/practice/PracticeHome.vue';
import FactCardGrindWidget from '@/modes/modes/fact-card-grind/FactCardGrindWidget.vue';
import GoalGetterWidget from '@/modes/modes/goal-getter/GoalGetterWidget.vue';
import SisyphosWidget from '@/modes/modes/sisyphos/SisyphosWidget.vue';
import InsertImagesWidget from '@/modes/modes/insert-images/InsertImagesWidget.vue';
import EyesAndEarsWidget from '@/modes/modes/eyes-and-ears/EyesAndEarsWidget.vue';
import IllegalImmersionWidget from '@/modes/modes/illegal-immersion/IllegalImmersionWidget.vue';
import SentenceSlideWidget from '@/modes/modes/sentence-slide/SentenceSlideWidget.vue';
import ResourceRotationWidget from '@/modes/modes/resource-rotation/ResourceRotationWidget.vue';
import MinimalPairsWidget from '@/modes/modes/minimal-pairs/MinimalPairsWidget.vue';
import ComponentClustersWidget from '@/modes/modes/component-clusters/ComponentClustersWidget.vue';
import PageVocabList from '@/pages/vocab-list/PageVocabList.vue';
import PageVocabEdit from '@/pages/vocab-edit/PageVocabEdit.vue';
import PageVocabAdd from '@/pages/vocab-add/PageVocabAdd.vue';
import PageListFactCards from '@/pages/fact-cards-list/PageListFactCards.vue';
import PageFactCardAdd from '@/pages/fact-cards-add/PageFactCardAdd.vue';
import PageFactCardEdit from '@/pages/fact-cards-edit/PageFactCardEdit.vue';
import PageListResources from '@/pages/resources-list/PageListResources.vue';
import PageResourceAdd from '@/pages/resource-add/PageResourceAdd.vue';
import PageResourceEdit from '@/pages/resource-edit/PageResourceEdit.vue';
import PageListGoals from '@/pages/goals-list/PageListGoals.vue';
import PageGoalAdd from '@/pages/goal-add/PageGoalAdd.vue';
import PageGoalEdit from '@/pages/goal-edit/PageGoalEdit.vue';
import PageDownloads from '@/pages/downloads/PageDownloads.vue';
import DownloadsHome from '@/pages/downloads/DownloadsHome.vue';
import PageStats from '@/pages/time-tracking/PageTimeTracking.vue';
import PageMyMaterial from '@/pages/my-material/PageMyMaterial.vue';
import PageSettings from '@/pages/settings/PageSettings.vue';
import PageMotivation from '@/pages/motivation/PageMotivation.vue';
import SelfTestHome from '@/pages/self-test/SelfTestHome.vue';
import MinimalPairsTest from '@/modes/modes/minimal-pairs/MinimalPairsTest.vue';
import ConsumeResourceTest from '@/modes/modes/consume-resource/ConsumeResourceTest.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/practice'
    },
    {
      path: '/practice',
      component: PracticeOverview,
      children: [
        {
          path: '',
          name: 'practice-overview',
          component: PracticeHome
        },
        {
          path: 'fact-card-grind',
          name: 'practice-mode-fact-card-grind',
          component: FactCardGrindWidget
        },
        {
          path: 'goal-getter',
          name: 'practice-mode-goal-getter',
          component: GoalGetterWidget
        },
        {
          path: 'sisyphos',
          name: 'practice-mode-sisyphos',
          component: SisyphosWidget
        },
        {
          path: 'insert-images',
          name: 'practice-mode-insert-images',
          component: InsertImagesWidget
        },
        {
          path: 'eyes-and-ears',
          name: 'practice-mode-eyes-and-ears',
          component: EyesAndEarsWidget
        },
        {
          path: 'illegal-immersion',
          name: 'practice-mode-illegal-immersion',
          component: IllegalImmersionWidget
        },
        {
          path: 'sentence-slide',
          name: 'practice-mode-sentence-slide',
          component: SentenceSlideWidget
        },
        {
          path: 'resource-rotation',
          name: 'practice-mode-resource-rotation',
          component: ResourceRotationWidget
        },
        {
          path: 'minimal-pairs',
          name: 'practice-mode-minimal-pairs',
          component: MinimalPairsWidget
        },
        {
          path: 'component-clusters',
          name: 'practice-mode-component-clusters',
          component: ComponentClustersWidget
        }
      ]
    },
    {
      path: '/my-material',
      name: 'my-material',
      component: PageMyMaterial
    },
    {
      path: '/vocab',
      name: 'vocab-list',
      component: PageVocabList
    },
    {
      path: '/vocab/new',
      name: 'vocab-new',
      component: PageVocabAdd
    },
    {
      path: '/vocab/:id/edit',
      name: 'vocab-edit',
      component: PageVocabEdit
    },
    {
      path: '/fact-cards',
      name: 'fact-cards-list',
      component: PageListFactCards
    },
    {
      path: '/fact-cards/new',
      name: 'fact-cards-new',
      component: PageFactCardAdd
    },
    {
      path: '/fact-cards/:id/edit',
      name: 'fact-cards-edit',
      component: PageFactCardEdit
    },
    {
      path: '/resources',
      name: 'resources-list',
      component: PageListResources
    },
    {
      path: '/resources/new',
      name: 'resources-new',
      component: PageResourceAdd
    },
    {
      path: '/resources/:id/edit',
      name: 'resources-edit',
      component: PageResourceEdit
    },
    {
      path: '/goals',
      name: 'goals-list',
      component: PageListGoals
    },
    {
      path: '/goals/add',
      name: 'goals-add',
      component: PageGoalAdd
    },
    {
      path: '/goals/:id/edit',
      name: 'goals-edit',
      component: PageGoalEdit
    },
    {
      path: '/downloads',
      component: PageDownloads,
      children: [
        {
          path: '',
          name: 'downloads',
          component: DownloadsHome
        },
        {
          path: ':language/:setName',
          name: 'set-overview',
          component: () => import('@/pages/downloads/PageSetOverview.vue')
        }
      ]
    },
    {
      path: '/settings',
      name: 'settings',
      component: PageSettings
    },
    {
      path: '/stats',
      name: 'stats',
      component: PageStats
    },
    {
      path: '/time-tracking',
      redirect: '/stats'
    },
    {
      path: '/motivation',
      name: 'motivation',
      component: PageMotivation
    },
    {
      path: '/self-test',
      name: 'self-test',
      component: SelfTestHome
    },
    {
      path: '/self-test/minimal-pairs',
      name: 'test-mode-minimal-pairs',
      component: MinimalPairsTest
    },
    {
      path: '/self-test/consume-resource',
      name: 'test-mode-consume-resource',
      component: ConsumeResourceTest
    }
  ]
});

export default router;