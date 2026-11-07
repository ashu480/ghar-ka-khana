import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Food, Order } from "./models.js";
import { auth, allow } from "./auth.js";

dotenv.config();
const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.json({ message: "Ghar Ka Khana API is running" }));

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;
    if (!name || !email || !password || !["customer", "chef", "delivery"].includes(role))
      return res.status(400).json({ message: "Name, email, password and a valid role are required." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "An account with this email already exists." });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hash, role, phone, address });
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user._id, name, email, role, address } });
  } catch (e) { res.status(500).json({ message: "Could not create account.", error: e.message }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.password)))
      return res.status(401).json({ message: "Incorrect email or password." });
    const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, address: user.address } });
  } catch (e) { res.status(500).json({ message: "Login failed.", error: e.message }); }
});

app.get("/api/foods", async (_req, res) => {
  try {
    const foods = await Food.find({ available: true, quantityAvailable: { $gt: 0 } })
      .populate("chef", "name").sort({ createdAt: -1 });
    res.json(foods);
  } catch (e) { res.status(500).json({ message: "Could not load food.", error: e.message }); }
});

app.post("/api/foods", auth, allow("chef"), async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, quantityAvailable } = req.body;
    if (!name || !Number.isFinite(Number(price)) || Number(price) <= 0)
      return res.status(400).json({ message: "Food name and a valid price are required." });
    const food = await Food.create({
      chef: req.user.id, name, description, price: Number(price), category, imageUrl,
      quantityAvailable: Math.max(0, Number(quantityAvailable ?? 10))
    });
    res.status(201).json(food);
  } catch (e) { res.status(500).json({ message: "Could not add food.", error: e.message }); }
});

app.get("/api/orders/mine", auth, async (req, res) => {
  try {
    const filter = req.user.role === "customer" ? { customer: req.user.id }
      : req.user.role === "chef" ? { chef: req.user.id }
      : { $or: [{ deliveryPartner: req.user.id }, { deliveryPartner: null, status: { $in: ["Accepted", "Preparing", "Ready for pickup"] } }] };
    const orders = await Order.find(filter).populate("customer", "name phone").populate("chef", "name address").sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: "Could not load orders.", error: e.message }); }
});

app.post("/api/orders", auth, allow("customer"), async (req, res) => {
  try {
    const { items, deliveryAddress } = req.body;
    if (!Array.isArray(items) || !items.length || !deliveryAddress)
      return res.status(400).json({ message: "Add food and a delivery address." });
    const detailed = [];
    for (const item of items) {
      const food = await Food.findById(item.foodId);
      const qty = Number(item.quantity);
      if (!food || !food.available || !Number.isInteger(qty) || qty < 1 || qty > food.quantityAvailable)
        return res.status(400).json({ message: "A food item is unavailable or the quantity is invalid." });
      detailed.push({ food: food._id, name: food.name, quantity: qty, price: food.price, chef: food.chef });
    }
    const chefIds = [...new Set(detailed.map(x => String(x.chef)))];
    if (chefIds.length !== 1) return res.status(400).json({ message: "For this starter version, order from one home chef at a time." });
    const total = detailed.reduce((sum, x) => sum + x.price * x.quantity, 0);
    const order = await Order.create({
      customer: req.user.id, chef: chefIds[0],
      items: detailed.map(({ food, name, quantity, price }) => ({ food, name, quantity, price })),
      total, deliveryAddress
    });
    for (const item of detailed) await Food.updateOne({ _id: item.food }, { $inc: { quantityAvailable: -item.quantity } });
    res.status(201).json(order);
  } catch (e) { res.status(500).json({ message: "Could not place order.", error: e.message }); }
});

app.patch("/api/orders/:id/status", auth, async (req, res) => {
  try {
    const allowedStatuses = ["Accepted", "Preparing", "Ready for pickup", "Picked up", "Delivered", "Cancelled"];
    if (!allowedStatuses.includes(req.body.status)) return res.status(400).json({ message: "Invalid status." });
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found." });
    const isChef = req.user.role === "chef" && String(order.chef) === req.user.id;
    const isDelivery = req.user.role === "delivery" &&
      ["Ready for pickup", "Picked up"].includes(order.status);
    if (!isChef && !isDelivery) return res.status(403).json({ message: "You cannot update this order." });
    if (isDelivery && !order.deliveryPartner) order.deliveryPartner = req.user.id;
    order.status = req.body.status;
    await order.save();
    res.json(order);
  } catch (e) { res.status(500).json({ message: "Could not update order.", error: e.message }); }
});

const port = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) throw new Error("Set JWT_SECRET in server/.env");
mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(port, () => console.log(`API running at http://localhost:${port}`)))
  .catch(err => { console.error("MongoDB connection failed:", err.message); process.exit(1); });
