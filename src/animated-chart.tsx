import { hydrateRoot } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

const AnimatedChart = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [markerAge, setMarkerAge] = useState(47);

  const data = [
    { age: 30, netWorth: 1000000, liquidAssets: 500000 },
    { age: 47, netWorth: 6018590, liquidAssets: 2283389 },
    { age: 65, netWorth: 7283193, liquidAssets: 3283389 },
    { age: 92, netWorth: 9000000, liquidAssets: 4000000 },
  ];

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 30, bottom: 40, left: 50 };

    svg.selectAll("*").remove();

    svg.attr("style", "user-select: none;");

    const gradient = svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#4a90e2")
      .attr("stop-opacity", 0.5);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#4a90e2")
      .attr("stop-opacity", 0);

    const xScale = d3
      .scaleLinear()
      .domain([30, 92])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.netWorth)!])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const xAxis = d3.axisBottom(xScale).tickFormat((d) => `Age ${d}`);
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => `$${(+d / 1_000_000).toFixed(1)}M`);

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .attr("font-size", "12px");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxis)
      .selectAll("text")
      .attr("font-size", "12px");

    const areaGenerator = d3
      .area<{ age: number; netWorth: number; liquidAssets: number }>()
      .x((d) => xScale(d.age))
      .y0(yScale(0))
      .y1((d) => yScale(d.netWorth))
      .curve(d3.curveMonotoneX);

    const lineGenerator = d3
      .line<{ age: number; netWorth: number }>()
      .x((d) => xScale(d.age))
      .y((d) => yScale(d.netWorth))
      .curve(d3.curveMonotoneX);

    const clipPath = svg
      .append("defs")
      .append("clipPath")
      .attr("id", "clip");

    const clipRect = clipPath
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", 0)
      .attr("height", height - margin.top - margin.bottom);

    clipRect
      .transition()
      .duration(1000)
      .ease(d3.easeLinear)
      .attr("width", width - margin.left - margin.right);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "url(#gradient)")
      .attr("d", areaGenerator)
      .attr("clip-path", "url(#clip)");

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#4a90e2")
      .attr("stroke-width", 2)
      .attr("d", lineGenerator)
      .attr("clip-path", "url(#clip)");

    svg
      .append("line")
      .attr("class", "draggable")
      .attr("x1", xScale(markerAge))
      .attr("x2", xScale(markerAge))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#4a90e2")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 4")
      .attr("cursor", "ew-resize");

    svg
      .append("text")
      .attr("class", "label")
      .attr("x", xScale(markerAge))
      .attr("y", margin.top - 10)
      .attr("fill", "#4a90e2")
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .text(`Age ${markerAge}`);
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const xScale = d3
      .scaleLinear()
      .domain([30, 92])
      .range([50, 750]);

    const line = svg.select("line.draggable");
    const label = svg.select("text.label");

    const updatePosition = (event: MouseEvent) => {
      const [mouseX] = d3.pointer(event);
      const newAge = Math.round(xScale.invert(mouseX));

      if (newAge >= 30 && newAge <= 92) {
        setMarkerAge(newAge);
        line.attr("x1", xScale(newAge)).attr("x2", xScale(newAge));
        label.attr("x", xScale(newAge)).text(`Age ${newAge}`);
      }
    };

    svg.on("mousedown", () => {
      svg.on("mousemove", updatePosition);
    });

    d3.select(window).on("mouseup", () => {
      svg.on("mousemove", null);
    });

    return () => {
      svg.on("mousedown", null);
      d3.select(window).on("mouseup", null);
    };
  }, [markerAge]);

  return <svg ref={svgRef} width={800} height={400}></svg>;
};

export default AnimatedChart;

if (typeof document !== "undefined") {
  const root = document.getElementById("root")!;
  hydrateRoot(root, <AnimatedChart />);
}
