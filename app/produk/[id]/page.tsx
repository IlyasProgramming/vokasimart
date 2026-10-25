
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
  id === "c1944936-af74-4cad-99de-51474f44ce15"
    ? "https://ujvgkurycoybcdmtseff.supabase.co/storage/v1/object/public/product-images/17648218-a69b-4220-96a5-a73043b4c2a9/cookies-compressed.jpg"
    : data.image_urls?.[0] || data.image_url || undefined;

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
            <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
              {images.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-gray-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`${product.name} - foto ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center bg-gray-100 text-6xl">
              {product.emoji || "📦"}
            </div>
          )}

          <div className="p-5 sm:p-7">
            <p className="text-sm text-gray-500">
              {product.category}
            </p>

            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              {product.name}
            </h1>

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
                      <span>{variant.name}</span>
                      <span className="font-semibold text-[#176b45]">
                        {formatPrice(variant.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 block rounded-xl bg-[#176b45] px-4 py-3 text-center font-bold text-white hover:bg-[#125638]"
              >
                Hubungi Penjual via WhatsApp
              </a>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
