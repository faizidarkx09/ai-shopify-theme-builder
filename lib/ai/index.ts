// lib/ai/index.ts — Agent 2 public exports (AI Engine).
export * from './types';
export { deriveTheme, detectNiche, slugify, uid } from '../theme';
export { buildPageFromTemplate, detectPageType, imageUrl, FALLBACK_IMAGE } from '../templates';
export { generateWithGemini, hasGeminiKey, getGeminiModel } from './gemini';
export {
  generatePageEvents,
  generatePage,
  completeSections,
  getGenerationMode,
  resolvePageType,
  withImageFallback,
  resolveProducts,
  applyPlanSections,
} from './generate';
export {
  derivePlan,
  normalizePlan,
  updatePlanPageTitle,
  updatePlanSectionTitle,
  addPlanSection,
  removePlanSection,
  togglePlanSection,
  addPlanPage,
  removePlanPage,
  DEFAULT_PLAN_SECTIONS,
} from './plan';
export type { SitePlan, PlanPage, PlanSection } from './plan';
export {
  DEMO_NICHES,
  DEMO_PRODUCTS_LABEL,
  getDemoNiche,
  demoProductsForNiche,
  demoProductsForPrompt,
} from '../demoCatalog';
export type { DemoNiche, DemoNicheId, DemoProduct } from '../demoCatalog';
