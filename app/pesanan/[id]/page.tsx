
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import OrderForm from "./OrderForm";

export const instant = false;

type ProductVariant = {
  name: string;
  price: number;
};

type Product = {
  id: string;
  name: string;
  price: number;
  seller: string;
  whatsapp_number: string | null;
  variants: ProductVariant[] | null;
  deleted_at: string | null;
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, price, seller, whatsapp_number, variants, deleted_at"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("Gagal memuat produk untuk pemesanan.");
  }

  if (!data) {
    notFound();
  }

  const product = data as Product;
  const variants = (product.variants ?? []).filter(
    (variant) =>
      typeof variant.name === "string" &&
      variant.name.trim() !== "" &&
      Number.isFinite(variant.price) &&
      variant.price >= 0
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <a
          href={`/produk/${product.id}`}
          className="text-sm font-semibold text-[#176b45] hover:underline"
        >
          ← Kembali ke produk
        </a>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 sm:p-7">
          <h1 className="text-2xl font-bold text-gray-900">
            Formulir Pesanan
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Isi data pembeli dan detail pesanan agar penjual dapat
            mengenali pesananmu.
          </p>

          <OrderForm
            product={{
              id: product.id,
              name: product.name,
              price: product.price,
              seller: product.seller,
              whatsappNumber: product.whatsapp_number ?? "",
              variants,
            }}
          />
        </div>
      </div>
    </main>
  );
}
