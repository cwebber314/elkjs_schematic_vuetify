<template>
  <v-container fluid class="page-container">
    <!-- Canvas Section -->
    <v-row class="canvas-section">
      <v-col>
        <v-card>
          <v-card-title class="bg-primary">
            <span class="text-h6">Mutual Coupling Editor</span>
            <v-chip v-if="selectedSegments.length > 0" color="success" class="ml-4">
              Selected: {{ selectedSegments.join(', ') }}
            </v-chip>
          </v-card-title>

          <v-card-text class="pa-4">
            <!-- Toolbar -->
            <v-toolbar flat density="compact" class="mb-4">
              <v-btn
                color="primary"
                :disabled="selectedSegments.length !== 2"
                @click="createMutual"
                prepend-icon="mdi-link"
                variant="elevated">
                Create Mutual
              </v-btn>

              <v-btn
                color="error"
                :disabled="selectedSegments.length !== 2 || !hasExistingMutual"
                @click="removeMutual"
                prepend-icon="mdi-link-off"
                variant="elevated"
                class="ml-2">
                Remove Mutual
              </v-btn>

              <v-divider vertical class="mx-4"></v-divider>

              <v-btn
                color="success"
                :disabled="selectedSegments.length !== 1"
                @click="addSegment"
                prepend-icon="mdi-plus"
                variant="elevated">
                Add Segment
              </v-btn>

              <v-btn
                color="warning"
                :disabled="selectedSegments.length !== 1 || !canRemoveSegment"
                @click="removeSegment"
                prepend-icon="mdi-delete"
                variant="elevated"
                class="ml-2">
                Remove Segment
              </v-btn>

              <v-spacer></v-spacer>

              <v-chip variant="outlined" class="mr-2">
                <v-icon start>mdi-mouse</v-icon>
                Scroll: Zoom
              </v-chip>
              <v-chip variant="outlined" class="mr-2">
                <v-icon start>mdi-hand-back-right</v-icon>
                Drag: Pan
              </v-chip>
              <v-chip variant="outlined">
                <v-icon start>mdi-mouse-double-click</v-icon>
                Double-click: Fit
              </v-chip>
            </v-toolbar>

            <!-- Canvas Container -->
            <div class="canvas-wrapper">
              <div id="konva-container" ref="konvaContainer"></div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Data Section -->
    <v-row class="data-section">
      <v-col>
        <v-card>
          <v-tabs v-model="activeTab" bg-color="primary">
            <v-tab value="lines">Lines & Segments</v-tab>
            <v-tab value="mutuals">Mutual Links</v-tab>
          </v-tabs>

          <v-card-text>
            <v-window v-model="activeTab">
              <!-- Lines Tab -->
              <v-window-item value="lines">
                <v-expansion-panels variant="accordion" multiple v-model="expandedLines">
                  <v-expansion-panel v-for="(line, index) in lines" :key="index" :value="index">
                    <v-expansion-panel-title>
                      <v-icon start>mdi-power-plug</v-icon>
                      <strong>{{ line.name }}</strong>
                      <v-chip size="small" class="ml-2">{{ line.segments.length }} segments</v-chip>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-table density="compact">
                        <thead>
                          <tr>
                            <th>Segment ID</th>
                            <th>Name</th>
                            <th>Conductor</th>
                            <th>Length</th>
                            <th>Ordinal</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="segment in line.segments" :key="segment.id"
                              :class="{ 'bg-blue-lighten-5': selectedSegments.includes(segment.id) }">
                            <td>{{ segment.id }}</td>
                            <td>{{ segment.name }}</td>
                            <td>{{ segment.conductor || 'N/A' }}</td>
                            <td>{{ segment.length }}</td>
                            <td>{{ segment.ordinal }}</td>
                          </tr>
                        </tbody>
                      </v-table>
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
              </v-window-item>

              <!-- Mutuals Tab -->
              <v-window-item value="mutuals">
                <v-data-table
                  :headers="mutualHeaders"
                  :items="mutualLinks"
                  :items-per-page="10"
                  class="elevation-1"
                  density="compact">
                  <template v-slot:top>
                    <v-toolbar flat>
                      <v-toolbar-title>Mutual Links ({{ mutualLinks.length }})</v-toolbar-title>
                    </v-toolbar>
                  </template>
                  <template v-slot:no-data>
                    <v-alert type="info" class="ma-2">
                      No mutual links defined. Select two segments and click "Create Mutual" to add one.
                    </v-alert>
                  </template>
                </v-data-table>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Snackbar for notifications -->
    <v-snackbar v-model="showSnackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-container>
</template>

<script>
import Konva from 'konva'

export default {
  name: 'MutualDetails',
  data() {
    return {
      lines: [
        {
          name: 'Line A',
          segments: [
            {
              id: 'seg-a1',
              conductor: 'Copper',
              name: 'Segment A1',
              length: 150,
              ordinal: 0
            }
          ]
        },
        {
          name: 'Line B',
          segments: [
            {
              id: 'seg-b1',
              conductor: 'Aluminum',
              name: 'Segment B1',
              length: 100,
              ordinal: 0
            },
            {
              id: 'seg-b2',
              conductor: 'Aluminum',
              name: 'Segment B2',
              length: 150,
              ordinal: 1
            }
          ]
        },
        {
          name: 'Line C',
          segments: [
            {
              id: 'seg-c1',
              conductor: 'ACSR Drake',
              name: 'Segment C1',
              length: 100,
              ordinal: 0
            },
            {
              id: 'seg-c2',
              conductor: 'ACSR Drake',
              name: 'Segment C2',
              length: 75,
              ordinal: 1
            },
            {
              id: 'seg-c3',
              conductor: 'ACSR Drake',
              name: 'Segment C3',
              length: 50,
              ordinal: 2
            }
          ]
        }
      ],
      selectedSegments: [],
      mutualLinks: [
        {
          segment1: 'seg-a1',
          segment2: 'seg-b2'
        },
        {
          segment1: 'seg-b1',
          segment2: 'seg-c1'
        }
      ],
      segmentMap: {},
      mutualLinesLayer: null,
      stage: null,
      scaleBy: 1.1,
      pixelsPerUnit: 2,
      activeTab: 'lines',
      expandedLines: [0, 1, 2],
      mutualHeaders: [
        { title: 'Segment 1', key: 'segment1', sortable: true },
        { title: 'Segment 2', key: 'segment2', sortable: true }
      ],
      showSnackbar: false,
      snackbarMessage: '',
      snackbarColor: 'success'
    }
  },
  computed: {
    hasExistingMutual() {
      if (this.selectedSegments.length !== 2) return false
      const [seg1, seg2] = this.selectedSegments.sort()
      return this.mutualLinks.some(link => {
        const [linkSeg1, linkSeg2] = [link.segment1, link.segment2].sort()
        return linkSeg1 === seg1 && linkSeg2 === seg2
      })
    },
    canRemoveSegment() {
      if (this.selectedSegments.length !== 1) return false

      const selectedSegmentId = this.selectedSegments[0]

      // Find the line that contains this segment
      for (let line of this.lines) {
        const index = line.segments.findIndex(seg => seg.id === selectedSegmentId)
        if (index !== -1) {
          // Can only remove if the line has more than 1 segment
          return line.segments.length > 1
        }
      }

      return false
    }
  },
  mounted() {
    this.calculateSegmentPositions()
    this.initKonva()
    this.drawMutualLinks()

    // Fit canvas to screen after initialization
    this.$nextTick(() => {
      this.fitToScreen()
    })
  },
  beforeUnmount() {
    if (this.stage) {
      this.stage.destroy()
    }
  },
  methods: {
    showNotification(message, color = 'success') {
      this.snackbarMessage = message
      this.snackbarColor = color
      this.showSnackbar = true
    },
    createMutual() {
      if (this.selectedSegments.length !== 2) {
        this.showNotification('Please select exactly 2 segments', 'error')
        return
      }

      const [seg1, seg2] = this.selectedSegments

      // Check if link already exists
      const exists = this.mutualLinks.some(link =>
        (link.segment1 === seg1 && link.segment2 === seg2) ||
        (link.segment1 === seg2 && link.segment2 === seg1)
      )

      if (exists) {
        this.showNotification('Mutual link already exists between these segments', 'warning')
        return
      }

      this.mutualLinks.push({ segment1: seg1, segment2: seg2 })
      this.reinitKonva()
      this.showNotification('Mutual link created successfully')
    },
    removeMutual() {
      if (this.selectedSegments.length !== 2) {
        this.showNotification('Please select exactly 2 segments', 'error')
        return
      }

      const [seg1, seg2] = this.selectedSegments

      const index = this.mutualLinks.findIndex(link =>
        (link.segment1 === seg1 && link.segment2 === seg2) ||
        (link.segment1 === seg2 && link.segment2 === seg1)
      )

      if (index === -1) {
        this.showNotification('No mutual link exists between these segments', 'warning')
        return
      }

      this.mutualLinks.splice(index, 1)
      this.reinitKonva()
      this.showNotification('Mutual link removed successfully')
    },
    addSegment() {
      if (this.selectedSegments.length !== 1) {
        this.showNotification('Please select exactly 1 segment', 'error')
        return
      }

      const selectedSegmentId = this.selectedSegments[0]

      // Find the line that contains this segment
      let targetLine = null
      let segmentIndex = -1

      for (let line of this.lines) {
        const index = line.segments.findIndex(seg => seg.id === selectedSegmentId)
        if (index !== -1) {
          targetLine = line
          segmentIndex = index
          break
        }
      }

      if (!targetLine) {
        this.showNotification('Could not find the selected segment', 'error')
        return
      }

      const selectedSegment = targetLine.segments[segmentIndex]

      // Generate a new unique ID for the segment
      const timestamp = Date.now()
      const newSegmentId = `seg-${targetLine.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`

      // Create new segment
      const newSegment = {
        id: newSegmentId,
        name: `Segment ${targetLine.name} ${targetLine.segments.length + 1}`,
        conductor: selectedSegment.conductor,
        length: 50,
        ordinal: selectedSegment.ordinal + 1
      }

      // Insert the new segment after the selected one
      targetLine.segments.splice(segmentIndex + 1, 0, newSegment)

      // Update ordinal numbers for all subsequent segments
      for (let i = segmentIndex + 2; i < targetLine.segments.length; i++) {
        targetLine.segments[i].ordinal = i
      }

      // Clear selection and re-render
      this.selectedSegments = []
      this.reinitKonva()
      this.showNotification('Segment added successfully')
    },
    removeSegment() {
      if (this.selectedSegments.length !== 1) {
        this.showNotification('Please select exactly 1 segment', 'error')
        return
      }

      const selectedSegmentId = this.selectedSegments[0]

      // Find the line that contains this segment
      let targetLine = null
      let segmentIndex = -1

      for (let line of this.lines) {
        const index = line.segments.findIndex(seg => seg.id === selectedSegmentId)
        if (index !== -1) {
          targetLine = line
          segmentIndex = index
          break
        }
      }

      if (!targetLine) {
        this.showNotification('Could not find the selected segment', 'error')
        return
      }

      // Check if line has more than one segment
      if (targetLine.segments.length <= 1) {
        this.showNotification('Cannot remove the last segment from a line', 'warning')
        return
      }

      // Remove the segment
      targetLine.segments.splice(segmentIndex, 1)

      // Update ordinal numbers for all subsequent segments
      for (let i = segmentIndex; i < targetLine.segments.length; i++) {
        targetLine.segments[i].ordinal = i
      }

      // Remove any mutual links that reference this segment
      this.mutualLinks = this.mutualLinks.filter(link =>
        link.segment1 !== selectedSegmentId && link.segment2 !== selectedSegmentId
      )

      // Clear selection and re-render
      this.selectedSegments = []
      this.reinitKonva()
      this.showNotification('Segment removed successfully')
    },
    calculateSegmentPositions() {
      // Create a map of coupled segments
      const coupledMap = new Map()

      this.mutualLinks.forEach(link => {
        coupledMap.set(link.segment1, link.segment2)
        coupledMap.set(link.segment2, link.segment1)
      })

      // First pass: identify coupled segments and make them the same length
      const processedSegments = new Set()

      this.mutualLinks.forEach(link => {
        if (!processedSegments.has(link.segment1) && !processedSegments.has(link.segment2)) {
          let seg1 = null, seg2 = null

          for (let line of this.lines) {
            const found1 = line.segments.find(s => s.id === link.segment1)
            const found2 = line.segments.find(s => s.id === link.segment2)
            if (found1) seg1 = found1
            if (found2) seg2 = found2
          }

          if (seg1 && seg2) {
            // Use the maximum length for both coupled segments
            const maxLength = Math.max(seg1.length, seg2.length)
            seg1.length = maxLength
            seg2.length = maxLength

            processedSegments.add(link.segment1)
            processedSegments.add(link.segment2)
          }
        }
      })

      // Generate Y positions dynamically based on number of lines
      const lineSpacing = 100
      const startY = 100
      const yPositions = this.lines.map((_, index) => startY + (index * lineSpacing))
      const startX = 50

      // Clear existing positions
      this.lines.forEach(line => {
        line.segments.forEach(segment => {
          delete segment.startX
          delete segment.startY
          delete segment.endX
          delete segment.endY
        })
      })

      // Second pass: calculate natural positions for all segments
      const naturalPositions = new Map()

      this.lines.forEach((line) => {
        let currentX = startX
        const sortedSegments = [...line.segments].sort((a, b) => a.ordinal - b.ordinal)

        sortedSegments.forEach((segment) => {
          const canvasLength = segment.length * this.pixelsPerUnit
          naturalPositions.set(segment.id, {
            startX: currentX,
            endX: currentX + canvasLength
          })
          currentX = currentX + canvasLength
        })
      })

      // Third pass: align coupled segments by using the maximum startX
      const alignedPositions = new Map()

      this.mutualLinks.forEach(link => {
        const pos1 = naturalPositions.get(link.segment1)
        const pos2 = naturalPositions.get(link.segment2)

        if (pos1 && pos2) {
          // Use the maximum startX for alignment
          const alignedStartX = Math.max(pos1.startX, pos2.startX)

          // Find the segments to get length
          let seg1 = null
          for (let line of this.lines) {
            const found1 = line.segments.find(s => s.id === link.segment1)
            if (found1) {
              seg1 = found1
              break
            }
          }

          const canvasLength = seg1.length * this.pixelsPerUnit

          alignedPositions.set(link.segment1, {
            startX: alignedStartX,
            endX: alignedStartX + canvasLength
          })
          alignedPositions.set(link.segment2, {
            startX: alignedStartX,
            endX: alignedStartX + canvasLength
          })
        }
      })

      // Fourth pass: final layout with aligned positions
      this.lines.forEach((line, lineIndex) => {
        const y = yPositions[lineIndex]
        let currentX = startX

        const sortedSegments = [...line.segments].sort((a, b) => a.ordinal - b.ordinal)

        sortedSegments.forEach((segment) => {
          const canvasLength = segment.length * this.pixelsPerUnit

          // Check if this segment has an aligned position
          if (alignedPositions.has(segment.id)) {
            const aligned = alignedPositions.get(segment.id)
            // Use the max to prevent overlap
            currentX = Math.max(currentX, aligned.startX)
            segment.startX = currentX
            segment.endX = currentX + canvasLength
          } else {
            segment.startX = currentX
            segment.endX = currentX + canvasLength
          }

          segment.startY = y
          segment.endY = y
          currentX = segment.endX
        })
      })
    },
    drawMutualLinks() {
      if (!this.mutualLinesLayer) return

      // Clear existing mutual link lines
      this.mutualLinesLayer.destroyChildren()

      // Draw dotted lines for each mutual link
      this.mutualLinks.forEach(link => {
        const seg1Data = this.segmentMap[link.segment1]
        const seg2Data = this.segmentMap[link.segment2]

        if (!seg1Data || !seg2Data) return

        // Calculate midpoints of each segment
        const seg1Points = seg1Data.line.points()
        const seg1MidX = (seg1Points[0] + seg1Points[2]) / 2
        const seg1MidY = (seg1Points[1] + seg1Points[3]) / 2

        const seg2Points = seg2Data.line.points()
        const seg2MidX = (seg2Points[0] + seg2Points[2]) / 2
        const seg2MidY = (seg2Points[1] + seg2Points[3]) / 2

        // Create dotted line
        const mutualLine = new Konva.Line({
          points: [seg1MidX, seg1MidY, seg2MidX, seg2MidY],
          stroke: '#ff6b6b',
          strokeWidth: 2,
          dash: [5, 5],
          opacity: 0.7
        })

        this.mutualLinesLayer.add(mutualLine)
      })

      this.mutualLinesLayer.batchDraw()
    },
    selectSegment(segmentId, shiftKey, allSegments) {
      if (shiftKey) {
        // Multi-select: toggle segment
        const index = this.selectedSegments.indexOf(segmentId)
        if (index > -1) {
          this.selectedSegments.splice(index, 1)
        } else {
          this.selectedSegments.push(segmentId)
        }
      } else {
        // Single select: replace selection
        this.selectedSegments = [segmentId]
      }

      // Update visual state of all segments
      allSegments.forEach(seg => {
        const isSelected = this.selectedSegments.includes(seg.id)
        if (isSelected) {
          seg.line.strokeWidth(6)
          seg.line.shadowEnabled(true)
        } else {
          seg.line.strokeWidth(4)
          seg.line.shadowEnabled(false)
        }
      })
    },
    initKonva() {
      // Generate dynamic Y positions and stage height based on number of lines
      const lineSpacing = 100
      const startY = 100
      const yPositions = this.lines.map((_, index) => startY + (index * lineSpacing))
      const stageHeight = Math.max(500, startY + (this.lines.length - 1) * lineSpacing + 100)
      const stageWidth = this.$refs.konvaContainer ? this.$refs.konvaContainer.clientWidth : 800

      // Create Konva stage with dynamic height
      const stage = new Konva.Stage({
        container: 'konva-container',
        width: stageWidth,
        height: stageHeight
      })

      // Store stage reference
      this.stage = stage

      // Create layers
      const mutualLinesLayer = new Konva.Layer()
      const layer = new Konva.Layer()

      // Store reference to mutual lines layer
      this.mutualLinesLayer = mutualLinesLayer

      // Track all segments for selection
      const allSegments = []
      const allEndpoints = []

      // Create tooltip text (initially hidden)
      const tooltip = new Konva.Text({
        text: '',
        fontSize: 16,
        fontFamily: 'Arial',
        fill: 'white',
        padding: 8,
        visible: false,
        backgroundColor: '#333'
      })

      // Background for tooltip
      const tooltipBg = new Konva.Rect({
        fill: '#333',
        cornerRadius: 5,
        visible: false,
        opacity: 0.9
      })

      // Generate colors dynamically based on number of lines
      const baseColors = ['#1976D2', '#E91E63', '#9C27B0', '#4CAF50', '#FF9800', '#795548', '#607D8B', '#00BCD4']
      const colors = this.lines.map((_, index) => baseColors[index % baseColors.length])

      // Helper function to create hover effect for endpoints
      const addEndpointHoverEffect = (point) => {
        point.on('mouseenter', () => {
          stage.container().style.cursor = 'move'
          point.strokeWidth(3)
          layer.batchDraw()
        })

        point.on('mouseleave', () => {
          stage.container().style.cursor = 'default'
          point.strokeWidth(2)
          layer.batchDraw()
        })
      }

      // Create lines and segments based on data
      this.lines.forEach((lineData, lineIndex) => {
        const lineColor = colors[lineIndex]

        // Track endpoints for this line
        const lineEndpoints = []

        // Create each segment
        lineData.segments.forEach((segmentData, segIndex) => {
          const segmentId = segmentData.id

          // Use stored positions or calculate defaults
          const startX = segmentData.startX !== undefined ? segmentData.startX : 50
          const startY = segmentData.startY !== undefined ? segmentData.startY : yPositions[lineIndex]
          const endX = segmentData.endX !== undefined ? segmentData.endX : 350
          const endY = segmentData.endY !== undefined ? segmentData.endY : yPositions[lineIndex]

          const line = new Konva.Line({
            points: [startX, startY, endX, endY],
            stroke: lineColor,
            strokeWidth: 4,
            lineCap: 'round',
            lineJoin: 'round',
            hitStrokeWidth: 20,
            shadowColor: 'rgba(255, 215, 0, 0.8)',
            shadowBlur: 10,
            shadowOffset: { x: 0, y: 0 },
            shadowEnabled: false
          })

          // Track segment
          allSegments.push({ id: segmentId, line: line })
          this.segmentMap[segmentId] = { id: segmentId, line: line, segment: segmentData, lineData: lineData }

          // Create start endpoint (only for first segment in line)
          if (segIndex === 0) {
            const startPoint = new Konva.Rect({
              x: startX - 6,
              y: startY - 6,
              width: 12,
              height: 12,
              fill: lineColor,
              stroke: '#fff',
              strokeWidth: 2,
              draggable: true,
              name: 'endpoint'
            })

            startPoint.on('dragmove', () => {
              const pos = startPoint.position()
              const newX = pos.x + 6
              const newY = pos.y + 6
              const currentPoints = line.points()
              line.points([
                newX,
                newY,
                currentPoints[2],
                currentPoints[3]
              ])

              // Update stored position
              segmentData.startX = newX
              segmentData.startY = newY

              layer.batchDraw()
              this.drawMutualLinks()
            })

            addEndpointHoverEffect(startPoint)
            lineEndpoints.push(startPoint)
            allEndpoints.push(startPoint)
          }

          // Create end endpoint
          const endPoint = new Konva.Rect({
            x: endX - 6,
            y: endY - 6,
            width: 12,
            height: 12,
            fill: lineColor,
            stroke: '#fff',
            strokeWidth: 2,
            draggable: true,
            name: 'endpoint'
          })

          // Store reference to next segment's line if it exists
          const nextSegment = lineData.segments[segIndex + 1]

          endPoint.on('dragmove', () => {
            const pos = endPoint.position()
            const newX = pos.x + 6
            const newY = pos.y + 6
            const currentPoints = line.points()
            line.points([
              currentPoints[0],
              currentPoints[1],
              newX,
              newY
            ])

            // Update stored position
            segmentData.endX = newX
            segmentData.endY = newY

            // If there's a next segment, update its start point
            if (nextSegment) {
              const nextSegmentLine = this.segmentMap[nextSegment.id].line
              const nextPoints = nextSegmentLine.points()
              nextSegmentLine.points([
                newX,
                newY,
                nextPoints[2],
                nextPoints[3]
              ])

              // Update next segment's stored start position
              nextSegment.startX = newX
              nextSegment.startY = newY
            }

            layer.batchDraw()
            this.drawMutualLinks()
          })

          addEndpointHoverEffect(endPoint)
          lineEndpoints.push(endPoint)
          allEndpoints.push(endPoint)

          // Add hover tooltip showing segment name
          const segmentInfo = { name: segmentData.name, lineName: lineData.name, length: segmentData.length }
          line.on('mouseenter', (e) => {
            stage.container().style.cursor = 'pointer'
            const mousePos = stage.getPointerPosition()
            tooltip.text(segmentInfo.name + ' | ' + segmentInfo.length)
            tooltip.position({
              x: mousePos.x + 10,
              y: mousePos.y - 30
            })
            tooltipBg.position({
              x: mousePos.x + 10,
              y: mousePos.y - 30
            })
            tooltipBg.size({
              width: tooltip.width(),
              height: tooltip.height()
            })
            tooltip.visible(true)
            tooltipBg.visible(true)
            layer.draw()
          })

          line.on('mouseleave', () => {
            stage.container().style.cursor = 'default'
            tooltip.visible(false)
            tooltipBg.visible(false)
            layer.draw()
          })

          // Add click handler for selection
          line.on('click', (e) => {
            this.selectSegment(segmentId, e.evt.shiftKey, allSegments)
            layer.batchDraw()
          })

          layer.add(line)
        })
      })

      // Add all endpoints on top of segments so they're always clickable
      allEndpoints.forEach(endpoint => {
        layer.add(endpoint)
      })

      // Add tooltip elements on top
      layer.add(tooltipBg)
      layer.add(tooltip)

      // Add layers to stage (mutual lines layer first, then main layer)
      stage.add(mutualLinesLayer)
      stage.add(layer)

      // Click on empty space to deselect all
      stage.on('click', (e) => {
        if (e.target === stage) {
          this.selectedSegments = []
          allSegments.forEach(seg => {
            seg.line.strokeWidth(4)
            seg.line.shadowEnabled(false)
          })
          layer.batchDraw()
        }
      })

      // Enable panning by dragging the stage
      stage.draggable(true)

      // Mouse wheel zoom
      stage.on('wheel', (e) => {
        e.evt.preventDefault()

        const oldScale = stage.scaleX()
        const pointer = stage.getPointerPosition()

        const mousePointTo = {
          x: (pointer.x - stage.x()) / oldScale,
          y: (pointer.y - stage.y()) / oldScale
        }

        const direction = e.evt.deltaY > 0 ? -1 : 1
        const newScale = direction > 0 ? oldScale * this.scaleBy : oldScale / this.scaleBy

        stage.scale({ x: newScale, y: newScale })

        const newPos = {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale
        }

        stage.position(newPos)
        stage.batchDraw()
      })

      // Double-click to fit to screen
      stage.on('dblclick', (e) => {
        if (e.target === stage) {
          this.fitToScreen()
        }
      })
    },
    fitToScreen() {
      if (!this.stage) return

      // Get all lines and calculate bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

      this.lines.forEach(line => {
        line.segments.forEach(segment => {
          minX = Math.min(minX, segment.startX, segment.endX)
          minY = Math.min(minY, segment.startY, segment.endY)
          maxX = Math.max(maxX, segment.startX, segment.endX)
          maxY = Math.max(maxY, segment.startY, segment.endY)
        })
      })

      if (!isFinite(minX)) return

      const padding = 50
      const width = maxX - minX + padding * 2
      const height = maxY - minY + padding * 2

      const scaleX = this.stage.width() / width
      const scaleY = this.stage.height() / height
      const scale = Math.min(scaleX, scaleY)

      this.stage.scale({ x: scale, y: scale })
      this.stage.position({
        x: -minX * scale + padding * scale,
        y: -minY * scale + padding * scale
      })

      this.stage.batchDraw()
    },
    reinitKonva() {
      // Save current zoom and pan state
      let scale = { x: 1, y: 1 }
      let position = { x: 0, y: 0 }

      if (this.stage) {
        scale = { x: this.stage.scaleX(), y: this.stage.scaleY() }
        position = { x: this.stage.x(), y: this.stage.y() }
        this.stage.destroy()
      }

      // Clear the segment map
      this.segmentMap = {}

      // Recalculate positions
      this.calculateSegmentPositions()

      // Re-initialize the canvas
      this.initKonva()

      // Restore zoom and pan state
      if (this.stage) {
        this.stage.scale(scale)
        this.stage.position(position)
      }

      // Redraw mutual links
      this.drawMutualLinks()
    }
  }
}
</script>

<style scoped>
.page-container {
  height: calc(100vh - 64px);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.canvas-section {
  flex: 0 0 auto;
  min-height: 600px;
}

.data-section {
  flex: 1;
  overflow: auto;
  min-height: 300px;
}

.canvas-wrapper {
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  overflow: hidden;
  background: #fafafa;
}

#konva-container {
  width: 100%;
  min-height: 500px;
}
</style>
