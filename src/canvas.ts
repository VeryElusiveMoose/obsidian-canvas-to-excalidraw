/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * The JSON Canvas types and the group lookup are adapted from CanvasPort
 * (src/models/canvas.ts, src/lib/canvas.ts), which is derived from Canvas Export.
 * Changed: schema validation is done by hand instead of with zod, and only the
 * parts this plugin uses are kept. See NOTICE.
 */

export type CanvasSide = 'top' | 'right' | 'bottom' | 'left';
export type CanvasEnd = 'none' | 'arrow';

export interface CanvasNode {
	id: string;
	type: string;
	x: number;
	y: number;
	width: number;
	height: number;
	text?: string;
	file?: string;
	subpath?: string;
	url?: string;
	color?: string;
	label?: string;
}

export interface CanvasEdge {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide?: CanvasSide;
	toSide?: CanvasSide;
	fromEnd?: CanvasEnd;
	toEnd?: CanvasEnd;
	label?: string;
	color?: string;
}

export interface CanvasDocument {
	nodes: CanvasNode[];
	edges: CanvasEdge[];
}

const SIDES = new Set(['top', 'right', 'bottom', 'left']);
const ENDS = new Set(['none', 'arrow']);

/** Parses a .canvas file. Throws an Error with a readable message if it isn't a JSON Canvas document. */
export function parseCanvas(source: string): CanvasDocument {
	let value: unknown;
	try {
		value = JSON.parse(source);
	} catch {
		throw new Error('The canvas file is not valid JSON.');
	}
	if (!isRecord(value)) throw new Error('The canvas file is not a JSON Canvas document.');
	const nodes = Array.isArray(value.nodes) ? value.nodes : [];
	const edges = Array.isArray(value.edges) ? value.edges : [];
	return {
		nodes: nodes.map((node, index) => readNode(node, index)),
		edges: edges.filter(isRecord).flatMap((edge) => readEdge(edge)),
	};
}

function readNode(value: unknown, index: number): CanvasNode {
	if (!isRecord(value)) throw new Error(`Canvas node ${index + 1} is not an object.`);
	const { id, type, x, y, width, height } = value;
	if (typeof id !== 'string' || !id || typeof type !== 'string') throw new Error(`Canvas node ${index + 1} has no id or type.`);
	if (![x, y, width, height].every((n) => typeof n === 'number' && Number.isFinite(n))) {
		throw new Error(`Canvas node "${id}" has no position or size.`);
	}
	return {
		id,
		type,
		x: x as number,
		y: y as number,
		width: Math.max(0, width as number),
		height: Math.max(0, height as number),
		text: optionalString(value.text),
		file: optionalString(value.file),
		subpath: optionalString(value.subpath),
		url: optionalString(value.url),
		color: optionalString(value.color),
		label: optionalString(value.label),
	};
}

function readEdge(value: Record<string, unknown>): CanvasEdge[] {
	const { id, fromNode, toNode } = value;
	if (typeof id !== 'string' || typeof fromNode !== 'string' || typeof toNode !== 'string') return [];
	const fromSide = optionalString(value.fromSide);
	const toSide = optionalString(value.toSide);
	const fromEnd = optionalString(value.fromEnd);
	const toEnd = optionalString(value.toEnd);
	return [{
		id,
		fromNode,
		toNode,
		fromSide: fromSide && SIDES.has(fromSide) ? (fromSide as CanvasSide) : undefined,
		toSide: toSide && SIDES.has(toSide) ? (toSide as CanvasSide) : undefined,
		fromEnd: fromEnd && ENDS.has(fromEnd) ? (fromEnd as CanvasEnd) : undefined,
		toEnd: toEnd && ENDS.has(toEnd) ? (toEnd as CanvasEnd) : undefined,
		label: optionalString(value.label),
		color: optionalString(value.color),
	}];
}

/** The smallest group that fully contains the node, as Canvas draws group membership. */
export function findParentGroup(node: CanvasNode, groups: CanvasNode[]): CanvasNode | undefined {
	return groups
		.filter((group) => group.id !== node.id && contains(group, node))
		.sort((a, b) => a.width * a.height - b.width * b.height)[0];
}

function contains(group: CanvasNode, node: CanvasNode): boolean {
	return node.x >= group.x && node.y >= group.y
		&& node.x + node.width <= group.x + group.width
		&& node.y + node.height <= group.y + group.height;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}
