import type { Router } from 'vue-router';

const DEPLOY_FLAG = import.meta.env.VITE_DEPLOY_FLAG || 'secret';

export default function getRouter(): Promise<Router> {
  return DEPLOY_FLAG === 'cram'
    ? import('./router.cram').then(m => m.default)
    : import('./router.secret').then(m => m.default);
}
