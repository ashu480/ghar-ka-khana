import React, { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const money = n => `₹${Number(n).toFixed(0)}`;
const getSaved = () => { try { return JSON.parse(localStorage.getItem("gkk_user")); } catch { return null; } };

export default function App() {
  const [session, setSession] = useState(getSaved);
  const [foods, setFoods] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [modal, setModal] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const headers = () => ({ "Content-Type": "application/json", ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) });
  async function request(path, options = {}) {
    const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers(), ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  }
  async function loadFoods() { try { setFoods(await request("/api/foods")); } catch (e) { setNotice(e.message); } }
  async function loadOrders() { if (session) try { setOrders(await request("/api/orders/mine")); } catch (e) { setNotice(e.message); } }
  useEffect(() => { loadFoods(); }, []);
  useEffect(() => { loadOrders(); }, [session]);

  function login(data) {
    const saved = { ...data };
    localStorage.setItem("gkk_user", JSON.stringify(saved));
    setSession(saved); setModal(""); setNotice(`Welcome, ${saved.user.name}!`);
  }
  function logout() { localStorage.removeItem("gkk_user"); setSession(null); setOrders([]); setCart([]); setNotice("You have logged out."); }
  const filtered = useMemo(() => foods.filter(f => `${f.name} ${f.description} ${f.category} ${f.chef?.name || ""}`.toLowerCase().includes(query.toLowerCase())), [foods, query]);
  const cartTotal = cart.reduce((s, x) => s + x.price * x.quantity, 0);

  async function placeOrder() {
    const address = session?.user?.address || prompt("Enter your delivery address:");
    if (!address) return;
    setBusy(true);
    try {
      await request("/api/orders", { method: "POST", body: JSON.stringify({ items: cart.map(x => ({ foodId: x._id, quantity: x.quantity })), deliveryAddress: address }) });
      setCart([]); setNotice("Order placed! The home chef will update its status."); await loadOrders();
    } catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }

  async function updateStatus(id, status) {
    try { await request(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); setNotice("Order status updated."); await loadOrders(); }
    catch (e) { setNotice(e.message); }
  }

  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-icon">घर</span><span>Ghar Ka <b>Khana</b><small>Homemade happiness</small></span></a>
      <div className="nav-actions">
        <a href="#menu">Explore food</a>
        {session ? <><span className="user-tag">{session.user.name} · {session.user.role}</span><button className="outline small" onClick={logout}>Log out</button></> :
          <><button className="outline" onClick={() => setModal("login")}>Log in</button><button className="primary small" onClick={() => setModal("register")}>Join us</button></>}
      </div>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">A little taste of home</span>
          <h1>Ghar jaisa khana.<br/><em>Har din, har bite.</em></h1>
          <p>Discover delicious homemade meals made with care by home chefs in your neighbourhood.</p>
          <a className="primary link-button" href="#menu">Explore homemade food <span>→</span></a>
          <div className="hero-trust"><span>♥ Made with care</span><span>✦ Local home chefs</span></div>
        </div>
        <div className="hero-art">
          <div className="food-circle"><span>🍛</span></div>
          <div className="floating-note note-one">🥘 Freshly cooked</div>
          <div className="floating-note note-two">♡ Made at home</div>
          <div className="hero-spark">✳</div>
        </div>
      </section>

      <section className="how">
        <div><span className="eyebrow">Simple & lovely</span><h2>Good food brings us together.</h2></div>
        <div className="how-grid"><article><b>01</b><span>🔎</span><h3>Discover</h3><p>Find home chefs and dishes around you.</p></article><article><b>02</b><span>🛍️</span><h3>Order</h3><p>Choose your favourites and place an order.</p></article><article><b>03</b><span>🛵</span><h3>Enjoy</h3><p>Get a little homemade goodness delivered.</p></article></div>
      </section>

      <section id="menu" className="menu-section">
        <div className="section-heading"><div><span className="eyebrow">Made in real home kitchens</span><h2>Explore homemade food</h2><p>Every dish has a home and a story.</p></div><input className="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search dishes or chefs..." /></div>
        <div className="food-grid">
          {filtered.map(food => <article className="food-card" key={food._id}>
            <div className="food-photo">{food.imageUrl ? <img src={food.imageUrl} alt={food.name}/> : <span>🍲</span>}<label>{food.category || "Homemade"}</label></div>
            <div className="food-info"><div><h3>{food.name}</h3><p>By {food.chef?.name || "Local home chef"}</p></div><strong>{money(food.price)}</strong></div>
            <p className="description">{food.description || "Freshly prepared homemade goodness."}</p>
            <button className="primary add-button" disabled={!session || session.user.role !== "customer"} onClick={() => setCart(old => {
              const found = old.find(x => x._id === food._id);
              return found ? old.map(x => x._id === food._id ? { ...x, quantity: x.quantity + 1 } : x) : [...old, { ...food, quantity: 1 }];
            })}>{!session ? "Log in to order" : session.user.role !== "customer" ? "Customer account needed" : "Add to cart +"}</button>
          </article>)}
          {!filtered.length && <div className="empty">No dishes found yet. Home chefs can add the first dish after signing in.</div>}
        </div>
      </section>

      <section className="join-banner"><div><span className="eyebrow">Your kitchen can go places</span><h2>Cook with love.<br/>Earn with pride.</h2><p>Turn your special homemade recipes into an opportunity.</p></div><button className="light-button" onClick={() => setModal("register-chef")}>Become a home chef →</button></section>

      {session && <section className="dashboard">
        <div className="section-heading"><div><span className="eyebrow">Your space</span><h2>{session.user.role === "chef" ? "Home chef dashboard" : session.user.role === "delivery" ? "Delivery dashboard" : "Your orders"}</h2></div><button className="outline small" onClick={loadOrders}>Refresh</button></div>
        {session.user.role === "chef" && <ChefForm request={request} onDone={async () => { await loadFoods(); setNotice("Your dish is now listed."); }} />}
        {session.user.role === "customer" && <div className="cart-box"><h3>Your cart ({cart.reduce((s,x)=>s+x.quantity,0)} items)</h3>{cart.length ? <>{cart.map(x => <p key={x._id}>{x.name} × {x.quantity} <b>{money(x.price*x.quantity)}</b></p>)}<h3>Total: {money(cartTotal)}</h3><button className="primary" disabled={busy} onClick={placeOrder}>{busy ? "Placing..." : "Place order"}</button></> : <p>Your cart is waiting for something delicious.</p>}</div>}
        <div className="orders">{orders.map(order => <article className="order-card" key={order._id}><div><b>Order #{order._id.slice(-6).toUpperCase()}</b><p>{order.items.map(i => `${i.name} × ${i.quantity}`).join(", ")}</p><small>{order.customer?.name ? `Customer: ${order.customer.name} · ` : ""}{new Date(order.createdAt).toLocaleString()}</small></div><div className="order-side"><strong>{money(order.total)}</strong><span className="status">{order.status}</span>{session.user.role === "chef" && <select value={order.status} onChange={e => updateStatus(order._id,e.target.value)}><option>Placed</option><option>Accepted</option><option>Preparing</option><option>Ready for pickup</option><option>Cancelled</option></select>}{session.user.role === "delivery" && <select value={order.status} onChange={e => updateStatus(order._id,e.target.value)}><option>Ready for pickup</option><option>Picked up</option><option>Delivered</option></select>}</div></article>)}
        {!orders.length && <p className="muted">No orders yet.</p>}</div>
      </section>}
    </main>

    <footer><a className="brand" href="#"><span className="brand-icon">घर</span><span>Ghar Ka <b>Khana</b><small>Homemade happiness</small></span></a><p>Good food. Good people. A little taste of home.</p><small>© 2026 Ghar Ka Khana · Starter project</small></footer>
    {notice && <button className="toast" onClick={() => setNotice("")}>{notice}　×</button>}
    {modal && <AuthModal mode={modal} close={() => setModal("")} onSuccess={login} />}
  </div>;
}

function ChefForm({ request, onDone }) {
  const [form, setForm] = useState({ name:"", description:"", price:"", category:"Homemade", imageUrl:"", quantityAvailable:10 });
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault(); setError("");
    try { await request("/api/foods", { method:"POST", body:JSON.stringify(form) }); setForm({ name:"", description:"", price:"", category:"Homemade", imageUrl:"", quantityAvailable:10 }); onDone(); }
    catch (e) { setError(e.message); }
  }
  return <form className="chef-form" onSubmit={submit}><h3>Add a dish to your menu</h3><div className="form-grid">
    <input required placeholder="Food name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
    <input required type="number" min="1" placeholder="Price (₹)" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
    <input placeholder="Category (e.g. Thali, Snacks)" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
    <input type="number" min="0" placeholder="Quantity available" value={form.quantityAvailable} onChange={e=>setForm({...form,quantityAvailable:e.target.value})}/>
    <input className="wide" placeholder="Food photo URL (optional)" value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})}/>
    <textarea className="wide" placeholder="Describe your dish..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
  </div>{error && <p className="error">{error}</p>}<button className="primary">Publish dish</button></form>;
}

function AuthModal({ mode, close, onSuccess }) {
  const [role, setRole] = useState(mode === "register-chef" ? "chef" : "customer");
  const [form, setForm] = useState({ name:"", email:"", password:"", phone:"", address:"" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const registering = mode !== "login";
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = await fetch(`${API}/api/auth/${registering ? "register" : "login"}`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify(registering ? {...form,role} : {email:form.email,password:form.password})
      });
      const data = await res.json(); if (!res.ok) throw new Error(data.message || "Could not continue.");
      onSuccess(data);
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><form className="modal" onSubmit={submit}>
    <button type="button" className="close" onClick={close}>×</button><span className="eyebrow">{registering ? "Join our community" : "Welcome back"}</span><h2>{registering ? "Create your account" : "Log in"}</h2>
    {registering && <div className="role-picker">{[["customer","Customer"],["chef","Home chef"],["delivery","Delivery partner"]].map(([v,l])=><button type="button" className={role===v?"selected":""} onClick={()=>setRole(v)} key={v}>{l}</button>)}</div>}
    {registering && <input required placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>}
    <input required type="email" placeholder="Email address" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
    <input required type="password" minLength="8" placeholder="Password (minimum 8 characters)" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
    {registering && <><input placeholder="Phone number (optional)" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><input placeholder="Address (optional)" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></>}
    {error && <p className="error">{error}</p>}<button className="primary full" disabled={busy}>{busy ? "Please wait..." : registering ? "Create account" : "Log in"}</button>
  </form></div>;
}
