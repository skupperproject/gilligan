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
import { interpolatePath } from "d3-interpolate-path";
import {
  adjustPositions,
  endall,
  genPath,
  linkColor,
  //getSaved,
  initSankey,
  updateSankey,
  VIEW_DURATION,
  ServiceWidth,
  ServiceGap,
  ServiceHeight
} from "../utilities";
import { Site } from "./site";
import { Service } from "./service";

export class Deployment {
  constructor(adapter) {
    this.adapter = adapter;
    this.Site = new Site(adapter);
    this.Service = new Service(adapter);
    this.nodes = () => this.Service.nodes();
    this.links = () => this.Service.links();
  }

  initNodesAndLinks = viewer => {
    this.initNodes(viewer);
    let vsize = { width: viewer.width, height: viewer.height };
    vsize = this.initServiceLinks(viewer, vsize);
    /*
    console.log(this.Site.siteNodes);
    console.log(this.Service.serviceNodes);
    console.log(this.Service.serviceLinks);
    */
    return { nodeCount: this.nodes().nodes.length, size: vsize };
  };

  createSelections = svg => {
    this.Site.sitesSelection = this.Site.createSitesSelection(svg);
    this.Service.createSelections(svg);
  };

  setupSelections = viewer => {
    this.Site.sitesSelection = this.Site.setupSitesSelection(viewer);
    this.Service.setupSelections(viewer);
  };

  initNodes = viewer => {
    this.Site.initNodes(viewer);
    this.Service.initNodes(viewer, true);
    this.setParentNodes(viewer);
    this.adjustSites(viewer);
  };

  setParentNodes = viewer => {
    this.Service.serviceNodes.nodes.forEach(service => {
      if (service.cluster) {
        const siteNode = this.Site.siteNodes.nodes.find(
          s => s.site_id === service.cluster.site_id
        );
        if (siteNode) {
          service.parentNode = siteNode;
        }
      } else {
        service.parentNode = {
          sankey: { x: 0, y: 0 },
          x: 0,
          y: 0,
          site_id: "",
          site_name: "",
          getWidth: () => viewer.width,
          getHeight: () => viewer.height
        };
      }
    });
  };

  // move the sites and move the services inside their respective site
  adjustSites = viewer => {
    const siteNodes = this.Site.siteNodes;
    const serviceNodes = this.Service.serviceNodes;
    // size the sites based on the services deployed in them
    siteNodes.nodes.forEach(site => {
      const links = [];
      // services deployed in this site
      const subServices = this.Service.serviceNodes.nodes.filter(
        sn => sn.parentNode.site_id === site.site_id
      );
      // get links between services within each site
      subServices.forEach((fromService, s) => {
        subServices.forEach((toService, t) => {
          const { stat } = this.adapter.fromTo(
            fromService.address,
            site.site_id,
            toService.address,
            site.site_id
          );
          if (stat) {
            links.push({
              source: fromService,
              target: toService,
              value: stat
            });
          }
        });
      });
      // set the site radius to hold all the site's services (non-expanded)
      const siteSize = adjustPositions({
        nodes: subServices,
        links,
        width: site.r * 2,
        height: site.r * 2
      });
      site.r = Math.max(site.r, Math.max(siteSize.width, siteSize.height) / 2);
      site.subServiceLinks = links;
    });

    const interSiteLinks = this.Site.interSiteLinks();
    // set the site x,y
    adjustPositions({
      nodes: siteNodes.nodes,
      links: interSiteLinks.links,
      width: viewer.width,
      height: viewer.height
    });

    // position services
    siteNodes.nodes.forEach(cluster => {
      const subServices = serviceNodes.nodes.filter(
        sn => sn.parentNode.site_id === cluster.site_id
      );
      // position subServices in sites
      // using the site size as the width and height
      adjustPositions({
        nodes: subServices,
        links: cluster.subServiceLinks,
        width: cluster.r * 2,
        height: cluster.r * 2,
        xyKey: "siteOffset"
      });
    });
    const orphans = serviceNodes.nodes.filter(n => !n.siteOffset);
    adjustPositions({
      nodes: orphans,
      links: [],
      width: ServiceWidth,
      height: viewer.height,
      xyKey: "siteOffset"
    });
  };

  initServiceLinks = (viewer, vsize) => {
    const subNodes = this.Service.serviceNodes.nodes;
    const links = this.Service.serviceLinks;
    const sites = this.Site.siteNodes;
    // create links between all services
    subNodes.forEach(fromNode => {
      subNodes.forEach(toNode => {
        const { stat, request } = this.adapter.fromTo(
          fromNode.name,
          fromNode.parentNode ? fromNode.parentNode.site_id : null,
          toNode.name,
          toNode.parentNode ? toNode.parentNode.site_id : null
        );
        if (stat) {
          const linkIndex = links.addLink({
            source: fromNode,
            target: toNode,
            dir: "out",
            cls: "node2node",
            uid: `Link-${fromNode.parentNode.site_id}-${fromNode.uid()}-${
              toNode.parentNode.site_id
            }-${toNode.uid()}`
          });
          const link = links.links[linkIndex];
          link.request = request;
          link.value = stat;
          link.getColor = () => linkColor(link, links.links);
        }
      });
    });
    // get the sankey height of each node
    const linkNodes = subNodes.filter(sub =>
      links.links.some(l => l.source === sub || l.target === sub)
    );
    initSankey({
      graph: { nodes: linkNodes, links: links.links },
      width: vsize.width,
      height: vsize.height,
      nodeWidth: ServiceWidth,
      nodePadding: ServiceGap,
      left: 20,
      bottom: 60
    });
    // save the height and expand the subnodes
    subNodes.forEach(n => {
      if (n.y0 === undefined) {
        n.y0 = n.y;
        n.y1 = n.y + ServiceHeight;
      }
      n.sankeyHeight = n.y1 - n.y0;
      n.expanded = true;
    });
    // set the sankey.r of the sites to accommodate expanded services
    sites.nodes.forEach(site => {
      site.expanded = true;

      const subServices = subNodes.filter(
        n => n.parentNode.site_id === site.site_id
      );
      const siteSize = adjustPositions({
        nodes: subServices,
        links: site.subServiceLinks,
        width: site.r * 2,
        height: site.r * 2,
        xyKey: "sankeySiteOffset"
      });
      site.sankey = {
        r: Math.max(site.r, Math.max(siteSize.width, siteSize.height) / 2)
      };
    });
    // now each site has a site.sankey.r that is big enough
    // to encompass all its expanded deployments
    // adjust the positions of the sites using the new site.sankey.r
    const interSiteLinks = this.Site.interSiteLinks();
    // sites and services are currently .expanded = true
    const expandedSize = adjustPositions({
      nodes: sites.nodes,
      links: interSiteLinks.links,
      width: vsize.width,
      height: vsize.height - 20,
      xyKey: "sankey"
    });

    sites.nodes.forEach(site => {
      site.expanded = false;
      site.sankey.y += 20;
      // keep expanded/contracted site location difference
      // so that we can drag nodes and then expand/contract correctly
      site.sankeySiteOffset = {
        x: site.x - site.sankey.x,
        y: site.y - site.sankey.y
      };
    });

    const orphans = subNodes.filter(n => !n.sankeySiteOffset);
    adjustPositions({
      nodes: orphans,
      links: [],
      width: ServiceWidth,
      height: viewer.height,
      xyKey: "sankeySiteOffset"
    });
    this.regenPaths(true);
    subNodes.forEach(n => {
      n.expanded = false;
    });
    return expandedSize;
  };

  regenPaths = sankey => {
    this.Service.serviceNodes.nodes.forEach(n => {
      this.dragStart(n, sankey);
      n.y1 = n.y0 + n.getHeight();
      n.x1 = n.x0 + n.getWidth();
    });
    if (sankey) {
      const linkNodes = this.Service.serviceNodes.nodes.filter(sub =>
        this.Service.serviceLinks.links.some(
          l => l.source === sub || l.target === sub
        )
      );

      updateSankey({
        nodes: linkNodes, //this.Service.serviceNodes.nodes,
        links: this.Service.serviceLinks.links
      });
    }
  };
  // don't allow dragging deployment rect outside of parent site circle
  constrainDeployment = (d, sankey) => {
    const left = sankey ? d.parentNode.sankey.x : d.parentNode.x;
    const top = sankey ? d.parentNode.sankey.y : d.parentNode.y;
    const bbox = {
      left,
      right: left + d.parentNode.getWidth(),
      top,
      bottom: top + d.parentNode.getHeight()
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
    d.x = d.x0 = d.px;
    d.y = d.y0 = d.py;
    d.x1 = d.x + d.getWidth();
    d.y1 = d.y + d.getHeight();
    if (sankey) {
      d.sankeySiteOffset.x = d.x - d.parentNode.sankey.x;
      d.sankeySiteOffset.y = d.y - d.parentNode.sankey.y;
    } else {
      d.siteOffset.x = d.x - d.parentNode.x;
      d.siteOffset.y = d.y - d.parentNode.y;
    }
  };

  setupNodePositions = sankey => {
    this.Site.siteNodes.nodes.forEach(s => {
      this.dragStart(s, sankey);
    });
    this.Service.serviceNodes.nodes.forEach(n => {
      this.dragStart(n, sankey);
    });
  };

  dragStart = (d, sankey) => {
    if (d.nodeType === "service") {
      if (sankey) {
        d.x = d.x0 = d.parentNode.sankey.x + d.sankeySiteOffset.x;
        d.y = d.y0 = d.parentNode.sankey.y + d.sankeySiteOffset.y;
      } else {
        d.x = d.x0 = d.parentNode.x + d.siteOffset.x;
        d.y = d.y0 = d.parentNode.y + d.siteOffset.y;
      }
    } else {
      if (sankey) {
        d.x = d.x0 = d.sankey.x;
        d.y = d.y0 = d.sankey.y;
      } else {
        d.x = d.x0;
        d.y = d.y0;
      }
    }
  };

  drag = (d, sankey) => {
    if (d.nodeType === "service") {
      this.constrainDeployment(d, sankey);
    } else {
      // move the circle
      this.Site.drag(d, sankey);
      // set the new sankey position
      d.sankey.x = d.x;
      d.sankey.y = d.y;
      // now move the deployments that are in the circle
      const subNodes = this.Service.serviceNodes.nodes.filter(
        n => n.parentNode.site_id === d.site_id
      );
      subNodes.forEach(n => {
        this.dragStart(n, sankey);
      });
    }
    this.regenPaths(sankey);
  };

  tick = sankey => {
    this.Site.tick(sankey);
    this.Service.servicesSelection.attr("transform", d => {
      return `translate(${d.x},${d.y})`;
    });
  };

  setLinkStat = (sankey, props) => {
    this.Service.setLinkStat(sankey, props);
  };

  setupDrag = drag => {
    this.Service.setupDrag(drag);
    this.Site.setupDrag(drag);
  };

  collapseNodes = () => {
    this.Service.collapseNodes();
    this.Site.collapseNodes();
  };
  expandNodes = () => {
    this.Service.expandNodes();
    this.Site.expandNodes();
  };
  setBlack = black => {
    this.Service.setBlack(black);
  };
  selectionSetBlack = () => {
    this.Service.selectionSetBlack();
  };
  drawViewPath = sankey => {
    this.regenPaths(sankey);
    this.Service.drawViewPath(sankey);
  };

  transition = (sankey, initial, color, viewer) => {
    if (sankey) {
      return this.toDeploymentSankey(initial, viewer.setLinkStat, color);
    } else {
      return this.toDeployment(initial, viewer.setLinkStat, color);
    }
  };
  toDeployment = (initial, setLinkStat, color) => {
    return new Promise(resolve => {
      d3.selectAll(".end-point")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1);

      d3.select("g.clusters")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1);

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

      d3.select("g.clusters")
        .selectAll("circle.network")
        .transition()
        .duration(VIEW_DURATION)
        .attr("r", d => d.r)
        .attr("cx", d => d.r)
        .attr("cy", d => d.r);

      d3.select("g.clusters")
        .selectAll("text.cluster-name")
        .transition()
        .duration(initial ? 0 : VIEW_DURATION)
        .attr("y", -10)
        .attr("x", d => d.getWidth() / 2);

      // move the service rects to their proper position within the container

      d3.selectAll("g.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => {
          this.dragStart(d, false);
          return `translate(${d.x},${d.y})`;
        });

      d3.selectAll("rect.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("width", d => d.getWidth())
        .attr("height", d => d.getHeight())
        .attr("fill", d => d.lightColor)
        .attr("opacity", 1);

      d3.selectAll("text.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1)
        .attr("y", d => d.getHeight() / 2)
        .call(endall, () => {
          resolve();
        });

      d3.selectAll("path.servicesankeyDir")
        .attr("opacity", 1)
        .style("display", "block")
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", 2)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = genPath(d);
          return interpolatePath(previous, current);
        })
        .each("end", function(d) {
          d3.select(this)
            .attr("stroke-width", 1)
            .style("display", "none");
        });

      // change the path's width and location
      if (initial) {
        d3.selectAll("path.service")
          .attr("d", d => genPath(d))
          .attr("opacity", 1)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", function(d) {
            d.pathLen = this.getTotalLength();
            return `${d.pathLen} ${d.pathLen}`;
          })
          .attr("stroke-dashoffset", d => d.pathLen)
          .attr("stroke", d => (color ? d.getColor() : null))
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
          .attr("opacity", 1)
          .attr("stroke-width", 2)
          .attr("stroke", d => (color ? d.getColor() : null))
          .attrTween("d", function(d, i) {
            const previous = d3.select(this).attr("d");
            const current = genPath(d);
            const ip = interpolatePath(previous, current);
            return t => {
              setLinkStat();
              return ip(t);
            };
          });
      }

      d3.selectAll("path.hittarget")
        .attr("d", d => genPath(d))
        .attr("stroke-width", 20);
    });
  };

  toDeploymentSankey = (initial, setLinkStat, color) => {
    return new Promise((resolve, reject) => {
      d3.selectAll(".end-point")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 0)
        .call(endall, () => {
          resolve();
        });

      d3.select("g.clusters")
        .selectAll("circle.network")
        .transition()
        .duration(VIEW_DURATION)
        .attr("r", d => d.sankey.r)
        .attr("cx", d => d.sankey.r)
        .attr("cy", d => d.sankey.r);

      d3.select("g.clusters")
        .selectAll("g.cluster")
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => `translate(${d.sankey.x},${d.sankey.y})`);

      d3.select("g.clusters")
        .selectAll("text.cluster-name")
        .transition()
        .duration(VIEW_DURATION)
        .attr("y", -10)
        .attr("x", d => d.getWidth(true) / 2);

      d3.selectAll("path.service")
        .style("display", "block")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 0.5)
        .attr("stroke-width", d => Math.max(d.width, 1))
        .attr("stroke", d => (color ? d.getColor() : d.target.color))
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = d.sankeyPath; //d.path;
          const ip = interpolatePath(previous, current);
          return t => {
            setLinkStat();
            return ip(t);
          };
        });

      d3.selectAll("path.servicesankeyDir")
        .style("display", "block")
        .attr("opacity", 1)
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", 1)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = d.sankeyPath;
          return interpolatePath(previous, current);
        });

      d3.select("g.links")
        .selectAll("path.hittarget")
        .attr("stroke-width", d => Math.max(d.width, 6))
        .attr("d", d => d.sankeyPath);

      // move the service rects to their sankey location
      d3.selectAll("g.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => {
          return `translate(${d.x},${d.y})`;
        });

      d3.selectAll("rect.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("width", d => d.getWidth())
        .attr("height", d => d.getHeight())
        .attr("fill", d => d.lightColor)
        .attr("opacity", 1);

      d3.selectAll("text.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1)
        .attr("y", d => d.getHeight() / 2)
        .call(endall, () => {
          resolve();
        });
    });
  };
}
