import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strips non-numeric chars and keeps at most one decimal separator (. or ,)
export function sanitizeDecimalInput(raw: string): string {
  const valid = raw.replace(/[^0-9.,]/g, '');
  const sepIdx = valid.search(/[.,]/);
  if (sepIdx === -1) return valid;
  return valid.slice(0, sepIdx + 1) + valid.slice(sepIdx + 1).replace(/[.,]/g, '');
}
