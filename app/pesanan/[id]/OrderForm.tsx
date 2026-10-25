
"use client";

import { useState, type FormEvent } from "react";

type ProductVariant = {
  name: string;
  price: number;
};

type OrderProduct = {
  id: string;
  name: string;
  price: number;
  seller: string;
  whatsappNumber: string;
  variants: ProductVariant[];
};

type OrderLine = {
  id: number;
  variantName: string;
  quantity: number;
};

type Props = {
  product: OrderProduct;
};

const pickupOptions = [
  ...Array.from({ length: 22 }, (_, index) => {
    const startMinutes = 6 * 60 + index * 30;
    const endMinutes = startMinutes + 30;

    const formatTime = (minutes: number) =>
      `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
        minutes % 60
      ).padStart(2, "0")}`;

    return `${formatTime(startMinutes)}–${formatTime(endMinutes)} WIB`;
  }),
  "Pilih sendiri — koordinasi dengan penjual",
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function OrderForm({ product }: Props) {
  const availableVariants =
    product.variants.length > 0
      ? product.variants
      : [{ name: "Reguler", price: product.price }];

  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [pickup, setPickup] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([
    {
      id: 1,
      variantName: availableVariants[0].name,
      quantity: 1,
    },
  ]);
  const [nextId, setNextId] = useState(2);
  const [error, setError] = useState("");

  const totalQuantity = lines.reduce(
    (total, line) => total + line.quantity,
    0
  );

  const totalPrice = lines.reduce((total, line) => {
    const variant = availableVariants.find(
      (item) => item.name === line.variantName
    );

    return total + (variant?.price ?? 0) * line.quantity;
  }, 0);

  function updateLine(id: number, changes: Partial<OrderLine>) {
    setLines((current) =>
      current.map((line) =>
        line.id === id ? { ...line, ...changes } : line
      )
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      {
        id: nextId,
        variantName: availableVariants[0].name,
        quantity: 1,
      },
    ]);
    setNextId((current) => current + 1);
  }

  function removeLine(id: number) {
    setLines((current) => current.filter((line) => line.id !== id));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !className.trim() || !angkatan || !pickup) {
      setError("Mohon lengkapi semua data wajib.");
      return;
    }

    if (
      lines.length === 0 ||
      lines.some(
        (line) =>
          !availableVariants.some(
            (variant) => variant.name === line.variantName
          ) ||
          !Number.isInteger(line.quantity) ||
          line.quantity < 1 ||
          line.quantity > 999
      )
    ) {
      setError("Periksa kembali varian dan jumlah pesanan.");
      return;
    }

    const whatsappNumber = product.whatsappNumber.replace(/\D/g, "");

    if (!/^\d{8,15}$/.test(whatsappNumber)) {
      setError("Nomor WhatsApp penjual belum tersedia atau tidak valid.");
      return;
    }

    const orderDetails = lines
      .map((line, index) => {
        const variant = availableVariants.find(
          (item) => item.name === line.variantName
        )!;

        return [
          `${index + 1}. ${product.name}`,
          `   Varian: ${variant.name}`,
          `   Harga: ${formatPrice(variant.price)}`,
          `   Jumlah: ${line.quantity}`,
          `   Subtotal: ${formatPrice(variant.price * line.quantity)}`,
        ].join("\n");
      })
      .join("\n\n");

    const message = [
      "HALO, SAYA INGIN MEMESAN MELALUI VOKASIMART",
      "",
      `Nama: ${name.trim()}`,
      `Kelas: ${className.trim()}`,
      `Angkatan: ${angkatan}`,
      "",
      "DETAIL PESANAN",
      orderDetails,
      "",
      `Total jumlah: ${totalQuantity} pcs/porsi`,
      `Total sementara: ${formatPrice(totalPrice)}`,
      `Waktu pengambilan: ${pickup}`,
      "",
      `Catatan: ${note.trim() || "-"}`,
      "",
      "Mohon konfirmasi ketersediaan pesanan. Terima kasih.",
    ].join("\n");

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.location.assign(url);
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none focus:border-[#176b45] focus:ring-2 focus:ring-[#176b45]/20";

  return (
    <form onSubmit={handleSubmit} className="mt-7 space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Identitas pembeli
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Isi data ini agar penjual dapat mengenali pesananmu.
          </p>
        </div>

        <div>
          <label htmlFor="buyer-name" className="text-sm font-semibold text-gray-800">
            Atas nama *
          </label>
          <input
            id="buyer-name"
            className={inputClass}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            autoComplete="name"
            required
            placeholder="Nama lengkap"
          />
        </div>

        <div>
          <label htmlFor="buyer-class" className="text-sm font-semibold text-gray-800">
            Kelas *
          </label>
          <input
            id="buyer-class"
            className={inputClass}
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            maxLength={50}
            required
            placeholder="Contoh: AKN 62-1"
          />
        </div>

        <div>
          <label htmlFor="buyer-angkatan" className="text-sm font-semibold text-gray-800">
            Angkatan *
          </label>
          <select
            id="buyer-angkatan"
            className={inputClass}
            value={angkatan}
            onChange={(event) => setAngkatan(event.target.value)}
            required
          >
            <option value="">Pilih angkatan</option>
            {[59, 60, 61, 62, 63].map((year) => (
              <option key={year} value={year}>
                Angkatan {year}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4 border-t border-gray-200 pt-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Detail pesanan
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Setiap baris untuk satu varian. Tambahkan baris jika ingin
            memesan beberapa varian.
          </p>
        </div>

        {lines.map((line, index) => {
          const selectedVariant = availableVariants.find(
            (variant) => variant.name === line.variantName
          )!;

          return (
            <div
              key={line.id}
              className="space-y-4 rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-gray-900">
                  Pesanan {index + 1}
                </h3>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="text-sm font-semibold text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                )}
              </div>

              <div>
                <p className="font-semibold text-gray-900">
                  {product.name}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {formatPrice(selectedVariant.price)} / pcs
                </p>
              </div>

              <div>
                <label
                  htmlFor={`variant-${line.id}`}
                  className="text-sm font-semibold text-gray-800"
                >
                  Rasa atau varian
                </label>
                <select
                  id={`variant-${line.id}`}
                  className={inputClass}
                  value={line.variantName}
                  onChange={(event) =>
                    updateLine(line.id, {
                      variantName: event.target.value,
                    })
                  }
                  required
                >
                  {availableVariants.map((variant, variantIndex) => (
                    <option
                      key={`${variant.name}-${variantIndex}`}
                      value={variant.name}
                    >
                      {variant.name} — {formatPrice(variant.price)}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Pilih varian yang diinginkan dari daftar.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-800">
                  Jumlah pesanan
                </p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center overflow-hidden rounded-lg border border-gray-300">
                    <button
                      type="button"
                      aria-label="Kurangi jumlah"
                      onClick={() =>
                        updateLine(line.id, {
                          quantity: Math.max(1, line.quantity - 1),
                        })
                      }
                      className="px-4 py-2 text-lg text-gray-800 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <span className="min-w-10 text-center font-semibold text-gray-900">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Tambah jumlah"
                      onClick={() =>
                        updateLine(line.id, {
                          quantity: Math.min(999, line.quantity + 1),
                        })
                      }
                      className="px-4 py-2 text-lg text-gray-800 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-right font-bold text-[#176b45]">
                    {formatPrice(selectedVariant.price * line.quantity)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addLine}
          className="w-full rounded-lg border border-dashed border-[#176b45] px-4 py-3 font-semibold text-[#176b45] hover:bg-green-50"
        >
          + Tambah pesanan
        </button>

        <div className="rounded-xl bg-gray-50 p-4">
          <div className="flex justify-between gap-3 text-sm text-gray-700">
            <span>Total jumlah</span>
            <span className="font-semibold">
              {totalQuantity} pcs/porsi
            </span>
          </div>
          <div className="mt-3 flex justify-between gap-3">
            <span className="font-semibold text-gray-800">
              Total sementara
            </span>
            <span className="text-lg font-bold text-[#176b45]">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-gray-500">
            Total dihitung otomatis berdasarkan harga varian dikalikan
            jumlah pada setiap baris pesanan.
          </p>
        </div>
      </section>

      <section className="space-y-4 border-t border-gray-200 pt-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Waktu pengambilan *
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-600">
            Pilih waktu pengambilan dari pukul 06.00 sampai 17.00 WIB.
            Pastikan kembali ketersediaan waktu dengan penjual.
          </p>
        </div>

        <select
          aria-label="Waktu pengambilan"
          className={inputClass}
          value={pickup}
          onChange={(event) => setPickup(event.target.value)}
          required
        >
          <option value="">Pilih waktu pengambilan</option>
          {pickupOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </section>

      <section className="space-y-2 border-t border-gray-200 pt-6">
        <label
          htmlFor="order-note"
          className="text-sm font-semibold text-gray-800"
        >
          Catatan tambahan (opsional)
        </label>
        <textarea
          id="order-note"
          className={inputClass}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={4}
          placeholder="Tulis catatan untuk penjual..."
        />
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}

      <button   
        type="submit"
        className="w-full rounded-xl bg-[#176b45] px-4 py-4 font-bold text-white hover:bg-[#125638] focus:outline-none focus:ring-2 focus:ring-[#176b45] focus:ring-offset-2"
      >
        Konfirmasi Pesanan via WhatsApp
      </button>

      <p className="text-center text-xs leading-5 text-gray-500">
        Pesanan akan diteruskan ke WhatsApp penjual. Pesanan belum
        dianggap terkonfirmasi sebelum disetujui penjual.
      </p>
    </form>
  );
}
