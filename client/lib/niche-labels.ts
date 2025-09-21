// Shared utility for converting niche IDs to readable labels
export const NICHE_LABELS: Record<string, string> = {
  "lifestyle": "Lifestyle",
  "fashion-beauty": "Fashion & Beauty",
  "food": "Food",
  "travel": "Travel",
  "fitness": "Fitness",
  "technology": "Technology",
  "education": "Education",
  "entertainment": "Entertainment",
  "music": "Music",
  "photography": "Photography",
  "art": "Art",
  "business": "Business",
  "health-wellness": "Health & Wellness",
  "gaming": "Gaming",
  "others": "Others (Specify)",
};

export function getNicheLabel(nicheId: string): string {
  return NICHE_LABELS[nicheId] || nicheId;
}

export function getAllNicheLabels(): string[] {
  return Object.values(NICHE_LABELS);
}

export function getAllNicheIds(): string[] {
  return Object.keys(NICHE_LABELS);
}
