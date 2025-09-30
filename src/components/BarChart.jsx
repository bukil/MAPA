import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

// Minimal, self-contained bar chart example using D3
// Usage example (when you want to render it):
// <BarChart data={[4, 8, 15, 16, 23, 42]} width={400} height={200} />

export default function BarChart({ data = [], width = 400, height = 200, margin = 24 }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const w = width
    const h = height
    const m = margin

    // Clear previous render
    d3.select(el).selectAll('*').remove()

    const svg = d3
      .select(el)
      .append('svg')
      .attr('viewBox', `0 0 ${w} ${h}`)
      .attr('width', '100%')
      .attr('height', '100%')

    const x = d3
      .scaleBand()
      .domain(d3.range(data.length))
      .range([m, w - m])
      .padding(0.1)

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data) || 0])
      .nice()
      .range([h - m, m])

    // Bars
    svg
      .append('g')
      .attr('fill', '#4f46e5')
      .selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', (_, i) => x(i))
      .attr('y', d => y(d))
      .attr('width', x.bandwidth())
      .attr('height', d => y(0) - y(d))
      .attr('rx', 4)

    // X Axis
    const xAxis = g =>
      g
        .attr('transform', `translate(0,${h - m})`)
        .call(
          d3
            .axisBottom(x)
            .tickFormat(i => (data[i] != null ? String(i + 1) : ''))
            .tickSizeOuter(0)
        )

    // Y Axis
    const yAxis = g =>
      g
        .attr('transform', `translate(${m},0)`) 
        .call(d3.axisLeft(y).ticks(5))
        .call(g => g.select('.domain').remove())

    svg.append('g').call(xAxis)
    svg.append('g').call(yAxis)
  }, [data, width, height, margin])

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />
}
