/**
 * Canvas to Excalidraw
 * SPDX-License-Identifier: Apache-2.0
 *
 * stripMarkdown is adapted from CanvasPort's strip_markdown (src/lib/text.ts),
 * which is derived from Canvas Export. Changed: wiki links keep their alias or
 * their note name, and the name follows this plugin's style. See NOTICE.
 */

/** A text card's markdown as plain text for an Excalidraw text element. */
export function stripMarkdown(value: string): string {
	return value
		.replace(/\r\n?/gu, '\n')
		.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/u, '')
		.replace(/!?\[\[([^\]|]+)\|([^\]]+)\]\]/gu, '$2')
		.replace(/!?\[\[([^\]]+)\]\]/gu, (_match, target: string) => (target.split('#')[0].split('/').pop() ?? target).replace(/\.md$/u, ''))
		.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gu, '$1')
		.replace(/^#{1,6}\s+/gmu, '')
		.replace(/(?:^|\s)\^[\p{L}\p{N}-]+\s*$/gmu, '')
		.replace(/[`*_~]/gu, '')
		.replace(/^>\s?/gmu, '')
		.replace(/\n{3,}/gu, '\n\n')
		.trim();
}
