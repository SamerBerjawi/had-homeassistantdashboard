import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ViewErrorState from '../src/components/ui/ViewErrorState';

describe('ViewErrorState (REL-005)', () => {
  it('renders an accessible alert with a retry button', () => {
    const html = renderToStaticMarkup(
      <ViewErrorState title="Not connected" message="Live data is unavailable" onRetry={() => undefined} />
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Not connected');
    expect(html).toContain('Retry');
  });

  it('omits the retry button when no handler is given', () => {
    expect(renderToStaticMarkup(<ViewErrorState />)).not.toContain('<button');
  });
});
