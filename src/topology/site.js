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
  circularize,
  copy,
  genPath,
  linkColor,
  //getSaved,
  initSankey,
  lighten,
  pathBetween,
  Sankey,
  siteColor,
  setLinkStat,
  endall,
  VIEW_DURATION,
  ServiceWidth,
  ClusterPadding,
  SiteRadius
} from "../utilities";
import { interpolatePath } from "d3-interpolate-path";

import { Nodes } from "./nodes.js";
import { Links } from "./links.js";

export class Site {
  constructor(adapter) {
    this.adapter = adapter;
    this.siteNodes = new Nodes();
    this.routerLinks = new Links();
    this.trafficLinks = new Links();
    this.nodes = () => this.siteNodes;
    this.links = () => this.routerLinks;
  }

  createSelections = svg => {
    this.masksSelection = this.createMasksSelection(svg);
    this.sitesSelection = this.createSitesSelection(svg);
    this.routerLinksSelection = this.createRouterLinksSelection(svg);
    this.trafficLinksSelection = this.createTrafficLinksSelection(svg);
  };

  setupSelections = viewer => {
    this.masksSelection = this.setupMasks(viewer);
    this.sitesSelection = this.setupSitesSelection(viewer);
    this.trafficLinksSelection = this.setupTrafficLinks(viewer);
    this.routerLinksSelection = this.setupRouterLinks(viewer);
  };

  initNodesAndLinks = viewer => {
    this.initNodes(viewer);
    let vsize = { width: viewer.width, height: viewer.height };
    vsize = this.initRouterLinks(viewer, vsize);
    vsize = this.initTrafficLinks(viewer, vsize);
    return { nodeCount: this.siteNodes.nodes.length, size: vsize };
  };

  initNodes = viewer => {
    const clusters = this.adapter.data.sites;
    const siteNodes = this.siteNodes;
    clusters.forEach(cluster => {
      const name = cluster.site_name;

      const clusterNode = siteNodes.addUsing({
        name,
        nodeType: "cluster",
        fixed: true,
        heightFn: this.clusterHeight,
        widthFn: this.clusterWidth
      });
      clusterNode.mergeWith(cluster);
      clusterNode.color = siteColor(name);
      clusterNode.r = SiteRadius;
    });
  };

  initTrafficLinks = (viewer, vsize) => {
    const links = this.trafficLinks;
    const siteMatrix = this.adapter.siteMatrix();
    siteMatrix.forEach(record => {
      const found = links.links.find(
        l =>
          l.source.site_name === record.ingress &&
          l.target.site_name === record.egress
      );
      if (found) {
        found.value += record.messages;
        this.adapter.aggregateAttributes(record.request, found.request);
      } else {
        const linkIndex = links.addLink({
          source: this.siteNodes.nodes.find(
            n => n.site_name === record.ingress
          ),
          target: this.siteNodes.nodes.find(n => n.site_name === record.egress),
          dir: "in",
          cls: "siteTraffic",
          uid: `SiteLink-${record.ingress}-${record.egress}`
        });
        const link = links.links[linkIndex];
        link.value = record.messages;
        link.request = copy(record.request);
        link.getColor = () => linkColor(link, links.links);
      }
    });
    // site-to-site traffic
    const interSiteLinks = this.interSiteLinks();
    adjustPositions({
      nodes: this.siteNodes.nodes,
      links: interSiteLinks.links,
      width: viewer.width,
      height: viewer.height
    });

    const graph = {
      nodes: this.siteNodes.nodes,
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
    // move the sankey starting points to the site location
    this.siteNodes.nodes.forEach(n => {
      n.x0 = n.x;
      n.x1 = n.x + n.getWidth();
      n.y0 = n.y;
      n.y1 = n.y + n.getHeight();
    });
    // update the links
    Sankey().update(graph);
    return vsize;
  };

  initRouterLinks = (viewer, vsize) => {
    const nodes = this.siteNodes;
    const links = this.routerLinks;

    this.adapter.data.sites.forEach((site, i) => {
      const source = nodes.nodes.find(n => n.site_id === site.site_id);
      site.connected.forEach(targetSite => {
        const target = nodes.nodes.find(s => s.site_id === targetSite);
        links.getLink(
          source,
          target,
          "out",
          "cluster",
          `Link-${source.name}-${target.name}`
        );
      });
    });
    /*
    vsize = adjustPositions({
      nodes: nodes.nodes,
      links: links.links,
      width: vsize.width,
      height: vsize.height
    });
    */
    /*
    nodes.nodes.forEach(n => {
      // override the default starting position with saved positions
      const key = `${n.nodeType}:${n.name}`;
      const pos = getSaved(key);
      if (pos) {
        n.x = pos.x;
        n.y = pos.y;
      }
    });
    */
    return vsize;
  };

  createSitesSelection = svg =>
    svg
      .append("svg:g")
      .attr("class", "clusters")
      .selectAll("g.cluster")
      .attr("transform", d => `translate(${d.x},${d.y})`);

  createRouterLinksSelection = svg =>
    svg
      .append("svg:g")
      .attr("class", "siteLinks")
      .selectAll("g");

  createTrafficLinksSelection = svg =>
    svg
      .append("svg:g")
      .attr("class", "siteTrafficLinks")
      .selectAll("g");

  createMasksSelection = svg =>
    svg
      .append("svg:g")
      .attr("class", "masks")
      .selectAll("g");

  setupMasks = viewer => {
    const links = this.trafficLinks.links;
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

  setupSitesSelection = viewer => {
    const selection = this.sitesSelection.data(this.siteNodes.nodes, function(
      d
    ) {
      return d.uid();
    });

    // remove old nodes
    selection.exit().remove();

    // add new circle nodes
    // add an svg:g with class "cluster" for each node in the data
    const enterCircle = selection
      .enter()
      .append("g")
      .attr("class", "cluster site")
      .attr(
        "transform",
        d =>
          `translate(${viewer.width / 2 - d.getWidth() / 2},${viewer.height /
            2 -
            d.getHeight() / 2})`
      )
      .attr("id", d => `$cluster-${d.name}`);

    const rects = enterCircle
      .append("svg:g")
      .attr("class", "cluster-rects")
      .attr("opacity", 1);

    rects
      .append("svg:circle")
      .attr("class", "network")
      .attr("r", d => d.r)
      .attr("cx", d => d.r)
      .attr("cy", d => d.r)
      .attr("fill", d => lighten(0.9, d.color))
      .attr("stroke", d => d.color)
      .attr("opacity", 1);

    rects
      .append("svg:text")
      .attr("class", "cluster-name")
      .attr("x", d => d.getWidth() / 2)
      .attr("y", d => d.getHeight() / 2)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle")
      .text(d => d.name);

    enterCircle
      .on("mouseover", function(d) {
        // mouseover a namespace box
        viewer.current_node = d;
        // highlight the namespace box
        viewer.restart();
      })
      .on("mouseout", function(d) {
        // mouse out for a circle
        viewer.current_node = null;
        viewer.highlightNamespace(false, d3.select(this), d, viewer);
        // unenlarge target node
        viewer.clearAllHighlights();
        viewer.mouseover_node = null;
        viewer.restart();
      })
      .on("mousedown", d => {
        // mouse down for circle
        viewer.current_node = d;
        if (d3.event.button !== 0) {
          // ignore all but left button
          return;
        }
        viewer.mousedown_node = d;
        // mouse position relative to svg
        viewer.initial_mouse_down_position = d3
          .mouse(viewer.topologyRef.parentNode.parentNode.parentNode)
          .slice();
      })
      .on("mouseup", d => {
        // mouse up for circle
        if (!viewer.mousedown_node) return;

        // check for drag
        viewer.mouseup_node = d;

        // if we dragged the node, make it fixed
        let cur_mouse = d3.mouse(viewer.svg.node());
        if (
          cur_mouse[0] !== viewer.initial_mouse_down_position[0] ||
          cur_mouse[1] !== viewer.initial_mouse_down_position[1]
        ) {
          d3.event.preventDefault();

          this.siteNodes.setFixed(d, true);
          viewer.resetMouseVars();
          viewer.restart();
          viewer.mousedown_node = null;
          return;
        }
        viewer.clearAllHighlights();
        viewer.mousedown_node = null;
        // apply any data changes to the interface
        viewer.restart();
      })
      .on("dblclick", d => {
        // circle
        d3.event.preventDefault();
        if (d.fixed) {
          this.siteNodes.setFixed(d, false);
          viewer.restart(); // redraw the node without a dashed line
          viewer.force.start(); // let the nodes move to a new position
        }
      })
      .on("click", d => {
        // circle
        if (d3.event.defaultPrevented) return; // click suppressed
        viewer.clearPopups();
        viewer.showChord(d);
        viewer.showCard(d);
        d3.event.stopPropagation();
      });

    selection.classed("highlighted", d => d.highlighted);
    selection
      .selectAll("circle.network")
      .classed("dim", viewer.view === "deployment");
    return selection;
  };

  setupTrafficLinks = viewer => {
    const links = this.trafficLinks.links;
    const selection = this.trafficLinksSelection.data(links, d => d.uid);
    selection.exit().remove();

    const enter = selection.enter().append("g");
    enter
      .append("path")
      .attr("class", "siteTrafficLink")
      .attr("stroke", "black")
      .attr("stroke-width", 2)
      .attr("d", d => {
        return genPath(d);
      });

    enter
      .append("path")
      .attr("class", "siteTrafficDir")
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("marker-end", "url(#end--15)")
      .attr("d", d => genPath(d));

    enter
      .append("path")
      .attr("class", "hittarget")
      .attr("id", d => `dir-${d.source.name}-${d.target.name}`)
      .attr("d", d => genPath(d))
      .on("click", d => {
        d3.event.stopPropagation();
        viewer.clearPopups();
        viewer.showLinkInfo(d);
      })
      .on("mouseover", d => {
        d.selected = true;
        viewer.showLinkInfo(d);
        viewer.restart();
      })
      .on("mouseout", d => {
        d.selected = false;
        viewer.clearPopups();
        viewer.restart();
      });

    enter
      .append("text")
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .append("textPath")
      .attr("class", "stats")
      .attr("text-anchor", "middle")
      .attr("startOffset", "50%")
      .attr("text-length", "100%")
      .attr("href", d => `#statPath-${d.source.name}-${d.target.name}`);

    selection
      .selectAll(".siteTrafficLink")
      .classed("selected", d => d.selected);
    d3.selectAll("path.mask").classed("selected", d => d.link.selected);

    return selection;
  };

  setupRouterLinks = viewer => {
    const links = this.routerLinks.links;
    const selection = this.routerLinksSelection.data(links, d => d.uid);

    selection.exit().remove();
    const enter = selection.enter().append("g");

    enter
      .append("path")
      .attr("class", "site")
      .attr("d", d => genPath(d));

    enter
      .append("path")
      .attr("marker-end", "url(#site-end)")
      .attr("class", "hittarget")
      .on("click", d => {
        d3.event.stopPropagation();
        viewer.clearPopups();
        viewer.showLinkInfo(d);
      })
      .on("mouseover", d => {
        d.highlighted = true;
        viewer.restart();
      })
      .on("mouseout", d => {
        d.highlighted = false;
        viewer.restart();
      });

    selection.selectAll("path.site").classed("highlighted", d => d.highlighted);

    return selection;
  };

  interSiteLinks = () => {
    const siteNodes = this.siteNodes;
    // set the site non-sankey x,y based on its new size
    // using site-to-site traffic as the links
    const interSiteLinks = new Links();
    siteNodes.nodes.forEach(fromSite => {
      siteNodes.nodes.forEach(toSite => {
        if (fromSite.site_id !== toSite.site_id) {
          const value = this.adapter.siteToSite(fromSite, toSite);
          if (value) {
            const linkIndex = interSiteLinks.addLink({
              source: fromSite,
              target: toSite,
              dir: "out",
              cls: "cls",
              uid: "uid"
            });
            interSiteLinks.links[linkIndex].value = value;
          }
        }
      });
    });
    return interSiteLinks;
  };

  showTraffic = (showTraffic, sankey, viewer) => {
    if (showTraffic) {
      if (sankey) {
        this.toSiteSankey(false, false, viewer.setLinkStat);
      } else {
        circularize(this.trafficLinks.links);
        d3.selectAll("path.siteTrafficDir")
          .attr("d", d => genPath(d))
          .attr("opacity", 0);
        this.toSiteSankey(false, showTraffic, viewer.setLinkStat);
      }
    } else this.toSite(false, viewer.setLinkStat);
  };

  dragStart = d => {
    d.x = d.x0;
    d.y = d.y0;
  };

  drag = d => {
    d.x = d.x0 = d.px;
    d.y = d.y0 = d.py;
  };

  tick = sankey => {
    this.sitesSelection.attr("transform", d => {
      // move the site circle
      d.x0 = d.x;
      d.y0 = d.y;
      d.x1 = d.x + d.getWidth();
      d.y1 = d.y + d.getHeight();
      return `translate(${d.x},${d.y})`;
    });
  };

  drawViewPath = sankey => {
    this.routerLinksSelection
      .selectAll("path")
      .attr("d", d => pathBetween(d.source, d.target));

    circularize(this.trafficLinks.links);
    this.trafficLinksSelection.selectAll("path").attr("d", d => genPath(d));
    this.masksSelection
      .selectAll("path")
      .attr("d", d => genPath(d.link, undefined, d.mask));
  };

  setLinkStat = (sankey, props) => {
    const traffic = props.getShowTraffic();
    if (traffic) {
      setLinkStat(
        this.trafficLinksSelection,
        "siteTrafficLink",
        props.options.link.stat,
        props.getShowStat()
      );
    }
  };

  setupDrag = drag => {
    this.sitesSelection.call(drag);
  };

  collapseNodes = () => {
    this.siteNodes.nodes.forEach(n => {
      n.expanded = false;
    });
  };
  expandNodes = () => {
    this.siteNodes.nodes.forEach(n => {
      n.expanded = true;
    });
  };

  setBlack = black => {
    this.trafficLinks.links.forEach(l => (l.black = black));
  };

  selectionSetBlack = () => {
    d3.selectAll("path.siteTrafficLink").classed("forceBlack", d => d.black);
  };

  clusterHeight = (n, expanded) =>
    expanded || n.expanded ? n.sankey.r * 2 : n.r * 2;
  clusterWidth = (n, expanded) => this.clusterHeight(n, expanded);

  transition = (sankey, initial, traffic, color, viewer) => {
    if (sankey) {
      return this.toSiteSankey(initial, false, viewer.setLinkStat, color);
    } else if (traffic) {
      return this.toSiteSankey(initial, true, viewer.setLinkStat, color);
    } else {
      return this.toSite(initial, viewer.setLinkStat);
    }
  };
  toSite = (initial, setLinkStat) => {
    return new Promise(resolve => {
      if (!initial) {
        d3.selectAll("path.siteTrafficLink")
          .transition()
          .duration(VIEW_DURATION)
          .attr("stroke-width", 2)
          .attr("opacity", 0)
          .call(endall, () => {
            d3.select("g.siteTrafficLinks").style("display", "none");
            resolve();
          });

        d3.selectAll("path.siteTrafficDir")
          .transition()
          .duration(VIEW_DURATION)
          .attr("opacity", 0);

        d3.select("g.siteLinks")
          .transition()
          .duration(VIEW_DURATION)
          .attr("opacity", 1);

        d3.select("g.siteTrafficLinks")
          .selectAll("text.stats")
          .transition()
          .duration(VIEW_DURATION)
          .attr("opacity", 0);
      } else {
        d3.selectAll("g.siteTrafficLinks").style("display", "none");
      }

      // transition the containers to their proper position
      d3.selectAll(".cluster")
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .each("end", function() {
          d3.select(this)
            .style("display", "block")
            .attr("opacity", 1)
            .select(".cluster-rects")
            .attr("opacity", 1)
            .style("display", "block");
        });

      // change the path's width and location
      d3.selectAll("path.site")
        .attr("opacity", 1)
        .attr("stroke-width", null);

      d3.selectAll("path.mask")
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", 1)
        .attr("stroke", d => d.link.target.color)
        .attr("opacity", 0)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = genPath(d.link, undefined, d.mask);
          return interpolatePath(previous, current);
        });

      d3.selectAll("rect.network")
        .transition()
        .duration(VIEW_DURATION)
        .attr("width", d => d.getWidth())
        .attr("height", d => d.getHeight());

      d3.selectAll("text.cluster-name").attr("y", d => d.getHeight() / 2);

      // hide services
      d3.selectAll("g.services").style("display", "none");
    });
  };

  toSiteSankey = (initial, showTraffic, setLinkStat, color) => {
    return new Promise(resolve => {
      d3.select("g.siteTrafficLinks").style("display", "block");
      d3.select("g.siteLinks")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 0.25)
        .call(endall, () => {
          resolve();
        });

      d3.selectAll("path.siteTrafficDir")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1)
        .attr("stroke", d => (color ? d.getColor() : "black"))
        .attr("stroke-width", color ? 2 : 1);
      d3.select("g.siteTrafficLinks")
        .selectAll("text.stats")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1);

      if (!showTraffic) {
        d3.selectAll("path.siteTrafficLink")
          .attr("stroke-width", 2)
          .transition()
          .duration(VIEW_DURATION)
          .attr("opacity", 0.5)
          .attr("stroke-width", d => Math.max(6, d.width))
          .attr("stroke", d => d.target.color)
          .attrTween("d", function(d, i) {
            const previous = d3.select(this).attr("d");
            const current = previous; //d.path;
            return interpolatePath(previous, current);
          });
      } else {
        d3.selectAll("path.siteTrafficLink")
          .transition()
          .duration(VIEW_DURATION)
          .attr("stroke", d => (color ? d.getColor() : null))
          .attr("stroke-width", 2)
          .attr("opacity", 0);
      }
      d3.select("g.siteTrafficLinks")
        .selectAll("path.hittarget")
        .attr("stroke-width", d => Math.max(6, showTraffic ? 6 : d.width));

      if (!showTraffic) {
        d3.selectAll("path.mask")
          .attr("stroke-width", 2)
          .attr("opacity", 0)
          .transition()
          .duration(VIEW_DURATION)
          .attr("stroke-width", d => Math.max(6, d.link.width))
          .attr("stroke", d => d.link.target.color)
          .attr("opacity", 0.5)
          .attrTween("d", function(d, i) {
            const previous = d3.select(this).attr("d");
            const current = genPath(d.link, undefined, d.mask);
            return interpolatePath(previous, current);
          });
      } else {
        d3.selectAll("path.mask")
          .transition()
          .duration(VIEW_DURATION)
          .attr("stroke-width", 2)
          .attr("opacity", 0);
      }
    });
  };
}
