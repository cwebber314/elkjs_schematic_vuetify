<template>
  <v-container fluid class="page-container">
    <!-- Canvas Section -->
    <v-row class="canvas-section">
      <v-col>
        <v-card>
          <v-card-title class="bg-primary">
            <span class="text-h6">Mutual Coupling Editor</span>
            <v-chip v-if="selectedSections.length > 0" color="success" class="ml-4">
              Selected: {{ selectedSections.join(', ') }}
            </v-chip>
          </v-card-title>

          <v-card-text class="pa-4">
            <!-- Toolbar -->
            <v-toolbar flat density="compact" class="mb-4">
              <v-btn
                color="primary"
                :disabled="selectedSections.length !== 2"
                @click="createMutual"
                prepend-icon="mdi-link"
                variant="elevated">
                Create Mutual
              </v-btn>

              <v-btn
                color="error"
                :disabled="selectedSections.length !== 2 || !hasExistingMutual"
                @click="removeMutual"
                prepend-icon="mdi-link-off"
                variant="elevated"
                class="ml-2">
                Remove Mutual
              </v-btn>

              <v-divider vertical class="mx-4"></v-divider>

              <v-btn
                color="success"
                :disabled="selectedSections.length !== 1"
                @click="addSection"
                prepend-icon="mdi-plus"
                variant="elevated">
                Add Section
              </v-btn>

              <v-btn
                color="warning"
                :disabled="selectedSections.length !== 1 || !canRemoveSection"
                @click="removeSection"
                prepend-icon="mdi-delete"
                variant="elevated"
                class="ml-2">
                Remove Section
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
            <v-tab value="lines">Lines & Sections</v-tab>
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
                      <v-chip size="small" class="ml-2">{{ line.sections.length }} sections</v-chip>
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <v-table density="compact">
                        <thead>
                          <tr>
                            <th>Section ID</th>
                            <th>Name</th>
                            <th>Conductor</th>
                            <th>Length</th>
                            <th>Ordinal</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="section in line.sections" :key="section.id"
                              :class="{ 'bg-blue-lighten-5': selectedSections.includes(section.id) }">
                            <td>{{ section.id }}</td>
                            <td>{{ section.name }}</td>
                            <td>{{ section.conductor || 'N/A' }}</td>
                            <td>{{ section.length }}</td>
                            <td>{{ section.ordinal }}</td>
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
                      No mutual links defined. Select two sections and click "Create Mutual" to add one.
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
          sections: [
            {
              id: 'sec-a1',
              conductor: 'Copper',
              name: 'Section A1',
              length: 150,
              ordinal: 0
            }
          ]
        },
        {
          name: 'Line B',
          sections: [
            {
              id: 'sec-b1',
              conductor: 'Aluminum',
              name: 'Section B1',
              length: 100,
              ordinal: 0
            },
            {
              id: 'sec-b2',
              conductor: 'Aluminum',
              name: 'Section B2',
              length: 150,
              ordinal: 1
            }
          ]
        },
        {
          name: 'Line C',
          sections: [
            {
              id: 'sec-c1',
              conductor: 'ACSR Drake',
              name: 'Section C1',
              length: 100,
              ordinal: 0
            },
            {
              id: 'sec-c2',
              conductor: 'ACSR Drake',
              name: 'Section C2',
              length: 75,
              ordinal: 1
            },
            {
              id: 'sec-c3',
              conductor: 'ACSR Drake',
              name: 'Section C3',
              length: 50,
              ordinal: 2
            }
          ]
        }
      ],
      selectedSections: [],
      mutualLinks: [
        {
          section1: 'sec-a1',
          section2: 'sec-b2'
        },
        {
          section1: 'sec-b1',
          section2: 'sec-c1'
        }
      ],
      sectionMap: {},
      mutualLinesLayer: null,
      stage: null,
      scaleBy: 1.1,
      pixelsPerUnit: 2,
      activeTab: 'lines',
      expandedLines: [0, 1, 2],
      mutualHeaders: [
        { title: 'Section 1', key: 'section1', sortable: true },
        { title: 'Section 2', key: 'section2', sortable: true }
      ],
      showSnackbar: false,
      snackbarMessage: '',
      snackbarColor: 'success'
    }
  },
  computed: {
    hasExistingMutual() {
      if (this.selectedSections.length !== 2) return false
      const [sec1, sec2] = this.selectedSections.sort()
      return this.mutualLinks.some(link => {
        const [linkSeg1, linkSeg2] = [link.section1, link.section2].sort()
        return linkSeg1 === sec1 && linkSeg2 === sec2
      })
    },
    canRemoveSection() {
      if (this.selectedSections.length !== 1) return false

      const selectedSectionId = this.selectedSections[0]

      // Find the line that contains this section
      for (let line of this.lines) {
        const index = line.sections.findIndex(sec => sec.id === selectedSectionId)
        if (index !== -1) {
          // Can only remove if the line has more than 1 section
          return line.sections.length > 1
        }
      }

      return false
    }
  },
  mounted() {
    this.calculateSectionPositions()
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
      if (this.selectedSections.length !== 2) {
        this.showNotification('Please select exactly 2 sections', 'error')
        return
      }

      const [sec1, sec2] = this.selectedSections

      // Check if link already exists
      const exists = this.mutualLinks.some(link =>
        (link.section1 === sec1 && link.section2 === sec2) ||
        (link.section1 === sec2 && link.section2 === sec1)
      )

      if (exists) {
        this.showNotification('Mutual link already exists between these sections', 'warning')
        return
      }

      this.mutualLinks.push({ section1: sec1, section2: sec2 })
      this.reinitKonva()
      this.showNotification('Mutual link created successfully')
    },
    removeMutual() {
      if (this.selectedSections.length !== 2) {
        this.showNotification('Please select exactly 2 sections', 'error')
        return
      }

      const [sec1, sec2] = this.selectedSections

      const index = this.mutualLinks.findIndex(link =>
        (link.section1 === sec1 && link.section2 === sec2) ||
        (link.section1 === sec2 && link.section2 === sec1)
      )

      if (index === -1) {
        this.showNotification('No mutual link exists between these sections', 'warning')
        return
      }

      this.mutualLinks.splice(index, 1)
      this.reinitKonva()
      this.showNotification('Mutual link removed successfully')
    },
    addSection() {
      if (this.selectedSections.length !== 1) {
        this.showNotification('Please select exactly 1 section', 'error')
        return
      }

      const selectedSectionId = this.selectedSections[0]

      // Find the line that contains this section
      let targetLine = null
      let sectionIndex = -1

      for (let line of this.lines) {
        const index = line.sections.findIndex(sec => sec.id === selectedSectionId)
        if (index !== -1) {
          targetLine = line
          sectionIndex = index
          break
        }
      }

      if (!targetLine) {
        this.showNotification('Could not find the selected section', 'error')
        return
      }

      const selectedSection = targetLine.sections[sectionIndex]

      // Generate a new unique ID for the section
      const timestamp = Date.now()
      const newSectionId = `sec-${targetLine.name.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`

      // Create new section
      const newSection = {
        id: newSectionId,
        name: `Section ${targetLine.name} ${targetLine.sections.length + 1}`,
        conductor: selectedSection.conductor,
        length: 50,
        ordinal: selectedSection.ordinal + 1
      }

      // Insert the new section after the selected one
      targetLine.sections.splice(sectionIndex + 1, 0, newSection)

      // Update ordinal numbers for all subsequent sections
      for (let i = sectionIndex + 2; i < targetLine.sections.length; i++) {
        targetLine.sections[i].ordinal = i
      }

      // Clear selection and re-render
      this.selectedSections = []
      this.reinitKonva()
      this.showNotification('Section added successfully')
    },
    removeSection() {
      if (this.selectedSections.length !== 1) {
        this.showNotification('Please select exactly 1 section', 'error')
        return
      }

      const selectedSectionId = this.selectedSections[0]

      // Find the line that contains this section
      let targetLine = null
      let sectionIndex = -1

      for (let line of this.lines) {
        const index = line.sections.findIndex(sec => sec.id === selectedSectionId)
        if (index !== -1) {
          targetLine = line
          sectionIndex = index
          break
        }
      }

      if (!targetLine) {
        this.showNotification('Could not find the selected section', 'error')
        return
      }

      // Check if line has more than one section
      if (targetLine.sections.length <= 1) {
        this.showNotification('Cannot remove the last section from a line', 'warning')
        return
      }

      // Remove the section
      targetLine.sections.splice(sectionIndex, 1)

      // Update ordinal numbers for all subsequent sections
      for (let i = sectionIndex; i < targetLine.sections.length; i++) {
        targetLine.sections[i].ordinal = i
      }

      // Remove any mutual links that reference this section
      this.mutualLinks = this.mutualLinks.filter(link =>
        link.section1 !== selectedSectionId && link.section2 !== selectedSectionId
      )

      // Clear selection and re-render
      this.selectedSections = []
      this.reinitKonva()
      this.showNotification('Section removed successfully')
    },
    calculateSectionPositions() {
      // Create a map of coupled sections
      const coupledMap = new Map()

      this.mutualLinks.forEach(link => {
        coupledMap.set(link.section1, link.section2)
        coupledMap.set(link.section2, link.section1)
      })

      // First pass: identify coupled sections and make them the same length
      const processedSections = new Set()

      this.mutualLinks.forEach(link => {
        if (!processedSections.has(link.section1) && !processedSections.has(link.section2)) {
          let sec1 = null, sec2 = null

          for (let line of this.lines) {
            const found1 = line.sections.find(s => s.id === link.section1)
            const found2 = line.sections.find(s => s.id === link.section2)
            if (found1) sec1 = found1
            if (found2) sec2 = found2
          }

          if (sec1 && sec2) {
            // Use the maximum length for both coupled sections
            const maxLength = Math.max(sec1.length, sec2.length)
            sec1.length = maxLength
            sec2.length = maxLength

            processedSections.add(link.section1)
            processedSections.add(link.section2)
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
        line.sections.forEach(section => {
          delete section.startX
          delete section.startY
          delete section.endX
          delete section.endY
        })
      })

      // Second pass: calculate natural positions for all sections
      const naturalPositions = new Map()

      this.lines.forEach((line) => {
        let currentX = startX
        const sortedSections = [...line.sections].sort((a, b) => a.ordinal - b.ordinal)

        sortedSections.forEach((section) => {
          const canvasLength = section.length * this.pixelsPerUnit
          naturalPositions.set(section.id, {
            startX: currentX,
            endX: currentX + canvasLength
          })
          currentX = currentX + canvasLength
        })
      })

      // Third pass: align coupled sections by using the maximum startX
      const alignedPositions = new Map()

      this.mutualLinks.forEach(link => {
        const pos1 = naturalPositions.get(link.section1)
        const pos2 = naturalPositions.get(link.section2)

        if (pos1 && pos2) {
          // Use the maximum startX for alignment
          const alignedStartX = Math.max(pos1.startX, pos2.startX)

          // Find the sections to get length
          let sec1 = null
          for (let line of this.lines) {
            const found1 = line.sections.find(s => s.id === link.section1)
            if (found1) {
              sec1 = found1
              break
            }
          }

          const canvasLength = sec1.length * this.pixelsPerUnit

          alignedPositions.set(link.section1, {
            startX: alignedStartX,
            endX: alignedStartX + canvasLength
          })
          alignedPositions.set(link.section2, {
            startX: alignedStartX,
            endX: alignedStartX + canvasLength
          })
        }
      })

      // Fourth pass: final layout with aligned positions
      this.lines.forEach((line, lineIndex) => {
        const y = yPositions[lineIndex]
        let currentX = startX

        const sortedSections = [...line.sections].sort((a, b) => a.ordinal - b.ordinal)

        sortedSections.forEach((section) => {
          const canvasLength = section.length * this.pixelsPerUnit

          // Check if this section has an aligned position
          if (alignedPositions.has(section.id)) {
            const aligned = alignedPositions.get(section.id)
            // Use the max to prevent overlap
            currentX = Math.max(currentX, aligned.startX)
            section.startX = currentX
            section.endX = currentX + canvasLength
          } else {
            section.startX = currentX
            section.endX = currentX + canvasLength
          }

          section.startY = y
          section.endY = y
          currentX = section.endX
        })
      })
    },
    drawMutualLinks() {
      if (!this.mutualLinesLayer) return

      // Clear existing mutual link lines
      this.mutualLinesLayer.destroyChildren()

      // Draw dotted lines for each mutual link
      this.mutualLinks.forEach(link => {
        const sec1Data = this.sectionMap[link.section1]
        const sec2Data = this.sectionMap[link.section2]

        if (!sec1Data || !sec2Data) return

        // Calculate midpoints of each section
        const sec1Points = sec1Data.line.points()
        const sec1MidX = (sec1Points[0] + sec1Points[2]) / 2
        const sec1MidY = (sec1Points[1] + sec1Points[3]) / 2

        const sec2Points = sec2Data.line.points()
        const sec2MidX = (sec2Points[0] + sec2Points[2]) / 2
        const sec2MidY = (sec2Points[1] + sec2Points[3]) / 2

        // Create dotted line
        const mutualLine = new Konva.Line({
          points: [sec1MidX, sec1MidY, sec2MidX, sec2MidY],
          stroke: '#ff6b6b',
          strokeWidth: 2,
          dash: [5, 5],
          opacity: 0.7
        })

        this.mutualLinesLayer.add(mutualLine)
      })

      this.mutualLinesLayer.batchDraw()
    },
    selectSection(sectionId, shiftKey, allSections) {
      if (shiftKey) {
        // Multi-select: toggle section
        const index = this.selectedSections.indexOf(sectionId)
        if (index > -1) {
          this.selectedSections.splice(index, 1)
        } else {
          this.selectedSections.push(sectionId)
        }
      } else {
        // Single select: replace selection
        this.selectedSections = [sectionId]
      }

      // Update visual state of all sections
      allSections.forEach(sec => {
        const isSelected = this.selectedSections.includes(sec.id)
        if (isSelected) {
          sec.line.strokeWidth(6)
          sec.line.shadowEnabled(true)
        } else {
          sec.line.strokeWidth(4)
          sec.line.shadowEnabled(false)
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

      // Track all sections for selection
      const allSections = []
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

      // Create lines and sections based on data
      this.lines.forEach((lineData, lineIndex) => {
        const lineColor = colors[lineIndex]

        // Track endpoints for this line
        const lineEndpoints = []

        // Create each section
        lineData.sections.forEach((sectionData, secIndex) => {
          const sectionId = sectionData.id

          // Use stored positions or calculate defaults
          const startX = sectionData.startX !== undefined ? sectionData.startX : 50
          const startY = sectionData.startY !== undefined ? sectionData.startY : yPositions[lineIndex]
          const endX = sectionData.endX !== undefined ? sectionData.endX : 350
          const endY = sectionData.endY !== undefined ? sectionData.endY : yPositions[lineIndex]

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

          // Track section
          allSections.push({ id: sectionId, line: line })
          this.sectionMap[sectionId] = { id: sectionId, line: line, section: sectionData, lineData: lineData }

          // Create start endpoint (only for first section in line)
          if (secIndex === 0) {
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
              sectionData.startX = newX
              sectionData.startY = newY

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

          // Store reference to next section's line if it exists
          const nextSection = lineData.sections[secIndex + 1]

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
            sectionData.endX = newX
            sectionData.endY = newY

            // If there's a next section, update its start point
            if (nextSection) {
              const nextSectionLine = this.sectionMap[nextSection.id].line
              const nextPoints = nextSectionLine.points()
              nextSectionLine.points([
                newX,
                newY,
                nextPoints[2],
                nextPoints[3]
              ])

              // Update next section's stored start position
              nextSection.startX = newX
              nextSection.startY = newY
            }

            layer.batchDraw()
            this.drawMutualLinks()
          })

          addEndpointHoverEffect(endPoint)
          lineEndpoints.push(endPoint)
          allEndpoints.push(endPoint)

          // Add hover tooltip showing section name
          const sectionInfo = { name: sectionData.name, lineName: lineData.name, length: sectionData.length }
          line.on('mouseenter', (e) => {
            stage.container().style.cursor = 'pointer'
            const mousePos = stage.getPointerPosition()
            tooltip.text(sectionInfo.name + ' | ' + sectionInfo.length)
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
            this.selectSection(sectionId, e.evt.shiftKey, allSections)
            layer.batchDraw()
          })

          layer.add(line)
        })
      })

      // Add all endpoints on top of sections so they're always clickable
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
          this.selectedSections = []
          allSections.forEach(sec => {
            sec.line.strokeWidth(4)
            sec.line.shadowEnabled(false)
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
        line.sections.forEach(section => {
          minX = Math.min(minX, section.startX, section.endX)
          minY = Math.min(minY, section.startY, section.endY)
          maxX = Math.max(maxX, section.startX, section.endX)
          maxY = Math.max(maxY, section.startY, section.endY)
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

      // Clear the section map
      this.sectionMap = {}

      // Recalculate positions
      this.calculateSectionPositions()

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
