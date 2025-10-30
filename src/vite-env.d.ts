/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SETS_BASE_URL: string
  readonly VITE_DEPLOY_FLAG: 'secret' | 'cram'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
