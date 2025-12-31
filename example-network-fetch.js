// Example: Fetch network data for Jupiter (bus ID 6)
// Run with: node example-network-fetch.js

import { fetchNetworkByBusId } from './src/services/networkApi.js'

// Fetch network data for Jupiter (bus ID 6)
const network = await fetchNetworkByBusId(6)

console.log('Network data for Jupiter (bus ID 6):')
console.log(JSON.stringify(network, null, 2))
