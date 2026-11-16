/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adds "Convert to Excalidraw" to a canvas file's menu and to the command palette.
 * The drawing is written by the Excalidraw plugin itself, beside the canvas.
 */

import { Notice, Plugin, TFile, TFolder } from 'obsidian';
import { applyPlan, type Automate } from './apply';
import { parseCanvas } from './canvas';
import { drawingName, planConversion } from './plan';

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

	async convert(canvasFile: TFile): Promise<void> {
		const ea = window.ExcalidrawAutomate?.getAPI?.();
		if (!ea) {
			new Notice('Canvas to Excalidraw needs the Excalidraw plugin. Install and enable it, then try again.');
			return;
		}
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

function join(folder: string, name: string): string {
	return folder === '/' || folder === '' ? name : `${folder}/${name}`;
}
