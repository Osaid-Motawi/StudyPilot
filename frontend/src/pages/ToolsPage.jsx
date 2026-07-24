import { useMemo, useState } from 'react';

// A grab-bag of small utilities useful to any student. Fully client-side —
// no backend/agent involvement, no relation to quizzes or study material.

// ---- Calculator -------------------------------------------------------

const CALCULATOR_ROWS = [
  ['C', '√', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
];

const OPERATORS = new Set(['÷', '×', '−', '+']);
const FUNCTIONS = new Set(['√', '%']);

function calculatorKeyClassName(k) {
  if (k === '=') return 'calculator-equals';
  if (k === 'C') return 'calculator-clear';
  if (k === '0') return 'calculator-zero';
  if (OPERATORS.has(k)) return 'calculator-op';
  if (FUNCTIONS.has(k)) return 'calculator-fn';
  return '';
}

function Calculator() {
  const [expression, setExpression] = useState('');
  const [error, setError] = useState(false);

  function press(key) {
    setError(false);
    if (key === 'C') {
      setExpression('');
      return;
    }
    if (key === '=') {
      try {
        const sanitized = expression
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/−/g, '-')
          .replace(/√(\d+(\.\d+)?)/g, 'Math.sqrt($1)')
          .replace(/(\d+(\.\d+)?)%/g, '($1/100)');
        if (!/^[\d+\-*/.()\s]*$/.test(sanitized.replace(/Math\.sqrt/g, ''))) {
          throw new Error('invalid');
        }
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${sanitized || '0'});`)();
        if (!Number.isFinite(result)) throw new Error('invalid');
        setExpression(String(Math.round(result * 1e10) / 1e10));
      } catch {
        setError(true);
        setExpression('');
      }
      return;
    }
    if (key === '√') {
      setExpression((e) => `${e}√`);
      return;
    }
    setExpression((e) => e + key);
  }

  return (
    <div className="calculator">
      <div className={`calculator-display${error ? ' calculator-error' : ''}`}>
        {expression || '0'}
      </div>
      <div className="calculator-grid">
        {CALCULATOR_ROWS.flat().map((k) => (
          <button
            key={k}
            type="button"
            className={calculatorKeyClassName(k)}
            onClick={() => press(k)}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Unit converter -----------------------------------------------------

const UNIT_CATEGORIES = {
  length: {
    label: 'Length',
    units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
  },
  weight: {
    label: 'Weight',
    units: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.45359237, oz: 0.028349523125 },
  },
  temperature: {
    label: 'Temperature',
    units: ['C', 'F', 'K'],
  },
};

function convertTemperature(value, from, to) {
  if (from === to) return value;
  let celsius = value;
  if (from === 'F') celsius = (value - 32) * (5 / 9);
  if (from === 'K') celsius = value - 273.15;
  if (to === 'C') return celsius;
  if (to === 'F') return celsius * (9 / 5) + 32;
  return celsius + 273.15;
}

function UnitConverter() {
  const [category, setCategory] = useState('length');
  const [value, setValue] = useState('1');
  const unitsInCategory =
    category === 'temperature'
      ? UNIT_CATEGORIES.temperature.units
      : Object.keys(UNIT_CATEGORIES[category].units);
  const [fromUnit, setFromUnit] = useState(unitsInCategory[0]);
  const [toUnit, setToUnit] = useState(unitsInCategory[1] || unitsInCategory[0]);

  function changeCategory(next) {
    setCategory(next);
    const units =
      next === 'temperature' ? UNIT_CATEGORIES.temperature.units : Object.keys(UNIT_CATEGORIES[next].units);
    setFromUnit(units[0]);
    setToUnit(units[1] || units[0]);
  }

  const result = useMemo(() => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    if (category === 'temperature') {
      return Math.round(convertTemperature(n, fromUnit, toUnit) * 1000) / 1000;
    }
    const units = UNIT_CATEGORIES[category].units;
    const inBase = n * units[fromUnit];
    return Math.round((inBase / units[toUnit]) * 1e8) / 1e8;
  }, [value, fromUnit, toUnit, category]);

  return (
    <div className="unit-converter">
      <div className="mode-toggle" role="tablist" aria-label="Unit category">
        {Object.entries(UNIT_CATEGORIES).map(([key, c]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={category === key}
            className={category === key ? 'active' : ''}
            onClick={() => changeCategory(key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="unit-converter-row">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Value to convert"
        />
        <select value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} aria-label="From unit">
          {unitsInCategory.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <span className="unit-converter-arrow">→</span>
        <select value={toUnit} onChange={(e) => setToUnit(e.target.value)} aria-label="To unit">
          {unitsInCategory.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>

      <p className="unit-converter-result">
        {value || '0'} {fromUnit} = <strong>{result === '' ? '—' : result}</strong> {toUnit}
      </p>
    </div>
  );
}

// ---- Grade calculator -----------------------------------------------------

let rowIdSeq = 0;
function newRow() {
  rowIdSeq += 1;
  return { id: rowIdSeq, name: '', score: '', weight: '' };
}

function GradeCalculator() {
  const [rows, setRows] = useState(() => [newRow(), newRow()]);

  function updateRow(id, field, value) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, newRow()]);
  }

  function removeRow(id) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }

  const { weightedAverage, totalWeight } = useMemo(() => {
    let weightedSum = 0;
    let weightSum = 0;
    rows.forEach((r) => {
      const score = Number(r.score);
      const weight = Number(r.weight);
      if (Number.isFinite(score) && Number.isFinite(weight) && weight > 0) {
        weightedSum += score * weight;
        weightSum += weight;
      }
    });
    return {
      weightedAverage: weightSum ? weightedSum / weightSum : null,
      totalWeight: weightSum,
    };
  }, [rows]);

  return (
    <div className="grade-calculator">
      <ul className="grade-rows">
        {rows.map((r) => (
          <li key={r.id} className="grade-row-item">
            <input
              type="text"
              placeholder="Assignment"
              value={r.name}
              onChange={(e) => updateRow(r.id, 'name', e.target.value)}
              aria-label="Assignment name"
            />
            <input
              type="number"
              placeholder="Score %"
              value={r.score}
              onChange={(e) => updateRow(r.id, 'score', e.target.value)}
              aria-label="Score percent"
            />
            <input
              type="number"
              placeholder="Weight"
              value={r.weight}
              onChange={(e) => updateRow(r.id, 'weight', e.target.value)}
              aria-label="Weight"
            />
            <button
              type="button"
              className="btn-ghost grade-row-remove"
              onClick={() => removeRow(r.id)}
              aria-label="Remove row"
              disabled={rows.length <= 1}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="btn-ghost" onClick={addRow}>
        + Add assignment
      </button>

      <p className="grade-calculator-result">
        Weighted average:{' '}
        <strong>{weightedAverage == null ? '—' : `${Math.round(weightedAverage * 100) / 100}%`}</strong>
        {totalWeight > 0 && <span className="muted"> (total weight: {totalWeight})</span>}
      </p>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------

const TABS = [
  { value: 'calculator', label: 'Calculator' },
  { value: 'converter', label: 'Unit Converter' },
  { value: 'grades', label: 'Grade Calculator' },
];

export default function ToolsPage() {
  const [tab, setTab] = useState('calculator');

  return (
    <div className="tools-page">
      <header className="page-header">
        <h1>Tools</h1>
        <p className="subtitle">A few handy utilities — nothing here touches your study data.</p>
      </header>

      <div className="card">
        <div className="mode-toggle" role="tablist" aria-label="Tool">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              className={tab === t.value ? 'active' : ''}
              onClick={() => setTab(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'calculator' && <Calculator />}
        {tab === 'converter' && <UnitConverter />}
        {tab === 'grades' && <GradeCalculator />}
      </div>
    </div>
  );
}
