import {ipcRenderer, clipboard} from "electron"
import React, {useEffect, useState, useRef} from "react"
import "../styles/contextmenu.less"

const ContextMenu: React.FunctionComponent = (props) => {
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)
    const contextMenu = useRef(null) as React.RefObject<HTMLDivElement>

    useEffect(() => {
        window.onclick = () => {
            if (!hover) setVisible(false)
        }
        window.oncontextmenu = (event: MouseEvent) => {
            setVisible(true)
            contextMenu.current!.style.left = `${event.x}px`
            contextMenu.current!.style.top = `${event.y}px`
        }
    }, [])

    const copy = () => {
        const selectedText = window.getSelection()?.toString().trim()
        if (selectedText) {
            clipboard.writeText(selectedText)
        } else {
            ipcRenderer.invoke("copy-image")
        }
    }

    const paste = () => {
        ipcRenderer.invoke("trigger-paste")
    }

    const saveImage = () => {
        ipcRenderer.invoke("save-img-context")
    }

    const copyAddress = () => {
        ipcRenderer.invoke("copy-address")
    }


    if (visible) {
        return (
            <section ref={contextMenu} className="context-menu" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <button className="context-button" onClick={() => copy()}>Copy</button>
                <button className="context-button" onClick={() => paste()}>Paste</button>
                <button className="context-button" onClick={() => saveImage()}>Save Image</button>
                <button className="context-button" onClick={() => copyAddress()}>Copy Address</button>
            </section>
        )
    }
    return null
}

export default ContextMenu