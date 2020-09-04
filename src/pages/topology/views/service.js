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
import { utils } from "../../../utilities";
import { genPath } from "../../../paths";

import { interpolatePath } from "d3-interpolate-path";
import { Node, Nodes } from "../nodes.js";
import { Links } from "../links.js";
import ServiceCard from "../cards/serviceCard";
import LinkCard from "../cards/linkCard";
const SERVICE_POSITION = "svc";
const ZOOM_SCALE = "sscale";
const ZOOM_TRANSLATE = "strans";
const SERVICE_OPTIONS = "srvopts";
const SERVICE_TABLE_OPTIONS = "srvtblopts";
const SERVICE_DETAIL_OPTIONS = "srvdtlopts";
const DEFAULT_DETAIL_OPTIONS = {
  item: undefined,
};
const DEFAULT_OPTIONS = {
  radio: false,
  traffic: false,
  showMetric: false,
  hideChart: false,
  http: "bytes_out",
  tcp: "bytes_out",
};
const DEFAULT_TABLE_OPTIONS = {
  page: 1,
  sortBy: "",
  filterBy: "",
  perPage: 10,
};

export class Service {
  constructor(data) {
    this.data = data;
    this.serviceNodes = new Nodes();
    this.serviceLinks = new Links();
    this.nodes = () => this.serviceNodes;
    this.links = () => this.serviceLinks;
    this.fields = [
      { title: "Name", field: "address" },
      { title: "Protocol", field: "protocol" },
    ];
    this.card = new ServiceCard(data);
    this.linkCard = new LinkCard();
  }

  createSelections(svg) {
    this.createStatsGroup(svg);
    this.servicesSelection = this.createServicesSelection(svg);
    this.linksSelection = this.createLinksSelection(svg);
  }

  setupSelections(viewer) {
    this.setupStats();
    this.servicesSelection = this.setupServicesSelection(viewer);
    this.linksSelection = this.setupLinksSelection(viewer);
  }

  initNodesAndLinks = (viewer) => {
    this.initNodes(this.serviceNodes, false);
    const vsize = { width: viewer.width, height: viewer.height };
    const size = this.initLinks(
      this.serviceNodes.nodes,
      this.serviceLinks,
      vsize,
      viewer
    );
    return { nodeCount: this.serviceNodes.nodes.length, size };
  };

  updateNodesAndLinks = (viewer) => {
    const newNodes = new Nodes();
    const newLinks = new Links();
    this.initNodes(newNodes, false);
    const vsize = { width: viewer.width, height: viewer.height };
    this.initLinks(newNodes.nodes, newLinks, vsize, viewer);
    utils.reconcileArrays(this.serviceNodes.nodes, newNodes.nodes);
    utils.reconcileLinks(this.serviceLinks.links, newLinks.links);
    // remove old nodes/links and add new nodes/links to svg
    viewer.restart();
  };

  initNodes(serviceNodes, includeDuplicate) {
    this.data.adapter.data.services.forEach((service) => {
      // if we haven't already added this service || or we want duplicates
      if (
        includeDuplicate ||
        !serviceNodes.nodes.some((n) => n.address === service.address)
      ) {
        // get the sites in which this service is deployed
        let serviceSites = this.data.adapter.getServiceSites(service);
        serviceSites.forEach((site, i) => {
          if (i === 0 || includeDuplicate) {
            const subNode = new Node({
              name: service.address,
              nodeType: "service",
              fixed: true,
              heightFn: this.serviceHeight,
              widthFn: this.serviceWidth,
            });
            subNode.mergeWith(service);
            subNode.lightColor = d3
              .rgb(utils.serviceColor(subNode.name))
              .brighter(0.6);
            subNode.color = utils.serviceColor(subNode.name);
            subNode.cluster = site;
            subNode.shortName = utils.shortName(subNode.name);
            if (i > 0) {
              subNode.extra = true;
            }
            subNode.uuid = `${site.site_id}-${subNode.address}`;
            serviceNodes.add(subNode);
          }
        });
      }
    });
  }

  // initialize the service to service links for the service view
  initLinks = (serviceNodes, links, vsize, viewer) => {
    //const options = viewer.state.options;
    let stat = viewer.statForProtocol();
    if (stat === "bytes_in") stat = "bytes_out";
    this.data.adapter.data.deploymentLinks.forEach((deploymentLink) => {
      const source = serviceNodes.find(
        (n) => n.address === deploymentLink.source.service.address
      );
      const target = serviceNodes.find(
        (n) => n.address === deploymentLink.target.service.address
      );
      const found = links.links.find(
        (l) =>
          l.source.address === source.address &&
          l.target.address === target.address
      );
      if (!found) {
        const linkIndex = links.getLink(
          source,
          target,
          "out",
          "link",
          `Link-${deploymentLink.source.site.site_id}-${source.address}-${deploymentLink.target.site.site_id}-${target.address}`
        );
        const link = links.links[Math.abs(linkIndex)];
        link.request = deploymentLink.request;
        link.value = link.request[stat] || 0;
        link.getColor = () => utils.linkColor(link, links.links);
      } else {
        let value = deploymentLink.request[stat] || 0;
        if (stat === "latency_max") {
          value = Math.max(value, found.value);
        } else {
          value += found.value;
        }
        utils.aggregateAttributes(deploymentLink.request, found.request);
        found.value = value;
      }
    });

    // get the service heights for use with the servicesankey view
    utils.initSankey({
      nodes: serviceNodes,
      links: links.links,
      width: vsize.width,
      height: vsize.height - 50,
      nodeWidth: utils.ServiceWidth,
      nodePadding: utils.ClusterPadding,
      left: 50,
      top: 20,
      right: 50,
      bottom: 10,
    });

    // set the expanded height
    serviceNodes.forEach((n) => {
      n.sankeyHeight = Math.max(n.y1 - n.y0, utils.ServiceHeight);
      n.expanded = true;
    });

    // set the x,y based on links and expanded node sizes
    const newSize = utils.adjustPositions({
      nodes: serviceNodes,
      links: links.links,
      width: vsize.width,
      height: vsize.height - 50,
      align: "right",
      sort: true,
    });
    // move the sankey x,y
    serviceNodes.forEach((n) => {
      // override the default starting position with saved positions
      const key = `${SERVICE_POSITION}-${this.uid(n)}`;
      const pos = utils.getSaved(key);
      if (pos) {
        n.x = pos.x;
        n.y = pos.y;
        n.x0 = pos.x0;
        n.y0 = pos.y0;
      } else {
        n.x0 = n.x;
        n.y0 = n.y;
      }
      // set sankey heights
      n.x1 = n.x0 + n.getWidth();
      n.y1 = n.y0 + n.getHeight(); // node is expanded
      n.expanded = false; // now it isn't expanded
    });

    // regen the link.paths
    utils.updateSankey({ nodes: serviceNodes, links: links.links });
    //Sankey().update({ nodes: serviceNodes, links: links.links });
    return newSize;
  };
  uid = (n) => `${n.cluster.site_id}-${n.name}`;

  createStatsGroup = (svg) => svg.append("svg:defs").attr("class", "statPaths");

  createServicesSelection = (svg) =>
    svg
      .append("svg:g")
      .attr("class", "services")
      .selectAll("g.service-type");

  createLinksSelection = (svg) =>
    svg
      .append("svg:g")
      .attr("class", "links")
      .selectAll("g");

  setupStats = () => {
    const selection = d3
      .select("defs.statPaths")
      .selectAll("path")
      .data(this.serviceLinks.links, (d) => d.uid);
    selection.exit().remove();
    selection
      .enter()
      .append("path")
      .attr("id", (d) => utils.statId(d));
  };

  setupServicesSelection = (viewer) => {
    const self = this;
    const selection = this.servicesSelection.data(
      this.serviceNodes.nodes,
      (d) => `${d.cluster.site_id}-${d.address}`
    );

    selection.exit().each((d) => {
      utils.removeServiceColor(d.address);
    });
    selection.exit().remove();
    const serviceTypesEnter = selection
      .enter()
      .append("svg:g")
      .attr("class", "service-type")
      .classed("extra", (d) => d.extra)
      .attr("transform", (d) => {
        return `translate(${d.x},${d.y})`;
      });

    serviceTypesEnter.append("svg:title").text((d) => d.shortName);

    serviceTypesEnter
      .append("svg:rect")
      .attr("class", "service-type")
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("width", (d) => d.getWidth())
      .attr("height", (d) => d.getHeight())
      .attr("fill", "#FFFFFF");

    serviceTypesEnter
      .append("svg:text")
      .attr("class", "service-type")
      .text(function(d) {
        this.innerHTML = d.shortName;
        let width = this.getBBox().width + 20;
        let contentWidth = Math.max(Math.min(utils.ServiceWidth, width), 80);
        let ellipseName = d.shortName;
        let first = ellipseName.length - 4;
        while (width > contentWidth) {
          --first;
          ellipseName = `${d.shortName.substr(0, first)}...${d.shortName.slice(
            -4
          )}`;
          this.innerHTML = ellipseName;
          width = this.getBBox().width + 20;
        }
        d.contentWidth = contentWidth;
        return ellipseName;
      })
      .attr("x", (d) => d.getWidth() / 2)
      .attr("y", (d) => d.getHeight() / 2)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle");

    serviceTypesEnter
      .selectAll("rect.service-type")
      .attr("width", (d) => d.getWidth());

    const links = this.serviceLinks.links;
    // draw circle on right if this serviceType
    // is a source of a link
    serviceTypesEnter
      .filter((d) => {
        return links.some((l) => l.source.name === d.name);
      })
      .append("svg:circle")
      .attr("class", "end-point source")
      .attr("r", 6)
      .attr("cx", (d) => d.getWidth())
      .attr("cy", 20);

    // draw diamond on left if this serviceType
    // is a target of a link
    serviceTypesEnter
      .filter((d) => {
        return links.some((l) => l.target.name === d.name);
      })
      .append("svg:rect")
      .attr("class", "end-point source")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 10)
      .attr("height", 10)
      .attr("transform", "translate(0,13) rotate(45)");

    serviceTypesEnter
      .on("mouseover", function(d) {
        // highlight this service-type and it's connected service-types
        viewer.blurAll(true, d);
        self.selectServiceType(d);
        viewer.restart();
        d3.event.stopPropagation();
      })
      .on("mouseout", function(d) {
        self.unSelectAll();
        viewer.blurAll(false, d);
        viewer.restart();
        d3.event.stopPropagation();
      })
      .on("click", (d) => {
        if (d3.event.defaultPrevented) return; // click suppressed
        viewer.showChord(d);
        viewer.showPopup(d, this.card);
        d3.event.stopPropagation();
        d3.event.preventDefault();
      });

    selection.classed("selected", (d) => d.selected);

    selection.classed("hidden", (d) => d.cluster.site_name === "unknown");
    return selection;
  };

  setupLinksSelection = (viewer) => {
    const self = this;
    // serviceLinksSelection is a selection of all g elements under the g.links svg:group
    // here we associate the links.links array with the {g.links g} selection
    // based on the link.uid
    const links = this.serviceLinks.links;
    const selection = this.linksSelection.data(links, (d) => d.uid);
    // remove old links
    selection.exit().remove();

    // add new links. if a link with a new uid is found in the data, add a new path
    let enterpath = selection.enter().append("g");

    // the d attribute of the following path elements is set in tick()
    enterpath.append("path").attr("class", "service");

    enterpath
      .append("path")
      .attr("class", "servicesankeyDir")
      .classed("tcp", (d) => d.target.protocol === "tcp")
      .attr("stroke-width", 2)
      .attr("id", (d) => `dir-${d.source.name}-${d.target.name}`)
      // reset the markers based on current highlighted/selected
      .attr(
        "marker-end",
        (d) => `url(#${d.target.protocol === "tcp" ? "http-end" : "end--15"})`
      );

    enterpath
      .append("path")
      .attr("class", "hittarget")
      .attr("id", (d) => `hitpath-${d.source.uid()}-${d.target.uid()}`)
      .on("mouseover", (d) => {
        // mouse over a path
        viewer.blurAll(true, d);
        this.selectLink(d);
        viewer.popupCancelled = false;
        viewer.showPopup(d, this.linkCard);
        viewer.restart();
      })
      .on("mouseout", function(d) {
        self.unSelectAll();
        viewer.blurAll(false, d);
        //viewer.handleMouseOutPath(d);
        //viewer.highlightConnection(false, d3.select(this), d, viewer);
        viewer.clearPopups();
        viewer.restart();
      })
      // left click a path
      .on("click", (d) => {
        d3.event.stopPropagation();
        viewer.clearPopups();
      });

    enterpath
      .append("text")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .append("textPath")
      .attr("class", "stats")
      .attr("side", "left")
      .attr("text-anchor", "middle")
      .attr("startOffset", "50%")
      .attr("text-length", "100%")
      .attr("href", (d) => `#${utils.statId(d)}`);

    // update each existing {g.links g.link} element
    selection
      .select(".service")
      .classed("selected", (d) => d.selected)
      .classed("highlighted", (d) => d.highlighted);

    selection.select(".hittarget").classed("selected", (d) => d.selected);
    selection
      .select(".servicesankeyDir")
      .classed("selected", (d) => d.selected);
    viewer.setLinkStat();
    return selection;
  };

  serviceHeight = (n, expanded) => {
    if (expanded === undefined) {
      expanded = n.expanded;
    }
    if (n["user-hidden"]) {
      return 4;
    }
    if (expanded && n.sankeyHeight) {
      return Math.max(n.sankeyHeight, utils.ServiceHeight);
    }
    return utils.ServiceHeight;
  };

  serviceWidth = (node, expanded) => {
    return node["user-hidden"]
      ? 4
      : node.contentWidth
      ? node.contentWidth
      : utils.ServiceWidth;
  };

  // returns true if any path or service is currently selected.
  // selected means that the mouse is hoving over it
  anySelected = () =>
    this.serviceNodes.nodes.some((n) => n.selected) ||
    this.serviceLinks.links.some((l) => l.selected);

  unSelectAll = () => {
    this.serviceLinks.links.forEach((l) => (l.selected = false));
    this.serviceNodes.nodes.forEach((n) => (n.selected = false));
  };
  selectServiceType = (d) => {
    d.selected = true;
    this.serviceLinks.links.forEach((l) => {
      if (l.source.name === d.name || l.target.name === d.name) {
        l.selected = true;
        l.source.selected = true;
        l.target.selected = true;
      }
    });
  };
  selectLink = (l) => {
    l.selected = true;
    l.source.selected = true;
    l.target.selected = true;
  };
  setupServiceNodePositions = (sankey) => {
    this.serviceNodes.nodes.forEach((n) => {
      n.x = n.x0;
      n.y = n.y0;
    });
    this.drawViewPaths(sankey);
  };

  savePosition = (d) => {
    utils.setSaved(`${SERVICE_POSITION}-${this.uid(d)}`, {
      x: d.x,
      y: d.y,
      x0: d.x0,
      y0: d.y0,
    });
  };
  dragStart = (d) => {
    d.x = d.x0;
    d.y = d.y0;
    this.savePosition(d);
  };

  drag = (d) => {
    d.x = d.x0 = d.px;
    d.y = d.y0 = d.py;
    this.savePosition(d);
  };
  dragEnd = () => {};
  drawViewNodes(sankey) {
    this.servicesSelection.attr("transform", (d) => {
      d.x0 = d.x;
      d.y0 = d.y;
      d.x1 = d.x0 + d.getWidth();
      d.y1 = d.y0 + d.getHeight();
      return `translate(${d.x},${d.y})`;
    });
  }

  drawViewPaths(sankey) {
    utils.updateSankey({
      nodes: this.serviceNodes.nodes,
      links: this.serviceLinks.links,
    });
    this.linksSelection
      .selectAll("path.service")
      .attr("d", (d) => genPath({ link: d, sankey: true }));

    this.linksSelection
      .selectAll("path.servicesankeyDir")
      .attr("d", (d) => genPath({ link: d, width: sankey ? d.width : 1 }));

    this.linksSelection
      .selectAll("path.hittarget")
      .attr("stroke-width", (d) => (sankey ? Math.max(d.width, 6) : 6))
      .attr("d", (d) => genPath({ link: d }));

    d3.select("defs.statPaths")
      .selectAll("path")
      .attr("d", (d) =>
        genPath({
          link: d,
          reverse: d.circular,
          offsetY: 4,
        })
      );
  }

  collapseNodes() {
    this.serviceNodes.nodes.forEach((n) => {
      n.expanded = false;
    });
  }
  expandNodes() {
    this.serviceNodes.nodes.forEach((n) => {
      n.expanded = true;
    });
  }

  setLinkStat = (show, stat) => {
    utils.setLinkStat(this.linksSelection, show, stat);
  };

  setupDrag(drag) {
    this.servicesSelection.call(drag);
  }
  highlightLink(highlight, link, d, sankey, color) {
    this.linksSelection
      .selectAll("path.service")
      .filter((d1) => d1 === d)
      .attr("opacity", highlight ? (sankey ? 0.8 : 0) : sankey ? 0.5 : 0);

    this.linksSelection
      .selectAll("path.servicesankeyDir")
      .filter((d1) => d1 === d)
      .attr("opacity", 1);

    // highlight/blur the services on each end of the link
    this.servicesSelection
      .filter(
        (d1) =>
          d1.address === d.source.address || d1.address === d.target.address
      )
      .attr("opacity", 1);
  }

  blurAll(blur, d, sankey, color) {
    if (blur || !this.anySelected()) {
      const opacity = blur ? 0.25 : 1;
      this.servicesSelection.attr("opacity", opacity);
      if (sankey) {
        this.linksSelection
          .selectAll("path.service")
          .attr("opacity", blur ? (color ? 0 : 0.25) : 0.5);
      }
      this.linksSelection
        .selectAll("path.servicesankeyDir")
        .attr("opacity", blur ? 0.25 : 1);
      this.linksSelection
        .selectAll("path.hittarget")
        .attr("opacity", blur ? (color ? 0.125 : 0.25) : 0.125);
      this.linksSelection
        .selectAll("text")
        .attr("opacity", (l) => (blur && l !== d ? 0.25 : 1));
    }
  }

  transition(sankey, initial, color, viewer) {
    const duration = initial ? 0 : utils.VIEW_DURATION;
    viewer.setLinkStat();
    this.setupServiceNodePositions(sankey);
    if (sankey) {
      return this.toServiceSankey(duration);
    } else {
      return this.toServiceColor(duration, color);
    }
  }

  toServiceColor = (duration, color) => {
    return new Promise((resolve) => {
      const self = this;
      // Note: all the transitions happen concurrently
      d3.selectAll("g.service-type")
        .transition()
        .duration(duration)
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .attr("opacity", function(d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        })
        .call(utils.endall, () => {
          resolve();
        });

      d3.select("defs.statPaths")
        .selectAll("path")
        .transition()
        .duration(duration)
        .attrTween("d", function(d) {
          const previous = d3.select(this).attr("d");
          const current = genPath({
            link: d,
            reverse: d.circular,
            offsetY: 4,
          });
          return interpolatePath(previous, current);
        });

      d3.select("#SVG_ID")
        .selectAll("path.servicesankeyDir")
        .transition()
        .duration(duration)
        .attr("stroke", (d) => (color ? d.getColor() : "black"))
        .attr("stroke-width", 1)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = genPath({ link: d });
          return interpolatePath(previous, current);
        });

      d3.select("#SVG_ID")
        .selectAll(".end-point")
        .style("display", null);

      // shrink the hittarget paths
      d3.selectAll("path.hittarget")
        .attr("d", (d) => genPath({ link: d }))
        .attr("stroke-width", 6)
        .attr("stroke", (d) => (color ? d.getColor() : null))
        .attr("opacity", function(d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : color ? 0.125 : null;
        });

      // collapse the rects (getWidth() and getHeight() will return non-expanded sizes)
      d3.selectAll("rect.service-type")
        .transition()
        .duration(duration)
        .attr("fill", (d) => d.lightColor)
        .attr("width", (d) => d.getWidth())
        .attr("height", (d) => d.getHeight())
        .attr("opacity", function(d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        });

      // move the address text to the middle
      d3.selectAll("text.service-type")
        .transition()
        .duration(duration)
        .attr("y", (d) => d.getHeight() / 2)
        .attr("opacity", function(d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        });

      // change the path's width and location
      d3.select("#SVG_ID")
        .selectAll("path.service")
        .transition()
        .duration(duration)
        .attr("stroke", (d) => (color ? d.getColor() : null))
        .attr("stroke-width", 0)
        .attr("opacity", 0)
        .attrTween("d", function(d) {
          const previous = d3.select(this).attr("d");
          const current = genPath({ link: d, sankey: true, width: 2 });
          return interpolatePath(previous, current);
        })
        .each("end", function(d) {
          d3.select(this).style("display", "none");
        });
    });
  };

  toServiceSankey = (duration) => {
    return new Promise((resolve) => {
      const self = this;
      d3.select("#SVG_ID")
        .selectAll(".end-point")
        .style("display", "none");

      // move the service rects to their sankey locations
      d3.selectAll("g.service-type")
        .transition()
        .duration(duration)
        .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
        .call(utils.endall, () => {
          resolve();
        });

      // expand services to traffic height
      d3.selectAll("rect.service-type")
        .transition()
        .duration(duration)
        .attr("height", (d) => d.getHeight())
        .attr("fill", (d) => d.lightColor)
        .attr("opacity", function(d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        });

      // put service names in middle of rect
      d3.selectAll("text.service-type")
        .transition()
        .duration(duration)
        .attr("y", (d) => d.getHeight() / 2)
        .attr("opacity", function(d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 1;
        });

      // expand the hittarget paths
      d3.selectAll("path.hittarget")
        .attr("d", (d) => genPath({ link: d, width: d.width }))
        .attr("stroke-width", (d) => Math.max(6, d.width))
        .attr("stroke", "transparent")
        .attr("opacity", null);

      // draw the sankey path
      d3.select("#SVG_ID")
        .selectAll("path.service")
        .style("display", null)
        .transition()
        .duration(duration)
        .attr("stroke", (d) => d.target.color)
        .attr("fill", (d) => d.target.color)
        .attr("stroke-width", 0)
        .attr("opacity", function(d) {
          const current = d3.select(this).attr("opacity");
          return self.anySelected() ? current : 0.5;
        })
        .attrTween("d", function(d) {
          let previous = d3.select(this).attr("d");
          const current = genPath({ link: d, sankey: true });
          return interpolatePath(previous, current);
        });

      d3.select("defs.statPaths")
        .selectAll("path")
        .transition()
        .duration(duration)
        .attrTween("d", function(d) {
          const previous = d3.select(this).attr("d");
          const current = genPath({
            link: d,
            reverse: d.circular,
            offsetY: 4,
          });
          return interpolatePath(previous, current);
        });

      // show the serviceTraffic arrows in the links
      d3.select("#SVG_ID")
        .selectAll("path.servicesankeyDir")
        .transition()
        .duration(duration)
        .attr("stroke-width", 1)
        .attr("stroke", "black")
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = genPath({ link: d, width: d.width });
          return interpolatePath(previous, current);
        });
    });
  };

  doFetch = (page, perPage) => {
    const data = this.serviceNodes.nodes.map((n) => ({
      cardData: n,
      address: n.shortName,
      protocol: n.protocol.toUpperCase(),
      deployedAt: this.data.adapter
        .getServiceSites(n)
        .map((site) => site.site_name)
        .join(", "),
    }));
    return new Promise((resolve) => {
      resolve({ data, page, perPage });
    });
  };

  allRequests = (VAN, direction, stat) => {
    const requests = {};
    const which = direction === "in" ? "source" : "target";
    VAN.deploymentLinks.forEach((deploymentLink) => {
      const address = deploymentLink[which].service.address;
      if (!requests.hasOwnProperty(address)) requests[address] = {};
      utils.aggregateAttributes(
        {
          key: address,
          service: address,
          shortName: utils.shortName(address),
          requests: deploymentLink.request[stat] || 0,
          color: utils.serviceColors[address],
        },
        requests[address]
      );
    });
    return requests;
  };

  specificRequests = (VAN, direction, stat, address) => {
    const requests = {};
    if (direction === "in" && stat === "bytes_out") {
      stat = "bytes_in";
    } else if (direction === "out" && stat === "bytes_in") {
      stat = "bytes_out";
    }
    const from = direction === "in" ? "source" : "target";
    const to = direction === "in" ? "target" : "source";
    VAN.deploymentLinks.forEach((deploymentLink) => {
      const fromAddress = deploymentLink[from].service.address;
      const toAddress = deploymentLink[to].service.address;
      if (fromAddress === address) {
        if (deploymentLink.request[stat] !== undefined) {
          if (!requests.hasOwnProperty(toAddress)) requests[toAddress] = {};
          utils.aggregateAttributes(
            {
              key: toAddress,
              toAddress,
              shortName: utils.shortName(toAddress),
              requests: deploymentLink.request[stat],
              color: utils.serviceColors[toAddress],
            },
            requests[toAddress]
          );
        }
      }
    });
    return requests;
  };

  allTimeSeries = ({ VAN, direction, stat, duration = "min" }) => {
    const requests = {};
    const which = direction === "in" ? "source" : "target";
    VAN.deploymentLinks.forEach((deploymentLink) => {
      const address = deploymentLink[which].service.address;
      const samples = utils.getHistory({
        histories: deploymentLink.history,
        stat,
        ago: duration === "min" ? 60 + 1 : 60 * 60 + 1,
        skipUndefined: true,
      });
      if (samples.length > 0) {
        if (!requests.hasOwnProperty(address)) {
          requests[address] = {
            key: address,
            service: address,
            shortName: utils.shortName(address),
            samples,
            color: utils.serviceColors[address],
          };
        } else {
          utils.combineSamples(requests[address].samples, samples);
        }
      }
    });
    return requests;
  };

  specificTimeSeries = ({
    VAN,
    direction,
    stat,
    duration = "min",
    address,
  }) => {
    const requests = {};
    if (direction === "in" && stat === "bytes_out") {
      stat = "bytes_in";
    } else if (direction === "out" && stat === "bytes_in") {
      stat = "bytes_out";
    }
    const from = direction === "in" ? "source" : "target";
    const to = direction === "in" ? "target" : "source";
    VAN.deploymentLinks.forEach((deploymentLink) => {
      const fromAddress = deploymentLink[from].service.address;
      const toAddress = deploymentLink[to].service.address;
      if (fromAddress === address) {
        const samples = utils.getHistory({
          histories: deploymentLink.history,
          stat,
          ago: duration === "min" ? 60 + 1 : 60 * 60 + 1,
          skipUndefined: true,
        });
        if (samples.length > 0) {
          if (!requests.hasOwnProperty(toAddress)) {
            requests[toAddress] = {
              key: toAddress, // used for chart mouseover to highlight the service
              toAddress,
              shortName: utils.shortName(toAddress),
              samples,
              color: utils.serviceColors[toAddress],
            };
          } else {
            utils.combineSamples(requests[toAddress].samples, samples);
          }
        }
      }
    });
    return requests;
  };

  chordOver(chord, over, viewer) {
    d3.select("#SVG_ID")
      .selectAll("path.service")
      .each(function(p) {
        if (
          `-${p.source.name}-${p.target.name}` === chord.key ||
          `-${p.target.name}-${p.source.name}` === chord.key
        ) {
          if (!over) {
            p.selected = false;
          }
          viewer.blurAll(over, p);
          if (over) {
            p.selected = true;
          }
          viewer.restart();
        }
      });
  }

  setClass(address, cls, viewer) {
    d3.selectAll("g.service-type").each(function(d) {
      const match = d.address.includes(address) && address.length > 0;
      d3.select(this).classed(cls, match);
      d[cls] = match;
    });
    viewer.restart();
  }

  arcOver(arc, over, viewer) {
    d3.selectAll("rect.service-type").each(function(d) {
      if (arc.key === d.address) {
        if (!over) {
          d.selected = false;
        }
        viewer.blurAll(over, d);
        if (over) {
          d.selected = true;
        }
        viewer.opaqueServiceType(d);
        viewer.restart();
      }
    });
  }
  getSavedZoom = (defaultScale) => {
    const savedScale = utils.getSaved(ZOOM_SCALE, defaultScale);
    const savedTranslate = utils.getSaved(ZOOM_TRANSLATE, [0, 0]);
    return { savedScale, savedTranslate };
  };
  saveZoom = (zoom) => {
    utils.setSaved(ZOOM_SCALE, zoom.scale());
    utils.setSaved(ZOOM_TRANSLATE, zoom.translate());
  };

  static saveOverrideOptions = (options) =>
    options.mode === "graph"
      ? utils.setOptions(SERVICE_OPTIONS, options, DEFAULT_OPTIONS)
      : utils.setOptions(SERVICE_TABLE_OPTIONS, options, DEFAULT_TABLE_OPTIONS);
  getGraphOptions = () => utils.getOptions(SERVICE_OPTIONS, DEFAULT_OPTIONS);
  saveGraphOptions = (options) => utils.setOptions(SERVICE_OPTIONS, options);
  getTableOptions = () =>
    utils.getOptions(SERVICE_TABLE_OPTIONS, DEFAULT_TABLE_OPTIONS);
  getDetailOptions = () =>
    utils.getOptions(SERVICE_DETAIL_OPTIONS, DEFAULT_DETAIL_OPTIONS);
  saveDetailOptions = (options) =>
    utils.setOptions(SERVICE_DETAIL_OPTIONS, options);
}
