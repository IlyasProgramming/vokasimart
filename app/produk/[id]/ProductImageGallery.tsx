
"use client";

import { useEffect, useState } from "react";

type ProductImageGalleryProps = {
  images: string[];
  productName: string;
};

export default function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const closeGallery = () => {
    setIsOpen(false);
    setIsZoomed(false);
  };

  const showPrevious = () => {
    setActiveIndex((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
    setIsZoomed(false);
  };

  const showNext = () => {
    setActiveIndex((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
    setIsZoomed(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGallery();
      if (event.key === "ArrowLeft" && !isZoomed) showPrevious();
      if (event.key === "ArrowRight" && !isZoomed) showNext();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isZoomed]);

  if (images.length === 0) return null;

  const handleTouchEnd = (touchEnd: number) => {
    if (touchStart === null || isZoomed) return;

    const difference = touchStart - touchEnd;

    if (Math.abs(difference) > 50) {
      if (difference > 0) showNext();
      else showPrevious();
    }

    setTouchStart(null);
  };

  return (
    <>

    <p className="px-4 pt-4 text-sm text-gray-500">
  Ketuk foto untuk melihat lebih jelas 🔍
</p>

      <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
        {images.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={() => {
              setActiveIndex(index);
              setIsZoomed(false);
              setIsOpen(true);
            }}
            aria-label={`Perbesar foto ${index + 1} ${productName}`}
            className="flex aspect-[4/3] cursor-zoom-in items-center justify-center overflow-hidden rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#176b45]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${productName} - foto ${index + 1}`}
              className="h-full w-full object-contain"
            />
          </button>
        ))}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          onClick={closeGallery}
        >
          <button
            type="button"
            onClick={closeGallery}
            aria-label="Tutup galeri"
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/30"
          >
            ×
          </button>

          <div
            className="flex max-h-full w-full max-w-6xl flex-col items-center gap-4"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) =>
              setTouchStart(event.touches[0]?.clientX ?? null)
            }
            onTouchEnd={(event) =>
              handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)
            }
          >
            <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[activeIndex]}
                alt={`${productName} - foto ${activeIndex + 1}`}
                onDoubleClick={() => setIsZoomed((current) => !current)}
                className={`max-h-[75vh] max-w-full object-contain transition-transform duration-200 ${
                  isZoomed
                    ? "scale-150 cursor-zoom-out"
                    : "scale-100 cursor-zoom-in"
                }`}
              />
            </div>

            <div className="flex items-center justify-center gap-4">
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label="Foto sebelumnya"
                  className="rounded-full bg-white/15 px-4 py-2 text-2xl text-white hover:bg-white/30"
                >
                  ‹
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsZoomed((current) => !current)}
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30"
              >
                {isZoomed ? "Perkecil" : "Perbesar"}
              </button>

              <span className="text-sm text-white">
                {activeIndex + 1} / {images.length}
              </span>

              {images.length > 1 && (
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Foto berikutnya"
                  className="rounded-full bg-white/15 px-4 py-2 text-2xl text-white hover:bg-white/30"
                >
                  ›
                </button>
              )}
            </div>

            {images.length > 1 && (
              <p className="text-center text-xs text-gray-300">
                Geser foto ke kiri atau kanan untuk berpindah
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
