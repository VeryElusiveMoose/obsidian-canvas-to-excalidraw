/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 */

import { strict as assert } from 'node:assert';
import { EXCALIDRAW_PAGE, excalidrawState, promptFor, type Probe } from '../src/prerequisite';

/** A vault with these files, and Excalidraw's API present or not. */
function probe(files: Record<string, string>, api: boolean): Probe {
	return {
		hasApi: () => api,
		configDir: '.vaultconfig',
		exists: async (path) => path in files,
		read: async (path) => {
			if (!(path in files)) throw new Error(`no ${path}`);
			return files[path];
		},
	};
}

const manifest = { '.vaultconfig/plugins/obsidian-excalidraw-plugin/manifest.json': '{}' };
const enabled = { '.vaultconfig/community-plugins.json': '["dataview", "obsidian-excalidraw-plugin"]' };
const others = { '.vaultconfig/community-plugins.json': '["dataview"]' };

// The three states the user can be in, read from the vault's own config folder.
assert.equal(await excalidrawState(probe({ ...manifest, ...enabled }, true)), 'ready');
assert.equal(await excalidrawState(probe({ ...others }, false)), 'missing');
assert.equal(await excalidrawState(probe({ ...manifest, ...others }, false)), 'off');
assert.equal(await excalidrawState(probe({ ...manifest }, false)), 'off', 'no plugin list means nothing is turned on');
assert.equal(await excalidrawState(probe({ ...manifest, '.vaultconfig/community-plugins.json': 'not json' }, false)), 'off');
assert.equal(await excalidrawState(probe({ ...manifest, ...enabled }, false)), 'loading');
// The API is what counts: present means ready, whatever the files say.
assert.equal(await excalidrawState(probe({}, true)), 'ready');

// What the user is told.
assert.equal(promptFor('ready', false), undefined);
assert.equal(promptFor('ready', true), undefined);
assert.deepEqual(promptFor('missing', true), { message: 'Canvas to Excalidraw needs the Excalidraw plugin.', button: 'Get Excalidraw' });
assert.deepEqual(promptFor('missing', false), promptFor('missing', true), 'a convert says it again after a dismissed startup prompt');
assert.equal(promptFor('off', true)?.button, 'Turn it on');
assert.equal(promptFor('loading', true), undefined, 'at startup, a turned-on Excalidraw may still be loading');
assert.equal(promptFor('loading', false)?.button, undefined, 'on a convert it is a notice, with no button');
assert.match(promptFor('loading', false)?.message ?? '', /hasn't finished loading/u);

// The button opens Excalidraw's page in the community plugin browser.
assert.equal(EXCALIDRAW_PAGE, 'obsidian://show-plugin?id=obsidian-excalidraw-plugin');
