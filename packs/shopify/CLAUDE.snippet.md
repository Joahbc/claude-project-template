## Pack rules: shopify
- Theme built in Liquid on top of Shopify's reference theme (Dawn or Horizon) unless the brief says otherwise
- Never edit the live theme directly. Work in a development theme with `npm run dev`; push only with my approval.
- Everything the client should edit (text, images, colors) must be a section or block setting, not hardcoded
- Theme Check must pass before a push: `npm run check`
- Products, prices and orders live in Shopify admin. Don't hardcode product data in the theme.
- Danish and English via theme translations (`locales/`), not duplicated templates
- Flower shop and local business checks: pickup vs delivery, delivery dates, product variants, and a separate inquiry flow for events and B2B
- Keep a "Client handover" section in PROCESS.md: how they edit content, add products and get help
