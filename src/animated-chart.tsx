import { hydrateRoot } from "react-dom/client";
import { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import * as d3 from "d3";
import "virtual:windi.css";

function money(value?: number): string {
  if (value === undefined) return "$0.00";
  const val = value.toLocaleString();
  if (val.match(/\.\d{3}$/)) return "$" + val.slice(0, -1);
  return "$" + val;
}

function clampZero(value: number) {
  return Number(Math.max(0, value).toFixed(2));
}

type Data = { age: number; net_worth: number; is_retired: boolean };

export default function AnimatedChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [markerAge, setMarkerAge] = useState(65);

  const date_of_birth = moment('1991-06-05');
  const age = moment().diff(date_of_birth, 'months') / 12;
  const age_moment = moment({ date: date_of_birth.date() });

  const retirement_age = 65;
  const retirement_moment = moment(date_of_birth).add(retirement_age, 'years');

  const death_age = 92;
  const death_moment = moment(date_of_birth).add(death_age, 'years');

  const working_annual_income = 180_000;
  const retirement_gross_annual_income = 0;
  const retirment_monthly_expenses = 10000;
  const tax_rate = 0.5;
  const savings_rate = 0.15;
  const annual_investment_return_pct = 0.07;

  const monthly_return_pct = annual_investment_return_pct / 12;
  const post_tax_monthly_income = (working_annual_income / 12) * (1 - tax_rate);
  const monthly_savings_contribution = post_tax_monthly_income * savings_rate;
  const retirement_gross_monthly_income = retirement_gross_annual_income / 12;
  const retirement_net_income = retirement_gross_monthly_income - retirment_monthly_expenses;

  const invested_savings = 2500;
  const data: Data[] = [{ age, net_worth: invested_savings, is_retired: false }];

  let virtual_savings = useMemo(() => invested_savings, []);
  while (age_moment.isSameOrBefore(death_moment, 'months')) {
    const virtual_age = age_moment.diff(date_of_birth, 'years', true);

    const income_modifier = data.at(-1)!.is_retired
      ? retirement_net_income
      : monthly_savings_contribution;

    virtual_savings += virtual_savings * monthly_return_pct + income_modifier;
    virtual_savings = clampZero(virtual_savings);
    data.push({
      age: virtual_age,
      net_worth: virtual_savings,
      is_retired: age_moment.isSameOrAfter(retirement_moment),
    });
    age_moment.add(1, 'month');
  }

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;
    const margin = 50;

    svg.selectAll("*").remove();

    svg.attr("style", `
      color: white;
      user-select: none;
      overflow: visible;
    `);

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
      .domain([age, death_age])
      .range([margin, width - margin]);

    const yScale = d3
      .scaleLinear()
      .domain([0, (d3.max(data, (d) => d.net_worth)! * 1.2)])
      .nice()
      .range([height - margin, margin]);

    const xAxis = d3.axisBottom(xScale).tickFormat((d) => `Age ${d}`);
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => {
      const value = +d;
      if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      return `$${value.toFixed(0)}`;
    });

    svg
      .append("g")
      .attr("transform", `translate(0,${height - margin})`)
      .call(xAxis)
      .selectAll("text")
      .attr("font-size", "12px");

    svg
      .append("g")
      .attr("transform", `translate(${margin},0)`)
      .call(yAxis)
      .selectAll("text")
      .attr("font-size", "12px");

    const areaGenerator = d3
      .area<Data>()
      .x((d) => xScale(d.age))
      .y0(yScale(0))
      .y1((d) => yScale(d.net_worth))
      .curve(d3.curveMonotoneX);

    const lineGenerator = d3
      .line<Data>()
      .x((d) => xScale(d.age))
      .y((d) => yScale(d.net_worth))
      .curve(d3.curveMonotoneX);

    const clipPath = svg
      .append("defs")
      .append("clipPath")
      .attr("id", "clip");

    const clipRect = clipPath
      .append("rect")
      .attr("x", margin)
      .attr("y", margin)
      .attr("width", 0)
      .attr("height", height - margin - margin);

    clipRect
      .transition()
      .duration(1000)
      .ease(d3.easeLinear)
      .attr("width", width - margin - margin);

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
      .attr("x1", xScale(retirement_age))
      .attr("x2", xScale(retirement_age))
      .attr("y1", margin + 20)
      .attr("y2", height - margin)
      .attr("stroke", "#4a90e2")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 4")
      .attr("cursor", "ew-resize");

    svg
      .append("text")
      .attr("class", "label")
      .attr("x", xScale(retirement_age))
      .attr("y", margin - 10)
      .attr("fill", "#4a90e2")
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .text(`Age ${retirement_age}`);

    svg
      .append("text")
      .attr("class", "net-worth")
      .attr("x", xScale(retirement_age))
      .attr("y", margin + 10)
      .attr("fill", "#4a90e2")
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text(`Net Worth: $${money(data.find((d) => d.is_retired === true)?.net_worth)}`);
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const xScale = d3
      .scaleLinear()
      .domain([age, death_age])
      .range([50, 750]);

    const line = svg.select("line.draggable");
    const label = svg.select("text.label");
    const net_worth = svg.select("text.net-worth");

    const updatePosition = (event: MouseEvent) => {
      const [mouseX] = d3.pointer(event);
      const newAge = Math.round(xScale.invert(mouseX));

      if (newAge >= age && newAge <= death_age) {
        setMarkerAge(newAge);
        line.attr("x1", xScale(newAge)).attr("x2", xScale(newAge));
        label.attr("x", xScale(newAge)).text(`Age ${newAge}`);
        net_worth.attr("x", xScale(newAge)).text(`Net Worth: ${money(data.find((d) => d.age === newAge)?.net_worth)}`);
      }
    };

    svg.on("mousedown", (event: MouseEvent) => {
      svg.on("mousemove", updatePosition);
      updatePosition(event);
    });

    d3.select(window).on("mouseup", () => {
      svg.on("mousemove", null);
    });

    return () => {
      svg.on("mousedown", null);
      d3.select(window).on("mouseup", null);
    };
  }, [markerAge]);

  return (
    <div className="w-screen h-screen bg-gray-800 flex flex-col items-center justify-center">
      <svg className="mt-4" ref={svgRef} width={800} height={600}></svg>
    </div>
  );
}

if (typeof document !== "undefined") {
  const root = document.getElementById("root")!;
  hydrateRoot(root, <AnimatedChart />);
}
