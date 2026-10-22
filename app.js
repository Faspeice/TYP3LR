const DECIMAL_PLACES_ARGS = 8;
const DECIMAL_PLACES_RESULT = 10;
const DECIMAL_PLACES_ERROR = 2;
const TYPICAL_ERROR_PERCENT = 0.00000000159;
const specs = [
    { name: "fC", min_val: 1e6, max_val: 10e9, step: 1e6, allow_zero: false },
    { name: "dt", min_val: 10e-12, max_val: 10e-9, step: 10e-12, allow_zero: false },
    { name: "UmC", min_val: 1e-3, max_val: 1.6, step: 10e-3, allow_zero: true },
    { name: "η", min_val: -1, max_val: 1, step: 2, allow_zero: false }
];
function showMessage(text, isError = false) {
    const msgDiv = document.getElementById('message');
    if (msgDiv) {
        msgDiv.textContent = text;
        msgDiv.className = isError ? 'error' : 'success';
    }
}
function fmtExp(val, digits) {
    if (val === undefined || val === null || Number.isNaN(val)) {
        return "—";
    }
    return val.toExponential(digits);
}
function cot(x) {
    const sinX = Math.sin(x);
    if (Math.abs(sinX) < 1e-15) {
        throw new Error("Значение аргумента котангенса кратно π");
    }
    return Math.cos(x) / sinX;
}
function calculateFunction(fC, dt, UmC, t, eta) {
    if (fC === 0 || dt === 0 || t === 0) {
        throw new Error("Аргументы fC, dt, t не могут быть равны 0");
    }
    const omega = 2 * Math.PI * fC;
    const cotArg = omega * t;
    if (Math.abs(Math.sin(cotArg)) < 1e-12) {
        throw new Error("cot не определён");
    }
    const halfArg = (omega * dt) / 2;
    const part1 = 2 * Math.pow(Math.sin(halfArg), 2);
    const part2 = UmC * (Math.cos(cotArg) / Math.sin(cotArg)) * Math.sin(omega * dt);
    return part1 + eta * part2;
}
function isSafeT(tVal, fC, tolerance = 1e-9) {
    const arg = 2 * Math.PI * fC * tVal;
    const k = Math.round(arg / Math.PI);
    return Math.abs(arg - k * Math.PI) > tolerance;
}
function validateArgument(value, spec) {
    if (value < spec.min_val || value > spec.max_val) {
        return { valid: false, message: `вне диапазона [${fmtExp(spec.min_val, 2)}; ${fmtExp(spec.max_val, 2)}]`, correctedValue: value };
    }
    if (!spec.allow_zero && Math.abs(value) < 1e-12) {
        return { valid: false, message: `не может быть равен 0`, correctedValue: value };
    }
    let correctedValue = value;
    if (spec.step > 0) {
        const rawIdx = (value - spec.min_val) / spec.step;
        const idx = Math.round(rawIdx);
        const maxIdx = Math.round((spec.max_val - spec.min_val) / spec.step);
        const clampedIdx = Math.max(0, Math.min(idx, maxIdx));
        correctedValue = spec.min_val + clampedIdx * spec.step;
    }
    return { valid: true, message: "ОК", correctedValue };
}
function getSpecForField(id) {
    if (id === 'inp-t') {
        const fC = parseFloat(document.getElementById('inp-fC').value);
        if (isNaN(fC) || fC <= 0)
            return null;
        const maxT = 1.0 / fC;
        return { name: "t", min_val: 0.0, max_val: maxT, step: maxT / 36.0, allow_zero: false };
    }
    else if (id === 'inp-eta')
        return specs[3];
    else if (id === 'inp-fC')
        return specs[0];
    else if (id === 'inp-dt')
        return specs[1];
    else if (id === 'inp-UmC')
        return specs[2];
    return null;
}
function validateAllFields() {
    const fields = ['inp-eta', 'inp-fC', 'inp-dt', 'inp-UmC', 'inp-t'];
    for (const id of fields) {
        const el = document.getElementById(id);
        const val = parseFloat(el.value);
        if (isNaN(val))
            return false;
        const spec = getSpecForField(id);
        if (!spec)
            return false;
        const res = validateArgument(val, spec);
        if (!res.valid)
            return false;
    }
    return true;
}
function updateSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
        submitBtn.disabled = !validateAllFields();
    }
}
function setupLiveValidation() {
    const inputs = ['inp-eta', 'inp-fC', 'inp-dt', 'inp-UmC', 'inp-t'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('change', () => {
            const val = parseFloat(el.value);
            if (isNaN(val)) {
                updateSubmitButton();
                return;
            }
            const spec = getSpecForField(id);
            if (!spec) {
                updateSubmitButton();
                return;
            }
            const res = validateArgument(val, spec);
            if (!res.valid) {
                showMessage(`Ошибка в поле ${spec.name}: ${res.message}`, true);
                el.setCustomValidity("Неверное значение");
            }
            else {
                showMessage('', false);
                el.setCustomValidity("");
                if (res.correctedValue !== val) {
                    el.value = res.correctedValue.toString();
                }
            }
            updateSubmitButton();
        });
        el.addEventListener('input', () => {
            updateSubmitButton();
        });
    });
}
function renderLimitsTable() {
    const tbody = document.getElementById('limits-body');
    if (!tbody)
        return;
    tbody.innerHTML = '';
    for (const a of specs) {
        const zero = !a.allow_zero ? " (≠0)" : "";
        const stepStr = a.step > 0 ? fmtExp(a.step, 2) : "непрерывный";
        const rangeStr = `[${fmtExp(a.min_val, 2)}; ${fmtExp(a.max_val, 2)}]${zero}`;
        const row = document.createElement('tr');
        row.innerHTML = `<td>${a.name}</td><td>${rangeStr}</td><td>${stepStr}</td>`;
        tbody.appendChild(row);
    }
}
function updateTLimits() {
    const fCInput = document.getElementById('inp-fC');
    const tInput = document.getElementById('inp-t');
    const tInfo = document.getElementById('t-limits-info');
    const fC = parseFloat(fCInput.value);
    if (!isNaN(fC) && fC > 0) {
        const maxT = 1.0 / fC;
        const stepT = maxT / 36.0;
        tInput.max = maxT.toString();
        tInput.step = stepT.toString();
        if (tInfo)
            tInfo.textContent = `[0; ${fmtExp(maxT, 2)}], дискрет: ${fmtExp(stepT, 2)}`;
    }
    updateSubmitButton();
}
function renderResultsTable(mode, data) {
    const tbody = document.getElementById('results-body');
    const theadRow = document.getElementById('results-header');
    if (!tbody || !theadRow)
        return;
    tbody.innerHTML = '';
    if (mode === 'manual') {
        theadRow.innerHTML = '<th>Аргумент</th><th>Введённое значение</th><th>Результат</th><th>Погрешность (%)</th>';
        const summary = data.find((d) => d.isSummary);
        const resultStr = summary ? summary.result : '-';
        const errorStr = summary ? summary.error : '-';
        const argCount = data.filter((d) => !d.isSummary).length;
        let isFirstRow = true;
        for (const r of data) {
            if (r.isSummary)
                continue;
            const row = document.createElement('tr');
            if (isFirstRow) {
                row.innerHTML = `
                    <td>${r.argName}</td>
                    <td>${fmtExp(r.value, DECIMAL_PLACES_ARGS)}</td>
                    <td rowspan="${argCount}" style="vertical-align: middle; text-align: center; font-weight: bold;">${resultStr}</td>
                    <td rowspan="${argCount}" style="vertical-align: middle; text-align: center; font-weight: bold;">${errorStr}</td>
                `;
                isFirstRow = false;
            }
            else {
                row.innerHTML = `
                    <td>${r.argName}</td>
                    <td>${fmtExp(r.value, DECIMAL_PLACES_ARGS)}</td>
                `;
            }
            tbody.appendChild(row);
        }
    }
    else if (mode === 'kp') {
        theadRow.innerHTML = '<th>fC</th><th>dt</th><th>UmC</th><th>t</th><th>η</th><th>Описание</th><th>Результат</th>';
        for (const r of data) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fmtExp(r.fC, DECIMAL_PLACES_ARGS)}</td>
                <td>${fmtExp(r.dt, DECIMAL_PLACES_ARGS)}</td>
                <td>${fmtExp(r.UmC, DECIMAL_PLACES_ARGS)}</td>
                <td>${fmtExp(r.t, DECIMAL_PLACES_ARGS)}</td>
                <td>${r.eta}</td>
                <td><i>${r.desc}</i></td>
                <td>${r.result}</td>
            `;
            tbody.appendChild(row);
        }
    }
    else if (mode === 'tp') {
        theadRow.innerHTML = '<th>fC</th><th>dt</th><th>UmC</th><th>t</th><th>η</th><th>Результат</th>';
        for (const r of data) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fmtExp(r.fC, DECIMAL_PLACES_ARGS)}</td>
                <td>${fmtExp(r.dt, DECIMAL_PLACES_ARGS)}</td>
                <td>${fmtExp(r.UmC, DECIMAL_PLACES_ARGS)}</td>
                <td>${fmtExp(r.t, DECIMAL_PLACES_ARGS)}</td>
                <td>${r.eta}</td>
                <td>${r.result}</td>
            `;
            tbody.appendChild(row);
        }
    }
}
function parseCSV(text, isKP) {
    const lines = text.trim().split('\n');
    if (lines.length < 2)
        return [];
    const cases = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line)
            continue;
        const cols = line.split(';');
        if (cols.length < (isKP ? 6 : 5))
            continue;
        try {
            const c0 = cols[0];
            const c1 = cols[1];
            const c2 = cols[2];
            const c3 = cols[3];
            const c4 = cols[4];
            cases.push({
                fC: parseFloat(c0),
                dt: parseFloat(c1),
                UmC: parseFloat(c2),
                t: parseFloat(c3),
                eta: parseInt(c4),
                desc: isKP ? (cols[5] || 'Без описания') : 'Тестовый пример'
            });
        }
        catch (_e) {
            console.log(`(!) Пропущена строка ${i}: неверный формат`);
        }
    }
    return cases;
}
function validateTestCase(c) {
    const checks = [
        { val: c.fC, spec: specs[0], name: 'fC' },
        { val: c.dt, spec: specs[1], name: 'dt' },
        { val: c.UmC, spec: specs[2], name: 'UmC' },
        { val: c.eta, spec: specs[3], name: 'η' }
    ];
    for (const check of checks) {
        const res = validateArgument(check.val, check.spec);
        if (!res.valid)
            return `${check.name}: ${res.message}`;
    }
    const maxT = 1.0 / c.fC;
    const tSpec = { name: "t", min_val: 0.0, max_val: maxT, step: maxT / 36.0, allow_zero: false };
    const tRes = validateArgument(c.t, tSpec);
    if (!tRes.valid)
        return `t: ${tRes.message}`;
    if (!isSafeT(tRes.correctedValue, c.fC))
        return `t: неопределённость cot`;
    return null;
}
function downloadCSV(filename, content) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    link.style.position = 'absolute';
    link.style.left = '-9999px';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}
function processLoadedData(text, isKP) {
    const cases = parseCSV(text, isKP);
    if (cases.length === 0) {
        showMessage("Файл пуст или не содержит корректных данных.", true);
        return;
    }
    const displayResults = [];
    let csvContent = isKP
        ? "Номер;fC;dt;UmC;t;eta;Описание;Результат\n"
        : "Номер;fC;dt;UmC;t;eta;Результат\n";
    for (const c of cases) {
        const validationError = validateTestCase(c);
        let resStr = "";
        if (validationError) {
            resStr = `Ошибка: ${validationError}`;
        }
        else {
            try {
                const res = calculateFunction(c.fC, c.dt, c.UmC, c.t, c.eta);
                resStr = fmtExp(res, DECIMAL_PLACES_RESULT);
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                resStr = `Ошибка: ${msg.substring(0, 12)}`;
            }
        }
        displayResults.push({ ...c, result: resStr });
        if (isKP) {
            csvContent += `${c.fC};${c.dt};${c.UmC};${c.t};${c.eta};"${c.desc}";${resStr}\n`;
        }
        else {
            csvContent += `${c.fC};${c.dt};${c.UmC};${c.t};${c.eta};${resStr}\n`;
        }
    }
    renderResultsTable(isKP ? 'kp' : 'tp', displayResults);
    downloadCSV(isKP ? 'results_kp.csv' : 'results_tp.csv', csvContent);
    showMessage(`Загружено ${cases.length} ${isKP ? 'контрольных' : 'тестовых'} примеров. Файл результатов сохранен.`, false);
}
document.addEventListener('DOMContentLoaded', () => {
    renderLimitsTable();
    updateTLimits();
    setupLiveValidation();
    updateSubmitButton();
    const fCInput = document.getElementById('inp-fC');
    fCInput.addEventListener('input', updateTLimits);
    const form = document.getElementById('input-form');
    const clearBtn = document.getElementById('clear-btn');
    const kpFileInput = document.getElementById('kp-file-input');
    const tpFileInput = document.getElementById('tp-file-input');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        showMessage('');
        const getVal = (id) => {
            const el = document.getElementById(id);
            const val = parseFloat(el.value);
            return isNaN(val) ? 0 : val;
        };
        const eta = getVal('inp-eta');
        const fC = getVal('inp-fC');
        const t = getVal('inp-t');
        const dt = getVal('inp-dt');
        const UmC = getVal('inp-UmC');
        const specsMap = {
            'inp-eta': specs[3],
            'inp-fC': specs[0],
            'inp-dt': specs[1],
            'inp-UmC': specs[2]
        };
        let hasError = false;
        for (const id of ['inp-eta', 'inp-fC', 'inp-dt', 'inp-UmC']) {
            const val = getVal(id);
            const spec = specsMap[id];
            const res = validateArgument(val, spec);
            if (!res.valid) {
                showMessage(`Ошибка в ${spec.name}: ${res.message}`, true);
                hasError = true;
                break;
            }
        }
        if (hasError)
            return;
        const maxT = 1.0 / fC;
        const tSpec = { name: "t", min_val: 0.0, max_val: maxT, step: maxT / 36.0, allow_zero: false };
        const tRes = validateArgument(t, tSpec);
        if (!tRes.valid) {
            showMessage(`Ошибка в t: ${tRes.message}`, true);
            return;
        }
        let finalT = tRes.correctedValue;
        if (!isSafeT(finalT, fC)) {
            const maxIdx = Math.round((tSpec.max_val - tSpec.min_val) / tSpec.step);
            const currentIdx = Math.round((finalT - tSpec.min_val) / tSpec.step);
            let bestT = finalT;
            let minDist = Infinity;
            for (let offset = -2; offset <= 2; offset++) {
                const testIdx = currentIdx + offset;
                if (testIdx >= 0 && testIdx <= maxIdx) {
                    const testT = tSpec.min_val + testIdx * tSpec.step;
                    if (isSafeT(testT, fC)) {
                        const dist = Math.abs(testT - t);
                        if (dist < minDist) {
                            minDist = dist;
                            bestT = testT;
                        }
                    }
                }
            }
            finalT = bestT;
            showMessage(`Значение t скорректировано до ${fmtExp(finalT, DECIMAL_PLACES_ARGS)} во избежание неопределенности`, false);
        }
        try {
            const result = calculateFunction(fC, dt, UmC, finalT, eta);
            const tableData = [
                { argName: "fC", value: fC },
                { argName: "dt", value: dt },
                { argName: "UmC", value: UmC },
                { argName: "t", value: finalT },
                { argName: "η", value: eta },
                {
                    isSummary: true,
                    result: fmtExp(result, DECIMAL_PLACES_RESULT),
                    error: fmtExp(TYPICAL_ERROR_PERCENT, DECIMAL_PLACES_ERROR)
                }
            ];
            renderResultsTable('manual', tableData);
            showMessage(`Результат успешно вычислен: ${fmtExp(result, DECIMAL_PLACES_RESULT)}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            showMessage(`Ошибка вычисления: ${msg}`, true);
        }
    });
    // Кнопка загрузки КП
    document.getElementById('load-kp-btn')?.addEventListener('click', () => {
        kpFileInput.click();
    });
    kpFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            processLoadedData(text, true);
        };
        reader.readAsText(file, 'utf-8');
        kpFileInput.value = '';
    });
    // Кнопка загрузки ТП
    document.getElementById('load-tp-btn')?.addEventListener('click', () => {
        tpFileInput.click();
    });
    tpFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result;
            processLoadedData(text, false);
        };
        reader.readAsText(file, 'utf-8');
        tpFileInput.value = '';
    });
    clearBtn?.addEventListener('click', () => {
        form.reset();
        updateTLimits();
        const tbody = document.getElementById('results-body');
        if (tbody)
            tbody.innerHTML = '';
        const theadRow = document.getElementById('results-header');
        if (theadRow)
            theadRow.innerHTML = '';
        showMessage('');
        updateSubmitButton();
    });
});
export {};
//# sourceMappingURL=app.js.map