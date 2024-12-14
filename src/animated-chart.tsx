import { hydrateRoot } from "react-dom/client";
import { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import * as d3 from "d3";
import { z } from "zod";
import "virtual:windi.css";

const initial_data = typeof window !== "undefined" ? window.__INITIAL_DATA__ : null;
const parsed_data = z.object({
  date_of_birth: z.string(),
  retirement_age: z.number(),
  death_age: z.number().transform((value) => value + 1),
  working_annual_income: z.number(),
  retirement_gross_annual_income: z.number(),
  retirment_monthly_expenses: z.number(),
  tax_rate: z.number(),
  savings_rate: z.number(),
  annual_investment_return_pct: z.number(),
  invested_savings: z.number(),
}).safeParse(initial_data);

function money(value: number | null | undefined): string {
  if (value == null) return '$0.00';
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type Data = { age: number; net_worth: number; is_retired: boolean };

export default function AnimatedChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [markerAge, setMarkerAge] = useState(65);

  // if (!parsed_data.success) return (
  //   <div className="w-screen h-screen bg-gray-800 flex flex-col items-center justify-center">
  //     <div className="text-white">Invalid data</div>
  //   </div>
  // );

  const { data, age, death_age, retirement_age, invested_savings } = useMemo(() => {
    const date_of_birth = moment('1991-06-05');
    const age = moment().diff(date_of_birth, 'months') / 12;
    const age_moment = moment({ date: date_of_birth.date() });

    const retirement_age = 65;
    const retirement_moment = moment(date_of_birth).add(retirement_age, 'years');

    const death_age = 94;
    const death_moment = moment(date_of_birth).add(death_age + 1, 'years');

    const working_annual_income = 180_000;
    const retirement_gross_annual_income = 0;
    const retirment_monthly_expenses = 60_000;
    const tax_rate = 0.35;
    const savings_rate = 0.1;
    const annual_investment_return_pct = 0.15;

    const monthly_return_pct = annual_investment_return_pct / 12;
    const post_tax_monthly_income = (working_annual_income / 12) * (1 - tax_rate);
    const monthly_savings_contribution = post_tax_monthly_income * savings_rate;
    const retirement_gross_monthly_income = retirement_gross_annual_income / 12;
    const retirement_net_income = retirement_gross_monthly_income - retirment_monthly_expenses;

    const invested_savings = 25_000;
    const data: Data[] = [{ age, net_worth: invested_savings, is_retired: false }];

    let virtual_savings = invested_savings;
    const start = performance.now();
    while (age_moment.isSameOrBefore(death_moment, 'month')) {
      age_moment.add(1, 'month');
      const virtual_age = age_moment.diff(date_of_birth, 'years', true);

      const income_modifier = data.at(-1)!.is_retired
        ? retirement_net_income
        : monthly_savings_contribution;

      virtual_savings += virtual_savings * monthly_return_pct + income_modifier;
      if (virtual_savings < 0) virtual_savings = 0;

      data.push({
        age: Math.round(virtual_age * 100) / 100,
        net_worth: virtual_savings,
        is_retired: age_moment.isSameOrAfter(retirement_moment),
      });
    }

    const end = performance.now();
    console.log('Execution time:', end - start);

    return { data, age, death_age, retirement_age, invested_savings };
  }, []);

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
      .domain([age, death_age + 1])
      .range([margin, width - margin]);

    const yScale = d3
      .scaleLinear()
      .domain([0, (d3.max(data, (d) => d.net_worth)! * 1.1)])
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
      .text(`Net Worth: ${money(data.find((d) => d.is_retired === true)?.net_worth)}`);
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const xScale = d3
      .scaleLinear()
      .domain([age, death_age + 1])
      .range([50, 750]);

    const line = svg.select("line.draggable");
    const label = svg.select("text.label");
    const net_worth = svg.select("text.net-worth");

    const updatePosition = (event: MouseEvent) => {
      const [mouseX] = d3.pointer(event);
      const new_age = xScale.invert(mouseX);

      const entry = data.find((d) => d.age >= new_age);

      if (entry && entry.age >= age && entry.age < death_age + 1) {
        setMarkerAge(entry.age);
        line.attr("x1", xScale(entry.age)).attr("x2", xScale(entry.age));
        label.attr("x", xScale(entry.age)).text(`Age ${Math.floor(entry.age)}`);
        net_worth.attr("x", xScale(entry.age)).text(`Net Worth: ${money(entry.net_worth)}`);
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
