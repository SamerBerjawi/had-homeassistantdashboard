/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RefObject, useEffect, useState } from 'react';

/**
 * Whether the element is within (or `rootMargin` of) the viewport. Defaults to true where
 * IntersectionObserver isn't available, so content still loads.
 */
export function useIsOnScreen(ref: RefObject<Element | null>, rootMargin = '200px'): boolean {
  const [isOnScreen, setIsOnScreen] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => setIsOnScreen(entries.some((entry) => entry.isIntersecting)),
      { rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return isOnScreen;
}
