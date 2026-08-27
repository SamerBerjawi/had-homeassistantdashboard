import { type ComponentPropsWithoutRef, type ReactNode } from "react"
import { ArrowRight } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name?: string
  className?: string
  background?: ReactNode
  Icon?: any
  description?: string
  href?: string
  cta?: string
  children?: ReactNode
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  children,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative flex flex-col justify-between overflow-hidden rounded-3xl",
      className
    )}
    {...props}
  >
    {background && <div>{background}</div>}
    {children ? (
      children
    ) : (
      <>
        <div className="p-5 sm:p-6">
          <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-2 transition-all duration-300">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-brand-purple backdrop-blur-md transition-all duration-300 ease-in-out group-hover:scale-110">
                <Icon size={22} weight="duotone" />
              </div>
            )}
            {name && (
              <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200">
                {name}
              </h3>
            )}
            {description && <p className="max-w-lg text-xs text-neutral-400">{description}</p>}
          </div>
        </div>

        {cta && (
          <div className="pointer-events-auto p-5 sm:p-6 pt-0 flex items-center text-xs font-bold text-brand-purple">
            <span>{cta}</span>
            <ArrowRight size={14} weight="duotone" className="ms-1.5 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </>
    )}
  </div>
)

export { BentoCard, BentoGrid }

