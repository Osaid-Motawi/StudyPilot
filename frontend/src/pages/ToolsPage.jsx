import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  useCalculator,
  useUnitConverter,
  useGradeCalculator,
  CALCULATOR_ROWS,
  CALC_OPERATORS,
  CALC_FUNCTIONS,
  UNIT_CATEGORIES,
  TOOL_TABS,
} from '../hooks/useTools.js';

// A grab-bag of small utilities useful to any student. Fully client-side. The
// math lives in the shared useTools hooks (also used by the MUI design); this
// file is only the Classic presentation.

function calculatorKeyClassName(k) {
  if (k === '=') return 'calculator-equals';
  if (k === 'C') return 'calculator-clear';
  if (k === '0') return 'calculator-zero';
  if (CALC_OPERATORS.has(k)) return 'calculator-op';
  if (CALC_FUNCTIONS.has(k)) return 'calculator-fn';
  return '';
}

function Calculator() {
  const { expression, error, press } = useCalculator();

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

function UnitConverter() {
  const {
    category, value, setValue,
    unitsInCategory, fromUnit, setFromUnit, toUnit, setToUnit,
    changeCategory, result,
  } = useUnitConverter();

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

function GradeCalculator() {
  const { rows, updateRow, addRow, removeRow, weightedAverage, totalWeight } =
    useGradeCalculator();

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
              <X size={15} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="btn-ghost" onClick={addRow}>
        <Plus size={15} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: '0.35rem' }} />
        Add assignment
      </button>

      <p className="grade-calculator-result">
        Weighted average:{' '}
        <strong>{weightedAverage == null ? '—' : `${Math.round(weightedAverage * 100) / 100}%`}</strong>
        {totalWeight > 0 && <span className="muted"> (total weight: {totalWeight})</span>}
      </p>
    </div>
  );
}

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
          {TOOL_TABS.map((t) => (
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
