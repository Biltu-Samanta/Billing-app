document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let rows = [];
    let extraCharges = [];
    let fromDate = '';
    let toDate = '';

    // --- Selectors ---
    const tableBody = document.getElementById('bill-table-body');
    const extraChargesContainer = document.getElementById('extra-charges-container');
    const pujaGhorTotalEl = document.getElementById('puja-ghor-total');
    const chaGhorTotalEl = document.getElementById('cha-ghor-total');
    const grandTotalEl = document.getElementById('grand-total');
    const fromDateInput = document.getElementById('from-date');
    const toDateInput = document.getElementById('to-date'); // Just for state keeping
    const currentYearEl = document.getElementById('current-year');

    // --- Initialization ---
    function init() {
        // Create initial 15 rows
        const initialRows = Array.from({ length: 15 }, (_, i) => ({
            id: Math.random().toString(36).substr(2, 9),
            tarikh: '',
            pujaGhor: 0,
            chaGhor: 0,
            moot: 0,
        }));
        rows = initialRows;

        currentYearEl.textContent = new Date().getFullYear();
        renderTable();
        updateTotals();

        // Event Listeners
        document.getElementById('add-row-btn').addEventListener('click', addRow);
        document.getElementById('remove-row-btn').addEventListener('click', removeRow);
        document.getElementById('add-extra-btn').addEventListener('click', addExtraCharge);
        document.getElementById('pdf-btn').addEventListener('click', handleDownloadPDF);
        const jpgBtn = document.getElementById('jpg-btn');
        if (jpgBtn) {
            jpgBtn.addEventListener('click', handleDownloadJPG);
        }

        fromDateInput.addEventListener('change', handleFromDateChange);
        toDateInput.addEventListener('change', (e) => toDate = e.target.value);

        // Event Delegation for Table Inputs
        tableBody.addEventListener('input', handleTableInput);
        tableBody.addEventListener('keydown', handleTableKeydown);
        tableBody.addEventListener('focusin', (e) => {
            if (e.target.matches('input[type="number"]')) {
                e.target.select();
            }
        });

        // Event Delegation for Extra Charges Inputs
        extraChargesContainer.addEventListener('input', handleExtraInput);
        extraChargesContainer.addEventListener('click', handleExtraClick);
    }

    // --- Keyboard Navigation Helpers ---
    function focusCell(input) {
        if (!input) return;
        input.focus();
        if (typeof input.select === 'function' && input.type !== 'date') {
            input.select();
        }
    }

    function handleTableKeydown(e) {
        const input = e.target;
        if (!input || !input.matches('input')) return;

        const tr = input.closest('tr');
        if (!tr) return;

        const trs = Array.from(tableBody.querySelectorAll('tr'));
        const rowIndex = trs.indexOf(tr);
        if (rowIndex === -1) return;

        const rowInputs = Array.from(tr.querySelectorAll('input'));
        const colIndex = rowInputs.indexOf(input);
        if (colIndex === -1) return;

        if (e.key === 'Tab') {
            if (!e.shiftKey) {
                // Forward Tab: switch between columns
                e.preventDefault();
                if (colIndex + 1 < rowInputs.length) {
                    // Next column in same row
                    focusCell(rowInputs[colIndex + 1]);
                } else {
                    // Next row, first column
                    if (rowIndex + 1 < trs.length) {
                        const nextRowInputs = trs[rowIndex + 1].querySelectorAll('input');
                        focusCell(nextRowInputs[0]);
                    } else {
                        const newTr = addRow();
                        const newRowInputs = newTr.querySelectorAll('input');
                        focusCell(newRowInputs[0]);
                    }
                }
            } else {
                // Shift + Tab: switch to previous column
                if (colIndex > 0) {
                    e.preventDefault();
                    focusCell(rowInputs[colIndex - 1]);
                } else if (rowIndex > 0) {
                    e.preventDefault();
                    const prevRowInputs = trs[rowIndex - 1].querySelectorAll('input');
                    focusCell(prevRowInputs[prevRowInputs.length - 1]);
                }
                // If on first row, first column, allow default behavior to exit table
            }
        } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
            // Down Arrow or Enter: switch between rows (same column)
            e.preventDefault();
            if (rowIndex + 1 < trs.length) {
                const nextRowInputs = trs[rowIndex + 1].querySelectorAll('input');
                const target = nextRowInputs[colIndex] || nextRowInputs[nextRowInputs.length - 1];
                focusCell(target);
            } else {
                const newTr = addRow();
                const newRowInputs = newTr.querySelectorAll('input');
                const target = newRowInputs[colIndex] || newRowInputs[newRowInputs.length - 1];
                focusCell(target);
            }
        } else if (e.key === 'ArrowUp') {
            // Up Arrow: switch to row above (same column)
            e.preventDefault();
            if (rowIndex > 0) {
                const prevRowInputs = trs[rowIndex - 1].querySelectorAll('input');
                const target = prevRowInputs[colIndex] || prevRowInputs[0];
                focusCell(target);
            }
        }
    }

    // --- Logic Functions ---

    function handleFromDateChange(e) {
        fromDate = e.target.value;
        if (!fromDate) return;

        const start = new Date(fromDate);
        rows = rows.map((row, index) => {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + index);
            const dateString = currentDate.toISOString().split('T')[0];
            return { ...row, tarikh: dateString };
        });

        // Update DOM inputs directly to avoid losing focus if used elsewhere, 
        // though here it's triggered by a separate date input so full re-render is fine too.
        // But let's just update values to be efficient.
        const dateInputs = tableBody.querySelectorAll('.row-date');
        rows.forEach((row, index) => {
            if (dateInputs[index]) {
                dateInputs[index].value = row.tarikh;
            }
        });
    }

    function addRow() {
        const lastRow = rows[rows.length - 1];
        let nextTarikh = '';
        if (lastRow && lastRow.tarikh) {
            const lastDate = new Date(lastRow.tarikh);
            lastDate.setDate(lastDate.getDate() + 1);
            nextTarikh = lastDate.toISOString().split('T')[0];
        }

        const newRow = {
            id: Math.random().toString(36).substr(2, 9),
            tarikh: nextTarikh,
            pujaGhor: 0,
            chaGhor: 0,
            moot: 0,
        };
        rows.push(newRow);

        // Append single row to DOM
        const tr = createRowElement(newRow, rows.length - 1);
        tableBody.appendChild(tr);
        return tr;
    }

    function removeRow() {
        if (rows.length > 1) {
            rows.pop();
            tableBody.lastElementChild.remove();
            updateTotals();
        }
    }

    function handleTableInput(e) {
        const input = e.target;
        const tr = input.closest('tr');
        if (!tr) return;

        const index = Array.from(tableBody.children).indexOf(tr);
        if (index === -1) return;

        const row = rows[index];
        const field = input.dataset.field; // 'tarikh', 'pujaGhor', 'chaGhor'

        if (field === 'tarikh') {
            row.tarikh = input.value;
        } else if (field === 'pujaGhor' || field === 'chaGhor') {
            const val = parseFloat(input.value) || 0;
            row[field] = val;

            // Recalculate row moot
            row.moot = Number(row.pujaGhor) + Number(row.chaGhor);

            // Update row moot in DOM
            const mootCell = tr.querySelector('.row-moot');
            if (mootCell) {
                mootCell.textContent = row.moot.toFixed(2);
            }
            updateTotals();
        }
    }

    function addExtraCharge() {
        const newExtra = {
            id: Math.random().toString(36).substr(2, 9),
            label: 'অতিরিক্ত খরচ',
            amount: 0
        };
        extraCharges.push(newExtra);
        renderExtras(); // Re-render extras list is cheap enough
        updateTotals();
    }

    function handleExtraInput(e) {
        const input = e.target;
        const div = input.closest('.extra-item');
        if (!div) return;

        const id = div.dataset.id;
        const extra = extraCharges.find(ec => ec.id === id);
        if (!extra) return;

        if (input.dataset.field === 'label') {
            extra.label = input.value;
        } else if (input.dataset.field === 'amount') {
            extra.amount = parseFloat(input.value) || 0;
            updateTotals();
        }
    }

    function handleExtraClick(e) {
        // Handle delete button
        const btn = e.target.closest('.delete-extra-btn');
        if (!btn) return;

        const div = btn.closest('.extra-item');
        const id = div.dataset.id;

        extraCharges = extraCharges.filter(ec => ec.id !== id);
        renderExtras();
        updateTotals();
    }

    // --- Rendering ---

    function createRowElement(row, index) {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-indigo-50/60 transition-colors print:hover:bg-transparent";
        tr.innerHTML = `
            <td class="border border-gray-300 p-0 print:border-black">
                <input type="date" value="${row.tarikh}" data-field="tarikh" class="row-date w-full h-full p-1 bg-transparent focus:outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:ring-inset text-sm transition-all">
            </td>
            <td class="border border-gray-300 p-0 print:border-black">
                <input type="number" value="${row.pujaGhor || ''}" data-field="pujaGhor" class="w-full h-full p-1 text-center bg-transparent focus:outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:ring-inset [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono text-sm transition-all" placeholder="0">
            </td>
            <td class="border border-gray-300 p-0 print:border-black">
                <input type="number" value="${row.chaGhor || ''}" data-field="chaGhor" class="w-full h-full p-1 text-center bg-transparent focus:outline-none focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-500 focus:ring-inset [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-mono text-sm transition-all" placeholder="0">
            </td>
            <td class="border border-gray-300 p-1 text-center bg-indigo-50 font-bold font-mono print:bg-white print:border-black row-moot text-sm">
                ${row.moot.toFixed(2)}
            </td>
        `;
        return tr;
    }

    function renderTable() {
        tableBody.innerHTML = '';
        rows.forEach((row, index) => {
            tableBody.appendChild(createRowElement(row, index));
        });
    }

    function renderExtras() {
        extraChargesContainer.innerHTML = '';
        extraCharges.forEach(ec => {
            const div = document.createElement('div');
            div.className = "flex items-center gap-2 bg-gray-50 p-2 rounded border border-dashed border-gray-300 print:border-none print:bg-white print:p-0 extra-item";
            div.dataset.id = ec.id;

            div.innerHTML = `
                <input type="text" value="${ec.label}" data-field="label" class="flex-grow bg-transparent focus:outline-none font-bold text-sm text-gray-700 print:text-black">
                <input type="number" value="${ec.amount || ''}" data-field="amount" class="w-24 text-right bg-transparent focus:outline-none font-mono font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="0.00">
                <button class="no-print text-red-500 hover:text-red-700 p-1 delete-extra-btn" title="মুছুন">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            `;
            extraChargesContainer.appendChild(div);
        });
    }

    function updateTotals() {
        const tableTotals = rows.reduce((acc, curr) => ({
            pujaGhorTotal: acc.pujaGhorTotal + Number(curr.pujaGhor || 0),
            chaGhorTotal: acc.chaGhorTotal + Number(curr.chaGhor || 0),
            mootTotal: acc.mootTotal + Number(curr.moot || 0),
        }), { pujaGhorTotal: 0, chaGhorTotal: 0, mootTotal: 0 });

        const extrasTotal = extraCharges.reduce((sum, ec) => sum + Number(ec.amount || 0), 0);
        const grandTotal = tableTotals.mootTotal + extrasTotal;

        pujaGhorTotalEl.textContent = tableTotals.pujaGhorTotal.toFixed(2);
        chaGhorTotalEl.textContent = tableTotals.chaGhorTotal.toFixed(2);
        grandTotalEl.textContent = grandTotal.toFixed(2);
    }

    // --- PDF Generation ---
    function handleDownloadPDF() {
        // 1. Temporarily hide no-print elements
        document.body.classList.add('pdf-rendering');
        const element = document.querySelector('.max-w-\\[210mm\\]'); // Select the main A4 container

        // Options for html2pdf
        const opt = {
            margin: 0,
            filename: 'Bill-' + new Date().toISOString().split('T')[0] + '.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // If content is too long for one page, we can try to force it by using a custom format matching height
        // But the user requested "single page". 
        // Let's use a smart setting: if scrollHeight > page height, we extend the page.
        // Standard A4 height is ~297mm. If element is taller, we switch to custom dimension.
        // However, usually html2pdf handles auto-paging. To FORCE single page:
        // We can capture the element dimensions.

        const height = element.offsetHeight;
        const width = element.offsetWidth;

        // Convert px to mm (approx 3.78 px per mm)
        const heightMM = height / 3.78;
        const widthMM = width / 3.78;

        if (heightMM > 295) {
            opt.jsPDF.format = [widthMM, heightMM];
            opt.jsPDF.unit = 'mm';
        }

        // Generate
        html2pdf()
            .set(opt)
            .from(element)
            .save()
            .then(() => {
                document.body.classList.remove('pdf-rendering');
            });
    }

    // --- JPG Generation ---
    function handleDownloadJPG() {
        const btn = document.getElementById('jpg-btn');
        const originalHtml = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `
                <svg class="animate-spin w-4 h-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                প্রসেসিং...
            `;
        }

        document.body.classList.add('pdf-rendering');
        const element = document.querySelector('.max-w-\\[210mm\\]');

        const opt = {
            margin: 0,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true }
        };

        html2pdf()
            .set(opt)
            .from(element)
            .outputImg('datauristring')
            .then(result => {
                const dataUrl = (typeof result === 'string') ? result : (result && result.src ? result.src : null);
                if (!dataUrl) {
                    throw new Error('Image data could not be generated.');
                }
                const link = document.createElement('a');
                const dateStr = new Date().toISOString().split('T')[0];
                link.download = 'Bill-' + dateStr + '.jpg';
                link.href = dataUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch(err => {
                console.error('JPG Generation Error:', err);
                alert('JPG তৈরি করতে সমস্যা হয়েছে!');
            })
            .finally(() => {
                document.body.classList.remove('pdf-rendering');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            });
    }

    // --- Start ---
    init();
});
