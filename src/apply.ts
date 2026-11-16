/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * Draws a plan through the Excalidraw plugin's ExcalidrawAutomate API, which owns
 * the drawing format, file ids and the links to vault files.
 */

import { fitInside, type Box, type NodeStep, type Plan } from './plan';

/** The part of ExcalidrawAutomate this plugin uses. */
export interface Automate {
	style: {
		strokeColor: string;
		backgroundColor: string;
		fillStyle: string;
		strokeWidth: number;
		strokeStyle: string;
		roughness: number;
		opacity: number;
		roundness: null | { type: number; value?: number };
		fontFamily: number;
		fontSize: number;
		textAlign: string;
		verticalAlign: string;
	};
	addText(topX: number, topY: number, text: string, formatting?: {
		width?: number;
		height?: number;
		textAlign?: 'left' | 'center' | 'right';
		textVerticalAlign?: 'top' | 'middle' | 'bottom';
		box?: boolean | 'box';
		boxPadding?: number;
	}): string;
	addImage(topX: number, topY: number, imageFile: unknown, scale?: boolean, anchor?: boolean): Promise<string | null>;
	addFrame(topX: number, topY: number, width: number, height: number, name?: string): string;
	addElementsToFrame(frameId: string, elementIds: string[]): void;
	connectObjects(objectA: string, connectionA: string | null, objectB: string, connectionB: string | null, formatting?: {
		startArrowHead?: 'arrow' | null;
		endArrowHead?: 'arrow' | null;
	}): string | undefined;
	getElement(id: string): ElementLike | undefined;
}

/** The element fields this plugin reads or sets after an element is added. */
export interface ElementLike {
	x: number;
	y: number;
	width: number;
	height: number;
	link?: string | null;
	containerId?: string | null;
	boundElements?: { id: string; type: string }[] | null;
}

/** Finds a vault file by its path; undefined when there is none. */
export type FileLookup = (path: string) => unknown;

export interface ApplyResult {
	/** Files that couldn't be drawn and were left as labeled boxes. */
	missing: string[];
}

const PADDING = 12;
const FONT_SIZE = 16;
/** Excalidraw's Helvetica, closest to how Canvas shows text. */
const FONT_FAMILY = 2;

export async function applyPlan(ea: Automate, plan: Plan, findFile: FileLookup): Promise<ApplyResult> {
	const elementOf = new Map<string, string>();
	const frameMembers = new Map<string, string[]>();
	const missing: string[] = [];
	for (const step of plan.nodes) {
		const id = await drawNode(ea, step, findFile, missing);
		elementOf.set(step.node, id);
		if (step.kind !== 'frame' && step.group) {
			frameMembers.set(step.group, [...(frameMembers.get(step.group) ?? []), ...membersOf(ea, id)]);
		}
	}
	for (const [group, members] of frameMembers) {
		const frame = elementOf.get(group);
		if (frame) ea.addElementsToFrame(frame, members);
	}
	for (const arrow of plan.arrows) {
		const from = elementOf.get(arrow.from);
		const to = elementOf.get(arrow.to);
		if (!from || !to) continue;
		setStyle(ea, { strokeColor: arrow.color, backgroundColor: 'transparent' });
		const id = ea.connectObjects(from, arrow.fromSide ?? null, to, arrow.toSide ?? null, {
			startArrowHead: arrow.startArrowHead,
			endArrowHead: arrow.endArrowHead,
		});
		if (id && arrow.label) labelArrow(ea, id, arrow.label);
	}
	return { missing };
}

async function drawNode(ea: Automate, step: NodeStep, findFile: FileLookup, missing: string[]): Promise<string> {
	if (step.kind === 'frame') {
		return ea.addFrame(step.box.x, step.box.y, step.box.width, step.box.height, step.name);
	}
	if (step.kind === 'text') return addCard(ea, step.box, step.text, step.colors);
	if (step.kind === 'box') {
		const id = addCard(ea, step.box, step.label, step.colors);
		if (step.link) setLink(ea, id, step.link);
		return id;
	}
	const file = findFile(step.path);
	if (file) {
		setStyle(ea, { strokeColor: 'transparent', backgroundColor: 'transparent', roundness: null });
		// A subpath (a heading, a block, a PDF page) goes in as a link string, which the API reads the same way.
		const id = await ea.addImage(step.box.x, step.box.y, step.subpath ? `${step.path}${step.subpath}` : file).catch(() => null);
		const image = id ? ea.getElement(id) : undefined;
		if (id && image) {
			Object.assign(image, fitInside(step.box, image.width, image.height));
			return id;
		}
	}
	missing.push(step.path);
	const id = addCard(ea, step.box, step.label, step.colors);
	setLink(ea, id, `[[${step.path}${step.subpath ?? ''}]]`);
	return id;
}

/** A rectangle at exactly the node's box, with the text bound inside it. Returns the rectangle's id. */
function addCard(ea: Automate, box: Box, text: string, colors: { fill: string; stroke: string; text: string }): string {
	setStyle(ea, { strokeColor: colors.stroke, backgroundColor: colors.fill, roundness: { type: 3 } });
	// addText sizes the box as the text's size plus the padding on each side, so this puts it on the node's box.
	const id = ea.addText(box.x + PADDING, box.y + PADDING, text || ' ', {
		box: 'box',
		boxPadding: PADDING,
		width: Math.max(1, box.width - 2 * PADDING),
		height: Math.max(1, box.height - 2 * PADDING),
		textAlign: 'left',
		textVerticalAlign: 'top',
	});
	const rect = ea.getElement(id);
	const bound = rect?.boundElements?.find((el) => el.type === 'text');
	const label = bound ? ea.getElement(bound.id) : undefined;
	if (label) Object.assign(label, { strokeColor: colors.text });
	return id;
}

/** A card is its rectangle and its text; both go in the frame. */
function membersOf(ea: Automate, id: string): string[] {
	const bound = ea.getElement(id)?.boundElements?.filter((el) => el.type === 'text').map((el) => el.id) ?? [];
	return [id, ...bound];
}

function setLink(ea: Automate, id: string, link: string): void {
	const element = ea.getElement(id);
	if (element) element.link = link;
}

/** The edge's label as text bound to the arrow, so it moves with it. */
function labelArrow(ea: Automate, arrowId: string, label: string): void {
	const arrow = ea.getElement(arrowId);
	if (!arrow) return;
	setStyle(ea, { backgroundColor: 'transparent' });
	const textId = ea.addText(arrow.x, arrow.y, label, { textAlign: 'center', textVerticalAlign: 'middle' });
	const text = ea.getElement(textId);
	if (!text) return;
	text.containerId = arrowId;
	arrow.boundElements = [...(arrow.boundElements ?? []), { id: textId, type: 'text' }];
}

function setStyle(ea: Automate, style: Partial<Automate['style']>): void {
	Object.assign(ea.style, {
		fillStyle: 'solid',
		strokeWidth: 1,
		strokeStyle: 'solid',
		roughness: 0,
		opacity: 100,
		fontFamily: FONT_FAMILY,
		fontSize: FONT_SIZE,
		textAlign: 'left',
		verticalAlign: 'top',
		...style,
	});
}
