
const API_BASE = ""; // ضع عنوان السيرفر هنا لاحقاً

const demoContent = [
  {
    id: 1,
    title: "أسرار الكون",
    category: "documentary",
    type: "وثائقي",
    year: "2026",
    description: "رحلة لاكتشاف المجرات وأسرار الفضاء.",
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=700",
    videoUrl: ""
  },
  {
    id: 2,
    title: "عالم الطبيعة",
    category: "documentary",
    type: "وثائقي",
    year: "2026",
    description: "اكتشف عجائب الحياة البرية.",
    image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=700",
    videoUrl: ""
  },
  {
    id: 3,
    title: "رحلة المعرفة",
    category: "education",
    type: "تعليم",
    year: "2026",
    description: "ابدأ رحلة التعلم والاكتشاف.",
    image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=700",
    videoUrl: ""
  },
  {
    id: 4,
    title: "أعماق المحيط",
    category: "documentary",
    type: "وثائقي",
    year: "2026",
    description: "عالم مذهل تحت سطح الماء.",
    image: "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=700",
    videoUrl: ""
  },
  {
    id: 5,
    title: "الفن والإبداع",
    category: "education",
    type: "تعليم",
    year: "2026",
    description: "استكشف عالم الفنون.",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=700",
    videoUrl: ""
  },
  {
    id: 6,
    title: "الفضاء المجهول",
    category: "movie",
    type: "فيلم",
    year: "2026",
    description: "رحلة خيالية إلى عالم مجهول.",
    image: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=700",
    videoUrl: ""
  },
  {
    id: 7,
    title: "الفن الرقمي",
    category: "education",
    type: "تعليم",
    year: "2026",
    description: "تعلم أساسيات التصميم والإبداع.",
    image: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=700",
    videoUrl: ""
  },
  {
    id: 8,
    title: "رحلة الغابات",
    category: "documentary",
    type: "وثائقي",
    year: "2026",
    description: "استكشف أسرار الغابات.",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=700",
    videoUrl: ""
  }
];

let content = [...demoContent];
let currentCategory = "all";

const grid = document.getElementById("contentGrid");
const searchInput = document.getElementById("searchInput");
const modal = document.getElementById("playerModal");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function safeImage(value) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.href;
  } catch {}
  return "https://placehold.co/400x600/11111a/ffffff?text=NOXAR";
}

async function loadContent() {
  if (API_BASE) {
    try {
      const response = await fetch(`${API_BASE}/api/content`);
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("Invalid content");
      content = data;
    } catch (error) {
      console.error("NOXAR API:", error);
      content = [...demoContent];
    }
  }
  renderContent();
}

function renderContent() {
  const query = (searchInput?.value || "").trim().toLowerCase();

  const filtered = content.filter(item => {
    const categoryMatch =
      currentCategory === "all" ||
      item.category === currentCategory;

    const searchMatch =
      `${item.title} ${item.description}`.toLowerCase().includes(query);

    return categoryMatch && searchMatch;
  });

  document.getElementById("resultCount").textContent =
    `${filtered.length} نتيجة`;

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty">لا توجد نتائج حالياً.</div>';
    return;
  }

  grid.innerHTML = filtered.map(item => `
    <article class="card" data-id="${Number(item.id)}" tabindex="0">
      <div class="poster">
        <img src="${safeImage(item.image)}"
             alt="${escapeHTML(item.title)}"
             loading="lazy">
        <span class="type-label">${escapeHTML(item.type)}</span>
        <span class="play-overlay">▶</span>
      </div>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.year)}</p>
    </article>
  `).join("");

  grid.querySelectorAll(".card").forEach(card => {
    const open = () => {
      const item = content.find(x =>
        Number(x.id) === Number(card.dataset.id)
      );
      if (item) openPlayer(item);
    };

    card.addEventListener("click", open);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function openPlayer(item) {
  document.getElementById("playerTitle").textContent = item.title;
  document.getElementById("playerDescription").textContent =
    item.description || "";

  const container = document.getElementById("videoContainer");
  container.replaceChildren();

  if (item.videoUrl) {
    const video = document.createElement("video");
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";

    const url = new URL(item.videoUrl);

    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error("Unsupported video URL");
    }

    if (/\.m3u8($|\?)/i.test(url.href)) {
      const source = document.createElement("source");
      source.src = url.href;
      source.type = "application/vnd.apple.mpegurl";
      video.appendChild(source);
    } else {
      video.src = url.href;
    }

    container.appendChild(video);
  } else {
    const message = document.createElement("div");
    message.className = "empty";
    message.textContent = "المحتوى غير متاح للمشاهدة حالياً.";
    container.appendChild(message);
  }

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closePlayer() {
  modal.classList.remove("open");
  const video = document.querySelector("#videoContainer video");
  if (video) {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  document.getElementById("videoContainer").replaceChildren();
  document.body.style.overflow = "";
}

document.querySelectorAll(".category").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".category").forEach(x =>
      x.classList.remove("active")
    );
    button.classList.add("active");
    currentCategory = button.dataset.category;
    renderContent();
  });
});

searchInput.addEventListener("input", renderContent);

document.getElementById("searchToggle").addEventListener("click", () => {
  document.getElementById("searchPanel").classList.toggle("open");
  if (document.getElementById("searchPanel").classList.contains("open")) {
    searchInput.focus();
  }
});

document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("navLinks").classList.toggle("open");
});

document.getElementById("exploreBtn").addEventListener("click", () => {
  document.getElementById("library").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("aboutBtn").addEventListener("click", () => {
  document.getElementById("about").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("closePlayer").addEventListener("click", closePlayer);

modal.addEventListener("click", event => {
  if (event.target === modal) closePlayer();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closePlayer();
});

document.getElementById("year").textContent = new Date().getFullYear();

loadContent();
