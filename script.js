(function () {
    "use strict";

    var AMMO = ["EMP","AP","APHE","ATMC","CLMN","CYAN","DRIL","EQKE","FLCH","HCHE","HE","INCN","LE","PLCM","PHGN","PRPG","SMK","STAR","TEAR","THRM","WP"];

    var $ = function (id) { return document.getElementById(id); };
    var distEl = $("dist"), brgEl = $("brg");
    var KM_PER_CHARGE = 5, MAX_ELEV = 60, MAX_DIST = 30, MAX_BRG = 360;
    var NUM_DIST = /^\d{1,2}([.,]\d{0,2})?$/;
    var NUM_BRG = /^\d{1,3}([.,]\d?)?$/;

    /* ---------- util ---------- */
    function parse(v, re) {
        v = String(v).trim();
        if (!re.test(v)) return NaN;
        return parseFloat(v.replace(",", "."));
    }
    function fmt(n, dec) { return n.toFixed(dec).replace(".", ","); }
    function padInt(n, dec, len) {
        var s = fmt(n, dec), i = s.indexOf(",");
        var ip = i < 0 ? s : s.slice(0, i);
        while (ip.length < len) ip = "0" + ip;
        return ip + (i < 0 ? "" : s.slice(i));
    }
    function pad2(n, dec) { return padInt(n, dec, 2); }
    function pad3(n, dec) { return padInt(n, dec, 3); }

    /* ---------- format angka otomatis (koma terisi sendiri) ----------
       Hanya ketik angka. Koma muncul begitu bagian bulatnya pasti:
       jarak  : 1250 -> 12,50   550 -> 5,50   (maks 30)
       bearing: 2250 -> 225,0   450 -> 45,0   (maks 360) */
    function splitDigits(D, maxLen, limit) {
        var L = Math.min(D.length, maxLen);
        while (L > 1 && parseInt(D.slice(0, L), 10) > limit) L--;
        var complete;
        if (L < D.length) complete = true;
        else if (L === maxLen) complete = true;
        else {
            complete = true;
            for (var k = L + 1; k <= maxLen; k++) {
                if (parseInt(D, 10) * Math.pow(10, k - L) <= limit) { complete = false; break; }
            }
        }
        return { ip: D.slice(0, L), rest: D.slice(L), complete: complete };
    }

    function applyMask(raw, o, inserting) {
        var s = String(raw).replace(/[^0-9.,]/g, "");
        var m = s.search(/[.,]/);
        if (m >= 0) {
            var ip = s.slice(0, m).replace(/\D/g, "");
            var dp = s.slice(m + 1).replace(/\D/g, "");
            if (ip.length <= o.maxLen) {
                return (ip === "" ? "0" : ip) + "," + dp.slice(0, o.dec);
            }
            s = ip + dp; // terlalu panjang: susun ulang dari angka saja
        }
        var D = s.replace(/\D/g, "");
        if (D === "") return "";
        var sp = splitDigits(D, o.maxLen, o.limit);
        var dec = sp.rest.slice(0, o.dec);
        if (!inserting) {
            // saat menghapus jangan paksa koma muncul lagi
            return sp.rest ? sp.ip + "," + dec : D.slice(0, o.maxLen);
        }
        if (sp.rest || sp.complete) return sp.ip + "," + dec;
        return sp.ip;
    }

    function bindMask(input, o) {
        input.addEventListener("input", function (e) {
            var raw = input.value, pos = input.selectionStart;
            var atEnd = pos >= raw.length;
            var digitsBefore = raw.slice(0, pos).replace(/\D/g, "").length;
            var inserting = !(e.inputType && e.inputType.indexOf("delete") === 0);
            var out = applyMask(raw, o, inserting);
            if (out !== raw) {
                input.value = out;
                var np = out.length;
                if (!atEnd) {
                    np = 0;
                    var cnt = 0;
                    while (np < out.length && cnt < digitsBefore) { if (/\d/.test(out.charAt(np))) cnt++; np++; }
                }
                try { input.setSelectionRange(np, np); } catch (err) { /* abaikan */ }
            }
        });
    }
    bindMask(distEl, { maxLen: 2, dec: 2, limit: MAX_DIST });
    bindMask(brgEl, { maxLen: 3, dec: 1, limit: MAX_BRG });

    /* ---------- bangun pilihan ---------- */
    var chargesBox = $("charges");
    for (var c = 1; c <= 6; c++) {
        chargesBox.insertAdjacentHTML("beforeend",
            '<label><input type="radio" name="charge" value="' + c + '"' + (c === 3 ? " checked" : "") +
            '><span>' + c + '</span></label>');
    }
    var ammoBox = $("ammo");
    AMMO.forEach(function (a) {
        ammoBox.insertAdjacentHTML("beforeend",
            '<label><input type="radio" name="ammo" value="' + a + '"' + (a === "HE" ? " checked" : "") +
            '><span>' + a + '</span></label>');
    });

    /* ---------- skala SVG ---------- */
    var NS = "http://www.w3.org/2000/svg";
    function el(name, attrs, parent) {
        var e = document.createElementNS(NS, name);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }

    // tampak samping: poros laras di (620,600), panjang laras dari poros ke mulut 439
    var PIVOT_X = 620, PIVOT_Y = 600, BARREL_LEN = 439, GROUND_Y = 676;
    var TICK_IN = BARREL_LEN + 28, TICK_OUT = BARREL_LEN + 52, TICK_TXT = BARREL_LEN + 86;
    var scale = $("side-scale");
    for (var a = 0; a <= 60; a += 10) {
        var rad = a * Math.PI / 180;
        el("line", {
            x1: PIVOT_X + TICK_IN * Math.cos(rad), y1: PIVOT_Y - TICK_IN * Math.sin(rad),
            x2: PIVOT_X + TICK_OUT * Math.cos(rad), y2: PIVOT_Y - TICK_OUT * Math.sin(rad),
            stroke: "#c1272d", "stroke-width": 5
        }, scale);
        var t = el("text", {
            x: PIVOT_X + TICK_TXT * Math.cos(rad) - 14, y: PIVOT_Y - TICK_TXT * Math.sin(rad) + 11, "class": "svg-tick"
        }, scale);
        t.textContent = a;
    }
    el("path", {
        d: "M " + (PIVOT_X + TICK_OUT + 6) + " " + PIVOT_Y + " A " + (TICK_OUT + 6) + " " + (TICK_OUT + 6) + " 0 0 0 " +
           (PIVOT_X + (TICK_OUT + 6) * Math.cos(Math.PI / 3)).toFixed(1) + " " + (PIVOT_Y - (TICK_OUT + 6) * Math.sin(Math.PI / 3)).toFixed(1),
        fill: "none", stroke: "#5a2326", "stroke-width": 2
    }, scale);

    // tikar kompas tampak atas
    var ticks = $("top-ticks");
    for (var d = 0; d < 360; d += 10) {
        var r = d * Math.PI / 180, major = d % 90 === 0;
        var r1 = major ? 106 : 112, r2 = 124;
        el("line", {
            x1: 150 + r1 * Math.sin(r), y1: 150 - r1 * Math.cos(r),
            x2: 150 + r2 * Math.sin(r), y2: 150 - r2 * Math.cos(r),
            stroke: major ? "#c1272d" : "#6b3a3d", "stroke-width": major ? 4 : 2
        }, ticks);
    }
    var dirs = [["N", 150, 16], ["O", 290, 156], ["S", 150, 296], ["W", 10, 156]];
    dirs.forEach(function (p) {
        var tx = el("text", { x: p[1], y: p[2], "class": "svg-dir", "text-anchor": "middle" }, $("top"));
        tx.textContent = p[0];
    });

    /* ---------- tampilan ---------- */
    var barrel = $("barrel"), traj = $("traj"), topDir = $("top-dir");

    function drawSide(deg) {
        var ang = Math.max(0, Math.min(MAX_ELEV, deg));
        barrel.style.transform = "translate(" + PIVOT_X + "px," + PIVOT_Y + "px) rotate(" + (-ang) + "deg)";
        var lab = $("side-label");
        lab.textContent = fmt(ang, 1) + "°";
        var rad = ang * Math.PI / 180;
        var tx = PIVOT_X + BARREL_LEN * Math.cos(rad), ty = PIVOT_Y - BARREL_LEN * Math.sin(rad);
        var range = 440 * Math.sin(2 * rad);
        var ex = tx + Math.max(range, 30), ey = GROUND_Y;
        var cx = (tx + ex) / 2, cy = ty - (90 + 280 * Math.sin(rad));
        traj.setAttribute("d", "M " + tx.toFixed(1) + " " + ty.toFixed(1) +
            " Q " + cx.toFixed(1) + " " + cy.toFixed(1) + " " + ex.toFixed(1) + " " + ey);
    }
    function drawTop(brg) {
        topDir.style.transform = "rotate(" + brg + "deg)";
        $("top-label").textContent = pad3(brg, 1) + "°";
    }

    function fireAnim() {
        var svg = $("side");
        svg.classList.remove("fire");
        void svg.getBoundingClientRect();
        svg.classList.add("fire");
    }

    /* ---------- validasi ---------- */
    function setErr(id, input, msg) {
        $(id).textContent = msg || "";
        if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    }
    function readDist() {
        var v = parse(distEl.value, NUM_DIST);
        if (isNaN(v)) { setErr("dist-err", distEl, "Isi jarak dengan angka, contoh 12,50"); return NaN; }
        if (v < 0 || v > MAX_DIST) { setErr("dist-err", distEl, "Jarak harus antara 0,00 dan 30,00 km"); return NaN; }
        setErr("dist-err", distEl, ""); return v;
    }
    function readBrg() {
        var v = parse(brgEl.value, NUM_BRG);
        if (isNaN(v)) { setErr("brg-err", brgEl, "Isi bearing dengan angka, contoh 225,0"); return NaN; }
        if (v < 0 || v > MAX_BRG) { setErr("brg-err", brgEl, "Bearing harus antara 000,0 dan 360,0 derajat"); return NaN; }
        setErr("brg-err", brgEl, ""); return v;
    }
    function chargeVal() { return parseInt(document.querySelector('input[name="charge"]:checked').value, 10); }
    function ammoVal() { return document.querySelector('input[name="ammo"]:checked').value; }

    /* ---------- stempel, status basi ---------- */
    var results = $("results"), last = null, shown = null;
    function setStamp(text, kind) {
        var st = $("stamp");
        st.textContent = text;
        st.className = "stamp" + (kind ? " stamp--" + kind : "");
    }
    function snapshot() { return [distEl.value, chargeVal(), brgEl.value, ammoVal()].join("|"); }
    function refreshStale() {
        if (!last) return;
        var stale = snapshot() !== last;
        results.classList.toggle("results--stale", stale);
        if (stale) setStamp("Neu berechnen", "stale");
        else if (shown) setStamp(shown.text, shown.kind);
    }

    /* petunjuk jangkauan (hanya petunjuk, tidak mengubah hasil) */
    function refreshHints() {
        var ch = chargeVal();
        $("range-now").textContent = "Charges " + ch + " maks " + pad2(ch * KM_PER_CHARGE, 2) + " km.";
        var v = parse(distEl.value, NUM_DIST);
        document.querySelectorAll("#charges label").forEach(function (lb, i) {
            lb.classList.toggle("is-short", !isNaN(v) && v > (i + 1) * KM_PER_CHARGE + 1e-9);
        });
    }

    /* ---------- hitung (hanya saat tombol ditekan) ---------- */
    function calculate(silent) {
        var dist = readDist(), brg = readBrg();
        if (isNaN(dist) || isNaN(brg)) {
            setStamp("Eingabe prüfen", "bad");
            $("copy").disabled = true;
            return false;
        }
        var charge = chargeVal(), ammo = ammoVal();
        var elev = (dist * 12) / charge;
        var warn = $("warn"), box = document.querySelector(".results .readout");

        $("out-brg").textContent = pad3(brg, 1);
        $("out-ammo").textContent = ammo;
        drawTop(brg);
        last = snapshot();
        results.classList.remove("results--stale");

        if (elev > MAX_ELEV + 1e-9) {
            $("out-elev").textContent = "--,--";
            $("out-note").textContent = "Elevasi " + fmt(elev, 2) + "° melebihi batas 60,00°";
            var need = Math.ceil(dist * 12 / MAX_ELEV - 1e-9);
            var minCh = Math.max(need, charge + 1);
            warn.textContent = "Charges " + charge + " hanya sampai " + pad2(charge * KM_PER_CHARGE, 2) +
                " km. Untuk " + pad2(dist, 2) + " km pakai Charges " + minCh + " atau lebih.";
            box.classList.add("readout--bad");
            shown = { text: "Außer Reichweite", kind: "bad" };
            setStamp(shown.text, shown.kind);
            $("copy").disabled = true;
            return true;
        }
        $("out-elev").textContent = pad2(elev, 2);
        $("out-note").textContent = "Batas elevasi turret 00,00° sampai 60,00°";
        warn.textContent = "";
        box.classList.remove("readout--bad");
        shown = { text: "Feuerbereit", kind: "" };
        setStamp(shown.text, shown.kind);
        $("copy").disabled = false;
        drawSide(elev);
        if (!silent) fireAnim();
        return true;
    }

    /* ---------- event ---------- */
    function onFieldInput(input, errId) {
        input.addEventListener("input", function () { setErr(errId, input, ""); refreshHints(); refreshStale(); });
    }
    onFieldInput(distEl, "dist-err");
    onFieldInput(brgEl, "brg-err");

    distEl.addEventListener("blur", function () {
        var v = parse(distEl.value, NUM_DIST);
        if (!isNaN(v) && v >= 0 && v <= MAX_DIST) distEl.value = pad2(v, 2);
        readDist(); refreshHints(); refreshStale();
    });
    brgEl.addEventListener("blur", function () {
        var v = parse(brgEl.value, NUM_BRG);
        if (!isNaN(v) && v >= 0 && v <= MAX_BRG) brgEl.value = pad3(v, 1);
        readBrg(); refreshStale();
    });
    [distEl, brgEl].forEach(function (i) { i.addEventListener("focus", function () { i.select(); }); });

    $("calc").addEventListener("change", function () { refreshHints(); refreshStale(); });
    $("calc").addEventListener("submit", function (e) {
        e.preventDefault();
        // rapikan format sebelum dihitung
        var dv = parse(distEl.value, NUM_DIST), bv = parse(brgEl.value, NUM_BRG);
        if (!isNaN(dv) && dv >= 0 && dv <= MAX_DIST) distEl.value = pad2(dv, 2);
        if (!isNaN(bv) && bv >= 0 && bv <= MAX_BRG) brgEl.value = pad3(bv, 1);
        calculate(false);
    });

    $("copy").addEventListener("click", function () {
        var btn = this;
        var text = "ELEV " + $("out-elev").textContent + "°" +
            " | BRG " + $("out-brg").textContent + "° | " + $("out-ammo").textContent;
        function done(msg) {
            btn.textContent = msg;
            setTimeout(function () { btn.textContent = "Salin hasil"; }, 1600);
        }
        try {
            navigator.clipboard.writeText(text).then(function () { done("Tersalin"); }, function () { done("Gagal menyalin"); });
        } catch (err) { done("Gagal menyalin"); }
    });

    /* tab modul */
    var tabs = document.querySelectorAll(".tab");
    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            tabs.forEach(function (t) { t.classList.remove("is-active"); });
            document.querySelectorAll(".module").forEach(function (m) { m.classList.remove("is-active"); });
            tab.classList.add("is-active");
            $(tab.dataset.target).classList.add("is-active");
        });
    });

    refreshHints();
    calculate(true);   // hitungan awal dengan nilai bawaan, tanpa animasi tembak
})();
