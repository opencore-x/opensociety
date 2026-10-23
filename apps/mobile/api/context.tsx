import { createContext, useContext } from 'react'
import { apiClient } from './client'

export const ApiContext = createContext(apiClient)
export const useApiClient = () => useContext(ApiContext)
