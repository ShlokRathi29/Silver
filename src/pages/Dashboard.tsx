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

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [counts, setCounts] = useState<Counts>({
    creators: 0,
    products: 0,
    gear: 0,
    affiliateLinks: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    setProfile(profileData);

    const [
      creators,
      products,
      gear,
      affiliateLinks,
    ] = await Promise.all([
      supabase
        .from("creators")
        .select("*", { count: "exact", head: true }),

      supabase
        .from("products")
        .select("*", { count: "exact", head: true }),

      supabase
        .from("creator_gear")
        .select("*", { count: "exact", head: true }),

      supabase
        .from("affiliate_links")
        .select("*", { count: "exact", head: true }),
    ]);

    setCounts({
      creators: creators.count ?? 0,
      products: products.count ?? 0,
      gear: gear.count ?? 0,
      affiliateLinks: affiliateLinks.count ?? 0,
    });
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="dashboard">
      <header>
        <div>
          <h1>CreatorGear Admin</h1>
          <p>Manage creators, products and affiliate data.</p>
        </div>

        <button onClick={logout}>Logout</button>
      </header>

      <main>
        <section className="welcome">
          <h2>
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
          </h2>

          {profile && (
            <p>
              Role: <strong>{profile.role}</strong>
            </p>
          )}
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>Creators</span>
            <strong>{counts.creators}</strong>
          </div>

          <div className="stat-card">
            <span>Products</span>
            <strong>{counts.products}</strong>
          </div>

          <div className="stat-card">
            <span>Gear Entries</span>
            <strong>{counts.gear}</strong>
          </div>

          <div className="stat-card">
            <span>Affiliate Links</span>
            <strong>{counts.affiliateLinks}</strong>
          </div>
        </section>
      </main>
    </div>
  );
}