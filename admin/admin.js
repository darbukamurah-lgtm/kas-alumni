// 1. KONFIGURASI
var supabaseUrl = "https://ubpbtsmerfohlfkbuphd.supabase.co";
var supabaseKey = "sb_publishable_NLploEl-HgMy4VTr5jCa5Q_3JLiGEZT";
var supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

document.addEventListener('DOMContentLoaded', async function() {
    var sessionReq = await supabaseClient.auth.getSession();
    var session = sessionReq.data.session;
    if (!session) {
        window.location.href = 'login.html';
    } else {
        initDashboard(session.user);
    }
    setupListeners();
});

async function initDashboard(user) {
    await loadAnggota();
    await loadTransaksi();
    await loadSummary();
    await checkPendingRequests();
}

function setupListeners() {
    const routes = {
        "navDash": "index.html",
        "navAnggota": "anggota.html",
        "navTransaksi": "transaksi.html",
        "navAgenda": "agenda.html",
        "navLaporan": "laporan.html",
        "btnAllTrx": "laporan.html"
    };

    Object.keys(routes).forEach(function(id) {
        var el = document.getElementById(id);
        if(el) {
            el.addEventListener("click", function() {
                setTimeout(function() { window.location.href = routes[id]; }, 150);
            });
        }
    });

    var btnBelum = document.getElementById("btnBelumLunas");
    if(btnBelum) btnBelum.addEventListener("click", function() { goAnggota('belum'); });
    
    var btnLunas = document.getElementById("btnSudahLunas");
    if(btnLunas) btnLunas.addEventListener("click", function() { goAnggota('lunas'); });

    const modalLogout = document.getElementById("modalLogout");
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout && modalLogout) {
        btnLogout.addEventListener("click", function() {
            modalLogout.style.display = "flex";
            setTimeout(() => modalLogout.classList.add("show"), 10);
        });
    }

    const btnCancel = document.getElementById("cancelLogout");
    if (btnCancel) {
        btnCancel.addEventListener("click", function() {
            modalLogout.classList.remove("show");
            setTimeout(() => modalLogout.style.display = "none", 300);
        });
    }

    const btnConfirm = document.getElementById("confirmLogout");
    if (btnConfirm) {
        btnConfirm.addEventListener("click", async function() {
            btnConfirm.innerText = "Processing...";
            btnConfirm.disabled = true;
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
        });
    }
}

function goAnggota(status) {
    window.location.href = "anggota.html?status=" + status;
}

// --- LOGIC PERSETUJUAN ---

async function checkPendingRequests() {
    const { data, count } = await supabaseClient
        .from('payment_request')
        .select('*', { count: 'exact' })
        .eq('status', 'waiting');

    const card = document.getElementById('cardRequest');
    if (count > 0) {
        document.getElementById('countPending').innerText = count;
        card.style.display = 'flex';
    } else {
        card.style.display = 'none';
    }
}

window.bukaHalamanACC = async function() {
    Swal.fire({ title: 'Memuat data...', didOpen: () => { Swal.showLoading(); }});

    const { data, error } = await supabaseClient
        .from('payment_request')
        .select('*')
        .eq('status', 'waiting')
        .order('tanggal', { ascending: false });

    Swal.close();

    if (error || !data.length) return Swal.fire('Kosong', 'Nggak ada request pending, Kang.', 'info');

    let listHtml = '<div style="max-height:450px; overflow-y:auto; text-align:left; padding:5px;">';
    data.forEach(req => {
        // Ambil catatan jika ada, bersihkan kutipan agar tidak merusak onclick
        let catatanUser = (req.catatan || "").replace(/'/g, "\\'");
        
        listHtml += `
            <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                    <div>
                        <strong style="color:#111; font-size:14px;">${req.nama}</strong><br>
                        <span style="font-size:12px; color:#6b7280;">${req.jenis} - <b>${formatRp(req.nominal)}</b></span>
                        ${req.catatan ? `<div style="font-size:11px; color:#ef4444; margin-top:4px;">Catatan: ${req.catatan}</div>` : ""}
                    </div>
                    <span style="font-size:10px; color:#9ca3af;">${new Date(req.tanggal).toLocaleDateString()}</span>
                </div>
                <img src="${req.bukti}" style="width:100%; max-height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px; border:1px solid #ddd; cursor:pointer;" onclick="window.open('${req.bukti}', '_blank')">
                <div style="display:flex; gap:8px;">
                    <button onclick="prosesApprove('${req.id}', '${req.nama}', ${req.nominal}, '${req.jenis}', '${catatanUser}')" style="flex:2; background:#10b981; color:#fff; border:none; padding:10px; border-radius:8px; font-weight:bold; font-size:12px;">TERIMA (ACC)</button>
                    <button onclick="prosesReject('${req.id}', '${req.nama}')" style="flex:1; background:#ef4444; color:#fff; border:none; padding:10px; border-radius:8px; font-weight:bold; font-size:12px;">REJECT</button>
                </div>
            </div>
        `;
    });
    listHtml += '</div>';

    Swal.fire({
        title: 'Persetujuan Pembayaran',
        html: listHtml,
        showConfirmButton: false,
        showCloseButton: true,
        width: '90%'
    });
};

// --- EKSEKUSI ACC (FIXED KATEGORI & CATATAN) ---
window.prosesApprove = async function(id, nama, nominal, kategoriAsli, catatanDariUser) {
    const res = await Swal.fire({
        title: 'Konfirmasi ACC',
        text: `Terima dana ${kategoriAsli} dari ${nama}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, ACC!'
    });

    if (res.isConfirmed) {
        Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

        // 1. Update request jadi sukses
        await supabaseClient.from('payment_request').update({ status: 'success' }).eq('id', id);
        
        // 2. Insert ke transaksi (Sesuai kolom baru tabel transaksi)
        await supabaseClient.from('transaksi').insert([{
            nama: nama, 
            nominal: nominal, 
            jenis: 'pemasukan', 
            kategori: kategoriAsli, // Biar label di web utama (history) bersih
            catatan: catatanDariUser || "", // Biar info tambahan muncul kecil di bawah label
            tanggal: new Date().toISOString(), 
            ket: kategoriAsli + " sukses" // Tetap pakai kata 'sukses' buat hitung saldo di app.js
        }]);

        Swal.fire('Mantap!', 'Saldo bertambah & History diperbarui.', 'success').then(() => location.reload());
    }
};

window.prosesReject = async function(id, nama) {
    const res = await Swal.fire({
        title: 'Yakin Reject?',
        text: `Request dari ${nama} bakal ditolak.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Tolak!'
    });

    if (res.isConfirmed) {
        Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
        await supabaseClient.from('payment_request').update({ status: 'rejected' }).eq('id', id);
        Swal.fire('Ditolak!', 'Data berhasil diupdate.', 'success').then(() => location.reload());
    }
};

// --- LOAD DATA DASHBOARD ---
function formatRp(angka) { return "Rp " + Number(angka).toLocaleString("id-ID"); }

async function loadAnggota() {
    var reqA = await supabaseClient.from("anggota").select("*");
    var reqT = await supabaseClient.from("transaksi").select("*");
    if (reqA.error || reqT.error) return;
    
    document.getElementById("anggota").innerText = reqA.data.length;

    var belum = []; 
    var lunas = [];
    
    reqA.data.forEach(function(a) {
        var totalBayar = reqT.data.filter(t => 
            t.nama && a.nama && 
            t.nama.trim().toLowerCase() === a.nama.trim().toLowerCase() && 
            t.jenis === "pemasukan" && 
            (t.ket||'').toLowerCase().includes('sukses')
        ).reduce((sum, t) => sum + Number(t.nominal), 0);

        if (totalBayar >= (a.iuran||50000)) {
            lunas.push({nama: a.nama, total: totalBayar});
        } else {
            belum.push({nama: a.nama, total: totalBayar});
        }
    });

    belum.sort((a, b) => a.nama.localeCompare(b.nama));
    lunas.sort((a, b) => a.nama.localeCompare(b.nama));

    renderList("belumBayar", belum, "Belum"); 
    renderList("sudahLunas", lunas, "Lunas");
}

async function loadTransaksi() {
    var req = await supabaseClient.from("transaksi").select("*").order("tanggal", { ascending: false }).limit(5);
    var html = "";
    req.data?.forEach(t => {
        if ((t.ket||'').toLowerCase().includes('sukses')) {
            html += `<div class="list-item"><div>${t.nama}<div class="small">${new Date(t.tanggal).toLocaleDateString()}</div></div><div style="font-weight:700; color:var(--primary);">${formatRp(t.nominal)}</div></div>`;
        }
    });
    document.getElementById("recentTrx").innerHTML = html || '<div class="small" style="text-align:center; padding:10px;">Kosong</div>';
}

async function loadSummary() {
    var req = await supabaseClient.from("transaksi").select("*");
    let inc = 0; let exp = 0;
    req.data?.forEach(t => {
        if ((t.ket||'').toLowerCase().includes('sukses')) {
            if (t.jenis === "pemasukan") inc += Number(t.nominal);
            else exp += Number(t.nominal);
        }
    });
    document.getElementById("saldo").innerText = formatRp(inc - exp);
    document.getElementById("income").innerText = formatRp(inc);
    document.getElementById("expense").innerText = formatRp(exp);
}

function renderList(id, data, label) {
    var html = "";
    data.slice(0, 5).forEach(d => {
        let color = label === 'Lunas' ? '#166534' : '#991b1b';
        html += `<div class="list-item" style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f1f5f9;">
            <div><div style="font-weight:600; font-size:13px;">${d.nama}</div><div style="font-size:10px; color:#64748b;">Total: ${formatRp(d.total)}</div></div>
            <span style="font-weight:700; font-size:11px; color:${color};">${label}</span>
        </div>`;
    });
    if(document.getElementById(id)) document.getElementById(id).innerHTML = html || '<div class="small">Kosong</div>';
}
