import React from "react";
import { qdrRibbon as Ribbon } from "../pages/topology/chord/ribbon/ribbon";
export const ChordIcon = ({
  width = "22",
  height = "22",
  className = "sk-icon-chord",
  scale = 1.1,
}) => {
  const sscale = `scale(${scale})`;
  const padding = 4;
  const radius = Math.min(width - padding * 2, height - padding * 2) / 2;
  const d1 = {
    source: { startAngle: Math.PI * 0, endAngle: Math.PI * 0.3 },
    target: { startAngle: Math.PI * 0.9, endAngle: Math.PI * 1.8 },
  };
  const d2 = {
    source: { startAngle: Math.PI * 0.4, endAngle: Math.PI * 0.4 },
    target: { startAngle: Math.PI * 0.4, endAngle: Math.PI * 0.8 },
  };
  const ribbon = Ribbon();
  ribbon.radius(radius);
  const arcPath1 = ribbon(d1);
  const arcPath2 = ribbon(d2);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      className={className}
    >
      <g transform={sscale}>
        <g transform={`translate(${radius + padding},${radius + padding})`}>
          <path d={arcPath1} />
          <path d={arcPath2} />
        </g>
      </g>
    </svg>
  );
};
