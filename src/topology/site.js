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
import { genPath } from "../utilities";

export const createSiteSelection = svg =>
  svg
    .append("svg:g")
    .attr("class", "clusters")
    .selectAll("g.cluster")
    .attr("transform", d => `translate(${d.x},${d.y})`);

export const createSiteLinksSelection = svg =>
  svg
    .append("svg:g")
    .attr("class", "siteLinks")
    .selectAll("g");

export const createSiteTrafficLinksSelection = svg =>
  svg
    .append("svg:g")
    .attr("class", "siteTrafficLinks")
    .selectAll("g");

export const createSiteMaskSelection = svg =>
  svg
    .append("svg:g")
    .attr("class", "masks")
    .selectAll("g");

export const setupSiteMask = (selection, links) => {
  const sources = links.map(l => ({
    mask: true,
    source: l,
    uid: `MaskSource-${l.uid}`
  }));
  const targets = links.map(l => ({
    mask: true,
    target: l,
    uid: `MaskTarget-${l.uid}`
  }));
  console.log([...sources, ...targets]);
  selection = selection.data([...sources, ...targets], d => d.uid);
  selection.exit().remove();
  const enter = selection.enter().append("g");
  enter.append("path").attr("class", "mask");

  return selection;
};
export const setupSiteTrafficLinks = (
  selection,
  links,
  clearPopups,
  showLinkInfo,
  restart
) => {
  selection = selection.data(links, d => d.uid);

  selection.exit().remove();

  const enter = selection.enter().append("g");
  enter
    .append("path")
    .attr("class", "siteTrafficLink")
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("d", d => {
      return genPath(d, "site");
    });

  enter
    .append("path")
    .attr("class", "siteTrafficDir")
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr("marker-end", "url(#end--15)");

  enter
    .append("path")
    .attr("class", "hittarget")
    .on("click", d => {
      d3.event.stopPropagation();
      clearPopups();
      showLinkInfo(d);
    })
    .on("mouseover", d => {
      d.highlighted = true;
      restart();
    })
    .on("mouseout", d => {
      d.highlighted = false;
      restart();
    });

  enter
    .append("text")
    .attr("class", "stats")
    .attr("font-size", "12px")
    .attr("font-weight", "bold");

  return selection;
};

export const setupSiteLinks = (
  selection,
  links,
  clearPopups,
  showLinkInfo,
  restart
) => {
  selection = selection
    .data(links, d => d.uid)
    .attr("marker-end", "url(#site-end)");

  selection.exit().remove();
  const enter = selection.enter().append("g");

  enter
    .append("path")
    .attr("class", "site")
    .attr("d", d => genPath(d, "site"));

  enter
    .append("path")
    .attr("class", "hittarget")
    .on("click", d => {
      d3.event.stopPropagation();
      clearPopups();
      showLinkInfo(d);
    })
    .on("mouseover", d => {
      d.highlighted = true;
      restart();
    })
    .on("mouseout", d => {
      d.highlighted = false;
      restart();
    });

  selection.selectAll("path.site").classed("highlighted", d => d.highlighted);

  return selection;
};
