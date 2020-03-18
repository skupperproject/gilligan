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

export const createServiceSelection = svg =>
  svg
    .append("svg:g")
    .attr("class", "services")
    .selectAll("g.service-type");

export const createServiceLinksSelection = svg =>
  svg
    .append("svg:g")
    .attr("class", "links")
    .selectAll("g");

export const setupServiceLinksSelection = (selection, links, self) => {
  // serviceLinksSelection is a selection of all g elements under the g.links svg:group
  // here we associate the links.links array with the {g.links g} selection
  // based on the link.uid
  selection = selection.data(links, d => d.uid);
  // add new links. if a link with a new uid is found in the data, add a new path
  let enterpath = selection
    .enter()
    .append("g")
    .on("mouseover", function(d) {
      // mouse over a path
      d.selected = true;
      self.highlightConnection(true, d3.select(this), d, self);
      self.popupCancelled = false;
      self.restart();
    })
    .on("mouseout", function(d) {
      self.handleMouseOutPath(d);
      self.highlightConnection(false, d3.select(this), d, self);
      self.restart();
    })
    // left click a path
    .on("click", d => {
      d3.event.stopPropagation();
      self.clearPopups();
      self.showLinkInfo(d);
    });

  // the d attribute of the following path elements is set in tick()
  enterpath
    .append("path")
    .attr("class", "service")
    .classed("forceBlack", true)
    .attr("stroke", d => lighten(-0.05, d.target.color)) //linkColor(d, links))
    .attr("stroke-width", 2)
    .attr("marker-end", d => {
      return d.right && d.cls !== "network"
        ? `url(#end${d.markerId("end")})`
        : null;
    })
    .attr("marker-start", d => {
      return d.cls !== "network" && (d.left || (!d.left && !d.right))
        ? `url(#start${d.markerId("start")})`
        : null;
    });

  enterpath
    .append("path")
    .attr("class", "servicesankeyDir")
    .attr("marker-end", d => {
      return d.right ? `url(#end${d.markerId("end")})` : null;
    })
    .attr("marker-start", d => {
      return d.left ? `url(#start--undefined)` : null;
    });

  enterpath
    .append("path")
    .attr("class", "hittarget")
    .attr("id", d => `hitpath-${d.source.uid()}-${d.target.uid()}`);

  enterpath
    .append("text")
    .attr("class", "stats")
    .attr("font-size", "12px")
    .attr("font-weight", "bold");

  // update each existing {g.links g.link} element
  selection
    .select(".service")
    .classed("selected", function(d) {
      return d.selected;
    })
    .classed("highlighted", function(d) {
      return d.highlighted;
    });

  // reset the markers based on current highlighted/selected
  selection
    .select(".service")
    .attr("marker-end", d => {
      return d.cls !== "network" && d.right && !d.source.expanded
        ? `url(#end${d.markerId("end")})`
        : null;
    })
    .attr("marker-start", d => {
      return d.cls !== "network" &&
        (d.left || (!d.left && !d.right && !d.source.expanded))
        ? `url(#start${d.markerId("start")})`
        : null;
    });
  // update each existing {g.links g.link} element
  selection
    .select(".service")
    .classed("selected", function(d) {
      return d.selected;
    })
    .classed("highlighted", function(d) {
      return d.highlighted;
    });

  // reset the markers based on current highlighted/selected
  selection
    .select(".service")
    .attr("marker-end", d => {
      return d.cls !== "network" && d.right && !d.source.expanded
        ? `url(#end${d.markerId("end")})`
        : null;
    })
    .attr("marker-start", d => {
      return d.cls !== "network" &&
        (d.left || (!d.left && !d.right && !d.source.expanded))
        ? `url(#start${d.markerId("start")})`
        : null;
    });

  // remove old links
  selection.exit().remove();

  // update each existing {g.links g.link} element
  selection
    .select(".service")
    .classed("selected", function(d) {
      return d.selected;
    })
    .classed("highlighted", function(d) {
      return d.highlighted;
    });

  // reset the markers based on current highlighted/selected
  selection
    .select(".service")
    .attr("marker-end", d => {
      return d.cls !== "network" && d.right && !d.source.expanded
        ? `url(#end${d.markerId("end")})`
        : null;
    })
    .attr("marker-start", d => {
      return d.cls !== "network" &&
        (d.left || (!d.left && !d.right && !d.source.expanded))
        ? `url(#start${d.markerId("start")})`
        : null;
    });

  self.setLinkStat();
  return selection;
};
