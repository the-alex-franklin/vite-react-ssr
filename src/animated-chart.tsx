import { hydrateRoot } from "react-dom/client";
import { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import * as d3 from "d3";
import { z } from "zod";
import { pipe } from "./utils/functions/pipe";
import "virtual:windi.css";

const initial_data = typeof window !== "undefined" ? window.__INITIAL_DATA__ : null;
const schema = z.object({
  date_of_birth: z.string().transform((value) => moment(value)),
  retirement_age: z.number(),
  death_age: z.number(),
  working_annual_income: z.number(),
  retirment_monthly_expenses: z.number(),
  tax_rate: z.number(),
  savings_rate: z.number(),
  annual_investment_return_pct: z.number(),
  invested_savings: z.number(),
});
type Schema = z.infer<typeof schema>;
// const parsed_data = schema.nullish().safeParse(initial_data).data;
const parsed_data = {
  date_of_birth: moment("1991-06-05"),
  retirement_age: 65,
  death_age: 94,
  working_annual_income: 180_000,
  retirment_monthly_expenses: 10_000,
  tax_rate: 0.25,
  savings_rate: 0.15,
  annual_investment_return_pct: 0.07,
  invested_savings: 0,
};

function money(value: number | null | undefined): string {
  if (!value) return '$0.00';
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function clampZero(value: number): number {
  return Math.max(0, value);
}

function twoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function binarySearch(chart_data: ChartData[], new_age: number): ChartData {
  if (chart_data.length === 0) throw new Error("Empty chart data");

  let left = 0;
  let right = chart_data.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (mid < 0 || mid >= chart_data.length) break;

    const midValue = chart_data[mid];
    if (midValue == null) throw new Error("Out of range");

    if (midValue.age === new_age) return midValue;

    if (midValue.age < new_age) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  if (left < chart_data.length) return chart_data[left]!;
  return chart_data.at(-1)!;
}

const my_blue = "#4a90e2";

type ChartData = {
  age: number;
  net_worth: number;
  is_retired: boolean;
};

export default function AnimatedChart() {
  if (!parsed_data) return (
    <div className="w-screen h-screen bg-gray-800 flex flex-col items-center justify-center">
      <div className="text-white text-2xl">No data provided</div>
    </div>
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const [markerAge, setMarkerAge] = useState(parsed_data.retirement_age);

  const { chart_data, age, retirement_age, death_age } = useMemo(() => {
    const {
      date_of_birth,
      retirement_age,
      death_age,
      working_annual_income,
      retirment_monthly_expenses,
      tax_rate,
      savings_rate,
      annual_investment_return_pct,
      invested_savings,
    } = parsed_data;

    const age = moment().diff(date_of_birth, 'months') / 12;
    const age_moment = moment({ date: date_of_birth.date() });
    const retirement_moment = moment(date_of_birth).add(retirement_age, 'years');
    const death_moment = moment(date_of_birth).add(death_age + 1, 'years');

    const monthly_return_pct = annual_investment_return_pct / 12;
    const post_tax_monthly_income = (working_annual_income / 12) * (1 - tax_rate);
    const monthly_savings_contribution = post_tax_monthly_income * savings_rate;

    let virtual_savings = clampZero(invested_savings);
    const chart_data: ChartData[] = [{ age, net_worth: virtual_savings, is_retired: false }];
    while (age_moment.add(1, 'month').isBefore(death_moment, 'month')) {
      const virtual_age = age_moment.diff(date_of_birth, 'years', true);

      const income_modifier = chart_data.at(-1)!.is_retired
        ? -retirment_monthly_expenses
        : monthly_savings_contribution;

      virtual_savings += virtual_savings * monthly_return_pct + income_modifier;

      chart_data.push({
        age: twoDecimals(virtual_age),
        net_worth: clampZero(virtual_savings),
        is_retired: age_moment.isSameOrAfter(retirement_moment, 'month'),
      });
    }

    return { chart_data, age, retirement_age, death_age };
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
      .attr("stop-color", my_blue)
      .attr("stop-opacity", 0.5);

    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", my_blue)
      .attr("stop-opacity", 0);

    const xScale = d3
      .scaleLinear()
      .domain([age, death_age + 1])
      .range([margin, width - margin]);

    const yScale = d3
      .scaleLinear()
      .domain([0, (d3.max(chart_data, (d) => d.net_worth)! * 1.1)])
      .nice()
      .range([height - margin, margin]);

    const xAxis = d3.axisBottom(xScale).tickFormat((d) => `Age ${d}`);
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => {
      const value = +d;
      if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
      if (value >= 100_000) return `$${(value / 1_000_000).toFixed(1)}M`;
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
      .area<ChartData>()
      .x((d) => xScale(d.age))
      .y0(yScale(0))
      .y1((d) => yScale(d.net_worth))
      .curve(d3.curveMonotoneX);

    const lineGenerator = d3
      .line<ChartData>()
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
      .attr("height", height - margin * 2);

    clipRect
      .transition()
      .duration(1000)
      .ease(d3.easeLinear)
      .attr("width", width - margin * 2);

    svg
      .append("path")
      .datum(chart_data)
      .attr("fill", "url(#gradient)")
      .attr("d", areaGenerator)
      .attr("clip-path", "url(#clip)");

    svg
      .append("path")
      .datum(chart_data)
      .attr("fill", "none")
      .attr("stroke", my_blue)
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
      .attr("stroke", my_blue)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 4")
      .attr("cursor", "ew-resize");

    svg
      .append("text")
      .attr("class", "label")
      .attr("x", xScale(retirement_age))
      .attr("y", margin - 10)
      .attr("fill", my_blue)
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", "14px")
      .text(`Age ${retirement_age}`);

    svg
      .append("text")
      .attr("class", "net-worth")
      .attr("x", xScale(retirement_age))
      .attr("y", margin + 10)
      .attr("fill", my_blue)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text(`Net Worth: ${
      pipe(
        binarySearch(chart_data, retirement_age).net_worth,
        money,
      )}`);
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

      const entry = binarySearch(chart_data, new_age);
      if (entry && entry.age >= age && entry.age < death_age + 1) {
        setMarkerAge(entry.age);
        line.attr("x1", xScale(entry.age)).attr("x2", xScale(entry.age));
        label.attr("x", xScale(entry.age)).text(`Age ${Math.floor(entry.age)}`);
        net_worth.attr("x", xScale(entry.age)).text(`Net Worth: ${money(entry.net_worth)}`);
      }
    };

    svg.on("mousedown", (event: MouseEvent) => {
      updatePosition(event);
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
