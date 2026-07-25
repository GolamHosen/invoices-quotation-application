import fs from "fs";
import path from "path";
import { Company } from "@/db/schema";

const ARTIFACT_SRC = "C:/Users/golam/.gemini/antigravity-ide/brain/5eca6fef-cf48-46bf-84c9-f3d8dd904a16/media__1784863381214.png";

export async function ensureHujuratLogo() {
  try {
    const publicDir = path.join(process.cwd(), "public");
    const destPath = path.join(publicDir, "hujurat-logo.png");

    if (fs.existsSync(ARTIFACT_SRC)) {
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.copyFileSync(ARTIFACT_SRC, destPath);
    }

    if (fs.existsSync(destPath)) {
      await Company.updateMany(
        { slug: "construction", $or: [{ logoUrl: { $exists: false } }, { logoUrl: null }, { logoUrl: "" }] },
        { $set: { logoUrl: "/hujurat-logo.png" } }
      );
    }
  } catch (error) {
    console.error("ensureHujuratLogo error:", error);
  }
}

export async function getLogoDataUrl(customPath?: string | null): Promise<string | null> {
  try {
    const publicDir = path.join(process.cwd(), "public");
    let targetFile = path.join(publicDir, "hujurat-logo.png");

    if (!customPath) {
      const defaultCompany = await Company.findOne({ slug: "construction" }).lean();
      if (defaultCompany?.logoUrl) {
        customPath = defaultCompany.logoUrl;
      }
    }

    if (customPath && customPath.startsWith("data:image/")) {
      return customPath;
    }

    if (customPath && (customPath.startsWith("http://") || customPath.startsWith("https://"))) {
      try {
        const res = await fetch(customPath);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = res.headers.get("content-type") || "image/png";
          return `data:${contentType};base64,${buffer.toString("base64")}`;
        }
      } catch (err) {
        console.warn("Failed to fetch remote logo image:", customPath, err);
      }
    }

    if (customPath && customPath.startsWith("/")) {
      const relPath = customPath.replace(/^\/+/, "");
      const customFile = path.join(publicDir, relPath);
      if (fs.existsSync(customFile)) {
        targetFile = customFile;
      }
    }

    if (!fs.existsSync(targetFile) && fs.existsSync(ARTIFACT_SRC)) {
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.copyFileSync(ARTIFACT_SRC, targetFile);
    }

    if (fs.existsSync(targetFile)) {
      const buffer = fs.readFileSync(targetFile);
      const ext = path.extname(targetFile).replace(".", "").toLowerCase() || "png";
      const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
      return `data:${mime};base64,${buffer.toString("base64")}`;
    }
  } catch (error) {
    console.error("getLogoDataUrl error:", error);
  }
  return null;
}
