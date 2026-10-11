/*
  The palette gallery lives in this file.

  To add a palette, copy an entry, change the text, and save.
    name    shown as the card title
    note    one short line about where it fits
    blocks  block ids, the same ones the game uses (minecraft:oak_planks -> "oak_planks").
            Every id has to be in blocks.js. An id that isn't there is skipped.
*/
window.SMITHY_PALETTES = [
  { name: "Medieval keep", note: "Castle walls, towers and village builds.",
    blocks: ["stone_bricks", "cobblestone", "andesite", "mossy_stone_bricks", "spruce_planks", "dark_oak_log"] },
  { name: "Cozy cottage", note: "A warm starter house with a brick chimney.",
    blocks: ["oak_planks", "stripped_spruce_log", "cobblestone", "bricks", "white_terracotta", "hay_block"] },
  { name: "Desert temple", note: "Sandy builds that still have some contrast.",
    blocks: ["sandstone", "cut_sandstone", "smooth_sandstone", "chiseled_sandstone", "terracotta", "orange_terracotta"] },
  { name: "Badlands town", note: "Red rock, clay and acacia.",
    blocks: ["red_sandstone", "cut_red_sandstone", "terracotta", "yellow_terracotta", "brown_terracotta", "acacia_planks"] },
  { name: "Deep dark", note: "Underground cities and vaults.",
    blocks: ["deepslate_bricks", "deepslate_tiles", "polished_deepslate", "cobbled_deepslate", "sculk", "blackstone"] },
  { name: "Nether fortress", note: "Dark reds with a glow from below.",
    blocks: ["nether_bricks", "red_nether_bricks", "blackstone", "polished_blackstone_bricks", "crimson_planks", "magma_block"] },
  { name: "Warped forest", note: "Teal builds for the Nether or a fantasy base.",
    blocks: ["warped_planks", "warped_stem", "warped_wart_block", "warped_nylium", "dark_prismarine", "shroomlight"] },
  { name: "End city", note: "Purple towers on pale stone.",
    blocks: ["purpur_block", "purpur_pillar", "end_stone_bricks", "end_stone", "amethyst_block", "obsidian"] },
  { name: "Ocean monument", note: "Underwater bases and aquariums.",
    blocks: ["prismarine", "prismarine_bricks", "dark_prismarine", "sea_lantern", "cyan_terracotta", "light_blue_concrete"] },
  { name: "Modern house", note: "Clean whites and greys with one dark wood.",
    blocks: ["white_concrete", "light_gray_concrete", "gray_concrete", "quartz_block", "smooth_stone", "dark_oak_planks"] },
  { name: "Cherry shrine", note: "Pink wood against a dark roof.",
    blocks: ["cherry_planks", "stripped_cherry_log", "cherry_leaves", "pink_terracotta", "calcite", "deepslate_tiles"] },
  { name: "Snowy cabin", note: "Spruce and stone for cold biomes.",
    blocks: ["spruce_planks", "spruce_log", "stripped_spruce_log", "snow_block", "packed_ice", "stone_bricks"] },
  { name: "Jungle ruin", note: "Overgrown stone that looks abandoned.",
    blocks: ["mossy_cobblestone", "mossy_stone_bricks", "cracked_stone_bricks", "moss_block", "jungle_planks", "jungle_leaves"] },
  { name: "Copper works", note: "Every stage of copper, from fresh to green.",
    blocks: ["copper_block", "exposed_copper", "weathered_copper", "oxidized_copper", "cut_copper", "tuff_bricks"] },
  { name: "Swamp hut", note: "Mud, mangrove and moss.",
    blocks: ["mangrove_planks", "mangrove_log", "mud_bricks", "packed_mud", "moss_block", "muddy_mangrove_roots"] },
  { name: "Bamboo house", note: "Bright yellows for tropical builds.",
    blocks: ["bamboo_planks", "bamboo_mosaic", "bamboo_block", "stripped_bamboo_block", "jungle_planks", "lime_terracotta"] },
  { name: "Pale garden", note: "Washed-out wood with an orange accent.",
    blocks: ["pale_oak_planks", "pale_oak_log", "stripped_pale_oak_log", "pale_moss_block", "pale_oak_leaves", "resin_bricks"] },
  { name: "Bastion", note: "Black stone trimmed with gold.",
    blocks: ["blackstone", "polished_blackstone", "polished_blackstone_bricks", "chiseled_polished_blackstone", "gilded_blackstone", "gold_block"] },
  { name: "Trial chambers", note: "Tuff and copper, like the vanilla structure.",
    blocks: ["tuff", "polished_tuff", "tuff_bricks", "chiseled_tuff_bricks", "cut_copper", "oxidized_cut_copper"] },
  { name: "Mushroom island", note: "Giant mushrooms and fantasy villages.",
    blocks: ["red_mushroom_block", "brown_mushroom_block", "mushroom_stem", "mycelium", "podzol", "shroomlight"] },
  { name: "Farmhouse", note: "Barns, fields and market stalls.",
    blocks: ["birch_planks", "oak_log", "hay_block", "coarse_dirt", "pumpkin", "grass_block"] },
  { name: "Ice palace", note: "Cold blues and clean whites.",
    blocks: ["packed_ice", "blue_ice", "snow_block", "white_concrete", "light_blue_concrete", "calcite"] },
  { name: "Poplar grove", note: "Grey-brown wood under autumn leaves.",
    blocks: ["poplar_planks", "poplar_log", "stripped_poplar_log", "yellow_poplar_leaves", "orange_poplar_leaves", "red_poplar_leaves"] },
  { name: "Sulfur and cinnabar", note: "Dusty yellow against dusty red.",
    blocks: ["sulfur", "sulfur_bricks", "polished_sulfur", "cinnabar", "cinnabar_bricks", "polished_cinnabar"] }
];
