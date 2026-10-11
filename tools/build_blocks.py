#!/usr/bin/env python3
"""
Builds Smithy's block data from Minecraft's block textures.

  python3 build_blocks.py <folder with the block textures> <smithy assets folder>

It writes two files into the assets folder:
  blocks.png  one image holding every block's texture, 16 pixels each
  blocks.js   the block list: id, name, average color, and where it sits in blocks.png

Run it again after a Minecraft update to pick up new blocks. Needs Pillow (pip install pillow).
"""
import json, math, os, re, sys
from PIL import Image

COLS = 32          # blocks per row in blocks.png
TILE = 16

# Textures that are not something you build walls out of: parts of doors and beds,
# machine faces, growth stages, technical blocks, and "switched on" versions.
EXCLUDE = [
    r"_door_", r"_trapdoor$", r"_bed_", r"^bed_", r"shulker_box$", r"_particle$",
    r"command_block", r"^structure_block", r"^jigsaw", r"^test_", r"^debug",
    r"^crafter_", r"^trial_spawner", r"^vault_", r"^dried_ghast", r"^suspicious_",
    r"^respawn_anchor", r"^sculk_sensor", r"^sculk_shrieker", r"^sculk_catalyst", r"^calibrated_",
    r"^creaking_heart", r"^observer", r"^piston", r"^dispenser", r"^dropper", r"^hopper",
    r"^cauldron", r"^composter", r"^comparator", r"^repeater", r"^daylight_detector",
    r"^lectern", r"^enchanting_table", r"^stonecutter", r"^brewing_stand", r"campfire",
    r"item_frame", r"^anvil$", r"^dragon_egg$", r"^beacon$", r"^lava_", r"^lightning_rod",
    r"^end_portal_frame", r"^chorus_", r"^bamboo_stalk$", r"_carpet$", r"azalea_top$",
    r"^powder_snow$", r"^farmland", r"^dirt_path", r"^cartography_table",
    r"_on$", r"_lit$", r"_lit_powered$", r"_powered$", r"_honey$", r"_open$",
    r"^smooth_stone_slab_side$", r"^mushroom_block_inside$", r"^grass_block_(snow|side)$",
    r"^chiseled_bookshelf_(empty|side|top)$",
    # Not obtainable in survival, so not useful in a palette.
    r"^bedrock$", r"^reinforced_deepslate", r"^budding_amethyst$",
]

FACES = ["_top", "_side", "_bottom", "_front", "_end", "_back"]
TOP_FIRST = {"grass_block", "mycelium", "podzol"}
FRONT_FIRST = {"furnace", "smoker", "blast_furnace", "crafting_table", "loom",
               "smithing_table", "fletching_table", "bee_nest", "beehive"}

# Texture name -> real block id, where they differ.
RENAME = {
    "snow": "snow_block", "magma": "magma_block", "dried_kelp": "dried_kelp_block",
    "chiseled_bookshelf_occupied": "chiseled_bookshelf",
}

# Blocks that reuse one face of another block's texture.
EXTRA = {
    "smooth_sandstone": "sandstone_top",
    "smooth_red_sandstone": "red_sandstone_top",
    "smooth_quartz": "quartz_block_bottom",
}

# Grey textures the game colors in by biome. These are the plains colors.
TINT = {
    "grass_block_top": "#91bd59",
    "oak_leaves": "#77ab2f", "jungle_leaves": "#77ab2f", "acacia_leaves": "#77ab2f",
    "dark_oak_leaves": "#77ab2f", "mangrove_leaves": "#92c648",
    "birch_leaves": "#80a755", "spruce_leaves": "#619961",
}

NAMES = {
    "quartz_block": "Block of Quartz", "hay_block": "Hay Bale", "tnt": "TNT",
    "jack_o_lantern": "Jack o'Lantern", "lapis_block": "Block of Lapis Lazuli",
    "bamboo_block": "Block of Bamboo", "stripped_bamboo_block": "Block of Stripped Bamboo",
    "resin_block": "Block of Resin", "amethyst_block": "Block of Amethyst",
    "copper_block": "Block of Copper", "coal_block": "Block of Coal",
    "iron_block": "Block of Iron", "gold_block": "Block of Gold",
    "diamond_block": "Block of Diamond", "emerald_block": "Block of Emerald",
    "redstone_block": "Block of Redstone", "netherite_block": "Block of Netherite",
    "raw_iron_block": "Block of Raw Iron", "raw_gold_block": "Block of Raw Gold",
    "raw_copper_block": "Block of Raw Copper",
}

# Blocks whose pattern is too busy to blend smoothly, whatever their average color.
ALWAYS_BUSY = [r"_ore$", r"glazed_terracotta$", r"^tnt$", r"bookshelf$", r"^target$",
               r"^(furnace|smoker|blast_furnace|crafting_table|loom|smithing_table|fletching_table)$",
               r"^bee", r"^jukebox$", r"^note_block$", r"^lodestone$", r"^barrel$",
               r"^carved_pumpkin$", r"^jack_o_lantern$", r"copper_bulb$", r"^ancient_debris$",
               r"^gilded_blackstone$", r"^redstone_lamp$", r"^crying_obsidian$"]
BUSY_NOISE = 0.105


def srgb_to_oklab(r, g, b):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = lin(r), lin(g), lin(b)
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    return (0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s)


def first_frame(path, tint=None):
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    if h > w:
        im = im.crop((0, 0, w, w))
    if tint:
        tr, tg, tb = (int(tint[i:i + 2], 16) for i in (1, 3, 5))
        im.putdata([(r * tr // 255, g * tg // 255, b * tb // 255, a) for r, g, b, a in im.get_flattened_data()])
    return im


def measure(im):
    px = [p for p in im.get_flattened_data() if p[3] >= 250]
    n = len(px)
    avg = tuple(sum(p[i] for p in px) / n for i in range(3))
    lab = srgb_to_oklab(*avg)
    noise = sum(math.dist(srgb_to_oklab(*p[:3]), lab) for p in px) / n
    return "#%02x%02x%02x" % tuple(round(c) for c in avg), noise, n / (im.width * im.height)


def title(block_id):
    if block_id in NAMES:
        return NAMES[block_id]
    return " ".join(w.capitalize() for w in block_id.split("_"))


def main(src, out):
    files = {f[:-4] for f in os.listdir(src) if f.endswith(".png")}
    opaque = {}
    for name in sorted(files):
        im = first_frame(os.path.join(src, name + ".png"))
        if im.size != (TILE, TILE):
            continue
        if all(p[3] >= 250 for p in im.get_flattened_data()):
            opaque[name] = True

    kept = [n for n in opaque if not any(re.search(p, n) for p in EXCLUDE)]

    # Group the faces of one block together, then keep the face you mostly see.
    groups = {}
    for name in kept:
        base, face = name, ""
        for suffix in FACES:
            if name.endswith(suffix):
                base, face = name[:-len(suffix)], suffix
                break
        groups.setdefault(base, {})[face] = name

    chosen = {}     # block id -> texture name
    for base, faces in groups.items():
        if base in TOP_FIRST:
            order = ["_top", "", "_side", "_front"]
        elif base in FRONT_FIRST:
            order = ["_front", "", "_side", "_top"]
        else:
            order = ["", "_side", "_front", "_top", "_end", "_bottom", "_back"]
        texture = next(faces[f] for f in order if f in faces)
        chosen[RENAME.get(base, RENAME.get(texture, base))] = texture

    for block_id, texture in EXTRA.items():
        if texture in opaque:
            chosen[block_id] = texture

    for name in sorted(files):
        if name.endswith("_leaves") and not name.startswith("bamboo_"):
            chosen[name] = name

    blocks = []
    for block_id, texture in chosen.items():
        im = first_frame(os.path.join(src, texture + ".png"), TINT.get(texture))
        hex_color, noise, coverage = measure(im)
        busy = noise > BUSY_NOISE or any(re.search(p, block_id) for p in ALWAYS_BUSY)
        blocks.append({"id": block_id, "name": title(block_id), "hex": hex_color, "busy": busy,
                       "texture": texture, "noise": noise, "image": im})

    blocks.sort(key=lambda b: b["id"])
    rows = math.ceil(len(blocks) / COLS)
    atlas = Image.new("RGBA", (COLS * TILE, rows * TILE), (0, 0, 0, 0))
    for i, b in enumerate(blocks):
        atlas.paste(b["image"], ((i % COLS) * TILE, (i // COLS) * TILE))
    atlas.save(os.path.join(out, "blocks.png"), optimize=True)

    lines = ['  ["%s", "%s", "%s", %d]' % (b["id"], b["name"].replace('"', '\\"'), b["hex"], 1 if b["busy"] else 0)
             for b in blocks]
    with open(os.path.join(out, "blocks.js"), "w", encoding="utf-8") as f:
        f.write("/*\n  Made by tools/build_blocks.py from Minecraft's block textures. Don't edit by hand.\n"
                "  Each row: block id, name, average color, and 1 if the texture is too busy for blends.\n"
                "  A block's picture is at the same position in blocks.png, %d to a row.\n*/\n" % COLS)
        f.write("window.SMITHY_BLOCKS = { cols: %d, rows: %d, list: [\n%s\n] };\n" % (COLS, rows, ",\n".join(lines)))
    return blocks


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    result = main(sys.argv[1], sys.argv[2])
    print("%d blocks, %d flagged busy" % (len(result), sum(b["busy"] for b in result)))
