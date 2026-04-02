console.log("AGENDA 🔥");
const supabaseClient = supabase.createClient(
  "https://ubpbtsmerfohlfkbuphd.supabase.co",
  "sb_publishable_NLploEl-HgMy4VTr5jCa5Q_3JLiGEZT"
);

let agendaData = [];

async function loadAgenda(){
  const { data, error } = await supabaseClient
    .from("agenda")
    .select("*")
    .order("tanggal", { ascending: true });

  if(error){
    console.log("ERROR:", error);
    return;
  }

  agendaData = data || [];

  renderFeatured();
  renderAgenda();
}

function renderFeatured(){
  if(!agendaData.length) return;

  const a = agendaData[0];
  const tgl = new Date(a.tanggal);

  document.getElementById("featTitle").innerText = a.judul;
  document.getElementById("featDate").innerHTML =
    `<i class="fa-regular fa-calendar"></i> ${tgl.toLocaleDateString("id-ID")}`;
  document.getElementById("featTime").innerHTML =
    `<i class="fa-regular fa-clock"></i> ${a.jam}`;
}

function renderAgenda(){
  const container = document.getElementById("agendaList");
  const empty = document.getElementById("emptyState");

  container.innerHTML = "";

  if(!agendaData.length){
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  agendaData.forEach(a => {
    const tgl = new Date(a.tanggal);

    const div = document.createElement("div");
    div.className = "agenda-item";
    div.setAttribute("data-month", a.bulan);

    div.innerHTML = `
      <div class="date-box">
        <span class="day">${tgl.getDate()}</span>
        <span class="month-label">${a.bulan}</span>
      </div>

      <div class="agenda-info">
        <h4>${a.judul}</h4>
        <p>${a.deskripsi}</p>
        <div class="badge-row">
          <span class="info-tag loc">
  <i class="fa-solid fa-location-dot"></i> ${a.lokasi}
</span>

<span class="info-tag time">
  <i class="fa-regular fa-clock"></i> ${a.jam}
</span>       </div>
      </div>
    `;

    container.appendChild(div);
  });
}

// FILTER
document.addEventListener("click", e => {
  if (e.target.classList.contains("month-chip")) {
    document.querySelectorAll(".month-chip").forEach(c => c.classList.remove("active"));
    e.target.classList.add("active");

    const m = e.target.dataset.month;
    const items = document.querySelectorAll(".agenda-item");
    const empty = document.getElementById("emptyState");
    let hasVisible = false;

    items.forEach(i => {
      const isVisible = (m === "all" || i.dataset.month === m);
      i.style.display = isVisible ? "flex" : "none";
      if (isVisible) hasVisible = true;
    });

    if (empty) {
      empty.style.display = hasVisible ? "none" : "block";
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  loadAgenda();
  const navLinks = document.querySelectorAll('.bottom-nav a');
  const path = window.location.pathname.split("/").pop() || "index.html";

  navLinks.forEach(link => {
    const href = link.getAttribute('href').split("/").pop();
    if (href === path) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
});