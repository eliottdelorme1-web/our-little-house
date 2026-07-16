const SUPABASE_URL = "https://ojqeyoxboecdiumetdab.supabase.co";
const SUPABASE_KEY = "sb_publishable_AOHdVdST0ACWtuttlRyB-w_sJllLWwf";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = "our-photos";

let currentUser = null;
let currentProfile = null;
let allEvents = [];
let profilesById = {};

const pageInfo = {
  home:["Living Room","Welcome back to your little shared world."],
  dreams:["Dream Room","Your wishes, dreams and ideas for the future."],
  memories:["Memory Room","The moments you never want to forget."],
  calendar:["Calendar","Plan your dates, trips and little moments."],
  entertainment:["Entertainment Room","Movies, shows, anime and games."],
  food:["Food Room","Restaurants, food spots and things to try."],
  adventure:["Adventure Room","Cities, countries and future trips."],
  worldmap:["Our World Map","Color your story country by country."],
  creative:["Creative Room","Poems, quotes and stories made together."],
  future:["Future Room","Plans and ideas for your future."],
  chat:["Private Chat","A little conversation space just for you two."]
};

document.addEventListener("DOMContentLoaded", () => {
  bindButtons();
  bindNavigation();
  startApp();
});

function bindButtons(){
  document.getElementById("loginButton").addEventListener("click", login);
  document.getElementById("logoutButton").addEventListener("click", logout);
  document.getElementById("mobileMenuButton").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));

  document.getElementById("addDreamButton").addEventListener("click", addDream);
  document.getElementById("addEntertainmentButton").addEventListener("click", addEntertainment);
  document.getElementById("addRestaurantButton").addEventListener("click", addRestaurant);
  document.getElementById("addPlaceButton").addEventListener("click", addPlace);
  document.getElementById("saveCountryButton").addEventListener("click", saveCountry);
  document.getElementById("addMemoryButton").addEventListener("click", addMemory);
  document.getElementById("addCreativeButton").addEventListener("click", addCreative);
  document.getElementById("addFutureButton").addEventListener("click", addFuture);
  document.getElementById("addEventButton").addEventListener("click", addEvent);
  document.getElementById("sendMessageButton").addEventListener("click", sendMessage);

  document.getElementById("calMonth").addEventListener("change", renderCalendar);
  document.getElementById("calYear").addEventListener("change", renderCalendar);
}

function bindNavigation(){
  document.querySelectorAll(".nav-button").forEach(btn => {
    btn.addEventListener("click", async () => {
      const page = btn.dataset.page;
      document.querySelectorAll(".nav-button").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(page).classList.add("active");
      document.getElementById("pageTitle").textContent = pageInfo[page][0];
      document.getElementById("pageSubtitle").textContent = pageInfo[page][1];
      document.getElementById("sidebar").classList.remove("open");
      await loadPage(page);
    });
  });
}

function esc(v){return String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function rating(v){return v ? "💖".repeat(Number(v))+"🤍".repeat(5-Number(v)) : "No rating"}
function val(id){return document.getElementById(id).value.trim()}
function nullableNumber(id){const v=val(id);return v ? Number(v) : null}
function clear(...ids){ids.forEach(id => document.getElementById(id).value = "")}
function requireText(id,label){const v=val(id);if(!v) throw new Error(`${label} is required.`);return v}

async function login(){
  const box=document.getElementById("loginMessage");
  box.innerHTML="";
  const {error}=await db.auth.signInWithPassword({email:val("loginEmail"),password:val("loginPassword")});
  if(error){box.innerHTML=`<div class="error">${esc(error.message)}</div>`;return}
  await startApp();
}

async function logout(){
  await db.auth.signOut();
  location.reload();
}

async function startApp(){
  const {data:{session}}=await db.auth.getSession();
  if(!session) return;
  currentUser=session.user;

  const {data:profile}=await db.from("profiles").select("*").eq("id",currentUser.id).maybeSingle();
  currentProfile=profile;
  document.getElementById("userChip").textContent="💕 "+(profile?.display_name || currentUser.email);
  document.getElementById("loginView").classList.add("hidden");
  document.getElementById("appView").classList.remove("hidden");

  await loadProfiles();
  initCalendarSelectors();
  await loadDashboard();
  subscribeRealtime();
}

async function loadProfiles(){
  const {data}=await db.from("profiles").select("id,display_name");
  profilesById={};
  (data||[]).forEach(p=>profilesById[p.id]=p.display_name);
}

async function loadDashboard(){
  const [d,m,p,r]=await Promise.all([
    db.from("dreams").select("*",{count:"exact",head:true}),
    db.from("memories").select("*",{count:"exact",head:true}),
    db.from("places").select("*",{count:"exact",head:true}),
    db.from("restaurants").select("*",{count:"exact",head:true})
  ]);
  document.getElementById("dreamCount").textContent=d.count||0;
  document.getElementById("memoryCount").textContent=m.count||0;
  document.getElementById("placeCount").textContent=p.count||0;
  document.getElementById("restaurantCount").textContent=r.count||0;
}

async function loadPage(page){
  if(page==="home") return loadDashboard();
  if(page==="dreams") return loadDreams();
  if(page==="entertainment") return loadEntertainment();
  if(page==="food") return loadRestaurants();
  if(page==="adventure") return loadPlaces();
  if(page==="worldmap") return loadCountries();
  if(page==="memories") return loadMemories();
  if(page==="creative") return loadCreative();
  if(page==="future") return loadFuture();
  if(page==="calendar") return loadEvents();
  if(page==="chat") return loadChat();
}

async function addDream(){
  try{
    const {error}=await db.from("dreams").insert({
      title:requireText("dreamTitle","Dream title"),
      description:val("dreamDescription"),
      category:val("dreamCategory"),
      status:val("dreamStatus"),
      created_by:currentUser.id
    });
    if(error) throw error;
    clear("dreamTitle","dreamDescription");
    await loadDreams(); await loadDashboard();
  }catch(e){alert(e.message)}
}

async function loadDreams(){
  const {data,error}=await db.from("dreams").select("*").order("created_at",{ascending:false});
  if(error) return alert(error.message);
  document.getElementById("dreamList").innerHTML=(data||[]).map(x=>`
    <div class="item">
      <div class="spread">
        <div><div class="title">${esc(x.title)}</div><div class="small">${esc(x.category)} · ${esc(x.status)}</div></div>
        <button class="button danger small-btn" onclick="removeRow('dreams','${x.id}','dreams')">Delete</button>
      </div>
      <p>${esc(x.description||"")}</p>
    </div>`).join("")||`<div class="card">No dreams yet.</div>`;
}

async function addEntertainment(){
  try{
    const {error}=await db.from("entertainment_items").insert({
      item_type:val("entType"),
      title:requireText("entTitle","Title"),
      status:val("entStatus"),
      description:val("entDescription"),
      rating_eliott:nullableNumber("entEliott"),
      rating_yasmin:nullableNumber("entYasmin"),
      created_by:currentUser.id
    });
    if(error) throw error;
    clear("entTitle","entDescription","entEliott","entYasmin");
    await loadEntertainment();
  }catch(e){alert(e.message)}
}

async function loadEntertainment(){
  const {data,error}=await db.from("entertainment_items").select("*").order("created_at",{ascending:false});
  if(error) return alert(error.message);
  document.getElementById("entertainmentList").innerHTML=(data||[]).map(x=>`
    <div class="item">
      <div class="spread">
        <div><div class="title">${esc(x.title)}</div><div class="small">${esc(x.item_type)} · ${esc(x.status)}</div></div>
        <button class="button danger small-btn" onclick="removeRow('entertainment_items','${x.id}','entertainment')">Delete</button>
      </div>
      <p>${esc(x.description||"")}</p>
      <div class="small">Eliott: ${rating(x.rating_eliott)}<br>Yasmin: ${rating(x.rating_yasmin)}</div>
    </div>`).join("")||`<div class="card">Nothing added yet.</div>`;
}

async function addRestaurant(){
  try{
    const r=val("restReturn");
    const {error}=await db.from("restaurants").insert({
      name:requireText("restName","Restaurant name"),
      city:val("restCity"),maps_url:val("restMaps"),cuisine:val("restCuisine"),
      visit_date:val("restDate")||null,description:val("restDescription"),ordered_food:val("restFood"),
      rating_eliott:nullableNumber("restEliott"),rating_yasmin:nullableNumber("restYasmin"),
      would_return:r===""?null:r==="true",status:val("restStatus"),created_by:currentUser.id
    });
    if(error) throw error;
    clear("restName","restCity","restMaps","restCuisine","restDate","restDescription","restFood","restEliott","restYasmin");
    await loadRestaurants(); await loadDashboard();
  }catch(e){alert(e.message)}
}

async function loadRestaurants(){
  const {data,error}=await db.from("restaurants").select("*").order("created_at",{ascending:false});
  if(error) return alert(error.message);
  document.getElementById("restaurantList").innerHTML=(data||[]).map(x=>`
    <div class="item">
      <div class="spread">
        <div><div class="title">🍽️ ${esc(x.name)}</div><div class="small">${esc(x.city||"")} · ${esc(x.cuisine||"")} · ${esc(x.status)}</div></div>
        <button class="button danger small-btn" onclick="removeRow('restaurants','${x.id}','food')">Delete</button>
      </div>
      <p>${esc(x.description||"")}</p>
      <div class="small">Eliott: ${rating(x.rating_eliott)}<br>Yasmin: ${rating(x.rating_yasmin)}</div>
      ${x.maps_url?`<p><a href="${esc(x.maps_url)}" target="_blank" rel="noopener" style="color:var(--pink)">Open map</a></p>`:""}
    </div>`).join("")||`<div class="card">No restaurants yet.</div>`;
}

async function addPlace(){
  try{
    const {error}=await db.from("places").insert({
      city:requireText("placeCity","City"),
      country_name:requireText("placeCountry","Country"),
      country_code:requireText("placeCode","Country code").toUpperCase(),
      visit_date:val("placeDate")||null,status:val("placeStatus"),rating:nullableNumber("placeRating"),
      favorite_memory:val("placeMemory"),notes:val("placeNotes"),created_by:currentUser.id
    });
    if(error) throw error;
    clear("placeCity","placeCountry","placeCode","placeDate","placeRating","placeMemory","placeNotes");
    await loadPlaces(); await loadDashboard();
  }catch(e){alert(e.message)}
}

async function loadPlaces(){
  const {data,error}=await db.from("places").select("*").order("created_at",{ascending:false});
  if(error) return alert(error.message);
  document.getElementById("placeList").innerHTML=(data||[]).map(x=>`
    <div class="item">
      <div class="spread">
        <div><div class="title">🌍 ${esc(x.city)}</div><div class="small">${esc(x.country_name)} · ${esc(x.status)}</div></div>
        <button class="button danger small-btn" onclick="removeRow('places','${x.id}','adventure')">Delete</button>
      </div>
      <p>${esc(x.notes||x.favorite_memory||"")}</p><div class="small">${rating(x.rating)}</div>
    </div>`).join("")||`<div class="card">No places yet.</div>`;
}

async function saveCountry(){
  try{
    const {error}=await db.from("countries").upsert({
      country_code:requireText("countryCode","Country code").toUpperCase(),
      country_name:requireText("countryName","Country name"),
      status:val("countryStatus"),notes:val("countryNotes"),updated_by:currentUser.id
    },{onConflict:"country_code"});
    if(error) throw error;
    clear("countryCode","countryName","countryNotes");
    await loadCountries();
  }catch(e){alert(e.message)}
}

async function loadCountries(){
  const {data,error}=await db.from("countries").select("*").order("country_name");
  if(error) return alert(error.message);
  document.getElementById("countryGrid").innerHTML=(data||[]).map(x=>{
    const c=x.status==="Visited"?"visited":x.status==="Want to visit"?"want":x.status==="Dream destination"?"dream":"";
    return `<div class="country ${c}"><div class="title">${esc(x.country_name)}</div><div class="small">${esc(x.country_code)} · ${esc(x.status)}</div><p>${esc(x.notes||"")}</p></div>`;
  }).join("")||`<div class="card">No countries added yet.</div>`;
}

async function addMemory(){
  try{
    const {error}=await db.from("memories").insert({
      title:requireText("memoryTitle","Memory title"),
      memory_date:val("memoryDate")||null,location:val("memoryLocation"),
      description:val("memoryDescription"),favorite_moment:val("memoryFavorite"),
      created_by:currentUser.id
    });
    if(error) throw error;
    clear("memoryTitle","memoryDate","memoryLocation","memoryDescription","memoryFavorite");
    await loadMemories(); await loadDashboard();
  }catch(e){alert(e.message)}
}

async function loadMemories(){
  const {data,error}=await db.from("memories").select("*,memory_photos(*)").order("memory_date",{ascending:false});
  if(error) return alert(error.message);
  const cards=await Promise.all((data||[]).map(async x=>{
    const photos=await Promise.all((x.memory_photos||[]).map(async p=>{
      const {data:signed}=await db.storage.from(BUCKET).createSignedUrl(p.storage_path,3600);
      return signed?.signedUrl?`<img src="${signed.signedUrl}" alt="memory photo">`:"";
    }));
    return `<div class="item">
      <div class="spread">
        <div><div class="title">📸 ${esc(x.title)}</div><div class="small">${esc(x.memory_date||"")} · ${esc(x.location||"")}</div></div>
        <button class="button danger small-btn" onclick="removeRow('memories','${x.id}','memories')">Delete</button>
      </div>
      <p>${esc(x.description||"")}</p>
      <p><strong>Favorite moment:</strong> ${esc(x.favorite_moment||"")}</p>
      <input type="file" accept="image/*" onchange="uploadMemoryPhoto('${x.id}',this)">
      <div class="photo-grid">${photos.join("")}</div>
    </div>`;
  }));
  document.getElementById("memoryList").innerHTML=cards.join("")||`<div class="card">No memories yet.</div>`;
}

async function uploadMemoryPhoto(memoryId,input){
  const file=input.files[0]; if(!file) return;
  const path=`${memoryId}/${Date.now()}-${file.name.replace(/\s+/g,"-")}`;
  const {error:up}=await db.storage.from(BUCKET).upload(path,file);
  if(up) return alert(up.message);
  const {error}=await db.from("memory_photos").insert({memory_id:memoryId,storage_path:path,uploaded_by:currentUser.id});
  if(error) return alert(error.message);
  await loadMemories();
}

async function addCreative(){
  try{
    const {error}=await db.from("creative_entries").insert({
      entry_type:val("creativeType"),
      title:requireText("creativeTitle","Title"),
      content:requireText("creativeContent","Content"),
      created_by:currentUser.id
    });
    if(error) throw error;
    clear("creativeTitle","creativeContent");
    await loadCreative();
  }catch(e){alert(e.message)}
}

async function loadCreative(){
  const {data,error}=await db.from("creative_entries").select("*").order("created_at",{ascending:false});
  if(error) return alert(error.message);
  document.getElementById("creativeList").innerHTML=(data||[]).map(x=>`
    <div class="item">
      <div class="spread">
        <div><div class="title">${esc(x.title)}</div><div class="small">${esc(x.entry_type)}</div></div>
        <button class="button danger small-btn" onclick="removeRow('creative_entries','${x.id}','creative')">Delete</button>
      </div>
      <p>${esc(x.content)}</p>
    </div>`).join("")||`<div class="card">Nothing created yet.</div>`;
}

async function addFuture(){
  try{
    const {error}=await db.from("future_notes").insert({
      note_type:val("futureType"),
      title:requireText("futureTitle","Title"),
      content:val("futureContent"),
      created_by:currentUser.id
    });
    if(error) throw error;
    clear("futureTitle","futureContent");
    await loadFuture();
  }catch(e){alert(e.message)}
}

async function loadFuture(){
  const {data,error}=await db.from("future_notes").select("*").order("created_at",{ascending:false});
  if(error) return alert(error.message);
  document.getElementById("futureList").innerHTML=(data||[]).map(x=>`
    <div class="item">
      <div class="spread">
        <div><div class="title">${esc(x.title)}</div><div class="small">${esc(x.note_type)}</div></div>
        <button class="button danger small-btn" onclick="removeRow('future_notes','${x.id}','future')">Delete</button>
      </div>
      <p>${esc(x.content||"")}</p>
    </div>`).join("")||`<div class="card">No future notes yet.</div>`;
}

function initCalendarSelectors(){
  const month=document.getElementById("calMonth"),year=document.getElementById("calYear");
  if(month.options.length) return;
  ["January","February","March","April","May","June","July","August","September","October","November","December"]
    .forEach((m,i)=>month.add(new Option(m,i)));
  const y=new Date().getFullYear();
  for(let i=y-5;i<=y+80;i++) year.add(new Option(i,i));
  month.value=new Date().getMonth();
  year.value=y;
}

async function addEvent(){
  try{
    const {error}=await db.from("calendar_events").insert({
      title:requireText("eventTitle","Event title"),
      description:val("eventDescription"),
      event_date:requireText("eventDate","Event date"),
      event_time:val("eventTime")||null,
      location:val("eventLocation"),
      created_by:currentUser.id
    });
    if(error) throw error;
    clear("eventTitle","eventDescription","eventDate","eventTime","eventLocation");
    await loadEvents();
  }catch(e){alert(e.message)}
}

async function loadEvents(){
  const {data,error}=await db.from("calendar_events").select("*").order("event_date");
  if(error) return alert(error.message);
  allEvents=data||[];
  renderCalendar();
  renderEventList();
}

function renderCalendar(){
  const month=Number(document.getElementById("calMonth").value);
  const year=Number(document.getElementById("calYear").value);
  const grid=document.getElementById("calendarGrid");
  grid.innerHTML="";
  ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].forEach(d=>grid.innerHTML+=`<div class="day-name">${d}</div>`);
  let start=new Date(year,month,1).getDay();
  start=start===0?6:start-1;
  for(let i=0;i<start;i++) grid.innerHTML+="<div></div>";
  const days=new Date(year,month+1,0).getDate();
  for(let d=1;d<=days;d++){
    const date=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const ev=allEvents.filter(e=>e.event_date===date);
    grid.innerHTML+=`<div class="day"><strong>${d}</strong>${ev.slice(0,2).map(e=>`<div class="event-dot">✨ ${esc(e.title)}</div>`).join("")}</div>`;
  }
}

function renderEventList(){
  const now=new Date().toISOString().slice(0,10);
  document.getElementById("eventList").innerHTML=allEvents
    .filter(e=>e.event_date>=now).slice(0,10).map(e=>`
    <div class="item">
      <div class="spread">
        <div><div class="title">${esc(e.title)}</div><div class="small">${esc(e.event_date)} ${esc(e.event_time||"")} · ${esc(e.location||"")}</div></div>
        <button class="button danger small-btn" onclick="removeRow('calendar_events','${e.id}','calendar')">Delete</button>
      </div>
      <p>${esc(e.description||"")}</p>
    </div>`).join("")||`<div class="card">No upcoming events.</div>`;
}

async function sendMessage(){
  const message=val("chatInput");
  if(!message) return;
  const {error}=await db.from("chat_messages").insert({message,created_by:currentUser.id});
  if(error) return alert(error.message);
  clear("chatInput");
  await loadChat();
}

async function loadChat(){
  await loadProfiles();
  const {data,error}=await db.from("chat_messages").select("*").order("created_at");
  if(error) return alert(error.message);
  document.getElementById("chatBox").innerHTML=(data||[]).map(x=>`
    <div class="message">
      <div class="small">${esc(profilesById[x.created_by]||"Unknown")} · ${new Date(x.created_at).toLocaleString()}</div>
      <div>${esc(x.message)}</div>
      <div class="row" style="margin-top:7px">
        ${["💖","😂","🥹","✨"].map(e=>`<button class="button secondary small-btn" onclick="react('${x.id}','${e}')">${e}</button>`).join("")}
        <button class="button danger small-btn" onclick="removeRow('chat_messages','${x.id}','chat')">Delete</button>
      </div>
    </div>`).join("")||`<div class="muted">No messages yet.</div>`;
  document.getElementById("chatBox").scrollTop=document.getElementById("chatBox").scrollHeight;
}

async function react(messageId,emoji){
  const {error}=await db.from("chat_reactions").upsert(
    {message_id:messageId,emoji,created_by:currentUser.id},
    {onConflict:"message_id,emoji,created_by"}
  );
  if(error) alert(error.message);
}

async function removeRow(table,id,page){
  if(!confirm("Delete this item?")) return;
  const {error}=await db.from(table).delete().eq("id",id);
  if(error) return alert(error.message);
  await loadPage(page);
  await loadDashboard();
}

function subscribeRealtime(){
  db.channel("our-house-live")
    .on("postgres_changes",{event:"*",schema:"public",table:"chat_messages"},()=>loadChat())
    .on("postgres_changes",{event:"*",schema:"public",table:"calendar_events"},()=>loadEvents())
    .subscribe();
}

db.auth.onAuthStateChange((_event,session)=>{
  if(session && document.getElementById("appView").classList.contains("hidden")) startApp();
});
