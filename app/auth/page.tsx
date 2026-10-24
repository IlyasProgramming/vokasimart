
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Role = "buyer" | "seller";
type Mode = "login" | "signup" | "forgot" | "reset";

export default function AuthPage() {
  const router = useRouter();

  const role: Role = "seller";
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
const [showPolicy, setShowPolicy] = useState(false);
const [policyReadToEnd, setPolicyReadToEnd] = useState(false);
const policyContentRef = useRef<HTMLDivElement>(null);

  // Deteksi ketika pengguna membuka tautan pemulihan password.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setPassword("");
        setMessage("Buat password baru untuk akunmu.");
        setError("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sellerPolicy = [
  {
    title: "1. Kejujuran Informasi Produk",
    description:
      "Penjual wajib memberikan informasi, harga, foto, dan kondisi produk secara jujur dan sesuai dengan keadaan sebenarnya.",
  },
  {
    title: "2. Tanggung Jawab Penjual",
    description:
      "Penjual bertanggung jawab atas produk atau jasa yang ditawarkan serta wajib berkomunikasi dengan pembeli secara sopan dan bertanggung jawab.",
  },
  {
    title: "3. Larangan Produk",
    description:
      "Penjual dilarang menawarkan produk atau jasa ilegal, berbahaya, menipu, atau melanggar peraturan yang berlaku.",
  },
  {
    title: "4. Pembaruan Informasi",
    description:
      "Penjual wajib memperbarui informasi produk dan menghapus atau menandai produk yang sudah tidak tersedia.",
  },
  {
    title: "5. Penanganan Pelanggaran",
    description:
      "VokasiMart dapat meninjau, menyembunyikan, atau membatasi produk dan akun yang melanggar kebijakan sesuai ketentuan yang berlaku.",
  },
];

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function changeMode(nextMode: Mode) {
    setMode(nextMode);
    setPassword("");
    setShowPassword(false);
    clearFeedback();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) return;
    
    if (
  (mode === "login" || mode === "signup") &&
  !policyAccepted
) {
  setError("Silakan baca dan setujui Kebijakan Penjual VokasiMart terlebih dahulu.");
  return;
}

    setBusy(true);
    clearFeedback();

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/auth`,
          }
        );

        if (error) throw error;

        setMessage(
          "Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk dan folder spam."
        );
        return;
      }

      if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({
          password,
        });

        if (error) throw error;

        setPassword("");
        setShowPassword(false);
        setMode("login");
        setMessage("Password berhasil diperbarui. Silakan masuk.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              role,
            },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        if (error) throw error;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setPassword("");
          setMode("login");
          setMessage(
            "Pendaftaran berhasil. Periksa email untuk mengonfirmasi akun sebelum masuk."
          );
        }

        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      router.replace("/");
      router.refresh();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan. Silakan coba kembali.";

      setError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  
const title =
  mode === "signup"
    ? "Daftar akun penjual"
    : mode === "forgot"
      ? "Lupa password?"
      : mode === "reset"
        ? "Buat password baru"
        : "Masuk sebagai Penjual";


const subtitle =
  mode === "signup"
    ? "Buat akun penjual untuk mulai berjualan di VokasiMart."
    : mode === "forgot"
      ? "Masukkan email akun penjualmu untuk menerima tautan pemulihan."
      : mode === "reset"
        ? "Gunakan password baru yang kuat dan mudah kamu ingat."
        : "Masuk ke akun penjual untuk mengelola produkmu.";


  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      {/* Dekorasi latar */}
      <div className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-indigo-200/50 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        {/* Panel ilustrasi dinamis */}
        <section
          className={`relative hidden flex-col justify-between overflow-hidden p-10 text-white transition-colors duration-500 md:flex ${
            role === "buyer"
              ? "bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-950"
              : "bg-gradient-to-br from-orange-500 via-rose-600 to-purple-950"
          }`}
        >
          <div className="pointer-events-none absolute -right-20 top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-8 top-36 h-40 w-40 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-white/10 blur-sm" />

          {/* Logo */}
          <a
            href="/"
            className="relative z-10 text-3xl font-extrabold tracking-tight"
          >
            <span className="text-white">vokasi</span>
            <span className="text-white/75">mart</span>
            <span className="text-amber-300">.</span>
          </a>

          <div className="relative z-10 py-8">
            {/* Ilustrasi */}
            <div className="mb-8 flex min-h-56 items-center justify-center">
              <div
                key={role}
                className="flex h-52 w-52 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-sm transition-all duration-500"
              >
                {role === "buyer" ? (
                  <svg
                    viewBox="0 0 220 220"
                    className="h-full w-full"
                    fill="none"
                    aria-label="Ilustrasi mahasiswa sedang berbelanja"
                    role="img"
                  >
                    <circle
                      cx="110"
                      cy="110"
                      r="88"
                      fill="#D1FAE5"
                      opacity=".15"
                    />
                    <circle cx="169" cy="46" r="17" fill="#FDE68A" />
                    <path
                      d="M163 46l4 4 8-9"
                      stroke="#92400E"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Tas belanja */}
                    <path
                      d="M49 88h100l-9 91H58l-9-91Z"
                      fill="#A7F3D0"
                    />
                    <path
                      d="M76 91V72a23 23 0 0 1 46 0v19"
                      stroke="white"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M75 117h48M84 132h30"
                      stroke="#047857"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />

                    <rect
                      x="24"
                      y="58"
                      width="28"
                      height="34"
                      rx="7"
                      fill="#FCA5A5"
                      transform="rotate(-12 24 58)"
                    />
                    <rect
                      x="150"
                      y="102"
                      width="32"
                      height="38"
                      rx="7"
                      fill="#FDE68A"
                      transform="rotate(12 150 102)"
                    />
                    <path
                      d="M158 119h16M166 111v16"
                      stroke="#92400E"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M40 129v14M33 136h14M178 66v12M172 72h12"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M43 181h125"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity=".6"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 220 220"
                    className="h-full w-full"
                    fill="none"
                    aria-label="Ilustrasi mahasiswa menjalankan usaha"
                    role="img"
                  >
                    <circle
                      cx="110"
                      cy="110"
                      r="88"
                      fill="#FFEDD5"
                      opacity=".18"
                    />
                    <circle cx="169" cy="43" r="17" fill="#BBF7D0" />
                    <path
                      d="M161 43l5 5 10-11"
                      stroke="#166534"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Kanopi toko */}
                    <path
                      d="M40 91l12-31h116l12 31H40Z"
                      fill="#FDE68A"
                    />
                    <path
                      d="M52 60h116l12 31H40l12-31Z"
                      fill="#FFF7ED"
                    />
                    <path
                      d="M52 60h29L69 91H40l12-31ZM110 60h29l8 31h-29l-8-31ZM168 60l12 31h-29l-12-31h29Z"
                      fill="#FB7185"
                    />

                    {/* Badan toko */}
                    <path d="M46 91h128v84H46V91Z" fill="#FED7AA" />
                    <path d="M60 110h39v65H60v-65Z" fill="#FFF7ED" />
                    <path d="M116 110h43v30h-43v-30Z" fill="#FDBA74" />
                    <path d="M116 149h43v26h-43v-26Z" fill="#FB7185" />

                    {/* Paket pesanan */}
                    <rect
                      x="77"
                      y="132"
                      width="67"
                      height="49"
                      rx="5"
                      fill="#FDE68A"
                    />
                    <path
                      d="M77 145h67M110 132v49"
                      stroke="#D97706"
                      strokeWidth="3"
                    />
                    <path
                      d="M98 132v-9a12 12 0 0 1 24 0v9"
                      stroke="#FFF7ED"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M29 113v14M22 120h14M187 120v14M180 127h14"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M43 190h134"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      opacity=".6"
                    />
                  </svg>
                )}
              </div>
            </div>

            {/* Pesan sesuai peran */}
            <div
              key={`${role}-copy`}
              className="animate-[fadeIn_.35s_ease-out]"
            >
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                {role === "buyer" ? (
                  <>
                    <span>🛍️</span>
                    <span>Jelajahi produk kampus</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Kembangkan usaha mahasiswa</span>
                  </>
                )}
              </p>

              <h1 className="text-3xl font-bold leading-tight">
                {role === "buyer" ? (
                  <>
                    Temukan favoritmu,
                    <br />
                    dekat denganmu.
                  </>
                ) : (
                  <>
                    Mulai usaha,
                    <br />
                    tumbuh bersama.
                  </>
                )}
              </h1>

              <p className="mt-4 max-w-sm leading-7 text-white/80">
                {role === "buyer"
                  ? "Temukan makanan, minuman, dan kebutuhan kuliah dari sesama warga Vokasi IPB. Praktis, dekat, dan penuh pilihan."
                  : "Tampilkan produkmu, jangkau teman sekampus, dan kembangkan bisnis kecilmu bersama komunitas Vokasi IPB."}
              </p>
            </div>
          </div>

          {/* Footer panel */}
          <div className="relative z-10 flex items-center justify-between gap-3 text-sm text-white/70">
            <span>Pasar digital warga vokasi.</span>
            <span className="text-lg" aria-hidden="true">
              {role === "buyer" ? "💚" : "🧡"}
            </span>
          </div>
        </section>

        {/* Panel formulir */}
<section className="relative px-6 py-8 sm:px-10 sm:py-10">
          <a
            href="/"
            className="mb-8 inline-block text-2xl font-extrabold tracking-tight md:hidden"
          >
            <span className="text-blue-700">vokasi</span>
            <span className="text-indigo-500">mart</span>
            <span className="text-amber-400">.</span>
          </a>

          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            {mode !== "reset" && (
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            )}

            {/* Password */}
            {(mode === "login" ||
              mode === "signup" ||
              mode === "reset") && (
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  {mode === "reset" ? "Password baru" : "Password"}
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "reset"
                        ? "Buat password baru"
                        : "Masukkan password"
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={
                      showPassword
                        ? "Sembunyikan password"
                        : "Tampilkan password"
                    }
                    className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-blue-700"
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a16 16 0 0 1-3.2 3.8M6.2 6.2C4.1 7.6 3 12 3 12s3.5 7 9 7a9.8 9.8 0 0 0 4-.8" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden="true"
                      >
                        <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>

                {(mode === "signup" || mode === "reset") && (
                  <p className="mt-2 text-xs text-slate-500">
                    Gunakan minimal 6 karakter. Password yang lebih panjang
                    dan unik lebih disarankan.
                  </p>
                )}
              </div>
            )}

            {/* Lupa password */}
            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => changeMode("forgot")}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  Lupa password?
                </button>
              </div>
            )}

            {/* Persetujuan Kebijakan Penjual */}
{(mode === "login" || mode === "signup") && (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="mb-3">
      <p className="text-sm font-bold text-slate-800">
        Kebijakan Penjual VokasiMart
      </p>

      <button
        type="button"
        onClick={() => {
  setPolicyReadToEnd(false);
  setShowPolicy(true);
}}
        className="mt-1 text-sm font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
      >
        Baca Kebijakan Penjual
      </button>
    </div>

    <label className="flex cursor-pointer items-start gap-3">
      <input
  type="checkbox"
  checked={policyAccepted}
  onClick={(e) => {
    if (!policyAccepted) {
      e.preventDefault();
      setError(
        "Silakan baca Kebijakan Penjual VokasiMart sampai selesai dan klik 'Saya Mengerti dan Setuju' terlebih dahulu."
      );
    }
  }}
  onChange={(e) => setPolicyAccepted(e.target.checked)}
  className="mt-1 h-4 w-4 shrink-0 accent-blue-700"
/>

      <span className="text-sm leading-6 text-slate-600">
        Saya telah membaca dan menyetujui Kebijakan Penjual VokasiMart.
      </span>
    </label>
  </div>
)}


            {/* Pesan error */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            {/* Pesan status */}
            {message && (
              <div
                role="status"
                className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-800"
              >
                {message}
              </div>
            )}

            {/* Tombol utama */}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? "Mohon tunggu..."
                : mode === "signup"
                  ? "Daftar sekarang"
                  : mode === "forgot"
                    ? "Kirim tautan pemulihan"
                    : mode === "reset"
                      ? "Simpan password baru"
                      : "Masuk ke VokasiMart"}
            </button>
          </form>

          {/* Navigasi autentikasi */}
          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === "forgot" || mode === "reset" ? (
              <button
                type="button"
                onClick={() => changeMode("login")}
                className="font-semibold text-blue-700 hover:text-blue-900"
              >
                Kembali ke halaman masuk
              </button>
            ) : mode === "signup" ? (
              <>
                Sudah punya akun?{" "}
                <button
                  type="button"
                  onClick={() => changeMode("login")}
                  className="font-semibold text-blue-700 hover:text-blue-900"
                >
                  Masuk sekarang
                </button>
              </>
            ) : (
              <>
                Belum punya akun?{" "}
                <button
                  type="button"
                  onClick={() => changeMode("signup")}
                  className="font-semibold text-blue-700 hover:text-blue-900"
                >
                  Daftar sekarang
                </button>
              </>
            )}
          </div>

          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            Dengan melanjutkan, kamu setuju untuk menggunakan VokasiMart
            secara bertanggung jawab.
          </p>

{/* Pop-up Kebijakan Penjual */}
{showPolicy && (
  <div
    className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-slate-900/50 p-4 backdrop-blur-sm"
    onClick={() => setShowPolicy(false)}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="seller-policy-title"
      className="max-h-[85%] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3
            id="seller-policy-title"
            className="text-xl font-bold text-slate-900"
          >
            Kebijakan Penjual VokasiMart
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Baca ketentuan berikut sebelum mulai berjualan.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPolicy(false)}
          aria-label="Tutup kebijakan"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>

      <div
  ref={policyContentRef}
  onScroll={(e) => {
    const element = e.currentTarget;
    const reachedBottom =
      element.scrollTop + element.clientHeight >=
      element.scrollHeight - 5;

    if (reachedBottom) {
      setPolicyReadToEnd(true);
    }
  }}
  className="max-h-64 space-y-4 overflow-y-auto pr-2"
>
        {sellerPolicy.map((policy) => (
          <div key={policy.title}>
            <h4 className="text-sm font-bold text-slate-800">
              {policy.title}
            </h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {policy.description}
            </p>
          </div>
        ))}
      </div>

      <button
  type="button"
  disabled={!policyReadToEnd}
  onClick={() => {
    setPolicyAccepted(true);
    setShowPolicy(false);
    setError("");
  }}
  className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
>
  {policyReadToEnd
    ? "Saya Mengerti dan Setuju"
    : "Baca sampai bagian akhir"}
</button>
    </div>
  </div>
)}

        </section>
      </div>
    </main>
  );
}
