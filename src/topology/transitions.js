import * as d3 from "d3";
import { interpolatePath } from "d3-interpolate-path";

class Transitions {
  constructor(drawPath) {
    this.drawPath = drawPath;
    this.view = "namespace";
  }

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

  toApplication = (previousView, nodes, path) => {
    // Note: all the transitions happen concurrently
    this.view = "application";
    if (previousView === "namespace") this.fromNamespace(nodes);
    if (previousView === "traffic") this.fromTraffic(path);

    // move the service rects to their full-page locations
    d3.selectAll("g.service-type")
      .transition()
      .duration(1000)
      .attrTween(
        "transform",
        this.translateFn(false, previousView === "namespace")
      );
  };

  toNamespace = (previousView, nodes, path) => {
    this.view = "namespace";
    if (previousView === "traffic") this.fromTraffic(path);

    // fade in the shadow rects and then hide them
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
    this.view = "traffic";
    if (previousView === "namespace") this.fromNamespace(nodes);

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

  fromTraffic = path => {
    const self = this;
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
          self.view === "application" ? 1 : 0
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
          this.view === "application" ? 1 : 0
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
}

export default Transitions;
