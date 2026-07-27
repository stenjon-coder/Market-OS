// LocalStorage variables & State Initialization
let entries = JSON.parse(localStorage.getItem('market_os_entries')) || [];
let activeTab = 'all';

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const loader = document.getElementById('loader');
        const app = document.getElementById('appContainer');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.visibility = 'hidden';
        }
        if (app) {
            app.style.opacity = '1';
            app.style.transform = 'scale(1)';
        }
    }, 1000);

    updateTabIndicator();
    renderEntries();
});

// Dynamic Item Rows Management
function addItemRow() {
    const container = document.getElementById('itemsContainer');
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
        <input type="text" class="input-control item-name" placeholder="Item description (e.g. Milk)">
        <input type="text" class="input-control item-qty" placeholder="Qty (e.g. 1 L)" value="1 Pcs">
        <input type="number" step="0.01" class="input-control item-price" placeholder="Price (₹)">
        <button class="btn-remove-row" onclick="removeRow(this)">✕</button>
    `;
    container.appendChild(row);
}

function removeRow(btn) {
    const rows = document.querySelectorAll('.item-row');
    if (rows.length > 1) {
        btn.closest('.item-row').remove();
    } else {
        alert('At least one item is required.');
    }
}

// Save Entry Function
function saveEntry() {
    const customerName = document.getElementById('customerName').value.trim();
    const itemRows = document.querySelectorAll('.item-row');
    
    if (!customerName) {
        alert('Please enter a Customer or Store Name.');
        return;
    }

    let items = [];
    let total = 0;

    itemRows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const qty = row.querySelector('.item-qty').value.trim() || '1 Pcs';
        const price = parseFloat(row.querySelector('.item-price').value) || 0;

        if (name && price > 0) {
            total += price;
            items.push({ name, qty, price });
        }
    });

    if (items.length === 0) {
        alert('Please add at least one valid item with a price.');
        return;
    }

    const newEntry = {
        id: Date.now(),
        customerName,
        items,
        total,
        date: new Date().toISOString()
    };

    entries.unshift(newEntry);
    localStorage.setItem('market_os_entries', JSON.stringify(entries));

    // Reset Form
    document.getElementById('customerName').value = '';
    document.getElementById('itemsContainer').innerHTML = `
        <div class="item-row">
            <input type="text" class="input-control item-name" placeholder="Item description (e.g. Rice)">
            <input type="text" class="input-control item-qty" placeholder="Qty (e.g. 2 kg / 1 pc)" value="1 Pcs">
            <input type="number" step="0.01" class="input-control item-price" placeholder="Price (₹)">
            <button class="btn-remove-row" onclick="removeRow(this)">✕</button>
        </div>
    `;

    renderEntries();
}

// Render Saved Entries List
function renderEntries() {
    const list = document.getElementById('entriesList');
    const searchInput = document.getElementById('searchInput');
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = entries.filter(e => e.customerName.toLowerCase().includes(searchVal));

    if (activeTab === 'today') {
        const todayStr = new Date().toDateString();
        filtered = filtered.filter(e => new Date(e.date).toDateString() === todayStr);
    }

    if (filtered.length === 0) {
        list.innerHTML = `<div class="empty-state">No records found.</div>`;
        updateSummary(0, 0);
        populateBillSelect([]);
        return;
    }

    let html = '';
    let grandTotal = 0;

    filtered.forEach(entry => {
        grandTotal += entry.total;
        const formattedDate = new Date(entry.date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });

        html += `
            <div class="entry-card">
                <div class="entry-info">
                    <div class="entry-title">${escapeHtml(entry.customerName)}</div>
                    <div class="entry-meta">
                        <span>📅 ${formattedDate}</span>
                        <span class="entry-tag">${entry.items.length} items</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center;">
                    <div class="price-amount">₹${entry.total.toFixed(2)}</div>
                    <button class="btn-delete" onclick="deleteEntry(${entry.id})">🗑️</button>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
    updateSummary(grandTotal, filtered.length);
    populateBillSelect(entries);
}

function deleteEntry(id) {
    if (confirm('Are you sure you want to delete this record?')) {
        entries = entries.filter(e => e.id !== id);
        localStorage.setItem('market_os_entries', JSON.stringify(entries));
        renderEntries();
    }
}

function updateSummary(total, count) {
    document.getElementById('grandTotal').innerText = `₹${total.toFixed(2)}`;
    document.getElementById('totalEntriesCount').innerText = count;
}

// Tab Switching Mechanics
function switchTab(btn, tab) {
    activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateTabIndicator();
    renderEntries();
}

function updateTabIndicator() {
    const activeBtn = document.querySelector('.tab-btn.active');
    const indicator = document.getElementById('tabIndicator');
    if (activeBtn && indicator) {
        indicator.style.left = `${activeBtn.offsetLeft}px`;
        indicator.style.width = `${activeBtn.offsetWidth}px`;
    }
}

function filterEntries() {
    renderEntries();
}

// Bill Side Drawer Functionalities
function toggleDrawer(open) {
    const overlay = document.getElementById('drawerOverlay');
    const drawer = document.getElementById('invoiceDrawer');
    if (open) {
        overlay.classList.add('active');
        drawer.classList.add('active');
    } else {
        overlay.classList.remove('active');
        drawer.classList.remove('active');
    }
}

function populateBillSelect(data) {
    const select = document.getElementById('billSelect');
    if (!select) return;
    select.innerHTML = '<option value="">-- Choose Entry --</option>';
    data.forEach(entry => {
        select.innerHTML += `<option value="${entry.id}">${escapeHtml(entry.customerName)} - ₹${entry.total.toFixed(2)}</option>`;
    });
}

function previewBill() {
    const selectedId = document.getElementById('billSelect').value;
    const previewBox = document.getElementById('drawerPreview');
    
    if (!selectedId) {
        previewBox.innerHTML = 'Select an entry above to view invoice summary.';
        return;
    }

    const entry = entries.find(e => e.id == selectedId);
    if (entry) {
        let itemsHtml = entry.items.map(i => `<div style="display:flex; justify-content:space-between; margin-top:6px;"><span>${escapeHtml(i.name)} (${escapeHtml(i.qty)})</span><span>₹${i.price.toFixed(2)}</span></div>`).join('');
        previewBox.innerHTML = `
            <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; border: 1px solid var(--card-border);">
                <strong style="color: #fff;">${escapeHtml(entry.customerName)}</strong>
                <div style="margin-top: 10px; border-top: 1px solid var(--card-border); padding-top: 8px;">${itemsHtml}</div>
                <div style="margin-top: 12px; text-align: right; font-weight: bold; color: #fff;">Total: ₹${entry.total.toFixed(2)}</div>
            </div>
        `;
    }
}

// Professional PDF Download Function
async function downloadPDF() {
    const selectedId = document.getElementById('billSelect').value;
    if (!selectedId) {
        alert('Please select an entry to download PDF bill.');
        return;
    }

    const entry = entries.find(e => e.id == selectedId);
    
    // Inject Info into Printable Template
    const tableBody = document.getElementById('pdfTableBody');
    tableBody.innerHTML = '';

    entry.items.forEach(item => {
        tableBody.innerHTML += `
            <tr>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${escapeHtml(entry.customerName)}</td>
                <td>${escapeHtml(item.qty)}</td>
                <td style="text-align: right;">₹${item.price.toFixed(2)}</td>
            </tr>
        `;
    });

    document.getElementById('pdfGrandTotal').innerText = `₹${entry.total.toFixed(2)}`;
    document.getElementById('pdfInvoiceMeta').innerText = `Date: ${new Date(entry.date).toLocaleDateString()} | Ref: #INV-${Math.floor(1000 + Math.random() * 9000)}`;

    const element = document.getElementById('pdfTemplate');
    element.style.display = 'block';

    const fileName = `Market_Notes_${entry.customerName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;

    // Option A: Use File Picker API (Works on PC Desktop Chrome/Edge for Custom Folder Saving)
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'PDF Document',
                    accept: { 'application/pdf': ['.pdf'] },
                }],
            });

            const pdfBlob = await html2pdf().set({
                margin: 10,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(element).output('blob');

            const writable = await handle.createWritable();
            await writable.write(pdfBlob);
            await writable.close();

            element.style.display = 'none';
            toggleDrawer(false);
            return;
        } catch (err) {
            if (err.name === 'AbortError') {
                element.style.display = 'none';
                return;
            }
        }
    }

    // Option B: Standard Browser Download Fallback
    const opt = {
        margin:       10,
        filename:     fileName,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.display = 'none';
        toggleDrawer(false);
    });
}

// Helper Function: Sanitize HTML String
function escapeHtml(text) {
    return String(text).replace(/[&<"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}
