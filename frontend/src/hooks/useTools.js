import { useMemo, useState } from 'react';

// Shared logic for the three client-side tools, used by BOTH designs. The math
// (calculator eval, unit conversion, weighted average) lives here once; each
// design only supplies its own chrome around these hooks.

// ---- Calculator -----------------------------------------------------------

export const CALCULATOR_ROWS = [
  ['C', '√', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
];

export const CALC_OPERATORS = new Set(['÷', '×', '−', '+']);
export const CALC_FUNCTIONS = new Set(['√', '%']);

export function useCalculator() {
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

  return { expression, error, press };
}

// ---- Unit converter -------------------------------------------------------

export const UNIT_CATEGORIES = {
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

function unitsFor(category) {
  return category === 'temperature'
    ? UNIT_CATEGORIES.temperature.units
    : Object.keys(UNIT_CATEGORIES[category].units);
}

export function useUnitConverter() {
  const [category, setCategory] = useState('length');
  const [value, setValue] = useState('1');
  const unitsInCategory = unitsFor(category);
  const [fromUnit, setFromUnit] = useState(unitsInCategory[0]);
  const [toUnit, setToUnit] = useState(unitsInCategory[1] || unitsInCategory[0]);

  function changeCategory(next) {
    setCategory(next);
    const units = unitsFor(next);
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

  return {
    category, value, setValue,
    unitsInCategory, fromUnit, setFromUnit, toUnit, setToUnit,
    changeCategory, result,
  };
}

// ---- Grade calculator -----------------------------------------------------

let rowIdSeq = 0;
function newRow() {
  rowIdSeq += 1;
  return { id: rowIdSeq, name: '', score: '', weight: '' };
}

export function useGradeCalculator() {
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

  return { rows, updateRow, addRow, removeRow, weightedAverage, totalWeight };
}

export const TOOL_TABS = [
  { value: 'calculator', label: 'Calculator' },
  { value: 'converter', label: 'Unit Converter' },
  { value: 'grades', label: 'Grade Calculator' },
];
