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

export const setupSiteLinks = (
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

  return selection;
};
