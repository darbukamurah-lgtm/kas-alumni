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

    var sessionReq = await supabaseClient.auth.getSession();
    if (!sessionReq.data.session) {
        window.location.href = 'login.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const statusParam = urlParams.get('status');
    if (statusParam) {
        currentFilter = statusParam;
        updateFilterUI(statusParam);
    }

    setupListeners();
    initFilters();
    initCRUD(); 
    await fetchAnggota();
});

function updateFilterUI(status) {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    if (status === 'lunas') document.getElementById("btnFilterLunas")?.classList.add("active");
    if (status === 'belum') document.getElementById("btnFilterBelum")?.classList.add("active");
    if (status === 'all') document.getElementById("btnFilterAll")?.classList.add("active");
}

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
            nowa: a.nowa, 
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
            <div class="item-card" 
                 onclick="tampilkanMenuAksi('${m.id}', '${m.nama}', ${m.target}, '${m.nowa || ""}', ${m.total}, '${m.status}')"
                 style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: white; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; cursor: pointer;">
                <div class="item-info" style="flex: 1;">
                    <div class="name" style="font-weight: 700; color: #1e293b; font-size: 15px; margin-bottom: 4px;">${m.nama}</div>
                    <div style="font-size: 11px; color: #64748b; letter-spacing: 0.3px;">
                        PROGRES: <span style="color: ${progressColor}; font-weight: 800;">Rp ${m.total.toLocaleString('id-ID')}</span> 
                        <span style="color: #cbd5e1;"> / Rp ${m.target.toLocaleString('id-ID')}</span>
                    </div>
                </div>
                <div class="status-badge ${m.status}" style="font-size: 10px; padding: 4px 10px; border-radius: 8px; font-weight: 700; text-transform: uppercase;">${m.status}</div>
            </div>`;
    });

    listEl.innerHTML = html || `<div style="text-align:center; padding:50px; color:#94a3b8;"><span class="material-icons" style="font-size:48px; opacity:0.2;">search_off</span><p>Alumni tidak ditemukan</p></div>`;
}

// 5. MENU AKSI (ACTION SHEET STYLE)
window.tampilkanMenuAksi = function(id, nama, target, nowa, total, status) {
    // SEMBUNYIKAN FAB
    const fab = document.getElementById("btnTambahAnggota");
    if (fab) fab.style.display = "none";

    const cleanNoWa = nowa.startsWith('0') ? '62' + nowa.substring(1) : nowa;
    
    const opsiTagih = (status === 'belum' && nowa) ? `
        <button onclick="kirimTagihan('${nama}', '${cleanNoWa}', ${total}, ${target})" style="width: 100%; padding: 14px; margin-bottom: 10px; border-radius: 12px; border: none; background: #25d366; color: white; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span class="material-icons">send</span> TAGIH VIA WHATSAPP
        </button>
    ` : '';

    const menuHTML = `
        <div id="overlayMenu" onclick="tutupMenuAksi()" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 999;"></div>
        <div id="menuAksi" style="position: fixed; bottom: 0; left: 0; right: 0; background: white; padding: 20px; border-radius: 24px 24px 0 0; box-shadow: 0 -10px 25px rgba(0,0,0,0.1); z-index: 1000; animation: slideUp 0.3s ease;">
            <div style="width: 40px; height: 4px; background: #e2e8f0; border-radius: 10px; margin: 0 auto 20px;"></div>
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-weight: 800; color: #1e293b;">Pilih Aksi: ${nama}</div>
            </div>
            ${opsiTagih}
            <button onclick="tutupMenuAksi(); bukaEdit('${id}', '${nama}', ${target}, '${nowa}')" style="width: 100%; padding: 14px; margin-bottom: 10px; border-radius: 12px; border: 1px solid #e2e8f0; background: white; color: #1e293b; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span class="material-icons">edit</span> EDIT DATA ALUMNI
            </button>
            <button onclick="tutupMenuAksi()" style="width: 100%; padding: 14px; border-radius: 12px; border: none; background: #f1f5f9; color: #64748b; font-weight: 700;">BATAL</button>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', menuHTML);
};

window.tutupMenuAksi = function() {
    // MUNCULKAN KEMBALI FAB
    const fab = document.getElementById("btnTambahAnggota");
    if (fab) fab.style.display = "flex";

    document.getElementById("menuAksi")?.remove();
    document.getElementById("overlayMenu")?.remove();
};

window.kirimTagihan = function(nama, noHp, total, target) {
    const sisaTagihan = target - total;
    
    // Ganti jadi bayar.html sesuai request Kakang
    const linkWebBayar = `https://kas-alumni.my.id/bayar.html?nama=${encodeURIComponent(nama)}&tagihan=${sisaTagihan}`; 
    
    // Kata-kata sakti tetap aman!
    const pesan = `Sampurasun ${nama}, mengingatkan iuran alumni masih ada selisih Rp${sisaTagihan.toLocaleString('id-ID')}. Mangga bilih bade dilunasi via QRIS/Transfer klik wae link ieu: ${linkWebBayar} . Nuhun! 🙏`;

    // Kirim ke WA
    const cleanNoHp = noHp.replace(/[^0-9]/g, ''); 
    const urlWA = `https://wa.me/${cleanNoHp}?text=${encodeURIComponent(pesan)}`;
    
    window.open(urlWA, '_blank');
    tutupMenuAksi(); 
};


// 6. CRUD & MODAL
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
        document.getElementById("inputNoWa").value = "";
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
        let nowa = document.getElementById("inputNoWa").value.trim();
        const iuran = 50000; 

        if (!nama || !nowa) {
            bukaAlert("Nama & WA wajib diisi, Boss!");
            return;
        }

        if (nowa.startsWith('0')) nowa = '62' + nowa.substring(1);

        btnSimpan.innerText = "Proses...";
        btnSimpan.disabled = true;

        let res = id ? 
            await supabaseClient.from("anggota").update({ nama, nowa, iuran }).eq("id", id) : 
            await supabaseClient.from("anggota").insert([{ nama, nowa, iuran }]);

        if (res.error) {
            bukaAlert("Gagal Simpan: " + res.error.message);
        } else {
            modal.classList.remove("show");
            setTimeout(() => { modal.style.display = "none"; fetchAnggota(); }, 300);
        }
        btnSimpan.innerText = "Simpan";
        btnSimpan.disabled = false;
    };

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

window.bukaEdit = function(id, nama, iuran, nowa) {
    // JAGA-JAGA FAB MUNCUL LAGI KALO PINDAH KE EDIT
    const fab = document.getElementById("btnTambahAnggota");
    if (fab) fab.style.display = "none";

    const modal = document.getElementById("modalAnggota");
    document.getElementById("modalTitle").innerText = "Edit Anggota";
    document.getElementById("editId").value = id;
    document.getElementById("inputNama").value = nama;
    document.getElementById("inputIuran").value = iuran;
    document.getElementById("inputNoWa").value = nowa || "";
    document.getElementById("btnHapus").style.display = "block";
    modal.style.display = "flex";
    setTimeout(() => modal.classList.add("show"), 10);
    
    // Saat modal edit ditutup via tombol Batal, munculin FAB lagi
    document.getElementById("btnBatal").onclick = () => {
        modal.classList.remove("show");
        if (fab) fab.style.display = "flex";
        setTimeout(() => modal.style.display = "none", 300);
    };
};

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

// 7. FILTER & SEARCH
function initFilters() {
    const map = { "btnFilterAll": "all", "btnFilterLunas": "lunas", "btnFilterBelum": "belum" };
    Object.keys(map).forEach(id => {
        var el = document.getElementById(id);
        if (el) el.addEventListener('click', function() {
            currentFilter = map[id];
            updateFilterUI(currentFilter);
            renderList();
        });
    });
    document.getElementById("searchInput")?.addEventListener("input", renderList);
}

// 8. NAVIGASI NAVBAR & LOGOUT
function setupListeners() {
    const r = { "navDash": "index.html", "navAnggota": "anggota.html", "navTransaksi": "transaksi.html", "navAgenda": "agenda.html", "navLaporan": "laporan.html" };
    Object.keys(r).forEach(id => {
        var el = document.getElementById(id);
        if (el) el.addEventListener("click", function() { setTimeout(function() { window.location.href = r[id]; }, 150); });
    });

    const btnLogout = document.getElementById("btnLogout");
    const modalLogout = document.getElementById("modalLogout");
    const btnCancel = document.getElementById("cancelLogout");
    const btnConfirm = document.getElementById("confirmLogout");

    if (btnLogout && modalLogout) {
        btnLogout.onclick = function() {
            modalLogout.style.display = "flex";
            setTimeout(function() { modalLogout.classList.add("show"); }, 10);
        };
    }

    if (btnCancel && modalLogout) {
        btnCancel.onclick = function() {
            modalLogout.classList.remove("show");
            setTimeout(function() { modalLogout.style.display = "none"; }, 300);
        };
    }

    if (btnConfirm) {
        btnConfirm.onclick = async function() {
            btnConfirm.innerText = "...";
            await supabaseClient.auth.signOut(); 
            window.location.href = 'login.html';
        };
    }
}
