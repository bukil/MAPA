// ...existing code...
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import indiaTopoJSON from './map.json'

function App() {
  const svgRef = useRef(null)
  const svgRef2 = useRef(null)
  const chartRef = useRef(null)
  const containerRef = useRef(null)
  const overlayRef = useRef(null)
  const dotsRef = useRef(new Map())

  // Helpers shared across effects
  const normalizeName = (s) => String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const drawProjectile = (from, to, stroke, dotFill) => {
    const overlayEl = overlayRef.current
    const containerEl = containerRef.current
    if (!overlayEl || !containerEl) return
    d3.select(overlayEl)
      .attr('width', containerEl.clientWidth)
      .attr('height', containerEl.clientHeight)
    const overlay = d3.select(overlayEl)
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.hypot(dx, dy)
    const arc = Math.min(140, Math.max(40, dist * 0.25))
    const cx = (from.x + to.x) / 2
    const cy = (from.y + to.y) / 2 - arc
    const path = overlay.append('path')
      .attr('d', `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`)
      .attr('fill', 'none')
      .attr('stroke', stroke)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,6')
      .attr('opacity', 0.95)
    const len = path.node().getTotalLength()
    const projectile = overlay.append('circle')
      .attr('r', 5)
      .attr('fill', dotFill || stroke)
      .attr('cx', from.x)
      .attr('cy', from.y)
    projectile
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .tween('move', () => t => {
        const p = path.node().getPointAtLength(t * len)
        projectile.attr('cx', p.x).attr('cy', p.y)
      })
  }
  
  const [csvData, setCsvData] = useState([])
  const [variable1, setVariable1] = useState('Literacy Rate %')
  const [variable2, setVariable2] = useState('Monthly Salary (2025)')
  
  // Available variables from CSV
  const variables = [
    'Population in crores',
    'Literacy Rate %',
    'Illiteracy Rate',
    'Monthly Salary (2025)',
    'Daily Salary (2025)',
    'Women per 1,000 Men (2025)',
    'Highest Unemployment Rates',
    'Conviction Rate (%)',
    'Dowry Deaths in India',
    'Divorce Rate (per 1,000 Married Couples)',
    'Estimated Cases Against Minorities (2025)',
    'India’s 2025 School Dropout Rates',
    'Crimes per 1 Lakh people',
    '% Share of Crimes',
    'Sexual Harassment Cases in India 2025',
    'Domestic Violence in India',
    'Estimated Online Fraud Cases (2025)',
    'Projected Student Suicides (2025)'
  ]

  // Load and parse CSV data robustly (skip stray header line)
  useEffect(() => {
    const loadCsv = async () => {
      const tryPaths = ['/MAPA/Dataviz final maps mapa - Sheet1.csv', '/Dataviz final maps mapa - Sheet1.csv']
      let text = null
      for (const p of tryPaths) {
        try {
          // Use d3.text so we can pre-clean the file
          // eslint-disable-next-line no-await-in-loop
          text = await d3.text(p)
          console.log('CSV text loaded from', p)
          break
        } catch (e) {
          console.warn('Failed to load CSV from', p, e)
        }
      }
      if (!text) {
        console.error('Unable to load CSV from any path')
        return
      }
      // Clean BOM and whitespace
      text = text.replace(/^\uFEFF/, '').trimStart()
      const lines = text.split(/\r?\n/)
      // Find the real header row (should contain 'State/UT')
      const headerIndex = lines.findIndex(l => l.includes('State/UT'))
      if (headerIndex > 0) {
        console.log('Skipping stray lines before header:', headerIndex)
      }
      const cleaned = lines.slice(headerIndex).join('\n')
      const parsed = d3.csvParse(cleaned)
      console.log('Parsed CSV rows:', parsed.length)
      setCsvData(parsed)
    }
    loadCsv()
  }, [])

  // First map
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const width = 280
    const height = 380
    const padding = 10

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
        d3.select(this).attr('stroke-width', 2).attr('stroke', '#000')
        const containerEl = containerRef.current
        const overlayEl = overlayRef.current
        const dotsMap = dotsRef.current
        if (!containerEl || !overlayEl || !dotsMap) return
        const containerRect = containerEl.getBoundingClientRect()
        const r = this.getBoundingClientRect()
        const stateCenter = { x: r.left - containerRect.left + r.width / 2, y: r.top - containerRect.top + r.height / 2 }
        const stateName = normalizeName(d.properties && d.properties.name)
        const dotInfo = dotsMap.get(stateName)
        d3.select(overlayEl).selectAll('*').remove()
        if (dotInfo) {
          drawProjectile(stateCenter, { x: dotInfo.x, y: dotInfo.y }, '#4292c6', '#4292c6')
          d3.select(dotInfo.el).attr('r', 10).attr('fill', '#08519c').attr('opacity', 1)
        }
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 0.5).attr('stroke', '#333')
        if (overlayRef.current) d3.select(overlayRef.current).selectAll('*').remove()
        // reset highlighted dot if any
        const dotsMap = dotsRef.current
        if (dotsMap) {
          // This is a blunt reset of all dots to default visual
          d3.select(chartRef.current).selectAll('.dot')
            .attr('r', 6)
            .attr('fill', '#4292c6')
            .attr('opacity', 0.7)
        }
      })
      .append('title')
      .text(d => d.properties.name || 'Unknown')
  }, [])

  // Second map
  useEffect(() => {
    const svg = d3.select(svgRef2.current)
    svg.selectAll('*').remove()
    const width = 280
    const height = 380
    const padding = 10

    svg.attr('width', width).attr('height', height)

    // Convert TopoJSON to GeoJSON
    const geoData = topojson.feature(indiaTopoJSON, indiaTopoJSON.objects.india)
    
    const projection = d3.geoMercator()
      .fitSize([width - padding * 2, height - padding * 2], geoData)
    const path = d3.geoPath().projection(projection)
    
    // Add a group element with translation for padding
    const g = svg.append('g')
      .attr('transform', `translate(${padding}, ${padding})`)

    // Different color scale for second variable
    const colorScale = d3.scaleQuantize()
      .domain([0, 100])
      .range(['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704'])

    g.selectAll('path')
      .data(geoData.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', d => colorScale(Math.random() * 100)) // Random data for now
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 2).attr('stroke', '#000')
        const containerEl = containerRef.current
        const overlayEl = overlayRef.current
        const dotsMap = dotsRef.current
        if (!containerEl || !overlayEl || !dotsMap) return
        const containerRect = containerEl.getBoundingClientRect()
        const r = this.getBoundingClientRect()
        const stateCenter = { x: r.left - containerRect.left + r.width / 2, y: r.top - containerRect.top + r.height / 2 }
        const stateName = normalizeName(d.properties && d.properties.name)
        const dotInfo = dotsMap.get(stateName)
        d3.select(overlayEl).selectAll('*').remove()
        if (dotInfo) {
          drawProjectile(stateCenter, { x: dotInfo.x, y: dotInfo.y }, '#fd8d3c', '#fd8d3c')
          d3.select(dotInfo.el).attr('r', 10).attr('fill', '#08519c').attr('opacity', 1)
        }
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 0.5).attr('stroke', '#333')
        if (overlayRef.current) d3.select(overlayRef.current).selectAll('*').remove()
        d3.select(chartRef.current).selectAll('.dot')
          .attr('r', 6)
          .attr('fill', '#4292c6')
          .attr('opacity', 0.7)
      })
      .append('title')
      .text(d => d.properties.name || 'Unknown')
  }, [])

  // Scatter plot with correlation
  useEffect(() => {
    if (!csvData || csvData.length === 0) {
      console.log('No CSV data loaded yet')
      return
    }

    console.log('CSV Data:', csvData.length, 'rows')
    console.log('Variable 1:', variable1)
    console.log('Variable 2:', variable2)

    const chartSvg = d3.select(chartRef.current)
    chartSvg.selectAll('*').remove()
    
    const width = 900
    const height = 750
    const margin = { top: 60, right: 40, bottom: 80, left: 80 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom

    chartSvg.attr('width', width).attr('height', height)

    // Prepare data for scatter plot
    const scatterData = csvData
      .filter(d => {
        const hasState = d['State/UT'] && d['State/UT'].trim() !== ''
        const hasVar1 = d[variable1] !== undefined && d[variable1] !== null && d[variable1] !== ''
        const hasVar2 = d[variable2] !== undefined && d[variable2] !== null && d[variable2] !== ''
        return hasState && hasVar1 && hasVar2
      })
      .map(d => {
        const xVal = String(d[variable1]).replace(/,/g, '').replace(/\*/g, '').trim()
        const yVal = String(d[variable2]).replace(/,/g, '').replace(/\*/g, '').trim()
        return {
          state: d['State/UT'].trim(),
          x: parseFloat(xVal),
          y: parseFloat(yVal)
        }
      })
      .filter(d => !isNaN(d.x) && !isNaN(d.y))

    console.log('Scatter data points:', scatterData.length)
    if (scatterData.length > 0) {
      console.log('Sample point:', scatterData[0])
    }

    if (scatterData.length === 0) {
      // Fallback: Simple bar chart for variable2 by State
      const barData = csvData
        .filter(d => d['State/UT'] && d[variable2] !== undefined && d[variable2] !== null && String(d[variable2]).trim() !== '')
        .map(d => ({
          state: d['State/UT'].trim(),
          value: parseFloat(String(d[variable2]).replace(/,/g, '').replace(/\*/g, '').replace(/%/g, '').trim())
        }))
        .filter(d => !isNaN(d.value))

      const gBar = chartSvg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)

      const x = d3.scaleBand()
        .domain(barData.map(d => d.state))
        .range([0, chartWidth])
        .padding(0.2)

      const y = d3.scaleLinear()
        .domain([0, d3.max(barData, d => d.value) * 1.1])
        .range([chartHeight, 0])

      gBar.selectAll('rect')
        .data(barData)
        .enter()
        .append('rect')
        .attr('x', d => x(d.state))
        .attr('y', d => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', d => chartHeight - y(d.value))
        .attr('fill', '#4292c6')
        .append('title')
        .text(d => `${d.state}: ${d.value}`)

      gBar.append('g')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-65)')
        .style('text-anchor', 'end')
        .style('font-family', 'Manrope, sans-serif')
        .style('font-size', '9px')

      gBar.append('g')
        .call(d3.axisLeft(y))
        .style('font-family', 'Manrope, sans-serif')
        .style('font-size', '11px')

      chartSvg.append('text')
        .attr('x', width / 2)
        .attr('y', 25)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Manrope, sans-serif')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .text(`${variable2} by State/UT`)

      chartSvg.append('text')
        .attr('x', width / 2)
        .attr('y', height - 20)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Manrope, sans-serif')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .text('State/UT')

      chartSvg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Manrope, sans-serif')
        .style('font-size', '13px')
        .style('font-weight', '600')
        .text(variable2)

      return
    }

    const g = chartSvg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, d3.max(scatterData, d => d.x) * 1.1])
      .range([0, chartWidth])

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(scatterData, d => d.y) * 1.1])
      .range([chartHeight, 0])

    // Calculate correlation and regression line
    const n = scatterData.length
    const sumX = d3.sum(scatterData, d => d.x)
    const sumY = d3.sum(scatterData, d => d.y)
    const sumXY = d3.sum(scatterData, d => d.x * d.y)
    const sumX2 = d3.sum(scatterData, d => d.x * d.x)
    const sumY2 = d3.sum(scatterData, d => d.y * d.y)
    
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    
    // Regression line slope and intercept
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Draw regression line
    const lineData = [
      { x: d3.min(scatterData, d => d.x), y: slope * d3.min(scatterData, d => d.x) + intercept },
      { x: d3.max(scatterData, d => d.x), y: slope * d3.max(scatterData, d => d.x) + intercept }
    ]

    g.append('line')
      .attr('x1', xScale(lineData[0].x))
      .attr('y1', yScale(lineData[0].y))
      .attr('x2', xScale(lineData[1].x))
      .attr('y2', yScale(lineData[1].y))
      .attr('stroke', '#e63946')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')

    // Helper: normalize state names for matching
    const normalizeName = (s) => String(s || '')
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Add scatter points
    g.selectAll('.dot')
      .data(scatterData)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 6)
      .attr('fill', '#4292c6')
      .attr('opacity', 0.7)
      .attr('stroke', '#2171b5')
      .attr('stroke-width', 1.5)
      .each(function(d) {
        // store absolute position for reverse hover
        const containerEl = containerRef.current
        if (!containerEl) return
        const containerRect = containerEl.getBoundingClientRect()
        const dotRect = this.getBoundingClientRect()
        const center = {
          x: dotRect.left - containerRect.left + dotRect.width / 2,
          y: dotRect.top - containerRect.top + dotRect.height / 2,
        }
        dotsRef.current.set(normalizeName(d.state), { x: center.x, y: center.y, el: this })
      })
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('r', 10)
          .attr('fill', '#08519c')
          .attr('opacity', 1)
        
        // Highlight corresponding state on both maps and draw connection lines
        const containerEl = containerRef.current
        const overlayEl = overlayRef.current
        if (containerEl && overlayEl) {
          const containerRect = containerEl.getBoundingClientRect()
          // ensure overlay size matches container
          d3.select(overlayEl)
            .attr('width', containerEl.clientWidth)
            .attr('height', containerEl.clientHeight)
          const dotRect = event.currentTarget.getBoundingClientRect()
          const dotCenter = {
            x: dotRect.left - containerRect.left + dotRect.width / 2,
            y: dotRect.top - containerRect.top + dotRect.height / 2,
          }

          // find matching paths in both maps
          let map1Center = null
          d3.select(svgRef.current).selectAll('path').each(function(md) {
            const name = md && md.properties && md.properties.name
            if (name && normalizeName(name) === normalizeName(d.state)) {
              const r = this.getBoundingClientRect()
              map1Center = { x: r.left - containerRect.left + r.width / 2, y: r.top - containerRect.top + r.height / 2 }
              d3.select(this).attr('stroke', '#ff0000').attr('stroke-width', 3)
            }
          })
          let map2Center = null
          d3.select(svgRef2.current).selectAll('path').each(function(md) {
            const name = md && md.properties && md.properties.name
            if (name && normalizeName(name) === normalizeName(d.state)) {
              const r = this.getBoundingClientRect()
              map2Center = { x: r.left - containerRect.left + r.width / 2, y: r.top - containerRect.top + r.height / 2 }
              d3.select(this).attr('stroke', '#ff0000').attr('stroke-width', 3)
            }
          })

          const overlay = d3.select(overlayEl)
          overlay.selectAll('*').remove()

          const drawProjectile = (from, to, stroke, dotFill) => {
            const dx = to.x - from.x
            const dy = to.y - from.y
            const dist = Math.hypot(dx, dy)
            const arc = Math.min(140, Math.max(40, dist * 0.25))
            const cx = (from.x + to.x) / 2
            const cy = (from.y + to.y) / 2 - arc // arc upwards

            const path = overlay.append('path')
              .attr('d', `M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`)
              .attr('fill', 'none')
              .attr('stroke', stroke)
              .attr('stroke-width', 2)
              .attr('stroke-dasharray', '6,6')
              .attr('opacity', 0.95)

            const len = path.node().getTotalLength()
            const projectile = overlay.append('circle')
              .attr('r', 5)
              .attr('fill', dotFill || stroke)
              .attr('cx', from.x)
              .attr('cy', from.y)

            projectile
              .transition()
              .duration(900)
              .ease(d3.easeCubicOut)
              .tween('move', () => t => {
                const p = path.node().getPointAtLength(t * len)
                projectile.attr('cx', p.x).attr('cy', p.y)
              })
          }

          if (map1Center) drawProjectile(dotCenter, map1Center, '#4292c6', '#4292c6')
          if (map2Center) drawProjectile(dotCenter, map2Center, '#fd8d3c', '#fd8d3c')
        }
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .attr('r', 6)
          .attr('fill', '#4292c6')
          .attr('opacity', 0.7)
        
        // Reset map highlighting
        d3.selectAll('path')
          .attr('stroke', '#333')
          .attr('stroke-width', 0.5)
        // Clear overlay lines
        if (overlayRef.current) {
          d3.select(overlayRef.current).selectAll('*').remove()
        }
      })
      .append('title')
      .text(d => `${d.state}\n${variable1}: ${d.x.toFixed(2)}\n${variable2}: ${d.y.toFixed(2)}`)

    // Add grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale)
        .tickSize(-chartWidth)
        .tickFormat('')
      )
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.3)

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-chartHeight)
        .tickFormat('')
      )
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.3)

    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '11px')

    // Add y-axis
    g.append('g')
      .call(d3.axisLeft(yScale))
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '11px')

    // Add chart title
    chartSvg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(`Correlation: ${variable1} vs ${variable2}`)

    // Add correlation coefficient
    chartSvg.append('text')
      .attr('x', width / 2)
      .attr('y', 48)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '13px')
      .style('fill', '#e63946')
      .text(`R = ${correlation.toFixed(3)} (${correlation > 0 ? 'Positive' : 'Negative'} Correlation)`)

    // Add x-axis label
    chartSvg.append('text')
      .attr('x', width / 2)
      .attr('y', height - 20)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '13px')
      .style('font-weight', '600')
      .text(variable1)

    // Add y-axis label
    chartSvg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '13px')
      .style('font-weight', '600')
      .text(variable2)
  }, [csvData, variable1, variable2])

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
      
      {/* Variable Selection Controls */}
      <div style={{ margin: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <label style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.9rem', fontWeight: '600', color: '#333', display: 'block', marginBottom: '0.5rem' }}>
              Map 1 Variable (Blue):
            </label>
            <select 
              value={variable1} 
              onChange={(e) => setVariable1(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', fontFamily: 'Manrope, sans-serif', fontSize: '0.95rem', border: '2px solid #4292c6', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
            >
              {variables.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.9rem', fontWeight: '600', color: '#333', display: 'block', marginBottom: '0.5rem' }}>
              Map 2 Variable (Orange):
            </label>
            <select 
              value={variable2} 
              onChange={(e) => setVariable2(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', fontFamily: 'Manrope, sans-serif', fontSize: '0.95rem', border: '2px solid #fd8d3c', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
            >
              {variables.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

  <div ref={containerRef} style={{ position: 'relative', margin: '2rem', border: '2px solid #ddd', borderRadius: '0px', display: 'grid', gridTemplateColumns: '0.6fr 2.4fr', gap: 0 }}>
        <div style={{ borderRight: '2px solid #ddd', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ borderBottom: '2px solid #ddd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflow: 'hidden', height: '400px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.85rem', fontWeight: '600', color: '#4292c6', margin: '0 0 0.5rem 0', textAlign: 'center' }}>{variable1}</h3>
            <svg ref={svgRef}></svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflow: 'hidden', height: '400px' }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.85rem', fontWeight: '600', color: '#fd8d3c', margin: '0 0 0.5rem 0', textAlign: 'center' }}>{variable2}</h3>
            <svg ref={svgRef2}></svg>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', overflowX: 'auto', height: '800px' }}>
          <svg ref={chartRef}></svg>
        </div>
        {/* overlay for connection lines */}
        <svg ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
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
