import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer", "chef", "delivery"], required: true },
  phone: { type: String, default: "" },
  address: { type: String, default: "" }
}, { timestamps: true });

const foodSchema = new mongoose.Schema({
  chef: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true, min: 1 },
  category: { type: String, default: "Homemade" },
  imageUrl: { type: String, default: "" },
  available: { type: Boolean, default: true },
  quantityAvailable: { type: Number, default: 10, min: 0 }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  chef: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  items: [{
    food: { type: mongoose.Schema.Types.ObjectId, ref: "Food", required: true },
    name: String,
    quantity: { type: Number, min: 1, required: true },
    price: { type: Number, min: 0, required: true }
  }],
  total: { type: Number, required: true },
  deliveryAddress: { type: String, required: true },
  status: {
    type: String,
    enum: ["Placed", "Accepted", "Preparing", "Ready for pickup", "Picked up", "Delivered", "Cancelled"],
    default: "Placed"
  }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
export const Food = mongoose.model("Food", foodSchema);
export const Order = mongoose.model("Order", orderSchema);
