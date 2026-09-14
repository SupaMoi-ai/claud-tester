/* Vestbillett — a working transit-ticket app built as a stage prop.
   Fictional operator. No network: everything is local and works in airplane
   mode, which is what a phone on stage needs. */
(() => {
  "use strict";

  /* ==========================================================
     1. Reference data
     ========================================================== */

  const ZONES = [
    { n: 1, key: "z1", name: "Nord-Jæren", nameNo: "Nord-Jæren" },
    { n: 2, key: "z2", name: "Nord-Jæren – Sør-Jæren", nameNo: "Nord-Jæren – Sør-Jæren" },
    { n: 3, key: "z3", name: "Nord-Jæren – Dalane", nameNo: "Nord-Jæren – Dalane" },
  ];

  // Fares in øre. Single-ticket adult / 1 zone = kr 49.00, of which 12 % VAT
  // = kr 5.25 — the same arithmetic a Norwegian transport fare uses.
  const PRODUCTS = [
    { id: "single", base: { 1: 4900, 2: 7300, 3: 9800 }, minutes: { 1: 60, 2: 90, 3: 120 } },
    { id: "day24", base: { 1: 13000, 2: 19000, 3: 24000 }, minutes: { 1: 1440, 2: 1440, 3: 1440 } },
    { id: "period30", base: { 1: 61000, 2: 89000, 3: 112000 }, minutes: { 1: 43200, 2: 43200, 3: 43200 } },
  ];

  const TRAVELLERS = [
    { id: "adult", mult: 1 },
    { id: "child", mult: 0.5 },
    { id: "student", mult: 0.6 },
    { id: "senior", mult: 0.5 },
  ];

  const VAT_RATE = 0.12;

  const STATIONS = [
    ["Byterminalen", 59.5, 32],
    ["Stavanger stasjon", 58.9, 28],
    ["Domkirkeplassen", 220, 20],
    ["Vågen", 340, 16],
    ["Kannik", 700, 18],
    ["Bjergsted", 950, 14],
    ["Mosvatnet nord", 1300, 12],
    ["Universitetet i Stavanger", 4200, 30],
    ["Hillevåg torg", 2600, 16],
    ["Storhaug skole", 1800, 12],
    ["Jåttåvågen", 5400, 20],
    ["Sandnes sentrum", 12800, 24],
    ["Tjensvoll", 2900, 14],
    ["Hinna park", 6100, 18],
  ].map(([name, dist, cap]) => ({ name, dist, cap }));

  /* ==========================================================
     2. Copy (English default — matches the app in the recording)
     ========================================================== */

  const STR = {
    en: {
      tabTickets: "Tickets", tabBike: "City Bike", tabMore: "More",
      tickets: "Tickets", valid: "Valid", expired: "Expired", expiring: "Expiring",
      notStarted: "Starts later",
      activeTickets: "Active", earlierTickets: "Earlier tickets",
      noTickets: "No active tickets",
      noTicketsBody: "Buy a ticket before you board. It is valid the moment you pay.",
      buyTicket: "Buy ticket", buyAnother: "Buy another ticket",
      singleTicket: "Single ticket", day24: "24-hour ticket", period30: "Period ticket, 30 days",
      singleSub: "Valid for one journey with transfers",
      day24Sub: "Unlimited travel for 24 hours",
      period30Sub: "Unlimited travel for 30 days",
      adult: "Adult", child: "Child", student: "Student", senior: "Senior",
      adult_p: "Adults", child_p: "Children", student_p: "Students", senior_p: "Seniors",
      adultSub: "From 20 years", childSub: "4–19 years", studentSub: "With valid student ID", seniorSub: "From 67 years",
      expiresIn: "EXPIRES IN", min: "min", sec: "sec", hrs: "hrs", days: "days",
      travellers: "TRAVELLERS", validIn: "VALID IN",
      coversLink: "See which means of transport this ticket covers.",
      hideDetails: "Hide details", showDetails: "Show details",
      expiresOn: "Expires", purchasedOn: "Purchased",
      priceLine: "Price kr {price} of which VAT kr {vat}",
      paidWith: "Paid with {method}", ticketId: "Ticket ID: {id}",
      receipt: "Receipt", inspection: "Inspection", close: "Close", back: "Back",
      ticketExpired: "This ticket has expired",
      screenshotWarn: "Screen capture of a ticket is not a valid ticket.",
      chooseTicket: "Choose ticket", chooseTravellers: "Travellers", chooseZone: "Zones",
      review: "Confirm", next: "Next", cancel: "Cancel",
      zone1: "1 zone", zone2: "2 zones", zone3: "3 zones",
      validFor: "Valid for {n}",
      total: "Total", vatLine: "of which VAT (12 %)", product: "Ticket",
      payWith: "Pay kr {price} with Kvikk",
      fineprint: "The ticket is valid from the moment of purchase and cannot be refunded. Keep it available for inspection for the whole journey.",
      paySlide: "Slide to pay", payConfirming: "Confirming payment…", payApproved: "Payment approved",
      payTo: "To Vestbillett AS",
      ticketReady: "Ticket activated", ticketReadySub: "{what} — valid until {time}",
      expiryWarnTitle: "Ticket expires soon", expiryWarnSub: "{n} minutes left on your {what}",
      expiredToastTitle: "Ticket expired", expiredToastSub: "Buy a new ticket before you board again",
      bikeLoading: "Fetching bikes and docking stations…",
      bikeTitle: "City Bike", bikeNear: "Docking stations near you",
      bikeHeroTitle: "Your subscription is active", bikeHeroBody: "Unlimited 60-minute trips. Started 3 March 2026.",
      bikes: "BIKES", bike1: "BIKE", docks: "DOCKS", searchStations: "Search stations",
      unlock: "Unlock bike", noBikes: "No bikes available", station: "Station",
      returnAny: "Return the bike to any station within 60 minutes.",
      more: "More", profile: "Profile", paymentMethods: "Payment methods",
      travelHistory: "Travel history", language: "Language", appearance: "Appearance",
      notifications: "Notifications", help: "Help and contact", about: "About Vestbillett",
      light: "Light", dark: "Dark", system: "Auto",
      english: "English", norwegian: "Norsk",
      expiryReminder: "Expiry reminder", expiryReminderSub: "Warn me 5 minutes before a ticket expires",
      historyTitle: "Travel history", historyEmpty: "No tickets yet",
      aboutBody: "Vestbillett is a <b>theatre prop</b> built for a school play. It is not a real transport company and its tickets are not valid on any real service.",
      version: "Version 4.12.2 (prop build)",
      stagePanel: "Stage controls", stageOpen: "Stage controls unlocked",
      stageIntro: "Cue the app from backstage. Nothing here shows on the ticket screens.",
      stageClock: "Clock offset (minutes)", stageFreeze: "Freeze countdown",
      stageGive: "Give a fresh ticket", stageMinutes: "Minutes left",
      stageExpire: "Expire the active ticket", stageReset: "Reset the app",
      apply: "Apply", done: "Done",
      receiptTitle: "Receipt", receiptOrg: "Vestbillett AS · Org. no. 987 654 321 MVA",
      receiptFoot: "This is a receipt for a purchase, not a travel document.",
      coversTitle: "Means of transport",
      coversBody: "This ticket is valid on all buses, the city ferry and the local train inside the selected zones. It is not valid on express coaches or the airport bus.",
      qty: "Quantity", ticketFor: "Ticket for",
      kvikk: "Kvikk", vestbillett: "Vestbillett",
      confirmReset: "Reset the app and delete all tickets?",
    },
    no: {
      tabTickets: "Billetter", tabBike: "Bysykkel", tabMore: "Mer",
      tickets: "Billetter", valid: "Gyldig", expired: "Utløpt", expiring: "Utløper snart",
      notStarted: "Starter senere",
      activeTickets: "Aktive", earlierTickets: "Tidligere billetter",
      noTickets: "Ingen aktive billetter",
      noTicketsBody: "Kjøp billett før du går om bord. Den gjelder fra du betaler.",
      buyTicket: "Kjøp billett", buyAnother: "Kjøp ny billett",
      singleTicket: "Enkeltbillett", day24: "24-timersbillett", period30: "Periodebillett, 30 dager",
      singleSub: "Gjelder én reise med overgang",
      day24Sub: "Ubegrenset reise i 24 timer",
      period30Sub: "Ubegrenset reise i 30 dager",
      adult: "Voksen", child: "Barn", student: "Student", senior: "Honnør",
      adult_p: "Voksne", child_p: "Barn", student_p: "Studenter", senior_p: "Honnør",
      adultSub: "Fra 20 år", childSub: "4–19 år", studentSub: "Med gyldig studentbevis", seniorSub: "Fra 67 år",
      expiresIn: "UTLØPER OM", min: "min", sec: "sek", hrs: "timer", days: "dager",
      travellers: "REISENDE", validIn: "GJELDER I",
      coversLink: "Se hvilke transportmidler denne billetten gjelder for.",
      hideDetails: "Skjul detaljer", showDetails: "Vis detaljer",
      expiresOn: "Utløper", purchasedOn: "Kjøpt",
      priceLine: "Pris kr {price} hvorav mva. kr {vat}",
      paidWith: "Betalt med {method}", ticketId: "Billett-ID: {id}",
      receipt: "Kvittering", inspection: "Kontroll", close: "Lukk", back: "Tilbake",
      ticketExpired: "Denne billetten har utløpt",
      screenshotWarn: "Skjermbilde av en billett er ikke en gyldig billett.",
      chooseTicket: "Velg billett", chooseTravellers: "Reisende", chooseZone: "Soner",
      review: "Bekreft", next: "Neste", cancel: "Avbryt",
      zone1: "1 sone", zone2: "2 soner", zone3: "3 soner",
      validFor: "Gyldig i {n}",
      total: "Totalt", vatLine: "hvorav mva. (12 %)", product: "Billett",
      payWith: "Betal kr {price} med Kvikk",
      fineprint: "Billetten gjelder fra kjøpsøyeblikket og refunderes ikke. Ha den tilgjengelig for kontroll under hele reisen.",
      paySlide: "Dra for å betale", payConfirming: "Bekrefter betaling…", payApproved: "Betaling godkjent",
      payTo: "Til Vestbillett AS",
      ticketReady: "Billett aktivert", ticketReadySub: "{what} — gyldig til {time}",
      expiryWarnTitle: "Billetten utløper snart", expiryWarnSub: "{n} minutter igjen på {what}",
      expiredToastTitle: "Billetten utløp", expiredToastSub: "Kjøp ny billett før du reiser videre",
      bikeLoading: "Henter sykler og stativ…",
      bikeTitle: "Bysykkel", bikeNear: "Stativ i nærheten",
      bikeHeroTitle: "Abonnementet ditt er aktivt", bikeHeroBody: "Ubegrenset antall turer på 60 minutter. Startet 3. mars 2026.",
      bikes: "SYKLER", bike1: "SYKKEL", docks: "PLASSER", searchStations: "Søk etter stativ",
      unlock: "Lås opp sykkel", noBikes: "Ingen ledige sykler", station: "Stativ",
      returnAny: "Lever sykkelen i et hvilket som helst stativ innen 60 minutter.",
      more: "Mer", profile: "Profil", paymentMethods: "Betalingsmåter",
      travelHistory: "Reisehistorikk", language: "Språk", appearance: "Utseende",
      notifications: "Varsler", help: "Hjelp og kontakt", about: "Om Vestbillett",
      light: "Lyst", dark: "Mørkt", system: "Auto",
      english: "English", norwegian: "Norsk",
      expiryReminder: "Varsel før utløp", expiryReminderSub: "Varsle meg 5 minutter før billetten utløper",
      historyTitle: "Reisehistorikk", historyEmpty: "Ingen billetter ennå",
      aboutBody: "Vestbillett er en <b>teaterrekvisitt</b> laget til et skolestykke. Det er ikke et ekte transportselskap, og billettene gjelder ikke på noen ekte reise.",
      version: "Versjon 4.12.2 (rekvisitt)",
      stagePanel: "Sceneregi", stageOpen: "Sceneregi låst opp",
      stageIntro: "Styr appen fra backstage. Ingenting herfra vises på billettskjermene.",
      stageClock: "Klokkeforskyvning (minutter)", stageFreeze: "Frys nedtellingen",
      stageGive: "Gi en fersk billett", stageMinutes: "Minutter igjen",
      stageExpire: "La billetten utløpe nå", stageReset: "Nullstill appen",
      apply: "Bruk", done: "Ferdig",
      receiptTitle: "Kvittering", receiptOrg: "Vestbillett AS · Org.nr. 987 654 321 MVA",
      receiptFoot: "Dette er en kvittering for et kjøp, ikke et reisedokument.",
      coversTitle: "Transportmidler",
      coversBody: "Billetten gjelder på alle busser, bybåten og lokaltoget innenfor de valgte sonene. Den gjelder ikke på ekspressbuss eller flybuss.",
      qty: "Antall", ticketFor: "Billett for",
      kvikk: "Kvikk", vestbillett: "Vestbillett",
      confirmReset: "Nullstille appen og slette alle billetter?",
    },
  };

  const DATES = {
    en: {
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
    no: {
      days: ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"],
      months: ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"],
      short: ["jan.", "feb.", "mars", "apr.", "mai", "juni", "juli", "aug.", "sep.", "okt.", "nov.", "des."],
    },
  };

  /* ==========================================================
     3. State
     ========================================================== */

  const KEY = "vestbillett.state.v1";

  function freshState() {
    const now = Date.now();
    const purchased = now - 8 * 60000;
    return {
      lang: "en",
      appearance: "light",
      expiryReminder: true,
      clockOffsetMin: 0,
      frozen: false,
      stageUnlocked: false,
      tab: "tickets",
      tickets: [
        makeTicket({
          product: "single",
          zone: 1,
          counts: { adult: 1 },
          purchasedAt: purchased,
          method: "Kvikk",
        }),
        makeTicket({
          product: "single",
          zone: 1,
          counts: { adult: 1, child: 1 },
          purchasedAt: now - 26 * 3600000,
          method: "Kvikk",
        }),
        makeTicket({
          product: "day24",
          zone: 2,
          counts: { adult: 2 },
          purchasedAt: now - 5 * 86400000,
          method: "Kvikk",
        }),
      ],
      warned: {},
      expiredSeen: {},
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return freshState();
      const s = JSON.parse(raw);
      if (!s || !Array.isArray(s.tickets)) return freshState();
      return Object.assign(freshState(), s);
    } catch (e) {
      return freshState();
    }
  }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
    }, 120);
  }

  /* ==========================================================
     4. Helpers
     ========================================================== */

  const t = (key, vars) => {
    let s = (STR[state.lang] || STR.en)[key] || key;
    if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
    return s;
  };
  const D = () => DATES[state.lang] || DATES.en;

  // The one clock the whole app reads. Stage controls shift it; everything
  // else — countdowns, control code, receipts — follows from here.
  function now() {
    if (state.frozen && state.frozenAt) return state.frozenAt;
    return Date.now() + (state.clockOffsetMin || 0) * 60000;
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  const kr = (ore) => (ore / 100).toFixed(2).replace(".", state.lang === "no" ? "," : ".");

  function hhmm(ts) { const d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function longDate(ts) {
    const d = new Date(ts), L = D();
    return `${L.days[d.getDay()]} ${d.getDate()}. ${L.months[d.getMonth()]} ${d.getFullYear()}`;
  }
  function shortDate(ts) {
    const d = new Date(ts), L = D();
    return `${d.getDate()}. ${L.short[d.getMonth()]}`;
  }

  function hash32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // The control code an inspector reads off the screen. It is derived from the
  // clock, so every phone in the theatre shows the same code at the same time —
  // and it rolls over on the hour, exactly like the real thing.
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  function controlCode(ts) {
    const d = new Date(ts);
    const h = hash32(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`);
    return CODE_CHARS[h % 32] + CODE_CHARS[Math.floor(h / 32) % 32];
  }

  function ticketIdString(seed) {
    const h = hash32("tid" + seed);
    let out = [];
    for (let i = 0; i < 5; i++) out.push(pad((Math.floor(h / Math.pow(31, i)) + i * 17) % 100));
    return out.join(" ");
  }

  function productOf(id) { return PRODUCTS.find((p) => p.id === id); }
  function zoneOf(n) { return ZONES.find((z) => z.n === n) || ZONES[0]; }
  function zoneName(n) { const z = zoneOf(n); return state.lang === "no" ? z.nameNo : z.name; }

  function priceFor(productId, zone, counts) {
    const p = productOf(productId);
    let total = 0;
    for (const cat of TRAVELLERS) {
      const c = counts[cat.id] || 0;
      if (!c) continue;
      total += c * (Math.round((p.base[zone] * cat.mult) / 50) * 50);
    }
    return total;
  }
  function vatOf(ore) { return Math.round(ore - ore / (1 + VAT_RATE)); }

  function countTravellers(counts) {
    return TRAVELLERS.reduce((n, c) => n + (counts[c.id] || 0), 0);
  }
  function travellerLabel(counts) {
    const parts = [];
    for (const cat of TRAVELLERS) {
      const c = counts[cat.id] || 0;
      if (c) parts.push(`${c} ${t(c > 1 ? cat.id + "_p" : cat.id)}`);
    }
    return parts.join(", ") || "—";
  }

  function makeTicket(opts) {
    const p = productOf(opts.product);
    const mins = p.minutes[opts.zone];
    const purchasedAt = opts.purchasedAt;
    // A single ticket starts on the next whole minute, so the clock on the
    // pass and the expiry time always agree.
    const startsAt = Math.ceil(purchasedAt / 60000) * 60000;
    return {
      id: "t" + purchasedAt.toString(36) + Math.floor(Math.random() * 1296).toString(36),
      product: opts.product,
      zone: opts.zone,
      counts: opts.counts,
      purchasedAt,
      startsAt,
      expiresAt: opts.expiresAt || startsAt + mins * 60000,
      price: priceFor(opts.product, opts.zone, opts.counts),
      method: opts.method || "Kvikk",
      ref: ticketIdString(purchasedAt + "" + opts.product + opts.zone),
    };
  }

  function ticketState(tk, ts) {
    if (ts < tk.startsAt) return "future";
    if (ts >= tk.expiresAt) return "expired";
    if (tk.expiresAt - ts <= 5 * 60000) return "soon";
    return "valid";
  }

  function productName(tk) {
    return t(tk.product === "single" ? "singleTicket" : tk.product === "day24" ? "day24" : "period30");
  }

  function remainingParts(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return {
      d: Math.floor(total / 86400),
      h: Math.floor((total % 86400) / 3600),
      m: Math.floor((total % 3600) / 60),
      s: total % 60,
      total,
    };
  }

  function shortRemaining(ms) {
    const r = remainingParts(ms);
    if (r.d > 0) return `${r.d} ${t("days")} ${r.h} ${t("hrs")}`;
    if (r.h > 0) return `${r.h} ${t("hrs")} ${pad(r.m)} ${t("min")}`;
    return `${r.m} ${t("min")} ${pad(r.s)} ${t("sec")}`;
  }

  function durationLabel(productId, zone) {
    const m = productOf(productId).minutes[zone];
    if (m >= 1440 * 2) return `${Math.round(m / 1440)} ${t("days")}`;
    if (m >= 1440) return `24 ${t("hrs")}`;
    return `${m} ${t("min")}`;
  }

  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ==========================================================
     5. Icons
     ========================================================== */

  const svg = (d, o) => `<svg width="${(o && o.size) || 22}" height="${(o && o.size) || 22}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${(o && o.w) || 1.9}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICON = {
    ticket: (s) => svg(`<path d="M3 9.2V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2.2a2.8 2.8 0 0 0 0 5.6V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.2a2.8 2.8 0 0 0 0-5.6Z"/><path d="M15 5v14" stroke-dasharray="2 2.4"/>`, { size: s }),
    bike: (s) => svg(`<circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M8 17h4.5l3-8.5M12 8.5h4M15.5 8.5 18 17"/><circle cx="12" cy="4.6" r="1.1" fill="currentColor"/>`, { size: s }),
    dots: (s) => svg(`<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>`, { size: s, w: 0 }),
    chevL: (s) => svg(`<path d="M15 5 8 12l7 7"/>`, { size: s || 24, w: 2.4 }),
    chevR: (s) => svg(`<path d="M9 5l7 7-7 7"/>`, { size: s || 17, w: 2.4 }),
    chevD: (s) => svg(`<path d="M5 9l7 7 7-7"/>`, { size: s || 15, w: 2.6 }),
    check: (s) => svg(`<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>`, { size: s || 20, w: 2.6 }),
    qr: (s) => svg(`<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 18v3"/>`, { size: s || 21, w: 1.8 }),
    clock: (s) => svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5.3l3.2 2"/>`, { size: s }),
    person: (s) => svg(`<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.4-3.7 4.2-5.5 7.5-5.5s6.1 1.8 7.5 5.5"/>`, { size: s }),
    card: (s) => svg(`<rect x="2.5" y="5" width="19" height="14" rx="2.6"/><path d="M2.5 9.5h19"/>`, { size: s }),
    globe: (s) => svg(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 3 2.6 15 0 18-2.6-3-2.6-15 0-18Z"/>`, { size: s }),
    bell: (s) => svg(`<path d="M6 9a6 6 0 1 1 12 0c0 4 1.4 5.4 2 6H4c.6-.6 2-2 2-6Z"/><path d="M10 19a2 2 0 0 0 4 0"/>`, { size: s }),
    life: (s) => svg(`<circle cx="12" cy="12" r="9"/><path d="M9.4 9.2a2.7 2.7 0 1 1 3.6 2.5c-.7.3-1 .8-1 1.6"/><circle cx="12" cy="16.6" r="1" fill="currentColor" stroke="none"/>`, { size: s }),
    info: (s) => svg(`<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none"/>`, { size: s }),
    list: (s) => svg(`<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>`, { size: s }),
    theatre: (s) => svg(`<path d="M4 5h16v7a8 8 0 0 1-16 0Z"/><path d="M8.5 10h.01M15.5 10h.01M9.5 14.5c1.6 1.2 3.4 1.2 5 0"/>`, { size: s }),
    arrowR: (s) => svg(`<path d="M5 12h13M13 6.5l5.5 5.5L13 17.5"/>`, { size: s || 22, w: 2.3 }),
    signal: () => `<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0.5" width="3" height="11.5" rx="1"/></svg>`,
    battery: () => `<svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="0.6" y="0.6" width="21" height="11.8" rx="3.4" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.1"/><rect x="2.2" y="2.2" width="15" height="8.6" rx="2.2" fill="currentColor"/><path d="M23.4 4.6v3.8a2.6 2.6 0 0 0 0-3.8Z" fill="currentColor" fill-opacity="0.45"/></svg>`,
    logo: (s) => `<svg width="${s || 20}" height="${s || 20}" viewBox="0 0 32 32" fill="none"><path d="M6 8h6.6l3.6 11.4L19.8 8H26l-6.9 17.4a3.4 3.4 0 0 1-3.2 2.1h-.2a3.4 3.4 0 0 1-3.2-2.2L6 8Z" fill="#fff"/><circle cx="16" cy="5.2" r="2.2" fill="#fff" fill-opacity="0.72"/></svg>`,
  };

  /* ==========================================================
     6. Shell
     ========================================================== */

  const root = document.getElementById("vb");

  root.innerHTML = `
    <div class="statusbar" id="statusbar">
      <span id="sb-time">14:26</span>
      <span class="sb-right">${ICON.signal()}<span style="font-size:12px;font-weight:600">5G</span>${ICON.battery()}</span>
    </div>
    <div class="screens" id="screens"></div>
    <div class="toasts" id="toasts"></div>
    <div class="inspect" id="inspect"></div>
    <div class="sheet-wrap" id="sheet"></div>
    <div class="pay-screen" id="pay"></div>
    <div class="homebar"></div>
  `;

  const screensEl = document.getElementById("screens");
  const toastsEl = document.getElementById("toasts");
  const inspectEl = document.getElementById("inspect");
  const sheetEl = document.getElementById("sheet");
  const payEl = document.getElementById("pay");

  /* ==========================================================
     7. Navigation stack
     ========================================================== */

  let stack = [];      // [{name, params}]
  let detailTicketId = null;
  let bikeLoaded = false;
  let openDetails = false;

  const ROOTS = { tickets: 1, bike: 1, more: 1 };

  function currentRoute() { return stack[stack.length - 1]; }

  function go(name, params) {
    if (ROOTS[name]) {
      stack = [{ name, params: params || {} }];
      state.tab = name;
      save();
      renderStack(false);
    } else {
      stack.push({ name, params: params || {} });
      renderStack(true);
    }
  }

  function back() {
    if (stack.length > 1) {
      stack.pop();
      renderStack("back");
    }
  }

  function renderStack(anim) {
    const route = currentRoute();
    const html = SCREENS[route.name](route.params);
    if (anim === "back") {
      const old = screensEl.lastElementChild;
      const holder = document.createElement("div");
      holder.className = "screen";
      holder.setAttribute("data-active", "");
      holder.innerHTML = html;
      screensEl.insertBefore(holder, old);
      if (old) {
        old.classList.add("slide-out");
        old.addEventListener("animationend", () => old.remove(), { once: true });
      }
      afterRender(holder, route);
    } else {
      const holder = document.createElement("div");
      holder.className = "screen" + (anim ? " slide-in" : "");
      holder.setAttribute("data-active", "");
      if (anim) holder.setAttribute("data-pushed", "");
      holder.innerHTML = html;
      const prev = screensEl.lastElementChild;
      screensEl.appendChild(holder);
      if (!anim && prev) prev.remove();
      if (anim && prev) {
        holder.addEventListener("animationend", () => {
          while (screensEl.children.length > 1) screensEl.firstElementChild.remove();
          holder.removeAttribute("data-pushed");
        }, { once: true });
      }
      afterRender(holder, route);
    }
    tick();
  }

  // Re-render the visible screen in place (no animation) — used when data
  // changes underneath the user.
  function refresh() {
    const route = currentRoute();
    const holder = screensEl.lastElementChild;
    if (!holder) return;
    const scroller = holder.querySelector(".body");
    const y = scroller ? scroller.scrollTop : 0;
    holder.innerHTML = SCREENS[route.name](route.params);
    afterRender(holder, route);
    const s2 = holder.querySelector(".body");
    if (s2) s2.scrollTop = y;
    tick();
  }

  function afterRender(holder, route) {
    const body = holder.querySelector(".body");
    const nav = holder.querySelector(".nav");
    if (body && nav) {
      body.addEventListener("scroll", () => {
        if (body.scrollTop > 2) nav.setAttribute("data-scrolled", "");
        else nav.removeAttribute("data-scrolled");
      }, { passive: true });
    }
    if (route.name === "bike" && !bikeLoaded) startBikeLoad(holder);
  }

  /* ==========================================================
     8. Shared chunks
     ========================================================== */

  function navBar(opts) {
    const left = opts.back
      ? `<button class="nav-btn nav-left" data-act="back">${ICON.chevL(26)}<span>${esc(opts.backLabel || t("back"))}</span></button>`
      : `<span class="nav-left"></span>`;
    const right = opts.right || `<span class="nav-right"></span>`;
    return `<header class="nav"${opts.large ? " data-has-large" : ""}>
      <div class="nav-row">${left}<h1 class="nav-title">${esc(opts.title || "")}</h1>${right}</div>
      ${opts.large ? `<div class="large-title">${esc(opts.large)}</div>` : ""}
    </header>`;
  }

  function tabBar() {
    const tabs = [
      ["tickets", ICON.ticket(23), t("tabTickets")],
      ["bike", ICON.bike(23), t("tabBike")],
      ["more", ICON.dots(23), t("tabMore")],
    ];
    return `<nav class="tabbar">${tabs.map(([id, ic, label]) =>
      `<button class="tab" data-tab="${id}" aria-selected="${state.tab === id}">${ic}<span>${esc(label)}</span></button>`
    ).join("")}</nav>`;
  }

  /* ==========================================================
     9. Screens
     ========================================================== */

  const SCREENS = {};

  SCREENS.tickets = () => {
    const ts = now();
    const active = state.tickets.filter((tk) => ticketState(tk, ts) !== "expired")
      .sort((a, b) => a.expiresAt - b.expiresAt);
    const past = state.tickets.filter((tk) => ticketState(tk, ts) === "expired")
      .sort((a, b) => b.expiresAt - a.expiresAt).slice(0, 8);

    const list = active.length
      ? active.map(ticketCard).join("")
      : `<div class="empty">${ICON.ticket(38)}<h3>${esc(t("noTickets"))}</h3><p>${esc(t("noTicketsBody"))}</p></div>`;

    return `${navBar({ title: t("tickets"), large: t("tickets") })}
      <div class="body" id="tickets-body">
        ${list}
        ${past.length ? `<div class="section-head">${esc(t("earlierTickets"))}</div>${past.map(ticketCard).join("")}` : ""}
        <div class="brand">
          <span class="brand-mark">${ICON.logo(20)}</span>
          <span><span class="brand-name">VESTBILLETT</span><br><span class="brand-sub">${esc(t("version"))}</span></span>
        </div>
      </div>
      <div class="dock"><button class="btn" data-act="buy">${esc(active.length ? t("buyAnother") : t("buyTicket"))}</button></div>
      ${tabBar()}`;
  };

  function ticketCard(tk) {
    const ts = now();
    const st = ticketState(tk, ts);
    const bannerText = st === "expired" ? t("expired") : st === "future" ? t("notStarted") : t("valid");
    const left = st === "expired"
      ? `${t("expired")} ${shortDate(tk.expiresAt)} ${hhmm(tk.expiresAt)}`
      : shortRemaining(tk.expiresAt - ts);
    return `<button class="ticket-card" data-ticket="${tk.id}" data-state="${st}">
      <div class="tc-banner" data-state="${st}">${esc(bannerText)}</div>
      <div class="tc-meta">${st === "expired"
        ? `<span>${esc(shortDate(tk.expiresAt))} ${esc(hhmm(tk.expiresAt))}</span><span>${esc(controlCode(tk.expiresAt))}</span>`
        : `<span data-live="clock">${hhmm(ts)}</span><span data-live="code">${controlCode(ts)}</span>`}</div>
      <div class="tc-main">
        <div class="tc-line1">${esc(travellerLabel(tk.counts))}</div>
        <div class="tc-line2">${esc(productName(tk))} · ${esc(zoneName(tk.zone))}</div>
        <div class="tc-left" data-state="${st}" data-live="left" data-tid="${tk.id}">
          ${st === "expired" ? "" : ICON.clock(15)}<span>${esc(left)}</span>
        </div>
      </div>
    </button>`;
  }

  SCREENS.detail = (p) => {
    const tk = state.tickets.find((x) => x.id === p.id);
    if (!tk) return SCREENS.tickets();
    const ts = now();
    const st = ticketState(tk, ts);
    const r = remainingParts(tk.expiresAt - ts);
    const big = r.d > 0 ? [[r.d, t("days")], [r.h, t("hrs")]] : r.h > 0 ? [[r.h, t("hrs")], [pad(r.m), t("min")]] : [[r.m, t("min")], [pad(r.s), t("sec")]];

    const counter = st === "expired"
      ? `<div class="cd-expired">${esc(t("ticketExpired"))}</div>`
      : `<div class="countdown">
          <div class="cd-label">${esc(t("expiresIn"))}</div>
          <div class="cd-boxes" data-live="cd" data-tid="${tk.id}">
            ${big.map(([v, l]) => `<div class="cd-unit"><div class="cd-box">${v}</div><small>${esc(l)}</small></div>`).join("")}
          </div>
        </div>`;

    return `${navBar({ title: productName(tk), back: true, backLabel: t("tickets") })}
      <div class="body">
        <div class="pass">
          <div class="pass-banner" data-state="${st}">${esc(st === "expired" ? t("expired") : st === "future" ? t("notStarted") : t("valid"))}</div>
          <div class="pass-clock"><span data-live="clock">${hhmm(ts)}</span><b data-live="code">${controlCode(ts)}</b></div>
          ${counter}
          <div class="pass-rule"></div>
          <dl class="pass-facts">
            <dt>${esc(t("travellers"))}</dt><dt>${esc(t("validIn"))}</dt>
            <dd>${esc(travellerLabel(tk.counts))}</dd><dd>${esc(zoneName(tk.zone))}</dd>
          </dl>
          <button class="pass-link" data-act="covers">${esc(t("coversLink"))}</button>
        </div>

        <div class="details"${openDetails ? " data-open" : ""}>
          <button class="details-toggle" data-act="toggle-details">
            <span>${esc(openDetails ? t("hideDetails") : t("showDetails"))}</span>${ICON.chevD()}
          </button>
          <div class="details-body">
            <div>${esc(productName(tk))}</div>
            <div>${esc(t("expiresOn"))} ${esc(longDate(tk.expiresAt))}</div>
            <div>${esc(hhmm(tk.expiresAt))}</div>
            <div>${esc(t("purchasedOn"))} ${esc(shortDate(tk.purchasedAt))} ${esc(hhmm(tk.purchasedAt))}</div>
            <div>${esc(t("priceLine", { price: kr(tk.price), vat: kr(vatOf(tk.price)) }))}</div>
            <div>${esc(t("paidWith", { method: tk.method }))}</div>
            <div class="tid">${esc(t("ticketId", { id: tk.ref }))}</div>
            <button class="btn outline" data-act="receipt" data-id="${tk.id}">${esc(t("receipt"))}</button>
          </div>
        </div>
      </div>
      <div class="dock">
        <button class="btn" data-act="inspect" data-id="${tk.id}"${st === "expired" ? " disabled" : ""}>
          ${ICON.qr(21)}<span>${esc(t("inspection"))}</span>
        </button>
      </div>
      ${tabBar()}`;
  };

  SCREENS.receipt = (p) => {
    const tk = state.tickets.find((x) => x.id === p.id);
    if (!tk) return SCREENS.tickets();
    const vat = vatOf(tk.price);
    return `${navBar({ title: t("receiptTitle"), back: true })}
      <div class="body">
        <div class="receipt">
          <h2>${esc(t("receiptTitle"))}</h2>
          <div class="r-org">${esc(t("receiptOrg"))}</div>
          <div class="r-line"><span class="lbl">${esc(t("product"))}</span><span class="val">${esc(productName(tk))}</span></div>
          <div class="r-line"><span class="lbl">${esc(t("ticketFor"))}</span><span class="val">${esc(travellerLabel(tk.counts))}</span></div>
          <div class="r-line"><span class="lbl">${esc(t("validIn"))}</span><span class="val">${esc(zoneName(tk.zone))}</span></div>
          <div class="r-line"><span class="lbl">${esc(t("purchasedOn"))}</span><span class="val">${esc(shortDate(tk.purchasedAt))} ${esc(hhmm(tk.purchasedAt))}</span></div>
          <div class="r-line"><span class="lbl">${esc(t("expiresOn"))}</span><span class="val">${esc(shortDate(tk.expiresAt))} ${esc(hhmm(tk.expiresAt))}</span></div>
          <div class="r-line"><span class="lbl">${esc(t("paidWith", { method: tk.method }))}</span><span class="val">•••• 4417</span></div>
          <div class="r-line"><span class="lbl">${esc(t("ticketId", { id: "" })).replace(/:\s*$/, "")}</span><span class="val tid">${esc(tk.ref)}</span></div>
          <div class="r-line"><span class="lbl">${esc(t("vatLine"))}</span><span class="val">kr ${esc(kr(vat))}</span></div>
          <div class="r-line r-total"><span>${esc(t("total"))}</span><span class="val">kr ${esc(kr(tk.price))}</span></div>
          <div class="r-foot">${esc(t("receiptFoot"))}</div>
        </div>
      </div>
      ${tabBar()}`;
  };

  SCREENS.covers = () => `${navBar({ title: t("coversTitle"), back: true })}
    <div class="body">
      <div class="group"><div class="list">
        ${[["bike", "Bus", "Buss"], ["ticket", "City ferry", "Bybåt"], ["clock", "Local train", "Lokaltog"]]
          .map(([ic, en, no]) => `<div class="row"><span class="row-ico" style="background:var(--valid)">${ICON[ic](17)}</span>
            <span class="row-main"><span class="row-title">${esc(state.lang === "no" ? no : en)}</span></span>
            <span class="row-check" style="color:var(--valid)">${ICON.check(20)}</span></div>`).join("")}
      </div></div>
      <p class="fine" style="font-size:14px;line-height:1.5">${esc(t("coversBody"))}</p>
    </div>
    ${tabBar()}`;

  /* ---------- City Bike ---------- */

  let bikeData = null;
  function ensureBikeData() {
    if (bikeData) return bikeData;
    bikeData = STATIONS.map((s, i) => {
      const h = hash32(s.name);
      const bikes = Math.max(0, Math.min(s.cap, (h % (s.cap - 2)) + 1));
      return { ...s, id: "s" + i, bikes, docks: s.cap - bikes };
    });
    return bikeData;
  }

  function startBikeLoad(holder) {
    setTimeout(() => {
      bikeLoaded = true;
      ensureBikeData();
      if (currentRoute().name === "bike") refresh();
    }, 1500);
  }

  SCREENS.bike = () => {
    if (!bikeLoaded) {
      return `${navBar({ title: t("bikeTitle") })}
        <div class="body">
          <div class="loading">
            <svg class="ring spin" width="46" height="46" viewBox="0 0 46 46" fill="none">
              <circle cx="23" cy="23" r="19" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="92 40"/>
            </svg>
            <span>${esc(t("bikeLoading"))}</span>
          </div>
        </div>
        ${tabBar()}`;
    }
    const q = (SCREENS.bike.query || "").toLowerCase();
    const rows = ensureBikeData()
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => a.dist - b.dist);

    return `${navBar({ title: t("bikeTitle"), large: t("bikeTitle") })}
      <div class="body">
        <div class="searchbar"><input id="bike-q" type="search" placeholder="${esc(t("searchStations"))}" value="${esc(SCREENS.bike.query || "")}" autocomplete="off"></div>
        <div class="bike-hero">
          <svg class="mapdots" viewBox="0 0 300 90" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 66 C60 40 90 78 150 52 S250 18 300 40" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.5"/>
            <circle cx="60" cy="50" r="3.4" fill="#fff"/><circle cx="150" cy="52" r="3.4" fill="#fff"/><circle cx="242" cy="26" r="3.4" fill="#fff"/>
          </svg>
          <h3>${esc(t("bikeHeroTitle"))}</h3>
          <p>${esc(t("bikeHeroBody"))}</p>
        </div>
        <div class="group">
          <h3>${esc(t("bikeNear"))}</h3>
          <div class="list">${rows.map(stationRow).join("") || `<div class="row"><span class="row-main"><span class="row-title">—</span></span></div>`}</div>
        </div>
      </div>
      ${tabBar()}`;
  };

  function stationRow(s) {
    const level = s.bikes === 0 ? "none" : s.bikes <= 3 ? "low" : "ok";
    const dist = s.dist < 1000 ? `${Math.round(s.dist)} m` : `${(s.dist / 1000).toFixed(1).replace(".", state.lang === "no" ? "," : ".")} km`;
    return `<button class="row" data-station="${s.id}">
      <span class="dock-pill" data-level="${level}" data-live="bikes" data-sid="${s.id}">${s.bikes}<small>${esc(s.bikes === 1 ? t("bike1") : t("bikes"))}</small></span>
      <span class="row-main"><span class="row-title">${esc(s.name)}</span>
        <span class="row-sub">${esc(dist)} · ${s.docks} ${esc(t("docks").toLowerCase())}</span></span>
      <span class="row-chev">${ICON.chevR()}</span>
    </button>`;
  }

  SCREENS.station = (p) => {
    const s = ensureBikeData().find((x) => x.id === p.id);
    if (!s) return SCREENS.bike();
    return `${navBar({ title: t("station"), back: true, backLabel: t("bikeTitle") })}
      <div class="body">
        <div class="bike-hero" style="background:linear-gradient(160deg,#2f6a4f,#1d4a37)">
          <h3>${esc(s.name)}</h3>
          <p>${s.dist < 1000 ? Math.round(s.dist) + " m" : (s.dist / 1000).toFixed(1) + " km"} · ${esc(t("returnAny"))}</p>
        </div>
        <div class="group"><div class="list">
          <div class="row"><span class="row-main"><span class="row-title">${esc(t("bikes"))}</span></span><span class="row-value" data-live="bikes" data-sid="${s.id}">${s.bikes}</span></div>
          <div class="row"><span class="row-main"><span class="row-title">${esc(t("docks"))}</span></span><span class="row-value">${s.docks}</span></div>
        </div></div>
      </div>
      <div class="dock"><button class="btn" data-act="unlock" data-id="${s.id}"${s.bikes === 0 ? " disabled" : ""}>${esc(s.bikes === 0 ? t("noBikes") : t("unlock"))}</button></div>
      ${tabBar()}`;
  };

  /* ---------- More ---------- */

  SCREENS.more = () => {
    const rows = [
      ["profile", ICON.person(17), "#8e8e93", t("profile"), "Ellie Moi · 918 45 220"],
      ["payments", ICON.card(17), "#30a14e", t("paymentMethods"), "Kvikk · •••• 4417"],
      ["history", ICON.list(17), "#0a84ff", t("travelHistory"), state.tickets.length + ""],
      ["language", ICON.globe(17), "#ff9500", t("language"), state.lang === "no" ? t("norwegian") : t("english")],
      ["appearance", ICON.info(17), "#5856d6", t("appearance"), t(state.appearance)],
      ["notifications", ICON.bell(17), "#ff375f", t("notifications"), ""],
      ["help", ICON.life(17), "#00a0a0", t("help"), ""],
      ["about", ICON.info(17), "#636366", t("about"), ""],
    ];
    return `${navBar({ title: t("more"), large: t("more") })}
      <div class="body">
        <div class="group"><div class="list">
          ${rows.map(([id, ic, color, title, val]) => `<button class="row" data-more="${id}">
            <span class="row-ico" style="background:${color}">${ic}</span>
            <span class="row-main"><span class="row-title">${esc(title)}</span></span>
            ${val ? `<span class="row-value">${esc(val)}</span>` : ""}
            <span class="row-chev">${ICON.chevR()}</span></button>`).join("")}
        </div></div>
        ${state.stageUnlocked ? `<div class="group"><div class="list">
          <button class="row" data-more="stage">
            <span class="row-ico" style="background:#c7362c">${ICON.theatre(17)}</span>
            <span class="row-main"><span class="row-title">${esc(t("stagePanel"))}</span></span>
            <span class="row-chev">${ICON.chevR()}</span></button>
        </div></div>` : ""}
        <div class="brand"><span class="brand-mark">${ICON.logo(20)}</span>
          <span><span class="brand-name">VESTBILLETT</span><br><span class="brand-sub">${esc(t("version"))}</span></span></div>
      </div>
      ${tabBar()}`;
  };

  SCREENS.language = () => `${navBar({ title: t("language"), back: true, backLabel: t("more") })}
    <div class="body"><div class="group"><div class="list">
      ${[["en", t("english")], ["no", t("norwegian")]].map(([id, label]) =>
        `<button class="row" data-lang="${id}" aria-checked="${state.lang === id}">
          <span class="row-main"><span class="row-title">${esc(label)}</span></span>
          <span class="row-check">${ICON.check(20)}</span></button>`).join("")}
    </div></div></div>
    ${tabBar()}`;

  SCREENS.appearance = () => `${navBar({ title: t("appearance"), back: true, backLabel: t("more") })}
    <div class="body"><div class="group"><div class="list">
      ${["light", "dark", "system"].map((id) =>
        `<button class="row" data-appear="${id}" aria-checked="${state.appearance === id}">
          <span class="row-main"><span class="row-title">${esc(t(id))}</span></span>
          <span class="row-check">${ICON.check(20)}</span></button>`).join("")}
    </div></div>
    <p class="fine">${esc(state.lang === "no" ? "Lyst utseende er tryggest på scenen — det ser likt ut uansett hvilken telefon som brukes." : "Light stays predictable on stage — it looks the same on whichever phone you use.")}</p>
    </div>
    ${tabBar()}`;

  SCREENS.notifications = () => `${navBar({ title: t("notifications"), back: true, backLabel: t("more") })}
    <div class="body"><div class="group"><div class="list">
      <div class="field">
        <label for="sw-expiry">${esc(t("expiryReminder"))}</label>
        <input class="sw" type="checkbox" id="sw-expiry" ${state.expiryReminder ? "checked" : ""}>
      </div>
    </div>
    <p class="fine">${esc(t("expiryReminderSub"))}</p></div></div>
    ${tabBar()}`;

  SCREENS.history = () => {
    const ts = now();
    const items = state.tickets.slice().sort((a, b) => b.purchasedAt - a.purchasedAt);
    return `${navBar({ title: t("historyTitle"), back: true, backLabel: t("more") })}
      <div class="body">
        ${items.length ? `<div class="group"><div class="list">${items.map((tk) => {
          const st = ticketState(tk, ts);
          return `<button class="row" data-ticket="${tk.id}">
            <span class="row-main">
              <span class="row-title">${esc(productName(tk))} · ${esc(travellerLabel(tk.counts))}</span>
              <span class="row-sub">${esc(shortDate(tk.purchasedAt))} ${esc(hhmm(tk.purchasedAt))} · ${esc(zoneName(tk.zone))}${st === "expired" ? "" : " · " + esc(t("valid"))}</span>
            </span>
            <span class="row-value">kr ${esc(kr(tk.price))}</span>
            <span class="row-chev">${ICON.chevR()}</span></button>`;
        }).join("")}</div></div>` : `<div class="empty"><h3>${esc(t("historyEmpty"))}</h3></div>`}
      </div>
      ${tabBar()}`;
  };

  SCREENS.profile = () => `${navBar({ title: t("profile"), back: true, backLabel: t("more") })}
    <div class="body">
      <div class="about-hero">
        <div class="brand-mark" style="background:#8e8e93">${ICON.person(34)}</div>
        <h2>Ellie Moi</h2><p>918 45 220 · ellie@example.no</p>
      </div>
      <div class="group"><div class="list">
        <div class="row"><span class="row-main"><span class="row-title">${esc(state.lang === "no" ? "Kundenummer" : "Customer number")}</span></span><span class="row-value">44 07 21</span></div>
        <div class="row"><span class="row-main"><span class="row-title">${esc(state.lang === "no" ? "Medlem siden" : "Member since")}</span></span><span class="row-value">${esc(state.lang === "no" ? "mars 2024" : "March 2024")}</span></div>
      </div></div>
    </div>
    ${tabBar()}`;

  SCREENS.payments = () => `${navBar({ title: t("paymentMethods"), back: true, backLabel: t("more") })}
    <div class="body"><div class="group"><div class="list">
      <div class="row"><span class="row-ico" style="background:var(--pay);font-weight:800;font-size:13px">K</span>
        <span class="row-main"><span class="row-title">Kvikk</span><span class="row-sub">918 45 220</span></span>
        <span class="row-check" style="color:var(--action)">${ICON.check(20)}</span></div>
      <div class="row"><span class="row-ico" style="background:#1a1f71;font-weight:800;font-size:11px">V</span>
        <span class="row-main"><span class="row-title">Visa</span><span class="row-sub">•••• 4417 · 09/29</span></span></div>
    </div></div></div>
    ${tabBar()}`;

  SCREENS.help = () => `${navBar({ title: t("help"), back: true, backLabel: t("more") })}
    <div class="body"><div class="group"><div class="list">
      ${(state.lang === "no"
        ? ["Hvordan kjøper jeg billett?", "Hva gjør jeg i en kontroll?", "Jeg mistet noe på bussen", "Ring kundeservice 51 00 00 00"]
        : ["How do I buy a ticket?", "What happens in an inspection?", "I lost something on the bus", "Call customer service 51 00 00 00"]
      ).map((q) => `<button class="row"><span class="row-main"><span class="row-title">${esc(q)}</span></span><span class="row-chev">${ICON.chevR()}</span></button>`).join("")}
    </div></div></div>
    ${tabBar()}`;

  SCREENS.about = () => `${navBar({ title: t("about"), back: true, backLabel: t("more") })}
    <div class="body">
      <div class="about-hero">
        <div class="brand-mark">${ICON.logo(38)}</div>
        <h2>Vestbillett</h2>
        <p id="ver-tap">${esc(t("version"))}</p>
      </div>
      <div class="prop-note">${t("aboutBody")}</div>
      <p class="fine">${esc(state.lang === "no"
        ? "Trykk på versjonsnummeret fem ganger for å låse opp sceneregi."
        : "Tap the version number five times to unlock the stage controls.")}</p>
    </div>
    ${tabBar()}`;

  SCREENS.stage = () => {
    const ts = now();
    const activeTicket = state.tickets.find((tk) => ticketState(tk, ts) !== "expired");
    return `${navBar({ title: t("stagePanel"), back: true, backLabel: t("more") })}
      <div class="body">
        <p class="stage-note">${esc(t("stageIntro"))}</p>
        <div class="group"><div class="list">
          <div class="field"><label for="st-offset">${esc(t("stageClock"))}</label>
            <input type="number" id="st-offset" value="${state.clockOffsetMin || 0}" step="1"></div>
          <div class="field"><label for="st-freeze">${esc(t("stageFreeze"))}</label>
            <input class="sw" type="checkbox" id="st-freeze" ${state.frozen ? "checked" : ""}></div>
        </div></div>

        <div class="group"><h3>${esc(t("stageGive"))}</h3><div class="list">
          <div class="field"><label for="st-min">${esc(t("stageMinutes"))}</label>
            <input type="number" id="st-min" value="6" min="1" max="1440"></div>
          <div class="field"><label for="st-prod">${esc(t("product"))}</label>
            <select id="st-prod">
              <option value="single">${esc(t("singleTicket"))}</option>
              <option value="day24">${esc(t("day24"))}</option>
              <option value="period30">${esc(t("period30"))}</option>
            </select></div>
          <div class="field"><label for="st-who">${esc(t("ticketFor"))}</label>
            <select id="st-who">
              ${TRAVELLERS.map((c) => `<option value="${c.id}">1 ${esc(t(c.id))}</option>`).join("")}
            </select></div>
        </div>
        <div style="margin-top:12px"><button class="btn" data-act="stage-give">${esc(t("stageGive"))}</button></div>
        </div>

        <div class="group"><div style="display:flex;flex-direction:column;gap:10px">
          <button class="btn ghost" data-act="stage-expire"${activeTicket ? "" : " disabled"}>${esc(t("stageExpire"))}</button>
          <button class="btn ghost" style="color:var(--expired)" data-act="stage-reset">${esc(t("stageReset"))}</button>
        </div></div>
      </div>
      ${tabBar()}`;
  };

  /* ==========================================================
     10. Buy flow (bottom sheet)
     ========================================================== */

  let buy = null;

  function openBuy() {
    buy = { step: 0, product: "single", zone: 1, counts: { adult: 1 } };
    renderBuy();
  }

  function closeBuy() {
    buy = null;
    sheetEl.removeAttribute("data-open");
    sheetEl.innerHTML = "";
  }

  function renderBuy() {
    if (!buy) return;
    const steps = [buyStepProduct, buyStepTravellers, buyStepZone, buyStepReview];
    const titles = [t("chooseTicket"), t("chooseTravellers"), t("chooseZone"), t("review")];
    const total = priceFor(buy.product, buy.zone, buy.counts);
    const last = buy.step === 3;

    sheetEl.setAttribute("data-open", "");
    sheetEl.innerHTML = `
      <div class="sheet-scrim" data-act="buy-close"></div>
      <div class="sheet" role="dialog" aria-label="${esc(titles[buy.step])}">
        <div class="grabber"></div>
        <div class="sheet-nav">
          <button class="nav-btn nav-left" data-act="${buy.step === 0 ? "buy-close" : "buy-back"}">${esc(buy.step === 0 ? t("cancel") : t("back"))}</button>
          <span class="nav-title">${esc(titles[buy.step])}</span>
          <span class="nav-right"></span>
        </div>
        <div class="sheet-body">${steps[buy.step]()}</div>
        <div class="sheet-foot">
          <button class="btn${last ? " pay" : ""}" data-act="${last ? "buy-pay" : "buy-next"}"${countTravellers(buy.counts) === 0 ? " disabled" : ""}>
            ${last ? esc(t("payWith", { price: kr(total) })) : esc(t("next"))}
          </button>
        </div>
      </div>`;
  }

  function buyStepProduct() {
    return `<div class="group"><div class="list">
      ${PRODUCTS.map((p) => {
        const name = p.id === "single" ? t("singleTicket") : p.id === "day24" ? t("day24") : t("period30");
        const sub = p.id === "single" ? t("singleSub") : p.id === "day24" ? t("day24Sub") : t("period30Sub");
        return `<button class="opt" data-product="${p.id}" aria-checked="${buy.product === p.id}">
          <span class="opt-main"><span class="opt-title">${esc(name)}</span><span class="opt-sub">${esc(sub)}</span></span>
          <span class="opt-price">kr ${esc(kr(p.base[buy.zone]))}</span>
          <span class="row-check"${buy.product === p.id ? ' style="color:var(--action)"' : ""}>${ICON.check(20)}</span>
        </button>`;
      }).join("")}
    </div></div>
    <p class="fine">${esc(t("validFor", { n: durationLabel(buy.product, buy.zone) }))}</p>`;
  }

  function buyStepTravellers() {
    return `<div class="group"><div class="list">
      ${TRAVELLERS.map((c) => {
        const n = buy.counts[c.id] || 0;
        return `<div class="opt">
          <span class="opt-main"><span class="opt-title">${esc(t(c.id))}</span>
            <span class="opt-sub">${esc(t(c.id + "Sub"))} · kr ${esc(kr(Math.round((productOf(buy.product).base[buy.zone] * c.mult) / 50) * 50))}</span></span>
          <span class="stepper">
            <button class="step-btn" data-count="${c.id}" data-delta="-1"${n === 0 ? " disabled" : ""} aria-label="−">−</button>
            <span class="step-val">${n}</span>
            <button class="step-btn" data-count="${c.id}" data-delta="1" aria-label="+">+</button>
          </span>
        </div>`;
      }).join("")}
    </div></div>`;
  }

  function buyStepZone() {
    return `<div class="group"><div class="list">
      ${ZONES.map((z) => `<button class="opt" data-zone="${z.n}" aria-checked="${buy.zone === z.n}">
        <span class="opt-main"><span class="opt-title">${esc(t("zone" + z.n))}</span><span class="opt-sub">${esc(zoneName(z.n))}</span></span>
        <span class="opt-price">kr ${esc(kr(priceFor(buy.product, z.n, buy.counts)))}</span>
        <span class="row-check"${buy.zone === z.n ? ' style="color:var(--action)"' : ""}>${ICON.check(20)}</span>
      </button>`).join("")}
    </div></div>
    <p class="fine">${esc(t("validFor", { n: durationLabel(buy.product, buy.zone) }))}</p>`;
  }

  function buyStepReview() {
    const total = priceFor(buy.product, buy.zone, buy.counts);
    const name = buy.product === "single" ? t("singleTicket") : buy.product === "day24" ? t("day24") : t("period30");
    return `<div class="summary">
      <div class="sum-row"><span class="lbl">${esc(t("product"))}</span><span class="val">${esc(name)}</span></div>
      <div class="sum-row"><span class="lbl">${esc(t("ticketFor"))}</span><span class="val">${esc(travellerLabel(buy.counts))}</span></div>
      <div class="sum-row"><span class="lbl">${esc(t("validIn"))}</span><span class="val">${esc(zoneName(buy.zone))}</span></div>
      <div class="sum-row"><span class="lbl">${esc(t("expiresIn"))}</span><span class="val">${esc(durationLabel(buy.product, buy.zone))}</span></div>
      <div class="sum-row"><span class="lbl">${esc(t("vatLine"))}</span><span class="val">kr ${esc(kr(vatOf(total)))}</span></div>
      <div class="sum-row total"><span>${esc(t("total"))}</span><span class="val">kr ${esc(kr(total))}</span></div>
    </div>
    <p class="fine">${esc(t("fineprint"))}</p>`;
  }

  /* ==========================================================
     11. Payment
     ========================================================== */

  function openPay() {
    const total = priceFor(buy.product, buy.zone, buy.counts);
    payEl.setAttribute("data-open", "");
    payEl.innerHTML = `
      <div class="pay-mark">kvikk</div>
      <div>
        <div class="pay-amount">kr ${esc(kr(total))}</div>
        <div class="pay-to">${esc(t("payTo"))}</div>
      </div>
      <div class="pay-slide" id="pay-slide">
        <div class="hint">${esc(t("paySlide"))}</div>
        <div class="pay-knob" id="pay-knob">${ICON.arrowR(22)}</div>
      </div>
      <div class="pay-status" id="pay-status"></div>
      <button class="pay-cancel" data-act="pay-cancel">${esc(t("cancel"))}</button>`;
    wireSlider();
  }

  function wireSlider() {
    const slide = document.getElementById("pay-slide");
    const knob = document.getElementById("pay-knob");
    if (!slide || !knob) return;
    let dragging = false, startX = 0, x = 0;
    const max = () => slide.clientWidth - knob.clientWidth - 10;

    const down = (e) => {
      dragging = true;
      startX = (e.touches ? e.touches[0].clientX : e.clientX) - x;
      knob.setPointerCapture && e.pointerId != null && knob.setPointerCapture(e.pointerId);
    };
    const move = (e) => {
      if (!dragging) return;
      e.preventDefault();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      x = Math.max(0, Math.min(max(), cx - startX));
      knob.style.transform = `translateX(${x}px)`;
      slide.querySelector(".hint").style.opacity = String(Math.max(0, 0.9 - x / max()));
      if (x >= max() - 1) { dragging = false; confirmPayment(); }
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      x = 0;
      knob.style.transition = "transform .25s ease";
      knob.style.transform = "translateX(0)";
      slide.querySelector(".hint").style.opacity = "0.9";
      setTimeout(() => (knob.style.transition = ""), 260);
    };

    knob.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    // Tapping the track also pays — a slider is fine to rehearse with, but on
    // stage nobody wants to fumble a drag.
    slide.addEventListener("click", (e) => { if (e.target.closest("#pay-knob")) return; confirmPayment(); });
  }

  function confirmPayment() {
    const status = document.getElementById("pay-status");
    const slide = document.getElementById("pay-slide");
    if (!status || payEl.dataset.busy) return;
    payEl.dataset.busy = "1";
    buzz(12);
    if (slide) slide.style.visibility = "hidden";
    status.innerHTML = `<svg class="pay-spinner spin" viewBox="0 0 46 46" fill="none" style="display:block;margin:0 auto"><circle cx="23" cy="23" r="19" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-dasharray="92 40"/></svg>
      <div style="margin-top:10px">${esc(t("payConfirming"))}</div>`;

    setTimeout(() => {
      status.innerHTML = `<svg class="tick-pop" width="52" height="52" viewBox="0 0 52 52" fill="none" style="display:block;margin:0 auto">
        <circle cx="26" cy="26" r="24" stroke="#fff" stroke-width="2.6"/><path d="M15 26.5 22.5 34 37 19" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div style="margin-top:10px">${esc(t("payApproved"))}</div>`;
      buzz([10, 40, 10]);
      setTimeout(finishPurchase, 900);
    }, 1400);
  }

  function finishPurchase() {
    const tk = makeTicket({
      product: buy.product,
      zone: buy.zone,
      counts: Object.assign({}, buy.counts),
      purchasedAt: now(),
      method: "Kvikk",
    });
    state.tickets.push(tk);
    save();

    delete payEl.dataset.busy;
    payEl.removeAttribute("data-open");
    payEl.innerHTML = "";
    closeBuy();

    go("tickets");
    toast(t("ticketReady"), t("ticketReadySub", { what: productName(tk), time: hhmm(tk.expiresAt) }), "valid");
    setTimeout(() => go("detail", { id: tk.id }), 420);
  }

  /* ==========================================================
     12. Inspection screen
     ========================================================== */

  let inspectAnim = null;
  let wakeLock = null;

  async function keepAwake(on) {
    try {
      if (on && "wakeLock" in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request("screen");
      else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { /* not supported, not important */ }
  }

  function openInspection(id) {
    const tk = state.tickets.find((x) => x.id === id);
    if (!tk) return;
    const ts = now();
    inspectEl.setAttribute("data-open", "");
    inspectEl.innerHTML = `
      <div class="inspect-card">
        <div class="inspect-head">
          <h2>${esc(travellerLabel(tk.counts))}, ${esc(zoneName(tk.zone))}</h2>
          <p><span data-live="idate">${esc(shortDate(ts))} ${esc(hhmm(ts))}</span><span class="code" data-live="code">${controlCode(ts)}</span></p>
        </div>
        <div class="inspect-art">
          <canvas id="insp-qr" aria-label="Ticket code"></canvas>
          <canvas id="insp-photo" aria-hidden="true"></canvas>
        </div>
        <div class="inspect-warn">${esc(t("screenshotWarn"))}</div>
        <div class="inspect-foot"><button class="btn" data-act="inspect-close">${esc(t("close"))}</button></div>
      </div>`;
    keepAwake(true);
    startInspectionArt(tk);
    buzz(8);
  }

  function closeInspection() {
    inspectEl.removeAttribute("data-open");
    inspectEl.innerHTML = "";
    if (inspectAnim) cancelAnimationFrame(inspectAnim);
    inspectAnim = null;
    keepAwake(false);
  }

  /* A ticket code that actually encodes the ticket, and a photograph that
     washes green and back on a slow cycle. Both are live: the code carries the
     current minute, and a still photo of the screen is caught at one point in
     a wash it cannot reproduce. */

  function qrPayload(tk, ts) {
    const d = new Date(ts);
    const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return [
      "VB1", tk.ref.replace(/\s/g, ""), stamp, controlCode(ts),
      travellerLabel(tk.counts), zoneName(tk.zone).replace(/[–—]/g, "-"),
    ].join("|");
  }

  function paintQR(cv, text) {
    let code;
    try { code = window.VBQR.encode(text); } catch (e) { return; }
    const box = cv.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    // an integer module size keeps every bar crisp, which is what a scanner wants
    const px = Math.max(2, Math.floor((box.width * dpr) / code.size));
    const side = px * code.size;
    cv.width = side; cv.height = side;
    const g = cv.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, side, side);
    g.fillStyle = "#000";
    for (let r = 0; r < code.size; r++)
      for (let c = 0; c < code.size; c++)
        if (code.modules[r][c]) g.fillRect(c * px, r * px, px, px);
  }

  // A seeded ridgeline, so the landscape is the same picture every performance.
  function seeded(seed) {
    let x = seed >>> 0;
    return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  }

  function ridge(steps, rough, rng) {
    let pts = [0.5, 0.5], scale = rough;
    while (pts.length - 1 < steps) {
      const next = [];
      for (let i = 0; i < pts.length - 1; i++) {
        next.push(pts[i]);
        next.push((pts[i] + pts[i + 1]) / 2 + (rng() - 0.5) * scale);
      }
      next.push(pts[pts.length - 1]);
      pts = next;
      scale *= 0.55;
    }
    return pts;
  }

  function fillRidge(g, w, h, baseY, amp, pts, grad) {
    g.beginPath();
    g.moveTo(0, h);
    for (let i = 0; i < pts.length; i++) {
      g.lineTo((i / (pts.length - 1)) * w, baseY - (pts[i] - 0.5) * amp);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fillStyle = grad;
    g.fill();
  }

  // A road running into the mountains — the kind of picture a Norwegian
  // transport operator puts on a ticket.
  function paintLandscape(cv, w, h) {
    const g = cv.getContext("2d");
    const horizon = h * 0.62;

    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#6f9bc8");
    sky.addColorStop(0.55, "#b5c3d2");
    sky.addColorStop(1, "#f0d6ac");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    const far = g.createLinearGradient(0, h * 0.18, 0, horizon);
    far.addColorStop(0, "#e3a469");
    far.addColorStop(0.34, "#8e8ea6");
    far.addColorStop(1, "#5d6b85");
    fillRidge(g, w, h, h * 0.46, h * 0.46, ridge(64, 1.0, seeded(0x51a7)), far);

    const near = g.createLinearGradient(0, h * 0.3, 0, horizon);
    near.addColorStop(0, "#7d7f92");
    near.addColorStop(0.5, "#4a5a72");
    near.addColorStop(1, "#38485e");
    fillRidge(g, w, h, h * 0.55, h * 0.3, ridge(64, 1.0, seeded(0x2c19)), near);

    const floor = g.createLinearGradient(0, horizon - h * 0.04, 0, h);
    floor.addColorStop(0, "#5d7a4a");
    floor.addColorStop(0.45, "#4b6a3c");
    floor.addColorStop(1, "#38522d");
    g.fillStyle = floor;
    g.fillRect(0, horizon - h * 0.05, w, h - horizon + h * 0.05);

    // road, in perspective to a vanishing point on the horizon
    const vx = w * 0.5, vy = horizon - h * 0.04;
    g.beginPath();
    g.moveTo(vx - w * 0.012, vy);
    g.lineTo(vx + w * 0.012, vy);
    g.lineTo(w * 0.82, h);
    g.lineTo(w * 0.18, h);
    g.closePath();
    const tar = g.createLinearGradient(0, vy, 0, h);
    tar.addColorStop(0, "#8d8f95");
    tar.addColorStop(1, "#55565c");
    g.fillStyle = tar;
    g.fill();

    // centre line, dashes shortening toward the horizon
    g.save();
    g.clip();
    g.strokeStyle = "rgba(245,240,225,0.85)";
    for (let i = 0; i < 9; i++) {
      const t0 = Math.pow(i / 9, 2.1), t1 = Math.pow((i + 0.45) / 9, 2.1);
      g.lineWidth = Math.max(1, w * 0.006 * (0.25 + t0));
      g.beginPath();
      g.moveTo(vx, vy + (h - vy) * t0);
      g.lineTo(vx, vy + (h - vy) * t1);
      g.stroke();
    }
    g.restore();

    // trees along the verges
    const rng = seeded(0x7f31);
    for (let i = 0; i < 46; i++) {
      const side = i % 2 ? 1 : -1;
      const t0 = Math.pow(rng(), 1.6);
      const y = vy + (h - vy) * t0 + h * 0.01;
      const spread = (0.02 + t0 * 0.34) * w;
      const x = vx + side * (spread + rng() * w * 0.12);
      const s = (0.02 + t0 * 0.1) * h;
      if (x < -s || x > w + s) continue;
      g.fillStyle = t0 > 0.45 ? "#27401f" : "#33512a";
      g.beginPath();
      g.moveTo(x, y - s);
      g.lineTo(x + s * 0.42, y);
      g.lineTo(x - s * 0.42, y);
      g.closePath();
      g.fill();
    }

    // a little haze at the treeline, the way distance reads in a photograph
    const haze = g.createLinearGradient(0, horizon - h * 0.1, 0, horizon + h * 0.06);
    haze.addColorStop(0, "rgba(226,214,190,0.45)");
    haze.addColorStop(1, "rgba(226,214,190,0)");
    g.fillStyle = haze;
    g.fillRect(0, horizon - h * 0.1, w, h * 0.16);
  }

  // Measured off the real screen: about 3.3s — a wash in over ~1.1s, a short
  // hold, a wash out over ~1.2s, then a rest before it starts again.
  const PULSE_MS = 3300;
  function pulseAt(ts) {
    const p = (ts % PULSE_MS) / PULSE_MS;
    const UP = 1.1 / 3.3, HOLD = 1.55 / 3.3, DOWN = 2.75 / 3.3;
    let v;
    if (p < UP) v = p / UP;
    else if (p < HOLD) v = 1;
    else if (p < DOWN) v = 1 - (p - HOLD) / (DOWN - HOLD);
    else v = 0;
    return v * v * (3 - 2 * v);
  }

  /* The photo panel. The real app shows a photograph that changes, so this
     takes a list of real image files and shifts between them on a cycle,
     cross-fading, with the green wash running over the top.

     Add photographs by dropping .jpg files into photos/ and listing their
     names here. The first one is the one an inspector sees first. With the
     list empty the app paints its own landscape so it still works. */
  const PHOTOS = ["bird.jpg"];
  const PHOTO_DIR = "photos/";
  const SHIFT_MS = 15000;   // how long each photograph stays up
  const FADE_MS = 900;      // cross-fade between them

  let photoImgs = null;
  function loadPhotos(onChange) {
    if (photoImgs) return photoImgs;
    photoImgs = [];
    PHOTOS.forEach((name, i) => {
      const img = new Image();
      img.onload = () => { photoImgs[i] = img; onChange && onChange(); };
      img.onerror = () => { photoImgs[i] = null; };
      img.src = PHOTO_DIR + name;
    });
    return photoImgs;
  }
  const readyPhotos = () => (photoImgs || []).filter(Boolean);

  function drawCover(g, img, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const dw = img.width * s, dh = img.height * s;
    g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  function startInspectionArt(tk) {
    const qrEl = document.getElementById("insp-qr");
    const photoEl = document.getElementById("insp-photo");
    if (!qrEl || !photoEl) return;

    let lastMinute = "";
    function refreshQR() {
      const key = Math.floor(now() / 60000);
      if (String(key) === lastMinute) return;
      lastMinute = String(key);
      paintQR(qrEl, qrPayload(tk, now()));
    }

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let painted = null, aw = 0, ah = 0;
    function sizePhoto() {
      const box = photoEl.getBoundingClientRect();
      aw = Math.max(1, Math.round(box.width * dpr));
      ah = Math.max(1, Math.round(box.height * dpr));
      photoEl.width = aw; photoEl.height = ah;
      painted = document.createElement("canvas");
      painted.width = aw; painted.height = ah;
      paintLandscape(painted, aw, ah);
    }
    sizePhoto();
    refreshQR();
    loadPhotos();

    const onResize = () => { sizePhoto(); lastMinute = ""; refreshQR(); };
    window.addEventListener("resize", onResize);

    const g = photoEl.getContext("2d");
    const green = (getComputedStyle(root).getPropertyValue("--valid") || "#5c9800").trim();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function frame() {
      const ts = now();
      refreshQR();
      g.clearRect(0, 0, aw, ah);

      const pics = readyPhotos();
      if (pics.length === 0) {
        if (painted) g.drawImage(painted, 0, 0);
      } else if (pics.length === 1) {
        drawCover(g, pics[0], aw, ah);
      } else {
        // the shift is clock-driven, so the photograph on two phones matches
        const slot = Math.floor(ts / SHIFT_MS);
        const into = ts % SHIFT_MS;
        const cur = pics[slot % pics.length];
        const nxt = pics[(slot + 1) % pics.length];
        drawCover(g, cur, aw, ah);
        if (into > SHIFT_MS - FADE_MS) {
          g.globalAlpha = (into - (SHIFT_MS - FADE_MS)) / FADE_MS;
          drawCover(g, nxt, aw, ah);
          g.globalAlpha = 1;
        }
      }

      g.globalAlpha = pulseAt(ts) * (calm ? 0.3 : 0.46);
      g.fillStyle = green;
      g.fillRect(0, 0, aw, ah);
      g.globalAlpha = 1;
      inspectAnim = requestAnimationFrame(frame);
    }
    frame();

    const obs = new MutationObserver(() => {
      if (!inspectEl.hasAttribute("data-open")) {
        window.removeEventListener("resize", onResize);
        obs.disconnect();
      }
    });
    obs.observe(inspectEl, { attributes: true });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ==========================================================
     13. Toasts
     ========================================================== */

  function toast(title, sub, kind) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<span class="t-ico" style="background:${kind === "warn" ? "var(--warn)" : kind === "expired" ? "var(--expired)" : "var(--valid)"}">${ICON.logo(17)}</span>
      <span><span class="t-title">${esc(title)}</span><br><span class="t-sub">${esc(sub)}</span></span>`;
    toastsEl.appendChild(el);
    buzz(10);
    setTimeout(() => {
      el.classList.add("out");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 4200);
  }

  /* ==========================================================
     14. Live tick
     ========================================================== */

  let lastMinuteKey = "";

  function tick() {
    const ts = now();

    // status bar + every "current time" readout on screen
    const sb = document.getElementById("sb-time");
    if (sb) sb.textContent = hhmm(ts);
    document.querySelectorAll('[data-live="clock"]').forEach((el) => (el.textContent = hhmm(ts)));
    document.querySelectorAll('[data-live="code"]').forEach((el) => (el.textContent = controlCode(ts)));
    document.querySelectorAll('[data-live="idate"]').forEach((el) => (el.textContent = shortDate(ts) + " " + hhmm(ts)));

    // countdowns in the list
    document.querySelectorAll('[data-live="left"]').forEach((el) => {
      const tk = state.tickets.find((x) => x.id === el.dataset.tid);
      if (!tk) return;
      const st = ticketState(tk, ts);
      const span = el.querySelector("span");
      if (st === "expired") {
        if (el.dataset.state !== "expired") { refresh(); return; }
        span.textContent = `${t("expired")} ${shortDate(tk.expiresAt)} ${hhmm(tk.expiresAt)}`;
      } else {
        if (el.dataset.state !== st) { refresh(); return; }
        span.textContent = shortRemaining(tk.expiresAt - ts);
      }
    });

    // the big two-box counter on the detail screen
    document.querySelectorAll('[data-live="cd"]').forEach((el) => {
      const tk = state.tickets.find((x) => x.id === el.dataset.tid);
      if (!tk) return;
      if (ticketState(tk, ts) === "expired") { refresh(); return; }
      const r = remainingParts(tk.expiresAt - ts);
      const pair = r.d > 0 ? [r.d, r.h] : r.h > 0 ? [r.h, pad(r.m)] : [r.m, pad(r.s)];
      const boxes = el.querySelectorAll(".cd-box");
      if (boxes[0]) boxes[0].textContent = pair[0];
      if (boxes[1]) boxes[1].textContent = pair[1];
      const banner = el.closest(".pass") && el.closest(".pass").querySelector(".pass-banner");
      const st = ticketState(tk, ts);
      if (banner && banner.dataset.state !== st) refresh();
    });

    // expiry warnings and the moment a ticket dies
    for (const tk of state.tickets) {
      const left = tk.expiresAt - ts;
      if (state.expiryReminder && left > 0 && left <= 5 * 60000 && !state.warned[tk.id]) {
        state.warned[tk.id] = true; save();
        toast(t("expiryWarnTitle"), t("expiryWarnSub", { n: Math.max(1, Math.ceil(left / 60000)), what: productName(tk).toLowerCase() }), "warn");
      }
      if (left <= 0 && !state.expiredSeen[tk.id] && ts - tk.expiresAt < 90000) {
        state.expiredSeen[tk.id] = true; save();
        toast(t("expiredToastTitle"), t("expiredToastSub"), "expired");
      }
    }

    // bike availability drifts, like a real feed
    const mk = Math.floor(ts / 20000);
    if (bikeData && String(mk) !== lastMinuteKey) {
      lastMinuteKey = String(mk);
      for (const s of bikeData) {
        const delta = (hash32(s.name + mk) % 3) - 1;
        const b = Math.max(0, Math.min(s.cap, s.bikes + delta));
        s.bikes = b; s.docks = s.cap - b;
      }
      document.querySelectorAll('[data-live="bikes"]').forEach((el) => {
        const s = bikeData.find((x) => x.id === el.dataset.sid);
        if (!s) return;
        if (el.classList.contains("dock-pill")) {
          el.innerHTML = `${s.bikes}<small>${esc(s.bikes === 1 ? t("bike1") : t("bikes"))}</small>`;
          el.dataset.level = s.bikes === 0 ? "none" : s.bikes <= 3 ? "low" : "ok";
        } else el.textContent = s.bikes;
      });
    }
  }

  setInterval(tick, 250);

  /* ==========================================================
     15. Events
     ========================================================== */

  let verTaps = 0, verTapTimer = null;

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act],[data-tab],[data-ticket],[data-more],[data-lang],[data-appear],[data-station],[data-product],[data-zone],[data-count],#ver-tap");
    if (!el) return;

    // tabs
    if (el.dataset.tab) { buzz(6); go(el.dataset.tab); return; }

    // ticket cards
    if (el.dataset.ticket) { openDetails = false; go("detail", { id: el.dataset.ticket }); return; }

    if (el.dataset.station) { go("station", { id: el.dataset.station }); return; }

    if (el.dataset.more) {
      const m = el.dataset.more;
      const map = { profile: "profile", payments: "payments", history: "history", language: "language", appearance: "appearance", notifications: "notifications", help: "help", about: "about", stage: "stage" };
      if (map[m]) go(map[m]);
      return;
    }

    if (el.dataset.lang) { state.lang = el.dataset.lang; save(); refresh(); return; }
    if (el.dataset.appear) { state.appearance = el.dataset.appear; save(); applyAppearance(); refresh(); return; }

    if (el.id === "ver-tap") {
      verTaps++;
      clearTimeout(verTapTimer);
      verTapTimer = setTimeout(() => (verTaps = 0), 1600);
      if (verTaps >= 5) {
        verTaps = 0;
        if (!state.stageUnlocked) { state.stageUnlocked = true; save(); buzz([8, 30, 8]); toast(t("stageOpen"), t("stageIntro"), "valid"); }
        go("stage");
      }
      return;
    }

    // buy-flow selections
    if (el.dataset.product) { buy.product = el.dataset.product; renderBuy(); return; }
    if (el.dataset.zone) { buy.zone = Number(el.dataset.zone); renderBuy(); return; }
    if (el.dataset.count) {
      const id = el.dataset.count, d = Number(el.dataset.delta);
      const n = Math.max(0, Math.min(9, (buy.counts[id] || 0) + d));
      if (n === 0) delete buy.counts[id]; else buy.counts[id] = n;
      buzz(5);
      renderBuy();
      return;
    }

    const act = el.dataset.act;
    switch (act) {
      case "back": back(); break;
      case "buy": openBuy(); break;
      case "buy-close": closeBuy(); break;
      case "buy-back": buy.step--; renderBuy(); break;
      case "buy-next": buy.step++; renderBuy(); break;
      case "buy-pay": openPay(); break;
      case "pay-cancel":
        delete payEl.dataset.busy;
        payEl.removeAttribute("data-open"); payEl.innerHTML = "";
        break;
      case "toggle-details": {
        openDetails = !openDetails;
        const d = el.closest(".details");
        if (openDetails) d.setAttribute("data-open", ""); else d.removeAttribute("data-open");
        el.querySelector("span").textContent = openDetails ? t("hideDetails") : t("showDetails");
        break;
      }
      case "receipt": go("receipt", { id: el.dataset.id }); break;
      case "covers": go("covers"); break;
      case "inspect": openInspection(el.dataset.id); break;
      case "inspect-close": closeInspection(); break;
      case "unlock": {
        const s = ensureBikeData().find((x) => x.id === el.dataset.id);
        if (s && s.bikes > 0) {
          s.bikes--; s.docks++;
          toast(t("unlock"), s.name + " · " + t("returnAny"), "valid");
          refresh();
        }
        break;
      }
      case "stage-give": {
        const mins = Math.max(1, Number(document.getElementById("st-min").value) || 6);
        const prod = document.getElementById("st-prod").value;
        const who = document.getElementById("st-who").value;
        const ts = now();
        const tk = makeTicket({ product: prod, zone: 1, counts: { [who]: 1 }, purchasedAt: ts, method: "Kvikk" });
        tk.expiresAt = tk.startsAt + mins * 60000;
        state.tickets.push(tk);
        delete state.warned[tk.id];
        save();
        toast(t("ticketReady"), t("ticketReadySub", { what: productName(tk), time: hhmm(tk.expiresAt) }), "valid");
        go("detail", { id: tk.id });
        break;
      }
      case "stage-expire": {
        const ts = now();
        const tk = state.tickets.filter((x) => ticketState(x, ts) !== "expired").sort((a, b) => a.expiresAt - b.expiresAt)[0];
        if (tk) { tk.expiresAt = ts - 1000; save(); go("tickets"); }
        break;
      }
      case "stage-reset":
        if (confirm(t("confirmReset"))) {
          try { localStorage.removeItem(KEY); } catch (err) {}
          state = freshState();
          bikeData = null; bikeLoaded = false;
          applyAppearance();
          go("tickets");
        }
        break;
    }
  });

  root.addEventListener("change", (e) => {
    if (e.target.id === "sw-expiry") { state.expiryReminder = e.target.checked; save(); }
    if (e.target.id === "st-freeze") {
      state.frozen = e.target.checked;
      state.frozenAt = state.frozen ? Date.now() + (state.clockOffsetMin || 0) * 60000 : null;
      save();
    }
    if (e.target.id === "st-offset") {
      state.clockOffsetMin = Number(e.target.value) || 0;
      if (state.frozen) state.frozenAt = Date.now() + state.clockOffsetMin * 60000;
      save(); tick();
    }
  });

  root.addEventListener("input", (e) => {
    if (e.target.id === "bike-q") {
      SCREENS.bike.query = e.target.value;
      const holder = screensEl.lastElementChild;
      const list = holder.querySelector(".group .list");
      const q = e.target.value.toLowerCase();
      if (list) list.innerHTML = ensureBikeData().filter((s) => !q || s.name.toLowerCase().includes(q))
        .sort((a, b) => a.dist - b.dist).map(stationRow).join("");
    }
  });

  // Hardware/browser back gesture pops the stack instead of leaving the app.
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (inspectEl.hasAttribute("data-open")) closeInspection();
      else if (payEl.hasAttribute("data-open")) { payEl.removeAttribute("data-open"); payEl.innerHTML = ""; delete payEl.dataset.busy; }
      else if (sheetEl.hasAttribute("data-open")) closeBuy();
      else back();
    }
  });

  /* ==========================================================
     16. Appearance + boot
     ========================================================== */

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  function applyAppearance() {
    const mode = state.appearance === "system" ? (mql.matches ? "dark" : "light") : state.appearance;
    root.dataset.appearance = mode;
    document.documentElement.style.colorScheme = mode;
  }
  mql.addEventListener && mql.addEventListener("change", () => { if (state.appearance === "system") { applyAppearance(); refresh(); } });

  applyAppearance();
  stack = [{ name: ROOTS[state.tab] ? state.tab : "tickets", params: {} }];
  renderStack(false);

  // Keep the clock honest after the phone has been asleep in a pocket.
  document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
})();
