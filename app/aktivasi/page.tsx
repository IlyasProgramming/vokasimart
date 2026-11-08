
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type RedemptionResult = {
  success: boolean;
  message?: string;
  plan_name?: string;
  quota_increment?: number;
  duration_days?: number;
  access_expires_at?: string;
};

export default function AktivasiPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<RedemptionResult | null>(null);

  useEffect(() => {
    let active = true;

    async function getUser() {
      const { data } = await supabase.auth.getUser();

      if (active) {
        setUserId(data.user?.id ?? null);
        setCheckingAuth(false);
      }
    }

    void getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function redeemCode() {
    if (!code.trim() || loading) return;

    setLoading(true);
    setMessage("");
    setResult(null);

    try {
      const { data, error } = await supabase.rpc(
        "redeem_activation_code",
        {
          p_code: code.trim(),
        }
      );

      if (error) throw error;

      const response = data as RedemptionResult;

      if (!response?.success) {
        throw new Error(
          response?.message || "Kode aktivasi gagal ditukarkan."
        );
      }

      setResult(response);
      setCode("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menukarkan kode."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Memeriksa akun...
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">
            Login Diperlukan
          </h1>
          <p className="text-gray-500 mt-2">
            Login terlebih dahulu untuk menukarkan kode aktivasi.
          </p>
          <a
            href="/auth"
            className="inline-block mt-5 bg-green-700 text-white px-6 py-3 rounded-xl"
          >
            Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <a href="/" className="text-green-700 text-sm">
          ← Kembali ke VokasiMart
        </a>

        <section className="bg-white border rounded-2xl p-6 sm:p-8 mt-5">
          <h1 className="text-2xl font-bold text-gray-900">
            Aktivasi Langganan
          </h1>

          <p className="text-gray-700 text-sm mt-2">    
            Masukkan kode aktivasi yang diberikan oleh admin
            VokasiMart setelah pembayaran berhasil.
          </p>

          <div className="mt-6">
            <label
              htmlFor="activation-code"
              className="block text-sm font-semibold text-gray-900 mb-2"
            >
              Kode Aktivasi
            </label>

            <input
              id="activation-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Masukkan kode aktivasi"
              autoComplete="off"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 font-mono tracking-wide text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          {message && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {message}
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="font-bold text-green-800">
                ✓ Aktivasi Berhasil!
              </p>

              <p className="text-sm text-green-800 mt-2">
                {result.plan_name || "Paket berhasil diaktifkan."}
              </p>

              {Number(result.quota_increment) > 0 && (
                <p className="text-sm text-green-800 mt-2">
                  Tambahan kuota: +{result.quota_increment} produk
                </p>
              )}

              {Number(result.duration_days) > 0 && (
                <p className="text-sm text-green-800 mt-2">
                  Tambahan masa aktif: {result.duration_days} hari
                </p>
              )}

              {result.access_expires_at && (
                <p className="text-sm text-green-800 mt-2">
                  Masa aktif sampai:{" "}
                  {new Date(result.access_expires_at).toLocaleDateString(
                    "id-ID",
                    { dateStyle: "long" }
                  )}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={redeemCode}
            disabled={loading || !code.trim()}
            className="w-full mt-5 bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-xl"
          >
            {loading ? "Memproses..." : "Tukarkan Kode"}
          </button>

          <p className="text-xs text-gray-700 text-center mt-4">    
            Setiap kode aktivasi hanya dapat digunakan satu kali.
          </p>
        
        </section>

        {/* Panduan Aktivasi */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 mt-5">
          <div className="mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
              Panduan Pengguna
            </span>

            <h2 className="text-xl font-bold text-gray-900 mt-4">
              Cara Aktivasi Langganan
            </h2>

            <p className="text-sm text-gray-600 mt-2">
              Ikuti langkah berikut untuk mengaktifkan atau
              menambah layanan langganan VokasiMart.
            </p>
          </div>

          <div className="space-y-6">
            {[
              {
                number: "01",
                title: "Pilih Paket Langganan",
                description:
                  "Tentukan paket sesuai kebutuhan dan tambahan layanan yang ingin digunakan.",
              },
              {
                number: "02",
                title: "Hubungi Admin VokasiMart",
                description:
                  "Hubungi admin untuk mendapatkan informasi harga dan instruksi pembayaran.",
              },
              {
                number: "03",
                title: "Selesaikan Pembayaran",
                description:
                  "Lakukan pembayaran sesuai instruksi. Admin akan memverifikasi pembayaran Anda.",
              },
              {
                number: "04",
                title: "Masukkan Kode Aktivasi",
                description:
                  "Setelah pembayaran dikonfirmasi, masukkan kode yang diberikan admin pada formulir di atas.",
              },
              {
                number: "05",
                title: "Langganan Berhasil Diaktifkan",
                description:
                  "Sistem akan memperbarui kuota produk atau masa aktif sesuai paket yang Anda beli.",
              },
            ].map((step, index) => (
              <div key={step.number} className="flex gap-4">
                <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-800 font-bold text-sm">
                  {step.number}
                </div>

                <div className="flex-1 pb-5 border-b border-gray-100 last:border-0">
                  <h3 className="font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm font-semibold text-amber-900">
              Perhatian
            </p>
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
              Setiap kode aktivasi hanya dapat digunakan satu kali.
              Pastikan Anda memasukkan kode yang benar dan tidak
              membagikannya kepada orang lain.
            </p>
          </div>
        </section>
      </div>
    </main>


          


  );
}


