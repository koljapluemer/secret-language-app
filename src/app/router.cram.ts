import { createRouter, createWebHistory } from 'vue-router';
import PracticeOverview from '@/pages/practice/PracticeOverview.vue';
import PracticeHome from '@/pages/practice/PracticeHome.vue';
import FactCardGrindWidget from '@/modes/modes/fact-card-grind/FactCardGrindWidget.vue';
import PageVocabList from '@/pages/vocab-list/PageVocabList.vue';
import PageSettings from '@/pages/settings/PageSettings.vue';

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
        }
      ]
    },
    {
      path: '/vocab',
      name: 'vocab-list',
      component: PageVocabList
    },
    {
      path: '/settings',
      name: 'settings',
      component: PageSettings
    }
  ]
});

export default router;
