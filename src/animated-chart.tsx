import { hydrateRoot } from "react-dom/client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import moment from "moment";
import { times } from "./utils/functions/times";

type Data = { age: number; netWorth: number; isRetired: boolean };

export default function AnimatedChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [markerAge, setMarkerAge] = useState(65);

  const date_of_birth = moment('1991-12-13');
  const age = moment().diff(date_of_birth, 'years');
  const age_moment = moment(date_of_birth).add(age, 'years');

  const retirementAge = 65;
  const retirementMoment = moment(date_of_birth).add(retirementAge, 'years');

  const deathAge = 92;
  const deathMoment = moment(date_of_birth).add(deathAge, 'years');

  const tax_rate = 0.3;
  const pre_retirement_annual_income = 120_000;
  const post_retirement_annual_income = 12_000;
  const post_retirment_monthly_expenses = 15_000;
  const annual_investment_return_pct = 0.07;
  const savings_rate = 0.10;
  const monthly_investment_return_pct = annual_investment_return_pct / 12;
  const post_tax_monthly_income = (pre_retirement_annual_income / 12) * (1 - tax_rate);
  const pre_retirement_monthly_savings = post_tax_monthly_income * savings_rate;
  const post_restirement_monthly_income = post_retirement_annual_income / 12;
  const retirement_expenses = post_restirement_monthly_income - post_retirment_monthly_expenses;

  const starting_savings = 100000;
  const data: Data[] = [];

  let virtual_age = useMemo(() => age, []);
  let virtual_savings = useMemo(() => starting_savings, []);

  const months_until_death = deathMoment.diff(moment(), 'months');
  times(months_until_death, (i) => {
    if (i !== 0 && i % 12 === 0) virtual_age += 1;

    if (moment(age_moment).add(i, 'months').isSameOrBefore(retirementMoment)) {
      virtual_savings += virtual_savings * monthly_investment_return_pct + pre_retirement_monthly_savings;
      data.push({ age: virtual_age + ((i % 12) / 12), netWorth: virtual_savings, isRetired: false });
    } else {
      virtual_savings += virtual_savings * monthly_investment_return_pct + retirement_expenses;
      data.push({ age: virtual_age + ((i % 12) / 12), netWorth: virtual_savings, isRetired: true });
    }
  });

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
      .domain([age, deathAge])
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
      .area<Data>()
      .x((d) => xScale(d.age))
      .y0(yScale(0))
      .y1((d) => yScale(d.netWorth))
      .curve(d3.curveMonotoneX);

    const lineGenerator = d3
      .line<Data>()
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
      const newAge = Math.floor(xScale.invert(mouseX));

      if (newAge >= age && newAge <= deathAge) {
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
}

if (typeof document !== "undefined") {
  const root = document.getElementById("root")!;
  hydrateRoot(root, <AnimatedChart />);
}
