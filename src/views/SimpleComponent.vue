<template>
  <v-container fluid class="page-container">
    <v-row>
      <v-col>
        <h1 class="text-h4 text-primary mb-4">Simple Example</h1>
      </v-col>
    </v-row>

    <SchematicEditor
      :netlist-data="netlistData"
      :width="editorWidth"
      :height="editorHeight"
      @node-click="handleNodeClick"
      @edge-click="handleEdgeClick"
      @resize="handleEditorResize"
    />
  </v-container>
</template>

<script>
import netlistData from '../netlist.json'
import SchematicEditor from '../components/SchematicEditor.vue'

export default {
  name: 'SimpleComponent',
  components: {
    SchematicEditor
  },
  data() {
    return {
      netlistData,
      editorWidth: window.innerWidth,
      editorHeight: window.innerHeight - 60
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    handleNodeClick(node) {
      console.log('SimpleComponent received node-click:', node)
    },
    handleEdgeClick(edge) {
      console.log('SimpleComponent received edge-click:', edge)
    },
    handleResize() {
      this.editorWidth = window.innerWidth
      this.editorHeight = window.innerHeight - 60
    },
    handleEditorResize(dimensions) {
      this.editorWidth = dimensions.width
      this.editorHeight = dimensions.height
    }
  }
}
</script>

<style scoped>
.page-container {
  height: calc(100vh - 64px);
  padding: 0;
}
</style>
