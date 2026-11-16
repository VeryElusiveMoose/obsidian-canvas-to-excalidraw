/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * The plan drawn through a stand-in for ExcalidrawAutomate that records what it is asked and keeps
 * elements the way the real API does (addText with a box returns the box, with the text bound to it).
 * The real API is not run here.
 */

import { strict as assert } from 'node:assert';
import { applyPlan, type Automate, type ElementLike } from '../src/apply';
import { parseCanvas } from '../src/canvas';
import { planConversion } from '../src/plan';
import { SAMPLE } from './sample';

type Element = ElementLike & { id: string; type: string; strokeColor: string; backgroundColor: string; text?: string; fileId?: string; frameId?: string | null; [key: string]: unknown };

class StubAutomate implements Automate {
	style: Automate['style'] = { strokeColor: '#000', backgroundColor: 'transparent', fillStyle: 'hachure', strokeWidth: 2, strokeStyle: 'solid', roughness: 1, opacity: 100, roundness: null, fontFamily: 1, fontSize: 20, textAlign: 'left', verticalAlign: 'top' };
	elements = new Map<string, Element>();
	calls: unknown[][] = [];
	private next = 0;
	constructor(private sizes: Record<string, [number, number] | 'fail'>) {}

	private add(type: string, x: number, y: number, width: number, height: number, extra: Partial<Element> = {}): string {
		const id = `el${this.next++}`;
		this.elements.set(id, { id, type, x, y, width, height, strokeColor: this.style.strokeColor, backgroundColor: this.style.backgroundColor, roundness: this.style.roundness, fontFamily: this.style.fontFamily, boundElements: null, link: null, ...extra });
		return id;
	}
	addText(x: number, y: number, text: string, f: Parameters<Automate['addText']>[3] = {}): string {
		this.calls.push(['addText', x, y, text, f]);
		const pad = f.boxPadding ?? 30;
		const width = f.width ?? text.length * 8;
		const height = f.height ?? 20;
		const box = f.box ? this.add('rectangle', x - pad, y - pad, width + 2 * pad, height + 2 * pad) : undefined;
		const textId = this.add('text', x, y, width, height, { text, containerId: box ?? null });
		if (box) this.elements.get(box)!.boundElements = [{ id: textId, type: 'text' }];
		return box ?? textId;
	}
	async addImage(x: number, y: number, file: unknown): Promise<string | null> {
		const path = typeof file === 'string' ? file : (file as { path: string }).path;
		this.calls.push(['addImage', x, y, typeof file === 'string' ? `string:${file}` : `file:${path}`]);
		const size = this.sizes[path];
		if (size === 'fail') throw new Error('could not load');
		if (!size) return null;
		return this.add('image', x, y, size[0], size[1], { fileId: `file-${path}` });
	}
	addFrame(x: number, y: number, width: number, height: number, name?: string): string {
		this.calls.push(['addFrame', x, y, width, height, name]);
		return this.add('frame', x, y, width, height, { name });
	}
	addElementsToFrame(frameId: string, ids: string[]): void {
		this.calls.push(['addElementsToFrame', frameId, ids]);
		for (const id of ids) this.elements.get(id)!.frameId = frameId;
	}
	connectObjects(a: string, ca: string | null, b: string, cb: string | null, f?: object): string {
		this.calls.push(['connectObjects', a, ca, b, cb, f, this.style.strokeColor]);
		return this.add('arrow', 0, 0, 10, 10, { start: a, end: b });
	}
	getElement(id: string): Element | undefined {
		return this.elements.get(id);
	}
}

const files: Record<string, { path: string }> = Object.fromEntries(
	['pictures/wide.png', 'pictures/tall.jpg', 'notes/Plan.md', 'docs/Guide.pdf', 'audio/clip.mp3'].map((path) => [path, { path }]),
);
const sizes: Record<string, [number, number]> = {
	'pictures/wide.png': [400, 200], 'pictures/tall.jpg': [200, 800], 'notes/Plan.md': [600, 400], 'docs/Guide.pdf#page=2': [612, 792],
};
const ea = new StubAutomate(sizes);
const result = await applyPlan(ea, planConversion(parseCanvas(SAMPLE)), (path) => files[path]);
const all = [...ea.elements.values()];
const byType = (type: string) => all.filter((el) => el.type === type);

// Layering: elements come out in the canvas's node order, then the arrows and their labels.
assert.deepEqual(all.map((el) => el.type), [
	'frame', 'rectangle', 'text', 'image', 'image', 'image', 'image', 'rectangle', 'text', 'rectangle', 'text',
	'rectangle', 'text', 'rectangle', 'text', 'arrow', 'text', 'arrow',
]);

// A text card is a rectangle exactly at the node, with its text bound in it and the card's colors.
const card = all[1];
assert.deepEqual([card.x, card.y, card.width, card.height], [0, 0, 250, 120]);
assert.deepEqual(card.boundElements, [{ id: all[2].id, type: 'text' }]);
assert.equal(all[2].containerId, card.id);
assert.equal(all[2].text, 'Title\nSome bold text with alias and Other note.');
assert.equal(card.strokeColor, '#f29e4d');
assert.equal(all[2].strokeColor, '#222222');
assert.deepEqual(card.roundness, { type: 3 });

// Images stay vault files (the TFile goes to the API, never data) and are fitted inside their node.
const [wide, tall, note, guide] = byType('image');
assert.deepEqual([wide.x, wide.y, wide.width, wide.height], [300, 75, 300, 150]);
assert.deepEqual([tall.x, tall.y, tall.width, tall.height], [562.5, 50, 75, 300]);
assert.deepEqual([note.x, note.y, note.width, note.height].map((n) => Math.round(n * 1000) / 1000), [0, 216.667, 250, 166.667]);
assert.deepEqual(ea.calls.filter((c) => c[0] === 'addImage').map((c) => c[3]), [
	'file:pictures/wide.png', 'file:pictures/tall.jpg', 'file:notes/Plan.md', 'string:docs/Guide.pdf#page=2',
]);
assert.equal(guide.fileId, 'file-docs/Guide.pdf#page=2');

// Other files and web links are labeled boxes that link to them; a file that isn't in the vault too.
const boxes = byType('rectangle').slice(1);
assert.deepEqual(boxes.map((el) => el.link), ['[[audio/clip.mp3]]', 'https://example.com/page', '[[pictures/gone.png]]', null]);
assert.deepEqual(result.missing, ['pictures/gone.png']);

// The group is a frame named for its label, holding the nodes inside it (a card with its text).
assert.deepEqual(ea.calls[0], ['addFrame', -40, -40, 900, 500, 'Ideas']);
assert.deepEqual(ea.calls.filter((c) => c[0] === 'addElementsToFrame'), [['addElementsToFrame', 'el0', ['el1', 'el2', 'el3', 'el4', 'el5']]]);

// Edges: bound to both ends' elements, with the sides, heads and color; the label is text bound to the arrow.
const connects = ea.calls.filter((c) => c[0] === 'connectObjects');
assert.deepEqual(connects, [
	['connectObjects', 'el1', 'right', 'el3', 'left', { startArrowHead: null, endArrowHead: 'arrow' }, '#08b94e'],
	['connectObjects', 'el5', null, 'el6', null, { startArrowHead: 'arrow', endArrowHead: null }, '#123abc'],
]);
const [arrow] = byType('arrow');
const label = all[all.indexOf(arrow) + 1];
assert.equal(label.text, 'leads to');
assert.equal(label.containerId, arrow.id);
assert.deepEqual(arrow.boundElements, [{ id: label.id, type: 'text' }]);

// An image the API can't load (it returns nothing, or throws) is left as a labeled, linked box.
for (const outcome of [undefined, 'fail'] as const) {
	const failing = new StubAutomate(outcome ? { 'pictures/wide.png': outcome } : {});
	const canvas = { nodes: [{ id: 'w', type: 'file', x: 0, y: 0, width: 100, height: 100, file: 'pictures/wide.png' }], edges: [] };
	const r = await applyPlan(failing, planConversion(canvas), (path) => files[path]).catch((error: unknown) => assert.fail(`outcome ${outcome}: applyPlan threw (${String(error)})`));
	const els = [...failing.elements.values()];
	assert.deepEqual(els.map((el) => el.type), ['rectangle', 'text'], `outcome ${outcome}`);
	assert.equal(els[0].link, '[[pictures/wide.png]]');
	assert.equal(els[1].text, 'wide.png');
	assert.deepEqual(r.missing, ['pictures/wide.png']);
}
