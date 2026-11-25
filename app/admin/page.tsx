import { notFound } from "next/navigation";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { MARKUP_PERCENT, markupFor, money, shopperPrice } from "@/lib/pricing";
import { OCCASIONS, STYLES } from "@/lib/types";
import { markShipped, saveProduct, setActive } from "./actions";

// Your own back office: orders to buy and ship, and the product list.
// Only emails in ADMIN_EMAILS can open it.
export default async function Admin() {
  const { user } = await requireUser();
  if (!isAdmin(user)) notFound();
  const db = supabaseAdmin();
  const { data: toShip } = await db.from("orders").select("id, product, ship_to, recipient_name, created_at")
    .eq("status", "ordered").like("fulfillment_ref", "manual:%").order("created_at");
  const { data: atCj } = await db.from("orders").select("id, product, recipient_name, fulfillment_ref, created_at")
    .eq("status", "ordered").like("fulfillment_ref", "cj:%").order("created_at", { ascending: false }).limit(20);
  const { data: products } = await db.from("products").select("sku, name, emoji, price_cents, styles, occasions, active").order("name");

  return (
    <main className="stack">
      <h1>Admin</h1>

      <section className="stack">
        <h2>To ship ({toShip?.length ?? 0})</h2>
        {!toShip?.length && <p className="muted">Nothing waiting.</p>}
        {(toShip ?? []).map((o) => (
          <form key={o.id} action={markShipped} className="card">
            <input type="hidden" name="id" value={o.id} />
            <strong>{o.product.name}</strong>
            <span className="muted">For {o.recipient_name ?? "someone"}{o.product.message ? `, note: "${o.product.message}"` : ""}</span>
            {o.ship_to && <span>{[o.ship_to.name, o.ship_to.line1, o.ship_to.line2, `${o.ship_to.city}, ${o.ship_to.state} ${o.ship_to.postal_code}`].filter(Boolean).join(", ")}</span>}
            <button className="btn ghost" type="submit">Mark shipped</button>
          </form>
        ))}
      </section>

      <section className="stack">
        <h2>Sent to CJdropshipping ({atCj?.length ?? 0})</h2>
        <p className="muted">
          {process.env.CJ_AUTO_PAY === "1"
            ? "Paid from your CJ balance as each order comes in."
            : "Waiting for you to pay them in CJ, under My Orders."}
        </p>
        {(atCj ?? []).map((o) => (
          <div key={o.id} className="card">
            <strong>{o.product.name}</strong>
            <span className="muted">For {o.recipient_name ?? "someone"} · CJ order {String(o.fulfillment_ref).slice(3)}</span>
          </div>
        ))}
      </section>

      <section className="stack">
        <h2>Add or update a product</h2>
        <form action={saveProduct} className="card stack">
          <div className="row">
            <label style={{ flex: 1 }}>Product id<input name="sku" required placeholder="spa-set" /></label>
            <label style={{ flex: 3 }}>Name<input name="name" required /></label>
          </div>
          <div className="row">
            <label>Source price ($)<input name="price" type="number" step="0.01" required title="What the supplier charges you, shipping included. Shoppers pay this plus your markup." /></label>
            <label>Emoji<input name="emoji" maxLength={8} placeholder="🎁" style={{ width: 70 }} /></label>
            <label>Ages<span className="row"><input name="age_min" type="number" defaultValue={0} style={{ width: 70 }} /> to <input name="age_max" type="number" defaultValue={120} style={{ width: 70 }} /></span></label>
            <label>For<select name="sex" defaultValue="any"><option value="any">Anyone</option><option value="f">Her</option><option value="m">Him</option></select></label>
          </div>
          <label>Interests, comma separated<input name="tags" placeholder="coffee, home" /></label>
          <span className="muted">Styles</span>
          <div className="chips">{STYLES.map((s) => <label key={s} className="chip" style={{ flexDirection: "row" }}><input type="checkbox" name="styles" value={s} /> {s}</label>)}</div>
          <span className="muted">Occasions (leave all off for any occasion)</span>
          <div className="chips">{OCCASIONS.map((s) => <label key={s} className="chip" style={{ flexDirection: "row" }}><input type="checkbox" name="occasions" value={s} /> {s}</label>)}</div>
          <div className="row">
            <label style={{ flex: 2 }}>Image address<input name="image_url" /></label>
            <label>Shipped by<select name="ships_by" defaultValue="supplier"><option value="self">Me</option><option value="supplier">Supplier drop-ships</option></select></label>
            <label>Supplier&rsquo;s product id<input name="supplier_ref" placeholder="CJ variant id (vid)" title="For CJdropshipping, the variant id (vid) of the exact item. Orders for it go to CJ automatically." /></label>
          </div>
          <label>Description<textarea name="description" rows={2} /></label>
          <button className="btn" type="submit">Save product</button>
        </form>
      </section>

      <section className="stack">
        <h2>Products ({products?.length ?? 0})</h2>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th align="left">Name</th><th align="right">Source</th><th align="right">Shopper pays</th><th align="right">Your {MARKUP_PERCENT}%</th><th align="left">Styles</th><th /></tr></thead>
            <tbody>
              {(products ?? []).map((p) => (
                <tr key={p.sku} style={{ opacity: p.active ? 1 : 0.5 }}>
                  <td>{p.emoji ? `${p.emoji} ` : ""}{p.name}</td>
                  <td align="right">{money(p.price_cents)}</td>
                  <td align="right">{money(shopperPrice(p.price_cents))}</td>
                  <td align="right">{money(markupFor(p.price_cents))}</td>
                  <td>{p.styles.join(", ")}</td>
                  <td>
                    <form action={setActive}>
                      <input type="hidden" name="sku" value={p.sku} /><input type="hidden" name="active" value={String(!p.active)} />
                      <button className="btn ghost" type="submit">{p.active ? "Hide" : "Show"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
