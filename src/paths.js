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

import * as d3 from "d3";
import * as d3path from "d3-path";

// calculate a point "away" distance from given pt, that is perpendicular
// to the line going from pt with given slope
const ptAway = (pt, away, slope) => {
  if (slope === 0) {
    return { x: pt.x, y: pt.y + away };
  }
  const m = -1 / slope;
  const y = (away * m) / Math.sqrt(1 + m * m) + pt.y;
  const x = away / Math.sqrt(1 + m * m) + pt.x;
  return { x, y };
};

const distance = (pt1, pt2) => {
  let xdiff = pt2.x - pt1.x;
  let ydiff = pt2.y - pt1.y;
  return Math.sqrt(xdiff * xdiff + ydiff * ydiff);
};

export const genBezier = ({ x0, y0, x1, y1 }) => {
  const path = d3path.path();
  const mid = (x1 + x0) / 2;
  path.moveTo(x0, y0);
  path.bezierCurveTo(mid, y0, mid, y1, x1, y1);
  return path.toString();
};

export const genPath = ({
  link,
  mask,
  sankey,
  width,
  reverse,
  offsetY,
  selection,
  site,
}) => {
  if (!width) {
    if (sankey) width = link.width;
    else width = 6;
  }
  if (isNaN(width)) width = 0;
  let path = "";
  if (!offsetY) offsetY = 0;
  if (mask) {
    path = genMask(link, selection, site);
  } else if (!sankey) {
    path = bezierPath(link, false, width, reverse, offsetY);
  } else {
    path = bezierPath(link, true, width, reverse, offsetY);
  }
  if (path.includes("NaN")) {
    console.log(
      `invalid path ${path} link ${link.source.address}-${link.target.address}`
    );
    return "";
  }
  return path;
};

// construct an arrow on the surface of the target circle
// oriented along the path connecting the source and target circles
const genMask = (link, selection, site) => {
  if (link.target.gateway) {
    console.log(
      `paths::getMask asked to create mask for gateway  site: ${site}`
    );
    return bezierPath(link, false, 1, false, 0);
  }
  if (!selection.getTotalLength) {
    selection.getTotalLength = () => 100;
    selection.getPointAtLength = (p) => ({ x: p, y: p / 100 });
  }
  let away = 5; // 1/2 the arrows base width
  let r = link.target.getWidth() / 2; // target circle radius
  let tc = {
    // center of target circle
    x: link.target.x + r,
    y: link.target.y + r,
  };
  // create the path on which we will be placing the arrow
  d3.select(selection).attr("d", (d) => genPath({ link, site }));
  const len = selection.getTotalLength(); // length of the path
  let intersect = len - r; // 1st guess at where the point of the arrow should be on the path
  let p1 = selection.getPointAtLength(intersect); // x,y position at that distance
  let dist = distance(p1, tc); // distance between p1 and the target's center
  let iterations = 0; // abundance of caution to avoid infinite loop
  // lazy way to get the intersection.
  // in practice, this only loops once or twice
  while (Math.abs(dist - r) > 1 && iterations < r + 1) {
    intersect += dist > r ? dist - r : -(dist - r);
    p1 = selection.getPointAtLength(intersect);
    dist = distance(p1, tc);
    ++iterations;
  }
  // p1 is now on the circle. p1 is the point of the arrow
  // we want to orient the arrow along the line from p1 to p2
  const p2 = selection.getPointAtLength(intersect - 10); // the base of the arrow
  if (p2.x === p1.x) {
    ++p2.x;
  }
  let slope = (p2.y - p1.y) / (p2.x - p1.x);
  // avoid divide by zero
  if (slope === 0) {
    slope = 0.001;
  }
  // find the corners of the arrow. they are perpendicular to the
  // line from p1 to p2
  const pt1 = ptAway(p2, -away, slope); // the corners
  const pt2 = ptAway(p2, away, slope);

  // draw the triangular arrow.
  // this replaces the path that was set on the selection above
  return `M ${p1.x} ${p1.y} L ${pt2.x} ${pt2.y} L ${pt1.x} ${pt1.y} z`;
};

const isOverlapped = (link) => {
  let overlapped = true;
  if (link.source.x0 > link.target.x0 + link.target.getWidth()) {
    overlapped = false;
  }
  if (link.source.x0 + link.source.getWidth() < link.target.x0) {
    overlapped = false;
  }
  return overlapped;
};

// create a bezier path between link.source and link.target
const bezierPath = (link, sankey, width, reverse, offset) => {
  let x0 = link.source.x1; // right side of source
  if (
    link.source.expanded &&
    link.source.nodeType === "cluster" &&
    !link.source.gateway
  ) {
    x0 -= link.source.getWidth() / 2;
  }
  const { offsetX, offsetY } = calcOffsets(link, offset);
  let y0 =
    link.source.expanded && !isNaN(link.y0)
      ? link.y0 - offsetY
      : link.source.y0 + link.source.getHeight() / 2 - offsetY;
  let x1 = link.target.x0; // left side of target
  if (
    link.target.expanded &&
    link.target.nodeType === "cluster" &&
    !link.target.gateway
  ) {
    x1 += link.target.getWidth() / 2;
  }
  x0 += offsetX;
  x1 += offsetX;

  let y1 =
    link.target.expanded && !isNaN(link.y1)
      ? link.y1 - offsetY
      : link.target.y0 + link.target.getHeight() / 2 - offsetY;
  let mid = (x0 + x1) / 2;

  let halfWidth = width / 2;
  let leftTop = y0 - halfWidth;
  let leftBottom = y0 + halfWidth;
  let rightTop = y1 - halfWidth;
  let rightBottom = y1 + halfWidth;
  if (link.source.isExternal) {
    leftTop = link.source.y + 22 - offsetY;
    leftBottom = link.source.y + 26 - offsetY;
    y0 = link.source.y + 24 - offsetY;
  }
  const overlapped = isOverlapped(link);
  if (overlapped) {
    x0 = link.source.x0 + link.source.getWidth() / 2;
    x1 = link.target.x0 + link.target.getWidth() / 2;
    if (link.source.y0 + link.source.getHeight() / 2 < link.target.y0) {
      y0 = link.source.y0 + link.source.getHeight();
      y1 = link.target.y0;
    } else {
      y0 = link.source.y0;
      y1 = link.target.y0 + link.target.getHeight();
    }
    x0 += offsetX;
    x1 += offsetX;
  }

  const sankeyBezierVertical = (
    path,
    ltx, // left top
    lty,
    rtx,
    rty,
    lbx,
    lby,
    rbx, // right bottom
    rby
  ) => {
    const midy = (lty + lby) / 2;
    path.moveTo(ltx, lty);
    path.bezierCurveTo(ltx, midy, lbx, midy, lbx, lby);
    path.lineTo(rbx, rby);
    path.bezierCurveTo(rbx, midy, rtx, midy, rtx, rty);
    path.closePath();
  };

  const bezierVertical = (path, lx, ly, rx, ry) => {
    const midy = (ly + ry) / 2;
    path.moveTo(lx, ly);
    path.bezierCurveTo(lx, midy, rx, midy, rx, ry);
  };
  const path = d3path.path();
  if (sankey) {
    if (overlapped) {
      // source bottom is above the target top
      if (link.source.y1 < link.target.y0) {
        const lrty =
          link.source.nodeType === "cluster" && !link.source.gateway
            ? (link.source.y0 + link.source.y1) / 2
            : link.source.y1;
        const lrby =
          link.target.nodeType === "cluster" && !link.target.gateway
            ? (link.target.y0 + link.target.y1) / 2
            : link.target.y0;

        sankeyBezierVertical(
          path,
          link.source.x0,
          lrty,
          link.source.x1,
          lrty,
          link.target.x0,
          lrby,
          link.target.x1,
          lrby
        );
      } else {
        const lrty =
          link.target.nodeType === "cluster" && !link.target.gateway
            ? (link.target.y0 + link.target.y1) / 2
            : link.target.y1;
        const lrby =
          link.source.nodeType === "cluster" && !link.target.gateway
            ? (link.source.y0 + link.source.y1) / 2
            : link.source.y0;
        sankeyBezierVertical(
          path,
          link.target.x0,
          lrty,
          link.target.x1,
          lrty,
          link.source.x0,
          lrby,
          link.source.x1,
          lrby
        );
      }
    } else {
      if (link.source.x0 > link.target.x0 + link.target.getWidth()) {
        if (link.source.nodeType === "cluster" && !link.source.gateway) {
          x0 = link.source.x0 + link.source.getWidth() / 2;
          x1 = link.target.x0 + link.target.getWidth() / 2;
        } else {
          x0 = link.source.x0;
          x1 = link.target.x0 + link.target.getWidth();
        }
      }
      path.moveTo(x0, leftTop);
      path.bezierCurveTo(mid, leftTop, mid, rightTop, x1, rightTop);
      path.lineTo(x1, y1 + halfWidth);
      path.bezierCurveTo(mid, rightBottom, mid, leftBottom, x0, leftBottom);
      path.closePath();
    }
  } else {
    if (overlapped) {
      if (link.source.y0 + link.source.getHeight() < link.target.y0) {
        bezierVertical(
          path,
          link.source.x0 + link.source.getWidth() / 2,
          link.source.y0 + link.source.getHeight(),
          link.target.x0 + link.target.getWidth() / 2,
          link.target.y0
        );
      } else {
        bezierVertical(
          path,
          link.source.x0 + link.source.getWidth() / 2,
          link.source.y0,
          link.target.x0 + link.target.getWidth() / 2,
          link.target.y0 + link.target.getHeight()
        );
      }
    } else {
      if (reverse) {
        path.moveTo(x1, y1);
        path.bezierCurveTo(mid, y1, mid, y0, x0, y0);
      } else {
        if (link.source.x0 > link.target.x0 + link.target.getWidth()) {
          x0 = link.source.x0;
          y0 = link.source.y0 + link.source.getHeight() / 2;
          x1 = link.target.x0 + link.target.getWidth();
          //y1 = link.target.y0 + ;
          mid = (x0 + x1) / 2;
        }
        path.moveTo(x0, y0);
        path.bezierCurveTo(mid, y0, mid, y1, x1, y1);
      }
    }
  }
  return path.toString();
};

// return the path between 2 circles
// the path is the shortest line segment joining the circles
export const pathBetween = (source, target) => {
  const x1 = source.gateway ? source.x + source.r * 2 : source.x + source.r; // center of source circle
  const y1 = source.y + source.r;
  const x2 = target.x + target.r; // center of target circle
  const y2 = target.y + target.r;
  const pt1 = circleIntercept(x1, y1, source.r, x2, y2);
  const pt2 = circleIntercept(x2, y2, target.r, x1, y1);
  let path = d3path.path();
  if (source.gateway) {
    path.moveTo(x1, y1);
  } else {
    path.moveTo(pt1.x, pt1.y);
  }
  path.lineTo(pt2.x, pt2.y);
  return path.toString();
};

// intersection of circle at x1,y1 with radius r and line
// between x1,y1 and y2,y2
// This is used to draw the router connection lines between sites
const circleIntercept = (x1, y1, r, x2, y2) => {
  const pt = {};
  const dist = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  pt.x = (r * (x2 - x1)) / dist + x1;
  pt.y = (r * (y2 - y1)) / dist + y1;
  return pt;
};

const calcOffsets = (link, offset) => {
  if (Math.abs(link.source.x1 - link.source.x0) < 0.001) {
    return { offsetX: offset, offsetY: 0 };
  }
  let slope = 0;
  if (!isNaN(link.y1) && !isNaN(link.y0)) {
    slope = (link.y1 - link.y0) / (link.source.x1 - link.source.x0);
  }
  if (slope === 0) {
    return { offsetX: 0, offsetY: offset };
  }
  const pt = ptAway({ x: link.source.x1, y: link.y0 }, offset, slope);
  const offsetX = slope > 0 ? pt.x - link.source.x1 : link.source.x1 - pt.x;
  const offsetY = slope < 0 ? pt.y - link.y0 : link.y0 - pt.y;
  return { offsetX, offsetY };
};
