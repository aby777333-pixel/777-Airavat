# SHOWROOM_CAPTURE.md — authentic screenshot policy

The Living Product Showroom (`/showroom`) shows only real captures of the deployed sandbox.

- Registry: `src/lib/showroom.ts` (module, title, caption, device, capture date, link).
- Files: `public/showroom/<id>.jpg`. At render time the page checks that the file exists; a missing file turns the card into "Capture pending" rather than showing a placeholder.
- Capture procedure: `npm run showroom:capture` (demo/capture-showroom.mjs, puppeteer-core driving the local Chrome). Public pages are captured from the deployed site; signed-in pages from a local run of the same release (`npm run dev`) against the sandbox database, signed in as the demo accounts whose credentials live only in the git-ignored demo manifest. 1440×900 desktop, 375×812 mobile, default Midnight Sovereign palette, JPEG quality 85, no retouching. The registry records the capture date.
- Modules that do not exist yet (for example AIRAVAT PRO) are listed as pending with a plain statement; they are never mocked.
- Captures are refreshed whenever the module's UI changes materially; stale captures are a defect.
