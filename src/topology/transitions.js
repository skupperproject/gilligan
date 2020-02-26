import * as d3 from "d3";
import { interpolatePath } from "d3-interpolate-path";
import { ServiceStart, ServiceGap } from "./graph";
import { midPoints } from "./svgUtils";
import { restoreSankey } from "../utilities";

const VIEW_DURATION = 1000;
const EXPAND_DURATION = 500;

class Transitions {
  toSite = (previousView, nodes, path, zoomed, initial) => {
    return new Promise((resolve, reject) => {
      if (previousView === "servicesankey") this.fromTraffic(path, "site");
      zoomed(VIEW_DURATION);

      this.showRouterLinks();
      this.hideServiceLinks();
      this.hideSankeySiteLinkDir();
      this.hideSankeyServiceLinkDir();
      this.hideEndpoints();
      if (!initial) this.showExtraServices();
      // fade in the shadow rects and then hide them
      if (!initial && previousView === "service")
        nodes.forEach(d => {
          d3.select(`#shadow-${d.index}`)
            .select(".shadow-rects")
            .style("display", "block")
            .attr("opacity", 0)
            .transition()
            .duration(VIEW_DURATION)
            .attr("opacity", 1)
            .each("end", function() {
              d3.select(this)
                .attr("opacity", 0)
                .style("display", "none");
            });
        });

      // while the above is happening, transition the containers to their proper position
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
      d3.selectAll("path.siteLink")
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", 2.5)
        .attr("opacity", 1)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const { sx, sy, tx, ty } = midPoints(d.source, d.target);
          const current = `M${sx},${sy}L${tx},${ty}`;

          return interpolatePath(previous, current);
        });

      d3.selectAll("path.siteTrafficLink")
        .style("display", "block")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1)
        .attr("stroke-width", 2.5)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = `M${d.source.x + d.source.getWidth()} ${d.source.y +
            d.source.getHeight() / 2} L ${d.target.x} ${d.target.y +
            d.target.getHeight() / 2 +
            i * 15}`;
          return interpolatePath(previous, current);
        });

      d3.selectAll("rect.network")
        .transition()
        .duration(VIEW_DURATION)
        .attr("width", d => d.getWidth())
        .attr("height", d => d.getHeight());

      // and also move the service rects to their proper position within the container
      d3.selectAll("g.service-type")
        .filter(d => !d.extra)
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => `translate(${d.orgx},${d.orgy})`);

      d3.selectAll("rect.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("width", d => d.getWidth())
        .attr("height", d => d.getHeight())
        .attr("fill", d => "#FFFFFF")
        .attr("opacity", 1);

      d3.selectAll("text.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1)
        .call(endall, () => {
          resolve();
        });
    });
  };

  toService = (previousView, nodes, path, zoomed) => {
    return new Promise((resolve, reject) => {
      // Note: all the transitions happen concurrently
      if (previousView === "site") this.fromNamespace(nodes);
      if (previousView === "servicesankey") this.fromTraffic(path, "service");
      zoomed(VIEW_DURATION);

      this.hideSiteLinks();
      this.hideSiteTrafficLinks();
      this.hideSankeySiteLinkDir();
      this.hideSankeyServiceLinkDir();
      this.showServiceLinks();
      this.showEndpoints();
      this.hideExtraServices();

      // move the service rects to their full-page locations
      d3.selectAll("g.service-type")
        .filter(d => !d.extra)
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .call(endall, () => {
          resolve();
        });

      d3.selectAll("rect.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("fill", d => d.lightColor)
        .attr("width", d => d.getWidth())
        .attr("height", d => d.getHeight())
        .attr("opacity", 1);

      d3.selectAll("text.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("y", d => d.getHeight() / 2)
        .attr("opacity", 1);

      // move links to application locations
      path
        .selectAll("path.link")
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", d => 2.5)
        .attr("opacity", 1)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const { sx, sy, tx, ty, sxoff, syoff, txoff, tyoff } = d.endpoints(1);
          const current = `M${sx + sxoff},${sy + syoff}L${tx + txoff},${ty +
            tyoff}`;
          return interpolatePath(previous, current);
        });
    });
  };

  toServiceSankey = (previousView, nodes, zoom, svg) => {
    return new Promise((resolve, reject) => {
      if (previousView === "site" || previousView === "sitesankey")
        this.fromNamespace(nodes);
      /*
    nodes.forEach(n => {
      restoreSankey(n.subNodes, "servicesankey");
    });
    */
      this.hideSiteLinks();
      this.hideSiteTrafficLinks();
      this.hideSankeySiteLinkDir();
      this.showServiceLinks();
      this.hideEndpoints();
      this.hideExtraServices();
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
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => d.lightColor)
        .attr("opacity", 1);

      // put service names in middle of rect
      d3.selectAll("text.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("opacity", 1);

      // hide the hittarget paths
      d3.selectAll("path.hittarget").style("display", "none");

      // change the path's width and location
      d3.selectAll("path.link")
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", d => d.width)
        .attr("opacity", 0.5)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = d.sankeyLinkHorizontal(d, i);
          return interpolatePath(previous, current);
        });

      // show the serviceTraffic arrows in the links
      d3.selectAll("path.sankeyServiceLinkDir")
        .style("display", "block")
        .attr("opacity", 0)
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", 1)
        .attr("opacity", 1)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = d.sankeyLinkHorizontal(d);
          return interpolatePath(previous, current);
        });

      zoom.scale(0.8);
      zoom.translate([100, 50]);
      svg
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", `translate(100,50) scale(0.8)`);
    });
  };

  toSiteSankey = (previousView, nodes, path, zoom, svg) => {
    /*
    nodes.forEach(n => {
      restoreSankey(n.subNodes, "sitesankey");
    });
    */

    return new Promise((resolve, reject) => {
      this.hideSiteLinks();
      this.hideServiceLinks();
      this.hideEndpoints();
      this.hideSankeyServiceLinkDir();

      // move site rects to sankey location
      d3.selectAll(".cluster")
        .style("display", "block")
        .attr("opacity", 1)
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => `translate(${d.x0},${d.y0})`)
        .call(endall, () => {
          resolve();
        });

      // show site rects
      d3.selectAll(".cluster-rects")
        .style("display", "block")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 1);

      d3.selectAll("rect.network")
        .transition()
        .duration(VIEW_DURATION)
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => Math.max(d.y1 - d.y0, d.getHeight()));

      // hide the hittarget paths
      path.selectAll("path.hittarget").style("display", "none");

      // move subNodes to their in-site locations
      d3.selectAll("g.service-type")
        .style("display", "block")
        .attr("opacity", 1)
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", d => `translate(${d.orgx},${d.orgy})`);

      d3.selectAll("rect.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("height", d => d.getHeight())
        .attr("fill", "#FFFFFF")
        .attr("opacity", 0.5);

      d3.selectAll("text.service-type")
        .transition()
        .duration(VIEW_DURATION)
        .attr("y", d => d.getHeight() / 2)
        .attr("opacity", 0.5);

      // show the siteTraffic links
      d3.selectAll("path.siteTrafficLink")
        .style("display", "block")
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", d => d.width)
        .attr("opacity", 0.5)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const current = d.sankeyLinkHorizontal(d, i);
          return interpolatePath(previous, current);
        });

      // show the siteTraffic arrows in the links
      d3.selectAll("path.sankeySiteLinkDir")
        .style("display", "block")
        .transition()
        .duration(VIEW_DURATION)
        .attr("stroke-width", 1)
        .attr("opacity", 1)
        .attrTween("d", function(d) {
          const previous = d3.select(this).attr("d");
          const current = d.sankeyLinkHorizontal(d);
          return interpolatePath(previous, current);
        });

      zoom.scale(0.8);
      zoom.translate([100, 50]);
      svg
        .transition()
        .duration(VIEW_DURATION)
        .attr("transform", `translate(100,50) scale(0.8)`);
    });
  };

  fromTraffic = (path, view) => {
    // contract services to smaller height
    d3.selectAll("rect.service-type")
      .transition()
      .duration(VIEW_DURATION)
      .attr("height", d => d.getHeight())
      .attr("fill", "#FFFFFF");

    // put service names in middle of rect
    d3.selectAll("text.service-type")
      .transition()
      .duration(VIEW_DURATION)
      .attr("y", d => d.getHeight() / 2);

    // change the path's width and location
    path
      .selectAll("path.link")
      .transition()
      .duration(VIEW_DURATION)
      .attr("stroke-width", d => 2.5)
      .attr("opacity", 1)
      .attrTween("d", function(d) {
        const previous = d3.select(this).attr("d");
        const { sx, sy, tx, ty, sxoff, syoff, txoff, tyoff } = d.endpoints(
          view === "service" ? 1 : 0
        );
        const current = `M${sx + sxoff},${sy + syoff}L${tx + txoff},${ty +
          tyoff}`;
        return interpolatePath(previous, current);
      });

    // show the hittarget paths
    path
      .selectAll("path.hittarget")
      .style("display", "block")
      .attr("opacity", 1)
      .attr("d", d => {
        const { sx, sy, tx, ty, sxoff, syoff, txoff, tyoff } = d.endpoints(
          view === "service" ? 1 : 0
        );
        return `M${sx + sxoff},${sy + syoff}L${tx + txoff},${ty + tyoff}`;
      });
  };

  // fade out clusters and move the cluster container
  fromNamespace = nodes => {
    // show the shadow rects and then fade them out
    nodes.forEach(d => {
      d3.select(`#shadow-${d.index}`)
        .attr("transform", `translate(${d.x},${d.y})`)
        .select(".shadow-rects")
        .attr("opacity", 1)
        .style("display", "block")
        .transition()
        .duration(VIEW_DURATION)
        .attr("opacity", 0)
        .each("end", function() {
          d3.select(this).style("display", "none");
        });
    });

    // hide the real cluster rects immediately
    d3.selectAll(".cluster-rects").style("display", "none");

    // make the cluster container start at the left of the svg
    // in order to move the services to their correct locations
    d3.selectAll(".cluster")
      .transition()
      .duration(VIEW_DURATION)
      .attr("transform", "translate(0,0)");
  };

  hideSiteLinks = () => {
    d3.selectAll("g.siteLinks")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 0)
      .each(function(d) {
        d3.select(this).style("display", "none");
      });
  };

  showRouterLinks = () => {
    d3.selectAll("g.siteLinks")
      .style("display", "block")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 1);
  };

  hideServiceLinks = () => {
    d3.selectAll("g.links")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 0)
      .each("end", function() {
        d3.select(this).style("display", "none");
      });
  };

  showServiceLinks = () => {
    d3.selectAll("g.links")
      .style("display", "block")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 1);
  };

  hideSiteTrafficLinks = () => {
    d3.selectAll("path.siteTrafficLink")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 0)
      .each("end", function(d) {
        d3.select(this).style("display", "none");
      });
  };

  hideSankeySiteLinkDir = () => {
    d3.selectAll("path.sankeySiteLinkDir")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 0)
      .attrTween("d", function(d, i) {
        const previous = d3.select(this).attr("d");
        const current = `M${d.source.x + d.source.getWidth()} ${d.source.y +
          d.source.getHeight() / 2} L ${d.target.x} ${d.target.y +
          d.target.getHeight() / 2 +
          i * 5}`;
        return interpolatePath(previous, current);
      })
      .each("end", function(d) {
        d3.select(this).style("display", "none");
      });
  };

  hideSankeyServiceLinkDir = () => {
    d3.selectAll("path.sankeyServiceLinkDir")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 0)
      .attrTween("d", function(d, i) {
        const previous = d3.select(this).attr("d");
        const current = `M${d.source.x + d.source.getWidth()} ${d.source.y +
          d.source.getHeight() / 2} L ${d.target.x} ${d.target.y +
          d.target.getHeight() / 2 +
          i * 5}`;
        return interpolatePath(previous, current);
      })
      .each("end", function(d) {
        d3.select(this).style("display", "none");
      });
  };

  hideEndpoints = () => {
    d3.selectAll(".end-point")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 0);
  };

  showEndpoints = () => {
    d3.selectAll(".end-point")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 1);
  };

  hideExtraServices = () => {
    d3.selectAll("g.extra")
      .transition()
      .duration(VIEW_DURATION)
      .attr("transform", d => `translate(${d.original.x},${d.original.y})`)
      .each("end", function() {
        d3.select(this).style("display", "none");
      });
  };

  showExtraServices = () => {
    d3.selectAll("g.extra")
      .style("display", "block")
      //.attr("transform", d => `translate(${d.original.x},${d.original.y})`)
      .transition()
      .duration(VIEW_DURATION)
      .attr("transform", d => `translate(${d.orgx},${d.orgy})`);
  };

  recalcY = nodes => {
    nodes.forEach(n => {
      let curY = ServiceStart;
      n.subNodes.forEach(s => {
        s.expandY = curY;
        curY += s.getHeight() + ServiceGap;
      });
    });
  };

  expandCluster = (service, view, path, width) => {
    // select all the cluster boxes
    const sites = d3.selectAll("g.site");

    sites.selectAll("g.service-type").each(d => {
      if (d.x0 === 1) {
        d.x1 = d.x0 + d.getWidth();
      } else if (d.x1 === width - 1) {
        d.x0 = d.x1 - d.getWidth();
      } else {
        const curWidth = d.x1 - d.x0;
        const newWidth = d.getWidth();
        const change = (newWidth - curWidth) / 2;
        d.x0 -= change;
        d.x1 += change;
      }
    });

    // change size of all namespace boxes
    sites
      .select("rect.network")
      .transition()
      .duration(EXPAND_DURATION)
      .attr("height", d => d.getHeight())
      .attr("width", d => d.getWidth());

    // change width of the headers
    sites
      .select("rect.cluster-header")
      .transition()
      .duration(EXPAND_DURATION)
      .attr("width", d => d.getWidth());

    // move the title to the middle of the new width
    sites
      .select("text.cluster-name")
      .transition()
      .duration(EXPAND_DURATION)
      .attr("x", d => d.getWidth() / 2);

    // move the service groups to their correct y position
    sites
      .selectAll("g.service-type")
      .transition()
      .duration(EXPAND_DURATION)
      .attrTween("transform", this.tweenService(view));

    // show the versions for the selected service
    sites
      .selectAll("g.service-versions")
      .attr("opacity", d => (d.address === service.address ? 0 : 1))
      .style("display", d => (d.expanded ? "block" : "none"));

    // fade the versions in
    // Note: the non-expanded version groups will be display:none so
    // this will have no affect on them
    sites
      .selectAll("g.service-versions")
      .transition()
      .duration(EXPAND_DURATION)
      .attr("opacity", 1);

    // change the service rect sizes
    sites
      .selectAll("rect.service-type")
      .transition()
      .duration(EXPAND_DURATION)
      .attr("height", d => d.getHeight())
      .attr("width", d => d.getWidth());

    sites
      .selectAll("text.service-type")
      .transition()
      .duration(EXPAND_DURATION)
      .attr("y", d => d.getHeight() / 2);

    // move the circle on the right to the correct position
    sites
      .selectAll("circle.source")
      .transition()
      .duration(EXPAND_DURATION)
      .attr("cx", d => d.getWidth());

    if (view === "service") {
      // move links
      path
        .selectAll("path.link")
        .transition()
        .duration(VIEW_DURATION / 2)
        .attrTween("d", function(d, i) {
          const previous = d3.select(this).attr("d");
          const { sx, sy, tx, ty, sxoff, syoff, txoff, tyoff } = d.endpoints(1);
          const current = `M${sx + sxoff},${sy + syoff}L${tx + txoff},${ty +
            tyoff}`;
          return interpolatePath(previous, current);
        });
    }
  };

  tweenService = view => d => {
    const starty = d.orgy;
    return t => {
      d.orgy = starty + (d.expandY - starty) * t;
      if (view === "site") {
        return `translate(${d.orgx},${d.orgy})`;
      } else if (view === "service") {
        return `translate(${d.x}, ${d.y})`;
      } else {
        return `translate(${d.x0},${d.y0})`;
      }
    };
  };

  expandService = (d, nodes, view, path, width) => {
    return;
    /*
    d.expanded = !d.expanded;
    this.recalcY(nodes);
    this.expandCluster(d, view, path, width);
    */
  };

  // get a path that represents a rectangle
  rect2Path = rect =>
    `M${rect.x} ${rect.y} L ${rect.x + rect.width} ${rect.y} L ${rect.x +
      rect.width} ${rect.y + rect.height} L ${rect.x} ${rect.y +
      rect.height} Z`;
}

function endall(transition, callback) {
  if (typeof callback !== "function")
    throw new Error("Wrong callback in endall");
  if (transition.size() === 0) {
    callback();
  }
  var n = 0;
  transition
    .each(function() {
      ++n;
    })
    .each("end", function() {
      if (!--n) callback.apply(this, arguments);
    });
}

export default Transitions;
