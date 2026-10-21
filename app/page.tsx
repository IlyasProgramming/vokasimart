
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  seller: string;
  image_url: string | null;
  description: string | null;
  emoji: string | null;
  color: string | null;
  owner_id: string | null;
  whatsapp_number: string | null;
  created_at?: string;
};

type ProductForm = {
  name: string;
  category: string;
  price: string;
  seller: string;
  description: string;
  whatsapp_number: string;
  emoji: string;
  color: string;
};

type OrderItem = {
  id: string;
  variant: string;
  quantity: number;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  category: "Makanan",
  price: "",
  seller: "",
  description: "",
  whatsapp_number: "",
  emoji: "🛍️",
  color: "#edf5ec",
};

const CATEGORIES = [
  "Semua",
  "Makanan",
  "Minuman",
  "Fashion",
  "Aksesori",
  "Jasa",
  "Lainnya",
];

const money = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function normalizeWhatsApp(value: string) {
  let number = value.replace(/\D/g, "");

  if (number.startsWith("0")) {
    number = "62" + number.slice(1);
  } else if (number.startsWith("8")) {
    number = "62" + number;
  }

  return number;
}

function makeOrderItem(): OrderItem {
  return {
    id: crypto.randomUUID(),
    variant: "",
    quantity: 1,
  };
}

export default function Home() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");

  const [showSellerForm, setShowSellerForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_FORM);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState("");

  const [showOrder, setShowOrder] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerNote, setBuyerNote] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([
    makeOrderItem(),
  ]);

  const [showAbout, setShowAbout] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setPageError("");

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setPageError(
        "Produk belum dapat dimuat. Periksa koneksi Supabase dan izin akses tabel products."
      );
      console.error("Fetch products error:", error);
      return;
    }

    setProducts((data ?? []) as Product[]);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      setLoading(true);

      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Get session error:", error);
      }

      setUser(data.session?.user ?? null);

      await fetchProducts();

      if (mounted) setLoading(false);
    }

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "Semua" ||
        product.category === activeCategory;

      const searchableText = [
        product.name,
        product.category,
        product.seller,
        product.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && searchableText.includes(keyword);
    });
  }, [products, search, activeCategory]);

  const totalOrder = useMemo(() => {
    return orderItems.reduce(
      (total, item) =>
        total + Math.max(0, Number(item.quantity) || 0) *
          (selectedProduct?.price ?? 0),
      0
    );
  }, [orderItems, selectedProduct]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setPageError("Gagal keluar dari akun: " + error.message);
      return;
    }

    setUser(null);
    setNotice("Kamu berhasil keluar dari akun.");
    setShowSellerForm(false);
    setEditingProduct(null);
  }

  function openNewProductForm() {
    if (!user) {
      router.push("/auth");
      return;
    }

    setEditingProduct(null);
    setProductForm({
      ...EMPTY_FORM,
      seller: user.user_metadata?.full_name ?? "",
    });
    setSelectedImage(null);
    setCurrentImageUrl("");
    setShowSellerForm(true);
    setPageError("");
    setNotice("");
  }

  function openEditProduct(product: Product) {
    if (!user || product.owner_id !== user.id) {
      setPageError("Kamu hanya dapat mengubah produk milik akunmu.");
      return;
    }

    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      seller: product.seller,
      description: product.description ?? "",
      whatsapp_number: product.whatsapp_number ?? "",
      emoji: product.emoji ?? "🛍️",
      color: product.color ?? "#edf5ec",
    });
    setCurrentImageUrl(product.image_url ?? "");
    setSelectedImage(null);
    setShowSellerForm(true);
    setPageError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedImage(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPageError("File harus berupa gambar.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPageError("Ukuran gambar maksimal 5 MB.");
      event.target.value = "";
      return;
    }

    setPageError("");
    setSelectedImage(file);
  }

  async function uploadProductImage(): Promise<string | null> {
    if (!selectedImage || !user) return currentImageUrl || null;

    const extension = selectedImage.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, selectedImage, {
        upsert: false,
        contentType: selectedImage.type,
      });

    if (uploadError) {
      throw new Error(
        "Gagal mengunggah gambar. Periksa bucket product-images dan izin Storage. " +
          uploadError.message
      );
    }

    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");
    setNotice("");

    if (!user) {
      router.push("/auth");
      return;
    }

    const price = Number(productForm.price);

    if (!productForm.name.trim()) {
      setPageError("Nama produk wajib diisi.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setPageError("Harga produk harus berupa angka yang valid.");
      return;
    }

    if (!productForm.seller.trim()) {
      setPageError("Nama penjual wajib diisi.");
      return;
    }

    if (!productForm.whatsapp_number.trim()) {
      setPageError("Nomor WhatsApp penjual wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const imageUrl = await uploadProductImage();

      const payload = {
        name: productForm.name.trim(),
        category: productForm.category,
        price,
        seller: productForm.seller.trim(),
        description: productForm.description.trim() || null,
        whatsapp_number: normalizeWhatsApp(
          productForm.whatsapp_number
        ),
        emoji: productForm.emoji.trim() || "🛍️",
        color: productForm.color || "#edf5ec",
        image_url: imageUrl,
        owner_id: user.id,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id)
          .eq("owner_id", user.id);

        if (error) throw error;

        setNotice("Produk berhasil diperbarui.");
      } else {
        const { error } = await supabase
          .from("products")
          .insert(payload);

        if (error) throw error;

        setNotice("Produk berhasil ditambahkan ke katalog.");
      }

      setShowSellerForm(false);
      setEditingProduct(null);
      setProductForm(EMPTY_FORM);
      setSelectedImage(null);
      setCurrentImageUrl("");

      await fetchProducts();
    } catch (error: any) {
      console.error("Save product error:", error);
      setPageError(
        error?.message ??
          "Produk gagal disimpan. Periksa struktur tabel dan izin Supabase."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(product: Product) {
    if (!user || product.owner_id !== user.id) {
      setPageError("Kamu hanya dapat menghapus produk milik akunmu.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus produk "${product.name}" dari katalog? Tindakan ini tidak dapat dibatalkan.`
    );

    if (!confirmed) return;

    setDeletingId(product.id);
    setPageError("");
    setNotice("");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("owner_id", user.id);

    setDeletingId(null);

    if (error) {
      setPageError("Produk gagal dihapus: " + error.message);
      return;
    }

    setProducts((current) =>
      current.filter((item) => item.id !== product.id)
    );
    setNotice("Produk berhasil dihapus.");
  }

  function openOrder(product: Product) {
    setSelectedProduct(product);
    setBuyerName("");
    setBuyerNote("");
    setOrderItems([makeOrderItem()]);
    setShowOrder(true);
    setPageError("");
  }

  function updateOrderItem(
    id: string,
    field: "variant" | "quantity",
    value: string | number
  ) {
    setOrderItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "quantity"
                  ? Math.max(1, Number(value) || 1)
                  : String(value),
            }
          : item
      )
    );
  }

  function handleWhatsAppOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) return;

    if (!buyerName.trim()) {
      setPageError("Masukkan nama pembeli terlebih dahulu.");
      return;
    }

    const whatsapp = normalizeWhatsApp(
      selectedProduct.whatsapp_number ?? ""
    );

    if (!whatsapp) {
      setPageError("Nomor WhatsApp penjual belum tersedia.");
      return;
    }

    if (
      orderItems.some(
        (item) => !item.variant.trim() || item.quantity < 1
      )
    ) {
      setPageError(
        "Lengkapi nama varian dan jumlah untuk setiap item pesanan."
      );
      return;
    }

    const lines = orderItems.map((item, index) => {
      const subtotal = item.quantity * selectedProduct.price;

      return (
        `${index + 1}. ${selectedProduct.name} — ${item.variant.trim()}\n` +
        `   Jumlah: ${item.quantity}\n` +
        `   Subtotal: ${money(subtotal)}`
      );
    });

    const message = [
      "Halo, saya ingin memesan produk dari VokasiMart.",
      "",
      `Nama pembeli: ${buyerName.trim()}`,
      `Nama penjual: ${selectedProduct.seller}`,
      "",
      "Detail pesanan:",
      ...lines,
      "",
      `Total sementara: ${money(totalOrder)}`,
      buyerNote.trim()
        ? `Catatan: ${buyerNote.trim()}`
        : "",
      "",
      "Mohon konfirmasi ketersediaan produk dan detail pembayarannya. Terima kasih!",
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
      message
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  const teamMembers = [
    { name: "Ayessya Fatma Nandira", nim: "J0414261005" },
    { name: "Ilyas Mufid", nim: "J0414261024" },
    { name: "Rayya Syiffa Dewanti", nim: "J0414261138" },
    { name: "Olivia Dameria Panjaitan", nim: "J0414261175" },
    { name: "Muhammad Fakhri Ramadhan", nim: "J0414261295" },
  ];

  return (
    <main className="min-h-screen bg-[#f7f9f5] text-gray-800">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-2xl font-black tracking-tight text-[#176b45]"
          >
            vokasi<span className="text-[#e9a23b]">mart.</span>
          </button>

          <nav className="hidden items-center gap-6 text-sm font-semibold text-gray-600 md:flex">
            <a href="#beranda" className="hover:text-[#176b45]">
              Beranda
            </a>
            <a href="#produk" className="hover:text-[#176b45]">
              Jelajahi Produk
            </a>
            <button
              type="button"
              onClick={() => setShowAbout(true)}
              className="hover:text-[#176b45]"
            >
              Tentang Kami
            </button>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden max-w-44 truncate text-xs text-gray-500 sm:block">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/auth")}
                className="rounded-full bg-[#176b45] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#105638]"
              >
                Masuk / Daftar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* NOTIFIKASI */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {pageError && (
          <div
            role="alert"
            className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{pageError}</span>
            <button
              type="button"
              onClick={() => setPageError("")}
              aria-label="Tutup pesan error"
              className="font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Tutup pemberitahuan"
              className="font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* HERO */}
      <section
        id="beranda"
        className="relative isolate overflow-hidden bg-[#174b35] text-white"
      >
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{
              backgroundImage: "url('/images/gedungipb.png')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#103d2b]/95 via-[#174b35]/85 to-[#174b35]/55" />
        </div>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-green-100">
              Pilihan Kampus
            </span>

            <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Satu Kampus,
              <br />
              Banyak Peluang.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-white/85 sm:text-lg">
              Belanja sekaligus berdayakan bisnis kecil mahasiswa.
              Temukan usaha teman kampus dan dukung kreativitas
              mahasiswa melalui VokasiMart.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#produk"
                className="rounded-full bg-white px-6 py-3 font-bold text-[#176b45] transition hover:bg-green-50"
              >
                Jelajahi Produk
              </a>

              <button
                type="button"
                onClick={openNewProductForm}
                className="rounded-full border border-white/50 px-6 py-3 font-bold text-white transition hover:bg-white/10"
              >
                + Mulai Berjualan
              </button>
            </div>

            <p className="mt-6 text-sm text-white/65">
              Keluarga Vokasi IPB 🛍️
            </p>
          </div>

          <div className="hidden lg:block">
            <div className="ml-auto max-w-md rounded-3xl border border-white/20 bg-white/10 p-7 shadow-2xl backdrop-blur-md">
              <p className="text-sm font-semibold text-green-100">
                Jelajahi peluang di sekitar kampus
              </p>
              <p className="mt-3 text-3xl font-black">
                Kreativitas jadi peluang.
              </p>
              <p className="mt-4 leading-7 text-white/75">
                Satu tempat untuk mengenal produk, mendukung usaha
                mahasiswa, dan memulai transaksi langsung dengan penjual.
              </p>
              <div className="mt-7 grid grid-cols-3 gap-3">
                {[
                  ["🛍️", "Produk"],
                  ["🤝", "Kolaborasi"],
                  ["🌱", "Berkembang"],
                ].map(([emoji, label]) => (
                  <div
                    key={label}
                    className="rounded-2xl bg-white/10 p-4 text-center"
                  >
                    <p className="text-2xl">{emoji}</p>
                    <p className="mt-2 text-xs font-semibold">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KATALOG */}
      <section
        id="produk"
        className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#218653]">
              Katalog Mahasiswa
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Temukan favoritmu
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
              Jelajahi produk usaha mahasiswa dan hubungi penjual
              secara langsung melalui WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewProductForm}
            className="shrink-0 rounded-full bg-[#176b45] px-5 py-3 text-sm font-bold text-white hover:bg-[#105638]"
          >
            + Tambah Produk
          </button>
        </div>

        {/* PENCARIAN */}
        <div className="mt-8 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              ⌕
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari produk, kategori, atau nama penjual..."
              className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-11 pr-4 text-sm outline-none transition focus:border-[#218653] focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  activeCategory === category
                    ? "bg-[#176b45] text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-[#176b45] hover:text-[#176b45]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FORM PENJUAL */}
        {showSellerForm && (
          <section className="mt-8 rounded-3xl border border-green-100 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#218653]">
                  Area Penjual
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  {editingProduct ? "Edit Produk" : "Tambah Produk"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Lengkapi informasi produk agar calon pembeli
                  dapat mengenali produk dan menghubungi penjual.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSellerForm(false);
                  setEditingProduct(null);
                  setSelectedImage(null);
                  setPageError("");
                }}
                className="rounded-full border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                Tutup ✕
              </button>
            </div>

            <form
              onSubmit={handleSaveProduct}
              className="mt-7 grid gap-5 md:grid-cols-2"
            >
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Nama Produk *
                </label>
                <input
                  required
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                  placeholder="Contoh: Brownies Cokelat"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#218653]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Kategori *
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      category: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#218653]"
                >
                  {CATEGORIES.filter((item) => item !== "Semua").map(
                    (category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Harga (Rp) *
                </label>
                <input
                  required
                  min="0"
                  type="number"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm({ ...productForm, price: e.target.value })
                  }
                  placeholder="15000"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#218653]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Nama Penjual *
                </label>
                <input
                  required
                  value={productForm.seller}
                  onChange={(e) =>
                    setProductForm({ ...productForm, seller: e.target.value })
                  }
                  placeholder="Nama atau nama usaha"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#218653]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Nomor WhatsApp *
                </label>
                <input
                  required
                  type="tel"
                  value={productForm.whatsapp_number}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      whatsapp_number: e.target.value,
                    })
                  }
                  placeholder="08xxxxxxxxxx atau 628xxxxxxxxxx"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#218653]"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Gunakan nomor WhatsApp aktif yang bisa dihubungi pembeli.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Ikon Produk
                </label>
                <input
                  value={productForm.emoji}
                  onChange={(e) =>
                    setProductForm({ ...productForm, emoji: e.target.value })
                  }
                  placeholder="🛍️"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#218653]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  Deskripsi Produk
                </label>
                <textarea
                  rows={4}
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Jelaskan produk, ukuran, rasa, atau informasi penting lainnya..."
                  className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#218653]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">
                  Foto Produk
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full rounded-xl border border-gray-200 bg-white p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#edf5ec] file:px-4 file:py-2 file:font-bold file:text-[#176b45]"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Format gambar umum, maksimal 5 MB.
                </p>

                {selectedImage && (
                  <p className="mt-2 text-sm text-[#176b45]">
                    Gambar dipilih: {selectedImage.name}
                  </p>
                )}

                {!selectedImage && currentImageUrl && (
                  <p className="mt-2 text-sm text-gray-500">
                    Foto saat ini masih digunakan jika kamu tidak memilih
                    foto baru.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#176b45] px-7 py-3 font-bold text-white transition hover:bg-[#105638] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingProduct
                      ? "Simpan Perubahan"
                      : "Terbitkan Produk"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSellerForm(false);
                    setEditingProduct(null);
                    setSelectedImage(null);
                  }}
                  className="rounded-full border border-gray-200 px-6 py-3 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </form>
          </section>
        )}

        {/* STATUS KATALOG */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            {loading
              ? "Memuat katalog..."
              : `${filteredProducts.length} produk ditemukan`}
          </p>

          <button
            type="button"
            onClick={() => void fetchProducts()}
            className="text-sm font-bold text-[#176b45] hover:underline"
          >
            ↻ Muat ulang
          </button>
        </div>

        {/* DAFTAR PRODUK */}
        {loading ? (
          <div className="grid gap-5 py-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-3xl bg-gray-100"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-5xl">🔎</p>
            <h3 className="mt-5 text-xl font-black">
              Produk belum ditemukan
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
              Coba kata kunci atau kategori lain. Jika kamu memiliki usaha,
              kamu juga bisa menambahkan produk ke katalog.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveCategory("Semua");
              }}
              className="mt-5 rounded-full bg-[#edf5ec] px-5 py-3 text-sm font-bold text-[#176b45] hover:bg-green-100"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const isOwner =
                Boolean(user) && product.owner_id === user.id;

              return (
                <article
                  key={product.id}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    className="relative flex h-52 items-center justify-center overflow-hidden"
                    style={{
                      backgroundColor: product.color || "#edf5ec",
                    }}
                  >
                    {product.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-7xl" aria-hidden="true">
                        {product.emoji || "🛍️"}
                      </span>
                    )}

                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-[#176b45] shadow-sm">
                      {product.category}
                    </span>

                    {isOwner && (
                      <span className="absolute right-3 top-3 rounded-full bg-[#176b45] px-3 py-1.5 text-xs font-bold text-white">
                        Produk Saya
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-black leading-snug">
                      {product.name}
                    </h3>

                    <p className="mt-2 line-clamp-3 min-h-12 text-sm leading-6 text-gray-500">
                      {product.description || "Produk usaha mahasiswa."}
                    </p>

                    <div className="mt-4">
                      <p className="text-xl font-black text-[#176b45]">
                        {money(Number(product.price) || 0)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Penjual: {product.seller || "Mahasiswa"}
                      </p>
                    </div>

                    <div className="mt-auto space-y-2 pt-5">
                      <button
                        type="button"
                        onClick={() => openOrder(product)}
                        className="w-full rounded-xl bg-[#176b45] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#105638]"
                      >
                        Pesan via WhatsApp
                      </button>

                      {isOwner && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => openEditProduct(product)}
                            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            disabled={deletingId === product.id}
                            onClick={() => void handleDeleteProduct(product)}
                            className="rounded-xl border border-red-200 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === product.id
                              ? "Menghapus..."
                              : "Hapus"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* AJAKAN BERJUALAN */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#eaf2e7] p-7 sm:p-10 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-[#218653]">
              Punya Usaha?
            </p>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">
              Saatnya produkmu dikenal lebih luas.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Kenalkan usaha dan produkmu kepada keluarga Vokasi melalui
              katalog VokasiMart.
            </p>
          </div>

          <button
            type="button"
            onClick={openNewProductForm}
            className="shrink-0 rounded-full bg-[#176b45] px-6 py-3.5 font-bold text-white hover:bg-[#105638]"
          >
            Mulai Berjualan →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-xl font-black text-[#176b45]">
              vokasi<span className="text-[#e9a23b]">mart.</span>
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Satu Kampus, Banyak Peluang.
            </p>
          </div>

          <div className="flex flex-wrap gap-5 text-sm font-semibold text-gray-500">
            <a href="#beranda" className="hover:text-[#176b45]">
              Beranda
            </a>
            <a href="#produk" className="hover:text-[#176b45]">
              Produk
            </a>
            <button
              type="button"
              onClick={() => setShowAbout(true)}
              className="hover:text-[#176b45]"
            >
              Tentang Kami
            </button>
          </div>

          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} VokasiMart.
          </p>
        </div>
      </footer>

      {/* TOMBOL TENTANG KAMI */}
      <button
        type="button"
        onClick={() => setShowAbout(true)}
        className="fixed bottom-5 left-5 z-40 rounded-full border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-[#176b45] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#edf5ec]"
      >
        ⓘ Tentang Kami
      </button>

      {/* MODAL TENTANG KAMI */}
      {showAbout && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowAbout(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative overflow-hidden bg-[#176b45] px-6 py-8 text-white sm:px-9 sm:py-10">
              <button
                type="button"
                aria-label="Tutup Tentang Kami"
                onClick={() => setShowAbout(false)}
                className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1.5 text-lg hover:bg-white/25"
              >
                ✕
              </button>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-100">
                Mengenal VokasiMart
              </p>

              <h2
                id="about-title"
                className="mt-3 text-3xl font-black sm:text-4xl"
              >
                Satu Kampus,
                <br />
                Banyak Peluang.
              </h2>

              <p className="mt-4 max-w-lg text-sm leading-6 text-white/85">
                Ruang digital untuk mempertemukan kreativitas mahasiswa,
                produk usaha, dan peluang kewirausahaan di lingkungan kampus.
              </p>
            </div>

            <div className="space-y-8 p-6 sm:p-9">
              <section>
                <h3 className="text-xl font-black text-[#176b45]">
                  Tentang VokasiMart
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  VokasiMart merupakan inovasi digital yang dirancang untuk
                  mempertemukan mahasiswa dengan beragam produk usaha di
                  lingkungan kampus. Melalui katalog terpusat, kami ingin
                  membantu usaha mahasiswa memperoleh ruang promosi yang lebih
                  mudah diakses sekaligus memudahkan pembeli menemukan produk
                  sesuai kebutuhan dan preferensi.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-black text-[#176b45]">
                  Latar Belakang
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  Kegiatan kewirausahaan mahasiswa, termasuk usaha dana usaha
                  (danusan) organisasi, menjadi salah satu sarana untuk
                  mengembangkan kreativitas, kemandirian, dan pengalaman
                  berbisnis. Namun, promosi produk dapat menghadapi tantangan
                  ketika informasi tersebar di berbagai saluran komunikasi,
                  jangkauan calon pembeli terbatas, dan produk yang ditawarkan
                  sulit ditemukan dalam satu tempat.
                </p>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  VokasiMart dikembangkan sebagai respons terhadap kebutuhan
                  tersebut melalui platform katalog digital yang menghimpun
                  berbagai produk usaha mahasiswa. Dengan menyediakan satu
                  ruang promosi bersama, VokasiMart diharapkan dapat
                  memperluas jangkauan informasi produk, mempermudah pencarian,
                  serta membantu mahasiswa mengenali peluang pasar di
                  lingkungan kampus.
                </p>
              </section>

              <section className="rounded-2xl bg-[#edf5ec] p-5">
                <p className="text-xs font-black uppercase tracking-widest text-[#176b45]">
                  Visi
                </p>
                <p className="mt-3 text-lg font-bold leading-7 text-[#254c35]">
                  Menjadi ruang digital kewirausahaan mahasiswa yang inklusif,
                  kolaboratif, dan berkelanjutan.
                </p>
              </section>

              <section>
                <h3 className="text-xl font-black text-[#176b45]">
                  Misi Kami
                </h3>

                <ol className="mt-4 space-y-3">
                  {[
                    "Menghimpun berbagai produk mahasiswa dalam katalog yang terpusat.",
                    "Mempermudah pembeli menemukan produk sesuai kebutuhan dan preferensi.",
                    "Mendukung promosi usaha mahasiswa melalui pengalaman digital yang praktis.",
                    "Mendorong kepercayaan pelanggan melalui informasi produk yang jelas dan pengembangan ulasan berbasis transaksi.",
                    "Mendukung keberlanjutan usaha melalui program apresiasi dan loyalitas yang dapat dikembangkan secara bertahap.",
                  ].map((mission, index) => (
                    <li key={mission} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#edf5ec] text-xs font-black text-[#176b45]">
                        {index + 1}
                      </span>
                      <p className="pt-0.5 text-sm leading-6 text-gray-600">
                        {mission}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h3 className="text-xl font-black text-[#176b45]">
                  Nilai Inovasi
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  VokasiMart tidak sekadar mempertemukan penjual dan pembeli,
                  tetapi berupaya membangun ekosistem kewirausahaan mahasiswa
                  melalui promosi terpusat dan informasi produk yang mudah
                  dijangkau. Fitur ulasan, apresiasi, serta loyalitas dapat
                  dikembangkan secara bertahap sesuai kebutuhan pengguna.
                </p>
              </section>

              <section>
                <p className="text-xs font-black uppercase tracking-widest text-[#218653]">
                  Di balik VokasiMart
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  Tim Pengembang
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Inovasi kewirausahaan digital oleh mahasiswa IPB University.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.nim}
                      className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-[#fafcf9] p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e4efe1] font-black text-[#176b45]">
                        {member.name
                          .split(" ")
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-bold text-gray-800">
                          {member.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {member.nim}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="border-t border-gray-100 pt-5 text-center">
                <p className="text-lg font-black text-[#176b45]">
                  vokasi<span className="text-[#e9a23b]">mart.</span>
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-400">
                  Satu Kampus, Banyak Peluang.
                  <br />
                  Mendukung kreativitas dan kewirausahaan mahasiswa.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAbout(false)}
                className="w-full rounded-xl bg-[#176b45] px-5 py-3.5 font-bold text-white hover:bg-[#105638]"
              >
                Kembali ke VokasiMart
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL PEMESANAN WHATSAPP */}
      {showOrder && selectedProduct && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowOrder(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#218653]">
                  Pesanan VokasiMart
                </p>
                <h2 id="order-title" className="mt-2 text-2xl font-black">
                  {selectedProduct.name}
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Penjual: {selectedProduct.seller}
                </p>
                <p className="mt-1 font-bold text-[#176b45]">
                  {money(Number(selectedProduct.price) || 0)} per item
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowOrder(false)}
                aria-label="Tutup pemesanan"
                className="rounded-full border border-gray-200 px-3 py-1.5 hover:bg-gray-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWhatsAppOrder} className="space-y-6 p-6">
              <div>
                <label className="mb-2 block text-sm font-bold">
                  Nama Pembeli *
                </label>
                <input
                  required
                  value={buyerName}
                  onChange={(event) => setBuyerName(event.target.value)}
                  placeholder="Masukkan nama kamu"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#218653]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black">Varian dan Jumlah</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setOrderItems((current) => [
                        ...current,
                        makeOrderItem(),
                      ])
                    }
                    className="text-sm font-bold text-[#176b45] hover:underline"
                  >
                    + Tambah varian
                  </button>
                </div>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Contoh: cokelat, stroberi, ukuran M, atau rasa original.
                  Tambahkan baris jika ingin memesan beberapa varian dari
                  produk yang sama.
                </p>

                <div className="mt-4 space-y-3">
                  {orderItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold">
                          Varian {index + 1}
                        </p>
                        {orderItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setOrderItems((current) =>
                                current.filter(
                                  (line) => line.id !== item.id
                                )
                              )
                            }
                            className="text-xs font-bold text-red-600 hover:underline"
                          >
                            Hapus
                          </button>
                        )}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_110px]">
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                            Nama varian
                          </label>
                          <input
                            required
                            value={item.variant}
                            onChange={(event) =>
                              updateOrderItem(
                                item.id,
                                "variant",
                                event.target.value
                              )
                            }
                            placeholder="Contoh: Cokelat"
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#218653]"
                          />
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-gray-500">
                            Jumlah
                          </label>
                          <input
                            required
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) =>
                              updateOrderItem(
                                item.id,
                                "quantity",
                                event.target.value
                              )
                            }
                            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#218653]"
                          />
                        </div>
                      </div>

                      <p className="mt-3 text-right text-sm font-bold text-[#176b45]">
                        {money(
                          Math.max(1, item.quantity) *
                            (Number(selectedProduct.price) || 0)
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={buyerNote}
                  onChange={(event) => setBuyerNote(event.target.value)}
                  placeholder="Contoh: waktu pengambilan atau permintaan khusus"
                  className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#218653]"
                />
              </div>

              <div className="rounded-2xl bg-[#edf5ec] p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-600">
                    Total sementara
                  </span>
                  <span className="text-xl font-black text-[#176b45]">
                    {money(totalOrder)}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Total belum termasuk biaya pengiriman jika ada.
                  Ketersediaan, pembayaran, dan pengambilan barang
                  dikonfirmasi langsung dengan penjual.
                </p>
              </div>

              {pageError && (
                <p role="alert" className="text-sm text-red-600">
                  {pageError}
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-[#176b45] px-5 py-4 font-bold text-white transition hover:bg-[#105638]"
              >
                Lanjutkan ke WhatsApp ↗
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
