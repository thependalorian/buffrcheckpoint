# Buffr Checkpoint branding

Canon colors (identity sheet):

| Token | Hex | CSS variable |
|---|---|---|
| Mustard | `#E0B000` | `--color-sodium-yellow` |
| Charcoal | `#111111` | `--color-charcoal` |
| Light | `#F5F5F5` | `--color-cloud` |

## Wordmark ff weave (required)

Mustard bar at `ff` crossbar height:

- **Behind** the first `f` stem (black on top of yellow)
- **In front of** the second `f` stem (yellow covers that stem)

Do not put the bar behind both stems.

## Files

| File | Use |
|---|---|
| `exports/icon-512.png` / `icon-256.png` | App / favicon source (mustard plate) |
| `exports/icon-mark-512.png` | Mark on transparent (lockups) |
| `exports/wordmark.png` | Wordmark only (weave correct) |
| `exports/logo-horizontal.png` | Mark + wordmark |
| `exports/logo-stacked.png` | Mark above wordmark |
| `exports/og-1200x630.png` | Open Graph |
| `exports/favicon.ico` | Favicons |
| `app-icon-*.svg` / `icon.svg` | Vector sources |
| `email-signature.html` / `email-signature.txt` | Human ops / sales email signature (not Resend transactional) |

Rebuild: `python3 build_exports.py` then re-run icon finalize steps if needed.

Sources: `wordmark-source.png`, `identity-sheet-source.png`. Old UUID masters in `archive/`.
