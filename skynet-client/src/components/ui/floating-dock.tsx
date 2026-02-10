"use client";
import React from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { cn } from "../../lib/utils";

export type DockItem = {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

export const FloatingDock = ({
  items,
  className,
}: {
  items: DockItem[];
  className?: string;
}) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "flex h-14 items-end gap-2 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/[0.08] px-4 pb-2.5",
        className
      )}
    >
      {items.map((item, idx) => (
        <DockIcon mouseX={mouseX} key={idx} {...item} />
      ))}
    </motion.div>
  );
};

function DockIcon({
  mouseX,
  title,
  icon,
  href,
  onClick,
  active,
}: DockItem & { mouseX: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 56, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 56, 40]);

  const width = useSpring(widthTransform, { mass: 0.1, stiffness: 150, damping: 12 });
  const height = useSpring(heightTransform, { mass: 0.1, stiffness: 150, damping: 12 });

  const handleClick = () => {
    if (onClick) onClick();
    if (href) window.location.hash = href;
  };

  return (
    <motion.div
      ref={ref}
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      className={cn(
        "relative flex aspect-square cursor-pointer items-center justify-center rounded-xl transition-colors",
        active
          ? "bg-jal-red/20 text-jal-red"
          : "text-white/60 hover:text-white hover:bg-white/10"
      )}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 2, x: "-50%" }}
            className="absolute -top-8 left-1/2 w-fit whitespace-pre rounded-md border border-white/10 bg-black/80 px-2 py-0.5 text-xs text-white backdrop-blur-lg"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-center w-5 h-5">{icon}</div>
    </motion.div>
  );
}
