# AI_RULES — read this first, follow it exactly

## 1. Stay in THIS folder only
- You work ONLY inside this exact folder:
  E:\X Flight\Surgery\Trees Terrains
- Before you change anything, print the full path of the folder you are about to edit and confirm it matches the line above.
- Never edit, or read-in-order-to-change, or run anything in any other folder.
- If a task seems to need another folder, STOP and ask me in plain words.

## 2. Make changes for real, in place
- When I ask for a change (for example "make the background yellow"), change the actual files in this folder and save them. The change is permanent and immediate. That is exactly what I want.
- Do NOT create git branches, worktrees, stashes, or hidden/experimental copies. I do not use branches. Never use git to shelve, hide, protect, or duplicate my changes. Just edit the real files.
- Do NOT copy or duplicate this folder on your own. The only copy that ever happens is when I explicitly say: "clone this folder to [name]."

## 3. Servers — always give me THREE links
- Run at most ONE server for this folder. If one is already running, reuse it — never start a second one.
- Start the server so my PHONE can reach it too: make it reachable from other devices on the same Wi-Fi (bind it to the network / use the "host" option for whatever tool this is).
- Always give me ALL THREE links, clearly labelled:
    - "On this computer:"  the localhost link (for example http://localhost:3000)
    - "On your phone (same Wi-Fi):"  the network link (for example http://192.168.0.22:3000)
    - "On your phone via Tailscale (anywhere):"  the Tailscale link (for example http://100.83.82.18:3000)
- My phone must be on the same Wi-Fi as this computer for the local network link. For the Tailscale link, it works from anywhere in the world as long as Tailscale is turned on.
- Always tell me the port number you are using.

## 4. Always give me the FULL folder path, never a short version
- Any time you mention a folder or file location, write the COMPLETE path from the drive letter onward, exactly as it is, so I can copy and paste it. For example: E:\X Flight\Surgery\Trees Terrains
- Never abbreviate or shorten it. Never write "the folder", "this folder", or "...\Wanderlust-V". I need the whole thing, copy-paste ready, every time.

## 5. Sandboxes are bare and ugly on purpose
- When I ask you to create a sandbox or a test, make it as plain and basic as possible. No fancy design, no glass effects, no gradients, no animations, no polish, no fluff.
- Utilitarian only. The point is to test ONE thing fast. Function over looks, every single time.
- Do not spend any effort making it pretty unless I specifically ask for design.

## 6. Never let folders bleed into each other
- Never pull, merge, sync, or copy anything from another folder or another chat into this one on your own.
- Do that ONLY if I say, in that moment: "bring the change from [folder] into here."
- When I do say it, bring in ONLY the thing I named, and then show me exactly what you changed.

## 7. Backups are frozen photos
- Any folder with "backup" in its name is frozen. Never edit it, never run a server inside it, and never copy from it unless I explicitly tell you to.

## 8. I am NOT a coder — never assume, never guess
- Assume I do NOT know technical terms or how the code works. Do not assume I know what I am talking about — I often will not, and that is fine.
- If you are not 100% sure what I mean, do NOT guess and do NOT just proceed. Ask me first, in plain everyday words: "Did you mean this, or that?" — give me the choices.
- Talk to me like I am smart but not technical. No jargon. If you must use a technical word, say what it means in one plain sentence.
- It is ALWAYS better to ask me a quick question than to build the wrong thing. I would rather answer one question than untangle a mess of fifty broken versions.

## 9. When a task is done, PROVE it — do not just say "done"
- Every time you finish a task, end your message with TWO confirmations:
    1. The FULL folder path you applied the change to (complete, copy-paste ready), so I can see it landed in the right place. For example: E:\X Flight\Surgery\Trees Terrains
    2. Confirmation that the change is ACTUALLY showing, live, on the running server. Check it yourself FIRST — look at the real result. Do not assume, do not guess.
- Give me the server links again (computer + phone Wi-Fi + phone Tailscale) and tell me in one plain line what I should now see (for example: "the background is now yellow").
- If the change is NOT showing, or it looks wrong, tell me plainly and fix it BEFORE you say the task is done.
- Never tell me something works if you have not actually checked that it works.

## 10. Strict Surgical Edits — No collateral damage
- When I ask for a change, edit ONLY the exact component or file responsible for that task.
- Zero collateral changes: Never touch, "clean up", refactor, or adjust unrelated code (such as UI fonts, menus, 3D models, water, clouds, camera settings, or lighting) unless I explicitly asked for that specific item to be changed.
- If a task genuinely requires changing code outside the requested feature, STOP immediately and ask me for permission in plain words before touching any other file.
- Keep all other working parts frozen and untouched.

## 11. One requested edit means one scoped change
- If I ask for one edit, make only that edit. Do not add, adjust, fix, clean up, or improve anything else unless I explicitly ask for it in a separate request.



