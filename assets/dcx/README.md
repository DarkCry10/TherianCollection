# The Dark Room of DCX

The Dark Room of DCX is an Easter egg in the Feral branch, opened by the 🦁 emblem.

## Public image package
The AVIF package has been uploaded to the repository. GitHub stored its 56 images as files inside a directory named `DCX_Public_AVIF_Assets.zip` at this exact path:

`assets/dcx/DCX_Public_AVIF_Assets.zip/`

The gallery now reads each AVIF directly from that directory; it no longer tries to download or unpack a ZIP file.

The archive contains 56 unique high-quality AVIF derivatives. It uses ZIP_STORED (no additional compression) so the browser can read each AVIF at its original derivative quality without a decompression dependency. Dimensions follow the source image page; the AVIFs preserve the page image dimensions.

The Dark Room script reads the AVIF paths recorded in `gallery-manifest.json`. Do not rename the images or move them out of this directory.

## Archive rules
- 56 public, unique image references; no duplicate cards.
- Source-page provenance is retained in `gallery-manifest.json`.
- Original PDF: 71 pages; 59 unique source images across the full archive.
- DCX-REF-021, DCX-REF-022 and DCX-REF-023 (explicit source material, pages 26–28) are deliberately excluded from the public gallery.
- Original masters stay in the private reference archive. Public derivatives are AVIF, quality 18.

## Canon notes
- Permanent DNA: white Kitsune mask with red markings and red tassels; dark thin bracelet on the left wrist.
- SXW: open oversized white shirt, black tie worn against bare skin, white mesh brief. Distinguish historical CK/rainbow styling from consolidated blue AMX/AM> waistband.
- Gloom Grass: black biker leather, black fishnet, industrial chain, black low-rise underwear, boots, mustard socks with dark dots.
- Adonis is a sculptural framing state, not a third outfit.
- FireIce: electric blue against magenta/red.
- Blood Cherry: deep crimson monochrome and a sparse horizontal blue flare.
- Grass Bass: saturated emerald industrial light.
- Mirror framing and furniture are part of the visual language, not generic background.

## Publishing note
The lion icon is an Easter-egg entry point, not access control. Anything published on GitHub Pages is public and can be fetched directly by URL.
