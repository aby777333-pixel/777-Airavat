# SHOWROOM_CAPTURE.md — authentic screenshot policy

The Living Product Showroom (`/showroom`) shows only real captures of the deployed sandbox.

- Registry: `src/lib/showroom.ts` (module, title, caption, device, capture date, link).
- Files: `public/showroom/<id>.jpg`. At render time the page checks that the file exists; a missing file turns the card into "Capture pending" rather than showing a placeholder.
- Capture procedure: open the deployed site in a browser signed in as the relevant demo account, 1440×900 for desktop and 375×812 for mobile, default Midnight Sovereign palette, JPEG quality 85, no retouching other than cropping browser chrome. Record the date in the registry.
- Modules that do not exist yet (for example AIRAVAT PRO) are listed as pending with a plain statement; they are never mocked.
- Captures are refreshed whenever the module's UI changes materially; stale captures are a defect.
