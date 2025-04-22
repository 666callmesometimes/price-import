const table = document.getElementById('dataTable');

window.onload = function () {
  loadFromStorage();
};

table.addEventListener('paste', function (e) {
  const clipboardData = e.clipboardData || window.clipboardData;
  const pastedData = clipboardData.getData('Text');
  const startCell = document.activeElement;
  if (startCell.tagName !== 'TD') return;
  e.preventDefault();

  const startRow = startCell.parentElement.rowIndex - 1;
  const startCol = startCell.cellIndex;

  const rows = pastedData.split(/\r?\n/).filter(row => row.trim() !== '');
  rows.forEach((row, rowIndex) => {
    const cells = row.split('\t');
    let tr = table.rows[startRow + 1 + rowIndex];
    if (!tr) tr = addRow();
    cells.forEach((cell, cellIndex) => {
      const td = tr.cells[startCol + cellIndex];
      if (td && td.contentEditable === 'true') td.textContent = cell;
    });
  });
  fixPromoQty();
  saveToStorage();
});

function addRow() {
  const tbody = table.querySelector('tbody');
  const tr = tbody.insertRow();
  for (let i = 0; i < 6; i++) {
    const td = tr.insertCell();
    td.contentEditable = 'true';
    if (i === 4) td.setAttribute('oninput', 'fixSinglePromoQty(this)');
  }
  const deleteCell = tr.insertCell();
  deleteCell.innerHTML = '<button class="delete-btn" onclick="deleteRow(this)">❌</button>';
  return tr;
}

function deleteRow(btn) {
  const row = btn.parentElement.parentElement;
  row.remove();
  saveToStorage();
}

function deleteAllRows() {
  const tbody = table.querySelector('tbody');
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
  addRow(); // Dodaj jeden pusty wiersz
  saveToStorage();
}

function fixSinglePromoQty(cell) {
  const row = cell.parentElement;
  const value = cell.textContent.trim();
  if (value === '' || value === '0' || value.toLowerCase() === 'null') {
    cell.textContent = '99';
    row.cells[5].textContent = '1';
  }
  saveToStorage();
}

function fixPromoQty() {
  const tbody = table.querySelector('tbody');
  for (let row of tbody.rows) {
    fixSinglePromoQty(row.cells[4]);
  }
}

function formatPriceForCSV(priceStr) {
if (!priceStr || priceStr.trim() === '') return '';

// Usuń spacje
let price = priceStr.replace(/\s+/g, '');

// Obsługa formatu z kropką i przecinkiem (np. 4.298,99)
if (price.includes('.') && price.includes(',')) {
price = price.replace('.', '');
}

// Zamień przecinek na kropkę jako separator dziesiętny
price = price.replace(',', '.');

return price;
}

function formatDateForCSV(dateStr) {
  if (!dateStr || dateStr.trim() === '') return '';
  
  // Rozpoznaj różne formaty daty
  let day, month, year, time;
  
  // Format "dd-mm-yy [HH:MM]"
  let match = dateStr.trim().match(/(\d{1,2})-(\d{1,2})-(\d{2})(?:\s+(\d{1,2}:\d{2}))?/);
  if (match) {
    day = parseInt(match[1], 10);
    month = match[2].padStart(2, '0');
    year = match[3];
    time = match[4] || '';
  } else {
    // Format "dd.mm.yyyy [HH:MM]"
    match = dateStr.trim().match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:\s+(\d{1,2}:\d{2}))?/);
    if (match) {
      day = parseInt(match[1], 10);
      month = match[2].padStart(2, '0');
      year = match[3];
      if (year.length === 4) year = year.slice(2); // Zostaw tylko 2 ostatnie cyfry roku
      time = match[4] || '';
    } else {
      return dateStr; // Jeśli nie rozpoznano formatu, zwróć oryginalny ciąg
    }
  }
  
  return `${year}-${month}-${day}${time ? ' ' + time : ''}`;
}

function applyMassTime() {
  const fromTime = document.getElementById('fromTimeInput').value.trim();
  const toTime = document.getElementById('toTimeInput').value.trim();
  const tbody = table.querySelector('tbody');

  for (let row of tbody.rows) {
    if (fromTime.match(/^\d{1,2}:\d{2}$/)) {
      let cell = row.cells[2];
      let content = cell.textContent.trim();
      if (content !== '') {
        // Zachowaj oryginalny format daty, dodaj tylko czas
        let datePart = content.split(' ')[0];
        cell.textContent = datePart + ' ' + fromTime;
      }
    }
    if (toTime.match(/^\d{1,2}:\d{2}$/)) {
      let cell = row.cells[3];
      let content = cell.textContent.trim();
      if (content !== '') {
        // Zachowaj oryginalny format daty, dodaj tylko czas
        let datePart = content.split(' ')[0];
        cell.textContent = datePart + ' ' + toTime;
      }
    }
  }
  saveToStorage();
}

function exportToCSV() {
  fixPromoQty();
  const headers = ['sku','special_price','special_price_from','special_price_to','import_promo_qty','import_promo_qty_use_central_stock'];
  let csv = headers.join(',') + '\n';
  const tbody = document.querySelector('tbody');

  for (let row of tbody.rows) {
    const data = [];
    for (let i = 0; i < 6; i++) {
      let cellValue = row.cells[i].innerText;
      
      // Formatowanie wartości w zależności od kolumny
      if (i === 1) { // Kolumna special_price
        cellValue = formatPriceForCSV(cellValue);
      } else if (i === 2 || i === 3) { // Kolumny z datami
        cellValue = formatDateForCSV(cellValue);
      }
      
      data.push('"' + cellValue.replace(/"/g, '""') + '"');
    }
    csv += data.join(',') + '\n';
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'promo_data.csv';
  link.click();
}

function saveToStorage() {
  const data = [];
  const tbody = document.querySelector('tbody');
  for (let row of tbody.rows) {
    const rowData = [];
    for (let i = 0; i < 6; i++) {
      rowData.push(row.cells[i].innerText);
    }
    data.push(rowData);
  }
  localStorage.setItem('promoTable', JSON.stringify(data));
}

function loadFromStorage() {
  const data = JSON.parse(localStorage.getItem('promoTable')) || [];
  if (data.length === 0) {
    addRow(); // Dodaj jeden pusty wiersz, jeśli nie ma danych
    return;
  }
  
  data.forEach(rowArr => {
    const row = addRow();
    for (let i = 0; i < 6; i++) {
      row.cells[i].innerText = rowArr[i];
    }
  });
}
