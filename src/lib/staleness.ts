import { Staleness } from "@prisma/client";

/**
 * Normalizes a code signature by removing excessive whitespace and common modifiers
 * to make comparisons more robust.
 */
function normalizeSignature(sig: string): string {
  return sig
    .replace(/\s+/g, " ")
    .replace(/export /g, "")
    .replace(/default /g, "")
    .replace(/async /g, "")
    .trim();
}

/**
 * Evaluates the staleness severity based on the old signature/code and the new signature/code.
 */
export function classifyStaleness(
  oldSignature: string | null,
  newSignature: string | null,
  oldRawCode: string,
  newRawCode: string,
  isAdjacentFileChange: boolean = false
): Staleness {
  
  // 1. If signatures are present and they differ, it's a BROKEN API contract.
  if (oldSignature && newSignature) {
    const oldSigNorm = normalizeSignature(oldSignature);
    const newSigNorm = normalizeSignature(newSignature);
    
    if (oldSigNorm !== newSigNorm) {
      return "BROKEN";
    }
  }

  // 2. If the body of the code changed but the signature is intact, 
  // the implementation details might affect side effects or edge cases.
  if (oldRawCode.trim() !== newRawCode.trim()) {
    return "POTENTIALLY_OUTDATED";
  }

  // 3. If a different file in the same directory (or a related dependency) changed,
  // it might warrant a review, but we don't know for sure.
  if (isAdjacentFileChange) {
    return "REVIEW_RECOMMENDED";
  }

  // 4. No meaningful change detected for this specific unit
  return "OK";
}
