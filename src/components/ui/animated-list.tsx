import React, {
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
} from "react"
import { AnimatePresence, motion, type MotionProps } from "motion/react"

import { cn } from "@/lib/utils"

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0.9, opacity: 0, y: -12 },
    animate: { scale: 1, opacity: 1, y: 0, originY: 0 },
    exit: { scale: 0.9, opacity: 0, transition: { duration: 0.2 } },
    transition: { type: "spring", stiffness: 400, damping: 32 },
  }

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  )
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  delay?: number
  reverse?: boolean
}

export const AnimatedList = React.memo(
  ({ children, className, delay = 80, reverse = false, ...props }: AnimatedListProps) => {
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
        <AnimatePresence mode="popLayout">
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    )
  }
)

AnimatedList.displayName = "AnimatedList"
