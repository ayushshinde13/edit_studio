# SEO, AEO & GEO Prioritized Action Plan: Edito Studio

**Target:** Edito Studio (`https://edito.studio`)  
**Standard:** LLM-First SEO Roadmap (`.agents/skill/seo/SKILL.md`)  
**Status:** **Sprint 1 (Completed & Deployed) | Ongoing Maintenance**

---

## 🚀 Completed Actions (Sprint 1 - High Impact)

### 1. Technical SEO & AI Crawlers (GEO)
- [x] **Update `robots.ts` with Explicit AI Crawler Directives**:
  - Allowed `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`, and `CCBot`.
  - Disallowed `/admin/` and `/api/` internal endpoints.
  - Linked `sitemap.xml` and referenced `llms.txt`.
- [x] **Create `/public/llms.txt`**: Standardized Markdown guide for LLMs documenting all tools, local privacy guarantees, and usage guidance.
- [x] **Create `/public/llms-full.txt`**: Deep architectural and feature documentation for AI engines.

### 2. Schema Markup & Structured Data
- [x] **Purge Deprecated `HowTo` Schema**: Removed deprecated HowTo schema from `/audio/[tool]` and `/stems`.
- [x] **Implement `WebApplication` Schema**: Injected rich SoftwareApplication schema with pricing ($0), rating (4.9/5), operatingSystem, and featureList across all tools.
- [x] **Implement `BreadcrumbList` Schema**: Built hierarchical navigation schema (Home > Hub > Tool) for Google rich results.
- [x] **Add `Organization` Schema**: Declared Knowledge Graph entity with logo, canonical URL, and E-E-A-T trust signals in `layout.tsx`.

### 3. Creative Tools Indexing & Social Previews
- [x] **Add Dedicated `layout.tsx` for All 9 Creative Tools**:
  - `/creative/remove-background/layout.tsx`
  - `/creative/photo-editor/layout.tsx`
  - `/creative/resize-image/layout.tsx`
  - `/creative/remove-watermark/layout.tsx`
  - `/creative/remove-video-watermark/layout.tsx`
  - `/creative/make-collage/layout.tsx`
  - `/creative/apply-effects/layout.tsx`
  - `/creative/retouch/layout.tsx`
  - `/creative/video-editor/layout.tsx`
  Each tool now has its own unique Title, Meta Description, OpenGraph, Twitter card, and JSON-LD schema!

### 4. AEO (Answer Engine Optimization)
- [x] **Direct Answer Blocks**: Added clear 40-word definition paragraphs directly below H1s for featured snippet capture.
- [x] **Semantic FAQ Cards**: Added on-page FAQs addressing privacy, formats, and browser compatibility.

---

## 📅 Recommended Ongoing Enhancements (Sprint 2 & Backlog)

### High Priority (Within 30 Days)
- [ ] **Google Search Console Verification**: Submit `https://edito.studio/sitemap.xml` directly to GSC.
- [ ] **Bing Webmaster Tools & IndexNow**: Ping Bing IndexNow API on production deployments to instantly index new features.
- [ ] **Backlink & Community Authority**: Submit to ProductHunt, GitHub Awesome lists, AlternativeTo (as private alternative to Moises and Canva).

### Medium Priority (Within 60 Days)
- [ ] **Comparative Landing Pages (pSEO)**: Create targeted comparison pages:
  - `/vs/moises` (Free private browser alternative to Moises)
  - `/vs/vocalremover` (Zero upload alternative to vocalremover.org)
  - `/vs/photoroom` (Free local background remover)
- [ ] **Blog / Educational Articles**: Publish guides like *"How WebAssembly enables zero-upload audio stem separation"*.
