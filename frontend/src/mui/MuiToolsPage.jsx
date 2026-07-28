import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Add from '@mui/icons-material/Add';
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

// The MUI design's presentation of the Tools page. All the math lives in the
// shared useTools hooks (also used by the Classic ToolsPage); this file only
// supplies Material-styled chrome around those hooks.

function Calculator() {
  const { expression, error, press } = useCalculator();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          textAlign: 'right',
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          bgcolor: 'background.default',
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 600,
            wordBreak: 'break-all',
            color: error ? 'error.main' : 'text.primary',
          }}
        >
          {expression || '0'}
        </Typography>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
        {CALCULATOR_ROWS.flat().map((k) => {
          const isEquals = k === '=';
          const isClear = k === 'C';
          const isZero = k === '0';
          const isOpOrFn = CALC_OPERATORS.has(k) || CALC_FUNCTIONS.has(k);

          let variant = 'outlined';
          let color = 'inherit';
          if (isEquals) {
            variant = 'contained';
            color = 'primary';
          } else if (isClear) {
            variant = 'contained';
            color = 'error';
          } else if (isOpOrFn) {
            variant = 'contained';
            color = 'secondary';
          }

          return (
            <Button
              key={k}
              variant={variant}
              color={color}
              onClick={() => press(k)}
              sx={{
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                ...(isZero ? { gridColumn: 'span 2' } : null),
              }}
            >
              {k}
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}

function UnitConverter() {
  const {
    category,
    value,
    setValue,
    unitsInCategory,
    fromUnit,
    setFromUnit,
    toUnit,
    setToUnit,
    changeCategory,
    result,
  } = useUnitConverter();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Tabs
        value={category}
        onChange={(e, v) => changeCategory(v)}
        variant="fullWidth"
        aria-label="Unit category"
      >
        {Object.entries(UNIT_CATEGORIES).map(([key, c]) => (
          <Tab key={key} value={key} label={c.label} />
        ))}
      </Tabs>

      <Stack direction="row" spacing={1.5} alignItems="center">
        <TextField
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          label="Value"
          size="small"
          sx={{ flex: 1 }}
        />
        <TextField
          select
          value={fromUnit}
          onChange={(e) => setFromUnit(e.target.value)}
          label="From"
          size="small"
          sx={{ minWidth: 90 }}
        >
          {unitsInCategory.map((u) => (
            <MenuItem key={u} value={u}>
              {u}
            </MenuItem>
          ))}
        </TextField>
        <Typography component="span" sx={{ fontSize: '1.25rem', color: 'text.secondary' }}>
          →
        </Typography>
        <TextField
          select
          value={toUnit}
          onChange={(e) => setToUnit(e.target.value)}
          label="To"
          size="small"
          sx={{ minWidth: 90 }}
        >
          {unitsInCategory.map((u) => (
            <MenuItem key={u} value={u}>
              {u}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Typography sx={{ fontSize: '1.05rem' }}>
        {value || '0'} {fromUnit} = <strong>{result === '' ? '—' : result}</strong> {toUnit}
      </Typography>
    </Box>
  );
}

function GradeCalculator() {
  const { rows, updateRow, addRow, removeRow, weightedAverage, totalWeight } =
    useGradeCalculator();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Stack spacing={1.5}>
        {rows.map((r) => (
          <Stack key={r.id} direction="row" spacing={1} alignItems="center">
            <TextField
              label="Assignment"
              value={r.name}
              onChange={(e) => updateRow(r.id, 'name', e.target.value)}
              size="small"
              sx={{ flex: 1 }}
            />
            <TextField
              type="number"
              label="Score %"
              value={r.score}
              onChange={(e) => updateRow(r.id, 'score', e.target.value)}
              size="small"
              sx={{ width: 100 }}
            />
            <TextField
              type="number"
              label="Weight"
              value={r.weight}
              onChange={(e) => updateRow(r.id, 'weight', e.target.value)}
              size="small"
              sx={{ width: 100 }}
            />
            <IconButton
              aria-label="Remove row"
              onClick={() => removeRow(r.id)}
              disabled={rows.length <= 1}
            >
              <DeleteOutlined />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Box>
        <Button startIcon={<Add />} onClick={addRow}>
          Add assignment
        </Button>
      </Box>

      <Typography sx={{ fontSize: '1.05rem' }}>
        Weighted average:{' '}
        <strong>
          {weightedAverage == null ? '—' : `${Math.round(weightedAverage * 100) / 100}%`}
        </strong>
        {totalWeight > 0 && (
          <Typography component="span" color="text.secondary">
            {` (total weight: ${totalWeight})`}
          </Typography>
        )}
      </Typography>
    </Box>
  );
}

export default function MuiToolsPage() {
  const [tab, setTab] = useState('calculator');

  return (
    <Box
      sx={{
        maxWidth: 760,
        mx: 'auto',
        p: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="h1">Tools</Typography>
        <Typography color="text.secondary">
          A few handy utilities — nothing here touches your study data.
        </Typography>
      </Box>

      <Card elevation={3}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Tabs
            value={tab}
            onChange={(e, v) => setTab(v)}
            variant="fullWidth"
            aria-label="Tool"
          >
            {TOOL_TABS.map((t) => (
              <Tab key={t.value} value={t.value} label={t.label} />
            ))}
          </Tabs>

          {tab === 'calculator' && <Calculator />}
          {tab === 'converter' && <UnitConverter />}
          {tab === 'grades' && <GradeCalculator />}
        </CardContent>
      </Card>
    </Box>
  );
}
