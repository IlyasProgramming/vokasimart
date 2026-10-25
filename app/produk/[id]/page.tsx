
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductImageGallery from "./ProductImageGallery";
export const instant = false;

type ProductVariant = {
  name: string;
  price: number;
};

type Product = {
  id: string;
  deleted_at: string | null;
  name: string;
  category: string;
  price: number;
  seller: string;
  image_url: string | null;
  image_urls: string[] | null;
  description: string | null;
  emoji: string | null;
  color: string | null;
  owner_id: string | null;
  whatsapp_number: string | null;
  variants: ProductVariant[] | null;
};


const siteUrl = "https://vokasimartsvipb.netlify.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const { data } = await supabase
    .from("products")
    .select("name, description, image_url, image_urls")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) {
    return {
      title: "Produk tidak ditemukan | VokasiMart",
      description: "Produk ini tidak tersedia di VokasiMart.",
    };
  }

  const image =
  data.image_urls?.[0] || data.image_url || undefined;

  const description =
    data.description?.trim() ||
    `Lihat ${data.name} di VokasiMart, marketplace mahasiswa Sekolah Vokasi IPB.`;

  return {
    title: `${data.name} | VokasiMart`,
    description: description.slice(0, 200),
    openGraph: {
      title: data.name,
      description: description.slice(0, 200),
      url: `${siteUrl}/produk/${id}`,
      siteName: "VokasiMart",
      type: "website",
      ...(image ? { images: [{ url: image, alt: data.name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: data.name,
      description: description.slice(0, 200),
      ...(image ? { images: [image] } : {}),
    },
  };
}


const productColumns =
  "id, name, category, price, seller, image_url, image_urls, description, emoji, color, owner_id, whatsapp_number, variants, deleted_at";

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("products")
    .select(productColumns)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("Gagal memuat detail produk.");
  }

  if (!data) {
    notFound();
  }

  const product = data as Product;
  const images =
    product.image_urls?.length
      ? product.image_urls
      : product.image_url
        ? [product.image_url]
        : [];

  const whatsappNumber = product.whatsapp_number?.replace(
    /\D/g,
    ""
  );

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-block text-sm font-semibold text-[#176b45] hover:underline"
        >
          ← Kembali ke VokasiMart
        </Link>

      <article className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white">
  {images.length > 0 ? (
    <ProductImageGallery
      images={images}
      productName={product.name}
    />
  ) : (
    <div className="flex h-48 items-center justify-center bg-gray-100 text-6xl">
      {product.emoji || "📦"}
    </div>
  )}

  <div className="p-5 sm:p-7">
    <p className="text-sm text-gray-500">
      {product.category}
    </p>

            <p className="mt-3 text-2xl font-bold text-[#176b45]">
              {formatPrice(product.price)}
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Penjual: {product.seller}
            </p>

            {product.description && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <h2 className="font-bold text-gray-900">
                  Deskripsi produk
                </h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                  {product.description}
                </p>
              </div>
            )}

            {product.variants && product.variants.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <h2 className="font-bold text-gray-900">
                  Varian produk
                </h2>
                <ul className="mt-3 space-y-2">
                  {product.variants.map((variant, index) => (
                    <li
                      key={`${variant.name}-${index}`}
                      className="flex justify-between gap-3 rounded-lg bg-gray-50 p-3 text-sm"
                    >
                      <span className="font-medium text-gray-900">
  {variant.name}
</span>
                      <span className="font-semibold text-[#176b45]">
                        {formatPrice(variant.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            


            <div className="mt-6 space-y-3">

              <Link
  href={`/?produk=${product.id}`}
  className="block rounded-xl bg-[#176b45] px-4 py-3 text-center font-bold text-white hover:bg-[#125638]"
>
  Pesan Sekarang/Lihat Detail Produk
</Link>

              <Link
  href="/"
  className="block rounded-xl border border-[#176b45] px-4 py-3 text-center font-bold text-[#176b45] hover:bg-green-50"
>
  Lihat Produk Lainnya
</Link>
            </div>


          </div>
        </article>
      </div>
    </main>
  );
}
