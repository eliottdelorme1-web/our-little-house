const SUPABASE_URL = "https://ojqeyoxboecdiumetdab.supabase.co";
const SUPABASE_KEY = "sb_publishable_AOHdVdST0ACWtuttlRyB-w_sJllLWwf";

const SHARED_PIN = "1601";
const RELATIONSHIP_DATE = new Date("2024-01-16T00:00:00");
const PHOTO_BUCKET = "our-photos";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentName = null;
let selectedPerson = null;
let currentPage = "home";
let todoFilter = "open";
let entertainmentFilter = "All";
let restaurantFilter = "All";
let currentCalendarDate = new Date();
let calendarEvents = [];
let worldMap = null;
let countries = [];
let secretClicks = 0;
let easterEggTimer = null;
let familyMembers = [];

const EASTER_EGGS = [
  "Miss Nebula is watching the stars ✨",
  "Marshmallow was here ☁️",
  "Our little universe keeps growing 💕",
  "Home is wherever we are 🏡",
  "Miss Nebula found another dream ✨",
  "Marshmallow says: take a cute photo ☁️📸",
  "Tokyo is inspecting the house 😼",
  "Tokyo asks: where are my treats? 🐾",
  "Mochi is taking a very important nap 😴",
  "Mochi says the sofa belongs to the cats ☁️🐈",
  "The little family is all home tonight 🏡💕"
];

const PAGE_INFO = {
  home: ["Home", "Your shared little space."],
  todo: ["To-Do List", "Shared tasks for both of you."],
  grocery: ["Grocery List", "Everything you need to buy."],
  calendar: ["Calendar", "Dates, plans and upcoming events."],
  memories: ["Memory Room", "Photos and moments kept forever."],
  entertainment: ["Entertainment", "Movies, shows, anime and games."],
  restaurants: ["Restaurants", "Places visited or waiting to be tried."],
  worldmap: ["World Map", "Color your story country by country."],
  ideas: ["Ideas & Dreams", "Plans and wishes for your future."],
  chat: ["Private Chat", "A permanent space just for both of you."]
};

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
  bindStaticEvents();
  updateDaysTogether();
  const { data: { session } } = await db.auth.getSession();

  if (session) {
    currentUser = session.user;
    currentName =
      localStorage.getItem("ourLittleHouseName") ||
      session.user.user_metadata?.display_name ||
      "Our House";
    await enterApp();
  }
}

function bindStaticEvents() {
  document.querySelectorAll(".person-button").forEach(button => {
    button.addEventListener("click", () => {
      selectedPerson = button.dataset.person;
      document.querySelectorAll(".person-button").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });

  document.getElementById("loginButton").addEventListener("click", login);
  document.getElementById("loginPin").addEventListener("keydown", event => {
    if (event.key === "Enter") login();
  });
  document.getElementById("logoutButton").addEventListener("click", logout);
  document.getElementById("menuButton").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => navigateTo(button.dataset.page));
  });
  document.querySelectorAll("[data-go-page]").forEach(button => {
    button.addEventListener("click", () => navigateTo(button.dataset.goPage));
  });

  document.getElementById("addTodoButton").addEventListener("click", addTodo);
  document.getElementById("todoInput").addEventListener("keydown", event => {
    if (event.key === "Enter") addTodo();
  });
  document.querySelectorAll("[data-todo-filter]").forEach(button => {
    button.addEventListener("click", () => {
      todoFilter = button.dataset.todoFilter;
      document.querySelectorAll("[data-todo-filter]").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      loadTodos();
    });
  });

  document.getElementById("addGroceryButton").addEventListener("click", addGrocery);

  document.getElementById("previousMonthButton").addEventListener("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("nextMonthButton").addEventListener("click", () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });
  document.getElementById("openEventModalButton").addEventListener("click", openEventModal);

  document.getElementById("openMemoryModalButton").addEventListener("click", openMemoryModal);
  document.getElementById("openEntertainmentModalButton").addEventListener("click", openEntertainmentModal);
  document.querySelectorAll("[data-entertainment-filter]").forEach(button => {
    button.addEventListener("click", () => {
      entertainmentFilter = button.dataset.entertainmentFilter;
      document.querySelectorAll("[data-entertainment-filter]").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      loadEntertainment();
    });
  });

  document.getElementById("openRestaurantModalButton").addEventListener("click", openRestaurantModal);
  document.querySelectorAll("[data-restaurant-filter]").forEach(button => {
    button.addEventListener("click", () => {
      restaurantFilter = button.dataset.restaurantFilter;
      document.querySelectorAll("[data-restaurant-filter]").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      loadRestaurants();
    });
  });

  document.getElementById("saveCountryButton").addEventListener("click", saveCountry);
  document.getElementById("openIdeaModalButton").addEventListener("click", openIdeaModal);
  document.getElementById("sendChatButton").addEventListener("click", sendMessage);
  document.getElementById("chatInput").addEventListener("keydown", event => {
    if (event.key === "Enter") sendMessage();
  });

  document.getElementById("closeModalButton").addEventListener("click", closeModal);
  document.getElementById("modalBackdrop").addEventListener("click", event => {
    if (event.target.id === "modalBackdrop") closeModal();
  });
  document.getElementById("closeFamilyModalButton").addEventListener("click", closeFamilyModal);
  document.getElementById("familyModal").addEventListener("click", event => {
    if (event.target.id === "familyModal") closeFamilyModal();
  });

  document.getElementById("closeLightboxButton").addEventListener("click", closeLightbox);
  document.getElementById("photoLightbox").addEventListener("click", event => {
    if (event.target.id === "photoLightbox") closeLightbox();
  });

  document.getElementById("brandButton").addEventListener("click", handleSecretClick);
  document.getElementById("closeSecretButton").addEventListener("click", () => {
    document.getElementById("secretModal").classList.add("hidden");
  });
}


window.addEventListener("resize", () => {
  if (currentPage === "worldmap") resizeWorldMap();
});


async function login() {
  const errorBox = document.getElementById("loginError");
  errorBox.textContent = "";

  if (!selectedPerson) {
    errorBox.textContent = "Choose Yasmin or Eliott.";
    return;
  }
  if (document.getElementById("loginPin").value !== SHARED_PIN) {
    errorBox.textContent = "Wrong PIN.";
    return;
  }

  let { data: { session } } = await db.auth.getSession();

  if (!session) {
    const { data, error } = await db.auth.signInAnonymously({
      options: { data: { display_name: selectedPerson } }
    });
    if (error) {
      errorBox.textContent = error.message;
      return;
    }
    session = data.session;
  } else {
    await db.auth.updateUser({ data: { display_name: selectedPerson } });
  }

  currentUser = session.user;
  currentName = selectedPerson;
  localStorage.setItem("ourLittleHouseName", selectedPerson);
  await ensureProfile();
  await enterApp();
}

async function ensureProfile() {
  if (!currentUser) return;
  const { data: existing } = await db
    .from("profiles")
    .select("id")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (existing) {
    await db.from("profiles").update({ display_name: currentName }).eq("id", currentUser.id);
  }
}

async function enterApp() {
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("appView").classList.remove("hidden");
  document.getElementById("userChip").textContent = `💕 ${currentName}`;
  updateDaysTogether();
  await loadHome();
  subscribeRealtime();
  startEasterEggs();
}

async function logout() {
  localStorage.removeItem("ourLittleHouseName");
  await db.auth.signOut();
  location.reload();
}

async function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll(".page").forEach(section => section.classList.remove("active"));
  document.querySelectorAll(".nav-button").forEach(button => button.classList.remove("active"));

  document.getElementById(`${page}Page`).classList.add("active");
  document.querySelector(`.nav-button[data-page="${page}"]`)?.classList.add("active");
  document.getElementById("pageTitle").textContent = PAGE_INFO[page][0];
  document.getElementById("pageSubtitle").textContent = PAGE_INFO[page][1];
  document.getElementById("sidebar").classList.remove("open");

  const loaders = {
    home: loadHome,
    todo: loadTodos,
    grocery: loadGroceries,
    calendar: loadCalendar,
    memories: loadMemories,
    entertainment: loadEntertainment,
    restaurants: loadRestaurants,
    worldmap: async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await loadCountries();
      resizeWorldMap();
    },
    ideas: loadIdeas,
    chat: loadChat
  };

  await loaders[page]?.();
}

function updateDaysTogether() {
  const days = Math.max(0, Math.floor((Date.now() - RELATIONSHIP_DATE.getTime()) / 86400000));
  document.getElementById("daysTogether").textContent = days.toLocaleString("en-US");
}

async function loadFamily() {
  const { data, error } = await db
    .from("family_members")
    .select("*")
    .order("sort_order");

  if (error) {
    console.warn("Family loading error:", error.message);
    document.getElementById("familyGrid").innerHTML =
      emptyState("Run SUPABASE-V7-FAMILY.sql to activate the family section.");
    return;
  }

  familyMembers = data || [];

  const cards = await Promise.all(familyMembers.map(async member => {
    const imageUrl = await getFamilyPhotoUrl(member.photo_path);
    const isCat = member.member_type === "cat";
    const fallback = member.name === "Yasmin" ? "🌸" :
      member.name === "Eliott" ? "💙" :
      member.name === "Tokyo" ? "🐈" : "☁️";

    return `
      <article class="family-card">
        <div class="family-avatar-wrap">
          <div class="family-avatar ${isCat ? "cat" : ""}">
            ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHtml(member.name)}">` : fallback}
          </div>
        </div>

        <span class="family-role">${escapeHtml(member.role_label || "")}</span>
        <h3>${escapeHtml(member.name)}</h3>
        <p class="family-tagline">${escapeHtml(member.tagline || "")}</p>

        <div class="family-actions">
          <label class="family-upload-label">
            📷 Photo
            <input class="hidden" type="file" accept="image/*"
              onchange="uploadFamilyPhoto('${member.id}',this)">
          </label>
          <button class="family-details-button"
            onclick="openFamilyMember('${member.id}')">
            About
          </button>
        </div>
      </article>
    `;
  }));

  document.getElementById("familyGrid").innerHTML =
    cards.join("") || emptyState("No family members yet.");
}

async function getFamilyPhotoUrl(path) {
  if (!path) return null;
  const { data } = await db.storage.from(PHOTO_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

async function uploadFamilyPhoto(memberId, input) {
  const file = input.files[0];
  if (!file) return;

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `family/${memberId}/${Date.now()}-${safeName}`;

    const member = familyMembers.find(item => item.id === memberId);
    if (member?.photo_path) {
      await db.storage.from(PHOTO_BUCKET).remove([member.photo_path]);
    }

    const { error: uploadError } = await db.storage
      .from(PHOTO_BUCKET)
      .upload(path, file);

    if (uploadError) throw uploadError;

    const { error: updateError } = await db
      .from("family_members")
      .update({
        photo_path: path,
        updated_by: currentUser.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", memberId);

    if (updateError) throw updateError;

    input.value = "";
    await loadFamily();
  } catch (error) {
    alert(error.message);
  }
}

async function openFamilyMember(memberId) {
  const member = familyMembers.find(item => item.id === memberId);
  if (!member) return;

  const imageUrl = await getFamilyPhotoUrl(member.photo_path);
  const fallback = member.name === "Yasmin" ? "🌸" :
    member.name === "Eliott" ? "💙" :
    member.name === "Tokyo" ? "🐈" : "☁️";

  document.getElementById("familyModalContent").innerHTML = `
    <div class="family-modal-avatar">
      ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHtml(member.name)}">` : fallback}
    </div>
    <span class="family-role">${escapeHtml(member.role_label || "")}</span>
    <h2>${escapeHtml(member.name)}</h2>
    <p>${escapeHtml(member.description || member.tagline || "")}</p>
    <div class="family-modal-quote">${escapeHtml(member.secret_message || "")}</div>
  `;

  document.getElementById("familyModal").classList.remove("hidden");
}

function closeFamilyModal() {
  document.getElementById("familyModal").classList.add("hidden");
  document.getElementById("familyModalContent").innerHTML = "";
}

async function loadHome() {
  await loadFamily();
  const today = new Date().toISOString().slice(0, 10);
  const [todos, groceries, memories, restaurants, events, latestMemories] = await Promise.all([
    db.from("todo_items").select("*", { count: "exact", head: true }).eq("completed", false),
    db.from("grocery_items").select("*", { count: "exact", head: true }).eq("purchased", false),
    db.from("memories").select("*", { count: "exact", head: true }),
    db.from("restaurants").select("*", { count: "exact", head: true }),
    db.from("calendar_events").select("*").gte("event_date", today).order("event_date").limit(5),
    db.from("memories").select("*").order("memory_date", { ascending: false }).limit(5)
  ]);

  document.getElementById("todoCount").textContent = todos.count || 0;
  document.getElementById("groceryCount").textContent = groceries.count || 0;
  document.getElementById("memoryCount").textContent = memories.count || 0;
  document.getElementById("restaurantCount").textContent = restaurants.count || 0;

  renderCompactEvents(events.data || [], "homeUpcomingEvents");
  document.getElementById("homeLatestMemories").innerHTML =
    (latestMemories.data || []).map(memory => `
      <div class="compact-item">
        <div>
          <strong>${escapeHtml(memory.title)}</strong>
          <div class="check-meta">${formatDate(memory.memory_date)}${memory.location ? ` · ${escapeHtml(memory.location)}` : ""}</div>
        </div>
      </div>
    `).join("") || emptyState("No memories yet.");
}

async function addTodo() {
  const title = value("todoInput");
  if (!title) return;

  const { error } = await db.from("todo_items").insert({
    title,
    completed: false,
    created_by: currentUser.id
  });
  if (error) return alert(error.message);

  clearValue("todoInput");
  await loadTodos();
  await loadHome();
}

async function loadTodos() {
  let query = db.from("todo_items").select("*").order("created_at", { ascending: false });
  if (todoFilter === "open") query = query.eq("completed", false);
  if (todoFilter === "done") query = query.eq("completed", true);

  const { data, error } = await query;
  if (error) return alert(error.message);

  document.getElementById("todoList").innerHTML =
    (data || []).map(item => `
      <div class="check-item ${item.completed ? "completed" : ""}">
        <button class="checkbox-button ${item.completed ? "checked" : ""}" onclick="toggleTodo('${item.id}', ${!item.completed})">
          ${item.completed ? "✓" : ""}
        </button>
        <div class="check-content">
          <div class="check-title">${escapeHtml(item.title)}</div>
          <div class="check-meta">Added ${formatDateTime(item.created_at)}</div>
        </div>
        <button class="delete-button" onclick="deleteRow('todo_items','${item.id}',loadTodos)">Delete</button>
      </div>
    `).join("") || emptyState("Nothing here yet.");
}

async function toggleTodo(id, completed) {
  const { error } = await db.from("todo_items").update({
    completed,
    completed_at: completed ? new Date().toISOString() : null
  }).eq("id", id);
  if (error) return alert(error.message);

  await loadTodos();
  await loadHome();
}

async function addGrocery() {
  const name = value("groceryName");
  if (!name) return;

  const { error } = await db.from("grocery_items").insert({
    name,
    quantity: value("groceryQuantity"),
    category: value("groceryCategory"),
    purchased: false,
    created_by: currentUser.id
  });
  if (error) return alert(error.message);

  clearValue("groceryName", "groceryQuantity");
  await loadGroceries();
  await loadHome();
}

async function loadGroceries() {
  const { data, error } = await db
    .from("grocery_items")
    .select("*")
    .order("purchased")
    .order("created_at", { ascending: false });

  if (error) return alert(error.message);

  document.getElementById("groceryList").innerHTML =
    (data || []).map(item => `
      <div class="check-item ${item.purchased ? "completed" : ""}">
        <button class="checkbox-button ${item.purchased ? "checked" : ""}" onclick="toggleGrocery('${item.id}', ${!item.purchased})">
          ${item.purchased ? "✓" : ""}
        </button>
        <div class="check-content">
          <div class="check-title">${escapeHtml(item.name)}</div>
          <div class="check-meta">${escapeHtml(item.quantity || "No quantity")} · ${escapeHtml(item.category)}</div>
        </div>
        <button class="delete-button" onclick="deleteRow('grocery_items','${item.id}',loadGroceries)">Delete</button>
      </div>
    `).join("") || emptyState("Your grocery list is empty.");
}

async function toggleGrocery(id, purchased) {
  const { error } = await db.from("grocery_items").update({
    purchased,
    purchased_at: purchased ? new Date().toISOString() : null
  }).eq("id", id);
  if (error) return alert(error.message);

  await loadGroceries();
  await loadHome();
}

async function loadCalendar() {
  const { data, error } = await db.from("calendar_events").select("*").order("event_date");
  if (error) return alert(error.message);

  calendarEvents = data || [];
  renderCalendar();
  renderCompactEvents(
    calendarEvents.filter(event => event.event_date >= new Date().toISOString().slice(0, 10)).slice(0, 10),
    "upcomingEventsList",
    true
  );
}

function renderCalendar() {
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  document.getElementById("calendarMonthTitle").textContent =
    currentCalendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(day => {
    grid.insertAdjacentHTML("beforeend", `<div class="calendar-day-name">${day}</div>`);
  });

  let offset = new Date(year, month, 1).getDay();
  offset = offset === 0 ? 6 : offset - 1;

  for (let i = 0; i < offset; i++) {
    grid.insertAdjacentHTML("beforeend", "<div></div>");
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = calendarEvents.filter(event => event.event_date === date);

    grid.insertAdjacentHTML("beforeend", `
      <button type="button" class="calendar-day ${date === today ? "today" : ""}" onclick="openEventModal('${date}')">
        <strong>${day}</strong>
        ${events.slice(0, 2).map(event => `<span class="calendar-event-pill">${escapeHtml(event.title)}</span>`).join("")}
      </button>
    `);
  }
}

function renderCompactEvents(events, elementId, deletable = false) {
  document.getElementById(elementId).innerHTML =
    events.map(event => `
      <div class="compact-item">
        <div class="check-content">
          <strong>${escapeHtml(event.title)}</strong>
          <div class="check-meta">${formatDate(event.event_date)}${event.event_time ? ` · ${escapeHtml(event.event_time.slice(0, 5))}` : ""}${event.location ? ` · ${escapeHtml(event.location)}` : ""}</div>
        </div>
        ${deletable ? `<button class="delete-button" onclick="deleteRow('calendar_events','${event.id}',loadCalendar)">Delete</button>` : ""}
      </div>
    `).join("") || emptyState("No upcoming events.");
}

function openEventModal(defaultDate = "") {
  openModal(`
    <form id="eventForm" class="modal-form">
      <h2>New event</h2>
      <input id="eventTitle" placeholder="Event title" required>
      <div class="form-grid">
        <input id="eventDate" type="date" value="${defaultDate}" required>
        <input id="eventTime" type="time">
      </div>
      <input id="eventLocation" placeholder="Location">
      <textarea id="eventDescription" placeholder="Description"></textarea>
      <button class="primary-button full-button" type="submit">Save event</button>
    </form>
  `);

  document.getElementById("eventForm").addEventListener("submit", async event => {
    event.preventDefault();
    const { error } = await db.from("calendar_events").insert({
      title: value("eventTitle"),
      event_date: value("eventDate"),
      event_time: value("eventTime") || null,
      location: value("eventLocation"),
      description: value("eventDescription"),
      created_by: currentUser.id
    });
    if (error) return alert(error.message);

    closeModal();
    await loadCalendar();
    await loadHome();
  });
}

async function loadMemories() {
  const { data, error } = await db
    .from("memories")
    .select("*,memory_photos(*)")
    .order("memory_date", { ascending: false });

  if (error) return alert(error.message);

  const cards = await Promise.all((data || []).map(async memory => {
    const firstPhoto = memory.memory_photos?.[0];
    let cover = `<span>📸 No photo yet</span>`;

    if (firstPhoto) {
      const { data: signed } = await db.storage.from(PHOTO_BUCKET).createSignedUrl(firstPhoto.storage_path, 3600);
      if (signed?.signedUrl) {
        cover = `<img src="${signed.signedUrl}" alt="Memory" onclick="openLightbox('${signed.signedUrl}')">`;
      }
    }

    return `
      <article class="memory-card">
        <div class="memory-cover">${cover}</div>
        <div class="card-body">
          <h3>${escapeHtml(memory.title)}</h3>
          <div class="card-meta">${formatDate(memory.memory_date)}${memory.location ? ` · ${escapeHtml(memory.location)}` : ""}</div>
          <p>${escapeHtml(memory.description || "")}</p>
          ${memory.favorite_moment ? `<p><strong>Favorite moment:</strong> ${escapeHtml(memory.favorite_moment)}</p>` : ""}
          <div class="card-actions">
            <label class="small-action">
              Add photo
              <input class="hidden" type="file" accept="image/*" onchange="uploadMemoryPhoto('${memory.id}',this)">
            </label>
            <button class="small-action danger" onclick="deleteRow('memories','${memory.id}',loadMemories)">Delete</button>
          </div>
        </div>
      </article>
    `;
  }));

  document.getElementById("memoryGrid").innerHTML = cards.join("") || emptyState("No memories yet.");
}

function openMemoryModal() {
  openModal(`
    <form id="memoryForm" class="modal-form">
      <h2>New memory</h2>
      <input id="memoryTitle" placeholder="Memory title" required>
      <div class="form-grid">
        <input id="memoryDate" type="date">
        <input id="memoryLocation" placeholder="Location">
      </div>
      <textarea id="memoryDescription" placeholder="Description"></textarea>
      <textarea id="memoryFavorite" placeholder="Favorite moment"></textarea>
      <label>Photo (optional)</label>
      <input id="memoryPhoto" type="file" accept="image/*">
      <button class="primary-button full-button" type="submit">Save memory</button>
    </form>
  `);

  document.getElementById("memoryForm").addEventListener("submit", async event => {
    event.preventDefault();
    const { data, error } = await db.from("memories").insert({
      title: value("memoryTitle"),
      memory_date: value("memoryDate") || null,
      location: value("memoryLocation"),
      description: value("memoryDescription"),
      favorite_moment: value("memoryFavorite"),
      created_by: currentUser.id
    }).select().single();

    if (error) return alert(error.message);

    const file = document.getElementById("memoryPhoto").files[0];
    if (file) await saveMemoryPhoto(data.id, file);

    closeModal();
    await loadMemories();
    await loadHome();
  });
}

async function uploadMemoryPhoto(memoryId, input) {
  const file = input.files[0];
  if (!file) return;

  try {
    await saveMemoryPhoto(memoryId, file);
    await loadMemories();
  } catch (error) {
    alert(error.message);
  }
}

async function saveMemoryPhoto(memoryId, file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${memoryId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await db.storage.from(PHOTO_BUCKET).upload(path, file);
  if (uploadError) throw uploadError;

  const { error: databaseError } = await db.from("memory_photos").insert({
    memory_id: memoryId,
    storage_path: path,
    uploaded_by: currentUser.id
  });
  if (databaseError) throw databaseError;
}

async function loadEntertainment() {
  let query = db.from("entertainment_items").select("*").order("created_at", { ascending: false });
  if (entertainmentFilter !== "All") query = query.eq("item_type", entertainmentFilter);

  const { data, error } = await query;
  if (error) return alert(error.message);

  document.getElementById("entertainmentGrid").innerHTML =
    (data || []).map(item => `
      <article class="content-card">
        <div class="card-body">
          <span class="status-badge">${escapeHtml(item.item_type)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="card-meta">${escapeHtml(item.status)}</div>
          <p>${escapeHtml(item.description || "")}</p>
          <div class="rating-line">Eliott: ${hearts(item.rating_eliott)}<br>Yasmin: ${hearts(item.rating_yasmin)}</div>
          <div class="card-actions">
            <button class="small-action danger" onclick="deleteRow('entertainment_items','${item.id}',loadEntertainment)">Delete</button>
          </div>
        </div>
      </article>
    `).join("") || emptyState("No items in this category.");
}

function openEntertainmentModal() {
  openModal(`
    <form id="entertainmentForm" class="modal-form">
      <h2>Add entertainment</h2>
      <select id="entType">
        <option>Movie</option>
        <option>TV Show</option>
        <option>Anime</option>
        <option>Game</option>
      </select>
      <input id="entTitle" placeholder="Title" required>
      <select id="entStatus">
        <option>Want to watch</option>
        <option>Watching</option>
        <option>Playing</option>
        <option>Finished</option>
        <option>Dropped</option>
      </select>
      <textarea id="entDescription" placeholder="Description"></textarea>
      <div class="form-grid">
        <input id="entEliott" type="number" min="1" max="5" placeholder="Eliott rating">
        <input id="entYasmin" type="number" min="1" max="5" placeholder="Yasmin rating">
      </div>
      <button class="primary-button full-button" type="submit">Save item</button>
    </form>
  `);

  document.getElementById("entertainmentForm").addEventListener("submit", async event => {
    event.preventDefault();
    const { error } = await db.from("entertainment_items").insert({
      item_type: value("entType"),
      title: value("entTitle"),
      status: value("entStatus"),
      description: value("entDescription"),
      rating_eliott: nullableNumber("entEliott"),
      rating_yasmin: nullableNumber("entYasmin"),
      created_by: currentUser.id
    });
    if (error) return alert(error.message);

    closeModal();
    await loadEntertainment();
  });
}

async function loadRestaurants() {
  let query = db.from("restaurants").select("*").order("created_at", { ascending: false });
  if (restaurantFilter !== "All") query = query.eq("status", restaurantFilter);

  const { data, error } = await query;
  if (error) return alert(error.message);

  document.getElementById("restaurantGrid").innerHTML =
    (data || []).map(item => `
      <article class="content-card">
        <div class="card-body">
          <span class="status-badge">${escapeHtml(item.status)}</span>
          <h3>${escapeHtml(item.name)}</h3>
          <div class="card-meta">${escapeHtml(item.city || "")}${item.cuisine ? ` · ${escapeHtml(item.cuisine)}` : ""}</div>
          <p>${escapeHtml(item.description || "")}</p>
          <div class="rating-line">Eliott: ${hearts(item.rating_eliott)}<br>Yasmin: ${hearts(item.rating_yasmin)}</div>
          <div class="card-actions">
            ${item.maps_url ? `<a class="small-action" href="${escapeHtml(item.maps_url)}" target="_blank" rel="noopener">Map</a>` : ""}
            <button class="small-action danger" onclick="deleteRow('restaurants','${item.id}',loadRestaurants)">Delete</button>
          </div>
        </div>
      </article>
    `).join("") || emptyState("No restaurants here yet.");
}

function openRestaurantModal() {
  openModal(`
    <form id="restaurantForm" class="modal-form">
      <h2>Add restaurant</h2>
      <input id="restaurantName" placeholder="Restaurant name" required>
      <div class="form-grid">
        <input id="restaurantCity" placeholder="City">
        <input id="restaurantCuisine" placeholder="Cuisine">
      </div>
      <select id="restaurantStatus">
        <option>Visited</option>
        <option>Want to try</option>
      </select>
      <input id="restaurantDate" type="date">
      <input id="restaurantMap" placeholder="Google Maps link">
      <textarea id="restaurantDescription" placeholder="Small description"></textarea>
      <textarea id="restaurantOrder" placeholder="What did you order?"></textarea>
      <div class="form-grid">
        <input id="restaurantEliott" type="number" min="1" max="5" placeholder="Eliott rating">
        <input id="restaurantYasmin" type="number" min="1" max="5" placeholder="Yasmin rating">
      </div>
      <button class="primary-button full-button" type="submit">Save restaurant</button>
    </form>
  `);

  document.getElementById("restaurantForm").addEventListener("submit", async event => {
    event.preventDefault();
    const { error } = await db.from("restaurants").insert({
      name: value("restaurantName"),
      city: value("restaurantCity"),
      cuisine: value("restaurantCuisine"),
      status: value("restaurantStatus"),
      visit_date: value("restaurantDate") || null,
      maps_url: value("restaurantMap"),
      description: value("restaurantDescription"),
      ordered_food: value("restaurantOrder"),
      rating_eliott: nullableNumber("restaurantEliott"),
      rating_yasmin: nullableNumber("restaurantYasmin"),
      created_by: currentUser.id
    });
    if (error) return alert(error.message);

    closeModal();
    await loadRestaurants();
    await loadHome();
  });
}

async function loadCountries() {
  const { data, error } = await db.from("countries").select("*").order("country_name");
  if (error) return alert(error.message);

  countries = data || [];
  initializeWorldMap();
  updateMapColors();

  document.getElementById("countryList").innerHTML =
    countries.map(country => {
      const cssClass =
        country.status === "Visited" ? "visited" :
        country.status === "Want to visit" ? "wanted" :
        country.status === "Dream destination" ? "dream" : "";

      return `
        <button type="button" class="country-card ${cssClass}" onclick="selectCountry('${country.country_code}','${escapeAttribute(country.country_name)}')">
          <strong>${countryFlag(country.country_code)} ${escapeHtml(country.country_name)}</strong>
          <div class="check-meta">${escapeHtml(country.status)}</div>
        </button>
      `;
    }).join("") || emptyState("Click a country on the map.");
}

function initializeWorldMap() {
  const container = document.getElementById("worldMap");
  const loadingMessage = document.getElementById("mapLoadingMessage");

  if (!container) return;

  if (typeof window.jsVectorMap === "undefined") {
    if (loadingMessage) {
      loadingMessage.textContent =
        "The map library could not load. Please refresh the page once.";
      loadingMessage.classList.add("map-error-message");
    }
    return;
  }

  if (worldMap) {
    resizeWorldMap();
    return;
  }

  if (loadingMessage) loadingMessage.remove();

  try {
    worldMap = new window.jsVectorMap({
      selector: "#worldMap",
      map: "world",
      backgroundColor: "transparent",
      zoomButtons: true,
      zoomOnScroll: true,
      regionsSelectable: false,
      regionStyle: {
        initial: {
          fill: "#b8a8bd",
          stroke: "#f6f1f6",
          strokeWidth: 0.45,
          fillOpacity: 1
        },
        hover: {
          fill: "#d69ab7",
          fillOpacity: 1,
          cursor: "pointer"
        }
      },
      series: {
        regions: [{
          attribute: "fill",
          scale: {
            visited: "#c985a7",
            wanted: "#947db0",
            dream: "#79a58f",
            neutral: "#b8a8bd"
          },
          values: {}
        }]
      },
      onRegionClick: function (_event, code) {
        let name = code;

        try {
          if (typeof worldMap.getRegionName === "function") {
            name = worldMap.getRegionName(code) || code;
          } else if (worldMap.maps?.world?.paths?.[code]?.name) {
            name = worldMap.maps.world.paths[code].name;
          }
        } catch (_error) {
          name = code;
        }

        selectCountry(code, name);
      }
    });

    setTimeout(() => {
      updateMapColors();
      resizeWorldMap();
    }, 100);
  } catch (error) {
    console.error("World map error:", error);
    container.innerHTML = `
      <div class="map-loading-message map-error-message">
        The map could not start. Refresh the page, then open World Map again.
      </div>
    `;
  }
}

function resizeWorldMap() {
  if (!worldMap) return;

  setTimeout(() => {
    try {
      if (typeof worldMap.updateSize === "function") {
        worldMap.updateSize();
      } else if (typeof worldMap._resize === "function") {
        worldMap._resize();
      }

      window.dispatchEvent(new Event("resize"));
    } catch (error) {
      console.warn("Map resize warning:", error);
    }
  }, 120);
}

function updateMapColors() {
  if (!worldMap?.series?.regions?.[0]) return;
  const values = {};

  countries.forEach(country => {
    values[country.country_code] =
      country.status === "Visited" ? "visited" :
      country.status === "Want to visit" ? "wanted" :
      country.status === "Dream destination" ? "dream" : "neutral";
  });

  worldMap.series.regions[0].setValues(values);
}

function selectCountry(code, name) {
  const existing = countries.find(country => country.country_code === code);
  document.getElementById("countryCode").value = code;
  document.getElementById("countryName").value = existing?.country_name || name;
  document.getElementById("countryStatus").value = existing?.status || "Want to visit";
  document.getElementById("countryNotes").value = existing?.notes || "";
  document.getElementById("countryEditorTitle").textContent =
    `${countryFlag(code)} ${existing?.country_name || name}`;
}

async function saveCountry() {
  const code = value("countryCode");
  if (!code) return alert("Choose a country on the map first.");

  const status = value("countryStatus");

  if (status === "Not visited") {
    const { error } = await db.from("countries").delete().eq("country_code", code);
    if (error) return alert(error.message);
  } else {
    const { error } = await db.from("countries").upsert({
      country_code: code,
      country_name: value("countryName"),
      status,
      notes: value("countryNotes"),
      updated_by: currentUser.id
    }, { onConflict: "country_code" });
    if (error) return alert(error.message);
  }

  await loadCountries();
  selectCountry(code, value("countryName"));
}

async function loadIdeas() {
  const { data, error } = await db.from("dreams").select("*").order("created_at", { ascending: false });
  if (error) return alert(error.message);

  document.getElementById("ideaGrid").innerHTML =
    (data || []).map(item => `
      <article class="content-card">
        <div class="card-body">
          <span class="status-badge">${escapeHtml(item.category)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="card-meta">${escapeHtml(item.status)}</div>
          <p>${escapeHtml(item.description || "")}</p>
          <div class="card-actions">
            <button class="small-action danger" onclick="deleteRow('dreams','${item.id}',loadIdeas)">Delete</button>
          </div>
        </div>
      </article>
    `).join("") || emptyState("No ideas yet.");
}

function openIdeaModal() {
  openModal(`
    <form id="ideaForm" class="modal-form">
      <h2>New idea</h2>
      <input id="ideaTitle" placeholder="Title" required>
      <textarea id="ideaDescription" placeholder="Description"></textarea>
      <div class="form-grid">
        <select id="ideaCategory">
          <option>Travel</option>
          <option>Home</option>
          <option>Relationship</option>
          <option>Project</option>
          <option>Other</option>
        </select>
        <select id="ideaStatus">
          <option>Dream</option>
          <option>Planned</option>
          <option>Completed</option>
        </select>
      </div>
      <button class="primary-button full-button" type="submit">Save idea</button>
    </form>
  `);

  document.getElementById("ideaForm").addEventListener("submit", async event => {
    event.preventDefault();
    const { error } = await db.from("dreams").insert({
      title: value("ideaTitle"),
      description: value("ideaDescription"),
      category: value("ideaCategory"),
      status: value("ideaStatus"),
      created_by: currentUser.id
    });
    if (error) return alert(error.message);

    closeModal();
    await loadIdeas();
  });
}

async function loadChat() {
  const [{ data: messages, error }, { data: profiles }] = await Promise.all([
    db.from("chat_messages").select("*").order("created_at"),
    db.from("profiles").select("id,display_name")
  ]);
  if (error) return alert(error.message);

  const names = Object.fromEntries((profiles || []).map(profile => [profile.id, profile.display_name]));

  document.getElementById("chatMessages").innerHTML =
    (messages || []).map(message => `
      <div class="chat-message ${message.created_by === currentUser.id ? "mine" : ""}">
        <small>${escapeHtml(names[message.created_by] || "Unknown")} · ${formatDateTime(message.created_at)}</small>
        <div>${escapeHtml(message.message)}</div>
      </div>
    `).join("") || emptyState("No messages yet.");

  const box = document.getElementById("chatMessages");
  box.scrollTop = box.scrollHeight;
}

async function sendMessage() {
  const message = value("chatInput");
  if (!message) return;

  const { error } = await db.from("chat_messages").insert({
    message,
    created_by: currentUser.id
  });
  if (error) return alert(error.message);

  clearValue("chatInput");
  await loadChat();
}

function subscribeRealtime() {
  db.channel("our-little-house-v6")
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
      if (currentPage === "chat") loadChat();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => {
      if (currentPage === "calendar") loadCalendar();
      if (currentPage === "home") loadHome();
    })
    .subscribe();
}

async function deleteRow(table, id, reloadFunction) {
  if (!confirm("Delete this item?")) return;

  const { error } = await db.from(table).delete().eq("id", id);
  if (error) return alert(error.message);

  await reloadFunction();
  if (currentPage !== "home") await loadHome();
}

function openModal(content) {
  document.getElementById("modalContent").innerHTML = content;
  document.getElementById("modalBackdrop").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.add("hidden");
  document.getElementById("modalContent").innerHTML = "";
}

function openLightbox(url) {
  document.getElementById("lightboxImage").src = url;
  document.getElementById("photoLightbox").classList.remove("hidden");
}

function closeLightbox() {
  document.getElementById("photoLightbox").classList.add("hidden");
  document.getElementById("lightboxImage").src = "";
}

function handleSecretClick() {
  secretClicks += 1;
  if (secretClicks === 3) showRandomEasterEgg();
  if (secretClicks >= 5) {
    secretClicks = 0;
    document.getElementById("secretModal").classList.remove("hidden");
  }
  setTimeout(() => { secretClicks = 0; }, 3500);
}

function startEasterEggs() {
  if (easterEggTimer) return;

  const schedule = () => {
    easterEggTimer = setTimeout(() => {
      if (Math.random() < 0.75) showRandomEasterEgg();
      schedule();
    }, 30000 + Math.floor(Math.random() * 45000));
  };
  schedule();
}

function showRandomEasterEgg() {
  const toast = document.getElementById("easterEggToast");
  toast.textContent = EASTER_EGGS[Math.floor(Math.random() * EASTER_EGGS.length)];
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 5000);
}

function value(id) {
  return document.getElementById(id)?.value?.trim() || "";
}

function clearValue(...ids) {
  ids.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.value = "";
  });
}

function nullableNumber(id) {
  const raw = value(id);
  return raw ? Number(raw) : null;
}

function hearts(number) {
  return number ? "💖".repeat(Number(number)) + "🤍".repeat(5 - Number(number)) : "No rating";
}

function emptyState(text) {
  return `<div class="compact-item"><span class="check-meta">${escapeHtml(text)}</span></div>`;
}

function formatDate(date) {
  if (!date) return "No date";
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB");
}

function formatDateTime(date) {
  return new Date(date).toLocaleString("en-GB", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function escapeAttribute(text) {
  return String(text ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function countryFlag(code) {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map(character => 127397 + character.charCodeAt()));
}

window.toggleTodo = toggleTodo;
window.toggleGrocery = toggleGrocery;
window.deleteRow = deleteRow;
window.openEventModal = openEventModal;
window.uploadMemoryPhoto = uploadMemoryPhoto;
window.openLightbox = openLightbox;
window.selectCountry = selectCountry;
window.uploadFamilyPhoto = uploadFamilyPhoto;
window.openFamilyMember = openFamilyMember;
