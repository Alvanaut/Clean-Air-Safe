import { Router } from 'express'
  import { healthRouter } from './health.js'
  import { sensorsRouter } from './sensors.js'
  import { usersRouter } from './users.js'
  import { spacesRouter } from './spaces.js'
  import { alertsRouter } from './alerts.js'

  export const apiRouter = Router()

  apiRouter.use(healthRouter)
  apiRouter.use(sensorsRouter)
  apiRouter.use(usersRouter)
  apiRouter.use(spacesRouter)
  apiRouter.use(alertsRouter)
