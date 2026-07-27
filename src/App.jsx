import { useState } from 'react'
import HomeScreen from './components/HomeScreen.jsx'
import EinstellungenScreen from './components/EinstellungenScreen.jsx'
import ErfassungFlow from './components/ErfassungFlow.jsx'
import ArchivScreen from './components/ArchivScreen.jsx'

// Einfacher State-basierter Router (kein react-router nötig).
export default function App() {
  // route: { name: 'home'|'einstellungen'|'erfassung'|'archiv', params }
  const [route, setRoute] = useState({ name: 'home' })

  const go = (name, params = {}) => setRoute({ name, ...params })

  return (
    <div className="app">
      {route.name === 'home' && <HomeScreen go={go} />}
      {route.name === 'einstellungen' && <EinstellungenScreen go={go} />}
      {route.name === 'erfassung' && (
        <ErfassungFlow go={go} bogenId={route.bogenId} resumeEntwurf={route.resumeEntwurf} />
      )}
      {route.name === 'archiv' && <ArchivScreen go={go} />}
    </div>
  )
}
