import api from './client'

export default {
    get: (params) => api.get('/websites/dashboard/', { params }),
}
