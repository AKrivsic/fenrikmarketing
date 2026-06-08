import type { ProjectUpdate } from "@/lib/supabase/types";
import type { KnowledgeCardKey, ProjectKnowledge } from "@/lib/knowledge/types";

// Task 6 — compile an approved card into the existing Project Brain columns so
// every AI workflow (which reads projectBrainBlock) immediately sees the data.
// Product/Customer/Voice map onto brain columns; Proof stays only in knowledge
// (returns no column changes). Returns the partial ProjectUpdate for the given
// card, or an empty object for Proof.
//
// Free-form jsonb columns keep the existing brain conventions:
//   - target_audience -> { segments: string[] }
//   - tone_of_voice   -> { notes: string[] }
export function compileCardToBrain(
  knowledge: ProjectKnowledge,
  cardKey: KnowledgeCardKey,
): ProjectUpdate {
  switch (cardKey) {
    case "product": {
      const card = knowledge.cards.product;
      return {
        product_is: card.product_is,
        product_is_not: card.product_is_not,
        product_strengths: card.product_strengths,
      };
    }
    case "customer": {
      const card = knowledge.cards.customer;
      return {
        target_audience: { segments: card.target_audience },
        pain_points: card.pain_points,
      };
    }
    case "voice": {
      const card = knowledge.cards.voice;
      return {
        tone_of_voice: { notes: card.tone },
        forbidden_claims: card.forbidden_claims,
      };
    }
    case "proof":
      // Proof has no brain column — it lives only in projects.knowledge.
      return {};
  }
}
