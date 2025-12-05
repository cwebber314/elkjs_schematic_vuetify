<template>
  <v-dialog v-model="show" max-width="600px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Section Details</span>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="section.section_id"
                label="Section ID"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="section.section_name"
                label="Section Name"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="section.section_n"
                label="Section #"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model="section.length_mi"
                label="Length (mi)"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="section.conductor"
                label="Conductor"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="section.branch_id"
                label="Branch ID"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>

            <v-col cols="6">
              <v-text-field
                v-model="section.branch_name"
                label="Branch"
                disabled
                variant="outlined"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="text" @click="close">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'ViewSection',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    },
    section: {
      type: Object,
      default: () => ({
        section_id: '',
        section_name: '',
        section_n: '',
        length_mi: '',
        conductor: '',
        branch_id: '',
        branch_name: ''
      })
    }
  },
  emits: ['update:modelValue'],
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
  methods: {
    close() {
      this.show = false
    }
  }
}
</script>

<style scoped>
</style>
