var supabaseClient = window.supabase.createClient(
  "https://ubpbtsmerfohlfkbuphd.supabase.co",
  "sb_publishable_NLploEl-HgMy4VTr5jCa5Q_3JLiGEZT"
);

var TARGET = 50000;

function formatRp(n){
  return "Rp" + Number(n).toLocaleString("id-ID");
}

async function loadAnggota(){

  var { data: anggota } = await supabaseClient
    .from("anggota")
    .select("*");

  var { data: transaksi } = await supabaseClient
    .from("transaksi")
    .select("*")
    .eq("jenis","pemasukan");

  renderAnggota(anggota || [], transaksi || []);
}

function renderAnggota(anggota, transaksi){

  var container = document.getElementById("anggotaList");
  if(!container) return;

  container.innerHTML = "";

  anggota.forEach(a => {

    var total = transaksi
.filter(t => {
  var ket = (t.ket || "").toLowerCase();

  var isValid =
    ket.includes("sukses") || // transaksi baru
    (!ket.includes("pending") && !ket.includes("sukses")); // data lama

  return (
    t.nama?.trim().toLowerCase() === a.nama?.trim().toLowerCase() &&
    t.jenis === "pemasukan" &&
    isValid
  );
})
      .reduce((sum, t) => sum + Number(t.nominal || 0), 0);

    var persen = Math.min((total / TARGET) * 100, 100);

    let warna = "#ef4444";
    if(persen >= 100) warna = "#22c55e";
    else if(persen >= 50) warna = "#f59e0b";

    var div = document.createElement("div");
    div.className = "anggota-card";

    div.innerHTML = `
      <div class="anggota-nama">${a.nama}</div>

      <div class="progress">
        <div class="progress-bar" style="width:${persen}%;background:${warna}"></div>
      </div>

      <div class="anggota-nominal">
        ${formatRp(total)} / ${formatRp(TARGET)}
      </div>
    `;

    container.appendChild(div);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadAnggota();
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
