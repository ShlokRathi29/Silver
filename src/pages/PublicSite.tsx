import { useEffect, useState, type ReactNode } from "react";
import { Link, Route, Routes, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type CreatorCardData = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  country_name: string | null;
  follower_count: number | null;
};

type RetailerLink = {
  id: string;
  affiliate_url: string;
  status: string | null;
  retailers: { name: string; status: string | null } | null;
};

type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  product_types: { name: string } | null;
  affiliate_links?: RetailerLink[];
};

type GearEntry = {
  id: string;
  status: string | null;
  products: ProductCardData | null;
};

type CreatorDetailData = CreatorCardData & {
  creator_gear: GearEntry[];
};

type ProductDetailData = ProductCardData & {
  creator_gear: Array<{
    creators: { id: string; name: string; slug: string; status: string | null } | null;
  }>;
};

function setPageTitle(title: string, description = "Discover creator setups, products, and gear on CreatorGear.") {
  document.title = `${title} | CreatorGear`;
  const upsertMeta = (selector: string, attribute: string, key: string, value: string) => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = document.createElement("meta");
      element.setAttribute(attribute, key);
      document.head.appendChild(element);
    }
    element.content = value;
  };
  upsertMeta('meta[name="description"]', "name", "description", description);
  upsertMeta('meta[property="og:title"]', "property", "og:title", `${title} | CreatorGear`);
  upsertMeta('meta[property="og:description"]', "property", "og:description", description);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = `${window.location.origin}${window.location.pathname}`;
}

function formatFollowers(value: number | null) {
  if (value === null) return null;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M followers`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K followers`;
  return `${value.toLocaleString()} followers`;
}

function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-site">
      <header className="public-header">
        <Link className="public-brand" to="/">CreatorGear</Link>
        <nav aria-label="Main navigation">
          <Link to="/creators">Creators</Link>
          <Link to="/products">Gear</Link>
        </nav>
        <Link className="public-admin-link" to="/admin">Admin</Link>
      </header>
      <main>{children}</main>
      <footer className="public-footer">
        <Link className="public-brand" to="/">CreatorGear</Link>
        <span>Gear creators use, in one place.</span>
      </footer>
    </div>
  );
}

function LoadingOrError({ loading, error }: { loading: boolean; error: string }) {
  if (loading) return <div className="public-message">Loading CreatorGear…</div>;
  if (error) return <div className="public-message public-error">{error}</div>;
  return null;
}

function CreatorCard({ creator }: { creator: CreatorCardData }) {
  return (
    <Link className="public-card creator-public-card" to={`/creators/${creator.slug}`}>
      <div className="public-card-kicker">{creator.country_name || "Creator"}</div>
      <h3>{creator.name}</h3>
      {creator.bio && <p>{creator.bio}</p>}
      {creator.follower_count !== null && (
        <span className="public-muted">{formatFollowers(creator.follower_count)}</span>
      )}
      <span className="public-card-action">View creator <span aria-hidden="true">→</span></span>
    </Link>
  );
}

function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link className="public-card product-public-card" to={`/products/${product.slug}`}>
      {product.image_url ? (
        <img src={product.image_url} alt="" loading="lazy" />
      ) : (
        <div className="public-product-placeholder" aria-hidden="true">CG</div>
      )}
      <div className="public-card-kicker">{product.product_types?.name || "Gear"}</div>
      <h3>{product.name}</h3>
      {product.description && <p>{product.description}</p>}
      <span className="public-card-action">View gear <span aria-hidden="true">→</span></span>
    </Link>
  );
}

function HomePage() {
  const [creators, setCreators] = useState<CreatorCardData[]>([]);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPageTitle("Creator gear discovery", "Explore creator profiles, the gear they use, and products featured in their setups.");
    let active = true;
    Promise.all([
      supabase.from("creators").select("id,name,slug,bio,country_name,follower_count")
        .eq("status", "published").order("created_at", { ascending: false }).limit(6),
      supabase.from("products").select("id,name,slug,description,image_url,product_types(name)")
        .eq("status", "published").order("name").limit(6),
    ]).then(([creatorResult, productResult]) => {
      if (!active) return;
      const queryError = creatorResult.error || productResult.error;
      if (queryError) setError(queryError.message);
      setCreators((creatorResult.data || []) as unknown as CreatorCardData[]);
      setProducts((productResult.data || []) as unknown as ProductCardData[]);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <SiteLayout>
      <section className="public-hero">
        <div className="public-hero-copy">
          <span className="public-eyebrow">THE GEAR BEHIND THE CREATORS</span>
          <h1>Find out what your favorite creators use.</h1>
          <p>Explore creator setups, discover products, and find the gear behind the work.</p>
          <div className="public-hero-actions">
            <Link className="public-button" to="/creators">Explore creators</Link>
            <Link className="public-text-link" to="/products">Browse gear <span aria-hidden="true">→</span></Link>
          </div>
        </div>
        <div className="public-hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-device device-camera"><span /></div>
          <div className="hero-device device-mic"><span /></div>
          <div className="hero-device device-laptop"><span /></div>
          <div className="hero-art-label">CREATOR<br />SETUP</div>
        </div>
      </section>
      <LoadingOrError loading={loading} error={error} />
      {!loading && !error && (
        <>
          <section className="public-section">
            <div className="public-section-heading">
              <div><span className="public-eyebrow">GET INSPIRED</span><h2>Creators to explore</h2></div>
              <Link className="public-text-link" to="/creators">All creators <span aria-hidden="true">→</span></Link>
            </div>
            {creators.length ? <div className="public-card-grid">{creators.map((creator) => <CreatorCard key={creator.id} creator={creator} />)}</div> : <p className="public-muted">Creator profiles are being added. Check back soon.</p>}
          </section>
          <section className="public-section">
            <div className="public-section-heading">
              <div><span className="public-eyebrow">EXPLORE THE SETUPS</span><h2>Featured gear</h2></div>
              <Link className="public-text-link" to="/products">All gear <span aria-hidden="true">→</span></Link>
            </div>
            {products.length ? <div className="public-card-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="public-muted">Published gear will appear here.</p>}
          </section>
        </>
      )}
    </SiteLayout>
  );
}

function CreatorsPage() {
  const [creators, setCreators] = useState<CreatorCardData[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPageTitle("Creators", "Browse creator profiles and discover the products and gear they use.");
    supabase.from("creators").select("id,name,slug,bio,country_name,follower_count")
      .eq("status", "published").order("name")
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        setCreators((data || []) as unknown as CreatorCardData[]);
        setLoading(false);
      });
  }, []);

  const filtered = creators.filter((creator) =>
    `${creator.name} ${creator.country_name || ""} ${creator.bio || ""}`
      .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );

  return (
    <SiteLayout>
      <section className="public-page-intro">
        <span className="public-eyebrow">THE PEOPLE BEHIND THE SETUPS</span>
        <h1>Creators</h1>
        <p>Browse published creator profiles and explore the gear they use.</p>
        <input className="public-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search creators" aria-label="Search creators" />
      </section>
      <LoadingOrError loading={loading} error={error} />
      {!loading && !error && (filtered.length ? <div className="public-card-grid public-listing-grid">{filtered.map((creator) => <CreatorCard key={creator.id} creator={creator} />)}</div> : <div className="public-message">{creators.length ? "No creators match your search." : "No creator profiles are published yet."}</div>)}
    </SiteLayout>
  );
}

function ProductsPage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPageTitle("Gear", "Browse products and gear featured in published creator setups.");
    supabase.from("products").select("id,name,slug,description,image_url,product_types(name)")
      .eq("status", "published").order("name")
      .then(({ data, error: queryError }) => {
        if (queryError) setError(queryError.message);
        setProducts((data || []) as unknown as ProductCardData[]);
        setLoading(false);
      });
  }, []);

  const filtered = products.filter((product) =>
    `${product.name} ${product.product_types?.name || ""} ${product.description || ""}`
      .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  );

  return (
    <SiteLayout>
      <section className="public-page-intro">
        <span className="public-eyebrow">TOOLS OF THE TRADE</span>
        <h1>Gear</h1>
        <p>Explore products featured in creator setups.</p>
        <input className="public-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search gear or product type" aria-label="Search gear or product type" />
      </section>
      <LoadingOrError loading={loading} error={error} />
      {!loading && !error && (filtered.length ? <div className="public-card-grid public-listing-grid">{filtered.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="public-message">{products.length ? "No products match your search." : "No gear is published yet."}</div>)}
    </SiteLayout>
  );
}

function CreatorDetailPage() {
  const { slug = "" } = useParams();
  const [creator, setCreator] = useState<CreatorDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPageTitle("Creator profile", "Explore this creator's profile and the gear they use.");
    supabase.from("creators").select(`
      id,name,slug,bio,country_name,follower_count,
      creator_gear(id,status,products(id,name,slug,description,image_url,product_types(name),affiliate_links(id,affiliate_url,status,retailers(name,status))))
    `).eq("slug", slug).eq("status", "published").maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        const result = data as unknown as CreatorDetailData | null;
        setCreator(result);
        if (result) setPageTitle(result.name, result.bio || `Explore the products and gear used by ${result.name}.`);
        setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  const products = (creator?.creator_gear || [])
    .filter((entry) => entry.status === "active" && entry.products?.id)
    .map((entry) => entry.products as ProductCardData);

  return (
    <SiteLayout>
      <LoadingOrError loading={loading} error={error} />
      {!loading && !error && !creator && <div className="public-message"><h1>Creator not found</h1><Link to="/creators">Browse creators</Link></div>}
      {creator && (
        <>
          <section className="profile-hero">
            <Link className="public-back-link" to="/creators">← All creators</Link>
            <span className="public-eyebrow">CREATOR PROFILE</span>
            <h1>{creator.name}</h1>
            <div className="profile-meta">
              {creator.country_name && <span>{creator.country_name}</span>}
              {creator.follower_count !== null && <span>{formatFollowers(creator.follower_count)}</span>}
            </div>
            {creator.bio && <p>{creator.bio}</p>}
          </section>
          <section className="public-section">
            <div className="public-section-heading"><div><span className="public-eyebrow">ON THEIR SETUP</span><h2>Gear used by {creator.name}</h2></div></div>
            {products.length ? <div className="public-card-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="public-muted">Gear details are being researched for this creator.</p>}
          </section>
        </>
      )}
    </SiteLayout>
  );
}

function ProductDetailPage() {
  const { slug = "" } = useParams();
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPageTitle("Gear details", "Discover product details and creators who use this gear.");
    supabase.from("products").select(`
      id,name,slug,description,image_url,product_types(name),
      creator_gear(creators(id,name,slug,status)),
      affiliate_links(id,affiliate_url,status,retailers(name,status))
    `).eq("slug", slug).eq("status", "published").maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        const result = data as unknown as ProductDetailData | null;
        setProduct(result);
        if (result) setPageTitle(result.name, result.description || `${result.name} is featured in creator setups on CreatorGear.`);
        setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  const creators = (product?.creator_gear || [])
    .map((entry) => entry.creators)
    .filter((creator): creator is NonNullable<typeof creator> => creator?.status === "published");
  const retailerLinks = (product?.affiliate_links || [])
    .filter((link) => link.status === "active" && link.retailers?.status === "active");

  return (
    <SiteLayout>
      <LoadingOrError loading={loading} error={error} />
      {!loading && !error && !product && <div className="public-message"><h1>Product not found</h1><Link to="/products">Browse gear</Link></div>}
      {product && (
        <>
          <section className="product-detail-hero">
            <div className="product-detail-image">
              {product.image_url ? <img src={product.image_url} alt={product.name} /> : <div className="public-product-placeholder">CG</div>}
            </div>
            <div className="product-detail-copy">
              <Link className="public-back-link" to="/products">← All gear</Link>
              <span className="public-eyebrow">{product.product_types?.name || "CREATOR GEAR"}</span>
              <h1>{product.name}</h1>
              {product.description && <p>{product.description}</p>}
              {retailerLinks.length > 0 && (
                <div className="retailer-links">
                  <h2>Where to find it</h2>
                  {retailerLinks.map((link) => (
                    <a key={link.id} href={link.affiliate_url} target="_blank" rel="sponsored nofollow noopener noreferrer">
                      Visit {link.retailers?.name || "retailer"}<span aria-hidden="true"> ↗</span>
                    </a>
                  ))}
                  <p className="affiliate-note">Some links may be affiliate links. CreatorGear may earn a commission from qualifying purchases.</p>
                </div>
              )}
            </div>
          </section>
          {creators.length > 0 && (
            <section className="public-section">
              <div className="public-section-heading"><div><span className="public-eyebrow">SEEN IN CREATOR SETUPS</span><h2>Creators who use this</h2></div></div>
              <div className="public-card-grid">{creators.map((creator) => <CreatorCard key={creator.id} creator={{ ...creator, bio: null, country_name: null, follower_count: null }} />)}</div>
            </section>
          )}
        </>
      )}
    </SiteLayout>
  );
}

function NotFoundPage() {
  return <SiteLayout><div className="public-message"><span className="public-eyebrow">404</span><h1>We couldn't find that page.</h1><Link to="/">Back to CreatorGear</Link></div></SiteLayout>;
}

export default function PublicSite() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/creators" element={<CreatorsPage />} />
      <Route path="/creators/:slug" element={<CreatorDetailPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:slug" element={<ProductDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
