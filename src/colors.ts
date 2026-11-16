/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adapted from CanvasPort (src/lib/colors.ts), which is derived from Canvas Export.
 * Changed: the light palette only (Excalidraw draws its own dark mode from it),
 * and the names follow this plugin's style. See NOTICE.
 */

export interface NodeColors {
	fill: string;
	stroke: string;
	text: string;
}

/** Canvas's preset colors "1" to "6", as Obsidian's light theme draws them. */
const PALETTE: Record<string, string> = {
	'1': '#e93147',
	'2': '#ec7500',
	'3': '#e0ac00',
	'4': '#08b94e',
	'5': '#00bfbc',
	'6': '#7852ee',
};

const BACKGROUND = '#ffffff';
const TEXT = '#222222';
const BORDER = '#c0c0c0';

/** A canvas color (a preset number or a hex value) as a node's fill, stroke and text colors. */
export function nodeColors(color: string | undefined): NodeColors {
	const base = canvasColor(color);
	if (!base) return { fill: BACKGROUND, stroke: BORDER, text: TEXT };
	return { fill: blend(base, BACKGROUND, 0.07), stroke: blend(base, BACKGROUND, 0.7), text: TEXT };
}

/** A canvas color as an edge's stroke color. */
export function edgeColor(color: string | undefined): string {
	return canvasColor(color) ?? BORDER;
}

/** A preset number or a hex color as a hex color; undefined for no color or one that can't be read. */
export function canvasColor(color: string | undefined): string | undefined {
	if (!color) return undefined;
	if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/iu.test(color)) return color;
	return PALETTE[color];
}

function blend(foreground: string, background: string, opacity: number): string {
	const front = parseHex(foreground);
	const back = parseHex(background);
	return `#${front.map((channel, i) => Math.round(channel * opacity + back[i] * (1 - opacity)).toString(16).padStart(2, '0')).join('')}`;
}

function parseHex(color: string): [number, number, number] {
	const hex = color.length === 4 ? color.slice(1).split('').map((c) => c + c).join('') : color.slice(1);
	return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
}
