console.log("APP.JS NYALA 🔥 - FULL STABLE VERSION");
let supabaseClient;
let adminMode = false;

(function initSupabase(){
  const lib = window.supabasejs || window.supabase;
  if (lib && typeof lib.createClient === "function") {
    supabaseClient = lib.createClient(
      "https://ubpbtsmerfohlfkbuphd.supabase.co",
      "sb_publishable_NLploEl-HgMy4VTr5jCa5Q_3JLiGEZT"
    );
    console.log("Supabase siap 🔥");
  }
})();

let transaksi = [];
let anggotaList = [];
let filteredTransaksi = null;
let tunggakanData = [];
let showAllTunggakan = false;

function updateClock(){
  let now = new Date();
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  let jam = String(now.getHours()).padStart(2,'0') + ":" + String(now.getMinutes()).padStart(2,'0') + ":" + String(now.getSeconds()).padStart(2,'0');
  let tanggal = hari[now.getDay()] + ", " + now.getDate() + " " + bulan[now.getMonth()] + " " + String(now.getFullYear()).slice(-2);
  const elTime = document.getElementById("clockTime");
  const elDate = document.getElementById("clockDate");
  if (elTime && elDate) {
    elTime.innerText = jam;
    elDate.innerText = tanggal;
  }
}

async function loadTransaksi(){
  const { data: dAnggota } = await supabaseClient.from("anggota").select("*");
  anggotaList = dAnggota || []; 
  const { data, error } = await supabaseClient.from("transaksi").select("*").order("tanggal", { ascending:false });
  if(error) return;
  transaksi = (data || []).map(t => ({
    tanggal: t.tanggal,
    jenis: t.jenis,
    nama: t.nama,
    bulan: t.bulan,
    nominal: Number(t.nominal || 0),
    ket: t.ket || "",
    kategori: t.kategori,
    catatan: t.catatan
  }));
  render();
  renderDashboard(); 
  updateDashboard(); 
  hitungTunggakan(); 
}

function renderDashboard(){
  let totalIncome = 0;
  let totalExpense = 0;
  transaksi.forEach(t => {
    const ket = t.ket.toLowerCase();
    const isSukses = ket.includes("sukses") || (!ket.includes("pending") && !ket.includes("sukses"));
    if (isSukses) {
      if (t.jenis === "pemasukan") totalIncome += t.nominal;
      if (t.jenis === "pengeluaran") totalExpense += t.nominal;
    }
  });
  let saldo = totalIncome - totalExpense;
  const incomeEl = document.getElementById("totalIncome");
  if(incomeEl) animateValue(incomeEl, 0, totalIncome);
  const expenseEl = document.getElementById("totalExpense");
  if(expenseEl) animateValue(expenseEl, 0, totalExpense);
  const balanceEl = document.getElementById("totalBalance");
  if(balanceEl) animateValue(balanceEl, 0, saldo);
  const anggotaEl = document.getElementById("totalAnggota");
  if(anggotaEl) anggotaEl.innerText = anggotaList.length;
}

function updateDashboard(){
  let sudah = anggotaList.filter(a => {
    let totalBayar = transaksi.filter(t => {
      const ket = t.ket.toLowerCase();
      return t.nama === a.nama && t.jenis === "pemasukan" && (ket.includes("sukses") || (!ket.includes("pending") && !ket.includes("sukses"))) && !(t.ket && t.ket.startsWith("Urunan")) && t.ket !== "Pemasukan lainnya"
    }).reduce((sum, t) => sum + t.nominal, 0);
    return totalBayar >= (a.iuran || 50000);
  }).length;
  let belum = anggotaList.length - sudah;
  if(document.getElementById("sudahBayar")) document.getElementById("sudahBayar").innerText = sudah;
  if(document.getElementById("belumBayar")) document.getElementById("belumBayar").innerText = belum;
}

function hitungTunggakan(){
  tunggakanData = anggotaList.map(a => {
    let totalBayar = transaksi.filter(t => {
      const ket = t.ket.toLowerCase();
      return t.nama && a.nama && t.nama.trim().toLowerCase() === a.nama.trim().toLowerCase() && t.jenis === "pemasukan" && (ket.includes("sukses") || (!ket.includes("pending") && !ket.includes("sukses")))
    }).reduce((sum, t) => sum + t.nominal, 0);
    return { nama: a.nama, status: totalBayar >= 50000 ? "LUNAS" : "CICIL", total: totalBayar };
  });
  tunggakanData.sort((a, b) => (a.status !== b.status) ? (a.status === "CICIL" ? -1 : 1) : a.nama.localeCompare(b.nama));
  renderTunggakan();
}

function renderTunggakan(){
  const box = document.getElementById("tunggakanList");
  const more = document.getElementById("lihatSemuaTunggakan");
  if(!box) return;
  box.innerHTML = "";
  const tampil = showAllTunggakan ? tunggakanData : tunggakanData.slice(0,3);
  tampil.forEach(t => {
    const persen = Math.min((t.total / 50000) * 100, 100);
    const barColor = t.status === "LUNAS" ? "#22c55e" : "#f59e0b";
    const div = document.createElement("div");
    div.style.marginBottom = "10px";
    div.innerHTML = `<div style="font-size:14px;font-weight:600">${t.nama}</div><div style="width:100%;height:6px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin:4px 0;"><div style="width:${persen}%;height:100%;background:${barColor};"></div></div><div style="font-size:12px">${Math.round(persen)}% — <span style="color:${barColor}">${t.status === "LUNAS" ? "LUNAS" : `CICIL (${formatRp(t.total)})`}</span></div>`;
    box.appendChild(div);
  });
}

function render(){
  const sourceData = (filteredTransaksi !== null) ? filteredTransaksi : transaksi;
  const data = sourceData.filter(t => {
    if (t.status) return t.status === "sukses";
    if (t.ket) return t.ket.toLowerCase().includes("sukses") || (!t.ket.toLowerCase().includes("pending"));
    return true;
  });
  let list = document.getElementById("list");
  if(!list) return;
  list.innerHTML = "";
  if (data.length === 0) {
    list.innerHTML = `<div style="text-align:center; padding:40px 20px;"><div style="font-size: 40px; margin-bottom: 10px;">📭</div><div style="font-size: 14px; font-weight: 600; color: #1c1c1e;">Belum ada cuan masuk, Bro!</div><div style="font-size: 12px; color: #8e8e93; margin-top: 4px;">Coba cek rentang tanggal lain, atau mungkin emang alumni lagi pada nunggu gajian. 😹</div></div>`;
    return;
  }
  data.forEach(t => {
    let div = document.createElement("div");
    div.className = "history-card";
    let now = new Date(t.tanggal);
    const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    let tanggalStr = hari[now.getDay()] + ", " + now.getDate() + " " + bulan[now.getMonth()] + " " + String(now.getFullYear()).slice(-2);
    let labelUtama = t.kategori || "Iuran";
    let catatanInfo = t.catatan ? `<div style="font-size:10px; opacity:0.7; font-style:italic;">${t.catatan}</div>` : "";
    div.innerHTML = `<div class="history-left"><div class="history-date">${tanggalStr}</div><div class="history-name">${t.nama}</div><div class="history-desc ${t.jenis === 'pemasukan' ? 'income' : 'expense'}">${labelUtama}</div>${catatanInfo}</div><div class="history-right"><div class="history-amount ${t.jenis === 'pemasukan' ? 'income' : 'expense'}">${t.jenis === 'pemasukan' ? '+ ' : '- '}${formatRp(t.nominal)}</div><div class="history-month">${t.bulan || '-'}</div></div>`;
    list.appendChild(div);
  });
}

function setFilter(type){
  let box = document.getElementById('customDateBox');
  if(box) box.style.display = 'none';
  filteredTransaksi = null;
  if(type === 'all'){ render(); return; }
  let now = new Date();
  now.setHours(0,0,0,0);
  let start = new Date(now);
  let end = new Date(now);
  if(type === 'today'){ end.setDate(end.getDate() + 1); }
  else if(type === 'yesterday'){ start.setDate(start.getDate() - 1); end.setHours(0,0,0,0); }
  else { start.setDate(start.getDate() - (type - 1)); end.setDate(end.getDate() + 1); }
  filteredTransaksi = transaksi.filter(t => {
    let d = new Date(t.tanggal);
    d.setHours(0,0,0,0);
    return d >= start && d < end;
  });
  render();
}

function toggleCustom(){
  let box = document.getElementById('customDateBox');
  let list = document.getElementById('list');
  if(box) {
    if (box.style.display === 'none' || box.style.display === '') {
      box.style.display = 'block';
      filteredTransaksi = [];
      render();
    } else {
      box.style.display = 'none';
      filteredTransaksi = null;
      render();
    }
  }
}

function formatRp(n){ return "Rp" + Number(n).toLocaleString("id-ID"); }

function initRunningText(){
  let track = document.getElementById("runningTrack");
  if(!track) return;
  const pengumuman = ["📢 Pengingat: Jangan lupa bayar iuran kas Alumni","📢 Iuran Alumni Rp.50.000/tahun bisa di cicil berapapun","📢 Urunan Alumni seikhlasnya untuk acara Maulid Nabi 2026","📢 Terima kasih atas partisipasi semua anggota","📢 Gunakan menu Bayar untuk scan QRIS dan kirim bukti"];
  let text = pengumuman.map(p => `<span class="run-item">${p}</span>`).join("");
  track.innerHTML = text + text;
}

function animateValue(el, start, end, duration = 800){
  let startTime = null;
  function animate(currentTime){
    if(!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1);
    const value = Math.floor(progress * (end - start) + start);
    el.innerText = formatRp(value);
    if(progress < 1) requestAnimationFrame(animate);
    else el.innerText = formatRp(end);
  }
  requestAnimationFrame(animate);
}

document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);
  loadTransaksi();
  initRunningText();
  if (document.getElementById('rangePicker')) {
    flatpickr("#rangePicker", {
      mode: "range",
      dateFormat: "Y-m-d",
      onClose: function(selectedDates) {
        if (selectedDates.length === 2) {
          let start = selectedDates[0];
          let end = new Date(selectedDates[1]);
          end.setHours(23,59,59,999);
          filteredTransaksi = transaksi.filter(t => {
            let d = new Date(t.tanggal);
            return d >= start && d <= end;
          });
          render();
        }
      }
    });
  }
  const navLinks = document.querySelectorAll('.bottom-nav a');
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  navLinks.forEach(link => {
    const href = link.getAttribute('href').split("/").pop();
    if (href === currentPage) link.classList.add('active');
    else link.classList.remove('active');
  });
  if(localStorage.getItem("adminLogin") === "true") adminMode = tru  });

    tunggakanData.sort((a, b) => {
    if (a.status !== b.status) return a.status === "CICIL" ? -1 : 1;
    return a.nama.localeCompare(b.nama);
  });
  renderTunggakan();
}


function renderTunggakan(){
  const box = document.getElementById("tunggakanList");
  const more = document.getElementById("lihatSemuaTunggakan");
  if(!box) return;
  box.innerHTML = "";

  if(tunggakanData.length === 0){
    box.innerHTML = "✅ Semua anggota sudah terdata";
    if(more) more.innerText = "";
    return;
  }

  // ambil data sesuai showAllTunggakan
  const tampil = showAllTunggakan ? tunggakanData : tunggakanData.slice(0,3);

  tampil.forEach(t => {
    const persen = Math.min((t.total / 50000) * 100, 100);
    const barColor = t.status === "LUNAS" ? "#22c55e" : "#f59e0b";

    const div = document.createElement("div");
    div.style.marginBottom = "10px";

    div.innerHTML = `
      <div style="font-size:14px;font-weight:600">${t.nama}</div>
      <div style="width:100%;height:6px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin:4px 0;">
        <div style="width:${persen}%;height:100%;background:${barColor};"></div>
      </div>
      <div style="font-size:12px">
        ${Math.round(persen)}% — 
        <span style="color:${barColor}">
          ${t.status === "LUNAS" ? "LUNAS" : `CICIL (${formatRp(t.total)} / Rp50.000)`}
        </span>
      </div>
    `;

    box.appendChild(div);
  });

  if(more){
    if(tunggakanData.length > 3){
      more.innerText = showAllTunggakan ? "Tutup" : "+ " + (tunggakanData.length - 3) + " anggota lainnya";
      more.onclick = () => {
        showAllTunggakan = !showAllTunggakan;
        renderTunggakan();
      };
    } else {
      more.innerText = "";
    }
  }
}

function render(){

  const data = (filteredTransaksi || transaksi)
  .filter(t => {
    // ✅ data baru (pakai status)
    if (t.status) {
      return t.status === "sukses";
    }

    // ✅ fallback data lama (pakai ket)
    if (t.ket) {
      return t.ket.toLowerCase().includes("sukses");
    }

    return false;
  });

  let list = document.getElementById("list");
  if(!list) return;

  list.innerHTML = "";

  data.forEach(t => {

    let div = document.createElement("div");
    div.className = "history-card";

    let now = new Date(t.tanggal);

    const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
    const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

    let tanggalStr =
      hari[now.getDay()] + ", " +
      now.getDate() + " " +
      bulan[now.getMonth()] + " " +
      String(now.getFullYear()).slice(-2);

    // 🔥 ambil keterangan yang bener
    let keterangan = t.ket;

    // fallback kalau data lama masih "sukses"
    if (keterangan && keterangan.toLowerCase() === "sukses") {
      keterangan = "Iuran";
    }

    div.innerHTML = `
  <div class="history-left">
    <div class="history-date">${tanggalStr}</div>
    <div class="history-name">${t.nama}</div>

    <div class="history-desc ${t.jenis === 'pemasukan' ? 'income' : 'expense'}">
      ${keterangan}
    </div>
  </div>

  <div class="history-right">
    <div class="history-amount ${t.jenis==='pemasukan'?'income':'expense'}">
      ${t.jenis==='pemasukan'?'+ ':'- '}${formatRp(t.nominal)}
    </div>
    <div class="history-month">${t.bulan || '-'}</div>
  </div>
`;

    list.appendChild(div);

  });

}

function setFilter(type){
  let range = document.getElementById('rangePicker');
  if(range) range.value = '';
  filteredTransaksi = null;
  let box = document.getElementById('customDateBox');
  if(box) box.style.display = 'none';

  let now = new Date();
  now.setHours(0,0,0,0);

  if(type === 'all'){ render(); return; }

  let start = new Date(now);
  let end = new Date(now);

  if(type === 'today'){ end.setDate(end.getDate() + 1); }
  else if(type === 'yesterday'){ start.setDate(start.getDate() - 1); }
  else { start.setDate(start.getDate() - (type - 1)); end.setDate(end.getDate() + 1); }

  filteredTransaksi = transaksi.filter(t => {
    let d = new Date(t.tanggal);
    d.setHours(0,0,0,0);
    return d >= start && d < end;
  });
  render();
}

function formatRp(n){ return "Rp" + Number(n).toLocaleString("id-ID"); }

function toggleCustom(){
  let range = document.getElementById('rangePicker');
  if(range) {
    range.value = "";
    if(range._flatpickr) range._flatpickr.clear();
  }
  let box = document.getElementById('customDateBox');
  if(box) box.style.display = 'block';
  let list = document.getElementById('list');
  if(list) list.innerHTML = "<div style='text-align:center;font-size:12px;opacity:.6'>Pilih tanggal dulu bro 😹</div>";
  filteredTransaksi = [];
}

function initRunningText(){

let track = document.getElementById("runningTrack");

let text = pengumuman.map(p => `<span class="run-item">${p}</span>`).join("");

track.innerHTML = text + text;

}

const pengumuman = [
"📢 Pengingat: Jangan lupa bayar iuran kas Alumni",
"📢 Iuran Alumni Rp.50.000/tahun bisa di cicil berapapun",
"📢 Urunan Alumni seikhlasnya untuk acara Maulid Nabi MDT Miftahul Hidayah 2026",
"📢 Terima kasih atas partisipasi semua anggota",
"📢 Pembayaran otomatis menggunakan jasa Ipaymu yang sudah terpercaya dan di awasi oleh Bank Indonesia (BI)"
];

if(localStorage.getItem("adminLogin") === "true"){
  adminMode = true;
}

document.addEventListener("DOMContentLoaded", () => {
  updateClock();
  setInterval(updateClock, 1000);
  
  loadTransaksi();
  initRunningText();
  
  const navLinks = document.querySelectorAll('.bottom-nav a');
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  navLinks.forEach(link => {
    const href = link.getAttribute('href').split("/").pop();
    if (href === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  if (localStorage.getItem("adminLogin") === "true") {
    adminMode = true;
  }
});

function animateValue(el, start, end, duration = 800){
  let startTime = null;

  function animate(currentTime){
    if(!startTime) startTime = currentTime;
    const progress = Math.min((currentTime - startTime) / duration, 1);

    const value = Math.floor(progress * (end - start) + start);
    el.innerText = formatRp(value);

    if(progress < 1){
      requestAnimationFrame(animate);
    } else {
      el.innerText = formatRp(end);
    }
  }

  requestAnimationFrame(animate);
}
