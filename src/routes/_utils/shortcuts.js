import { store } from '../_store/store'

// A map of scopeKey to KeyMap
let scopeKeyMaps

// Current scope, starting with 'global'
let currentScopeKey

// Previous current scopes
let scopeStack

// Currently active prefix map
let prefixMap

// Scope in which prefixMap is valid
let prefixMapScope

// A map of key to components or other KeyMaps
function KeyMap () {}

export function initShortcuts () {
  currentScopeKey = 'global'
  scopeStack = []
  scopeKeyMaps = null
  prefixMap = null
  prefixMapScope = null
}
initShortcuts()

// Sets scopeKey as current scope.
export function pushShortcutScope (scopeKey) {
  scopeStack.push(currentScopeKey)
  currentScopeKey = scopeKey
}

// Go back to previous current scope.
export function popShortcutScope (scopeKey) {
  if (scopeKey !== currentScopeKey) {
    return
  }
  currentScopeKey = scopeStack.pop()
}

// Call component.onKeyDown(event) when a key in keys is pressed
// in the given scope.
export function addToShortcutScope (scopeKey, keys, component) {
  if (scopeKeyMaps == null) {
    window.addEventListener('keydown', onKeyDown)
    scopeKeyMaps = {}
  }
  let keyMap = scopeKeyMaps[scopeKey]
  if (!keyMap) {
    keyMap = new KeyMap()
    scopeKeyMaps[scopeKey] = keyMap
  }
  mapKeys(keyMap, keys, component)
}

export function removeFromShortcutScope (scopeKey, keys, component) {
  let keyMap = scopeKeyMaps[scopeKey]
  if (!keyMap) {
    return
  }
  unmapKeys(keyMap, keys, component)
  if (Object.keys(keyMap).length === 0) {
    delete scopeKeyMaps[scopeKey]
  }
  if (Object.keys(scopeKeyMaps).length === 0) {
    scopeKeyMaps = null
    window.removeEventListener('keydown', onKeyDown)
  }
}

const FALLBACK_KEY = '__fallback__'

// Call component.onKeyDown(event) if no other shortcuts handled
// the current key.
export function addShortcutFallback (scopeKey, component) {
  addToShortcutScope(scopeKey, FALLBACK_KEY, component)
}

export function removeShortcutFallback (scopeKey, component) {
  removeFromShortcutScope(scopeKey, FALLBACK_KEY, component)
}

// Direct the given event to the appropriate component in the given
// scope for the event's key.
export function onKeyDownInShortcutScope (scopeKey, event) {
  if (prefixMap) {
    let handled = false
    if (prefixMap && prefixMapScope === scopeKey) {
      handled = handleEvent(scopeKey, prefixMap, event.key, event)
    }
    prefixMap = null
    prefixMapScope = null
    if (handled) {
      return
    }
  }
  let keyMap = scopeKeyMaps[scopeKey]
  if (!keyMap) {
    return
  }
  if (!handleEvent(scopeKey, keyMap, event.key, event)) {
    handleEvent(scopeKey, keyMap, FALLBACK_KEY, event)
  }
}

function handleEvent (scopeKey, keyMap, key, event) {
  let value = keyMap[key]
  if (!value) {
    return false
  }
  if (KeyMap.prototype.isPrototypeOf(value)) {
    prefixMap = value
    prefixMapScope = scopeKey
  } else {
    value.onKeyDown(event)
  }
  return true
}

function onKeyDown (event) {
  if (store.get().disableHotkeys) {
    return
  }
  if (!acceptShortcutEvent(event)) {
    return
  }
  onKeyDownInShortcutScope(currentScopeKey, event)
}

function mapKeys (keyMap, keys, component) {
  keys.split('|').forEach(
    (seq) => {
      let seqArray = seq.split(' ')
      let prefixLen = seqArray.length - 1
      let currentMap = keyMap
      let i = -1
      while (++i < prefixLen) {
        let prefixMap = currentMap[seqArray[i]]
        if (!prefixMap) {
          prefixMap = new KeyMap()
          currentMap[seqArray[i]] = prefixMap
        }
        currentMap = prefixMap
      }
      currentMap[seqArray[prefixLen]] = component
    })
}

function unmapKeys (keyMap, keys, component) {
  keys.split('|').forEach(
    (seq) => {
      let seqArray = seq.split(' ')
      let prefixLen = seqArray.length - 1
      let currentMap = keyMap
      let i = -1
      while (++i < prefixLen) {
        let prefixMap = currentMap[seqArray[i]]
        if (!prefixMap) {
          return
        }
        currentMap = prefixMap
      }
      let lastKey = seqArray[prefixLen]
      if (currentMap[lastKey] === component) {
        delete currentMap[lastKey]
      }
    })
}

function acceptShortcutEvent (event) {
  let { target } = event
  return !(
    event.metaKey ||
    event.ctrlKey ||
    (event.shiftKey && event.key !== '?') || // '?' is a special case - it is allowed
    (target && (
      target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    ))
  )
}