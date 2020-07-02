import React from "react";

export const ServiceIcon = ({
  width = "56",
  height = "18",
  className = "",
  scale = 0.75,
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
        <g transform="translate(20, 0)">
          <rect
            x="2"
            y="2"
            rx="4"
            strokeWidth="2"
            stroke="black"
            fill="transparent"
            width="30"
            height="20"
          />
        </g>
        <g id="service-arrow" transform="translate(0, 10)">
          <g transform="translate(0, 2)">
            <line x0="0" x1="20" y0="2" y1="0" stroke="black" strokeWidth="2" />
          </g>
          <g transform="translate(12, 2)">
            <path stroke="black" fill="black" d="M 0 -5 L 10 0 L 0 5 z" />
          </g>
        </g>
        <use href="#service-arrow" transform="translate(52, 0)" />
      </g>
    </svg>
  );
};
