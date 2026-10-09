import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AffiliateLink = {
  id?: string;
  retailer_id: string;
  affiliate_url: string;
};

type ProductForm = {
  id?: string;
  product_type_id: string;
  name: string;
  links: AffiliateLink[];
};

type ProductType = {
  id: string;
  name: string;
  slug: string;
};

type Creator = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  country_name: string | null;
  follower_count: number | null;
  status: string;
  created_at: string;
};

type Retailer = {
  id: string;
  name: string;
};

const newAffiliateLink = (): AffiliateLink => ({
  retailer_id: "",
  affiliate_url: "",
});

const newProduct = (): ProductForm => ({
  name: "",
  product_type_id: "",
  links: [newAffiliateLink()],
});

export default function Creators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editingCreatorId, setEditingCreatorId] =
    useState<string | null>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [followerCount, setFollowerCount] = useState("");

  const [products, setProducts] = useState<ProductForm[]>([
    newProduct(),
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [removedProductIds, setRemovedProductIds] =
    useState<string[]>([]);

  const [removedAffiliateLinkIds, setRemovedAffiliateLinkIds] =
    useState<string[]>([]);

  useEffect(() => {
    loadCreators();
    loadRetailers();
    loadProductTypes();
  }, []);

  // -----------------------------
  // LOAD DATA
  // -----------------------------

  async function loadCreators() {
    const { data, error } = await supabase
      .from("creators")
      .select(
        "id, name, slug, bio, country_name, follower_count, status, created_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }

    setCreators(data || []);
  }

  async function loadRetailers() {
    const { data, error } = await supabase
      .from("retailers")
      .select("id, name")
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    setRetailers(data || []);
  }

  async function loadProductTypes() {
    const { data, error } = await supabase
      .from("product_types")
      .select("id, name, slug")
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error(error);
      return;
    }

    setProductTypes(data || []);
  }

  // -----------------------------
  // FORM HELPERS
  // -----------------------------

  function createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function resetForm() {
    setName("");
    setBio("");
    setCountry("");
    setFollowerCount("");

    setProducts([newProduct()]);

    setEditingCreatorId(null);

    setRemovedProductIds([]);
    setRemovedAffiliateLinkIds([]);

    setError("");
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  // -----------------------------
  // PRODUCT FUNCTIONS
  // -----------------------------

  function addProduct() {
    setProducts((current) => [
      ...current,
      newProduct(),
    ]);
  }

  function removeProduct(index: number) {
    setProducts((current) => {
      const product = current[index];

      if (product?.id) {
        setRemovedProductIds((ids) =>
          ids.includes(product.id as string)
            ? ids
            : [...ids, product.id as string]
        );
      }

      return current.filter((_, i) => i !== index);
    });
  }

  function updateProductName(
    productIndex: number,
    value: string
  ) {
    setProducts((current) =>
      current.map((product, index) =>
        index === productIndex
          ? {
            ...product,
            name: value,
          }
          : product
      )
    );
  }

  // -----------------------------
  // AFFILIATE FUNCTIONS
  // -----------------------------

  function addAffiliateLink(productIndex: number) {
    setProducts((current) =>
      current.map((product, index) =>
        index === productIndex
          ? {
            ...product,
            links: [
              ...product.links,
              newAffiliateLink(),
            ],
          }
          : product
      )
    );
  }

  function removeAffiliateLink(
    productIndex: number,
    linkIndex: number
  ) {
    setProducts((current) => {
      const product = current[productIndex];
      const link = product?.links[linkIndex];

      if (link?.id) {
        setRemovedAffiliateLinkIds((ids) =>
          ids.includes(link.id!)
            ? ids
            : [...ids, link.id!]
        );
      }

      return current.map((product, index) =>
        index === productIndex
          ? {
            ...product,
            links: product.links.filter(
              (_, i) => i !== linkIndex
            ),
          }
          : product
      );
    });
  }

  function updateAffiliateLink(
    productIndex: number,
    linkIndex: number,
    field: keyof AffiliateLink,
    value: string
  ) {
    setProducts((current) =>
      current.map((product, index) => {
        if (index !== productIndex) {
          return product;
        }

        return {
          ...product,
          links: product.links.map(
            (link, i) =>
              i === linkIndex
                ? {
                  ...link,
                  [field]: value,
                }
                : link
          ),
        };
      })
    );
  }


  async function getRetailerId(
    retailerName: string
  ): Promise<string> {
    const normalizedName = retailerName.trim();

    if (!normalizedName) {
      throw new Error("Retailer is required.");
    }

    const existing = retailers.find(
      (retailer) =>
        retailer.name.toLowerCase() ===
        normalizedName.toLowerCase()
    );

    if (existing) {
      return existing.id;
    }

    const { data, error } = await supabase
      .from("retailers")
      .insert({
        name: normalizedName,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(
        `Could not create retailer "${normalizedName}": ${error.message}`
      );
    }

    setRetailers((current) => [
      ...current,
      {
        id: data.id,
        name: normalizedName,
      },
    ]);

    return data.id;
  }

  // -----------------------------
  // SAVE CREATOR
  // -----------------------------

  async function saveCreator(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const normalizedName = name.trim().replace(/\s+/g, " ");
      if (!normalizedName) {
        throw new Error("Creator name is required.");
      }

      const existingCreator = creators.find(
        (creator) => creator.id === editingCreatorId
      );
      const slug =
        createSlug(normalizedName) ||
        existingCreator?.slug ||
        `creator-${crypto.randomUUID().slice(0, 8)}`;

      const duplicateName = creators.find(
        (creator) =>
          creator.id !== editingCreatorId &&
          creator.name.trim().replace(/\s+/g, " ").toLocaleLowerCase() ===
            normalizedName.toLocaleLowerCase()
      );
      if (duplicateName) {
        throw new Error(`A creator named "${duplicateName.name}" already exists.`);
      }

      const followerValue = followerCount.trim();
      const parsedFollowerCount = followerValue ? Number(followerValue) : null;
      if (
        parsedFollowerCount !== null &&
        (!Number.isSafeInteger(parsedFollowerCount) || parsedFollowerCount < 0)
      ) {
        throw new Error("Followers must be a whole number greater than or equal to zero.");
      }

      const completeProducts = products.filter(
        (product) => product.name.trim() || product.product_type_id
      );
      const seenProducts = new Set<string>();
      for (const product of completeProducts) {
        if (!product.name.trim() || !product.product_type_id) {
          throw new Error("Each product needs both a product type and a name.");
        }

        const productKey = `${product.product_type_id}:${product.name.trim().toLocaleLowerCase()}`;
        if (seenProducts.has(productKey)) {
          throw new Error(`The product "${product.name.trim()}" appears more than once for this creator.`);
        }
        seenProducts.add(productKey);

        const seenRetailers = new Set<string>();
        for (const link of product.links) {
          const retailerName = link.retailer_id.trim();
          const affiliateUrl = link.affiliate_url.trim();
          if (!retailerName && !affiliateUrl) {
            if (link.id) {
              throw new Error("Use Remove on an existing affiliate link instead of clearing its fields.");
            }
            continue;
          }
          if (!retailerName || !affiliateUrl) {
            throw new Error("Each affiliate link needs both a retailer and a URL.");
          }

          let parsedUrl: URL;
          try {
            parsedUrl = new URL(affiliateUrl);
          } catch {
            throw new Error(`Enter a valid URL for ${retailerName}.`);
          }
          if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            throw new Error(`Affiliate URLs for ${retailerName} must start with http:// or https://.`);
          }

          const retailerKey = retailerName.toLocaleLowerCase();
          if (seenRetailers.has(retailerKey)) {
            throw new Error(`Retailer "${retailerName}" is listed more than once for this product.`);
          }
          seenRetailers.add(retailerKey);
        }
      }

      const { data: slugMatches, error: slugCheckError } = await supabase
        .from("creators")
        .select("id")
        .eq("slug", slug)
        .limit(2);
      if (slugCheckError) throw slugCheckError;
      if (slugMatches?.some((creator) => creator.id !== editingCreatorId)) {
        throw new Error("Another creator already uses this page URL. Change the name to make it unique.");
      }

      let creatorId = editingCreatorId;

      // -----------------------------
      // CREATE / UPDATE CREATOR
      // -----------------------------

      if (editingCreatorId) {
        const { error: updateError } =
          await supabase
            .from("creators")
            .update({
              name: normalizedName,
              slug,
              bio: bio.trim() || null,
              country_name:
                country.trim() || null,
              follower_count: parsedFollowerCount,
            })
            .eq("id", editingCreatorId);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { data, error: insertError } =
          await supabase
            .from("creators")
            .insert({
              name: normalizedName,
              slug,
              bio: bio.trim() || null,
              country_name:
                country.trim() || null,
              follower_count: parsedFollowerCount,
              status: "draft",
            })
            .select()
            .single();

        if (insertError) {
          throw insertError;
        }

        creatorId = data.id;
      }

      if (!creatorId) {
        throw new Error(
          "Could not determine creator ID."
        );
      }

      // -----------------------------
      // DELETE REMOVED AFFILIATE LINKS
      // -----------------------------

      if (removedAffiliateLinkIds.length > 0) {
        const { error } = await supabase
          .from("affiliate_links")
          .delete()
          .in("id", removedAffiliateLinkIds);

        if (error) {
          throw error;
        }
      }

      // -----------------------------
      // DELETE REMOVED PRODUCT LINKS
      // -----------------------------

      if (
        editingCreatorId &&
        removedProductIds.length > 0
      ) {
        const { error } = await supabase
          .from("creator_gear")
          .delete()
          .eq("creator_id", creatorId)
          .in("product_id", removedProductIds);

        if (error) {
          throw error;
        }
      }

      // -----------------------------
      // SAVE PRODUCTS
      // -----------------------------

      for (const product of completeProducts) {
        if (
          !product.name.trim() ||
          !product.product_type_id
        ) {
          continue;
        }

        let productId = product.id;

        // -----------------------------
        // CREATE PRODUCT
        // -----------------------------

        if (!productId) {
          const productSlug = createSlug(product.name);

          const { data, error } = await supabase
            .from("products")
            .insert({
              name: product.name.trim(),
              slug: `${productSlug}-${crypto
                .randomUUID()
                .slice(0, 8)}`,
              product_type_id:
                product.product_type_id,
              status: "draft",
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          productId = data.id;
        } else {
          // -----------------------------
          // UPDATE EXISTING PRODUCT
          // -----------------------------

          const { error } = await supabase
            .from("products")
            .update({
              name: product.name.trim(),
              product_type_id:
                product.product_type_id,
            })
            .eq("id", productId);

          if (error) {
            throw error;
          }
        }

        // -----------------------------
        // CONNECT CREATOR + PRODUCT
        // -----------------------------

        const { data: existingGear, error: gearCheckError } =
          await supabase
            .from("creator_gear")
            .select("id")
            .eq("creator_id", creatorId)
            .eq("product_id", productId)
            .maybeSingle();

        if (gearCheckError) {
          throw gearCheckError;
        }

        if (!existingGear) {
          const { error } = await supabase
            .from("creator_gear")
            .insert({
              creator_id: creatorId,
              product_id: productId,
              verification_status: "unverified",
              status: "active",
            });

          if (error) {
            throw error;
          }
        }

        // -----------------------------
        // SAVE AFFILIATE LINKS
        // -----------------------------

        for (const link of product.links) {
          if (
            !link.retailer_id.trim() ||
            !link.affiliate_url.trim()
          ) {
            continue;
          }

          const retailerId = await getRetailerId(
            link.retailer_id
          );

          // -----------------------------
          // UPDATE EXISTING LINK
          // -----------------------------

          if (link.id) {
            const { error } = await supabase
              .from("affiliate_links")
              .update({
                retailer_id: retailerId,
                affiliate_url:
                  link.affiliate_url.trim(),
                status: "active",
              })
              .eq("id", link.id);

            if (error) {
              throw error;
            }
          }

          // -----------------------------
          // CREATE NEW LINK
          // -----------------------------

          else {
            const { error } = await supabase
              .from("affiliate_links")
              .insert({
                product_id: productId,
                retailer_id: retailerId,
                affiliate_url:
                  link.affiliate_url.trim(),
                status: "active",
              });

            if (error) {
              throw error;
            }
          }
        }
      }

      await loadCreators();

      closeForm();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // DELETE CREATOR
  // -----------------------------

  async function removeCreator(
    creator: Creator
  ) {
    const confirmed = window.confirm(
      `Remove "${creator.name}"?\n\nThis will remove the creator and their creator/product associations.`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      /*
       * Get all products associated with creator.
       */
      const { data: gear, error: gearFetchError } =
        await supabase
          .from("creator_gear")
          .select("product_id")
          .eq("creator_id", creator.id);

      if (gearFetchError) {
        throw gearFetchError;
      }

      /*
       * Remove creator/product associations.
       */
      const { error: gearDeleteError } =
        await supabase
          .from("creator_gear")
          .delete()
          .eq("creator_id", creator.id);

      if (gearDeleteError) {
        throw gearDeleteError;
      }

      /*
       * Remove creator.
       */
      const { error: creatorDeleteError } =
        await supabase
          .from("creators")
          .delete()
          .eq("id", creator.id);

      if (creatorDeleteError) {
        throw creatorDeleteError;
      }

      /*
       * Products themselves are NOT deleted here.
       *
       * This is intentional because a product could
       * potentially belong to another creator.
       */

      console.log(
        "Products previously associated:",
        gear
      );

      await loadCreators();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not remove creator."
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // PUBLISH / UNPUBLISH CREATOR
  // -----------------------------

  async function toggleCreatorPublishStatus(
    creator: Creator
  ) {
    const isPublished = creator.status === "published";
    const nextStatus = isPublished
      ? "draft"
      : "published";

    const action = isPublished
      ? "unpublish"
      : "publish";

    const confirmed = window.confirm(
      isPublished
        ? `Unpublish "${creator.name}"?\n\nIt will no longer appear on the public CreatorGear website.`
        : `Publish "${creator.name}"?\n\nMake sure the creator, products, and affiliate links have been reviewed first.`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      // When publishing a creator, publish the products attached to
      // that creator as well. Unpublishing the creator does NOT
      // unpublish products because a product may be shared by
      // another published creator.
      if (!isPublished) {
        const { data: gear, error: gearError } =
          await supabase
            .from("creator_gear")
            .select("product_id")
            .eq("creator_id", creator.id)
            .eq("status", "active");

        if (gearError) {
          throw gearError;
        }

        const productIds = Array.from(
          new Set(
            (gear || [])
              .map((item) => item.product_id)
              .filter(Boolean)
          )
        );

        if (productIds.length > 0) {
          const { error: productError } =
            await supabase
              .from("products")
              .update({ status: "published" })
              .in("id", productIds);

          if (productError) {
            throw productError;
          }
        }
      }

      const { error } = await supabase
        .from("creators")
        .update({ status: nextStatus })
        .eq("id", creator.id);

      if (error) {
        throw error;
      }

      await loadCreators();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : `Could not ${action} creator.`
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // EDIT CREATOR
  // -----------------------------

  async function editCreator(creator: Creator) {
    setLoading(true);
    setError("");

    try {
      const { data: gear, error: gearError } = await supabase
        .from("creator_gear")
        .select(`
          product_id,
          products (
            id,
            name,
            product_type_id
          )
        `)
        .eq("creator_id", creator.id);

      if (gearError) {
        throw gearError;
      }

      const loadedProducts: ProductForm[] = [];

      for (const item of gear || []) {
        const productData = item.products as unknown as {
          id: string;
          name: string;
          product_type_id: string;
        } | null;

        if (!productData) {
          continue;
        }

        const { data: links, error: linksError } = await supabase
          .from("affiliate_links")
          .select("id, retailer_id, affiliate_url")
          .eq("product_id", productData.id);

        if (linksError) {
          throw linksError;
        }

        const convertedLinks: AffiliateLink[] =
          (links || []).map((link) => {
            const retailer = retailers.find(
              (item) => item.id === link.retailer_id
            );

            return {
              id: link.id,
              retailer_id: retailer?.name || "",
              affiliate_url: link.affiliate_url || "",
            };
          });

        loadedProducts.push({
          id: productData.id,
          name: productData.name,
          product_type_id: productData.product_type_id || "",
          links:
            convertedLinks.length > 0
              ? convertedLinks
              : [newAffiliateLink()],
        });
      }

      setName(creator.name);
      setBio(creator.bio || "");
      setCountry(creator.country_name || "");
      setFollowerCount(
        creator.follower_count?.toString() || ""
      );

      setProducts(
        loadedProducts.length > 0
          ? loadedProducts
          : [newProduct()]
      );

      setEditingCreatorId(creator.id);
      setShowForm(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load creator."
      );
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // FORMAT FOLLOWERS
  // -----------------------------

  function formatFollowers(
    value: number | null
  ) {
    if (value === null) {
      return "—";
    }

    if (value >= 1_000_000_000) {
      return `${(
        value / 1_000_000_000
      ).toFixed(1)}B`;
    }

    if (value >= 1_000_000) {
      return `${(
        value / 1_000_000
      ).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `${(
        value / 1_000
      ).toFixed(1)}K`;
    }

    return value.toLocaleString();
  }

  const filteredCreators = creators.filter((creator) => {
    const query = creatorSearch.trim().toLocaleLowerCase();
    const matchesQuery =
      !query ||
      creator.name.toLocaleLowerCase().includes(query) ||
      (creator.country_name || "").toLocaleLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || creator.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Creators</h1>

          <p>
            Manage creators, products and
            affiliate links.
          </p>
        </div>

        <button
          type="button"
          onClick={
            showForm
              ? closeForm
              : openAddForm
          }
        >
          {showForm
            ? "Cancel"
            : "+ Add Creator"}
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* FORM */}

      {showForm && (
        <div className="form-card">
          <h2>
            {editingCreatorId
              ? "Edit Creator"
              : "Add Creator"}
          </h2>

          <form onSubmit={saveCreator}>
            {/* CREATOR NAME */}

            <div className="form-field">
              <label>
                Creator Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="e.g. MrBeast"
                required
              />
            </div>

            {/* BIO */}

            <div className="form-field">
              <label>Bio</label>

              <textarea
                value={bio}
                onChange={(e) =>
                  setBio(e.target.value)
                }
                placeholder="Short description about the creator"
                rows={4}
              />
            </div>

            {/* COUNTRY */}

            <div className="form-field">
              <label>Country</label>

              <input
                type="text"
                value={country}
                onChange={(e) =>
                  setCountry(e.target.value)
                }
                placeholder="e.g. India"
              />
            </div>

            {/* FOLLOWERS */}

            <div className="form-field">
              <label>
                Subscribers / Followers
              </label>

              <input
                type="number"
                min="0"
                value={followerCount}
                onChange={(e) =>
                  setFollowerCount(
                    e.target.value
                  )
                }
                placeholder="e.g. 450000000"
              />
            </div>

            {/* PRODUCTS */}

            <div className="products-section">
              <div className="section-heading">
                <h3>Products</h3>

                <p>
                  Add the gear this creator
                  uses or has publicly
                  mentioned.
                </p>
              </div>

              {products.map(
                (product, productIndex) => (
                  <div
                    className="product-card"
                    key={product.id || `new-product-${productIndex}`}
                  >
                    <div className="product-card-header">
                      <h3>
                        Product{" "}
                        {productIndex + 1}
                      </h3>

                      {products.length > 1 && (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() =>
                            removeProduct(
                              productIndex
                            )
                          }
                        >
                          Remove Product
                        </button>
                      )}
                    </div>

                    {/* PRODUCT TYPE */}

                    <div className="form-field">
                      <label>
                        Product Type
                      </label>

                      <select
                        value={product.product_type_id}
                        onChange={(e) =>
                          setProducts((current) =>
                            current.map((item, index) =>
                              index === productIndex
                                ? {
                                  ...item,
                                  product_type_id: e.target.value,
                                }
                                : item
                            )
                          )
                        }
                      >
                        <option value="">
                          Select product type
                        </option>

                        {productTypes.map((type) => (
                          <option
                            key={type.id}
                            value={type.id}
                          >
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PRODUCT NAME */}

                    <div className="form-field">
                      <label>
                        Product Name
                      </label>

                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) =>
                          updateProductName(
                            productIndex,
                            e.target.value
                          )
                        }
                        placeholder="e.g. ASUS TUF F16"
                      />
                    </div>

                    {/* AFFILIATE LINKS */}

                    <div className="affiliate-section">
                      <div className="section-heading">
                        <h4>
                          Affiliate Links
                        </h4>

                        <p>
                          Add different stores for this product.
                        </p>
                      </div>

                      {product.links.map(
                        (
                          link,
                          linkIndex
                        ) => (
                          <div
                            className="affiliate-card"
                            key={
                              link.id ||
                              `new-link-${productIndex}-${linkIndex}`
                            }
                          >
                            <div className="affiliate-card-header">
                              <strong>
                                Affiliate Link{" "}
                                {linkIndex +
                                  1}
                              </strong>

                              {product
                                .links
                                .length >
                                1 && (
                                  <button
                                    type="button"
                                    className="remove-link"
                                    onClick={() =>
                                      removeAffiliateLink(
                                        productIndex,
                                        linkIndex
                                      )
                                    }
                                  >
                                    Remove
                                  </button>
                                )}
                            </div>

                            <div className="form-field">
                              <label>Retailer</label>

                              <input
                                type="text"
                                value={link.retailer_id}
                                onChange={(e) =>
                                  updateAffiliateLink(
                                    productIndex,
                                    linkIndex,
                                    "retailer_id",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g. Amazon"
                              />
                            </div>

                            <div className="form-field">
                              <label>
                                Affiliate URL
                              </label>

                              <input
                                type="url"
                                value={
                                  link.affiliate_url
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateAffiliateLink(
                                    productIndex,
                                    linkIndex,
                                    "affiliate_url",
                                    e.target
                                      .value
                                  )
                                }
                                placeholder="https://..."
                              />
                            </div>
                          </div>
                        )
                      )}

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          addAffiliateLink(
                            productIndex
                          )
                        }
                      >
                        + Add Affiliate Link
                      </button>
                    </div>
                  </div>
                )
              )}

              <button
                type="button"
                className="secondary-button add-product"
                onClick={addProduct}
              >
                + Add Product
              </button>
            </div>

            {/* SAVE */}

            <div className="form-actions">
              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : editingCreatorId
                    ? "Update Creator"
                    : "Save Creator"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATOR TABLE */}

      <div className="creator-toolbar">
        <input
          type="search"
          value={creatorSearch}
          onChange={(event) => setCreatorSearch(event.target.value)}
          placeholder="Search creators or countries"
          aria-label="Search creators or countries"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter creators by status"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <span>{filteredCreators.length} of {creators.length} creators</span>
      </div>

      <div className="table-card">
        {creators.length === 0 ? (
          <div className="empty-state">
            <h3>
              No creators yet
            </h3>

            <p>
              Add your first creator to
              get started.
            </p>
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="empty-state">
            <h3>No matching creators</h3>
            <p>Try another search or status filter.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Creator</th>
                <th>Country</th>
                <th>Followers</th>
                <th>Status</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredCreators.map(
                (creator) => (
                  <tr key={creator.id}>
                    <td>
                      <strong>
                        {creator.name}
                      </strong>
                    </td>

                    <td>
                      {creator.country_name ||
                        "—"}
                    </td>

                    <td>
                      {formatFollowers(
                        creator.follower_count
                      )}
                    </td>

                    <td>
                      <span className="status">
                        {creator.status}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        creator.created_at
                      ).toLocaleDateString()}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            editCreator(
                              creator
                            )
                          }
                          disabled={loading}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            toggleCreatorPublishStatus(
                              creator
                            )
                          }
                          disabled={loading}
                        >
                          {creator.status === "published"
                            ? "Unpublish"
                            : "Publish"}
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            removeCreator(
                              creator
                            )
                          }
                          disabled={loading}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
