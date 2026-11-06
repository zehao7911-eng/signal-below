# Signal Below

An English HTML5 puzzle about mapping a dark industrial complex, collecting rescue beacons and returning to the lift. Eight sectors progress from the Pump Annex to the Relay Deep.

- **Pulse** reveals up to five connected steps and the walls they touch. It activates reached relays and briefly stops reached scouts. The mapped tiles stay visible.
- **Move** with the direction buttons, WASD, arrow keys, a swipe, or a tap on a neighboring tile. The world advances one turn per accepted action. Recover every amber beacon and return to the lift.
- **Scouts** show their next tile with a red marker when visible. Contact returns you to the lift with your recovered beacons and mapped passages.
- **Stars** reward extraction, zero scout contacts and meeting the pulse target. Pulse use is unlimited. Best ratings unlock the next sector and remain after replay.

Open `index.html` or `standalone.html` directly after extracting the ZIP. Both contain the complete game and need no network. Serve `index-source.html` over HTTP to edit the source modules. Run `python build.py` to regenerate both bundles and `node tools/test.mjs` to verify the campaign and SDK adapter.

The original Canvas artwork and synthesized sound were made for this game. The spatial reveal takes inspiration from the scan feedback in Rezona's Blindsight. [Blindsight](https://rezona.ai/game/pgcserver/pv/WoMdxPle/v1/dist/index.html)

See `GAMEWAVE-IMPORT.txt` for integration and validation scope.
