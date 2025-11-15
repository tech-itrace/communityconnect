export interface ExtractedEntities {
  graduationYear?: number[];
  location?: string;
  degree?: string | string[];
  branch?: string | string[];
  skills?: string[];
  services?: string[];
  turnoverRequirement?: 'low' | 'medium' | 'high';
}

export interface QueryTestCase {
  id: number;
  query: string;
  category?: string;
  subcategory?: string;
  expected: {
    intent?: string;
    entities?: Partial<ExtractedEntities>;
  };
}

// Paste or move your 188 QueryTestCase objects here, e.g.:
export const allQueries: QueryTestCase[] = [
  // ... copy objects from your current queryExtraction.test.ts ...
];

// compareEntities helper (copy the function you already have)
export function compareEntities(
  expected: Partial<ExtractedEntities>,
  actual: Partial<ExtractedEntities>
): 'correct' | 'partial' | 'incorrect' {
  // ...reuse the logic from your test file (array/string/year comparisons)...
  // Keep the implementation identical to the one you already use.
  // ...existing code...
  let matches = 0;
  let total = 0;
  for (const key in expected) {
    total++;
    const expectedVal = (expected as any)[key];
    const actualVal = (actual as any)[key];
    if ((key === 'skills' || key === 'services') && Array.isArray(expectedVal)) {
      if (Array.isArray(actualVal)) {
        const intersection = expectedVal.filter((v: string) =>
          actualVal.some((a: string) =>
            a.toLowerCase().includes(v.toLowerCase()) || v.toLowerCase().includes(a.toLowerCase())
          )
        );
        if (intersection.length === expectedVal.length) matches++;
        else if (intersection.length > 0) matches += 0.5;
      }
    } else if (key === 'location' && typeof expectedVal === 'string') {
      if (typeof actualVal === 'string') {
        if (actualVal.toLowerCase().includes(expectedVal.toLowerCase())) matches++;
        else if (expectedVal.toLowerCase().includes((actualVal || '').toLowerCase())) matches += 0.5;
      }
    } else if (key === 'graduationYear' && Array.isArray(expectedVal)) {
      if (Array.isArray(actualVal)) {
        if (JSON.stringify((expectedVal as any).sort()) === JSON.stringify((actualVal as any).sort())) matches++;
      }
    } else {
      if (JSON.stringify(expectedVal) === JSON.stringify(actualVal)) matches++;
    }
  }
  const accuracy = total > 0 ? matches / total : 0;
  if (accuracy >= 0.9) return 'correct';
  if (accuracy >= 0.4) return 'partial';
  return 'incorrect';
}