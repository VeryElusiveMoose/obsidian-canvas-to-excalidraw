/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * Turns a canvas into an ordered list of drawing steps. Pure: no Obsidian and no
 * Excalidraw here, so the mapping can be tested on its own.
 */

import { findParentGroup, type CanvasDocument, type CanvasEnd, type CanvasNode, type CanvasSide } from './canvas';
import { edgeColor, nodeColors, type NodeColors } from './colors';
import { stripMarkdown } from './text';

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** One element to draw. Node steps keep the canvas's node order, which is its layering. */
export type NodeStep =
	/** A text card: its text in a rectangle at the card's size. */
	| { kind: 'text'; node: string; box: Box; text: string; colors: NodeColors; group?: string }
	/** An image, note or PDF: a linked image fitted inside the box. `label` is the box shown if the file can't be drawn. */
	| { kind: 'embed'; node: string; box: Box; path: string; subpath?: string; label: string; colors: NodeColors; group?: string }
	/** Anything else (other files, web links, unknown node types): a labeled box that links to it. */
	| { kind: 'box'; node: string; box: Box; label: string; link?: string; colors: NodeColors; group?: string }
	/** A group: a frame with the group's label as its name. */
	| { kind: 'frame'; node: string; box: Box; name?: string };

export interface ArrowStep {
	kind: 'arrow';
	edge: string;
	from: string;
	to: string;
	fromSide?: CanvasSide;
	toSide?: CanvasSide;
	startArrowHead: 'arrow' | null;
	endArrowHead: 'arrow' | null;
	color: string;
	label?: string;
}

export interface Plan {
	nodes: NodeStep[];
	arrows: ArrowStep[];
}

/** File types Excalidraw can draw from a vault link. Anything else becomes a labeled box. */
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const EMBED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, 'md', 'pdf']);

export function planConversion(canvas: CanvasDocument): Plan {
	const groups = canvas.nodes.filter((node) => node.type === 'group');
	const nodes = canvas.nodes.map((node): NodeStep => {
		const box = { x: node.x, y: node.y, width: node.width, height: node.height };
		if (node.type === 'group') return { kind: 'frame', node: node.id, box, name: node.label || undefined };
		const colors = nodeColors(node.color);
		const group = findParentGroup(node, groups)?.id;
		const common = { node: node.id, box, colors, ...(group ? { group } : {}) };
		if (node.type === 'text') return { kind: 'text', ...common, text: stripMarkdown(node.text ?? '') };
		if (node.type === 'file' && node.file) {
			const label = fileLabel(node);
			if (EMBED_EXTENSIONS.has(extension(node.file))) {
				return { kind: 'embed', ...common, path: node.file, ...(node.subpath ? { subpath: node.subpath } : {}), label };
			}
			return { kind: 'box', ...common, label, link: `[[${node.file}${node.subpath ?? ''}]]` };
		}
		if (node.type === 'link' && node.url) return { kind: 'box', ...common, label: node.url, link: node.url };
		return { kind: 'box', ...common, label: node.type === 'file' ? 'Missing file' : node.type };
	});
	const known = new Set(canvas.nodes.map((node) => node.id));
	const arrows = canvas.edges
		.filter((edge) => known.has(edge.fromNode) && known.has(edge.toNode))
		.map((edge): ArrowStep => ({
			kind: 'arrow',
			edge: edge.id,
			from: edge.fromNode,
			to: edge.toNode,
			...(edge.fromSide ? { fromSide: edge.fromSide } : {}),
			...(edge.toSide ? { toSide: edge.toSide } : {}),
			// Canvas's defaults: no head at the start, an arrowhead at the end.
			startArrowHead: head(edge.fromEnd, 'none'),
			endArrowHead: head(edge.toEnd, 'arrow'),
			color: edgeColor(edge.color),
			...(edge.label ? { label: edge.label } : {}),
		}));
	return { nodes, arrows };
}

/** Where an image goes inside its node: as large as fits, keeping its aspect ratio, centered (as Canvas shows it). */
export function fitInside(box: Box, width: number, height: number): Box {
	if (!(width > 0 && height > 0)) return { ...box };
	const scale = Math.min(box.width / width, box.height / height);
	const fitted = { width: width * scale, height: height * scale };
	return { x: box.x + (box.width - fitted.width) / 2, y: box.y + (box.height - fitted.height) / 2, ...fitted };
}

/**
 * The first free name for the drawing beside the canvas: "Name.exc.md", then "Name 1.exc.md", and on.
 * The Excalidraw plugin knows a drawing by its frontmatter, not its name, so the short suffix is enough.
 */
export function drawingName(canvasBasename: string, exists: (name: string) => boolean): string {
	for (let n = 0; ; n += 1) {
		const name = `${canvasBasename}${n ? ` ${n}` : ''}.exc.md`;
		if (!exists(name)) return name;
	}
}

function head(end: CanvasEnd | undefined, fallback: CanvasEnd): 'arrow' | null {
	return (end ?? fallback) === 'arrow' ? 'arrow' : null;
}

function extension(path: string): string {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function fileLabel(node: CanvasNode): string {
	const name = (node.file ?? '').split('/').pop() || 'Untitled';
	return node.subpath ? `${name}${node.subpath}` : name;
}
