import { describe, expect, it } from "vitest";
import { AVATAR_MAX_BYTES, centeredSquareCrop, validateAvatarFile } from "./avatar";

describe("centeredSquareCrop", () => {
  it("crops the middle of a landscape photo", () => {
    expect(centeredSquareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, side: 3000 });
  });

  it("crops the middle of a portrait photo", () => {
    expect(centeredSquareCrop(1080, 1920)).toEqual({ sx: 0, sy: 420, side: 1080 });
  });

  it("keeps square images whole", () => {
    expect(centeredSquareCrop(512, 512)).toEqual({ sx: 0, sy: 0, side: 512 });
  });
});

describe("validateAvatarFile", () => {
  it("accepts common photo formats, including gallery files without a MIME type", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: 1000, name: "a.jpg" })).toBeNull();
    expect(validateAvatarFile({ type: "image/webp", size: 1000, name: "a.webp" })).toBeNull();
    expect(validateAvatarFile({ type: "", size: 1000, name: "IMG_0001.HEIC" })).toBeNull();
  });

  it("rejects documents and oversized photos", () => {
    expect(validateAvatarFile({ type: "application/pdf", size: 1000, name: "cv.pdf" })).toMatch(
      /imagen/,
    );
    expect(
      validateAvatarFile({ type: "image/jpeg", size: AVATAR_MAX_BYTES + 1, name: "big.jpg" }),
    ).toMatch(/15 MB/);
  });
});
