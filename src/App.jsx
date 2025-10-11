// ...existing code...
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import indiaTopoJSON from './map.json'

function App() {
  const svgRef = useRef(null)

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const width = 450
    const height = 580

    svg.attr('width', width).attr('height', height)

    // Convert TopoJSON to GeoJSON
    const geoData = topojson.feature(indiaTopoJSON, indiaTopoJSON.objects.india)
    
    const projection = d3.geoMercator()
      .fitSize([width, height], geoData)
    const path = d3.geoPath().projection(projection)

    // Color scale for choropleth
    const colorScale = d3.scaleQuantize()
      .domain([0, 100])
      .range(['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'])

    svg.selectAll('path')
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

  return (
    <main style={{ minHeight: '100vh', background: '#fff', margin: 0 }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#222', textAlign: 'left', marginTop: '2rem', marginBottom: '2rem', marginLeft: '2rem', fontFamily: 'Anton, sans-serif' }}>
        Cigarrete and Smoking Data India
      </h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', padding: '2rem' }}>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1rem', color: '#555', lineHeight: '1.6' }}>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        </div>
        
      </div>
      <div style={{ margin: '2rem', height: '600px', border: '2px solid #ddd', borderRadius: '0px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
        <div style={{ borderRight: '2px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <svg ref={svgRef}></svg>
        </div>
        
        
      </div>
    </main>
  )
}

export default App
