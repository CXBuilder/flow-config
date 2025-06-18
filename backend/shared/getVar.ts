/**
 * Get environment variable and throw a descriptive error if its undefined
 */
export function getVar(name: string, defaultValue?: string): string {
  const val = process.env[name] || defaultValue;
  if (!val) {
    throw new Error(`Environment variable "${name}" is not defined`);
  }
  return val;
}
