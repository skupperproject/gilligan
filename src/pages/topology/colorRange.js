/*
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

import React from "react";
export const ColorRange = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      preserveAspectRatio="xMidYMid meet"
      width="140"
      height="44"
    >
      <defs>
        <linearGradient
          xmlns="http://www.w3.org/2000/svg"
          id="colorGradient"
          gradientUnits="userSpaceOnUse"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop style={{ stopColor: "#888888", stopOpacity: 1 }} offset="0" />
          <stop
            style={{ stopColor: "#888888", stopOpacity: 1 }}
            offset="0.333"
          />
          <stop
            style={{ stopColor: "#00FF00", stopOpacity: 1 }}
            offset="0.334"
          />
          <stop
            style={{ stopColor: "#00FF00", stopOpacity: 1 }}
            offset="0.666"
          />
          <stop
            style={{ stopColor: "#0000FF", stopOpacity: 1 }}
            offset="0.667"
          />
          <stop style={{ stopColor: "#0000FF", stopOpacity: 1 }} offset="1" />
        </linearGradient>
      </defs>
      <g>
        <rect
          width="140"
          height="20"
          x="0"
          y="0"
          fill="url(#colorGradient)"
        ></rect>
        <text x="1" y="30" textAnchor="start">
          Low
        </text>
        <text x="130" y="30" textAnchor="end">
          High
        </text>
      </g>
    </svg>
  );
};
