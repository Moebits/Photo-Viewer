import {ipcRenderer, remote} from "electron"
import Slider from "rc-slider"
import Draggable from "react-draggable"
import React, {useEffect, useState, useRef} from "react"
import "../styles/bulksavedialog.less"

const BulkSaveDialog: React.FunctionComponent = (props) => {
    const [visible, setVisible] = useState(false)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        const showBulkSaveDialog = (event: any) => {
            setVisible(true)
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "bulk-save") setVisible(false)
        }
        ipcRenderer.on("show-bulk-save-dialog", showBulkSaveDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        return () => {
            ipcRenderer.removeListener("show-bulk-save-dialog", showBulkSaveDialog)
            ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
        }
    }, [])

    useEffect(() => {
        const escapePressed = () => {
            if (visible) setVisible(false)
        }
        ipcRenderer.on("escape-pressed", escapePressed)
        return () => {
            ipcRenderer.removeListener("escape-pressed", escapePressed)
        }
    })
    
    const close = () => {
        setTimeout(() => {
            if (!hover) setVisible(false)
        }, 100)
    }

    const click = (button: "accept" | "reject") => {
        if (button === "accept") {
            ipcRenderer.invoke("bulk-save-overwrite")
        } else {
            ipcRenderer.invoke("bulk-save-directory")
        }
        setVisible(false)
    }

    if (visible) {
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
    return null
}

export default BulkSaveDialog