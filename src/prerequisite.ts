/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * Finds out whether the Excalidraw plugin is ready, missing or turned off, using only
 * what any plugin can see: Excalidraw's published API and the vault's config folder.
 */

export const EXCALIDRAW_ID = 'obsidian-excalidraw-plugin';

/** Opens Excalidraw's page in Obsidian's community plugin browser, where it can be installed or turned on. */
export const EXCALIDRAW_PAGE = `obsidian://show-plugin?id=${EXCALIDRAW_ID}`;

/**
 * - ready: Excalidraw is loaded and its API is available.
 * - missing: Excalidraw isn't installed.
 * - off: Excalidraw is installed but not turned on.
 * - loading: Excalidraw is turned on but its API isn't available (yet).
 */
export type ExcalidrawState = 'ready' | 'missing' | 'off' | 'loading';

export interface Probe {
	/** True when Excalidraw's API is available. */
	hasApi(): boolean;
	/** The vault's config folder, usually ".obsidian". */
	configDir: string;
	exists(path: string): Promise<boolean>;
	read(path: string): Promise<string>;
}

export async function excalidrawState(probe: Probe): Promise<ExcalidrawState> {
	if (probe.hasApi()) return 'ready';
	const installed = await probe.exists(`${probe.configDir}/plugins/${EXCALIDRAW_ID}/manifest.json`).catch(() => false);
	if (!installed) return 'missing';
	return (await enabledPlugins(probe)).includes(EXCALIDRAW_ID) ? 'loading' : 'off';
}

/** The ids of the community plugins that are turned on, from the vault's own list. */
async function enabledPlugins(probe: Probe): Promise<string[]> {
	try {
		const list: unknown = JSON.parse(await probe.read(`${probe.configDir}/community-plugins.json`));
		return Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [];
	} catch {
		return [];
	}
}

export interface Prompt {
	message: string;
	/** The button that opens Excalidraw's page; without one, the message is a notice. */
	button?: string;
}

/** What to tell the user in each state that stops a conversion. */
export const PROMPTS: Record<Exclude<ExcalidrawState, 'ready'>, Prompt> = {
	missing: { message: 'Canvas to Excalidraw needs the Excalidraw plugin.', button: 'Get Excalidraw' },
	off: { message: 'Canvas to Excalidraw needs the Excalidraw plugin, which is installed but turned off.', button: 'Turn it on' },
	loading: { message: 'The Excalidraw plugin is turned on but hasn\'t finished loading. Try again in a moment.' },
};

/**
 * What to tell the user, or nothing. At startup only a missing or turned-off Excalidraw is worth a word;
 * one that is turned on may still be loading.
 */
export function promptFor(state: ExcalidrawState, atStartup: boolean): Prompt | undefined {
	if (state === 'ready' || (atStartup && state === 'loading')) return undefined;
	return PROMPTS[state];
}
