import {ipcRenderer} from "electron"
import Slider from "rc-slider"
import React, {useEffect, useState, useRef, useContext} from "react"
import ReactDom from "react-dom"
import functions from "../structures/functions"
import "../styles/brightnessdialog.less"

const BrightnessDialog: React.FunctionComponent = (props) => {
    const initialState = {
        brightness: 1,
        contrast: 1
    }
    const [state, setState] = useState(initialState)
    const [hover, setHover] = useState(false)

    useEffect(() => {
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
            case "brightness":
                setState((prev) => {
                    return {...prev, brightness: value}
                })
                ipcRenderer.invoke("apply-brightness", {...state, brightness: value, realTime: true})
                break
            case "contrast":
                setState((prev) => {
                    return {...prev, contrast: value}
                })
                ipcRenderer.invoke("apply-brightness", {...state, contrast: value, realTime: true})
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
        console.log(button)
        if (button === "accept") {
            ipcRenderer.invoke("apply-brightness", state)
        }
        closeAndReset(button === "accept")
    }

    return (
        <section className="brightness-dialog" onMouseDown={close}>
            <div className="brightness-dialog-box" onMouseOver={() => setHover(true)} onMouseLeave={() => setHover(false)}>
                <div className="brightness-container">
                    <div className="brightness-title-container">
                        <p className="brightness-title">Brightness and Contrast</p>
                    </div>
                    <div className="brightness-row-container">
                        <div className="brightness-row">
                            <p className="brightness-text">Brightness: </p>
                            <Slider className="brightness-slider" onChange={(value) => {changeState("brightness", value)}} min={0.5} max={1.5} step={0.1} value={state.brightness}/>
                        </div>
                        <div className="brightness-row">
                            <p className="brightness-text">Contrast: </p>
                            <Slider className="brightness-slider" onChange={(value) => {changeState("contrast", value)}} min={0.5} max={1.5} step={0.1} value={state.contrast}/>
                        </div>
                    </div>
                    <div className="brightness-button-container">
                        <button onClick={() => click("reject")} className="reject-button">{"Cancel"}</button>
                        <button onClick={() => click("accept")} className="accept-button">{"Ok"}</button>
                    </div>
                </div>
            </div>
        </section>
    )
}

ReactDom.render(<BrightnessDialog/>, document.getElementById("root"))
