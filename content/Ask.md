---
title: Ask
type: system
public: true
noindex: false
---

<!-- The AskPanel Quartz component (quartz/components/AskPanel.tsx)
     renders the input, how-to primer, and result container at this
     page's slug. The inline script at quartz/components/scripts/
     askPanel.inline.ts fetches /api/ask (configurable via
     window.ASK_API_URL, default http://localhost:3333/api/ask) and
     hydrates the result section.

     LOCAL DEV:
       1. cd ops && npm run dev     (starts API server on :3333)
       2. npx quartz serve          (starts public site)
       3. Open http://localhost:8080/Ask

     PRODUCTION:
       Ask backend is not yet hosted. The page will show an error
       banner with instructions until the API is deployed. See the
       ADR on public Ask-backend deployment for the plan.

     STYLING is in quartz/components/styles/askPanel.scss — cream bg
     + yellow/red/green/blue accents, matching the public site's
     brutalist design system (NOT the ops dark theme). -->
