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
  initSankey,
  updateSankey,
  VIEW_DURATION,
  ServiceWidth,
  ServiceGap
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
    console.log(this.Site.sites);
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
    this.setParentNodes();
    this.adjustSites(viewer);
  };

  setParentNodes = () => {
    this.Service.serviceNodes.nodes.forEach(service => {
      const siteNode = this.Site.sites.nodes.find(
        s => s.site_id === service.cluster.site_id
      );
      if (siteNode) {
        service.parentNode = siteNode;
      }
    });
  };

  // move the sites and move the services inside their respective site
  adjustSites = viewer => {
    const siteNodes = this.Site.sites;
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
  };

  initServiceLinks = (viewer, vsize) => {
    const subNodes = this.Service.serviceNodes.nodes;
    const links = this.Service.serviceLinks;
    const sites = this.Site.sites;
    // create links between all services
    subNodes.forEach(fromNode => {
      subNodes.forEach(toNode => {
        const { stat, request } = this.adapter.fromTo(
          fromNode.name,
          fromNode.parentNode.site_id,
          toNode.name,
          toNode.parentNode.site_id
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
        }
      });
    });
    // get the sankey height of each node
    initSankey({
      graph: { nodes: subNodes, links: links.links },
      width: vsize.width,
      height: vsize.height,
      nodeWidth: ServiceWidth,
      nodePadding: ServiceGap,
      left: 20,
      bottom: 60
    });
    // save the height and expand the subnodes
    subNodes.forEach(n => {
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

    this.regenPaths(true);
    subNodes.forEach(n => {
      n.expanded = false;
    });
    return expandedSize;
  };

  regenPaths = sankey => {
    this.Service.serviceNodes.nodes.forEach(n => {
      if (sankey) {
        n.y = n.y0 = n.parentNode.sankey.y + n.sankeySiteOffset.y;
        n.x = n.x0 = n.parentNode.sankey.x + n.sankeySiteOffset.x;
      } else {
        n.y = n.y0 = n.parentNode.y + n.siteOffset.y;
        n.x = n.x0 = n.parentNode.x + n.siteOffset.x;
      }
      n.y1 = n.y0 + n.getHeight();
      n.x1 = n.x0 + n.getWidth();
      //n.x = n.parentNode.x + n.siteOffset.x;
      //n.y = n.parentNode.y + n.siteOffset.y;
    });
    if (sankey) {
      updateSankey({
        nodes: this.Service.serviceNodes.nodes,
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
    this.Site.sites.nodes.forEach(s => {
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
        if (sankey) {
          n.x = n.x0 = n.parentNode.sankey.x + n.sankeySiteOffset.x;
          n.y = n.y0 = n.parentNode.sankey.y + n.sankeySiteOffset.y;
        } else {
          n.x = n.parentNode.x + n.siteOffset.x;
          n.y = n.parentNode.y + n.siteOffset.y;
        }
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
  drawViewPath = sankey => {
    this.regenPaths(sankey);
    this.Service.drawViewPath(sankey);
  };

  transition = (sankey, initial) => {
    if (sankey) {
      return this.toDeploymentSankey(initial);
    } else {
      return this.toDeployment(initial);
    }
  };
  toDeployment = initial => {
    return new Promise(resolve => {
      d3.select("g.clusters")
        .style("display", "block")
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

      // change the path's width and location
      d3.selectAll("path.service")
        .attr("d", d => genPath(d))
        .attr("opacity", 1)
        .attr("stroke-width", 2)
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

      d3.select("g.serviceLinks")
        .selectAll("path.hittarget")
        .attr("d", d => genPath(d))
        .attr("stroke-width", 20);
    });
  };

  toDeploymentSankey = setLinkStat => {
    return new Promise((resolve, reject) => {
      d3.selectAll(".end-point")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 0);

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
        .attr("stroke-width", d => d.width)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = d.sankeyPath; //d.path;
          return interpolatePath(previous, current);
        });

      d3.selectAll("path.servicesankeyDir")
        .style("display", "block")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1)
        .attr("stroke-width", 1)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = d.sankeyPath;
          return interpolatePath(previous, current);
        });

      // move the service rects to their sankey location
      d3.selectAll("g.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => {
          //this.dragStart(d, true);
          return `translate(${d.x},${d.y})`;
          /*
            `translate(${d.parentNode.sankey.x +
              d.sankeySiteOffset.x},${d.parentNode.sankey.y +
              d.sankeySiteOffset.y})`;*/
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
