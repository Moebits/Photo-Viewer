import {ipcRenderer} from "electron"
import Slider from "rc-slider"
import Draggable from "react-draggable"
import React, {useEffect, useState, useRef, useContext} from "react"
import ReactDom from "react-dom"
import functions from "../structures/functions"
import "../styles/binarizedialog.less"

const BinarizeDialog: React.FunctionComponent = (props) => {
    const initialState = {
        binarize: 128
    }
    const [state, setState] = useState(initialState)
    const [hover, setHover] = useState(false)

    useEffect(() => {
        setTimeout(() => {ipcRenderer.invoke("apply-binarize", {...state, realTime: true})}, 100)
        const initTheme = async () => {
            const theme = await ipcRenderer.invoke("get-theme")
            functions.updateTheme(theme)
        }
        initTheme()
        const updateTheme = (event: any, theme: string) => {
            functions.updateTheme(theme)
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

    const changeState = (type: string, value: number) => {
        switch(type) {
            case "binarize":
                setState((prev) => {
                    return {...prev, binarize: value}
                })
                ipcRenderer.invoke("apply-binarize", {...state, binarize: value, realTime: true})
                break
        }
    }

    const closeAndReset = async (noRevert?: boolean) => {
        if (!noRevert) await ipcRenderer.invoke("revert-to-last-state")
        await ipcRenderer.invoke("close-current-dialog")
        setState(initialState)
    }
    
    const close = () => {
        setTimeout(() => {
            if (!hover) closeAndReset()
        }, 100)
    }

    const click = (button: "accept" | "reject") => {
        if (button === "accept") {
            ipcRenderer.invoke("apply-binarize", state)
        }
        closeAndReset(button === "accept")
    }

    return (
        <section className="binarize-dialog" onMouseDown={close}>
            <div className="binarize-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <div className="binarize-container">
                    <div className="binarize-title-container">
                        <p className="binarize-title">Binarize</p>
                    </div>
                    <div className="binarize-row-container">
                        <div className="binarize-row">
                            <p className="binarize-text">Threshold: </p>
                            <Slider className="binarize-slider" onChange={(value) => {changeState("binarize", value)}} min={1} max={255} step={1} value={state.binarize}/>
                        </div>
                    </div>
                    <div className="binarize-button-container">
                        <button onClick={() => click("reject")} className="reject-button">{"Cancel"}</button>
                        <button onClick={() => click("accept")} className="accept-button">{"Ok"}</button>
                    </div>
                </div>
            </div>
        </section>
    )
}

ReactDom.render(<BinarizeDialog/>, document.getElementById("root"))