(function () {
    "use strict";

    var $ = function (id) { return document.getElementById(id); };
    var audio = $("d-audio"), deck = $("deck"), turntable = $("turntable"), platterVinyl = $("vinyl");
    var crate = $("crate"), row = $("crate-row"), emptyMsg = $("crate-empty");
    var openBtn = $("d-open"), fileInput = $("d-file");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var AUDIO_EXT = /\.(mp3|ogg|oga|opus|wav|m4a|aac|flac|weba)$/i;
    var LABELS = ["#c1272d", "#b8893a", "#56633f", "#7d2a2f", "#8d9296", "#a8431f"];
    var PLAY_D = "M7 4v16l13-8z", PAUSE_D = "M6 4h4v16H6zM14 4h4v16h-4z";
    var tracks = [], idx = -1, loopMode = "all", seeking = false;

    function cleanName(n) { return String(n).replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim(); }
    function enc(path) { return path.split("/").map(encodeURIComponent).join("/"); }
    function say(msg) { $("d-status").textContent = msg; }
    function mmss(t) {
        if (!isFinite(t)) t = 0;
        var m = Math.floor(t / 60), s = Math.floor(t % 60);
        return m + ":" + (s < 10 ? "0" : "") + s;
    }

    /* ---------- daftar lagu dari folder music/ (music/playlist.js) ---------- */
    (window.KENWAY_PLAYLIST || []).forEach(function (it) {
        var file = typeof it === "string" ? it : (it && it.file);
        if (!file) return;
        tracks.push({
            title: (it && it.title) || cleanName(file),
            sub: (it && it.artist) || "Folder music",
            src: enc(file)
        });
    });

    /* ---------- tampilan ---------- */
    function labelColor(i) { return LABELS[i % LABELS.length]; }

    function renderCrate() {
        row.innerHTML = "";
        tracks.forEach(function (t, i) {
            var b = document.createElement("button");
            b.type = "button";
            b.className = "rec" + (i === idx ? " rec--current" : "");
            b.setAttribute("role", "option");
            b.setAttribute("aria-selected", i === idx ? "true" : "false");
            b.dataset.i = i;
            b.style.setProperty("--lab", labelColor(i));
            b.style.zIndex = i + 1;
            b.innerHTML = '<span class="vinyl vinyl--sm"><span class="vinyl__label"><b>' + (i + 1) + '</b></span></span>' +
                '<span class="rec__cap"></span>';
            b.querySelector(".rec__cap").textContent = t.title;
            b.setAttribute("aria-label", "Piringan " + (i + 1) + ": " + t.title);
            row.appendChild(b);
        });
        emptyMsg.hidden = tracks.length > 0;
        row.hidden = tracks.length === 0;
    }

    function setPlayIcon(playing) {
        $("d-play-ico").setAttribute("d", playing ? PAUSE_D : PLAY_D);
        $("d-play").setAttribute("aria-label", playing ? "Jeda" : "Putar");
        turntable.classList.toggle("turntable--playing", playing);
        deck.classList.toggle("deck--playing", playing);
    }

    function showTrack() {
        var t = tracks[idx];
        $("d-title").textContent = t ? t.title : "Belum ada lagu";
        $("d-sub").textContent = t ? t.sub : "Feldradio";
        deck.style.setProperty("--lab", t ? labelColor(idx) : "#c1272d");
        Array.prototype.forEach.call(row.children, function (b, i) {
            b.classList.toggle("rec--current", i === idx);
            b.setAttribute("aria-selected", i === idx ? "true" : "false");
        });
        if ("mediaSession" in navigator && t) {
            try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.sub, album: "Kenway Feldradio" }); } catch (e) { /* abaikan */ }
        }
    }

    /* ---------- kontrol pemutaran ---------- */
    function load(i, autoplay) {
        if (!tracks.length) return;
        idx = ((i % tracks.length) + tracks.length) % tracks.length;
        audio.src = tracks[idx].src;
        $("d-seek").value = 0;
        $("d-time").textContent = "0:00 / 0:00";
        showTrack();
        if (autoplay) {
            var p = audio.play();
            if (p && p.catch) p.catch(function () { say("Tekan tombol putar untuk memulai musik."); });
        }
    }
    function toggle() {
        if (!tracks.length) { openCrate(); return; }
        if (idx < 0) { load(0, true); return; }
        if (audio.paused) {
            var p = audio.play();
            if (p && p.catch) p.catch(function () { say("Lagu tidak bisa diputar."); });
        } else audio.pause();
    }
    function step(dir, fromEnd) {
        if (!tracks.length) return;
        var n = idx + dir;
        if (fromEnd && loopMode === "off" && (n >= tracks.length || n < 0)) { audio.pause(); audio.currentTime = 0; return; }
        load(n, !audio.paused || !!fromEnd);
    }

    audio.addEventListener("play", function () { setPlayIcon(true); });
    audio.addEventListener("pause", function () { setPlayIcon(false); });
    audio.addEventListener("loadedmetadata", function () {
        $("d-seek").max = Math.floor(audio.duration) || 0;
        $("d-time").textContent = mmss(audio.currentTime) + " / " + mmss(audio.duration);
    });
    audio.addEventListener("timeupdate", function () {
        if (!seeking) $("d-seek").value = Math.floor(audio.currentTime);
        $("d-time").textContent = mmss(audio.currentTime) + " / " + mmss(audio.duration);
    });
    audio.addEventListener("ended", function () {
        if (loopMode === "one") { audio.currentTime = 0; audio.play(); }
        else step(1, true);
    });
    audio.addEventListener("error", function () {
        if (idx >= 0) say("Tidak bisa memutar \"" + tracks[idx].title + "\". Periksa nama file dan formatnya.");
        setPlayIcon(false);
    });

    $("d-play").addEventListener("click", toggle);
    $("d-prev").addEventListener("click", function () {
        if (audio.currentTime > 3) audio.currentTime = 0; else step(-1, false);
    });
    $("d-next").addEventListener("click", function () { step(1, false); });

    var seek = $("d-seek");
    seek.addEventListener("input", function () { seeking = true; $("d-time").textContent = mmss(seek.value) + " / " + mmss(audio.duration); });
    seek.addEventListener("change", function () { audio.currentTime = parseFloat(seek.value); seeking = false; });

    /* ---------- dial volume (setengah lingkaran) ---------- */
    var dial = $("d-dial"), knob = $("d-knob"), levelArc = $("d-level");
    var volume = 0.6, muted = false;
    try { var sv = parseFloat(localStorage.getItem("kenway-vol")); if (!isNaN(sv)) volume = Math.max(0, Math.min(1, sv)); } catch (e) { /* abaikan */ }

    function applyVolume() {
        audio.volume = muted ? 0 : volume;
        knob.style.transform = "rotate(" + (volume * 180) + "deg)";
        levelArc.setAttribute("stroke-dasharray", (volume * 100) + " 100");
        $("d-waves").style.opacity = muted ? 0 : 1;
        $("d-mute").style.opacity = muted ? 1 : 0;
        var pct = Math.round(volume * 100);
        dial.setAttribute("aria-valuenow", pct);
        dial.setAttribute("aria-valuetext", muted ? "Senyap" : pct + " persen");
    }
    function setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        muted = false;
        applyVolume();
        try { localStorage.setItem("kenway-vol", String(volume)); } catch (e) { /* abaikan */ }
    }
    function toggleMute() { muted = !muted; applyVolume(); }
    function pointerVolume(e) {
        var r = dial.getBoundingClientRect();
        var x = (e.clientX - r.left) * (200 / r.width) - 100, y = (e.clientY - r.top) * (120 / r.height) - 104;
        var ang = y > 0 ? (x < 0 ? Math.PI : 0) : Math.atan2(-y, x);
        return 1 - Math.max(0, Math.min(Math.PI, ang)) / Math.PI;
    }
    var dialMode = null;
    dial.addEventListener("pointerdown", function (e) {
        var r = dial.getBoundingClientRect();
        var x = (e.clientX - r.left) * (200 / r.width) - 100, y = (e.clientY - r.top) * (120 / r.height) - 104;
        try { dial.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }
        if (Math.sqrt(x * x + y * y) < 40) { dialMode = "hub"; return; }
        dialMode = "drag";
        setVolume(pointerVolume(e));
        dial.focus({ preventScroll: true });
        e.preventDefault();
    });
    dial.addEventListener("pointermove", function (e) { if (dialMode === "drag") setVolume(pointerVolume(e)); });
    dial.addEventListener("pointerup", function (e) {
        if (dialMode === "hub") {
            var r = dial.getBoundingClientRect();
            var x = (e.clientX - r.left) * (200 / r.width) - 100, y = (e.clientY - r.top) * (120 / r.height) - 104;
            if (Math.sqrt(x * x + y * y) < 40) toggleMute();
        }
        dialMode = null;
    });
    dial.addEventListener("pointercancel", function () { dialMode = null; });
    dial.addEventListener("wheel", function (e) { e.preventDefault(); setVolume(volume + (e.deltaY < 0 ? 0.05 : -0.05)); }, { passive: false });
    dial.addEventListener("keydown", function (e) {
        var k = e.key, h = true;
        if (k === "ArrowRight" || k === "ArrowUp") setVolume(volume + 0.05);
        else if (k === "ArrowLeft" || k === "ArrowDown") setVolume(volume - 0.05);
        else if (k === "PageUp") setVolume(volume + 0.1);
        else if (k === "PageDown") setVolume(volume - 0.1);
        else if (k === "Home") setVolume(0);
        else if (k === "End") setVolume(1);
        else if (k === "m" || k === "M") toggleMute();
        else h = false;
        if (h) e.preventDefault();
    });
    applyVolume();

    var LOOPS = { all: "Ulang: semua", one: "Ulang: satu", off: "Ulang: mati" };
    $("d-loop").addEventListener("click", function () {
        loopMode = loopMode === "all" ? "one" : loopMode === "one" ? "off" : "all";
        this.textContent = LOOPS[loopMode];
    });

    if ("mediaSession" in navigator) {
        try {
            navigator.mediaSession.setActionHandler("play", toggle);
            navigator.mediaSession.setActionHandler("pause", toggle);
            navigator.mediaSession.setActionHandler("previoustrack", function () { step(-1, false); });
            navigator.mediaSession.setActionHandler("nexttrack", function () { step(1, false); });
        } catch (e) { /* abaikan */ }
    }

    /* ---------- rak piringan (ganti lagu) ---------- */
    function openCrate() {
        crate.hidden = false;
        openBtn.setAttribute("aria-expanded", "true");
        openBtn.textContent = "Tutup rak";
        fitBody();
        var cur = row.querySelector(".rec--current") || row.firstElementChild;
        if (cur) {
            try { cur.scrollIntoView({ inline: "center", block: "nearest", behavior: "auto" }); } catch (e) { /* abaikan */ }
            cur.focus({ preventScroll: true });
        }
    }
    function closeCrate() {
        crate.hidden = true;
        openBtn.setAttribute("aria-expanded", "false");
        openBtn.textContent = "Ganti lagu";
        fitBody();
    }
    openBtn.addEventListener("click", function () { if (crate.hidden) openCrate(); else closeCrate(); });
    $("c-close").addEventListener("click", function () { closeCrate(); openBtn.focus(); });
    $("c-prev").addEventListener("click", function () { row.scrollBy({ left: -260, behavior: reduce ? "auto" : "smooth" }); });
    $("c-next").addEventListener("click", function () { row.scrollBy({ left: 260, behavior: reduce ? "auto" : "smooth" }); });
    $("c-add").addEventListener("click", function () { fileInput.click(); });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && !crate.hidden) { closeCrate(); openBtn.focus(); }
    });

    // seret untuk menggeser rak (mouse); roda mouse menggeser ke samping
    var drag = null, moved = false;
    row.addEventListener("pointerdown", function (e) {
        if (e.pointerType !== "mouse" || e.button !== 0) return;
        drag = { x: e.clientX, left: row.scrollLeft }; moved = false;
    });
    window.addEventListener("pointermove", function (e) {
        if (!drag) return;
        var dx = e.clientX - drag.x;
        if (Math.abs(dx) > 5) { moved = true; row.classList.add("is-dragging"); }
        if (moved) row.scrollLeft = drag.left - dx;
    });
    window.addEventListener("pointerup", function () { drag = null; row.classList.remove("is-dragging"); });
    row.addEventListener("click", function (e) {
        if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
    row.addEventListener("wheel", function (e) {
        if (row.scrollWidth <= row.clientWidth) return;
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { row.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
    row.addEventListener("keydown", function (e) {
        var cur = document.activeElement;
        if (!cur || !cur.classList.contains("rec")) return;
        var tgt = null;
        if (e.key === "ArrowRight") tgt = cur.nextElementSibling;
        else if (e.key === "ArrowLeft") tgt = cur.previousElementSibling;
        else if (e.key === "Home") tgt = row.firstElementChild;
        else if (e.key === "End") tgt = row.lastElementChild;
        if (tgt) { e.preventDefault(); tgt.focus(); }
    });

    // pilih piringan: terbang ke piringan putar
    function flyToPlatter(a, lab, srcVinyl, done) {
        if (reduce || !srcVinyl.animate) { done(); return; }
        var b = platterVinyl.getBoundingClientRect();
        var clone = srcVinyl.cloneNode(true);
        clone.classList.add("vinyl--fly");
        clone.style.cssText = "position:fixed;left:" + a.left + "px;top:" + a.top + "px;width:" + a.width + "px;height:" + a.height +
            "px;margin:0;z-index:80;pointer-events:none;--lab:" + lab;
        document.body.appendChild(clone);
        platterVinyl.classList.add("vinyl--hide");
        var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
        var sc = b.width / a.width;
        var anim = clone.animate([
            { transform: "translate(0,0) scale(1) rotate(0deg)" },
            { transform: "translate(" + (dx * 0.5) + "px," + (dy * 0.5 - 50) + "px) scale(" + ((1 + sc) / 2) + ") rotate(200deg)", offset: 0.55 },
            { transform: "translate(" + dx + "px," + dy + "px) scale(" + sc + ") rotate(360deg)" }
        ], { duration: 580, easing: "cubic-bezier(.3,.7,.2,1)" });
        var finished = false;
        function end() {
            if (finished) return;
            finished = true;
            clone.remove();
            platterVinyl.classList.remove("vinyl--hide");
            done();
        }
        anim.onfinish = end;
        anim.oncancel = end;
    }

    row.addEventListener("click", function (e) {
        var rec = e.target.closest(".rec");
        if (!rec) return;
        var i = parseInt(rec.dataset.i, 10);
        if (i === idx) { closeCrate(); if (audio.paused) toggle(); return; }
        var v = rec.querySelector(".vinyl");
        var a = v.getBoundingClientRect();
        var lab = rec.style.getPropertyValue("--lab");
        closeCrate();
        flyToPlatter(a, lab, v, function () { load(i, true); });
    });

    /* ---------- tambah file dari komputer ---------- */
    function addFiles(list) {
        var added = 0, first = tracks.length;
        Array.prototype.forEach.call(list, function (f) {
            if (!((f.type && f.type.indexOf("audio/") === 0) || AUDIO_EXT.test(f.name))) return;
            tracks.push({ title: cleanName(f.name), sub: "Dari komputer", src: URL.createObjectURL(f) });
            added++;
        });
        if (!added) { say("Tidak ada file audio yang dikenali."); return; }
        renderCrate();
        say(added + " lagu ditambahkan.");
        if (idx < 0 || audio.paused && !audio.currentTime) load(first, true);
    }
    fileInput.addEventListener("change", function () { addFiles(fileInput.files); fileInput.value = ""; });
    document.addEventListener("dragover", function (e) {
        if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types, "Files") >= 0) { e.preventDefault(); deck.classList.add("deck--drop"); }
    });
    document.addEventListener("dragleave", function (e) { if (!e.relatedTarget) deck.classList.remove("deck--drop"); });
    document.addEventListener("drop", function (e) {
        if (!e.dataTransfer || !e.dataTransfer.files.length) return;
        e.preventDefault(); deck.classList.remove("deck--drop"); addFiles(e.dataTransfer.files);
    });

    /* ruang bawah halaman agar footer tidak tertutup dek */
    function fitBody() {
        if (deck.classList.contains("deck--collapsed")) { document.body.style.paddingBottom = "88px"; return; }
        var bar = deck.querySelector(".deck__bar");
        document.body.style.paddingBottom = (bar.offsetHeight + 24) + "px";
    }
    if (window.ResizeObserver) new ResizeObserver(fitBody).observe(deck.querySelector(".deck__bar"));
    window.addEventListener("resize", fitBody);

    /* ---------- sembunyikan / buka dek ---------- */
    function setCollapsed(c, focusIt) {
        if (c) closeCrate();
        deck.classList.toggle("deck--collapsed", c);
        $("d-hide").setAttribute("aria-expanded", c ? "false" : "true");
        $("d-show").setAttribute("aria-expanded", c ? "false" : "true");
        try { localStorage.setItem("kenway-deck", c ? "hidden" : "open"); } catch (e) { /* abaikan */ }
        fitBody();
        if (focusIt) (c ? $("d-show") : $("d-hide")).focus();
    }
    $("d-hide").addEventListener("click", function () { setCollapsed(true, true); });
    $("d-show").addEventListener("click", function () { setCollapsed(false, true); });
    try { if (localStorage.getItem("kenway-deck") === "hidden") setCollapsed(true, false); } catch (e) { /* abaikan */ }

    renderCrate();
    if (tracks.length) { idx = 0; load(0, false); }
    fitBody();
})();
