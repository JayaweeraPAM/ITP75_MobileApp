import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Very small TS/TSX -> JS/JSX stripper.
 * This is NOT a full TypeScript parser; it targets common patterns in this repo:
 * - `interface Foo { ... }`
 * - `type Foo = ...`
 * - param annotations: `(x: string, y?: number)`
 * - generics on hooks: `useState<Foo[]>([])`, `useRef<FlatList>(null)`
 * - casts: `as any`, `(globalThis as any)`
 */
function stripTypes(src) {
  let s = src;

  // Remove `interface X { ... }` blocks (non-nested heuristic).
  s = s.replace(/^\s*interface\s+\w+\s*\{[\s\S]*?\}\s*\n/gm, '\n');

  // Remove `type X = ...;`
  s = s.replace(/^\s*type\s+\w+\s*=\s*[^;]+;\s*\n/gm, '\n');

  // Remove `as const`, `as any`, and `as Something`
  s = s.replace(/\s+as\s+const\b/g, '');
  s = s.replace(/\s+as\s+any\b/g, '');
  s = s.replace(/\s+as\s+[A-Za-z0-9_.<>\[\]\s|&]+/g, '');

  // Remove generic args in common hooks/components: useState<...>, useRef<...>, useAnimatedRef<...>
  s = s.replace(/\b(useState|useRef|useAnimatedRef)\s*<[^>]+>\s*/g, '$1');

  // Remove `createContext<Foo>()` generic.
  s = s.replace(/\bcreateContext\s*<[^>]+>\s*/g, 'createContext');

  // Remove function param type annotations inside parentheses: `foo: Bar` -> `foo`
  // Heuristic: only within `(...)` segments.
  s = s.replace(/\(([^)]*)\)/g, (m, inner) => {
    const cleaned = inner
      // object destructuring with annotation: `({ a, b }: Props)` -> `{ a, b }`
      .replace(/\}\s*:\s*[^,)\n]+/g, '}')
      // simple param: `x: Type` -> `x`
      .replace(/([A-Za-z0-9_$]+)\s*:\s*[^,)=]+/g, '$1')
      // optional param with type: `x?: Type` -> `x`
      .replace(/([A-Za-z0-9_$]+)\?\s*:\s*[^,)=]+/g, '$1')
      // return type annotations on arrow fns in params (rare)
      .replace(/\)\s*:\s*[^=]+=>/g, ')=>');
    return `(${cleaned})`;
  });

  // Remove return type on named functions: `function f(): X {` -> `function f() {`
  s = s.replace(/function(\s+\w+)\s*\(\)\s*:\s*[^ {]+\s*\{/g, 'function$1() {');

  // Remove `: any` in catch param: `catch (e: any)` -> `catch (e)`
  s = s.replace(/catch\s*\(\s*([A-Za-z0-9_$]+)\s*:\s*any\s*\)/g, 'catch ($1)');

  // Remove `Record<...>` annotations in const declarations: `const X: Record<...> =` -> `const X =`
  s = s.replace(/\bconst\s+([A-Za-z0-9_$]+)\s*:\s*Record<[^>]+>\s*=/g, 'const $1 =');

  return s;
}

async function main() {
  const relPaths = process.argv.slice(2);
  if (relPaths.length === 0) {
    console.error('Usage: node scripts/strip-types.mjs <path1> <path2> ...');
    process.exit(2);
  }

  for (const rel of relPaths) {
    const abs = path.resolve(process.cwd(), rel);
    const src = await fs.readFile(abs, 'utf8');
    const out = stripTypes(src);
    const outPath = abs.replace(/\.tsx?$/i, '.js');
    await fs.writeFile(outPath, out, 'utf8');
    console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

