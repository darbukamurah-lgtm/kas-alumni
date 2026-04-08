// === 1. KONFIGURASI & VARIABEL GLOBAL ===
const SUPABASE_URL = "https://ubpbtsmerfohlfkbuphd.supabase.co";
const SUPABASE_KEY = "sb_publishable_NLploEl-HgMy4VTr5jCa5Q_3JLiGEZT";
let supabaseClient;

var IURAN = 0, members = [], transaksi = [];
var activeMember = null, tunggakan = 0, selectedMethod = null;
var totalBayarUser = 0;
const MAX_TAHUNAN = 50000;
var selectedKategori = "iuran";

// Variabel Penampung Elemen UI (Biar gak Error Initialization)
let nominalInput, waInput, memberList, bulanList, progress, progressText, bottomTotal, Toast;

// === 2. UI LOGIC (Accordion & Pilihan Metode) ===
function togglePay(id, el) {
    document.querySelectorAll('.options').forEach(opt => {
        if(opt.id !== id) opt.classList.remove('active');
    });
    document.querySelectorAll('.pay-card').forEach(card => {
        if(card !== el) card.classList.remove('open');
    });
    const target = document.getElementById(id);
    if (target) {
        target.classList.toggle('active');
        el.classList.toggle('open');
    }
}

function pilihMetode(metode) {
    // Stop propagation biar gak nutup accordion pas diklik itemnya
    if (window.event) window.event.stopPropagation(); 
    
    selectedMethod = metode;
    const allItems = document.querySelectorAll('.item');
    allItems.forEach(i => {
        i.style.background = "#f8fafc";
        i.style.color = "#334155";
        i.style.border = "none";
    });
    
    const target = window.event.currentTarget || window.event.target;
    target.style.background = "#ecfdf5";
    target.style.color = "#16a34a";
    target.style.border = "1px solid #16a34a";
}

// === 3. CORE LOGIC (SUPABASE & RENDER) ===
async function loadMembers() {
    let { data, error } = await supabaseClient
        .from("anggota")
        .select("nama,iuran")
        .order("nama", { ascending: true }); 

    if (error) return console.error(error);
    members = data;
    renderMembers(members);
}

async function loadTransaksi() {
    let { data, error } = await supabaseClient.from("transaksi").select("*");
    if (error) return console.error(error);
    transaksi = data;
}

function renderMembers(list) {
    if(!memberList) return;
    memberList.innerHTML = "";
    list.forEach(m => {
        let div = document.createElement('div');
        div.className = "member";
        div.innerHTML = `<span>${m.nama}</span><span>›</span>`;
        div.onclick = () => selectMember(m.nama, m.iuran);
        memberList.appendChild(div);
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
}

function setKategori(kategori, el) {
    selectedKategori = kategori;
    document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    if(nominalInput) {
        nominalInput.placeholder = (kategori === "urunan") ? "Nominal urunan bebas" : "Masukkan nominal iuran";
    }
    renderMonths();
}

function renderMonths() {
    if (!activeMember || !bulanList) return;
    let totalSudahBayar = 0;
    transaksi.forEach(t => {
        if (t.nama === activeMember && t.ket?.toLowerCase() === "sukses") {
            totalSudahBayar += Number(t.nominal || 0);
        }
    });
    tunggakan = Math.max(0, MAX_TAHUNAN - totalSudahBayar);
    
    bulanList.innerHTML = `
        <div class="month"><span>Sudah Terbayar</span><span class="status-green">Rp${totalSudahBayar.toLocaleString()}</span></div>
        <div class="month"><span>Sisa Tagihan</span><span class="status-red">Rp${tunggakan.toLocaleString()}</span></div>
    `;
    
    let persen = (totalSudahBayar / MAX_TAHUNAN) * 100;
    if(progress) progress.style.width = persen + "%";
    if(progressText) progressText.innerText = Math.round(persen) + "% dari target Rp" + MAX_TAHUNAN.toLocaleString();
    updateSummary();
}

function updateSummary() {
    if(!nominalInput) return;
    let nominal = Number(nominalInput.value || 0);
    if (selectedKategori === "iuran" && nominal > tunggakan) {
        nominal = tunggakan;
        nominalInput.value = nominal;
    }
    totalBayarUser = nominal;
    if(bottomTotal) bottomTotal.innerText = 'Rp' + nominal.toLocaleString();
}

// === 4. PROSES PEMBAYARAN (VALIDASI & REDIRECT) ===
function prosesKePembayaran() {
    const wa = waInput ? waInput.value.trim() : "";
    
    // Satpam Validasi
    const notify = (msg) => {
        if (typeof Toast !== 'undefined') Toast.fire({ icon: 'error', title: msg });
        else alert(msg);
    };

    if (!activeMember) return notify("Pilih anggota dulu, Kang!");
    if (totalBayarUser <= 0) return notify("Nominalnya isi dulu!");
    if (!wa) return notify("Nomor WA jangan dikosongin!");
    if (!selectedMethod) return notify("Pilih metode bayar dulu!");

    // Simpan data ke LocalStorage
    const dataCheckout = {
        nama: activeMember,
        nominal: totalBayarUser,
        total: totalBayarUser,
        wa: wa,
        metode: selectedMethod,
        kategori: selectedKategori
    };
    
    localStorage.setItem('checkout_data', JSON.stringify(dataCheckout));

    const btn = document.getElementById("payButton");
    if(btn) {
        btn.innerText = "Mengalihkan...";
        btn.disabled = true;
    }

    setTimeout(() => {
        window.location.href = "checkout.html";
    }, 600);
}

// === 5. INITIALIZATION (OPERASI JANTUNG) ===
function init() {
    // Daftarkan elemen UI SETELAH HTML mendarat
    nominalInput = document.getElementById('nominalInput');
    waInput = document.getElementById('waInput');
    memberList = document.getElementById('memberList');
    bulanList = document.getElementById('bulanList');
    progress = document.getElementById('progress');
    progressText = document.getElementById('progressText');
    bottomTotal = document.getElementById('bottomTotal');

    // Cek Satpam Toast
    if (typeof Swal !== 'undefined') {
        Toast = Swal.mixin({
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
    }

    // Cek Supabase
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        loadMembers();
        loadTransaksi();
        
        if (nominalInput) {
            nominalInput.addEventListener("input", updateSummary);
        }
    } else {
        // Kalau library telat, coba lagi 100ms kemudian
        setTimeout(init, 100);
    }
}

// Jalankan sistem
init();
