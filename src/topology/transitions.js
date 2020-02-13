import * as d3 from "d3";
import { interpolatePath } from "d3-interpolate-path";
import { ServiceStart, ServiceGap } from "./graph";

const VIEW_DURATION = 1000;
const EXPAND_DURATION = 500;

class Transitions {
  constructor(drawPath) {
    this.drawPath = drawPath;
  }

  toApplication = (previousView, nodes, path, zoomed) => {
    // Note: all the transitions happen concurrently
    if (previousView === "namespace") this.fromNamespace(nodes);
    if (previousView === "traffic") this.fromTraffic(path, "application");
    zoomed(VIEW_DURATION);

    this.hideSiteLinks();
    this.showLinks();
    this.showEndpoints();
    this.hideExtraServices();

    // move the service rects to their full-page locations
    d3.selectAll("g.service-type")
      .filter(d => d.sourceNodes.length > 0 || d.targetNodes.length > 0)
      .transition()
      .duration(VIEW_DURATION)
      .attr("transform", d => `translate(${d.x},${d.y})`);

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
  };

  toNamespace = (previousView, nodes, path, zoomed, initial) => {
    if (previousView === "traffic") this.fromTraffic(path, "namespace");
    zoomed(VIEW_DURATION);

    this.showSiteLinks();
    this.hideLinks();
    this.hideEndpoints();
    //this.showExtraServices();
    // fade in the shadow rects and then hide them
    if (!initial)
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

    // move links to application locations
    path
      .selectAll("path.link")
      .transition()
      .duration(VIEW_DURATION)
      .attr("stroke-width", d => 2.5)
      .attr("opacity", 1)
      .attrTween("d", function(d, i) {
        const previous = d3.select(this).attr("d");
        const { sx, sy, tx, ty, sxoff, syoff, txoff, tyoff } = d.endpoints(0);
        const current = `M${sx + sxoff},${sy + syoff}L${tx + txoff},${ty +
          tyoff}`;
        return interpolatePath(previous, current);
      });

    // and also move the service rects to their proper position within the container
    d3.selectAll("g.service-type")
      .filter(d => d.sourceNodes.length > 0 || d.targetNodes.length > 0)
      .transition()
      .duration(VIEW_DURATION)
      .attr("transform", d => `translate(${d.orgx},${d.orgy})`);

    d3.selectAll("g.extra")
      .style("display", "block")
      .attr("transform", d => `translate(${d.orgx},${d.orgy})`)
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 1);
  };

  toTraffic = (previousView, nodes, path, zoom, svg) => {
    if (previousView === "namespace") this.fromNamespace(nodes);

    this.hideSiteLinks();
    this.showLinks();
    this.hideEndpoints();
    this.hideExtraServices();
    // move the service rects to their traffic locations
    d3.selectAll("g.service-type")
      .filter(d => d.sourceNodes.length > 0 || d.targetNodes.length > 0)
      .transition()
      .duration(VIEW_DURATION)
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    // expand services to traffic height
    d3.selectAll("rect.service-type")
      .transition()
      .duration(VIEW_DURATION)
      .attr("height", d => d.y1 - d.y0);

    // put service names in middle of rect
    d3.selectAll("text.service-type")
      .transition()
      .duration(VIEW_DURATION)
      .attr("y", d => (d.y1 - d.y0) / 2);

    // hide the hittarget paths
    path.selectAll("path.hittarget").style("display", "none");

    // change the path's width and location
    path
      .selectAll("path.link")
      .transition()
      .duration(VIEW_DURATION)
      .attr("stroke-width", d => d.width)
      .attr("opacity", 0.25)
      .attrTween("d", function(d, i) {
        const previous = d3.select(this).attr("d");
        const current = d.sankeyLinkHorizontal(d, i);
        return interpolatePath(previous, current);
      });

    zoom.scale(0.8);
    zoom.translate([100, 50]);
    svg
      .transition()
      .duration(VIEW_DURATION)
      .attr("transform", `translate(100,50) scale(0.8)`);
  };

  toChord = (previousView, nodes, path, zoom, svg) => {
    if (previousView === "namespace") this.fromNamespace(nodes);

    const arcs = [
      "M8.621513465997368e-15,-140.8A140.8,140.8 0 1,1 -25.207363938356032,-138.52519194456752L-22.91578539850548,-125.93199267687955A128,128 0 1,0 7.83773951454306e-15,-128Z",
      "M-16.85547878627989,-139.78745592822438A140.8,140.8 0 0,1 -16.85547878627989,-139.78745592822438L-15.323162532981716,-127.07950538929488A128,128 0 0,0 -15.323162532981716,-127.07950538929488Z",
      "M-8.442932112305897,-140.54663602287675A140.8,140.8 0 0,1 -8.442932112305897,-140.54663602287675L-7.675392829368996,-127.76966911170612A128,128 0 0,0 -7.675392829368996,-127.76966911170612Z"
    ];
    const chords = [
      "M7.83773951454306e-15,-128A128,128,0,1,1,-126.74926989275632,17.85000228720486Q0,0,-15.323162532981716,-127.07950538929488Q0,0,7.83773951454306e-15,-128Z",
      "M-126.74926989275632,17.85000228720486A128,128,0,0,1,-22.91578539850548,-125.93199267687955Q-7.18044790315638,-59.5495718356224,-7.675392829368996,-127.76966911170612Q0,0,-126.74926989275632,17.85000228720486Z"
    ];

    this.hideSiteLinks();
    this.showLinks();
    this.hideEndpoints();
    this.hideExtraServices();

    const self = this;
    d3.selectAll("rect.service-type").each(function() {
      d3.select(this)
        .transition()
        .duration(VIEW_DURATION)
        .attrTween("d", function(d, i) {
          const previous = self.rect2Path({
            x: d.x,
            y: d.y,
            width: d.getWidth(),
            height: d.getHeight()
          });
          console.log("----------");
          console.log(previous);
          const current = arcs[i];
          console.log(current);
          return interpolatePath(previous, current);
        });
    });

    path
      .selectAll("path.link")
      .transition()
      .duration(VIEW_DURATION)
      .attr("stroke-width", d => d.width)
      .attr("opacity", 0.25)
      .attrTween("d", function(d, i) {
        const previous = d3.select(this).attr("d");
        const current = chords[i];
        return interpolatePath(previous, current);
      });

    // hide the hittarget paths
    path.selectAll("path.hittarget").style("display", "none");

    zoom.scale(0.8);
    zoom.translate([100, 50]);
    svg
      .transition()
      .duration(VIEW_DURATION)
      .attr("transform", `translate(100,50) scale(0.8)`);
    /*
    <svg width="516" height="516" aria-label="chord-svg">
      <g id="circle" transform="translate(258,258)">
        <circle r="256"></circle>
        <circle r="128"></circle>
        <g class="chart-container">
          <g class="arc" aria-label="DB">
            <path
              d="M8.621513465997368e-15,-140.8A140.8,140.8 0 1,1 -25.207363938356032,-138.52519194456752L-22.91578539850548,-125.93199267687955A128,128 0 1,0 7.83773951454306e-15,-128Z"
              style="fill: rgb(31, 119, 180); stroke: rgb(31, 119, 180);"
            ></path>
            <text
              dy=".35em"
              text-anchor="begin"
              transform="rotate(84.84337984382262) translate(150.8,0) "
            >
              DB
            </text>
          </g>
          <g class="arc" aria-label="productpage">
            <path
              d="M-16.85547878627989,-139.78745592822438A140.8,140.8 0 0,1 -16.85547878627989,-139.78745592822438L-15.323162532981716,-127.07950538929488A128,128 0 0,0 -15.323162532981716,-127.07950538929488Z"
              style="fill: rgb(255, 127, 14); stroke: rgb(255, 127, 14);"
            ></path>
            <text
              dy=".35em"
              text-anchor="end"
              transform="rotate(263.12450645843006) translate(150.8,0) rotate(180)"
            >
              productpage
            </text>
          </g>
          <g class="arc" aria-label="ratings">
            <path
              d="M-8.442932112305897,-140.54663602287675A140.8,140.8 0 0,1 -8.442932112305897,-140.54663602287675L-7.675392829368996,-127.76966911170612A128,128 0 0,0 -7.675392829368996,-127.76966911170612Z"
              style="fill: rgb(44, 160, 44); stroke: rgb(44, 160, 44);"
            ></path>
            <text
              dy=".35em"
              text-anchor="end"
              transform="rotate(266.562253229215) translate(150.8,0) rotate(180)"
            >
              ratings
            </text>
          </g>
          <path
            class="chord"
            d="M7.83773951454306e-15,-128A128,128,0,1,1,-126.74926989275632,17.85000228720486Q0,0,-15.323162532981716,-127.07950538929488Q0,0,7.83773951454306e-15,-128Z"
            style="stroke: rgb(110, 152, 160); fill: rgb(158, 218, 229);"
          ></path>
          <path
            class="chord"
            d="M-126.74926989275632,17.85000228720486A128,128,0,0,1,-22.91578539850548,-125.93199267687955Q-7.18044790315638,-59.5495718356224,-7.675392829368996,-127.76966911170612Q0,0,-126.74926989275632,17.85000228720486Z"
            style="stroke: rgb(110, 152, 160); fill: rgb(158, 218, 229);"
          ></path>
        </g>
      </g>
    </svg>;
    */
  };

  fromTraffic = (path, view) => {
    // contract services to smaller height
    d3.selectAll("rect.service-type")
      .transition()
      .duration(VIEW_DURATION)
      .attr("height", d => {
        return d.getHeight();
      });

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
      .attr("opacity", 0);
  };

  showSiteLinks = () => {
    d3.selectAll("g.siteLinks")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 1);
  };

  hideLinks = () => {
    d3.selectAll("g.links")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 0)
      .each("end", function() {
        d3.select(this).style("display", "none");
      });
  };

  showLinks = () => {
    d3.selectAll("g.links")
      .style("display", "block")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 1);
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
      .attr("opacity", 0)
      .each("end", function() {
        d3.select(this).style("display", "none");
      });
  };

  showExtraServices = () => {
    d3.selectAll("g.extra")
      .attr("opacity", 0)
      .style("display", "block")
      .transition()
      .duration(VIEW_DURATION)
      .attr("opacity", 1);
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
      console.log(
        `width ${width} ${d.address}: x0 ${d.x0}  before x1 ${d.x1} width ${
          d.width
        } after ${d.x0 + d.getWidth()}`
      );
      console.log(d);
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

    if (view === "application") {
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
      if (view === "namespace") {
        return `translate(${d.orgx},${d.orgy})`;
      } else if (view === "application") {
        return `translate(${d.x}, ${d.y})`;
      } else {
        return `translate(${d.x0},${d.y0})`;
      }
    };
  };

  expandService = (d, nodes, view, path, width) => {
    d.expanded = !d.expanded;
    this.recalcY(nodes);
    this.expandCluster(d, view, path, width);
  };

  // get a path that represents a rectangle
  rect2Path = rect =>
    `M${rect.x} ${rect.y} L ${rect.x + rect.width} ${rect.y} L ${rect.x +
      rect.width} ${rect.y + rect.height} L ${rect.x} ${rect.y +
      rect.height} Z`;
}

export default Transitions;
