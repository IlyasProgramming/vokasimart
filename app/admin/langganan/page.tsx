
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SubscriptionPlan = {
  id: string;
  plan_code: string;
  plan_name: string;
  benefit_type: string;
  price: number;
  quota_increment: number;
  duration_days: number;
  display_order: number;
};

type ActivationResult = {
  success: boolean;
  activation_code: string;
  plan_name: string;
  price: number;
  expires_at: string;
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

export default function AdminLanggananPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [validityDays, setValidityDays] = useState("7");

  const [loadingPlans, setLoadingPlans] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<ActivationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function getUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        setUserId(null);
        setCheckingAuth(false);
        return;
      }

      setUserId(data.user.id);
      setCheckingAuth(false);
    }

    void getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserId(session?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select(
          "id, plan_code, plan_name, benefit_type, price, quota_increment, duration_days, display_order"
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      const availablePlans = (data ?? []) as SubscriptionPlan[];

      setPlans(availablePlans);

      setSelectedPlan((current) =>
        availablePlans.some((plan) => plan.plan_code === current)
          ? current
          : availablePlans[0]?.plan_code ?? ""
      );
    } catch (error) {
      console.error("Gagal mengambil paket:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal mengambil daftar paket."
      );
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function checkAdminRole() {
      setIsAdmin(false);

      if (!userId) return;

      try {
        const { data, error } = await supabase.rpc("is_admin");

        if (error) throw error;

        if (active && data === true) {
          setIsAdmin(true);
          await loadPlans();
        }
      } catch (error) {
        console.error("Gagal memeriksa admin:", error);

        if (active) {
          setErrorMessage("Gagal memeriksa hak akses admin.");
        }
      }
    }

    void checkAdminRole();

    return () => {
      active = false;
    };
  }, [userId, loadPlans]);

  async function createActivationCode() {
    if (!selectedPlan || creating) return;

    const days = Number(validityDays);

    console.log("PEMERIKSAAN MASA BERLAKU:", {
  validityDays,
  days,
  selectedPlan,
});

    if (!Number.isInteger(days) || days < 1 || days > 90) {
      setErrorMessage("Masa berlaku kode harus antara 1–90 hari.");
      return;
    }

    setCreating(true);
    setErrorMessage("");
    setResult(null);
    setCopied(false);

    try {
      const { data, error } = await supabase.rpc(
        "admin_create_activation_code",
        {
          p_plan_code: selectedPlan,
          p_validity_days: days,
        }
      );

      if (error) throw error;

      const response = data as ActivationResult;

      if (!response?.success || !response.activation_code) {
        throw new Error("Kode aktivasi gagal dibuat.");
      }

      setResult(response);
    } catch (error) {
      console.error("Gagal membuat kode:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat membuat kode aktivasi."
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyCode() {
    if (!result?.activation_code) return;

    try {
      await navigator.clipboard.writeText(result.activation_code);
      setCopied(true);
    } catch {
      setErrorMessage("Gagal menyalin kode. Silakan salin secara manual.");
    }
  }

  const selectedPlanData = plans.find(
    (plan) => plan.plan_code === selectedPlan
  );

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Memeriksa akun...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-900">
            Login Diperlukan
          </h1>
          <p className="text-gray-500 mt-2">
            Silakan login untuk mengakses pengelolaan langganan.
          </p>
          <a
            href="/auth"
            className="inline-block mt-6 rounded-xl bg-green-700 text-white px-6 py-3 font-semibold"
          >
            Login
          </a>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-gray-900">
            Akses Ditolak
          </h1>
          <p className="text-gray-500 mt-2">
            Halaman ini hanya dapat diakses oleh administrator VokasiMart.
          </p>
          <a
            href="/"
            className="inline-block mt-6 text-green-700 font-semibold"
          >
            Kembali ke Beranda
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <a
            href="/"
            className="text-sm text-green-700 hover:underline"
          >
            ← Kembali ke VokasiMart
          </a>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-4">
            Admin Langganan
          </h1>

          <p className="text-gray-500 mt-2">
            Kelola paket dan buat kode aktivasi untuk penjual VokasiMart.
          </p>
        </div>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7 mb-6">
          <h2 className="text-lg font-bold text-gray-900">
            Paket Langganan
          </h2>

          <p className="text-sm text-gray-500 mt-1 mb-5">
            Daftar paket diambil langsung dari database.
          </p>

          {loadingPlans ? (
            <p className="text-gray-500">Memuat paket...</p>
          ) : plans.length === 0 ? (
            <p className="text-gray-500">
              Belum ada paket aktif.
            </p>
          ) : (
            <div className="grid sm:grid-cols-3 gap-3">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlan(plan.plan_code);
                    setResult(null);
                    setErrorMessage("");
                  }}
                  className={`text-left rounded-xl border p-4 transition ${
                    selectedPlan === plan.plan_code
                      ? "border-green-600 bg-green-50 ring-1 ring-green-600"
                      : "border-gray-200 hover:border-green-400"
                  }`}
                >
                  <p className="font-semibold text-gray-900">
                    {plan.plan_name}
                  </p>

                  <p className="text-lg font-bold text-green-700 mt-3">
                    {formatRupiah(Number(plan.price))}
                  </p>

                  <p className="text-sm text-gray-600 mt-2">
                    {plan.quota_increment > 0
                      ? `+${plan.quota_increment} kuota permanen`
                      : `Perpanjangan ${plan.duration_days} hari`}
                  </p>

                  {selectedPlan === plan.plan_code && (
                    <p className="text-xs font-semibold text-green-700 mt-3">
                      ✓ Dipilih
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-7">
          <h2 className="text-lg font-bold text-gray-900">
            Buat Kode Aktivasi
          </h2>

          <p className="text-sm text-gray-500 mt-1 mb-6">
            Kode hanya ditampilkan satu kali setelah berhasil dibuat.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Paket yang dipilih
              </label>

              <div className="rounded-xl bg-gray-50 border p-4">
                <p className="font-semibold text-gray-900">
                  {selectedPlanData?.plan_name ?? "Pilih paket"}
                </p>
                {selectedPlanData && (
                  <p className="text-sm text-gray-500 mt-1">
                    {formatRupiah(Number(selectedPlanData.price))}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="validity"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Masa berlaku kode aktivasi
              </label>

              <div className="flex items-center gap-3">
                <input
                  id="validity"
                  type="number"
                  min="1"
                  max="90"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  className="w-28 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-green-600"
                />
                <span className="text-gray-500 text-sm">hari</span>
              </div>

              <p className="text-xs text-gray-400 mt-2">
                Kode akan kedaluwarsa sesuai jumlah hari yang ditentukan,
                bukan masa aktif benefit paket.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={createActivationCode}
              disabled={
                creating ||
                loadingPlans ||
                plans.length === 0 ||
                !selectedPlan
              }
              className="w-full rounded-xl bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-3.5 transition"
            >
              {creating ? "Membuat kode..." : "Buat Kode Aktivasi"}
            </button>
          </div>
        </section>

        {result && (
          <section className="mt-6 bg-white border border-green-200 rounded-2xl p-5 sm:p-7">
            <div className="flex items-center gap-2 text-green-700">
              <span className="text-xl">✓</span>
              <h2 className="font-bold text-lg">
                Kode Berhasil Dibuat
              </h2>
            </div>

            <p className="text-sm text-gray-500 mt-3">
              {result.plan_name}
            </p>

            <div className="mt-4 rounded-xl bg-gray-50 border border-dashed border-gray-300 p-4">
              <p className="text-xs text-gray-500 mb-2">
                KODE AKTIVASI
              </p>

              <p className="font-mono font-bold text-lg sm:text-2xl tracking-wide text-gray-900 break-all">
                {result.activation_code}
              </p>
            </div>

            <button
              type="button"
              onClick={copyCode}
              className="w-full mt-4 rounded-xl bg-green-700 hover:bg-green-800 text-white font-semibold py-3 transition"
            >
              {copied ? "✓ Kode Berhasil Disalin" : "Salin Kode Aktivasi"}
            </button>

            <div className="mt-5 text-sm text-gray-600 space-y-2">
              <p>
                Harga paket:{" "}
                <strong>{formatRupiah(Number(result.price))}</strong>
              </p>
              <p>
                Kedaluwarsa kode:{" "}
                <strong>
                  {new Date(result.expires_at).toLocaleString("id-ID", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </strong>
              </p>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3 mt-5">
              Simpan dan kirim kode ini kepada penjual. Kode asli tidak
              dapat ditampilkan kembali setelah halaman dimuat ulang.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
