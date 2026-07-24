import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FocusTimerPage from '../src/pages/FocusTimerPage.jsx';

// The interval callback fires outside any React event handler, so its state
// update must be wrapped in act() explicitly when driven by fake timers.
async function tick(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('FocusTimerPage', () => {
  beforeEach(() => {
    localStorage.clear();
    // Only fake the timer our component actually uses — faking everything
    // (rAF, microtasks) makes userEvent's internal async plumbing hang.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at 25:00 in focus mode', () => {
    render(<FocusTimerPage />);
    expect(screen.getByText('25:00')).toBeInTheDocument();
  });

  it('counts down once started', async () => {
    const user = userEvent.setup({ delay: null });
    render(<FocusTimerPage />);

    await user.click(screen.getByRole('button', { name: /start/i }));
    await tick(3000);

    expect(screen.getByText('24:57')).toBeInTheDocument();
  });

  it('switching to Short break shows its own duration', async () => {
    const user = userEvent.setup({ delay: null });
    render(<FocusTimerPage />);

    await user.click(screen.getByRole('tab', { name: /short break/i }));

    expect(screen.getByText('05:00')).toBeInTheDocument();
  });

  it('reset restores the full duration for the current mode', async () => {
    const user = userEvent.setup({ delay: null });
    render(<FocusTimerPage />);

    await user.click(screen.getByRole('button', { name: /start/i }));
    await tick(5000);
    await user.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.getByText('25:00')).toBeInTheDocument();
  });

  it('completing a focus session increments the daily count and switches to a break', async () => {
    const user = userEvent.setup({ delay: null });
    render(<FocusTimerPage />);

    await user.click(screen.getByRole('button', { name: /start/i }));
    await tick(25 * 60 * 1000);

    expect(screen.getByText(/Focus sessions today:/i)).toHaveTextContent('1');
    expect(screen.getByRole('tab', { name: /short break/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('Custom mode defaults to 20:00 and lets you set your own duration', async () => {
    const user = userEvent.setup({ delay: null });
    render(<FocusTimerPage />);

    await user.click(screen.getByRole('tab', { name: /custom/i }));
    expect(screen.getByText('20:00')).toBeInTheDocument();

    const minutesInput = screen.getByLabelText('Minutes');
    await user.clear(minutesInput);
    await user.type(minutesInput, '45');
    await user.tab(); // blur -> commits the new duration

    expect(screen.getByText('45:00')).toBeInTheDocument();
  });

  it('a completed Custom session does not auto-advance to another mode', async () => {
    const user = userEvent.setup({ delay: null });
    render(<FocusTimerPage />);

    await user.click(screen.getByRole('tab', { name: /custom/i }));
    const minutesInput = screen.getByLabelText('Minutes');
    await user.clear(minutesInput);
    await user.type(minutesInput, '1');
    await user.tab();

    await user.click(screen.getByRole('button', { name: /start/i }));
    await tick(60 * 1000);

    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /custom/i })).toHaveAttribute('aria-selected', 'true');
    // Custom sessions aren't counted toward the focus streak.
    expect(screen.getByText(/Focus sessions today:/i)).toHaveTextContent('0');
  });
});
