import {ipcRenderer} from "electron"
import Draggable from "react-draggable"
import React, {useEffect, useState, useRef} from "react"
import ReactDom from "react-dom"
import functions from "../structures/functions"
import "../styles/bulksavedialog.less"

const BulkSaveDialog: React.FunctionComponent = (props) => {
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const initTheme = async () => {
            const theme = await ipcRenderer.invoke("get-theme")
            const transparency = await ipcRenderer.invoke("get-transparency")
            functions.updateTheme(theme, transparency)
        }
        initTheme()
        const updateTheme = (event: any, theme: string, transparency: boolean) => {
            functions.updateTheme(theme, transparency)
        }
        ipcRenderer.on("update-theme", updateTheme)
        return () => {
            ipcRenderer.removeListener("update-theme", updateTheme)
        }
    }, [])

    useEffect(() => {
        const keyDown = async (event: globalThis.KeyboardEvent) => {
            if (event.key === "Enter") {
                enterPressed()
            }
            if (event.key === "Escape") {
                escapePressed()
            }
        }
        const enterPressed = () => {
            click("accept")
        }
        const escapePressed = () => {
            click("reject")
        }
        document.addEventListener("keydown", keyDown)
        ipcRenderer.on("enter-pressed", enterPressed)
        ipcRenderer.on("escape-pressed", escapePressed)
        return () => {
            document.removeEventListener("keydown", keyDown)
            ipcRenderer.removeListener("enter-pressed", enterPressed)
            ipcRenderer.removeListener("escape-pressed", escapePressed)
        }
    })

    const closeAndReset = async () => {
        await ipcRenderer.invoke("close-current-dialog")
    }
    
    const close = () => {
        setTimeout(() => {
            if (!hover) closeAndReset()
        }, 100)
    }

    const click = (button: "accept" | "reject") => {
        if (button === "accept") {
            ipcRenderer.invoke("bulk-save-overwrite")
        } else {
            ipcRenderer.invoke("bulk-save-directory")
        }
        closeAndReset()
    }

    return (
        <section className="bulk-save-dialog" onMouseDown={close}>
            <Draggable handle=".bulk-save-title-container">
            <div className="bulk-save-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <div className="bulk-save-container">
                    <div className="bulk-save-title-container">
                        <p className="bulk-save-title">Bulk Save</p>
                    </div>
                    <div className="bulk-save-row-container">
                        <div className="bulk-save-row">
                            <p className="bulk-save-text">Do you want to overwrite the original files?</p>
                        </div>
                    </div>
                    <div className="bulk-save-button-container">
                        <button onClick={() => click("reject")} className="reject-button">No</button>
                        <button onClick={() => click("accept")} className="accept-button">Yes</button>
                    </div>
                </div>
            </div>
            </Draggable>
        </section>
    )
}

ReactDom.render(<BulkSaveDialog/>, document.getElementById("root"))