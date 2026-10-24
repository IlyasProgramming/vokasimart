
      "use client";

      import {
        useCallback,
        useEffect,
        useState,
        type ChangeEvent,
        type FormEvent,
      } from "react";
      import { supabase } from "@/lib/supabase";
      

      type ProductVariant = {
        name: string;
        price: number;
      };

      type ProductVariantForm = {
        id: string;
        name: string;
        price: string;
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

      type OrderMode = "order" | "inquiry";

      type OrderItem = {
        id: string;
        quantity: number;
        variant: string;
        price: number;
      };

      const categories = [
      { name: "Semua", emoji: "🛍️" },
      { name: "Makanan", emoji: "🍜" },
      { name: "Minuman", emoji: "🥤" },
      { name: "Perlengkapan", emoji: "🎒" },
      { name: "Jasa", emoji: "🛠️" },
    ];

      const categoryColors: Record<string, string> = {
      Makanan: "#F9E4D5",
      Minuman: "#E4EEDC",
      Perlengkapan: "#E0E9F7",
      Jasa: "#E8E0F7",
    };

      const categoryEmojis: Record<string, string> = {
      Makanan: "🍱",
      Minuman: "🥤",
      Perlengkapan: "🎒",
      Jasa: "🛠️",
    };

      const pickupOptions = [
    ...Array.from({ length: 22 }, (_, index) => {
      const startMinutes = 6 * 60 + index * 30;
      const endMinutes = startMinutes + 30;

      const formatTime = (totalMinutes: number) => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      };

      return `${formatTime(startMinutes)}–${formatTime(endMinutes)}`;
    }),
    "Pilih sendiri — koordinasi dengan penjual",
  ];

      const productColumns =
    "id, name, category, price, seller, image_url, image_urls, description, emoji, color, owner_id, whatsapp_number, variants, deleted_at";

      const formatPrice = (price: number) =>
        new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          maximumFractionDigits: 0,
        }).format(price);

      // HELPER UNTUK MENGAMBIL SEMUA FOTO PRODUK
  function getProductImages(product: Product): string[] {
    const images = Array.isArray(product.image_urls)
      ? product.image_urls.filter(
          (url): url is string =>
            typeof url === "string" && url.trim() !== ""
        )
      : [];

    if (images.length > 0) return images;

    // Kompatibilitas dengan produk lama.
    return product.image_url ? [product.image_url] : [];
  } 

      function normalizeWhatsApp(value: string) {
        let number = value.replace(/\D/g, "");

        if (number.startsWith("0")) {
          number = "62" + number.slice(1);
        } else if (number.startsWith("8")) {
          number = "62" + number;
        }

        return number;
      }

      function getProductVariants(product: Product): ProductVariant[] {
        const variants = Array.isArray(product.variants)
          ? product.variants
              .filter(
                (variant) =>
                  variant &&
                  typeof variant.name === "string" &&
                  variant.name.trim() !== "" &&
                  Number.isSafeInteger(Number(variant.price)) &&
                  Number(variant.price) > 0
              )
              .map((variant) => ({
                name: variant.name.trim(),
                price: Number(variant.price),
              }))
          : [];

        // Mendukung produk lama yang belum memiliki varian.
        return variants.length > 0
          ? variants
          : [{ name: "Original", price: product.price }];
      }

      function createOrderItem(product?: Product): OrderItem {
        const firstVariant = product
          ? getProductVariants(product)[0]
          : undefined;

        return {
          id: crypto.randomUUID(),
          quantity: 1,
          variant: firstVariant?.name ?? "",
          price: firstVariant?.price ?? 0,
        };
      }

      function getWhatsAppUrl(
    product: Product,
    mode: OrderMode,
    buyerName: string,
    buyerClass: string,
    buyerGeneration: string,
    orderItems: OrderItem[],
    pickupTime: string,
    notes: string,
    serviceDeadline = ""
  ) {
        const number = normalizeWhatsApp(product.whatsapp_number ?? "");

        if (number.length < 10 || number.length > 15) {
          return null;
        }

        let message = "";

        if (mode === "inquiry") {
          message =
            `Halo Kak, saya tertarik dengan produk "${product.name}" ` +
            "di VokasiMart.\n\n" +
            "Saya mau tanya-tanya dulu mengenai produk ini. " +
            "Apakah produknya masih tersedia?\n\n" +
            "Terima kasih, Kak!";
        } else {
          const total = orderItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
          );

          const totalQuantity = orderItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          );

          const orderDetails = orderItems
            .map(
              (item, index) =>
                `Pesanan ${index + 1}\n` +
                `Produk: ${product.name}\n` +
                `Rasa/varian: ${item.variant.trim() || "Tidak ditentukan"}\n` +
                `Jumlah: ${item.quantity} pcs/porsi\n` +
                `Harga satuan: ${formatPrice(item.price)}\n` +
                `Subtotal: ${formatPrice(item.price * item.quantity)}`
            )
            .join("\n\n");

          message =
            "VokasiMart, Pilihan Anak Vokasi!!.\n\n" +
            "IDENTITAS PEMBELI\n" +
            `Atas nama: ${buyerName.trim()}\n` +
            `Kelas: ${buyerClass.trim()}\n` +
            `Angkatan: ${buyerGeneration}\n\n` +
            "DETAIL PESANAN\n" +
            `${orderDetails}\n\n` +
            "RINGKASAN PESANAN\n" +
            `Total jumlah: ${totalQuantity} pcs/porsi\n` +
            `Total sementara: ${formatPrice(total)}\n` +
            (
    product.category === "Jasa"
      ? `Tenggat waktu penyelesaian: ${serviceDeadline.replace("T", " pukul ")} WIB\n`
      : `Waktu pengambilan yang dipilih: ${pickupTime} WIB\n`
  ) +
            `Catatan tambahan: ${notes.trim() || "Tidak ada"}\n\n` +
            "Mohon konfirmasi ketersediaan produk, varian, dan pesanan saya, ya, Kak.\n\n" +
            "Untuk pembayarannya, apakah bisa melalui QRIS atau transfer bank? " +
            "Jika bisa, mohon kirimkan informasi pembayaran yang diperlukan. " +
            "Setelah melakukan pembayaran, saya akan mengirimkan bukti pembayaran " +
            "untuk dikonfirmasi sebelum mengambil pesanan.\n\n" +
            "Terima kasih, Kak!";
        }

        return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
      }

      function getErrorMessage(error: unknown) {
        return error instanceof Error
          ? error.message
          : "Terjadi kesalahan. Silakan coba lagi.";
      }

      export default function Home() {
        const [products, setProducts] = useState<Product[]>([]);
        const [loading, setLoading] = useState(true);
        const [errorMessage, setErrorMessage] = useState("");
        const [formMessage, setFormMessage] = useState("");
        const [showAbout, setShowAbout] = useState(false);

        const [userEmail, setUserEmail] = useState<string | null>(null);
        const [userId, setUserId] = useState<string | null>(null);
        const [authLoading, setAuthLoading] = useState(true);
        const [isAdmin, setIsAdmin] = useState(false);
        const [isSeller, setIsSeller] = useState(false);
        const [loggingOut, setLoggingOut] = useState(false);

        const [searchQuery, setSearchQuery] = useState("");
        const [selectedCategory, setSelectedCategory] = useState("Semua");
        // KATALOG SAYA
const [showMyCatalog, setShowMyCatalog] = useState(false);

        const [showAddProduct, setShowAddProduct] = useState(false);
        const [savingProduct, setSavingProduct] = useState(false);
        const [deletingId, setDeletingId] = useState<string | null>(null);
        const [trashProducts, setTrashProducts] = useState<Product[]>([]);
const [showTrash, setShowTrash] = useState(false);
const [trashLoading, setTrashLoading] = useState(false);
const [restoringId, setRestoringId] = useState<string | null>(null);

        const [selectedProduct, setSelectedProduct] =
          useState<Product | null>(null);
        const [editingProduct, setEditingProduct] =
          useState<Product | null>(null);
        // GALERI FOTO PRODUK PEMBELI
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showImageFullscreen, setShowImageFullscreen] = useState(false);  

        // FORM PEMESANAN PEMBELI
        const [buyerName, setBuyerName] = useState("");
        const [buyerClass, setBuyerClass] = useState("");
        const [buyerGeneration, setBuyerGeneration] = useState("");

        const [orderItems, setOrderItems] = useState<OrderItem[]>([
          {
            id: "initial-order",
            quantity: 1,
            variant: "",
            price: 0,
          },
        ]);

        const [pickupTime, setPickupTime] = useState("12:30");
  const [serviceDeadline, setServiceDeadline] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

        // FORM PRODUK PENJUAL
        const [newProductName, setNewProductName] = useState("");
        const [newProductVariants, setNewProductVariants] = useState<
          ProductVariantForm[]
        >([
          {
            id: "initial-variant",
            name: "Original",
            price: "",
          },
        ]);

        const [newProductCategory, setNewProductCategory] =
          useState("Makanan");
        const [newProductSeller, setNewProductSeller] = useState("");
        const [newProductWhatsApp, setNewProductWhatsApp] = useState("");
        const [newProductDescription, setNewProductDescription] = useState("");
      const [newProductImages, setNewProductImages] = useState<File[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

        // AUTENTIKASI
        useEffect(() => {
          let active = true;

          async function checkSession() {
            try {
              const { data, error } = await supabase.auth.getSession();

              if (error) throw error;

              if (active) {
                setUserEmail(data.session?.user.email ?? null);
                setUserId(data.session?.user.id ?? null);
              }
            } catch (error) {
              console.error("Gagal memeriksa sesi:", error);
            } finally {
              if (active) setAuthLoading(false);
            }
          }

          void checkSession();

          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!active) return;

            setUserEmail(session?.user.email ?? null);
            setUserId(session?.user.id ?? null);
            setAuthLoading(false);

            if (!session) {
              setShowAddProduct(false);
              setEditingProduct(null);
              setSelectedProduct(null);
            }
          });

          return () => {
            active = false;
            subscription.unsubscribe();
          };
        }, []);

        // PEMERIKSAAN PERAN ADMIN
  useEffect(() => {
    let active = true;

    async function checkAdminRole() {
      if (!userId) {
        setIsAdmin(false);
        return;
      }

      setIsAdmin(false);

      try {
        const { data, error } = await supabase.rpc("is_admin");

        if (error) throw error;

        if (active) {
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.error("Gagal memeriksa peran admin:", error);

        if (active) {
          setIsAdmin(false);
        }
      }
    }

    void checkAdminRole();

    return () => {
      active = false;
    };
  }, [userId]);

  // PEMERIKSAAN PERAN PENJUAL
useEffect(() => {
  let active = true;

  async function checkSellerRole() {
    if (!userId) {
      setIsSeller(false);
      return;
    }

    setIsSeller(false);

    try {
      const { data, error } = await supabase.rpc("is_seller");

      if (error) throw error;

      if (active) {
        setIsSeller(data === true);
      }
    } catch (error) {
      console.error("Gagal memeriksa peran penjual:", error);

      if (active) {
        setIsSeller(false);
      }
    }
  }

  void checkSellerRole();

  return () => {
    active = false;
  };
}, [userId]);

        // KATALOG SUPABASE
        const fetchProducts = useCallback(async () => {
          setLoading(true);
          setErrorMessage("");

          try {
            const { data, error } = await supabase
    .from("products")
    .select(productColumns)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

            if (error) throw error;

            setProducts((data ?? []) as Product[]);
          } catch (error) {
            console.error("Gagal mengambil produk:", error);
            setErrorMessage(
              "Produk gagal dimuat. Periksa koneksi Supabase, nama kolom, dan izin database."
            );
          } finally {
            setLoading(false);
          }
        }, []);

        // KATALOG PRODUK MILIK PENJUAL YANG LOGIN
const fetchMyCatalog = useCallback(async () => {
  if (!userId || !isSeller) {
    setProducts([]);
    return;
  }

  setLoading(true);
  setErrorMessage("");

  try {
    const { data, error } = await supabase
      .from("products")
      .select(productColumns)
      .eq("owner_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    setProducts((data ?? []) as Product[]);
  } catch (error) {
    console.error("Gagal mengambil katalog penjual:", error);

    setErrorMessage(
      "Katalog Saya gagal dimuat. Periksa koneksi Supabase dan izin database."
    );
  } finally {
    setLoading(false);
  }
}, [userId, isSeller]);

        const fetchTrashProducts = useCallback(async () => {
  if (!userId) {
    setTrashProducts([]);
    return;
  }

  setTrashLoading(true);

  try {
    let query = supabase
      .from("products")
      .select(productColumns)
      .not("deleted_at", "is", null)
      .gte(
        "deleted_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("deleted_at", { ascending: false });

    // Admin dapat melihat Sampah semua pemilik.
    // Penjual hanya melihat produk miliknya sendiri.
    if (!isAdmin) {
      query = query.eq("owner_id", userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    setTrashProducts((data ?? []) as Product[]);
  } catch (error) {
    console.error("Gagal mengambil produk Sampah:", error);

    setFormMessage(
      `Daftar Sampah gagal dimuat: ${getErrorMessage(error)}`
    );
  } finally {
    setTrashLoading(false);
  }
}, [userId, isAdmin]);

useEffect(() => {
  if (showTrash) {
    void fetchTrashProducts();
  }
}, [showTrash, fetchTrashProducts]);

        // MEMUAT KATALOG SESUAI HALAMAN YANG DIBUKA
useEffect(() => {
  if (showMyCatalog) {
    if (userId && isSeller) {
      void fetchMyCatalog();
    } else {
      setProducts([]);
      setLoading(false);
      setErrorMessage("");
    }
  } else {
    void fetchProducts();
  }
}, [
  showMyCatalog,
  userId,
  isSeller,
  fetchMyCatalog,
  fetchProducts,
]);
        // RESET PESANAN SETIAP BERGANTI PRODUK
        useEffect(() => {
          setOrderItems([
            createOrderItem(selectedProduct ?? undefined),
          ]);
          setPickupTime("12:30–13:00");
  setServiceDeadline("");
  setOrderNotes("");
        }, [selectedProduct?.id]);

        // LOGOUT
        async function handleLogout() {
          if (
            !window.confirm(
              "Apakah kamu yakin ingin keluar dari akun VokasiMart?"
            )
          ) {
            return;
          }

          setLoggingOut(true);
          setFormMessage("");

          try {
            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            window.location.replace("/");
          } catch (error) {
            console.error("Gagal logout:", error);
            setFormMessage(`Logout gagal: ${getErrorMessage(error)}`);
          } finally {
            setLoggingOut(false);
          }
        }

        // PENCARIAN DAN FILTER
        const filteredProducts = products.filter((product) => {
          const query = searchQuery.trim().toLowerCase();

          const matchesSearch =
            product.name.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query) ||
            product.seller.toLowerCase().includes(query);

          const matchesCategory =
            selectedCategory === "Semua" ||
            product.category === selectedCategory;

          return matchesSearch && matchesCategory;
        });

        // PENGELOLAAN BARIS PESANAN
        function addOrderItem() {
          if (orderItems.length >= 20) {
            window.alert("Maksimal 20 baris pesanan untuk satu produk.");
            return;
          }

          setOrderItems((items) => [
            ...items,
            createOrderItem(selectedProduct ?? undefined),
          ]);
        }

        function removeOrderItem(id: string) {
          setOrderItems((items) => items.filter((item) => item.id !== id));
        }

        function updateOrderItem(
          id: string,
          field: "quantity",
          value: number
        ) {
          setOrderItems((items) =>
            items.map((item) =>
              item.id === id ? { ...item, [field]: value } : item
            )
          );
        }

        function updateOrderVariant(id: string, variantName: string) {
          if (!selectedProduct) return;

          const selectedVariant = getProductVariants(selectedProduct).find(
            (variant) => variant.name === variantName
          );

          if (!selectedVariant) return;

          setOrderItems((items) =>
            items.map((item) =>
              item.id === id
                ? {
                    ...item,
                    variant: selectedVariant.name,
                    price: selectedVariant.price,
                  }
                : item
            )
          );
        }

        // PERHITUNGAN TOTAL PESANAN
        const orderTotal = orderItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        const totalQuantity = orderItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

        // FORM PRODUK
          function resetForm() {
    setNewProductName("");

    setNewProductVariants([
      {
        id: crypto.randomUUID(),
        name: "Original",
        price: "",
      },
    ]);

    setNewProductCategory("Makanan");
    setNewProductSeller("");
    setNewProductWhatsApp("");
    setNewProductDescription("");
    setNewProductImages([]);
    setExistingImageUrls([]);

    setImagePreviewUrls((previousUrls) => {
      previousUrls.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });

    setImageInputKey((key) => key + 1);
    setEditingProduct(null);
  }

        function handleStartSelling() {
          if (authLoading || savingProduct) return;

          if (!userId) {
            if (
              window.confirm(
                "Kamu harus Masuk terlebih dahulu. Buka halaman Masuk?"
              )
            ) {
              window.location.href = "/auth";
            }

            return;
          }

          if (showAddProduct) {
            setShowAddProduct(false);
            resetForm();
            setFormMessage("");
            return;
          }

          resetForm();
          setFormMessage("");
          setShowAddProduct(true);

          setTimeout(() => {
            document.getElementById("form-penjual")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 0);
        }

        function startEditing(product: Product) {
    if (
      !userId ||
      (product.owner_id !== userId && !isAdmin) ||
      savingProduct
    ) {
      return;
    }
          setEditingProduct(product);
  setNewProductName(product.name);

  setNewProductVariants(
    getProductVariants(product).map((variant) => ({
      id: crypto.randomUUID(),
      name: variant.name,
      price: String(variant.price),
    }))
  );

  setNewProductCategory(product.category);
  setNewProductSeller(product.seller);
  setNewProductWhatsApp(product.whatsapp_number ?? "");
  setNewProductDescription(product.description ?? "");

  setNewProductImages([]);
  setExistingImageUrls(getProductImages(product));

  setImagePreviewUrls((previousUrls) => {
    previousUrls.forEach((url) => URL.revokeObjectURL(url));
    return [];
  });

  setImageInputKey((key) => key + 1);

  setFormMessage("");
  setShowAddProduct(true);
  setSelectedProduct(null);

  setTimeout(() => {
    document.getElementById("form-penjual")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, 0);
        }

        function addProductVariant() {
          if (newProductVariants.length >= 30) {
            window.alert("Maksimal 30 varian untuk satu produk.");
            return;
          }

          setNewProductVariants((variants) => [
            ...variants,
            {
              id: crypto.randomUUID(),
              name: "",
              price: "",
            },
          ]);
        }

        function updateProductVariant(
          id: string,
          field: "name" | "price",
          value: string
        ) {
          setNewProductVariants((variants) =>
            variants.map((variant) =>
              variant.id === id ? { ...variant, [field]: value } : variant
            )
          );
        }

        function removeProductVariant(id: string) {
          setNewProductVariants((variants) =>
            variants.length > 1
              ? variants.filter((variant) => variant.id !== id)
              : variants
          );
        }

        function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const input = event.target;

    if (newProductImages.length + files.length + existingImageUrls.length > 10) {
      setFormMessage("Maksimal 10 foto untuk satu produk.");
      input.value = "";
      return;
    }

    const invalidFile = files.find(
      (file) => !file.type.startsWith("image/")
    );

    if (invalidFile) {
      setFormMessage("Semua file yang dipilih harus berupa gambar.");
      input.value = "";
      return;
    }

    const oversizedFile = files.find(
      (file) => file.size > 5 * 1024 * 1024
    );

    if (oversizedFile) {
      setFormMessage(
        "Ukuran setiap gambar maksimal 5 MB."
      );
      input.value = "";
      return;
    }

    setFormMessage("");
    setNewProductImages((previousFiles) => [...previousFiles, ...files]);

    setImagePreviewUrls((previousUrls) => [
      ...previousUrls,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);

    input.value = "";
  }
        

        // TAMBAH DAN EDIT PRODUK
        async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
          event.preventDefault();
          setFormMessage("");

          if (savingProduct) return;

          setSavingProduct(true);

          const uploadedPaths: string[] = [];

          try {
            const {
              data: { user },
              error: userError,
            } = await supabase.auth.getUser();

            if (userError) throw userError;

            if (!user) {
              setUserEmail(null);
              setUserId(null);
              throw new Error(
                "Sesi Masuk tidak ditemukan. Silakan Masuk kembali."
              );
            }

            if (
    editingProduct &&
    editingProduct.owner_id !== user.id &&
    !isAdmin
  ) {
    throw new Error("Kamu tidak memiliki izin mengubah produk ini.");
  }

            const name = newProductName.trim();
            const seller = newProductSeller.trim();
            const description = newProductDescription.trim();

            const variants: ProductVariant[] = newProductVariants.map(
              (variant) => ({
                name: variant.name.trim(),
                price: Number(variant.price),
              })
            );

            const variantNames = variants.map((variant) =>
              variant.name.toLocaleLowerCase("id-ID")
            );

            const hasDuplicateNames =
              new Set(variantNames).size !== variantNames.length;

            const invalidVariants = variants.some(
              (variant) =>
                !variant.name ||
                variant.name.length > 100 ||
                !Number.isSafeInteger(variant.price) ||
                variant.price <= 0
            );

            if (
              variants.length === 0 ||
              invalidVariants ||
              hasDuplicateNames
            ) {
              throw new Error(
                "Pastikan setiap varian memiliki nama dan harga berupa bilangan bulat positif. Nama varian tidak boleh duplikat."
              );
            }

            const price = Math.min(
              ...variants.map((variant) => variant.price)
            );

            const whatsapp = normalizeWhatsApp(newProductWhatsApp);

            if (!name || !seller) {
              throw new Error(
                "Periksa kembali nama produk dan penjual."
              );
            }

            if (whatsapp.length < 10 || whatsapp.length > 15) {
              throw new Error(
                "Nomor WhatsApp tidak valid. Contoh: 081234567890."
              );
            }

            const finalImageCount =
    existingImageUrls.length + newProductImages.length;

  if (finalImageCount === 0) {
    throw new Error("Pilih minimal satu foto produk.");
  }

  if (finalImageCount > 10) {
    throw new Error("Maksimal 10 foto untuk satu produk.");
  }

  for (const file of newProductImages) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Semua file harus berupa gambar.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Ukuran setiap gambar maksimal 5 MB.");
    }
  }

  const uploadedUrls: string[] = [];

  for (const file of newProductImages) {
    const extension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeExtension = /^[a-z0-9]+$/.test(extension)
      ? extension
      : "jpg";

    const path = `${user.id}/${crypto.randomUUID()}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    uploadedPaths.push(path);

    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(path);

    uploadedUrls.push(publicUrlData.publicUrl);
  }

  const allImageUrls = [...existingImageUrls, ...uploadedUrls];
  const imageUrl = allImageUrls[0] ?? null;

            const productData = {
              name,
              category: newProductCategory,
              price,
              variants,
              seller,
              whatsapp_number: whatsapp,
              description: description || null,
              image_url: imageUrl,
  image_urls: allImageUrls,
              emoji: categoryEmojis[newProductCategory] ?? "🛍️",
              color: categoryColors[newProductCategory] ?? "#E8F0E5",
              owner_id: editingProduct
    ? editingProduct.owner_id
    : user.id,
            };


          if (editingProduct) {
    let updateQuery = supabase
      .from("products")
      .update(productData)
      .eq("id", editingProduct.id);

    if (!isAdmin) {
      updateQuery = updateQuery.eq("owner_id", user.id);
    }

    const { data, error } = await updateQuery.select("id");

    if (error) throw error;

    if (!data?.length) {
      throw new Error(
        "Produk tidak berhasil diperbarui. Periksa izin akses dan kebijakan RLS."
      );
    }
  } else {
    const { error } = await supabase
      .from("products")
      .insert(productData);

    if (error) throw error;
  }
    

  // Database berhasil disimpan.
  // Jangan sampai foto yang sudah digunakan ikut terhapus
  // jika proses berikutnya mengalami masalah.
  uploadedPaths.length = 0;  

            if (editingProduct) {
    const retainedUrls = new Set(allImageUrls);

    const removedUrls = getProductImages(editingProduct).filter(
      (url) => !retainedUrls.has(url)
    );

    const marker = "/storage/v1/object/public/product-images/";

    const removedPaths = removedUrls.flatMap((url) => {
      const markerIndex = url.indexOf(marker);

      if (markerIndex === -1) return [];

      try {
        const path = decodeURIComponent(
          url.slice(markerIndex + marker.length)
        );

        return path.startsWith(`${user.id}/`) ? [path] : [];
      } catch {
        return [];
      }
    });

    if (removedPaths.length > 0) {
      const { error: cleanupError } = await supabase.storage
        .from("product-images")
        .remove(removedPaths);

      if (cleanupError) {
        console.error("Foto lama gagal dibersihkan:", cleanupError);
      }
    }
  }

  uploadedPaths.length = 0;

            await fetchProducts();

            setNewProductImages([]);

  setImagePreviewUrls((previousUrls) => {
    previousUrls.forEach((url) => URL.revokeObjectURL(url));
    return [];
  });

  setExistingImageUrls([]);
  setImageInputKey((key) => key + 1);
  setEditingProduct(null);
  setShowAddProduct(false);
  setFormMessage("");

            document.getElementById("produk")?.scrollIntoView({
              behavior: "smooth",
            });
          } catch (error) {
            console.error("Gagal menyimpan produk:", error);

            if (uploadedPaths.length > 0) {
    const { error: cleanupError } = await supabase.storage
      .from("product-images")
      .remove(uploadedPaths);

    if (cleanupError) {
      console.error("Gagal membersihkan foto:", cleanupError);
    }
  }

            setFormMessage(`Produk gagal disimpan: ${getErrorMessage(error)}`);
          } finally {
            setSavingProduct(false);
          }
        }

  // PINDAHKAN PRODUK KE SAMPAH
  async function handleDeleteProduct(product: Product) {
    if (
      !userId ||
      (product.owner_id !== userId && !isAdmin)
    ) {
      setFormMessage("Kamu tidak memiliki izin menghapus produk ini.");
      return;
    }

    if (deletingId || savingProduct) return;

    if (
      !window.confirm(
        `Pindahkan produk "${product.name}" ke Sampah? Produk dapat dipulihkan selama 30 hari. Foto produk tidak akan langsung dihapus.`
      )
    ) {
      return;
    }

    setDeletingId(product.id);
    setFormMessage("");

    try {
      let updateQuery = supabase
        .from("products")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", product.id)
        .is("deleted_at", null);

      if (!isAdmin) {
        updateQuery = updateQuery.eq("owner_id", userId);
      }

      const { data, error } = await updateQuery.select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "Produk tidak berhasil dipindahkan ke Sampah. Periksa izin UPDATE RLS di Supabase atau pastikan produk belum dihapus."
        );
      }

      // Hilangkan produk dari katalog tanpa menghapus data atau fotonya.
      setProducts((current) =>
        current.filter((item) => item.id !== product.id)
      );

      setSelectedProduct(null);
      setShowImageFullscreen(false);

      setFormMessage(
        `Produk "${product.name}" berhasil dipindahkan ke Sampah. Produk dan fotonya masih tersimpan untuk pemulihan.`
      );
    } catch (error) {
      console.error("Gagal memindahkan produk ke Sampah:", error);

      setFormMessage(
        `Produk gagal dipindahkan ke Sampah: ${getErrorMessage(error)}`
      );
    } finally {
      setDeletingId(null);
    }
  }

  // PULIHKAN PRODUK DARI SAMPAH
async function handleRestoreProduct(product: Product) {
  if (
    !userId ||
    (product.owner_id !== userId && !isAdmin)
  ) {
    setFormMessage("Kamu tidak memiliki izin memulihkan produk ini.");
    return;
  }

  if (restoringId || savingProduct || deletingId) return;

  if (!product.deleted_at) {
    setFormMessage("Produk ini tidak berada di Sampah.");
    return;
  }

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const deletedAt = new Date(product.deleted_at).getTime();

  if (
    !Number.isFinite(deletedAt) ||
    deletedAt < cutoff
  ) {
    setFormMessage(
      "Masa pemulihan produk ini sudah berakhir. Muat ulang daftar Sampah."
    );
    await fetchTrashProducts();
    return;
  }

  if (
    !window.confirm(
      `Pulihkan produk "${product.name}"? Produk akan tampil kembali di katalog.`
    )
  ) {
    return;
  }

  setRestoringId(product.id);
  setFormMessage("");

  try {
    const cutoffISO = new Date(cutoff).toISOString();

    let restoreQuery = supabase
      .from("products")
      .update({ deleted_at: null })
      .eq("id", product.id)
      .not("deleted_at", "is", null)
      .gte("deleted_at", cutoffISO);

    if (!isAdmin) {
      restoreQuery = restoreQuery.eq("owner_id", userId);
    }

    const { data, error } = await restoreQuery.select("id");

    if (error) throw error;

    if (!data?.length) {
      throw new Error(
        "Produk tidak berhasil dipulihkan. Periksa izin UPDATE RLS di Supabase atau pastikan masa pemulihannya belum berakhir."
      );
    }

    setTrashProducts((current) =>
      current.filter((item) => item.id !== product.id)
    );

    await fetchProducts();

    setFormMessage(
      `Produk "${product.name}" berhasil dipulihkan dan dapat ditampilkan kembali di katalog.`
    );
  } catch (error) {
    console.error("Gagal memulihkan produk:", error);
    
    setFormMessage(
      `Produk gagal dipulihkan: ${getErrorMessage(error)}`
    );
  } finally {
    setRestoringId(null);
  }
}

        function handleSearch(event: FormEvent<HTMLFormElement>) {
          event.preventDefault();

          document.getElementById("produk")?.scrollIntoView({
            behavior: "smooth",
          });
        }

        // VALIDASI IDENTITAS DAN PESANAN PEMBELI
        function validateBuyer(): boolean {
          if (!buyerName.trim() || !buyerClass.trim() || !buyerGeneration) {
            window.alert(
              "Lengkapi nama pembeli, kelas, dan angkatan terlebih dahulu."
            );
            return false;
          }

          if (buyerName.trim().length > 100 || buyerClass.trim().length > 50) {
            window.alert("Periksa kembali nama dan kelas yang kamu masukkan.");
            return false;
          }

          if (orderItems.length === 0) {
            window.alert("Tambahkan minimal satu pesanan.");
            return false;
          }

          if (
            orderItems.some(
              (item) =>
                !Number.isInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > 99
            )
          ) {
            window.alert("Jumlah setiap pesanan harus antara 1 dan 99.");
            return false;
          }

          if (!selectedProduct) {
            window.alert("Pilih produk terlebih dahulu.");
            return false;
          }

          const variants = getProductVariants(selectedProduct);

          if (
            orderItems.some(
              (item) =>
                !variants.some(
                  (variant) =>
                    variant.name === item.variant &&
                    variant.price === item.price
                )
            )
          ) {
            window.alert("Periksa kembali pilihan varian pesananmu.");
            return false;
          }

          if (
            orderItems.length > 20 ||
            orderItems.some((item) => item.price <= 0)
          ) {
            window.alert("Periksa kembali detail pesananmu.");
            return false;
          }
          
          if (
    selectedProduct.category === "Jasa" &&
    !serviceDeadline.trim()
  ) {
    window.alert("Isi tenggat waktu penyelesaian jasa terlebih dahulu.");
    return false;
  }  

          return true;
        }

        return (
          <main className="min-h-screen bg-[#faf9f6] text-[#25352b]">
            {/* HEADER */}
            <header className="sticky top-0 z-30 border-b border-black/5 bg-white/95 backdrop-blur">
              <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
                <div className="flex shrink-0 items-center gap-2">
  <a
    href="/"
    className="text-2xl font-black tracking-tight text-[#176b45]"
  >
    vokasi<span className="text-[#e9a23b]">mart.</span>
  </a>

  <button
    type="button"
    onClick={() => setShowAbout(true)}
    aria-label="Tentang VokasiMart"
    title="Tentang VokasiMart"
    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition hover:bg-[#e8f2e8] hover:text-[#176b45] focus:outline-none focus:ring-2 focus:ring-[#176b45]"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  </button>
</div>

                <nav className="hidden items-center gap-7 text-sm font-medium text-gray-600 md:flex">
                  <a href="#produk" className="hover:text-[#176b45]">
                    Jelajahi
                  </a>
                  <a href="#kategori" className="hover:text-[#176b45]">
                    Kategori
                  </a>
                  <a href="#jual" className="hover:text-[#176b45]">
                    Jadi Penjual
                  </a>
                </nav>

                <div className="flex items-center gap-2">
      {authLoading ? (
        <span className="text-xs text-gray-500 sm:text-sm">
          Memeriksa akun...
        </span>
      ) : userEmail ? (
        <>
          <div className="hidden max-w-48 rounded-xl bg-[#e8f2e8] px-3 py-2 sm:block">
            <p className="text-xs font-bold text-[#176b45]">
    {isAdmin ? "Admin VokasiMart" : "Akun penjual"}
  </p>
            <p className="truncate text-xs text-gray-600">
              {userEmail}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-100 disabled:opacity-60"
          >
            {loggingOut ? "Keluar..." : "Logout"}
          </button>
        </>
      ) : (
        
<a
  href="/auth?role=seller"
  className="rounded-xl bg-[#176b45] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#105638] sm:px-4"
>
  Mulai berjualan
</a>

      )}
    </div>
              </div>

              {userEmail && (
                <div className="border-t border-[#e1eadf] bg-[#f1f7ef] px-5 py-2 text-center text-xs text-[#176b45] sm:hidden">
                  Login sebagai {userEmail}
                </div>
              )}
            </header>

            {/* HERO */}
            <section className="mx-auto max-w-7xl px-5 pb-12 pt-10 lg:px-8 lg:pb-16 lg:pt-16">
              <div className="grid items-center gap-10 md:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e8f2e8] px-4 py-2 text-sm font-semibold text-[#176b45]">
                    🎓 Marketplace Mahasiswa Vokasi IPB
                  </div>

                  <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                    Temukan yang kamu cari,
                    <span className="text-[#218653]">
                      {" "}dukung karya mahasiswa.
                    </span>
                  </h1>

                  <p className="mt-5 max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
                    Dari makanan dan minuman hingga perlengkapan dan jasa,
  temukan usaha mahasiswa Sekolah Vokasi IPB dalam satu tempat.
                  </p>

                  <form
                    onSubmit={handleSearch}
                    className="mt-8 flex max-w-xl gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg shadow-black/5"
                  >
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Cari makanan, minuman, perlengkapan, atau jasa..."
                      aria-label="Cari produk"
                      className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none"
                    />

                    <button
                      type="submit"
                      className="rounded-xl bg-[#176b45] px-5 py-3 text-sm font-bold text-white hover:bg-[#105638]"
                    >
                      Cari
                    </button>
                  </form>
                </div>

                {/* BANNER FOTO IPB */}
                <div
                  className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[2rem] bg-[#176b45] bg-cover bg-center p-7 text-white sm:min-h-[390px] sm:p-9"
                  style={{
                    backgroundImage: "url('/images/gedungipb.png')",
                  }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-black/80"
                  />

                  <div className="relative z-10">
                    <span className="inline-block rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                      Satu kampus, banyak peluang
                    </span>

                    <p className="mt-7 text-sm text-white/90">
                      Belanja sekaligus berdayakan
                    </p>

                    <h2 className="mt-2 text-4xl font-black leading-tight sm:text-5xl">
                      Bisnis kecil,
                      <br />
                      dampak besar.
                    </h2>

                    <p className="mt-4 max-w-xs text-sm leading-6 text-white/90">
                      Temukan usaha teman kampus dan dukung kreativitas mahasiswa.
                    </p>
                  </div>

                  <p className="relative z-10 mt-10 font-bold">
                    Keluarga Vokasi IPB 🛍️
                  </p>
                </div>
              </div>
            </section>
                  
            {/* KATEGORI */}
            <section
              id="kategori"
              className="mx-auto max-w-7xl px-5 py-8 lg:px-8"
            >
              <p className="text-sm font-bold text-[#218653]">PILIH SESUKAMU</p>

              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                Jelajahi kategori
              </h2>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {categories.map((category) => (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category.name);
                      document.getElementById("produk")?.scrollIntoView({
                        behavior: "smooth",
                      });
                    }}
                    aria-pressed={selectedCategory === category.name}
                    className={`flex items-center gap-3 rounded-2xl border p-4 transition hover:shadow-md ${
                      selectedCategory === category.name
                        ? "border-green-600 bg-green-50"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <span className="text-2xl">{category.emoji}</span>
                    <span className="text-sm font-bold">{category.name}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* KATALOG PRODUK */}
            <section
              id="produk"
              className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
  <div>
    <p className="text-sm font-bold text-[#218653]">
      PILIHAN KAMPUS
    </p>

    <h2 className="mt-1 text-2xl font-black sm:text-3xl">
  {showMyCatalog ? "Katalog Saya" : "Temukan favoritmu"}
</h2>

    <p className="mt-2 text-sm text-gray-500">
  {showMyCatalog
    ? "Kelola dan lihat semua produk yang kamu jual di VokasiMart."
    : "Hubungi penjual secara langsung melalui WhatsApp."}
</p>
</div>
  <div className="flex flex-wrap items-center gap-3">
    <span className="text-sm font-semibold text-[#176b45]">
      {loading
        ? "Memuat produk..."
        : `${filteredProducts.length} produk ditemukan`}
    </span>

        <button
      type="button"
      disabled={authLoading}
      onClick={() => {
        if (!userId || !isSeller) {
          if (
            window.confirm(
              "Katalog penjual hanya dapat diakses oleh akun penjual. Login sebagai penjual sekarang?"
            )
          ) {
            window.location.href = "/auth";
          }
          return;
        }

        setShowMyCatalog((current) => !current);
        setShowTrash(false);
        setFormMessage("");
      }}
      className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
        showMyCatalog
          ? "border-[#176b45] bg-[#176b45] text-white"
          : "border-gray-200 bg-white text-[#176b45] hover:bg-[#edf5ec]"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {!userId || !isSeller
        ? "🔒 Katalog Penjual"
        : showMyCatalog
          ? "🌐 Katalog Publik"
          : "🛍️ Katalog Saya"}
    </button>

    {userId && (
      <button
        type="button"
        onClick={() => {
          setShowTrash((current) => !current);
          setFormMessage("");
        }}
        className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
          showTrash
            ? "border-[#176b45] bg-[#176b45] text-white"
            : "border-gray-200 bg-white text-[#176b45] hover:bg-[#edf5ec]"
        }`}
      >
        {showTrash ? "Tutup Sampah" : "🗑️ Sampah"}
      </button>
    )}
  </div>
</div>

              {formMessage && !showAddProduct && (
                <p
                  role="status"
                  className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
                >
                  {formMessage}
                </p>
              )}

              {/* PANEL SAMPAH PRODUK */}
{showTrash && userId && (
  <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-xl font-black text-gray-900">
          Sampah Produk
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          Produk yang dihapus dapat dipulihkan selama 30 hari.
          Foto produk tetap disimpan selama masa pemulihan.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void fetchTrashProducts()}
        disabled={trashLoading}
        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {trashLoading ? "Memuat..." : "Muat ulang"}
      </button>
    </div>

    {trashLoading ? (
      <p className="mt-6 text-sm text-gray-500">
        Memuat produk Sampah...
      </p>
    ) : trashProducts.length === 0 ? (
      <div className="mt-6 rounded-xl bg-gray-50 px-4 py-8 text-center">
        <p className="text-3xl">🗑️</p>

        <p className="mt-3 font-bold text-gray-800">
          Sampah masih kosong
        </p>

        <p className="mt-1 text-sm text-gray-500">
          Produk yang kamu hapus akan muncul di sini.
        </p>
      </div>
    ) : (
      <div className="mt-6 space-y-3">
        {trashProducts.map((product) => {
          const images = getProductImages(product);

          return (
            <article
              key={product.id}
              className="flex flex-col gap-4 rounded-xl border border-gray-100 p-3 sm:flex-row sm:items-center sm:p-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {images[0] ? (
                  <img
                    src={images[0]}
                    alt={product.name}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl">
                    {product.emoji || "📦"}
                  </div>
                )}

                <div className="min-w-0">
                  <h4 className="break-words font-bold text-gray-900">
                    {product.name}
                  </h4>

                  <p className="mt-1 text-sm text-gray-500">
                    {product.category}
                  </p>

                  <p className="mt-1 font-semibold text-[#176b45]">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(product.price)}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    Dihapus:{" "}
                    {product.deleted_at
                      ? new Date(
                          product.deleted_at
                        ).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "Tanggal tidak tersedia"}
                  </p>

                  <p className="text-xs text-gray-500">
                    {images.length} foto tersimpan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleRestoreProduct(product)}
                disabled={
                  restoringId !== null ||
                  deletingId !== null ||
                  savingProduct
                }
                className="w-full shrink-0 rounded-xl bg-[#176b45] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#125536] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {restoringId === product.id
                  ? "Memulihkan..."
                  : "Pulihkan"}
              </button>
            </article>
          );
        })}
      </div>
    )}
  </section>
)}

              <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                {loading ? (
                  <div className="col-span-full rounded-2xl bg-white px-6 py-12 text-center text-gray-500">
                    Memuat katalog dari Supabase...
                  </div>
                ) : errorMessage ? (
                  <div className="col-span-full rounded-2xl border border-red-200 bg-white px-6 py-12 text-center">
                    <p className="font-bold">Produk gagal dimuat</p>

                    <p className="mt-2 text-sm text-gray-600">{errorMessage}</p>

                    <button
                      type="button"
                      onClick={() =>
  void (showMyCatalog ? fetchMyCatalog() : fetchProducts())
}
                      className="mt-4 rounded-xl bg-[#176b45] px-5 py-3 text-sm font-bold text-white"
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const variants = getProductVariants(product);
                    const lowestPrice = Math.min(
                      ...variants.map((variant) => variant.price)
                    );

                    return (
                      <article
                        key={product.id}
                        className="overflow-hidden rounded-2xl border border-gray-100 bg-white transition hover:-translate-y-1 hover:shadow-xl"
                      >
                        <div
    className="relative flex aspect-[4/3] items-center justify-center overflow-hidden text-6xl"
    style={{
      backgroundColor:
        product.color ??
        categoryColors[product.category] ??
        "#E8F0E5",
    }}
  >
    {getProductImages(product).length > 0 ? (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getProductImages(product)[0]}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain"
        />

        {getProductImages(product).length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2.5 py-1 text-xs font-semibold text-white">
            +{getProductImages(product).length - 1} foto
          </span>
        )}
      </>
    ) : (
      product.emoji ??
      categoryEmojis[product.category] ??
      "🛍️"
    )}
  </div>

                        <div className="p-3 sm:p-4">
                          <span className="rounded-full bg-[#edf5ec] px-2.5 py-1 text-xs font-semibold text-[#176b45]">
                            {product.category}
                          </span>

                          <h3 className="mt-3 break-words font-bold leading-snug">
                            {product.name}
                          </h3>

                          <p className="mt-1 truncate text-xs text-gray-500">
                            {product.seller}
                          </p>

                          <p className="mt-3 text-base font-black text-[#176b45] sm:text-lg">
                            {variants.length > 1
                              ? `Mulai dari ${formatPrice(lowestPrice)}`
                              : formatPrice(lowestPrice)}
                          </p>

                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            className="mt-3 w-full rounded-xl border border-[#176b45] py-2.5 text-sm font-bold text-[#176b45] hover:bg-[#176b45] hover:text-white"
                          >
                            Lihat detail
                          </button>

                          {userId && (product.owner_id === userId || isAdmin) && (
    <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                onClick={() => startEditing(product)}
                                className="flex-1 rounded-lg bg-amber-50 px-2 py-2 text-xs font-bold text-amber-800"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                disabled={
                                  deletingId === product.id || !!deletingId
                                }
                                onClick={() => void handleDeleteProduct(product)}
                                className="flex-1 rounded-lg bg-red-50 px-2 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                              >
                                {deletingId === product.id ? "Menghapus..." : "Hapus"}
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
                    <span className="text-5xl">🔎</span>

                    <h3 className="mt-4 font-bold">
  {showMyCatalog
    ? "Katalog kamu masih kosong"
    : "Produk tidak ditemukan"}
</h3>

<p className="mt-2 text-sm text-gray-500">
  {showMyCatalog
    ? "Produk yang kamu tambahkan akan muncul di sini dan hanya menampilkan produk milikmu."
    : "Coba kata kunci atau kategori lain."}
</p>

{showMyCatalog && userId && isSeller && (
  <button
    type="button"
    onClick={handleStartSelling}
    className="mt-4 rounded-xl bg-[#176b45] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#125536]"
  >
    + Tambahkan produk
  </button>
)}

  
                  </div>
                )}
              </div>
            </section>

            {/* AJAKAN MENJADI PENJUAL */}
            <section
              id="jual"
              className="mx-auto max-w-7xl px-5 pb-16 lg:px-8"
            >
              <div className="flex flex-col justify-between gap-6 rounded-3xl bg-[#e8f0e5] p-7 sm:p-10 lg:flex-row lg:items-center">
                <div>
                  <p className="text-sm font-bold text-[#176b45]">PUNYA USAHA?</p>

                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    Daganganmu layak dikenal lebih luas.
                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">
      {userEmail
        ? `Kamu Masuk sebagai ${userEmail}. Tambahkan produk untuk ditampilkan.`
        : "Punya usaha? Login atau buat akun penjual untuk memperkenalkan produkmu di VokasiMart."}
    </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartSelling}
                  disabled={authLoading || savingProduct}
                  className="shrink-0 rounded-xl bg-[#176b45] px-6 py-3.5 font-bold text-white hover:bg-[#105638] disabled:opacity-60"
                >
                  {authLoading
      ? "Memeriksa akun..."
      : showAddProduct
        ? "Tutup formulir"
        : userEmail
          ? "Mulai berjualan →"
          : "Login penjual →"}
                </button>
              </div>

              {/* FORM TAMBAH / EDIT PRODUK */}
              {showAddProduct && userId && (
                <form
                  id="form-penjual"
                  onSubmit={handleAddProduct}
                  className="mt-6 scroll-mt-28 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
                >
                  <h3 className="text-xl font-black">
                    {editingProduct ? "Edit produk" : "Tambahkan produk"}
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Foto, informasi, dan kontak akan ditampilkan kepada calon pembeli.
                  </p>

                  <div className="mt-6 grid items-start gap-5 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="productName"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Nama produk
                      </label>
                      <input
                        id="productName"
                        required
                        maxLength={100}
                        value={newProductName}
                        onChange={(event) => setNewProductName(event.target.value)}
                        placeholder="Contoh: Kopi Susu Gula Aren"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#176b45]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="block text-sm font-semibold">
                          Varian dan harga produk
                        </label>

                        <button
                          type="button"
                          onClick={addProductVariant}
                          disabled={newProductVariants.length >= 30}
                          className="rounded-lg bg-[#edf5ec] px-3 py-2 text-sm font-bold text-[#176b45] disabled:opacity-50"
                        >
                          + Tambah varian
                        </button>
                      </div>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Masukkan nama pilihan atau varian beserta harganya.
  Semua foto digunakan untuk satu produk beserta seluruh variannya.
                      </p>

                      <div className="mt-3 space-y-3">
                        {newProductVariants.map((variant, index) => (
                          <div
                            key={variant.id}
                            className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-3 sm:grid-cols-[1fr_180px_auto] sm:items-end"
                          >
                            <div>
                              <label
                                htmlFor={`variant-name-${variant.id}`}
                                className="mb-1.5 block text-xs font-semibold"
                              >
                                Nama varian {index + 1}
                              </label>

                              <input
                                id={`variant-name-${variant.id}`}
                                type="text"
                                required
                                maxLength={100}
                                value={variant.name}
                                onChange={(event) =>
                                  updateProductVariant(
                                    variant.id,
                                    "name",
                                    event.target.value
                                  )
                                }
                                placeholder="Contoh: Original, Matcha, Lemon"
                                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-[#176b45]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`variant-price-${variant.id}`}
                                className="mb-1.5 block text-xs font-semibold"
                              >
                                Harga (Rp)
                              </label>

                              <input
                                id={`variant-price-${variant.id}`}
                                type="number"
                                required
                                min="1"
                                step="1"
                                value={variant.price}
                                onChange={(event) =>
                                  updateProductVariant(
                                    variant.id,
                                    "price",
                                    event.target.value
                                  )
                                }
                                placeholder="3000"
                                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-[#176b45]"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => removeProductVariant(variant.id)}
                              disabled={newProductVariants.length <= 1}
                              aria-label={`Hapus varian ${index + 1}`}
                              className="rounded-xl border border-red-200 px-3 py-3 text-sm font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    
                    <div>
                      <label
                        htmlFor="productCategory"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Kategori
                      </label>
                      <select
                        id="productCategory"
                        value={newProductCategory}
                        onChange={(event) => setNewProductCategory(event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#176b45]"
                      >
                        {categories
                          .filter((category) => category.name !== "Semua")
                          .map((category) => (
                            <option key={category.name} value={category.name}>
                              {category.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="productSeller"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Nama toko atau penjual
                      </label>
                      <input
                        id="productSeller"
                        required
                        maxLength={100}
                        value={newProductSeller}
                        onChange={(event) => setNewProductSeller(event.target.value)}
                        placeholder="Contoh: Kopi Sudut Vokasi"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#176b45]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="productWhatsApp"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Nomor WhatsApp aktif
                      </label>
                      <input
                        id="productWhatsApp"
                        type="tel"
                        required
                        maxLength={20}
                        value={newProductWhatsApp}
                        onChange={(event) => setNewProductWhatsApp(event.target.value)}
                        placeholder="081234567890"
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#176b45]"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Bisa menggunakan awalan 08, 62, atau +62.
                      </p>
                    </div>

                    <div className="min-w-0">
    <label
      htmlFor="productImage"
      className="mb-2 block text-sm font-semibold"
    >
      Foto produk
    </label>

    
  <input
    key={imageInputKey}
    id="productImage"
    type="file"
    accept="image/*"
    multiple
    onChange={handleImageChange}
    className="w-full min-w-0 rounded-xl border border-gray-200 px-3 py-3 text-sm"
  />


    <p className="mt-1 text-xs leading-5 text-gray-500">
      Pilih beberapa foto sekaligus. Maksimal 10 foto per produk,
      dengan ukuran maksimal 5 MB per foto.
    </p>

    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {existingImageUrls.map((url, index) => (
        <div
          key={url}
          className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
        >
          <div className="aspect-[4/3] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Foto produk ${index + 1}`}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="p-2">
            <p className="mb-2 truncate text-xs text-gray-500">
              {index === 0 ? "Foto utama" : `Foto ${index + 1}`}
            </p>

            <button
              type="button"
              disabled={savingProduct}
              onClick={() => {
                setExistingImageUrls((urls) =>
                  urls.filter((item) => item !== url)
                );
              }}
              className="w-full rounded-lg bg-red-50 px-2 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
            >
              Hapus foto
            </button>
          </div>
        </div>
      ))}

      {imagePreviewUrls.map((url, index) => (
        <div
          key={url}
          className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
        >
          <div className="aspect-[4/3] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Foto baru ${index + 1}`}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="p-2">
            <p className="mb-2 truncate text-xs text-gray-500">
              Foto baru {index + 1}
            </p>

            <button
              type="button"
              disabled={savingProduct}
              onClick={() => {
                URL.revokeObjectURL(url);

                setImagePreviewUrls((urls) =>
                  urls.filter((item) => item !== url)
                );

                setNewProductImages((files) =>
                  files.filter((_, fileIndex) => {
                    const previewIndex = imagePreviewUrls.indexOf(url);
                    return fileIndex !== previewIndex;
                  })
                );
              }}
              className="w-full rounded-lg bg-red-50 px-2 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
            >
              Hapus foto
            </button>
          </div>
        </div>
      ))}
    </div>

    {existingImageUrls.length + newProductImages.length > 0 && (
      <p className="mt-3 text-xs font-semibold text-[#176b45]">
        {existingImageUrls.length + newProductImages.length} foto dipilih
      </p>
    )}
  </div>

                    <div className="min-w-0">
                      <label
                        htmlFor="productDescription"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Deskripsi produk
                      </label>
                      <textarea
                        id="productDescription"
                        rows={4}
                        maxLength={2000}
                        value={newProductDescription}
                        onChange={(event) =>
                          setNewProductDescription(event.target.value)
                        }
                        placeholder="Jelaskan produk, ukuran, varian, lokasi, atau informasi penting lainnya."
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#176b45]"
                      />
                    </div>

                  </div>

                  {formMessage && (
                    <p
                      role="alert"
                      className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                    >
                      {formMessage}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={savingProduct || !!deletingId}
                      className="rounded-xl bg-[#176b45] px-5 py-3.5 text-sm font-bold text-white hover:bg-[#105638] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingProduct
                        ? "Menyimpan..."
                        : editingProduct
                          ? "Simpan perubahan"
                          : "Publikasikan produk"}
                    </button>

                    <button
                      type="button"
                      disabled={savingProduct}
                      onClick={() => {
                        resetForm();
                        setShowAddProduct(false);
                        setFormMessage("");
                      }}
                      className="rounded-xl border border-gray-200 px-5 py-3.5 text-sm font-bold hover:bg-gray-50 disabled:opacity-60"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* MODAL DETAIL PRODUK DAN PEMESANAN */}
            {selectedProduct && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
                onClick={() => setSelectedProduct(null)}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="detail-product-title"
                  className="my-auto max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  
      <div className="grid items-start gap-6 p-5 sm:p-6 md:grid-cols-2">
        {/* KOLOM FOTO */}
        {/* KOLOM FOTO */}
  <div className="min-w-0">
    {getProductImages(selectedProduct).length > 0 ? (
      <div className="space-y-3">
        {/* FOTO UTAMA */}
        <div className="relative overflow-hidden rounded-2xl bg-gray-50">
          <button
            type="button"
            onClick={() => setShowImageFullscreen(true)}
            className="flex max-h-[70vh] min-h-56 w-full items-center justify-center"
            aria-label="Perbesar foto produk"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                getProductImages(selectedProduct)[
                  activeImageIndex
                ] ?? getProductImages(selectedProduct)[0]
              }
              alt={`${selectedProduct.name} - foto ${activeImageIndex + 1}`}
              className="block max-h-[70vh] w-full object-contain"
            />
          </button>

          {/* TOMBOL FOTO SEBELUMNYA */}
          {getProductImages(selectedProduct).length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActiveImageIndex((current) =>
                    current === 0
                      ? getProductImages(selectedProduct).length - 1
                      : current - 1
                  )
                }
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl shadow hover:bg-white"
                aria-label="Foto sebelumnya"
              >
                ‹
              </button>

              {/* TOMBOL FOTO BERIKUTNYA */}
              <button
                type="button"
                onClick={() =>
                  setActiveImageIndex((current) =>
                    (current + 1) %
                    getProductImages(selectedProduct).length
                  )
                }
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl shadow hover:bg-white"
                aria-label="Foto berikutnya"
              >
                ›
              </button>

              <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white">
                {activeImageIndex + 1}/{getProductImages(selectedProduct).length}
              </span>
            </>
          )}
        </div>

        {/* THUMBNAIL FOTO */}
        {getProductImages(selectedProduct).length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {getProductImages(selectedProduct).map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className={`w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-gray-50 ${
                  activeImageIndex === index
                    ? "border-green-600"
                    : "border-gray-200"
                }`}
                aria-label={`Pilih foto ${index + 1}`}
                aria-pressed={activeImageIndex === index}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${selectedProduct.name} - thumbnail ${index + 1}`}
                  className="aspect-square w-full object-contain"
                />
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-gray-500">
          Klik foto untuk memperbesar.
        </p>
      </div>
    ) : (
      <div className="flex min-h-56 items-center justify-center rounded-2xl bg-gray-50 text-6xl">
        {selectedProduct.emoji ?? "🛍️"}
      </div>
    )}
  </div>

        {/* KOLOM INFORMASI DAN DESKRIPSI */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="rounded-full bg-[#edf5ec] px-3 py-1 text-xs font-semibold text-[#176b45]">
                {selectedProduct.category}
              </span>

              <h2
                id="detail-product-title"
                className="mt-3 break-words text-2xl font-black"
              >
                {selectedProduct.name}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Penjual: {selectedProduct.seller}
              </p>
            </div>

            <button
              type="button"
              aria-label="Tutup detail"
              onClick={() => setSelectedProduct(null)}
              className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-lg hover:bg-gray-200"
            >
              ✕
            </button>
          </div>

          <p className="mt-4 text-2xl font-black text-[#176b45]">
            {getProductVariants(selectedProduct).length > 1
              ? `Mulai dari ${formatPrice(
                  Math.min(
                    ...getProductVariants(selectedProduct).map(
                      (variant) => variant.price
                    )
                  )
                )}`
              : formatPrice(getProductVariants(selectedProduct)[0].price)}
          </p>

          <h3 className="mt-5 font-bold">Deskripsi produk</h3>

          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
            {selectedProduct.description ||
              "Penjual belum menambahkan deskripsi produk."}
          </p>
        </div>
      </div>

                    {/* IDENTITAS PEMBELI */}
                    <div className="mt-6 rounded-2xl border border-gray-200 bg-[#fafcf9] p-4">
                      <h3 className="text-lg font-black">Identitas pembeli</h3>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Isi data ini agar penjual dapat mengenali pesananmu.
                      </p>

                      <div className="mt-4 space-y-4">
                        <div>
                          <label
                            htmlFor="buyerName"
                            className="mb-1.5 block text-sm font-semibold"
                          >
                            Atas nama *
                          </label>
                          <input
                            id="buyerName"
                            type="text"
                            required
                            maxLength={100}
                            autoComplete="name"
                            value={buyerName}
                            onChange={(event) => setBuyerName(event.target.value)}
                            placeholder="Nama lengkap pembeli"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#176b45]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="buyerClass"
                            className="mb-1.5 block text-sm font-semibold"
                          >
                            Kelas *
                          </label>
                          <input
                            id="buyerClass"
                            type="text"
                            required
                            maxLength={50}
                            value={buyerClass}
                            onChange={(event) => setBuyerClass(event.target.value)}
                            placeholder="Contoh: AKN 2A"
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#176b45]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="buyerGeneration"
                            className="mb-1.5 block text-sm font-semibold"
                          >
                            Angkatan *
                          </label>
                          <select
                            id="buyerGeneration"
                            required
                            value={buyerGeneration}
                            onChange={(event) =>
                              setBuyerGeneration(event.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#176b45]"
                          >
                            <option value="">Pilih angkatan</option>
                            {["59", "60", "61", "62", "63"].map((generation) => (
                              <option key={generation} value={generation}>
                                Angkatan {generation}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* DETAIL PESANAN MULTI-VARIAN */}
                    <div className="mt-5 rounded-2xl border border-gray-200 p-4">
                      <div>
                        <h3 className="text-lg font-black">Detail pesanan</h3>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Setiap baris untuk satu varian. Jika membeli beberapa
                          rasa, tambahkan baris baru dan tentukan jumlahnya.
                        </p>
                      </div>

                      <div className="mt-4 space-y-4">
                        {orderItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-gray-200 bg-white p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="font-bold">
                                Pesanan {index + 1}
                              </h4>

                              {orderItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeOrderItem(item.id)}
                                  className="rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                                >
                                  Hapus
                                </button>
                              )}
                            </div>

                            <p className="mt-3 break-words font-semibold">
                              {selectedProduct.name}
                            </p>

                            <p className="mt-1 text-sm text-[#176b45]">
                              {formatPrice(item.price)} / pcs
                            </p>

                            <div className="mt-4">
                              <label
                                htmlFor={`variant-${item.id}`}
                                className="mb-1.5 block text-sm font-semibold"
                              >
                                Rasa atau varian
                              </label>

                              <select
                                id={`variant-${item.id}`}
                                required
                                value={item.variant}
                                onChange={(event) =>
                                  updateOrderVariant(item.id, event.target.value)
                                }
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#176b45]"
                              >
                                {getProductVariants(selectedProduct).map(
                                  (variant) => (
                                    <option
                                      key={variant.name}
                                      value={variant.name}
                                    >
                                      {variant.name} — {formatPrice(variant.price)}
                                    </option>
                                  )
                                )}
                              </select>

                              <p className="mt-1 text-xs text-gray-500">
                                Pilih varian yang diinginkan dari daftar.
                              </p>
                            </div>

                            <div className="mt-4">
                              <label className="mb-2 block text-sm font-semibold">
                                Jumlah pesanan
                              </label>

                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  aria-label="Kurangi jumlah pesanan"
                                  disabled={item.quantity <= 1}
                                  onClick={() =>
                                    updateOrderItem(
                                      item.id,
                                      "quantity",
                                      Math.max(1, item.quantity - 1)
                                    )
                                  }
                                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-xl font-bold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  −
                                </button>

                                <span
                                  aria-live="polite"
                                  className="min-w-6 text-center font-black"
                                >
                                  {item.quantity}
                                </span>

                                <button
                                  type="button"
                                  aria-label="Tambah jumlah pesanan"
                                  disabled={item.quantity >= 99}
                                  onClick={() =>
                                    updateOrderItem(
                                      item.id,
                                      "quantity",
                                      Math.min(99, item.quantity + 1)
                                    )
                                  }
                                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-xl font-bold hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  +
                                </button>

                                <span className="ml-auto text-right text-sm font-black text-[#176b45]">
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* TOMBOL TAMBAH PESANAN */}
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={addOrderItem}
                          disabled={orderItems.length >= 20}
                          className="rounded-xl bg-[#176b45] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#105638] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          + Tambah pesanan
                        </button>
                      </div>

                      {/* RINGKASAN TOTAL */}
                      <div className="mt-5 rounded-2xl bg-[#edf5ec] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-gray-600">
                            Total jumlah
                          </p>
                          <p className="font-bold">
                            {totalQuantity} pcs/porsi
                          </p>
                        </div>

                        <div className="mt-3 flex items-end justify-between gap-3">
                          <p className="text-sm text-gray-600">
                            Total sementara
                          </p>
                          <p className="text-xl font-black text-[#176b45]">
                            {formatPrice(orderTotal)}
                          </p>
                        </div>

                        <p className="mt-2 text-xs text-gray-500">
                          Total dihitung otomatis berdasarkan harga varian yang
                          dipilih dikalikan jumlah pada setiap baris pesanan.
                        </p>
                      </div>

                      {/* WAKTU PENGAMBILAN */}
                      {/* WAKTU PENGAMBILAN / TENGGAT JASA */}
  {/* WAKTU PENGAMBILAN / TENGGAT JASA */}
  <div className="mt-5">
    {selectedProduct.category === "Jasa" ? (
      <>
        <label
          htmlFor="serviceDeadline"
          className="mb-1.5 block text-sm font-semibold"
        >
          Tenggat waktu penyelesaian *
        </label>

        <input
          id="serviceDeadline"
          type="datetime-local"
          required
          value={serviceDeadline}
          onChange={(event) => setServiceDeadline(event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#176b45]"
        />

        <p className="mt-1.5 text-xs leading-5 text-gray-500">
          Tentukan tanggal dan waktu paling lambat jasa harus selesai.
        </p>
      </>
    ) : (
      <>
        <label
          htmlFor="pickupTime"
          className="mb-1.5 block text-sm font-semibold"
        >
          Waktu pengambilan *
        </label>

        <select
          id="pickupTime"
          required
          value={pickupTime}
          onChange={(event) => setPickupTime(event.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#176b45]"
        >
          {pickupOptions.map((option) => (
            <option key={option} value={option}>
              {option.includes("Pilih sendiri")
                ? option
                : `${option} WIB`}
            </option>
          ))}
        </select>

        <p className="mt-1.5 text-xs leading-5 text-gray-500">
          Pilih waktu pengambilan dari pukul 06.00 sampai 17.00.
          Pastikan kembali ketersediaan waktu dengan penjual.
        </p>
      </>
    )}
  </div>

                      {/* CATATAN TAMBAHAN */}
                      {/* CATATAN TAMBAHAN */}
  <div className="mt-5">
    <label
      htmlFor="orderNotes"
      className="mb-1.5 block text-sm font-semibold"
    >
      {selectedProduct.category === "Jasa"
        ? "Detail kebutuhan jasa (opsional)"
        : "Catatan tambahan (opsional)"}
    </label>

    <textarea
      id="orderNotes"
      rows={3}
      maxLength={500}
      value={orderNotes}
      onChange={(event) => setOrderNotes(event.target.value)}
      placeholder={
        selectedProduct.category === "Jasa"
          ? "Jelaskan kebutuhan, ruang lingkup pekerjaan, atau detail yang perlu diperhatikan penyedia jasa..."
          : "Contoh: Berikan catatan kepada penyedia makanan/minuman/perlengkapan..."
      }
      className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-[#176b45]"
    />

    <p className="mt-1 text-right text-xs text-gray-400">
      {orderNotes.length}/500
    </p>

      <p className="mt-1.5 text-xs leading-5 text-gray-500">
      {selectedProduct.category === "Jasa"
        ? "Jelaskan kebutuhan pekerjaanmu secara jelas. Pastikan ruang lingkup pekerjaan, tenggat waktu, dan kesepakatan penyelesaian dikonfirmasi dengan penyedia jasa melalui WhatsApp."
        : "Tambahkan permintaan khusus untuk penjual. Konfirmasikan kembali detail pesanan dan waktu pengambilan melalui WhatsApp."}
    </p>
  </div>

  </div>

  {/* TOMBOL WHATSAPP */}

                    {/* TOMBOL WHATSAPP */}
                    {/* TOMBOL WHATSAPP */}
  {getWhatsAppUrl(
    selectedProduct,
    "order",
    buyerName,
    buyerClass,
    buyerGeneration,
    orderItems,
    pickupTime,
    orderNotes,
    serviceDeadline
  ) ? (
    <a
      href={
        getWhatsAppUrl(
          selectedProduct,
          "order",
          buyerName,
          buyerClass,
          buyerGeneration,
          orderItems,
          pickupTime,
          orderNotes,
          serviceDeadline
        ) ?? undefined
      }
      onClick={(event) => {
        if (!validateBuyer()) {
          event.preventDefault();
        }
      }}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-5 block rounded-xl bg-[#1FA855] px-5 py-3.5 text-center font-bold text-white hover:bg-[#168744]"
    >
      Pesan produk via WhatsApp ↗
    </a>
  ) : (
    <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
      Nomor WhatsApp penjual belum tersedia atau tidak valid.
    </p>
  )}

  {getWhatsAppUrl(
    selectedProduct,
    "inquiry",
    buyerName,
    buyerClass,
    buyerGeneration,
    orderItems,
    pickupTime,
    orderNotes,
    serviceDeadline
  ) && (
    <a
      href={
        getWhatsAppUrl(
          selectedProduct,
          "inquiry",
          buyerName,
          buyerClass,
          buyerGeneration,
          orderItems,
          pickupTime,
          orderNotes,
          serviceDeadline
        ) ?? undefined
      }
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 block rounded-xl border border-[#176b45] px-5 py-3.5 text-center font-bold text-[#176b45] hover:bg-[#edf5ec]"
    >
      Tanya-tanya dulu ↗
    </a>
  )}

  <p className="mt-4 text-xs leading-5 text-gray-400">
    Identitas pembeli dan detail pesanan akan dimasukkan ke pesan
    WhatsApp, tetapi tidak disimpan otomatis ke database VokasiMart.
    Harga total belum termasuk biaya tambahan jika ada. Konfirmasi
    ketersediaan, pembayaran, dan waktu pengambilan langsung kepada
    penjual. VokasiMart belum memproses pembayaran atau memverifikasi
    bukti pembayaran secara otomatis.
  </p>

                    {/* EDIT / HAPUS PRODUK MILIK SENDIRI */}
                    {userId &&
    (selectedProduct.owner_id === userId || isAdmin) && (
      <div className="mt-4 flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEditing(selectedProduct)}
                          disabled={!!deletingId || savingProduct}
                          className="flex-1 rounded-xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 disabled:opacity-50"
                        >
                          Edit produk
                        </button>

                        <button
                          type="button"
                          disabled={!!deletingId || savingProduct}
                          onClick={() => void handleDeleteProduct(selectedProduct)}
                          className="flex-1 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50"
                        >
                          Hapus produk
                        </button>
                      </div>
                    )}
                  
                </section>
              </div>
            )}

            
            {/* FULLSCREEN FOTO PRODUK */}
            {showImageFullscreen &&
              selectedProduct &&
              getProductImages(selectedProduct).length > 0 && (
                <div
                  className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Foto produk layar penuh"
                  onClick={() => setShowImageFullscreen(false)}
                >
                  {/* TOMBOL TUTUP */}
                  <button
                    type="button"
                    onClick={() => setShowImageFullscreen(false)}
                    className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25"
                    aria-label="Tutup foto layar penuh"
                  >
                    ×
                  </button>

                  {/* FOTO PRODUK */}
                  <div
                    className="flex h-full w-full items-center justify-center"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        getProductImages(selectedProduct)[activeImageIndex] ??
                        getProductImages(selectedProduct)[0]
                      }
                      alt={`${selectedProduct.name} - foto ${activeImageIndex + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* TOMBOL FOTO SEBELUMNYA DAN BERIKUTNYA */}
                  {getProductImages(selectedProduct).length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveImageIndex((current) =>
                            current === 0
                              ? getProductImages(selectedProduct).length - 1
                              : current - 1
                          );
                        }}
                        className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25"
                        aria-label="Foto sebelumnya"
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveImageIndex(
                            (current) =>
                              (current + 1) %
                              getProductImages(selectedProduct).length
                          );
                        }}
                        className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25"
                        aria-label="Foto berikutnya"
                      >
                        ›
                      </button>

                      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white">
                        {activeImageIndex + 1} /{" "}
                        {getProductImages(selectedProduct).length}
                      </span>
                    </>
                  )}
                </div>
              )}


            
            {/* FOOTER */}
            <footer className="border-t border-gray-200 bg-white">
              <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                <p className="text-lg font-black text-[#176b45]">
                  vokasi<span className="text-[#e9a23b]">mart.</span>
                </p>

                <p>
                  Marketplace mahasiswa Sekolah Vokasi IPB · Katalog produk
                </p>
              </div>
            </footer>

            {/* MODAL TENTANG VOKASIMART */}
            {showAbout && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                onClick={() => setShowAbout(false)}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="about-vokasimart-title"
                  className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  {/* HEADER MODAL */}
                  <div className="relative overflow-hidden bg-[#176b45] px-6 py-8 text-white sm:px-9 sm:py-10">
                    <div
                      aria-hidden="true"
                      className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[24px] border-white/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowAbout(false)}
                      aria-label="Tutup informasi VokasiMart"
                      className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-2xl text-white transition hover:bg-white/25"
                    >
                      ×
                    </button>

                    <p className="text-sm font-semibold tracking-widest text-white/75">
                      MENGENAL LEBIH DEKAT
                    </p>

                    <h2
                      id="about-vokasimart-title"
                      className="mt-3 text-3xl font-black sm:text-4xl"
                    >
                      vokasi<span className="text-[#e9a23b]">mart.</span>
                    </h2>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/90 sm:text-base">
                      Satu ruang untuk menemukan produk, mendukung karya,
                      dan membuka peluang usaha mahasiswa Sekolah Vokasi IPB.
                    </p>

                    <div className="mt-5 inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold">
                      🎓 Marketplace Mahasiswa Vokasi IPB
                    </div>
                  </div>

                  {/* ISI MODAL */}
                  <div className="space-y-7 px-6 py-7 sm:px-9 sm:py-9">
                    <section>
                      <h3 className="text-lg font-extrabold text-gray-900">
                        Apa itu VokasiMart?
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-gray-600">
                        VokasiMart merupakan platform marketplace yang
                        dirancang untuk mempertemukan mahasiswa sebagai
                        penjual dengan komunitas kampus sebagai calon pembeli.
                        Platform ini menjadi wadah digital untuk menampilkan
                        produk maupun jasa, sehingga usaha mahasiswa lebih
                        mudah dikenal dan calon pembeli memiliki tempat untuk
                        menemukan berbagai penawaran dalam satu platform.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-extrabold text-gray-900">
                        Berawal dari sebuah keresahan
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-gray-600">
                        Di lingkungan kampus, peluang usaha dapat muncul
                        dari berbagai hal: makanan rumahan, minuman, kebutuhan
                        kuliah, perlengkapan sehari-hari, hingga jasa yang
                        ditawarkan sesama mahasiswa. Namun, informasi mengenai
                        usaha tersebut berpotensi tersebar di berbagai kanal
                        komunikasi, sehingga produk sulit ditemukan dan
                        promosi belum terpusat. VokasiMart hadir sebagai
                        gagasan untuk menjawab tantangan tersebut melalui
                        katalog digital yang lebih terorganisasi dan mudah
                        dijelajahi.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-extrabold text-gray-900">
                        Manfaat yang ingin diwujudkan
                      </h3>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <span className="text-2xl">🛍️</span>
                          <h4 className="mt-2 font-bold text-gray-900">
                            Bagi pembeli
                          </h4>
                          <p className="mt-1 text-sm leading-6 text-gray-600">
                            Memudahkan pencarian produk dan jasa yang
                            ditawarkan di lingkungan mahasiswa.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <span className="text-2xl">🚀</span>
                          <h4 className="mt-2 font-bold text-gray-900">
                            Bagi penjual
                          </h4>
                          <p className="mt-1 text-sm leading-6 text-gray-600">
                            Menyediakan ruang promosi untuk memperkenalkan
                            produk dan menjangkau calon pelanggan.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <span className="text-2xl">🤝</span>
                          <h4 className="mt-2 font-bold text-gray-900">
                            Bagi komunitas kampus
                          </h4>
                          <p className="mt-1 text-sm leading-6 text-gray-600">
                            Mendorong interaksi ekonomi dan dukungan
                            terhadap karya sesama mahasiswa.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <span className="text-2xl">💡</span>
                          <h4 className="mt-2 font-bold text-gray-900">
                            Bagi pengembangan bisnis
                          </h4>
                          <p className="mt-1 text-sm leading-6 text-gray-600">
                            Membuka peluang pengembangan ekosistem usaha
                            mahasiswa yang lebih terstruktur dan berkelanjutan.
                          </p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-extrabold text-gray-900">
                        Ide dan peluang bisnis
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-gray-600">
                        VokasiMart mengusung konsep marketplace khusus
                        komunitas mahasiswa. Pengembangan bisnis ke depannya
                        dapat mencakup katalog produk dan jasa, fitur pencarian
                        dan kategori, etalase penjual, serta peluang promosi
                        berbayar atau layanan tambahan bagi penjual apabila
                        kebutuhan pasar sudah tervalidasi. Dengan pendekatan
                        bertahap, VokasiMart berpotensi berkembang dari
                        katalog digital menjadi ekosistem kewirausahaan
                        mahasiswa. Fitur komersial tersebut merupakan peluang
                        pengembangan, bukan berarti semuanya sudah tersedia.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-lg font-extrabold text-gray-900">
                        Para pengembang
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        VokasiMart dikembangkan melalui kolaborasi tim
                        mahasiswa yang membawa gagasan untuk mendukung
                        kreativitas dan kewirausahaan di lingkungan kampus.
                      </p>

                      <div className="mt-4 space-y-3">
                        {[
                          {
                            name: "Ayessya Fatma Nandira",
                            nim: "J0414261005",
                          },
                          {
                            name: "Ilyas Mufid",
                            nim: "J0414261024",
                          },
                          {
                            name: "Rayya Syiffa Dewanti",
                            nim: "J0414261138",
                          },
                          {
                            name: "Olivia Dameria Panjaitan",
                            nim: "J0414261175",
                          },
                          {
                            name: "Muhammad Fakhri Ramadhan",
                            nim: "J0414261295",
                          },
                        ].map((person) => (
                          <div
                            key={person.nim}
                            className="flex items-center gap-3 rounded-xl border border-gray-100 p-3"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f2e8] font-bold text-[#176b45]">
                              {person.name
                                .split(" ")
                                .map((part) => part[0])
                                .slice(0, 2)
                                .join("")}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900">
                                {person.name}
                              </p>
                              <p className="mt-0.5 text-xs text-gray-500">
                                {person.nim}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="rounded-2xl bg-[#f1f7ef] p-5 text-center">
                      <p className="text-lg font-black text-[#176b45]">
                        Bisnis kecil, dampak besar.
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        Mari dukung karya mahasiswa dan tumbuhkan peluang
                        bersama melalui VokasiMart.
                      </p>
                    </div>

                    <div className="flex justify-end border-t border-gray-100 pt-5">
                      <button
                        type="button"
                        onClick={() => setShowAbout(false)}
                        className="rounded-xl bg-[#176b45] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#105638]"
                      >
                        Mengerti
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </main>
        );
      }
