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
  validateAllRows();
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
    if (i === 2 || i === 3) td.setAttribute('oninput', 'validateDateTimeCell(this)');
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

function isValidTime(timeStr) {
  // Sprawdź, czy czas ma format HH:MM z poprawnymi wartościami (00:00 - 23:59)
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(timeStr);
}

function formatTime(timeStr) {
  // Upewnij się, że godziny przed 12:00 są uzupełnione zerem
  if (isValidTime(timeStr)) {
    const [hours, minutes] = timeStr.split(':');
    return hours.padStart(2, '0') + ':' + minutes;
  }
  return timeStr;
}

function validateDateTimeCell(cell) {
  const row = cell.parentElement;
  const value = cell.textContent.trim();
  
  // Jeśli komórka jest pusta, nie ma potrzeby walidacji
  if (value === '') {
    row.classList.remove('error-row');
    cell.classList.remove('error-cell');
    return;
  }
  
  // Wyciągnij część czasową, jeśli istnieje
  const timeMatch = value.match(/(\d{1,2}:\d{1,})\s*$/);
  let hasError = false;
  
  if (timeMatch) {
    const timeStr = timeMatch[1];
    if (!isValidTime(timeStr)) {
      hasError = true;
    }
  }
  
  // Zaznacz błąd, jeśli występuje
  if (hasError) {
    row.classList.add('error-row');
    cell.classList.add('error-cell');
  } else {
    // Sprawdź, czy inne komórki w tym wierszu mają błędy
    const otherCellWithError = (row.cells[2].classList.contains('error-cell') || 
                               row.cells[3].classList.contains('error-cell')) &&
                               cell !== row.cells[2] && 
                               cell !== row.cells[3];
    
    if (!otherCellWithError) {
      row.classList.remove('error-row');
    }
    cell.classList.remove('error-cell');
  }
  
  saveToStorage();
}

function validateAllRows() {
  const tbody = table.querySelector('tbody');
  for (let row of tbody.rows) {
    validateDateTimeCell(row.cells[2]);
    validateDateTimeCell(row.cells[3]);
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
    'kwiecień': '04', 'kwietnia': '04', 'kwi': '04', 'kwiecien': '04', 'kwietnia': '04',
    'maj': '05', 'maja': '05',
    'czerwiec': '06', 'czerwca': '06', 'cze': '06',
    'lipiec': '07', 'lipca': '07', 'lip': '07',
    'sierpień': '08', 'sierpnia': '08', 'sie': '08', 'sierpien': '08',
    'wrzesień': '09', 'września': '09', 'wrz': '09', 'wrzesien': '09', 'wrzesnia': '09',
    'październik': '10', 'października': '10', 'paź': '10', 'paz': '10', 'pazdziernik': '10', 'pazdziernika': '10',
    'listopad': '11', 'listopada': '11', 'lis': '11',
    'grudzień': '12', 'grudnia': '12', 'gru': '12', 'grudzien': '12',
    
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
    // Sprawdź poprawność formatu czasu
    if (!isValidTime(time)) {
      console.log("Nieprawidłowy format czasu:", time);
      // Spróbujmy wyciągnąć poprawną część czasu, jeśli możliwe
      const fixedTimeMatch = time.match(/^(\d{1,2}):(\d{2})/);
      if (fixedTimeMatch) {
        const hours = parseInt(fixedTimeMatch[1], 10);
        const minutes = parseInt(fixedTimeMatch[2], 10);
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          time = hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0');
        } else {
          time = '00:00'; // Domyślny czas, jeśli nie można naprawić
        }
      } else {
        time = '00:00'; // Domyślny czas, jeśli nie można naprawić
      }
    } else {
      // Upewnij się, że godzina jest uzupełniona zerem z przodu
      time = formatTime(time);
    }
    
    // Usuń czas z daty do przetworzenia
    dateWithoutTime = originalDateStr.substring(0, originalDateStr.lastIndexOf(time)).trim();
  }

  // Sprawdź format typu "Dzień tygodnia, dd. Miesiąc rok" (np. "Freitag, 11. April 2025" lub "Poniedziałek, 15 kwietnia 2025")
  const textDateRegex = /(?:[^\d,]*,\s*)?(\d{1,2})(?:\.|\s)\s*([A-Za-zäöüÄÖÜßąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)\s+(\d{4})/i;
  let match = dateWithoutTime.match(textDateRegex);
  
  if (match) {
    day = parseInt(match[1], 10).toString().padStart(2, '0');
    
    // Znajdź miesiąc w słowniku, uwzględniając polskie znaki
    let monthText = match[2].toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Usunięcie znaków diakrytycznych
      .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
      .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
      .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z');
    
    month = monthNames[monthText];
    
    if (!month) {
      // Spróbuj znaleźć podobny miesiąc (np. gdy polskie znaki są źle zakodowane)
      for (const [key, value] of Object.entries(monthNames)) {
        if (monthText.includes(key) || key.includes(monthText)) {
          month = value;
          break;
        }
      }
      
      if (!month) {
        console.log("Nie rozpoznano miesiąca:", monthText);
        month = '01'; // Domyślnie 01 jeśli nie rozpoznano
      }
    }
    
    // Użyj pełnego roku zamiast tylko 2 ostatnich cyfr
    year = match[3];
    
    return `${year}-${month}-${day}${time ? ' ' + time : ''}`;
  }
  
  // Format "dd-mm-yy [HH:MM]" lub "mm-dd-yy [HH:MM]" lub "yy-mm-dd [HH:MM]"
  match = dateWithoutTime.match(/(\d{1,2})-(\d{1,2})-(\d{2})/);
  if (match) {
    const first = parseInt(match[1], 10);
    
    // Sprawdź czy pierwszy segment to rok (jeśli to 25)
    if (first === 25) {
      year = "20" + match[1]; // Dodajemy "20" do roku
      month = match[2].padStart(2, '0');
      day = parseInt(match[3], 10).toString().padStart(2, '0');
    } else {
      day = parseInt(match[1], 10).toString().padStart(2, '0');
      month = match[2].padStart(2, '0');
      year = "20" + match[3]; // Dodajemy "20" do roku
    }
    
    return `${year}-${month}-${day}${time ? ' ' + time : ''}`;
  } 
  
  // Format "dd.mm.yyyy [HH:MM]"
  match = dateWithoutTime.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (match) {
    day = parseInt(match[1], 10).toString().padStart(2, '0');
    month = match[2].padStart(2, '0');
    year = match[3];
    if (year.length === 2) year = "20" + year; // Dodajemy "20" jeśli rok jest dwucyfrowy
    
    return `${year}-${month}-${day}${time ? ' ' + time : ''}`;
  }
  
  // Jeśli nic nie pasuje, zwróć oryginalny ciąg
  console.log("Nie rozpoznano formatu daty:", originalDateStr);
  return originalDateStr;
}

function applyMassTime() {
  const fromTime = document.getElementById('fromTimeInput').value.trim();
  const toTime = document.getElementById('toTimeInput').value.trim();
  
  // Walidacja wprowadzonych czasów
  if (fromTime && !isValidTime(fromTime)) {
    alert('Nieprawidłowy format czasu "Od". Proszę użyć formatu HH:MM (00:00 - 23:59).');
    return;
  }
  
  if (toTime && !isValidTime(toTime)) {
    alert('Nieprawidłowy format czasu "Do". Proszę użyć formatu HH:MM (00:00 - 23:59).');
    return;
  }
  
  // Formatowanie czasu z dopełnieniem zerami
  const formattedFromTime = fromTime ? formatTime(fromTime) : '';
  const formattedToTime = toTime ? formatTime(toTime) : '';
  
  const tbody = table.querySelector('tbody');

  for (let row of tbody.rows) {
    // Obsługa komórki FROM
    if (formattedFromTime && formattedFromTime.match(/^\d{2}:\d{2}$/)) {
      let cell = row.cells[2];
      let content = cell.textContent.trim();
      
      if (content !== '') {
        // Sprawdź czy data zawiera już godzinę
        if (content.match(/\d{1,2}:\d{1,}$/)) {
          // Jeśli zawiera godzinę, zastąp ją nową (używając regexp do wyłapania tylko poprawnej części godzinowej)
          cell.textContent = content.replace(/\d{1,2}:\d{1,}$/, formattedFromTime);
        } else {
          // Jeśli nie zawiera godziny, dodaj ją
          cell.textContent = content + ' ' + formattedFromTime;
        }
      }
    }
    
    // Obsługa komórki TO
    if (formattedToTime && formattedToTime.match(/^\d{2}:\d{2}$/)) {
      let cell = row.cells[3];
      let content = cell.textContent.trim();
      
      if (content !== '') {
        // Sprawdź czy data zawiera już godzinę
        if (content.match(/\d{1,2}:\d{1,}$/)) {
          // Jeśli zawiera godzinę, zastąp ją nową
          cell.textContent = content.replace(/\d{1,2}:\d{1,}$/, formattedToTime);
        } else {
          // Jeśli nie zawiera godziny, dodaj ją
          cell.textContent = content + ' ' + formattedToTime;
        }
      }
    }
  }
  
  validateAllRows();
  saveToStorage();
}

function applyMassDate() {
  const fromDate = document.getElementById('fromDateInput').value.trim();
  const toDate = document.getElementById('toDateInput').value.trim();
  
  // Weryfikacja poprawności formatu daty (akceptujemy format DD.MM.YYYY lub YYYY-MM-DD)
  const dateRegex = /^(\d{1,2}\.\d{1,2}\.\d{4}|\d{4}-\d{1,2}-\d{1,2})$/;
  
  if (fromDate && !dateRegex.test(fromDate)) {
    alert('Nieprawidłowy format daty "Od". Proszę użyć formatu DD.MM.YYYY lub YYYY-MM-DD');
    return;
  }
  
  if (toDate && !dateRegex.test(toDate)) {
    alert('Nieprawidłowy format daty "Do". Proszę użyć formatu DD.MM.YYYY lub YYYY-MM-DD');
    return;
  }
  
  const tbody = table.querySelector('tbody');
  
  for (let row of tbody.rows) {
    // Obsługa komórki FROM
    if (fromDate) {
      let cell = row.cells[2];
      let content = cell.textContent.trim();
      
      if (content !== '') {
        // Zachowaj tylko część godzinową, jeśli istnieje
        let timeStr = '';
        const timeMatch = content.match(/\s(\d{1,2}:\d{2})$/);
        if (timeMatch) {
          timeStr = ' ' + formatTime(timeMatch[1]); // Formatuj czas z dopełnieniem zerami
        }
        
        // Ustaw nową datę z zachowaniem godziny
        cell.textContent = fromDate + timeStr;
      }
    }
    
    // Obsługa komórki TO
    if (toDate) {
      let cell = row.cells[3];
      let content = cell.textContent.trim();
      
      if (content !== '') {
        // Zachowaj tylko część godzinową, jeśli istnieje
        let timeStr = '';
        const timeMatch = content.match(/\s(\d{1,2}:\d{2})$/);
        if (timeMatch) {
          timeStr = ' ' + formatTime(timeMatch[1]); // Formatuj czas z dopełnieniem zerami
        }
        
        // Ustaw nową datę z zachowaniem godziny
        cell.textContent = toDate + timeStr;
      }
    }
  }
  
  validateAllRows();
  saveToStorage();
}

function exportToCSV() {
  validateAllRows();
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
    // Zapisz również informacje o błędach
    rowData.push(row.classList.contains('error-row'));
    rowData.push(row.cells[2].classList.contains('error-cell'));
    rowData.push(row.cells[3].classList.contains('error-cell'));
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
      row.cells[i].innerText = rowArr[i] || '';
    }
    
    // Przywróć stany błędów, jeśli zostały zapisane
    if (rowArr.length > 6) {
      if (rowArr[6]) row.classList.add('error-row');
      if (rowArr[7]) row.cells[2].classList.add('error-cell');
      if (rowArr[8]) row.cells[3].classList.add('error-cell');
    }
  });
}

// Dodaj style CSS dla oznaczania błędów
function addErrorStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .error-row {
      background-color: #ffaa00 !important;
    }
    .error-cell {
      color: white !important;
    }
  `;
  document.head.appendChild(style);
}

// Wywołaj funkcję dodającą style po załadowaniu strony
window.addEventListener('DOMContentLoaded', addErrorStyles);

// Funkcja do importu pliku CSV
function importFromCSV() {
  const fileInput = document.getElementById('csvFileInput');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Proszę wybrać plik CSV do importu.');
    return;
  }
  
  const file = fileInput.files[0];
  const reader = new FileReader();
  
  reader.onload = function(e) {
    const content = e.target.result;
    processCSVData(content);
  };
  
  reader.onerror = function() {
    alert('Wystąpił błąd podczas wczytywania pliku.');
  };
  
  reader.readAsText(file);
}

// Funkcja przetwarzająca zawartość pliku CSV
function processCSVData(csvContent) {
  // Podziel zawartość na wiersze
  const rows = csvContent.split(/\r?\n/).filter(row => row.trim() !== '');
  
  // Usuń pierwszy wiersz (nagłówki)
  if (rows.length > 0) {
    rows.shift();
  }
  
  // Jeśli nie ma danych, zakończ
  if (rows.length === 0) {
    alert('Plik CSV nie zawiera danych lub zawiera tylko nagłówki.');
    return;
  }
  
  // Czy chcemy zastąpić istniejące dane czy dodać nowe?
  const replaceData = confirm('Czy chcesz zastąpić istniejące dane? Kliknij "OK" aby zastąpić lub "Anuluj" aby dodać nowe dane na końcu.');
  
  if (replaceData) {
    // Wyczyść istniejące dane
    deleteAllRows();
  }
  
  // Tablica do przechowywania dodanych wierszy
  const addedRows = [];
  
  // Przetwórz każdy wiersz CSV
  rows.forEach(row => {
    // Obsługa pól w cudzysłowach z przecinkami wewnątrz
    const values = parseCSVLine(row);
    
    // Sprawdź, czy mamy odpowiednią liczbę kolumn
    if (values.length >= 6) {
      const newRow = addRow();
      
      // Uzupełnij dane w wierszu
      for (let i = 0; i < 6; i++) {
        // Usuń cudzysłowy, jeśli istnieją
        let value = values[i].replace(/^"(.*)"$/, '$1');
        
        // Dla kolumn z cenami i datami, możemy dodać konwersję formatu jeśli potrzeba
        if (i === 1) { // special_price
          // Opcjonalna konwersja formatu ceny - na razie bez zmian
        } else if (i === 2 || i === 3) { // dates
          // Opcjonalna konwersja formatu daty - na razie bez zmian
        }
        
        newRow.cells[i].textContent = value;
      }
      
      addedRows.push(newRow);
    }
  });
  
  // Sprawdź wszystkie wiersze pod kątem poprawności
  validateAllRows();
  fixPromoQty();
  saveToStorage();
  
  alert(`Zaimportowano ${addedRows.length} wierszy z pliku CSV.`);
}

// Funkcja do parsowania linii CSV z uwzględnieniem cudzysłowów
function parseCSVLine(line) {
  const result = [];
  let currentValue = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (insideQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Podwójny cudzysłów wewnątrz pola w cudzysłowach - dodaj jeden cudzysłów
        currentValue += '"';
        i++; // Przejdź do następnego znaku
      } else {
        // Przełącz stan "wewnątrz cudzysłowów"
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Koniec pola (przecinek poza cudzysłowami)
      result.push(currentValue);
      currentValue = '';
    } else {
      // Zwykły znak - dodaj do bieżącej wartości
      currentValue += char;
    }
  }
  
  // Dodaj ostatnie pole
  result.push(currentValue);
  
  return result;
}
