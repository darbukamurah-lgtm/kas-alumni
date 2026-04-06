// 1. KONFIGURASI SUPABASE
const supabaseUrl = "https://ubpbtsmerfohlfkbuphd.supabase.co";
const supabaseKey = "sb_publishable_NLploEl-HgMy4VTr5jCa5Q_3JLiGEZT";
let supabaseClient;
let daftarNamaGlobal = [];

document.addEventListener('DOMContentLoaded', async function() {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    } else { return; }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }

    document.getElementById('inTgl').valueAsDate = new Date();

    setupNavbar();
    await muatAnggota();
    initEventListeners();
});

// --- FUNGSI TOAST STANDAR ---
function tampilToast(pesan, tipe = "success") {
    const toast = document.getElementById("mainToast");
    const msg = document.getElementById("toastMsg");
    const icon = document.getElementById("toastIcon");
    if (!toast) return;
    toast.className = "toast show " + tipe;
    msg.innerText = pesan;
    icon.innerText = (tipe === "success") ? "check_circle" : "error";
    setTimeout(() => { toast.classList.remove("show"); }, 3000);
}

// 2. AMBIL DATA ANGGOTA
async function muatAnggota() {
    try {
        const { data } = await supabaseClient.from('anggota').select('nama').order('nama', { ascending: true });
        daftarNamaGlobal = data ? data.map(a => a.nama) : [];
    } catch (e) { console.error("Gagal muat anggota"); }
}

// 3. LOGIKA FORM & EVENT
function initEventListeners() {
    const inNama = document.getElementById('inNama');
    const inJenis = document.getElementById('inJenis');
    const inKat = document.getElementById('inKat');
    const btnSimpan = document.getElementById('btnSimpan');
    const modalLogout = document.getElementById("modalLogout");

    inNama.addEventListener('input', filterNama);
    inNama.addEventListener('blur', () => setTimeout(cekValidasiNama, 250));
    inJenis.addEventListener('change', logicTampilan);
    inKat.addEventListener('change', logicTampilan);
    btnSimpan.addEventListener('click', gasSimpan);

    // --- MODAL LOGOUT BALIK LAGI DISINI ---
    document.getElementById("btnLogout").addEventListener("click", () => {
        modalLogout.style.display = "flex";
        setTimeout(() => modalLogout.classList.add("show"), 10);
    });

    document.getElementById("cancelLogout").addEventListener("click", () => {
        modalLogout.classList.remove("show");
        setTimeout(() => modalLogout.style.display = "none", 300);
    });

    document.getElementById("confirmLogout").addEventListener("click", async () => {
        const btn = document.getElementById("confirmLogout");
        btn.innerText = "Processing...";
        btn.disabled = true;
        await supabaseClient.auth.signOut();
        window.location.href = 'login.html';
    });
}

function filterNama() {
    const input = document.getElementById('inNama');
    const box = document.getElementById('boxSaran');
    const val = input.value.toLowerCase().trim();
    input.classList.remove('error-input');
    box.innerHTML = "";
    if (val.length < 1) { box.style.display = "none"; return; }

    const hasil = daftarNamaGlobal.filter(n => n.toLowerCase().includes(val));
    if (hasil.length > 0) {
        box.style.display = "block";
        hasil.slice(0, 8).forEach(nama => {
            let div = document.createElement("div");
            div.className = "saran-item";
            div.innerText = nama;
            div.onclick = () => {
                input.value = nama;
                box.style.display = "none";
                cekValidasiNama();
            };
            box.appendChild(div);
        });
    } else { box.style.display = "none"; }
}

async function cekValidasiNama() {
    const inputNama = document.getElementById('inNama');
    const nama = inputNama.value.trim();
    const msg = document.getElementById('msgLunas');
    const btn = document.getElementById('btnSimpan');
    const jenis = document.getElementById('inJenis').value;
    const kat = document.getElementById('inKat').value;

    inputNama.classList.remove('error-input');
    msg.style.display = 'none';
    btn.disabled = false;

    if (!nama) return;

    if (jenis === 'pemasukan' && kat === 'iuran') {
        if (!daftarNamaGlobal.includes(nama)) {
            inputNama.classList.add('error-input');
            msg.innerText = "Nama tidak terdaftar!";
            msg.style.color = "var(--red)";
            msg.style.display = 'block';
            btn.disabled = true;
            return;
        }

        const { data: reqT } = await supabaseClient.from("transaksi").select("*");
        if (reqT) {
            const totalBayar = reqT
                .filter(t => {
                    const ketStr = (t.ket || "").toLowerCase();
                    const isOk = ketStr.includes("sukses") || (!ketStr.includes("pending") && !ketStr.includes("sukses"));
                    return t.nama && t.nama.trim().toLowerCase() === nama.trim().toLowerCase() && t.jenis === "pemasukan" && isOk;
                })
                .reduce((sum, t) => sum + Number(t.nominal || 0), 0);

            const target = 50000;
            if (totalBayar >= target) {
                msg.innerText = `LUNAS 2026 (Rp ${totalBayar.toLocaleString('id-ID')})`;
                msg.style.color = "var(--green)";
                msg.style.display = 'block';
                btn.disabled = true;
            } else if (totalBayar > 0) {
                msg.innerText = `CICILAN: Rp ${totalBayar.toLocaleString('id-ID')} / Rp ${target.toLocaleString('id-ID')}`;
                msg.style.color = "var(--primary)";
                msg.style.display = 'block';
            } else {
                msg.innerText = "Belum ada data iuran";
                msg.style.color = "#94a3b8";
                msg.style.display = 'block';
            }
        }
    }
}

async function gasSimpan() {
    const btn = document.getElementById('btnSimpan');
    const nama = document.getElementById('inNama').value.trim();
    const jenis = document.getElementById('inJenis').value;
    const kat = document.getElementById('inKat').value;
    const nominalRaw = document.getElementById('inNominal').value;
    const tgl = document.getElementById('inTgl').value;
    const bulanIn = document.getElementById('inBulan').value;
    const acara = document.getElementById('inAcara').value.trim();
    const ket = document.getElementById('inKet').value.trim();

    if(!nama || !nominalRaw || !jenis) {
        tampilToast("Data belum lengkap!", "error");
        return;
    }

    const nominalInput = parseInt(nominalRaw);

    if (jenis === 'pemasukan' && kat === 'iuran') {
        const { data: reqT } = await supabaseClient.from("transaksi").select("*");
        const totalLama = reqT
            ? reqT.filter(t => {
                const ketStr = (t.ket || "").toLowerCase();
                const isOk = ketStr.includes("sukses") || (!ketStr.includes("pending") && !ketStr.includes("sukses"));
                return t.nama && t.nama.trim().toLowerCase() === nama.trim().toLowerCase() && t.jenis === "pemasukan" && isOk;
              }).reduce((sum, t) => sum + Number(t.nominal || 0), 0)
            : 0;

        const sisa = 50000 - totalLama;
        if (totalLama >= 50000) {
            tampilToast("Iuran sudah lunas!", "error");
            return;
        }
        if (nominalInput > sisa) {
            tampilToast(`Input melebihi sisa tagihan!`, "error");
            return;
        }
    }

    btn.innerText = "Memproses..."; 
    btn.disabled = true;

    let bulFinal = (jenis === 'pemasukan' && kat === 'iuran') ? "2026" : bulanIn;
    let ketFinal = ket || (jenis === 'pemasukan' ? (kat === 'iuran' ? "Iuran Tahunan" : (kat === 'urunan' ? "Urunan " + acara : "Pemasukan Lainnya")) : "Pengeluaran");

    try {
        const { error } = await supabaseClient.from('transaksi').insert([{
            tanggal: tgl, nama: nama, jenis: jenis, 
            nominal: nominalInput, bulan: bulFinal, ket: ketFinal
        }]);
        if (error) throw error;
        tampilToast("Data berhasil disimpan!", "success");
        setTimeout(() => { location.reload(); }, 1500);
    } catch (e) { 
        tampilToast("Gagal simpan data!", "error");
        btn.innerText = "SIMPAN TRANSAKSI"; 
        btn.disabled = false; 
    }
}

function logicTampilan() {
    const jenis = document.getElementById('inJenis').value;
    const kat = document.getElementById('inKat').value;
    const gKat = document.getElementById('groupKat'), gAca = document.getElementById('groupAcara'), gBul = document.getElementById('groupBulan');
    gKat.style.display = (jenis === 'pemasukan') ? 'block' : 'none';
    if (jenis === 'pemasukan') {
        if (kat === 'iuran') { gBul.style.display = 'none'; gAca.style.display = 'none'; }
        else if (kat === 'urunan') { gBul.style.display = 'block'; gAca.style.display = 'block'; }
        else { gBul.style.display = 'block'; gAca.style.display = 'none'; }
    } else {
        gBul.style.display = (jenis === 'pengeluaran') ? 'block' : 'none';
        gAca.style.display = 'none';
    }
    cekValidasiNama();
}

function setupNavbar() {
    const routes = { "navDash": "index.html", "navAnggota": "anggota.html", "navTransaksi": "transaksi.html", "navAgenda": "agenda.html", "navLaporan": "laporan.html" };
    Object.keys(routes).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", () => { window.location.href = routes[id]; });
    });
}
