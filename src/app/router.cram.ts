import { createRouter, createWebHistory } from 'vue-router';
import CramHome from '@/pages/cram/home/CramHome.vue';
import CramWidget from '@/modes/modes/cram/CramWidget.vue';

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
    }
  ]
});

export default router;
