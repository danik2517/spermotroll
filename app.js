// Логика. Просто и без сюрпризов.

(function () {
  "use strict";

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseBday(str) {
    var p = String(str).split(".");
    return { d: parseInt(p[0], 10), m: parseInt(p[1], 10), y: parseInt(p[2], 10) };
  }

  // Возвращает { days, next } — сколько дней до ближайшего ДР и дата этого ДР
  function nextBirthday(b, today) {
    var t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var next = new Date(t.getFullYear(), b.m - 1, b.d);
    if (next < t) next = new Date(t.getFullYear() + 1, b.m - 1, b.d);
    var days = Math.round((next - t) / 86400000);
    return { days: days, next: next };
  }

  // Сколько лет исполнится на этом ДР
  function ageAt(b, nextDate) {
    return nextDate.getFullYear() - b.y;
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  // "сегодня" / "завтра" / "через 3 дня" / "через 12 дней"
  function daysText(n) {
    if (n === 0) return "сегодня";
    if (n === 1) return "завтра";
    return "через " + n + " " + plural(n, "день", "дня", "дней");
  }

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function shortDate(b) {
    return pad2(b.d) + "." + pad2(b.m);
  }

  function fullDate(b) {
    return pad2(b.d) + "." + pad2(b.m) + "." + b.y;
  }

  function yandexLink(addr) {
    return "https://yandex.ru/maps/?text=" + encodeURIComponent(addr);
  }

  // --- render ---

  function renderNearest(top) {
    var el = document.getElementById("nearest");
    if (!el) return;
    if (!top) { el.innerHTML = ""; return; }

    var realAge = ageAt(top.b, top.next);
    el.innerHTML =
      '<div class="nearest">' +
        '<div class="nearest-label">ближайший день рождения</div>' +
        '<div class="nearest-name">' + esc(top.t.name) + '</div>' +
        '<div class="nearest-meta">' + fullDate(top.b) + " &middot; исполнится " + realAge + '</div>' +
        '<div class="nearest-days">' + daysText(top.days) + '</div>' +
      '</div>';
  }

  function renderBdayList(list, today) {
    var el = document.getElementById("bday-list");
    var cnt = document.getElementById("bday-count");
    if (cnt) cnt.textContent = "// " + list.length + " шт";
    if (!el) return;

    var td = today.getDate();
    var tm = today.getMonth() + 1;
    var html = "";

    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var isToday = it.b.d === td && it.b.m === tm;
      var cls = "bday-item" + (isToday ? " is-today" : "");
      var badge = it.days === 0 ? "сегодня" : (it.days === 1 ? "завтра" : "+" + it.days + " " + plural(it.days, "день", "дня", "дней"));

      html +=
        '<div class="' + cls + '">' +
          '<div>' +
            '<div class="bname">' + esc(it.t.name) + '</div>' +
            '<div class="bdate">' + shortDate(it.b) + '</div>' +
          '</div>' +
          '<div class="bdays">' + badge + '</div>' +
        '</div>';
    }
    el.innerHTML = html;
  }

  function renderPvz() {
    var el = document.getElementById("pvz-list");
    if (!el) return;
    var html = "";

    for (var i = 0; i < TROLLS.length; i++) {
      var t = TROLLS[i];
      var rows = "";
      if (t.wb || t.ozon) {
        rows += row("wb", "WB", t.wb);
        rows += row("ozon", "OZON", t.ozon);
      } else {
        rows = '<div class="pvz-no-address">// нет адресов</div>';
      }
      html +=
        '<div class="pvz-card">' +
          '<div class="pvz-name">' + esc(t.name) + '</div>' +
          rows +
        '</div>';
    }
    el.innerHTML = html;
  }

  function row(shop, label, addr) {
    var body;
    if (addr) {
      body = '<a class="pvz-address" target="_blank" rel="noopener noreferrer" href="' +
             yandexLink(addr) + '">' + esc(addr) + '</a>';
    } else {
      body = '<span class="pvz-empty">// адрес не указан</span>';
    }
    return '<div class="pvz-row">' +
             '<span class="pvz-shop ' + shop + '">' + label + '</span>' +
             '<div class="pvz-body">' + body + '</div>' +
           '</div>';
  }

  // --- tabs ---

  function initTabs() {
    var tabs = document.querySelectorAll(".tab");
    var panels = document.querySelectorAll(".panel");

    function switchTo(name) {
      var i;
      for (i = 0; i < tabs.length; i++) {
        var on = tabs[i].getAttribute("data-tab") === name;
        tabs[i].className = on ? "tab is-active" : "tab";
      }
      for (i = 0; i < panels.length; i++) {
        var pid = panels[i].id;
        panels[i].className = (pid === "panel-" + name) ? "panel is-active" : "panel";
      }
    }

    for (var i = 0; i < tabs.length; i++) {
      (function (tab) {
        tab.addEventListener("click", function () {
          switchTo(tab.getAttribute("data-tab"));
        });
      })(tabs[i]);
    }
  }

  // --- init ---

  function init() {
    var today = new Date();
    var list = [];

    for (var i = 0; i < TROLLS.length; i++) {
      var b = parseBday(TROLLS[i].birthday);
      var info = nextBirthday(b, today);
      list.push({ t: TROLLS[i], b: b, days: info.days, next: info.next });
    }

    list.sort(function (a, b) { return a.days - b.days; });

    renderNearest(list[0]);
    renderBdayList(list, today);
    renderPvz();
    initTabs();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
