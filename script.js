// Firebase Config Placeholder
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

let db = null, auth = null;
try {
    if (firebase.apps.length === 0 && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    }
} catch (e) { console.log("Offline mode active"); }

let entries = JSON.parse(localStorage.getItem('market_os_entries')) || [];
let activeTab = 'all';
let currentCurrency = localStorage.getItem('market_os_curr') || '₹';
let myChart = null;

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        const app = document.getElementById('appContainer');
        if (loader) loader.style.opacity = '0', loader.style.visibility = 'hidden';
        if (app) app.style.opacity = '1';
    }, 600);

    document.getElementById('currencySelect').value = currentCurrency;
    updateCurrencySymbols();
    renderEntries();
    initChart();
});

function changeCurrency(curr) {
    currentCurrency = curr;
    localStorage.setItem('market_os_curr', curr);
    updateCurrencySymbols();
    renderEntries();
}

function updateCurrencySymbols() {
    document.querySelectorAll('.curr-symbol').forEach(el => el.innerText = currentCurrency);
}

function addItemRow() {
    const container = document.getElementById('itemsContainer');
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
        <input type="text" class="modern-input item-name" placeholder="Item Description">
        <input type="text" class="modern-input item-qty" placeholder="Qty" value="1 Pcs">
        <input type="number" step="0.01" class="modern-input item-price" placeholder="Price" oninput="calculateSubtotal()">
        <button class="btn-icon-danger" onclick="removeRow(this)">✕</button>
    `;
    container.appendChild(row);
}

function removeRow(btn) {
    const rows = document.querySelectorAll('.item-row');
    if (rows.length > 1) {
        btn.closest('.item-row').remove();
        calculateSubtotal();
    } else { alert('At least one item required.'); }
}

function calculateSubtotal() {
    const itemRows = document.querySelectorAll('.item-row');
    let rawTotal = 0;
    itemRows.forEach(row => {
        rawTotal += parseFloat(row.querySelector('.item-price').value) || 0;
    });

    const discount = parseFloat(document.getElementById('discountPercent').value) || 0;
    const gstRate = parseFloat(document.getElementById('gstRate').value) || 0;

    let discounted = rawTotal - (rawTotal * (discount / 100));
    let finalTotal = discounted + (discounted * (gstRate / 100));

    document.getElementById('liveTotalDisplay').innerText = `${currentCurrency}${finalTotal.toFixed(2)}`;
    return { rawTotal, discount, gstRate, finalTotal };
}

function saveEntry() {
    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const paymentStatus = document.getElementById('paymentStatus').value;
    const categoryTag = document.getElementById('categoryTag').value;
    const itemRows = document.querySelectorAll('.item-row');

    if (!customerName) { alert('Please enter customer/store name.'); return; }

    let items = [];
    itemRows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const qty = row.querySelector('.item-qty').value.trim() || '1 Pcs';
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        if (name && price > 0) items.push({ name, qty, price });
    });

    if (items.length === 0) { alert('Add at least one valid item with price.'); return; }

    const calc = calculateSubtotal();
    const newEntry = {
        id: Date.now(), customerName, customerPhone,
        status: paymentStatus, category: categoryTag,
        items, discount: calc.discount, gstRate: calc.gstRate,
        total: calc.finalTotal, date: new Date().toISOString()
    };

    entries.unshift(newEntry);
    localStorage.setItem('market_os_entries', JSON.stringify(entries));

    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('discountPercent').value = '0';
    document.getElementById('gstRate').value = '0';
    document.getElementById('itemsContainer').innerHTML = `
        <div class="item-row">
            <input type="text" class="modern-input item-name" placeholder="Item Description">
            <input type="text" class="modern-input item-qty" placeholder="Qty" value="1 Pcs">
            <input type="number" step="0.01" class="modern-input item-price" placeholder="Price" oninput="calculateSubtotal()">
            <button class="btn-icon-danger" onclick="removeRow(this)">✕</button>
        </div>
    `;

    calculateSubtotal();
    renderEntries();
}

function renderEntries() {
    const list = document.getElementById('entriesList');
    const searchVal = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';

    let filtered = entries.filter(e => e.customerName.toLowerCase().includes(searchVal) || (e.customerPhone && e.customerPhone.includes(searchVal)));

    if (activeTab === 'today') {
        const todayStr = new Date().toDateString();
        filtered = filtered.filter(e => new Date(e.date).toDateString() === todayStr);
    } else if (activeTab === 'unpaid') {
        filtered = filtered.filter(e => e.status === 'Unpaid');
    }

    if (filtered.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-secondary);">No matching entries.</div>`;
        updateSummary(); populateBillSelect([]); updateChart();
        return;
    }

    let html = '';
    filtered.forEach(entry => {
        const formattedDate = new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        const isPaid = entry.status === 'Paid';
        const badgeClass = isPaid ? 'paid' : 'unpaid';
        const badgeText = isPaid ? '✅ Paid' : '❌ Unpaid';

        html += `
            <div class="record-item">
                <div>
                    <div class="record-name">${escapeHtml(entry.customerName)}</div>
                    <div class="record-sub">
                        <span>📅 ${formattedDate}</span>
                        <span class="badge-cat">${entry.category || 'General'}</span>
                        <span class="badge-status ${badgeClass}" onclick="toggleStatus(${entry.id})">${badgeText}</span>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="record-price">${currentCurrency}${entry.total.toFixed(2)}</div>
                    <button class="btn-icon-danger" style="width:30px; height:30px;" onclick="deleteEntry(${entry.id})">🗑️</button>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
    updateSummary();
    populateBillSelect(entries);
    updateChart();
}

function toggleStatus(id) {
    const entry = entries.find(e => e.id === id);
    if (entry) {
        entry.status = entry.status === 'Paid' ? 'Unpaid' : 'Paid';
        localStorage.setItem('market_os_entries', JSON.stringify(entries));
        renderEntries();
    }
}

function deleteEntry(id) {
    if (confirm('Delete this record permanently?')) {
        entries = entries.filter(e => e.id !== id);
        localStorage.setItem('market_os_entries', JSON.stringify(entries));
        renderEntries();
    }
}

function updateSummary() {
    let grandTotal = entries.reduce((sum, e) => sum + e.total, 0);
    let unpaidTotal = entries.filter(e => e.status === 'Unpaid').reduce((sum, e) => sum + e.total, 0);
    document.getElementById('grandTotal').innerText = `${currentCurrency}${grandTotal.toFixed(2)}`;
    document.getElementById('unpaidTotal').innerText = `${currentCurrency}${unpaidTotal.toFixed(2)}`;
}

function switchTab(btn, tab) {
    activeTab = tab;
    document.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderEntries();
}

function filterEntries() { renderEntries(); }

function toggleDrawer(open) {
    const overlay = document.getElementById('drawerOverlay');
    const drawer = document.getElementById('invoiceDrawer');
    if (open) overlay.classList.add('active'), drawer.classList.add('active');
    else overlay.classList.remove('active'), drawer.classList.remove('active');
}

function populateBillSelect(data) {
    const select = document.getElementById('billSelect');
    if (!select) return;
    select.innerHTML = '<option value="">-- Choose Entry --</option>';
    data.forEach(entry => {
        select.innerHTML += `<option value="${entry.id}">${escapeHtml(entry.customerName)} (${entry.status}) - ${currentCurrency}${entry.total.toFixed(2)}</option>`;
    });
}

function previewBill() {
    const selectedId = document.getElementById('billSelect').value;
    const previewBox = document.getElementById('drawerPreview');
    if (!selectedId) {
        previewBox.innerHTML = 'Choose an entry to preview receipt and sharing options.';
        return;
    }

    const entry = entries.find(e => e.id == selectedId);
    if (entry) {
        let itemsHtml = entry.items.map(i => `<div style="display:flex; justify-content:space-between; margin-top:4px;"><span>${escapeHtml(i.name)} (${escapeHtml(i.qty)})</span><span>${currentCurrency}${i.price.toFixed(2)}</span></div>`).join('');
        const statusColor = entry.status === 'Paid' ? 'var(--accent-green)' : 'var(--danger)';

        previewBox.innerHTML = `
            <div>
                <div style="display:flex; justify-content:space-between;">
                    <strong style="color: #fff; font-size:0.95rem;">${escapeHtml(entry.customerName)}</strong>
                    <span style="color:${statusColor}; font-weight:bold;">${entry.status}</span>
                </div>
                <div style="color:var(--text-secondary); font-size:0.75rem; margin-top:2px;">Phone: ${entry.customerPhone || 'N/A'}</div>
                <div style="margin-top: 8px; border-top: 1px solid var(--panel-border); padding-top: 6px;">${itemsHtml}</div>
                <div style="margin-top: 8px; text-align: right; font-weight: bold; color: var(--accent-green);">Total: ${currentCurrency}${entry.total.toFixed(2)}</div>
            </div>
        `;
    }
}

// Direct WhatsApp Invoice Sharing
function shareWhatsApp() {
    const selectedId = document.getElementById('billSelect').value;
    if (!selectedId) { alert('Please select a bill to share.'); return; }

    const entry = entries.find(e => e.id == selectedId);
    let itemDetails = entry.items.map(i => `• ${i.name} (${i.qty}): ${currentCurrency}${i.price.toFixed(2)}`).join('%0A');

    let text = `🧾 *INVOICE FROM MARKET OS*%0A` +
               `--------------------------------%0A` +
               `*Customer:* ${entry.customerName}%0A` +
               `*Status:* ${entry.status}%0A%0A` +
               `*Items:*%0A${itemDetails}%0A` +
               `--------------------------------%0A` +
               `*Total Amount:* ${currentCurrency}${entry.total.toFixed(2)}%0A%0A` +
               `Thank you for doing business with us!`;

    let phoneNum = entry.customerPhone ? entry.customerPhone.replace(/[^0-9]/g, '') : '';
    let waUrl = phoneNum ? `https://wa.me/${phoneNum}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
}

// Thermal Bluetooth POS Printing
function printThermalPOS() {
    const selectedId = document.getElementById('billSelect').value;
    if (!selectedId) { alert('Please select a bill.'); return; }

    const entry = entries.find(e => e.id == selectedId);
    const printWin = window.open('', '_blank', 'width=300,height=600');
    let itemsHtml = entry.items.map(i => `<tr><td>${i.name} x${i.qty}</td><td style="text-align:right">${currentCurrency}${i.price.toFixed(2)}</td></tr>`).join('');
    
    printWin.document.write(`
        <html>
            <head><style>body { font-family: monospace; width: 58mm; padding: 5mm; margin:0; } table { width:100%; border-collapse:collapse; } td { font-size:10pt; }</style></head>
            <body>
                <h3 style="text-align:center;margin:0;">MARKET OS</h3>
                <p style="text-align:center;font-size:8pt;margin-top:2px;">OFFICIAL RECEIPT</p>
                <hr>
                <p style="font-size:8pt;">Cust: ${entry.customerName}<br>Date: ${new Date(entry.date).toLocaleDateString()}</p>
                <hr>
                <table>${itemsHtml}</table>
                <hr>
                <h4 style="text-align:right;margin:5px 0;">TOTAL: ${currentCurrency}${entry.total.toFixed(2)}</h4>
                <p style="text-align:center;font-size:8pt;margin-top:15px;">*** THANK YOU ***</p>
                <script>window.print(); window.close();</script>
            </body>
        </html>
    `);
}

// PDF Generation
async function downloadPDF() {
    const selectedId = document.getElementById('billSelect').value;
    if (!selectedId) { alert('Select entry.'); return; }

    const entry = entries.find(e => e.id == selectedId);
    const tableBody = document.getElementById('pdfTableBody');
    tableBody.innerHTML = '';

    entry.items.forEach(item => {
        tableBody.innerHTML += `
            <tr>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${escapeHtml(item.qty)}</td>
                <td style="text-align: right;">${currentCurrency}${item.price.toFixed(2)}</td>
            </tr>
        `;
    });

    document.getElementById('pdfCustomerName').innerText = entry.customerName;
    document.getElementById('pdfCustomerPhone').innerText = entry.customerPhone || 'N/A';
    document.getElementById('pdfCategory').innerText = entry.category || 'General';

    const statusBadge = document.getElementById('pdfStatusBadge');
    if (entry.status === 'Paid') {
        statusBadge.innerText = 'STATUS: PAID';
        statusBadge.style.background = '#dcfce7'; statusBadge.style.color = '#15803d';
    } else {
        statusBadge.innerText = 'STATUS: UNPAID';
        statusBadge.style.background = '#ffe4e6'; statusBadge.style.color = '#be123c';
    }

    document.getElementById('pdfCalculations').innerText = `Discount: ${entry.discount}% | GST: ${entry.gstRate}%`;
    document.getElementById('pdfGrandTotal').innerText = `${currentCurrency}${entry.total.toFixed(2)}`;
    document.getElementById('pdfInvoiceMeta').innerText = `Date: ${new Date(entry.date).toLocaleDateString()} | Ref: #INV-${Math.floor(1000 + Math.random() * 9000)}`;

    const element = document.getElementById('pdfTemplate');
    element.style.display = 'block';

    const fileName = `Market_Notes_${entry.customerName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const opt = { margin: 10, filename: fileName, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };

    try {
        const worker = html2pdf().set(opt).from(element);
        worker.save().then(() => { element.style.display = 'none'; toggleDrawer(false); });
    } catch (error) { element.style.display = 'none'; }
}

// Chart.js Setup
function initChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Grocery', 'Pharmacy', 'Electronics', 'Clothing', 'General'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } } }
        }
    });
    updateChart();
}

function updateChart() {
    if (!myChart) return;
    const categories = ['Grocery', 'Pharmacy', 'Electronics', 'Clothing', 'General'];
    const totals = categories.map(cat => entries.filter(e => (e.category || 'General') === cat).reduce((s, e) => s + e.total, 0));
    myChart.data.datasets[0].data = totals;
    myChart.update();
}

function toggleChartType() {
    if (!myChart) return;
    myChart.config.type = myChart.config.type === 'doughnut' ? 'bar' : 'doughnut';
    myChart.update();
}

function toggleAuthModal() {
    const m = document.getElementById('authModal');
    m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
}

function loginGoogle() {
    if (!auth) { alert('Firebase config not set. Operating in Offline Mode.'); return; }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(res => {
        document.getElementById('userAuthName').innerText = res.user.displayName;
        toggleAuthModal();
    }).catch(err => alert(err.message));
}

function logoutFirebase() {
    if (auth) auth.signOut();
    document.getElementById('userAuthName').innerText = 'Sign In / Sync';
    toggleAuthModal();
}

function escapeHtml(text) {
    return String(text).replace(/[&<"']/g, m => ({ '&': '&amp;', '<': '&lt;', '"': '&quot;', "'": '&#039;' }[m]));
}
