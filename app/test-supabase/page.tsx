
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabasePage() {
  const [status, setStatus] = useState("Sedang menguji koneksi...");
  const [details, setDetails] = useState("");

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id")
          .limit(1);

        if (error) {
          setStatus("Koneksi atau pembacaan database gagal.");
          setDetails(error.message);
          return;
        }

        setStatus("Koneksi berhasil!");
        setDetails(
          `Tabel products berhasil dibaca. Baris yang diterima: ${data.length}.`
        );
      } catch (err) {
        setStatus("Terjadi kesalahan saat menguji koneksi.");
        setDetails(
          err instanceof Error ? err.message : "Kesalahan tidak diketahui."
        );
      }
    }

    testConnection();
  }, []);

  return (
    <main className="min-h-screen bg-[#faf9f6] p-8 text-[#25352b]">
      <h1 className="text-2xl font-bold">Tes Koneksi Supabase</h1>
      <p className="mt-4 font-semibold">{status}</p>
      <p className="mt-2">{details}</p>
    </main>
  );
}
