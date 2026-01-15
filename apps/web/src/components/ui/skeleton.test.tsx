/**
 * Skeleton Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('should render with default classes', () => {
    render(<Skeleton data-testid="skeleton" />);

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('bg-slate-200');
  });

  it('should apply custom className', () => {
    render(<Skeleton className="h-4 w-24" data-testid="skeleton" />);

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('h-4');
    expect(skeleton).toHaveClass('w-24');
  });

  it('should pass through additional props', () => {
    render(<Skeleton data-testid="skeleton" aria-label="Loading content" />);

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
  });

  it('should have shimmer animation classes', () => {
    render(<Skeleton data-testid="skeleton" />);

    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('overflow-hidden');
  });
});
