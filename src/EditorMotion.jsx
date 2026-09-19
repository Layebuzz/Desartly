import React from "react";
import { Reorder, useDragControls, useReducedMotion } from "motion/react";
export function SortableBlock({ value, children }) {
  const controls = useDragControls(),
    reduced = useReducedMotion();
  return (
    <Reorder.Item
      as="div"
      value={value}
      dragListener={false}
      dragControls={controls}
      layout={!reduced}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      whileDrag={{
        scale: reduced ? 1 : 1.012,
        boxShadow: "0 18px 50px #27351c22",
        zIndex: 5,
      }}
      className="editable-block"
    >
      {children(controls)}
    </Reorder.Item>
  );
}

export function SortableGroup(props) { return <Reorder.Group {...props}/>; }
