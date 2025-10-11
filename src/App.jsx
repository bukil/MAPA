// ...existing code...
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import indiaTopoJSON from './map.json'

function App() {
  const svgRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const width = 460
    const height = 600
    const padding = 15

    svg.attr('width', width).attr('height', height)

    // Convert TopoJSON to GeoJSON
    const geoData = topojson.feature(indiaTopoJSON, indiaTopoJSON.objects.india)
    
    const projection = d3.geoMercator()
      .fitSize([width - padding * 2, height - padding * 2], geoData)
    const path = d3.geoPath().projection(projection)
    
    // Add a group element with translation for padding
    const g = svg.append('g')
      .attr('transform', `translate(${padding}, ${padding})`)

    // Color scale for choropleth
    const colorScale = d3.scaleQuantize()
      .domain([0, 100])
      .range(['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'])

    g.selectAll('path')
      .data(geoData.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', d => colorScale(Math.random() * 100)) // Random data for now
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 2)
        d3.select(this).attr('stroke', '#000')
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('stroke-width', 0.5)
        d3.select(this).attr('stroke', '#333')
      })
      .append('title')
      .text(d => d.properties.name || 'Unknown')
  }, [])

  useEffect(() => {
    // Create line chart with all Indian states
    const chartSvg = d3.select(chartRef.current)
    chartSvg.selectAll('*').remove()
    
    const width = 900
    const height = 550
    const margin = { top: 40, right: 40, bottom: 120, left: 60 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    chartSvg.attr('width', width).attr('height', height)

    // Indian states and UTs in alphabetical order with sample data
    const states = [
      'Andaman & Nicobar Island', 'Andhra Pradesh', 'Arunanchal Pradesh', 'Assam',
      'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadara & Nagar Havelli',
      'Daman & Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
      'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Lakshadweep',
      'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
      'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim',
      'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
      'West Bengal'
    ].sort()

    // Generate sample data (random values for now)
    const data = states.map((state, i) => ({
      state: state,
      value: Math.floor(Math.random() * 40) + 10,
      index: i
    }))

    const g = chartSvg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, chartWidth])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value)])
      .range([chartHeight, 0])

    // Create line generator
    const line = d3.line()
      .x(d => xScale(d.index))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX)

    // Add line path
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4292c6')
      .attr('stroke-width', 3)
      .attr('d', line)

    // Add dots
    g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.index))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4)
      .attr('fill', '#2171b5')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 6).attr('fill', '#08519c')
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('r', 4).attr('fill', '#2171b5')
      })
      .append('title')
      .text(d => `${d.state}: ${d.value}%`)

    // Add x-axis with state names
    const xAxis = d3.axisBottom(xScale)
      .tickValues(data.map(d => d.index))
      .tickFormat(i => data[i].state)

    g.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-65)')
      .style('text-anchor', 'end')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '9px')

    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '11px')

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-chartWidth)
        .tickFormat('')
      )
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7)

    // Add chart title
    chartSvg.append('text')
      .attr('x', width / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Smoking Prevalence by State (%)')

    // Add y-axis label
    chartSvg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '13px')
      .text('Prevalence (%)')
  }, [])

  return (
    <main style={{ minHeight: '100vh', background: '#fff', margin: 0 }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#222', textAlign: 'left', marginTop: '2rem', marginBottom: '2rem', marginLeft: '2rem', fontFamily: 'Anton, sans-serif' }}>
        Exploring the Links Between Literacy, Salary & Societal Issues in India
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1rem', color: '#555', lineHeight: '1.6' }}>
          <p>This project explores how literacy rates and income levels relate to various societal issues and crimes in India.
We wanted to look beyond numbers — to see if education and wealth actually make a society more equal, just, and emotionally stable, or if they also create new challenges.

Through data visualization and analysis, we examined complex relationships between literacy, salary, gender ratio, crime rates, conviction rates, divorce, domestic violence, and student suicides.</p>
        </div>
        
      </div>
      <div style={{ margin: '2rem', height: '600px', border: '2px solid #ddd', borderRadius: '0px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 0 }}>
        <div style={{ borderRight: '2px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflow: 'hidden' }}>
          <svg ref={svgRef}></svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowX: 'auto' }}>
          <svg ref={chartRef}></svg>
        </div>
      </div>
      <footer style={{ padding: '2rem', textAlign: 'center', fontFamily: 'Manrope, sans-serif', fontSize: '0.75rem', color: '#666', borderTop: '1px solid #ddd', marginTop: '2rem' }}>
        <p style={{ margin: 0, lineHeight: '1.8' }}>
          <a href="https://bukil.github.io/MAPA/" style={{ color: '#4292c6', textDecoration: 'none' }}>Data visualisation on Salary and Societal Issues</a> © 2025 by <a href="https://bukil.github.io/MAPA/" style={{ color: '#4292c6', textDecoration: 'none' }}>MUKIL | ARINDUM | ABHISHEK | PRADUMN</a> is licensed under <a href="https://creativecommons.org/licenses/by/4.0/" style={{ color: '#4292c6', textDecoration: 'none' }}>Creative Commons Attribution 4.0 International</a>
          <img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="CC" style={{ maxWidth: '1em', maxHeight: '1em', marginLeft: '.2em', verticalAlign: 'middle' }} />
          <img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="BY" style={{ maxWidth: '1em', maxHeight: '1em', marginLeft: '.2em', verticalAlign: 'middle' }} />
        </p>
      </footer>
    </main>
  )
}

export default App
