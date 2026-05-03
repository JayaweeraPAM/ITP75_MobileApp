import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

/**
 * Proper TS/TSX -> JS transpile using the TypeScript compiler API.
 * This preserves JSX (so Expo/Babel can handle it) and removes types safely.
 */
async function main() {
  const relPaths = process.argv.slice(2);
  if (relPaths.length === 0) {
    console.error('Usage: node scripts/transpile-ts.mjs <path1> <path2> ...');
    process.exit(2);
  }

  for (const rel of relPaths) {
    const abs = path.resolve(process.cwd(), rel);
    const src = await fs.readFile(abs, 'utf8');

    const isTsx = /\.tsx$/i.test(abs);
    const out = ts.transpileModule(src, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2019,
        module: ts.ModuleKind.ESNext,
        jsx: isTsx ? ts.JsxEmit.Preserve : ts.JsxEmit.None,
        importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
        sourceMap: false,
      },
      fileName: path.basename(abs),
      reportDiagnostics: true,
    });

    const jsPath = abs.replace(/\.tsx?$/i, '.js');
    await fs.writeFile(jsPath, out.outputText, 'utf8');

    const relOut = path.relative(process.cwd(), jsPath);
    if (out.diagnostics?.length) {
      const msg = ts.formatDiagnosticsWithColorAndContext(out.diagnostics, {
        getCanonicalFileName: (f) => f,
        getCurrentDirectory: () => process.cwd(),
        getNewLine: () => '\n',
      });
      console.warn(`Diagnostics for ${relOut}:\n${msg}`);
    }

    console.log(`Wrote ${relOut}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

