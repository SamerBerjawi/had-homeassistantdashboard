import React, {
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react"
import { AnimatePresence, motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

export function AnimatedListItem({ children, layout = true }: { children: React.ReactNode; layout?: boolean }) {
  const animations: MotionProps = {
    initial: { scale: 0.9, opacity: 0, y: -12 },
    animate: { scale: 1, opacity: 1, y: 0, originY: 0 },
    exit: { scale: 0.9, opacity: 0, transition: { duration: 0.2 } },
    transition: { type: "spring", stiffness: 400, damping: 32 },
  }

  return (
    <motion.div {...animations} layout={layout} className="mx-auto w-full">
      {children}
    </motion.div>
  )
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  delay?: number
  reverse?: boolean
  /**
   * Animate siblings sliding into place when items are added/removed. Measures every item on
   * each render, so turn it off for long lists that re-render often.
   */
  animateLayout?: boolean
}

export const AnimatedList = React.memo(
  ({ children, className, delay = 80, reverse = false, animateLayout = true, ...props }: AnimatedListProps) => {
    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children]
    )
    const [shownCount, setShownCount] = useState<number>(() => childrenArray.length)

    useEffect(() => {
      if (shownCount < childrenArray.length) {
        const timeout = setTimeout(() => {
          setShownCount((prev) => Math.min(prev + 1, childrenArray.length))
        }, delay)
        return () => clearTimeout(timeout)
      }
    }, [shownCount, childrenArray.length, delay])

    useEffect(() => {
      setShownCount((prev) => Math.min(prev, childrenArray.length))
    }, [childrenArray.length])

    const itemsToShow = useMemo(() => {
      const sliced = childrenArray.slice(0, shownCount)
      return reverse ? sliced.reverse() : sliced
    }, [shownCount, childrenArray, reverse])

    return (
      <div
        className={cn(`flex flex-col items-center gap-2.5 w-full`, className)}
        {...props}
      >
        {/* initial={false}: items already present when the list mounts (e.g. a drawer opening)
            appear immediately; only items added or removed afterwards animate */}
        <AnimatePresence mode="popLayout" initial={false}>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key} layout={animateLayout}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    )
  }
)

AnimatedList.displayName = "AnimatedList"
