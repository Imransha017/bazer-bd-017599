import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const addressSchema = z.object({
  fullName: z.string().trim().min(3).max(80),
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/),
  region: z.string().trim().min(1),
  city: z.string().trim().min(1),
  address: z.string().trim().min(5).max(200),
});

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  price: z.number().nonnegative(),
  qty: z.number().int().min(1).max(99),
});

const checkoutSchema = z.object({
  address: addressSchema,
  payment: z.enum(["cod", "bkash", "nagad", "rocket", "card"]),
  items: z.array(itemSchema).min(1).max(100),
  subtotal: z.number().nonnegative(),
  shippingFee: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export type CheckoutPayload = z.infer<typeof checkoutSchema>;

export const validateCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data }) => {
    const computedSubtotal = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    if (Math.abs(computedSubtotal - data.subtotal) > 0.01) {
      throw new Error("Subtotal mismatch — please refresh and try again");
    }
    const baseShipping = data.address.region === "Dhaka" ? 70 : 120;
    // Allow either the standard delivery charge OR 0 (free-shipping voucher applied)
    const validShipping = data.shippingFee === baseShipping || data.shippingFee === 0;
    if (!validShipping) {
      throw new Error(`Delivery charge mismatch — expected ৳${baseShipping} for ${data.address.region}`);
    }
    const computedTotal = Math.max(0, data.subtotal + data.shippingFee - data.discount);
    if (Math.abs(computedTotal - data.total) > 0.01) {
      throw new Error(`Grand total mismatch — expected ৳${computedTotal.toFixed(2)}`);
    }
    return { ok: true as const, address: data.address };
  });
