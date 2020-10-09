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

export const genPath = ({
  link,
  key,
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
  } else if (link.circular) {
    path = circular(link, key, sankey, width, reverse, offsetY, site);
  } else {
    path = bezierPath(link, key, sankey, width, reverse, offsetY);
  }
  if (path.includes("NaN")) {
    console.log(
      `invalid path ${path} link ${link.source.address}-${link.target.address}`
    );
    return "";
  }
  return path;
};

const get = (obj, attr, key) => (key ? obj[key][attr] : obj[attr]);

// construct an arrow on the surface of the target circle
// oriented along the path connecting the source and target circles
const genMask = (link, selection, site) => {
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

// create a bezier path between link.source and link.target
const bezierPath = (link, key, sankey, width, reverse, offset) => {
  let x0 = get(link.source, "x1", key); // right side of source
  if (link.source.expanded && link.source.nodeType === "cluster") {
    x0 -= link.source.getWidth() / 2;
  }
  const { offsetX, offsetY } = calcOffsets(link, offset);
  const y0 =
    link.source.expanded && !isNaN(link.y0)
      ? link.y0 - offsetY
      : get(link.source, "y0", key) + link.source.getHeight() / 2 - offsetY;
  let x1 = get(link.target, "x0", key); // left side of target
  if (link.source.expanded && link.target.nodeType === "cluster") {
    x1 += link.target.getWidth() / 2;
  }
  x0 += offsetX;
  x1 += offsetX;
  const y1 =
    link.target.expanded && !isNaN(link.y1)
      ? link.y1 - offsetY
      : get(link.target, "y0", key) + link.target.getHeight() / 2 - offsetY;
  const mid = (x0 + x1) / 2;
  //if (isNaN(mid)) debugger;
  const path = d3path.path();
  if (sankey) {
    const halfWidth = width / 2;
    path.moveTo(x0, y0 - halfWidth);
    path.bezierCurveTo(
      mid,
      y0 - halfWidth,
      mid,
      y1 - halfWidth,
      x1,
      y1 - halfWidth
    );
    path.lineTo(x1, y1 + halfWidth);
    path.bezierCurveTo(
      mid,
      y1 + halfWidth,
      mid,
      y0 + halfWidth,
      x0,
      y0 + halfWidth
    );
    path.closePath();
  } else {
    if (reverse) {
      path.moveTo(x1, y1);
      path.bezierCurveTo(mid, y1, mid, y0, x0, y0);
    } else {
      path.moveTo(x0, y0);
      path.bezierCurveTo(mid, y0, mid, y1, x1, y1);
    }
  }
  return path.toString();
};

// create a complex path exiting source on the right
// and curving around to enter the target on the left
const circular = (link, key, sankey, width, reverse, off, site) => {
  const minR = 10;
  const maxR = 80;
  const { offsetX, offsetY } = calcOffsets(link, off);
  // straight line exiting source
  const gapSource = site ? link.source.r : 8;
  // straight line entering target
  const gapTarget = site ? link.target.r : 8;
  // radius of the turns
  const r = width ? Math.max(Math.min(maxR, width), minR) : minR;
  // right side of source
  let sourceX = get(link.source, "x1", key);
  if (link.source.expanded && link.source.nodeType === "cluster") {
    sourceX -= link.source.getWidth() / 2;
  }
  // left side of target
  let targetX = get(link.target, "x0", key);
  if (link.target.expanded && link.target.nodeType === "cluster") {
    targetX += link.target.getWidth() / 2;
  }
  const sourceY =
    link.source.expanded && !isNaN(link.y0)
      ? link.y0
      : get(link.source, "y0", key) + link.source.getHeight() / 2;
  const targetY =
    link.target.expanded && !isNaN(link.y1)
      ? link.y1
      : get(link.target, "y0", key) + link.target.getHeight() / 2;

  sourceX += offsetX;
  targetX += offsetX;

  const bottom = Math.max(
    link.source.y0 + link.source.getHeight(),
    link.target.y0 + link.target.getHeight()
  );
  let bottomY = Math.max(
    bottom + (r - width / 2) * 2,
    bottom + r + width / 2,
    bottom + r * 2
  );
  const offset = sankey ? width / 2 : 0;
  let sy = sourceY - offset - offsetY;
  let ty = targetY - offset - offsetY;
  let by = bottomY + offset - offsetY;
  let sr = r + offset;

  let path = d3path.path();

  if (!reverse) {
    path.moveTo(sourceX, sy);
    path.lineTo(sourceX + gapSource, sy);
    path.arcTo(
      sourceX + gapSource + sr,
      sy,
      sourceX + gapSource + sr,
      sy + sr,
      sr
    );
    path.lineTo(sourceX + gapSource + sr, by - sr);
    path.arcTo(sourceX + gapSource + sr, by, sourceX + gapSource, by, sr);
    path.lineTo(targetX - gapTarget, by);
    path.arcTo(
      targetX - gapTarget - sr,
      by,
      targetX - gapTarget - sr,
      by - sr,
      sr
    );
    path.lineTo(targetX - gapTarget - sr, ty + sr);
    path.arcTo(targetX - gapTarget - sr, ty, targetX - gapTarget, ty, sr);
    path.lineTo(targetX, ty);
  }
  if (sankey || reverse) {
    if (!reverse) {
      sy = sourceY + offset;
      ty = targetY + offset;
      by = bottomY - offset;
      sr = Math.max(r - offset, minR);
      path.lineTo(targetX, ty);
    } else {
      path.moveTo(targetX, ty);
    }
    path.lineTo(targetX - gapTarget, ty);
    path.arcTo(
      targetX - gapTarget - sr,
      ty,
      targetX - gapTarget - sr,
      ty + sr,
      sr
    );
    path.lineTo(targetX - gapTarget - sr, by - sr);
    path.arcTo(targetX - gapTarget - sr, by, targetX - gapTarget, by, sr);
    path.lineTo(sourceX + gapSource, by);
    path.arcTo(
      sourceX + gapSource + sr,
      by,
      sourceX + gapSource + sr,
      by - sr,
      sr
    );
    path.lineTo(sourceX + gapSource + sr, sy + sr);
    path.arcTo(sourceX + gapSource + sr, sy, sourceX + gapSource, sy, sr);
    path.lineTo(sourceX, sy);
    if (!reverse) path.closePath();
  }
  return path.toString();
};

// return the path between 2 circles
// the path is the shortest line segment joining the circles
export const pathBetween = (source, target) => {
  const x1 = source.x + source.r; // center of source circle
  const y1 = source.y + source.r;
  const x2 = target.x + target.r; // center of target circle
  const y2 = target.y + target.r;
  const pt1 = circleIntercept(x1, y1, source.r, x2, y2);
  const pt2 = circleIntercept(x2, y2, target.r, x1, y1);
  let path = d3path.path();
  path.moveTo(pt1.x, pt1.y);
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
