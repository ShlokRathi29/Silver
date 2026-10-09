# Silver

CreatorGear is a public-facing creator gear discovery platform backed by a Supabase database and an internal admin panel.

The core idea is to collect publicly available information about creators/influencers and the products they use, then expose that information through a clean public website. Products can have retailer-specific affiliate URLs. The admin system is designed so the project owner and trusted collaborators can add and update data without changing application code.

> **Project status:** This repository contains the internal CreatorGear admin and data-entry website connected to Supabase. The separate public-facing discovery website has not been started; it will be built after the admin workflow is reviewed and stabilized.

---

## 1. Project Goals

CreatorGear is intended to:

- Maintain a structured database of creators.
- Track products/gear associated with creators.
- Track product types.
- Track retailer-specific affiliate URLs.
- Allow multiple people to maintain the database.
- Keep the database independent from the frontend.
- Eventually expose the curated data through a public website.
- Support affiliate monetization.
- Use Supabase as the source of truth.

The public website and admin panel should be treated as separate consumers of the same Supabase backend.

This application is the authenticated admin panel. The future public website will be a separate consumer of the same Supabase database.

---

# 2. Current Technology

## Frontend

The current admin application uses:

- React
- TypeScript
- Vite
- CSS
- Supabase JavaScript client

The existing project also contains:

- `App.tsx`
- `App.css`
- `index.css`
- `main.tsx`
- `Login.tsx`
- `Dashboard.tsx`
- `Creators.tsx`

## Backend

Supabase currently provides:

- PostgreSQL database
- Supabase Authentication
- Row Level Security (RLS)
- Database functions
- User profiles/roles

## Database

PostgreSQL is the source of truth.

---

# 3. Architecture at a High Level

```text
                         ┌─────────────────────┐
                         │   Public Website    │
                         │       planned       │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      Supabase       │
                         │                     │
                         │ PostgreSQL + Auth   │
                         │ RLS + Functions     │
                         └──────────┬──────────┘
                                    ▲
                                    │
                         ┌──────────┴──────────┐
                         │    Admin Panel      │
                         │       current       │
                         │      React/Vite     │
                         └─────────────────────┘
```

Supabase is the shared source of truth.

---

# 4. What Has Been Completed

## 4.1 Supabase database

The project has a structured relational database containing:

- creators
- products
- product types
- creator gear relationships
- affiliate links
- retailers
- profiles
- countries
- markets
- platforms
- creator platforms
- categories
- brands
- sources
- product prices

Some of these tables are not currently used by the simplified admin UI but exist in the broader schema.

---

## 4.2 Product Types

`product_types` was created and seeded.

Current seeded types include:

- Camera
- Microphone
- Laptop
- Monitor
- Keyboard
- Mouse
- Headphones
- Webcam
- Lighting
- Gaming Chair
- Controller
- Console
- Drone
- Smartphone
- Tablet
- Software
- Other

Products reference `product_types` through:

```text
products.product_type_id
        ↓
product_types.id
```

---

## 4.3 Creator Management

The admin panel supports:

- Creator Name
- Bio
- Country
- Subscribers/Followers
- Products associated with the creator

The creator UI deliberately does not currently use:

- creator image
- creator category dropdown

---

## 4.4 Product Management

Products are represented as separate cards within a creator.

Each product supports:

- Product Type
- Product Name
- Multiple affiliate links
- Add Product
- Remove Product

Products are stored separately from creators and linked through `creator_gear`.

---

## 4.5 Affiliate Links

Each product can have multiple affiliate links.

Current affiliate-link fields:

```text
Retailer
Affiliate URL
```

Market was intentionally removed from the affiliate-link workflow.

The `affiliate_links` table currently contains:

- id
- product_id
- retailer_id
- affiliate_url
- tracking_id
- status
- created_at
- updated_at

There is no `market_id` in `affiliate_links`.

### Retailer behavior

The UI uses a plain text retailer input rather than a dropdown.

When saving:

1. The entered retailer name is normalized.
2. The application searches existing retailers case-insensitively.
3. If the retailer exists, its UUID is reused.
4. If it does not exist, a new retailer record is inserted.
5. The resulting retailer UUID is stored in `affiliate_links.retailer_id`.

This means the database maintains relational integrity while the UI remains simple.

---

## 4.6 Edit/Delete behavior

The admin panel tracks deleted existing records.

Existing affiliate-link IDs are collected before removal and deleted from the database when the creator is saved.

Existing product IDs are similarly tracked and removed from `creator_gear` when appropriate.

The user has tested:

- create
- edit
- change
- save
- refresh
- remove product
- remove affiliate link

and confirmed these workflows work.

---

# 5. Authentication

Supabase Auth is used.

The `profiles` table links directly to `auth.users`:

```text
profiles.id → auth.users.id
```

Current profile fields:

- id
- full_name
- role
- is_active
- created_at
- updated_at

---

# 6. Current Roles

The database currently supports five roles:

```text
owner
admin
editor
researcher
reviewer
```

Current intended permission model:

| Role | Read | Create | Edit | Delete |
|---|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes | Yes |
| Editor | Yes | Yes | Yes | No |
| Researcher | Yes | Yes | Yes | No |
| Reviewer | Yes | No | No | No |

The four core content tables have already been migrated from broad `ALL` team policies to operation-specific RLS policies:

- creators
- products
- creator_gear
- affiliate_links

The migration completed successfully.

---

# 7. RLS Security

RLS is enabled on all current public tables.

Core public-read policies remain in place.

The authenticated team permissions are enforced at the PostgreSQL level rather than only through the React UI.

This is important because hiding a button in React is not sufficient security.

The security boundary is:

```text
React UI
   ↓
Supabase API
   ↓
PostgreSQL RLS
   ↓
Database
```

---

# 8. Role Helper Functions

Two PostgreSQL helper functions exist:

```text
public.get_my_role()
public.has_role(required_roles text[])
```

Both are:

- SQL functions
- STABLE
- SECURITY DEFINER
- owned by `postgres`

They read active users from:

```text
public.profiles
```

and use:

```text
auth.uid()
```

The functions were hardened to use:

```sql
SET search_path TO ''
```

while keeping database references explicitly qualified.

Execution privileges were also hardened.

Current relevant execution state:

```text
anon           ❌
authenticated  ✅
postgres       ✅
service_role   ✅
```

This was done because the RLS policies use `has_role()`.

---

# 9. Current RLS State

RLS is enabled on:

- affiliate_links
- brands
- categories
- countries
- creator_gear
- creator_platforms
- creators
- markets
- platforms
- product_prices
- product_types
- products
- profiles
- retailers
- sources

Core content access has already been refined.

Supporting-table permissions still need a deliberate review rather than being changed blindly.

---

# 10. Current Dashboard

The dashboard was upgraded from an unstyled/basic screen into a database-backed admin overview.

It currently provides:

- authenticated user's name
- role
- creator count
- product count
- creator gear count
- affiliate link count
- recently added creators
- refresh functionality
- database summary

The dashboard uses live Supabase counts.

The wording was deliberately changed from:

> Active shopping links

to:

> Affiliate URLs stored

because the application does not currently verify whether an affiliate URL is actually functioning or whether an external affiliate program is active.

---

# 11. Current Admin Navigation

The current application shell contains:

```text
CreatorGear
├── Dashboard
└── Creators
```

The existing `App.tsx` routes the dashboard and creators page inside the common application layout.

---

# 12. Database Schema Overview

## creators

Important fields:

```text
id
name
slug
bio
country_id
category_id
profile_image_url
status
created_at
updated_at
follower_count
country_name
```

Current simplified admin UI primarily uses:

```text
name
bio
country_name
follower_count
```

---

## products

Important fields:

```text
id
name
slug
brand_id
model
description
category_id
image_url
specifications
status
created_at
updated_at
product_type_id
```

The current admin UI uses:

```text
name
product_type_id
```

---

## creator_gear

Connects creators to products.

Important fields:

```text
id
creator_id
product_id
category_id
source_id
verification_status
notes
first_reported_at
last_verified_at
status
created_at
updated_at
```

Relationship:

```text
creator
   │
   ▼
creator_gear
   │
   ▼
product
```

---

## affiliate_links

Connects a product to a retailer and affiliate URL.

```text
product
   │
   ▼
affiliate_links
   │
   └── retailer
```

---

## retailers

Stores retailer records.

The UI does not require the user to choose from a retailer dropdown.

Retailers are created/reused automatically based on the text entered in the affiliate-link form.

---

## product_types

Provides the controlled product-type list used by the product form.

---

# 13. Market Decision

Market was explicitly removed from the affiliate-link workflow.

Previously, `affiliate_links.market_id` caused:

```text
23502 null value in column "market_id"
```

because the application intentionally stopped supplying market data.

The decision was made to remove the `market_id` column from `affiliate_links`.

The separate `markets` table still exists in the broader database schema because it is also referenced by `product_prices`.

Do not reintroduce Market into the affiliate-link UI unless the project requirements change.

---

# 14. Files / Frontend Structure

Current admin application files include:

```text
src/
├── App.tsx
├── App.css
├── index.css
├── main.tsx
├── Login.tsx
├── Dashboard.tsx
├── Creators.tsx
└── lib/
    └── supabase.ts
```

Exact folder paths may vary depending on the current local project structure.

---

# 15. What Remains

The project is not production complete yet.

The remaining work should be handled in phases.

## Phase A — Security and team management

### Remaining

- Test all current RLS behavior using actual users with different roles.
- Enforce profile role changes and last-active-owner protection at the database layer; the Team page currently provides the management UI.
- Decide exactly who can change roles.
- Ensure an owner cannot accidentally be removed or downgraded.
- Review supporting-table policies.
- Review `profiles` policy.
- Review `retailers`, `countries`, `platforms`, `brands`, `categories`, `sources`, etc.
- Review Supabase Security Advisor warnings after the function hardening.
- Enable leaked-password protection if appropriate for the Supabase Auth configuration.

---

## Phase B — Admin usability

Recommended:

- Pagination when data grows
- Better empty states
- Creator name and slug duplicate checks
- Validation for creator names, follower counts, products, and affiliate URLs
- Slug generation
- Better error messages
- Confirmation dialogs
- Loading states
- Role-aware UI
- Hide destructive actions from non-authorized roles

---

## Phase C — Data quality

Recommended:

- Prevent duplicate creator names and page slugs in the admin workflow.
- Prevent duplicate products where appropriate.
- Add proper source tracking.
- Add verification workflows.
- Define when data is `draft`, `published`, or `archived`.
- Add consistency checks.
- Establish a policy for updating follower counts.
- Establish rules for affiliate-link status.

---

## Phase D — Public website

This is a separate future project. Build it after the admin data-entry workflow is reviewed and stabilized, using Supabase as its data source.

Potential structure:

```text
/
├── creators
├── creators/:slug
├── products
├── products/:slug
├── product-types/:slug
├── retailers/:slug
└── search
```

The public site should consume Supabase data subject to public RLS policies.

Public users should not have access to private/admin data.

---

## Phase E — SEO

Plan SEO once the separate public website is designed and implemented.

Before production launch:

- unique page titles
- unique meta descriptions
- canonical URLs
- sitemap
- robots.txt
- structured data/schema markup where appropriate
- Open Graph metadata
- Twitter/X metadata if desired
- creator/product landing pages
- internal linking
- crawlable routes
- custom 404
- correct status codes
- page-source metadata
- image alt text
- performance optimization

---

## Phase F — Domain and deployment

Remaining:

- choose/configure production hosting
- configure custom domain
- HTTPS
- environment variables
- production Supabase project/configuration
- build pipeline
- deployment
- error monitoring
- analytics if desired

---

## Phase G — Affiliate readiness

Before monetization:

- verify each retailer's affiliate-program requirements
- use appropriate affiliate disclosures
- ensure affiliate links are correctly tagged
- handle inactive links
- create policies for replacing broken links
- ensure public pages clearly disclose affiliate relationships

---

## Phase H — Production hardening

Before public launch:

- backup strategy
- database migration strategy
- environment separation
- rate limiting where appropriate
- error monitoring
- security review
- RLS verification
- Auth configuration review
- dependency updates
- performance testing
- mobile testing

---

# 16. Suggested Order From Here

Do not jump directly to the public website.

Recommended order:

```text
1. Review creator, product, and affiliate-link data-entry flows
        ↓
2. Fix data integrity and save-reliability issues
        ↓
3. Refine the admin UI based on actual usage
        ↓
4. Build the separate public website
        ↓
5. Connect public pages to published Supabase data
        ↓
6. Add SEO and public content review
        ↓
7. Host the admin and public websites
        ↓
8. Complete affiliate readiness and launch checks
```

---

# 17. Current Resume Point

If continuing this project in another ChatGPT conversation/model, start with:

> "This is the current CreatorGear project. Read README.md and ARCHITECTURE.md first. Do not redesign or replace the existing architecture unless explicitly requested. Continue from the current completion state and preserve the decisions documented there."

The next immediate technical task is:

**Review and stabilize the current admin data-entry workflows. Build the separate public-facing website afterward, then prepare both applications for hosting and monetization.**

---

# 18. Important Decisions That Must Not Be Lost

1. Supabase is the source of truth.
2. The public website and admin panel use the same Supabase backend.
3. Market was intentionally removed from `affiliate_links`.
4. Retailer is a text input in the UI, not a dropdown.
5. Retailer names are resolved to retailer UUIDs before saving.
6. Product types use the `product_types` table.
7. Creator images are not currently part of the simplified creator form.
8. Creator category is not currently part of the simplified creator form.
9. Multiple affiliate links per product are supported.
10. Existing product and affiliate-link deletions are tracked and applied during save.
11. RLS is the real security boundary.
12. `owner`, `admin`, `editor`, `researcher`, and `reviewer` are the current roles.
13. Owner/admin can delete core content.
14. Editor/researcher can create and edit core content but cannot delete it.
15. Reviewer is read-only.
16. Role helper functions are SECURITY DEFINER and now use an empty search path.
17. Anonymous users no longer have EXECUTE privileges on the role helper functions.
18. Authenticated users retain EXECUTE privileges because RLS policies depend on `has_role()`.
19. Do not blindly delete unused-looking tables; several are part of the broader relational design.
20. Do not replace the current architecture with a new stack without an explicit reason.

---

# 19. Status Summary

| Area | Status |
|---|---|
| Supabase database | ✅ Implemented |
| Authentication | ✅ Implemented |
| Profiles | ✅ Implemented |
| Product types | ✅ Implemented |
| Creator CRUD | ✅ Implemented |
| Product CRUD | ✅ Implemented |
| Creator-product relationships | ✅ Implemented |
| Affiliate links | ✅ Implemented |
| Retailer auto-resolution | ✅ Implemented |
| Market removal from affiliate links | ✅ Completed |
| Delete tracking | ✅ Implemented |
| Admin dashboard | ✅ Implemented |
| RLS enabled | ✅ Implemented |
| Core RLS refinement | ✅ Completed |
| Role helper hardening | ✅ Completed |
| Role-management UI | ✅ Implemented and connected |
| Database-side role-change safeguards | ⏳ Remaining |
| Full role/RLS testing | ⏳ Remaining |
| Supporting-table RLS review | ⏳ Remaining |
| Admin form validation and duplicate checks | ✅ Implemented (client-side workflow) |
| Creator search and status filtering | ✅ Implemented |
| Database-wide duplicate constraints | ⏳ Remaining |
| Public website | ⏳ Future project |
| SEO | ⏳ Remaining |
| Custom domain | ⏳ Remaining |
| Production deployment | ⏳ Remaining |
| Affiliate production readiness | ⏳ Remaining |
| Final production security review | ⏳ Remaining |

---

## Final continuation point

**Current immediate next action:**

1. Review the current admin workflow for adding, editing, publishing, and removing data.
2. Address save reliability, duplicate handling, and data-quality gaps.
3. Use the admin with sample records and tune the data-entry experience.
4. Start the separate public-facing website after the admin workflow is stable.
