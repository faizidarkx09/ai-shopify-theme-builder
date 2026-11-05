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
} from './generate';
