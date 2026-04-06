// 1. KONFIGURASI
var supabaseUrl = "https://ubpbtsmerfohlfkbuphd.supabase.co";
var supabaseKey = "sb_publishable_NLploEl-HgMy4VTr5jCa5Q_3JLiGEZT";
var supabaseClient;

let allMembers = []; 
let currentFilter = "all";

// 2. TUNGGU DOM SIAP
document.addEventListener('DOMContentLoaded', async function() {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    } else { return; }

    // Cek Session
    var sessionReq = await supabaseClient.auth.getSession();
    if (!sessionReq.data.session) {
        window.location.href = 'login.html';
        return;
    }

    // Tangkap Filter dari Dashboard (URL Parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam) {
        currentFilter = statusParam;
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        if (statusParam === 'lunas') document.getElementById("btnFilterLunas").classList.add("active");
        if (statusParam === 'belum') document.getElementById("btnFilterBelum").classList.add("active");
    }

    // Aktifkan Semua Fitur
    setupListeners();
    initFilters();
    initCRUD(); // Mesin Tambah/Edit/Hapus
    await fetchAnggota();
});

// 3. AMBIL DATA DARI SUPABASE
async function fetchAnggota() {
    const listEl = document.getElementById("anggotaList");
    listEl.innerHTML = '<div style="text-align:center; padding:50px; color:#94a3b8;">Memuat data alumni...</div>';

    var reqA = await supabaseClient.from("anggota").select("*").order("nama", { ascending: true });
    var reqT = await supabaseClient.from("transaksi").select("*");
    
    if (reqA.error || reqT.error) return;

    allMembers = reqA.data.map(function(a) {
        var totalBayar = reqT.data
            .filter(function(t) {
                var ket = (t.ket || "").toLowerCase();
                var isOk = ket.includes("sukses") || (!ket.includes("pending") && !ket.includes("sukses"));
                return t.nama && a.nama && t.nama.trim().toLowerCase() === a.nama.trim().toLowerCase() && t.jenis === "pemasukan" && isOk;
            })
            .reduce(function(sum, t) { return sum + Number(t.nominal || 0); }, 0);

        var target = a.iuran || 50000;
        return { 
            id: a.id, 
            nama: a.nama, 
            status: totalBayar >= target ? "lunas" : "belum", 
            total: totalBayar,
            target: target 
        };
    });
    renderList();
}

// 4. TAMPILKAN LIST KE UI
function renderList() {
    const searchInputEl = document.getElementById("searchInput");
    const searchVal = searchInputEl ? searchInputEl.value.toLowerCase() : "";
    const listEl = document.getElementById("anggotaList");
    let html = "";

    const filtered = allMembers.filter(m => {
        return (currentFilter === "all" || m.status === currentFilter) && m.nama.toLowerCase().includes(searchVal);
    });

    filtered.forEach(m => {
        const progressColor = m.total > 0 && m.total < m.target ? "#2563eb" : (m.total >= m.target ? "#16a34a" : "#94a3b8");
        
        html += `
            <div class="item-card" onclick="bukaEdit('${m.id}', '${m.nama}', ${m.target})" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: white; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; cursor: pointer;">
                <div class="item-info">
                    <div class="name" style="font-weight: 700; color: #1e293b; font-size: 15px; margin-bottom: 4px;">${m.nama}</div>
                    <div style="font-size: 11px; color: #64748b; letter-spacing: 0.3px;">
                        PROGRES: <span style="color: ${progressColor}; font-weight: 800;">Rp ${m.total.toLocaleString('id-ID')}</span> 
                        <span style="color: #cbd5e1;"> / Rp ${m.target.toLocaleString('id-ID')}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="status-badge ${m.status}" style="font-size: 10px; padding: 4px 10px; border-radius: 8px; font-weight: 700; text-transform: uppercase;">${m.status}</div>
                    <span class="material-icons" style="color: #e2e8f0; font-size: 20px;">chevron_right</span>
                </div>
            </div>`;
    });

    listEl.innerHTML = html || `<div style="text-align:center; padding:50px; color:#94a3b8;"><span class="material-icons" style="font-size:48px; opacity:0.2;">search_off</span><p>Alumni tidak ditemukan</p></div>`;
}

// 5. FITUR TAMBAH / EDIT / HAPUS (CRUD)
// HELPER MODAL ALERT
function bukaAlert(pesan) {
    const m = document.getElementById("modalAlert");
    document.getElementById("alertMessage").innerText = pesan;
    m.style.display = "flex";
    setTimeout(() => m.classList.add("show"), 10);
    document.getElementById("btnTutupAlert").onclick = () => {
        m.classList.remove("show");
        setTimeout(() => m.style.display = "none", 300);
    };
}

// UPDATE MESIN CRUD
function initCRUD() {
    const modal = document.getElementById("modalAnggota");
    const btnTambah = document.getElementById("btnTambahAnggota");
    const btnBatal = document.getElementById("btnBatal");
    const btnSimpan = document.getElementById("btnSimpan");
    const btnHapus = document.getElementById("btnHapus");

    btnTambah.onclick = () => {
        document.getElementById("modalTitle").innerText = "Tambah Anggota";
        document.getElementById("editId").value = "";
        document.getElementById("inputNama").value = "";
        document.getElementById("inputIuran").value = 50000; 
        btnHapus.style.display = "none";
        modal.style.display = "flex";
        setTimeout(() => modal.classList.add("show"), 10);
    };

    btnBatal.onclick = () => {
        modal.classList.remove("show");
        setTimeout(() => modal.style.display = "none", 300);
    };

    btnSimpan.onclick = async () => {
        const id = document.getElementById("editId").value;
        const nama = document.getElementById("inputNama").value.trim();
        const iuran = 50000; 

        if (!nama) {
            bukaAlert("Nama wajib diisi dulu, Boss!");
            return;
        }

        btnSimpan.innerText = "Proses...";
        btnSimpan.disabled = true;

        let res = id ? 
            await supabaseClient.from("anggota").update({ nama }).eq("id", id) : 
            await supabaseClient.from("anggota").insert([{ nama, iuran }]);

        if (res.error) {
            bukaAlert("Gagal Simpan: " + res.error.message);
        } else {
            modal.classList.remove("show");
            setTimeout(() => { modal.style.display = "none"; fetchAnggota(); }, 300);
        }
        btnSimpan.innerText = "Simpan";
        btnSimpan.disabled = false;
    };

    // LOGIC HAPUS MODAL (GANTI CONFIRM)
    btnHapus.onclick = () => {
        const mHapus = document.getElementById("modalHapus");
        mHapus.style.display = "flex";
        setTimeout(() => mHapus.classList.add("show"), 10);

        document.getElementById("btnBatalHapus").onclick = () => {
            mHapus.classList.remove("show");
            setTimeout(() => mHapus.style.display = "none", 300);
        };

        document.getElementById("btnProsesHapus").onclick = async () => {
            const id = document.getElementById("editId").value;
            const res = await supabaseClient.from("anggota").delete().eq("id", id);
            
            mHapus.classList.remove("show");
            setTimeout(() => mHapus.style.display = "none", 300);

            if (res.error) {
                bukaAlert("Gagal Hapus: " + res.error.message);
            } else {
                modal.classList.remove("show");
                setTimeout(() => { modal.style.display = "none"; fetchAnggota(); }, 300);
            }
        };
    };
}


window.bukaEdit = function(id, nama, iuran) {
    const modal = document.getElementById("modalAnggota");
    document.getElementById("modalTitle").innerText = "Edit Anggota";
    document.getElementById("editId").value = id;
    document.getElementById("inputNama").value = nama;
    document.getElementById("inputIuran").value = iuran;
    document.getElementById("btnHapus").style.display = "block";
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);
};

// 6. FILTER & SEARCH
function initFilters() {
    const map = { "btnFilterAll": "all", "btnFilterLunas": "lunas", "btnFilterBelum": "belum" };
    Object.keys(map).forEach(id => {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', function() {
            currentFilter = map[id];
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            renderList();
        });
    });
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.addEventListener("input", renderList);
}

// 7. NAVIGASI NAVBAR & LOGOUT
function setupListeners() {
    const r = { "navDash": "index.html", "navAnggota": "anggota.html", "navTransaksi": "transaksi.html", "navAgenda": "agenda.html", "navLaporan": "laporan.html" };
    Object.keys(r).forEach(id => {
        var el = document.getElementById(id);
        if (el) el.addEventListener("click", function() { setTimeout(function() { window.location.href = r[id]; }, 150); });
    });

    // LOGIC MODAL LOGOUT PREMIUM
    const btnLogout = document.getElementById("btnLogout");
    const modalLogout = document.getElementById("modalLogout");
    const cancelLogout = document.getElementById("cancelLogout");
    const confirmLogout = document.getElementById("confirmLogout");

    if (btnLogout) {
        btnLogout.onclick = () => {
            modalLogout.style.display = "flex";
            setTimeout(() => modalLogout.classList.add("show"), 10);
        };
    }

    if (cancelLogout) {
        cancelLogout.onclick = () => {
            modalLogout.classList.remove("show");
            setTimeout(() => modalLogout.style.display = "none", 300);
        };
    }

    if (confirmLogout) {
        confirmLogout.onclick = async () => {
            confirmLogout.innerText = "...";
            await supabaseClient.auth.signOut(); 
            window.location.href = 'login.html';
        };
    }
}
