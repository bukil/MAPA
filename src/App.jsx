// ...existing code...
import { useEffect, useRef, useState, useMemo } from 'react'
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
  const mapBox1Ref = useRef(null)
  const mapBox2Ref = useRef(null)
  const chartBoxRef = useRef(null)
  const tooltipRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [mapSize, setMapSize] = useState({ w: 280, h: 380 })
  const [chartSize, setChartSize] = useState({ w: 900, h: 750 })
  const [csvData, setCsvData] = useState([])
  const [variable1, setVariable1] = useState('Literacy Rate %')
  const [variable2, setVariable2] = useState('Monthly Salary (2025)')

  // Helpers shared across effects
  const normalizeName = (s) => String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Canonicalize known variations/misspellings across CSV vs map
  const canonicalName = (s) => {
    const n = normalizeName(s)
    const aliases = new Map([
      ['andaman and nicobar island', 'andaman and nicobar islands'],
      ['andaman nicobar island', 'andaman and nicobar islands'],
      ['andaman nicobar islands', 'andaman and nicobar islands'],
      ['dadara and nagar havelli', 'dadra and nagar haveli'],
      ['dadra and nagar havelli', 'dadra and nagar haveli'],
      ['pondicherry', 'puducherry'],
      ['orissa', 'odisha'],
      ['arunanchal pradesh', 'arunachal pradesh'],
      ['nct of delhi', 'delhi'],
      ['national capital territory of delhi', 'delhi'],
      ['the national capital territory of delhi', 'delhi'],
      ['delhi nct', 'delhi'],
      ['new delhi', 'delhi'],
      ['daman & diu', 'daman and diu'],
      ['daman and dew', 'daman and diu'],
      ['dnhdd', 'dadra and nagar haveli and daman and diu'],
      ['dadra & nagar haveli', 'dadra and nagar haveli'],
      ['dadra & nagar haveli and daman & diu', 'dadra and nagar haveli and daman and diu'],
      ['dadra and nagar haveli & daman and diu', 'dadra and nagar haveli and daman and diu'],
      ['dadra and nagar haveli and daman & diu', 'dadra and nagar haveli and daman and diu'],
    ])
    return aliases.get(n) || n
  }

  // Pretty display names for states/UTs
  const displayName = (s) => {
    const c = canonicalName(s)
    const pretty = new Map([
      ['andaman and nicobar islands', 'Andaman and Nicobar Islands'],
      ['dadra and nagar haveli', 'Dadra and Nagar Haveli'],
      ['daman and diu', 'Daman and Diu'],
      ['dadra and nagar haveli and daman and diu', 'Dadra and Nagar Haveli and Daman and Diu'],
      ['puducherry', 'Puducherry'],
      ['odisha', 'Odisha'],
      ['arunachal pradesh', 'Arunachal Pradesh'],
      ['delhi', 'Delhi'],
    ])
    return pretty.get(c) || s
  }

  // Are two canonical names equivalent, considering merged UT DNHDD components?
  const eqState = (a, b) => {
    if (!a || !b) return false
    if (a === b) return true
    const combo = 'dadra and nagar haveli and daman and diu'
    const parts = new Set(['dadra and nagar haveli', 'daman and diu'])
    const aCombo = a === combo
    const bCombo = b === combo
    if (aCombo && parts.has(b)) return true
    if (bCombo && parts.has(a)) return true
    return false
  }

  // UI label: remove year markers like (2025) or 2025
  const labelVar = (s) => String(s || '')
    .replace(/\(?\b2025\b\)?/g, '')
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
      .attr('stroke', '#000')
      .attr('stroke-width', 0.8)
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

  // Draw a compact value badge at a point in the overlay (used to show "other" variable on the other map)
  const drawValueBadge = (at, color, label, valueText, stateText, id) => {
    const overlayEl = overlayRef.current
    const containerEl = containerRef.current
    if (!overlayEl || !containerEl || !at) return
    const overlay = d3.select(overlayEl)
    // Ensure defs for subtle shadow
    let defs = overlay.select('defs')
    if (defs.empty()) defs = overlay.append('defs')
    if (defs.select('#badge-shadow').empty()) {
      const f = defs.append('filter').attr('id', 'badge-shadow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%')
      f.append('feDropShadow')
        .attr('dx', 0)
        .attr('dy', 2)
        .attr('stdDeviation', 2)
        .attr('flood-color', '#000')
        .attr('flood-opacity', 0.16)
    }
    // Group at position with stable id
    const g = overlay.append('g')
      .attr('id', id || null)
      .attr('transform', `translate(${at.x}, ${at.y - 16})`)
    // State name
    const title = g.append('text')
      .text(stateText || '')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '11px')
      .style('font-weight', 700)
      .attr('fill', '#222')
      .attr('y', -10)
    // Value line
    const line = g.append('text')
      .text(`${label}: ${valueText}`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '11px')
      .style('font-weight', 600)
      .attr('fill', color)
      .attr('y', 4)
    // Compute box
    const bbox1 = title.node().getBBox()
    const bbox2 = line.node().getBBox()
    const width = Math.max(bbox1.width, bbox2.width)
    const height = (bbox2.y + bbox2.height) - (bbox1.y) + 6
    const px = 8
    const py = 6
    g.insert('rect', ':first-child')
      .attr('x', -width / 2 - px)
      .attr('y', bbox1.y - py)
      .attr('width', width + px * 2)
      .attr('height', height + py * 2)
      .attr('rx', 8)
      .attr('ry', 8)
    .attr('fill', '#ffffff')
    .attr('fill-opacity', 0.6)
    .attr('stroke', 'rgba(200,200,200,0.6)')
      .attr('stroke-width', 1)
      .attr('filter', 'url(#badge-shadow)')
  }

  // Fast tooltip helpers
  const parseNum = (v) => {
    if (v === undefined || v === null) return undefined
    const num = parseFloat(String(v).replace(/,/g, '').replace(/\*/g, '').replace(/%/g, '').trim())
    return Number.isNaN(num) ? undefined : num
  }

  const rowByState = useMemo(() => {
    const m = new Map()
    csvData.forEach(r => {
      const key = canonicalName(r['State/UT'])
      if (key) m.set(key, r)
    })
    return m
  }, [csvData])

  const buildTooltipHTML = (stateCanon) => {
    const row = rowByState.get(stateCanon)
    const v1 = row ? parseNum(row[variable1]) : undefined
    const v2 = row ? parseNum(row[variable2]) : undefined
    const name = displayName(stateCanon)
    return `
      <div style="font-weight:700;margin-bottom:4px;color:#222">${name}</div>
      <table style="border-collapse:collapse;font-size:11px;color:#222">
        <tbody>
          <tr>
            <td style="padding:2px 6px 2px 0;white-space:nowrap;color:#1769aa">${labelVar(variable1)}</td>
            <td style="padding:2px 0 2px 6px;text-align:right;font-weight:600">${formatValue(variable1, v1)}</td>
          </tr>
          <tr>
            <td style="padding:2px 6px 2px 0;white-space:nowrap;color:#d35400">${labelVar(variable2)}</td>
            <td style="padding:2px 0 2px 6px;text-align:right;font-weight:600">${formatValue(variable2, v2)}</td>
          </tr>
        </tbody>
      </table>
    `
  }

  // Single-variable tooltip (used on maps to reduce confusion)
  const buildTooltipSingleHTML = (stateCanon, varLabel, color) => {
    const row = rowByState.get(stateCanon)
    // Determine which value to read based on provided label
    const col = varLabel
    const v = row ? parseNum(row[col]) : undefined
    const name = displayName(stateCanon)
    return `
      <div style="font-weight:700;margin-bottom:4px;color:#222">${name}</div>
      <table style="border-collapse:collapse;font-size:11px;color:#222">
        <tbody>
          <tr>
            <td style="padding:2px 6px 2px 0;white-space:nowrap;">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;"></span>
              ${labelVar(varLabel)}
            </td>
            <td style="padding:2px 0 2px 6px;text-align:right;font-weight:600">${formatValue(varLabel, v)}</td>
          </tr>
        </tbody>
      </table>
    `
  }

  const showTooltip = (html, event) => {
    const el = tooltipRef.current
    const containerEl = containerRef.current
    if (!el || !containerEl) return
    el.innerHTML = html
    el.style.display = 'block'
    moveTooltip(event)
  }

  const moveTooltip = (event) => {
    const el = tooltipRef.current
    const containerEl = containerRef.current
    if (!el || !containerEl) return
    const rect = containerEl.getBoundingClientRect()
    const tipRect = el.getBoundingClientRect()
    const offset = 12
    let x = event.clientX - rect.left + offset
    let y = event.clientY - rect.top + offset
    const maxX = rect.width - tipRect.width - 6
    const maxY = rect.height - tipRect.height - 6
    if (x > maxX) x = Math.max(6, maxX)
    if (y > maxY) y = Math.max(6, maxY)
    el.style.transform = `translate(${x}px, ${y}px)`
  }

  const hideTooltip = () => {
    const el = tooltipRef.current
    if (el) el.style.display = 'none'
  }

  // Value formatting helpers
  const isCurrencyVar = (label) => /salary/i.test(String(label || ''))
  const formatValue = (label, v) => {
    if (v === undefined || v === null || Number.isNaN(v)) return 'N/A'
    if (isCurrencyVar(label)) {
      try {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(v))
      } catch (e) {
        return `₹ ${Number(v).toLocaleString('en-IN')}`
      }
    }
    return Number(v).toFixed(2)
  }

  // Glass badge helpers (HTML) for "other map" window with frost effect
  const showBadgeDiv = (at, color, label, valueText, stateText, id) => {
    const containerEl = containerRef.current
    if (!containerEl || !at) return
    let el = containerEl.querySelector(`#${id}`)
    if (!el) {
      el = document.createElement('div')
      el.id = id
      el.style.position = 'absolute'
      el.style.pointerEvents = 'none'
      el.style.zIndex = '9' // below main tooltip (10)
      containerEl.appendChild(el)
    }
    el.style.background = 'rgba(255,255,255,0.6)'
    el.style.backdropFilter = 'blur(12px) saturate(120%)'
    el.style.webkitBackdropFilter = 'blur(12px) saturate(120%)'
    el.style.border = '1px solid rgba(200,200,200,0.6)'
    el.style.borderRadius = '8px'
    el.style.boxShadow = '0 8px 20px rgba(0,0,0,0.16)'
    el.style.padding = '6px 8px'
    el.style.fontFamily = 'Manrope, sans-serif'
    el.style.fontSize = '11px'
    el.style.color = '#222'
    el.innerHTML = `
      <div style="font-weight:700;margin-bottom:4px;">${stateText || ''}</div>
      <table style="border-collapse:collapse;font-size:11px;color:#222"><tbody>
        <tr>
          <td style="padding:2px 6px 2px 0;white-space:nowrap;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:6px;"></span>
            ${label}
          </td>
          <td style="padding:2px 0 2px 6px;text-align:right;font-weight:600">${valueText}</td>
        </tr>
      </tbody></table>
    `
    const yOffset = 16
    el.style.transform = `translate(${at.x}px, ${at.y - yOffset}px)`
    el.style.display = 'block'
  }

  const hideBadgeDiv = (id) => {
    const containerEl = containerRef.current
    if (!containerEl) return
    const el = containerEl.querySelector(`#${id}`)
    if (el) el.remove()
  }

  // Responsive sizing
  useEffect(() => {
    const updateSizes = () => {
      const mobile = window.innerWidth < 900
      setIsMobile(mobile)
      const mapEl = mapBox1Ref.current
      if (mapEl) {
        const w = Math.max(220, mapEl.clientWidth - 16)
        const h = mobile ? Math.max(220, Math.round(w * 0.9)) : Math.max(320, Math.round(w * 1.3))
        setMapSize({ w, h })
      }
      const chartEl = chartBoxRef.current
      if (chartEl) {
        const wC = Math.max(280, chartEl.clientWidth - 16)
        const hC = mobile ? Math.max(380, Math.round(wC * 0.8)) : 750
        setChartSize({ w: wC, h: hC })
      }
    }
    updateSizes()
    window.addEventListener('resize', updateSizes)
    return () => window.removeEventListener('resize', updateSizes)
  }, [])
  
  
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

  // First map: colored by variable1
  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const width = mapSize.w
    const height = mapSize.h
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

    // Build value map from CSV for variable1
    const valueByState = new Map()
    csvData.forEach(row => {
      const key = canonicalName(row['State/UT'])
      if (!key) return
      const v = String(row[variable1] ?? '')
        .replace(/,/g, '')
        .replace(/\*/g, '')
        .replace(/%/g, '')
        .trim()
      const num = parseFloat(v)
      if (!isNaN(num)) valueByState.set(key, num)
    })
    const values = Array.from(valueByState.values())
    const vmin = values.length ? d3.min(values) : 0
    const vmax = values.length ? d3.max(values) : 1
    const domain = vmin === vmax ? [vmin, vmax + 1] : [vmin, vmax]
    // Color scale for choropleth (Blues)
    const colorScale = d3.scaleQuantize()
      .domain(domain)
      .range(['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'])

    g.selectAll('path')
      .data(geoData.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', d => {
        const name = canonicalName(d.properties && d.properties.name)
        const val = valueByState.get(name)
        return typeof val === 'number' ? colorScale(val) : '#eee'
      })
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
        const stateName = canonicalName(d.properties && d.properties.name)
        // Reset all dots to default before highlighting related ones
        d3.select(chartRef.current)
          .selectAll('.dot')
          .style('opacity', 0.85)
          .selectAll('path')
          .attr('stroke-width', 1.5)
        // ensure overlay dimensions
        d3.select(overlayEl)
          .attr('width', containerEl.clientWidth)
          .attr('height', containerEl.clientHeight)
        // ensure overlay dimensions
        d3.select(overlayEl)
          .attr('width', containerEl.clientWidth)
          .attr('height', containerEl.clientHeight)
        const combo = 'dadra and nagar haveli and daman and diu'
        let dotInfos = []
        const direct = dotsMap.get(stateName)
        if (direct) {
          dotInfos = [direct]
        } else if (stateName === 'dadra and nagar haveli' || stateName === 'daman and diu') {
          const comboInfo = dotsMap.get(combo)
          if (comboInfo) dotInfos = [comboInfo]
        } else if (stateName === combo) {
          const part1 = dotsMap.get('dadra and nagar haveli')
          const part2 = dotsMap.get('daman and diu')
          if (part1) dotInfos.push(part1)
          if (part2) dotInfos.push(part2)
        }
        d3.select(overlayEl).selectAll('*').remove()
        // Dim all dots a bit to focus attention
        d3.select(chartRef.current).selectAll('.dot').style('opacity', 0.4)
        dotInfos.forEach(di => {
          drawProjectile(stateCenter, { x: di.x, y: di.y }, '#4292c6', '#4292c6')
          const sel = d3.select(di.el)
          const baseT = sel.attr('data-t') || sel.attr('transform')
          sel.raise().attr('transform', baseT).style('opacity', 1)
          sel.selectAll('path').attr('stroke-width', 2)
        })
        // Show the other map's value (variable2) as a badge at the same state's centroid on map2
        let map2Center = null
        d3.select(svgRef2.current).selectAll('path').each(function(md) {
          const name = md && md.properties && md.properties.name
          if (name && eqState(canonicalName(name), stateName)) {
            const rr = this.getBoundingClientRect()
            map2Center = { x: rr.left - containerRect.left + rr.width / 2, y: rr.top - containerRect.top + rr.height / 2 }
          }
        })
        if (map2Center) {
          const row = rowByState.get(stateName)
          const v = row ? parseNum(row[variable2]) : undefined
          const valTxt = formatValue(variable2, v)
          showBadgeDiv(map2Center, '#fd8d3c', labelVar(variable2), valTxt, displayName(stateName), 'badge-map2')
        }
  // Tooltip: show only this map's variable to avoid mixing both in one window
  showTooltip(buildTooltipSingleHTML(stateName, variable1, '#4292c6'), event)
      })
      .on('mousemove', function(event) {
        moveTooltip(event)
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 0.5).attr('stroke', '#333')
  if (overlayRef.current) d3.select(overlayRef.current).selectAll('*').remove()
        hideBadgeDiv('badge-map2')
        // reset all dots to default
        d3.select(chartRef.current).selectAll('.dot')
          .each(function() {
            const s = d3.select(this)
            const baseT = s.attr('data-t') || s.attr('transform')
            s.attr('transform', baseT)
            s.style('opacity', 0.85)
            s.selectAll('path').attr('stroke-width', 1.5)
          })
        hideTooltip()
      })
  }, [csvData, variable1, mapSize])

  // Second map: colored by variable2
  useEffect(() => {
    const svg = d3.select(svgRef2.current)
    svg.selectAll('*').remove()
    const width = mapSize.w
    const height = mapSize.h
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

    // Build value map from CSV for variable2
    const valueByState = new Map()
    csvData.forEach(row => {
      const key = canonicalName(row['State/UT'])
      if (!key) return
      const v = String(row[variable2] ?? '')
        .replace(/,/g, '')
        .replace(/\*/g, '')
        .replace(/%/g, '')
        .trim()
      const num = parseFloat(v)
      if (!isNaN(num)) valueByState.set(key, num)
    })
    const values = Array.from(valueByState.values())
    const vmin = values.length ? d3.min(values) : 0
    const vmax = values.length ? d3.max(values) : 1
    const domain = vmin === vmax ? [vmin, vmax + 1] : [vmin, vmax]
    // Different color scale for second variable (Oranges)
    const colorScale = d3.scaleQuantize()
      .domain(domain)
      .range(['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704'])

    g.selectAll('path')
      .data(geoData.features)
      .enter()
      .append('path')
      .attr('d', path)
      .attr('fill', d => {
        const name = canonicalName(d.properties && d.properties.name)
        const val = valueByState.get(name)
        return typeof val === 'number' ? colorScale(val) : '#eee'
      })
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
        const stateName = canonicalName(d.properties && d.properties.name)
        // Reset all dots to default before highlighting related ones
        d3.select(chartRef.current)
          .selectAll('.dot')
          .style('opacity', 0.85)
          .selectAll('path')
          .attr('stroke-width', 1.5)
        const combo = 'dadra and nagar haveli and daman and diu'
        let dotInfos = []
        const direct = dotsMap.get(stateName)
        if (direct) {
          dotInfos = [direct]
        } else if (stateName === 'dadra and nagar haveli' || stateName === 'daman and diu') {
          const comboInfo = dotsMap.get(combo)
          if (comboInfo) dotInfos = [comboInfo]
        } else if (stateName === combo) {
          const part1 = dotsMap.get('dadra and nagar haveli')
          const part2 = dotsMap.get('daman and diu')
          if (part1) dotInfos.push(part1)
          if (part2) dotInfos.push(part2)
        }
        d3.select(overlayEl).selectAll('*').remove()
        // Dim all dots a bit to focus attention
        d3.select(chartRef.current).selectAll('.dot').style('opacity', 0.4)
        dotInfos.forEach(di => {
          drawProjectile(stateCenter, { x: di.x, y: di.y }, '#fd8d3c', '#fd8d3c')
          const sel = d3.select(di.el)
          const baseT = sel.attr('data-t') || sel.attr('transform')
          sel.raise().attr('transform', baseT).style('opacity', 1)
          sel.selectAll('path').attr('stroke-width', 2)
        })
        // Show the other map's value (variable1) as a badge at the same state's centroid on map1
        let map1Center = null
        d3.select(svgRef.current).selectAll('path').each(function(md) {
          const name = md && md.properties && md.properties.name
          if (name && eqState(canonicalName(name), stateName)) {
            const rr = this.getBoundingClientRect()
            map1Center = { x: rr.left - containerRect.left + rr.width / 2, y: rr.top - containerRect.top + rr.height / 2 }
          }
        })
        if (map1Center) {
          const row = rowByState.get(stateName)
          const v = row ? parseNum(row[variable1]) : undefined
          const valTxt = formatValue(variable1, v)
          showBadgeDiv(map1Center, '#4292c6', labelVar(variable1), valTxt, displayName(stateName), 'badge-map1')
        }
  // Tooltip: show only this map's variable to avoid mixing both in one window
  showTooltip(buildTooltipSingleHTML(stateName, variable2, '#fd8d3c'), event)
      })
      .on('mousemove', function(event) {
        moveTooltip(event)
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 0.5).attr('stroke', '#333')
  if (overlayRef.current) d3.select(overlayRef.current).selectAll('*').remove()
  hideBadgeDiv('badge-map2')
        // reset all dots to default
        d3.select(chartRef.current).selectAll('.dot')
          .each(function() {
            const s = d3.select(this)
            const baseT = s.attr('data-t') || s.attr('transform')
            s.attr('transform', baseT)
            s.style('opacity', 0.85)
            s.selectAll('path').attr('stroke-width', 1.5)
          })
        hideBadgeDiv('badge-map1')
        hideTooltip()
      })
  }, [csvData, variable2, mapSize])

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
    
  const width = chartSize.w
  const height = chartSize.h
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
        .on('mouseover', function(event, d) {
          const stateCanon = canonicalName(d.state)
          // Build a minimal tooltip for fallback
          const html = `
            <div style="font-weight:700;margin-bottom:6px;color:#222">${displayName(stateCanon)}</div>
            <table style="border-collapse:collapse;font-size:12px;color:#222"><tbody>
              <tr>
                <td style="padding:2px 8px 2px 0;white-space:nowrap;color:#d35400">${labelVar(variable2)}</td>
                <td style="padding:2px 0 2px 8px;text-align:right;font-weight:600">${d.value}</td>
              </tr>
            </tbody></table>`
          showTooltip(html, event)
        })
        .on('mousemove', function(event) { moveTooltip(event) })
        .on('mouseout', function() { hideTooltip() })

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
        .text(`${labelVar(variable2)} by State/UT`)

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
        .text(labelVar(variable2))

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

    const regLine = g.append('line')
      .attr('x1', xScale(lineData[0].x))
      .attr('y1', yScale(lineData[0].y))
      .attr('x2', xScale(lineData[1].x))
      .attr('y2', yScale(lineData[1].y))
      .attr('stroke', '#e63946')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')

    // Color scales for point halves (match map palettes)
    const blueRange = ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b']
    const orangeRange = ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704']
    const xMin = d3.min(scatterData, d => d.x)
    const xMax = d3.max(scatterData, d => d.x)
    const yMin = d3.min(scatterData, d => d.y)
    const yMax = d3.max(scatterData, d => d.y)
    const blueScale = d3.scaleQuantize().domain([xMin, xMax]).range(blueRange)
    const orangeScale = d3.scaleQuantize().domain([yMin, yMax]).range(orangeRange)

    // Draw each dot as a group with two semicircle arcs (left=var2 orange, right=var1 blue)
    const r = 6
    const arcGen = d3.arc().innerRadius(0).outerRadius(r)
    const dots = g.selectAll('.dot')
      .data(scatterData)
      .enter()
      .append('g')
      .attr('class', 'dot')
      .attr('transform', d => `translate(${xScale(d.x)}, ${yScale(d.y)})`)
      .style('opacity', 0.85)
      .style('cursor', 'pointer')

    // Right half (variable1, blue)
    dots.append('path')
      .attr('class', 'half half-blue')
      .attr('d', arcGen.startAngle(-Math.PI / 2).endAngle(Math.PI / 2))
      .attr('fill', d => blueScale(d.x))
      .attr('stroke', '#2171b5')
      .attr('stroke-width', 1.5)

    // Left half (variable2, orange)
    dots.append('path')
      .attr('class', 'half half-orange')
      .attr('d', arcGen.startAngle(Math.PI / 2).endAngle(3 * Math.PI / 2))
      .attr('fill', d => orangeScale(d.y))
      .attr('stroke', '#a63603')
      .attr('stroke-width', 1.5)

    // Store absolute position for reverse hover
    dots.each(function(d) {
      const containerEl = containerRef.current
      if (!containerEl) return
      const containerRect = containerEl.getBoundingClientRect()
      const dotRect = this.getBoundingClientRect()
      const center = {
        x: dotRect.left - containerRect.left + dotRect.width / 2,
        y: dotRect.top - containerRect.top + dotRect.height / 2,
      }
      dotsRef.current.set(canonicalName(d.state), { x: center.x, y: center.y, el: this })
    })

  dots.on('mouseover', function(event, d) {
    const sel = d3.select(this)
    sel.raise()
    // Remove size scaling; just emphasize with opacity and stroke
    sel.style('opacity', 1)
    sel.selectAll('path').attr('stroke-width', 2)
        
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
            if (name && eqState(canonicalName(name), canonicalName(d.state))) {
              const r = this.getBoundingClientRect()
              map1Center = { x: r.left - containerRect.left + r.width / 2, y: r.top - containerRect.top + r.height / 2 }
              d3.select(this).attr('stroke', '#ff0000').attr('stroke-width', 3)
            }
          })
          let map2Center = null
          d3.select(svgRef2.current).selectAll('path').each(function(md) {
            const name = md && md.properties && md.properties.name
            if (name && eqState(canonicalName(name), canonicalName(d.state))) {
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
              .attr('stroke', '#000')
              .attr('stroke-width', 0.8)
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
        // Show tooltip for dot
        showTooltip(buildTooltipHTML(canonicalName(d.state)), event)
      })
      .on('mousemove', function(event) {
        moveTooltip(event)
      })
      .on('mouseout', function(event, d) {
        const sel = d3.select(this)
        // No transform reset needed as we don't scale
        sel.style('opacity', 0.85)
        sel.selectAll('path').attr('stroke-width', 1.5)
        
        // Reset map highlighting
        d3.selectAll('path')
          .attr('stroke', '#333')
          .attr('stroke-width', 0.5)
        // Clear overlay lines
        if (overlayRef.current) {
          d3.select(overlayRef.current).selectAll('*').remove()
        }
        hideTooltip()
      })


    // Add grid lines (keep refs for zoom updates)
    const gridY = g.append('g')
      .attr('class', 'grid grid-y')
      .call(d3.axisLeft(yScale)
        .tickSize(-chartWidth)
        .tickFormat('')
      )
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.3)

    const gridX = g.append('g')
      .attr('class', 'grid grid-x')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale)
        .tickSize(-chartHeight)
        .tickFormat('')
      )
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.3)

    // Add axes (keep refs for zoom updates)
    const xAxisG = g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '11px')

    const yAxisG = g.append('g')
      .attr('class', 'axis axis--y')
      .call(d3.axisLeft(yScale))
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '11px')

    // Zoom behavior for dense data
    const zoom = d3.zoom()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [chartWidth, chartHeight]])
      .extent([[0, 0], [chartWidth, chartHeight]])
      .on('zoom', (event) => {
        const t = event.transform
        const zx = t.rescaleX(xScale)
        const zy = t.rescaleY(yScale)
        // update dots
        g.selectAll('.dot')
          .attr('transform', d => `translate(${zx(d.x)}, ${zy(d.y)})`)
        // update regression line
        regLine
          .attr('x1', zx(lineData[0].x))
          .attr('y1', zy(lineData[0].y))
          .attr('x2', zx(lineData[1].x))
          .attr('y2', zy(lineData[1].y))
        // update axes
        xAxisG.call(d3.axisBottom(zx))
        yAxisG.call(d3.axisLeft(zy))
        // update grids
        gridY.call(d3.axisLeft(zy).tickSize(-chartWidth).tickFormat(''))
        gridX.call(d3.axisBottom(zx).tickSize(-chartHeight).tickFormat(''))

        // Recompute absolute positions for reverse hover (map -> chart)
        const containerEl = containerRef.current
        const chartEl = chartRef.current
        if (containerEl && chartEl) {
          const containerRect = containerEl.getBoundingClientRect()
          const chartRect = chartEl.getBoundingClientRect()
          const tmpMap = new Map()
          g.selectAll('.dot').each(function(d) {
            if (!d || !d.state) return
            const cx = chartRect.left - containerRect.left + margin.left + zx(d.x)
            const cy = chartRect.top - containerRect.top + margin.top + zy(d.y)
            tmpMap.set(canonicalName(d.state), { x: cx, y: cy, el: this })
          })
          dotsRef.current = tmpMap
        }
      })

    // Attach zoom to the whole chart svg to preserve dot hover events
    chartSvg
      .call(zoom)
      .on('dblclick.zoom', null)
    // Optional: double-click to reset
    chartSvg.on('dblclick', () => {
      chartSvg.transition().duration(200).call(zoom.transform, d3.zoomIdentity)
      // after reset, schedule a recompute of dot positions
      setTimeout(() => {
        const containerEl = containerRef.current
        const chartEl = chartRef.current
        if (containerEl && chartEl) {
          const containerRect = containerEl.getBoundingClientRect()
          const tmpMap = new Map()
          d3.select(chartEl).selectAll('.dot').each(function(d) {
            const rect = this.getBoundingClientRect()
            const center = { x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top + rect.height / 2 }
            if (d && d.state) tmpMap.set(canonicalName(d.state), { x: center.x, y: center.y, el: this })
          })
          dotsRef.current = tmpMap
        }
      }, 220)
    })

    // Add chart title
    chartSvg.append('text')
      .attr('x', width / 2)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
  .text(`Correlation: ${labelVar(variable1)} vs ${labelVar(variable2)}`)

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
  .text(labelVar(variable1))

    // Add y-axis label
    chartSvg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-family', 'Manrope, sans-serif')
      .style('font-size', '13px')
      .style('font-weight', '600')
  .text(labelVar(variable2))
  }, [csvData, variable1, variable2, chartSize])

  // Recompute dot absolute positions on resize or chart redraw
  useEffect(() => {
    const containerEl = containerRef.current
    const chartEl = chartRef.current
    if (!containerEl || !chartEl) return
    const containerRect = containerEl.getBoundingClientRect()
    const tmpMap = new Map()
    d3.select(chartEl).selectAll('.dot').each(function(d) {
      const rect = this.getBoundingClientRect()
      const center = { x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top + rect.height / 2 }
      if (d && d.state) tmpMap.set(canonicalName(d.state), { x: center.x, y: center.y, el: this })
    })
    dotsRef.current = tmpMap
  }, [chartSize, csvData, variable1, variable2])

  return (
    <main style={{ minHeight: '100vh', background: '#fff', margin: 0 }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#222', textAlign: 'left', marginTop: '2rem', marginBottom: '2rem', marginLeft: '2rem', fontFamily: 'Anton, sans-serif' }}>
        Exploring the Links Between Literacy, Salary & Societal Issues in India
      </h1>
  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '1rem', padding: isMobile ? '1rem' : '2rem' }}>
        <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1rem', color: '#555', lineHeight: '1.6' }}>
          <p>This project explores how literacy rates and income levels relate to various societal issues and crimes in India.
We wanted to look beyond numbers — to see if education and wealth actually make a society more equal, just, and emotionally stable, or if they also create new challenges.

Through data visualization and analysis, we examined complex relationships between literacy, salary, gender ratio, crime rates, conviction rates, divorce, domestic violence, and student suicides.</p>
        </div>
        
      </div>
      
      {/* Variable Selection Controls */}
      <div style={{ margin: isMobile ? '1rem' : '2rem', padding: isMobile ? '1rem' : '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '1rem' : '2rem' }}>
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

  <div ref={containerRef} style={{ position: 'relative', margin: isMobile ? '1rem' : '2rem', border: '2px solid #ddd', borderRadius: '0px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '0.6fr 2.4fr', gap: 0 }}>
        <div style={{ borderRight: isMobile ? 'none' : '2px solid #ddd', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div ref={mapBox1Ref} style={{ borderBottom: '2px solid #ddd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0.75rem' : '1rem', overflow: 'hidden', height: mapSize.h + 20 }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.85rem', fontWeight: '600', color: '#4292c6', margin: '0 0 0.5rem 0', textAlign: 'center' }}>{labelVar(variable1)}</h3>
            <svg ref={svgRef}></svg>
          </div>
          <div ref={mapBox2Ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0.75rem' : '1rem', overflow: 'hidden', height: mapSize.h + 20 }}>
            <h3 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '0.85rem', fontWeight: '600', color: '#fd8d3c', margin: '0 0 0.5rem 0', textAlign: 'center' }}>{labelVar(variable2)}</h3>
            <svg ref={svgRef2}></svg>
          </div>
        </div>
        <div ref={chartBoxRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '0.75rem' : '1rem', overflowX: 'auto', height: chartSize.h + 50 }}>
          <svg ref={chartRef} style={{ maxWidth: '100%' }}></svg>
        </div>
        {/* overlay for connection lines */}
        <svg ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        {/* fast tooltip */}
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'translate(-9999px, -9999px)',
            display: 'none',
            background: 'rgba(255,255,255,0.3)',
            backdropFilter: 'blur(12px) saturate(120%)',
            WebkitBackdropFilter: 'blur(12px) saturate(120%)',
            border: '1px solid rgba(200,200,200,0.5)',
            borderRadius: 8,
            boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
            padding: '6px 8px',
            pointerEvents: 'none',
            zIndex: 10,
            fontFamily: 'Manrope, sans-serif'
          }}
        />
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
