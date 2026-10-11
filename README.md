# Smithy

Free tools for Minecraft builders and server owners. Everything runs in the browser.

- **Nickname colors** (`nickname.html`): gradient text with a live preview, copied as MiniMessage, `&#rrggbb` codes, `&x` codes or JSON text.
- **Circles and spheres** (`circles.html`): block-by-block layouts for circles, ovals and spheres, with layer views and block counts.
- **Block palettes** (`palettes.html`): match a color to the closest blocks, blend from one block to another, and browse a gallery of palettes.

## Run it

Open `index.html`, or host the folder on GitHub Pages. There is no build step.

## Files

- `index.html`, `nickname.html`, `circles.html` – the pages
- `assets/style.css` – the look, shared by every page
- `assets/nick.js` – the nickname tool
- `assets/circle.js` – the circle and sphere tool
- `assets/palette.js` – the block palette tool
- `assets/palettes.js` – the gallery. Add your own palettes here.
- `assets/blocks.js` and `assets/blocks.png` – every block's name, color and texture (made by the script below)
- `tools/build_blocks.py` – rebuilds the two block files from Minecraft's textures

## Updating the blocks after a Minecraft update

1. Open the game's `.jar` with 7-Zip and copy out `assets/minecraft/textures/block`.
2. Run `python3 tools/build_blocks.py path/to/block assets` (needs Python with Pillow).

The block textures in `assets/blocks.png` are Mojang's artwork.

Smithy is a fan project. It is not an official Minecraft product and is not approved by or associated with Mojang or Microsoft.

Part of [Kitly](https://direkjames.github.io/).
