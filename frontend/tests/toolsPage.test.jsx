import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolsPage from '../src/pages/ToolsPage.jsx';

describe('ToolsPage', () => {
  it('calculator: computes a basic expression', async () => {
    const user = userEvent.setup();
    render(<ToolsPage />);

    await user.click(screen.getByRole('button', { name: '1' }));
    await user.click(screen.getByRole('button', { name: '2' }));
    await user.click(screen.getByRole('button', { name: '+' }));
    await user.click(screen.getByRole('button', { name: '8' }));
    await user.click(screen.getByRole('button', { name: '=' }));

    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('calculator: clear resets the display', async () => {
    const user = userEvent.setup();
    render(<ToolsPage />);

    await user.click(screen.getByRole('button', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'C' }));

    expect(document.querySelector('.calculator-display')).toHaveTextContent('0');
  });

  it('unit converter: 1 km to m = 1000', async () => {
    const user = userEvent.setup();
    render(<ToolsPage />);

    await user.click(screen.getByRole('tab', { name: 'Unit Converter' }));
    await user.selectOptions(screen.getByLabelText('From unit'), 'km');
    await user.selectOptions(screen.getByLabelText('To unit'), 'm');
    const input = screen.getByLabelText('Value to convert');
    await user.clear(input);
    await user.type(input, '1');

    expect(screen.getByText(/1000/)).toBeInTheDocument();
  });

  it('grade calculator: computes a weighted average across rows', async () => {
    const user = userEvent.setup();
    render(<ToolsPage />);

    await user.click(screen.getByRole('tab', { name: 'Grade Calculator' }));
    const scoreInputs = screen.getAllByLabelText('Score percent');
    const weightInputs = screen.getAllByLabelText('Weight');

    await user.type(scoreInputs[0], '90');
    await user.type(weightInputs[0], '30');
    await user.type(scoreInputs[1], '80');
    await user.type(weightInputs[1], '70');

    // (90*30 + 80*70) / (30+70) = 83
    expect(screen.getByText(/83%/)).toBeInTheDocument();
  });
});
