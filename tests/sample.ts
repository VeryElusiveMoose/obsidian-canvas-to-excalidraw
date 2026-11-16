/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * A made-up canvas with one of each node kind.
 */

export const SAMPLE = JSON.stringify({
	nodes: [
		{ id: 'group', type: 'group', x: -40, y: -40, width: 900, height: 500, label: 'Ideas' },
		{ id: 'title', type: 'text', x: 0, y: 0, width: 250, height: 120, color: '2', text: '# Title\nSome **bold** text with [[Other note|alias]] and [[folder/Other note.md]].' },
		{ id: 'wide', type: 'file', x: 300, y: 0, width: 300, height: 300, file: 'pictures/wide.png' },
		{ id: 'tall', type: 'file', x: 450, y: 50, width: 300, height: 300, file: 'pictures/tall.jpg' },
		{ id: 'note', type: 'file', x: 0, y: 200, width: 250, height: 200, file: 'notes/Plan.md' },
		{ id: 'guide', type: 'file', x: 0, y: 600, width: 200, height: 260, file: 'docs/Guide.pdf', subpath: '#page=2' },
		{ id: 'clip', type: 'file', x: 300, y: 600, width: 200, height: 60, file: 'audio/clip.mp3' },
		{ id: 'site', type: 'link', x: 600, y: 600, width: 300, height: 200, url: 'https://example.com/page' },
		{ id: 'gone', type: 'file', x: 950, y: 0, width: 100, height: 100, file: 'pictures/gone.png' },
		{ id: 'odd', type: 'widget', x: 950, y: 200, width: 100, height: 100 },
	],
	edges: [
		{ id: 'e1', fromNode: 'title', toNode: 'wide', fromSide: 'right', toSide: 'left', color: '4', label: 'leads to' },
		{ id: 'e2', fromNode: 'note', toNode: 'guide', fromEnd: 'arrow', toEnd: 'none', color: '#123abc' },
		{ id: 'e3', fromNode: 'note', toNode: 'nowhere' },
	],
});
