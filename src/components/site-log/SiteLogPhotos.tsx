"use client";

import { Camera, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button, toast } from "@/components/ui";
import { fileToPhotoDataUrl, isNativeApp, takeNativePhoto } from "@/lib/native/camera";
import { createLocalUuid, type SiteLogPhoto } from "@/lib/offline/db";
import { MAX_SITE_LOG_PHOTOS, SITE_LOG_PHOTO_LIMIT } from "@/lib/projects/site-log";

export function SiteLogPhotos({
  photos,
  onChange,
  busy,
  onBusyChange,
}: {
  photos: SiteLogPhoto[];
  onChange: (change: (photos: SiteLogPhoto[]) => SiteLogPhoto[]) => void;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const native = useRef(false);
  useEffect(() => {
    void isNativeApp().then((value) => {
      native.current = value;
    });
  }, []);

  async function addPhoto(read: () => Promise<string | null>) {
    if (photos.length >= MAX_SITE_LOG_PHOTOS) {
      toast(SITE_LOG_PHOTO_LIMIT, "error");
      return;
    }
    onBusyChange(true);
    try {
      const dataUrl = await read();
      if (!dataUrl) return;
      const photo = {
        id: createLocalUuid(),
        dataUrl,
        caption: "",
        createdAt: new Date().toISOString(),
      };
      onChange((current) => [...current, photo]);
    } catch {
      toast("No se pudo leer la foto.", "error");
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <section className="site-log-photos" aria-label="Registro fotográfico">
      <div className="site-log-actions">
        <h3>Fotos de la visita</h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy || photos.length >= MAX_SITE_LOG_PHOTOS}
          onClick={() => (native.current ? void addPhoto(takeNativePhoto) : input.current?.click())}
        >
          <Camera size={16} aria-hidden="true" /> Tomar foto
        </Button>
      </div>
      <p className="muted small" role="status">
        {photos.length >= MAX_SITE_LOG_PHOTOS
          ? SITE_LOG_PHOTO_LIMIT
          : photos.length + " de " + MAX_SITE_LOG_PHOTOS + " fotos"}
      </p>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label="Foto de la visita"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void addPhoto(() => fileToPhotoDataUrl(file));
        }}
      />
      {photos.length > 0 && (
        <ul className="site-log-photo-grid">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.dataUrl}
                alt={photo.caption || "Foto " + (index + 1) + " de la visita"}
                loading="lazy"
              />
              <div className="site-log-actions">
                <input
                  className="input"
                  placeholder="Descripción"
                  aria-label={"Descripción de la foto " + (index + 1)}
                  value={photo.caption}
                  onChange={(event) => {
                    const caption = event.currentTarget.value;
                    onChange((current) =>
                      current.map((item) => (item.id === photo.id ? { ...item, caption } : item)),
                    );
                  }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={"Quitar foto " + (index + 1)}
                  onClick={() =>
                    onChange((current) => current.filter((item) => item.id !== photo.id))
                  }
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
