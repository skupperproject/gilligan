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
import {
  adjustPositions,
  fixPath,
  genPath,
  //getSaved,
  linkColor,
  circularize,
  initSankey,
  lighten,
  serviceColor,
  Sankey,
  setLinkStat,
  updateSankey,
  endall,
  VIEW_DURATION,
  ServiceWidth,
  ClusterPadding,
  ServiceHeight
} from "../utilities";
import { interpolatePath } from "d3-interpolate-path";
import { Node, Nodes } from "./nodes.js";
import { Links } from "./links.js";

export class Service {
  constructor(adapter) {
    this.adapter = adapter;
    this.serviceNodes = new Nodes();
    this.serviceLinks = new Links();
    this.nodes = () => this.serviceNodes;
    this.links = () => this.serviceLinks;
  }

  createSelections = svg => {
    this.masksSelection = this.createMasksSelection(svg);
    this.servicesSelection = this.createServicesSelection(svg);
    this.linksSelection = this.createLinksSelection(svg);
  };

  setupSelections = viewer => {
    this.masksSelection = this.setupMasks(viewer);
    this.servicesSelection = this.setupServicesSelection(viewer);
    this.linksSelection = this.setupLinksSelection(viewer);
  };

  initNodesAndLinks = viewer => {
    this.initNodes(viewer, false);
    const vsize = this.initLinks(viewer, {
      width: viewer.width,
      height: viewer.height
    });
    return { nodeCount: this.serviceNodes.nodes.length, size: vsize };
  };

  initNodes = (viewer, includeExtra) => {
    const clusters = this.adapter.data.sites;
    const serviceNodes = this.serviceNodes;
    clusters.forEach(cluster => {
      cluster.services.forEach((service, i) => {
        if (
          includeExtra ||
          !serviceNodes.nodes.some(n => n.name === service.address)
        ) {
          const subNode = new Node({
            name: service.address,
            nodeType: "service",
            fixed: true,
            heightFn: this.serviceHeight,
            widthFn: this.serviceWidth
          });
          subNode.mergeWith(service);
          subNode.lightColor = d3.rgb(serviceColor(subNode.name)).brighter(0.6);
          subNode.color = serviceColor(subNode.name);
          subNode.cluster = cluster;
          subNode.shortName = this.adapter.shortName(subNode.name);

          if (includeExtra) {
            const original = serviceNodes.nodeFor(subNode.name);
            if (original) {
              subNode.extra = true;
              subNode.original = original;
            }
          }
          serviceNodes.add(subNode);
        }
      });
    });
  };

  initLinks = (viewer, vsize) => {
    const serviceNodes = this.serviceNodes.nodes;
    // initialize the service to service links for the service view
    const links = this.serviceLinks;
    links.reset();

    // get the links between services for the service view
    serviceNodes.forEach((subNode, source) => {
      subNode.targetServices.forEach(targetService => {
        const target = serviceNodes.findIndex(
          sn => sn.address === targetService.address
        );
        const linkIndex = links.getLink(
          subNode,
          serviceNodes[target],
          "out",
          "link",
          `Link-${source}-${target}`
        );
        const link = links.links[Math.abs(linkIndex)];
        link.request = this.adapter.linkRequest(
          subNode.address,
          serviceNodes[target]
        );
        link.value = link.request.bytes_out;
        link.getColor = () => linkColor(link, links.links);
      });
    });

    // get the service heights for use with the servicesankey view
    const graph = {
      nodes: serviceNodes,
      links: links.links
    };
    initSankey({
      graph,
      width: vsize.width,
      height: vsize.height,
      nodeWidth: ServiceWidth,
      nodePadding: ClusterPadding,
      left: 50,
      top: 20,
      right: 50,
      bottom: 10
    });

    this.expandNodes();
    serviceNodes.forEach(n => {
      n.sankeyHeight = Math.max(n.y1 - n.y0, ServiceHeight);
    });

    // set the x,y based on links and node sizes
    const newSize = adjustPositions({
      nodes: serviceNodes,
      links: links.links,
      width: vsize.width,
      height: vsize.height,
      align: "right",
      sort: true
    });

    // move the sankey x,y
    serviceNodes.forEach(n => {
      // override the default starting position with saved positions
      /*
      const key = `${n.nodeType}:${n.name}`;
      const pos = getSaved(key);
      if (pos) {
        n.x = pos.x;
        n.y = pos.y;
      }
      */
      // set sankey positions
      n.x0 = n.x;
      n.y0 = n.y;
      n.x1 = n.x0 + n.getWidth();
      n.y1 = n.y0 + n.getHeight();
    });
    this.collapseNodes();
    // regen the link.paths
    Sankey().update(graph);
    // generate our own paths
    links.links.forEach(link => {
      link.sankeyPath = fixPath(link);
      link.path = genPath(link);
    });
    return newSize;
  };

  createMasksSelection = svg =>
    svg
      .append("svg:g")
      .attr("class", "masks")
      .selectAll("g");

  createServicesSelection = svg =>
    svg
      .append("svg:g")
      .attr("class", "services")
      .selectAll("g.service-type");

  createLinksSelection = svg =>
    svg
      .append("svg:g")
      .attr("class", "links")
      .selectAll("g");

  setupMasks = viewer => {
    const links = this.serviceLinks.links;
    const sources = links.map(l => ({
      mask: "source",
      link: l,
      uid: `MaskSource-${l.uid}`
    }));
    const targets = links.map(l => ({
      mask: "target",
      link: l,
      uid: `MaskTarget-${l.uid}`
    }));
    const selection = this.masksSelection.data(
      [...sources, ...targets],
      d => d.uid
    );
    selection.exit().remove();
    const enter = selection.enter().append("g");
    enter.append("path").attr("class", "mask");

    return selection;
  };

  setupServicesSelection = viewer => {
    const selection = this.servicesSelection.data(
      this.serviceNodes.nodes,
      d => d.address
    );

    selection.exit().remove();
    const serviceTypesEnter = selection
      .enter()
      .append("svg:g")
      .attr("class", "service-type")
      .classed("extra", d => d.extra)
      .attr("transform", d => {
        return `translate(${d.x},${d.y})`;
      });

    serviceTypesEnter.append("svg:title").text(d => d.name);

    serviceTypesEnter
      .append("svg:rect")
      .attr("class", "service-type")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("width", d => Math.max(ServiceWidth, d.getWidth()))
      .attr("height", d => d.getHeight())
      .attr("fill", "#FFFFFF");

    serviceTypesEnter
      .append("svg:text")
      .attr("class", "service-type")
      .attr("x", d => Math.max(ServiceWidth, d.getWidth()) / 2)
      .attr("y", d => d.getHeight() / 2)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d => d.shortName);

    const links = this.serviceLinks.links;
    // draw circle on right if this serviceType
    // is a source of a link
    serviceTypesEnter
      .filter(d => {
        return links.some(l => l.source.name === d.name);
      })
      .append("svg:circle")
      .attr("class", "end-point source")
      .attr("r", 6)
      .attr("cx", d => Math.max(ServiceWidth, d.getWidth()))
      .attr("cy", 20);

    // draw diamond on left if this serviceType
    // is a target of a link
    serviceTypesEnter
      .filter(d => {
        return links.some(l => l.target.name === d.name);
      })
      .append("svg:rect")
      .attr("class", "end-point source")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 10)
      .attr("height", 10)
      .attr("transform", "translate(0,13) rotate(45)");

    serviceTypesEnter
      .on("mousedown", d => {
        if (this.view === "servicesankey") {
          d3.event.stopPropagation();
          d3.event.preventDefault();
        }
      })
      .on("mouseover", function(d) {
        // highlight this service-type and it's connected service-types
        d.selected = true;
        viewer.highlightServiceType(true, d3.select(this), d, viewer);
        viewer.opaqueServiceType(d);
        viewer.restart();
        //}
        d3.event.stopPropagation();
      })
      .on("mouseout", function(d) {
        d.selected = false;
        viewer.highlightServiceType(false, d3.select(this), d, viewer);
        viewer.restart();
        d3.event.stopPropagation();
      })
      .on("click", function(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        viewer.showChord(d);
        viewer.showCard(d);
        d3.event.stopPropagation();
        d3.event.preventDefault();
      });

    selection.classed("selected", d => d.selected);

    // adjust service name text based on its size
    selection.select("text.service-type").text(function(d) {
      if (!d.ellipseName) {
        d.ellipseName = d.shortName;
        let { width } = this.getBBox();
        let first = d.shortName.length - 4;
        while (width > d.getWidth() - 20) {
          --first;
          d.ellipseName = `${d.shortName.substr(
            0,
            first
          )}...${d.shortName.slice(-4)}`;
          this.innerHTML = d.ellipseName;
          width = this.getBBox().width;
        }
      }
      return d.ellipseName;
    });

    return selection;
  };

  setupLinksSelection = viewer => {
    // serviceLinksSelection is a selection of all g elements under the g.links svg:group
    // here we associate the links.links array with the {g.links g} selection
    // based on the link.uid
    const links = this.serviceLinks.links;
    const selection = this.linksSelection.data(links, d => d.uid);
    // remove old links
    selection.exit().remove();

    // add new links. if a link with a new uid is found in the data, add a new path
    let enterpath = selection.enter().append("g");

    // the d attribute of the following path elements is set in tick()
    enterpath
      .append("path")
      .attr("class", "service")
      .classed("forceBlack", true)
      .classed("tcp", d => d.target.protocol === "tcp")
      .attr("stroke", d => lighten(-0.05, d.target.color)) //linkColor(d, links))
      .attr("stroke-width", 2);

    enterpath
      .append("path")
      .attr("class", "servicesankeyDir")
      .attr("id", d => `dir-${d.source.name}-${d.target.name}`);

    enterpath
      .append("path")
      .attr("class", "hittarget")
      .attr("id", d => `hitpath-${d.source.uid()}-${d.target.uid()}`)
      .on("mouseover", function(d) {
        // mouse over a path
        d.selected = true;
        viewer.highlightConnection(true, d3.select(this), d, viewer);
        viewer.popupCancelled = false;
        viewer.showLinkInfo(d);
        viewer.restart();
      })
      .on("mouseout", function(d) {
        viewer.handleMouseOutPath(d);
        viewer.highlightConnection(false, d3.select(this), d, viewer);
        d.selected = false;
        viewer.clearPopups();
        viewer.restart();
      })
      // left click a path
      .on("click", d => {
        d3.event.stopPropagation();
        viewer.clearPopups();
        viewer.showLinkInfo(d);
      });

    enterpath
      .append("text")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .append("textPath")
      .attr("class", "stats")
      .attr("text-anchor", "middle")
      .attr("startOffset", "50%")
      .attr("text-length", "100%")
      .attr("href", d => `#statPath-${d.source.name}-${d.target.name}`);

    // update each existing {g.links g.link} element
    selection
      .select(".service")
      .classed("selected", function(d) {
        return d.selected;
      })
      .classed("highlighted", function(d) {
        return d.highlighted;
      })
      // reset the markers based on current highlighted/selected
      .attr("marker-end", d =>
        d.cls !== "network"
          ? `url(#${d.target.protocol === "tcp" ? "tcp-end" : "end--15"})`
          : null
      );

    this.selectionSetBlack();
    d3.selectAll("path.mask").classed("selected", d => d.link.selected);

    viewer.setLinkStat();
    return selection;
  };

  selectionSetBlack = () => {
    d3.selectAll("path.service").classed("forceBlack", d => d.black);
  };
  serviceHeight = (n, expanded) => {
    if (expanded === undefined) {
      expanded = n.expanded;
    }
    if (expanded && n.sankeyHeight) {
      return Math.max(n.sankeyHeight, ServiceHeight);
    }
    return ServiceHeight;
  };

  serviceWidth = (node, expanded) => {
    return ServiceWidth;
  };

  dragStart = d => {
    d.x = d.x0;
    d.y = d.y0;
  };

  drag = d => {
    d.x = d.x0 = d.px;
    d.y = d.y0 = d.py;
  };

  tick = () => {
    this.servicesSelection.attr("transform", d => {
      d.x0 = d.x;
      d.y0 = d.y;
      d.x1 = d.x0 + d.getWidth();
      d.y1 = d.y0 + d.getHeight();
      return `translate(${d.x},${d.y})`;
    });
    updateSankey({
      nodes: this.serviceNodes.nodes,
      links: this.serviceLinks.links
    });
  };

  drawViewPath = sankey => {
    circularize(this.serviceLinks.links);
    this.linksSelection.selectAll("path").attr("d", d => {
      if (sankey) {
        return d.sankeyPath;
      } else {
        return genPath(d);
      }
    });
    this.masksSelection
      .selectAll("path")
      .attr("d", d => genPath(d.link, undefined, d.mask));
  };

  collapseNodes = () => {
    this.serviceNodes.nodes.forEach(n => {
      n.expanded = false;
    });
  };
  expandNodes = () => {
    this.serviceNodes.nodes.forEach(n => {
      n.expanded = true;
    });
  };

  reGenPaths = () => {
    this.serviceLinks.links.forEach(link => {
      link.path = genPath(link);
    });
  };

  setBlack = black => {
    this.serviceLinks.links.forEach(l => (l.black = black));
  };

  setLinkStat = (sankey, props) => {
    setLinkStat(
      this.linksSelection,
      sankey ? "servicesankeyDir" : "service",
      props.options.link.stat,
      props.getShowStat()
    );
  };

  setupDrag = drag => {
    this.servicesSelection.call(drag);
  };

  transition = (sankey, initial, color, viewer) => {
    if (sankey) {
      return this.toServiceSankey(initial, viewer.setLinkStat);
    } else {
      return this.toService(initial, viewer.setLinkStat, color);
    }
  };

  toService = (initial, setLinkStat, color) => {
    return new Promise((resolve, reject) => {
      // Note: all the transitions happen concurrently
      if (initial) {
        d3.selectAll("g.service-type")
          .attr("transform", d => {
            return `translate(${d.x},${d.y})`;
          })
          .attr("opacity", 1);
      }

      d3.select("g.masks").style("display", "none");

      d3.selectAll("path.servicesankeyDir")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 0)
        .attrTween("d", function(d, i) {
          const previous = d.sankeyPath; //d3.select(this).attr("d"); //d.sankeyPath;
          const current = genPath(d);
          return interpolatePath(previous, current);
        })
        .each("end", function(d) {
          d3.select(this).style("display", "none");
        });

      d3.selectAll("g.service")
        .style("display", "block")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1);

      d3.selectAll(".end-point")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1);

      // shrink the hittarget paths
      d3.selectAll("path.hittarget")
        .attr("d", d => d.path)
        .attr("stroke-width", 20);

      // show the services
      d3.selectAll("g.services").style("display", "block");
      // put the service-type groups in their proper location
      d3.selectAll("g.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .attr("opacity", 1)
        .call(endall, () => {
          resolve();
        });

      // collapse the rects (getWidth() and getHeight() will return non-expanded sizes)
      d3.selectAll("rect.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("fill", d => d.lightColor)
        .attr("width", d => d.getWidth())
        .attr("height", d => d.getHeight())
        .attr("opacity", 1);

      // move the address text to the middle
      d3.selectAll("text.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("y", d => d.getHeight() / 2)
        .attr("opacity", 1);

      d3.selectAll("path.mask")
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", 1)
        .attr("stroke", d => d.link.target.color)
        .attr("opacity", 0)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = genPath(d.link, undefined, d.mask, true);
          return interpolatePath(previous, current);
        });

      // change the path's width and location
      if (initial) {
        d3.selectAll("path.service")
          .classed("forceBlack", color ? false : true)
          .attr("stroke", d => (color ? d.getColor() : null))
          .attr("opacity", 1)
          .attr("d", d => d.path)
          .attr("stroke-dasharray", function(d) {
            d.pathLen = this.getTotalLength();
            return `${d.pathLen} ${d.pathLen}`;
          })
          .attr("stroke-dashoffset", d => d.pathLen)
          .transition()
          .duration(VIEW_DURATION / 2)
          .attr("stroke-dashoffset", 0)
          .each("end", function(d) {
            d3.select(this).attr("stroke-dasharray", null);
          });
      } else {
        d3.selectAll("path.service")
          .transition()
          .duration(VIEW_DURATION)
          .attr("stroke", d => (color ? d.getColor() : "black"))
          .attr("stroke-width", 2)
          .attr("opacity", 1)
          .attrTween("d", function(d, i) {
            const previous = d.sankeyPath; //d3.select(this).attr("d"); //d.sankeyPath;
            const current = genPath(d); // d.path; //
            const ip = interpolatePath(previous, current);
            return t => {
              setLinkStat();
              return ip(t);
            };
          });
      }
    });
  };

  toServiceSankey = (initial, setLinkStat) => {
    return new Promise(resolve => {
      d3.selectAll(".end-point")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 0);

      // move the service rects to their traffic locations
      d3.selectAll("g.service-type")
        .filter(d => !d.extra)
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .call(endall, () => {
          resolve();
        });

      // expand services to traffic height
      d3.selectAll("rect.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("height", d => d.getHeight())
        .attr("fill", d => d.lightColor)
        .attr("opacity", 1);

      // put service names in middle of rect
      d3.selectAll("text.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("y", d => d.getHeight() / 2)
        .attr("opacity", 1);

      // expand the hittarget paths
      d3.selectAll("path.hittarget")
        .attr("d", d => d.sankeyPath)
        .attr("stroke-width", d => Math.max(6, d.width));

      // change the path's width
      d3.selectAll("path.service")
        .attr("stroke", d => d.target.color)
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("opacity", 0.5)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = genPath(d); //d.sankeyPath; //genPath(d, "service");
          const ip = interpolatePath(previous, current);
          return t => {
            setLinkStat();
            return ip(t);
          };
        });
      d3.select("g.masks").style("display", "block");

      d3.selectAll("path.mask")
        .attr("stroke-width", 2)
        .attr("opacity", 0)
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", d => Math.max(1, d.link.width))
        .attr("stroke", d => d.link.target.color)
        .attr("opacity", 0.5)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = genPath(d.link, undefined, d.mask, true);
          return interpolatePath(previous, current);
        });

      // show the serviceTraffic arrows in the links
      d3.selectAll("path.servicesankeyDir")
        .style("display", "block")
        .attr("opacity", 0)
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", 1)
        .attr("opacity", 1)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = d.sankeyPath;
          return interpolatePath(previous, current);
        });
    });
  };
}
