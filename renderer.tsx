import "bootstrap/dist/css/bootstrap.min.css"
import React, {useEffect, useState} from "react"
import ReactDom from "react-dom"
import TitleBar from "./components/TitleBar"
import VersionDialog from "./components/VersionDialog"
import PhotoViewer from "./components/PhotoViewer"
import LinkDialog from "./components/LinkDialog"
import InfoDialog from "./components/InfoDialog"
import ContextMenu from "./components/ContextMenu"
import "./index.less"
import functions from "./structures/functions"

export const HoverContext = React.createContext<any>(null)
export const DrawingContext = React.createContext<any>(null)
export const ErasingContext = React.createContext<any>(null)
export const BrushColorContext = React.createContext<any>(null)

const App = () => {
  const [hover, setHover] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [erasing, setErasing] = useState(false)
  const [brushColor, setBrushColor] = useState("#2f6df5")

  useEffect(() => {
    const preventPaste = (event: ClipboardEvent) => event.preventDefault()
    document.addEventListener("paste", preventPaste)
    return () => {
      document.removeEventListener("paste", preventPaste)
    }
  }, [])

  return (
    <BrushColorContext.Provider value={{brushColor, setBrushColor}}>
    <DrawingContext.Provider value={{drawing, setDrawing}}>
    <ErasingContext.Provider value={{erasing, setErasing}}>
    <HoverContext.Provider value={{hover, setHover}}>
      <main className="app" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          <TitleBar/>
          <ContextMenu/>
          <VersionDialog/>
          <LinkDialog/>
          <InfoDialog/>
          <PhotoViewer/>
      </main>
    </HoverContext.Provider>
    </ErasingContext.Provider>
    </DrawingContext.Provider>
    </BrushColorContext.Provider>
  )
}

ReactDom.render(<App/>, document.getElementById("root"))
