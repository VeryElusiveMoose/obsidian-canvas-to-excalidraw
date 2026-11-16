/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bundles each tests/*.test.ts with esbuild and runs it in Node. A test fails by throwing.
 */

import { build } from 'esbuild';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const folder = await mkdtemp(join(tmpdir(), 'canvas-to-excalidraw-tests-'));
try {
	const files = (await readdir('tests')).filter((name) => name.endsWith('.test.ts')).sort();
	for (const name of files) {
		const outfile = join(folder, name.replace(/\.ts$/u, '.mjs'));
		await build({ entryPoints: [join('tests', name)], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' });
		await import(pathToFileURL(outfile).href);
	}
	console.log(`${files.length} test file(s) passed.`);
} finally {
	await rm(folder, { recursive: true, force: true });
}
