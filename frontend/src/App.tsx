import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

type Product = { id: string; name: string; sku: string; price: string | number; stockQuantity: number; reservedQuantity: number; availableQuantity?: number };
type Cart = { id: string; items: Array<{ productId: string; quantity: number; product: Product }> };
type Order = { id: string; orderNumber: string; status: string; total: string; reservations: Array<{ expiresAt: string }> };

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function api<T>(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || 'Request failed');
  return body.data as T;
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('pos-token') || '');
  const [email, setEmail] = useState('cashier@example.com');
  const [password, setPassword] = useState('password123');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notice, setNotice] = useState('');

  async function load() {
    const [productData, orderData] = await Promise.all([api<{ items: Product[] }>('/products', token), api<Order[]>('/orders', token)]);
    setProducts(productData.items);
    setOrders(orderData);
  }

  useEffect(() => { if (token) load().catch((error) => setNotice(error.message)); }, [token]);

  async function login(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const body = await response.json();
    if (!response.ok) return setNotice(body.message || 'Login failed');
    localStorage.setItem('pos-token', body.data.token); setToken(body.data.token); setNotice('Signed in');
  }

  async function addToCart(productId: string) {
    try {
      const current = cart || await api<Cart>('/carts', token, { method: 'POST', body: '{}' });
      await api(`/carts/${current.id}/items`, token, { method: 'POST', body: JSON.stringify({ productId, quantity: 1 }) });
      setNotice('Item added to cart');
      setCart(await api<Cart>(`/carts/${current.id}`, token));
    } catch (error) { setNotice((error as Error).message); }
  }

  async function checkout() {
    if (!cart) return;
    try { const order = await api<Order>(`/carts/${cart.id}/checkout`, token, { method: 'POST', body: '{}' , headers: { 'Idempotency-Key': crypto.randomUUID() } }); setNotice(`Order ${order.orderNumber} reserved for five minutes`); setCart(null); await load(); }
    catch (error) { setNotice((error as Error).message); }
  }

  if (!token) return <main className="login"><form onSubmit={login}><p className="eyebrow">TECHLOOM POS</p><h1>Run the counter clearly.</h1><label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button>Sign in</button><p className="notice">{notice}</p></form></main>;

  return <main className="shell"><header><div><p className="eyebrow">OPERATIONS / LIVE INVENTORY</p><h1>Point of sale</h1></div><button className="quiet" onClick={() => { localStorage.removeItem('pos-token'); setToken(''); }}>Sign out</button></header><p className="notice">{notice}</p><section className="grid"><div><h2>Products</h2><div className="products">{products.map((product) => <article className="product" key={product.id}><div><strong>{product.name}</strong><small>{product.sku}</small></div><span>${Number(product.price).toFixed(2)}</span><small>{product.availableQuantity ?? product.stockQuantity - product.reservedQuantity} available</small><button disabled={(product.availableQuantity ?? product.stockQuantity - product.reservedQuantity) < 1} onClick={() => addToCart(product.id)}>Add</button></article>)}</div></div><aside><h2>Cart</h2>{cart?.items?.length ? <>{cart.items.map((item) => <p key={item.productId}>{item.product.name} x {item.quantity}</p>)}<button onClick={checkout}>Checkout and reserve</button></> : <p className="muted">No items yet.</p>}<h2>Orders</h2>{orders.map((order) => <div className="order" key={order.id}><strong>{order.orderNumber}</strong><span>{order.status}</span><small>{order.reservations?.[0] ? `Reservation until ${new Date(order.reservations[0].expiresAt).toLocaleTimeString()}` : ''}</small></div>)}</aside></section></main>;
}
