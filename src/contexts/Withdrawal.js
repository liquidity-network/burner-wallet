import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect } from 'react'

import { safeAccess } from '../utils'
import { isAddress } from 'web3-utils'
import { useNocustClient, useEraNumber } from './Nocust'

const UPDATE_LIMIT = 'UPDATE_LIMIT'
const UPDATE_FEE = 'UPDATE_FEE'
const UPDATE_BLOCKS = 'UPDATE_BlOCKS'

const WithdrawalContext = createContext()

function useWithdrawalContext () {
  return useContext(WithdrawalContext)
}

function reducer (state, { type, payload }) {
  switch (type) {
    case UPDATE_FEE: {
      const { withdrawalFee } = payload
      return {
        ...state,
        withdrawalFee
      }
    }
    case UPDATE_LIMIT: {
      const { address, tokenAddress, withdrawalLimit } = payload
      return {
        ...state,
        [address]: {
          ...(safeAccess(state, [address]) || {}),
          [tokenAddress]: {
            ...(safeAccess(state, [address, tokenAddress]) || {}),
            withdrawalLimit
          }
        }
      }
    }
    case UPDATE_BLOCKS: {
      const { address, tokenAddress, blocksToWithdrawal } = payload
      return {
        ...state,
        [address]: {
          ...(safeAccess(state, [address]) || {}),
          [tokenAddress]: {
            ...(safeAccess(state, [address, tokenAddress]) || {}),
            blocksToWithdrawal
          }
        }
      }
    }
    default: {
      throw Error(`Unexpected action type in WithdrawalContext reducer: '${type}'.`)
    }
  }
}

export default function Provider ({ children }) {
  const [state, dispatch] = useReducer(reducer, {})

  const updateLimit = useCallback((address, tokenAddress, withdrawalLimit) => {
    dispatch({ type: UPDATE_LIMIT, payload: { address, tokenAddress, withdrawalLimit } })
  }, [])

  const updateFee = useCallback((withdrawalFee) => {
    dispatch({ type: UPDATE_FEE, payload: { withdrawalFee } })
  }, [])

  const updateBlocks = useCallback((address, tokenAddress, blocksToWithdrawal) => {
    dispatch({ type: UPDATE_BLOCKS, payload: { address, tokenAddress, blocksToWithdrawal } })
  }, [])

  return (
    <WithdrawalContext.Provider value={useMemo(() => [state, { updateLimit, updateFee, updateBlocks }], [state, updateLimit, updateFee, updateBlocks])}>
      {children}
    </WithdrawalContext.Provider>
  )
}

export function useWithdrawalFee (gasPrice) {
  const nocust = useNocustClient()
  const [state, { updateFee }] = useWithdrawalContext()
  const { withdrawalFee } = state

  useEffect(() => {
    if (nocust) {
      nocust.getWithdrawalFee(gasPrice)
        .then(withdrawalFee => {
          updateFee(withdrawalFee)
        })
        .catch(() => {
          updateFee(null)
        })
    }
  }, [gasPrice])

  return withdrawalFee
}

export function useWithdrawalLimit (address, tokenAddress) {
  const nocust = useNocustClient()
  const eraNumber = useEraNumber()
  const [state, { updateLimit }] = useWithdrawalContext()
  const { withdrawalLimit } = safeAccess(state, [address, tokenAddress]) || {}

  useEffect(() => {
    if (isAddress(address) && isAddress(tokenAddress)) {
      console.log('checking withdrawal limit')
      nocust.getWithdrawalLimit(address, tokenAddress)
        .then(withdrawalLimit => {
          updateLimit(address, tokenAddress, withdrawalLimit)
        })
        .catch(() => {
          updateLimit(address, tokenAddress, null)
        }
        )
    }
  }, [address, tokenAddress, eraNumber])

  return withdrawalLimit
}

export function useBlocksToWithdrawal (address, tokenAddress) {
  const nocust = useNocustClient()
  const eraNumber = useEraNumber()
  const [state, { updateBlocks }] = useWithdrawalContext()
  const { blocksToWithdrawal } = safeAccess(state, [address, tokenAddress]) || {}

  useEffect(() => {
    if (isAddress(address) && isAddress(tokenAddress)) {
      nocust.getBlocksToWithdrawalConfirmation(address, undefined, tokenAddress)
        .then(blocksToWithdrawal => {
          updateBlocks(address, tokenAddress, blocksToWithdrawal)
        })
        .catch(() => {
          updateBlocks(address, tokenAddress, undefined)
        })
    }
  }, [address, tokenAddress, blocksToWithdrawal, eraNumber])

  return blocksToWithdrawal
}
