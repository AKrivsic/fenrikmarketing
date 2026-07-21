export { isProductPresentationDecisionEnabled } from "./config";
export { defaultProductPresentationCapabilities } from "./capabilities";
export { planProductPresentationForPackage } from "./planForPackage";
export {
  productPresentationFieldsForPersistence,
  readProductPresentationFromBrief,
} from "./persistence";
export { resolveProductPresentationPlan } from "./resolveProductPresentation";
export {
  ppdAuthorizesPresentationWithoutProductDemo,
  valueProofSatisfiedWithoutProductAppearance,
  valueProofViaAuthenticAppearance,
} from "./valueProof";
export {
  PRODUCT_PRESENTATION_VALIDATION_VERSION,
  productPresentationFieldsForValidationPersistence,
  productPresentationValidationIssues,
  validateProductPresentationPackage,
} from "./validateProductPresentation";
export type {
  ProductPresentationValidationResult,
  ProductPresentationViolation,
  ProductPresentationViolationCode,
} from "./validateProductPresentation";
export type {
  AppearanceClaim,
  FidelityTier,
  ForbiddenPresentationForm,
  PresentationClass,
  ProductPresentationCapabilities,
  ProductPresentationPlan,
  ValueProofMode,
} from "./types";
export {
  APPEARANCE_CLAIMS,
  FIDELITY_TIERS,
  FORBIDDEN_PRESENTATION_FORMS,
  PRESENTATION_CLASSES,
  PRODUCT_PRESENTATION_VERSION,
  VALUE_PROOF_MODES,
} from "./types";
