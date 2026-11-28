
document.addEventListener("DOMContentLoaded", async () => {

  // =========================================
  // SUPABASE CONNECTION
  // =========================================

  const SUPABASE_URL = "https://vmmabixqtnmeijyhhqmu.supabase.co";
  const SUPABASE_KEY = "sb_publishable_MgGuckOn578rxz5BfryCZA_R1At9k2A";

  const ADMIN_EMAIL = "shambhupatil526@gmail.com";
  const EXECUTIVE_EMAIL = "kadam6884@gmail.com";

  const ADMIN_UID = "6a2cf31a-7345-4709-8ffb-d66fdeff18df";
  const EXECUTIVE_UID = "1c00e279-873b-40b7-8ea6-119f4fcb6539";

  const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const KEYS = {
    orders: "printflowOrders",
    jobs: "printflowJobWorks",
    payments: "printflowPayments",
    expenses: "printflowExpenses"
  };

  const TABLES = {
    [KEYS.orders]: "orders",
    [KEYS.jobs]: "job_works",
    [KEYS.payments]: "payments",
    [KEYS.expenses]: "expenses"
  };

  const ID_FIELDS = {
    [KEYS.orders]: "orderId",
    [KEYS.jobs]: "jobWorkId",
    [KEYS.payments]: "paymentId",
    [KEYS.expenses]: "expenseId"
  };

  const LOGIN_KEY = "printflowLoginCredentials";
  const SESSION_KEY = "printflowLoginSession";
  const USERNAME_KEY = "printflowUsernames";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const content = $("#pageContent");

  let currentPage = "dashboard";
  let selectedRole = "admin";
  let cloudReady = false;
  let syncQueues = {};

  // =========================================
  // BASIC HELPERS
  // =========================================

  function toast(message) {
    const old = $(".toast");
    if (old) old.remove();

    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);

    setTimeout(() => el.remove(), 2600);
  }

  function currentRole() {
    try {
      const session = JSON.parse(
        localStorage.getItem(SESSION_KEY) || "null"
      );

      return session?.role || "";
    } catch {
      return "";
    }
  }

  function isAdmin() {
    return currentRole() === "admin";
  }

  function isExecutive() {
    return currentRole() === "executive";
  }

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }

  function orders() {
    return read(KEYS.orders);
  }

  function jobs() {
    return read(KEYS.jobs);
  }

  function payments() {
    return read(KEYS.payments);
  }

  function expenses() {
    return read(KEYS.expenses);
  }

  function storageKey(key) {
    if (key === "orders" || key === KEYS.orders) return KEYS.orders;
    if (key === "jobs" || key === KEYS.jobs) return KEYS.jobs;
    return key;
  }

  const money = n => "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const num = v => Math.max(0, Number(v) || 0);

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[c]);

  const today = () => {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  };

  const dateText = d => d
    ? new Date(d + "T00:00:00").toLocaleDateString("en-IN")
    : "-";

  const id = prefix => prefix + "-" + Date.now().toString().slice(-8);

  // =========================================
  // USERNAME MANAGEMENT
  // =========================================

  function getUsernames() {
    try {
      return JSON.parse(localStorage.getItem(USERNAME_KEY)) || {
        admin: "admin",
        executive: "executive"
      };
    } catch {
      return {
        admin: "admin",
        executive: "executive"
      };
    }
  }

  function getUsername(role) {
    return getUsernames()[role] || role;
  }

  // =========================================
  // ADMIN / EXECUTIVE PERMISSIONS
  // =========================================

  const permissionStyle = document.createElement("style");

  permissionStyle.textContent = `
    body.auth-locked .app {
      display:none !important;
    }

    body.executive-view .sidebar nav [data-page="banner"],
    body.executive-view .sidebar nav [data-page="jobwork"] {
      display:none !important;
    }

    body.executive-view #pageContent [data-page="banner"],
    body.executive-view #pageContent [data-page="jobwork"],
    body.executive-view #pageContent #addBanner,
    body.executive-view #pageContent [data-edit-record],
    body.executive-view #pageContent [data-delete-record],
    body.executive-view #pageContent [data-delete-expense],
    body.executive-view #pageContent .admin-only {
      display:none !important;
    }
  `;

  document.head.appendChild(permissionStyle);

  // =========================================
  // LOGIN SCREEN
  // =========================================

  function showLogin() {
    document.body.classList.add("auth-locked");
    document.body.classList.remove("executive-view");

    const screen = $("#loginScreen");
    if (screen) screen.style.display = "flex";
  }

  function showApp() {
    document.body.classList.remove("auth-locked");
    document.body.classList.toggle("executive-view", !isAdmin());

    const screen = $("#loginScreen");
    if (screen) screen.style.display = "none";

    const session = JSON.parse(
      localStorage.getItem(SESSION_KEY) || "null"
    );

    if (!session) return;

    const topbar = $(".topbar");

    if (!topbar) return;

    let actions = $("#authActions");

    if (!actions) {
      actions = document.createElement("div");
      actions.className = "auth-actions";
      actions.id = "authActions";
      topbar.appendChild(actions);
    }

    actions.innerHTML = `
      <span style="font-size:12px;font-weight:700;color:#345">
        ${session.role === "admin" ? "ADMIN" : "EXECUTIVE"}
      </span>

      <button type="button" id="changeUsernameBtn">
        Change Username
      </button>

      <button type="button" id="changePasswordBtn">
        Change Password
      </button>

      <button type="button" class="logout" id="logoutBtn">
        Logout
      </button>
    `;

    $("#logoutBtn").onclick = logout;
    $("#changePasswordBtn").onclick = changePassword;
    $("#changeUsernameBtn").onclick = changeUsername;
  }

  // =========================================
  // SUPABASE AUTH LOGIN
  // =========================================

  $$(".login-tabs button").forEach(button => {
    button.addEventListener("click", () => {
      selectedRole = button.dataset.role;

      $$(".login-tabs button").forEach(tab => {
        tab.classList.toggle("active", tab === button);
      });

      $("#loginError").textContent = "";
      $("#loginUsername").value = "";
      $("#loginPassword").value = "";
    });
  });

  $("#loginForm").addEventListener("submit", async event => {
    event.preventDefault();

    const username = $("#loginUsername").value.trim();
    const password = $("#loginPassword").value;

    const errorBox = $("#loginError");
    const submitButton = $(".login-submit");

    if (username !== getUsername(selectedRole)) {
      errorBox.textContent = "Incorrect username or password.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Please wait...";

    const email = selectedRole === "admin"
      ? ADMIN_EMAIL
      : EXECUTIVE_EMAIL;

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const user = data.user;

      const validUser =
        (selectedRole === "admin" && user.id === ADMIN_UID) ||
        (selectedRole === "executive" && user.id === EXECUTIVE_UID);

      if (!validUser) {
        await supabaseClient.auth.signOut();
        throw new Error("या Account ला निवडलेल्या Role ची परवानगी नाही.");
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify({
        role: selectedRole,
        username,
        userId: user.id
      }));

      errorBox.textContent = "";

      showApp();

      await startApplication();

    } catch (error) {
      errorBox.textContent =
        error.message || "Login अयशस्वी. पुन्हा प्रयत्न करा.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Login to Dashboard";
    }
  });

  async function logout() {
    await supabaseClient.auth.signOut();

    localStorage.removeItem(SESSION_KEY);

    location.reload();
  }

  // =========================================
  // CHANGE PASSWORD
  // =========================================

  async function changePassword() {
    if (!currentRole()) return;

    const newPassword = prompt(
      "Enter new password (minimum 6 characters):"
    );

    if (newPassword === null) return;

    if (newPassword.length < 6) {
      return alert("Password must contain at least 6 characters.");
    }

    const confirmPassword = prompt("Confirm new password:");

    if (confirmPassword !== newPassword) {
      return alert("Passwords do not match.");
    }

    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) {
      alert("Password बदलता आला नाही: " + error.message);
      return;
    }

    alert("Password changed successfully.");
  }

  // =========================================
  // CHANGE USERNAME
  // =========================================

  function changeUsername() {
    const role = currentRole();
    if (!role) return;

    const oldUsername = getUsername(role);

    const newUsername = prompt(
      "Enter new username:",
      oldUsername
    );

    if (newUsername === null) return;

    if (newUsername.trim().length < 3) {
      return alert("Username किमान 3 अक्षरांचा असावा.");
    }

    const usernames = getUsernames();

    usernames[role] = newUsername.trim();

    localStorage.setItem(
      USERNAME_KEY,
      JSON.stringify(usernames)
    );

    alert("Username changed successfully.");

    showApp();
  }

  // =========================================
  // DATABASE SYNC
  // =========================================

  function getRecordId(key, record) {
    const field = ID_FIELDS[key];
    return record?.[field] ? String(record[field]) : "";
  }

  function makeDatabaseRows(key, records) {
    return records
      .filter(record => getRecordId(key, record))
      .map(record => ({
        id: getRecordId(key, record),
        data: record,
        updated_at: new Date().toISOString()
      }));
  }

  async function loadCloudData() {
    const cloudData = {};

    for (const key of Object.keys(TABLES)) {
      const table = TABLES[key];

      const { data, error } = await supabaseClient
        .from(table)
        .select("id,data");

      if (error) throw error;

      cloudData[key] = data || [];
    }

    return cloudData;
  }

  async function uploadRows(key, records) {
    if (!isAdmin() || !records.length) return;

    const table = TABLES[key];
    const rows = makeDatabaseRows(key, records);

    if (!rows.length) return;

    const { error } = await supabaseClient
      .from(table)
      .upsert(rows, { onConflict: "id" });

    if (error) throw error;
  }

  async function deleteCloudRows(key, ids) {
    if (!isAdmin() || !ids.length) return;

    const table = TABLES[key];

    const { error } = await supabaseClient
      .from(table)
      .delete()
      .in("id", ids);

    if (error) throw error;
  }

  async function syncInitialData() {
    try {
      const cloudData = await loadCloudData();

      for (const key of Object.keys(TABLES)) {
        const localRecords = read(key);

        const cloudRecords = cloudData[key].map(row => ({
          id: row.id,
          data: row.data
        }));

        const merged = new Map();

        // आधी Cloud Data
        cloudRecords.forEach(row => {
          if (row.data) {
            merged.set(String(row.id), row.data);
          }
        });

        // Local Data फक्त Cloud मध्ये नसल्यास जोडा
        const localOnly = [];

        localRecords.forEach(record => {
          const recordId = getRecordId(key, record);

          if (!recordId) return;

          if (!merged.has(recordId)) {
            merged.set(recordId, record);
            localOnly.push(record);
          }
        });

        const finalRecords = [...merged.values()];

        localStorage.setItem(
          key,
          JSON.stringify(finalRecords)
        );

        // Admin असल्यास जुना Local Data Cloud मध्ये पाठवा
        if (isAdmin() && localOnly.length) {
          await uploadRows(key, localOnly);
        }
      }

      cloudReady = true;

      toast("Database Sync पूर्ण झाले.");

      return true;

    } catch (error) {
      console.error("Database Sync Error:", error);

      cloudReady = false;

      toast("Database Sync अयशस्वी. Local Data वापरत आहोत.");

      return false;
    }
  }

  // =========================================
  // SAVE / UPDATE / DELETE DATABASE RECORDS
  // =========================================

  function write(key, data) {
    if (!isAdmin()) {
      toast("तुम्हाला बदल करण्याची परवानगी नाही.");
      return false;
    }

    const actualKey = storageKey(key);

    if (!TABLES[actualKey]) {
      return false;
    }

    const previous = read(actualKey);

    localStorage.setItem(
      actualKey,
      JSON.stringify(data)
    );

    if (!cloudReady) {
      toast("Local मध्ये सेव्ह झाले. Database Sync बाकी आहे.");
      return true;
    }

    const oldIds = new Set(
      previous.map(x => getRecordId(actualKey, x)).filter(Boolean)
    );

    const newIds = new Set(
      data.map(x => getRecordId(actualKey, x)).filter(Boolean)
    );

    const removedIds = [...oldIds].filter(x => !newIds.has(x));

    // प्रत्येक Table साठी क्रमाने Sync
    syncQueues[actualKey] = (syncQueues[actualKey] || Promise.resolve())
      .then(async () => {
        await uploadRows(actualKey, data);
        await deleteCloudRows(actualKey, removedIds);
      })
      .catch(error => {
        console.error("Cloud Save Error:", error);
        toast("Cloud Sync अयशस्वी. Local Data सुरक्षित आहे.");
      });

    return true;
  }

  // =========================================
  // START APPLICATION AFTER AUTH
  // =========================================

  async function startApplication() {
    showApp();

    document.body.classList.toggle("executive-view", !isAdmin());

    await syncInitialData();

    navigate("dashboard");
  }

  // =========================================
  // PRINT FUNCTION
  // =========================================

  function printReport(title, html) {
    const win = window.open("", "_blank");

    if (!win) {
      return toast("Print साठी Popup Allow करा.");
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${esc(title)}</title>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 25px;
            color: #17233c;
          }
          h1 { margin-bottom: 20px; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th, td {
            border: 1px solid #dce3ed;
            padding: 9px;
            text-align: left;
            font-size: 12px;
          }
          th { background: #edf2fa; }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .stat-card, .panel, .summary {
            border: 1px solid #dce3ed;
            padding: 12px;
            margin: 10px 0;
            border-radius: 6px;
          }
          button { display: none !important; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>${esc(title)}</h1>
        ${html}
        <script>
          window.onload = function() {
            window.print();
          };
        <\/script>
      </body>
      </html>
    `);

    win.document.close();
  }

  // =========================================
  // EDIT ORDER / JOB WORK
  // =========================================

  function editRecord(key, recordId) {
    if (!isAdmin()) {
      return toast("Edit करण्याची परवानगी फक्त Admin ला आहे.");
    }

    const actualKey = storageKey(key);
    const data = read(actualKey);

    const index = data.findIndex(x =>
      String(x.orderId || x.jobWorkId) === String(recordId)
    );

    if (index < 0) return toast("ऑर्डर सापडली नाही.");

    const record = data[index];
    const job = actualKey === KEYS.jobs;

    const customer = prompt("Customer Name:", record.customer || "");
    if (customer === null) return;

    if (!customer.trim()) {
      return toast("Customer Name आवश्यक आहे.");
    }

    const mobile = prompt("Mobile Number:", record.mobile || "");
    if (mobile === null) return;

    const date = prompt("Order Date (YYYY-MM-DD):", record.date || today());
    if (date === null) return;

    const file = prompt("File / Design Details:", record.file || "");
    if (file === null) return;

    const editedBanners = [];

    for (let i = 0; i < (record.banners || []).length; i++) {
      const b = record.banners[i];

      const media = prompt(`Banner ${i + 1} - Material:`, b.media || "");
      if (media === null) return;

      const width = prompt(`Banner ${i + 1} - Width:`, b.width);
      if (width === null) return;

      const height = prompt(`Banner ${i + 1} - Height:`, b.height);
      if (height === null) return;

      const quantity = prompt(`Banner ${i + 1} - Quantity:`, b.quantity);
      if (quantity === null) return;

      const rate = prompt(`Banner ${i + 1} - Printing Rate:`, b.rate);
      if (rate === null) return;

      let pastingAmount = num(b.pasting);
      const pastingRate = num(b.pastingRate);

      if (!job) {
        const answer = prompt(
          `Banner ${i + 1} - Pasting Amount:`,
          pastingAmount
        );

        if (answer === null) return;

        pastingAmount = Number(answer);

        if (!Number.isFinite(pastingAmount) || pastingAmount < 0) {
          return toast("Pasting Amount योग्य भरा.");
        }
      }

      const w = Number(width);
      const h = Number(height);
      const q = Number(quantity);
      const r = Number(rate);

      if (
        !media.trim() ||
        !Number.isFinite(w) || w <= 0 ||
        !Number.isFinite(h) || h <= 0 ||
        !Number.isFinite(q) || q <= 0 ||
        !Number.isFinite(r) || r < 0
      ) {
        return toast("Banner ची माहिती योग्य भरा.");
      }

      const area = w * h * q;
      const printing = area * r;
      const pasting = job ? 0 : pastingAmount;
      const amount = printing + pasting;

      editedBanners.push({
        ...b,
        media: media.trim(),
        width: w,
        height: h,
        quantity: q,
        rate: r,
        area,
        printing,
        pasting,
        pastingRate,
        amount
      });
    }

    const total = editedBanners.reduce((s, x) => s + x.amount, 0);
    const received = getReceived(record);
    const discount = getDiscount(record);

    if (received + discount > total + 0.001) {
      return toast("Total रक्कम Received + Discount पेक्षा कमी असू शकत नाही.");
    }

    record.customer = customer.trim();
    record.mobile = mobile.trim();
    record.date = date;
    record.file = file.trim();
    record.banners = editedBanners;
    record.totalArea = editedBanners.reduce((s, x) => s + x.area, 0);
    record.printingAmount = editedBanners.reduce((s, x) => s + x.printing, 0);
    record.pastingAmount = editedBanners.reduce((s, x) => s + x.pasting, 0);
    record.total = total;
    record.balance = Math.max(0, total - received - discount);
    record.status = record.balance <= 0 ? "Paid" : "Pending";

    data[index] = record;
    write(actualKey, data);

    toast("ऑर्डर अपडेट झाली.");
    navigate(currentPage);
  }

  // =========================================
  // DELETE ORDER / JOB WORK
  // =========================================

  function deleteRecord(key, recordId) {
    if (!isAdmin()) {
      return toast("Delete करण्याची परवानगी फक्त Admin ला आहे.");
    }

    const actualKey = storageKey(key);

    if (!confirm("ही ऑर्डर कायमची Delete करायची आहे का?")) return;

    const updated = read(actualKey).filter(x =>
      String(x.orderId || x.jobWorkId) !== String(recordId)
    );

    write(actualKey, updated);

    write(
      KEYS.payments,
      payments().filter(x => String(x.recordId) !== String(recordId))
    );

    toast("ऑर्डर Delete झाली.");
    navigate(currentPage);
  }

  function recordActions(x) {
    if (!isAdmin()) {
      return `<td>—</td>`;
    }

    const key = x.recordKey || (x.jobWorkId ? "jobs" : "orders");
    const recordId = x.recordId || x.orderId || x.jobWorkId;

    return `<td>
      <button type="button" class="btn secondary small"
        data-edit-record="${esc(recordId)}"
        data-record-key="${key}">Edit</button>

      <button type="button" class="btn danger small"
        data-delete-record="${esc(recordId)}"
        data-record-key="${key}">Delete</button>
    </td>`;
  }

  content.addEventListener("click", e => {
    const edit = e.target.closest("[data-edit-record]");
    const del = e.target.closest("[data-delete-record]");

    if (edit) {
      e.preventDefault();
      editRecord(edit.dataset.recordKey, edit.dataset.editRecord);
      return;
    }

    if (del) {
      e.preventDefault();
      deleteRecord(del.dataset.recordKey, del.dataset.deleteRecord);
    }
  });

  function allRecords() {
    return [
      ...orders().map(x => ({
        ...x,
        type:"Banner Order",
        recordKey:"orders",
        recordId:x.orderId
      })),
      ...jobs().map(x => ({
        ...x,
        type:"Job Work",
        recordKey:"jobs",
        recordId:x.jobWorkId
      }))
    ];
  }

  function getTotal(x) {
    return num(x.total);
  }

  function getReceived(x) {
    return num(x.received);
  }

  function getDiscount(x) {
    return num(x.discount);
  }

  function getBalance(x) {
    if (x.balance !== undefined) return num(x.balance);
    return Math.max(0, getTotal(x) - getReceived(x) - getDiscount(x));
  }

  function getStats() {
    const records = allRecords();

    return {
      sales: records.reduce((s, x) => s + getTotal(x), 0),
      received: records.reduce((s, x) => s + getReceived(x), 0),
      discount: records.reduce((s, x) => s + getDiscount(x), 0),
      due: records.reduce((s, x) => s + getBalance(x), 0),
      expenses: expenses().reduce((s, x) => s + num(x.amount), 0),
      count: records.length
    };
  }

  function page(title, subtitle, html) {
    $("#pageTitle").textContent = title;
    $("#pageSubtitle").textContent = subtitle;
    content.innerHTML = html;

    if (!isAdmin()) {
      if (currentPage === "payments" || currentPage === "expenses") {
        $$(".form-card", content).forEach(form => form.remove());
      }

      $$("[data-edit-record], [data-delete-record], [data-delete-expense]", content)
        .forEach(button => button.remove());

      $$('[data-page="banner"], [data-page="jobwork"]', content)
        .forEach(button => button.remove());

      const paymentQuickButton = $('[data-page="payments"]', content);

      if (paymentQuickButton && currentPage === "dashboard") {
        paymentQuickButton.remove();
      }
    }
  }

  function navigate(name) {
    if (!isAdmin() && (name === "banner" || name === "jobwork")) {
      return toast("ही सुविधा फक्त Admin साठी आहे.");
    }

    currentPage = name;

    $$(".sidebar nav a").forEach(a => {
      a.classList.toggle("active", a.dataset.page === name);
    });

    const pages = {
      dashboard: renderDashboard,
      banner: renderBanner,
      jobwork: renderJobWork,
      customers: renderCustomers,
      payments: renderPayments,
      expenses: renderExpenses,
      orders: renderOrders,
      reports: renderReports
    };

    (pages[name] || renderDashboard)();
  }

  document.addEventListener("click", e => {
    const link = e.target.closest("[data-page]");

    if (link) {
      e.preventDefault();
      navigate(link.dataset.page);
    }
  });

  $("#todayDate").textContent = new Date().toLocaleDateString("en-IN", {
    day:"2-digit",
    month:"short",
    year:"numeric"
  });

  function statCard(label, value, icon, cls = "") {
    return `<div class="stat-card ${cls}">
      <span class="stat-icon">${icon}</span>
      <div class="stat-label">${label}</div>
      <h2>${value}</h2>
      <small>All time overview</small>
    </div>`;
  }

  function monthlySales() {
    const result = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();

      const total = allRecords()
        .filter(x => {
          const dt = new Date((x.date || today()) + "T00:00:00");
          return dt.getMonth() === month &&
                 dt.getFullYear() === year;
        })
        .reduce((s, x) => s + getTotal(x), 0);

      result.push({
        label: d.toLocaleDateString("en-IN", {month:"short"}),
        value: total
      });
    }

    return result;
  }

  function salesChart() {
    const data = monthlySales();

    if (!data.some(x => x.value > 0)) {
      return `<div class="chart-empty">
        अजून Sales Data उपलब्ध नाही.<br>
        ऑर्डर सेव्ह झाल्यानंतर चार्ट दिसेल.
      </div>`;
    }

    const max = Math.max(...data.map(x => x.value), 1);

    const points = data.map((x, i) => {
      const px = 25 + i * 65;
      const py = 180 - (x.value / max) * 145;
      return `${px},${py}`;
    }).join(" ");

    const circles = data.map((x, i) => {
      const px = 25 + i * 65;
      const py = 180 - (x.value / max) * 145;

      return `<circle cx="${px}" cy="${py}" r="4" fill="#2864df"/>
        <text x="${px}" y="210" text-anchor="middle"
          font-size="10" fill="#77839a">${esc(x.label)}</text>`;
    }).join("");

    const labels = data.map((x, i) => {
      const px = 25 + i * 65;
      const py = 180 - (x.value / max) * 145 - 12;

      return `<text x="${px}" y="${py}" text-anchor="middle"
        font-size="8" fill="#52617a">${esc(money(x.value))}</text>`;
    }).join("");

    return `<svg viewBox="0 0 370 225" role="img" aria-label="Monthly sales chart">
      <line x1="15" y1="180" x2="355" y2="180" stroke="#e6ebf3"/>
      <line x1="15" y1="105" x2="355" y2="105" stroke="#edf0f5" stroke-dasharray="4 4"/>
      <line x1="15" y1="35" x2="355" y2="35" stroke="#edf0f5" stroke-dasharray="4 4"/>
      <polyline points="${points}" fill="none" stroke="#2864df"
        stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${circles}${labels}
    </svg>`;
  }

  function recentTable() {
    const rows = allRecords()
      .sort((a,b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 6);

    return `<div class="table-wrap"><table>
      <thead><tr>
        <th>ORDER ID</th>
        <th>CUSTOMER</th>
        <th>TYPE</th>
        <th>DATE</th>
        <th>TOTAL</th>
        <th>BALANCE</th>
        <th>ACTION</th>
      </tr></thead>
      <tbody>${rows.length ? rows.map(x => `<tr>
        <td>${esc(x.orderId || x.jobWorkId)}</td>
        <td>${esc(x.customer)}</td>
        <td>${esc(x.type)}</td>
        <td>${dateText(x.date)}</td>
        <td>${money(getTotal(x))}</td>
        <td>${money(getBalance(x))}</td>
        ${recordActions(x)}
      </tr>`).join("") : `
        <tr><td colspan="7" class="empty">अजून ऑर्डर्स नाहीत.</td></tr>
      `}</tbody>
    </table></div>`;
  }

  function renderDashboard() {
    const s = getStats();

    page("Dashboard", "Your business at a glance", `
      <div class="welcome">
        <h2>Welcome to KADAM DIGITAL</h2>
        <p>Manage your printing business, orders, payments and expenses in one place.</p>
      </div>

      <div class="stats-grid">
        ${statCard("Total Sales", money(s.sales), "₹")}
        ${statCard("Amount Received", money(s.received), "✓", "green")}
        ${statCard("Pending Balance", money(s.due), "!", "orange")}
        ${statCard("Total Expenses", money(s.expenses), "↗", "red")}
      </div>

      <div class="dashboard-grid">
        <div class="panel">
          <div class="panel-head">
            <h3>Sales Overview</h3>
            <small>Last 6 months · Actual saved sales</small>
          </div>
          <div class="chart-wrap">${salesChart()}</div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>Quick Actions</h3></div>
          <div class="quick-grid">
            <button class="quick-btn" data-page="banner"><span>▣</span>New Banner Order</button>
            <button class="quick-btn" data-page="jobwork"><span>▤</span>New Job Work</button>
            <button class="quick-btn" data-page="payments"><span>₹</span>Receive Payment</button>
            <button class="quick-btn" data-page="reports"><span>▥</span>View Reports</button>
            <button class="quick-btn" data-page="expenses"><span>↗</span>Expenses</button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3>Recent Orders</h3>
          <button class="btn secondary small" data-page="orders">View All</button>
        </div>
        ${recentTable()}
      </div>
    `);
  }

  // =========================================
  // BANNER ROW
  // =========================================

  function bannerRow(index, job = false) {
    return `<div class="banner-card" data-banner>
      <div class="banner-card-head">
        <strong>Banner ${index}</strong>
        <button type="button" class="btn danger small" data-remove-banner>Remove</button>
      </div>

      <div class="banner-grid">
        <div class="field">
          <label>Media / Material</label>
          <select data-field="media" required>
            <option value="">Select Material</option>
            <option value="China">China</option>
            <option value="Star">Star</option>
            <option value="Backlight">Backlight</option>
            <option value="Black Back">Black Back</option>
            <option value="One Way">One Way</option>
            <option value="Vinyl">Vinyl</option>
          </select>
        </div>

        <div class="field">
          <label>Width (Feet)</label>
          <input type="number" min="0" step="0.01" data-field="width" placeholder="Width">
        </div>

        <div class="field">
          <label>Height (Feet)</label>
          <input type="number" min="0" step="0.01" data-field="height" placeholder="Height">
        </div>

        <div class="field">
          <label>Quantity</label>
          <input type="number" min="1" step="1" value="1" data-field="quantity">
        </div>

        <div class="field">
          <label>Printing Rate / Sq.Ft</label>
          <input type="number" min="0" step="0.01" data-field="rate" placeholder="Rate">
        </div>

        ${job ? "" : `
          <div class="field">
            <label>Pasting</label>
            <select data-field="pasting">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <div class="field">
            <label>Pasting Rate / Sq.Ft</label>
            <input type="number" min="0" step="0.01" data-field="pastingRate" value="0">
          </div>
        `}
      </div>

      <div class="banner-result">
        <span>Area: <strong data-area>0 Sq.Ft</strong></span>
        <span>Printing: <strong data-printing>₹0.00</strong></span>
        ${job ? "" : `<span>Pasting: <strong data-pasting>₹0.00</strong></span>`}
        <span>Banner Amount: <strong data-amount>₹0.00</strong></span>
      </div>
    </div>`;
  }

  function calculateBanner(card, job = false) {
    const getv = name => num($(`[data-field="${name}"]`, card)?.value);

    const area = getv("width") * getv("height") * getv("quantity");
    const printing = area * getv("rate");

    const pasting = !job &&
      $(`[data-field="pasting"]`, card)?.value === "yes"
      ? area * getv("pastingRate")
      : 0;

    const amount = printing + pasting;

    $("[data-area]", card).textContent = area.toFixed(2) + " Sq.Ft";
    $("[data-printing]", card).textContent = money(printing);

    if (!job) {
      $("[data-pasting]", card).textContent = money(pasting);
    }

    $("[data-amount]", card).textContent = money(amount);

    return {
      media:$(`[data-field="media"]`, card).value,
      width:getv("width"),
      height:getv("height"),
      quantity:getv("quantity"),
      rate:getv("rate"),
      area,
      printing,
      pasting,
      pastingRate:getv("pastingRate"),
      amount
    };
  }

  // =========================================
  // NEW BANNER ORDER / JOB WORK
  // =========================================

  function renderOrderForm(job = false) {
    if (!isAdmin()) {
      return toast("ही सुविधा फक्त Admin साठी आहे.");
    }

    const title = job ? "New Job Work" : "New Banner Order";
    const subtitle = job
      ? "Create a new job work entry"
      : "Create a new banner order";

    const recordPrefix = job ? "jobWorkId" : "orderId";

    page(title, subtitle, `
      <form id="orderForm" class="form-card">
        <h3>Customer Details</h3>

        <div class="form-grid">
          <div class="field">
            <label>Customer Name *</label>
            <input name="customer" required placeholder="Customer name">
          </div>

          <div class="field">
            <label>Mobile Number</label>
            <input name="mobile" inputmode="numeric" placeholder="Mobile number">
          </div>

          <div class="field">
            <label>Order Date</label>
            <input name="date" type="date" value="${today()}" required>
          </div>

          <div class="field full">
            <label>File / Design Details</label>
            <input name="file" placeholder="File name or design details">
          </div>
        </div>

        <div class="form-section-title">Banner Details</div>
        <div id="bannerRows">${bannerRow(1, job)}</div>

        <button type="button" class="btn secondary" id="addBanner">
          + Add Another Banner
        </button>

        <div class="summary">
          <div class="summary-row">
            <span>Total Area</span>
            <strong id="totalArea">0 Sq.Ft</strong>
          </div>

          <div class="summary-row">
            <span>Printing Amount</span>
            <strong id="printingAmount">${money(0)}</strong>
          </div>

          ${job ? "" : `
            <div class="summary-row">
              <span>Pasting Amount</span>
              <strong id="pastingAmount">${money(0)}</strong>
            </div>
          `}

          <div class="summary-row total">
            <span>Banner Total</span>
            <strong id="grossTotal">${money(0)}</strong>
          </div>

          ${job ? "" : `
            <div class="summary-row discount-row">
              <span>Discount</span>
              <strong id="discountDisplay">${money(0)}</strong>
            </div>
          `}

          <div class="summary-row">
            <span>Amount Received</span>
            <strong id="receivedDisplay">${money(0)}</strong>
          </div>

          <div class="summary-row balance">
            <span>Remaining Balance</span>
            <strong id="balanceDisplay">${money(0)}</strong>
          </div>
        </div>

        <div class="form-grid" style="margin-top:16px">
          ${job ? "" : `
            <div class="field">
              <label>Discount (₹)</label>
              <input type="number" name="discount" min="0" step="0.01" value="0">
            </div>
          `}

          <div class="field">
            <label>Amount Received (₹)</label>
            <input type="number" name="received" min="0" step="0.01" value="0">
          </div>
        </div>

        <div class="form-footer">
          <button type="reset" class="btn secondary">Reset</button>
          <button type="submit" class="btn">
            Save ${job ? "Job Work" : "Order"}
          </button>
        </div>
      </form>
    `);

    const form = $("#orderForm");
    const rows = $("#bannerRows");

    function refresh() {
      const cards = $$("[data-banner]", rows);
      const items = cards.map(card => calculateBanner(card, job));

      const area = items.reduce((s,x) => s + x.area, 0);
      const printing = items.reduce((s,x) => s + x.printing, 0);
      const pasting = items.reduce((s,x) => s + x.pasting, 0);
      const gross = items.reduce((s,x) => s + x.amount, 0);

      const discount = job ? 0 : num(form.elements.discount.value);
      const received = num(form.elements.received.value);
      const balance = Math.max(0, gross - discount - received);

      $("#totalArea").textContent = area.toFixed(2) + " Sq.Ft";
      $("#printingAmount").textContent = money(printing);

      if (!job) {
        $("#pastingAmount").textContent = money(pasting);
        $("#discountDisplay").textContent = money(discount);
      }

      $("#grossTotal").textContent = money(gross);
      $("#receivedDisplay").textContent = money(received);
      $("#balanceDisplay").textContent = money(balance);

      return {
        items,
        area,
        printing,
        pasting,
        gross,
        discount,
        received,
        balance
      };
    }

    rows.addEventListener("input", refresh);
    rows.addEventListener("change", refresh);
    form.addEventListener("input", refresh);

    $("#addBanner").addEventListener("click", () => {
      if (!isAdmin()) return toast("परवानगी नाही.");

      rows.insertAdjacentHTML(
        "beforeend",
        bannerRow($$("[data-banner]", rows).length + 1, job)
      );

      refresh();
    });

    rows.addEventListener("click", e => {
      if (e.target.closest("[data-remove-banner]")) {
        if (!isAdmin()) return toast("परवानगी नाही.");

        const cards = $$("[data-banner]", rows);

        if (cards.length <= 1) {
          return toast("किमान एक Banner आवश्यक आहे.");
        }

        e.target.closest("[data-banner]").remove();

        $$("[data-banner]", rows).forEach((card,i) => {
          $("strong", card).textContent = "Banner " + (i + 1);
        });

        refresh();
      }
    });

    form.addEventListener("reset", () => {
      setTimeout(refresh, 0);
    });

    form.addEventListener("submit", e => {
      e.preventDefault();

      if (!isAdmin()) return toast("Save करण्याची परवानगी फक्त Admin ला आहे.");

      const result = refresh();
      const customer = form.elements.customer.value.trim();

      if (!customer) return toast("Customer Name आवश्यक आहे.");
      if (result.gross <= 0) return toast("कृपया Banner Size आणि Rate भरा.");

      if (result.items.some(x => !x.media)) {
        return toast("प्रत्येक Banner साठी Material निवडा.");
      }

      if (result.received + result.discount > result.gross + 0.001) {
        return toast("Received + Discount हे Total पेक्षा जास्त असू शकत नाही.");
      }

      const record = {
        [recordPrefix]:id(job ? "JW" : "PF"),
        customer,
        mobile:form.elements.mobile.value.trim(),
        file:form.elements.file.value.trim(),
        banners:result.items,
        totalArea:result.area,
        printingAmount:result.printing,
        pastingAmount:result.pasting,
        total:result.gross,
        received:result.received,
        discount:result.discount,
        balance:result.balance,
        date:form.elements.date.value,
        status:result.balance <= 0 ? "Paid" : "Pending"
      };

      const key = job ? KEYS.jobs : KEYS.orders;
      const data = read(key);

      data.push(record);

      if (!write(key, data)) return;

      toast(job ? "Job Work सेव्ह झाले!" : "Banner Order सेव्ह झाली!");

      navigate("dashboard");
    });

    refresh();
  }

  function renderBanner() {
    renderOrderForm(false);
  }

  function renderJobWork() {
    renderOrderForm(true);
  }

  // =========================================
  // COMMON RECORD TABLE
  // =========================================

  function recordTable(records, includeType = true) {
    if (!records.length) {
      return `<div class="empty">रेकॉर्ड उपलब्ध नाहीत.</div>`;
    }

    return `<div class="table-wrap"><table>
      <thead><tr>
        <th>ID</th>
        <th>Customer</th>
        ${includeType ? "<th>Type</th>" : ""}
        <th>Date</th>
        <th>Total</th>
        <th>Received</th>
        <th>Discount</th>
        <th>Balance</th>
        <th>Status</th>
        <th>Action</th>
      </tr></thead>

      <tbody>${records.map(x => `<tr>
        <td>${esc(x.orderId || x.jobWorkId)}</td>
        <td>${esc(x.customer)}</td>
        ${includeType ? `<td>${esc(x.type)}</td>` : ""}
        <td>${dateText(x.date)}</td>
        <td>${money(getTotal(x))}</td>
        <td>${money(getReceived(x))}</td>
        <td>${money(getDiscount(x))}</td>
        <td>${money(getBalance(x))}</td>
        <td>
          <span class="badge ${getBalance(x) <= 0 ? "paid" : "pending"}">
            ${getBalance(x) <= 0 ? "Paid" : "Pending"}
          </span>
        </td>
        ${recordActions(x)}
      </tr>`).join("")}</tbody>
    </table></div>`;
  }

  // =========================================
  // ALL ORDERS
  // =========================================

  function renderOrders() {
    page("All Orders", "All Banner Orders and Job Work records", `
      <div class="page-actions">
        <h2>All Orders</h2>

        <div class="btn-row">
          <button class="btn secondary" data-page="banner">+ Banner Order</button>
          <button class="btn" data-page="jobwork">+ Job Work</button>
        </div>
      </div>

      <div class="panel">
        <div class="search-row">
          <input class="filter-input" id="orderSearch"
            placeholder="Search customer, mobile or order ID">
        </div>

        <div id="orderTable">
          ${recordTable(
            allRecords().sort((a,b) => (b.date || "").localeCompare(a.date || ""))
          )}
        </div>
      </div>
    `);

    $("#orderSearch").addEventListener("input", e => {
      const q = e.target.value.toLowerCase();

      const found = allRecords()
        .filter(x =>
          [
            x.customer,
            x.mobile,
            x.orderId,
            x.jobWorkId
          ].join(" ").toLowerCase().includes(q)
        )
        .sort((a,b) => (b.date || "").localeCompare(a.date || ""));

      $("#orderTable").innerHTML = recordTable(found);
    });
  }

  // =========================================
  // CUSTOMERS
  // =========================================

  function renderCustomers() {
    const map = new Map();

    allRecords().forEach(x => {
      const key = x.mobile || String(x.customer || "").toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          name:x.customer,
          mobile:x.mobile,
          count:0,
          total:0,
          received:0,
          discount:0,
          balance:0
        });
      }

      const c = map.get(key);

      c.count++;
      c.total += getTotal(x);
      c.received += getReceived(x);
      c.discount += getDiscount(x);
      c.balance += getBalance(x);
    });

    const list = [...map.values()];

    page("Customers", "Customer list and account summary", `
      <div class="panel">
        <div class="panel-head">
          <h3>Customer Records (${list.length})</h3>
        </div>

        <div class="search-row">
          <input class="filter-input" id="customerSearch"
            placeholder="Search customer or mobile">
        </div>

        <div id="customerTable">${customerTable(list)}</div>
      </div>
    `);

    $("#customerSearch").addEventListener("input", e => {
      const q = e.target.value.toLowerCase();

      $("#customerTable").innerHTML = customerTable(
        list.filter(x =>
          (x.name + " " + x.mobile).toLowerCase().includes(q)
        )
      );
    });
  }

  function customerTable(list) {
    if (!list.length) {
      return `<div class="empty">Customer records उपलब्ध नाहीत.</div>`;
    }

    return `<div class="table-wrap"><table>
      <thead><tr>
        <th>Customer</th>
        <th>Mobile</th>
        <th>Orders</th>
        <th>Total Sales</th>
        <th>Received</th>
        <th>Balance</th>
      </tr></thead>

      <tbody>${list.map(x => `<tr>
        <td>${esc(x.name)}</td>
        <td>${esc(x.mobile || "-")}</td>
        <td>${x.count}</td>
        <td>${money(x.total)}</td>
        <td>${money(x.received)}</td>
        <td>${money(x.balance)}</td>
      </tr>`).join("")}</tbody>
    </table></div>`;
  }

  // =========================================
  // PAYMENTS
  // =========================================

  function renderPayments() {
    const pending = allRecords().filter(x => getBalance(x) > 0);
    const history = payments().slice().reverse();

    page("Payments", "Receive outstanding payments and manage discounts", `
      ${isAdmin() ? `
      <div class="form-card">
        <h3>Receive Payment / Apply Discount</h3>

        <form id="paymentForm">
          <div class="form-grid">
            <div class="field full">
              <label>Select Order / Job Work *</label>

              <select name="record" required>
                <option value="">Select customer order</option>

                ${pending.map(x => `<option value="${esc(x.recordKey)}|${esc(x.recordId)}">
                  ${esc(x.customer)} — ${esc(x.orderId || x.jobWorkId)}
                  — Balance ${money(getBalance(x))}
                </option>`).join("")}
              </select>
            </div>

            <div class="field">
              <label>Amount Received Now (₹)</label>
              <input name="amount" type="number" min="0" step="0.01" value="0">
            </div>

            <div class="field">
              <label>Discount Given Now (₹)</label>
              <input name="discount" type="number" min="0" step="0.01" value="0">
            </div>

            <div class="field">
              <label>Payment Date</label>
              <input name="date" type="date" value="${today()}">
            </div>

            <div class="field">
              <label>Payment Mode</label>
              <select name="mode">
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          <div id="paymentInfo" class="summary">
            <div class="empty">ऑर्डर निवडल्यानंतर तपशील दिसेल.</div>
          </div>

          <div class="form-footer">
            <button class="btn" type="submit">Save Payment</button>
          </div>
        </form>
      </div>
      ` : ""}

      <div class="panel">
        <div class="panel-head"><h3>Payment History</h3></div>
        ${paymentTable(history)}
      </div>
    `);

    if (!isAdmin()) return;

    const form = $("#paymentForm");

    form.elements.record.addEventListener("change", () => {
      const value = form.elements.record.value;

      if (!value) {
        $("#paymentInfo").innerHTML =
          `<div class="empty">ऑर्डर निवडल्यानंतर तपशील दिसेल.</div>`;
        return;
      }

      const [key, recordId] = value.split("|");
      const actualKey = storageKey(key);

      const selected = read(actualKey).find(x =>
        String(x.orderId || x.jobWorkId) === String(recordId)
      );

      if (!selected) {
        $("#paymentInfo").innerHTML =
          `<div class="empty">ऑर्डर सापडली नाही.</div>`;
        return;
      }

      $("#paymentInfo").innerHTML = `
        <div class="summary-row">
          <span>Customer</span>
          <strong>${esc(selected.customer)}</strong>
        </div>

        <div class="summary-row">
          <span>Original Bill Total</span>
          <strong>${money(getTotal(selected))}</strong>
        </div>

        <div class="summary-row">
          <span>Already Received</span>
          <strong>${money(getReceived(selected))}</strong>
        </div>

        <div class="summary-row discount-row">
          <span>Existing Discount</span>
          <strong>${money(getDiscount(selected))}</strong>
        </div>

        <div class="summary-row balance">
          <span>Current Balance</span>
          <strong>${money(getBalance(selected))}</strong>
        </div>
      `;
    });

    form.addEventListener("submit", e => {
      e.preventDefault();

      if (!isAdmin()) {
        return toast("Payment सेव्ह करण्याची परवानगी फक्त Admin ला आहे.");
      }

      const value = form.elements.record.value;

      if (!value) return toast("ऑर्डर निवडा.");

      const [key, recordId] = value.split("|");
      const actualKey = storageKey(key);

      if (!recordId || ![KEYS.orders, KEYS.jobs].includes(actualKey)) {
        return toast("योग्य ऑर्डर निवडा.");
      }

      const data = read(actualKey);

      const index = data.findIndex(x =>
        String(x.orderId || x.jobWorkId) === String(recordId)
      );

      if (index < 0) return toast("ऑर्डर सापडली नाही.");

      const record = data[index];
      const amount = num(form.elements.amount.value);
      const discountNow = num(form.elements.discount.value);
      const balance = getBalance(record);

      if (amount <= 0 && discountNow <= 0) {
        return toast("पेमेंट किंवा Discount रक्कम भरा.");
      }

      if (amount + discountNow > balance + 0.001) {
        return toast("Payment + Discount हे Balance पेक्षा जास्त असू शकत नाही.");
      }

      record.received = getReceived(record) + amount;
      record.discount = getDiscount(record) + discountNow;

      record.balance = Math.max(
        0,
        getTotal(record) - record.received - record.discount
      );

      record.status = record.balance <= 0 ? "Paid" : "Pending";

      data[index] = record;

      if (!write(actualKey, data)) return;

      const history = payments();

      history.push({
        paymentId:id("PAY"),
        recordId,
        customer:record.customer,
        amount,
        discount:discountNow,
        mode:form.elements.mode.value,
        date:form.elements.date.value || today(),
        type:actualKey === KEYS.jobs ? "Job Work" : "Banner Order"
      });

      if (!write(KEYS.payments, history)) return;

      toast("Payment / Discount सेव्ह झाले!");
      renderPayments();
    });
  }

  function paymentTable(list) {
    if (!list.length) {
      return `<div class="empty">Payment history उपलब्ध नाही.</div>`;
    }

    return `<div class="table-wrap"><table>
      <thead><tr>
        <th>Payment ID</th>
        <th>Customer</th>
        <th>Order ID</th>
        <th>Date</th>
        <th>Mode</th>
        <th>Amount</th>
        <th>Discount</th>
      </tr></thead>

      <tbody>${list.map(x => `<tr>
        <td>${esc(x.paymentId)}</td>
        <td>${esc(x.customer)}</td>
        <td>${esc(x.recordId)}</td>
        <td>${dateText(x.date)}</td>
        <td>${esc(x.mode)}</td>
        <td>${money(x.amount)}</td>
        <td>${money(x.discount || 0)}</td>
      </tr>`).join("")}</tbody>
    </table></div>`;
  }

  // =========================================
  // EXPENSES
  // =========================================

  function renderExpenses() {
    const list = expenses().slice().reverse();

    page("Expenses", "Manage shop expenses", `
      ${isAdmin() ? `
      <div class="form-card">
        <h3>Add New Expense</h3>

        <form id="expenseForm">
          <div class="form-grid">
            <div class="field">
              <label>Category *</label>
              <select name="category" required>
                <option value="Material">Material</option>
                <option value="Printing">Printing</option>
                <option value="Electricity">Electricity</option>
                <option value="Rent">Rent</option>
                <option value="Transport">Transport</option>
                <option value="Salary">Salary</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="field">
              <label>Description *</label>
              <input name="description" required placeholder="Expense details">
            </div>

            <div class="field">
              <label>Amount (₹) *</label>
              <input name="amount" type="number" min="0.01" step="0.01" required>
            </div>

            <div class="field">
              <label>Payment Mode</label>
              <select name="mode">
                <option>Cash</option>
                <option>UPI</option>
                <option>Bank</option>
              </select>
            </div>

            <div class="field">
              <label>Date</label>
              <input name="date" type="date" value="${today()}">
            </div>

            <div class="field">
              <label>Remark</label>
              <input name="remark" placeholder="Optional">
            </div>
          </div>

          <div class="form-footer">
            <button class="btn">Save Expense</button>
          </div>
        </form>
      </div>
      ` : ""}

      <div class="panel">
        <div class="panel-head">
          <h3>Expense History</h3>
          <div class="btn-row">
            <strong>${money(list.reduce((s,x) => s + num(x.amount), 0))}</strong>
            <button class="btn small" id="printExpenses">Print Report</button>
          </div>
        </div>

        <div class="table-wrap"><table>
          <thead><tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th>Mode</th>
            <th>Amount</th>
            ${isAdmin() ? "<th>Action</th>" : ""}
          </tr></thead>

          <tbody>${list.length ? list.map(x => `<tr>
            <td>${dateText(x.date)}</td>
            <td>${esc(x.category)}</td>
            <td>${esc(x.description)}</td>
            <td>${esc(x.mode)}</td>
            <td>${money(x.amount)}</td>
            ${isAdmin() ? `
            <td>
              <button type="button" class="btn danger small"
                data-delete-expense="${esc(x.expenseId)}">Delete</button>
            </td>` : ""}
          </tr>`).join("") : `
            <tr><td colspan="${isAdmin() ? 6 : 5}" class="empty">अजून Expenses नाहीत.</td></tr>
          `}</tbody>
        </table></div>
      </div>
    `);

    $("#printExpenses").addEventListener("click", () => {
      const report = $(".panel", content).outerHTML;
      printReport("Expenses Report", report);
    });

    if (!isAdmin()) return;

    $("#expenseForm").addEventListener("submit", e => {
      e.preventDefault();

      if (!isAdmin()) {
        return toast("Expense सेव्ह करण्याची परवानगी फक्त Admin ला आहे.");
      }

      const f = e.target;

      const item = {
        expenseId:id("EXP"),
        category:f.elements.category.value,
        description:f.elements.description.value.trim(),
        amount:num(f.elements.amount.value),
        mode:f.elements.mode.value,
        date:f.elements.date.value || today(),
        remark:f.elements.remark.value.trim()
      };

      if (!item.description || item.amount <= 0) {
        return toast("योग्य Expense तपशील भरा.");
      }

      const data = expenses();
      data.push(item);

      if (!write(KEYS.expenses, data)) return;

      toast("Expense सेव्ह झाला.");
      renderExpenses();
    });

    content.addEventListener("click", function expenseDeleteHandler(e) {
      const btn = e.target.closest("[data-delete-expense]");

      if (!btn || !content.contains(btn)) return;

      if (!isAdmin()) {
        return toast("Delete करण्याची परवानगी फक्त Admin ला आहे.");
      }

      if (!confirm("हा Expense Delete करायचा आहे का?")) return;

      write(
        KEYS.expenses,
        expenses().filter(x => x.expenseId !== btn.dataset.deleteExpense)
      );

      toast("Expense Delete झाला.");
      renderExpenses();
    });
  }

  // =========================================
  // REPORTS CENTER
  // =========================================

  function renderReports() {
    page("Reports", "Choose the report you want to view", `
      <div class="panel">
        <div class="panel-head">
          <h3>Reports Center</h3>
        </div>

        <div class="quick-grid">
          <button class="quick-btn" data-report="shop"><span>▣</span>Shop Report</button>
          <button class="quick-btn" data-report="jobwork"><span>▤</span>Job Work Report</button>
          <button class="quick-btn" data-report="monthly"><span>▥</span>Monthly Report</button>
          <button class="quick-btn" data-report="all"><span>▦</span>All Reports</button>
        </div>
      </div>

      <div id="reportView"></div>
    `);

    content.querySelectorAll("[data-report]").forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.report;

        if (type === "monthly") {
          renderMonthlyReport();
        } else {
          renderSelectedReport(type);
        }
      });
    });
  }

  // =========================================
  // SHOP / JOB WORK / ALL REPORTS
  // =========================================

  function renderSelectedReport(type) {
    let records = [];
    let title = "";

    if (type === "shop") {
      records = orders().map(x => ({
        ...x,
        type:"Banner Order",
        recordKey:"orders",
        recordId:x.orderId
      }));

      title = "Shop Report";
    }

    if (type === "jobwork") {
      records = jobs().map(x => ({
        ...x,
        type:"Job Work",
        recordKey:"jobs",
        recordId:x.jobWorkId
      }));

      title = "Job Work Report";
    }

    if (type === "all") {
      records = allRecords();
      title = "All Reports";
    }

    records.sort((a,b) => (b.date || "").localeCompare(a.date || ""));

    const total = records.reduce((s,x) => s + getTotal(x), 0);
    const received = records.reduce((s,x) => s + getReceived(x), 0);
    const discount = records.reduce((s,x) => s + getDiscount(x), 0);
    const balance = records.reduce((s,x) => s + getBalance(x), 0);

    const view = $("#reportView");

    if (!view) return;

    let extraReports = "";

    if (type === "all") {
      const exp = expenses();
      const pay = payments();

      extraReports = `
        <div class="panel">
          <div class="panel-head"><h3>All Expenses</h3></div>
          <div class="table-wrap"><table>
            <thead><tr>
              <th>Date</th><th>Category</th><th>Description</th>
              <th>Mode</th><th>Amount</th>
            </tr></thead>
            <tbody>${exp.length ? exp.map(x => `
              <tr>
                <td>${dateText(x.date)}</td>
                <td>${esc(x.category)}</td>
                <td>${esc(x.description)}</td>
                <td>${esc(x.mode)}</td>
                <td>${money(x.amount)}</td>
              </tr>
            `).join("") : `<tr><td colspan="5">No expenses</td></tr>`}</tbody>
          </table></div>
          <p><strong>Total Expenses: ${money(exp.reduce((s,x) => s + num(x.amount), 0))}</strong></p>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>All Payment History</h3></div>
          ${paymentTable(pay)}
        </div>
      `;
    }

    view.innerHTML = `
      <div class="panel">
        <div class="page-actions">
          <h2>${title}</h2>
          <div class="btn-row">
            <button class="btn small" id="printSelectedReport">Print Report</button>
            <button class="btn secondary small" data-report-back>← Back to Reports</button>
          </div>
        </div>

        <div class="stats-grid">
          ${statCard("Total Orders", records.length, "▦")}
          ${statCard("Total Sales", money(total), "₹")}
          ${statCard("Amount Received", money(received), "✓", "green")}
          ${statCard("Remaining Balance", money(balance), "!", "orange")}
        </div>

        <div class="summary">
          <div class="summary-row">
            <span>Total Discount</span>
            <strong>${money(discount)}</strong>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>${title} Records</h3></div>
          ${recordTable(records)}
        </div>

        ${extraReports}
      </div>
    `;

    $("[data-report-back]", view).addEventListener("click", renderReports);

    $("#printSelectedReport", view).addEventListener("click", () => {
      printReport(title, view.innerHTML);
    });
  }

  // =========================================
  // MONTHLY REPORT
  // =========================================

  function renderMonthlyReport() {
    const now = new Date();
    const selectedMonth = String(now.getMonth());
    const selectedYear = String(now.getFullYear());

    const view = $("#reportView");

    if (!view) return;

    view.innerHTML = `
      <div class="panel">
        <div class="page-actions">
          <h2>Monthly Report</h2>

          <div class="btn-row">
            <button class="btn small" id="printMonthlyReport">Print Report</button>
            <button class="btn secondary small" id="monthlyBack">← Back to Reports</button>
          </div>
        </div>

        <div class="page-actions">
          <h2>Report Filters</h2>

          <div class="report-filters">
            <select id="reportMonth">
              ${Array.from({length:12},(_,i) => `
                <option value="${i}" ${String(i) === selectedMonth ? "selected" : ""}>
                  ${new Date(2000,i,1).toLocaleDateString("en-IN",{month:"long"})}
                </option>
              `).join("")}
            </select>

            <select id="reportYear">
              ${Array.from({length:7},(_,i) => now.getFullYear() - i)
                .map(y => `
                  <option ${String(y) === selectedYear ? "selected" : ""}>
                    ${y}
                  </option>
                `).join("")}
            </select>
          </div>
        </div>

        <div id="monthlyReportContent"></div>
      </div>
    `;

    $("#monthlyBack").addEventListener("click", renderReports);

    $("#printMonthlyReport").addEventListener("click", () => {
      printReport(
        "Monthly Report",
        $("#monthlyReportContent").innerHTML
      );
    });

    function refresh() {
      const m = Number($("#reportMonth").value);
      const y = Number($("#reportYear").value);

      const inMonth = d => {
        const dt = new Date((d || today()) + "T00:00:00");

        return dt.getMonth() === m &&
               dt.getFullYear() === y;
      };

      const records = allRecords().filter(x => inMonth(x.date));
      const exp = expenses().filter(x => inMonth(x.date));
      const pay = payments().filter(x => inMonth(x.date));

      const sales = records.reduce((s,x) => s + getTotal(x), 0);
      const received = pay.reduce((s,x) => s + num(x.amount), 0);
      const expenseTotal = exp.reduce((s,x) => s + num(x.amount), 0);
      const discount = records.reduce((s,x) => s + getDiscount(x), 0);

      $("#monthlyReportContent").innerHTML = `
        <div class="stats-grid">
          ${statCard("Gross Sales", money(sales), "₹")}
          ${statCard("Payments Received This Month", money(received), "✓", "green")}
          ${statCard("Discount Recorded", money(discount), "−")}
          ${statCard("Expenses", money(expenseTotal), "↗", "red")}
        </div>

        <div class="panel">
          <div class="panel-head"><h3>Monthly Orders</h3></div>
          ${recordTable(records)}
        </div>

        <div class="panel">
          <div class="panel-head"><h3>Monthly Expenses</h3></div>

          <div class="table-wrap"><table>
            <thead><tr>
              <th>Date</th><th>Category</th><th>Description</th><th>Amount</th>
            </tr></thead>

            <tbody>${exp.length ? exp.map(x => `
              <tr>
                <td>${dateText(x.date)}</td>
                <td>${esc(x.category)}</td>
                <td>${esc(x.description)}</td>
                <td>${money(x.amount)}</td>
              </tr>
            `).join("") : `
              <tr><td colspan="4" class="empty">No expenses</td></tr>
            `}</tbody>
          </table></div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>Payments Received This Month</h3></div>
          ${paymentTable(pay)}
        </div>
      `;
    }

    $("#reportMonth").addEventListener("change", refresh);
    $("#reportYear").addEventListener("change", refresh);

    refresh();
  }

  // =========================================
  // APPLICATION START / RESTORE AUTH SESSION
  // =========================================

  showLogin();

  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    const user = data.session?.user;

    if (!user) {
      localStorage.removeItem(SESSION_KEY);
      showLogin();
      return;
    }

    let role = "";

    if (user.id === ADMIN_UID) {
      role = "admin";
    } else if (user.id === EXECUTIVE_UID) {
      role = "executive";
    }

    if (!role) {
      await supabaseClient.auth.signOut();
      localStorage.removeItem(SESSION_KEY);
      showLogin();
      return;
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify({
      role,
      username: getUsername(role),
      userId: user.id
    }));

    await startApplication();

  } catch (error) {
    console.error("Authentication Error:", error);
    showLogin();
    toast("Login Session तपासता आली नाही.");
  }

});
