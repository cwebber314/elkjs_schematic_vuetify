<template>
  <v-dialog v-model="show" max-width="600px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Select Bus</span>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col>
              <p>The selected bus and all connected branches will be added to the diagram</p>
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="searchQuery"
                label="Search buses..."
                variant="outlined"
                prepend-inner-icon="mdi-magnify"
                clearable
                :loading="loading"
                :disabled="loading"
                @input="filterBuses"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-progress-linear v-if="loading" indeterminate color="primary"></v-progress-linear>
              <v-list v-else class="bus-list">
                <v-list-item
                  v-for="bus in filteredBuses"
                  :key="bus.id"
                  :value="bus.id"
                  :active="selectedBusId === bus.id"
                  @click="selectedBusId = bus.id"
                  class="bus-list-item"
                >
                  <template v-slot:prepend>
                    <v-radio
                      :model-value="selectedBusId"
                      :value="bus.id"
                      color="primary"
                    ></v-radio>
                  </template>
                  <v-list-item-title>{{ bus.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    Bus #{{ bus.bus_num }} | {{ bus.kv }} kV | {{ bus.region }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="filteredBuses.length === 0 && !loading">
                  <v-list-item-title class="text-grey">No buses found</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="cancel">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          variant="text"
          @click="select"
          :disabled="!selectedBusId || loading"
        >
          Select
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { fetchBuses } from '@/services/busApi'

export default {
  name: 'SelectBus',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    region: {
      type: String,
      default: null
    }
  },
  emits: ['update:modelValue', 'select'],
  data() {
    return {
      selectedBusId: null,
      searchQuery: '',
      buses: [],
      filteredBuses: [],
      loading: false
    }
  },
  computed: {
    show: {
      get() {
        return this.modelValue
      },
      set(value) {
        this.$emit('update:modelValue', value)
      }
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        // Load buses and reset selection when dialog opens
        this.loadBuses()
      }
    }
  },
  methods: {
    async loadBuses() {
      this.loading = true
      try {
        // Fetch buses from API, optionally filtered by region
        const options = {}
        if (this.region) {
          options.region = this.region
        }
        this.buses = await fetchBuses(options)
        this.reset()
      } catch (error) {
        console.error('Error loading buses:', error)
        this.buses = []
        this.filteredBuses = []
      } finally {
        this.loading = false
      }
    },
    cancel() {
      this.show = false
      this.reset()
    },
    select() {
      if (this.selectedBusId) {
        const selectedBus = this.buses.find(b => b.id === this.selectedBusId)
        if (selectedBus) {
          // Emit select event with selected bus data
          this.$emit('select', { ...selectedBus })
          this.show = false
          this.reset()
        }
      }
    },
    filterBuses() {
      if (!this.searchQuery || this.searchQuery.trim() === '') {
        this.filteredBuses = [...this.buses]
      } else {
        const query = this.searchQuery.toLowerCase()
        this.filteredBuses = this.buses.filter(bus => {
          return (
            bus.name.toLowerCase().includes(query) ||
            bus.bus_num.toString().includes(query) ||
            bus.kv.toString().includes(query) ||
            (bus.region && bus.region.toLowerCase().includes(query))
          )
        })
      }
    },
    reset() {
      this.selectedBusId = null
      this.searchQuery = ''
      this.filterBuses()
    }
  }
}
</script>

<style scoped>
.bus-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

.bus-list-item {
  cursor: pointer;
}

.bus-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
