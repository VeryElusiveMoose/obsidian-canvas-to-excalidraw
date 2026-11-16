# Canvas to Excalidraw

Turns an Obsidian Canvas into an Excalidraw drawing, in your vault, beside the canvas. A canvas named
`Board.canvas` becomes `Board.exc.md`, which the Excalidraw plugin opens as a drawing.

Right-click a `.canvas` file in the file explorer and choose **Convert to Excalidraw**. The command
**Convert current canvas** does the same for the canvas you have open. The new drawing opens when it's done.

Images, notes and PDFs in the canvas stay links to the files in your vault. Nothing is copied into
the drawing, so it stays small.

This plugin needs the [Excalidraw](https://github.com/zsviczian/obsidian-excalidraw-plugin) plugin, which
writes the drawing.

## What becomes what

| In the canvas | In the drawing |
| --- | --- |
| Text card | Text in a box the size of the card. Markdown is shown as plain text. |
| Image | The image, linked to its file, fitted inside the card and centered. |
| Note or PDF | Embedded through Excalidraw, linked to its file. A heading or a PDF page in the link is kept. |
| Any other file | A labeled box that links to the file. |
| Web link | A labeled box that links to the page. |
| Group | A frame, named for the group's label. |
| Connection | An arrow attached to both ends, with its label, color and arrowheads. |

Colors carry over, and so does the stacking order of the cards: whatever was on top in the canvas is on
top in the drawing.

If a file in the canvas can't be found or drawn, it becomes a labeled box linking to where it should be,
and a notice says how many there were.

The canvas itself is never changed. If a drawing with the canvas's name already exists, the new one gets
a number (`Board 1.exc.md`) instead of replacing it.

## Building

```
npm install
npm run build    # type-checks and writes main.js
npm run lint
npm test
```

Copy `main.js`, `manifest.json` and `styles.css` into `<vault>/.obsidian/plugins/canvas-to-excalidraw/`
and enable the plugin in Settings, Community plugins.

## License

Apache License 2.0. Parts are adapted from CanvasPort and Canvas Export; see NOTICE.
