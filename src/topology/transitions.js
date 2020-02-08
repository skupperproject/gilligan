import * as d3 from "d3";
import { interpolatePath } from "d3-interpolate-path";
import { ServiceStart, ServiceGap } from "./graph";

class Transitions {
  constructor(drawPath) {
    this.drawPath = drawPath;
  }

  toApplication = (previousView, nodes, path) => {
    // Note: all the transitions happen concurrently
    if (previousView === "namespace") this.fromNamespace(nodes);
    if (previousView === "traffic") this.fromTraffic(path, "application");

    this.hideSiteLinks();
    this.showLinks();
    this.showEndpoints();
    this.hideExtraServices();
    // move the service rects to their full-page locations

    d3.selectAll("g.service-type")
      .transition()
      .duration(1000)
      .attrTween(
        "transform",
        this.translateFn(false, previousView === "namespace")
      );
  };

  toNamespace = (previousView, nodes, path, initial) => {
    if (previousView === "traffic") this.fromTraffic(path, "namespace");

    this.showSiteLinks();
    this.hideLinks();
    this.hideEndpoints();
    this.showExtraServices();
    // fade in the shadow rects and then hide them
    if (!initial)
      nodes.forEach(d => {
        d3.select(`#shadow-${d.index}`)
          .select(".shadow-rects")
          .style("display", "block")
          .attr("opacity", 0)
          .transition()
          .duration(1000)
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
      .duration(1000)
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .each("end", function() {
        d3.select(this)
          .style("display", "block")
          .attr("opacity", 1)
          .select(".cluster-rects")
          .attr("opacity", 1)
          .style("display", "block");
      });

    // and also move the service rects to their proper position within the container
    d3.selectAll("g.service-type")
      .transition()
      .duration(1000)
      .attrTween(
        "transform",
        this.translateFn(true, previousView === "application")
      );
  };

  toTraffic = (previousView, nodes, path) => {
    if (previousView === "namespace") this.fromNamespace(nodes);

    this.hideSiteLinks();
    this.showLinks();
    this.hideEndpoints();
    this.hideExtraServices();
    // move the service rects to their traffic locations
    d3.selectAll("g.service-type")
      .transition()
      .duration(1000)
      .attrTween("transform", this.translateFnTraffic(true));

    // expand services to traffic height
    d3.selectAll("rect.service-type")
      .transition()
      .duration(1000)
      .attr("height", d => d.y1 - d.y0);

    // put service names in middle of rect
    d3.selectAll("text.service-type")
      .transition()
      .duration(1000)
      .attr("y", d => (d.y1 - d.y0) / 2);

    // hide the hittarget paths
    path.selectAll("path.hittarget").style("display", "none");

    // change the path's width and location
    path
      .selectAll("path.link")
      .transition()
      .duration(1000)
      .attr("stroke-width", d => d.width)
      .attr("opacity", 0.25)
      .attrTween("d", function(d, i) {
        const previous = d3.select(this).attr("d");
        const current = d.sankeyLinkHorizontal(d, i);
        return interpolatePath(previous, current);
      });
  };

  fromTraffic = (path, view) => {
    // contract services to smaller height
    d3.selectAll("rect.service-type")
      .transition()
      .duration(1000)
      .attr("height", d => {
        return d.getHeight();
      });

    // put service names in middle of rect
    d3.selectAll("text.service-type")
      .transition()
      .duration(1000)
      .attr("y", d => d.getHeight() / 2);

    // change the path's width and location
    path
      .selectAll("path.link")
      .transition()
      .duration(1000)
      .attr("stroke-width", d => 2.5)
      .attr("opacity", 1)
      .attrTween("d", function(d) {
        const previous = d3.select(this).attr("d");
        const { sx, sy, tx, ty, sxoff, syoff, txoff, tyoff } = d.endpoints(
          view === "application" ? 1 : 0
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
          view === "application" ? 1 : 0
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
        .duration(1000)
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
      .duration(1000)
      .attr("transform", "translate(0,0)");
  };

  hideSiteLinks = () => {
    d3.selectAll("g.siteLinks")
      .transition()
      .duration(1000)
      .attr("opacity", 0);
  };

  showSiteLinks = () => {
    d3.selectAll("g.siteLinks")
      .transition()
      .duration(1000)
      .attr("opacity", 1);
  };

  hideLinks = () => {
    d3.selectAll("g.links")
      .transition()
      .duration(1000)
      .attr("opacity", 0)
      .each("end", function() {
        d3.select(this).style("display", "none");
      });
  };

  showLinks = () => {
    d3.selectAll("g.links")
      .style("display", "block")
      .transition()
      .duration(1000)
      .attr("opacity", 1);
  };

  hideEndpoints = () => {
    d3.selectAll(".end-point")
      .transition()
      .duration(1000)
      .attr("opacity", 0);
  };

  showEndpoints = () => {
    d3.selectAll(".end-point")
      .transition()
      .duration(1000)
      .attr("opacity", 1);
  };

  hideExtraServices = () => {
    d3.selectAll("g.extra").style("display", "none");
  };
  showExtraServices = () => {
    d3.selectAll("g.extra").style("display", "block");
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

  expandCluster = (service, view) => {
    // select all the cluster boxes
    const sites = d3.selectAll("g.site");

    // change size of all namespace boxes
    sites
      .select("rect.network")
      .transition()
      .duration(500)
      .attr("height", d => d.getHeight())
      .attr("width", d => d.getWidth());

    // change width of the headers
    sites
      .select("rect.cluster-header")
      .transition()
      .duration(500)
      .attr("width", d => d.getWidth());

    // move the title to the middle of the new width
    sites
      .select("text.cluster-name")
      .transition()
      .duration(500)
      .attr("x", d => d.getWidth() / 2);

    // move the service groups to their correct position
    sites
      .selectAll("g.service-type")
      .transition()
      .duration(500)
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
      .duration(500)
      .attr("opacity", 1);

    // change the service rect sizes
    sites
      .selectAll("rect.service-type")
      .transition()
      .duration(500)
      .attr("height", d => d.getHeight())
      .attr("width", d => d.getWidth());

    sites
      .selectAll("text.service-type")
      .transition()
      .duration(500)
      .attr("y", d => d.getHeight() / 2);

    // move the circle on the right to the correct position
    sites
      .selectAll("circle.source")
      .transition()
      .duration(500)
      .attr("cx", d => d.getWidth());
  };

  tweenService = view => d => {
    const starty = d.orgy;
    return t => {
      d.orgy = starty + (d.expandY - starty) * t;
      if (view === "namespace") {
        this.drawPath(0);
        return `translate(${d.orgx},${d.orgy})`;
      } else if (view === "application") {
        this.drawPath(1);
        return `translate(${d.x}, ${d.y})`;
      } else {
        return `translate(${d.x0},${d.y0})`;
      }
    };
  };

  translateFn = (backwards, draw) => d => t => {
    if (backwards) t = 1 - t;
    if (draw) this.drawPath(t);
    return `translate(${d.orgx + (d.x - d.orgx) * t},${d.orgy +
      (d.y - d.orgy) * t})`;
  };

  translateFnTraffic = backwards => d => t => {
    if (backwards) t = 1 - t;
    return `translate(${d.x0 + (d.x - d.x0) * t},${d.y0 + (d.y - d.y0) * t})`;
  };

  expandService = (d, nodes, view) => {
    d.expanded = !d.expanded;
    this.recalcY(nodes);
    this.expandCluster(d, view);
  };
}

export default Transitions;
