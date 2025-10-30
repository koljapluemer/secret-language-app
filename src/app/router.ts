import type { Router } from 'vue-router';

const DEPLOY_FLAG = import.meta.env.VITE_DEPLOY_FLAG || 'secret';

let router: Router;

if (DEPLOY_FLAG === 'cram') {
  router = (await import('./router.cram')).default;
} else {
  router = (await import('./router.secret')).default;
}

export default router;
