
import Hls from "https://cdn.jsdelivr.net/npm/hls.js@1.6.13/+esm";

const API_BASE = "";
const video = document.getElementById("videoPlayer");
const message = document.getElementById("playerMessage");

let hls = null;
let currentItem = null;

const demo = [
  {
    id: "1",
    title: "أسرار الكون",
    category: "وثائقي",
    year: 2026,
    description: "رحلة إلى أعماق الكون والمجرات.",
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=500",
    videoUrl: "",
    videoType: "mp4"
  }
];

function safeText(value) {
  return String(value ?? "");
}

function safeImage(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.href;
  } catch {}
  return "https://placehold.co/400x600/11111a/ffffff?text=NOXAR";
}

async function getContent(id) {
  if (!API_BASE) return demo.find(x => x.id === id);

  const response = await fetch(
    `${API_BASE}/api/content/${encodeURIComponent(id)}`
  );

  if (!response.ok) throw new Error("Content unavailable");
  return response.json();
}

function showMessage(text) {
  message.textContent = text;
  message.classList.remove("hidden");
}

function hideMessage() {
  message.classList.add("hidden");
}

async function playSource(url, type) {
  const parsed = new URL(url);

  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Invalid media URL");
  }

  if (type === "hls") {
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = parsed.href;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(parsed.href);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) showMessage("حدث خطأ في تشغيل الفيديو.");
      });
    } else {
      throw new Error("HLS is unsupported");
    }
  } else {
    video.src = parsed.href;
  }

  video.load();
  hideMessage();
}

function stopPlayer() {
  if (hls) {
    hls.destroy();
    hls = null;
  }

  video.pause();
  video.removeAttribute("src");
  video.load();
}

function renderDetails(item) {
  document.title = `${safeText(item.title)} | NOXAR`;
  document.getElementById("watchTitle").textContent = item.title;
  document.getElementById("watchCategory").textContent =
    item.category || "NOXAR";
  document.getElementById("watchDescription").textContent =
    item.description || "";
  document.getElementById("watchMeta").textContent =
    `سنة الإنتاج: ${item.year || "غير محدد"}`;
}

function renderSuggestions(items) {
  const grid = document.getElementById("suggestionsGrid");

  grid.replaceChildren();

  items.filter(x => String(x.id) !== String(currentItem.id))
    .slice(0, 4).forEach(item => {
      const card = document.createElement("article");
      card.className = "suggestion-card";

      const img = document.createElement("img");
      img.src = safeImage(item.image);
      img.alt = item.title;

      const title = document.createElement("h3");
      title.textContent = item.title;

      const year = document.createElement("p");
      year.textContent = item.year || "";

      card.append(img, title, year);
      card.addEventListener("click", () => {
        location.href = `watch.html?id=${encodeURIComponent(item.id)}`;
      });

      grid.appendChild(card);
    });
}

async function init() {
  try {
    const id = new URLSearchParams(location.search).get("id");

    if (!id) throw new Error("لم يتم تحديد المحتوى");

    currentItem = await getContent(id);

    if (!currentItem) throw new Error("المحتوى غير موجود");

    renderDetails(currentItem);

    if (currentItem.videoUrl) {
      await playSource(
        currentItem.videoUrl,
        currentItem.videoType || "mp4"
      );
    } else {
      showMessage("الفيديو غير متاح حالياً.");
    }

    const items = API_BASE
      ? await fetch(`${API_BASE}/api/content`).then(r => r.json())
      : demo;

    renderSuggestions(items);

  } catch (error) {
    console.error(error);
    showMessage(error.message || "تعذر تحميل المحتوى");
  }
}

document.getElementById("shareButton").addEventListener("click", async () => {
  try {
    if (navigator.share) {
      await navigator.share({
        title: currentItem?.title || "NOXAR",
        url: location.href
      });
    } else {
      await navigator.clipboard.writeText(location.href);
      alert("تم نسخ رابط المحتوى");
    }
  } catch (error) {
    if (error.name !== "AbortError") alert("تعذرت المشاركة");
  }
});

document.getElementById("favoriteButton").addEventListener("click", () => {
  if (!currentItem) return;

  const key = "noxar-favorites";
  const saved = JSON.parse(localStorage.getItem(key) || "[]");
  const id = String(currentItem.id);
  const index = saved.indexOf(id);

  if (index >= 0) saved.splice(index, 1);
  else saved.push(id);

  localStorage.setItem(key, JSON.stringify(saved));

  document.getElementById("favoriteButton").textContent =
    index >= 0 ? "☆ إضافة للمفضلة" : "★ تمت الإضافة";
});

window.addEventListener("beforeunload", stopPlayer);

init();
