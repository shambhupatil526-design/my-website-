document.addEventListener("DOMContentLoaded", function () {
  const main = document.querySelector(".main");

  if (!main) {
    alert("PRINTFLOW: Main section सापडला नाही.");
    return;
  }

  const dashboardHTML = main.innerHTML;

  const KEYS = {
    orders: "printflowOrders",
    jobs: "printflowJobWorks",
    payments: "printflowPayments",
    expenses: "printflowExpenses"
  };

  const EXPENSE_CATEGORIES = [
    "Ink / Cartridges",
    "Paper",
    "Labour",
    "Electricity / Rent",
    "Transport",
    "Other Expenses"
  ];

  const money = amount =>
    "₹" + Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  function get(id) {
    return document.getElementById(id);
  }

  function value(id) {
    return get(id)?.value || "";
  }

  function number(id) {
    return Number(value(id)) || 0;
  }

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function readData(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function writeData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      alert("डेटा सेव्ह झाला नाही. Browser Storage तपासा.");
      return false;
    }
  }

  function saveData(key, data) {
    const oldData = readData(key);
    oldData.push(data);
    return writeData(key, oldData);
  }

  function localDate(date = new Date()) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function dateOf(item) {
    if (!item.date) return "";
    return String(item.date).slice(0, 10);
  }

  function isInMonth(item, month, year) {
    const date = dateOf(item);
    return date && date.slice(0, 4) === String(year) &&
      date.slice(5, 7) === String(month).padStart(2, "0");
  }

  function formatDate(date) {
    if (!date) return "-";
    const d = new Date(date.length === 10 ? date + "T00:00:00" : date);
    return isNaN(d) ? "-" : d.toLocaleDateString("en-IN");
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  function getBusinessTotals() {
    const orders = readData(KEYS.orders);
    const jobs = readData(KEYS.jobs);
    const expenses = readData(KEYS.expenses);

    const records = [...orders, ...jobs];

    return {
      orders: orders.length,
      jobs: jobs.length,
      sales: records.reduce((s, x) => s + Number(x.total || 0), 0),
      received: records.reduce((s, x) => s + Number(x.received || 0), 0),
      pending: records.reduce((s, x) => s + Number(x.balance || 0), 0),
      expenses: expenses.reduce((s, x) => s + Number(x.amount || 0), 0)
    };
  }

  function openDashboard() {
    main.innerHTML = dashboardHTML;

    const t = getBusinessTotals();

    const overview = document.createElement("div");
    overview.className = "panel pf-live-overview";

    overview.innerHTML = `
      <h3>Business Overview</h3>
      <div class="form-grid">
        <div class="total-box">
          <p>Total Banner Orders</p>
          <h2>${t.orders}</h2>
        </div>
        <div class="total-box">
          <p>Total Job Works</p>
          <h2>${t.jobs}</h2>
        </div>
        <div class="total-box">
          <p>Total Sales</p>
          <h2>${money(t.sales)}</h2>
        </div>
        <div class="total-box">
          <p>Total Received</p>
          <h2>${money(t.received)}</h2>
        </div>
        <div class="total-box">
          <p>Pending Amount</p>
          <h2>${money(t.pending)}</h2>
        </div>
        <div class="total-box">
          <p>Total Expenses</p>
          <h2>${money(t.expenses)}</h2>
        </div>
      </div>
    `;

    main.insertBefore(overview, main.firstChild);
    bindNavigation();
  }

  function bindNavigation() {
    main.querySelectorAll("[data-page]").forEach(button => {
      button.addEventListener("click", function (event) {
        event.preventDefault();

        const page = this.dataset.page;

        if (page === "dashboard") openDashboard();
        if (page === "banner") openBannerOrder();
        if (page === "jobwork") openJobWork();
        if (page === "payments") openReceivePayment();
        if (page === "reports") openReports();
        if (page === "expenses") openExpenses();

        if (["customers", "orders"].includes(page)) {
          alert("हा विभाग पुढील टप्प्यात तयार करू.");
        }
      });
    });
  }

  // ==========================================
  // COMMON MEDIA OPTIONS
  // ==========================================

  const mediaOptions = `
    <option value="Regular">Regular</option>
    <option value="Star">Star</option>
    <option value="China">China</option>
    <option value="Blacklight">Blacklight</option>
    <option value="One Way Vinyl">One Way Vinyl</option>
  `;

  // ==========================================
  // BANNER ORDER
  // ==========================================

  function openBannerOrder() {
    main.innerHTML = `
      <div class="form-page">
        <div class="form-header">
          <button type="button" id="backDashboard">← Back</button>
          <h2>New Banner Order</h2>
        </div>

        <div class="panel">
          <h3>Customer Details</h3>
          <div class="form-grid">
            <div>
              <label>Customer Name</label>
              <input id="customerName" type="text" placeholder="Enter customer name">
            </div>
            <div>
              <label>Mobile Number</label>
              <input id="customerMobile" type="tel" maxlength="10" placeholder="Mobile number">
            </div>
            <div>
              <label>File Name</label>
              <input id="customerFile" type="text" placeholder="Design / File name">
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="section-heading">
            <h3>Banner Details</h3>
            <button type="button" id="addBanner">+ Add Banner</button>
          </div>
          <div id="bannerList"></div>
        </div>

        <div class="panel">
          <h3>Order Summary</h3>
          <div class="total-box">
            <p>Total Square Feet: <strong id="totalArea">0</strong></p>
            <p>Printing Amount: <strong id="printingAmount">₹0.00</strong></p>
            <p>Pasting Amount: <strong id="pastingAmount">₹0.00</strong></p>
            <p>Banner Total: <strong id="bannerTotal">₹0.00</strong></p>
          </div>

          <div class="form-grid">
            <div>
              <label>Amount Received</label>
              <input id="receivedAmount" type="number" min="0" value="0">
            </div>
            <div>
              <label>Balance Amount</label>
              <input id="balanceAmount" type="text" readonly value="₹0.00">
            </div>
          </div>

          <h2 id="finalBill">Final Bill Amount: ₹0.00</h2>
          <button type="button" id="saveOrder">Save Banner Order</button>
          <button type="button" id="cancelOrder">Cancel</button>
        </div>
      </div>
    `;

    addBannerRow("bannerList", "banner");

    get("addBanner").addEventListener("click", () =>
      addBannerRow("bannerList", "banner")
    );

    get("bannerList").addEventListener("input", calculateBannerOrder);
    get("bannerList").addEventListener("change", calculateBannerOrder);
    get("receivedAmount").addEventListener("input", calculateBannerOrder);
    get("saveOrder").addEventListener("click", saveBannerOrder);
    get("cancelOrder").addEventListener("click", openDashboard);
    get("backDashboard").addEventListener("click", openDashboard);
  }

  // ==========================================
  // ADD BANNER ROW
  // ==========================================

  function addBannerRow(containerId, type) {
    const container = get(containerId);
    const index = container.children.length + 1;
    const row = document.createElement("div");

    row.className = "banner-item";

    row.innerHTML = `
      <div class="section-heading">
        <h4>Banner ${index}</h4>
        <button type="button" class="remove-banner">Remove</button>
      </div>

      <div class="form-grid">
        <div>
          <label>Media Type</label>
          <select class="media">${mediaOptions}</select>
        </div>
        <div>
          <label>Width (Feet)</label>
          <input class="width" type="number" min="0" step="0.01" value="0">
        </div>
        <div>
          <label>Height (Feet)</label>
          <input class="height" type="number" min="0" step="0.01" value="0">
        </div>
        <div>
          <label>Quantity</label>
          <input class="quantity" type="number" min="1" value="1">
        </div>
        <div>
          <label>Printing Rate / Sq.Ft.</label>
          <input class="rate" type="number" min="0" step="0.01" value="0">
        </div>

        ${type === "banner" ? `
          <div>
            <label>Pasting Required?</label>
            <select class="pasting">
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
          <div>
            <label>Pasting Rate / Sq.Ft.</label>
            <input class="pasting-rate" type="number" min="0" step="0.01" value="0">
          </div>
        ` : ""}
      </div>

      <div class="total-box">
        <p>Square Feet: <strong class="row-area">0</strong></p>
        <p>Printing Amount: <strong class="row-print">₹0.00</strong></p>
        ${type === "banner" ? `<p>Pasting Amount: <strong class="row-paste">₹0.00</strong></p>` : ""}
        <p>Banner Amount: <strong class="row-total">₹0.00</strong></p>
      </div>
    `;

    container.appendChild(row);

    row.querySelector(".remove-banner").addEventListener("click", function () {
      if (container.children.length <= 1) {
        alert("कमीत कमी एक Banner ठेवणे आवश्यक आहे.");
        return;
      }

      row.remove();
      renumberBanners(container);

      if (type === "banner") calculateBannerOrder();
      else calculateJobWork();
    });

    if (type === "banner") calculateBannerOrder();
    else calculateJobWork();
  }

  function renumberBanners(container) {
    [...container.children].forEach((row, index) => {
      const heading = row.querySelector("h4");
      if (heading) heading.textContent = "Banner " + (index + 1);
    });
  }

  function getBannerRows(containerId, type) {
    return [...get(containerId).querySelectorAll(".banner-item")].map(row => {
      const width = Number(row.querySelector(".width").value) || 0;
      const height = Number(row.querySelector(".height").value) || 0;
      const quantity = Number(row.querySelector(".quantity").value) || 0;
      const rate = Number(row.querySelector(".rate").value) || 0;

      const area = width * height * quantity;
      const printing = area * rate;

      let pasting = 0;
      let pastingRequired = "No";
      let pastingRate = 0;

      if (type === "banner") {
        pastingRequired = row.querySelector(".pasting").value;
        pastingRate = Number(row.querySelector(".pasting-rate").value) || 0;

        if (pastingRequired === "Yes") {
          pasting = area * pastingRate;
        }
      }

      return {
        media: row.querySelector(".media").value,
        width,
        height,
        quantity,
        rate,
        area,
        printing,
        pastingRequired,
        pastingRate,
        pasting,
        total: printing + pasting
      };
    });
  }

  function updateIndividualBannerSummary(containerId, type) {
    const container = get(containerId);
    if (!container) return;

    container.querySelectorAll(".banner-item").forEach(row => {
      const width = Number(row.querySelector(".width").value) || 0;
      const height = Number(row.querySelector(".height").value) || 0;
      const quantity = Number(row.querySelector(".quantity").value) || 0;
      const rate = Number(row.querySelector(".rate").value) || 0;

      const area = width * height * quantity;
      const printing = area * rate;

      let pasting = 0;

      if (type === "banner") {
        const required = row.querySelector(".pasting").value;
        const pasteRate = Number(row.querySelector(".pasting-rate").value) || 0;

        if (required === "Yes") pasting = area * pasteRate;
      }

      row.querySelector(".row-area").textContent = area.toFixed(2) + " Sq.Ft.";
      row.querySelector(".row-print").textContent = money(printing);

      const pasteElement = row.querySelector(".row-paste");
      if (pasteElement) pasteElement.textContent = money(pasting);

      row.querySelector(".row-total").textContent = money(printing + pasting);
    });
  }

  function calculateBannerOrder() {
    if (!get("bannerList")) return;

    updateIndividualBannerSummary("bannerList", "banner");

    const rows = getBannerRows("bannerList", "banner");
    const area = rows.reduce((s, x) => s + x.area, 0);
    const printing = rows.reduce((s, x) => s + x.printing, 0);
    const pasting = rows.reduce((s, x) => s + x.pasting, 0);
    const total = printing + pasting;
    const received = number("receivedAmount");

    get("totalArea").textContent = area.toFixed(2);
    get("printingAmount").textContent = money(printing);
    get("pastingAmount").textContent = money(pasting);
    get("bannerTotal").textContent = money(total);
    get("balanceAmount").value = money(total - received);
    get("finalBill").textContent = "Final Bill Amount: " + money(total);
  }

  function saveBannerOrder() {
    const customer = value("customerName").trim();
    const mobile = value("customerMobile").trim();
    const file = value("customerFile").trim();
    const rows = getBannerRows("bannerList", "banner");

    if (!customer || !mobile || !file) {
      alert("Customer Name, Mobile Number आणि File Name भरा.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      alert("योग्य 10 अंकी Mobile Number टाका.");
      return;
    }

    if (rows.some(x =>
      x.width <= 0 || x.height <= 0 || x.quantity <= 0 || x.rate < 0 ||
      (x.pastingRequired === "Yes" && x.pastingRate < 0)
    )) {
      alert("प्रत्येक Banner चे Size, Quantity आणि Rate तपासा.");
      return;
    }

    const area = rows.reduce((s, x) => s + x.area, 0);
    const printing = rows.reduce((s, x) => s + x.printing, 0);
    const pasting = rows.reduce((s, x) => s + x.pasting, 0);
    const total = printing + pasting;
    const received = number("receivedAmount");

    if (received < 0 || received > total) {
      alert("Amount Received योग्य टाका.");
      return;
    }

    const order = {
      orderId: "PF-" + Date.now(),
      customer,
      mobile,
      file,
      banners: rows,
      totalArea: area,
      printingAmount: printing,
      pastingAmount: pasting,
      total,
      received,
      balance: total - received,
      date: new Date().toISOString(),
      status: "Saved"
    };

    if (saveData(KEYS.orders, order)) {
      alert("Banner Order Successfully Saved!");
      openDashboard();
    }
  }

  // ==========================================
  // JOB WORK
  // ==========================================

  function openJobWork() {
    main.innerHTML = `
      <div class="form-page">
        <div class="form-header">
          <button type="button" id="jwBack">← Back</button>
          <h2>New Job Work</h2>
        </div>

        <div class="panel">
          <h3>Customer Details</h3>
          <div class="form-grid">
            <div>
              <label>Customer / Shop Name</label>
              <input id="jwCustomer" type="text" placeholder="Enter customer name">
            </div>
            <div>
              <label>Mobile Number</label>
              <input id="jwMobile" type="tel" maxlength="10" placeholder="Mobile number">
            </div>
            <div>
              <label>File Name</label>
              <input id="jwFile" type="text" placeholder="Design / File name">
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="section-heading">
            <h3>Job Work Banner Details</h3>
            <button type="button" id="jwAddBanner">+ Add Banner</button>
          </div>
          <div id="jwBannerList"></div>
        </div>

        <div class="panel">
          <h3>Job Work Summary</h3>
          <div class="total-box">
            <p>Total Square Feet: <strong id="jwArea">0</strong></p>
            <p>Printing Amount: <strong id="jwPrinting">₹0.00</strong></p>
            <p>Final Bill Amount: <strong id="jwTotal">₹0.00</strong></p>
          </div>

          <div class="form-grid">
            <div>
              <label>Amount Received</label>
              <input id="jwReceived" type="number" min="0" value="0">
            </div>
            <div>
              <label>Balance Amount</label>
              <input id="jwBalance" type="text" readonly value="₹0.00">
            </div>
          </div>

          <h2 id="jwFinalBill">Final Bill Amount: ₹0.00</h2>
          <button type="button" id="saveJobWork">Save Job Work</button>
          <button type="button" id="jwCancel">Cancel</button>
        </div>
      </div>
    `;

    addBannerRow("jwBannerList", "jobwork");

    get("jwAddBanner").addEventListener("click", () =>
      addBannerRow("jwBannerList", "jobwork")
    );

    get("jwBannerList").addEventListener("input", calculateJobWork);
    get("jwBannerList").addEventListener("change", calculateJobWork);
    get("jwReceived").addEventListener("input", calculateJobWork);
    get("saveJobWork").addEventListener("click", saveJobWork);
    get("jwBack").addEventListener("click", openDashboard);
    get("jwCancel").addEventListener("click", openDashboard);
  }

  function calculateJobWork() {
    if (!get("jwBannerList")) return;

    updateIndividualBannerSummary("jwBannerList", "jobwork");

    const rows = getBannerRows("jwBannerList", "jobwork");
    const area = rows.reduce((s, x) => s + x.area, 0);
    const total = rows.reduce((s, x) => s + x.printing, 0);
    const received = number("jwReceived");

    get("jwArea").textContent = area.toFixed(2);
    get("jwPrinting").textContent = money(total);
    get("jwTotal").textContent = money(total);
    get("jwBalance").value = money(total - received);
    get("jwFinalBill").textContent = "Final Bill Amount: " + money(total);
  }

  function saveJobWork() {
    const customer = value("jwCustomer").trim();
    const mobile = value("jwMobile").trim();
    const file = value("jwFile").trim();
    const rows = getBannerRows("jwBannerList", "jobwork");

    if (!customer || !mobile || !file) {
      alert("Customer Name, Mobile Number आणि File Name भरा.");
      return;
    }

    if (!/^[0-9]{10}$/.test(mobile)) {
      alert("योग्य 10 अंकी Mobile Number टाका.");
      return;
    }

    if (rows.some(x =>
      x.width <= 0 || x.height <= 0 || x.quantity <= 0 || x.rate < 0
    )) {
      alert("प्रत्येक Banner चे Size, Quantity आणि Rate तपासा.");
      return;
    }

    const area = rows.reduce((s, x) => s + x.area, 0);
    const total = rows.reduce((s, x) => s + x.printing, 0);
    const received = number("jwReceived");

    if (received < 0 || received > total) {
      alert("Amount Received योग्य टाका.");
      return;
    }

    const jobWork = {
      jobWorkId: "JW-" + Date.now(),
      customer,
      mobile,
      file,
      banners: rows,
      totalArea: area,
      printingAmount: total,
      total,
      received,
      balance: total - received,
      date: new Date().toISOString(),
      status: "Saved"
    };

    if (saveData(KEYS.jobs, jobWork)) {
      alert("Job Work Successfully Saved!");
      openDashboard();
    }
  }

  // ==========================================
  // EXPENSE MANAGEMENT
  // ==========================================

  function openExpenses(editId = null) {
    const expenses = readData(KEYS.expenses);
    const editing = expenses.find(x => x.expenseId === editId);

    main.innerHTML = `
      <div class="form-page">
        <div class="form-header">
          <button type="button" id="expenseBack">← Back</button>
          <h2>${editing ? "Edit Expense" : "Expenses Management"}</h2>
        </div>

        <div class="panel">
          <h3>${editing ? "Update Expense" : "Add New Expense"}</h3>

          <div class="form-grid">
            <div>
              <label>Expense Category</label>
              <select id="expenseCategory">
                ${EXPENSE_CATEGORIES.map(x =>
                  `<option value="${safe(x)}" ${editing?.category === x ? "selected" : ""}>${safe(x)}</option>`
                ).join("")}
              </select>
            </div>

            <div>
              <label>Description</label>
              <input id="expenseDescription" type="text"
                placeholder="Enter expense details"
                value="${safe(editing?.description || "")}">
            </div>

            <div>
              <label>Amount</label>
              <input id="expenseAmount" type="number" min="0.01" step="0.01"
                placeholder="Enter amount"
                value="${editing?.amount ?? ""}">
            </div>

            <div>
              <label>Payment Mode</label>
              <select id="expenseMode">
                ${["Cash", "UPI", "Bank Transfer", "Other"].map(x =>
                  `<option value="${x}" ${editing?.method === x ? "selected" : ""}>${x}</option>`
                ).join("")}
              </select>
            </div>

            <div>
              <label>Expense Date</label>
              <input id="expenseDate" type="date"
                value="${editing ? dateOf(editing) : localDate()}">
            </div>

            <div>
              <label>Remark</label>
              <input id="expenseRemark" type="text"
                placeholder="Optional remark"
                value="${safe(editing?.remark || "")}">
            </div>
          </div>

          <button type="button" id="saveExpense">
            ${editing ? "Update Expense" : "Save Expense"}
          </button>
          <button type="button" id="cancelExpense">Cancel</button>
        </div>

        <div class="panel">
          <h3>Expense History</h3>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="expenseRows"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    renderExpenseRows();

    get("expenseBack").addEventListener("click", openDashboard);
    get("cancelExpense").addEventListener("click", openExpenses);

    get("saveExpense").addEventListener("click", function () {
      const category = value("expenseCategory");
      const description = value("expenseDescription").trim();
      const amount = number("expenseAmount");
      const method = value("expenseMode");
      const date = value("expenseDate");
      const remark = value("expenseRemark").trim();

      if (!EXPENSE_CATEGORIES.includes(category)) {
        alert("योग्य Expense Category निवडा.");
        return;
      }

      if (!description) {
        alert("Description भरा.");
        return;
      }

      if (amount <= 0) {
        alert("योग्य Expense Amount टाका.");
        return;
      }

      if (!date) {
        alert("Expense Date निवडा.");
        return;
      }

      const all = readData(KEYS.expenses);

      if (editing) {
        const index = all.findIndex(x => x.expenseId === editId);
        if (index === -1) {
          alert("Expense सापडला नाही.");
          return;
        }

        all[index] = {
          ...all[index],
          category,
          description,
          amount,
          method,
          date,
          remark
        };
      } else {
        all.push({
          expenseId: "EXP-" + Date.now(),
          category,
          description,
          amount,
          method,
          date,
          remark,
          createdAt: new Date().toISOString()
        });
      }

      if (writeData(KEYS.expenses, all)) {
        alert(editing ? "Expense Updated!" : "Expense Saved!");
        openExpenses();
      }
    });
  }

  function renderExpenseRows() {
    const body = get("expenseRows");
    if (!body) return;

    const expenses = readData(KEYS.expenses)
      .sort((a, b) => dateOf(b).localeCompare(dateOf(a)));

    body.innerHTML = expenses.length ? expenses.map(x => `
      <tr>
        <td>${formatDate(dateOf(x))}</td>
        <td>${safe(x.category)}</td>
        <td>${safe(x.description)}</td>
        <td>${money(x.amount)}</td>
        <td>${safe(x.method)}</td>
        <td>
          <button type="button" data-edit-expense="${safe(x.expenseId)}">Edit</button>
          <button type="button" data-delete-expense="${safe(x.expenseId)}">Delete</button>
        </td>
      </tr>
    `).join("") : `
      <tr><td colspan="6">No expenses recorded.</td></tr>
    `;

    body.querySelectorAll("[data-edit-expense]").forEach(button => {
      button.addEventListener("click", () =>
        openExpenses(button.dataset.editExpense)
      );
    });

    body.querySelectorAll("[data-delete-expense]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.deleteExpense;

        if (!confirm("हा Expense Delete करायचा आहे का?")) return;

        const updated = readData(KEYS.expenses)
          .filter(x => x.expenseId !== id);

        if (writeData(KEYS.expenses, updated)) {
          openExpenses();
        }
      });
    });
  }

  // ==========================================
  // RECEIVE PAYMENT
  // ==========================================

  function openReceivePayment() {
    const orders = readData(KEYS.orders);
    const jobs = readData(KEYS.jobs);

    const records = [
      ...orders.map(item => ({
        ...item,
        type: "Banner Order",
        storageKey: KEYS.orders,
        idKey: "orderId"
      })),
      ...jobs.map(item => ({
        ...item,
        type: "Job Work",
        storageKey: KEYS.jobs,
        idKey: "jobWorkId"
      }))
    ].filter(item => Number(item.balance || 0) > 0);

    main.innerHTML = `
      <div class="form-page">
        <div class="form-header">
          <button type="button" id="paymentBack">← Back</button>
          <h2>Receive Payment</h2>
        </div>

        <div class="panel">
          <h3>Pending Payments</h3>

          <div class="field">
            <label>Select Customer / Order</label>
            <select id="paymentRecord">
              <option value="">Select Order or Job Work</option>
              ${records.map((item, index) => `
                <option value="${index}">
                  ${safe(item.customer)} - ${safe(item.type)}
                  - Balance ${money(item.balance)}
                </option>
              `).join("")}
            </select>
          </div>

          <div class="total-box">
            <p>Customer: <strong id="paymentCustomer">-</strong></p>
            <p>Bill Amount: <strong id="paymentTotal">${money(0)}</strong></p>
            <p>Already Received: <strong id="paymentReceived">${money(0)}</strong></p>
            <p>Remaining Balance: <strong id="paymentBalance">${money(0)}</strong></p>
          </div>

          <div class="form-grid">
            <div>
              <label>Amount Received Now</label>
              <input id="newPaymentAmount" type="number" min="0.01" step="0.01">
            </div>
            <div>
              <label>Payment Date</label>
              <input id="paymentDate" type="date" value="${localDate()}">
            </div>
            <div>
              <label>Payment Mode</label>
              <select id="paymentMethod">
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <button type="button" id="savePayment">Save Payment</button>
          <button type="button" id="cancelPayment">Cancel</button>
        </div>
      </div>
    `;

    let selectedRecord = null;

    get("paymentRecord").addEventListener("change", function () {
      selectedRecord = this.value === "" ? null : records[Number(this.value)];

      if (!selectedRecord) {
        get("paymentCustomer").textContent = "-";
        get("paymentTotal").textContent = money(0);
        get("paymentReceived").textContent = money(0);
        get("paymentBalance").textContent = money(0);
        get("newPaymentAmount").value = "";
        get("newPaymentAmount").removeAttribute("max");
        return;
      }

      get("paymentCustomer").textContent = selectedRecord.customer;
      get("paymentTotal").textContent = money(selectedRecord.total);
      get("paymentReceived").textContent = money(selectedRecord.received);
      get("paymentBalance").textContent = money(selectedRecord.balance);
      get("newPaymentAmount").value = "";
      get("newPaymentAmount").max = selectedRecord.balance;
    });

    get("savePayment").addEventListener("click", function () {
      if (!selectedRecord) {
        alert("आधी Customer Order निवडा.");
        return;
      }

      const amount = Number(get("newPaymentAmount").value);
      const date = get("paymentDate").value;
      const method = get("paymentMethod").value;

      if (!Number.isFinite(amount) || amount <= 0 ||
          amount > Number(selectedRecord.balance)) {
        alert("योग्य Payment Amount टाका.");
        return;
      }

      if (!date) {
        alert("Payment Date निवडा.");
        return;
      }

      const savedRecords = readData(selectedRecord.storageKey);
      const index = savedRecords.findIndex(item =>
        String(item[selectedRecord.idKey]) ===
        String(selectedRecord[selectedRecord.idKey])
      );

      if (index === -1) {
        alert("Order सापडली नाही. पुन्हा प्रयत्न करा.");
        return;
      }

      const updated = { ...savedRecords[index] };
      const newReceived = Number(updated.received || 0) + amount;
      const newBalance = Math.max(0, Number(updated.total || 0) - newReceived);

      updated.received = newReceived;
      updated.balance = newBalance;

      const payments = readData(KEYS.payments);

      payments.push({
        paymentId: "PAY-" + Date.now(),
        referenceId: updated[selectedRecord.idKey],
        customer: updated.customer,
        mobile: updated.mobile,
        type: selectedRecord.type,
        amount,
        date,
        method
      });

      const updatedRecords = savedRecords.map((item, i) =>
        i === index ? updated : item
      );

      try {
        localStorage.setItem(selectedRecord.storageKey, JSON.stringify(updatedRecords));
        localStorage.setItem(KEYS.payments, JSON.stringify(payments));

        alert(
          "Payment Successfully Saved!\n\n" +
          "Received: " + money(amount) + "\n" +
          "Total Received: " + money(newReceived) + "\n" +
          "Remaining Balance: " + money(newBalance)
        );

        openDashboard();
      } catch (error) {
        alert("Payment सेव्ह झाला नाही. Browser Storage तपासा.");
      }
    });

    get("paymentBack").addEventListener("click", openDashboard);
    get("cancelPayment").addEventListener("click", openDashboard);
  }

  // ==========================================
  // MONTHLY REPORTS
  // ==========================================

  function openReports() {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentYear = now.getFullYear();

    main.innerHTML = `
      <div class="form-page">
        <div class="form-header">
          <button type="button" id="reportBack">← Back</button>
          <h2>Monthly Reports</h2>
        </div>

        <div class="panel">
          <h3>Select Report</h3>

          <div class="form-grid">
            <div>
              <label>Report Type</label>
              <select id="reportType">
                <option value="jobwork">Job Work Report</option>
                <option value="own">Own Shop Work Report</option>
                <option value="expenses">Expenses Report</option>
                <option value="complete">Complete Monthly Report</option>
              </select>
            </div>

            <div>
              <label>Month</label>
              <select id="reportMonth">
                ${Array.from({length: 12}, (_, i) => {
                  const m = String(i + 1).padStart(2, "0");
                  return `<option value="${m}" ${m === currentMonth ? "selected" : ""}>
                    ${new Date(2000, i, 1).toLocaleString("en-IN", {month: "long"})}
                  </option>`;
                }).join("")}
              </select>
            </div>

            <div>
              <label>Year</label>
              <select id="reportYear">
                ${Array.from({length: 11}, (_, i) => currentYear - 5 + i)
                  .map(y => `<option value="${y}" ${y === currentYear ? "selected" : ""}>${y}</option>`)
                  .join("")}
              </select>
            </div>
          </div>

          <button type="button" id="generateReport">Generate Report</button>
          <button type="button" id="printReport">Print Report</button>
        </div>

        <div id="monthlyReportOutput"></div>
      </div>
    `;

    get("reportBack").addEventListener("click", openDashboard);
    get("generateReport").addEventListener("click", renderMonthlyReport);
    get("reportType").addEventListener("change", renderMonthlyReport);
    get("reportMonth").addEventListener("change", renderMonthlyReport);
    get("reportYear").addEventListener("change", renderMonthlyReport);

    get("printReport").addEventListener("click", function () {
      renderMonthlyReport();
      window.print();
    });

    renderMonthlyReport();
  }

  function renderMonthlyReport() {
    const output = get("monthlyReportOutput");
    if (!output) return;

    const type = value("reportType");
    const month = value("reportMonth");
    const year = value("reportYear");

    const orders = readData(KEYS.orders).filter(x => isInMonth(x, month, year));
    const jobs = readData(KEYS.jobs).filter(x => isInMonth(x, month, year));
    const expenses = readData(KEYS.expenses).filter(x => isInMonth(x, month, year));
    const payments = readData(KEYS.payments).filter(x => isInMonth(x, month, year));

    const sales = [...orders, ...jobs].reduce((s, x) => s + Number(x.total || 0), 0);
    const received = [...orders, ...jobs].reduce((s, x) => s + Number(x.received || 0), 0);
    const pending = [...orders, ...jobs].reduce((s, x) => s + Number(x.balance || 0), 0);
    const expenseTotal = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
    const difference = sales - expenseTotal;
    const cashBalance = received - expenseTotal;

    const titleMap = {
      jobwork: "Job Work Report",
      own: "Own Shop Work Report",
      expenses: "Expenses Report",
      complete: "Complete Monthly Report"
    };

    const heading = `
      <div class="panel">
        <h2>${titleMap[type]}</h2>
        <p>Month: ${month}/${year}</p>
      </div>
    `;

    function salesTable(items, label) {
      return `
        <div class="panel">
          <h3>${label}</h3>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>File</th>
                  <th>Total</th>
                  <th>Received</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                ${items.length ? items.map(x => `
                  <tr>
                    <td>${formatDate(dateOf(x))}</td>
                    <td>${safe(x.customer)}</td>
                    <td>${safe(x.mobile)}</td>
                    <td>${safe(x.file)}</td>
                    <td>${money(x.total)}</td>
                    <td>${money(x.received)}</td>
                    <td>${money(x.balance)}</td>
                  </tr>
                `).join("") : `<tr><td colspan="7">No records for this month.</td></tr>`}
              </tbody>
            </table>
          </div>
          <p><strong>Total: ${money(items.reduce((s, x) => s + Number(x.total || 0), 0))}</strong></p>
        </div>
      `;
    }

    function expensesTable(items) {
      const categoryTotals = EXPENSE_CATEGORIES.map(category => ({
        category,
        total: items.filter(x => x.category === category)
          .reduce((s, x) => s + Number(x.amount || 0), 0)
      }));

      return `
        <div class="panel">
          <h3>Expenses Details</h3>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                ${items.length ? items.map(x => `
                  <tr>
                    <td>${formatDate(dateOf(x))}</td>
                    <td>${safe(x.category)}</td>
                    <td>${safe(x.description)}</td>
                    <td>${money(x.amount)}</td>
                    <td>${safe(x.method)}</td>
                    <td>${safe(x.remark)}</td>
                  </tr>
                `).join("") : `<tr><td colspan="6">No expenses for this month.</td></tr>`}
              </tbody>
            </table>
          </div>

          <h3>Category-wise Expenses</h3>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr><th>Category</th><th>Total</th></tr></thead>
            <tbody>
              ${categoryTotals.map(x => `
                <tr><td>${safe(x.category)}</td><td>${money(x.total)}</td></tr>
              `).join("")}
            </tbody>
          </table>
          <h3>Total Expenses: ${money(expenseTotal)}</h3>
        </div>
      `;
    }

    function summaryTable() {
      return `
        <div class="panel">
          <h3>Monthly Financial Summary</h3>
          <div class="total-box">
            <p>Total Sales: <strong>${money(sales)}</strong></p>
            <p>Total Received: <strong>${money(received)}</strong></p>
            <p>Pending Amount: <strong>${money(pending)}</strong></p>
            <p>Total Expenses: <strong>${money(expenseTotal)}</strong></p>
            <p>Sales - Expenses: <strong>${money(difference)}</strong></p>
            <p>Received - Expenses: <strong>${money(cashBalance)}</strong></p>
          </div>
          <p><small>Sales - Expenses हा बिलांवर आधारित फरक आहे. Received - Expenses ही जमा रक्कम वजा खर्च अशी गणना आहे.</small></p>
        </div>
      `;
    }

    if (type === "jobwork") {
      output.innerHTML = heading + salesTable(jobs, "Job Work Details");
      return;
    }

    if (type === "own") {
      output.innerHTML = heading + salesTable(orders, "Own Shop Banner Orders");
      return;
    }

    if (type === "expenses") {
      output.innerHTML = heading + expensesTable(expenses);
      return;
    }

    output.innerHTML =
      heading +
      summaryTable() +
      salesTable(orders, "Own Shop Work") +
      salesTable(jobs, "Job Work") +
      expensesTable(expenses) +
      `
        <div class="panel">
          <h3>Payment History</h3>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                ${payments.length ? payments.map(p => `
                  <tr>
                    <td>${formatDate(p.date)}</td>
                    <td>${safe(p.customer)}</td>
                    <td>${safe(p.type)}</td>
                    <td>${money(p.amount)}</td>
                    <td>${safe(p.method)}</td>
                  </tr>
                `).join("") : `<tr><td colspan="5">No payment history.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      `;
  }

  // ==========================================
  // START APPLICATION
  // ==========================================

  bindNavigation();
});
