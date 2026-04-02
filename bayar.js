const SUPABASE_URL = "https://ubpbtsmerfohlfkbuphd.supabase.co";
const SUPABASE_KEY = "sb_publishable_NLploEl-HgMy4VTr5jCa5Q_3JLiGEZT";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let IURAN = 0, members = [], transaksi = [];
let activeMember = null, tunggakan = 0, selectedMethod = null;
let totalBayarUser = 0;
const MAX_TAHUNAN = 50000;

let selectedKategori = "iuran";       
let savedNominalUrunan = 0;           
let lastIuranValue = 0;               

const nominalInput = document.getElementById('nominalInput');
const waInput = document.getElementById('waInput');
const memberList = document.getElementById('memberList');
const bulanList = document.getElementById('bulanList');
const progress = document.getElementById('progress');
const progressText = document.getElementById('progressText');
const paymentContainer = document.getElementById('paymentContainer');
const sumIuran = document.getElementById('sumIuran');
// sumFee di html Akang tidak ada id-nya, jadi pastikan updateSummary aman
const totalBayar = document.getElementById('totalBayar');
const bottomTotal = document.getElementById('bottomTotal');

// === SET KATEGORI (UTUH) ===
function setKategori(kategori, el) {
  selectedKategori = kategori;
  document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  if (kategori === "urunan") {
    nominalInput.placeholder = "Masukkan nominal urunan bebas";
    if (lastIuranValue) nominalInput.value = lastIuranValue;
  } else {
    nominalInput.placeholder = "Masukkan nominal iuran";
    let currentNom = Number(nominalInput.value) || 0;
    currentNom = Math.min(currentNom, MAX_TAHUNAN);
    nominalInput.value = currentNom;
    lastIuranValue = currentNom;
  }
  renderMonths();
  updateSummary();
}

// === LOAD DATA (UTUH) ===
async function loadMembers() {
  const { data, error } = await supabaseClient.from("anggota").select("nama,iuran");
  if (error) { console.log(error); return; }
  members = data;
  renderMembers(members);
}

async function loadTransaksi() {
  const { data, error } = await supabaseClient.from("transaksi").select("*");
  if (error) { console.log(error); return; }
  transaksi = data;
}

function renderMembers(list) {
  memberList.innerHTML = "";
  list.forEach(m => {
    memberList.innerHTML += `
      <div class="member" onclick="selectMember('${m.nama}','${m.iuran}')">
        <span>${m.nama}</span><span>›</span>
      </div>`;
  });
}

function searchMember(q) {
  renderMembers(members.filter(x => x.nama.toLowerCase().includes(q.toLowerCase())));
}

function selectMember(name, iuran) {
  activeMember = name;
  IURAN = Number(iuran);
  document.querySelector(".search").value = name;
  memberList.innerHTML = "";
  renderMonths();
  updateSummary();
}

function renderMonths() {
  let totalSudahBayar = 0;
  transaksi.forEach(t => {
    if (
      t.nama === activeMember &&
      t.jenis?.toLowerCase() === "pemasukan" &&
      (t.kategori === "iuran" || t.kategori === "urunan") &&
      t.ket.toLowerCase() === "sukses"
    ) {
      totalSudahBayar += Number(t.nominal || 0);
    }
  });

  tunggakan = MAX_TAHUNAN - totalSudahBayar;
  if (tunggakan < 0) tunggakan = 0;

  bulanList.innerHTML = `
    <div class="month"><span>Total Sudah Bayar</span><span class="status-green">Rp${totalSudahBayar.toLocaleString()}</span></div>
    <div class="month"><span>Sisa Tunggakan</span><span class="status-red">Rp${tunggakan.toLocaleString()}</span></div>
  `;

  progress.style.width = (totalSudahBayar / MAX_TAHUNAN * 100) + "%";
  progressText.innerText = Math.round(totalSudahBayar / MAX_TAHUNAN * 100) + "% dari target tahunan";

  const payBtn = document.querySelector(".pay-btn");
  if (selectedKategori === "urunan") {
    nominalInput.disabled = false;
    payBtn.disabled = false;
    payBtn.style.opacity = "1";
    payBtn.innerText = "Bayar Sekarang";
  } else {
    if (tunggakan === 0) {
      nominalInput.value = "";
      nominalInput.disabled = true;
      payBtn.disabled = true;
      payBtn.style.opacity = "0.5";
      payBtn.innerText = "Sudah Lunas";
    } else {
      nominalInput.disabled = false;
      payBtn.disabled = false;
      payBtn.style.opacity = "1";
      payBtn.innerText = "Bayar Sekarang";
    }
  }
  updateSummary();
}

function updateSummary() {
  let nominal = Number(nominalInput.value || 0);
  if (selectedKategori === "iuran" && nominal > tunggakan) {
    nominal = tunggakan;
    nominalInput.value = nominal;
  }
  
  let totalKirim = nominal + 500; // Iuran + Layanan sesuai kode Akang

  sumIuran.innerText = 'Rp' + nominal.toLocaleString();
  totalBayar.innerText = 'Rp' + totalKirim.toLocaleString();
  bottomTotal.innerText = 'Rp' + totalKirim.toLocaleString();
  
  totalBayarUser = totalKirim; 
}

// === 🔥 IPAYMU EXECUTION (GANTIKAN TESTMIDTRANS) ===
async function payWithIPaymu() {
  if (!activeMember) { alert("Pilih anggota dulu"); return; }
  const rawNominal = Number(nominalInput.value);
  if (rawNominal <= 0) { alert("Masukkan nominal iuran/urunan"); return; }
  if (!waInput.value.trim()) { alert("Isi nomor WA"); return; }

  const payBtn = document.querySelector(".pay-btn");
  payBtn.innerText = "Processing...";
  payBtn.disabled = true;

  // URL Function Supabase Akang
  const ENDPOINT = "https://ubpbtsmerfohlfkbuphd.supabase.co/functions/v1/rapid-task";

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: activeMember,
        amount: Math.round(totalBayarUser),
        phone: waInput.value.trim(),
        comments: "Iuran " + selectedKategori + " - " + activeMember
      })
    });

    const data = await res.json();
    
    // Redirect ke URL iPaymu agar verifikator tidak melihat XML
    const paymentUrl = data.url || (data.data ? data.data.url : null);

    if (paymentUrl) {
      window.location.href = paymentUrl;
    } else {
      console.error("IPAYMU ERROR:", data);
      alert("Gagal mendapatkan link pembayaran. Cek log Supabase.");
      payBtn.disabled = false;
      payBtn.innerText = "Bayar Sekarang";
    }

  } catch (err) {
    console.error("FETCH ERROR:", err);
    alert("Koneksi gagal: " + err.message);
    payBtn.disabled = false;
    payBtn.innerText = "Bayar Sekarang";
  }
}

// === MODAL & RENDER (UTUH) ===
function renderPayments() {
  // Akang bisa kosongkan atau biarkan, tapi iPaymu redirect biasanya handle metode di sana
  paymentContainer.innerHTML = `<div style="font-size:13px; color:#64748b; padding:10px;">Metode pembayaran otomatis tersedia di halaman iPaymu setelah klik bayar.</div>`;
}

async function init() {
  await loadMembers();
  await loadTransaksi();
  renderPayments();
}
init();

document.addEventListener("input", (e) => {
  if (e.target.id === "nominalInput") updateSummary();
});
