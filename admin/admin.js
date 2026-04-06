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
}

// 2. LISTENERS & MODAL LOGOUT
function setupListeners() {
    const routes = {
        "navDash": "index.html", // Sudah saya sesuaikan namanya
        "navAnggota": "anggota.html",
        "navTransaksi": "transaksi.html",
        "navAgenda": "agenda.html",
        "navLaporan": "laporan.html",
        "btnAllTrx": "transaksi.html"
    };

    Object.keys(routes).forEach(function(id) {
        var el = document.getElementById(id);
        if(el) {
            el.addEventListener("click", function() {
                setTimeout(function() { window.location.href = routes[id]; }, 150);
            });
        }
    });

    // --- LOGIC MODAL LOGOUT (BALIK LAGI!) ---
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
    
    // Tombol Lihat Semua di Card
    var btnBelum = document.getElementById("btnBelumLunas");
    if(btnBelum) btnBelum.addEventListener("click", function() { goAnggota('belum'); });
    
    var btnLunas = document.getElementById("btnSudahLunas");
    if(btnLunas) btnLunas.addEventListener("click", function() { goAnggota('lunas'); });
}

function goAnggota(status) {
    window.location.href = "anggota.html?status=" + status;
}

function formatRp(angka) {
    return "Rp " + Number(angka).toLocaleString("id-ID");
}

// 3. LOAD ANGGOTA & VALIDASI LUNAS
async function loadAnggota() {
    var reqA = await supabaseClient.from("anggota").select("*");
    var reqT = await supabaseClient.from("transaksi").select("*");
    if (reqA.error || reqT.error) return;

    var anggota = reqA.data;
    var trx = reqT.data;
    document.getElementById("anggota").innerText = anggota.length;

    var belum = [];
    var lunas = [];

    anggota.forEach(function(a) {
        var totalBayar = trx
            .filter(function(t) {
                var ket = (t.ket || "").toLowerCase();
                var isOk = ket.includes("sukses") || (!ket.includes("pending") && !ket.includes("sukses"));
                return t.nama && a.nama && 
                       t.nama.trim().toLowerCase() === a.nama.trim().toLowerCase() && 
                       t.jenis === "pemasukan" && isOk;
            })
            .reduce(function(sum, t) { 
                return sum + (Number(t.nominal) || 0); 
            }, 0);

        var target = Number(a.iuran) || 50000;
        var dataAlumni = { nama: a.nama, total: Number(totalBayar) || 0 };

        if (totalBayar >= target) {
            lunas.push(dataAlumni);
        } else {
            belum.push(dataAlumni);
        }
    });

    renderList("belumBayar", belum, "Belum");
    renderList("sudahLunas", lunas, "Lunas");
}

async function loadTransaksi() {
    var req = await supabaseClient.from("transaksi").select("*").order("tanggal", { ascending: false }).limit(5);
    if (req.error) return;
    var html = "";
    req.data.forEach(function(t) {
        var ket = (t.ket || "").toLowerCase();
        if (ket.includes("sukses") || (!ket.includes("pending") && !ket.includes("sukses"))) {
            html += '<div class="list-item"><div>' + t.nama + '<div class="small">' + new Date(t.tanggal).toLocaleDateString() + '</div></div>' +
                '<div style="font-weight:700; color:var(--primary);">' + formatRp(t.nominal) + '</div></div>';
        }
    });
    document.getElementById("recentTrx").innerHTML = html || '<div class="small" style="text-align:center; padding:10px;">Kosong</div>';
}

async function loadSummary() {
    var req = await supabaseClient.from("transaksi").select("*");
    if (req.error) return;
    var income = 0; var expense = 0;
    req.data.forEach(function(t) {
        var ket = (t.ket || "").toLowerCase();
        if (ket.includes("sukses") || (!ket.includes("pending") && !ket.includes("sukses"))) {
            if (t.jenis === "pemasukan") income += Number(t.nominal || 0);
            if (t.jenis === "pengeluaran") expense += Number(t.nominal || 0);
        }
    });
    document.getElementById("saldo").innerText = formatRp(income - expense);
    document.getElementById("income").innerText = formatRp(income);
    document.getElementById("expense").innerText = formatRp(expense);
}

function renderList(id, data, label) {
    var html = "";
    data.slice(0, 5).forEach(function(d) {
        var labelColor = label === 'Lunas' ? '#166534' : '#991b1b';
        var progressInfo = "";
        
        if (label === 'Belum') {
            progressInfo = d.total > 0 
                ? '<div style="font-size:10px; color:#2563eb; font-weight:600;">Nyicil: ' + formatRp(d.total) + '</div>'
                : '<div style="font-size:10px; color:#94a3b8;">Belum ada cicilan</div>';
        } else {
            progressInfo = '<div style="font-size:10px; color:#16a34a;">Lunas: ' + formatRp(d.total) + '</div>';
        }

        html += '<div class="list-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #f1f5f9;">' +
            '<div>' +
                '<div style="font-weight:600; color:#1e293b; font-size:13px;">' + d.nama + '</div>' +
                progressInfo + 
            '</div>' +
            '<span style="font-weight:700; font-size:11px; color:' + labelColor + '; text-transform:uppercase;">' + label + '</span>' +
            '</div>';
    });

    var el = document.getElementById(id);
    if(el) { el.innerHTML = html || '<div class="small" style="text-align:center; padding:20px; color:#94a3b8;">Data kosong</div>'; }
}
