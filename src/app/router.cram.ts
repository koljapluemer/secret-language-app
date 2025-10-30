import { createRouter, createWebHistory } from 'vue-router';
import CramHome from '@/pages/cram/home/CramHome.vue';
import CramWidget from '@/modes/modes/cram/CramWidget.vue';
import CramDebug from '@/pages/cram/debug/CramDebug.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'cram-home',
      component: CramHome
    },
    {
      path: '/practice',
      name: 'cram',
      component: CramWidget
    },
    {
      path: '/debug',
      name: 'cram-debug',
      component: CramDebug
    }
  ]
});

export default router;
