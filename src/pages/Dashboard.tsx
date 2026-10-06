import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Profile = {
  full_name: string | null;
  role: string;
};

type Counts = {
  creators: number;
  products: number;
  gear: number;
  affiliateLinks: number;
};

type RecentCreator = {
  id: string;
  name: string;
  country_name: string | null;
  follower_count: number | null;
  created_at: string;
};

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [counts, setCounts] = useState<Counts>({
    creators: 0,
    products: 0,
    gear: 0,
    affiliateLinks: 0,
  });

  const [recentCreators, setRecentCreators] = useState<
    RecentCreator[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("No authenticated user found.");
      }

      // -----------------------------
      // PROFILE
      // -----------------------------

      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();

      if (profileError) {
        throw profileError;
      }

      setProfile(profileData);

      // -----------------------------
      // COUNTS
      // -----------------------------

      const [
        creators,
        products,
        gear,
        affiliateLinks,
      ] = await Promise.all([
        supabase
          .from("creators")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("products")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("creator_gear")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("affiliate_links")
          .select("*", {
            count: "exact",
            head: true,
          }),
      ]);

      if (creators.error) throw creators.error;
      if (products.error) throw products.error;
      if (gear.error) throw gear.error;
      if (affiliateLinks.error) {
        throw affiliateLinks.error;
      }

      setCounts({
        creators: creators.count ?? 0,
        products: products.count ?? 0,
        gear: gear.count ?? 0,
        affiliateLinks:
          affiliateLinks.count ?? 0,
      });

      // -----------------------------
      // RECENT CREATORS
      // -----------------------------

      const {
        data: recentData,
        error: recentError,
      } = await supabase
        .from("creators")
        .select(
          "id, name, country_name, follower_count, created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(5);

      if (recentError) {
        throw recentError;
      }

      setRecentCreators(recentData || []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  function formatFollowers(value: number | null) {
    if (value === null) {
      return "—";
    }

    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }

    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }

    return value.toLocaleString();
  }

  return (
    <div className="page dashboard-page">
      {/* HEADER */}

      <div className="page-header">
        <div>
          <h1>Dashboard</h1>

          <p>
            Overview of your CreatorGear database.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/* WELCOME */}

      <section className="dashboard-welcome">
        <div>
          <p className="dashboard-eyebrow">
            CreatorGear Admin
          </p>

          <h2>
            Welcome
            {profile?.full_name
              ? `, ${profile.full_name}`
              : ""}
          </h2>

          <p>
            Manage creators, products and affiliate
            information from one place.
          </p>
        </div>

        {profile && (
          <div className="dashboard-role">
            <span>Role</span>
            <strong>{profile.role}</strong>
          </div>
        )}
      </section>

      {/* STATS */}

      <section className="dashboard-stats">
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-label">
            Creators
          </div>

          <div className="dashboard-stat-value">
            {loading ? "—" : counts.creators}
          </div>

          <div className="dashboard-stat-description">
            Creators in your database
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-label">
            Products
          </div>

          <div className="dashboard-stat-value">
            {loading ? "—" : counts.products}
          </div>

          <div className="dashboard-stat-description">
            Gear and products tracked
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-label">
            Gear Entries
          </div>

          <div className="dashboard-stat-value">
            {loading ? "—" : counts.gear}
          </div>

          <div className="dashboard-stat-description">
            Creator-product connections
          </div>
        </div>

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-label">
            Affiliate Links
          </div>

          <div className="dashboard-stat-value">
            {loading ? "—" : counts.affiliateLinks}
          </div>

          <div className="dashboard-stat-description">
            Active shopping links
          </div>
        </div>
      </section>

      {/* RECENT CREATORS */}

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h2>Recently Added Creators</h2>

            <p>
              The latest creators added to CreatorGear.
            </p>
          </div>
        </div>

        <div className="table-card">
          {loading ? (
            <div className="dashboard-empty">
              Loading creators...
            </div>
          ) : recentCreators.length === 0 ? (
            <div className="dashboard-empty">
              <strong>No creators yet</strong>
              <span>
                Add your first creator from the
                Creators section.
              </span>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Country</th>
                  <th>Followers</th>
                  <th>Added</th>
                </tr>
              </thead>

              <tbody>
                {recentCreators.map((creator) => (
                  <tr key={creator.id}>
                    <td>
                      <strong>
                        {creator.name}
                      </strong>
                    </td>

                    <td>
                      {creator.country_name || "—"}
                    </td>

                    <td>
                      {formatFollowers(
                        creator.follower_count
                      )}
                    </td>

                    <td>
                      {new Date(
                        creator.created_at
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* DATABASE SUMMARY */}

      <section className="dashboard-section">
        <div className="dashboard-info-card">
          <div>
            <h3>CreatorGear Database</h3>

            <p>
              Your dashboard is connected directly
              to Supabase. Changes made through the
              admin panel are reflected in these
              statistics automatically.
            </p>
          </div>

          <div className="dashboard-summary">
            <div>
              <span>Total tracked records</span>

              <strong>
                {loading
                  ? "—"
                  : counts.creators +
                  counts.products +
                  counts.gear +
                  counts.affiliateLinks}
              </strong>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}