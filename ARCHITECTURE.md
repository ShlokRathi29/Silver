# CreatorGear Architecture

## Document Purpose

This document is the technical continuation guide for CreatorGear.

It records the architecture, database design, security model, implementation decisions, and current roadmap so that development can continue in another ChatGPT conversation, model, or development session without reconstructing the project from scratch.

**Read this document together with `README.md` before making architectural changes.**

---

# 1. System Overview

CreatorGear is a creator/influencer gear discovery platform.

The platform has two major consumers:

```text
                    ┌──────────────────────────┐
                    │      PUBLIC WEBSITE      │
                    │          `/`             │
                    │ Creators + products      │
                    │ Gear + retailer links    │
                    └────────────┬─────────────┘
                                 │
                                 │ Supabase
                                 ▼
                    ┌──────────────────────────┐
                    │        SUPABASE          │
                    │                          │
                    │ PostgreSQL               │
                    │ Auth                     │
                    │ RLS                      │
                    │ Database Functions       │
                    └────────────┬─────────────┘
                                 ▲
                                 │
                    ┌────────────┴─────────────┐
                    │       ADMIN PANEL        │
                    │         `/admin`         │
                    │                          │
                    │ React + TypeScript       │
                    │ Vite                     │
                    │ Supabase JS client       │
                    └──────────────────────────┘
```

Supabase is the source of truth.

The React admin application does not maintain a separate database.

---

# 2. Design Principles

The project currently follows these principles:

1. PostgreSQL is the source of truth.
2. Supabase Auth handles authentication.
3. PostgreSQL RLS enforces authorization.
4. React UI permissions are convenience, not the security boundary.
5. Public users should only receive data allowed by public RLS policies.
6. Internal collaborators use role-based access.
7. Products are independent entities and can be associated with multiple creators.
8. A product can have multiple affiliate links.
9. Retailers are relational entities, but the admin UI accepts retailer names as text.
10. Market is not part of the affiliate-link workflow.
11. The database contains broader future-facing tables even when the current simplified UI does not use every field.
12. Existing architecture should be extended rather than replaced without a clear requirement.

---

# 3. Frontend Architecture

Current admin stack:

```text
React
TypeScript
Vite
CSS
Supabase JavaScript client
```

Current conceptual structure:

```text
Admin Application
│
├── Login
│
├── App shell
│   ├── Sidebar
│   └── Main content
│
├── Dashboard
│
└── Creators
```

Current files include:

```text
App.tsx
App.css
index.css
main.tsx
Login.tsx
Dashboard.tsx
Creators.tsx
lib/supabase.ts
```

Exact directory structure can differ depending on the current local project.

---

# 4. Application Shell

`App.tsx` currently provides the common admin shell.

Conceptually:

```tsx
<div className="app-layout">
  <aside className="sidebar">
    CreatorGear
    Dashboard
    Creators
  </aside>

  <main className="main-content">
    <Dashboard />
    // or
    <Creators />
  </main>
</div>
```

The Dashboard and Creators pages share the same layout/CSS ecosystem.

---

# 5. Authentication Architecture

Authentication is provided by Supabase Auth.

The user identity comes from:

```text
auth.users
```

The application-specific profile is stored in:

```text
public.profiles
```

Relationship:

```text
auth.users.id
     │
     ▼
profiles.id
```

Current profile schema:

```text
profiles
├── id uuid PK
├── full_name text
├── role text
├── is_active boolean
├── created_at timestamptz
└── updated_at timestamptz
```

Role constraint:

```text
owner
admin
editor
researcher
reviewer
```

---

# 6. Authorization Architecture

Authorization is database-enforced.

The intended model is:

```text
owner
  ↓
admin
  ↓
editor
  ↓
researcher
  ↓
reviewer
```

This is a conceptual authority ordering, not inheritance in PostgreSQL.

Current core-content permissions:

| Role | SELECT | INSERT | UPDATE | DELETE |
|---|---:|---:|---:|---:|
| owner | ✓ | ✓ | ✓ | ✓ |
| admin | ✓ | ✓ | ✓ | ✓ |
| editor | ✓ | ✓ | ✓ | ✗ |
| researcher | ✓ | ✓ | ✓ | ✗ |
| reviewer | ✓ | ✗ | ✗ | ✗ |

Core tables:

```text
creators
products
creator_gear
affiliate_links
```

---

# 7. RLS Security Boundary

The security model is:

```text
User
  ↓
React
  ↓
Supabase API
  ↓
PostgreSQL
  ↓
RLS policy
  ↓
Allowed / Denied
```

Do not treat UI button visibility as authorization.

For example, even if the React application hides a Delete button from a researcher, PostgreSQL must still reject the DELETE operation.

The core RLS policies now enforce this.

---

# 8. Role Helper Functions

Two functions are currently used:

```text
public.get_my_role()
public.has_role(required_roles text[])
```

## get_my_role()

Conceptually:

```sql
SELECT role
FROM public.profiles
WHERE id = auth.uid()
  AND is_active = true
LIMIT 1;
```

## has_role()

Conceptually:

```sql
SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role = ANY(required_roles)
);
```

Both functions are:

```text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
```

All database references are explicitly qualified.

---

# 9. Function Execution Security

The role helper functions originally produced Supabase Security Advisor warnings because of their broad execute privileges.

They were hardened.

Current relevant execution privileges:

```text
anon           ❌
authenticated  ✅
postgres       ✅
service_role   ✅
```

The reason authenticated users retain EXECUTE is that RLS policies call `has_role()`.

Do not remove authenticated EXECUTE without replacing the RLS role-checking mechanism.

---

# 10. Database Schema

The current public schema contains:

```text
countries
markets
platforms
categories
brands
creators
creator_platforms
products
sources
creator_gear
retailers
affiliate_links
product_prices
profiles
product_types
```

---

# 11. Core Entity Relationships

## Creator → Gear

```text
creators
   │
   │ 1:N
   ▼
creator_gear
   │
   │ N:1
   ▼
products
```

This allows a product to be associated with multiple creators.

---

## Product → Affiliate Links

```text
products
   │
   │ 1:N
   ▼
affiliate_links
   │
   │ N:1
   ▼
retailers
```

A product can therefore have:

```text
Amazon → affiliate URL
Flipkart → affiliate URL
Other retailer → affiliate URL
```

The exact retailer availability depends on the data entered.

---

# 12. Creators Table

Schema:

```text
creators
├── id uuid PK
├── name text NOT NULL
├── slug text UNIQUE NOT NULL
├── bio text
├── country_id uuid
├── category_id uuid
├── profile_image_url text
├── status text
├── created_at timestamptz
├── updated_at timestamptz
├── follower_count bigint
└── country_name text
```

Foreign keys:

```text
country_id → countries.id
category_id → categories.id
```

Status values:

```text
draft
published
archived
```

Current simplified admin form uses:

```text
name
bio
country_name
follower_count
```

The UI currently does not require:

```text
profile_image_url
category_id
```

---

# 13. Products Table

Schema:

```text
products
├── id uuid PK
├── name text NOT NULL
├── slug text UNIQUE NOT NULL
├── brand_id uuid
├── model text
├── description text
├── category_id uuid
├── image_url text
├── specifications jsonb
├── status text
├── created_at timestamptz
├── updated_at timestamptz
└── product_type_id uuid
```

Foreign keys:

```text
brand_id → brands.id
category_id → categories.id
product_type_id → product_types.id
```

Current simplified UI uses:

```text
product_type_id
name
```

---

# 14. Product Types

`product_types` is a controlled reference table.

Schema:

```text
product_types
├── id uuid PK
├── name text UNIQUE
├── slug text UNIQUE
├── status text
└── created_at timestamptz
```

Seeded values include:

```text
Camera
Microphone
Laptop
Monitor
Keyboard
Mouse
Headphones
Webcam
Lighting
Gaming Chair
Controller
Console
Drone
Smartphone
Tablet
Software
Other
```

The product form obtains the dropdown options from this table.

---

# 15. Creator Gear

Schema:

```text
creator_gear
├── id uuid PK
├── creator_id uuid NOT NULL
├── product_id uuid NOT NULL
├── category_id uuid
├── source_id uuid
├── verification_status text
├── notes text
├── first_reported_at timestamptz
├── last_verified_at timestamptz
├── status text
├── created_at timestamptz
└── updated_at timestamptz
```

Foreign keys:

```text
creator_id → creators.id
product_id → products.id
category_id → categories.id
source_id → sources.id
```

Current simplified admin workflow primarily uses:

```text
creator_id
product_id
```

---

# 16. Affiliate Links

Current schema:

```text
affiliate_links
├── id uuid PK
├── product_id uuid NOT NULL
├── retailer_id uuid NOT NULL
├── affiliate_url text NOT NULL
├── tracking_id text
├── status text
├── created_at timestamptz
└── updated_at timestamptz
```

Foreign keys:

```text
product_id → products.id
retailer_id → retailers.id
```

Status:

```text
active
inactive
```

---

# 17. Retailer Input Architecture

The UI intentionally uses:

```text
Retailer: [plain text input]
```

It does not use a retailer dropdown.

The application maintains relational integrity using this process:

```text
User enters retailer name
        ↓
Normalize / trim
        ↓
Case-insensitive lookup in retailers
        ↓
Existing retailer?
     /       \
   yes        no
    ↓          ↓
use UUID    INSERT retailer
    │          │
    └────┬─────┘
         ↓
affiliate_links.retailer_id
```

This preserves the foreign-key relationship while allowing fast data entry.

---

# 18. Market Removal

Market was explicitly removed from the affiliate-link architecture.

The previous issue was:

```text
affiliate_links.market_id
```

being NOT NULL while the application intentionally stopped providing a market.

This caused:

```text
ERROR 23502
null value in column "market_id"
```

The decision was to remove `market_id` from `affiliate_links`.

The `markets` table still exists because:

```text
product_prices.market_id → markets.id
```

Therefore:

```text
markets
```

must not be deleted simply because affiliate links no longer use it.

Current rule:

> Market is not part of affiliate-link creation/editing.

---

# 19. Current Creator Form Architecture

The current creator form conceptually looks like:

```text
Creator
├── Name
├── Bio
├── Country
├── Followers
│
└── Products
    ├── Product
    │   ├── Product Type
    │   ├── Product Name
    │   │
    │   └── Affiliate Links
    │       ├── Retailer
    │       ├── Affiliate URL
    │       ├── Add Link
    │       └── Remove Link
    │
    ├── Add Product
    └── Remove Product
```

Multiple products per creator are supported.

Multiple affiliate links per product are supported.

---

# 20. Delete Tracking

The current React implementation tracks IDs of existing records removed from the form.

Conceptually:

```text
removedProductIds
removedAffiliateLinkIds
```

This matters because removing an item from React state does not automatically remove the corresponding PostgreSQL row.

During save:

```text
removed affiliate link IDs
        ↓
DELETE affiliate_links

removed product IDs
        ↓
DELETE creator_gear
```

New records are inserted and existing records are updated.

---

# 21. Dashboard Architecture

The dashboard reads live counts from Supabase.

Current metrics:

```text
Creators
Products
Gear Entries
Affiliate Links
```

It also retrieves the latest five creators.

The dashboard includes:

- profile name
- role
- statistics
- recently added creators
- refresh
- total tracked-record summary
- loading state
- error state

The dashboard does not independently store statistics.

All values are calculated from the database.

---

# 22. Public Data Model

Existing public RLS policies generally expose active/published records.

Examples:

```text
creators
→ status = published

products
→ status = published

affiliate_links
→ status = active

retailers
→ status = active

categories
→ is_active = true

markets
→ is_active = true
```

This creates a natural separation between:

```text
Internal draft data
        ↓
Publication status
        ↓
Public website
```

The public website should use these database policies rather than implementing its own security assumptions.

---

# 23. Current RLS Policy State

All public tables currently have RLS enabled.

Core content policies were changed from broad `ALL` policies to operation-specific policies.

For the four core tables:

```text
creators
products
creator_gear
affiliate_links
```

the current authenticated policy model is:

```text
SELECT:
owner
admin
editor
researcher
reviewer

INSERT:
owner
admin
editor
researcher

UPDATE:
owner
admin
editor
researcher

DELETE:
owner
admin
```

Public read policies remain separate.

---

# 24. Supporting Tables

Supporting tables include:

```text
brands
categories
countries
markets
platforms
creator_platforms
product_prices
product_types
profiles
retailers
sources
```

Their policies have not all been redesigned yet.

This is intentional.

They need to be reviewed according to their actual business purpose rather than applying the same permissions everywhere.

---

# 25. Supporting Table Current Policy Observations

Current broad model includes:

```text
brands
    owner/admin/editor manage

categories
    owner/admin/editor manage

countries
    owner/admin manage

markets
    owner/admin manage

platforms
    owner/admin manage

product_prices
    owner/admin/editor/researcher manage

product_types
    authenticated users can SELECT

profiles
    owner/admin manage
    user can SELECT own profile

retailers
    owner/admin manage

sources
    owner/admin/editor/researcher manage
```

These are existing/current policies and are subject to the remaining security review.

---

# 26. Security Work Completed

Completed:

```text
✓ RLS enabled across public tables
✓ Existing RLS policies inspected
✓ Role helper functions inspected
✓ SECURITY DEFINER functions hardened
✓ search_path changed to empty
✓ fully-qualified public.profiles references retained
✓ anon execution revoked
✓ authenticated execution retained
✓ core content ALL policies replaced
✓ delete restricted to owner/admin on core content
```

---

# 27. Security Work Remaining

## Immediate

1. Test RLS with actual accounts.
2. Confirm owner behavior.
3. Confirm admin behavior.
4. Confirm editor behavior.
5. Confirm researcher behavior.
6. Confirm reviewer behavior.
7. Confirm inactive profiles cannot operate as team members.
8. Review profile-management security.
9. Review supporting-table policies.
10. Recheck Supabase Security Advisor.

---

# 28. Role Management Architecture — Planned

The admin panel should eventually include a protected team/user-management area.

Conceptual structure:

```text
Admin / Owner
    ↓
Team
    ├── User
    ├── Full name
    ├── Role
    ├── Active / Inactive
    └── Account status
```

Only authorized roles should be able to modify roles.

Recommended authority:

```text
owner
    ↓
can manage roles

admin
    ↓
can manage operational users
    ↓
cannot control owner-level authority
```

Exact role-management rules should be implemented only after confirming the desired business rules.

---

# 29. Data Quality Roadmap

Recommended future constraints and validation:

## Creators

- required name
- slug generation
- duplicate-name handling
- follower count validation
- country validation

## Products

- required name
- product type required
- slug generation
- duplicate product handling
- optional brand/model handling

## Affiliate links

- URL validation
- required retailer
- required URL
- duplicate-link detection
- active/inactive handling

## Retailers

- normalized names
- slug generation
- duplicate protection

---

# 30. Public Website Architecture — Planned

The public site should eventually contain routes similar to:

```text
/
├── creators
│   └── :slug
│
├── products
│   └── :slug
│
├── product-types
│   └── :slug
│
├── retailers
│   └── :slug
│
├── search
│
└── 404
```

Exact routing is not yet finalized.

The public site should prioritize:

- fast browsing
- search
- creator pages
- gear pages
- product pages
- retailer links
- source/verification information where exposed publicly

---

# 31. SEO Architecture — Planned

Each public entity should eventually have:

```text
<title>
<meta description>
canonical URL
Open Graph
structured data where appropriate
```

Site-level requirements:

```text
sitemap.xml
robots.txt
custom 404
canonical URLs
crawlable navigation
internal linking
```

The public pages should be designed around actual searchable creator/product entities rather than only a client-side application shell.

---

# 32. Deployment Architecture — Planned

Production will require:

```text
Git repository
      ↓
Build system / hosting
      ↓
Custom domain
      ↓
HTTPS
      ↓
Public website
      ↓
Supabase
```

Environment variables must be configured securely.

No service-role key should be exposed to the browser.

The frontend should use the intended public Supabase client configuration.

---

# 33. Production Security Requirements

Before launch:

- never expose Supabase service-role credentials in frontend code
- verify RLS on every publicly reachable table
- test anonymous access
- test authenticated access
- test every role
- verify inactive users
- review database functions
- review Auth settings
- enable leaked-password protection where appropriate
- configure backups
- establish migration/versioning workflow
- review dependencies
- review public data exposure

---

# 34. Production Data Lifecycle

Recommended conceptual lifecycle:

```text
Research
   ↓
Draft
   ↓
Verified
   ↓
Published
   ↓
Updated
   ↓
Archived
```

The existing schema already contains several status/verification concepts.

Do not add redundant state systems without a clear requirement.

---

# 35. Development Roadmap

## Phase 1 — Foundation

Status:

```text
████████████████████ 100%
```

Completed:

- Supabase
- schema
- auth
- profiles
- product types
- creator CRUD
- products
- gear relationship
- affiliate links
- retailer handling
- dashboard

---

## Phase 2 — Security

Status:

```text
██████████████░░░░░░ ~70%
```

Completed:

- RLS enabled
- policies inspected
- helper functions hardened
- core RLS redesigned

Remaining:

- real-user permission tests
- database-side safeguards for role/profile updates
- supporting-table policy review
- Security Advisor final review
- Auth hardening

---

## Phase 3 — Admin Quality

Status:

```text
████████████░░░░░░░░ ~60%
```

Completed:

- basic CRUD
- loading/error handling
- dashboard
- delete tracking

Remaining:

- pagination
- better role-aware UI
- audit/history
- database-level duplicate constraints

---

## Phase 4 — Public Website

Status:

```text
██████████░░░░░░░░░░ ~50%
```

Initial implementation includes a homepage, published creator and product directories, detail pages, directory search, and active retailer links.

Remaining:

- public RLS verification
- source/verification display
- accessibility and mobile review

---

## Phase 5 — SEO & Growth

Status:

```text
████░░░░░░░░░░░░░░░░ ~20%
```

Implemented baseline metadata, canonical URLs, Open Graph title/description, favicon, and robots rules.

Remaining:

- sitemap
- structured data
- indexing
- internal links
- performance
- analytics

---

## Phase 6 — Production

Status:

```text
░░░░░░░░░░░░░░░░░░░░ 0%
```

Remaining:

- custom domain
- hosting
- CI/CD
- production environment
- monitoring
- backups
- final security review
- affiliate compliance
- launch

---

# 36. Current Project Completion Estimate

A precise percentage is not mathematically meaningful because the remaining public site and production work are much larger than individual CRUD features.

A useful high-level interpretation is:

```text
Database foundation       ████████████████████ 100%
Admin CRUD foundation     ████████████████████ 100%
Initial security          ██████████████░░░░░░ ~70%
Admin productization      ████████████░░░░░░░░ ~60%
Public website             ██████████░░░░░░░░░░ ~50%
SEO                        ░░░░░░░░░░░░░░░░░░░░ 0%
Production deployment      ░░░░░░░░░░░░░░░░░░░░ 0%
```

The project has a **working internal foundation**, but it should not yet be considered production-ready.

---

# 37. Immediate Next Steps

Do not skip directly to SEO.

The recommended next sequence is:

```text
CURRENT
  │
  ▼
Test current admin after RLS migration
  │
  ▼
Enforce Team role changes and last-owner safeguards in PostgreSQL
  │
  ▼
Test every role
  │
  ▼
Review supporting-table RLS
  │
  ▼
Add data validation + duplicate prevention
  │
  ▼
Admin UI polish
  │
  ▼
Verify public RLS and complete launch readiness
  │
  ▼
Connect public site to Supabase
  │
  ▼
SEO
  │
  ▼
Custom domain
  │
  ▼
Deployment
  │
  ▼
Production hardening
  │
  ▼
Launch
```

---

# 38. Continuation Instructions for Another AI/Developer

Before modifying the project:

1. Read `README.md`.
2. Read `ARCHITECTURE.md`.
3. Preserve Supabase as the source of truth.
4. Preserve the five-role model.
5. Preserve RLS as the authorization boundary.
6. Do not reintroduce `market_id` into `affiliate_links`.
7. Do not turn retailer into a required dropdown.
8. Do not remove broader schema tables without checking their relationships.
9. Do not replace working CRUD logic without a concrete reason.
10. Verify database behavior before changing frontend behavior.
11. Distinguish implemented functionality from planned functionality.
12. Prefer incremental migrations over destructive schema rewrites.

---

# 39. Known Important Historical Decisions

### Retailer

Decision:

> UI accepts retailer as text; database stores retailer UUID.

Reason:

> Keep relational integrity without forcing a large retailer dropdown.

### Market

Decision:

> Remove Market from affiliate links.

Reason:

> It was not required for the CreatorGear affiliate-link workflow and caused a NOT NULL insertion error.

### Product Types

Decision:

> Product type is a database-backed dropdown.

Reason:

> Product types should be consistent across records.

### Creator Image

Decision:

> Not currently part of the simplified creator form.

### Creator Category

Decision:

> Not currently part of the simplified creator form.

### Delete Permissions

Decision:

> Only owner/admin can delete core content.

Reason:

> Editors/researchers should be able to maintain data without destructive permissions.

---

# 40. Definition of Done for Production

CreatorGear should not be considered production-ready until all of these are true:

```text
[ ] Admin CRUD tested
[ ] Owner tested
[ ] Admin tested
[ ] Editor tested
[ ] Researcher tested
[ ] Reviewer tested
[ ] Inactive-user behavior tested
[ ] Supporting-table RLS reviewed
[ ] Security Advisor reviewed
[ ] Team management complete
[ ] Validation complete
[ ] Duplicate handling complete
[ ] Public website complete
[ ] Public RLS verified
[ ] SEO complete
[ ] Sitemap configured
[ ] Robots configured
[ ] 404 configured
[ ] Custom domain configured
[ ] HTTPS verified
[ ] Production environment configured
[ ] Backups configured
[ ] Monitoring configured
[ ] Affiliate disclosures implemented
[ ] Affiliate links tested
[ ] Mobile tested
[ ] Performance tested
[ ] Final security review complete
[ ] Launch
```

---

# 41. Current Resume Point

**The project is currently at the end of the first major security migration. The Team management UI has been implemented and connected to navigation; database-side safeguards and role-by-role verification remain.**

The last completed operation was:

> Replace the core `FOR ALL` team policies for creators, products, creator_gear, and affiliate_links with operation-specific RLS policies.

The next operation should be:

> Test the current admin panel with the new RLS, then enforce Team profile changes and last-active-owner protection in PostgreSQL and review the remaining supporting-table RLS.

Do not assume later phases have already been implemented.
