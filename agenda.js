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

  // LOGIKA HYBRID: Filter agenda yang benar-benar masih aktif buat di Featured
  const hariIni = new Date().toISOString().split('T')[0];
  const agendaAktif = agendaData.filter(a => a.status !== 'selesai' && a.tanggal >= hariIni);

  renderFeatured(agendaAktif[0]); // Kirim agenda aktif terdekat ke Featured
  renderAgenda();
}


function renderFeatured(agendaTerdekat){
  const featTitle = document.getElementById("featTitle");
  const featDate = document.getElementById("featDate");
  const featTime = document.getElementById("featTime");

  if(!agendaTerdekat) {
    featTitle.innerText = "Tidak ada agenda terdekat";
    featDate.innerHTML = `<i class="fa-regular fa-calendar"></i> -`;
    featTime.innerHTML = `<i class="fa-regular fa-clock"></i> -`;
    return;
  }

  const tgl = new Date(agendaTerdekat.tanggal);
  featTitle.innerText = agendaTerdekat.judul;
  featDate.innerHTML = `<i class="fa-regular fa-calendar"></i> ${tgl.toLocaleDateString("id-ID")}`;
  featTime.innerHTML = `<i class="fa-regular fa-clock"></i> ${agendaTerdekat.jam}`;
}


function renderAgenda(){
  const container = document.getElementById("agendaList");
  const empty = document.getElementById("emptyState");
  const hariIni = new Date().toISOString().split('T')[0];

  container.innerHTML = "";

  if(!agendaData.length){
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  agendaData.forEach(a => {
    const tgl = new Date(a.tanggal);
    // LOGIKA HYBRID
    const isSelesai = a.status === 'selesai' || a.tanggal < hariIni;

    const div = document.createElement("div");
    // Tambahkan class 'finished' kalau sudah selesai
    div.className = `agenda-item ${isSelesai ? 'finished' : ''}`;
    div.setAttribute("data-month", a.bulan);

    div.innerHTML = `
      <div class="date-box">
        <span class="day">${tgl.getDate()}</span>
        <span class="month-label">${a.bulan}</span>
      </div>

      <div class="agenda-info">
        <div class="title-row">
           <h4>${a.judul}</h4>
           ${isSelesai ? '<span class="status-badge">Selesai</span>' : ''}
        </div>
        <p>${a.deskripsi}</p>
        <div class="badge-row">
          <span class="info-tag loc"><i class="fa-solid fa-location-dot"></i> ${a.lokasi}</span>
          <span class="info-tag time"><i class="fa-regular fa-clock"></i> ${a.jam}</span>
        </div>
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