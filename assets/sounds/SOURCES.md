# Sound sources

CC0 (public-domain) sound effects, chosen from the Kenney / Gemini-curated packs
in `Pin_Pull/Gemini_Game_Audio_Options_Curated/Sound_Effects_Gemini_Compatible/`.
Converted from `.ogg` to `.m4a` (AAC) with ffmpeg because iOS can't decode ogg.

CC0 needs no attribution, but here's the mapping so any sound is easy to swap.

| App file (`assets/sounds/`) | Trigger | Source `.ogg` |
|---|---|---|
| verdict.m4a | Verdict revealed (gavel) | impactWood_medium_002 |
| winner.m4a | Winner announced | jingles_PIZZI02 |
| card.m4a | Score / argument card appears | impactWood_light_002 |
| fallacy.m4a | Fallacy flagged | tick_004 |
| countdown.m4a | Ready countdown (3-2-1) | tick_002 |
| record_start.m4a | Recording starts | highUp |
| submit.m4a | Turn submitted | confirmation_001 |
| mic_fail.m4a | Mic fail / retry | error_001 |
| tap.m4a | Button / mode-card tap | select_001 |
| select.m4a | Chip / toggle select | toggle_004 |
| back.m4a | Back / close | back_002 |
| start.m4a | Start Debate (CTA) | confirmation_002 |

To swap one: convert the new `.ogg` to `<name>.m4a` in this folder and rebuild.
`ffmpeg -i source.ogg -c:a aac -b:a 128k <name>.m4a` (any ffmpeg works).
