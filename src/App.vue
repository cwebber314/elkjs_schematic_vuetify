<template>
  <v-app>
    <v-app-bar color="primary" prominent>
      <v-app-bar-title>ELK.js Schematic Sandbox</v-app-bar-title>

      <v-spacer></v-spacer>

      <v-tabs>
        <v-tab to="/simple">Simple</v-tab>
        <v-tab to="/grow">Grow</v-tab>
        <v-tab to="/hide">Hide</v-tab>
        <v-tab to="/update-properties">Properties</v-tab>
        <v-tab to="/related">Related</v-tab>
        <v-tab to="/right-click">Right Click</v-tab>
        <v-tab to="/add-object">Add</v-tab>
        <v-tab to="/terminal">Terminal</v-tab>
        <v-tab to="/terminal-crud">CRUD</v-tab>
      </v-tabs>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>
