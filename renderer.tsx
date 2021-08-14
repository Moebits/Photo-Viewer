import "bootstrap/dist/css/bootstrap.min.css"
import React, { useEffect } from "react"
import ReactDom from "react-dom"
import TitleBar from "./components/TitleBar"
import VersionDialog from "./components/VersionDialog"
import PhotoViewer from "./components/PhotoViewer"
import LinkDialog from "./components/LinkDialog"
import ContextMenu from "./components/ContextMenu"
import BrightnessDialog from "./components/BrightnessDialog"
import HSLDialog from "./components/HSLDialog"
import BlurDialog from "./components/BlurDialog"
import PixelateDialog from "./components/PixelateDialog"
import RotateDialog from "./components/RotateDialog"
import TintDialog from "./components/TintDialog"
import ResizeDialog from "./components/ResizeDialog"
import BinarizeDialog from "./components/BinarizeDialog"
import GIFDialog from "./components/GIFDialog"
import "./index.less"

const App = () => {
  useEffect(() => {
    const preventPaste = (event: ClipboardEvent) => event.preventDefault()
    document.addEventListener("paste", preventPaste)
    return () => {
      document.removeEventListener("paste", preventPaste)
    }
  }, [])

  return (
    <main className="app">
      <TitleBar/>
      <ContextMenu/>
      <VersionDialog/>
      <LinkDialog/>
      <GIFDialog/>
      <BrightnessDialog/>
      <HSLDialog/>
      <BlurDialog/>
      <PixelateDialog/>
      <RotateDialog/>
      <TintDialog/>
      <ResizeDialog/>
      <BinarizeDialog/>
      <PhotoViewer/>
    </main>
  )
}

ReactDom.render(<App/>, document.getElementById("root"))
