import "bootstrap/dist/css/bootstrap.min.css"
import React, {useEffect, useState} from "react"
import ReactDom from "react-dom"
import TitleBar from "./components/TitleBar"
import VersionDialog from "./components/VersionDialog"
import PhotoViewer from "./components/PhotoViewer"
import LinkDialog from "./components/LinkDialog"
import InfoDialog from "./components/InfoDialog"
import ContextMenu from "./components/ContextMenu"
import BulkSaveDialog from "./components/BulkSaveDialog"
import "./index.less"

export const HoverContext = React.createContext<any>(null)

const App = () => {
  const [hover, setHover] = useState(true)

  useEffect(() => {
    const preventPaste = (event: ClipboardEvent) => event.preventDefault()
    document.addEventListener("paste", preventPaste)
    return () => {
      document.removeEventListener("paste", preventPaste)
    }
  }, [])

  return (
    <HoverContext.Provider value={{hover, setHover}}>
      <main className="app" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <TitleBar/>
        <ContextMenu/>
        <VersionDialog/>
        <LinkDialog/>
        <InfoDialog/>
        <BulkSaveDialog/>
        <PhotoViewer/>
      </main>
    </HoverContext.Provider>
  )
}

ReactDom.render(<App/>, document.getElementById("root"))
