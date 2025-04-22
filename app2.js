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
    
    const originalDateStr = dateStr.trim();
    let day, month, year, time = '';
    
    // Słownik nazw miesięcy w różnych językach
    const monthNames = {
      // Polski
      'styczeń': '01', 'stycznia': '01', 'sty': '01',
      'luty': '02', 'lutego': '02', 'lut': '02',
      'marzec': '03', 'marca': '03', 'mar': '03',
      'kwiecień': '04', 'kwietnia': '04', 'kwi': '04',
      'maj': '05', 'maja': '05',
      'czerwiec': '06', 'czerwca': '06', 'cze': '06',
      'lipiec': '07', 'lipca': '07', 'lip': '07',
      'sierpień': '08', 'sierpnia': '08', 'sie': '08',
      'wrzesień': '09', 'września': '09', 'wrz': '09',
      'październik': '10', 'października': '10', 'paź': '10',
      'listopad': '11', 'listopada': '11', 'lis': '11',
      'grudzień': '12', 'grudnia': '12', 'gru': '12',
      
      // Niemiecki
      'januar': '01', 'jänner': '01', 'jan': '01',
      'februar': '02', 'feber': '02', 'feb': '02',
      'märz': '03', 'marz': '03', 'mär': '03', 'mar': '03',
      'april': '04', 'apr': '04',
      'mai': '05',
      'juni': '06', 'jun': '06',
      'juli': '07', 'jul': '07',
      'august': '08', 'aug': '08',
      'september': '09', 'sep': '09',
      'oktober': '10', 'okt': '10',
      'november': '11', 'nov': '11',
      'dezember': '12', 'dez': '12',
      
      // Angielski
      'january': '01',
      'february': '02',
      'march': '03',
      'april': '04',
      'may': '05',
      'june': '06',
      'july': '07',
      'august': '08',
      'september': '09',
      'october': '10',
      'november': '11',
      'december': '12'
    };
  
    // Najpierw wydziel czas z daty, jeśli istnieje
    let dateWithoutTime = originalDateStr;
    const timeMatch = originalDateStr.match(/(\d{1,2}:\d{2})$/);
    
    if (timeMatch) {
      time = timeMatch[1];
      // Usuń czas z daty do przetworzenia
      dateWithoutTime = originalDateStr.substring(0, originalDateStr.lastIndexOf(time)).trim();
    }
  
    // Sprawdź format typu "Dzień tygodnia, dd. Miesiąc rok" (np. "Freitag, 11. April 2025")
    const textDateRegex = /(?:[^\d,]*,\s*)?(\d{1,2})(?:\.|\s)\s*([A-Za-zäöüÄÖÜß]+)\s+(\d{4})/;
    let match = dateWithoutTime.match(textDateRegex);
    
    if (match) {
      day = parseInt(match[1], 10).toString().padStart(2, '0');
      
      // Znajdź miesiąc w słowniku
      const monthText = match[2].toLowerCase();
      month = monthNames[monthText];
      
      if (!month) {
        console.log("Nie rozpoznano miesiąca:", monthText);
        month = '01'; // Domyślnie 01 jeśli nie rozpoznano
      }
      
      // Zostaw tylko 2 ostatnie cyfry roku
      year = match[3].slice(2);
      
      return `${year}-${month}-${day}${time ? ' ' + time : ''}`;
    }
    
    // Format "dd-mm-yy [HH:MM]" lub "mm-dd-yy [HH:MM]" lub "yy-mm-dd [HH:MM]"
    match = dateWithoutTime.match(/(\d{1,2})-(\d{1,2})-(\d{2})/);
    if (match) {
      const first = parseInt(match[1], 10);
      
      // Sprawdź czy pierwszy segment to rok (jeśli to 25)
      if (first === 25) {
        year = match[1];
        month = match[2].padStart(2, '0');
        day = parseInt(match[3], 10).toString().padStart(2, '0');
      } else {
        day = parseInt(match[1], 10).toString().padStart(2, '0');
        month = match[2].padStart(2, '0');
        year = match[3];
      }
      
      return `${year}-${month}-${day}${time ? ' ' + time : ''}`;
    } 
    
    // Format "dd.mm.yyyy [HH:MM]"
    match = dateWithoutTime.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
    if (match) {
      day = parseInt(match[1], 10).toString().padStart(2, '0');
      month = match[2].padStart(2, '0');
      year = match[3];
      if (year.length === 4) year = year.slice(2); // Zostaw tylko 2 ostatnie cyfry roku
      
      return `${year}-${month}-${day}${time ? ' ' + time : ''}`;
    }
    
    // Jeśli nic nie pasuje, zwróć oryginalny ciąg
    console.log("Nie rozpoznano formatu daty:", originalDateStr);
    return originalDateStr;
  }

  function applyMassTime() {
    const fromTime = document.getElementById('fromTimeInput').value.trim();
    const toTime = document.getElementById('toTimeInput').value.trim();
    const tbody = table.querySelector('tbody');
  
    for (let row of tbody.rows) {
      // Obsługa komórki FROM
      if (fromTime.match(/^\d{1,2}:\d{2}$/)) {
        let cell = row.cells[2];
        let content = cell.textContent.trim();
        
        if (content !== '') {
          // Sprawdź czy data zawiera już godzinę
          if (content.match(/\d{1,2}:\d{2}$/)) {
            // Jeśli zawiera godzinę, zastąp ją nową
            cell.textContent = content.replace(/\d{1,2}:\d{2}$/, fromTime);
          } else {
            // Jeśli nie zawiera godziny, dodaj ją
            cell.textContent = content + ' ' + fromTime;
          }
        }
      }
      
      // Obsługa komórki TO
      if (toTime.match(/^\d{1,2}:\d{2}$/)) {
        let cell = row.cells[3];
        let content = cell.textContent.trim();
        
        if (content !== '') {
          // Sprawdź czy data zawiera już godzinę
          if (content.match(/\d{1,2}:\d{2}$/)) {
            // Jeśli zawiera godzinę, zastąp ją nową
            cell.textContent = content.replace(/\d{1,2}:\d{2}$/, toTime);
          } else {
            // Jeśli nie zawiera godziny, dodaj ją
            cell.textContent = content + ' ' + toTime;
          }
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
