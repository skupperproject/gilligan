import React from "react";

export const GraphIcon = ({
  width = "40",
  height = "22",
  className = "sk-icon-graph",
  scale = 1.0,
}) => {
  const sscale = `scale(${scale})`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      className={className}
    >
      <g transform={sscale}>
        <g transform="translate(0, 8)">
          <rect
            x="2"
            y="2"
            rx="2"
            strokeWidth="1"
            stroke="black"
            fill="transparent"
            width="10"
            height="6"
          />
        </g>
        <g id="bezier-path" transform="translate(0, 11)">
          <path d={"M0,0 L"} stroke="black" strokeWidth="1" />
        </g>
        <use href="#bezier-path" transform="scale(1,-1)" />
      </g>
    </svg>
  );
};
