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
import { lighten } from "../utilities";
/* service to service links on deployment view*/
export const createDeploymentLinksSelection = svg =>
  svg
    .append("svg:g")
    .attr("class", "deploymentLinks")
    .selectAll("g");

export const setupDeploymentLinks = (
  selection,
  links,
  clearPopups,
  showLinkInfo,
  restart
) => {
  selection = selection.data(links, d => d.uid);

  selection.exit().remove();
  const sssEnter = selection
    .enter()
    .append("g")
    .attr("class", "deployment");

  sssEnter
    .append("path")
    .attr("class", "deployment")
    .attr("stroke", d => lighten(-0.05, d.target.color))
    .classed("forceBlack", true)
    .attr("marker-end", d => {
      return d.left ? `url(#end${d.markerId("end")})` : null;
    })
    .attr("marker-start", d => {
      return d.right ? `url(#start${d.markerId("start")})` : null;
    });

  sssEnter
    .append("path")
    .attr("class", "deploymentDir")
    .attr("marker-end", d => {
      return d.left ? `url(#end${d.markerId("end")})` : null;
    })
    .attr("marker-start", d => {
      return d.right ? `url(#start${d.markerId("start")})` : null;
    });

  sssEnter
    .append("path")
    .attr("class", "hittarget")
    .on("click", d => {
      d3.event.stopPropagation();
      clearPopups();
      showLinkInfo(d);
    })
    .on("mouseover", d => {
      d.selected = true;
      showLinkInfo(d);
      restart();
    })
    .on("mouseout", d => {
      d.selected = false;
      clearPopups();
      restart();
    });

  sssEnter
    .append("text")
    .attr("class", "stats")
    .attr("font-size", "12px")
    .attr("font-weight", "bold");

  selection.selectAll("path.deployment").classed("selected", d => d.selected);

  return selection;
};

export const constrainDeployment = d => {
  // don't allow dragging deployment rect outside of parent site circle
  const bbox = {
    left: d.parentNode.x,
    right: d.parentNode.x + d.parentNode.getWidth(),
    top: d.parentNode.y,
    bottom: d.parentNode.y + d.parentNode.getHeight()
  };
  if (d.px + d.getWidth() > bbox.right) {
    d.px = bbox.right - d.getWidth();
  }
  if (d.px < bbox.left) {
    d.px = bbox.left;
  }
  if (d.py + d.getHeight() > bbox.bottom) {
    d.py = bbox.bottom - d.getHeight();
  }
  if (d.py < bbox.top) {
    d.py = bbox.top;
  }
  d.x = d.x0 = d.deployment.x0 = d.px;
  d.y = d.y0 = d.deployment.y0 = d.py;
  d.x1 = d.deployment.x1 = d.x + d.getWidth();
  d.y1 = d.deployment.y1 = d.y + d.getHeight();
  d.siteOffsetX = d.x - d.parentNode.x;
  d.siteOffsetY = d.y - d.parentNode.y;
};
