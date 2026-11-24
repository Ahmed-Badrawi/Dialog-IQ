
const API_BASE = "";
const DEMO_MODE = !API_BASE;

const $ = id => document.getElementById(id);

let items = [];
let editingId = null;
let authenticated = false;

async function api(path, options = {}) {
  if (!API_BASE) throw new Error("السيرفر غير متصل");

  const isForm = options.body instanceof FormData;

  const response = await fetch(API_BASE + path, {
    ...options,
    credentials: "include",
    headers: {
      ...(isForm ? {} : {"Content-Type":"application/json"}),
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error("API error: " + response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;",
    '"':"&quot;", "'":"&#39;"
  })[c]);
}

async function login(email, password) {
  await api("/api/auth/login", {
    method:"POST",
    body:JSON.stringify({email,password})
  });

  const user = await api("/api/admin/me");

  if (!user || !user.isAdmin) {
    throw new Error("غير مصرح لك بالدخول");
  }

  authenticated = true;
  sessionStorage.setItem("noxar-admin-session","active");
  showAdmin();
}

function showAdmin() {
  $("loginScreen").hidden = true;
  $("adminApp").hidden = false;
  render();
}

async function loadItems() {
  if (DEMO_MODE) {
    items = JSON.parse(localStorage.getItem("noxar-admin-demo") || "[]");
    return;
  }

  const data = await api("/api/content");
  items = Array.isArray(data) ? data : [];
}

function saveDemo() {
  localStorage.setItem("noxar-admin-demo",JSON.stringify(items));
}

function render() {
  $("totalCount").textContent = items.length;
  $("publishedCount").textContent =
    items.filter(x => x.visibility === "published").length;
  $("draftCount").textContent =
    items.filter(x => x.visibility !== "published").length;

  $("contentTable").innerHTML = items.map(item => `
    <tr>
      <td>${escapeHTML(item.title)}</td>
      <td>${escapeHTML(item.category)}</td>
      <td>${escapeHTML(item.visibility || "draft")}</td>
      <td>
        <button data-edit="${escapeHTML(item.id)}">تعديل</button>
        <button data-delete="${escapeHTML(item.id)}">حذف</button>
      </td>
    </tr>
  `).join("");

  $("recentContent").textContent =
    items.slice(-5).map(x => x.title).join(" • ") || "لا يوجد محتوى بعد";
}

function showPage(page) {
  document.querySelectorAll(".admin-page").forEach(section => {
    section.hidden = section.id !== page;
  });

  document.querySelectorAll(".side-link").forEach(button => {
    button.classList.toggle("active",button.dataset.page === page);
  });

  const titles = {
    dashboard:"لوحة التحكم",
    content:"إدارة المحتوى",
    upload:"إضافة محتوى",
    settings:"الإعدادات"
  };

  $("pageTitle").textContent = titles[page] || "NOXAR";
}

document.querySelectorAll(".side-link").forEach(button => {
  button.addEventListener("click",() => showPage(button.dataset.page));
});

document.querySelectorAll("[data-open-upload]").forEach(button => {
  button.addEventListener("click",() => {
    editingId = null;
    $("contentForm").reset();
    showPage("upload");
  });
});

$("loginForm").addEventListener("submit",async event => {
  event.preventDefault();
  $("loginMessage").textContent = "جاري التحقق...";

  try {
    if (DEMO_MODE) {
      throw new Error("لا يوجد سيرفر مصادقة. يلزم إعداد API قبل الدخول.");
    }

    await login($("email").value,$("password").value);
  } catch(error) {
    $("loginMessage").textContent = error.message;
  }
});

$("contentForm").addEventListener("submit",async event => {
  event.preventDefault();

  if (!authenticated && !DEMO_MODE) {
    $("formMessage").textContent = "يجب تسجيل الدخول أولاً";
    return;
  }

  const data = {
    title:$("title").value.trim(),
    description:$("description").value.trim(),
    category:$("category").value,
    posterUrl:$("poster").value.trim(),
    videoUrl:$("videoUrl").value.trim(),
    videoType:$("videoType").value,
    rightsStatus:"declared",
    visibility:"draft"
  };

  if (!data.title || !$("rights").checked) {
    $("formMessage").textContent = "أكمل البيانات وأكد حقوق المحتوى.";
    return;
  }

  try {
    if (DEMO_MODE) {
      if (editingId !== null) {
        items = items.map(item =>
          item.id === editingId ? {...item,...data} : item
        );
      } else {
        items.push({
          id:crypto.randomUUID(),
          ...data
        });
      }

      saveDemo();
    } else if (editingId !== null) {
      await api(`/api/admin/content/${encodeURIComponent(editingId)}`,{
        method:"PATCH",
        body:JSON.stringify(data)
      });
      await loadItems();
    } else {
      await api("/api/admin/content",{
        method:"POST",
        body:JSON.stringify(data)
      });
      await loadItems();
    }

    $("formMessage").textContent = "تم حفظ المحتوى كمسودة.";
    $("contentForm").reset();
    editingId = null;
    render();

  } catch(error) {
    $("formMessage").textContent = error.message;
  }
});

$("contentTable").addEventListener("click",async event => {
  const edit = event.target.dataset.edit;
  const remove = event.target.dataset.delete;

  if (edit) {
    const item = items.find(x => String(x.id) === edit);
    if (!item) return;

    editingId = item.id;
    $("title").value = item.title || "";
    $("description").value = item.description || "";
    $("category").value = item.category || "movie";
    $("poster").value = item.posterUrl || "";
    $("videoUrl").value = item.videoUrl || "";
    $("videoType").value = item.videoType || "mp4";
    $("rights").checked = false;

    showPage("upload");
  }

  if (remove && confirm("هل تريد حذف هذا المحتوى؟")) {
    try {
      if (DEMO_MODE) {
        items = items.filter(x => String(x.id) !== remove);
        saveDemo();
      } else {
        await api(`/api/admin/content/${encodeURIComponent(remove)}`,{
          method:"DELETE"
        });
        await loadItems();
      }
      render();
    } catch(error) {
      alert(error.message);
    }
  }
});

$("logoutButton").addEventListener("click",async () => {
  try {
    if (!DEMO_MODE) await api("/api/auth/logout",{method:"POST"});
  } finally {
    authenticated = false;
    sessionStorage.removeItem("noxar-admin-session");
    location.reload();
  }
});

async function init() {
  if (DEMO_MODE) {
    await loadItems();
    return;
  }

  try {
    const user = await api("/api/admin/me");

    if (user?.isAdmin) {
      authenticated = true;
      await loadItems();
      showAdmin();
    }
  } catch(error) {
    console.warn("Admin session unavailable");
  }
}

init();
