"use client";

/**
 * @author: @kokonutui
 * @description: Apple Activity Card
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface ActivityData {
  label: string;
  value: number;
  color: string;
  size: number;
  current: number;
  target: number;
  unit: string;
}

interface CircleProgressProps {
  data: ActivityData;
  index: number;
}

export const DEFAULT_ACTIVITIES: ActivityData[] = [
  {
    label: "MOVE",
    value: 85,
    color: "#FF2D55",
    size: 200,
    current: 479,
    target: 800,
    unit: "CAL",
  },
  {
    label: "EXERCISE",
    value: 60,
    color: "#A3F900",
    size: 160,
    current: 24,
    target: 30,
    unit: "MIN",
  },
  {
    label: "STAND",
    value: 30,
    color: "#04C7DD",
    size: 120,
    current: 6,
    target: 12,
    unit: "HR",
  },
];

const CircleProgress = ({ data, index }: CircleProgressProps) => {
  const strokeWidth = 16;
  const radius = (data.size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.max(0, ((100 - Math.min(100, data.value)) / 100) * circumference);

  const gradientId = `gradient-${data.label.toLowerCase()}`;
  const gradientUrl = `url(#${gradientId})`;

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.8, delay: index * 0.2, ease: "easeOut" }}
    >
      <div className="relative">
        <svg
          aria-label={`${data.label} Activity Progress - ${data.value}%`}
          className="-rotate-90 transform"
          height={data.size}
          viewBox={`0 0 ${data.size} ${data.size}`}
          width={data.size}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                style={{
                  stopColor: data.color,
                  stopOpacity: 1,
                }}
              />
              <stop
                offset="100%"
                style={{
                  stopColor:
                    data.color === "#FF2D55"
                      ? "#FF6B8B"
                      : data.color === "#A3F900"
                        ? "#C5FF4D"
                        : "#4DDFED",
                  stopOpacity: 1,
                }}
              />
            </linearGradient>
          </defs>

          <circle
            className="text-zinc-200/50 dark:text-zinc-800/50"
            cx={data.size / 2}
            cy={data.size / 2}
            fill="none"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
          />

          <motion.circle
            animate={{ strokeDashoffset: progress }}
            cx={data.size / 2}
            cy={data.size / 2}
            fill="none"
            initial={{ strokeDashoffset: circumference }}
            r={radius}
            stroke={gradientUrl}
            strokeDasharray={circumference}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            style={{
              filter: "drop-shadow(0 0 6px rgba(0,0,0,0.15))",
            }}
            transition={{
              duration: 1.8,
              delay: index * 0.2,
              ease: "easeInOut",
            }}
          />
        </svg>
      </div>
    </motion.div>
  );
};

const DetailedActivityInfo = ({ activities }: { activities: ActivityData[] }) => {
  return (
    <motion.div
      animate={{ opacity: 1, x: 0 }}
      className="ml-6 sm:ml-8 flex flex-col gap-4 sm:gap-6"
      initial={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      {activities.map((activity) => (
        <motion.div className="flex flex-col" key={activity.label}>
          <span className="font-medium text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            {activity.label}
          </span>
          <span
            className="font-semibold text-xl sm:text-2xl"
            style={{ color: activity.color }}
          >
            {activity.current.toLocaleString()}/{activity.target.toLocaleString()}
            <span className="ml-1 text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
              {activity.unit}
            </span>
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
};

export interface AppleActivityCardProps {
  title?: string;
  className?: string;
  activities?: ActivityData[];
}

export default function AppleActivityCard({
  title = "Activity Rings",
  className,
  activities = DEFAULT_ACTIVITIES,
}: AppleActivityCardProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full rounded-3xl p-6 sm:p-8",
        "text-zinc-900 dark:text-white",
        className
      )}
    >
      <div className="flex flex-col items-center gap-6 sm:gap-8">
        <motion.h2
          animate={{ opacity: 1, y: 0 }}
          className="font-black text-lg sm:text-xl uppercase tracking-wider text-zinc-900 dark:text-white"
          initial={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          {title}
        </motion.h2>

        <div className="flex items-center justify-center flex-wrap gap-4">
          <div className="relative h-[200px] w-[200px] shrink-0">
            {activities.map((activity, index) => (
              <CircleProgress
                data={activity}
                index={index}
                key={activity.label}
              />
            ))}
          </div>
          <DetailedActivityInfo activities={activities} />
        </div>
      </div>
    </div>
  );
}
