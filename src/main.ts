/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adds "Convert to Excalidraw" to a canvas file's menu and to the command palette.
 * The drawing is written by the Excalidraw plugin itself, beside the canvas.
 */

import { App, Modal, Notice, Plugin, TFile, TFolder } from 'obsidian';
import { applyPlan, type Automate } from './apply';
import { parseCanvas } from './canvas';
import { drawingName, planConversion } from './plan';
import { EXCALIDRAW_PAGE, excalidrawState, promptFor, type Prompt } from './prerequisite';

interface ExcalidrawAutomateApi extends Automate {
	create(params: { filename: string; foldername: string; onNewPane?: boolean }): Promise<string>;
	destroy?(): void;
}

declare global {
	interface Window {
		ExcalidrawAutomate?: { getAPI?: () => ExcalidrawAutomateApi };
	}
}

export default class CanvasToExcalidrawPlugin extends Plugin {
	onload(): void {
		// Once per session, after every plugin has loaded: say so if Excalidraw is missing or off.
		this.app.workspace.onLayoutReady(() => void this.checkExcalidraw(true));
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (!(file instanceof TFile) || file.extension !== 'canvas') return;
				menu.addItem((item) => {
					item
						.setTitle('Convert to Excalidraw')
						.setIcon('pencil')
						.onClick(() => void this.convert(file));
				});
			}),
		);
		this.addCommand({
			id: 'convert-active-canvas',
			name: 'Convert current canvas',
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== 'canvas') return false;
				if (!checking) void this.convert(file);
				return true;
			},
		});
	}

	/**
	 * Excalidraw's state; tells the user what to do when it isn't ready. Returns true when it is.
	 * At startup it only speaks up when Excalidraw is missing or off, not while it may still be loading.
	 */
	async checkExcalidraw(atStartup = false): Promise<boolean> {
		const state = await excalidrawState({
			hasApi: () => typeof window.ExcalidrawAutomate?.getAPI === 'function',
			configDir: this.app.vault.configDir,
			exists: (path) => this.app.vault.adapter.exists(path),
			read: (path) => this.app.vault.adapter.read(path),
		});
		const prompt = promptFor(state, atStartup);
		if (prompt) showPrompt(this.app, prompt);
		return state === 'ready';
	}

	async convert(canvasFile: TFile): Promise<void> {
		if (!(await this.checkExcalidraw())) return;
		const ea = window.ExcalidrawAutomate?.getAPI?.();
		if (!ea) return;
		try {
			const canvas = parseCanvas(await this.app.vault.cachedRead(canvasFile));
			const result = await applyPlan(ea, planConversion(canvas), (path) => this.app.vault.getFileByPath(path) ?? undefined);
			const folder = canvasFile.parent instanceof TFolder ? canvasFile.parent.path : '/';
			const filename = drawingName(canvasFile.basename, (name) => this.app.vault.getAbstractFileByPath(join(folder, name)) !== null);
			await ea.create({ filename, foldername: folder, onNewPane: false });
			if (result.missing.length) {
				new Notice(`Converted. ${result.missing.length} file(s) couldn't be drawn and are shown as labeled boxes.`);
			}
		} catch (error) {
			new Notice(`Couldn't convert ${canvasFile.name}: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			ea.destroy?.();
		}
	}
}

function showPrompt(app: App, prompt: Prompt): void {
	if (!prompt.button) {
		new Notice(prompt.message);
		return;
	}
	new ExcalidrawPrompt(app, prompt.message, prompt.button).open();
}

/** Says Excalidraw is needed, with a button to its page in the community plugin browser. */
class ExcalidrawPrompt extends Modal {
	constructor(app: App, private message: string, private button: string) {
		super(app);
	}

	onOpen(): void {
		this.contentEl.createEl('p', { text: this.message });
		const buttons = this.contentEl.createDiv({ cls: 'modal-button-container' });
		buttons.createEl('button', { text: this.button, cls: 'mod-cta' }).addEventListener('click', () => {
			window.open(EXCALIDRAW_PAGE);
			this.close();
		});
		buttons.createEl('button', { text: 'Not now' }).addEventListener('click', () => this.close());
	}

	onClose(): void {
		this.contentEl.empty();
	}
}

function join(folder: string, name: string): string {
	return folder === '/' || folder === '' ? name : `${folder}/${name}`;
}
