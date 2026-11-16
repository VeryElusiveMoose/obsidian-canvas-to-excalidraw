/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 */

import esbuild from 'esbuild';

const production = process.argv[2] === 'production';

const options = {
	bundle: true,
	banner: { js: '/*! Canvas to Excalidraw | SPDX-License-Identifier: Apache-2.0 | See NOTICE */' },
	entryPoints: ['src/main.ts'],
	external: ['obsidian', 'electron'],
	format: 'cjs',
	legalComments: 'none',
	logLevel: 'info',
	minify: production,
	outfile: 'main.js',
	platform: 'browser',
	sourcemap: production ? false : 'inline',
	target: 'es2022',
};

if (production) {
	await esbuild.build(options);
} else {
	const context = await esbuild.context(options);
	await context.watch();
}
