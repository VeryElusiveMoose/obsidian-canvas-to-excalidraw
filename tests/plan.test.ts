/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 */

import { strict as assert } from 'node:assert';
import { parseCanvas } from '../src/canvas';
import { drawingName, fitInside, planConversion } from '../src/plan';
import { SAMPLE } from './sample';

const plan = planConversion(parseCanvas(SAMPLE));

// Every node becomes one step, in the canvas's own order (its layering).
assert.deepEqual(plan.nodes.map((step) => step.node), ['group', 'title', 'wide', 'tall', 'note', 'guide', 'clip', 'site', 'gone', 'odd']);
assert.deepEqual(plan.nodes.map((step) => step.kind), ['frame', 'text', 'embed', 'embed', 'embed', 'embed', 'box', 'box', 'embed', 'box']);

const [group, title, wide, , note, guide, clip, site, , odd] = plan.nodes;
assert.deepEqual(group, { kind: 'frame', node: 'group', box: { x: -40, y: -40, width: 900, height: 500 }, name: 'Ideas' });

assert.equal(title.kind, 'text');
if (title.kind === 'text') {
	assert.equal(title.text, 'Title\nSome bold text with alias and Other note.');
	assert.equal(title.group, 'group');
	assert.equal(title.colors.stroke, '#f29e4d', 'preset color 2, blended for the stroke');
}
assert.equal(wide.kind === 'embed' && wide.path, 'pictures/wide.png');
assert.equal(note.kind === 'embed' && note.path, 'notes/Plan.md');
assert.equal(guide.kind === 'embed' && guide.subpath, '#page=2');
assert.equal(guide.kind === 'embed' && guide.label, 'Guide.pdf#page=2');
assert.deepEqual(clip.kind === 'box' && [clip.label, clip.link], ['clip.mp3', '[[audio/clip.mp3]]']);
assert.deepEqual(site.kind === 'box' && [site.label, site.link], ['https://example.com/page', 'https://example.com/page']);
assert.equal(site.kind === 'box' && site.group, undefined, 'a node outside the group has no frame');
assert.deepEqual(odd.kind === 'box' && odd.label, 'widget');

// Edges: the one to a node that doesn't exist is dropped; sides, heads, color and label carried over.
assert.equal(plan.arrows.length, 2);
assert.deepEqual(plan.arrows[0], {
	kind: 'arrow', edge: 'e1', from: 'title', to: 'wide', fromSide: 'right', toSide: 'left',
	startArrowHead: null, endArrowHead: 'arrow', color: '#08b94e', label: 'leads to',
});
assert.deepEqual(plan.arrows[1], {
	kind: 'arrow', edge: 'e2', from: 'note', to: 'guide', startArrowHead: 'arrow', endArrowHead: null, color: '#123abc',
});

// Fitting keeps the aspect ratio and centers the image in the node.
assert.deepEqual(fitInside({ x: 0, y: 0, width: 300, height: 300 }, 400, 200), { x: 0, y: 75, width: 300, height: 150 });
assert.deepEqual(fitInside({ x: 10, y: 10, width: 300, height: 300 }, 100, 400), { x: 122.5, y: 10, width: 75, height: 300 });
assert.deepEqual(fitInside({ x: 0, y: 0, width: 50, height: 50 }, 0, 0), { x: 0, y: 0, width: 50, height: 50 });

// The drawing never takes an existing name.
assert.equal(drawingName('Board', () => false), 'Board.exc.md');
const taken = new Set(['Board.exc.md', 'Board 1.exc.md']);
assert.equal(drawingName('Board', (name) => taken.has(name)), 'Board 2.exc.md');

// A file that isn't a canvas says so.
assert.throws(() => parseCanvas('not json'), /not valid JSON/u);
assert.throws(() => parseCanvas('{"nodes":[{"id":"a","type":"text"}]}'), /no position or size/u);
