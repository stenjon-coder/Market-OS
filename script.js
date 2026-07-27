// Opening Sequence
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        const app = document.getElementById('app');
        
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        
        app.style.opacity = '1';
        app.style.transform = 'scale(1)';
        
        updateTabIndicator(document.querySelector('.tab-btn.active'));
    }, 1800);
    
    renderEntries();
});

let entries = JSON.parse(localStorage.getItem('market_entries')) || [];
let currentFilter = 'all';

// Add dynamic item row
function addItemRow() {
    const container = document.getElementById('itemRowsContainer');
    const newRow = document.createElement('div');
    newRow.className = 'item-row';
    newRow.innerHTML = `
        <input type="text" class="input-control item-name" list="itemPresets" placeholder="Item Name (e.g. Milk)" required>
        <input type="text" class="input-control item-qty" placeholder="Qty (e.g. 1 L, 2 Pcs)" required>
        <input type="number" step="0.01" class="input-control item-price" placeholder="Price ($/?)" required>
        <button type="button" class="btn-remove-row" onclick="removeRow(this)" title="Remove Row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
    `;
    container.appendChild(newRow);
}

function removeRow(btn) {
    const rows = document.querySelectorAll('.item-row');
    if (rows.length > 1) {
        btn.closest('.item-row').remove();
    } else {
        alert('At least one item row is required!');
    }
}

// Toggle Right Drawer Panel
function toggleDrawer(open) {
    const overlay = document.getElementById('drawerOverlay');
    const drawer = document.getElementById('invoiceDrawer');
    if (open) {
        populateShopSelect();
        overlay.classList.add('active');
        drawer.classList.add('active');
    } else {
        overlay.classList.remove('active');
        drawer.classList.remove('active');
    }
}

function populateShopSelect() {
    const select = document.getElementById('filterShopSelect');
    const shops = [...new Set(entries.map(e => e.shop))];
    select.innerHTML = '<option value="">All Shops</option>';
    shops.forEach(s => {
        select.innerHTML += `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`;
    });
}

function switchTab(element, filterMode) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    updateTabIndicator(element);
    currentFilter = filterMode;
    renderEntries();
}

function updateTabIndicator(element) {
    const indicator = document.getElementById('tabIndicator');
    if (element && indicator) {
        indicator.style.width = `${element.offsetWidth}px`;
        indicator.style.left = `${element.offsetLeft}px`;
    }
}

function addEntries(e) {
    e.preventDefault();
    const shop = document.getElementById('shopName').value;
    const rows = document.querySelectorAll('.item-row');
    const timeStamp = new Date().toISOString();

    rows.forEach(row => {
        entries.unshift({
            id: Date.now() + Math.random(),
            shop: shop,
            item: row.querySelector('.item-name').value,
            qty: row.querySelector('.item-qty').value,
            price: parseFloat(row.querySelector('.item-price').value),
            date: timeStamp
        });
    });

    saveAndRender();
    document.getElementById('marketForm').reset();
    document.getElementById('itemRowsContainer').innerHTML = `
        <div class="item-row">
            <input type="text" class="input-control item-name" list="itemPresets" placeholder="Item Name (e.g. Rice)" required>
            <input type="text" class="input-control item-qty" placeholder="Qty (e.g. 5 kg, 2 L)" required>
            <input type="number" step="0.01" class="input-control item-price" placeholder="Price ($/?)" required>
            <button type="button" class="btn-remove-row" onclick="removeRow(this)" title="Remove Row">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
        </div>
    `;
}

function deleteEntry(id) {
    entries = entries.filter(item => item.id !== id);
    saveAndRender();
}

function saveAndRender() {
    localStorage.setItem('market_entries', JSON.stringify(entries));
    renderEntries();
}

// Render & Real-time Search Filtering Function
function renderEntries() {
    const container = document.getElementById('entryContainer');
    const searchQuery = document.getElementById('searchQuery') ? document.getElementById('searchQuery').value.toLowerCase().trim() : '';
    container.innerHTML = '';

    let filtered = entries;

    // Date Tab Filter
    if (currentFilter === 'today') {
        const todayStr = new Date().toDateString();
        filtered = entries.filter(item => new Date(item.date).toDateString() === todayStr);
    }

    // Real-Time Search Filter (Shop Name & Item Name)
    if (searchQuery !== '') {
        filtered = filtered.filter(item => 
            item.shop.toLowerCase().includes(searchQuery) || 
            item.item.toLowerCase().includes(searchQuery)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="empty-state">No matching items or notes found!</div>`;
        updateAnalytics(filtered);
        return;
    }

    filtered.forEach(entry => {
        const dateFormatted = new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const card = document.createElement('div');
        card.className = 'entry-card';
        card.innerHTML = `
            <div class="entry-info">
                <div class="entry-title">${escapeHtml(entry.item)}</div>
                <div class="entry-meta">
                    <span class="entry-tag">${escapeHtml(entry.shop)}</span>
                    <span>Qty: ${escapeHtml(entry.qty)}</span>
                    <span>• ${dateFormatted}</span>
                </div>
            </div>
            <div style="display: flex; align-items: center;">
                <div class="price-amount">$${entry.price.toFixed(2)}</div>
                <button class="btn-delete" onclick="deleteEntry(${entry.id})" title="Delete Item">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    updateAnalytics(filtered);
}

function updateAnalytics(data) {
    const totalSum = data.reduce((sum, item) => sum + item.price, 0);
    document.getElementById('totalExpense').innerText = `$${totalSum.toFixed(2)}`;
    document.getElementById('totalItems').innerText = data.length;
}

// Generate Professional PDF Invoice
function generatePDF() {
    const selectedShop = document.getElementById('filterShopSelect').value;
    const selectedDate = document.getElementById('filterDateSelect').value;

    let invoiceItems = entries;

    if (selectedShop) {
        invoiceItems = invoiceItems.filter(e => e.shop === selectedShop);
    }

    if (selectedDate) {
        const targetDateStr = new Date(selectedDate).toDateString();
        invoiceItems = invoiceItems.filter(e => new Date(e.date).toDateString() === targetDateStr);
    }

    if (invoiceItems.length === 0) {
        alert('No items found matching the selected filter!');
        return;
    }

    // Populate PDF Template
    const tableBody = document.getElementById('pdfTableBody');
    tableBody.innerHTML = '';
    let grandTotal = 0;

    invoiceItems.forEach(item => {
        grandTotal += item.price;
        tableBody.innerHTML += `
            <tr>
                <td><strong>${escapeHtml(item.item)}</strong></td>
                <td>${escapeHtml(item.shop)}</td>
                <td>${escapeHtml(item.qty)}</td>
                <td style="text-align: right;">$${item.price.toFixed(2)}</td>
            </tr>
        `;
    });

    document.getElementById('pdfGrandTotal').innerText = `$${grandTotal.toFixed(2)}`;
    document.getElementById('pdfInvoiceMeta').innerText = `Date: ${new Date().toLocaleDateString()} | Ref: #INV-${Math.floor(1000 + Math.random() * 9000)}`;

    const element = document.getElementById('pdfTemplate');
    element.style.display = 'block';

    const opt = {
        margin:       10,
        filename:     `Market_OS_Invoice_${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.display = 'none';
        toggleDrawer(false);
    });
}

function escapeHtml(text) {
    return text.replace(/[&<"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}
