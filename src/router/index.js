import { createRouter, createWebHistory } from 'vue-router'
import Simple from '../views/Simple.vue'
import Grow from '../views/Grow.vue'
import Modify from '../views/Modify.vue'
import UpdateProperties from '../views/UpdateProperties.vue'

const routes = [
  {
    path: '/',
    redirect: '/simple'
  },
  {
    path: '/simple',
    name: 'Simple',
    component: Simple
  },
  {
    path: '/grow',
    name: 'Grow',
    component: Grow
  },
  {
    path: '/modify',
    name: 'Modify',
    component: Modify
  },
  {
    path: '/update-properties',
    name: 'UpdateProperties',
    component: UpdateProperties
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
